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
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 flex flex-col justify-between selection:bg-blue-600 selection:text-white p-4">
      <header className="w-full max-w-7xl mx-auto py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm">
            CC
          </div>
          <span className="text-sm font-bold text-slate-900 dark:text-white">Command Center</span>
        </div>
        <Link
          to="/login"
          className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        >
          Sign In instead
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center py-8">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 sm:p-8">
          <div className="mb-6">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
              <Sparkles className="w-3.5 h-3.5" />
              Official Invitation
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2">
              Accept Institutional Invite
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Set up your secure password to activate your Command Center account.
            </p>
          </div>

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs">Verifying single-use invitation link...</p>
            </div>
          ) : verifyError ? (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
              <div className="flex items-center gap-2 font-bold mb-1">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                Invite Link Invalid
              </div>
              <p>{verifyError}</p>
              <div className="mt-4 pt-3 border-t border-rose-200/60 dark:border-rose-900/60">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1 font-bold text-rose-700 dark:text-rose-300 hover:underline"
                >
                  Return to Sign In <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Invite details summary */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Invited Name:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{inviteData?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{inviteData?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Assigned Role:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400 capitalize">
                    {String(inviteData?.role || '').replace('_', ' ')}
                  </span>
                </div>
              </div>

              {submitError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Create Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 10 characters (letters & numbers)"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/25 disabled:opacity-60 min-h-[44px]"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Activate Account & Enter
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </main>

      <footer className="w-full max-w-7xl mx-auto py-4 text-center text-[11px] text-slate-400">
        Command Center • St. Mary’s Rehabilitation University Central Office
      </footer>
    </div>
  );
};
export default AcceptInviteScreen;
