import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Loader2, AlertCircle, Eye, EyeOff, Key } from 'lucide-react';
import { authApi } from '@/api/authApi';
import type { LoginRequest } from '@/types/api';

interface RegistrationState {
  registeredEmail?: string;
  status?: string;
}

export function Login() {
  const { user, login, finishLogin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const regState = (location.state ?? {}) as RegistrationState;

  React.useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);
  
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
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
      <Card className="w-full max-w-md shadow-card bg-card text-card-foreground border-border rounded-2xl">
        <CardHeader className="text-center space-y-2 pb-6 border-b border-border">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-md">
            <GraduationCap className="w-7 h-7" />
          </div>
          <CardTitle className="text-2xl font-bold font-editorial tracking-tight text-foreground">
            {requires2FA ? 'Two-Factor Authentication' : 'Welcome Back'}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {requires2FA ? 'Enter the 6-digit code sent to your email' : 'Sign in to access your BPUT CMS Dashboard'}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          {error && (
            <div className="mb-4 p-3.5 bg-destructive/10 border border-destructive/30 text-destructive text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!requires2FA ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-foreground">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  disabled={isLoading}
                  className="rounded-xl bg-background border-input text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-foreground">Password</Label>
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
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium py-2.5 rounded-xl transition-all shadow-md"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Sign In
              </Button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Don't have an account? Sign up
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handle2FASubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-foreground">Enter 2FA Code</Label>
                <div className="relative">
                  <Input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.trim())}
                    required
                    disabled={isLoading}
                    className="rounded-xl text-center font-mono text-lg tracking-widest bg-background border-input text-foreground pl-10"
                  />
                  <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading || otpCode.length !== 6}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium py-2.5 rounded-xl transition-all shadow-md"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Verify & Login
              </Button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setRequires2FA(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
