import { getMonthlyChartData } from './dataProcess';
import { SalesRecord } from '@/types';

describe('getMonthlyChartData', () => {
  it('should only return data for months that have records', () => {
    const records: SalesRecord[] = [
      {
        month: 'JANUARY',
        target: 100,
        admissions: 80,
        closedPoints: 80,
        bdeName: 'test',
        branch: 'test',
        dbm: 'test',
        drive: 'test',
        fy: 'test',
        inactive: false,
        teamLeader: 'test',
        teamName: 'test',
      },
      {
        month: 'MARCH',
        target: 120,
        admissions: 100,
        closedPoints: 100,
        bdeName: 'test',
        branch: 'test',
        dbm: 'test',
        drive: 'test',
        fy: 'test',
        inactive: false,
        teamLeader: 'test',
        teamName: 'test',
      },
    ];

    const chartData = getMonthlyChartData(records);

    expect(chartData).toHaveLength(2);
    expect(chartData[0].label).toBe('JAN');
    expect(chartData[1].label).toBe('MAR');
  });

  it('should return an empty array if there are no records', () => {
    const records: SalesRecord[] = [];
    const chartData = getMonthlyChartData(records);
    expect(chartData).toHaveLength(0);
  });
});
