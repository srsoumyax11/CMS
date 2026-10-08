import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Save,
  Plus,
  Search,
  SlidersHorizontal,
  ShieldAlert,
  Lock,
  Globe,
  RefreshCw,
  Mail,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { SwitchField } from '@/components/shared/form/SwitchField';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { systemSettingsApi } from '@/api/systemSettingsApi';
import type { SystemSetting, SystemSettingCreateUpdate } from '@/types/api';
import { getErrorMessage } from '@/lib/error-utils';
import { useAuth } from '@/context/AuthContext';

export default function SystemSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, can } = useAuth();

  const [systemSettings, setSystemSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);

  // Local values for input fields before saving
  const [localValues, setLocalValues] = useState<Record<string, string>>({});

  // Add system setting modal state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [newSystemSetting, setNewSystemSetting] = useState<SystemSettingCreateUpdate>({
    key: '',
    value: '',
    category: 'General',
    data_type: 'string',
    description: '',
    is_public: false,
  });

  const canManage = can('system_setting:manage');

  useEffect(() => {
    fetchSystemSettings();
  }, []);

  const fetchSystemSettings = async () => {
    try {
      setLoading(true);
      const res = await systemSettingsApi.listSystemSettings();
      if (res.data.success && res.data.data) {
        const items = res.data.data.items || [];
        setSystemSettings(items);
        const locals: Record<string, string> = {};
        items.forEach((s) => {
          if (s.data_type !== 'boolean') {
            locals[s.key] = s.value || '';
          }
        });
        setLocalValues(locals);
      }
    } catch (error: any) {
      toast.error(getErrorMessage(error, 'Failed to load system settings'));
    } finally {
      setLoading(false);
    }
  };

  const updateSystemSetting = async (setting: SystemSetting, newValue: string) => {
    if (!canManage) {
      toast.error('You do not have permission to modify system settings.');
      return;
    }

    try {
      setSavingKey(setting.key);
      const payload: SystemSettingCreateUpdate = {
        key: setting.key,
        value: newValue,
        category: setting.category,
        data_type: setting.data_type,
        description: setting.description,
        is_public: setting.is_public,
      };

      const res = await systemSettingsApi.setSystemSetting(payload);
      if (res.data.success && res.data.data) {
        const updated = res.data.data;
        setSystemSettings((prev) => prev.map((s) => (s.key === setting.key ? updated : s)));
        toast.success(`System setting '${formatKeyLabel(setting.key)}' updated successfully`);

        if (setting.key === 'maintenance_mode') {
          if (newValue === 'true') {
            toast.warning('System is now in Maintenance Mode!', { duration: 5000 });
          } else {
            toast.info('System maintenance mode deactivated.');
          }
        }
      }
    } catch (error: any) {
      toast.error(getErrorMessage(error, `Failed to update ${setting.key}`));
      fetchSystemSettings();
    } finally {
      setSavingKey(null);
    }
  };

  const handleCreateSystemSetting = async () => {
    if (!newSystemSetting.key.trim()) {
      toast.error('System setting key is required');
      return;
    }

    try {
      setCreateLoading(true);
      const formattedKey = newSystemSetting.key.trim().toLowerCase().replace(/\s+/g, '_');
      const payload: SystemSettingCreateUpdate = {
        ...newSystemSetting,
        key: formattedKey,
      };

      const res = await systemSettingsApi.setSystemSetting(payload);
      if (res.data.success && res.data.data) {
        toast.success(`System setting '${formattedKey}' created successfully`);
        setAddDialogOpen(false);
        setNewSystemSetting({
          key: '',
          value: '',
          category: 'General',
          data_type: 'string',
          description: '',
          is_public: false,
        });
        fetchSystemSettings();
      }
    } catch (error: any) {
      toast.error(getErrorMessage(error, 'Failed to create system setting'));
    } finally {
      setCreateLoading(false);
    }
  };

  const handleLocalChange = (key: string, value: string) => {
    setLocalValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSendTestEmail = async () => {
    try {
      setSendingTestEmail(true);
      const res = await systemSettingsApi.sendTestEmail();
      if (res.data.success) {
        toast.success(res.data.message || `Test email sent to ${user?.email || 'your email'} successfully!`);
      }
    } catch (error: any) {
      toast.error(getErrorMessage(error, 'Failed to send test email'));
    } finally {
      setSendingTestEmail(false);
    }
  };

  const formatKeyLabel = (key: string) =>
    key
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

  // Filter settings by search query
  const filteredSystemSettings = useMemo(() => {
    if (!searchQuery.trim()) return systemSettings;
    const query = searchQuery.toLowerCase();
    return systemSettings.filter(
      (s) =>
        s.key.toLowerCase().includes(query) ||
        s.category.toLowerCase().includes(query) ||
        (s.description && s.description.toLowerCase().includes(query)) ||
        (s.value && s.value.toLowerCase().includes(query))
    );
  }, [systemSettings, searchQuery]);

  // Group settings by category
  const groupedSystemSettings = useMemo(() => {
    return filteredSystemSettings.reduce((acc, setting) => {
      const cat = setting.category || 'General';
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push(setting);
      return acc;
    }, {} as Record<string, SystemSetting[]>);
  }, [filteredSystemSettings]);

  const categories = useMemo(() => Object.keys(groupedSystemSettings).sort(), [groupedSystemSettings]);

  const activeTab = searchParams.get('tab')
    ? categories.find((c) => c.toLowerCase() === searchParams.get('tab')?.toLowerCase()) ||
      categories[0] ||
      'General'
    : categories[0] || 'General';

  const handleTabChange = (val: string) => {
    setSearchParams({ tab: val.toLowerCase() });
  };

  const isMaintenanceActive = systemSettings.some(
    (s) => s.key === 'maintenance_mode' && s.value === 'true'
  );

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="h-8 w-48 bg-muted rounded-md mb-2"></div>
            <div className="h-4 w-96 bg-muted rounded-md"></div>
          </div>
          <div className="h-10 w-32 bg-muted rounded-md"></div>
        </div>
        <div className="h-12 bg-muted rounded-xl"></div>
        <div className="h-[300px] bg-muted rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Maintenance Alert Notice */}
      {isMaintenanceActive && (
        <div className="flex items-center justify-between p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold">System Maintenance Mode Active</p>
              <p className="text-xs opacity-90">
                Non-admin endpoints and unauthenticated sessions are currently restricted.
              </p>
            </div>
          </div>
          {canManage && (
            <Button
              size="sm"
              variant="outline"
              className="border-amber-500/50 hover:bg-amber-500/20 text-amber-800 dark:text-amber-200 text-xs"
              onClick={() => {
                const setting = systemSettings.find((s) => s.key === 'maintenance_mode');
                if (setting) updateSystemSetting(setting, 'false');
              }}
            >
              Disable Maintenance
            </Button>
          )}
        </div>
      )}

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader />

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchSystemSettings} className="gap-1.5 text-xs">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>

          {canManage && (
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5 text-xs font-medium">
                  <Plus className="h-4 w-4" /> Add System Setting
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[485px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <SlidersHorizontal className="h-5 w-5 text-primary" /> Create System Setting
                  </DialogTitle>
                  <DialogDescription>
                    Add a new key-value system setting configuration.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="key" className="text-xs font-semibold">
                      Setting Key *
                    </Label>
                    <Input
                      id="key"
                      placeholder="e.g. max_file_upload_mb"
                      value={newSystemSetting.key}
                      onChange={(e) => setNewSystemSetting({ ...newSystemSetting, key: e.target.value })}
                      className="text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="category" className="text-xs font-semibold">
                        Category
                      </Label>
                      <Input
                        id="category"
                        placeholder="e.g. General, Security"
                        value={newSystemSetting.category}
                        onChange={(e) => setNewSystemSetting({ ...newSystemSetting, category: e.target.value })}
                        className="text-sm"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="data_type" className="text-xs font-semibold">
                        Data Type
                      </Label>
                      <Select
                        value={newSystemSetting.data_type}
                        onValueChange={(val) => setNewSystemSetting({ ...newSystemSetting, data_type: val })}
                      >
                        <SelectTrigger id="data_type" className="text-sm">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="string">String</SelectItem>
                          <SelectItem value="boolean">Boolean</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="json">JSON</SelectItem>
                          <SelectItem value="password">Password</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="value" className="text-xs font-semibold">
                      Initial Value
                    </Label>
                    <Input
                      id="value"
                      placeholder="Setting value"
                      value={newSystemSetting.value || ''}
                      onChange={(e) => setNewSystemSetting({ ...newSystemSetting, value: e.target.value })}
                      className="text-sm"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="description" className="text-xs font-semibold">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="Brief summary of what this setting controls"
                      value={newSystemSetting.description || ''}
                      onChange={(e) =>
                        setNewSystemSetting({ ...newSystemSetting, description: e.target.value })
                      }
                      className="text-sm h-20"
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox
                      id="is_public"
                      checked={newSystemSetting.is_public}
                      onCheckedChange={(checked) =>
                        setNewSystemSetting({ ...newSystemSetting, is_public: !!checked })
                      }
                    />
                    <Label htmlFor="is_public" className="text-xs font-normal cursor-pointer">
                      Public Setting (Exposed to unauthenticated clients via `/api/settings/public`)
                    </Label>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setAddDialogOpen(false)}
                    disabled={createLoading}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateSystemSetting} disabled={createLoading}>
                    {createLoading ? 'Saving...' : 'Create Setting'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filter system settings by key, category, description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 text-sm h-9 bg-card"
        />
      </div>

      {/* Settings Tabbed Display */}
      {categories.length > 0 ? (
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList className="bg-muted/60 p-1 flex-wrap h-auto">
            {categories.map((cat) => (
              <TabsTrigger key={cat} value={cat} className="capitalize text-xs font-medium px-3 py-1.5">
                {cat}
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1 py-0 h-4 min-w-4 text-center">
                  {groupedSystemSettings[cat]?.length || 0}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map((cat) => (
            <TabsContent key={cat} value={cat} className="space-y-4">
              <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="capitalize text-lg flex items-center gap-2">
                      {cat} Settings
                    </CardTitle>
                    <CardDescription>
                      Manage system configurations related to {cat.toLowerCase()}.
                    </CardDescription>
                  </div>
                  {cat.toLowerCase() === 'smtp' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2 text-xs font-medium border-primary/40 hover:border-primary text-primary hover:bg-primary/10 shrink-0"
                      disabled={sendingTestEmail}
                      onClick={handleSendTestEmail}
                    >
                      {sendingTestEmail ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Mail className="h-4 w-4" />
                      )}
                      {sendingTestEmail ? 'Sending...' : 'Send Test Email'}
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {groupedSystemSettings[cat]?.map((setting) => {
                    const label = formatKeyLabel(setting.key);
                    const isSaving = savingKey === setting.key;

                    if (setting.data_type === 'boolean') {
                      return (
                        <div
                          key={setting.key}
                          className="flex items-center justify-between rounded-lg border p-4 bg-card hover:bg-accent/20 transition-colors"
                        >
                          <div className="space-y-1 max-w-xl">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-foreground">{label}</p>
                              {setting.is_public ? (
                                <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-200 dark:border-blue-800 flex items-center gap-1">
                                  <Globe className="h-3 w-3" /> Public
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Lock className="h-3 w-3" /> Internal
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {setting.description || 'No description provided.'}
                            </p>
                            <code className="text-[11px] font-mono text-muted-foreground/80">
                              {setting.key}
                            </code>
                          </div>
                          <SwitchField
                            label=""
                            description=""
                            checked={setting.value === 'true'}
                            disabled={!canManage || isSaving}
                            onCheckedChange={(val) => updateSystemSetting(setting, val.toString())}
                          />
                        </div>
                      );
                    }

                    return (
                      <div
                        key={setting.key}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border p-4 bg-card hover:bg-accent/20 transition-colors"
                      >
                        <div className="space-y-1 max-w-md">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">{label}</p>
                            {setting.is_public ? (
                              <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-200 dark:border-blue-800 flex items-center gap-1">
                                <Globe className="h-3 w-3" /> Public
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Lock className="h-3 w-3" /> Internal
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {setting.description || 'No description provided.'}
                          </p>
                          <code className="text-[11px] font-mono text-muted-foreground/80">
                            {setting.key}
                          </code>
                        </div>

                        <div className="flex w-full sm:w-auto items-center space-x-2">
                          <Input
                            type={setting.data_type === 'password' ? 'password' : 'text'}
                            value={localValues[setting.key] ?? ''}
                            disabled={!canManage || isSaving}
                            onChange={(e) => handleLocalChange(setting.key, e.target.value)}
                            className="h-9 w-full sm:w-64 bg-background text-sm font-mono"
                          />
                          {canManage && (
                            <Button
                              size="sm"
                              className="h-9 gap-1.5 text-xs font-medium"
                              disabled={isSaving || (localValues[setting.key] ?? '') === (setting.value ?? '')}
                              onClick={() =>
                                updateSystemSetting(setting, localValues[setting.key] ?? '')
                              }
                            >
                              {isSaving ? (
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Save className="h-3.5 w-3.5" />
                              )}
                              Save
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground space-y-3">
            <SlidersHorizontal className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <p className="text-sm font-medium">No system settings found.</p>
            {searchQuery && (
              <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')} className="text-xs">
                Clear search query
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
