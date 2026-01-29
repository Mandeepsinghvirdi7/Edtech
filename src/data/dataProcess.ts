import { SalesRecord, TeamData, KPIData, ChartDataPoint, FrontendTeamData } from '@/types';

export const MONTHS = [
  'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER',
  'OCTOBER', 'NOVEMBER', 'DECEMBER', 'JANUARY', 'FEBRUARY', 'MARCH'
];

// Generate mock sales records


export const getKPIData = (allRecords: SalesRecord[], currentMonth?: string, selectedBranch?: string): KPIData[] => {
  // Separate logic for values (show totals) vs change (show month-over-month)
  let branchFilteredRecords = selectedBranch ? allRecords.filter(r => r.branch === selectedBranch) : allRecords;
  
  // Values: Show totals across all months (or specific month if selected)
  let valueRecords = branchFilteredRecords;
  if (currentMonth) {
    valueRecords = valueRecords.filter(r => r.month === currentMonth);
  }
  
  // Change percentage: Always use latest vs previous month
  let latestMonth = currentMonth;
  let previousMonth: string | undefined;
  
  if (!currentMonth) {
    // Find the latest month for comparison
    const monthsInData = new Set(branchFilteredRecords.map(r => r.month));
    let latestMonthIndex = -1;
    monthsInData.forEach(month => {
      const index = MONTHS.indexOf(month);
      if (index > latestMonthIndex) {
        latestMonthIndex = index;
        latestMonth = month;
      }
    });
  }
  
  // Find previous month for trend analysis
  if (latestMonth) {
    const monthIndex = MONTHS.indexOf(latestMonth);
    previousMonth = monthIndex > 0 ? MONTHS[monthIndex - 1] : undefined;
  }
  
  // Calculate VALUES: Totals from valueRecords (either all months or specific month)
  const totalTarget = valueRecords.reduce((sum, r) => sum + (Number(r.target) || 0), 0);
  const totalAdmissions = valueRecords.reduce((sum, r) => sum + (Number(r.closedAdm) || 0), 0);
  const totalClosedPoints = valueRecords.reduce((sum, r) => sum + (Number(r.closedPoints) || 0), 0);
  const totalCancellations = valueRecords.reduce((sum, r) => sum + (Number(r.cancellation) || 0), 0);
  
  // Calculate CHANGE: Use latest vs previous month only
  const latestRecords = latestMonth ? branchFilteredRecords.filter(r => r.month === latestMonth) : [];
  const prevRecords = previousMonth ? branchFilteredRecords.filter(r => r.month === previousMonth) : [];
  
  const latestTarget = latestRecords.reduce((sum, r) => sum + (Number(r.target) || 0), 0);
  const latestAdmissions = latestRecords.reduce((sum, r) => sum + (Number(r.closedAdm) || 0), 0);
  const latestClosedPoints = latestRecords.reduce((sum, r) => sum + (Number(r.closedPoints) || 0), 0);
  const latestCancellations = latestRecords.reduce((sum, r) => sum + (Number(r.cancellation) || 0), 0);
  
  const prevTarget = prevRecords.reduce((sum, r) => sum + (Number(r.target) || 0), 0);
  const prevAdmissions = prevRecords.reduce((sum, r) => sum + (Number(r.closedAdm) || 0), 0);
  const prevClosedPoints = prevRecords.reduce((sum, r) => sum + (Number(r.closedPoints) || 0), 0);
  const prevCancellations = prevRecords.reduce((sum, r) => sum + (Number(r.cancellation) || 0), 0);
  
  // Calculate percentage changes based on latest vs previous month
  const targetChange = prevTarget > 0 ? ((latestTarget - prevTarget) / prevTarget) * 100 : 0;
  const admissionsChange = prevAdmissions > 0 ? ((latestAdmissions - prevAdmissions) / prevAdmissions) * 100 : 0;
  const closedPointsChange = prevClosedPoints > 0 ? ((latestClosedPoints - prevClosedPoints) / prevClosedPoints) * 100 : 0;
  const cancellationsChange = prevCancellations > 0 ? ((latestCancellations - prevCancellations) / prevCancellations) * 100 : 0;
  
  // Achievement % = (Closed Points / Total Target) * 100 - uses VALUES (all months or specific month)
  const achievement = totalTarget > 0 ? Math.round((totalClosedPoints / totalTarget) * 100) : 0;
  const uniqueActiveBDEs = new Set(valueRecords.filter(r => !r.inactive).map(r => r.bdeName)).size;

  return [
    { 
      label: 'Total Target', 
      value: totalTarget, 
      change: prevTarget === 0 ? 0 : Math.round(targetChange * 100) / 100, 
      changeType: targetChange > 0 ? 'positive' : targetChange < 0 ? 'negative' : 'neutral', 
      icon: 'target' 
    },
    { 
      label: 'Total Admissions', 
      value: totalAdmissions, 
      change: prevAdmissions === 0 ? 0 : Math.round(admissionsChange * 100) / 100, 
      changeType: admissionsChange > 0 ? 'positive' : admissionsChange < 0 ? 'negative' : 'neutral', 
      icon: 'users' 
    },
    { 
      label: 'Closed Points', 
      value: totalClosedPoints, 
      change: prevClosedPoints === 0 ? 0 : Math.round(closedPointsChange * 100) / 100, 
      changeType: closedPointsChange > 0 ? 'positive' : closedPointsChange < 0 ? 'negative' : 'neutral', 
      icon: 'trending-up' 
    },
    { 
      label: 'Cancellation', 
      value: totalCancellations, 
      change: prevCancellations === 0 ? 0 : Math.round(cancellationsChange * 100) / 100, 
      changeType: cancellationsChange > 0 ? 'positive' : cancellationsChange < 0 ? 'negative' : 'neutral', 
      icon: 'x-circle' 
    },
    { 
      label: 'Achievement %', 
      value: achievement, 
      change: 0, 
      changeType: 'neutral', 
      icon: 'percent' 
    },
    { 
      label: 'Active BDEs', 
      value: uniqueActiveBDEs, 
      change: 0, 
      changeType: 'neutral', 
      icon: 'user-check' 
    },
  ];
};

