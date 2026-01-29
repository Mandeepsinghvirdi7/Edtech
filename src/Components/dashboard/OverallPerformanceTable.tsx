import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { TopAchiever } from '@/types';

interface OverallPerformanceTableProps {
  achievers: TopAchiever[];
}

export function OverallPerformanceTable({ achievers }: OverallPerformanceTableProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="glass-card overflow-hidden"
    >
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-500" />
          Overall Performance
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table font-sans">
          <thead>
            <tr>
              <th className="text-xs font-light text-gray-500 uppercase">BDE Name</th>
              <th className="text-xs font-light text-gray-500 uppercase">Branch</th>
              <th className="text-xs font-light text-gray-500 uppercase">Team Leader</th>
              <th className="text-xs font-light text-gray-500 uppercase">Target</th>
              <th className="text-xs font-light text-gray-500 uppercase">Admissions</th>
              <th className="text-xs font-light text-gray-500 uppercase">Closed Points</th>
              <th className="text-xs font-light text-gray-500 uppercase">Achievement</th>
            </tr>
          </thead>
          <tbody>
            {achievers.map((achiever, index) => (
              <motion.tr
                key={achiever.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <td>
                  <span className="font-medium text-foreground">{achiever.name}</span>
                </td>
                <td>
                  <span className="text-muted-foreground">{achiever.branch}</span>
                </td>
                <td>
                  <span className="text-muted-foreground">{achiever.teamLeader}</span>
                </td>
                <td>
                  <span className="font-medium">{achiever.totalTarget.toLocaleString()}</span>
                </td>
                <td>
                  <span className="font-medium text-green-600">{achiever.totalAdmissions.toLocaleString()}</span>
                </td>
                <td>
                  <span className="font-medium text-blue-600">{achiever.totalClosedPoints.toLocaleString()}</span>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{achiever.achievement}%</span>
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 rounded-full"
                        style={{ width: `${Math.min(achiever.achievement, 100)}%` }}
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
  );
}
