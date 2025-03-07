import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  BarChart3, 
  Users, 
  Store, 
  Tag, 
  FileText, 
  Settings, 
  Menu, 
  X, 
  Bell, 
  User 
} from "lucide-react";
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigationItems = [
    {
      title: "Dashboard",
      icon: <BarChart3 className="mr-2 h-4 w-4" />,
      href: "/admin",
      active: location === "/admin"
    },
    {
      title: "Vendors",
      icon: <Store className="mr-2 h-4 w-4" />,
      href: "/admin/vendors",
      active: location.startsWith("/admin/vendors")
    },
    {
      title: "Deals",
      icon: <Tag className="mr-2 h-4 w-4" />,
      href: "/admin/deals",
      active: location.startsWith("/admin/deals")
    },
    {
      title: "Users",
      icon: <Users className="mr-2 h-4 w-4" />,
      href: "/admin/users",
      active: location.startsWith("/admin/users")
    },
    {
      title: "Content",
      icon: <FileText className="mr-2 h-4 w-4" />,
      href: "/admin/content",
      active: location.startsWith("/admin/content")
    },
    {
      title: "Reports",
      icon: <BarChart3 className="mr-2 h-4 w-4" />,
      href: "/admin/reports",
      active: location.startsWith("/admin/reports")
    },
    {
      title: "Settings",
      icon: <Settings className="mr-2 h-4 w-4" />,
      href: "/admin/settings",
      active: location.startsWith("/admin/settings")
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile menu */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetTrigger asChild className="lg:hidden">
          <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50">
            <Menu className="h-6 w-6" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex h-16 items-center px-6 border-b">
            <h2 className="text-xl font-bold cursor-pointer" onClick={() => window.location.href = "/admin"}>
              Pinnity Admin
            </h2>
            <Button variant="ghost" size="icon" className="ml-auto" onClick={() => setIsMobileMenuOpen(false)}>
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
          <nav className="flex flex-col gap-1 p-4">
            {navigationItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center px-3 py-2 rounded-md text-sm cursor-pointer ${
                    item.active 
                      ? "bg-primary/10 text-primary font-medium" 
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.icon}
                  {item.title}
                </div>
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden lg:flex lg:w-64 flex-col border-r bg-white dark:bg-gray-800 dark:border-gray-700">
        <div className="flex h-16 items-center px-6 border-b">
          <h2 className="text-xl font-bold cursor-pointer" onClick={() => window.location.href = "/admin"}>
            Pinnity Admin
          </h2>
        </div>
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-col gap-1">
            {navigationItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center px-3 py-2 rounded-md text-sm cursor-pointer ${
                    item.active 
                      ? "bg-primary/10 text-primary font-medium" 
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                  }`}
                >
                  {item.icon}
                  {item.title}
                </div>
              </Link>
            ))}
          </div>
        </nav>
      </aside>

      {/* Header */}
      <header className="fixed top-0 right-0 left-0 lg:left-64 h-16 flex items-center justify-between px-4 lg:px-6 border-b bg-white dark:bg-gray-800 dark:border-gray-700 z-30">
        <div className="flex items-center lg:hidden">
          <h2 className="ml-10 text-xl font-bold">Pinnity Admin</h2>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500" />
            <span className="sr-only">Notifications</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <User className="h-5 w-5" />
                <span className="sr-only">User menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main content */}
      <main className="lg:pl-64 pt-16">
        <div className="container mx-auto p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;