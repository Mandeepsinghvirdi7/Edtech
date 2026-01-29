import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { SalesRecord } from '@/types';

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  liveRecords?: SalesRecord[];
  onBdeSelect?: (bdeName: string) => void;
}

export function DashboardLayout({
  children,
  title,
  subtitle,
  searchQuery,
  onSearchChange,
  liveRecords,
  onBdeSelect
}: DashboardLayoutProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-12 h-12 rounded-xl bg-primary/20" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Sidebar />
      <main className="ml-64 flex-1 flex flex-col">
        {title && (
          <div className="p-8 pb-0">
            <Header
              title={title}
              subtitle={subtitle}
              searchQuery={searchQuery}
              onSearchChange={onSearchChange}
              liveRecords={liveRecords}
              onBdeSelect={onBdeSelect}
            />
          </div>
        )}
        <div className="flex-1 p-8">
          {children}
        </div>
        <footer className="text-center py-4 text-sm text-muted-foreground border-t border-border bg-background/50 backdrop-blur-sm">
          Designed with Purpose, Developed In-House <br /> @HikeEducation MUM | HYD 2026
        </footer>
      </main>
    </div>
  );
}
