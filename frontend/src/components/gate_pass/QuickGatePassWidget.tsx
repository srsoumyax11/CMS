import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Coffee, 
  QrCode, 
  Clock, 
  ShieldCheck, 
  AlertTriangle, 
  ArrowRight, 
  CheckCircle2, 
  RefreshCw, 
  ShoppingBag, 
  Footprints, 
  UserCheck, 
  Sparkles,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { gatePassApi, GatePassReason, QuickGatePassResponse } from '@/api/gatePassApi';
import { QUERY_KEYS } from '@/lib/constants';

const REASON_OPTIONS: { id: GatePassReason; label: string; icon: React.ReactNode }[] = [
  { id: 'tea_snack', label: 'Tea & Evening Snack', icon: <Coffee className="w-4 h-4 text-amber-500" /> },
  { id: 'market_errand', label: 'Market / Grocery', icon: <ShoppingBag className="w-4 h-4 text-blue-500" /> },
  { id: 'walk_exercise', label: 'Walk / Fresh Air', icon: <Footprints className="w-4 h-4 text-emerald-500" /> },
  { id: 'personal_work', label: 'Personal Work', icon: <UserCheck className="w-4 h-4 text-indigo-500" /> },
];

export const QuickGatePassWidget: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<GatePassReason>('tea_snack');
  const [customReason, setCustomReason] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [qrSeed, setQrSeed] = useState(0);

  // Auto refresh QR seed every 15s to simulate dynamic security token
  useEffect(() => {
    const interval = setInterval(() => {
      setQrSeed((prev) => prev + 1);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const { data: activePassRes, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.MY_GATE_PASS],
    queryFn: async () => {
      const res = await gatePassApi.getMyActivePass();
      return res.data.data;
    },
    refetchInterval: 10000,
  });

  const activePass = activePassRes as QuickGatePassResponse | null;

  const createPassMutation = useMutation({
    mutationFn: async () => {
      const res = await gatePassApi.createQuickExit({
        reason: selectedReason,
        custom_reason: selectedReason === 'other' ? customReason : undefined,
        duration_minutes: durationMinutes,
      });
      return res.data.data;
    },
    onSuccess: (newPass) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MY_GATE_PASS] });
      if (newPass) {
        toast.success(`Gate Pass ${newPass.pass_code} Issued! Parent notified via email.`);
      } else {
        toast.success('Gate Pass Issued! Parent notified via email.');
      }
      setIsModalOpen(false);
    },

    onError: (err: any) => {
      const msg = err?.response?.data?.detail || 'Failed to issue Gate Pass';
      toast.error(msg);
    },
  });

  // Calculate remaining countdown
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isOverdue, setIsOverdue] = useState(false);

  useEffect(() => {
    if (!activePass) return;

    const updateTimer = () => {
      const target = new Date(activePass.expected_return_time).getTime();
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeRemaining('00:00:00');
        setIsOverdue(true);
      } else {
        setIsOverdue(false);
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const mins = Math.floor((diff / 1000 / 60) % 60);
        const secs = Math.floor((diff / 1000) % 60);
        setTimeRemaining(
          `${hours.toString().padStart(2, '0')}:${mins
            .toString()
            .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        );
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [activePass]);

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground text-base">Quick Gate Pass</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                1-Tap Exit
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Casual tea & outing pass (&lt; 2 hrs) • Auto Parent Alert</p>
          </div>
        </div>

        {activePass ? (
          <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${
            isOverdue 
              ? 'bg-destructive/10 text-destructive border border-destructive/30 animate-pulse' 
              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isOverdue ? 'bg-destructive animate-ping' : 'bg-emerald-500 animate-pulse'}`} />
            {isOverdue ? 'OVERDUE RETURN' : 'OUT ON GATE PASS'}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" /> Inside Campus
          </span>
        )}
      </div>

      {/* Active Pass State Display */}
      {activePass ? (
        <div className="mt-4 bg-muted/40 border border-border rounded-xl p-4 space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center md:text-left">
              <div className="text-xs text-muted-foreground font-mono">PASS CODE: <span className="font-bold text-foreground text-sm">{activePass.pass_code}</span></div>
              <div className="text-xs font-medium text-foreground">
                Reason: <span className="capitalize text-primary font-semibold">{activePass.reason.replace('_', ' ')}</span>
              </div>
              <div className="text-xs text-muted-foreground flex items-center justify-center md:justify-start gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Parent notified via Email
              </div>
            </div>

            {/* Live QR Code Box */}
            <div className="flex flex-col items-center bg-card border border-border p-3 rounded-xl shadow-xs">
              <div className="relative group cursor-pointer">
                {/* Visual QR Matrix */}
                <div className="w-24 h-24 bg-card p-2 rounded-lg flex flex-col justify-between border border-border shadow-inner">
                  <div className="flex justify-between">
                    <div className="w-5 h-5 border-2 border-foreground bg-foreground p-0.5"><div className="w-full h-full bg-background" /></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-ping" />
                    <div className="w-5 h-5 border-2 border-foreground bg-foreground p-0.5"><div className="w-full h-full bg-background" /></div>
                  </div>
                  <div className="text-center font-mono font-bold text-[9px] text-foreground tracking-tighter truncate max-w-[80px] mx-auto">
                    {activePass.pass_code}
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="w-5 h-5 border-2 border-foreground bg-foreground p-0.5"><div className="w-full h-full bg-background" /></div>
                    <div className="w-3 h-3 bg-foreground" />
                    <div className="w-3 h-3 bg-foreground" />
                  </div>
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground mt-1 font-mono flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin text-primary" /> Dynamic Code #{qrSeed}
              </span>
            </div>

            {/* Timer Box */}
            <div className={`p-4 rounded-xl border flex flex-col items-center justify-center min-w-[140px] ${
              isOverdue 
                ? 'bg-destructive/10 border-destructive/30 text-destructive' 
                : 'bg-primary/5 border-primary/20 text-primary'
            }`}>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Return Timer</span>
              <span className="text-xl font-bold font-mono tracking-tight">{timeRemaining}</span>
              <span className="text-[10px] text-muted-foreground mt-1">Expected: {new Date(activePass.expected_return_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </div>
      ) : (
        /* Issue New Gate Pass Trigger Button */
        <div className="mt-3 flex items-center justify-between bg-muted/30 border border-border rounded-xl p-4">
          <div className="space-y-0.5">
            <h4 className="text-sm font-medium text-foreground">Going out for a quick tea break or errand?</h4>
            <p className="text-xs text-muted-foreground">No warden approval required. Instant QR code issued instantly.</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs px-4 py-2.5 rounded-full shadow-sm hover:shadow-md transition-all shrink-0 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" /> Issue 1-Tap Pass
          </button>
        </div>
      )}

      {/* Modal Dialog for Pass Creation */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Coffee className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">Quick Gate Pass</h3>
                <p className="text-xs text-muted-foreground">Select your errand & estimated duration</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Reason Selector */}
              <div>
                <label className="text-xs font-semibold text-foreground mb-2 block">Reason for Casual Outing</label>
                <div className="grid grid-cols-2 gap-2">
                  {REASON_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedReason(opt.id)}
                      className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-medium text-left transition-all cursor-pointer ${
                        selectedReason === opt.id
                          ? 'bg-primary/10 border-primary text-primary font-semibold shadow-xs'
                          : 'bg-muted/40 border-border hover:bg-muted text-foreground'
                      }`}
                    >
                      {opt.icon}
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration Slider */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-foreground">Estimated Duration</label>
                  <span className="text-xs font-bold text-primary font-mono">{durationMinutes} Mins</span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={120}
                  step={15}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full accent-primary bg-muted rounded-lg h-2 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>15m (Quick)</span>
                  <span>60m (Standard)</span>
                  <span>120m (Max Casual)</span>
                </div>
              </div>

              {/* Real-time Safety Notice */}
              <div className="bg-muted p-3 border border-border rounded-xl flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-[11px] text-foreground leading-relaxed">
                  <strong>Parent Safety Guarantee:</strong> An automated exit email will be sent to your registered parent/guardian immediately upon pass creation.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-border text-xs font-medium hover:bg-muted transition-colors cursor-pointer text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={createPassMutation.isPending}
                  onClick={() => createPassMutation.mutate()}
                  className="flex-1 py-2.5 px-4 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {createPassMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>Generate Gate Pass <ArrowRight className="w-3.5 h-3.5" /></>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

};
