import { User, SalesRecord } from '@/types';

/**
 * SHARED UTILITIES FOR DASHBOARD
 * 
 * Centralized functions for:
 * - Achievement calculations
 * - Role-based access checks
 * - Data filtering
 */

/**
 * Calculate achievement percentage consistently across all components
 * Achievement % = (Total Closed Points / Total Target) * 100
 */
export const calculateAchievement = (closedPoints: number, target: number): number => {
  if (target <= 0) return 0;
  return Math.round((closedPoints / target) * 100);
};

/**
 * Role-based access control for performance charts and details
 * Returns true if user can view chart/details for the specified BDE
 */
export const canUserViewBDEChart = (
  user: User | null,
  bdeName: string,
  bdeRecord: SalesRecord | undefined
): boolean => {
  if (!user) return false;

  // Admin, VP, Operations have full access
  if (user.role === 'Admin' || user.role === 'Operations') {
    return true;
  }

  // BDE cannot view individual charts
  if (user.role === 'Business Development Executive') {
    return false;
  }

  // Team Leader cannot view individual charts
  if (user.role === 'Team Leader') {
    return false;
  }

  // DBM can only view charts for BDEs in their branch
  if (user.role === 'Deputy Branch Manager') {
    if (!bdeRecord) return false;
    return user.branches.includes(bdeRecord.branch);
  }

  return false;
};

/**
 * Check if user can click "See More" button for a BDE
 * Returns true if user should see and be able to click the See More button
 */
export const canUserSeeMore = (user: User | null, role?: string): boolean => {
  if (!user) return false;

  // BDE and Team Leader cannot see the "See more" button
  if (user.role === 'Business Development Executive' || user.role === 'Team Leader') {
    return false;
  }

  // DBM, Admin, VP, Operations can see it
  return true;
};

/**
 * Check if user can click on BDE name/row in Overall Performance table
 * Returns true if user can click
 */
export const canUserClickBDEName = (
  user: User | null,
  bdeName: string,
  bdeRecord: SalesRecord | undefined
): boolean => {
  if (!user) return false;

  // BDE and Team Leader cannot click
  if (user.role === 'Business Development Executive' || user.role === 'Team Leader') {
    return false;
  }

  // DBM can only click BDEs from their branch
  if (user.role === 'Deputy Branch Manager') {
    if (!bdeRecord) return false;
    return user.branches.includes(bdeRecord.branch);
  }

  // Admin, VP, Operations can click any BDE
  return true;
};

/**
 * Filter records based on user role
 * Used for fetching data that respects user's branch/team boundaries
 */
export const filterRecordsByUserRole = (records: SalesRecord[], user: User | null): SalesRecord[] => {
  if (!user) return records;

  switch (user.role) {
    case 'Admin':
    case 'Operations':
      // Full access to all records
      return records;

    case 'Deputy Branch Manager':
      // Only records from their branch(es)
      return records.filter(record => user.branches.includes(record.branch));

    case 'Team Leader':
      // Records where TL is the team leader AND BDE is active and current team member, OR the TL's own performance data
      return records.filter(record => 
        (record.teamLeader === user.name && !record.inactive && record.isCurrentTeamMember) || 
        record.bdeName === user.name
      );

    case 'Business Development Executive':
      // Only their own records
      return records.filter(record => record.bdeName === user.name);

    default:
      return records;
  }
};

/**
 * Check if table should be read-only for a user
 * Read-only means no clicking on BDE names or "See more" button
 */
export const isTableReadOnlyForUser = (user: User | null): boolean => {
  if (!user) return true;
  
  // BDE and Team Leader have read-only table
  return user.role === 'Business Development Executive' || user.role === 'Team Leader';
};

/**
 * Get visible columns for Top Achievers table based on user role
 * Some roles should not see numerical values
 */
export const shouldShowTopAchieversValues = (user: User | null): boolean => {
  if (!user) return false;

  // Only VP, Admin, Operations can see numerical values
  return user.role === 'Admin' || user.role === 'Operations' || user.role === 'VP';
};
