import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/api/authApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Loader2, AlertCircle, CheckCircle2, Key, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { getErrorMessage } from '@/lib/error-utils';
import { toast } from 'sonner';

export function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStep1Request = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      await authApi.forgotPassword({ email });
      toast.success('OTP sent! Please check your email inbox.');
      setStep(2);
    } catch (err: any) {
      setError(getErrorMessage(err, 'Failed to request password reset OTP.'));
    } finally {
      setLoading(false);
    }
  };

  const handleStep2Reset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!otp || otp.length !== 6 || !newPassword) {
      setError('Please enter the 6-digit OTP code and a new password.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword({ email, otp, new_password: newPassword });
      toast.success('Password reset successfully! You can now log in.');
      navigate('/login', { state: { registeredEmail: email } });
    } catch (err: any) {
      setError(getErrorMessage(err, 'Invalid or expired OTP code.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
      <Card className="w-full max-w-md shadow-card bg-card text-card-foreground border-border rounded-2xl overflow-hidden">
        <CardHeader className="text-center space-y-2 pb-6 border-b border-border">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-md">
            <GraduationCap className="w-7 h-7" />
          </div>
          <CardTitle className="text-2xl font-bold font-editorial tracking-tight text-foreground">
            {step === 1 ? 'Reset Password' : 'Set New Password'}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {step === 1 ? 'Enter your email to receive a password reset OTP' : `Enter the 6-digit OTP sent to ${email}`}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          {error && (
            <div className="mb-4 p-3.5 bg-destructive/10 border border-destructive/30 text-destructive text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleStep1Request} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-foreground">Registered Email Address</Label>
                <Input
                  type="email"
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="rounded-xl bg-background border-input text-foreground"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium py-2.5 rounded-xl transition-all shadow-md"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Send Reset OTP
              </Button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleStep2Reset} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-foreground">Enter 6-Digit OTP</Label>
                <div className="relative">
                  <Input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.trim())}
                    required
                    className="rounded-xl text-center font-mono text-lg tracking-widest bg-background border-input text-foreground pl-10"
                  />
                  <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-foreground">New Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="rounded-xl pr-10 bg-background border-input text-foreground"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium py-2.5 rounded-xl transition-all shadow-md"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Reset Password
              </Button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Change Email
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
