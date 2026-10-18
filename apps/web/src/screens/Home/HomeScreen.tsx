import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext.js';
import { Button } from '../../components/ui/Button.js';
import { Badge } from '../../components/ui/Badge.js';
import { Card } from '../../components/ui/Card.js';
import { useToast } from '../../components/ui/Toast.js';
import { LineChart } from '../../components/ui/LineChart.js';
import { BarChart } from '../../components/ui/BarChart.js';
import { ProgressRing } from '../../components/ui/ProgressRing.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
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
  Plus,
} from 'lucide-react';

export const HomeScreen: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
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

  // 3. Admin summary query
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
  const { data: todayAttendance, refetch: refetchAttendance } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: () => apiRequest<any>('/attendance/today').catch(() => null),
    enabled: !!currentUser,
  });

  // 6. User's personal attendance register
  const { data: myRegister } = useQuery({
    queryKey: ['my-register', currentUser?.id],
    queryFn: () => apiRequest<any>(`/attendance/register?userId=${currentUser?.id}`).catch(() => null),
    enabled: !!currentUser,
  });

  // Calculations
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
  const overduePartsCount = useMemo(
    () => allParts.filter((p: any) => p.status === 'overdue').length,
    [allParts]
  );

  const averageAttendancePct = useMemo(() => {
    const activeWithAtt = users.filter(
      (u: any) => u.attendancePercentage !== null && u.attendancePercentage !== undefined
    );
    if (activeWithAtt.length === 0) return 0;
    const sum = activeWithAtt.reduce((acc: number, u: any) => acc + Number(u.attendancePercentage), 0);
    return Math.round(sum / activeWithAtt.length);
  }, [users]);

  const myTodayRecord = useMemo(() => {
    if (!todayAttendance?.records) return null;
    return todayAttendance.records.find((r: any) => r.userId === currentUser?.id);
  }, [todayAttendance, currentUser]);

  const isCheckedIn = Boolean(myTodayRecord?.checkInTime);

  const handleCheckIn = async () => {
    setIsCheckingIn(true);
    try {
      await apiRequest('/attendance/check-in', { method: 'POST' });
      await refetchAttendance();
      showToast({
        type: 'success',
        title: 'Checked in successfully',
        message: 'Your attendance has been recorded for today.',
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

  const handleCheckOut = async () => {
    setIsCheckingIn(true);
    try {
      const res = await apiRequest('/attendance/check-out', { method: 'POST' });
      await refetchAttendance();
      showToast({
        type: 'success',
        title: 'Checked out successfully',
        message: res.message || 'Your shift end has been logged.',
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Check-out failed',
        message: err.message,
      });
    } finally {
      setIsCheckingIn(false);
    }
  };

  if (!currentUser) return null;

  // Workload bar data from real core team members
  const workloadData = coreTeamMembers.map((m: any) => ({
    label: m.name.split(' ')[0],
    value: m.totalTasksAssigned || 0,
    secondaryValue: m.tasksCompleted || 0,
  }));

  // ==========================================
  // 1. ADMIN DASHBOARD
  // ==========================================
  if (currentUser.role === USER_ROLES.ADMIN) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold tracking-wider uppercase text-blue-600 dark:text-blue-400">
                CENTRAL OFFICE ADMINISTRATION
              </span>
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                Live Operations
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Command Center
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Admin: {currentUser.name} • {adminSummary?.activeAdminsCount ?? 1} of 5 Admin Positions Allocated
            </p>
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
                a.download = 'Operations-Report.xlsx';
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

        {/* Administrator Allocation Banner */}
        <Card padding="md" className="bg-gradient-to-r from-slate-900 to-[#1e293b] text-white border-none shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Administrator Structure — Hard Limit of 5 Positions
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Allocated: <strong>{adminSummary?.activeAdminsCount ?? 1}</strong> of <strong>5</strong> • 
                  <span className="text-emerald-400 font-semibold ml-1">
                    {adminSummary?.availablePositions ?? 4} available positions
                  </span>
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200">
                Primary: <strong>{adminSummary?.primaryAdmin?.name || currentUser.name}</strong>
              </span>
              {adminSummary?.coAdmin && (
                <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200">
                  Co-Admin: <strong>{adminSummary.coAdmin.name}</strong>
                </span>
              )}
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
            <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">
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
            <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">
              {donePartsCount}
            </div>
            <p className="text-xs text-emerald-600 font-semibold mt-1">
              {allParts.length > 0 ? Math.round((donePartsCount / allParts.length) * 100) : 0}% of parts completed
            </p>
          </Card>

          <Card
            padding="md"
            className="cursor-pointer hover:border-blue-400 transition-colors"
            onClick={() => navigate('/attendance')}
          >
            <span className="text-xs font-semibold text-slate-500">Average Attendance</span>
            <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">
              {averageAttendancePct}%
            </div>
            <p className="text-xs text-slate-500 mt-1">Calculated from actual records</p>
          </Card>

          <Card
            padding="md"
            className="cursor-pointer hover:border-blue-400 transition-colors"
            onClick={() => navigate('/todo')}
          >
            <span className="text-xs font-semibold text-slate-500">Pending Review</span>
            <div className="text-3xl font-black text-amber-600 mt-1">
              {inReviewPartsCount}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {inReviewPartsCount} deliverables awaiting sign-off
            </p>
          </Card>
        </div>

        {/* Audit Logs */}
        <Card padding="none" className="overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Administrative Audit History</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Real security log of system actions.</p>
            </div>
            <Badge variant="default">Security Log</Badge>
          </div>
          {auditLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 italic">
              No administrative actions recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase text-[10px]">
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-4">Admin</th>
                    <th className="py-2.5 px-4">Action</th>
                    <th className="py-2.5 px-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {auditLogs.slice(0, 5).map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                        {log.user_name || 'System'}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="font-mono text-[11px] text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                        {log.details || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    );
  }

  // ==========================================
  // 2. CO-ADMIN / LEAD DASHBOARD
  // ==========================================
  if (currentUser.role === USER_ROLES.LEAD) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold tracking-wider uppercase text-blue-600 dark:text-blue-400">
              CO-ADMIN / TEAM LEAD DASHBOARD
            </span>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Good morning, {currentUser.name}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Direct oversight of active cohorts and deliverables.</p>
          </div>
          <div className="flex items-center gap-2.5">
            {!isCheckedIn ? (
              <Button size="sm" onClick={handleCheckIn} isLoading={isCheckingIn}>
                Check In
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={handleCheckOut} isLoading={isCheckingIn}>
                Check Out
              </Button>
            )}
          </div>
        </div>

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card padding="md">
            <span className="text-xs font-semibold text-slate-500">Active Tasks</span>
            <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">{tasks.length}</div>
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
            <p className="text-xs text-slate-500 mt-1">Requiring follow-up</p>
          </Card>
          <Card padding="md">
            <span className="text-xs font-semibold text-slate-500">Team Attendance</span>
            <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">{averageAttendancePct}%</div>
            <p className="text-xs text-slate-500 mt-1">Cohort average</p>
          </Card>
        </div>

        {/* Team Distribution & Review Queue */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <Card padding="md">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Core Team Deliverable Workload</h3>
              {workloadData.length === 0 ? (
                <EmptyState
                  title="No core intern tasks yet"
                  description="When core team members are assigned tasks, workload charts will be calculated here."
                  actionLabel="Create Task"
                  onAction={() => navigate('/todo')}
                />
              ) : (
                <BarChart
                  data={workloadData}
                  primaryLabel="Assigned"
                  secondaryLabel="Completed"
                />
              )}
            </Card>
          </div>

          <div className="lg:col-span-5">
            <Card padding="md">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Review Queue</h3>
                <Button size="xs" variant="outline" onClick={() => navigate('/todo')}>
                  Open To-Do
                </Button>
              </div>
              {inReviewPartsCount === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 italic">
                  No deliverables waiting for review.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {allParts.filter((p: any) => p.status === 'in_review').slice(0, 4).map((p: any) => (
                    <div key={p.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">{p.title}</h4>
                        <p className="text-slate-500 text-[11px]">Assigned: {p.assignedInternName}</p>
                      </div>
                      <Badge variant="warning">In Review</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 3. CORE INTERN DASHBOARD
  // ==========================================
  if (currentUser.role === USER_ROLES.PAID_INTERN) {
    const pairedInterns = users.filter((u: any) => u.pairedPaidInternId === currentUser.id);

    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold tracking-wider uppercase text-blue-600 dark:text-blue-400">
              CORE INTERN DASHBOARD
            </span>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Good morning, {currentUser.name}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Mentoring: {pairedInterns.map((p) => p.name).join(', ') || 'No paired unpaid interns yet.'}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            {!isCheckedIn ? (
              <Button size="sm" onClick={handleCheckIn} isLoading={isCheckingIn}>
                Check In
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={handleCheckOut} isLoading={isCheckingIn}>
                Check Out
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card padding="md">
            <span className="text-xs font-semibold text-slate-500">My Tasks</span>
            <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">{tasks.length}</div>
            <p className="text-xs text-slate-500 mt-1">Active deliverables</p>
          </Card>
          <Card padding="md">
            <span className="text-xs font-semibold text-slate-500">To Review</span>
            <div className="text-3xl font-black text-amber-600 mt-1">{inReviewPartsCount}</div>
            <p className="text-xs text-slate-500 mt-1">From mentored interns</p>
          </Card>
          <Card padding="md">
            <span className="text-xs font-semibold text-slate-500">My Attendance</span>
            <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">
              {myRegister?.attendanceThisMonth ?? 0}%
            </div>
            <p className="text-xs text-slate-500 mt-1">Minimum 75% for certificate</p>
          </Card>
          <Card padding="md">
            <span className="text-xs font-semibold text-slate-500">Marksheet Score</span>
            <div className="text-3xl font-black text-emerald-600 mt-1">
              {currentUser.marksheetPercentage !== null && currentUser.marksheetPercentage !== undefined
                ? `${currentUser.marksheetPercentage}%`
                : 'Pending'}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {currentUser.marksheetConfirmed ? 'Verified by Lead' : 'Requires verification'}
            </p>
          </Card>
        </div>

        {tasks.length === 0 && (
          <EmptyState
            title="No tasks assigned yet"
            description="You currently have no tasks in your queue. You can create tasks and assign parts to your unpaid interns."
            actionLabel="Create First Task"
            onAction={() => navigate('/todo')}
          />
        )}
      </div>
    );
  }

  // ==========================================
  // 4. UNPAID INTERN DASHBOARD
  // ==========================================
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold tracking-wider uppercase text-blue-600 dark:text-blue-400">
            FOUNDATIONAL INTERN DASHBOARD
          </span>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Good morning, {currentUser.name}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Level {currentUser.currentLevel || 1} of 15 • Mentor: {currentUser.pairedPaidInternName || 'Central Office Lead'}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {!isCheckedIn ? (
            <Button size="sm" onClick={handleCheckIn} isLoading={isCheckingIn}>
              Check In
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={handleCheckOut} isLoading={isCheckingIn}>
              Check Out
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="md" className="flex items-center gap-4">
          <ProgressRing current={currentUser.currentLevel || 1} total={15} size={64} />
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              Level {currentUser.currentLevel || 1} of 15
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              15 passed levels qualify for Core (Paid) promotion upon Admin approval.
            </p>
          </div>
        </Card>

        <Card padding="md">
          <span className="text-xs font-semibold text-slate-500">My Assigned Parts</span>
          <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">{allParts.length}</div>
          <p className="text-xs text-slate-500 mt-1">{donePartsCount} parts completed</p>
        </Card>

        <Card padding="md">
          <span className="text-xs font-semibold text-slate-500">My Attendance</span>
          <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">
            {myRegister?.attendanceThisMonth ?? 0}%
          </div>
          <p className="text-xs text-slate-500 mt-1">Minimum 75% for Level 1 Certificate</p>
        </Card>

        <Card padding="md">
          <span className="text-xs font-semibold text-slate-500">Today's Status</span>
          <div className="text-3xl font-black text-emerald-600 mt-1">
            {isCheckedIn ? 'Present' : 'Not Checked In'}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isCheckedIn ? 'Attendance confirmed' : 'Check in before 11:00'}
          </p>
        </Card>
      </div>

      {tasks.length === 0 && (
        <EmptyState
          title="No tasks assigned yet"
          description="Your team lead or core mentor has not assigned deliverables to you yet. You will be notified immediately when a task part is assigned."
          actionLabel="Check Attendance"
          onAction={() => navigate('/attendance')}
        />
      )}
    </div>
  );
};
export default HomeScreen;
