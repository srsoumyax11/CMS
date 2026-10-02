import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/api/authApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp';
import { Camera, Mail, Shield, Edit2, Loader2, Check, X, Copy, Key, ShieldCheck, LogOut, Bell, Smartphone, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { ROLE_LABELS } from '@/lib/navigation';
import { toast } from 'sonner';
import { ProfilePhotoCropper } from '@/components/shared/ProfilePhotoCropper';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { getErrorMessage } from '@/lib/error-utils';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function Profile() {
  const { user, role, refreshUser, logout } = useAuth();
  
  // General Tab State
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImageSrc, setCropperImageSrc] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [editEmailValue, setEditEmailValue] = useState('');
  const [editUserIdValue, setEditUserIdValue] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [userIdError, setUserIdError] = useState<string | null>(null);
  
  // OTP State
  const [otpSessionToken, setOtpSessionToken] = useState<string | null>(null);
  const [otpValue, setOtpValue] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Security Tab State
  const [currentPassword, setCurrentPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  const [is2FAEnabled, setIs2FAEnabled] = useState(user?.is_2fa_enabled ?? false);
  const [twoFaSessionToken, setTwoFaSessionToken] = useState<string | null>(null);
  const [twoFaOtpValue, setTwoFaOtpValue] = useState('');
  const [isVerifyingTwoFaOtp, setIsVerifyingTwoFaOtp] = useState(false);
  const [isDisableModalOpen, setIsDisableModalOpen] = useState(false);

  // Preferences Tab State
  const [emailNotifs, setEmailNotifs] = useState(user?.email_notifications ?? true);
  const [appNotifs, setAppNotifs] = useState(user?.in_app_alerts ?? true);

  useEffect(() => {
    if (user) {
      setEmailNotifs(user.email_notifications ?? true);
      setAppNotifs(user.in_app_alerts ?? true);
      setIs2FAEnabled(user.is_2fa_enabled ?? false);
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

  const handleEditProfile = () => {
    setEditNameValue(user.name || '');
    setEditEmailValue(user.email || '');
    setEditUserIdValue(user.user_id || '');
    setUserIdError(null);
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    setUserIdError(null);
    let success = true;
    let emailUpdateRequested = false;

    try {
      // 1. Update Name
      if (editNameValue.trim() !== user.name) {
        await authApi.updateName({ name: editNameValue.trim() });
      }

      // 2. Update User ID
      if (editUserIdValue.trim() !== user.user_id) {
        try {
          await authApi.updateUserId({ user_id: editUserIdValue.trim() });
        } catch (err: any) {
          if (err.response?.data?.error === "User ID is already taken") {
            setUserIdError("User ID is already taken");
            success = false;
          } else {
            toast.error('Failed to update User ID');
            success = false;
          }
        }
      }

      // 3. Update Email
      if (editEmailValue.trim() !== user.email && success) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(editEmailValue)) {
          toast.error('Please enter a valid email address');
          success = false;
        } else {
          try {
            const res = await authApi.requestEmailUpdate({ new_email: editEmailValue.trim() });
            if (res.data.data?.session_token) {
              setOtpSessionToken(res.data.data.session_token);
              emailUpdateRequested = true;
              toast.success(`Verification code sent to ${editEmailValue.trim()}`);
            }
          } catch (err: any) {
            toast.error(getErrorMessage(err, 'Failed to request email update'));
            success = false;
          }
        }
      }

      if (success && !emailUpdateRequested) {
        await refreshUser();
        toast.success('Profile updated successfully');
        setIsEditingProfile(false);
      }
    } catch (err) {
      toast.error('An error occurred while saving profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpValue.length !== 6 || !otpSessionToken) return;
    
    setIsVerifyingOtp(true);
    try {
      await authApi.verifyEmailUpdate({ otp: otpValue, session_token: otpSessionToken });
      toast.success('Email updated successfully');
      setOtpSessionToken(null);
      setOtpValue('');
      await refreshUser();
      setIsEditingProfile(false);
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Invalid verification code'));
    } finally {
      setIsVerifyingOtp(false);
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

  const handleToggle2FA = async (enable: boolean) => {
    if (enable) {
      try {
        const response = await authApi.enable2FARequest();
        if (response.data.data?.session_token) {
          setTwoFaSessionToken(response.data.data.session_token);
          toast.success('Verification code sent to your email');
        }
      } catch (err: any) {
        toast.error(getErrorMessage(err, 'Failed to request 2FA enablement'));
      }
    } else {
      setIsDisableModalOpen(true);
    }
  };

  const executeDisable2FA = async () => {
    try {
      await authApi.disable2FA();
      await refreshUser();
      toast.success('Two-Factor Authentication disabled');
      setIsDisableModalOpen(false);
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Failed to disable 2FA'));
    }
  };

  const handleVerify2FA = async () => {
    if (twoFaOtpValue.length !== 6 || !twoFaSessionToken) return;
    setIsVerifyingTwoFaOtp(true);
    try {
      await authApi.enable2FAVerify({ otp: twoFaOtpValue, session_token: twoFaSessionToken });
      setTwoFaSessionToken(null);
      setTwoFaOtpValue('');
      await refreshUser();
      toast.success('Two-Factor Authentication enabled successfully');
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Invalid verification code'));
    } finally {
      setIsVerifyingTwoFaOtp(false);
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
      <PageHeader
        title="Account Control Center"
        description="Manage your profile, security settings, and notifications."
      />

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
                {otpSessionToken ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Mail className="h-12 w-12 text-primary mb-4" />
                    <h3 className="text-xl font-bold text-foreground mb-2">Verify Email Change</h3>
                    <p className="text-sm text-muted-foreground text-center mb-6 max-w-sm">
                      We've sent a 6-digit verification code to <strong>{editEmailValue}</strong>. 
                      Please enter it below to confirm your new email address.
                    </p>
                    
                    <div className="mb-6">
                      <InputOTP 
                        maxLength={6} 
                        value={otpValue} 
                        onChange={setOtpValue}
                        disabled={isVerifyingOtp}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                        </InputOTPGroup>
                        <InputOTPSeparator />
                        <InputOTPGroup>
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Button variant="outline" onClick={() => { setOtpSessionToken(null); setIsEditingProfile(true); }} disabled={isVerifyingOtp}>
                        Cancel
                      </Button>
                      <Button onClick={handleVerifyOtp} disabled={otpValue.length !== 6 || isVerifyingOtp}>
                        {isVerifyingOtp ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                        Verify & Update
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-6 flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">Personal Information</h3>
                        <p className="text-sm text-muted-foreground">Basic info, like your name and email.</p>
                      </div>
                      {isEditingProfile ? (
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setIsEditingProfile(false)} disabled={isSavingProfile}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleSaveProfile} disabled={isSavingProfile} className="gap-2">
                        {isSavingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        Save
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" onClick={handleEditProfile} className="gap-2">
                      <Edit2 className="h-4 w-4" /> Edit Profile
                    </Button>
                  )}
                </div>
                
                <div className="grid gap-6 border-b border-border pb-8">
                  {/* Name Field */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 items-center">
                    <div className="text-sm font-medium text-muted-foreground">Full Name</div>
                    <div className="md:col-span-2">
                      {isEditingProfile ? (
                        <Input 
                          value={editNameValue} 
                          onChange={(e) => setEditNameValue(e.target.value)} 
                          className="h-9 max-w-sm"
                          placeholder="Enter your name"
                          disabled={isSavingProfile}
                        />
                      ) : (
                        <span className="text-sm font-semibold text-foreground">{user.name || 'Not provided'}</span>
                      )}
                    </div>
                  </div>

                  {/* Email Field */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 items-center">
                    <div className="text-sm font-medium text-muted-foreground">Email Address</div>
                    <div className="md:col-span-2">
                      {isEditingProfile ? (
                        <Input 
                          type="email"
                          value={editEmailValue} 
                          onChange={(e) => setEditEmailValue(e.target.value)} 
                          className="h-9 max-w-sm"
                          placeholder="Enter your new email"
                          disabled={isSavingProfile}
                        />
                      ) : (
                        <span className="text-sm text-foreground">{user.email}</span>
                      )}
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
                      {isEditingProfile ? (
                        <div className="flex flex-col gap-1 max-w-sm">
                          <Input 
                            value={editUserIdValue} 
                            onChange={(e) => { setEditUserIdValue(e.target.value); setUserIdError(null); }} 
                            className={`h-9 font-mono text-sm ${userIdError ? 'border-red-500' : ''}`}
                            placeholder="Enter User ID"
                            disabled={isSavingProfile}
                          />
                          {userIdError && <span className="text-xs text-red-500">{userIdError}</span>}
                        </div>
                      ) : (
                        <span className="text-sm font-mono bg-muted px-2 py-1 rounded-md border text-muted-foreground">
                          {user.user_id || 'Not Set'}
                        </span>
                      )}
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
                </>
              )}
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
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Two-Factor Authentication (2FA)</p>
                    <p className="text-xs text-muted-foreground">Protect your account with an email OTP code.</p>
                  </div>
                  <Switch 
                    checked={is2FAEnabled}
                    onCheckedChange={(val) => {
                      if (!twoFaSessionToken) {
                        handleToggle2FA(val);
                      }
                    }}
                    disabled={!!twoFaSessionToken}
                  />
                </div>
                
                {twoFaSessionToken && (
                  <div className="bg-muted p-4 rounded-md space-y-4">
                    <p className="text-sm text-foreground">Enter the 6-digit code sent to your email to enable 2FA:</p>
                    <div className="flex flex-col items-center gap-4">
                      <InputOTP 
                        maxLength={6} 
                        value={twoFaOtpValue}
                        onChange={(val) => setTwoFaOtpValue(val)}
                        disabled={isVerifyingTwoFaOtp}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            setTwoFaSessionToken(null);
                            setTwoFaOtpValue('');
                          }}
                          disabled={isVerifyingTwoFaOtp}
                        >
                          Cancel
                        </Button>
                        <Button 
                          size="sm"
                          disabled={twoFaOtpValue.length !== 6 || isVerifyingTwoFaOtp}
                          onClick={handleVerify2FA}
                        >
                          {isVerifyingTwoFaOtp ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Verify & Enable
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
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

      <AlertDialog open={isDisableModalOpen} onOpenChange={setIsDisableModalOpen}>
        <AlertDialogContent className="border-destructive/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              Disable Two-Factor Authentication?
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-3">
              <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive-foreground">
                <p className="text-muted-foreground">
                  Disabling 2FA will make your account significantly less secure. You will only need your password to sign in, exposing your account to greater risk of unauthorized access.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel disabled={isSavingProfile}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                executeDisable2FA();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, disable 2FA
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
