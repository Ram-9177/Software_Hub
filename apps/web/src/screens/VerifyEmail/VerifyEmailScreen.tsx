import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Clock, ArrowRight, RefreshCw } from 'lucide-react';
import { apiRequest } from '../../lib/api.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Logo } from '../../components/layout/Brand.js';

export const VerifyEmailScreen: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [status, setStatus] = useState<'loading' | 'success' | 'expired' | 'invalid'>('loading');
  const [message, setMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      setMessage('No verification token provided. Please check the link from your email.');
      return;
    }

    apiRequest<{ message: string }>(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then((res) => {
        setStatus('success');
        setMessage(res.message || 'Your email has been verified successfully!');
      })
      .catch((err: any) => {
        const msg = err?.message || '';
        if (msg.includes('expired')) {
          setStatus('expired');
          setMessage('This verification link has expired. Links are valid for 24 hours.');
        } else {
          setStatus('invalid');
          setMessage('This verification link is invalid or has already been used.');
        }
      });
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail) return;

    setIsResending(true);
    try {
      const res = await apiRequest<{ message: string }>('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email: resendEmail.trim() }),
      });
      setResendStatus(res.message || 'Verification email sent. Please check your inbox.');
    } catch {
      setResendStatus('If an account exists, a new verification link has been sent.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-canvas text-ink flex flex-col justify-between p-4 safe-top safe-bottom">
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md rounded-card border border-line bg-surface p-6 sm:p-8 shadow-card text-center space-y-5">
          <div className="flex justify-center mb-2">
            <Logo size="md" />
          </div>

          {status === 'loading' && (
            <div className="py-8 space-y-3">
              <div className="size-8 border-3 border-navy-200 border-t-navy-800 rounded-full animate-spin mx-auto" />
              <p className="text-xs text-ink-soft">Verifying your email address...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <div className="size-12 rounded-full bg-accent-50 border border-accent-200 flex items-center justify-center mx-auto text-accent-700">
                <CheckCircle2 className="size-6" />
              </div>
              <h1 className="font-display text-xl font-bold text-navy-800 dark:text-white">Email Verified</h1>
              <p className="text-xs text-ink-soft leading-relaxed">{message}</p>
              <div className="pt-2">
                <Button size="lg" fullWidth rightIcon={ArrowRight} onClick={() => (window.location.href = '/')}>
                  Go to Software Hub
                </Button>
              </div>
            </div>
          )}

          {status === 'expired' && (
            <div className="space-y-4">
              <div className="size-12 rounded-full bg-gold-100 border border-gold-300 flex items-center justify-center mx-auto text-gold-800">
                <Clock className="size-6" />
              </div>
              <h1 className="font-display text-xl font-bold text-navy-800 dark:text-white">Link Expired</h1>
              <p className="text-xs text-ink-soft leading-relaxed">{message}</p>

              {resendStatus ? (
                <div className="p-3 bg-accent-50 rounded-card border border-accent-200 text-xs text-accent-800">
                  {resendStatus}
                </div>
              ) : (
                <form onSubmit={handleResend} className="space-y-3 pt-2 text-left">
                  <Input
                    type="email"
                    required
                    placeholder="Enter your email to resend"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                  />
                  <Button
                    type="submit"
                    fullWidth
                    loading={isResending}
                    loadingText="Sending…"
                    leftIcon={RefreshCw}
                  >
                    Resend verification email
                  </Button>
                </form>
              )}
            </div>
          )}

          {status === 'invalid' && (
            <div className="space-y-4">
              <div className="size-12 rounded-full bg-danger-50 border border-danger-100 flex items-center justify-center mx-auto text-danger-600">
                <AlertCircle className="size-6" />
              </div>
              <h1 className="font-display text-xl font-bold text-navy-800 dark:text-white">Invalid Link</h1>
              <p className="text-xs text-ink-soft leading-relaxed">{message}</p>

              <div className="pt-2 flex flex-col gap-2">
                <Link to="/login">
                  <Button fullWidth>Sign in</Button>
                </Link>
                <Link to="/signup">
                  <Button variant="secondary" fullWidth>Create account</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailScreen;
