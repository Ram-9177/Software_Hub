import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.js';
import { apiRequest } from '../../lib/api.js';
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Logo } from '../../components/layout/Brand.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';

export const AcceptInviteScreen: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const { acceptInvite } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [inviteData, setInviteData] = useState<any | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setVerifyError('No invite token was supplied. Please use the complete single-use link provided in your invitation email.');
      setIsLoading(false);
      return;
    }

    async function verify() {
      try {
        const data = await apiRequest(`/invites/verify/${encodeURIComponent(token)}`);
        setInviteData(data);
      } catch (err: any) {
        setVerifyError(err.message || 'Invalid or expired invite link. Please ask your team lead for a new invite.');
      } finally {
        setIsLoading(false);
      }
    }

    verify();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (password.length < 10) {
      setSubmitError('Password must be at least 10 characters long.');
      return;
    }
    if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      setSubmitError('Password must contain at least one letter and one number.');
      return;
    }
    if (password !== confirmPassword) {
      setSubmitError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await acceptInvite(token, password);
      navigate('/', { replace: true });
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to accept invitation. Please try again or request a new invite.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-canvas text-ink flex flex-col justify-between p-4 safe-top safe-bottom">
      <header className="w-full max-w-7xl mx-auto py-4 flex items-center justify-between">
        <Logo size="md" />
        <Link
          to="/login"
          className="text-xs font-semibold text-navy-800 hover:text-navy-950 hover:underline"
        >
          Sign In instead
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center py-8">
        <div className="w-full max-w-md rounded-card border border-line bg-surface shadow-card p-6 sm:p-8">
          <div className="mb-6">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[11px] font-bold bg-gold-100 text-gold-800 ring-1 ring-inset ring-gold-300">
              <Sparkles className="size-3.5" />
              Official Invitation
            </span>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-navy-800 dark:text-white mt-2">
              Accept Institutional Invite
            </h1>
            <p className="text-xs text-ink-soft mt-1">
              Set up your secure password to activate your Software Hub account.
            </p>
          </div>

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-ink-soft">
              <div className="size-6 border-2 border-navy-800 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs">Verifying single-use invitation link...</p>
            </div>
          ) : verifyError ? (
            <div className="p-4 rounded-card bg-danger-50 border border-danger-100 text-danger-700 text-xs">
              <div className="flex items-center gap-2 font-bold mb-1">
                <AlertCircle className="size-4 text-danger-600" />
                Invite Link Invalid
              </div>
              <p>{verifyError}</p>
              <div className="mt-4 pt-3 border-t border-danger-200">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1 font-bold text-danger-700 hover:underline"
                >
                  Return to Sign In <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Invite details summary */}
              <div className="p-3.5 rounded-card bg-canvas border border-line text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-ink-soft">Invited Name:</span>
                  <span className="font-bold text-ink">{inviteData?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-soft">Email:</span>
                  <span className="font-mono text-ink">{inviteData?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-soft">Assigned Role:</span>
                  <span className="font-bold text-navy-700 uppercase text-[10px]">
                    {inviteData?.role}
                  </span>
                </div>
              </div>

              {submitError && (
                <div className="p-3 rounded-card bg-danger-50 border border-danger-100 text-danger-700 text-xs flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0 text-danger-600" />
                  <span>{submitError}</span>
                </div>
              )}

              <div>
                <Input
                  label="Create Password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 10 characters (letters & numbers)"
                  leftIcon={Lock}
                />
              </div>

              <div>
                <Input
                  label="Confirm Password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  leftIcon={Lock}
                />
              </div>

              <Button
                type="submit"
                size="lg"
                fullWidth
                loading={isSubmitting}
                loadingText="Activating account…"
                rightIcon={ArrowRight}
                className="mt-2"
              >
                Activate Account & Enter
              </Button>
            </form>
          )}
        </div>
      </main>

      <footer className="w-full max-w-7xl mx-auto py-4 text-center text-[11px] text-ink-faint">
        Software Hub • St. Mary’s Rehabilitation University Central Office
      </footer>
    </div>
  );
};

export default AcceptInviteScreen;
