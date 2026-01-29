import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Users } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Header } from '@/components/layout/Header';
import { PerformanceChart } from '@/components/dashboard/PerformanceChart';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getBDEData, getBDEChartData, BDEData } from '@/data/dataProcess';
import { api } from '@/lib/api';
import { SalesRecord } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';

export default function Analytics() {
  const { user } = useAuth();
  const [liveRecords, setLiveRecords] = useState<SalesRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBDE, setSelectedBDE] = useState<BDEData | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Function to filter records based on user role
  const filterRecordsByRole = (records: SalesRecord[]): SalesRecord[] => {
    if (!user) return records;

    switch (user.role) {
      case 'Admin':
      case 'Operations':
        // Full access to all records
        return records;

      case 'Deputy Branch Manager':
        // Only records from their branch
        return records.filter(record => user.branches.includes(record.branch));

      case 'Team Leader':
        // Records where TL is the team leader AND BDE is active and current team member
        return records.filter(record => 
          record.teamLeader === user.name && !record.inactive && record.isCurrentTeamMember
        );

      case 'Business Development Executive':
        // Only their own records
        return records.filter(record => record.bdeName === user.name);

      default:
        return records;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const records = await api.getMasterData();
        const filteredRecords = filterRecordsByRole(records);
        setLiveRecords(filteredRecords);
        setError(null);
      } catch (error) {
        console.error("Failed to fetch master data:", error);
        setError("Failed to fetch data. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const bdeData = useMemo(() => {
    let data = getBDEData(
      liveRecords,
      selectedBranch === 'all' ? undefined : selectedBranch,
      selectedTeam === 'all' ? undefined : selectedTeam
    );

    // If there's no search query, only show active users
    // If there's a search query, show both active and inactive users that match
    if (!searchQuery.trim()) {
      // No search - only show active users
      data = data.filter(bde => {
        const userRecord = liveRecords.find(r => r.bdeName === bde.name);
        return userRecord && !userRecord.inactive;
      });
    } else {
      // With search - show active users plus inactive users that match the search
      const activeUsers = data;
      const inactiveUsers = getBDEData(
        liveRecords.filter(r => r.inactive), // Only inactive records
        selectedBranch === 'all' ? undefined : selectedBranch,
        selectedTeam === 'all' ? undefined : selectedTeam
      ).filter(bde =>
        bde.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

      data = [...activeUsers, ...inactiveUsers];
    }

    return data;
  }, [liveRecords, selectedBranch, selectedTeam, searchQuery]);

  const handleBDEClick = (bde: BDEData) => {
    setSelectedBDE(bde);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedBDE(null);
  };

  if (isLoading) {
    return (
      <DashboardLayout
        title="Individual BDE"
        subtitle="Individual BDE Performance Overview"
        searchQuery=""
        onSearchChange={() => {}}
        liveRecords={liveRecords}
        onBdeSelect={() => {}}
      >
        <div className="space-y-6">
            <Skeleton className="h-12 w-1/3" />
            <Skeleton className="h-96 w-full" />
          </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <p className="text-red-500">{error}</p>
        </div>
      </DashboardLayout>
    );
  }
  
  if (liveRecords.length === 0) {
    const isAdminOrOps = user && (user.role === 'Admin' || user.role === 'Operations');
    return (
        <DashboardLayout>
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                <h2 className="text-2xl font-semibold mb-2">No Data Found</h2>
                <p className="text-muted-foreground mb-4">
                    It looks like there's no sales data to display. {isAdminOrOps ? 'Please upload a file to get started.' : 'Please contact Admin / Operations team – Aditya or Vaibhav'}
                </p>
                {isAdminOrOps && (
                  <a href="/admin/upload" className="text-blue-500 hover:underline">
                      Go to Upload Page
                  </a>
                )}
            </div>
        </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Individual BDE"
      subtitle="Individual BDE Performance Overview"
    >
      <div className="space-y-6">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card overflow-hidden"
        >
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">BDE Performance Table</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Branch:</span>
                  <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Branches" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches</SelectItem>
                      {Array.from(new Set(liveRecords.map(r => r.branch))).filter(Boolean).map(branch => (
                        <SelectItem key={branch} value={branch as string}>{branch}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Team:</span>
                  <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Teams" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Teams</SelectItem>
                      {Array.from(new Set(liveRecords.map(r => r.teamLeader))).filter(Boolean).map(team => (
                        <SelectItem key={team} value={team as string}>{team}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>BDE Name</th>
                  <th>Team Name</th>
                  <th>Total Target</th>
                  <th>Total Admissions</th>
                  <th>Closed Points</th>
                  <th>Achievement</th>
                </tr>
              </thead>
              <tbody>
                {bdeData.map((bde, index) => (
                  <motion.tr
                    key={bde.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                  >
                    <td>
                      <Button
                        variant="ghost"
                        className="p-0 h-auto font-medium text-foreground hover:text-primary"
                        onClick={() => handleBDEClick(bde)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                            <Users className="w-4 h-4 text-primary" />
                          </div>
                          <span>{bde.name}</span>
                        </div>
                      </Button>
                    </td>
                    <td>
                      <span className="font-medium">{bde.teamName}</span>
                    </td>
                    <td>
                      <span className="font-medium">{bde.totalTarget.toLocaleString()}</span>
                    </td>
                    <td>
                      <span className="font-medium text-success">{bde.totalAdmissions.toLocaleString()}</span>
                    </td>
                    <td>
                      <span className="font-medium text-primary">{bde.totalClosedPoints.toLocaleString()}</span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-1 ${
                          bde.avgAchievement >= 80 ? 'text-success' :
                          bde.avgAchievement >= 50 ? 'text-warning' :
                          'text-destructive'
                        }`}>
                          {bde.avgAchievement >= 80 ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          <span className="font-semibold">{bde.avgAchievement}%</span>
                        </div>
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              bde.avgAchievement >= 80 ? 'bg-success' :
                              bde.avgAchievement >= 50 ? 'bg-warning' :
                              'bg-destructive'
                            }`}
                            style={{ width: `${Math.min(bde.avgAchievement, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedBDE?.name} - Monthly Performance</DialogTitle>
          </DialogHeader>
          {selectedBDE && (
            <PerformanceChart
              data={getBDEChartData(liveRecords, selectedBDE.name)}
              title={`${selectedBDE.name} Performance`}
            />
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
