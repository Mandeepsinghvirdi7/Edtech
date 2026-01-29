export interface User {
  id: string;
  username: string;
  name?: string;
  role: string;
  branch?: string;
  branches: string[];
  inactive?: boolean;
  isCurrentTeamMember?: boolean;
}

export interface BackendLoginResponse {
  ok: boolean;
  branches?: string[];
  message?: string;
}

// Backend data structures
export interface BDEData {
  months: string[];
  target: number[];
  admissions: number[];
  closed: number[];
  achieve: number[];
  overallTarget?: number;
  overallAdmissions?: number;
  overallClosed?: number;
  overallAchieve?: number;
}

export interface TeamSummary {
  months: string[];
  target: number[];
  admissions: number[];
  closed: number[];
  achievement: number[];
  overallTarget?: number;
  overallAdmissions?: number;
  overallClosed?: number;
  overallAchievement?: number;
}

export interface BDEOverall {
  names: string[];
  target: number[];
  admissions: number[];
  closed: number[];
  achievement: number[];
}

export interface TeamData {
  teamSummary: TeamSummary;
  bdeOverall: BDEOverall;
  bdeMonthly: Record<string, BDEData>;
  overallTarget: number;
  overallAdmissions: number;
  overallClosed: number;
  overallAchievement: number;
}

export interface DriveData {
  type: 'team-based' | 'bde-based';
  overall: TeamSummary;
  teams?: Record<string, TeamData>;
  bdes?: Record<string, BDEData>;
}

export interface BranchData {
  drives: Record<string, DriveData>;
}

export interface MasterData {
  [branchName: string]: BranchData;
}

// Team structure from backend
export interface TeamMember {
  DBM: string;
  leader: string;
  members: string[];
}

export interface TeamsData {
  teams: Record<string, Record<string, TeamMember>>;
  designations: Record<string, string>;
}

// Frontend-compatible interfaces
/**
 * SALES RECORD - Complete Data Model
 * 
 * This interface represents a complete sales record with ALL required fields
 * persisted from the uploaded file. Every field comes directly from the upload
 * and is guaranteed to exist (with defaults of 0 for numeric fields).
 * 
 * Fields are organized by type:
 * - Organization/IDs: fy, month, branch, drive
 * - People: dbm, teamLeader, teamName, bdeName  
 * - Metrics: target, admissions, points, closedAdm, cancellation, incomplete, closedPoints, targetPct
 * - Calculated: achievementPct = (closedPoints / target) * 100
 */
export interface SalesRecord {
  id: string;
  
  // Organization & Period
  fy: string;               // Fiscal Year (e.g., "2025")
  month: string;            // Normalized month name (APRIL-MARCH)
  branch: string;           // Branch name
  drive: string;            // Drive/Program name

  // People Hierarchy
  dbm: string;              // Deputy Branch Manager
  teamLeader: string;       // Team Lead name
  teamName: string;         // Team name (usually same as teamLeader)
  bdeName: string;          // Business Development Executive

  // PERSISTED METRICS - Exactly as uploaded  
  // All numeric fields default to 0 if not provided
  target: number;           // Sales target
  admissions: number;       // Total admissions
  points: number;           // Points earned
  closedAdm: number;        // Closed/finalized admissions
  cancellation: number;     // Cancellations or backouts
  incomplete: number;       // Incomplete form submissions
  closedPoints: number;     // Points on closed admissions
  targetPct: number;        // Target achievement percentage (%)

  // Calculated Fields
  achievementPct: number;   // Calculated: (closedPoints / target) * 100
  
  // Metadata
  inactive?: boolean;       // User inactive status
  isCurrentTeamMember?: boolean;  // Current team membership
  role?: string;            // User role
  uploadedAt?: string;      // ISO timestamp of upload
}

export interface FrontendTeamData {
  dbm: string;
  teamLeader: string;
  teamName: string;
  totalTarget: number;
  totalAdmissions: number;
  totalClosedPoints: number;
  avgAchievement: number;
  bdeCount: number;
  records: SalesRecord[];
}

export interface KPIData {
  label: string;
  value: number;
  change: number;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: string;
}

export interface ChartDataPoint {
  label: string;
  target: number;
  admissions: number;
  closedPoints: number;
  achievement: number;
}
