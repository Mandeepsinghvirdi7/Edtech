import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, BackendLoginResponse } from '@/types';
import { api } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('hike_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response: BackendLoginResponse = await api.login(username, password);

      if (response.ok && response.branches) {
        // Assign roles based on username (fallback if database lookup fails)
        let role = 'BDE'; // Default role
        let branch = '';
        let name = username;

        // Map usernames to roles
        const roleMapping: { [key: string]: { role: string; branch: string; name: string } } = {
          'HikeVP': { role: 'Admin', branch: 'Hyderabad Branch', name: 'HikeVP' },
          'HikeManagerMUM': { role: 'Deputy Branch Manager', branch: 'Mumbai Branch', name: 'HikeManagerMUM' },
          'HikeOP': { role: 'Operations', branch: 'Hyderabad Branch', name: 'HikeOP' },
          'HikeDev': { role: 'Admin', branch: 'Hyderabad Branch', name: 'HikeDev' },
          'Hike@ManagerHyd': { role: 'Deputy Branch Manager', branch: 'Hyderabad Branch', name: 'Hike@ManagerHyd' },
          'HikeSanju': { role: 'Team Leader', branch: 'Mumbai Branch', name: 'HikeSanju' },
          'HikeWolf': { role: 'Business Development Executive', branch: 'Mumbai Branch', name: 'HikeWolf' },
          'HikeRebels': { role: 'Business Development Executive', branch: 'Mumbai Branch', name: 'HikeRebels' }
        };

        if (roleMapping[username]) {
          role = roleMapping[username].role;
          branch = roleMapping[username].branch;
          name = roleMapping[username].name;
        }

        // Try to fetch from database if available, otherwise use mapping
        try {
          const users = await api.getUsers();
          const userDetails = users.find((u: any) => u.email === username || u.name === username);
          if (userDetails) {
            role = userDetails.role || role;
            branch = userDetails.branch || branch;
            name = userDetails.name || name;
          }
        } catch (error) {
          console.log('Database not available, using role mapping');
        }

        const userData: User = {
          id: username,
          username,
          role,
          branches: response.branches,
          name,
          branch,
          inactive: false,
        };

        setUser(userData);
        localStorage.setItem('hike_user', JSON.stringify(userData));
        return { success: true };
      } else {
        return { success: false, message: response.message || 'Invalid credentials' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('hike_user');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
