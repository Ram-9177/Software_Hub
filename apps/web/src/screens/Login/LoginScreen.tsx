import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.js';
import { useTheme } from '../../contexts/ThemeContext.js';
import {
  ShieldCheck,
  Lock,
  Mail,
  Sun,
  Moon,
  ArrowRight,
  AlertCircle,
  KeyRound,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { apiRequest } from '../../lib/api.js';

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // Sign In Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState<string | null>(null);
  const [isForgotLoading, setIsForgotLoading] = useState(false);

  // Invite entry state
  const [showInviteEntry, setShowInviteEntry] = useState(false);
  const [inviteTokenInput, setInviteTokenInput] = useState('');

  const from = (location.state as any)?.from?.pathname || '/';

  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Email or password is incorrect');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Email or password is incorrect');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;

    setIsForgotLoading(true);
    try {
      const res = await apiRequest<{ message: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: forgotEmail }),
      });
      setForgotStatus(res.message || 'If an account exists with this email, instructions have been dispatched.');
    } catch {
      setForgotStatus('If an account exists with this email, instructions have been dispatched.');
    } finally {
      setIsForgotLoading(false);
    }
  };

  const handleGoToInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const token = inviteTokenInput.trim();
    if (!token) return;
    const cleanToken = token.includes('token=') ? token.split('token=')[1].split('&')[0] : token;
    navigate(`/accept-invite?token=${encodeURIComponent(cleanToken)}`);
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 flex flex-col justify-between selection:bg-blue-600 selection:text-white transition-colors duration-200">
      {/* Top Navigation */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-blue-600/30">
            CC
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
              Command Center
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
              Central Office Operations
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle visual theme"
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </header>

      {/* Main Content Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none p-6 sm:p-8">
          <div className="mb-6">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
              <ShieldCheck className="w-3.5 h-3.5" />
              Institutional Authentication
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">
              Sign In to Command Center
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Official university portal for central office staff and engineering cohorts.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleStandardLogin} className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Institutional Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@smru.edu.in"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-950 transition-all min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(true);
                    setForgotStatus(null);
                  }}
                  className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline min-h-[30px] flex items-center"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-950 transition-all min-h-[44px]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/25 disabled:opacity-60 min-h-[44px]"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In to Command Center
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Invitation Notice */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Registration is invitation-only.
            </p>
            <button
              type="button"
              onClick={() => setShowInviteEntry(!showInviteEntry)}
              className="mt-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 min-h-[36px]"
            >
              <KeyRound className="w-3.5 h-3.5" />
              {showInviteEntry ? 'Hide invite link field' : 'Have a single-use invite link? Click here'}
            </button>

            {showInviteEntry && (
              <form onSubmit={handleGoToInvite} className="mt-3 flex gap-2">
                <input
                  type="text"
                  placeholder="Paste invite link or token"
                  value={inviteTokenInput}
                  onChange={(e) => setInviteTokenInput(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-slate-900 dark:bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 dark:hover:bg-slate-700"
                >
                  Accept
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
        >
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <KeyRound className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Account Recovery</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Enter your registered email address. Password reset instructions valid for 30 minutes will be dispatched.
            </p>

            {forgotStatus ? (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2 mb-4">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{forgotStatus}</span>
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-3 mb-4">
                <input
                  type="email"
                  required
                  placeholder="name@smru.edu.in"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px]"
                />
                <button
                  type="submit"
                  disabled={isForgotLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-2 min-h-[44px] disabled:opacity-60"
                >
                  {isForgotLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Send Single-Use Reset Link'
                  )}
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="w-full py-2 rounded-xl text-slate-600 dark:text-slate-400 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[44px]"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 text-center text-[11px] text-slate-400 dark:text-slate-500">
        Command Center • St. Mary’s Rehabilitation University Central Office
      </footer>
    </div>
  );
};
export default LoginScreen;
