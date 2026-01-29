import { useState, useMemo } from 'react';
import { Bell, Search, ChevronDown, Moon, Sun } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../../Contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/Components/ui/input';
import { SalesRecord } from '@/types';

interface HeaderProps {
  title: string;
  subtitle?: string;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  liveRecords?: SalesRecord[];
  onBdeSelect?: (bdeName: string) => void;
}

export function Header({ title, subtitle, searchQuery = "", onSearchChange = () => {}, liveRecords = [], onBdeSelect = () => {} }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Hide search for Team Leader and BDE roles
  const shouldShowSearch = user?.role !== 'Team Leader' && user?.role !== 'Business Development Executive';

  const bdeNames = useMemo(() => {
    const names = new Set(liveRecords.filter(r => !r.inactive).map(r => r.bdeName));
    return Array.from(names);
  }, [liveRecords]);

  const suggestions = useMemo(() => {
    if (!searchQuery) return [];
    return bdeNames
      .filter(name => name.toLowerCase().includes(searchQuery.toLowerCase()))
      .slice(0, 5); // Show top 5 suggestions
  }, [searchQuery, bdeNames]);

  const handleSuggestionClick = (name: string) => {
    onBdeSelect(name);
    onSearchChange('');
    setShowSuggestions(false);
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="flex items-center justify-between mb-8"
    >
      <div>
        <h1 className="text-2xl font-bold text-foreground truncate">{title}</h1>
        {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* Search - Only show for Admin, Operations, and DBM */}
        {shouldShowSearch && (
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by BDE name..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => {
                onSearchChange(e.target.value);
                setShowSuggestions(e.target.value.length > 0);
              }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full mt-2 w-full bg-background border border-border rounded-md shadow-lg z-10">
                {suggestions.map(name => (
                  <div
                    key={name}
                    className="px-4 py-2 hover:bg-muted cursor-pointer"
                    onClick={() => handleSuggestionClick(name)}
                  >
                    {name}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notifications */}
        <button className="relative p-2 hover:bg-muted rounded-lg transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-muted-foreground" />
          ) : (
            <Moon className="w-5 h-5 text-muted-foreground" />
          )}
        </button>

        {/* Quick Actions */}
        <button className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors">
          <span className="text-sm font-medium">FY 2024-25</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </motion.header>
  );
}
