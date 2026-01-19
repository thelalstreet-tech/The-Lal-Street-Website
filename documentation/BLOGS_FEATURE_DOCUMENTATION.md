# Blogs Feature Documentation

## Table of Contents
1. [Overview](#overview)
2. [Setup and Configuration](#setup-and-configuration)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Admin Panel Usage](#admin-panel-usage)
6. [Frontend Components](#frontend-components)
7. [Environment Variables](#environment-variables)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The Blogs feature provides a complete content management system for creating, managing, and displaying blog posts. It includes:

- **Admin Panel**: Full CRUD operations for blogs, categories, and tags
- **Public Blog Page**: Search, filter, and read blog posts
- **Image Management**: Cloudinary integration for image uploads
- **Category & Tag System**: Organize blogs with multiple categories and tags
- **Exclusive Content**: Mark blogs as exclusive content
- **View Tracking**: Automatic view count tracking

---

## Setup and Configuration

### 1. Backend Dependencies

The following packages are required (already installed):

```json
{
  "cloudinary": "^1.x.x",
  "multer": "^1.x.x"
}
```

Install if needed:
```bash
cd server
npm install cloudinary multer
```

### 2. Cloudinary Setup

1. **Create Cloudinary Account**
   - Go to [cloudinary.com](https://cloudinary.com)
   - Sign up for a free account
   - Navigate to Dashboard

2. **Get Credentials**
   - Cloud Name
   - API Key
   - API Secret

3. **Set Environment Variables**
   ```env
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ```

### 3. MongoDB Models

Three models are created automatically:
- `Blog` - Main blog posts
- `Category` - Blog categories
- `Tag` - Blog tags

Models are defined in:
- `server/models/Blog.js`
- `server/models/Category.js`
- `server/models/Tag.js`

### 4. Backend Routes

Blogs routes are registered in `server/server.js`:
```javascript
const blogsRoutes = require('./routes/blogs.routes.js');
app.use('/api/blogs', blogsRoutes);
```

---

## Database Schema

### Blog Model

```javascript
{
  title: String (required, max 200 chars),
  content: String (required, HTML formatted),
  imageUrl: String (required, Cloudinary URL),
  imagePublicId: String (optional, for deletion),
  categories: [String] (array of category names),
  tags: [String] (array of tag names),
  exclusive: Boolean (default: false),
  author: String (default: 'The Lal Street'),
  views: Number (default: 0),
  isPublished: Boolean (default: true),
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

**Indexes:**
- `createdAt: -1` - For sorting by latest
- `categories: 1` - For filtering by category
- `tags: 1` - For filtering by tags
- `exclusive: 1` - For filtering exclusive blogs
- `isPublished: 1` - For filtering published blogs
- `title: 'text', content: 'text'` - For text search

### Category Model

```javascript
{
  name: String (required, unique, lowercase),
  description: String (optional, max 200 chars),
  slug: String (auto-generated, unique),
  blogCount: Number (default: 0),
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

### Tag Model

```javascript
{
  name: String (required, unique, lowercase, max 30 chars),
  blogCount: Number (default: 0),
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

---

## API Endpoints

### Base URL
- **Production**: `https://the-lal-street-1.onrender.com/api/blogs`
- **Development**: `http://localhost:5000/api/blogs`

### Public Endpoints (No Authentication Required)

#### 1. Get All Blogs

**GET** `/api/blogs`

**Query Parameters:**
- `category` (string, optional) - Filter by category name
- `tags` (string[], optional) - Filter by tags (can pass multiple)
- `exclusive` (boolean, optional) - Filter exclusive blogs
- `search` (string, optional) - Text search in title and content
- `isPublished` (boolean, default: true) - Filter by published status
- `sortBy` (string, default: 'createdAt') - Sort field: 'createdAt' or 'views'
- `sortOrder` (string, default: 'desc') - Sort order: 'asc' or 'desc'
- `limit` (number, default: 50) - Number of results
- `skip` (number, default: 0) - Pagination offset

**Example:**
```bash
GET /api/blogs?category=investment&tags=trading&tags=stocks&sortBy=views&sortOrder=desc&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "title": "Mastering Volatility Trading",
      "content": "<p>Blog content in HTML...</p>",
      "imageUrl": "https://res.cloudinary.com/.../image.jpg",
      "categories": ["trading", "investment"],
      "tags": ["volatility", "trading"],
      "exclusive": false,
      "author": "The Lal Street",
      "views": 150,
      "isPublished": true,
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 50,
    "skip": 0,
    "hasMore": false
  }
}
```

#### 2. Get Single Blog

**GET** `/api/blogs/:id`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "title": "Mastering Volatility Trading",
    "content": "<p>Full blog content...</p>",
    "imageUrl": "https://res.cloudinary.com/.../image.jpg",
    "categories": ["trading"],
    "tags": ["volatility"],
    "exclusive": false,
    "author": "The Lal Street",
    "views": 151,
    "isPublished": true,
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

**Note:** View count is automatically incremented when fetching a blog.

#### 3. Get All Categories

**GET** `/api/blogs/categories/all`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439012",
      "name": "trading",
      "description": "Trading strategies and tips",
      "slug": "trading",
      "blogCount": 15,
      "createdAt": "2024-01-10T10:00:00.000Z",
      "updatedAt": "2024-01-10T10:00:00.000Z"
    }
  ]
}
```

#### 4. Get All Tags

**GET** `/api/blogs/tags/all`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439013",
      "name": "volatility",
      "blogCount": 8,
      "createdAt": "2024-01-10T10:00:00.000Z",
      "updatedAt": "2024-01-10T10:00:00.000Z"
    }
  ]
}
```

### Admin Endpoints (Authentication Required)

All admin endpoints require the `Authorization` header:
```
Authorization: Bearer <admin-token>
```

#### 5. Create Blog

**POST** `/api/blogs`

**Content-Type:** `multipart/form-data`

**Form Data:**
- `title` (string, required) - Blog title
- `content` (string, required) - Blog content (HTML formatted)
- `image` (file, optional) - Image file (if not using imageUrl)
- `imageUrl` (string, optional) - Image URL (if not uploading file)
- `categories` (JSON string array, optional) - Array of category names
- `tags` (JSON string array, optional) - Array of tag names
- `exclusive` (boolean, optional) - Mark as exclusive
- `author` (string, optional) - Author name (default: 'The Lal Street')
- `isPublished` (boolean, optional) - Publish status (default: true)

**Example using FormData:**
```javascript
const formData = new FormData();
formData.append('title', 'My Blog Post');
formData.append('content', '<p>Blog content...</p>');
formData.append('image', imageFile);
formData.append('categories', JSON.stringify(['trading', 'investment']));
formData.append('tags', JSON.stringify(['volatility', 'stocks']));
formData.append('exclusive', 'false');
formData.append('isPublished', 'true');

fetch('/api/blogs', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`
  },
  body: formData
});
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439014",
    "title": "My Blog Post",
    "content": "<p>Blog content...</p>",
    "imageUrl": "https://res.cloudinary.com/.../image.jpg",
    "imagePublicId": "the-lal-street/blogs/abc123",
    "categories": ["trading", "investment"],
    "tags": ["volatility", "stocks"],
    "exclusive": false,
    "author": "The Lal Street",
    "views": 0,
    "isPublished": true,
    "createdAt": "2024-01-20T10:00:00.000Z",
    "updatedAt": "2024-01-20T10:00:00.000Z"
  },
  "message": "Blog created successfully"
}
```

#### 6. Update Blog

**PUT** `/api/blogs/:id`

**Content-Type:** `multipart/form-data`

**Form Data:** Same as Create Blog (all fields optional)

**Response:**
```json
{
  "success": true,
  "data": { /* Updated blog object */ },
  "message": "Blog updated successfully"
}
```

#### 7. Delete Blog

**DELETE** `/api/blogs/:id`

**Response:**
```json
{
  "success": true,
  "message": "Blog deleted successfully"
}
```

**Note:** This also deletes the associated image from Cloudinary if `imagePublicId` exists.

---

## Admin Panel Usage

### Accessing Admin Panel

1. Navigate to `#admin` in your browser
2. Enter admin password
3. Click on the **"Blogs"** tab

