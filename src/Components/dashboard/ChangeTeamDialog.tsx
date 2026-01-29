import { useState, useMemo } from 'react';
import { Button } from '@/Components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/Components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/Components/ui/select';
import { Label } from '@/Components/ui/label';
import { api } from '@/lib/api';
import { useToast } from '@/Components/ui/use-toast';
import { SalesRecord, TeamData } from '@/types';

interface ChangeTeamDialogProps {
  isOpen: boolean;
  onClose: () => void;
  team: TeamData | null;
  allTeams: TeamData[];
  onTeamChanged: (bdeName: string, newTeamLeader: string, month: string, branch: string) => void;
}

export function ChangeTeamDialog({ isOpen, onClose, team, allTeams, onTeamChanged }: ChangeTeamDialogProps) {
  const { toast } = useToast();
  const [selectedBde, setSelectedBde] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [newTeamLeader, setNewTeamLeader] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const bdeNames = useMemo(() => {
    if (!team) return [];
    const names = new Set(team.records.map(r => r.bdeName));
    return Array.from(names);
  }, [team]);

  const months = useMemo(() => {
    if (!team) return [];
    const monthSet = new Set(team.records.map(r => r.month));
    return Array.from(monthSet);
  }, [team]);

  const teamLeaders = useMemo(() => {
    return allTeams.map(t => t.teamLeader).filter(tl => tl !== team?.teamLeader);
  }, [allTeams, team]);

  const handleSave = async () => {
    if (!team || !selectedBde || !selectedMonth || !newTeamLeader) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please select a BDE, month, and a new team.',
      });
      return;
    }

    setIsSaving(true);
    try {
      await api.updateBdeTeam(selectedBde, newTeamLeader, selectedMonth, team.records[0].branch);
      onTeamChanged(selectedBde, newTeamLeader, selectedMonth, team.records[0].branch);
      toast({
        title: 'Success',
        description: `${selectedBde}'s team has been changed to ${newTeamLeader} for ${selectedMonth}.`,
      });
      onClose();
    } catch (error) {
      console.error('Failed to change team:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not update the BDE\'s team. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Change BDE Team</DialogTitle>
          <DialogDescription>
            Move a BDE to a different team for a specific month.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="bde" className="text-right">
              BDE
            </Label>
            <Select value={selectedBde} onValueChange={setSelectedBde}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a BDE" />
              </SelectTrigger>
              <SelectContent>
                {bdeNames.map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="month" className="text-right">
              Month
            </Label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a month" />
              </SelectTrigger>
              <SelectContent>
                {months.map(month => (
                  <SelectItem key={month} value={month}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="new-team" className="text-right">
              New Team
            </Label>
            <Select value={newTeamLeader} onValueChange={setNewTeamLeader}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select new team" />
              </SelectTrigger>
              <SelectContent>
                {teamLeaders.map(leader => (
                  <SelectItem key={leader} value={leader}>{leader}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
