import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  QrCode, 
  Search, 
  CheckCircle, 
  AlertTriangle, 
  ShieldCheck, 
  UserCheck, 
  Clock, 
  Building, 
  RefreshCw, 
  User, 
  ScanLine,
  ArrowDownCircle,
  Coffee
} from 'lucide-react';
import { toast } from 'sonner';
import { gatePassApi, GateScanResponse, QuickGatePassResponse } from '@/api/gatePassApi';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { Badge } from '@/components/ui/badge';

export const GateGuardScanner: React.FC = () => {
  const [searchInput, setSearchInput] = useState('');
  const [lastScanResult, setLastScanResult] = useState<GateScanResponse | null>(null);
  const [recentScans, setRecentScans] = useState<QuickGatePassResponse[]>([]);

  const scanMutation = useMutation({
    mutationFn: async (payload: { qr_payload?: string; roll_number?: string; pass_code?: string }) => {
      const res = await gatePassApi.scanGatePass(payload);
      return res.data;
    },
    onSuccess: (data) => {
      setLastScanResult(data);
      if (data.success) {
        toast.success(data.message);
        if (data.pass_details) {
          setRecentScans((prev) => [data.pass_details!, ...prev.slice(0, 9)]);
        }
        setSearchInput('');
      } else {
        toast.error(data.message);
      }
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || 'Scan processing failed';
      toast.error(msg);
    },
  });

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;

    const query = searchInput.trim();
    if (query.startsWith('GP-')) {
      scanMutation.mutate({ pass_code: query });
    } else {
      scanMutation.mutate({ roll_number: query });
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header Banner */}
      <PageHeader
        title="Main Gate Security Terminal"
        description="Real-time QR & Roll Number Pass Verification for Student Campus Access. Instant parent check-in confirmation."
        icon={ShieldCheck}
        badge={
          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 gap-1.5 font-medium text-[11px]">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Scanner Active • Gate #1 (Main Entrance)
          </Badge>
        }
      />


      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Scanner & Search Input */}
        <div className="lg:col-span-5 space-y-6">
          {/* Scanner Simulation Box */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm text-center space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                <ScanLine className="w-4 h-4 text-amber-500" /> QR Code Scanner Feed
              </span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">
                Ready to Scan
              </span>
            </div>

            {/* Visual Viewfinder Box */}
            <div className="relative w-full aspect-square max-w-[260px] mx-auto bg-slate-950 rounded-2xl border-2 border-dashed border-amber-500/40 flex flex-col items-center justify-center p-4 overflow-hidden group shadow-inner">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 animate-pulse shadow-lg" />
              
              <QrCode className="w-20 h-20 text-slate-700 group-hover:text-amber-500 transition-colors animate-pulse" />
              
              <span className="text-xs text-slate-400 mt-3 font-mono">
                Point Barcode / Phone Screen
              </span>
              <span className="text-[10px] text-slate-500 mt-1">Auto-detecting 30s Dynamic Tokens</span>

              {/* Corner Reticle Accents */}
              <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-amber-500" />
              <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-amber-500" />
              <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-amber-500" />
              <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-amber-500" />
            </div>

            {/* Manual Roll / Pass Code Search Form */}
            <form onSubmit={handleManualSearch} className="space-y-3 pt-2">
              <label className="text-xs font-semibold text-foreground block text-left">
                Manual Lookup (Roll No. or Pass Code)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="e.g. 2101105001 or GP-20261005-..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="w-full bg-muted/50 border border-border rounded-xl pl-9 pr-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
                <button
                  type="submit"
                  disabled={scanMutation.isPending || !searchInput.trim()}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {scanMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Verify'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Active Scan Verification & Pass History */}
        <div className="lg:col-span-7 space-y-6">
          {/* Verification Result Card */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm min-h-[300px] flex flex-col justify-between">
            <div className="border-b border-border pb-3 flex items-center justify-between">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-amber-500" /> Gate Pass Verification Result
              </h3>
              {lastScanResult && (
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                  lastScanResult.success 
                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30' 
                    : 'bg-red-500/10 text-red-600 border border-red-500/30'
                }`}>
                  {lastScanResult.success ? 'PASSED & CHECKED IN' : 'VERIFICATION FAILED'}
                </span>
              )}
            </div>

            {lastScanResult?.pass_details ? (
              <div className="py-4 space-y-4">
                <div className="flex items-center gap-4 bg-muted/40 border border-border p-4 rounded-xl">
                  <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 font-bold text-lg">
                    {lastScanResult.pass_details.student_name?.[0] || 'S'}
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-foreground text-base">
                      {lastScanResult.pass_details.student_name || 'Student Name'}
                    </h4>
                    <div className="text-xs text-muted-foreground flex items-center gap-3">
                      <span>Roll: <strong className="text-foreground">{lastScanResult.pass_details.student_roll || 'N/A'}</strong></span>
                      <span>Pass Code: <strong className="font-mono text-amber-600">{lastScanResult.pass_details.pass_code}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-muted/30 p-3 rounded-xl border border-border">
                    <span className="text-muted-foreground block mb-0.5">Reason for Outing</span>
                    <strong className="text-foreground capitalize">{lastScanResult.pass_details.reason.replace('_', ' ')}</strong>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-xl border border-border">
                    <span className="text-muted-foreground block mb-0.5">Exit Time</span>
                    <strong className="text-foreground">{new Date(lastScanResult.pass_details.exit_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-xl border border-border">
                    <span className="text-muted-foreground block mb-0.5">Expected Return</span>
                    <strong className="text-amber-600">{new Date(lastScanResult.pass_details.expected_return_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-xl border border-border">
                    <span className="text-muted-foreground block mb-0.5">Actual Check-in Time</span>
                    <strong className="text-emerald-600">
                      {lastScanResult.pass_details.actual_return_time 
                        ? new Date(lastScanResult.pass_details.actual_return_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'Just Now'}
                    </strong>
                  </div>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 p-3 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>Student successfully checked IN. Parent return notification sent via email.</span>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground space-y-2">
                <ArrowDownCircle className="w-10 h-10 mx-auto text-muted-foreground/40" />
                <p className="text-xs">Scan a dynamic QR barcode or enter a roll number to test gate check-in.</p>
              </div>
            )}
          </div>

          {/* Recent Gate Activity Log */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold text-foreground text-sm mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" /> Recent Gate Clearance Log
            </h3>

            {recentScans.length > 0 ? (
              <div className="divide-y divide-border">
                {recentScans.map((scan) => (
                  <div key={scan.id} className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                        <CheckCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{scan.student_name || 'Student'} ({scan.student_roll || 'N/A'})</div>
                        <div className="text-[11px] text-muted-foreground font-mono">{scan.pass_code} • {scan.reason.replace('_', ' ')}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-emerald-600 font-semibold block">CHECKED IN</span>
                      <span className="text-[10px] text-muted-foreground">
                        {scan.actual_return_time ? new Date(scan.actual_return_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">No gate scans recorded in current session.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
