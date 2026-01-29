import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/Components/layout/DashboardLayout';
import { Header } from '@/Components/layout/Header';
import { KPICard } from '@/Components/dashboard/KPICard';
import { PerformanceChart } from '@/Components/dashboard/PerformanceChart';
import { TeamTable } from '@/Components/dashboard/TeamTable';
import { FilterBar } from '@/Components/dashboard/FilterBar';
import { MonthlyPerformanceTable } from '@/Components/dashboard/MonthlyPerformanceTable';
import { FullAchieversModal } from '@/Components/dashboard/FullAchieversModal';
import { TeamPopupChart } from '@/Components/dashboard/TeamPopupChart';
import { getKPIData, getTeamData, getMonthlyChartData, getTopAchieversData, MONTHS as fiscalMonthOrder } from '@/data/dataProcess';
import { api } from '@/lib/api';
import { BdePerformanceModal } from '@/Components/dashboard/BdePerformanceModal';
import { SalesRecord, User } from '@/types';
import { Skeleton } from '@/Components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [liveRecords, setLiveRecords] = useState<SalesRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedDrive, setSelectedDrive] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [drives, setDrives] = useState<any[]>([]);
  const [overallModalOpen, setOverallModalOpen] = useState(false);
  const [monthlyModalOpen, setMonthlyModalOpen] = useState(false);
  const [bdeModalOpen, setBdeModalOpen] = useState(false);
  const [selectedBde, setSelectedBde] = useState<string | null>(null);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<{ name: string; leader: string } | null>(null);
  const [isMyReportActive, setIsMyReportActive] = useState(false);
  const [applyTargetFilter, setApplyTargetFilter] = useState(false);

  // Separate data for performance tables (shows all branches regardless of user role)
  const [allRecords, setAllRecords] = useState<SalesRecord[]>([]);

  const handleBdeSelect = (bdeName: string) => {
    console.log("Selected BDE:", bdeName);
    setSelectedBde(bdeName);
    setBdeModalOpen(true);
    console.log("bdeModalOpen set to true");
  };

  const handleMyReportToggle = () => {
    setIsMyReportActive(!isMyReportActive);
    // Reset filters when toggling my report mode
    setSelectedBranch('');
    setSelectedDrive('');
    setSelectedMonth('');
  };

  const handleTeamSelect = (teamName: string, teamLeader: string) => {
    setSelectedTeam({ name: teamName, leader: teamLeader });
    setTeamModalOpen(true);
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
        // If My Report is active, only show their own performance data
        if (isMyReportActive) {
          return records.filter(record => record.bdeName === user.name);
        }
        // Only records from their branch
        return records.filter(record => user.branches.includes(record.branch));

      case 'Team Leader':
        // If My Report is active, only show their own performance data
        if (isMyReportActive) {
          return records.filter(record => record.bdeName === user.name);
        }
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

  // Fetch sales records and drives on component mount and window focus
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [records, usersData, drivesData] = await Promise.all([
          api.getMasterData(),
          api.getUsers(),
          api.getDrives(),
        ]);
        const filteredRecords = filterRecordsByRole(records);
        setLiveRecords(filteredRecords);
        setAllRecords(records); // Store all records for performance tables
        setUsers(usersData);
        setDrives(drivesData);
      } catch (error) {
        console.error("Failed to fetch initial data:", error);
        setLiveRecords([]);
        setAllRecords([]);
        setUsers([]);
        setDrives([]);
      }
      setIsLoading(false);
    };

    fetchData();

    // Refetch drives when window gains focus (user navigates back to dashboard)
    const handleFocus = () => {
      console.log('Window focused, refetching drives...');
      api.getDrives().then(drivesData => {
        console.log('Refetched drives:', drivesData);
        setDrives(drivesData);
      }).catch(error => {
        console.error("Failed to refetch drives:", error);
      });
    };

    // Listen for team membership changes from AdminTeams page
    const handleTeamMembershipChange = () => {
      console.log('Team membership changed, refetching data...');
      fetchData();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('teamMembershipChanged', handleTeamMembershipChange);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('teamMembershipChanged', handleTeamMembershipChange);
    };
  }, [user, isMyReportActive]);

  const handleTeamChanged = (bdeName: string, newTeamLeader: string, month: string, branch: string) => {
    setLiveRecords(prevRecords => {
      return prevRecords.map(record => {
        if (record.bdeName === bdeName && record.month === month && record.branch === branch) {
          return { ...record, teamLeader: newTeamLeader };
        }
        return record;
      });
    });
  };

  // Memoized lists for filters, derived from live data
  const availableBranches = useMemo(() => {
    const branches = new Set(liveRecords.map(r => r.branch));
    return Array.from(branches);
  }, [liveRecords]);

  const availableDrives = useMemo(() => {
    if (!drives) return [];

    // Return unique drive names (assuming names are unique)
    const uniqueDrives = new Set(drives.map(drive => drive.name));
    return Array.from(uniqueDrives);
  }, [drives]);

  const overallFilteredRecords = useMemo(() => {
    let records = liveRecords;
    if (selectedBranch) records = records.filter(r => r.branch === selectedBranch);

    if (selectedDrive) {
      // selectedDrive is the drive name
      const matchedDrive = drives.find(d => d.name === selectedDrive);

      if (matchedDrive) {
        const monthToNumber: Record<string, number> = {
          'APRIL': 4, 'MAY': 5, 'JUNE': 6, 'JULY': 7, 'AUGUST': 8, 'SEPTEMBER': 9,
          'OCTOBER': 10, 'NOVEMBER': 11, 'DECEMBER': 12, 'JANUARY': 1, 'FEBRUARY': 2, 'MARCH': 3
        };
        records = records.filter(r => {
          const recordMonthNum = monthToNumber[r.month];
          if (matchedDrive.startMonth <= matchedDrive.endMonth) {
            // Drive is within the same calendar year (e.g., April to September)
            return recordMonthNum >= matchedDrive.startMonth && recordMonthNum <= matchedDrive.endMonth;
          } else {
            // Drive spans across calendar years (e.g., November to February)
            return recordMonthNum >= matchedDrive.startMonth || recordMonthNum <= matchedDrive.endMonth;
          }
        });
      } else {
        // If no matching drive found, clear filter
        records = [];
      }
    }
    return records;
  }, [liveRecords, selectedBranch, selectedDrive, drives]);

  const availableMonths = useMemo(() => {
    const months = new Set(overallFilteredRecords.map(r => r.month));
    // Sort months according to fiscalMonthOrder
    return Array.from(months).sort((a, b) => fiscalMonthOrder.indexOf(a) - fiscalMonthOrder.indexOf(b));
  }, [overallFilteredRecords]);

  const lastMonthName = useMemo(() => {
    const recordsToConsider = selectedBranch 
        ? liveRecords.filter(r => r.branch === selectedBranch)
        : liveRecords;

    if (recordsToConsider.length === 0) return '';
    
    const monthsInData = new Set(recordsToConsider.map(r => r.month));
    let latestMonth = '';
    let latestMonthIndex = -1;
    
    monthsInData.forEach(month => {
        const index = fiscalMonthOrder.indexOf(month);
        if (index > latestMonthIndex) {
            latestMonthIndex = index;
            latestMonth = month;
        }
    });
    
    return latestMonth;
  }, [liveRecords, selectedBranch]);
  
  
  const monthlyFilteredRecords = useMemo(() => {
    let records = overallFilteredRecords;
    if (selectedMonth) records = records.filter(r => r.month === selectedMonth);
    return records;
  }, [overallFilteredRecords, selectedMonth]);


  
  // KPI cards should show data for selected month or aggregated data
  const kpiData = useMemo(() => getKPIData(overallFilteredRecords, selectedMonth, selectedBranch), [overallFilteredRecords, selectedMonth, selectedBranch]);

  const teamData = useMemo(() => getTeamData(monthlyFilteredRecords), [monthlyFilteredRecords]);
  const activeTeamData = useMemo(() => {
    const inactiveLeaders = new Set(users.filter(u => u.inactive).map(u => u.name));
    return teamData.filter(t => !inactiveLeaders.has(t.teamLeader));
  }, [teamData, users]);

  const chartData = useMemo(() => getMonthlyChartData(overallFilteredRecords), [overallFilteredRecords]);
  
  // Performance table data - uses all records regardless of user role (but still respects filters)
  const overallFilteredRecordsForTables = useMemo(() => {
    let records = allRecords;
    if (selectedBranch) records = records.filter(r => r.branch === selectedBranch);

    if (selectedDrive) {
      // selectedDrive is the drive name
      const matchedDrive = drives.find(d => d.name === selectedDrive);

      if (matchedDrive) {
        const monthToNumber: Record<string, number> = {
          'APRIL': 4, 'MAY': 5, 'JUNE': 6, 'JULY': 7, 'AUGUST': 8, 'SEPTEMBER': 9,
          'OCTOBER': 10, 'NOVEMBER': 11, 'DECEMBER': 12, 'JANUARY': 1, 'FEBRUARY': 2, 'MARCH': 3
        };
        records = records.filter(r => {
          const recordMonthNum = monthToNumber[r.month];
          if (matchedDrive.startMonth <= matchedDrive.endMonth) {
            // Drive is within the same calendar year (e.g., April to September)
            return recordMonthNum >= matchedDrive.startMonth && recordMonthNum <= matchedDrive.endMonth;
          } else {
            // Drive spans across calendar years (e.g., November to February)
            return recordMonthNum >= matchedDrive.startMonth || recordMonthNum <= matchedDrive.endMonth;
          }
        });
      } else {
        // If no matching drive found, clear filter
        records = [];
      }
    }
    return records;
  }, [allRecords, selectedBranch, selectedDrive, drives]);

  const monthlyFilteredRecordsForTables = useMemo(() => {
    let records = overallFilteredRecordsForTables;
    if (selectedMonth) records = records.filter(r => r.month === selectedMonth);
    return records;
  }, [overallFilteredRecordsForTables, selectedMonth]);

  // Build team data from the full records used for tables (so BDEs can see teammates)
  const teamDataForTables = useMemo(() => getTeamData(monthlyFilteredRecordsForTables), [monthlyFilteredRecordsForTables]);
  const activeTeamDataForTables = useMemo(() => {
    const inactiveLeaders = new Set(users.filter(u => u.inactive).map(u => u.name));
    return teamDataForTables.filter(t => !inactiveLeaders.has(t.teamLeader));
  }, [teamDataForTables, users]);

  // For BDE team members view, build from ALL records (not filtered by branch/drive selection)
  // So they always see their team members regardless of filter selections
  const teamDataForBDEView = useMemo(() => getTeamData(allRecords), [allRecords]);
  const activeTeamDataForBDEView = useMemo(() => {
    const inactiveLeaders = new Set(users.filter(u => u.inactive).map(u => u.name));
    const active = teamDataForBDEView.filter(t => !inactiveLeaders.has(t.teamLeader));
    return active;
  }, [teamDataForBDEView, users]);

  // For BDE users, find their team(s) - either from their own records or from teams they're members of
  // Use case-insensitive matching to handle name variations
  const userTeamLeader = user && user.name ? allRecords.find(r => r.bdeName?.toLowerCase() === user.name?.toLowerCase())?.teamLeader : undefined;
  
  // If BDE doesn't have their own records, find teams that have them as members
  const userTeams = user?.role === 'Business Development Executive' 
    ? activeTeamDataForBDEView.filter(team => 
        team.records.some(r => r.bdeName?.toLowerCase() === user.name?.toLowerCase())
      )
    : [];
  
  // Show teams that contain the user (primary logic)
  // If no teams contain the user, fall back to teams where they're the leader
  const bdeTeamData = userTeams.length > 0 
    ? userTeams
    : (userTeamLeader ? activeTeamDataForBDEView.filter(team => team.teamLeader === userTeamLeader) : []);





  // Drive Performance Chart Data: April to October (APRIL-OCTOBER in fiscal calendar)
  const drivePerformanceChartData = useMemo(() => {
    const MONTHS = ['APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER', 'JANUARY', 'FEBRUARY', 'MARCH'];
    
    // If a specific drive is selected, use the full chart data
    if (selectedDrive) {
      return chartData;
    }
    
    // Otherwise, show April to October (months 0-6 in fiscal calendar)
    const aprilToOctoberMonths = new Set(['APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER']);
    return chartData.filter(d => aprilToOctoberMonths.has(d.label.toUpperCase().slice(0, 3) === 'OCT' ? 'OCTOBER' : 
      d.label === 'APR' ? 'APRIL' :
      d.label === 'MAY' ? 'MAY' :
      d.label === 'JUN' ? 'JUNE' :
      d.label === 'JUL' ? 'JULY' :
      d.label === 'AUG' ? 'AUGUST' :
      d.label === 'SEP' ? 'SEPTEMBER' : d.label));
  }, [chartData, selectedDrive]);

  // For BDE users, calculate incomplete forms from October only
  const kpiDataWithBDEAdjustment = useMemo(() => {
    let adjustedKPI = [...kpiData];
    
    // If user is BDE, replace "Active BDEs" with "Incomplete Forms (Oct)"
    if (user?.role === 'Business Development Executive') {
      const octemberRecords = allRecords.filter(r => r.month === 'OCTOBER');
      const totalIncompleteOct = octemberRecords.reduce((sum, r) => sum + (Number(r.incomplete) || 0), 0);
      
      // Replace the "Active BDEs" card (last card in the array) with Incomplete Forms
      adjustedKPI = adjustedKPI.map(kpi => 
        kpi.label === 'Active BDEs' ? {
          label: 'Incomplete Forms (Oct)',
          value: totalIncompleteOct,
          change: 0,
          changeType: 'neutral' as const,
          icon: 'x-circle'
        } : kpi
      );
    }
    
    return adjustedKPI;
  }, [kpiData, user?.role, allRecords]);

  const overallAchievers = useMemo(() => getTopAchieversData(overallFilteredRecordsForTables, 5), [overallFilteredRecordsForTables]);
  const monthlyAchievers = useMemo(() => getTopAchieversData(monthlyFilteredRecordsForTables, 5), [monthlyFilteredRecordsForTables]);
  const fullOverallAchievers = useMemo(() => getTopAchieversData(overallFilteredRecordsForTables, 100), [overallFilteredRecordsForTables]);
  const fullMonthlyAchievers = useMemo(() => getTopAchieversData(monthlyFilteredRecordsForTables, 100), [monthlyFilteredRecordsForTables]);

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
          title="Dashboard" 
          subtitle="Loading data, please wait..." 
          searchQuery={searchQuery} 
          onSearchChange={setSearchQuery} 
          liveRecords={liveRecords}
          onBdeSelect={handleBdeSelect}
        />
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-[120px] w-full" />)}
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
            <Skeleton className="h-[350px] w-full" />
            <Skeleton className="h-[350px] w-full" />
          </div>
          <Skeleton className="h-[400px] w-full" />
        </div>
      </DashboardLayout>
    )
  }

  if (!isLoading && liveRecords.length === 0) {
    const isAdminOrOps = user && (user.role === 'Admin' || user.role === 'Operations');
    return (
      <DashboardLayout>
        <Header 
          title="Welcome" 
          subtitle="Get started by uploading your sales data" 
          searchQuery={searchQuery} 
          onSearchChange={setSearchQuery} 
          liveRecords={liveRecords}
          onBdeSelect={handleBdeSelect}
        />
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <h2 className="text-2xl font-semibold mb-2">No Data Found</h2>
          <p className="text-muted-foreground mb-4">
            It looks like there's no sales data to display. {isAdminOrOps ? 'Please upload a file to get started.' : 'Please contact Admins– Aditya/Vaibhav'}
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
      title="Dashboard"
      subtitle="Monitor your sales team's performance in real-time"
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      liveRecords={liveRecords}
      onBdeSelect={handleBdeSelect}
    >

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
        onMyReportToggle={handleMyReportToggle}
        isMyReportActive={isMyReportActive}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        {kpiDataWithBDEAdjustment.map((kpi, index) => (
          <KPICard key={kpi.label} data={kpi} index={index} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 mb-8 pr-6 pb-6 w-full overflow-x-auto">
        <div className="min-w-full">
          <PerformanceChart
            data={chartData}
            title="Overall Performance overview"
            currentDrive={selectedDrive}
          />
        </div>
        <div className="min-w-full">
          <PerformanceChart
            data={drivePerformanceChartData}
            title="Drive Performance"
            currentDrive={selectedDrive}
          />
        </div>
      </div>

      {/* Team Members Table - Only for BDE */}
      {user?.role === 'Business Development Executive' && (
        <div className="mt-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card overflow-hidden"
          >
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Current Team Members</h3>
            </div>
            <div className="overflow-x-auto">
              {activeTeamDataForBDEView.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <p>No sales data available. Please ensure data has been uploaded.</p>
                </div>
              ) : bdeTeamData.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <p>You may not have a team assigned yet.</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Team Member Name</th>
                      <th>Designation</th>
                      <th>Team Leader</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bdeTeamData.flatMap((team) => {
                    // TEMPORARY: Show all members to debug, we'll add isCurrentTeamMember filter back
                    const allMembers = team.records
                      .filter(r => !r.inactive)
                      .map(r => r.bdeName)
                      .filter((name, idx, arr) => arr.indexOf(name) === idx);
                    
                    const currentMembers = team.records
                      .filter(r => !r.inactive && r.isCurrentTeamMember)
                      .map(r => r.bdeName)
                      .filter((name, idx, arr) => arr.indexOf(name) === idx);
                    
                    console.log(`Team ${team.teamLeader}: All=${allMembers.length}, Current=${currentMembers.length}`);
                    
                    // Use current members if available, otherwise show all
                    const membersToShow = currentMembers.length > 0 ? currentMembers : allMembers;
                    
                    return membersToShow
                      .map(name => {
                        const user = users.find(u => u.name === name);
                        return {
                          name,
                          designation: user?.role || 'Business Development Executive',
                          teamLeader: team.teamLeader
                        };
                      });
                  })
                  // Sort: Team Leader first, then others
                  .sort((a, b) => {
                    if (a.name === a.teamLeader) return -1; // Team leader comes first
                    if (b.name === b.teamLeader) return 1;
                    return 0; // Keep original order for others
                  })
                  .map((member, index) => (
                    <motion.tr
                      key={`${member.name}-${member.teamLeader}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                    >
                      <td>
                        <span className="font-medium text-foreground">{member.name}</span>
                      </td>
                      <td>
                        <span className="text-sm text-muted-foreground">{member.designation}</span>
                      </td>
                      <td>
                        <span className="text-sm text-muted-foreground">{member.teamLeader}</span>
                      </td>
                    </motion.tr>
                  ))}
                  </tbody>
                </table>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Team Table - Hide for BDE */}
      {user?.role !== 'Business Development Executive' && (
        <div className="mt-8">
          <TeamTable
            teams={activeTeamData}
            title="Team Performance Summary"
            onTeamChanged={handleTeamChanged}
            onTeamSelect={handleTeamSelect}
          />
        </div>
      )}

      {/* Performance Tables */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <MonthlyPerformanceTable
          achievers={overallAchievers}
          title="Overall Performance"
          fullAchievers={fullOverallAchievers}
          onSeeMore={(filterActive) => {
            setApplyTargetFilter(filterActive);
            setOverallModalOpen(true);
          }}
          readOnly={false}
        />
        <MonthlyPerformanceTable
          achievers={monthlyAchievers}
          title="Monthly Performance"
          fullAchievers={fullMonthlyAchievers}
          onSeeMore={(filterActive) => {
            setApplyTargetFilter(filterActive);
            setMonthlyModalOpen(true);
          }}
          readOnly={false}
        />
      </div>

      <FullAchieversModal
        isOpen={overallModalOpen}
        onClose={() => setOverallModalOpen(false)}
        achievers={fullOverallAchievers}
        title="Overall Performance"
        applyTargetFilter={applyTargetFilter}
      />

      <FullAchieversModal
        isOpen={monthlyModalOpen}
        onClose={() => setMonthlyModalOpen(false)}
        achievers={fullMonthlyAchievers}
        title="Monthly Performance"
        applyTargetFilter={applyTargetFilter}
      />

      <BdePerformanceModal
        isOpen={bdeModalOpen}
        onClose={() => setBdeModalOpen(false)}
        bdeName={selectedBde}
        records={liveRecords}
      />

      <TeamPopupChart
        isOpen={teamModalOpen}
        onClose={() => setTeamModalOpen(false)}
        teamName={selectedTeam?.name || ''}
        teamLeader={selectedTeam?.leader || ''}
        records={liveRecords}
      />
    </DashboardLayout>
  )
}
