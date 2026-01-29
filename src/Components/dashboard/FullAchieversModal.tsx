import { motion } from 'framer-motion';
import { Trophy, Medal, Award } from 'lucide-react';
import { TopAchiever } from '@/data/dataProcess';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PerformanceChart } from './PerformanceChart';
import { getBDEChartData } from '@/data/dataProcess';
import { api } from '@/lib/api';
import { SalesRecord } from '@/types';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { canUserClickBDEName, canUserViewBDEChart } from '@/lib/sharedUtilities';

interface FullAchieversModalProps {
  isOpen: boolean;
  onClose: () => void;
  achievers: TopAchiever[];
  title: string;
  applyTargetFilter?: boolean;
}

export function FullAchieversModal({ isOpen, onClose, achievers, title, applyTargetFilter = false }: FullAchieversModalProps) {
  const { user } = useAuth();
  const [liveRecords, setLiveRecords] = useState<SalesRecord[]>([]);
  const [selectedBDE, setSelectedBDE] = useState<string | null>(null);
  const [performanceDialogOpen, setPerformanceDialogOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const records = await api.getMasterData();
        setLiveRecords(records);
      } catch (error) {
        console.error("Failed to fetch records:", error);
      }
    };
    fetchData();
  }, []);

  const handleBDEClick = (bdeName: string) => {
    const bdeRecord = liveRecords.find(r => r.bdeName === bdeName);
    
    // Check if user can view chart for this BDE
    if (!canUserViewBDEChart(user, bdeName, bdeRecord)) {
      return;
    }

    setSelectedBDE(bdeName);
    setPerformanceDialogOpen(true);
  };

  const handleClosePerformanceDialog = () => {
    setPerformanceDialogOpen(false);
    setSelectedBDE(null);
  };

  const filteredAchievers = useMemo(() => {
    let filtered = achievers;
    
    // Apply target >= 8 filter if requested
    if (applyTargetFilter) {
      filtered = achievers.filter(achiever => achiever.totalTarget >= 8);
    }
    
    return filtered;
  }, [achievers, applyTargetFilter]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{title} - Full List</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <table className="data-table font-sans w-full">
              <thead>
                <tr>
                  <th className="text-xs font-light text-gray-500 uppercase">Rank</th>
                  <th className="text-xs font-light text-gray-500 uppercase">BDE Name</th>
                  <th className="text-xs font-light text-gray-500 uppercase">Team Leader</th>
                  <th className="text-xs font-light text-gray-500 uppercase">Target</th>
                  <th className="text-xs font-light text-gray-500 uppercase">Admissions</th>
                  <th className="text-xs font-light text-gray-500 uppercase">Achievement</th>
                </tr>
              </thead>
              <tbody>
                {filteredAchievers.map((achiever, index) => (
                  <motion.tr
                    key={achiever.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * index }}
                    className={index < 3 ? 'bg-gradient-to-r from-yellow-50 to-transparent dark:from-yellow-950/20' : ''}
                  >
                    <td>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${
                          index === 0 ? 'text-yellow-600' :
                          index === 1 ? 'text-gray-400' :
                          index === 2 ? 'text-amber-600' :
                          'text-muted-foreground'
                        }`}>
                          #{index + 1}
                        </span>
                        {index === 0 && <Trophy className="w-4 h-4 text-yellow-500" />}
                        {index === 1 && <Medal className="w-4 h-4 text-gray-400" />}
                        {index === 2 && <Award className="w-4 h-4 text-amber-600" />}
                      </div>
                    </td>
                    <td>
                      {(() => {
                        const bdeRecord = liveRecords.find(r => r.bdeName === achiever.name);
                        const canClick = canUserClickBDEName(user, achiever.name, bdeRecord);
                        
                        if (canClick) {
                          return (
                            <Button
                              variant="ghost"
                              className="p-0 h-auto font-medium text-foreground hover:text-primary"
                              onClick={() => handleBDEClick(achiever.name)}
                            >
                              {achiever.name}
                            </Button>
                          );
                        } else {
                          return (
                            <span className="font-medium text-foreground cursor-not-allowed opacity-60">
                              {achiever.name}
                            </span>
                          );
                        }
                      })()}
                    </td>
                    <td>
                      <span className="text-muted-foreground">{achiever.teamLeader}</span>
                    </td>
                    <td>
                      <span className="font-medium">{achiever.totalTarget.toLocaleString()}</span>
                    </td>
                    <td>
                      <span className="font-medium text-success">{achiever.totalAdmissions.toLocaleString()}</span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{achiever.achievement}%</span>
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${Math.min(achiever.achievement, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={performanceDialogOpen} onOpenChange={handleClosePerformanceDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedBDE} - Individual Performance</DialogTitle>
          </DialogHeader>
          {selectedBDE && (
            <PerformanceChart
              data={getBDEChartData(liveRecords, selectedBDE)}
              title={`${selectedBDE} Performance`}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
