export const STATUS_BADGE_CONFIG = {
  account: {
    pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700 border-amber-200' },
    revision: { label: 'Revision', className: 'bg-purple-100 text-purple-700 border-purple-200' },
    active: { label: 'Active', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    suspended: { label: 'Suspended', className: 'bg-orange-100 text-orange-700 border-orange-200' },
    rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700 border-red-200' },
  },
  academic: {
    enrolled: { label: 'Enrolled', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    graduated: { label: 'Graduated', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    dropped: { label: 'Dropped', className: 'bg-gray-100 text-gray-700 border-gray-200' },
    expelled: { label: 'Expelled', className: 'bg-red-100 text-red-700 border-red-200' },
  },
  employment: {
    active: { label: 'Active', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    on_leave: { label: 'On Leave', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    resigned: { label: 'Resigned', className: 'bg-gray-100 text-gray-700 border-gray-200' },
    retired: { label: 'Retired', className: 'bg-purple-100 text-purple-700 border-purple-200' },
    terminated: { label: 'Terminated', className: 'bg-red-100 text-red-700 border-red-200' },
  },
  complaint: {
    open: { label: 'Open', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    in_progress: { label: 'In Progress', className: 'bg-amber-100 text-amber-700 border-amber-200' },
    resolved: { label: 'Resolved', className: 'bg-green-100 text-green-700 border-green-200' },
    closed: { label: 'Closed', className: 'bg-gray-100 text-gray-600 border-gray-200' },
    cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700 border-red-200' },
  },
  outpass: {
    pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700 border-amber-200' },
    approved: { label: 'Approved', className: 'bg-green-100 text-green-700 border-green-200' },
    active: { label: 'Active', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    completed: { label: 'Completed', className: 'bg-gray-100 text-gray-600 border-gray-200' },
    rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700 border-red-200' },
    cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700 border-red-200' },
  }
} as const;

export type StatusConfigType = keyof typeof STATUS_BADGE_CONFIG;
