import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  LayoutDashboard,
  Upload,
  Users,
  BarChart3,
  Settings,
  LogOut,
  TrendingUp,
  Building2,
  Moon,
  Sun
} from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: BarChart3, label: 'Individual BDE', path: '/analytics' },
  { icon: Users, label: 'Teams', path: '/teams' },
  { icon: TrendingUp, label: 'Performance', path: '/performance' },
];

const adminItems = [
  { icon: Upload, label: 'Upload Data', path: '/admin/upload' },
  { icon: Building2, label: 'Manage Teams', path: '/admin/teams' },
  { icon: Settings, label: 'Settings', path: '/admin/settings' },
];

export function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  // Define role-based access
  const isAdmin = user?.role === 'Admin';
  const isOperations = user?.role === 'Operations';
  const isDBM = user?.role === 'Deputy Branch Manager';
  const isTeamLeader = user?.role === 'Team Leader';
  const isBDE = user?.role === 'Business Development Executive';

  // Show admin items for Admin and Operations
  const showAdminItems = isAdmin || isOperations;

  // Filter nav items based on role
  const getRoleLabel = (role: string): string => {
    const roleMap: Record<string, string> = {
      'Admin': 'Super Admin',
      'Operations': 'Ops - Admin',
      'VP': 'VP - Admin',
    };
    return roleMap[role] || role;
  };

  const visibleNavItems = navItems.filter(item => {
    // Only Admin can see Teams and Performance pages
    if (item.label === 'Teams' || item.label === 'Performance') {
      return user?.role === 'Admin';
    }
    return true;
  });

  const visibleAdminItems = adminItems.filter(item => {
    // Only Admin can see Settings
    if (item.label === 'Settings') {
      return user?.role === 'Admin';
    }
    return true;
  });

  return (
    <motion.aside
      initial={{ x: -80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="fixed left-0 top-0 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col z-50"
    >
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="HikeEducation Logo" className="w-10 h-10 rounded-xl" />
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground">HikeEducation Dashboard</h1>
            <p className="text-xs text-muted-foreground">Dashboard v1.0</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <div className="mb-6">
          <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Main
          </p>
          {visibleNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {(isAdmin || isOperations || user?.role === 'Vice President') && (
          <div>
            <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Admin
            </p>
            {visibleAdminItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-sm font-semibold text-primary">
              {user?.username?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.username}
            </p>
            <p className="text-xs text-muted-foreground capitalize">{getRoleLabel(user?.role || '')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-lg transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </motion.aside>
  );
}
