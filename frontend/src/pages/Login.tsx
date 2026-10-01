import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { authApi } from '@/api/authApi';
import type { LoginRequest } from '@/types/api';

interface RegistrationState {
  registeredEmail?: string;
  status?: string;
}

export function Login() {
  const { login, finishLogin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const regState = (location.state ?? {}) as RegistrationState;
  
  const [email, setEmail] = useState(regState.registeredEmail ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 2FA State
  const [requires2FA, setRequires2FA] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const credentials: LoginRequest = { email, password };
      const response = await login(credentials);
      
      if (response && response.requires_2fa) {
        setRequires2FA(true);
        setSessionToken(response.session_token);
        setIsLoading(false);
        return;
      }

      await finishLogin(response.access_token, response.refresh_token);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to sign in. Please check your credentials and try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionToken || otpCode.length !== 6) return;

    setError(null);
    setIsLoading(true);
    
    try {
      const response = await authApi.verify2FA({ session_token: sessionToken, otp: otpCode });
      const tokenData = response.data.data;
      if (!tokenData) throw new Error('No token data received');
      
      const { access_token, refresh_token } = tokenData;
      await finishLogin(access_token, refresh_token);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Invalid 2FA code. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-soft px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <GraduationCap className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Synergy CMS</h1>
          <p className="text-sm text-muted-foreground">
            Campus Management System
          </p>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-xl">{requires2FA ? 'Two-Factor Authentication' : 'Sign in'}</CardTitle>
            <CardDescription>
              {requires2FA ? 'Enter the 6-digit code sent to your email.' : 'Enter your credentials to access the dashboard'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!requires2FA ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@synergyinstitute.net"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      disabled={isLoading}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                      <span className="sr-only">
                        {showPassword ? 'Hide password' : 'Show password'}
                      </span>
                    </Button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || !email || !password}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign in'
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handle2FASubmit} className="space-y-6">
                <div className="flex justify-center">
                  <InputOTP 
                    maxLength={6} 
                    value={otpCode}
                    onChange={(val) => setOtpCode(val)}
                    disabled={isLoading}
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
                </div>
                
                {error && (
                  <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setRequires2FA(false);
                      setSessionToken(null);
                      setOtpCode('');
                      setError(null);
                    }}
                    disabled={isLoading}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading || otpCode.length !== 6}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify'
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {!requires2FA && (
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Don't have an account?</p>
            <a
              href="/register"
              className="font-medium text-primary hover:underline"
            >
              Register as a student
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
