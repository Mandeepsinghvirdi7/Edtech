import { motion } from 'framer-motion';
import { Trophy, TrendingUp } from 'lucide-react';
import { TopAchiever } from '@/data/dataProcess';
import { useAuth } from '@/contexts/AuthContext';
import { shouldShowTopAchieversValues } from '@/lib/sharedUtilities';

interface TopAchieversTableProps {
  achievers: TopAchiever[];
  title: string;
}

export function TopAchieversTable({ achievers, title }: TopAchieversTableProps) {
  const { user } = useAuth();
  const canShowValues = shouldShowTopAchieversValues(user);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="glass-card overflow-hidden"
    >
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          {title}
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>BDE Name</th>
              <th>Team Leader</th>
              <th>Achievement %</th>
            </tr>
          </thead>
          <tbody>
            {achievers.map((achiever, index) => (
              <motion.tr
                key={achiever.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
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
                    {index < 3 && <Trophy className={`w-4 h-4 ${
                      index === 0 ? 'text-yellow-500' :
                      index === 1 ? 'text-gray-400' :
                      index === 2 ? 'text-amber-600' :
                      'text-muted-foreground'
                    }`} />}
                  </div>
                </td>
                <td>
                  <span className="font-medium text-foreground">
                    {canShowValues ? achiever.name : '***'}
                  </span>
                </td>
                <td>
                  <span className="text-muted-foreground">
                    {canShowValues ? achiever.teamLeader : '***'}
                  </span>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-success">
                      <TrendingUp className="w-4 h-4" />
                      <span className="font-semibold">
                        {canShowValues ? `${achiever.achievement}%` : '***'}
                      </span>
                    </div>
                    {canShowValues && (
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-success rounded-full"
                          style={{ width: `${Math.min(achiever.achievement, 100)}%` }}
                        />
                      </div>
                    )}
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
