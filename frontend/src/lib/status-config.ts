export const STATUS_BADGE_CONFIG = {
  account: {
    pending: { label: 'Pending', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20' },
    revision: { label: 'Revision', className: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20' },
    active: { label: 'Active', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' },
    suspended: { label: 'Suspended', className: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20' },
    rejected: { label: 'Rejected', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  },
  academic: {
    enrolled: { label: 'Enrolled', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' },
    graduated: { label: 'Graduated', className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20' },
    dropped: { label: 'Dropped', className: 'bg-muted text-muted-foreground border-border' },
    expelled: { label: 'Expelled', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  },
  employment: {
    active: { label: 'Active', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' },
    on_leave: { label: 'On Leave', className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20' },
    resigned: { label: 'Resigned', className: 'bg-muted text-muted-foreground border-border' },
    retired: { label: 'Retired', className: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20' },
    terminated: { label: 'Terminated', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  },
  complaint: {
    open: { label: 'Open', className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20' },
    in_progress: { label: 'In Progress', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20' },
    resolved: { label: 'Resolved', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' },
    closed: { label: 'Closed', className: 'bg-muted text-muted-foreground border-border' },
    cancelled: { label: 'Cancelled', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  },
  outpass: {
    pending: { label: 'Pending', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20' },
    approved: { label: 'Approved', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' },
    active: { label: 'Active', className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20' },
    overdue: { label: 'Overdue', className: 'bg-destructive/10 text-destructive border-destructive/30 font-bold animate-pulse' },
    completed: { label: 'Completed', className: 'bg-muted text-muted-foreground border-border' },
    rejected: { label: 'Rejected', className: 'bg-destructive/10 text-destructive border-destructive/20' },
    cancelled: { label: 'Cancelled', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  }
} as const;

export type StatusConfigType = keyof typeof STATUS_BADGE_CONFIG;
