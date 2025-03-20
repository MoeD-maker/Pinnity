import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { 
  Home, Search, Heart, User, MapPin, Menu, LogOut, Bell, 
  Store, BarChart3, Settings, FileText, Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [location, navigate] = useLocation();
  const { user, logout } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, text: "New deal available from your favorite store", read: false },
    { id: 2, text: "Your favorite deal is about to expire", read: false },
    { id: 3, text: "Pinnity: Explore new deals in your area!", read: true }
  ]);

  const handleShowNotifications = () => {
    setNotificationsOpen(!notificationsOpen);
    // Mark notifications as read when opened
    if (!notificationsOpen && notifications.some(n => !n.read)) {
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    }
  };
  
  // Define navigation items based on user type
  const getNavigationItems = () => {
    if (user?.userType === 'business') {
      // Vendor navigation
      return [
        { icon: <Store className="w-5 h-5" />, label: 'Dashboard', path: '/vendor' },
        { icon: <Package className="w-5 h-5" />, label: 'Create Deal', path: '/vendor/deals/create' },
        { icon: <BarChart3 className="w-5 h-5" />, label: 'Analytics', path: '/vendor?tab=analytics' },
        { icon: <FileText className="w-5 h-5" />, label: 'Profile', path: '/vendor/profile' },
      ];
    } else if (user?.userType === 'admin') {
      // Admin navigation
      return [
        { icon: <BarChart3 className="w-5 h-5" />, label: 'Dashboard', path: '/admin' },
        { icon: <Store className="w-5 h-5" />, label: 'Vendors', path: '/admin/vendors' },
        { icon: <Package className="w-5 h-5" />, label: 'Deals', path: '/admin/deals' },
        { icon: <User className="w-5 h-5" />, label: 'Users', path: '/admin/users' },
      ];
    } else {
      // Customer navigation
      return [
        { icon: <Home className="w-5 h-5" />, label: 'Home', path: '/' },
        { icon: <Search className="w-5 h-5" />, label: 'Explore', path: '/explore' },
        { icon: <MapPin className="w-5 h-5" />, label: 'Map', path: '/map' },
        { icon: <Heart className="w-5 h-5" />, label: 'Favorites', path: '/favorites' },
        { icon: <User className="w-5 h-5" />, label: 'Profile', path: '/profile' },
      ];
    }
  };

  const navigationItems = getNavigationItems();

  const isActive = (path: string) => {
    // Exact match for root path
    if (path === '/' && location === '/') return true;
    
    // Handle paths with query parameters
    if (path.includes('?')) {
      const basePath = path.split('?')[0];
      return location === basePath || location.startsWith(basePath + '?');
    }
    
    // For vendor specific routes, require exact matches to prevent
    // both Dashboard and Create Deal from highlighting
    if (path.startsWith('/vendor/')) {
      return location === path;
    }
    
    // For admin specific sub-routes, require exact matches
    if (path.startsWith('/admin/')) {
      return location === path;
    }
    
    // General case - path is active if location starts with path
    // but only if path is not just a base section like /vendor or /admin
    if (path !== '/' && path !== '/vendor' && path !== '/admin') {
      return location.startsWith(path);
    }
    
    // Exact match for base sections
    return location === path;
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Mobile header */}
      <header className="md:hidden sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[250px] sm:w-[300px]">
                <div className="py-4">
                  <div className="flex items-center gap-2 mb-6 px-2">
                    <Avatar>
                      <AvatarFallback>{user?.firstName?.[0]}{user?.lastName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                      <p className="text-sm text-muted-foreground">{user?.email}</p>
                    </div>
                  </div>
                  <nav className="flex flex-col gap-1">
                    {navigationItems.map((item) => (
                      <button
                        key={item.path}
                        aria-current={isActive(item.path) ? "page" : undefined}
                        className={`flex items-center gap-3 px-2 py-2 rounded-md text-sm w-full text-left ${
                          isActive(item.path) 
                            ? 'bg-primary/10 text-primary font-medium' 
                            : 'text-muted-foreground hover:bg-muted'
                        }`}
                        onClick={() => navigate(item.path)}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </button>
                    ))}
                    <button 
                      className="flex items-center gap-3 px-2 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted w-full text-left"
                      onClick={() => navigate('/settings')}
                    >
                      <Settings className="w-5 h-5" />
                      <span>Settings</span>
                    </button>
                    <button 
                      className="flex items-center gap-3 px-2 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted mt-4"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-5 h-5" />
                      Log Out
                    </button>
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
            <div 
              className="font-bold text-xl text-primary ml-2 cursor-pointer"
              onClick={() => {
                if (user?.userType === 'business') {
                  navigate('/vendor');
                } else if (user?.userType === 'admin') {
                  navigate('/admin');
                } else {
                  navigate('/');
                }
              }}
            >
              Pinnity
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={handleShowNotifications}
                  aria-label="Show notifications"
                  className="relative"
                >
                  <Bell className="h-5 w-5" />
                  {notifications.some(n => !n.read) && (
                    <Badge 
                      className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]" 
                      variant="destructive"
                    >
                      {notifications.filter(n => !n.read).length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-80 p-0" 
                sideOffset={5}
                alignOffset={-5}
                align="end"
              >
                <div className="p-2 font-medium border-b">
                  Notifications
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {notifications.length > 0 ? (
                    <div className="divide-y">
                      {notifications.map(notification => (
                        <div 
                          key={notification.id} 
                          className={`p-3 text-sm ${notification.read ? 'opacity-70' : 'bg-muted/50'}`}
                        >
                          {notification.text}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">
                      No notifications
                    </div>
                  )}
                </div>
                {notifications.length > 0 && (
                  <div className="p-2 border-t">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full text-xs" 
                      onClick={() => setNotifications([])}
                    >
                      Clear all
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{user?.firstName?.[0]}{user?.lastName?.[0]}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end"
                sideOffset={5}
                className="w-56"
                alignOffset={-5}
              >
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/favorites')}>
                  Favorites
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      
      {/* Desktop layout */}
      <div className="flex-1 flex">
        <nav className="hidden md:flex flex-col fixed w-60 h-screen border-r p-4">
          <div 
            className="font-bold text-2xl text-primary mb-8 cursor-pointer"
            onClick={() => {
              if (user?.userType === 'business') {
                navigate('/vendor');
              } else if (user?.userType === 'admin') {
                navigate('/admin');
              } else {
                navigate('/');
              }
            }}
          >
            Pinnity
          </div>
          
          <div className="flex-1 flex flex-col gap-1">
            {navigationItems.map((item) => (
              <button
                key={item.path}
                aria-current={isActive(item.path) ? "page" : undefined}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-left ${
                  isActive(item.path) 
                    ? 'bg-primary/10 text-primary font-medium' 
                    : 'text-muted-foreground hover:bg-muted'
                }`}
                onClick={() => navigate(item.path)}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
          
          <div className="mt-auto pt-4 border-t">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Avatar>
                  <AvatarFallback>{user?.firstName?.[0]}{user?.lastName?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end"
                  sideOffset={5}
                  className="w-56"
                  alignOffset={-5}
                >
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </nav>
        
        <main className="flex-1 md:ml-60 pb-16 md:pb-0">
          <div className="flex-grow flex flex-col">
            <div className="w-full flex flex-col">
              {children}
            </div>
          </div>
        </main>
      </div>
      
      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-10 mobile-nav">
        <div className="flex justify-around">
          {navigationItems.map((item) => (
            <button
              key={item.path}
              aria-current={isActive(item.path) ? "page" : undefined}
              className={`flex flex-col items-center py-2 px-3 ${
                isActive(item.path) 
                  ? 'text-primary' 
                  : 'text-muted-foreground'
              }`}
              onClick={() => navigate(item.path)}
            >
              {item.icon}
              <span className="text-xs mt-1">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}