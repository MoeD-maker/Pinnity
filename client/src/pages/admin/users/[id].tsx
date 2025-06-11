import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  ArrowLeft,
  Save,
  User,
  Store,
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit,
  Trash2,
} from "lucide-react";

interface UserData {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  phoneVerified: boolean;
  address: string;
  userType: "individual" | "business" | "admin";
  created_at: string;
}

const UserDetailPage = () => {
  const [, navigate] = useLocation();
  const [match] = useRoute("/admin/users/:id");
  const userId = match?.id;
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Form state for editing
  const [editedUser, setEditedUser] = useState<UserData | null>(null);

  useEffect(() => {
    if (userId) {
      fetchUser();
    }
  }, [userId]);

  const fetchUser = async () => {
    setIsLoading(true);
    try {
      console.log(`Fetching user with ID: ${userId}`);
      const response = await fetch(`/api/v1/admin/users/${userId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error: ${response.status} - ${errorText}`);
        throw new Error(`Failed to fetch user: ${response.status}`);
      }
      
      const userData = await response.json();
      console.log("User data received:", userData);
      setUser(userData);
      setEditedUser(userData);
    } catch (error) {
      console.error("Error fetching user:", error);
      toast({
        title: "Error",
        description: `Failed to fetch user details: ${error.message}`,
        variant: "destructive"
      });
      navigate("/admin/users");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editedUser) return;
    
    setIsSaving(true);
    try {
      // Get CSRF token
      const csrfResponse = await fetch('/api/csrf-token', {
        credentials: 'include'
      });
      const { csrfToken } = await csrfResponse.json();
      
      const response = await fetch(`/api/v1/admin/users/${userId}`, {
        method: "PUT",
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          firstName: editedUser.firstName,
          lastName: editedUser.lastName,
          email: editedUser.email,
          phone: editedUser.phone,
          address: editedUser.address,
          userType: editedUser.userType
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update user');
      }
      
      const updatedUser = await response.json();
      setUser(updatedUser);
      setEditedUser(updatedUser);
      setIsEditing(false);
      
      toast({
        title: "Success",
        description: "User updated successfully"
      });
    } catch (error) {
      console.error("Error updating user:", error);
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedUser(user);
    setIsEditing(false);
  };

  const getUserTypeIcon = (userType: string) => {
    switch (userType) {
      case "individual":
        return <User className="h-4 w-4" />;
      case "business":
        return <Store className="h-4 w-4" />;
      case "admin":
        return <ShieldCheck className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getUserTypeBadge = (userType: string) => {
    switch (userType) {
      case "individual":
        return <Badge variant="outline" className="flex items-center gap-1 font-normal text-blue-600 border-blue-300 bg-blue-50"><User className="h-3 w-3" /> Customer</Badge>;
      case "business":
        return <Badge variant="outline" className="flex items-center gap-1 font-normal text-green-600 border-green-300 bg-green-50"><Store className="h-3 w-3" /> Vendor</Badge>;
      case "admin":
        return <Badge variant="outline" className="flex items-center gap-1 font-normal text-purple-600 border-purple-300 bg-purple-50"><ShieldCheck className="h-3 w-3" /> Admin</Badge>;
      default:
        return <Badge variant="outline" className="font-normal">{userType}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy 'at' h:mm a");
    } catch (e) {
      return "N/A";
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00796B] mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading user details...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!user) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-muted-foreground">User not found</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => navigate("/admin/users")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Users
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate("/admin/users")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Users
            </Button>
            <div>
              <h1 className="text-2xl font-bold">User Details</h1>
              <p className="text-muted-foreground">
                Manage user information and settings
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button 
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button 
                  className="bg-[#00796B] hover:bg-[#00695C]"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </>
            ) : (
              <Button 
                className="bg-[#00796B] hover:bg-[#00695C]"
                onClick={() => setIsEditing(true)}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit User
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getUserTypeIcon(user.userType)}
                Basic Information
              </CardTitle>
              <CardDescription>
                User account details and personal information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Account Type</p>
                  <div className="mt-1">
                    {getUserTypeBadge(user.userType)}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">User ID</p>
                  <p className="font-mono text-sm">#{user.id}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  {isEditing ? (
                    <Input
                      id="firstName"
                      value={editedUser?.firstName || ""}
                      onChange={(e) => setEditedUser(prev => prev ? {...prev, firstName: e.target.value} : null)}
                    />
                  ) : (
                    <p className="text-sm py-2">{user.firstName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  {isEditing ? (
                    <Input
                      id="lastName"
                      value={editedUser?.lastName || ""}
                      onChange={(e) => setEditedUser(prev => prev ? {...prev, lastName: e.target.value} : null)}
                    />
                  ) : (
                    <p className="text-sm py-2">{user.lastName}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                {isEditing ? (
                  <Input
                    id="email"
                    type="email"
                    value={editedUser?.email || ""}
                    onChange={(e) => setEditedUser(prev => prev ? {...prev, email: e.target.value} : null)}
                  />
                ) : (
                  <div className="flex items-center gap-2 text-sm py-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {user.email}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                {isEditing ? (
                  <Input
                    id="phone"
                    value={editedUser?.phone || ""}
                    onChange={(e) => setEditedUser(prev => prev ? {...prev, phone: e.target.value} : null)}
                  />
                ) : (
                  <div className="flex items-center gap-2 text-sm py-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {user.phone}
                    {user.phoneVerified && (
                      <Badge variant="outline" className="text-xs text-green-600 border-green-300 bg-green-50">
                        Verified
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                {isEditing ? (
                  <Input
                    id="address"
                    value={editedUser?.address || ""}
                    onChange={(e) => setEditedUser(prev => prev ? {...prev, address: e.target.value} : null)}
                  />
                ) : (
                  <div className="flex items-center gap-2 text-sm py-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {user.address}
                  </div>
                )}
              </div>

              {isEditing && (
                <div className="space-y-2">
                  <Label htmlFor="userType">User Type</Label>
                  <Select
                    value={editedUser?.userType || ""}
                    onValueChange={(value) => setEditedUser(prev => prev ? {...prev, userType: value as any} : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select user type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Customer</SelectItem>
                      <SelectItem value="business">Vendor</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Account Information
              </CardTitle>
              <CardDescription>
                Account creation and system information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Username</p>
                  <p className="font-mono text-sm">{user.username}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="text-sm">{formatDate(user.created_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default UserDetailPage;