import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { StudentManagement } from './StudentManagement';
import { FacultyManagement } from './FacultyManagement';
import { AllUsersManagement } from './AllUsersManagement';
import { Users, GraduationCap, Briefcase, ShieldCheck } from 'lucide-react';

export function UserDirectory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'all';
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['all', 'students', 'faculty'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    setSearchParams({ tab: val }, { replace: true });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="User & Identity Directory"
        description="Unified management portal for student profiles, teaching faculty, administrative staff, and platform user accounts across CampusOne."
      />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-6">
        <TabsList className="bg-muted/70 p-1 flex flex-wrap h-auto">
          <TabsTrigger value="all" className="gap-2 text-xs font-medium py-2 px-3">
            <Users className="h-4 w-4" />
            All Accounts
          </TabsTrigger>

          <TabsTrigger value="students" className="gap-2 text-xs font-medium py-2 px-3">
            <GraduationCap className="h-4 w-4" />
            Students Directory
          </TabsTrigger>

          <TabsTrigger value="faculty" className="gap-2 text-xs font-medium py-2 px-3">
            <Briefcase className="h-4 w-4" />
            Faculty & Staff Directory
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-0 focus-visible:outline-none">
          <AllUsersManagement />
        </TabsContent>

        <TabsContent value="students" className="mt-0 focus-visible:outline-none">
          <StudentManagement />
        </TabsContent>

        <TabsContent value="faculty" className="mt-0 focus-visible:outline-none">
          <FacultyManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default UserDirectory;
