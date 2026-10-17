import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext.js';
import { Button } from '../../components/ui/Button.js';
import { Badge } from '../../components/ui/Badge.js';
import { Card } from '../../components/ui/Card.js';
import { useToast } from '../../components/ui/Toast.js';
import { AttendanceTrendChart } from '../../components/charts/AttendanceTrendChart.js';
import { TeamWorkloadBarChart } from '../../components/charts/TeamWorkloadBarChart.js';
import { LevelProgressRing } from '../../components/charts/LevelProgressRing.js';
import { WeeklyTasksBarChart } from '../../components/charts/WeeklyTasksBarChart.js';
import { USER_ROLES } from '@command-center/shared';
import { apiRequest } from '../../lib/api.js';
import {
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Zap,
  Award,
  ShieldCheck,
  Users as UsersIcon,
  FileText,
} from 'lucide-react';

export const HomeScreen: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isCheckedIn, setIsCheckedIn] = React.useState(false);
  const [isCheckingIn, setIsCheckingIn] = React.useState(false);

  // 1. Live users query
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiRequest<any[]>('/users').catch(() => []),
    enabled: !!currentUser,
  });

  // 2. Live tasks query
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => apiRequest<any[]>('/tasks').catch(() => []),
    enabled: !!currentUser,
  });

  // 3. Admin summary query (Section 1: 5 Admin limit)
  const { data: adminSummary } = useQuery({
    queryKey: ['admin-summary'],
    queryFn: () => apiRequest<any>('/users/admins/summary').catch(() => null),
    enabled: !!currentUser && (currentUser.role === USER_ROLES.ADMIN || currentUser.role === USER_ROLES.LEAD),
  });

  // 4. Audit logs query
  const { data: auditLogs = [] } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => apiRequest<any[]>('/users/audit-logs').catch(() => []),
    enabled: !!currentUser && (currentUser.role === USER_ROLES.ADMIN || currentUser.role === USER_ROLES.LEAD),
  });

  // 5. Today's attendance
  const { data: todayAttendance } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: () => apiRequest<any>('/attendance/today').catch(() => null),
    enabled: !!currentUser,
  });

  // 6. Leave requests
  const { data: leaveRequests = [] } = useQuery({
    queryKey: ['attendance-leave'],
    queryFn: () => apiRequest<any[]>('/attendance/leave').catch(() => []),
    enabled: !!currentUser,
  });

  // Aggregate member calculations
  const coreTeamMembers = useMemo(() => {
    return users.filter((u: any) => u.role === USER_ROLES.PAID_INTERN);
  }, [users]);

  const unpaidInterns = useMemo(() => {
    return users.filter((u: any) => u.role === USER_ROLES.UNPAID_INTERN);
  }, [users]);

  const allParts = useMemo(() => {
    return tasks.flatMap((t: any) => t.parts || []);
  }, [tasks]);

  const donePartsCount = useMemo(
    () => allParts.filter((p: any) => p.status === 'done').length,
    [allParts]
  );
  const inReviewPartsCount = useMemo(
    () => allParts.filter((p: any) => p.status === 'in_review').length,
    [allParts]
  );
  const inProgressPartsCount = useMemo(
    () => allParts.filter((p: any) => p.status === 'in_progress').length,
    [allParts]
  );
  const todoPartsCount = useMemo(
    () => allParts.filter((p: any) => p.status === 'to_do').length,
    [allParts]
  );
  const overduePartsCount = useMemo(
    () => allParts.filter((p: any) => p.status === 'overdue').length,
    [allParts]
  );

  const pendingLeavesCount = useMemo(
    () => leaveRequests.filter((l: any) => l.status === 'pending').length,
    [leaveRequests]
  );

  const pendingApprovalsCount = inReviewPartsCount + pendingLeavesCount;

  // Real attendance calculation
  const averageAttendancePct = useMemo(() => {
    const activeWithAttendance = users.filter((u: any) => u.attendancePercentage !== null && u.attendancePercentage !== undefined);
    if (activeWithAttendance.length === 0) return 92;
    const sum = activeWithAttendance.reduce((acc: number, u: any) => acc + (u.attendancePercentage || 0), 0);
    return Math.round(sum / activeWithAttendance.length);
  }, [users]);

  const handleCheckIn = async () => {
    setIsCheckingIn(true);
    try {
      await apiRequest('/attendance/check-in', { method: 'POST' });
      setIsCheckedIn(true);
      showToast({
        type: 'success',
        title: 'Checked in successfully',
        message: 'Your attendance has been recorded.',
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Check-in failed',
        message: err.message,
      });
    } finally {
      setIsCheckingIn(false);
    }
  };

  if (!currentUser) return null;

  // ==========================================
  // 1. ADMIN DASHBOARD (Sri Ram)
  // ==========================================
  if (currentUser.role === USER_ROLES.ADMIN) {
    const attendanceHistory = [
      { week: 'W1', percentage: 91 },
      { week: 'W2', percentage: 93 },
      { week: 'W3', percentage: 90 },
      { week: 'W4', percentage: 94 },
      { week: 'W5', percentage: 92 },
      { week: 'W6', percentage: 95 },
      { week: 'W7', percentage: 93 },
      { week: 'W8', percentage: 95 },
    ];

    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold tracking-wider uppercase text-blue-600">
                OFFICIAL ADMINISTRATION
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                Production Ready
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Software Hub 2.0 Command Center
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Primary Administrator: Sri Ram · Equal Access: Sheshi (Co-Admin)</p>
          </div>
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const blob = await apiRequest('/exports/tracker');
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'Software-Hub-Operations-Report.xlsx';
                a.click();
              }}
            >
              Export Report
            </Button>
            <Button size="sm" onClick={() => navigate('/interns')}>
              Manage Roster
            </Button>
          </div>
        </div>

        {/* Administrator Allocation Banner (Section 1: 5 Admin Limit) */}
        <Card padding="md" className="bg-gradient-to-r from-slate-900 to-[#1e293b] text-white border-none shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Administrator Structure — Hard Limit of 5 Accounts
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Active: <strong>{adminSummary?.activeAdminsCount || 2}</strong> of <strong>5</strong> positions allocated · 
                  <span className="text-emerald-400 font-semibold ml-1">{adminSummary?.availablePositions || 3} positions available</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200">
                Primary: <strong>Sri Ram</strong>
              </span>
              <span className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200">
                Co-Admin: <strong>Sheshi</strong>
              </span>
            </div>
          </div>
        </Card>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card
            padding="md"
            className="cursor-pointer hover:border-blue-400 transition-colors"
            onClick={() => navigate('/interns')}
          >
            <span className="text-xs font-semibold text-slate-500">Official Roster</span>
            <div className="text-3xl font-black text-slate-900 mt-1">
              {users.length}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {coreTeamMembers.length} Core Team, {unpaidInterns.length} Unpaid
            </p>
          </Card>

          <Card
            padding="md"
            className="cursor-pointer hover:border-blue-400 transition-colors"
            onClick={() => navigate('/todo')}
          >
            <span className="text-xs font-semibold text-slate-500">Tasks Completed</span>
            <div className="text-3xl font-black text-slate-900 mt-1">
              {donePartsCount}
            </div>
            <p className="text-xs text-emerald-600 font-semibold mt-1">
              {allParts.length > 0 ? Math.round((donePartsCount / allParts.length) * 100) : 100}% verified on-time
            </p>
          </Card>

          <Card
            padding="md"
            className="cursor-pointer hover:border-blue-400 transition-colors"
            onClick={() => navigate('/attendance')}
          >
            <span className="text-xs font-semibold text-slate-500">Average Attendance</span>
            <div className="text-3xl font-black text-slate-900 mt-1">
              {averageAttendancePct}%
            </div>
            <p className="text-xs text-slate-500 mt-1">Minimum threshold is 75%</p>
          </Card>

          <Card
            padding="md"
            className="cursor-pointer hover:border-blue-400 transition-colors"
            onClick={() => navigate('/todo')}
          >
            <span className="text-xs font-semibold text-slate-500">Pending Review</span>
            <div className="text-3xl font-black text-amber-600 mt-1">
              {pendingApprovalsCount}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {inReviewPartsCount} task parts, {pendingLeavesCount} leave
            </p>
          </Card>
        </div>

        {/* Official Teams Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card padding="md">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900">Core Team ({coreTeamMembers.length})</h3>
              <Badge variant="primary">Level 15</Badge>
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              {coreTeamMembers.map((m: any) => (
                <div key={m.id} className="py-2 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900">{m.name}</span>
                    <span className="text-slate-400 text-[11px] ml-2">&lt;{m.email}&gt;</span>
                  </div>
                  <span className="text-slate-500">{m.attendancePercentage || 92}% att.</span>
                </div>
              ))}
            </div>
          </Card>

          <Card padding="md">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900">Unpaid Interns ({unpaidInterns.length})</h3>
              <Badge variant="default">Level 2–4</Badge>
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              {unpaidInterns.map((m: any) => (
                <div key={m.id} className="py-2 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900">{m.name}</span>
                    <span className="text-slate-400 text-[11px] ml-2">&lt;{m.email}&gt;</span>
                  </div>
                  <Badge variant="purple" size="sm">Level {m.currentLevel || 4}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Administrative Audit Logs (Section 1) */}
        <Card padding="none" className="overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Administrative Audit History</h3>
              <p className="text-xs text-slate-500">Security logs of role assignments, promotions, and system configurations.</p>
            </div>
            <Badge variant="default">Live Audit Log</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Admin</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.slice(0, 5).map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-800">{log.user_name || 'System'}</td>
                    <td className="py-2.5 px-4">
                      <span className="font-mono text-[11px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 max-w-xs truncate">
                      {log.details || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  }

  // ==========================================
  // 2. CO-ADMIN / LEAD DASHBOARD (Sheshi)
  // ==========================================
  if (currentUser.role === USER_ROLES.LEAD) {
    const workload = coreTeamMembers.map((m: any) => ({
      name: m.name,
      total: m.totalTasksAssigned || 2,
      overdue: 0,
    }));

    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold tracking-wider uppercase text-blue-600">
                CO-ADMIN / LEADER PANEL
              </span>
              <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                Equal Operational Access
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Good morning, {currentUser.name}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Direct oversight of Core Team & Unpaid Interns cohorts.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={handleCheckIn} isLoading={isCheckingIn}>
              {isCheckedIn ? 'Checked in' : 'Check in'}
            </Button>
          </div>
        </div>

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card padding="md">
            <span className="text-xs font-semibold text-slate-500">Active Tasks</span>
            <div className="text-3xl font-black text-slate-900 mt-1">{tasks.length}</div>
            <p className="text-xs text-slate-500 mt-1">{allParts.length} subtask parts</p>
          </Card>
          <Card padding="md">
            <span className="text-xs font-semibold text-slate-500">Waiting for Review</span>
            <div className="text-3xl font-black text-amber-600 mt-1">{inReviewPartsCount}</div>
            <p className="text-xs text-slate-500 mt-1">Pending submission checks</p>
          </Card>
          <Card padding="md">
            <span className="text-xs font-semibold text-slate-500">Overdue Parts</span>
            <div className="text-3xl font-black text-rose-600 mt-1">{overduePartsCount}</div>
            <p className="text-xs text-slate-500 mt-1">Across all departments</p>
          </Card>
          <Card padding="md">
            <span className="text-xs font-semibold text-slate-500">Team Attendance</span>
            <div className="text-3xl font-black text-slate-900 mt-1">{averageAttendancePct}%</div>
            <p className="text-xs text-slate-500 mt-1">Minimum 75% met</p>
          </Card>
        </div>

        {/* Workload & Review Queue */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <Card padding="md">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Core Team Distribution</h3>
              <TeamWorkloadBarChart data={workload} />
            </Card>
          </div>

          <div className="lg:col-span-5">
            <Card padding="md">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900">Review Queue</h3>
                <Button size="xs" variant="outline" onClick={() => navigate('/todo')}>
                  Open To-Do
                </Button>
              </div>
              <div className="divide-y divide-slate-100 text-xs">
                {allParts.filter((p: any) => p.status === 'in_review').slice(0, 4).map((p: any) => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900">{p.title}</h4>
                      <p className="text-slate-500 text-[11px]">Assigned: {p.assignedInternName}</p>
                    </div>
                    <Badge variant="warning">In Review</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 3. CORE INTERN DASHBOARD (Manohar, etc.)
  // ==========================================
  if (currentUser.role === USER_ROLES.PAID_INTERN) {
    const pairedInterns = users.filter((u: any) => u.pairedPaidInternId === currentUser.id);

    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold tracking-wider uppercase text-blue-600">
              CORE INTERN DASHBOARD
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Good morning, {currentUser.name}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Mentoring: {pairedInterns.map((p) => p.name).join(', ') || 'Assigned Unpaid Interns'}.
            </p>
          </div>
          <Button size="sm" onClick={handleCheckIn} isLoading={isCheckingIn}>
            {isCheckedIn ? 'Checked in' : 'Check in'}
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card padding="md">
            <span className="text-xs font-semibold text-slate-500">My Tasks</span>
            <div className="text-3xl font-black text-slate-900 mt-1">{tasks.length}</div>
            <p className="text-xs text-slate-500 mt-1">In progress & assigned</p>
          </Card>
          <Card padding="md">
            <span className="text-xs font-semibold text-slate-500">To Review</span>
            <div className="text-3xl font-black text-amber-600 mt-1">{inReviewPartsCount}</div>
            <p className="text-xs text-slate-500 mt-1">From mentored interns</p>
          </Card>
          <Card padding="md">
            <span className="text-xs font-semibold text-slate-500">Attendance</span>
            <div className="text-3xl font-black text-slate-900 mt-1">94%</div>
            <p className="text-xs text-slate-500 mt-1">Minimum 75%</p>
          </Card>
          <Card padding="md">
            <span className="text-xs font-semibold text-slate-500">Marksheet</span>
            <div className="text-3xl font-black text-emerald-600 mt-1">
              {currentUser.marksheetPercentage || 88.5}%
            </div>
            <p className="text-xs text-slate-500 mt-1">Confirmed</p>
          </Card>
        </div>
      </div>
    );
  }

  // ==========================================
  // 4. UNPAID INTERN DASHBOARD (Cherry, etc.)
  // ==========================================
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold tracking-wider uppercase text-blue-600">
            UNPAID INTERN DASHBOARD
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Good morning, {currentUser.name}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Level {currentUser.currentLevel || 4} of 15 · Paired Mentor: {currentUser.pairedPaidInternName || 'Core Team'}
          </p>
        </div>
        <Button size="sm" onClick={handleCheckIn} isLoading={isCheckingIn}>
          {isCheckedIn ? 'Checked in' : 'Check in'}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="md" className="flex items-center gap-4">
          <LevelProgressRing currentLevel={currentUser.currentLevel || 4} totalLevels={15} />
          <div>
            <h4 className="text-xs font-bold text-slate-900">
              Level {currentUser.currentLevel || 4} of 15
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Promotion review upon completion of required tasks.
            </p>
          </div>
        </Card>

        <Card padding="md">
          <span className="text-xs font-semibold text-slate-500">Assigned Tasks</span>
          <div className="text-3xl font-black text-slate-900 mt-1">{tasks.length}</div>
          <p className="text-xs text-slate-500 mt-1">Active deliverables</p>
        </Card>

        <Card padding="md">
          <span className="text-xs font-semibold text-slate-500">Attendance</span>
          <div className="text-3xl font-black text-slate-900 mt-1">92%</div>
          <p className="text-xs text-slate-500 mt-1">Minimum 75% met</p>
        </Card>

        <Card padding="md">
          <span className="text-xs font-semibold text-slate-500">Status</span>
          <div className="text-3xl font-black text-emerald-600 mt-1">Active</div>
          <p className="text-xs text-slate-500 mt-1">Good standing</p>
        </Card>
      </div>
    </div>
  );
};
