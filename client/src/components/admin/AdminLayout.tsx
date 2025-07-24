import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  Store, 
  Home, 
  Users, 
  Tag, 
  LineChart, 
  Settings, 
  Bell, 
  Menu, 
  X, 
  LogOut, 
  User,
  ChevronRight,
  ChevronDown,
  HelpCircle,
  Building,
  LayoutDashboard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [location, navigate] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pendingVendorsCount, setPendingVendorsCount] = useState(0);
  const { user, logout } = useAuth();
  const { toast } = useToast();
  
  // Fetch pending vendors count for sidebar badge
  useEffect(() => {
    if (user?.userType === 'admin') {
      // Use Promise.allSettled to handle potential failures gracefully
      const fetchPendingVendors = async () => {
        try {
          // Try the versioned API endpoint first
          const pendingResponse = await fetch('/api/v1/admin/businesses/pending');
          if (pendingResponse.ok) {
            const data = await pendingResponse.json();
            let count = 0;
            
            // Handle array response
            if (Array.isArray(data)) {
              count = data.length;
            } 
            // Handle object with numeric keys (legacy format)
            else if (data && typeof data === 'object') {
              // First try direct numeric indexing
              const numericKeysArray = [];
              let i = 0;
              while (data[i] !== undefined) {
                numericKeysArray.push(data[i]);
                i++;
              }
              
              if (numericKeysArray.length > 0) {
                count = numericKeysArray.length;
              } else {
                // Fallback to Object.keys or Object.values
                count = Object.values(data).length;
              }
            }
            
            console.log(`AdminLayout: Found ${count} pending vendors`);
            setPendingVendorsCount(count);
            return;
          }
          
          // If versioned endpoint fails, try legacy endpoint
          const legacyResponse = await fetch('/api/admin/businesses/pending');
          if (legacyResponse.ok) {
            const data = await legacyResponse.json();
            let count = 0;
            
            // Handle array response
            if (Array.isArray(data)) {
              count = data.length;
            } 
            // Handle object with numeric keys (legacy format)
            else if (data && typeof data === 'object') {
              // First try direct numeric indexing
              const numericKeysArray = [];
              let i = 0;
              while (data[i] !== undefined) {
                numericKeysArray.push(data[i]);
                i++;
              }
              
              if (numericKeysArray.length > 0) {
                count = numericKeysArray.length;
              } else {
                // Fallback to Object.keys or Object.values
                count = Object.values(data).length;
              }
            }
            
            console.log(`AdminLayout: Found ${count} pending vendors (legacy)`)
            setPendingVendorsCount(count);
            return;
          }
          
          // If we reach here, both endpoints failed but didn't throw
          console.error('Both API endpoints failed but returned responses');
          setPendingVendorsCount(0);
        } catch (error) {
          console.error('Error fetching pending vendors count:', error);
          setPendingVendorsCount(0);
        }
      };
      
      fetchPendingVendors();
    }
  }, [user]);
  
  const isCurrentPath = (path: string) => {
    if (path === "/admin" && location === "/admin") {
      return true;
    }
    return path !== "/admin" && location.startsWith(path);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/auth");
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Error",
        description: "There was a problem logging out.",
        variant: "destructive",
      });
    }
  };

  const menuItems = [
    { name: "Dashboard", path: "/admin", icon: <LayoutDashboard className="h-5 w-5" /> },
    { name: "Vendors", path: "/admin/vendors", icon: <Building className="h-5 w-5" /> },
    { name: "Users", path: "/admin/users", icon: <Users className="h-5 w-5" /> },
    { name: "Deals", path: "/admin/deals", icon: <Tag className="h-5 w-5" /> },
    { name: "Analytics", path: "/admin/analytics", icon: <LineChart className="h-5 w-5" /> },
    // Settings page doesn't exist yet
    // { name: "Settings", path: "/admin/settings", icon: <Settings className="h-5 w-5" /> },
  ];

  return (
    <div className="flex h-full min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col h-screen sticky top-0">
        <div className="flex flex-col flex-grow pt-5 bg-white border-r">
          <div className="px-4 flex items-center justify-between">
            <div className="flex items-center">
              <img src="/pinnity-logo.jpg" alt="Pinnity" className="w-8 h-8 mr-2 object-contain" />
              <h1 className="text-xl font-bold">Pinnity Admin</h1>
            </div>
          </div>
          <div className="mt-8 flex-1">
            <nav className="px-2 space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "flex items-center px-4 py-3 text-sm rounded-md w-full transition-colors",
                    isCurrentPath(item.path)
                      ? "bg-[#E0F2F1] text-[#00796B]"
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.name}
                  {item.name === "Vendors" && pendingVendorsCount > 0 && (
                    <Badge className="ml-auto bg-yellow-500">{pendingVendorsCount}</Badge>
                  )}
                </button>
              ))}
            </nav>
          </div>
          <div className="p-4 border-t">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center w-full px-4 py-2 text-sm text-left rounded-md hover:bg-gray-100">
                  <div className="flex-shrink-0 mr-3">
                    <div className="w-8 h-8 rounded-full bg-[#00796B] flex items-center justify-center text-white">
                      {user?.firstName?.[0] || 'A'}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">{user?.firstName} {user?.lastName}</div>
                    <div className="text-xs text-gray-500">Admin</div>
                  </div>
                  <ChevronDown className="ml-auto h-4 w-4 text-gray-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/admin/profile")}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/admin/settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/admin/help")}>
                  <HelpCircle className="mr-2 h-4 w-4" />
                  <span>Help</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-10 flex items-center justify-between bg-white border-b px-4 h-16">
        <div className="flex items-center">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-full sm:w-72">
              <div className="flex flex-col h-full">
                <div className="p-4 border-b flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-md bg-[#00796B] flex items-center justify-center text-white font-bold mr-2">P</div>
                    <h1 className="text-xl font-bold">Pinnity Admin</h1>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <ScrollArea className="flex-1">
                  <nav className="px-2 pt-4 pb-8 space-y-1">
                    {menuItems.map((item) => (
                      <button
                        key={item.path}
                        onClick={() => {
                          navigate(item.path);
                          setIsMobileMenuOpen(false);
                        }}
                        className={cn(
                          "flex items-center px-4 py-3 text-sm rounded-md w-full transition-colors",
                          isCurrentPath(item.path)
                            ? "bg-[#E0F2F1] text-[#00796B]"
                            : "text-gray-700 hover:bg-gray-100"
                        )}
                      >
                        <span className="mr-3">{item.icon}</span>
                        {item.name}
                        {item.name === "Vendors" && pendingVendorsCount > 0 && (
                          <Badge className="ml-auto bg-yellow-500">{pendingVendorsCount}</Badge>
                        )}
                      </button>
                    ))}
                  </nav>
                </ScrollArea>
                <div className="p-4 border-t">
                  <div className="flex items-center px-4 py-2 rounded-md">
                    <div className="flex-shrink-0 mr-3">
                      <div className="w-8 h-8 rounded-full bg-[#00796B] flex items-center justify-center text-white">
                        {user?.firstName?.[0] || 'A'}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium">{user?.firstName} {user?.lastName}</div>
                      <div className="text-xs text-gray-500">Admin</div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full mt-2 flex items-center justify-center"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <div className="flex items-center ml-3">
            <div className="w-8 h-8 rounded-md bg-[#00796B] flex items-center justify-center text-white font-bold mr-2">P</div>
            <h1 className="text-xl font-bold">Pinnity</h1>
          </div>
        </div>
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/notifications")}>
            <Bell className="h-5 w-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <div className="w-8 h-8 rounded-full bg-[#00796B] flex items-center justify-center text-white">
                  {user?.firstName?.[0] || 'A'}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/admin/profile")}>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/admin/settings")}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <div className="md:py-8 py-20 px-6 max-w-7xl w-full mx-auto min-h-screen">
          {children}
        </div>
      </div>
    </div>
  );
}