export const getTeamData = (records: SalesRecord[], branch?: string, drive?: string, month?: string): FrontendTeamData[] => {
  let filtered = records;

  if (branch) filtered = filtered.filter(r => r.branch === branch);
  if (drive) filtered = filtered.filter(r => r.drive === drive);
  if (month) filtered = filtered.filter(r => r.month === month);

  const teamMap = new Map<string, FrontendTeamData>();

  filtered.forEach(record => {
    const key = `${record.dbm}-${record.teamLeader}`;
    const target = Number(record.target) || 0;
    const closedAdm = Number(record.closedAdm) || 0;
    const closedPoints = Number(record.closedPoints) || 0;
    
    const existing = teamMap.get(key);
    if (existing) {
      existing.totalTarget += target;
      existing.totalAdmissions += closedAdm;
      existing.totalClosedPoints += closedPoints;
      existing.records.push(record);
    } else {
      teamMap.set(key, {
        dbm: record.dbm,
        teamLeader: record.teamLeader,
        teamName: record.teamName,
        totalTarget: target,
        totalAdmissions: closedAdm,
        totalClosedPoints: closedPoints,
        avgAchievement: 0,
        bdeCount: 0,
        records: [record]
      });
    }
  });

  return Array.from(teamMap.values()).map(team => ({
    ...team,
    // Achievement % = (Closed Points / Target) * 100 - standardized calculation
    avgAchievement: team.totalTarget > 0 ? Math.round((team.totalClosedPoints / team.totalTarget) * 100) : 0,
    bdeCount: new Set(team.records.map(r => r.bdeName)).size
  }));
};


export const getMonthlyChartData = (records: SalesRecord[]): ChartDataPoint[] => {
  const chartData = MONTHS.map(month => {
    const monthRecords = records.filter(r => r.month === month);
    if (monthRecords.length === 0) {
      return null; 
    }

    const totalTarget = monthRecords.reduce((sum, r) => sum + (Number(r.target) || 0), 0);
    const totalAdmissions = monthRecords.reduce((sum, r) => sum + (Number(r.closedAdm) || 0), 0);
    const totalClosedPoints = monthRecords.reduce((sum, r) => sum + (Number(r.closedPoints) || 0), 0);

    return {
      label: month.substring(0, 3),
      target: totalTarget,
      admissions: totalAdmissions,
      closedPoints: totalClosedPoints,
      achievement: totalTarget > 0 ? Math.round((totalClosedPoints / totalTarget) * 100) : 0
    };
  }).filter((d): d is ChartDataPoint => d !== null); 

  return chartData;
};


export interface BDEData {
  name: string;
  teamName: string;
  totalTarget: number;
  totalAdmissions: number;
  totalClosedPoints: number;
  avgAchievement: number;
}

