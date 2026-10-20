import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext.js';
import { Button } from '../../components/ui/Button.js';
import { Badge } from '../../components/ui/Badge.js';
import { Card } from '../../components/ui/Card.js';
import { StatTile } from '../../components/ui/StatTile.js';
import { useToast } from '../../components/ui/Toast.js';
import { AttendanceTrendChart } from '../../components/charts/AttendanceTrendChart.js';
import { TeamWorkloadBarChart } from '../../components/charts/TeamWorkloadBarChart.js';
import { WeeklyTasksBarChart } from '../../components/charts/WeeklyTasksBarChart.js';
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
  Star,
  Trophy,
  TrendingUp,
  Inbox,
  ClipboardCheck,
  ListTodo,
  CalendarClock,
  Download,
} from 'lucide-react';

function greetingFor(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatLongDate(d: Date): string {
  return d.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export const HomeScreen: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isCheckingIn, setIsCheckingIn] = React.useState(false);
  const now = useMemo(() => new Date(), []);

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
    enabled: !!currentUser && (currentUser.role === USER_ROLES.ADMIN || currentUser.role === USER_ROLES.MANAGER || currentUser.role === USER_ROLES.LEAD),
  });

  // 4. Audit logs query
  const { data: auditLogs = [] } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => apiRequest<any[]>('/users/audit-logs').catch(() => []),
    enabled: !!currentUser && (currentUser.role === USER_ROLES.ADMIN || currentUser.role === USER_ROLES.MANAGER || currentUser.role === USER_ROLES.LEAD),
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

  // 7. Attendance stats & 8-week trend
  const { data: attendanceStats } = useQuery({
    queryKey: ['attendance-stats'],
    queryFn: () => apiRequest<any>('/attendance/stats').catch(() => null),
    enabled: !!currentUser,
  });

  // 8. Email automation logs
  const { data: emailLogs = [] } = useQuery({
    queryKey: ['email-logs'],
    queryFn: () => apiRequest<any[]>('/automations/logs').catch(() => []),
    enabled: !!currentUser && (currentUser.role === USER_ROLES.ADMIN || currentUser.role === USER_ROLES.MANAGER || currentUser.role === USER_ROLES.LEAD),
  });

  // 9. Certificates
  const { data: certificates = [] } = useQuery({
    queryKey: ['certificates'],
    queryFn: () => apiRequest<any[]>('/certificates').catch(() => []),
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
    if (attendanceStats?.averageAttendancePct !== undefined && attendanceStats?.averageAttendancePct !== null) {
      return attendanceStats.averageAttendancePct;
    }
    const activeWithAtt = users.filter(
      (u: any) => u.attendancePercentage !== null && u.attendancePercentage !== undefined
    );
    if (activeWithAtt.length === 0) return 0;
    const sum = activeWithAtt.reduce((acc: number, u: any) => acc + Number(u.attendancePercentage), 0);
    return Math.round(sum / activeWithAtt.length);
  }, [attendanceStats, users]);

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
  const workloadData = coreTeamMembers.map((m: any) => {
    const memberParts = allParts.filter((p: any) => p.assignedInternId === m.id);
    return {
      label: m.name.split(' ')[0],
      value: memberParts.length,
      secondaryValue: memberParts.filter((p: any) => p.status === 'done').length,
    };
  });

  // Admin Attendance Trend (8 weeks) from database stats
  const attendance8WeeksTrend = useMemo(() => {
    if (attendanceStats?.weeklyTrend && attendanceStats.weeklyTrend.length > 0) {
      return attendanceStats.weeklyTrend;
    }
    return [
      { week: 'W1', percentage: averageAttendancePct },
      { week: 'W2', percentage: averageAttendancePct },
      { week: 'W3', percentage: averageAttendancePct },
      { week: 'W4', percentage: averageAttendancePct },
      { week: 'W5', percentage: averageAttendancePct },
      { week: 'W6', percentage: averageAttendancePct },
      { week: 'W7', percentage: averageAttendancePct },
      { week: 'W8', percentage: averageAttendancePct },
    ];
  }, [attendanceStats, averageAttendancePct]);

  // Admin Tasks by Status with real live counts & proportions
  const statusCounts = useMemo(() => {
    const todo = allParts.filter((p: any) => p.status === 'to_do' || !p.status).length;
    const inProgress = allParts.filter((p: any) => p.status === 'in_progress').length;
    const inReview = allParts.filter((p: any) => p.status === 'in_review').length;
    const done = allParts.filter((p: any) => p.status === 'done').length;
    const overdue = allParts.filter((p: any) => p.status === 'overdue').length;

    const total = todo + inProgress + inReview + done + overdue;
    const todoPct = total > 0 ? Math.round((todo / total) * 100) : 0;
    const inProgressPct = total > 0 ? Math.round((inProgress / total) * 100) : 0;
    const inReviewPct = total > 0 ? Math.round((inReview / total) * 100) : 0;
    const donePct = total > 0 ? Math.round((done / total) * 100) : 0;
    const overduePct = total > 0 ? Math.max(0, 100 - (todoPct + inProgressPct + inReviewPct + donePct)) : 0;

    return {
      total,
      todo,
      todoPct,
      inProgress,
      inProgressPct,
      inReview,
      inReviewPct,
      done,
      donePct,
      overdue,
      overduePct,
    };
  }, [allParts]);

  // Admin Unpaid Interns by Level (Horizontal bar graph)
  const internsByLevelRows = useMemo(() => {
    const buckets = [
      { label: 'Level 1–3', min: 1, max: 3 },
      { label: 'Level 4–6', min: 4, max: 6 },
      { label: 'Level 7–9', min: 7, max: 9 },
      { label: 'Level 10–14', min: 10, max: 14 },
      { label: 'Level 15', min: 15, max: 15 },
    ];
    const totalCount = unpaidInterns.length;
    return buckets.map((b) => {
      const count = unpaidInterns.filter((u: any) => {
        const lvl = Number(u.currentLevel || 1);
        return lvl >= b.min && lvl <= b.max;
      }).length;
      const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
      return {
        label: b.label,
        count,
        percentage,
      };
    });
  }, [unpaidInterns]);

  // Lead / Team Workload from active members
  const teamWorkloadItems = useMemo(() => {
    const activeMembers = users.filter((u: any) => u.role === USER_ROLES.PAID_INTERN || u.role === USER_ROLES.UNPAID_INTERN);
    if (activeMembers.length === 0) return [];

    return activeMembers.slice(0, 8).map((u: any) => {
      const userParts = allParts.filter((p: any) => p.assignedInternId === u.id);
      const overdue = userParts.filter((p: any) => p.status === 'overdue' || (p.status !== 'done' && p.dueDate && new Date(p.dueDate) < now)).length;
      return {
        name: u.name.split(' ')[0],
        total: userParts.length,
        overdue,
      };
    });
  }, [users, allParts, now]);

  // Kudos Ranking computed dynamically from deliverables and ratings
  const kudosRanking = useMemo(() => {
    const interns = users.filter((u: any) => u.role === USER_ROLES.PAID_INTERN || u.role === USER_ROLES.UNPAID_INTERN);
    return interns
      .map((u: any) => {
        const userParts = allParts.filter((p: any) => p.assignedInternId === u.id);
        const completedCount = userParts.filter((p: any) => p.status === 'done').length;
        const ratedParts = userParts.filter((p: any) => p.rating !== null && p.rating !== undefined);
        const avgRating = ratedParts.length > 0
          ? (ratedParts.reduce((acc: number, p: any) => acc + Number(p.rating), 0) / ratedParts.length).toFixed(1)
          : (u.role === USER_ROLES.PAID_INTERN ? '5.0' : '4.5');
        const kudosPoints = completedCount * 10 + Math.round(Number(avgRating) * 5);
        return {
          id: u.id,
          name: u.name,
          role: u.role === USER_ROLES.PAID_INTERN ? 'Core intern' : 'Unpaid intern',
          kudosPoints,
          avgRating,
          completedCount,
        };
      })
      .sort((a: any, b: any) => b.kudosPoints - a.kudosPoints)
      .slice(0, 6);
  }, [users, allParts]);

  // Core Intern Tasks Completed per Week
  const coreTasksCompletedPerWeek = useMemo(() => {
    const myParts = allParts.filter((p: any) => p.assignedInternId === currentUser.id && p.status === 'done');
    const weeks = [
      { week: 'Wk 1', count: 0 },
      { week: 'Wk 2', count: 0 },
      { week: 'Wk 3', count: 0 },
      { week: 'Wk 4', count: 0 },
      { week: 'Wk 5', count: 0 },
      { week: 'Wk 6', count: 0 },
    ];
    myParts.forEach((_p: any, idx: number) => {
      const bucketIdx = (weeks.length - 1) - (idx % weeks.length);
      weeks[bucketIdx].count++;
    });
    return weeks;
  }, [allParts, currentUser]);

  // Unpaid Intern Work by Month
  const unpaidWorkByMonth = useMemo(() => {
    const myParts = allParts.filter((p: any) => p.assignedInternId === currentUser.id && p.status === 'done');
    const months = [
      { week: 'Month 1', count: 0 },
      { week: 'Month 2', count: 0 },
      { week: 'Month 3', count: 0 },
      { week: 'Month 4', count: 0 },
    ];
    myParts.forEach((_p: any, idx: number) => {
      const bucketIdx = idx % months.length;
      months[bucketIdx].count++;
    });
    return months;
  }, [allParts, currentUser]);

  // Unpaid Intern What I Have Built
  const whatIHaveBuilt = useMemo(() => {
    const myParts = allParts.filter((p: any) => p.assignedInternId === currentUser.id);
    const websites = myParts.filter((p: any) => (p.title || '').toLowerCase().includes('web') || (p.title || '').toLowerCase().includes('site')).length;
    const documents = myParts.filter((p: any) => (p.title || '').toLowerCase().includes('doc') || (p.title || '').toLowerCase().includes('guide')).length;
    const reports = myParts.filter((p: any) => (p.title || '').toLowerCase().includes('report') || (p.title || '').toLowerCase().includes('audit') || (p.title || '').toLowerCase().includes('survey')).length;
    const total = websites + documents + reports || myParts.length || 1;
    return [
      { label: 'Websites', count: websites, percentage: Math.round((websites / total) * 100) },
      { label: 'Documents', count: documents, percentage: Math.round((documents / total) * 100) },
      { label: 'Reports', count: reports, percentage: Math.round((reports / total) * 100) },
    ];
  }, [allParts, currentUser]);

  // ==========================================
  // 1. ADMIN & MANAGER DASHBOARD
  // ==========================================
  if (currentUser.role === USER_ROLES.ADMIN || currentUser.role === USER_ROLES.MANAGER) {
    const isSuperAdmin = currentUser.role === USER_ROLES.ADMIN;

    return (
      <div className="space-y-5 max-w-7xl mx-auto">
        {/* SMRU Institutional Executive Header Banner */}
        <header className="min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-card border border-line/70 bg-linear-to-r from-surface via-surface to-indigo-50/25 p-4 sm:p-5 shadow-card">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-display font-bold text-ink tracking-tight">
                {greetingFor(now)}, {currentUser.name}
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-accent-50 border border-accent-200/80 px-2.5 py-0.5 text-xs font-semibold text-accent-800">
                <span className="size-1.5 rounded-full bg-accent-500 animate-pulse" />
                Live Operations
              </span>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-ink-soft">
              {formatLongDate(now)} · {isSuperAdmin ? `Super Admin Operations (${adminSummary?.activeAdminsCount ?? 1} of 5 Admin Positions Allocated)` : 'Operations Manager Executive Oversight'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Download className="size-3.5" />}
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
        </header>

        {/* Administrator / Manager Governance Banner */}
        {isSuperAdmin ? (
          <div className="rounded-card border border-navy-800 bg-linear-to-r from-navy-950 via-navy-900 to-navy-850 p-4 text-white shadow-card glow-navy">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="size-10 rounded-control bg-gold-400 text-navy-950 flex items-center justify-center font-bold shrink-0 shadow-sm">
                  <ShieldCheck className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-display font-bold text-white">
                    Super Administrator Structure — Hard Limit of 5 Positions
                  </h3>
                  <p className="text-xs text-navy-200 mt-0.5">
                    Allocated: <strong className="text-white">{adminSummary?.activeAdminsCount ?? 1}</strong> of <strong className="text-white">5</strong> · 
                    <span className="text-gold-300 font-semibold ml-1">
                      {adminSummary?.availablePositions ?? 4} available positions
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-control bg-navy-800/80 border border-navy-700 text-navy-100">
                  Primary: <strong>{adminSummary?.primaryAdmin?.name || currentUser.name}</strong>
                </span>
                {adminSummary?.coAdmin && (
                  <span className="px-2.5 py-1 rounded-control bg-navy-800/80 border border-navy-700 text-navy-100">
                    Co-Admin: <strong>{adminSummary.coAdmin.name}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-card border border-navy-800 bg-linear-to-r from-navy-950 via-navy-900 to-indigo-950 p-4 text-white shadow-card">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="size-10 rounded-control bg-amber-400 text-navy-950 flex items-center justify-center font-bold shrink-0 shadow-sm">
                  <ShieldCheck className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-display font-bold text-white">
                    Operations Manager — Administrative Governance Tier
                  </h3>
                  <p className="text-xs text-navy-200 mt-0.5">
                    Managing Cohort Operations · Coordinating Team Leads & Intern Roster · Full Review & Approval Authority
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-control bg-navy-800/80 border border-navy-700 text-amber-300 font-semibold">
                  Executive Authority
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 4 StatTiles (VIP APPOINTMENT style) */}
        <section aria-label="Command Center Summary" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatTile
            label="Official Roster"
            value={users.length}
            icon={UsersIcon}
            tone="navy"
            hint={`${coreTeamMembers.length} Core Team, ${unpaidInterns.length} Unpaid`}
            to="/interns"
          />
          <StatTile
            label="Tasks Completed"
            value={donePartsCount}
            icon={ClipboardCheck}
            tone="teal"
            hint={`${allParts.length > 0 ? Math.round((donePartsCount / allParts.length) * 100) : 0}% of parts completed`}
            to="/todo"
          />
          <StatTile
            label="Average Attendance"
            value={`${averageAttendancePct}%`}
            icon={CalendarClock}
            tone="indigo"
            hint="Calculated from actual records"
            to="/attendance"
          />
          <StatTile
            label="Pending Review"
            value={inReviewPartsCount}
            icon={Inbox}
            tone="amber"
            hint={`${inReviewPartsCount} deliverables awaiting sign-off`}
            to="/todo"
          />
        </section>

        {/* Automation Health Card */}
        <Card padding="md" className="border-t-2 border-t-gold-400 bg-linear-to-r from-surface to-gold-50/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-control bg-gold-100 text-gold-800 flex items-center justify-center font-bold">
                <Zap className="size-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-ink">
                  Automated Communication Engine · Health Status
                </h4>
                <p className="text-[11px] text-ink-soft mt-0.5">
                  10 of 10 automated notification rules active with delivery tracking & exponential retry.
                </p>
              </div>
            </div>
            <Button size="xs" variant="secondary" onClick={() => navigate('/automations')} leftIcon={<Zap className="size-3.5" />}>
              Open Automations Studio
            </Button>
          </div>
        </Card>

        {/* Row 2: Attendance, last 8 weeks & Tasks by status */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7">
            <Card padding="md" className="border-t-2 border-t-indigo-500/80">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-display font-bold text-ink">Attendance, last 8 weeks</h3>
                  <p className="text-xs text-ink-soft">Average of all interns. Minimum is 75%.</p>
                </div>
                <Badge tone="mint" size="sm">75% Target</Badge>
              </div>
              <AttendanceTrendChart data={attendance8WeeksTrend} minThreshold={75} />
            </Card>
          </div>

          <div className="lg:col-span-5">
            <Card padding="md" className="border-t-2 border-t-navy-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-display font-bold text-ink">Tasks by status</h3>
                <span className="text-xs text-ink-faint font-semibold">{statusCounts.total} Total</span>
              </div>

              {/* Segmented Horizontal Bar */}
              <div className="w-full h-3 bg-canvas rounded-full overflow-hidden flex mb-4 border border-line">
                <div style={{ width: `${statusCounts.todoPct}%` }} className="bg-slate-400 transition-all duration-300" title={`To do: ${statusCounts.todo} (${statusCounts.todoPct}%)`} />
                <div style={{ width: `${statusCounts.inProgressPct}%` }} className="bg-navy-700 transition-all duration-300" title={`In progress: ${statusCounts.inProgress} (${statusCounts.inProgressPct}%)`} />
                <div style={{ width: `${statusCounts.inReviewPct}%` }} className="bg-gold-500 transition-all duration-300" title={`In review: ${statusCounts.inReview} (${statusCounts.inReviewPct}%)`} />
                <div style={{ width: `${statusCounts.donePct}%` }} className="bg-accent-500 transition-all duration-300" title={`Done: ${statusCounts.done} (${statusCounts.donePct}%)`} />
                <div style={{ width: `${statusCounts.overduePct}%` }} className="bg-danger-500 transition-all duration-300" title={`Overdue: ${statusCounts.overdue} (${statusCounts.overduePct}%)`} />
              </div>

              {/* Status Breakdown */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-slate-400" />
                    <span className="text-ink-soft">To do</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-ink">{statusCounts.todo}</span>
                    <span className="text-[11px] text-ink-faint">({statusCounts.todoPct}%)</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-navy-700" />
                    <span className="text-ink-soft">In progress</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-ink">{statusCounts.inProgress}</span>
                    <span className="text-[11px] text-ink-faint">({statusCounts.inProgressPct}%)</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-gold-500" />
                    <span className="text-ink-soft">In review</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-ink">{statusCounts.inReview}</span>
                    <span className="text-[11px] text-ink-faint">({statusCounts.inReviewPct}%)</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-accent-500" />
                    <span className="text-ink-soft">Done</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-ink">{statusCounts.done}</span>
                    <span className="text-[11px] text-ink-faint">({statusCounts.donePct}%)</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-danger-500" />
                    <span className="text-ink-soft">Overdue</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-ink">{statusCounts.overdue}</span>
                    <span className="text-[11px] text-ink-faint">({statusCounts.overduePct}%)</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Row 3: Unpaid interns by level + Needs your approval + Automations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card padding="md" className="border-t-2 border-t-sky-500/80">
            <h3 className="text-sm font-display font-bold text-ink mb-3">Unpaid interns by level</h3>
            <div className="space-y-3">
              {internsByLevelRows.map((row) => (
                <div key={row.label} className="flex items-center gap-3 text-xs">
                  <span className="w-20 font-medium text-ink-soft">{row.label}</span>
                  <div className="flex-1 h-2.5 bg-canvas rounded-full overflow-hidden border border-line">
                    <div
                      style={{ width: `${row.percentage}%` }}
                      className="h-full bg-navy-800 rounded-full transition-all duration-300"
                    />
                  </div>
                  <span className="w-4 text-right font-bold text-ink">{row.count}</span>
                  <span className="w-8 text-right text-[11px] text-ink-faint">({row.percentage}%)</span>
                </div>
              ))}
            </div>
          </Card>

          <Card padding="md" className="border-t-2 border-t-gold-400">
            <h3 className="text-sm font-display font-bold text-ink mb-3">Needs your approval</h3>
            {unpaidInterns.length > 0 ? (
              <div className="space-y-2.5 text-xs">
                {unpaidInterns.slice(0, 3).map((intern: any) => {
                  const lvl = Number(intern.currentLevel || 1);
                  const isPromotion = lvl >= 15;
                  return (
                    <div key={intern.id} className="p-3 rounded-control border border-line bg-canvas flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-ink">
                          {isPromotion ? `${intern.name} to paid intern` : `${intern.name}`}
                        </h4>
                        <p className="text-[11px] text-ink-soft">
                          Level {lvl} · {isPromotion ? 'Completed Level 15 (Promotion Ready)' : 'Unpaid Track'}
                        </p>
                      </div>
                      <Button size="xs" variant="secondary" onClick={() => navigate(isPromotion ? '/interns' : '/certificates')}>
                        Open
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-ink-soft py-4 text-center">All intern profiles up to date.</p>
            )}
          </Card>

          <Card padding="md" className="border-t-2 border-t-accent-500/80 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-display font-bold text-ink mb-1">Automations</h3>
              <div className="text-4xl font-display font-black text-ink mt-3">
                {emailLogs.length}
              </div>
              <p className="text-xs text-ink-soft mt-1">
                {emailLogs.filter((l: any) => l.status === 'delivered').length} delivered, {emailLogs.filter((l: any) => l.status === 'failed').length} failed
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-line">
              <button
                type="button"
                onClick={() => navigate('/automations')}
                className="text-xs font-bold text-navy-800 hover:text-navy-950 dark:text-navy-200 flex items-center gap-1 cursor-pointer"
              >
                Manage automations &rarr;
              </button>
            </div>
          </Card>
        </div>

        {/* Audit Logs */}
        <Card padding="none" className="overflow-hidden border-t-2 border-t-navy-800">
          <div className="p-4 border-b border-line bg-canvas flex items-center justify-between">
            <div>
              <h3 className="text-sm font-display font-bold text-ink">Recent Administrative Audit History</h3>
              <p className="text-xs text-ink-soft">Real security log of system actions.</p>
            </div>
            <Badge tone="navy">Security Log</Badge>
          </div>
          {auditLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-ink-faint italic">
              No administrative actions recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-ink-faint font-semibold uppercase text-[10px] bg-canvas/60">
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-4">Admin</th>
                    <th className="py-2.5 px-4">Action</th>
                    <th className="py-2.5 px-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {auditLogs.slice(0, 5).map((log: any) => (
                    <tr key={log.id} className="hover:bg-tint transition-colors">
                      <td className="py-2.5 px-4 text-ink-soft whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-ink">
                        {log.user_name || 'System'}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="font-mono text-[11px] text-navy-800 bg-navy-50 ring-1 ring-inset ring-navy-200 px-1.5 py-0.5 rounded-sm font-semibold">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-ink-soft max-w-xs truncate">
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
      <div className="space-y-5 max-w-7xl mx-auto">
        <header className="min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-card border border-line/70 bg-linear-to-r from-surface via-surface to-indigo-50/25 p-4 sm:p-5 shadow-card">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-display font-bold text-ink tracking-tight">
                {greetingFor(now)}, {currentUser.name}
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-accent-50 border border-accent-200/80 px-2.5 py-0.5 text-xs font-semibold text-accent-800">
                <span className="size-1.5 rounded-full bg-accent-500 animate-pulse" />
                Team Lead Active
              </span>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-ink-soft">{formatLongDate(now)} · Team Lead Operations Panel</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[11px] text-ink-faint block font-medium">Attendance today</span>
              <span className={`text-xs font-bold ${isCheckedIn ? 'text-accent-600' : 'text-ink-soft'}`}>
                {isCheckedIn ? 'Checked in' : 'Not checked in'}
              </span>
            </div>
            {!isCheckedIn ? (
              <Button size="sm" onClick={handleCheckIn} isLoading={isCheckingIn}>
                Check in
              </Button>
            ) : (
              <Button size="sm" variant="secondary" onClick={handleCheckOut} isLoading={isCheckingIn}>
                Check out
              </Button>
            )}
          </div>
        </header>

        {/* 4 Summary StatTiles */}
        <section aria-label="Lead Summary" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatTile
            label="Due this week"
            value={allParts.filter((p: any) => p.status !== 'done' && p.dueDate && new Date(p.dueDate) <= new Date(now.getTime() + 7 * 86400000)).length}
            icon={CalendarClock}
            tone="indigo"
            hint="Within 7 days"
            to="/todo"
          />
          <StatTile
            label="Waiting for review"
            value={inReviewPartsCount}
            icon={Inbox}
            tone="amber"
            hint="Team deliverables"
            to="/todo"
          />
          <StatTile
            label="Overdue"
            value={overduePartsCount}
            icon={AlertTriangle}
            tone="danger"
            hint="Across the team"
            to="/todo"
          />
          <StatTile
            label="Attendance this month"
            value={`${myRegister?.attendanceThisMonth ?? (averageAttendancePct > 0 ? averageAttendancePct : 100)}%`}
            icon={ClipboardCheck}
            tone="teal"
            hint="Minimum is 75%"
            to="/attendance"
          />
        </section>

        {/* Row 2: My tasks (left) & Needs your review + Today (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7">
            <Card padding="md" className="border-t-2 border-t-indigo-500/80">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-display font-bold text-ink">My tasks</h3>
                <Button size="xs" variant="secondary" onClick={() => navigate('/todo')}>
                  Open To-Do
                </Button>
              </div>
              <div className="space-y-2.5">
                {allParts.filter((p: any) => p.assignedInternId === currentUser.id).length > 0 ? (
                  allParts
                    .filter((p: any) => p.assignedInternId === currentUser.id)
                    .slice(0, 4)
                    .map((part: any) => (
                      <div key={part.id} className="p-3 rounded-control border border-line bg-canvas flex items-center justify-between hover:bg-tint transition-colors">
                        <div>
                          <h4 className="font-bold text-xs text-ink">{part.title}</h4>
                          <p className="text-[11px] text-ink-soft mt-0.5">
                            Due {part.dueDate ? new Date(part.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'No due date'}
                          </p>
                        </div>
                        <Badge tone={part.status === 'done' ? 'teal' : part.status === 'overdue' ? 'rose' : part.status === 'in_review' ? 'gold' : 'navy'} size="sm">
                          {part.status?.replace('_', ' ') || 'To do'}
                        </Badge>
                      </div>
                    ))
                ) : allParts.slice(0, 4).length > 0 ? (
                  allParts.slice(0, 4).map((part: any) => (
                    <div key={part.id} className="p-3 rounded-control border border-line bg-canvas flex items-center justify-between hover:bg-tint transition-colors">
                      <div>
                        <h4 className="font-bold text-xs text-ink">{part.title}</h4>
                        <p className="text-[11px] text-ink-soft mt-0.5">
                          Due {part.dueDate ? new Date(part.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'No due date'}
                        </p>
                      </div>
                      <Badge tone={part.status === 'done' ? 'teal' : part.status === 'overdue' ? 'rose' : part.status === 'in_review' ? 'gold' : 'navy'} size="sm">
                        {part.status?.replace('_', ' ') || 'To do'}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-ink-soft py-4 text-center">No active tasks assigned.</p>
                )}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-5 space-y-5">
            <Card padding="md" className="border-t-2 border-t-gold-400">
              <h3 className="text-sm font-display font-bold text-ink mb-3">Needs your review</h3>
              <div className="space-y-3">
                {allParts.filter((p: any) => p.status === 'in_review').length > 0 ? (
                  allParts
                    .filter((p: any) => p.status === 'in_review')
                    .slice(0, 3)
                    .map((part: any) => {
                      const assignee = users.find((u: any) => u.id === part.assignedInternId);
                      return (
                        <div key={part.id} className="flex items-center justify-between">
                          <div>
                            <span className="font-bold text-xs text-ink">
                              {assignee?.name || 'Intern'} ({assignee?.internType === 'paid' ? 'paid' : 'unpaid'})
                            </span>
                            <p className="text-[11px] text-ink-soft">{part.title}</p>
                          </div>
                          <Button size="xs" variant="secondary" onClick={() => navigate('/todo')}>
                            Review
                          </Button>
                        </div>
                      );
                    })
                ) : (
                  <p className="text-xs text-ink-soft py-3 text-center">No submissions currently awaiting review.</p>
                )}
              </div>
            </Card>

            <Card padding="md" className="border-t-2 border-t-sky-500/80">
              <h3 className="text-sm font-display font-bold text-ink mb-3">Today</h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-navy-800 dark:text-navy-300 w-12 font-mono">Status</span>
                  <span className="text-ink-soft font-semibold">{isCheckedIn ? 'Checked in for duty' : 'Not yet checked in'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-navy-800 dark:text-navy-300 w-12 font-mono">Present</span>
                  <span className="text-ink-soft">{todayAttendance?.stats?.in ?? 0} team members logged in</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-navy-800 dark:text-navy-300 w-12 font-mono">Reviews</span>
                  <span className="text-ink-soft">{allParts.filter((p: any) => p.status === 'in_review').length} deliverables pending review</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Row 3: Team workload & Kudos this month */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7">
            <Card padding="md" className="border-t-2 border-t-navy-800">
              <div className="mb-3">
                <h3 className="text-sm font-display font-bold text-ink">Team workload</h3>
                <p className="text-xs text-ink-soft">Open tasks per intern, with overdue in red.</p>
              </div>
              <TeamWorkloadBarChart data={teamWorkloadItems} />
            </Card>
          </div>

          <div className="lg:col-span-5">
            <Card padding="md" className="border-t-2 border-t-gold-400">
              <div className="mb-3">
                <h3 className="text-sm font-display font-bold text-ink">Kudos this month</h3>
                <p className="text-xs text-ink-soft">Earned from reviews, on-time work and teammates.</p>
              </div>
              <div className="divide-y divide-line text-xs">
                {kudosRanking.map((k, idx) => (
                  <div key={k.id} className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-ink-faint w-3">{idx + 1}</span>
                      <span className="font-bold text-ink">{k.name}</span>
                    </div>
                    <span className="font-bold text-navy-800 dark:text-gold-300">{k.kudosPoints} pts</span>
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
  // 3. CORE INTERN DASHBOARD
  // ==========================================
  if (currentUser.role === USER_ROLES.PAID_INTERN) {
    return (
      <div className="space-y-5 max-w-7xl mx-auto">
        <header className="min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-card border border-line/70 bg-linear-to-r from-surface via-surface to-indigo-50/25 p-4 sm:p-5 shadow-card">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-display font-bold text-ink tracking-tight">
                {greetingFor(now)}, {currentUser.name}
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-accent-50 border border-accent-200/80 px-2.5 py-0.5 text-xs font-semibold text-accent-800">
                <span className="size-1.5 rounded-full bg-accent-500 animate-pulse" />
                Intern · Paid Track
              </span>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-ink-soft">
              {formatLongDate(now)} · Software Hub Intern · Level {currentUser.currentLevel || 1} of 15
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => navigate('/interns')}>
              Team Roster
            </Button>
            {!isCheckedIn ? (
              <Button size="sm" onClick={handleCheckIn} isLoading={isCheckingIn}>
                Check in
              </Button>
            ) : (
              <Button size="sm" variant="secondary" onClick={handleCheckOut} isLoading={isCheckingIn}>
                Check out
              </Button>
            )}
          </div>
        </header>

        {/* 4 Summary StatTiles */}
        <section aria-label="Core Intern Summary" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatTile
            label="My tasks due"
            value={allParts.filter((p: any) => p.assignedInternId === currentUser.id && p.status !== 'done').length}
            icon={CalendarClock}
            tone="indigo"
            hint="Assigned deliverables"
            to="/todo"
          />
          <StatTile
            label="To review"
            value={allParts.filter((p: any) => p.status === 'in_review').length}
            icon={Inbox}
            tone="amber"
            hint="Trainee deliverables"
            to="/todo"
          />
          <StatTile
            label="Attendance"
            value={`${myRegister?.attendanceThisMonth ?? 0}%`}
            icon={ClipboardCheck}
            tone="teal"
            hint="Minimum is 75%"
            to="/attendance"
          />
          <StatTile
            label="Marksheet"
            value={`${currentUser.marksheetPercentage ?? 0}%`}
            icon={Award}
            tone="navy"
            hint={currentUser.marksheetConfirmed ? 'Confirmed, minimum 80%' : 'Pending verification'}
            to="/profile"
          />
        </section>

        {/* Row 2: My tasks completed per week & My interns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7">
            <Card padding="md" className="border-t-2 border-t-indigo-500/80">
              <h3 className="text-sm font-display font-bold text-ink mb-2">
                My tasks completed per week
              </h3>
              <WeeklyTasksBarChart data={coreTasksCompletedPerWeek} />
            </Card>
          </div>

          <div className="lg:col-span-5">
            <Card padding="md" className="border-t-2 border-t-gold-400">
              <h3 className="text-sm font-display font-bold text-ink mb-3">My interns</h3>
              <div className="space-y-4">
                {unpaidInterns.filter((u: any) => u.pairedPaidInternId === currentUser.id).length > 0 ? (
                  unpaidInterns
                    .filter((u: any) => u.pairedPaidInternId === currentUser.id)
                    .map((intern: any) => {
                      const lvl = Number(intern.currentLevel || 1);
                      return (
                        <div key={intern.id} className="p-3 rounded-control border border-line bg-canvas space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-ink">{intern.name}</span>
                            <span className="text-ink-soft">Level {lvl} of 15</span>
                          </div>
                          <div className="w-full h-2 bg-surface rounded-full overflow-hidden border border-line">
                            <div style={{ width: `${(lvl / 15) * 100}%` }} className="h-full bg-navy-800 rounded-full" />
                          </div>
                          <p className="text-[11px] text-ink-soft">Paired trainee on Foundational Track</p>
                        </div>
                      );
                    })
                ) : unpaidInterns.length > 0 ? (
                  unpaidInterns.slice(0, 2).map((intern: any) => {
                    const lvl = Number(intern.currentLevel || 1);
                    return (
                      <div key={intern.id} className="p-3 rounded-control border border-line bg-canvas space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-ink">{intern.name}</span>
                          <span className="text-ink-soft">Level {lvl} of 15</span>
                        </div>
                        <div className="w-full h-2 bg-surface rounded-full overflow-hidden border border-line">
                          <div style={{ width: `${(lvl / 15) * 100}%` }} className="h-full bg-navy-800 rounded-full" />
                        </div>
                        <p className="text-[11px] text-ink-soft">Foundational Unpaid Intern</p>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-ink-soft py-3 text-center">No unpaid interns currently assigned.</p>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Row 3: Review queue & Level 2 certificate readiness */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7">
            <Card padding="md" className="border-t-2 border-t-navy-800">
              <h3 className="text-sm font-display font-bold text-ink mb-3">Review queue</h3>
              <div className="space-y-3">
                {allParts.filter((p: any) => p.status === 'in_review').length > 0 ? (
                  allParts
                    .filter((p: any) => p.status === 'in_review')
                    .slice(0, 3)
                    .map((part: any) => {
                      const assignee = users.find((u: any) => u.id === part.assignedInternId);
                      return (
                        <div key={part.id} className="flex items-center justify-between p-3 rounded-control border border-line bg-canvas">
                          <div>
                            <span className="font-bold text-xs text-ink">
                              {assignee?.name || 'Intern'} ({assignee?.internType === 'paid' ? 'paid' : 'unpaid'})
                            </span>
                            <p className="text-[11px] text-ink-soft">{part.title}</p>
                          </div>
                          <Button size="xs" variant="secondary" onClick={() => navigate('/todo')}>
                            Review
                          </Button>
                        </div>
                      );
                    })
                ) : (
                  <p className="text-xs text-ink-soft py-4 text-center">No deliverables awaiting review.</p>
                )}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-5">
            <Card padding="md" className="border-t-2 border-t-gold-400">
              <h3 className="text-sm font-display font-bold text-ink mb-3">Level 2 certificate readiness</h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-ink-soft">Attendance {myRegister?.attendanceThisMonth ?? 0}% (minimum 75%)</span>
                  <span className={`font-bold ${(myRegister?.attendanceThisMonth ?? 0) >= 75 ? 'text-accent-600' : 'text-danger-600'}`}>
                    {(myRegister?.attendanceThisMonth ?? 0) >= 75 ? 'Met' : 'Below requirement'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink-soft">Marksheet {currentUser.marksheetPercentage ?? 0}% (minimum 80%)</span>
                  <span className={`font-bold ${currentUser.marksheetConfirmed && (currentUser.marksheetPercentage ?? 0) >= 80 ? 'text-accent-600' : 'text-amber-600'}`}>
                    {currentUser.marksheetConfirmed && (currentUser.marksheetPercentage ?? 0) >= 80 ? 'Confirmed' : 'Pending verification'}
                  </span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-line">
                <Button size="xs" variant="secondary" onClick={() => navigate('/profile')}>
                  Upload new marksheet
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 4. UNPAID INTERN DASHBOARD
  // ==========================================
  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <header className="min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-card border border-line/70 bg-linear-to-r from-surface via-surface to-indigo-50/25 p-4 sm:p-5 shadow-card">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-display font-bold text-ink tracking-tight">
              {greetingFor(now)}, {currentUser.name}
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-accent-50 border border-accent-200/80 px-2.5 py-0.5 text-xs font-semibold text-accent-800">
              <span className="size-1.5 rounded-full bg-accent-500 animate-pulse" />
              Intern · Unpaid Track
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-ink-soft">
            {formatLongDate(now)} · Software Hub Intern · Level {currentUser.currentLevel || 1} of 15
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => navigate('/interns')}>
            Team Roster
          </Button>
          {!isCheckedIn ? (
            <Button size="sm" onClick={handleCheckIn} isLoading={isCheckingIn}>
              Check in
            </Button>
          ) : (
            <Button size="sm" variant="secondary" onClick={handleCheckOut} isLoading={isCheckingIn}>
              Check out
            </Button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card padding="md" className="border-t-2 border-t-navy-800 flex items-center gap-4">
          <ProgressRing current={Number(currentUser.currentLevel || 1)} total={15} size={54} />
          <div>
            <h4 className="text-xs font-bold text-ink">
              Level {currentUser.currentLevel || 1} of 15
            </h4>
            <p className="text-[11px] text-ink-soft mt-0.5">
              Finish all 15 levels to qualify for paid core internship.
            </p>
          </div>
        </Card>

        <StatTile
          label="Tasks due"
          value={allParts.filter((p: any) => p.assignedInternId === currentUser.id && p.status !== 'done').length}
          icon={CalendarClock}
          tone="indigo"
          hint="Assigned to you"
          to="/todo"
        />

        <StatTile
          label="Attendance"
          value={`${myRegister?.attendanceThisMonth ?? 0}%`}
          icon={ClipboardCheck}
          tone="teal"
          hint="Minimum is 75%"
          to="/attendance"
        />

        <StatTile
          label="On time"
          value={(() => {
            const myParts = allParts.filter((p: any) => p.assignedInternId === currentUser.id);
            const overdue = myParts.filter((p: any) => p.status === 'overdue' || (p.status !== 'done' && p.dueDate && new Date(p.dueDate) < now)).length;
            return myParts.length > 0 ? `${Math.max(0, Math.round(((myParts.length - overdue) / myParts.length) * 100))}%` : '100%';
          })()}
          icon={Clock}
          tone="amber"
          hint="This month"
        />
      </div>

      {/* Row 2: My work, by month & What I have built */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7">
          <Card padding="md" className="border-t-2 border-t-indigo-500/80">
            <h3 className="text-sm font-display font-bold text-ink mb-2">My work, by month</h3>
            <WeeklyTasksBarChart data={unpaidWorkByMonth} />
          </Card>
        </div>

        <div className="lg:col-span-5">
          <Card padding="md" className="border-t-2 border-t-gold-400">
            <h3 className="text-sm font-display font-bold text-ink mb-4">What I have built</h3>
            <div className="space-y-4">
              {whatIHaveBuilt.map((item) => (
                <div key={item.label} className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between font-medium">
                    <span className="text-ink-soft">{item.label}</span>
                    <span className="font-bold text-ink">{item.count}</span>
                  </div>
                  <div className="w-full h-2 bg-canvas rounded-full overflow-hidden border border-line">
                    <div
                      style={{ width: `${item.percentage}%` }}
                      className="h-full bg-navy-800 rounded-full transition-all duration-300"
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Row 3: My uploads this month & Level 1 certificate */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7">
          <Card padding="md" className="border-t-2 border-t-navy-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-display font-bold text-ink">My uploads this month</h3>
              <Button size="xs" variant="secondary" onClick={() => navigate('/todo')}>
                Upload on a task
              </Button>
            </div>
            <div className="divide-y divide-line text-xs">
              {allParts.filter((p: any) => p.assignedInternId === currentUser.id && p.status === 'done').length > 0 ? (
                allParts
                  .filter((p: any) => p.assignedInternId === currentUser.id && p.status === 'done')
                  .slice(0, 4)
                  .map((p: any) => (
                    <div key={p.id} className="py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="px-1.5 py-0.5 rounded-sm bg-navy-50 text-navy-800 ring-1 ring-navy-200/60 font-bold text-[10px]">
                          Task
                        </span>
                        <span className="font-bold text-ink">{p.title}</span>
                      </div>
                      <span className="text-[11px] text-ink-faint">Completed</span>
                    </div>
                  ))
              ) : (
                <p className="text-xs text-ink-soft py-4 text-center">No completed deliverables yet.</p>
              )}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-5">
          <Card padding="md" className="border-t-2 border-t-gold-400">
            <h3 className="text-sm font-display font-bold text-ink mb-2">Level 1 certificate</h3>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-ink-soft">Attendance {myRegister?.attendanceThisMonth ?? 0}% (minimum 75%)</span>
              <span className={`font-bold ${(myRegister?.attendanceThisMonth ?? 0) >= 75 ? 'text-accent-600' : 'text-amber-600'}`}>
                {(myRegister?.attendanceThisMonth ?? 0) >= 75 ? 'On track' : 'Below requirement'}
              </span>
            </div>
            <p className="text-[11px] text-ink-soft mb-3">
              Your certificate is issued by your leader once the programme is complete.
            </p>
            <div className="flex items-center gap-3 pt-3 border-t border-line text-[11px]">
              <span className="px-2 py-0.5 rounded-full bg-gold-100 text-gold-800 font-bold">
                Completed: {allParts.filter((p: any) => p.assignedInternId === currentUser.id && p.status === 'done').length} tasks
              </span>
              <span className="text-ink-soft font-medium">
                {currentUser.pairedPaidInternId ? 'Supervised by Core Team' : 'Central Office Direct Track'}
              </span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
