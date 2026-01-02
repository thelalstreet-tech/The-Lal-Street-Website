import React from 'react';
import { Shield, ArrowLeft, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { AdminSuggestedBuckets } from './AdminSuggestedBuckets';
import { AdminBlogs } from './AdminBlogs';
import { AdminLogin } from './AdminLogin';
import { useAuth } from '../hooks/useAuth';

interface AdminPageProps {
  onNavigate?: (page: string) => void;
}

export function AdminPage({ onNavigate }: AdminPageProps) {
  const { isAuthenticated, isLoading, logout, checkAuth } = useAuth();
  const [showLogin, setShowLogin] = React.useState(false);

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setShowLogin(true);
    } else if (isAuthenticated) {
      setShowLogin(false);
    }
  }, [isAuthenticated, isLoading]);

  const handleLoginSuccess = () => {
    // Trigger auth check to update state
    checkAuth();
    setShowLogin(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <AdminLogin open={showLogin} onLoginSuccess={handleLoginSuccess} />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50">
          <div className="text-center">
            <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Please wait for login...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-300 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {onNavigate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate('home')}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              )}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 shadow-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
                  <p className="text-sm text-gray-600">Manage content and settings</p>
                </div>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-3">
              <Badge variant="secondary" className="px-3 py-1">
                <Shield className="h-3 w-3 mr-1" />
                Admin Access
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  logout();
                  if (onNavigate) {
                    onNavigate('home');
                  }
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="buckets" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="buckets">Suggested Buckets</TabsTrigger>
            <TabsTrigger value="blogs">Blogs</TabsTrigger>
          </TabsList>
          <TabsContent value="buckets">
            <AdminSuggestedBuckets isAdmin={true} />
          </TabsContent>
          <TabsContent value="blogs">
            <AdminBlogs />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

