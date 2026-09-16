import { useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/api/authApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Camera, Mail, Shield, Edit2, Loader2, Check, X, Copy, Key, ShieldCheck, LogOut, Bell, Smartphone } from 'lucide-react';
import { ROLE_LABELS } from '@/lib/navigation';
import { toast } from 'sonner';
import { ProfilePhotoCropper } from '@/components/shared/ProfilePhotoCropper';

export function Profile() {
  const { user, role, refreshUser } = useAuth();
  
  // General Tab State
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImageSrc, setCropperImageSrc] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Security Tab State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);

  // Preferences Tab State
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [appNotifs, setAppNotifs] = useState(true);

  if (!user) return null;

  const initials = (user.name || user.email)
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleUpload = async (fileToUpload: File) => {
    setIsUploading(true);
    try {
      await authApi.uploadPhoto(fileToUpload);
      await refreshUser();
      toast.success('Profile photo updated');
    } catch {
      toast.error('Failed to upload photo');
    } finally {
      setIsUploading(false);
      if (cropperImageSrc) {
        URL.revokeObjectURL(cropperImageSrc);
      }
      setCropperImageSrc(null);
    }
  };

  const handleUpdateName = async () => {
    if (!editNameValue.trim() || editNameValue === user.name) {
      setIsEditingName(false);
      return;
    }
    setIsSavingName(true);
    try {
      await authApi.updateName({ name: editNameValue });
      await refreshUser();
      toast.success('Name updated successfully');
      setIsEditingName(false);
    } catch {
      toast.error('Failed to update name');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(user.id);
    toast.success('Admin ID copied to clipboard');
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error('Please fill in both fields');
      return;
    }
    setIsChangingPassword(true);
    try {
      await authApi.changePassword({ current_password: currentPassword, new_password: newPassword });
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
    } catch {
      toast.error('Failed to change password. Check your current password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const mockAction = (feature: string) => {
    toast.info(`${feature} is locked in the current environment`, {
      action: {
        label: 'Upgrade',
        onClick: () => toast.success('Just kidding! This is a demo mode.'),
      },
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Account Control Center</h2>
        <p className="text-sm text-muted-foreground">
          Manage your profile, security settings, and notifications.
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card className="shadow-sm">
            <CardContent className="flex flex-col md:flex-row gap-8 p-8">
              {/* Left Side: Profile Info */}
              <div className="flex flex-col items-center gap-4 border-b md:border-b-0 md:border-r border-border pb-8 md:pb-0 md:pr-8 min-w-[250px]">
                <div className="relative">
                  <Avatar className="h-24 w-24 border-4 border-background shadow-md">
                    <AvatarImage src={user.photo_url ?? undefined} alt={user.name ?? ''} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform hover:scale-110"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      if (file) {
                        const url = URL.createObjectURL(file);
                        setCropperImageSrc(url);
                        setCropperOpen(true);
                      }
                      if (e.target) e.target.value = '';
                    }}
                  />
                </div>

                <ProfilePhotoCropper
                  open={cropperOpen}
                  onOpenChange={setCropperOpen}
                  imageSrc={cropperImageSrc}
                  onCropComplete={handleUpload}
                />

                <div className="text-center w-full max-w-sm">
                  {isEditingName ? (
                    <div className="flex items-center gap-2 mb-1 justify-center">
                      <Input 
                        value={editNameValue} 
                        onChange={(e) => setEditNameValue(e.target.value)} 
                        className="h-8 text-center text-sm font-semibold max-w-[200px]"
                        placeholder="Enter your name"
                        disabled={isSavingName}
                      />
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={handleUpdateName} disabled={isSavingName}>
                        {isSavingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => setIsEditingName(false)} disabled={isSavingName}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <h3 className="text-xl font-bold text-foreground">
                        {user.name || 'Unnamed User'}
                      </h3>
                      <button 
                        onClick={() => {
                          setEditNameValue(user.name || '');
                          setIsEditingName(true);
                        }}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <p className="text-sm">{user.email}</p>
                  </div>
                </div>

                {role && (
                  <div className="flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 mt-2">
                    <Shield className="h-4 w-4 text-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      {ROLE_LABELS[role]}
                    </span>
                  </div>
                )}
              </div>

              {/* Right Side: Account Details */}
              <div className="flex-1 flex flex-col justify-center pl-0 md:pl-4">
                <h3 className="text-lg font-semibold text-foreground mb-6">Account Details</h3>
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Email Address</p>
                      <p className="text-sm text-foreground font-medium">{user.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">User ID (UUID)</p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-foreground font-medium font-mono text-xs">{user.id}</p>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyId}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded-full bg-green-500/20 flex items-center justify-center">
                      <div className={`h-2 w-2 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Account Status</p>
                      <p className="text-sm text-foreground font-medium">
                        {user.is_active ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription>Update your password to keep your account secure.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 max-w-sm">
                <Input 
                  type="password" 
                  placeholder="Current Password" 
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2 max-w-sm">
                <Input 
                  type="password" 
                  placeholder="New Password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <Button onClick={handleChangePassword} disabled={isChangingPassword}>
                {isChangingPassword ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Update Password
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Advanced Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Two-Factor Authentication (2FA)</p>
                  <p className="text-xs text-muted-foreground">Protect your account with an authenticator app.</p>
                </div>
                <Switch 
                  checked={is2FAEnabled}
                  onCheckedChange={(val) => {
                    if (val) mockAction('Two-Factor Authentication');
                    setIs2FAEnabled(false);
                  }}
                />
              </div>
              
              <div className="flex items-center justify-between border-t pt-6">
                <div>
                  <p className="text-sm font-medium text-foreground">Active Sessions</p>
                  <p className="text-xs text-muted-foreground">Log out of all other devices and browsers.</p>
                </div>
                <Button variant="destructive" size="sm" onClick={() => mockAction('Session Revocation')}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Revoke Sessions
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>Manage how you receive alerts and updates.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Email Notifications</p>
                    <p className="text-xs text-muted-foreground">Receive daily summaries and critical alerts via email.</p>
                  </div>
                </div>
                <Switch 
                  checked={emailNotifs}
                  onCheckedChange={(val) => {
                    setEmailNotifs(val);
                    mockAction('Email Notifications save');
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">In-App Alerts</p>
                    <p className="text-xs text-muted-foreground">Show alerts in the dashboard bell icon.</p>
                  </div>
                </div>
                <Switch 
                  checked={appNotifs}
                  onCheckedChange={(val) => {
                    setAppNotifs(val);
                    mockAction('In-App Alerts save');
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
