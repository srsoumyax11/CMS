import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { silentApi } from '@/api/silentApi';
import type { SilentMode, UserSilentSettingUpdateRequest } from '@/types/api';
import {
  VolumeX,
  Volume2,
  Vibrate,
  Moon,
  Clock,
  Calendar,
  Copy,
  Download,
  Check,
  Smartphone,
  Sparkles,
  Info,
  ShieldCheck,
} from 'lucide-react';

export function SilentModeSettings() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [copiedLink, setCopiedLink] = useState(false);

  // 1. Fetch user silent settings
  const { data: settingsRes, isLoading: settingsLoading } = useQuery({
    queryKey: ['user-silent-settings'],
    queryFn: async () => {
      const res = await silentApi.getSettings();
      return res.data.data;
    },
  });

  // 2. Fetch daily calculated schedule
  const { data: scheduleRes, isLoading: scheduleLoading } = useQuery({
    queryKey: ['daily-silent-schedule', selectedDate],
    queryFn: async () => {
      const res = await silentApi.getSchedule(selectedDate);
      return res.data.data;
    },
  });

  const settings = settingsRes;
  const scheduleItems = scheduleRes?.items || [];

  // Update settings mutation
  const updateMutation = useMutation({
    mutationFn: (data: UserSilentSettingUpdateRequest) => silentApi.updateSettings(data),
    onSuccess: () => {
      toast.success('Silent mode preferences updated!');
      queryClient.invalidateQueries({ queryKey: ['user-silent-settings'] });
      queryClient.invalidateQueries({ queryKey: ['daily-silent-schedule'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to update preferences');
    },
  });

  const handleModeChange = (mode: SilentMode) => {
    updateMutation.mutate({ mode });
  };

  const handleToggleEnable = (enabled: boolean) => {
    updateMutation.mutate({ enabled });
  };

  const handleBufferChange = (field: 'minutes_before' | 'minutes_after', val: number) => {
    updateMutation.mutate({ [field]: val });
  };

  const icalFeedUrl = silentApi.getIcalUrl();

  const copyIcalUrl = () => {
    navigator.clipboard.writeText(icalFeedUrl);
    setCopiedLink(true);
    toast.success('iCal feed URL copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Personal Silent Mode & Calendar Sync"
        description="Automate your phone's Do Not Disturb (DND) settings during class lectures and sync your live academic calendar."
        icon={VolumeX}
      />

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Mode Selector Card */}
        <Card className="border border-border shadow-2xs md:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Moon className="h-4 w-4 text-primary" />
              Silent Profile Mode
            </CardTitle>
            <CardDescription className="text-xs">
              Select what mode your phone should trigger during class blocks.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div
              onClick={() => handleModeChange('silent')}
              className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                settings?.mode === 'silent'
                  ? 'border-primary bg-primary/10 shadow-xs'
                  : 'border-border bg-card hover:bg-accent'
              }`}
            >
              <div className="flex items-center gap-3">
                <VolumeX className="h-5 w-5 text-primary" />
                <div>
                  <h4 className="text-xs font-bold text-foreground">Silent Mode</h4>
                  <p className="text-[11px] text-muted-foreground">Mute all ringtones & media</p>
                </div>
              </div>
              {settings?.mode === 'silent' && <Check className="h-4 w-4 text-primary" />}
            </div>

            <div
              onClick={() => handleModeChange('vibrate')}
              className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                settings?.mode === 'vibrate'
                  ? 'border-primary bg-primary/10 shadow-xs'
                  : 'border-border bg-card hover:bg-accent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Vibrate className="h-5 w-5 text-amber-500" />
                <div>
                  <h4 className="text-xs font-bold text-foreground">Vibrate Only</h4>
                  <p className="text-[11px] text-muted-foreground">Haptic vibration alerts only</p>
                </div>
              </div>
              {settings?.mode === 'vibrate' && <Check className="h-4 w-4 text-primary" />}
            </div>

            <div
              onClick={() => handleModeChange('dnd')}
              className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                settings?.mode === 'dnd'
                  ? 'border-primary bg-primary/10 shadow-xs'
                  : 'border-border bg-card hover:bg-accent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Moon className="h-5 w-5 text-rose-500" />
                <div>
                  <h4 className="text-xs font-bold text-foreground">Do Not Disturb (DND)</h4>
                  <p className="text-[11px] text-muted-foreground">Block all calls & notifications</p>
                </div>
              </div>
              {settings?.mode === 'dnd' && <Check className="h-4 w-4 text-primary" />}
            </div>
          </CardContent>
        </Card>

        {/* Buffer & Automation Controls Card */}
        <Card className="border border-border shadow-2xs md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Buffer Padding & Contiguous Merging
            </CardTitle>
            <CardDescription className="text-xs">
              Configure padding minutes around lectures. Back-to-back classes are automatically merged into single DND blocks.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3.5 bg-muted/40 rounded-xl border">
              <div>
                <h4 className="text-xs font-bold text-foreground">Enable Automated Silent Schedule</h4>
                <p className="text-[11px] text-muted-foreground">
                  Automatically calculate quiet DND blocks based on your timetable.
                </p>
              </div>

              <Button
                variant={settings?.enabled ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleToggleEnable(!settings?.enabled)}
                className="text-xs h-8"
              >
                {settings?.enabled ? 'Automation Active' : 'Disabled'}
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 p-3.5 border rounded-xl bg-card">
                <Label htmlFor="beforeBuffer" className="text-xs font-semibold">
                  Pre-Class Buffer (Minutes Before)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="beforeBuffer"
                    type="number"
                    min="0"
                    max="30"
                    value={settings?.minutes_before ?? 5}
                    onChange={(e) =>
                      handleBufferChange('minutes_before', parseInt(e.target.value, 10) || 0)
                    }
                    className="text-xs h-9"
                  />
                  <span className="text-xs text-muted-foreground shrink-0">mins</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Mutes phone {settings?.minutes_before ?? 5} minutes before class starts.
                </p>
              </div>

              <div className="space-y-2 p-3.5 border rounded-xl bg-card">
                <Label htmlFor="afterBuffer" className="text-xs font-semibold">
                  Post-Class Buffer (Minutes After)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="afterBuffer"
                    type="number"
                    min="0"
                    max="30"
                    value={settings?.minutes_after ?? 5}
                    onChange={(e) =>
                      handleBufferChange('minutes_after', parseInt(e.target.value, 10) || 0)
                    }
                    className="text-xs h-9"
                  />
                  <span className="text-xs text-muted-foreground shrink-0">mins</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Keeps phone silent for {settings?.minutes_after ?? 5} minutes after class ends.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calculated Daily Schedule Preview */}
      <Card className="border border-border shadow-2xs">
        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Calculated DND Quiet Schedule Preview
            </CardTitle>
            <CardDescription className="text-xs">
              Inspect your merged quiet time blocks for any selected date.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs h-8 w-40"
            />
          </div>
        </CardHeader>

        <CardContent>
          {scheduleLoading ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Calculating quiet time windows...
            </div>
          ) : scheduleItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground border rounded-xl bg-muted/20">
              No quiet time windows required on {new Date(selectedDate).toLocaleDateString()} (Holiday / No classes scheduled).
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {scheduleItems.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-xs font-bold text-foreground">{item.title}</h4>
                    <p className="text-xs font-mono font-bold text-primary mt-1">
                      {item.start_time} — {item.end_time}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase font-bold">
                    {item.mode}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calendar Sync & Edge Automation Setup */}
      <Card className="border border-border shadow-2xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-primary" />
            Live iCal Feed (.ics) & Phone Automation Sync
          </CardTitle>
          <CardDescription className="text-xs">
            Subscribe to your live academic schedule link in Google Calendar or Apple Calendar for automated phone volume switching.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="p-3.5 bg-muted/40 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">
                Your Private Tokenized iCal Feed URL
              </span>
              <p className="text-xs font-mono text-foreground truncate mt-0.5">
                {icalFeedUrl}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={copyIcalUrl} className="text-xs h-8 gap-1.5">
                {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedLink ? 'Copied!' : 'Copy Feed Link'}
              </Button>

              <a href={icalFeedUrl} download="academic_schedule.ics">
                <Button size="sm" variant="default" className="text-xs h-8 gap-1.5">
                  <Download className="h-3.5 w-3.5" />
                  Download .ics
                </Button>
              </a>
            </div>
          </div>

          {/* Setup Instruction Tabs */}
          <Tabs defaultValue="ios" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="ios" className="text-xs">
                iPhone / iOS Shortcuts Setup
              </TabsTrigger>
              <TabsTrigger value="android" className="text-xs">
                Android / Tasker Setup
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ios" className="p-4 border rounded-xl bg-card space-y-2 text-xs">
              <h4 className="font-bold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-primary" />
                iOS Personal Automation Setup Guide
              </h4>
              <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground leading-relaxed">
                <li>Copy your private iCal Feed link above.</li>
                <li>Open <strong>Settings ➔ Calendar ➔ Accounts ➔ Add Account ➔ Other ➔ Add Subscribed Calendar</strong> and paste the URL.</li>
                <li>Open the <strong>Shortcuts App</strong> on your iPhone ➔ tap <strong>Automation</strong> tab ➔ <strong>New Automation</strong>.</li>
                <li>Select <strong>When an Event Starts</strong> ➔ choose calendar <strong>"Campus Class Schedule"</strong>.</li>
                <li>Set Action: <strong>Set Do Not Disturb ON</strong> until event ends!</li>
              </ol>
            </TabsContent>

            <TabsContent value="android" className="p-4 border rounded-xl bg-card space-y-2 text-xs">
              <h4 className="font-bold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Android Automation Setup Guide (Google Calendar + Tasker / Macrodroid)
              </h4>
              <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground leading-relaxed">
                <li>Open Google Calendar in browser (calendar.google.com) ➔ click <strong>+ Other Calendars ➔ From URL</strong> and paste the feed link.</li>
                <li>Open Tasker / Macrodroid on your Android phone.</li>
                <li>Create a new Profile: <strong>State ➔ Calendar Entry ➔ Calendar: Campus Class Schedule</strong>.</li>
                <li>Assign Action: <strong>Audio ➔ Silent Mode ON</strong> (or Do Not Disturb mode).</li>
              </ol>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default SilentModeSettings;
