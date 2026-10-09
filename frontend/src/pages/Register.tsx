import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/api/authApi';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  GraduationCap, 
  Loader2, 
  AlertCircle, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  Mail, 
  Key, 
  Edit2, 
  PartyPopper, 
  Sparkles 
} from 'lucide-react';
import { getErrorMessage } from '@/lib/error-utils';
import { triggerPartyPopper } from '@/lib/confetti';
import { toast } from 'sonner';

export function Register() {
  const navigate = useNavigate();
  const { user, finishLogin } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [countdown, setCountdown] = useState(3);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If user is already logged in before starting signup, redirect to dashboard
  useEffect(() => {
    if (user && step === 1) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, step, navigate]);

  // Handle Step 3 Celebration & 3-2-1 Countdown Timer
  useEffect(() => {
    if (step !== 3) return;

    // Trigger Party Popper Blast immediately when entering Step 3
    triggerPartyPopper();

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/dashboard', { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [step, navigate]);

  const handleChangeEmail = () => {
    setStep(1);
    setError(null);
    setOtp('');
  };

  const isEmailExistsError = (msg: string) => {
    const lower = msg.toLowerCase();
    return (
      lower.includes('already') ||
      lower.includes('exist') ||
      lower.includes('registered') ||
      lower.includes('duplicate')
    );
  };

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name || !email || !password) {
      setError('Please fill out all fields.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.openSignup({ email, password, name });
      if (!res.data.success || !res.data.data?.session_token) {
        const errMessage = res.data.error || 'Registration failed.';
        if (isEmailExistsError(errMessage)) {
          toast.info('Account already registered. Redirecting to login...');
          navigate('/login', {
            state: {
              registeredEmail: email,
              message: 'An account with this email already exists! Please log in to continue.',
            },
          });
          return;
        }
        setError(errMessage);
        return;
      }
      setSessionToken(res.data.data.session_token);
      setStep(2);
    } catch (err: any) {
      const errMessage = getErrorMessage(err, 'Registration failed.');
      if (isEmailExistsError(errMessage)) {
        toast.info('Account already registered. Redirecting to login...');
        navigate('/login', {
          state: {
            registeredEmail: email,
            message: 'An account with this email already exists! Please log in to continue.',
          },
        });
        return;
      }
      setError(errMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleStep2Verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!otp || !sessionToken) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.verifySignupOtp({
        email,
        otp,
        session_token: sessionToken,
        name,
        password
      });

      if (!res.data.success || !res.data.data) {
        setError(res.data.error || 'Invalid or expired OTP code. Please try again.');
        return;
      }

      const tokenData = res.data.data;
      if (tokenData?.access_token && tokenData?.refresh_token) {
        toast.success('Account created! Welcome to CampusOne 🎉');
        setStep(3); // Switch to celebration & countdown step!
        await finishLogin(tokenData.access_token, tokenData.refresh_token);
      } else {
        setError(res.data.error || 'Failed to complete login. Please try logging in.');
      }
    } catch (err: any) {
      setError(getErrorMessage(err, 'Invalid or expired OTP code. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
      <Card className="w-full max-w-md shadow-card bg-card text-card-foreground border-border rounded-2xl overflow-hidden">
        <CardHeader className="text-center space-y-2 pb-6 border-b border-border">
          <div className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center shadow-md">
            {step === 3 ? (
              <div className="w-full h-full bg-primary text-primary-foreground rounded-2xl flex items-center justify-center">
                <PartyPopper className="w-7 h-7" />
              </div>
            ) : (
              <img src="/android-chrome-192x192.png" alt="CampusOne Logo" className="w-full h-full rounded-2xl object-contain" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold font-editorial tracking-tight text-foreground">
            {step === 3 ? 'Welcome Aboard! 🎉' : 'Create Account'}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {step === 1 && 'Enter your details to sign up for CampusOne'}
            {step === 2 && 'Email verification required'}
            {step === 3 && 'Your account has been successfully created'}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          {error && step !== 3 && (
            <div className="mb-4 p-3.5 bg-destructive/10 border border-destructive/30 text-destructive text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-foreground">Full Name</Label>
                <Input
                  placeholder="e.g. Rahul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="rounded-xl bg-background border-input text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-foreground">Email Address</Label>
                <Input
                  type="email"
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="rounded-xl bg-background border-input text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-foreground">Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Send Verification OTP
              </Button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Already have an account? Sign in
                </button>
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleStep2Verify} className="space-y-4">
              <div className="p-4 bg-secondary/50 rounded-xl border border-border text-center space-y-2">
                <Mail className="w-8 h-8 text-primary mx-auto" />
                <h4 className="font-bold text-foreground text-sm font-editorial">Check your inbox</h4>
                <p className="text-xs text-muted-foreground">
                  Enter the 6-digit OTP code sent to:
                </p>
                <div className="flex items-center justify-center gap-2 pt-0.5">
                  <span className="text-xs font-semibold text-foreground px-2.5 py-1 bg-background rounded-md border border-border font-mono">
                    {email}
                  </span>
                  <button
                    type="button"
                    onClick={handleChangeEmail}
                    className="text-xs text-primary hover:underline font-medium flex items-center gap-1 bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-md transition-colors"
                    title="Change email address"
                  >
                    <Edit2 className="w-3 h-3" /> Change
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-foreground">Enter OTP Code</Label>
                <div className="relative">
                  <Input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.trim())}
                    required
                    className="rounded-xl text-center font-mono text-lg tracking-widest bg-background border-input text-foreground"
                  />
                  <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium py-2.5 rounded-xl transition-all shadow-md"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2 text-primary-foreground" />}
                Verify & Create Account
              </Button>

              <div className="text-center pt-2 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={handleChangeEmail}
                  className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Change email / Back to details
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <div className="text-center space-y-6 py-2">
              <div className="relative mx-auto w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center text-primary shadow-lg">
                <PartyPopper className="w-10 h-10 animate-bounce text-primary" />
                <Sparkles className="w-5 h-5 absolute -top-1 -right-1 text-amber-500 animate-pulse" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl font-bold font-editorial text-foreground">
                  Account Verified! 🎉
                </h3>
                <p className="text-xs text-muted-foreground">
                  Welcome to CampusOne, <strong className="text-foreground">{name || email}</strong>!
                </p>
              </div>

              {/* Animated 3-2-1 Countdown Display */}
              <div className="p-5 bg-secondary/50 rounded-2xl border border-border space-y-2 shadow-inner">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-serif text-3xl font-extrabold shadow-md transform transition-transform duration-300 scale-105">
                  {countdown}
                </div>
                <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Redirecting to dashboard in {countdown} {countdown === 1 ? 'second' : 'seconds'}...
                </p>
              </div>

              <Button
                onClick={() => navigate('/dashboard', { replace: true })}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
              >
                Go to Dashboard Now <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
