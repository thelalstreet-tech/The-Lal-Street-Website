import React, { useState } from 'react';
import { Home, BarChart3, Target, FileText, LogIn, LogOut } from 'lucide-react';
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
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'investment-plan', label: 'Investment Plan', icon: BarChart3 },
    { id: 'retirement-plan', label: 'Retirement Plan', icon: Target },
    { id: 'financial-planning', label: 'Financial Planning', icon: FileText },
  ];

  const handleNavClick = (pageId: string) => {
    onNavigate(pageId);
  };

  const handleLogout = async () => {
    await logout();
  };

  // Get user initials for avatar fallback
  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <nav className="bg-white border-b border-slate-300 shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2 sm:gap-3">
            <img 
              src="/logo.png" 
              alt="The Lal Street" 
              className="h-20 sm:h-20 md:h-24 w-auto object-contain"
            />
            <div className="hidden sm:block">
              <p className="text-xs text-slate-500">Portfolio Analysis & Investment Calculator</p>
            </div>
          </div>

          {/* Desktop Navigation Items */}
          <div className="hidden md:flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <Button
                  key={item.id}
                  variant={isActive ? 'default' : 'ghost'}
                  onClick={() => handleNavClick(item.id)}
                  className={cn(
                    'flex items-center gap-2',
                    isActive && 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Button>
              );
            })}
          </div>

          {/* Stats Badge - Desktop */}
          {selectedFundsCount > 0 && (
            <div className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 border border-blue-100">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <div className="text-left">
                <div className="text-xs text-slate-500">Portfolio</div>
                <div className="text-sm font-semibold text-slate-900">
                  {selectedFundsCount} {selectedFundsCount === 1 ? 'Fund' : 'Funds'}
                </div>
              </div>
            </div>
          )}

          {/* Auth Section - Desktop */}
          <div className="hidden md:flex items-center gap-3">
            {!isLoading && (
              <>
                {!isAuthenticated ? (
                  <Button
                    onClick={() => setShowLoginModal(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Login</span>
                  </Button>
                ) : (
                  <div 
                    className="relative group"
                    onMouseEnter={() => setShowProfileDropdown(true)}
                    onMouseLeave={() => setShowProfileDropdown(false)}
                  >
                    <DropdownMenu open={showProfileDropdown} onOpenChange={setShowProfileDropdown}>
                      <DropdownMenuTrigger asChild>
                        <button 
                          className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 hover:ring-2 hover:ring-blue-300 transition-all"
                          title={user?.email || 'Profile'}
                        >
                          <Avatar className="h-9 w-9 border-2 border-blue-500 hover:border-blue-600 transition-colors">
                            {user?.picture && (
                              <AvatarImage src={user.picture} alt={user.name} />
                            )}
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold">
                              {user?.name ? getUserInitials(user.name) : 'U'}
                            </AvatarFallback>
                          </Avatar>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent 
                        align="end" 
                        className="w-56"
                        onMouseEnter={() => setShowProfileDropdown(true)}
                        onMouseLeave={() => setShowProfileDropdown(false)}
                      >
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
                  </div>
                )}
              </>
            )}
          </div>

          {/* Mobile Stats Badge & Auth */}
          <div className="md:hidden flex items-center gap-2">
            {selectedFundsCount > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 border border-blue-100">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-slate-900">{selectedFundsCount}</span>
              </div>
            )}
            {!isLoading && (
              <>
                {!isAuthenticated ? (
                  <Button
                    onClick={() => setShowLoginModal(true)}
                    size="sm"
                    className="flex items-center gap-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                  >
                    <LogIn className="w-4 h-4" />
                    <span className="hidden sm:inline">Login</span>
                  </Button>
                ) : (
                  <div 
                    className="relative group"
                    onMouseEnter={() => setShowProfileDropdown(true)}
                    onMouseLeave={() => setShowProfileDropdown(false)}
                  >
                    <DropdownMenu open={showProfileDropdown} onOpenChange={setShowProfileDropdown}>
                      <DropdownMenuTrigger asChild>
                        <button 
                          className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 hover:ring-2 hover:ring-blue-300 transition-all"
                          title={user?.email || 'Profile'}
                        >
                          <Avatar className="h-8 w-8 border-2 border-blue-500 hover:border-blue-600 transition-colors">
                            {user?.picture && (
                              <AvatarImage src={user.picture} alt={user.name} />
                            )}
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-semibold">
                              {user?.name ? getUserInitials(user.name) : 'U'}
                            </AvatarFallback>
                          </Avatar>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent 
                        align="end" 
                        className="w-56"
                        onMouseEnter={() => setShowProfileDropdown(true)}
                        onMouseLeave={() => setShowProfileDropdown(false)}
                      >
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
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Mobile Bottom Navigation Bar (Always Visible) */}
        <div className="md:hidden border-t border-slate-200 bg-white">
          <div className="flex items-center justify-around py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={cn(
                    'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors',
                    isActive 
                      ? 'text-blue-600 bg-blue-50' 
                      : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
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

