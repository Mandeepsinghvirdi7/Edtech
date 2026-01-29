import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Header } from '@/components/layout/Header';
import { api } from '@/lib/api';
import { SalesRecord, User } from '@/types';
import { MONTHS } from '@/data/dataProcess';
import { 
  Users, 
  ChevronRight, 
  ChevronDown, 
  User as UserIcon,
  ArrowRightLeft
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';

interface TeamMember {
  bdeName: string;
  inactive: boolean;
  isCurrentTeamMember: boolean;
  role: string;
}

interface Team {
  leader: string;
  users: TeamMember[];
  inactive: boolean;
}

interface TeamTree {
  [teamName: string]: Team;
}

interface BranchTeamData {
  [branchName: string]: TeamTree;
}

export default function AdminTeams() {
  const { toast } = useToast();
  const [salesRecords, setSalesRecords] = useState<SalesRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [reassigningBDE, setReassigningBDE] = useState<{bdeName: string, fromTeam: string, branch: string} | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [showNonCurrentMembers, setShowNonCurrentMembers] = useState(false);
  const [creatingDrive, setCreatingDrive] = useState(false);
  const [isCreatingDrive, setIsCreatingDrive] = useState(false);
  const [namingTeam, setNamingTeam] = useState<{teamLeader: string, currentName: string} | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('');
  const [newUserBranch, setNewUserBranch] = useState('');

  const handleCreateDrive = async (name: string, startMonth: string, startYear: number, endMonth: string, endYear: number) => {
    setIsCreatingDrive(true);
    try {
      await api.createDrive(name, startMonth, startYear, endMonth, endYear);
      toast({
        title: 'Success',
        description: `Drive "${name}" has been created successfully.`,
      });
      setCreatingDrive(false);
    } catch (error) {
      console.error('Failed to create drive:', error);
      toast({
        variant: 'destructive',
        title: 'Creation Failed',
        description: 'Could not create the drive. Please try again.',
      });
    } finally {
      setIsCreatingDrive(false);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');

  const handleBdeSelect = (bdeName: string) => {
    toast({
      title: 'Info',
      description: `Cannot view BDE performance from this page. Go to the dashboard to see charts for ${bdeName}.`,
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [salesData, usersData] = await Promise.all([
          api.getMasterData(),
          api.getUsers(),
        ]);
        
        setSalesRecords(salesData);
        setUsers(usersData);

        if (salesData.length > 0) {
          const branches = Array.from(new Set(salesData.map(r => r.branch)));
          setSelectedBranch(branches[0] || '');
        }
      } catch (error) {
        console.error("Failed to fetch initial data", error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load necessary data. Please refresh the page.',
        });
      }
    };

    fetchData();

    // Refetch data when window gains focus (user navigates back to this page)
    const handleFocus = () => {
      fetchData();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const teamData = useMemo<BranchTeamData>(() => {
    const data: BranchTeamData = {};
    salesRecords.forEach(record => {
      if (!showInactive && record.inactive) {
        return;
      }
      if (!data[record.branch]) {
        data[record.branch] = {};
      }
      const teamKey = record.teamName || record.teamLeader;
      if (!data[record.branch][teamKey]) {
        const leaderUser = users.find(u => u.name === record.teamLeader && u.branch === record.branch);
        data[record.branch][teamKey] = {
          leader: record.teamLeader,
          users: [],
          inactive: leaderUser ? leaderUser.inactive : false
        };
      }
      // Add member if not already present for this team and they are current team member (or if showing non-current members)
      if (!data[record.branch][teamKey].users.some(m => m.bdeName === record.bdeName) && (record.isCurrentTeamMember || showNonCurrentMembers)) {
        data[record.branch][teamKey].users.push({
          bdeName: record.bdeName,
          inactive: record.inactive,
          isCurrentTeamMember: record.isCurrentTeamMember,
          role: record.role
        });
      }
    });
    return data;
  }, [salesRecords, users, showInactive, showNonCurrentMembers]);

  const branches = useMemo(() => Object.keys(teamData), [teamData]);
  const teamTree = useMemo(() => {
    if (selectedBranch && teamData[selectedBranch]) {
      return teamData[selectedBranch];
    }
    return {};
  }, [teamData, selectedBranch]);

  const toggleTeam = (teamName: string) => {
    const newExpanded = new Set(expandedTeams);
    if (newExpanded.has(teamName)) {
      newExpanded.delete(teamName);
    } else {
      newExpanded.add(teamName);
    }
    setExpandedTeams(newExpanded);
  };

  const handleReassign = async (bdeName: string, fromTeam: string, toTeam: string, month: string, branch: string) => {
    try {
      await api.updateBdeTeam(bdeName, toTeam, month, branch);
      setSalesRecords(prevRecords => {
        return prevRecords.map(record => {
          if (record.bdeName === bdeName && record.month === month && record.branch === branch) {
            return { ...record, teamLeader: toTeam };
          }
          return record;
        });
      });
      toast({
        title: 'Success',
        description: `${bdeName}'s team has been changed to ${toTeam} for ${month}.`,
      });
      setReassigningBDE(null);
    } catch (error) {
        console.error('Failed to change team:', error);
        toast({
          variant: 'destructive',
          title: 'Update Failed',
          description: 'Could not update the BDE\'s team. Please try again.',
        });
    }
  };

  const handleToggleInactive = async (bdeName: string, inactive: boolean, branch: string) => {
    try {
      await api.updateUserStatus(bdeName, branch, inactive);
      setSalesRecords(prevRecords => {
        return prevRecords.map(record => {
          if (record.bdeName === bdeName && record.branch === branch) {
            return { ...record, inactive };
          }
          return record;
        });
      });
      setUsers(prevUsers =>
        prevUsers.map(u =>
          (u.name === bdeName && u.branch === branch) ? { ...u, inactive } : u
        )
      );
      toast({
        title: 'Success',
        description: `${bdeName} has been marked as ${inactive ? 'inactive' : 'active'}.`,
      });
    } catch (error) {
      console.error('Failed to update user status:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not update the user\'s status. Please try again.',
      });
    }
  };

  const handleToggleCurrentTeamMember = async (bdeName: string, isCurrentTeamMember: boolean, branch: string, teamName?: string) => {
    try {
      // Update the specific team - backend handles atomic update of other teams
      await api.updateUserStatus(bdeName, branch, undefined, isCurrentTeamMember, teamName);

      // Refetch data to ensure consistency
      const [salesData, usersData] = await Promise.all([
        api.getMasterData(),
        api.getUsers(),
      ]);
      setSalesRecords(salesData);
      setUsers(usersData);

      toast({
        title: 'Success',
        description: `${bdeName} has been ${isCurrentTeamMember ? 'added to' : 'removed from'} the current team.`,
      });

      // Notify other components (like Dashboard) to refresh their data
      window.dispatchEvent(new CustomEvent('teamMembershipChanged'));
    } catch (error) {
      console.error('Failed to update team membership:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not update the team membership. Please try again.',
      });
    }
  };

  const handleToggleTeamLeaderInactive = async (teamLeaderName: string, inactive: boolean, branch: string) => {
    try {
      await api.updateUserStatus(teamLeaderName, branch, inactive);
      
      setUsers(prevUsers => 
        prevUsers.map(u => 
          (u.name === teamLeaderName && u.branch === branch) ? { ...u, inactive } : u
        )
      );

      toast({
        title: 'Success',
        description: `Team leader ${teamLeaderName} has been marked as ${inactive ? 'inactive' : 'active'}.`,
      });
    } catch (error) {
      console.error('Failed to update team leader status:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not update the team leader\'s status. Please try again.',
      });
    }
  };

  const handleUpdateTeamName = async (teamLeader: string, newTeamName: string) => {
    try {
      await api.updateTeamName(teamLeader, newTeamName, selectedBranch);
      setSalesRecords(prevRecords => {
        return prevRecords.map(record => {
          if (record.teamLeader === teamLeader && record.branch === selectedBranch) {
            return { ...record, teamName: newTeamName };
          }
          return record;
        });
      });
      toast({
        title: 'Success',
        description: `Team name updated to "${newTeamName}".`,
      });
      setNamingTeam(null);
      setNewTeamName('');
    } catch (error) {
      console.error('Failed to update team name:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not update the team name. Please try again.',
      });
    }
  };

  const handleCreateUser = async (name: string, email: string, password: string, role: string, branch: string) => {
    setIsCreatingUser(true);
    try {
      await api.createUser(name, email, password, role, branch, true);
      toast({
        title: 'Success',
        description: `User "${name}" has been created successfully.`,
      });
      setCreatingUser(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('');
      setNewUserBranch('');
    } catch (error) {
      console.error('Failed to create user:', error);
      toast({
        variant: 'destructive',
        title: 'Creation Failed',
        description: 'Could not create the user. Please try again.',
      });
    } finally {
      setIsCreatingUser(false);
    }
  };

  if (salesRecords.length === 0) {
    return (
      <DashboardLayout>
        <Header
          title="Manage Teams"
          subtitle="No sales data found"
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          liveRecords={salesRecords}
          onBdeSelect={handleBdeSelect}
        />
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <h2 className="text-2xl font-semibold mb-2">No Data to Manage</h2>
          <p className="text-muted-foreground mb-4">
            Upload sales records to begin managing your teams.
          </p>
          <a href="/admin/upload" className="text-blue-500 hover:underline">
            Go to Upload Page
          </a>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Header
        title="Manage Teams"
        subtitle="View and reassign BDEs across teams"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        liveRecords={salesRecords}
        onBdeSelect={handleBdeSelect}
      />

       <div className="px-4 py-6 md:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex justify-between items-center">
              <div>
                <label htmlFor="branch-select" className="block text-sm font-medium text-muted-foreground mb-2">
                  Select Branch
                </label>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue placeholder="Select a branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map(branch => (
                      <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-4">
                <Button onClick={() => setCreatingUser(true)} variant="outline">
                  Create User
                </Button>
                <Button onClick={() => setCreatingDrive(true)} variant="outline">
                  Create Drive Range
                </Button>
                <Button onClick={() => window.location.href = '/admin/users'} variant="outline">
                  Edit Users
                </Button>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-inactive"
                    checked={showInactive}
                    onCheckedChange={setShowInactive}
                  />
                  <Label htmlFor="show-inactive">Show Inactive</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-non-current"
                    checked={showNonCurrentMembers}
                    onCheckedChange={setShowNonCurrentMembers}
                  />
                  <Label htmlFor="show-non-current">Show Non-Current Members</Label>
                </div>
              </div>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card"
          >
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Team Structure for {selectedBranch}</h3>
            </div>

            <div className="divide-y divide-border">
              {Object.entries(teamTree).map(([teamName, teamDetails]: [string, Team]) => {
                const isExpanded = expandedTeams.has(teamName);
                return (
                  <div key={teamName}>
                    <button
                      onClick={() => toggleTeam(teamName)}
                      className="w-full flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors"
                    >
                      <motion.div animate={{ rotate: isExpanded ? 90 : 0 }}><ChevronRight className="w-5 h-5" /></motion.div>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setNamingTeam({ teamLeader: teamName, currentName: teamName });
                          setNewTeamName(teamName);
                        }}
                        className="font-medium text-foreground hover:text-primary transition-colors cursor-pointer"
                      >
                        {teamName}
                      </span>
                      <p className="text-sm text-muted-foreground">{teamDetails.users.length} BDEs</p>
                      <div className="ml-auto" onClick={(e) => e.stopPropagation()}>
                        <Switch
                          checked={teamDetails.inactive}
                          onCheckedChange={(checked) => handleToggleTeamLeaderInactive(teamDetails.leader, checked, selectedBranch)}
                        />
                      </div>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="pl-16 pr-4 pb-4 space-y-2">
                            {/* Renamed variable to "bde" to avoid confusion with "User" interface, added defensive checks */}
                            {teamDetails.users && Array.isArray(teamDetails.users) && teamDetails.users.length > 0 ? (
                              teamDetails.users.map((bde) => (
                                <div
                                  key={bde.bdeName}
                                  className={`flex items-center gap-3 p-3 rounded-lg ${
                                    bde.isCurrentTeamMember 
                                      ? 'bg-muted/30' 
                                      : 'bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800'
                                  }`}
                                >
                                  <UserIcon className={`w-4 h-4 ${bde.isCurrentTeamMember ? 'text-secondary-foreground' : 'text-orange-600'}`} />
                                  <div className="flex-1">
                                    <p className={`text-sm font-medium ${bde.isCurrentTeamMember ? 'text-foreground' : 'text-orange-700 dark:text-orange-300'}`}>
                                      {bde.bdeName}
                                      {!bde.isCurrentTeamMember && <span className="ml-2 text-xs">(Former)</span>}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{bde.role}</p>
                                  </div>
                                  <div className="ml-auto flex items-center gap-2">
                                    <div className="flex flex-col items-center gap-1">
                                      <span className="text-xs text-muted-foreground">Active</span>
                                      <Switch
                                        checked={!bde.inactive}
                                        onCheckedChange={(checked) => handleToggleInactive(bde.bdeName, !checked, selectedBranch)}
                                      />
                                    </div>
                                    <div className="flex flex-col items-center gap-1">
                                      <span className="text-xs text-muted-foreground">Current</span>
                                      <Switch
                                        checked={bde.isCurrentTeamMember}
                                        onCheckedChange={(checked) => handleToggleCurrentTeamMember(bde.bdeName, checked, selectedBranch, teamName)}
                                      />
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setReassigningBDE({ bdeName: bde.bdeName, fromTeam: teamName, branch: selectedBranch })}
                                      className="group"
                                    >
                                      <ArrowRightLeft className="w-4 h-4 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
                                    </Button>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-sm text-muted-foreground italic px-3 py-2">No BDEs in this team.</div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
       </div>

      <AnimatePresence>
        {reassigningBDE && (
          <ReassignmentModal
            bde={reassigningBDE}
            onClose={() => setReassigningBDE(null)}
            onConfirm={handleReassign}
            teamTree={teamTree}
            salesRecords={salesRecords}
          />
        )}
        {creatingDrive && (
          <DriveRangeModal
            onClose={() => setCreatingDrive(false)}
            onConfirm={handleCreateDrive}
            isLoading={isCreatingDrive}
          />
        )}
        {namingTeam && (
          <TeamNameModal
            teamLeader={namingTeam.teamLeader}
            currentName={namingTeam.currentName}
            newName={newTeamName}
            onNameChange={setNewTeamName}
            onClose={() => {
              setNamingTeam(null);
              setNewTeamName('');
            }}
            onConfirm={handleUpdateTeamName}
          />
        )}
        {creatingUser && (
          <CreateUserModal
            onClose={() => setCreatingUser(false)}
            onConfirm={handleCreateUser}
            isLoading={isCreatingUser}
            name={newUserName}
            setName={setNewUserName}
            email={newUserEmail}
            setEmail={setNewUserEmail}
            password={newUserPassword}
            setPassword={setNewUserPassword}
            role={newUserRole}
            setRole={setNewUserRole}
            branch={newUserBranch}
            setBranch={setNewUserBranch}
          />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}

function ReassignmentModal({ bde, onClose, onConfirm, teamTree, salesRecords }: {
  bde: {bdeName: string, fromTeam: string, branch: string} | null,
  onClose: () => void,
  onConfirm: (bdeName: string, fromTeam: string, toTeam: string, month: string, branch: string) => void,
  teamTree: TeamTree,
  salesRecords: SalesRecord[]
}) {
  const [newTeam, setNewTeam] = useState('');
  const [month, setMonth] = useState('');
  if (!bde) return null;

  const availableTeams = Object.keys(teamTree).filter(t => t !== bde.fromTeam);
  const availableMonths = Array.from(new Set(salesRecords.filter(r => r.bdeName === bde.bdeName && r.branch === bde.branch).map(r => r.month)));

  return (
      <Dialog open={!!bde} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reassign BDE</DialogTitle>
          <DialogDescription>
            Reassign {bde.bdeName} from {bde.fromTeam} to a new team for a specific month.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="new-team" className="text-right">New Team</Label>
            <Select value={newTeam} onValueChange={setNewTeam}>
              <SelectTrigger className="col-span-3"><SelectValue placeholder="Select new team" /></SelectTrigger>
              <SelectContent>
                {availableTeams.map(teamName => (
                  <SelectItem key={teamName} value={teamName}>{teamName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="month" className="text-right">Month</Label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="col-span-3"><SelectValue placeholder="Select month" /></SelectTrigger>
              <SelectContent>
                {availableMonths.map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onConfirm(bde.bdeName, bde.fromTeam, newTeam, month, bde.branch)} disabled={!newTeam || !month}>
            Confirm Reassignment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DriveRangeModal({ onClose, onConfirm, isLoading }: {

  onClose: () => void,

  onConfirm: (name: string, startMonth: string, startYear: number, endMonth: string, endYear: number) => void,

  isLoading: boolean

}) {

  const [name, setName] = useState('');

  const [startMonth, setStartMonth] = useState('');

  const [startYear, setStartYear] = useState<number | null>(null);

  const [endMonth, setEndMonth] = useState('');

  const [endYear, setEndYear] = useState<number | null>(null);



  const currentYear = new Date().getFullYear();

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);



  return (

    <Dialog open onOpenChange={onClose}>

      <DialogContent className="sm:max-w-[500px]">

        <DialogHeader>

          <DialogTitle>Create Drive Range</DialogTitle>

          <DialogDescription>

            Create a new drive with date boundaries for filtering dashboard data. This will create the drive for all branches.

          </DialogDescription>

        </DialogHeader>

        <div className="grid gap-4 py-4">

          <div className="grid grid-cols-4 items-center gap-4">

            <Label htmlFor="drive-name" className="text-right">Name</Label>

            <Input

              id="drive-name"

              value={name}

              onChange={(e) => setName(e.target.value)}

              placeholder="e.g., Q3 Drive"

              className="col-span-3"

            />

          </div>

          <div className="grid grid-cols-4 items-center gap-4">

            <Label htmlFor="start-month" className="text-right">Start Month</Label>

            <Select value={startMonth} onValueChange={setStartMonth}>

              <SelectTrigger className="col-span-3"><SelectValue placeholder="Select start month" /></SelectTrigger>

              <SelectContent>

                {MONTHS.map(m => (

                  <SelectItem key={m} value={m}>{m}</SelectItem>

                ))}

              </SelectContent>

            </Select>

          </div>

          <div className="grid grid-cols-4 items-center gap-4">

            <Label htmlFor="start-year" className="text-right">Start Year</Label>

            <Select onValueChange={(value) => setStartYear(parseInt(value))}>

              <SelectTrigger className="col-span-3"><SelectValue placeholder="Select start year" /></SelectTrigger>

              <SelectContent>

                {years.map(y => (

                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>

                ))}

              </SelectContent>

            </Select>

          </div>

          <div className="grid grid-cols-4 items-center gap-4">

            <Label htmlFor="end-month" className="text-right">End Month</Label>

            <Select value={endMonth} onValueChange={setEndMonth}>

              <SelectTrigger className="col-span-3"><SelectValue placeholder="Select end month" /></SelectTrigger>

              <SelectContent>

                {MONTHS.map(m => (

                  <SelectItem key={m} value={m}>{m}</SelectItem>

                ))}

              </SelectContent>

            </Select>

          </div>

          <div className="grid grid-cols-4 items-center gap-4">

            <Label htmlFor="end-year" className="text-right">End Year</Label>

            <Select onValueChange={(value) => setEndYear(parseInt(value))}>

              <SelectTrigger className="col-span-3"><SelectValue placeholder="Select end year" /></SelectTrigger>

              <SelectContent>

                {years.map(y => (

                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>

                ))}

              </SelectContent>

            </Select>

          </div>

        </div>

        <DialogFooter>

          <Button variant="outline" onClick={onClose}>Cancel</Button>

          <Button onClick={() => onConfirm(name, startMonth, startYear as number, endMonth, endYear as number)} disabled={!name || !startMonth || !startYear || !endMonth || !endYear || isLoading}>

            {isLoading ? 'Creating...' : 'Create Drive'}

          </Button>

        </DialogFooter>

      </DialogContent>

    </Dialog>

  )

}

function TeamNameModal({ teamLeader, currentName, newName, onNameChange, onClose, onConfirm }: {
  teamLeader: string,
  currentName: string,
  newName: string,
  onNameChange: (name: string) => void,
  onClose: () => void,
  onConfirm: (teamLeader: string, newName: string) => void
}) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Name Team</DialogTitle>
          <DialogDescription>
            Enter a new name for the team led by {teamLeader}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="team-name" className="text-right">Team Name</Label>
            <Input
              id="team-name"
              value={newName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Enter team name"
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onConfirm(teamLeader, newName)} disabled={!newName.trim()}>
            Update Team Name
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CreateUserModal({ onClose, onConfirm, isLoading, name, setName, email, setEmail, password, setPassword, role, setRole, branch, setBranch }: {
  onClose: () => void,
  onConfirm: (name: string, email: string, password: string, role: string, branch: string) => void,
  isLoading: boolean,
  name: string,
  setName: (name: string) => void,
  email: string,
  setEmail: (email: string) => void,
  password: string,
  setPassword: (password: string) => void,
  role: string,
  setRole: (role: string) => void,
  branch: string,
  setBranch: (branch: string) => void
}) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create User</DialogTitle>
          <DialogDescription>
            Create a new user account with the specified details.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="user-name" className="text-right">Name</Label>
            <Input
              id="user-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter user name"
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="user-email" className="text-right">Email ID</Label>
            <Input
              id="user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="user-password" className="text-right">Password</Label>
            <Input
              id="user-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="user-role" className="text-right">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="col-span-3"><SelectValue placeholder="Select role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Vice President">Vice President</SelectItem>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="Operations">Operations</SelectItem>
                <SelectItem value="Deputy Branch Manager">Deputy Branch Manager</SelectItem>
                <SelectItem value="Team Leader">Team Leader</SelectItem>
                <SelectItem value="Business Development Executive">Business Development Executive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {role !== 'Vice President' && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="user-branch" className="text-right">Branch</Label>
              <Select value={branch} onValueChange={setBranch}>
                <SelectTrigger className="col-span-3"><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hyderabad Branch">Hyderabad Branch</SelectItem>
                  <SelectItem value="Mumbai Branch">Mumbai Branch</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {role === 'Vice President' && (
            <div className="text-sm text-muted-foreground italic">
              Vice President has access to all branches
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onConfirm(name, email, password, role, role === 'Vice President' ? 'All' : branch)} disabled={!name || !email || !password || !role || (role !== 'Vice President' && !branch) || isLoading}>
            {isLoading ? 'Creating...' : 'Create User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
