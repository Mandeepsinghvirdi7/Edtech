import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Header } from '@/components/layout/Header';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

interface User {
  name: string;
  role: string;
  branch: string;
  inactive: boolean;
  email?: string;
  password?: string;
}

export default function AdminDesignation() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleBdeSelect = (bdeName: string) => {
    toast({
      title: 'Info',
      description: `Cannot view BDE performance from this page. Go to the dashboard to see charts for ${bdeName}.`,
    });
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const usersData = await api.getUsers();
      setUsers(usersData.filter(u => u.name && u.name !== 'Unassigned'));
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load user data.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = async (user: User, updates: Partial<User>) => {
    setIsUpdating(true);
    try {
      // Update user in database
      await api.updateUser(user.name, user.branch, updates);
      
      toast({
        title: 'Success',
        description: `${user.name}'s information has been updated.`,
      });
      setEditingUser(null);
      fetchUsers(); // Re-fetch all users to ensure UI is in sync
    } catch (error) {
      console.error('Failed to update user:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update user information.',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'Vice President':
        return 'destructive';
      case 'Deputy Branch Manager':
        return 'default';
      case 'Team Leader':
        return 'secondary';
      case 'Business Development Executive':
        return 'outline';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Header
          title="Edit Users"
          subtitle="Loading user data..."
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          liveRecords={[]}
          onBdeSelect={handleBdeSelect}
        />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Header
        title="Edit Users"
        subtitle="View and update user information"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        liveRecords={[]}
        onBdeSelect={handleBdeSelect}
      />

      <div className="px-4 py-6 md:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card"
          >
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">User Management</h3>
            </div>

            <div className="divide-y divide-border">
              {users.map((user) => (
                <motion.div
                  key={`${user.name}-${user.branch}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-4 hover:bg-muted/30"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium text-foreground">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.branch}</p>
                      {user.email && <p className="text-sm text-muted-foreground">{user.email}</p>}
                      {user.password && user.role === 'Admin' && (
                        <p className="text-sm text-muted-foreground">
                          Password: <span className="font-mono">Password set</span>
                        </p>
                      )}
                    </div>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {user.role}
                    </Badge>
                    {user.inactive && (
                      <Badge variant="secondary">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingUser(user)}
                  >
                    Edit
                  </Button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {editingUser && (
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Edit {editingUser.name}'s information.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input
                  id="name"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={editingUser.email || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">Role</Label>
                <Select
                  value={editingUser.role}
                  onValueChange={(value) => setEditingUser({ ...editingUser, role: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Vice President">Vice President</SelectItem>
                    <SelectItem value="Deputy Branch Manager">Deputy Branch Manager</SelectItem>
                    <SelectItem value="Team Leader">Team Leader</SelectItem>
                    <SelectItem value="Business Development Executive">Business Development Executive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="branch" className="text-right">Branch</Label>
                <Select
                  value={editingUser.branch}
                  onValueChange={(value) => setEditingUser({ ...editingUser, branch: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Hyderabad Branch">Hyderabad Branch</SelectItem>
                    <SelectItem value="Mumbai Branch">Mumbai Branch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">Status</Label>
                <Select
                  value={editingUser.inactive ? 'inactive' : 'active'}
                  onValueChange={(value) => setEditingUser({ ...editingUser, inactive: value === 'inactive' })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {user?.role === 'Admin' && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="password" className="text-right">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={editingUser.password || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                    className="col-span-3"
                    placeholder="Enter new password to change"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
              <Button
                onClick={() => handleEditUser(editingUser, {
                  name: editingUser.name,
                  email: editingUser.email,
                  role: editingUser.role,
                  branch: editingUser.branch,
                  inactive: editingUser.inactive,
                  ...(user?.role === 'Admin' && editingUser.password && { password: editingUser.password })
                })}
                disabled={isUpdating}
              >
                {isUpdating ? 'Updating...' : 'Update User'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  );
}
