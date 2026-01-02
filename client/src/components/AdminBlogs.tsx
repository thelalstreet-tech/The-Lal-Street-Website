// client/src/components/AdminBlogs.tsx
import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Switch } from './ui/switch';
import { Plus, Edit, Trash2, Save, X, Loader2, Image as ImageIcon } from 'lucide-react';
import type { Blog, Category, Tag } from '../types/blog';
import {
  fetchBlogs,
  fetchCategories,
  fetchTags,
  createBlog,
  updateBlog,
  deleteBlog,
} from '../services/blogsService';

export function AdminBlogs() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingBlogId, setEditingBlogId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [exclusive, setExclusive] = useState(false);
  const [isPublished, setIsPublished] = useState(true);
  const [newCategory, setNewCategory] = useState('');
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [blogsResult, categoriesData, tagsData] = await Promise.all([
        fetchBlogs({ isPublished: undefined, limit: 100 }), // Get all blogs for admin
        fetchCategories(),
        fetchTags(),
      ]);
      setBlogs(blogsResult.data || []);
      setCategories(categoriesData);
      setTags(tagsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setImageFile(null);
    setImageUrl('');
    setImagePreview(null);
    setSelectedCategories([]);
    setSelectedTags([]);
    setExclusive(false);
    setIsPublished(true);
    setNewCategory('');
    setNewTag('');
    setIsEditing(false);
    setEditingBlogId(null);
  };

  const handleOpenDialog = (blog?: Blog) => {
    if (blog) {
      setTitle(blog.title);
      setContent(blog.content);
      setImageUrl(blog.imageUrl);
      setImagePreview(blog.imageUrl);
      setSelectedCategories([...blog.categories]);
      setSelectedTags([...blog.tags]);
      setExclusive(blog.exclusive);
      setIsPublished(blog.isPublished);
      setIsEditing(true);
      setEditingBlogId(blog.id);
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddCategory = () => {
    if (newCategory.trim() && !selectedCategories.includes(newCategory.trim().toLowerCase())) {
      setSelectedCategories([...selectedCategories, newCategory.trim().toLowerCase()]);
      setNewCategory('');
    }
  };

  const handleRemoveCategory = (category: string) => {
    setSelectedCategories(selectedCategories.filter(c => c !== category));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !selectedTags.includes(newTag.trim().toLowerCase())) {
      setSelectedTags([...selectedTags, newTag.trim().toLowerCase()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setSelectedTags(selectedTags.filter(t => t !== tag));
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      alert('Please fill in title and content');
      return;
    }

    if (!imageFile && !imageUrl) {
      alert('Please upload an image or provide an image URL');
      return;
    }

    setIsLoading(true);
    try {
      const blogData = {
        title: title.trim(),
        content: content.trim(),
        image: imageFile || undefined,
        imageUrl: imageUrl || undefined,
        categories: selectedCategories,
        tags: selectedTags,
        exclusive,
        isPublished,
      };

      let createdBlog;
      if (isEditing && editingBlogId) {
        createdBlog = await updateBlog(editingBlogId, blogData);
      } else {
        createdBlog = await createBlog(blogData);
      }

      // If we got here and have a blog, it was successful
      if (createdBlog) {
        await loadData();
        handleCloseDialog();
        // Show success message
        alert(isEditing ? 'Blog updated successfully!' : 'Blog created successfully!');
      }
    } catch (error: any) {
      // Check if error message suggests blog was created but category/tag update failed
      const errorMsg = error.message || '';
      if (errorMsg.includes('duplicate key') || errorMsg.includes('category') || errorMsg.includes('tag')) {
        // Blog might have been created, try to reload and show success
        try {
          await loadData();
          const blogs = await fetchBlogs({ isPublished: undefined, limit: 100 });
          const latestBlog = blogs.data?.[0];
          if (latestBlog && latestBlog.title === title.trim()) {
            handleCloseDialog();
            alert('Blog created successfully! (Note: Some category/tag updates may have failed, but the blog was saved.)');
            return;
          }
        } catch (e) {
          // Fall through to error message
        }
      }
      alert(error.message || 'Error saving blog');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this blog?')) {
      return;
    }

    setIsLoading(true);
    try {
      await deleteBlog(id);
      await loadData();
    } catch (error: any) {
      alert(error.message || 'Error deleting blog');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Blog Management</h2>
          <p className="text-sm text-gray-600 mt-1">Create and manage blog posts</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Blog
        </Button>
      </div>

      {isLoading && blogs.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Categories</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Exclusive</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      No blogs found. Create your first blog!
                    </TableCell>
                  </TableRow>
                ) : (
                  blogs.map((blog) => (
                    <TableRow key={blog.id}>
                      <TableCell>
                        <img
                          src={blog.imageUrl}
                          alt={blog.title}
                          className="w-16 h-16 object-cover rounded"
                        />
                      </TableCell>
                      <TableCell className="font-medium max-w-xs truncate">
                        {blog.title}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {blog.categories.slice(0, 2).map((cat) => (
                            <Badge key={cat} variant="secondary" className="text-xs">
                              {cat}
                            </Badge>
                          ))}
                          {blog.categories.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{blog.categories.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {blog.tags.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {blog.tags.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{blog.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {blog.exclusive ? (
                          <Badge variant="default" className="bg-purple-600">Exclusive</Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {blog.isPublished ? (
                          <Badge variant="default" className="bg-green-600">Published</Badge>
                        ) : (
                          <Badge variant="secondary">Draft</Badge>
                        )}
                      </TableCell>
                      <TableCell>{blog.views}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDialog(blog)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(blog.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Blog' : 'Create New Blog'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Update blog details' : 'Fill in the details to create a new blog post'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter blog title"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter blog content (supports HTML formatting)"
                rows={10}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="image">Image *</Label>
              <div className="mt-1 space-y-2">
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="cursor-pointer"
                />
                {!imageFile && (
                  <div className="space-y-2">
                    <Label htmlFor="imageUrl">Or provide image URL</Label>
                    <Input
                      id="imageUrl"
                      value={imageUrl}
                      onChange={(e) => {
                        setImageUrl(e.target.value);
                        setImagePreview(e.target.value);
                      }}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                )}
                {imagePreview && (
                  <div className="mt-2">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full max-w-md h-48 object-cover rounded border"
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label>Categories</Label>
              <div className="mt-1 space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Add category"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                  />
                  <Button type="button" onClick={handleAddCategory} variant="outline">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedCategories.map((cat) => (
                    <Badge key={cat} variant="secondary" className="gap-1">
                      {cat}
                      <button
                        onClick={() => handleRemoveCategory(cat)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <Label>Tags</Label>
              <div className="mt-1 space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add tag"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  />
                  <Button type="button" onClick={handleAddTag} variant="outline">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedTags.map((tag) => (
                    <Badge key={tag} variant="outline" className="gap-1">
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="exclusive"
                  checked={exclusive}
                  onCheckedChange={setExclusive}
                />
                <Label htmlFor="exclusive">Exclusive Blog</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="published"
                  checked={isPublished}
                  onCheckedChange={setIsPublished}
                />
                <Label htmlFor="published">Published</Label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {isEditing ? 'Update' : 'Create'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

