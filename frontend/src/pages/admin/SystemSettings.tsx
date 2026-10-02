import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Save } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { SwitchField } from '@/components/shared/form/SwitchField';
import { toast } from 'sonner';
import { adminApi } from '@/api/adminApi';
import type { SystemSetting } from '@/types/api';
import { getErrorMessage } from '@/lib/error-utils';

export default function SystemSettings() {
  const [searchParams] = useSearchParams();
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);

  // Track local edits for non-boolean inputs before saving
  const [localValues, setLocalValues] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getSystemSettings();
      if (res.data.success && res.data.data) {
        setSettings(res.data.data);
        const locals: Record<string, string> = {};
        res.data.data.forEach((s) => {
          if (s.data_type !== 'boolean') {
            locals[s.key] = s.value || '';
          }
        });
        setLocalValues(locals);
      }
    } catch (error: any) {
      toast.error(getErrorMessage(error, 'Failed to fetch settings'));
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: string) => {
    try {
      const res = await adminApi.updateSystemSetting(key, { value });
      if (res.data.success && res.data.data) {
        const updatedSetting = res.data.data;
        setSettings((prev) => prev.map((s) => (s.key === key ? updatedSetting : s)));
        toast.success('Setting updated successfully');
      }
    } catch (error: any) {
      toast.error(getErrorMessage(error, 'Failed to update setting'));
      fetchSettings();
    }
  };

  const handleLocalChange = (key: string, value: string) => {
    setLocalValues((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div>
          <div className="h-8 w-48 bg-muted rounded"></div>
          <div className="mt-2 h-4 w-96 bg-muted rounded"></div>
        </div>
        <div className="h-[200px] bg-muted rounded-xl"></div>
      </div>
    );
  }

  // Group settings by category
  const groupedSettings = settings.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = [];
    }
    acc[setting.category].push(setting);
    return acc;
  }, {} as Record<string, SystemSetting[]>);

  const categories = Object.keys(groupedSettings).sort();

  const initialTab = searchParams.get('tab')
    ? categories.find((c) => c.toLowerCase() === searchParams.get('tab')?.toLowerCase()) ||
      categories[0]
    : categories[0];

  const formatKeyLabel = (key: string) =>
    key
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

  return (
    <div className="space-y-6">
      <PageHeader />

      {categories.length > 0 ? (
        <Tabs defaultValue={initialTab} className="space-y-4">
          <TabsList className="bg-muted/60 p-1">
            {categories.map((cat) => (
              <TabsTrigger key={cat} value={cat} className="capitalize text-xs font-medium">
                {cat}
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map((cat) => (
            <TabsContent key={cat} value={cat} className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="capitalize text-lg">{cat} Settings</CardTitle>
                  <CardDescription>
                    Manage system configurations related to {cat.toLowerCase()}.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {groupedSettings[cat].map((setting) => {
                    const label = formatKeyLabel(setting.key);

                    if (setting.data_type === 'boolean') {
                      return (
                        <SwitchField
                          key={setting.key}
                          label={label}
                          description={setting.description || 'No description provided.'}
                          checked={setting.value === 'true'}
                          onCheckedChange={(val) => updateSetting(setting.key, val.toString())}
                        />
                      );
                    }

                    return (
                      <div
                        key={setting.key}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border p-4 bg-card hover:bg-accent/20 transition-colors"
                      >
                        <div className="space-y-0.5 max-w-md">
                          <p className="text-sm font-semibold text-foreground">{label}</p>
                          <p className="text-xs text-muted-foreground">
                            {setting.description || 'No description provided.'}
                          </p>
                        </div>
                        <div className="flex w-full sm:w-auto items-center space-x-2">
                          <Input
                            type={setting.data_type === 'password' ? 'password' : 'text'}
                            value={localValues[setting.key] ?? ''}
                            onChange={(e) => handleLocalChange(setting.key, e.target.value)}
                            className="h-9 w-full sm:w-64 bg-background text-sm"
                          />
                          <Button
                            size="sm"
                            className="h-9 gap-1.5"
                            onClick={() =>
                              updateSetting(setting.key, localValues[setting.key] ?? '')
                            }
                          >
                            <Save className="h-4 w-4" /> Save
                          </Button>
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
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            No system settings available.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
