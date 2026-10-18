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
  GraduationCap
} from 'lucide-react';
import { apiRequest } from '../../lib/api.js';

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
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

  const handleMicrosoftSignIn = () => {
    // Redirect to backend Microsoft OpenID Connect endpoint
    window.location.href = '/api/auth/microsoft-signin';
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

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Top Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 font-bold text-lg">
            CC
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">Command Center</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Software Hub 2.0 • University Central Office</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/verify')}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors text-slate-600 dark:text-slate-300 flex items-center gap-1.5 min-h-[44px]"
          >
            <ShieldCheck className="w-4 h-4 text-blue-500" />
            Verify Certificate
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Toggle Light/Dark Theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Login Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className="inline-flex p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 mb-3 border border-blue-100 dark:border-blue-900">
                <GraduationCap className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Central Office Sign In
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Official institutional portal for central office team leads and interns.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{error}</p>
              </div>
            )}

            {/* Microsoft SSO Button */}
            <button
              type="button"
              onClick={handleMicrosoftSignIn}
              disabled={isLoading}
              className="w-full py-2.5 px-4 mb-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-2.5 transition-colors shadow-xs min-h-[44px]"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 21 21">
                <path fill="#f25022" d="M1 1h9v9H1z"/>
                <path fill="#00a4ef" d="M1 11h9v9H1z"/>
                <path fill="#7fba00" d="M11 1h9v9H11z"/>
                <path fill="#ffb900" d="M11 11h9v9H11z"/>
              </svg>
              Sign In with Microsoft 365
            </button>

            <div className="flex items-center my-4">
              <div className="flex-1 border-t border-slate-200 dark:border-slate-800" />
              <span className="px-3 text-[11px] font-medium text-slate-400 uppercase tracking-wider">or email & password</span>
              <div className="flex-1 border-t border-slate-200 dark:border-slate-800" />
            </div>

            {/* Standard Login Form */}
            <form onSubmit={handleStandardLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  University Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="name@softwarehub2.org"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-[11px] font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all min-h-[44px]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/25 disabled:opacity-60 min-h-[44px]"
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
          </div>
        </div>
      </main>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
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
              <div className="p-3 mb-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300">
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
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-h-[44px]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isForgotLoading || !forgotEmail}
                  className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors disabled:opacity-60 min-h-[44px]"
                >
                  {isForgotLoading ? 'Dispatching...' : 'Send Password Reset Email'}
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="w-full mt-3 py-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium min-h-[44px]"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="px-6 py-4 text-center text-xs text-slate-400 dark:text-slate-600 border-t border-slate-200 dark:border-slate-800">
        <p>© 2026 Software Hub 2.0 Command Center. Authorized university personnel only.</p>
      </footer>
    </div>
  );
};
export default LoginScreen;
