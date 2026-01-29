import { useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { PerformanceChart } from './PerformanceChart';
import { getBDEChartData } from '@/data/dataProcess';
import { SalesRecord } from '@/types';

interface BdePerformanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  bdeName: string | null;
  records: SalesRecord[];
}

export function BdePerformanceModal({ isOpen, onClose, bdeName, records }: BdePerformanceModalProps) {
  useEffect(() => {
    console.log("BdePerformanceModal props updated - isOpen:", isOpen, "bdeName:", bdeName);
  }, [isOpen, bdeName]);

  const chartData = useMemo(() => {
    if (!bdeName) return [];
    return getBDEChartData(records, bdeName);
  }, [records, bdeName]);

  if (!bdeName || !isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full">
        <DialogHeader className="w-full">
          <DialogTitle>Individual Performance: {bdeName}</DialogTitle>
          <DialogDescription>
            Monthly performance overview for {bdeName}.
          </DialogDescription>
        </DialogHeader>
        <div className="h-[600px] mt-4 w-full">
          <PerformanceChart data={chartData} title={`Monthly Performance - ${bdeName}`} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
