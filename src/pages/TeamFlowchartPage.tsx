import { useState, useMemo, useEffect } from 'react';
import { DashboardLayout } from '@/Components/layout/DashboardLayout';
import { Header } from '@/Components/layout/Header';
import { TeamFlowchart } from '@/Components/dashboard/TeamFlowchart';
import { getTeamData } from '@/data/dataProcess';
import { api } from '@/lib/api';
import { SalesRecord } from '@/types';
import { Skeleton } from '@/Components/ui/skeleton';
import { FilterBar } from '@/Components/dashboard/FilterBar';
import { useAuth } from '@/contexts/AuthContext';

export default function TeamFlowchartPage() {
  const { user } = useAuth();
  const [liveRecords, setLiveRecords] = useState<SalesRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedDrive, setSelectedDrive] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');

  const handleBdeSelect = (bdeName: string) => {
    // This page doesn't show BDE performance.
    console.log(`BDE selected: ${bdeName}, but no action is configured on this page.`);
  };

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
        // Records where TL is the team leader AND BDE is active and current team member, OR the TL's own performance data
        return records.filter(record => 
          (record.teamLeader === user.name && !record.inactive && record.isCurrentTeamMember) || 
          record.bdeName === user.name
        );

      case 'Business Development Executive':
        // Only their own records
        return records.filter(record => record.bdeName === user.name);

      default:
        return records;
    }
  };

  // Fetch sales records on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const records = await api.getMasterData();
        const filteredRecords = filterRecordsByRole(records);
        setLiveRecords(filteredRecords);
      } catch (error) {
        console.error("Failed to fetch master data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user]);

  // Memoized lists for filters, derived from live data
  const availableBranches = useMemo(() => {
    const branches = new Set(liveRecords.map(r => r.branch));
    return Array.from(branches);
  }, [liveRecords]);

  const availableDrives = useMemo(() => {
    const drives = new Set(liveRecords.map(r => r.drive));
    return Array.from(drives);
  }, [liveRecords]);

  const availableMonths = useMemo(() => {
    const months = new Set(liveRecords.map(r => r.month));
    return Array.from(months);
  }, [liveRecords]);
  
  const filteredRecords = useMemo(() => {
    let records = liveRecords;
    if (selectedBranch) records = records.filter(r => r.branch === selectedBranch);
    if (selectedDrive) records = records.filter(r => r.drive === selectedDrive);
    if (selectedMonth) records = records.filter(r => r.month === selectedMonth);
    return records;
  }, [liveRecords, selectedBranch, selectedDrive, selectedMonth]);
  
  const teamData = useMemo(() => getTeamData(filteredRecords), [filteredRecords]);

  // Reset child filters when parent changes
  useEffect(() => {
    setSelectedDrive('');
    setSelectedMonth('');
  }, [selectedBranch]);

  useEffect(() => {
    setSelectedMonth('');
  }, [selectedDrive]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <Header 
          title="Team Flowchart" 
          subtitle="Loading data, please wait..." 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          liveRecords={liveRecords}
          onBdeSelect={handleBdeSelect}
        />
        <div className="p-6">
          <Skeleton className="h-[800px] w-full" />
        </div>
      </DashboardLayout>
    )
  }

  if (!isLoading && liveRecords.length === 0) {
    const isAdminOrOps = user && (user.role === 'Admin' || user.role === 'Operations');
    return (
      <DashboardLayout>
        <Header 
          title="Team Flowchart" 
          subtitle="No data available" 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          liveRecords={liveRecords}
          onBdeSelect={handleBdeSelect}
        />
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
    <DashboardLayout>
      <Header 
        title="Team Flowchart" 
        subtitle="Visualize your team structure" 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        liveRecords={liveRecords}
        onBdeSelect={handleBdeSelect}
      />

      <FilterBar
        branches={availableBranches}
        drives={availableDrives}
        months={availableMonths}
        selectedBranch={selectedBranch}
        selectedDrive={selectedDrive}
        selectedMonth={selectedMonth}
        onBranchChange={setSelectedBranch}
        onDriveChange={setSelectedDrive}
        onMonthChange={setSelectedMonth}
      />

      <div className="mt-8">
        <TeamFlowchart
          teams={teamData}
          selectedBranch={selectedBranch}
          selectedDrive={selectedDrive}
          selectedMonth={selectedMonth}
        />
      </div>
    </DashboardLayout>
  );
}
