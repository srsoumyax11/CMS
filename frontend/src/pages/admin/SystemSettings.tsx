import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Settings, Mail, ShieldAlert, Save } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { adminApi } from '@/api/adminApi';
import type { SystemSetting } from '@/types/api';

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
        res.data.data.forEach(s => {
          if (s.data_type !== 'boolean') {
            locals[s.key] = s.value || '';
          }
        });
        setLocalValues(locals);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: string) => {
    try {
      const res = await adminApi.updateSystemSetting(key, { value });
      if (res.data.success && res.data.data) {
        const updatedSetting = res.data.data;
        setSettings(settings.map(s => s.key === key ? updatedSetting : s));
        toast.success('Setting updated successfully');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update setting');
      // Revert optimism if needed by refetching
      fetchSettings();
    }
  };

  const handleLocalChange = (key: string, value: string) => {
    setLocalValues(prev => ({ ...prev, [key]: value }));
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
    ? categories.find(c => c.toLowerCase() === searchParams.get('tab')?.toLowerCase()) || categories[0]
    : categories[0];

  const renderInput = (setting: SystemSetting) => {
    if (setting.data_type === 'boolean') {
      const isEnabled = setting.value === 'true';
      return (
        <Switch 
          checked={isEnabled} 
          onCheckedChange={(val) => updateSetting(setting.key, val.toString())}
        />
      );
    }

    return (
      <div className="flex w-full max-w-sm items-center space-x-2">
        <Input 
          type={setting.data_type === 'password' ? 'password' : 'text'}
          value={localValues[setting.key] || ''}
          onChange={(e) => handleLocalChange(setting.key, e.target.value)}
        />
        <Button size="sm" onClick={() => updateSetting(setting.key, localValues[setting.key] || '')}>
          <Save className="h-4 w-4 mr-1" /> Save
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          System Settings
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure core global settings for the CMS application.
        </p>
      </div>

      {categories.length > 0 ? (
        <Tabs defaultValue={initialTab} className="space-y-4">
          <TabsList>
            {categories.map(cat => (
              <TabsTrigger key={cat} value={cat}>{cat}</TabsTrigger>
            ))}
          </TabsList>
          
          {categories.map(cat => (
            <TabsContent key={cat} value={cat} className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{cat} Settings</CardTitle>
                  <CardDescription>
                    Manage settings related to {cat}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {groupedSettings[cat].map(setting => (
                    <div key={setting.key} className={`flex ${setting.data_type === 'boolean' ? 'items-center justify-between' : 'flex-col items-start gap-3'} rounded-lg border p-4`}>
                      <div className="space-y-0.5 max-w-[70%]">
                        <p className="text-base font-medium">{setting.key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</p>
                        <p className="text-sm text-muted-foreground">
                          {setting.description || 'No description provided.'}
                        </p>
                      </div>
                      <div className={setting.data_type !== 'boolean' ? 'w-full' : ''}>
                        {renderInput(setting)}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No system settings available.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
