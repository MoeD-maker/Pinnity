import React from 'react';
import { Link, useLocation } from 'wouter';
import { Home, Search, Heart, User, MapPin, Menu, LogOut, Bell } from 'lucide-react';
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

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [location, navigate] = useLocation();
  
  // In a real app, this would come from an auth context/provider
  const user = {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com'
  };

  const navigationItems = [
    { icon: <Home className="w-5 h-5" />, label: 'Home', path: '/' },
    { icon: <Search className="w-5 h-5" />, label: 'Explore', path: '/explore' },
    { icon: <MapPin className="w-5 h-5" />, label: 'Map', path: '/map' },
    { icon: <Heart className="w-5 h-5" />, label: 'Favorites', path: '/favorites' },
    { icon: <User className="w-5 h-5" />, label: 'Profile', path: '/profile' },
  ];

  const isActive = (path: string) => {
    if (path === '/' && location === '/') return true;
    if (path !== '/' && location.startsWith(path)) return true;
    return false;
  };

  const handleLogout = () => {
    // In a real app, would call an auth logout method here
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
                      <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <nav className="flex flex-col gap-1">
                    {navigationItems.map((item) => (
                      <Link key={item.path} href={item.path}>
                        <a className={`flex items-center gap-3 px-2 py-2 rounded-md text-sm ${
                          isActive(item.path) 
                            ? 'bg-primary/10 text-primary font-medium' 
                            : 'text-muted-foreground hover:bg-muted'
                        }`}>
                          {item.icon}
                          {item.label}
                        </a>
                      </Link>
                    ))}
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
            <Link href="/">
              <a className="font-bold text-xl text-primary ml-2">Pinnity</a>
            </Link>
          </div>
          
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/favorites')}>
                  Favorites
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
          <Link href="/">
            <a className="font-bold text-2xl text-primary mb-8">Pinnity</a>
          </Link>
          
          <div className="flex-1 flex flex-col gap-1">
            {navigationItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <a className={`flex items-center gap-3 px-3 py-2 rounded-md ${
                  isActive(item.path) 
                    ? 'bg-primary/10 text-primary font-medium' 
                    : 'text-muted-foreground hover:bg-muted'
                }`}>
                  {item.icon}
                  {item.label}
                </a>
              </Link>
            ))}
          </div>
          
          <div className="mt-auto pt-4 border-t">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Avatar>
                  <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
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
        
        <main className="flex-1 md:ml-60">
          {children}
        </main>
      </div>
      
      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-10">
        <div className="flex justify-around">
          {navigationItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <a className={`flex flex-col items-center py-2 px-3 ${
                isActive(item.path) 
                  ? 'text-primary' 
                  : 'text-muted-foreground'
              }`}>
                {item.icon}
                <span className="text-xs mt-1">{item.label}</span>
              </a>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}