import { useState } from 'react';
import { motion } from 'framer-motion';
import { MoreHorizontal, Users, TrendingUp, TrendingDown } from 'lucide-react';
import { FrontendTeamData } from '@/types';
import { Button } from '@/Components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import { ChangeTeamDialog } from './ChangeTeamDialog';

interface TeamTableProps {
  teams: FrontendTeamData[];
  title: string;
  onTeamChanged: (bdeName: string, newTeamLeader: string, month: string, branch: string) => void;
  onTeamSelect?: (teamName: string, teamLeader: string) => void;
}

export function TeamTable({ teams, title, onTeamChanged, onTeamSelect }: TeamTableProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<FrontendTeamData | null>(null);

  const handleOpenDialog = (team: FrontendTeamData) => {
    setSelectedTeam(team);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedTeam(null);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card overflow-hidden"
      >
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>DBM</th>
                <th>Team Name</th>
                <th>BDEs</th>
                <th>Target</th>
                <th>Admissions</th>
                <th>Closed Points</th>
                <th>Achievement</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team, index) => (
                <motion.tr
                  key={`${team.dbm}-${team.teamLeader}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                >
                  <td>
                    <span className="font-medium text-foreground">{team.dbm}</span>
                  </td>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <Users className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <span
                          className="font-medium text-foreground cursor-pointer hover:text-primary transition-colors"
                          onClick={() => onTeamSelect?.(team.teamName, team.teamLeader)}
                        >
                          {team.teamName}
                        </span>
                        <span className="text-xs text-muted-foreground">Lead: {team.teamLeader}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="text-muted-foreground">{team.bdeCount}</span>
                  </td>
                  <td>
                    <span className="font-medium">{(team.totalTarget || 0).toLocaleString()}</span>
                  </td>
                  <td>
                    <span className="font-medium text-success">{(team.totalAdmissions || 0).toLocaleString()}</span>
                  </td>
                  <td>
                    <span className="font-medium text-primary">{(team.totalClosedPoints || 0).toLocaleString()}</span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className={`flex items-center gap-1 ${
                        team.avgAchievement >= 80 ? 'text-success' : 
                        team.avgAchievement >= 50 ? 'text-warning' : 
                        'text-destructive'
                      }`}>
                        {team.avgAchievement >= 80 ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        <span className="font-semibold">{team.avgAchievement}%</span>
                      </div>
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            team.avgAchievement >= 80 ? 'bg-success' : 
                            team.avgAchievement >= 50 ? 'bg-warning' : 
                            'bg-destructive'
                          }`}
                          style={{ width: `${Math.min(team.avgAchievement, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleOpenDialog(team)}>
                          Change BDE Team
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
      {selectedTeam && (
        <ChangeTeamDialog
          isOpen={dialogOpen}
          onClose={handleCloseDialog}
          team={selectedTeam}
          allTeams={teams}
          onTeamChanged={onTeamChanged}
        />
      )}
    </>
  );
}
