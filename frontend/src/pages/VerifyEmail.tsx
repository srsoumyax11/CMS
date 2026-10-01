import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '@/api/authApi';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email address...');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. No token provided.');
      return;
    }

    const verify = async () => {
      try {
        await authApi.verifyEmailUpdate({ token } as any);
        setStatus('success');
        setMessage('Email address updated successfully!');
        
        // Refresh the user context so the app knows the new email
        await refreshUser();
        
        // Redirect to profile after a short delay
        setTimeout(() => {
          navigate('/profile');
        }, 3000);
      } catch (err: any) {
        setStatus('error');
        setMessage(err.response?.data?.error?.message || 'Verification failed. The link may have expired.');
      }
    };

    verify();
  }, [searchParams, navigate, refreshUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-8 shadow-sm text-center">
        <div className="mb-6 flex justify-center">
          {status === 'loading' && (
            <div className="h-16 w-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}
          {status === 'success' && (
            <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8" />
            </div>
          )}
          {status === 'error' && (
            <div className="h-16 w-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
              <XCircle className="h-8 w-8" />
            </div>
          )}
        </div>
        
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {status === 'loading' && 'Verifying Email'}
          {status === 'success' && 'Email Verified'}
          {status === 'error' && 'Verification Failed'}
        </h2>
        
        <p className="text-muted-foreground mb-8">
          {message}
        </p>
        
        {status === 'success' && (
          <p className="text-sm text-muted-foreground animate-pulse">
            Redirecting to your profile...
          </p>
        )}
        
        {status === 'error' && (
          <button
            onClick={() => navigate('/profile')}
            className="w-full h-10 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 transition-colors"
          >
            Return to Profile
          </button>
        )}
      </div>
    </div>
  );
}
