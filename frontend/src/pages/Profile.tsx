import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/api/authApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Camera, Mail, Shield, Edit2, Loader2, Check, X, Copy, Key, ShieldCheck, LogOut, Bell, Smartphone, Eye, EyeOff } from 'lucide-react';
import { ROLE_LABELS } from '@/lib/navigation';
import { toast } from 'sonner';
import { ProfilePhotoCropper } from '@/components/shared/ProfilePhotoCropper';
import { PasswordRequirements } from '@/components/shared/PasswordRequirements';

export function Profile() {
  const { user, role, refreshUser, logout } = useAuth();
  
  // General Tab State
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImageSrc, setCropperImageSrc] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  
  const [isEditingUserId, setIsEditingUserId] = useState(false);
  const [editUserIdValue, setEditUserIdValue] = useState('');
  const [isSavingUserId, setIsSavingUserId] = useState(false);
  const [userIdError, setUserIdError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Security Tab State
  const [currentPassword, setCurrentPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);

  // Preferences Tab State
  const [emailNotifs, setEmailNotifs] = useState(user?.email_notifications ?? true);
  const [appNotifs, setAppNotifs] = useState(user?.in_app_alerts ?? true);

  useEffect(() => {
    if (user) {
      setEmailNotifs(user.email_notifications ?? true);
      setAppNotifs(user.in_app_alerts ?? true);
    }
  }, [user]);

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

  const handleUpdateUserId = async () => {
    if (!editUserIdValue.trim() || editUserIdValue === user.user_id) {
      setIsEditingUserId(false);
      setUserIdError(null);
      return;
    }
    setIsSavingUserId(true);
    setUserIdError(null);
    try {
      await authApi.updateUserId({ user_id: editUserIdValue });
      await refreshUser();
      toast.success('User ID updated successfully');
      setIsEditingUserId(false);
    } catch (err: any) {
      if (err.response?.data?.error === "User ID is already taken") {
        setUserIdError("User ID is already taken");
      } else {
        toast.error('Failed to update User ID');
      }
    } finally {
      setIsSavingUserId(false);
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
    
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long');
      return;
    }

    setIsChangingPassword(true);
    try {
      await authApi.changePassword({ current_password: currentPassword, new_password: newPassword });
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to change password. Check your current password.';
      toast.error(errorMsg);
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
              {/* Left Side: Avatar and Role */}
              <div className="flex flex-col items-center gap-6 border-b md:border-b-0 md:border-r border-border pb-8 md:pb-0 md:pr-8 md:w-64">
                <div className="relative">
                  <Avatar className="h-32 w-32 border-4 border-background shadow-md">
                    <AvatarImage src={user.photo_url ?? undefined} alt={user.name ?? ''} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform hover:scale-110"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="h-5 w-5" />
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

                {role && (
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Primary Role</span>
                    <div className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 shadow-sm border border-border/50">
                      <Shield className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold text-foreground">
                        {ROLE_LABELS[role]}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Side: Account Details Grid */}
              <div className="flex-1 flex flex-col pl-0 md:pl-4">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-foreground">Personal Information</h3>
                  <p className="text-sm text-muted-foreground">Basic info, like your name and email.</p>
                </div>
                
                <div className="grid gap-6 border-b border-border pb-8">
                  {/* Name Field */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 items-center">
                    <div className="text-sm font-medium text-muted-foreground">Full Name</div>
                    <div className="md:col-span-2">
                      {isEditingName ? (
                        <div className="flex items-center gap-2 max-w-sm">
                          <Input 
                            value={editNameValue} 
                            onChange={(e) => setEditNameValue(e.target.value)} 
                            className="h-9"
                            placeholder="Enter your name"
                            disabled={isSavingName}
                          />
                          <Button size="icon" variant="ghost" className="h-9 w-9 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100" onClick={handleUpdateName} disabled={isSavingName}>
                            {isSavingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          </Button>
                          <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground hover:text-red-700 hover:bg-red-100" onClick={() => setIsEditingName(false)} disabled={isSavingName}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-foreground">{user.name || 'Not provided'}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => { setEditNameValue(user.name || ''); setIsEditingName(true); }}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Email Field */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 items-center">
                    <div className="text-sm font-medium text-muted-foreground">Email Address</div>
                    <div className="md:col-span-2">
                      <span className="text-sm text-foreground">{user.email}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 mb-6">
                  <h3 className="text-lg font-semibold text-foreground">System Information</h3>
                  <p className="text-sm text-muted-foreground">Identifiers and status within the platform.</p>
                </div>

                <div className="grid gap-6">
                  {/* User ID Field */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 items-center">
                    <div className="text-sm font-medium text-muted-foreground">Registration / User ID</div>
                    <div className="md:col-span-2">
                      {isEditingUserId ? (
                        <div className="flex flex-col gap-1 max-w-sm">
                          <div className="flex items-center gap-2">
                            <Input 
                              value={editUserIdValue} 
                              onChange={(e) => { setEditUserIdValue(e.target.value); setUserIdError(null); }} 
                              className={`h-9 font-mono text-sm ${userIdError ? 'border-red-500' : ''}`}
                              placeholder="Enter User ID"
                              disabled={isSavingUserId}
                            />
                            <Button size="icon" variant="ghost" className="h-9 w-9 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 shrink-0" onClick={handleUpdateUserId} disabled={isSavingUserId}>
                              {isSavingUserId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            </Button>
                            <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground hover:text-red-700 hover:bg-red-100 shrink-0" onClick={() => { setIsEditingUserId(false); setUserIdError(null); }} disabled={isSavingUserId}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          {userIdError && <span className="text-xs text-red-500">{userIdError}</span>}
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-mono bg-muted px-2 py-1 rounded-md border text-muted-foreground">
                            {user.user_id || 'Not Set'}
                          </span>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => { setEditUserIdValue(user.user_id || ''); setIsEditingUserId(true); }}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* UUID Field */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 items-center">
                    <div className="text-sm font-medium text-muted-foreground">System UUID</div>
                    <div className="md:col-span-2 flex items-center gap-3">
                      <span className="text-xs font-mono text-muted-foreground truncate max-w-[200px] sm:max-w-xs">{user.id}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopyId} title="Copy UUID">
                        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>

                  {/* Status Field */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 items-center">
                    <div className="text-sm font-medium text-muted-foreground">Account Status</div>
                    <div className="md:col-span-2">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-card">
                        <div className={`h-2 w-2 rounded-full ${user.account_status === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} />
                        <span className="text-sm font-medium capitalize text-foreground">{user.account_status}</span>
                      </div>
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
                <div className="relative">
                  <Input 
                    type={showCurrentPassword ? 'text' : 'password'} 
                    placeholder="Current Password" 
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    tabIndex={-1}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    <span className="sr-only">
                      {showCurrentPassword ? 'Hide password' : 'Show password'}
                    </span>
                  </Button>
                </div>
              </div>
              <div className="space-y-2 max-w-sm">
                <div className="relative">
                  <Input 
                    type={showNewPassword ? 'text' : 'password'} 
                    placeholder="New Password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    tabIndex={-1}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    <span className="sr-only">
                      {showNewPassword ? 'Hide password' : 'Show password'}
                    </span>
                  </Button>
                </div>
                <PasswordRequirements password={newPassword} className="mt-2" />
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
                  <p className="text-sm font-medium text-foreground">Sign Out</p>
                  <p className="text-xs text-muted-foreground">Log out of your account on this device.</p>
                </div>
                <Button variant="destructive" size="sm" onClick={() => logout()}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Log Out
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
                  onCheckedChange={async (val) => {
                    setEmailNotifs(val);
                    try {
                      await authApi.updatePreferences({ email_notifications: val });
                      await refreshUser();
                      toast.success('Email preferences updated');
                    } catch {
                      setEmailNotifs(!val);
                      toast.error('Failed to update email preferences');
                    }
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
                  onCheckedChange={async (val) => {
                    setAppNotifs(val);
                    try {
                      await authApi.updatePreferences({ in_app_alerts: val });
                      await refreshUser();
                      toast.success('In-App alerts updated');
                    } catch {
                      setAppNotifs(!val);
                      toast.error('Failed to update in-app alerts');
                    }
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
