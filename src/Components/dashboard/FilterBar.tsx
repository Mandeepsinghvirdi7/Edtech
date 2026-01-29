import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Filter, Calendar, Building2, Briefcase } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface FilterBarProps {
  branches: string[];
  drives: string[];
  months: string[];
  selectedBranch: string;
  selectedDrive: string;
  selectedMonth: string;
  onBranchChange: (branch: string) => void;
  onDriveChange: (drive: string) => void;
  onMonthChange: (month: string) => void;
  onMyReportToggle?: () => void;
  isMyReportActive?: boolean;
}

export function FilterBar({
  branches,
  drives,
  months,
  selectedBranch,
  selectedDrive,
  selectedMonth,
  onBranchChange,
  onDriveChange,
  onMonthChange,
  onMyReportToggle,
  isMyReportActive = false,
}: FilterBarProps) {
  const { user } = useAuth();

  // Hide branch filter for DBM, Team Leader, and BDE roles
  const shouldShowBranchFilter = user?.role === 'Admin' || user?.role === 'Operations';
  
  // Show My Report button for DBM and Team Leader
  const shouldShowMyReport = user?.role === 'Deputy Branch Manager' || user?.role === 'Team Leader';

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4 mb-6"
    >
      <div className="flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Filters</span>
        </div>

        {/* Branch Filter - Only show for Admin and Operations */}
        {shouldShowBranchFilter && (
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <select
              value={selectedBranch}
              onChange={(e) => onBranchChange(e.target.value)}
              className="input-field py-2 pr-8 text-sm min-w-[180px]"
            >
              <option value="">All Branches</option>
              {branches.map(branch => (
                <option key={branch} value={branch}>{branch}</option>
              ))}
            </select>
          </div>
        )}

        {/* Drive Filter */}
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-muted-foreground" />
          <select
            value={selectedDrive}
            onChange={(e) => onDriveChange(e.target.value)}
            className="input-field py-2 pr-8 text-sm min-w-[150px]"
          >
            <option value="">
              {drives.length === 0 ? 'No drives available' : 'All Drives'}
            </option>
            {drives.map(drive => (
              <option key={drive} value={drive}>{drive}</option>
            ))}
          </select>
        </div>

        {/* Month Filter */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <select
            value={selectedMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            className="input-field py-2 pr-8 text-sm min-w-[140px]"
          >
            <option value="">All Months</option>
            {months.map(month => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>
        </div>

        {/* My Report Button - Only for DBM and Team Leader */}
        {shouldShowMyReport && onMyReportToggle && (
          <button
            onClick={onMyReportToggle}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              isMyReportActive 
                ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {isMyReportActive ? 'My Team' : 'My Report'}
          </button>
        )}

        {/* Clear Filters */}
        {(selectedBranch || selectedDrive || selectedMonth) && (
          <button
            onClick={() => {
              onBranchChange('');
              onDriveChange('');
              onMonthChange('');
            }}
            className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
          >
            Clear All
          </button>
        )}
      </div>
    </motion.div>
  );
}
