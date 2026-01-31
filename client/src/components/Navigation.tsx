import React, { useState } from 'react';
import { Home, BarChart3, Target, FileText, Brain, BookOpen, Newspaper, LogIn, LogOut, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from './ui/utils';
import { useAuth } from '../contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { LoginModal } from './LoginModal';

interface NavigationProps {
  activePage: string;
  onNavigate: (page: string) => void;
  selectedFundsCount?: number;
}

export function Navigation({ activePage, onNavigate, selectedFundsCount = 0 }: NavigationProps) {
  const { user, isAuthenticated, logout, isLoading } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Main navigation items (short labels)
  const mainNavItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'investment-plan', label: 'Investment', icon: BarChart3 },
    { id: 'retirement-plan', label: 'Retirement', icon: Target },
    { id: 'financial-planning', label: 'Financial', icon: FileText },
    { id: 'ai-stock-analysis', label: 'AI Analysis', icon: Brain },
  ];

  // Content dropdown items (News + Blogs)
  const contentItems = [
    { id: 'news', label: 'News', icon: Newspaper, description: 'Latest market news' },
    { id: 'blogs', label: 'Blogs', icon: BookOpen, description: 'Insights & guides' },
  ];

  // Mobile nav items (all)
  const mobileNavItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'investment-plan', label: 'Invest', icon: BarChart3 },
    { id: 'retirement-plan', label: 'Retire', icon: Target },
    { id: 'financial-planning', label: 'Plan', icon: FileText },
    { id: 'ai-stock-analysis', label: 'AI', icon: Brain },
    { id: 'news', label: 'News', icon: Newspaper },
  ];

  const handleNavClick = (pageId: string) => {
    onNavigate(pageId);
  };

  const handleLogout = async () => {
    await logout();
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isContentActive = contentItems.some(item => item.id === activePage);

  return (
    <nav className="bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <img
              src="/logo.png"
              alt="The Lal Street"
              className="h-16 sm:h-20 w-auto object-contain"
            />
            <div className="hidden md:block">
              <p className="text-[10px] text-slate-500 leading-tight">Portfolio Analysis &</p>
              <p className="text-[10px] text-slate-500 leading-tight">Investment Calculator</p>
            </div>
          </button>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {/* Main Nav Items */}
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleNavClick(item.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 h-8 text-xs font-medium transition-all duration-200',
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md hover:from-blue-700 hover:to-indigo-700'
                      : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </Button>
              );
            })}

            {/* Content Dropdown (News + Blogs) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 h-8 text-xs font-medium transition-all duration-200',
                    isContentActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md hover:from-blue-700 hover:to-indigo-700'
                      : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
                  )}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Content</span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {contentItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activePage === item.id;
                  return (
                    <DropdownMenuItem
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={cn(
                        'flex items-center gap-3 p-2.5 cursor-pointer',
                        isActive && 'bg-blue-50'
                      )}
                    >
                      <Icon className={cn(
                        'w-4 h-4',
                        isActive ? 'text-blue-600' : 'text-slate-500'
                      )} />
                      <div>
                        <p className={cn(
                          'text-sm font-medium',
                          isActive ? 'text-blue-600' : 'text-slate-700'
                        )}>
                          {item.label}
                        </p>
                        <p className="text-xs text-slate-400">{item.description}</p>
                      </div>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2">
            {/* Portfolio Badge */}
            {selectedFundsCount > 0 && (
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-100">
                <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs font-semibold text-slate-700">
                  {selectedFundsCount} {selectedFundsCount === 1 ? 'Fund' : 'Funds'}
                </span>
              </div>
            )}

            {/* Auth Section */}
            {!isLoading && (
              <>
                {!isAuthenticated ? (
                  <Button
                    onClick={() => setShowLoginModal(true)}
                    size="sm"
                    className="flex items-center gap-1.5 px-3 py-1.5 h-8 text-xs font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Login</span>
                  </Button>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                        <Avatar className="h-8 w-8 border-2 border-blue-500">
                          {user?.picture && (
                            <AvatarImage src={user.picture} alt={user.name} />
                          )}
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold text-xs">
                            {user?.name ? getUserInitials(user.name) : 'U'}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">{user?.name}</p>
                          <p className="text-xs leading-none text-muted-foreground">
                            {user?.email}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleLogout}
                        className="text-red-600 focus:text-red-600 cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        <span>Logout</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-50">
        <div className="flex items-center justify-around py-1.5 px-1">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all duration-200 flex-1',
                  isActive
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-slate-500 hover:text-blue-600'
                )}
              >
                <Icon className={cn('w-5 h-5', isActive && 'scale-110')} />
                <span className="text-[9px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Login Modal */}
      <LoginModal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </nav>
  );
}