### Creating a Blog

1. Click **"Create Blog"** button
2. Fill in the form:
   - **Title** (required): Blog title
   - **Content** (required): Blog content (supports HTML)
   - **Image**: Upload image file OR provide image URL
   - **Categories**: Add categories (type and press Enter or click Add)
   - **Tags**: Add tags (type and press Enter or click Add)
   - **Exclusive**: Toggle for exclusive content
   - **Published**: Toggle to publish/draft
3. Click **"Create"** button

### Editing a Blog

1. Find the blog in the table
2. Click the **Edit** icon (pencil)
3. Modify fields as needed
4. Click **"Update"** button

### Deleting a Blog

1. Find the blog in the table
2. Click the **Delete** icon (trash)
3. Confirm deletion

### Managing Categories and Tags

- Categories and tags are created automatically when you add them to a blog
- They appear in the filter dropdowns on the public blog page
- Category and tag counts are updated automatically

---

## Frontend Components

### BlogsPage Component

**Location:** `client/src/components/BlogsPage.tsx`

**Features:**
- Blog grid display
- Search functionality
- Filter by category and tags
- Sort by latest or most viewed
- Most popular sidebar
- Trending tags sidebar
- Blog detail modal

**Usage:**
```tsx
import { BlogsPage } from './components/BlogsPage';

<BlogsPage onNavigate={handleNavigate} />
```

### AdminBlogs Component

**Location:** `client/src/components/AdminBlogs.tsx`

**Features:**
- Blog management table
- Create/Edit/Delete operations
- Image upload/URL input
- Category and tag management
- Exclusive and publish toggles

**Usage:**
```tsx
import { AdminBlogs } from './components/AdminBlogs';

<AdminBlogs />
```

