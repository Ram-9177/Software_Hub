import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext.js';
import { AppLayout } from './components/layout/AppLayout.js';

// Screens
import { HomeScreen } from './screens/Home/HomeScreen.js';
import { ToDoScreen } from './screens/ToDo/ToDoScreen.js';
import { InternsScreen } from './screens/Interns/InternsScreen.js';
import { ChatScreen } from './screens/Chat/ChatScreen.js';
import { CalendarScreen } from './screens/Calendar/CalendarScreen.js';
import { AttendanceScreen } from './screens/Attendance/AttendanceScreen.js';
import { TrackerScreen } from './screens/Tracker/TrackerScreen.js';
import { CertificatesScreen } from './screens/Certificates/CertificatesScreen.js';
import { AutomationsScreen } from './screens/Automations/AutomationsScreen.js';
import { PublicVerifyScreen } from './screens/PublicVerify/PublicVerifyScreen.js';
import { LoginScreen } from './screens/Login/LoginScreen.js';

export const App: React.FC = () => {
  const { currentUser, isLoading, switchPersona, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black text-lg animate-bounce">
          CC
        </div>
        <p className="text-xs font-semibold tracking-wider text-slate-400">
          Initializing Command Center...
        </p>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={currentUser ? <Navigate to="/" replace /> : <LoginScreen />}
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
              onSwitchUser={switchPersona}
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      ) : (
        <Route path="*" element={<Navigate to="/login" replace />} />
      )}
    </Routes>
  );
};

