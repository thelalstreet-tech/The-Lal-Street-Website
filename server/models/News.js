// server/models/News.js
const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    link: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        trim: true
    },
    source: {
        type: String,
        required: true,
        enum: ['Economic Times', 'NDTV Profit', 'Moneycontrol', 'LiveMint', 'Business Standard', 'The Hindu Business', 'Finshots', 'Reuters', 'Other']
    },
    sourceUrl: {
        type: String
    },
    imageUrl: {
        type: String
    },
    category: {
        type: String,
        enum: ['Markets', 'Economy', 'Stocks', 'IPO', 'Mutual Funds', 'Personal Finance', 'Industry', 'World', 'Opinion', 'General'],
        default: 'General'
    },
    publishedAt: {
        type: Date,
        required: true,
        index: true
    },
    fetchedAt: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for efficient querying
newsSchema.index({ publishedAt: -1, source: 1 });
newsSchema.index({ category: 1, publishedAt: -1 });

// Static method to get recent news
newsSchema.statics.getRecentNews = async function (options = {}) {
    const {
        limit = 50,
        page = 1,
        source,
        category,
        search
    } = options;

    const query = { isActive: true };

    if (source) query.source = source;
    if (category) query.category = category;
    if (search) {
        query.$or = [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
        ];
    }

    const skip = (page - 1) * limit;

    const [news, total] = await Promise.all([
        this.find(query)
            .sort({ publishedAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        this.countDocuments(query)
    ]);

    return {
        data: news,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
};

// Clean up old news (older than 7 days)
newsSchema.statics.cleanupOldNews = async function () {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const result = await this.deleteMany({ publishedAt: { $lt: sevenDaysAgo } });
    return result.deletedCount;
};

module.exports = mongoose.model('News', newsSchema);