export interface TopAchiever {
  name: string;
  branch: string;
  teamLeader: string;
  totalTarget: number;
  totalAdmissions: number;
  totalClosedPoints: number;
  achievement: number;
}

export const getTopAchieversData = (records: SalesRecord[], count: number = 10): TopAchiever[] => {
  // Filter out inactive users from UI lists - they contribute to totals but don't appear in rankings
  const activeRecords = records.filter(r => !r.inactive);
  const bdeMap = new Map<string, {
    name: string;
    branch: string;
    teamLeader: string;
    totalTarget: number;
    totalAdmissions: number;
    totalClosedPoints: number;
    achievement: number;
    recordsCount: number; // To calculate average later if needed, but not here for sum
  }>();

  activeRecords.forEach(record => {
    const key = record.bdeName;
    const target = Number(record.target) || 0;
    const closedAdm = Number(record.closedAdm) || 0;
    const closedPoints = Number(record.closedPoints) || 0;
    
    if (!bdeMap.has(key)) {
      bdeMap.set(key, {
        name: record.bdeName,
        branch: record.branch, // Taking the branch from the first record, assuming BDEs are in one branch
        teamLeader: record.teamLeader, // Taking the teamLeader from the first record, assuming BDEs are in one team
        totalTarget: 0,
        totalAdmissions: 0,
        totalClosedPoints: 0,
        achievement: 0,
        recordsCount: 0,
      });
    }
    const bde = bdeMap.get(key)!;
    bde.totalTarget += target;
    bde.totalAdmissions += closedAdm;
    bde.totalClosedPoints += closedPoints;
    bde.recordsCount++;
  });

  const achievers = Array.from(bdeMap.values()).map(bde => ({
    ...bde,
    // Achievement % = (Closed Points / Target) * 100 - standardized calculation
    achievement: bde.totalTarget > 0 ? Math.round((bde.totalClosedPoints / bde.totalTarget) * 100) : 0,
  }));

  return achievers
    .sort((a, b) => b.achievement - a.achievement)
    .slice(0, count);
};

export const getBDEData = (records: SalesRecord[], branch?: string, team?: string, drive?: string, month?: string): BDEData[] => {
  let filtered = records;

  if (branch) filtered = filtered.filter(r => r.branch === branch);
  if (team) filtered = filtered.filter(r => r.teamLeader === team);
  if (drive) filtered = filtered.filter(r => r.drive === drive);
  if (month) filtered = filtered.filter(r => r.month === month);
  filtered = filtered.filter(r => !r.inactive);

  const bdeMap = new Map<string, BDEData>();

  filtered.forEach(record => {
    const target = Number(record.target) || 0;
    const closedAdm = Number(record.closedAdm) || 0;
    const closedPoints = Number(record.closedPoints) || 0;
    
    const existing = bdeMap.get(record.bdeName);
    if (existing) {
      existing.totalTarget += target;
      existing.totalAdmissions += closedAdm;
      existing.totalClosedPoints += closedPoints;
    } else {
      bdeMap.set(record.bdeName, {
        name: record.bdeName,
        teamName: record.teamLeader, // Added teamName for consistency with BDEData interface
        totalTarget: target,
        totalAdmissions: closedAdm,
        totalClosedPoints: closedPoints,
        avgAchievement: 0
      });
    }
  });

  return Array.from(bdeMap.values()).map(bde => ({
    ...bde,
    // Achievement % = (Closed Points / Target) * 100 - standardized calculation
    avgAchievement: bde.totalTarget > 0 ? Math.round((bde.totalClosedPoints / bde.totalTarget) * 100) : 0
  }));
};

export const getBDEChartData = (records: SalesRecord[], bdeName: string): ChartDataPoint[] => {
  const bdeRecords = records.filter(r => r.bdeName === bdeName && !r.inactive);

  return MONTHS.map(month => {
    const monthRecords = bdeRecords.filter(r => r.month === month);
    const totalTarget = monthRecords.reduce((sum, r) => sum + (Number(r.target) || 0), 0);
    const totalAdmissions = monthRecords.reduce((sum, r) => sum + (Number(r.closedAdm) || 0), 0);
    const totalClosedPoints = monthRecords.reduce((sum, r) => sum + (Number(r.closedPoints) || 0), 0);

    return {
      label: month.substring(0, 3),
      target: totalTarget,
      admissions: totalAdmissions,
      closedPoints: totalClosedPoints,
      // Achievement % = (Closed Points / Target) * 100 - standardized calculation
      achievement: totalTarget > 0 ? Math.round((totalClosedPoints / totalTarget) * 100) : 0
    };
  });
};
