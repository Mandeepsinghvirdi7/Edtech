import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Header } from '@/components/layout/Header';
import { KPICard } from '@/components/dashboard/KPICard';
import { PerformanceChart } from '@/components/dashboard/PerformanceChart';
import { TeamTable } from '@/components/dashboard/TeamTable';
import { FilterBar } from '@/components/dashboard/FilterBar';
import { mockRecords, getKPIData, getTeamData, getMonthlyChartData } from '@/data/mockData';

export default function Dashboard() {
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedDrive, setSelectedDrive] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');

  const filteredRecords = useMemo(() => {
    let records = mockRecords;
    if (selectedBranch) records = records.filter(r => r.branch === selectedBranch);
    if (selectedDrive) records = records.filter(r => r.drive === selectedDrive);
    if (selectedMonth) records = records.filter(r => r.month === selectedMonth);
    return records;
  }, [selectedBranch, selectedDrive, selectedMonth]);

  const kpiData = useMemo(() => getKPIData(filteredRecords), [filteredRecords]);
  const teamData = useMemo(() => getTeamData(filteredRecords), [filteredRecords]);
  const chartData = useMemo(() => getMonthlyChartData(mockRecords, selectedBranch, selectedDrive), [selectedBranch, selectedDrive]);

  return (
    <DashboardLayout>
      <Header 
        title="Dashboard" 
        subtitle="Monitor your sales team's performance in real-time" 
      />

      <FilterBar
        selectedBranch={selectedBranch}
        selectedDrive={selectedDrive}
        selectedMonth={selectedMonth}
        onBranchChange={setSelectedBranch}
        onDriveChange={setSelectedDrive}
        onMonthChange={setSelectedMonth}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {kpiData.map((kpi, index) => (
          <KPICard key={kpi.label} data={kpi} index={index} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        <PerformanceChart 
          data={chartData} 
          title="Monthly Performance Overview" 
        />
        <PerformanceChart 
          data={chartData.slice(0, 6)} 
          title="H1 Performance Trend" 
        />
      </div>

      {/* Team Table */}
      <TeamTable teams={teamData} title="Team Performance Summary" />
    </DashboardLayout>
  );
}
