// server/services/news.service.js
const Parser = require('rss-parser');
const News = require('../models/News');
const logger = require('../utils/logger');

const parser = new Parser({
    timeout: 10000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    customFields: {
        item: [
            ['media:content', 'mediaContent'],
            ['media:thumbnail', 'mediaThumbnail'],
            ['enclosure', 'enclosure']
        ]
    }
});

// RSS Feed sources configuration
const RSS_FEEDS = [
    {
        name: 'Economic Times',
        url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms',
        category: 'Markets'
    },
    {
        name: 'Economic Times',
        url: 'https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms',
        category: 'Stocks'
    },
    {
        name: 'Moneycontrol',
        url: 'https://www.moneycontrol.com/rss/marketreports.xml',
        category: 'Markets'
    },
    {
        name: 'Moneycontrol',
        url: 'https://www.moneycontrol.com/rss/economy.xml',
        category: 'Economy'
    },
    {
        name: 'LiveMint',
        url: 'https://www.livemint.com/rss/markets',
        category: 'Markets'
    },
    {
        name: 'LiveMint',
        url: 'https://www.livemint.com/rss/money',
        category: 'Personal Finance'
    },
    {
        name: 'Business Standard',
        url: 'https://www.business-standard.com/rss/markets-106.rss',
        category: 'Markets'
    },
    {
        name: 'NDTV Profit',
        url: 'https://feeds.feedburner.com/ndtvprofit-latest',
        category: 'General'
    },
    {
        name: 'The Hindu Business',
        url: 'https://www.thehindu.com/business/feeder/default.rss',
        category: 'Economy'
    },
    {
        name: 'Reuters',
        url: 'https://www.reutersagency.com/feed/?taxonomy=best-sectors&post_type=best',
        category: 'World'
    }
];

// Extract image URL from various RSS formats
function extractImageUrl(item) {
    // Try different image sources
    if (item.mediaContent && item.mediaContent.$) {
        return item.mediaContent.$.url;
    }
    if (item.mediaThumbnail && item.mediaThumbnail.$) {
        return item.mediaThumbnail.$.url;
    }
    if (item.enclosure && item.enclosure.url) {
        return item.enclosure.url;
    }
    if (item['media:content'] && item['media:content'].$) {
        return item['media:content'].$.url;
    }

    // Try to extract from content/description
    const content = item.content || item['content:encoded'] || item.description || '';
    const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch) {
        return imgMatch[1];
    }

    return null;
}

// Clean HTML from description
function cleanDescription(text) {
    if (!text) return '';
    return text
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 500); // Limit description length
}

// Fetch and parse a single RSS feed
async function fetchFeed(feedConfig) {
    try {
        const feed = await parser.parseURL(feedConfig.url);
        const items = [];

        for (const item of feed.items.slice(0, 20)) { // Limit to 20 items per feed
            const publishedAt = item.pubDate || item.isoDate ? new Date(item.pubDate || item.isoDate) : new Date();

            // Skip items older than 7 days
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            if (publishedAt < sevenDaysAgo) continue;

            items.push({
                title: item.title?.trim() || 'Untitled',
                link: item.link,
                description: cleanDescription(item.contentSnippet || item.description || item.summary),
                source: feedConfig.name,
                sourceUrl: feed.link || feedConfig.url,
                imageUrl: extractImageUrl(item),
                category: feedConfig.category,
                publishedAt
            });
        }

        return items;
    } catch (error) {
        logger.error(`Error fetching feed ${feedConfig.name} (${feedConfig.url}):`, error.message);
        return [];
    }
}

// Fetch all RSS feeds and save to database
async function fetchAllNews() {
    logger.info('Starting news fetch from RSS feeds...');
    const startTime = Date.now();

    let totalFetched = 0;
    let totalSaved = 0;
    let errors = 0;

    // Fetch all feeds in parallel
    const feedPromises = RSS_FEEDS.map(feed => fetchFeed(feed));
    const results = await Promise.all(feedPromises);

    // Flatten all items
    const allItems = results.flat();
    totalFetched = allItems.length;

    // Save to database (upsert to avoid duplicates)
    for (const item of allItems) {
        try {
            await News.findOneAndUpdate(
                { link: item.link },
                item,
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            totalSaved++;
        } catch (error) {
            if (error.code !== 11000) { // Ignore duplicate key errors
                logger.error('Error saving news item:', error.message);
                errors++;
            }
        }
    }

    const duration = Date.now() - startTime;
    logger.info(`News fetch complete: ${totalFetched} fetched, ${totalSaved} saved, ${errors} errors, took ${duration}ms`);

    return { totalFetched, totalSaved, errors, duration };
}

// Get news with filters
async function getNews(options = {}) {
    return News.getRecentNews(options);
}

// Get available sources
async function getSources() {
    const sources = await News.distinct('source', { isActive: true });
    return sources.sort();
}

// Get available categories
async function getCategories() {
    const categories = await News.distinct('category', { isActive: true });
    return categories.sort();
}

// Cleanup old news
async function cleanupOldNews() {
    const deleted = await News.cleanupOldNews();
    logger.info(`Cleaned up ${deleted} old news articles`);
    return deleted;
}

module.exports = {
    fetchAllNews,
    getNews,
    getSources,
    getCategories,
    cleanupOldNews,
    RSS_FEEDS
};
