import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { placementsApi } from '@/api/placementsApi';
import { useAuth } from '@/context/AuthContext';
import type { PlacementNoticeResponse, PlacementApplicationResponse } from '@/types/api';
import { PlacementCreateModal } from './PlacementCreateModal';
import { PlacementDetailModal } from './PlacementDetailModal';
import { PlacementApplicantsModal } from './PlacementApplicantsModal';
import {
  Briefcase,
  Plus,
  Search,
  Building2,
  DollarSign,
  Calendar,
  CheckCircle2,
  XCircle,
  Users,
  ExternalLink,
  Sparkles,
  Edit,
} from 'lucide-react';

export function PlacementList() {
  const { user, hasPermission } = useAuth();
  const isTPO = hasPermission('placement:manage') || user?.user_type === 'admin' || user?.user_type === 'staff';
  const isStudent = user?.user_type === 'student';

  const [activeTab, setActiveTab] = useState<'all' | 'published' | 'mine'>('published');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editNotice, setEditNotice] = useState<PlacementNoticeResponse | null>(null);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<PlacementNoticeResponse | null>(null);

  const [applicantsModalOpen, setApplicantsModalOpen] = useState(false);

  // Fetch notices
  const { data: noticesData, isLoading, refetch } = useQuery({
    queryKey: ['placement-notices', isTPO],
    queryFn: async () => {
      const res = await placementsApi.listNotices(!isTPO);
      return res.data.data;
    },
  });

  // Fetch my applications (if student)
  const { data: myAppsData } = useQuery({
    queryKey: ['my-placement-applications'],
    queryFn: async () => {
      const res = await placementsApi.getMyApplications();
      return res.data.data;
    },
    enabled: isStudent,
  });

  const notices = noticesData?.items || [];
  const myApplications = myAppsData?.items || [];

  const getMyApplicationForNotice = (noticeId: string): PlacementApplicationResponse | undefined => {
    return myApplications.find((app) => app.notice_id === noticeId);
  };

  const filteredNotices = notices.filter((notice) => {
    if (activeTab === 'published' && notice.status !== 'PUBLISHED') return false;
    if (activeTab === 'mine') {
      const hasApplied = myApplications.some((app) => app.notice_id === notice.id);
      if (!hasApplied) return false;
    }
    if (
      searchTerm &&
      !notice.company.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !notice.title.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Campus Placement Drives"
        description="Browse active corporate recruitment drives, verify profile eligibility, and submit job applications."
        icon={Briefcase}
        actions={
          isTPO ? (
            <Button
              onClick={() => {
                setEditNotice(null);
                setCreateModalOpen(true);
              }}
              className="gap-1.5 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              Post New Placement Drive
            </Button>
          ) : undefined
        }
      />

      {/* Filter Tabs & Search Bar */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === 'published' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('published')}
            className="text-xs font-semibold"
          >
            Active Drives ({notices.filter((n) => n.status === 'PUBLISHED').length})
          </Button>

          {isTPO && (
            <Button
              variant={activeTab === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('all')}
              className="text-xs font-semibold"
            >
              All Drives ({notices.length})
            </Button>
          )}

          {isStudent && (
            <Button
              variant={activeTab === 'mine' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('mine')}
              className="text-xs font-semibold"
            >
              My Applications ({myApplications.length})
            </Button>
          )}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-2.5" />
          <Input
            type="text"
            placeholder="Search by company or job title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Grid of Placement Drive Cards */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-muted-foreground">
          Loading placement drives...
        </div>
      ) : filteredNotices.length === 0 ? (
        <Card className="border border-border">
          <CardContent className="p-12 text-center text-muted-foreground text-sm">
            No placement drives match your filter right now.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredNotices.map((notice) => {
            const myApp = getMyApplicationForNotice(notice.id);
            const studentProfile = user?.student_profile;

            // Simple eligibility preview calculation
            const cgpaPass = !notice.min_cgpa || (studentProfile?.cgpa != null && studentProfile.cgpa >= notice.min_cgpa);
            const isEligible = cgpaPass;

            return (
              <Card
                key={notice.id}
                className="border border-border shadow-2xs hover:border-primary/40 transition flex flex-col justify-between"
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <Badge variant="secondary" className="text-[10px] font-bold">
                      {notice.job_type || 'Full-time'}
                    </Badge>
                    <Badge
                      variant={notice.status === 'PUBLISHED' ? 'outline' : 'destructive'}
                      className="text-[10px] uppercase tracking-wider"
                    >
                      {notice.status}
                    </Badge>
                  </div>

                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary shrink-0" />
                    {notice.company}
                  </CardTitle>
                  <CardDescription className="text-xs font-semibold text-foreground/90 line-clamp-1">
                    {notice.title}
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-4 pt-1 space-y-3 flex-1 text-xs">
                  <div className="grid grid-cols-2 gap-2 p-2.5 bg-muted/40 rounded-lg border">
                    <div>
                      <span className="text-[10px] text-muted-foreground">Package (CTC)</span>
                      <p className="font-bold text-foreground text-xs mt-0.5">
                        {notice.package_text || 'As per norms'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] text-muted-foreground">Min CGPA</span>
                      <p className="font-bold text-foreground text-xs mt-0.5">
                        {notice.min_cgpa ? `${notice.min_cgpa} Cutoff` : 'No Cutoff'}
                      </p>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-rose-500" /> Deadline:{' '}
                      {notice.last_date ? new Date(notice.last_date).toLocaleDateString() : 'Open'}
                    </span>

                    {isStudent && (
                      isEligible ? (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                          <CheckCircle2 className="h-3 w-3" /> Eligible
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-destructive font-semibold">
                          <XCircle className="h-3 w-3" /> Ineligible
                        </span>
                      )
                    )}
                  </div>

                  {/* Applied status pill */}
                  {myApp && (
                    <div className="p-2 rounded-lg bg-accent/40 text-center font-semibold text-[11px] text-primary flex items-center justify-center gap-1.5">
                      <Sparkles className="h-3 w-3" /> Applied ({myApp.status.toUpperCase()})
                    </div>
                  )}
                </CardContent>

                <CardFooter className="p-4 pt-0 flex items-center justify-between gap-2 border-t mt-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      setSelectedNotice(notice);
                      setDetailModalOpen(true);
                    }}
                    className="flex-1 text-xs h-8 gap-1.5"
                  >
                    View & Apply
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>

                  {isTPO && (
                    <>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setSelectedNotice(notice);
                          setApplicantsModalOpen(true);
                        }}
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        title="View Candidates Roster"
                      >
                        <Users className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setEditNotice(notice);
                          setCreateModalOpen(true);
                        }}
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        title="Edit Drive Notice"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <PlacementCreateModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        noticeToEdit={editNotice}
      />

      {/* Detail & Apply Modal */}
      <PlacementDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        notice={selectedNotice}
        existingApplication={selectedNotice ? getMyApplicationForNotice(selectedNotice.id) : null}
      />

      {/* Applicants Roster Modal */}
      <PlacementApplicantsModal
        open={applicantsModalOpen}
        onOpenChange={setApplicantsModalOpen}
        notice={selectedNotice}
      />
    </div>
  );
}

export default PlacementList;
