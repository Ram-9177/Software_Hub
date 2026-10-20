import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext.js';
import { AppLayout } from './components/layout/AppLayout.js';

// Route-level Code Splitting for ultra-fast initial load (<1 second target)
const HomeScreen = lazy(() => import('./screens/Home/HomeScreen.js'));
const ToDoScreen = lazy(() => import('./screens/ToDo/ToDoScreen.js').then(m => ({ default: m.ToDoScreen })));
const InternsScreen = lazy(() => import('./screens/Interns/InternsScreen.js'));
const ChatScreen = lazy(() => import('./screens/Chat/ChatScreen.js').then(m => ({ default: m.ChatScreen })));
const CalendarScreen = lazy(() => import('./screens/Calendar/CalendarScreen.js').then(m => ({ default: m.CalendarScreen })));
const AttendanceScreen = lazy(() => import('./screens/Attendance/AttendanceScreen.js').then(m => ({ default: m.AttendanceScreen })));
const TrackerScreen = lazy(() => import('./screens/Tracker/TrackerScreen.js').then(m => ({ default: m.TrackerScreen })));
const CertificatesScreen = lazy(() => import('./screens/Certificates/CertificatesScreen.js').then(m => ({ default: m.CertificatesScreen })));
const AutomationsScreen = lazy(() => import('./screens/Automations/AutomationsScreen.js').then(m => ({ default: m.AutomationsScreen })));
const ProfileScreen = lazy(() => import('./screens/Profile/ProfileScreen.js'));
const PublicVerifyScreen = lazy(() => import('./screens/PublicVerify/PublicVerifyScreen.js').then(m => ({ default: m.PublicVerifyScreen })));
const LoginScreen = lazy(() => import('./screens/Login/LoginScreen.js'));
const SignUpScreen = lazy(() => import('./screens/SignUp/SignUpScreen.js'));
const VerifyEmailScreen = lazy(() => import('./screens/VerifyEmail/VerifyEmailScreen.js'));
const AcceptInviteScreen = lazy(() => import('./screens/AcceptInvite/AcceptInviteScreen.js'));
const ResetPasswordScreen = lazy(() => import('./screens/ResetPassword/ResetPasswordScreen.js'));

const ScreenSkeleton: React.FC = () => (
  <div className="w-full max-w-7xl mx-auto space-y-4 animate-pulse p-4">
    <div className="h-10 bg-tint dark:bg-navy-900 rounded-card w-48 border border-line" />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-28 bg-tint dark:bg-navy-900 rounded-card border border-line" />
      ))}
    </div>
    <div className="h-64 bg-tint dark:bg-navy-900 rounded-card border border-line" />
  </div>
);

export const App: React.FC = () => {
  const { currentUser, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-navy-950 text-white gap-3">
        <div className="w-12 h-12 rounded-card bg-gold-400 text-navy-950 flex items-center justify-center font-display font-black text-xl shadow-card border-2 border-gold-300 animate-pulse">
          SH
        </div>
        <p className="text-xs font-mono font-bold tracking-widest uppercase text-navy-200">
          CENTRAL OPERATIONS · SOFTWARE HUB
        </p>
      </div>
    );
  }

  return (
    <>
      <Suspense fallback={<ScreenSkeleton />}>
        <Routes>
          {/* Public Authentication & Verification Routes */}
          <Route
            path="/login"
            element={currentUser ? <Navigate to="/" replace /> : <LoginScreen />}
          />
          <Route
            path="/signup"
            element={currentUser ? <Navigate to="/" replace /> : <SignUpScreen />}
          />
          <Route
            path="/register"
            element={currentUser ? <Navigate to="/" replace /> : <SignUpScreen />}
          />
          <Route path="/verify-email" element={<VerifyEmailScreen />} />
          <Route
            path="/accept-invite"
            element={currentUser ? <Navigate to="/" replace /> : <AcceptInviteScreen />}
          />
          <Route
            path="/reset-password"
            element={currentUser ? <Navigate to="/" replace /> : <ResetPasswordScreen />}
          />
          <Route path="/verify" element={<PublicVerifyScreen />} />
          <Route path="/verify/:certNumber" element={<PublicVerifyScreen />} />

          {/* Authenticated Application Shell */}
          {currentUser ? (
            <Route
              element={
                <AppLayout
                  currentUser={currentUser}
                  onLogout={logout}
                />
              }
            >
              <Route path="/" element={<HomeScreen />} />
              <Route path="/todo" element={<ToDoScreen />} />
              <Route path="/interns" element={<InternsScreen />} />
              <Route path="/chat" element={<ChatScreen />} />
              <Route path="/calendar" element={<CalendarScreen />} />
              <Route path="/attendance" element={<AttendanceScreen />} />
              <Route path="/tracker" element={<TrackerScreen />} />
              <Route path="/certificates" element={<CertificatesScreen />} />
              <Route path="/automations" element={<AutomationsScreen />} />
              <Route path="/profile" element={<ProfileScreen />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          ) : (
            <Route path="*" element={<Navigate to="/login" replace />} />
          )}
        </Routes>
      </Suspense>
    </>
  );
};

export default App;
