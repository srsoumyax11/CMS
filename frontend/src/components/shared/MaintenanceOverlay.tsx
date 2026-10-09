import React, { useEffect, useState } from 'react';
import { AUTH_EVENTS } from '@/lib/constants';
import { Wrench, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const MaintenanceOverlay: React.FC = () => {
  const [maintenance, setMaintenance] = useState<{ active: boolean; message: string }>({
    active: false,
    message: '',
  });

  useEffect(() => {
    const handleMaintenance = (e: Event) => {
      const customEv = e as CustomEvent<{ message?: string }>;
      setMaintenance({
        active: true,
        message: customEv.detail?.message || 'The CampusOne Portal is currently under scheduled maintenance.',
      });
    };

    window.addEventListener(AUTH_EVENTS.MAINTENANCE, handleMaintenance);
    return () => window.removeEventListener(AUTH_EVENTS.MAINTENANCE, handleMaintenance);
  }, []);

  if (!maintenance.active) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl shadow-2xl p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/20">
          <Wrench className="w-8 h-8 animate-bounce" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold font-editorial text-foreground">System Maintenance Active</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {maintenance.message}
          </p>
        </div>
        <div className="p-3 bg-secondary/50 rounded-xl border border-border text-xs text-muted-foreground flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <span>Non-administrative actions are temporarily paused. Please try again shortly.</span>
        </div>
        <Button
          variant="outline"
          onClick={() => window.location.reload()}
          className="w-full text-xs font-medium rounded-xl"
        >
          Check Again / Refresh Page
        </Button>
      </div>
    </div>
  );
};
