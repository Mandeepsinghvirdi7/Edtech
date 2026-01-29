import { SalesRecord, TopAchiever, FrontendTeamData } from '@/types';

export const getTopAchieversData = (records: SalesRecord[], count: number = 10): TopAchiever[] => {
  const activeRecords = records.filter(r => !r.inactive);
  const bdeMap = new Map<string, {
    name: string;
    branch: string;
    teamLeader: string;
    totalTarget: number;
    totalAdmissions: number;
    totalClosedPoints: number;
    achievement: number;
    recordsCount: number;
  }>();

  activeRecords.forEach(record => {
    const key = record.bdeName;
    if (!bdeMap.has(key)) {
      bdeMap.set(key, {
        name: record.bdeName,
        branch: record.branch,
        teamLeader: record.teamLeader,
        totalTarget: 0,
        totalAdmissions: 0,
        totalClosedPoints: 0,
        achievement: 0,
        recordsCount: 0,
      });
    }
    const bde = bdeMap.get(key)!;
    bde.totalTarget += record.target;
    bde.totalAdmissions += record.admissions;
    bde.totalClosedPoints += record.closedPoints;
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

