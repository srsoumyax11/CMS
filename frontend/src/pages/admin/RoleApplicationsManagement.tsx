import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { RoleApplicationsQueueWidget } from '@/components/admin/RoleApplicationsQueueWidget';
import { UserCheck } from 'lucide-react';

export function RoleApplicationsManagement() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <PageHeader
        title="Role Applications"
        description="Review and verify incoming role requests from unassigned users (students, parents, faculty, staff)."
        icon={UserCheck}
      />
      <RoleApplicationsQueueWidget />
    </div>
  );
}

export default RoleApplicationsManagement;
