import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PerformanceChart } from './PerformanceChart';
import { getMonthlyChartData } from '@/data/dataProcess';
import { SalesRecord } from '@/types';

interface TeamPopupChartProps {
  isOpen: boolean;
  onClose: () => void;
  teamName: string;
  teamLeader: string;
  records: SalesRecord[];
}

export function TeamPopupChart({ isOpen, onClose, teamName, teamLeader, records }: TeamPopupChartProps) {
  const teamRecords = useMemo(() => {
    return records.filter(record =>
      record.teamLeader === teamLeader &&
      record.teamName === teamName
    );
  }, [records, teamLeader, teamName]);

  const chartData = useMemo(() => {
    return getMonthlyChartData(teamRecords);
  }, [teamRecords]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Team Performance: {teamName}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Team Leader: {teamLeader}
          </p>
        </DialogHeader>

        <div className="mt-6 flex-grow">
          <PerformanceChart
            data={chartData}
            title={`${teamName} Performance Overview`}
          />
        </div>

        <div className="mt-6 text-sm text-muted-foreground p-4 bg-muted rounded-lg">
          <p>This chart shows the combined performance of {teamLeader} and all team members.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
