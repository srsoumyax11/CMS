import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import {
  documentsApi,
  type DocumentTypeData,
  type DocumentRequestData,
  type DocumentRequestStatus,
} from '@/api/documentsApi';
import { QUERY_KEYS } from '@/lib/constants';
import { getErrorMessage } from '@/lib/error-utils';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { ProTable, type ProColumn, type TableFilterDef } from '@/components/shared/pro-table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  FileText,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  ShieldCheck,
  QrCode,
  Loader2,
  FileCheck,
  HelpCircle,
  FileSpreadsheet,
  IndianRupee,
  Layers,
  ArrowRight,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

export function DocumentManagement() {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const isStudent = user?.user_type === 'student' || user?.user_type === 'user' || user?.target_role === 'student';
  const isAdmin = user?.user_type === 'admin';
  const isFaculty = user?.user_type === 'faculty';
  const isStaff = user?.user_type === 'staff';

  const canApply = isStudent || isAdmin || hasPermission('document:apply');
  const canApprove = isAdmin || isStaff || isFaculty || hasPermission('document:approve');

  const visibleTabs = useMemo(() => {
    const tabs: Array<{ id: string; label: string; icon: any }> = [];
    if (canApply) {
      tabs.push({ id: 'apply', label: 'Apply for Document', icon: Send });
      tabs.push({ id: 'my-requests', label: 'My Applications', icon: FileText });
    }
    if (canApprove) {
      tabs.push({ id: 'review-desk', label: 'Approvals Review Desk', icon: FileCheck });
    }
    return tabs;
  }, [canApply, canApprove]);

  const defaultTab = visibleTabs.length > 0 ? visibleTabs[0].id : 'apply';
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Application Modal State
  const [selectedType, setSelectedType] = useState<DocumentTypeData | null>(null);
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});

  // Review Modal State
  const [selectedRequest, setSelectedRequest] = useState<DocumentRequestData | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewDecision, setReviewDecision] = useState<'APPROVED' | 'REJECTED' | 'REVISION'>('APPROVED');
  const [reviewNote, setReviewNote] = useState('');
  const [issuedFileUrl, setIssuedFileUrl] = useState('');

  // Timeline / Detail Modal State
  const [detailRequest, setDetailRequest] = useState<DocumentRequestData | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // 1. Queries
  const { data: typesRes, isLoading: loadingTypes } = useQuery({
    queryKey: [QUERY_KEYS.DOCUMENT_TYPES],
    queryFn: () => documentsApi.listTypes(true),
  });

  const documentTypes = Array.isArray(typesRes?.data?.items) ? typesRes.data.items : [];

  const { data: myReqsRes, isLoading: loadingMyReqs } = useQuery({
    queryKey: [QUERY_KEYS.DOCUMENT_REQUESTS, 'mine'],
    queryFn: () => documentsApi.getMyRequests(),
    enabled: canApply,
  });

  const myRequests = Array.isArray(myReqsRes?.data?.items) ? myReqsRes.data.items : [];

  const { data: allReqsRes, isLoading: loadingAllReqs } = useQuery({
    queryKey: [QUERY_KEYS.DOCUMENT_REQUESTS, 'all'],
    queryFn: () => documentsApi.listAllRequests(),
    enabled: canApprove,
  });

  const allRequests = Array.isArray(allReqsRes?.data?.items) ? allReqsRes.data.items : [];

  const pendingReviewCount = useMemo(
    () => allRequests.filter((r) => r.status === 'SUBMITTED' || r.status === 'IN_REVIEW').length,
    [allRequests]
  );

  // 2. Mutations
  const applyMutation = useMutation({
    mutationFn: (payload: { type_id: string; form_data?: Record<string, any> }) =>
      documentsApi.apply(payload),
    onSuccess: () => {
      toast.success('Document application submitted successfully!');
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DOCUMENT_REQUESTS] });
      setIsApplyOpen(false);
      setSelectedType(null);
      setFormData({});
      setActiveTab('my-requests');
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err, 'Failed to submit document application'));
    },
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      documentsApi.review(id, payload),
    onSuccess: () => {
      toast.success('Approval decision recorded successfully!');
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DOCUMENT_REQUESTS] });
      setIsReviewOpen(false);
      setSelectedRequest(null);
      setReviewNote('');
      setIssuedFileUrl('');
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err, 'Failed to submit approval review'));
    },
  });

  const handleOpenApply = (dt: DocumentTypeData) => {
    setSelectedType(dt);
    const initialForm: Record<string, any> = {};
    if (dt.fields_schema) {
      Object.keys(dt.fields_schema).forEach((k) => {
        initialForm[k] = '';
      });
    }
    setFormData(initialForm);
    setIsApplyOpen(true);
  };

  const handleFormChange = (key: string, val: any) => {
    setFormData((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmitApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) return;
    applyMutation.mutate({
      type_id: selectedType.id,
      form_data: formData,
    });
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    reviewMutation.mutate({
      id: selectedRequest.id,
      payload: {
        decision: reviewDecision,
        note: reviewNote.trim() || undefined,
        issued_file_url: issuedFileUrl.trim() || undefined,
      },
    });
  };

  const getStatusBadge = (status: DocumentRequestStatus) => {
    switch (status) {
      case 'ISSUED':
        return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-bold">ISSUED</Badge>;
      case 'APPROVED':
        return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-semibold">APPROVED</Badge>;
      case 'IN_REVIEW':
        return <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 font-semibold">IN REVIEW</Badge>;
      case 'NEEDS_REVISION':
        return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-semibold">NEEDS REVISION</Badge>;
      case 'REJECTED':
        return <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 font-semibold">REJECTED</Badge>;
      default:
        return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-semibold">SUBMITTED</Badge>;
    }
  };

  // ProTable Columns for My Requests
  const myColumns: ProColumn<DocumentRequestData>[] = [
    {
      id: 'document_type_name',
      header: 'Document Type',
      cell: (_, row) => (
        <div className="flex items-center gap-2.5 py-1">
          <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-foreground text-sm block">{row.document_type_name || 'Document'}</span>
            <span className="font-mono text-[10px] text-muted-foreground uppercase">{row.document_type_code || 'DOC'}</span>
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      id: 'status',
      header: 'Status & Step',
      cell: (_, row) => (
        <div className="space-y-1">
          {getStatusBadge(row.status)}
          <p className="text-[11px] text-muted-foreground">Step {row.current_step}</p>
        </div>
      ),
    },
    {
      id: 'verify_code',
      header: 'Verification Code',
      cell: (val) =>
        val ? (
          <code className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-muted border border-border text-foreground">
            {String(val)}
          </code>
        ) : (
          <span className="text-xs text-muted-foreground italic">Pending Approval</span>
        ),
    },
    {
      id: 'created_at',
      header: 'Applied Date',
      accessorKey: 'created_at',
      cell: (val) => (val ? new Date(String(val)).toLocaleDateString() : 'N/A'),
      sortable: true,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (_, row) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1"
            onClick={() => {
              setDetailRequest(row);
              setIsDetailOpen(true);
            }}
          >
            <Eye className="w-3.5 h-3.5" /> View Details
          </Button>
          {row.issued_file_url && (
            <Button
              size="sm"
              variant="default"
              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
              onClick={() => window.open(row.issued_file_url, '_blank')}
            >
              <ExternalLink className="w-3.5 h-3.5" /> Download
            </Button>
          )}
        </div>
      ),
    },
  ];

  // ProTable Columns for Approver Review Desk
  const reviewColumns: ProColumn<DocumentRequestData>[] = [
    {
      id: 'student',
      header: 'Student & Roll Number',
      cell: (_, row) => (
        <div className="flex items-center gap-2.5 py-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs border border-primary/20">
            {(row.student_name || 'S').charAt(0).toUpperCase()}
          </div>
          <div>
            <span className="font-semibold text-foreground text-sm block">{row.student_name || 'Student'}</span>
            <p className="text-xs text-muted-foreground font-mono">{row.roll_number || row.student_email}</p>
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      id: 'document_type_name',
      header: 'Requested Document',
      cell: (_, row) => (
        <div>
          <span className="font-bold text-foreground text-sm block">{row.document_type_name}</span>
          <span className="text-xs text-muted-foreground">Step {row.current_step}</span>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Current Status',
      accessorKey: 'status',
      cell: (val) => getStatusBadge(val as DocumentRequestStatus),
      sortable: true,
    },
    {
      id: 'created_at',
      header: 'Request Date',
      accessorKey: 'created_at',
      cell: (val) => (val ? new Date(String(val)).toLocaleDateString() : 'N/A'),
      sortable: true,
    },
    {
      id: 'actions',
      header: 'Review Action',
      cell: (_, row) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs text-primary border-primary/30 hover:bg-primary/10 gap-1"
            onClick={() => {
              setSelectedRequest(row);
              setReviewDecision('APPROVED');
              setReviewNote('');
              setIssuedFileUrl(row.issued_file_url || '');
              setIsReviewOpen(true);
            }}
          >
            <FileCheck className="w-3.5 h-3.5" /> Review Application
          </Button>
        </div>
      ),
    },
  ];

  const tableFilters: TableFilterDef<DocumentRequestData>[] = [
    {
      id: 'status',
      label: 'Status',
      defaultValue: '',
      options: [
        { label: 'All Statuses', value: '' },
        { label: 'Submitted', value: 'SUBMITTED' },
        { label: 'In Review', value: 'IN_REVIEW' },
        { label: 'Needs Revision', value: 'NEEDS_REVISION' },
        { label: 'Issued', value: 'ISSUED' },
        { label: 'Rejected', value: 'REJECTED' },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Official Document Portal"
        description="Apply for official university certificates, track approval steps, and verify issued documents."
      />

      {visibleTabs.length === 0 ? (
        <Card className="shadow-sm border border-dashed p-8 text-center">
          <ShieldCheck className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-base font-bold text-foreground">Access Restricted</h3>
          <p className="text-xs text-muted-foreground mt-1">
            You do not have permission to apply for or review official documents.
          </p>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList
            className={`grid w-full max-w-lg ${
              visibleTabs.length === 1
                ? 'grid-cols-1'
                : visibleTabs.length === 2
                ? 'grid-cols-2'
                : 'grid-cols-3'
            }`}
          >
            {visibleTabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="gap-2 text-xs">
                <tab.icon className="w-4 h-4" /> {tab.label}
                {tab.id === 'review-desk' && pendingReviewCount > 0 && (
                  <Badge className="ml-1 h-5 px-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] rounded-full">
                    {pendingReviewCount}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* TAB 1: APPLY FOR DOCUMENT */}
          <TabsContent value="apply" className="space-y-6">
            {loadingTypes ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : documentTypes.length === 0 ? (
              <Card className="shadow-sm p-8 text-center border-dashed">
                <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-bold text-foreground">No Document Types Available</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  There are currently no active document certificate templates configured.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {documentTypes.map((dt) => (
                  <Card key={dt.id} className="shadow-card border-border hover:border-primary/50 transition-all flex flex-col justify-between">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary font-bold text-sm">
                          <FileText className="w-5 h-5" />
                        </div>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {dt.fee > 0 ? `₹${dt.fee} Fee` : 'FREE'}
                        </Badge>
                      </div>
                      <CardTitle className="text-base font-bold text-foreground mt-3">
                        {dt.name}
                      </CardTitle>
                      <CardDescription className="text-xs line-clamp-2">
                        {dt.description || 'Official university certificate issued upon step approval.'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-4">
                      {dt.approval_steps && dt.approval_steps.length > 0 && (
                        <div className="p-2.5 rounded-lg bg-muted/50 border border-border text-xs space-y-1">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
                            Approval Chain ({dt.approval_steps.length} Steps)
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap font-mono text-[11px] font-bold text-foreground">
                            {dt.approval_steps.map((step, idx) => (
                              <span key={idx} className="flex items-center gap-1">
                                {idx > 0 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
                                <span className="bg-background px-1.5 py-0.5 rounded border border-border">{step}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <Button onClick={() => handleOpenApply(dt)} className="w-full gap-2">
                        <Send className="w-4 h-4" /> Apply for Document
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB 2: MY APPLICATIONS */}
          <TabsContent value="my-requests" className="space-y-6">
            <ProTable
              data={myRequests}
              columns={myColumns}
              filters={tableFilters}
              isLoading={loadingMyReqs}
              rowKey={(row) => row.id}
              searchPlaceholder="Search document applications..."
              emptyTitle="No Document Applications"
              emptyDescription="You have not submitted any document certificate requests yet."
            />
          </TabsContent>

          {/* TAB 3: APPROVALS REVIEW DESK */}
          <TabsContent value="review-desk" className="space-y-6">
            <ProTable
              data={allRequests}
              columns={reviewColumns}
              filters={tableFilters}
              isLoading={loadingAllReqs}
              rowKey={(row) => row.id}
              searchPlaceholder="Search by student name, roll number, or document..."
              emptyTitle="No Incoming Document Requests"
              emptyDescription="There are no document requests matching the selected filter criteria."
            />
          </TabsContent>
        </Tabs>
      )}

      {/* APPLICATION FORM DIALOG */}
      <Dialog open={isApplyOpen} onOpenChange={setIsApplyOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Apply for {selectedType?.name}
            </DialogTitle>
            <DialogDescription>Fill out required details for official certificate processing.</DialogDescription>
          </DialogHeader>

          {selectedType && (
            <form onSubmit={handleSubmitApply} className="space-y-4 py-2">
              {selectedType.fields_schema && Object.keys(selectedType.fields_schema).length > 0 ? (
                Object.entries(selectedType.fields_schema).map(([key, field]: [string, any]) => (
                  <div key={key} className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      {field.label || key} {field.required && '*'}
                    </Label>
                    <Input
                      type={field.type === 'number' ? 'number' : 'text'}
                      placeholder={`Enter ${field.label || key}...`}
                      value={formData[key] || ''}
                      onChange={(e) => handleFormChange(key, e.target.value)}
                      required={field.required}
                      className="h-10 text-sm"
                    />
                  </div>
                ))
              ) : (
                <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground border">
                  No additional form fields required for this document. Click submit to process your request.
                </div>
              )}

              <DialogFooter className="pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setIsApplyOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={applyMutation.isPending} className="gap-2 px-6">
                  {applyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Submit Application
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* APPROVER REVIEW DIALOG */}
      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-primary" /> Review Document Application
            </DialogTitle>
            <DialogDescription>Evaluate student application details and record official decision.</DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <form onSubmit={handleSubmitReview} className="space-y-4 py-2">
              <div className="p-3 bg-card border border-border rounded-xl space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Student:</span>
                  <span className="font-bold text-foreground">{selectedRequest.student_name} ({selectedRequest.roll_number || 'N/A'})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Document:</span>
                  <span className="font-bold text-primary">{selectedRequest.document_type_name}</span>
                </div>
                {selectedRequest.form_data && Object.keys(selectedRequest.form_data).length > 0 && (
                  <div className="pt-2 border-t border-border space-y-1">
                    <span className="text-[10px] font-semibold uppercase text-muted-foreground block">Application Form Answers</span>
                    {Object.entries(selectedRequest.form_data).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground capitalize">{k}:</span>
                        <span className="font-medium text-foreground">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Decision *</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={reviewDecision === 'APPROVED' ? 'default' : 'outline'}
                    className={reviewDecision === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
                    onClick={() => setReviewDecision('APPROVED')}
                  >
                    Approve
                  </Button>
                  <Button
                    type="button"
                    variant={reviewDecision === 'REVISION' ? 'default' : 'outline'}
                    className={reviewDecision === 'REVISION' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
                    onClick={() => setReviewDecision('REVISION')}
                  >
                    Revision
                  </Button>
                  <Button
                    type="button"
                    variant={reviewDecision === 'REJECTED' ? 'default' : 'outline'}
                    className={reviewDecision === 'REJECTED' ? 'bg-rose-600 hover:bg-rose-700 text-white' : ''}
                    onClick={() => setReviewDecision('REJECTED')}
                  >
                    Reject
                  </Button>
                </div>
              </div>

              {reviewDecision === 'APPROVED' && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Issued Document PDF URL (Optional)</Label>
                  <Input
                    placeholder="https://.../issued_certificate.pdf"
                    value={issuedFileUrl}
                    onChange={(e) => setIssuedFileUrl(e.target.value)}
                    className="h-10 text-sm"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Review Rationale / Note</Label>
                <Textarea
                  placeholder="Provide comments or notes regarding approval decision..."
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  className="min-h-[80px] text-sm"
                />
              </div>

              <DialogFooter className="pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setIsReviewOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={reviewMutation.isPending} className="gap-2 px-6">
                  {reviewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
                  Submit Decision
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* DETAIL & TIMELINE DIALOG */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" /> Application Progress & Approval History
            </DialogTitle>
          </DialogHeader>

          {detailRequest && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 bg-muted/50 rounded-xl border border-border flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-foreground text-sm">{detailRequest.document_type_name}</h4>
                  <p className="text-muted-foreground text-[11px]">Applied on {new Date(detailRequest.created_at).toLocaleDateString()}</p>
                </div>
                {getStatusBadge(detailRequest.status)}
              </div>

              {detailRequest.verify_code && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-1 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
                    Verification Code
                  </span>
                  <div className="text-xl font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {detailRequest.verify_code}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h5 className="font-bold text-foreground text-xs uppercase tracking-wider">Approval Step History</h5>
                {detailRequest.approvals && detailRequest.approvals.length > 0 ? (
                  <div className="space-y-2 border-l-2 border-primary/30 pl-3">
                    {detailRequest.approvals.map((appr) => (
                      <div key={appr.id} className="space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground">Step {appr.step_no}: {appr.approver_name}</span>
                          <Badge variant="outline" className="text-[10px] uppercase font-mono">{appr.decision}</Badge>
                        </div>
                        {appr.note && <p className="text-muted-foreground text-[11px] italic">"{appr.note}"</p>}
                        <p className="text-[10px] text-muted-foreground">{new Date(appr.decided_at).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">No approval steps recorded yet.</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
