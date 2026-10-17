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
  CheckCircle2, 
  AlertCircle,
  KeyRound,
  GraduationCap
} from 'lucide-react';
import { apiRequest } from '../../lib/api.js';

export const LoginScreen: React.FC = () => {
  const { login, googleLogin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState<string | null>(null);
  const [isForgotLoading, setIsForgotLoading] = useState(false);

  // Google SSO simulated prompt
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleAccountEmail, setGoogleAccountEmail] = useState('');

  const from = (location.state as any)?.from?.pathname || '/';

  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both institutional email and password.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Invalid credentials or unauthorized account.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignInSubmit = async (targetEmail: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await googleLogin(targetEmail);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Google account not recognized. Contact Administrator.');
    } finally {
      setIsLoading(false);
      setShowGoogleModal(false);
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
      setForgotStatus(res.message);
    } catch (err: any) {
      setForgotStatus(err?.message || 'Error dispatching recovery instructions.');
    } finally {
      setIsForgotLoading(false);
    }
  };

  const quickFillRoster = (uEmail: string) => {
    setEmail(uEmail);
    setPassword('Password123!');
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Top Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 font-bold text-lg">
            SH
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">Software Hub 2.0</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Command Center • Official University Platform</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/verify')}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors text-slate-600 dark:text-slate-300 flex items-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
            Verify Certificate
          </button>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
            title="Toggle Light/Dark Theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Login Container */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none p-8">
            <div className="text-center mb-8">
              <div className="inline-flex p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 mb-4 border border-blue-100 dark:border-blue-900">
                <GraduationCap className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">University Sign-In</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Enter your institutional credentials to access the operational command center
              </p>
            </div>

            {error && (
              <div className="mb-6 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {/* Official Google Sign-In Button */}
            <div className="mb-6">
              <button
                type="button"
                onClick={() => setShowGoogleModal(true)}
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-medium text-sm flex items-center justify-center gap-3 transition-colors shadow-sm disabled:opacity-60"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Continue with Google Workspace
              </button>
            </div>

            <div className="relative flex items-center justify-center my-6">
              <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
              <span className="bg-white dark:bg-slate-900 px-3 text-xs text-slate-400 dark:text-slate-500 font-medium">
                or sign in with password
              </span>
            </div>

            {/* Standard Login Form */}
            <form onSubmit={handleStandardLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Institutional Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@softwarehub2.org"
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setShowForgotModal(true);
                      setForgotStatus(null);
                    }}
                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/25 disabled:opacity-60"
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

            {/* Quick Demo Roster Fill */}
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider text-center">
                Reviewer Quick Sign-In (Official Roster)
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => quickFillRoster('sri.ram@softwarehub2.org')}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 text-left transition-colors"
                >
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Sri Ram</p>
                  <p className="text-[10px] text-slate-500">Primary Admin</p>
                </button>
                <button
                  type="button"
                  onClick={() => quickFillRoster('sheshi@softwarehub2.org')}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 text-left transition-colors"
                >
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Sheshi</p>
                  <p className="text-[10px] text-slate-500">Co-Admin / Lead</p>
                </button>
                <button
                  type="button"
                  onClick={() => quickFillRoster('manohar@softwarehub2.org')}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 text-left transition-colors"
                >
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Manohar</p>
                  <p className="text-[10px] text-slate-500">Core Intern</p>
                </button>
                <button
                  type="button"
                  onClick={() => quickFillRoster('cherry@softwarehub2.org')}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 text-left transition-colors"
                >
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Cherry</p>
                  <p className="text-[10px] text-slate-500">Unpaid Intern</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Google SSO Selection Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">Google Workspace Authentication</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Select or enter your institutional Google account for authenticated single sign-on:
            </p>

            <div className="space-y-2 mb-4">
              {[
                { name: 'Sri Ram', email: 'sri.ram@softwarehub2.org', role: 'Primary Administrator' },
                { name: 'Sheshi', email: 'sheshi@softwarehub2.org', role: 'Co-Administrator' },
                { name: 'Manohar', email: 'manohar@softwarehub2.org', role: 'Core Intern' },
              ].map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleGoogleSignInSubmit(acc.email)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-left flex items-center justify-between text-xs transition-colors"
                >
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{acc.name}</p>
                    <p className="text-slate-500">{acc.email}</p>
                  </div>
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">
                    {acc.role}
                  </span>
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Or test external/unrecognized email:</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={googleAccountEmail}
                  onChange={(e) => setGoogleAccountEmail(e.target.value)}
                  placeholder="student@otherdomain.com"
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => handleGoogleSignInSubmit(googleAccountEmail)}
                  disabled={!googleAccountEmail}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 rounded-lg disabled:opacity-50"
                >
                  Verify
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGoogleModal(false)}
              className="w-full mt-4 py-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Account Recovery</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Enter your registered institutional email address. Password reset instructions will be dispatched via automated system notification.
            </p>

            {forgotStatus ? (
              <div className="p-3 mb-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                <p>{forgotStatus}</p>
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    placeholder="user@softwarehub2.org"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isForgotLoading || !forgotEmail}
                  className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors disabled:opacity-60"
                >
                  {isForgotLoading ? 'Dispatching...' : 'Send Password Reset Email'}
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="w-full mt-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="px-6 py-4 text-center text-xs text-slate-400 dark:text-slate-600 border-t border-slate-200 dark:border-slate-800">
        <p>© 2026 Software Hub 2.0 Management Platform. Authorized university personnel only.</p>
      </footer>
    </div>
  );
};
export default LoginScreen;