### BlogDetailModal Component

**Location:** `client/src/components/BlogDetailModal.tsx`

**Features:**
- Full blog content display
- Formatted HTML rendering
- Image display
- Category and tag badges
- View count and date

**Usage:**
```tsx
import { BlogDetailModal } from './components/BlogDetailModal';

<BlogDetailModal
  blog={selectedBlog}
  open={isOpen}
  onClose={handleClose}
/>
```

### Services

**Location:** `client/src/services/blogsService.ts`

**Functions:**
- `fetchBlogs(filters)` - Get blogs with filters
- `fetchBlogById(id)` - Get single blog
- `fetchCategories()` - Get all categories
- `fetchTags()` - Get all tags
- `createBlog(blogData)` - Create blog (admin)
- `updateBlog(id, updates)` - Update blog (admin)
- `deleteBlog(id)` - Delete blog (admin)

---

## Environment Variables

### Backend (.env in server/)

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# MongoDB (already configured)
MONGODB_URI=mongodb+srv://...

# Admin Authentication (already configured)
ADMIN_PASSWORD=your-admin-password
```

### Frontend (.env in client/)

No additional environment variables needed for blogs feature. Uses existing:
- `VITE_API_URL` - API base URL

---

## Troubleshooting

### Issue: "Cloudinary credentials not configured"

**Solution:**
1. Check that all three Cloudinary environment variables are set
2. Verify credentials in Cloudinary dashboard
3. Restart the server after setting environment variables

### Issue: "Image upload fails"

**Solution:**
1. Check file size (max 5MB)
2. Verify file is an image (jpg, png, gif, etc.)
3. Check Cloudinary credentials
4. Verify network connectivity

### Issue: "Blogs not showing on public page"

**Solution:**
1. Check `isPublished` is set to `true`
2. Verify database connection
3. Check browser console for API errors
4. Verify blogs route is registered in `server.js`

### Issue: "Select component error: empty string value"

**Solution:**
- This is fixed in the code. The Select component uses `"all"` instead of `""` for "All Categories"
- If you see this error, ensure you're using the latest code

### Issue: "Categories/Tags not appearing"

**Solution:**
1. Categories and tags are created automatically when added to blogs
2. If they don't appear, check:
   - Blog was saved successfully
   - Database connection is working
   - Categories/tags are lowercase (normalized automatically)

### Issue: "View count not incrementing"

**Solution:**
1. View count increments when fetching a single blog via `GET /api/blogs/:id`
2. It does NOT increment when fetching all blogs
3. Check that you're using the correct endpoint

### Issue: "Cannot delete blog image from Cloudinary"

**Solution:**
1. Check that `imagePublicId` is stored in the blog document
2. Verify Cloudinary credentials
3. Check Cloudinary dashboard for the image
4. Image deletion is optional - blog will still be deleted even if image deletion fails

---

## Best Practices

1. **Image Optimization**
   - Use compressed images (max 5MB)
   - Recommended formats: JPG, PNG, WebP
   - Use Cloudinary transformations for responsive images

2. **Content Formatting**
   - Use HTML for rich content
   - Keep content readable and well-structured
   - Use proper heading tags (h1, h2, h3)

3. **Categories and Tags**
   - Use consistent naming (lowercase, no spaces)
   - Don't create too many categories (5-10 recommended)
   - Tags can be more numerous (20-50 recommended)

4. **SEO Considerations**
   - Use descriptive titles
   - Add relevant categories and tags
   - Include keywords in content
   - Use proper HTML structure

5. **Performance**
   - Limit blog list queries (use pagination)
   - Optimize images before upload
   - Use caching for frequently accessed blogs

---

## API Rate Limiting

Blogs endpoints are subject to the general API rate limit:
- **15 minutes window**: 100 requests per IP
- **Calculator endpoints**: 20 requests per 5 minutes

Admin endpoints require authentication and are not rate-limited separately.

---

## Security Considerations

1. **Admin Authentication**: All create/update/delete operations require admin token
2. **File Upload**: Only image files are allowed (validated by MIME type)
3. **File Size**: Maximum 5MB per image
4. **Input Validation**: All inputs are validated and sanitized
5. **XSS Protection**: HTML content is rendered safely using React's `dangerouslySetInnerHTML` (ensure content is sanitized before saving)

---

## Future Enhancements

Potential improvements:
- [ ] Rich text editor (WYSIWYG) for content
- [ ] Image optimization and transformations
- [ ] Blog drafts and scheduling
- [ ] Comments system
- [ ] Blog search with full-text search
- [ ] RSS feed generation
- [ ] Social media sharing
- [ ] Blog analytics dashboard
- [ ] Multi-author support
- [ ] Blog templates

---

## Support

For issues or questions:
1. Check this documentation
2. Review server logs for errors
3. Check browser console for frontend errors
4. Verify environment variables are set correctly
5. Ensure database connection is active

---

**Last Updated:** January 2024
**Version:** 1.0.0





