import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import {
  gatePassesApi,
  type GatePassData,
  type GatePassType,
  type GatePassReason,
  type GatePassStatus,
} from '@/api/gatePassesApi';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Key,
  Clock,
  CheckCircle2,
  XCircle,
  QrCode,
  Send,
  Loader2,
  RefreshCw,
  LogOut,
  LogIn,
  AlertTriangle,
  FileCheck,
  ShieldCheck,
  MapPin,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

export function GatePassManagement() {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const isStudent = user?.user_type === 'student';
  const isAdmin = user?.user_type === 'admin';
  const isFaculty = user?.user_type === 'faculty';
  const isStaff = user?.user_type === 'staff';

  const canRequestPass = isStudent || hasPermission('gatepass:create');
  const canReviewPass = isAdmin || isStaff || isFaculty || hasPermission('gatepass:review');
  const canScanPass = isAdmin || isStaff || isFaculty || hasPermission('gatepass:scan');

  const visibleTabs = useMemo(() => {
    const tabs: Array<{ id: string; label: string; icon: any }> = [];
    if (canRequestPass) tabs.push({ id: 'my-passes', label: 'My Leave Requests', icon: Key });
    if (canReviewPass) tabs.push({ id: 'review-desk', label: 'Applications Review', icon: FileCheck });
    if (canScanPass) tabs.push({ id: 'gate-scanner', label: 'Security Scanner', icon: QrCode });
    return tabs;
  }, [canRequestPass, canReviewPass, canScanPass]);

  const defaultTab = visibleTabs.length > 0 ? visibleTabs[0].id : 'my-passes';
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Form State for Student
  const [passType, setPassType] = useState<GatePassType>('SHORT');
  const [category, setCategory] = useState<GatePassReason>('MARKET');
  const [destination, setDestination] = useState('');
  const [reason, setReason] = useState('');
  const [expectedReturn, setExpectedReturn] = useState('');

  // Review Modal State
  const [selectedPass, setSelectedPass] = useState<GatePassData | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  // Security Scanner State
  const [scanCode, setScanCode] = useState('');
  const [scanResult, setScanResult] = useState<GatePassData | null>(null);

  // 1. Queries
  const { data: myPassesRes, isLoading: loadingMyPasses, refetch: refetchMyPasses } = useQuery({
    queryKey: [QUERY_KEYS.MY_GATE_PASSES],
    queryFn: () => gatePassesApi.getMyGatePasses(),
    enabled: canRequestPass && isStudent,
  });

  const myPasses = Array.isArray(myPassesRes?.data?.items) ? myPassesRes.data.items : [];
  const activePass = myPasses.find(
    (p) => p.status === 'REQUESTED' || p.status === 'APPROVED' || p.status === 'OUT' || p.status === 'OVERDUE'
  );

  const { data: allPassesRes, isLoading: loadingAllPasses, refetch: refetchAllPasses } = useQuery({
    queryKey: [QUERY_KEYS.GATE_PASSES],
    queryFn: () => gatePassesApi.listAllGatePasses(),
    enabled: canReviewPass || canScanPass,
  });

  const allPasses = Array.isArray(allPassesRes?.data?.items) ? allPassesRes.data.items : [];

  // 2. Mutations
  const requestMutation = useMutation({
    mutationFn: (payload: any) => gatePassesApi.request(payload),
    onSuccess: () => {
      toast.success('Gate pass request submitted successfully!');
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MY_GATE_PASSES] });
      setDestination('');
      setReason('');
      setExpectedReturn('');
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err, 'Failed to submit gate pass request'));
    },
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: GatePassStatus; note?: string }) =>
      gatePassesApi.review(id, { status, note }),
    onSuccess: (_, vars) => {
      toast.success(`Gate pass ${vars.status.toLowerCase()} successfully`);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GATE_PASSES] });
      setIsReviewOpen(false);
      setSelectedPass(null);
      setReviewNote('');
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err, 'Failed to review gate pass'));
    },
  });

  const markExitMutation = useMutation({
    mutationFn: (code: string) => gatePassesApi.markExit(code),
    onSuccess: (res) => {
      toast.success(`Exit Verified! Student checked out.`);
      setScanResult(res.data);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GATE_PASSES] });
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err, 'Exit verification failed'));
    },
  });

  const markReturnMutation = useMutation({
    mutationFn: (code: string) => gatePassesApi.markReturn(code),
    onSuccess: (res) => {
      toast.success(`Return Verified! Student checked in.`);
      setScanResult(res.data);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GATE_PASSES] });
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err, 'Return verification failed'));
    },
  });

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim()) {
      toast.error('Please enter a destination.');
      return;
    }
    requestMutation.mutate({
      type: passType,
      reason_category: category,
      destination: destination.trim(),
      reason: reason.trim() || undefined,
      expected_return_at: expectedReturn ? new Date(expectedReturn).toISOString() : undefined,
    });
  };

  const getStatusBadge = (status: GatePassStatus) => {
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-semibold">APPROVED</Badge>;
      case 'OUT':
        return <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 font-semibold">CHECKED OUT</Badge>;
      case 'RETURNED':
        return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">RETURNED</Badge>;
      case 'OVERDUE':
        return <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 font-semibold animate-pulse">OVERDUE</Badge>;
      case 'REJECTED':
        return <Badge className="bg-destructive/15 text-destructive border-destructive/30">REJECTED</Badge>;
      default:
        return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">REQUESTED</Badge>;
    }
  };

  // 3. ProTable Columns for Warden / Admin Review
  const reviewColumns: ProColumn<GatePassData>[] = [
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
      id: 'type',
      header: 'Type & Reason',
      cell: (_, row) => (
        <div>
          <Badge variant="outline" className="uppercase font-mono text-[10px] font-semibold bg-accent">
            {row.type} ({row.reason_category})
          </Badge>
          <p className="text-xs text-muted-foreground truncate max-w-[160px] mt-0.5">{row.destination}</p>
        </div>
      ),
    },
    {
      id: 'pass_code',
      header: 'Pass Code',
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
      id: 'status',
      header: 'Status',
      accessorKey: 'status',
      cell: (val) => getStatusBadge(val as GatePassStatus),
      sortable: true,
    },
    {
      id: 'created_at',
      header: 'Requested Date',
      accessorKey: 'created_at',
      cell: (val) => (val ? new Date(String(val)).toLocaleDateString() : 'N/A'),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (_, row) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {row.status === 'REQUESTED' && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 gap-1"
                disabled={reviewMutation.isPending}
                onClick={() => reviewMutation.mutate({ id: row.id, status: 'APPROVED' })}
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs text-rose-600 border-rose-500/30 hover:bg-rose-500/10 gap-1"
                disabled={reviewMutation.isPending}
                onClick={() => {
                  setSelectedPass(row);
                  setIsReviewOpen(true);
                }}
              >
                <XCircle className="w-3.5 h-3.5" /> Reject
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  const tableFilters: TableFilterDef<GatePassData>[] = [
    {
      id: 'status',
      label: 'Status',
      defaultValue: '',
      options: [
        { label: 'All Statuses', value: '' },
        { label: 'Requested', value: 'REQUESTED' },
        { label: 'Approved', value: 'APPROVED' },
        { label: 'Checked Out', value: 'OUT' },
        { label: 'Returned', value: 'RETURNED' },
        { label: 'Overdue', value: 'OVERDUE' },
        { label: 'Rejected', value: 'REJECTED' },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (canRequestPass && isStudent) refetchMyPasses();
              if (canReviewPass || canScanPass) refetchAllPasses();
            }}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        }
      />

      {visibleTabs.length === 0 ? (
        <Card className="shadow-sm border border-dashed p-8 text-center">
          <ShieldCheck className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-base font-bold text-foreground">Access Restricted</h3>
          <p className="text-xs text-muted-foreground mt-1">
            You do not have permission to view or manage gate passes.
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
              </TabsTrigger>
            ))}
          </TabsList>

        {/* TAB 1: STUDENT GATE PASS PORTAL */}
        <TabsContent value="my-passes" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Active Pass Digital Card */}
            <div className="lg:col-span-1">
              <Card className="shadow-card border-border bg-card overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <QrCode className="w-5 h-5 text-primary" /> Active Gate Pass
                    </CardTitle>
                    {activePass && getStatusBadge(activePass.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {activePass ? (
                    <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 text-center space-y-4">
                      {activePass.pass_code ? (
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            Digital Pass Security Code
                          </span>
                          <div className="text-3xl font-mono font-extrabold tracking-widest text-emerald-600 dark:text-emerald-400 bg-card border border-emerald-500/30 py-2.5 rounded-xl shadow-xs">
                            {activePass.pass_code}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Show code or scan at campus exit gate.
                          </p>
                        </div>
                      ) : (
                        <div className="py-4 space-y-2">
                          <Clock className="w-8 h-8 text-amber-500 animate-pulse mx-auto" />
                          <p className="text-sm font-bold text-foreground">Pass Request Under Review</p>
                          <p className="text-xs text-muted-foreground">
                            Warden is currently verifying your destination and expected return time.
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-500/20 text-left text-xs">
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Destination</span>
                          <span className="font-semibold text-foreground truncate block">{activePass.destination}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Type</span>
                          <span className="font-semibold text-foreground uppercase">{activePass.type}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground space-y-2 border border-dashed rounded-xl p-6">
                      <Key className="w-8 h-8 mx-auto opacity-40" />
                      <p className="text-sm font-semibold text-foreground">No Active Gate Pass</p>
                      <p className="text-xs">Submit a leave request form on the right to obtain campus exit approval.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Request Gate Pass Form */}
            <div className="lg:col-span-2">
              <Card className="shadow-card border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Send className="w-5 h-5 text-primary" /> Request Campus Gate Pass
                  </CardTitle>
                  <CardDescription>Submit day-out or night-out leave approval to campus warden.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitRequest} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Pass Type *</Label>
                        <Select value={passType} onValueChange={(val) => setPassType(val as GatePassType)}>
                          <SelectTrigger className="h-10 text-sm">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SHORT">Short Pass (Day Out - Same Day Return)</SelectItem>
                            <SelectItem value="LONG">Long Leave (Outstation / Night Out)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Reason Category *</Label>
                        <Select value={category} onValueChange={(val) => setCategory(val as GatePassReason)}>
                          <SelectTrigger className="h-10 text-sm">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MARKET">Market / Shopping</SelectItem>
                            <SelectItem value="MEDICAL">Medical Emergency / Appointment</SelectItem>
                            <SelectItem value="TEA">Short Break / Local Visit</SelectItem>
                            <SelectItem value="HOLIDAY">Vacation / Home Visit</SelectItem>
                            <SelectItem value="OTHER">Other Purpose</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Destination *</Label>
                        <Input
                          placeholder="e.g. Cuttack Market / City Hospital"
                          value={destination}
                          onChange={(e) => setDestination(e.target.value)}
                          required
                          className="h-10 text-sm"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Expected Return Date & Time</Label>
                        <Input
                          type="datetime-local"
                          value={expectedReturn}
                          onChange={(e) => setExpectedReturn(e.target.value)}
                          className="h-10 text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Detailed Reason / Notes</Label>
                      <Textarea
                        placeholder="Provide details if required for warden review..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="min-h-[80px] text-sm"
                      />
                    </div>

                    <div className="pt-3 border-t border-border flex justify-end">
                      <Button type="submit" disabled={requestMutation.isPending} className="gap-2 px-6">
                        {requestMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Submit Pass Request
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: WARDEN & ADMIN APPLICATIONS REVIEW DESK */}
        <TabsContent value="review-desk" className="space-y-6">
          <ProTable
            data={allPasses}
            columns={reviewColumns}
            filters={tableFilters}
            isLoading={loadingAllPasses}
            rowKey={(row) => row.id}
            searchPlaceholder="Search by student name, roll number, or destination..."
            emptyTitle="No Gate Pass Applications"
            emptyDescription="There are no gate pass requests matching the selected filter criteria."
          />
        </TabsContent>

        {/* TAB 3: SECURITY GATE SCANNER & EXIT/RETURN DESK */}
        <TabsContent value="gate-scanner" className="space-y-6">
          <Card className="shadow-card border-border bg-card max-w-2xl mx-auto">
            <CardHeader className="border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">Security Gate Verification Desk</CardTitle>
                  <CardDescription>Scan or enter 6-character digital pass code to verify student exit or return.</CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Security Pass Code Input
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter 6-character Code e.g. AB12CD"
                    value={scanCode}
                    onChange={(e) => setScanCode(e.target.value.toUpperCase())}
                    className="h-11 font-mono font-bold tracking-widest text-lg uppercase bg-background"
                  />
                  <Button
                    onClick={() => markExitMutation.mutate(scanCode)}
                    disabled={!scanCode || markExitMutation.isPending}
                    className="gap-2 px-5 bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                  >
                    <LogOut className="w-4 h-4" /> Mark Exit
                  </Button>
                  <Button
                    onClick={() => markReturnMutation.mutate(scanCode)}
                    disabled={!scanCode || markReturnMutation.isPending}
                    className="gap-2 px-5 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                  >
                    <LogIn className="w-4 h-4" /> Mark Return
                  </Button>
                </div>
              </div>

              {scanResult && (
                <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                      <div>
                        <h4 className="font-bold text-foreground text-base">Verification Successful</h4>
                        <p className="text-xs text-muted-foreground">Pass Code Verified</p>
                      </div>
                    </div>
                    {getStatusBadge(scanResult.status)}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-card rounded-xl border border-border text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Student</span>
                      <span className="font-bold text-foreground">{scanResult.student_name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Roll Number</span>
                      <span className="font-mono font-bold text-foreground">{scanResult.roll_number || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Hostel & Room</span>
                      <span className="font-semibold text-foreground">{scanResult.hostel_name || 'Hostel'} - R{scanResult.room_number || '101'}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    )}

      {/* REJECT GATE PASS DIALOG */}
      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="w-5 h-5 text-destructive" /> Reject Gate Pass Request
            </DialogTitle>
            <DialogDescription>Provide rationale for declining student leave request.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Textarea
              placeholder="Enter rejection rationale (notified to student)..."
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              className="min-h-[100px] text-xs"
            />
          </div>

          <DialogFooter className="border-t border-border pt-3">
            <Button variant="outline" size="sm" onClick={() => setIsReviewOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={reviewMutation.isPending}
              onClick={() => {
                if (selectedPass) {
                  reviewMutation.mutate({ id: selectedPass.id, status: 'REJECTED', note: reviewNote });
                }
              }}
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default GatePassManagement;
