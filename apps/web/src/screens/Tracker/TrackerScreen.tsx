import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api.js';
import { Button } from '../../components/ui/Button.js';
import { Card } from '../../components/ui/Card.js';
import { StatTile } from '../../components/ui/StatTile.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { WeeklyTasksBarChart } from '../../components/charts/WeeklyTasksBarChart.js';
import { useToast } from '../../components/ui/Toast.js';
import { Download, FileSpreadsheet, Star, BarChart3, TrendingUp, CheckCircle2, Clock, CalendarClock, Award } from 'lucide-react';

export const TrackerScreen: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data: trackerData, isLoading } = useQuery({
    queryKey: ['tracker-metrics'],
    queryFn: () => apiRequest<any>('/tracker/metrics'),
  });

  // Level review mutation (Pass level / Repeat level)
  const reviewMutation = useMutation({
    mutationFn: async (decision: 'pass' | 'repeat') => {
      if (!trackerData?.currentReview) return;
      return apiRequest('/tracker/level-review', {
        method: 'POST',
        body: JSON.stringify({
          internId: trackerData.currentReview.internId,
          level: trackerData.currentReview.currentLevel,
          decision,
        }),
      });
    },
    onSuccess: (data) => {
      showToast({ type: 'success', title: 'Month-End Review', message: data.message });
      queryClient.invalidateQueries({ queryKey: ['tracker-metrics'] });
    },
    onError: (err: any) => {
      showToast({ type: 'error', title: 'Review action failed', message: err.message });
    },
  });

  const summary = trackerData?.summary || {
    tasksDone: 0,
    onTimeRate: 0,
    overdueNow: 0,
    averageRating: 0,
  };

  const interns = trackerData?.interns || [];
  const weeklyCompleted = trackerData?.weeklyCompleted || [];
  const currentReview = trackerData?.currentReview;

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-16">
      {/* SMRU Institutional Executive Header Banner */}
      <header className="min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-card border border-line/70 bg-linear-to-r from-surface via-surface to-indigo-50/25 p-4 sm:p-5 shadow-card">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-display font-bold text-ink tracking-tight">
              Performance Tracker
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-accent-50 border border-accent-200/80 px-2.5 py-0.5 text-xs font-semibold text-accent-800">
              <span className="size-1.5 rounded-full bg-accent-500 animate-pulse" />
              Real-time Metrics
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-ink-soft">
            Central Office intern progression, on-time deliverable completion, and review audits.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<FileSpreadsheet className="size-4 text-emerald-600" />}
            onClick={async () => {
              try {
                const blob = await apiRequest('/exports/tracker');
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'Command-Center-Tracker.xlsx';
                a.click();
              } catch (e: any) {
                showToast({ type: 'error', title: 'Export Failed', message: e.message });
              }
            }}
          >
            Export Excel
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Download className="size-4 text-navy-700" />}
            onClick={() => window.print()}
          >
            Export PDF
          </Button>
        </div>
      </header>

      {/* 4 Summary StatTiles */}
      <section aria-label="Tracker Summary" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatTile
          label="Tasks Completed"
          value={summary.tasksDone}
          icon={CheckCircle2}
          tone="navy"
          hint="Approved deliverables"
        />
        <StatTile
          label="On-Time Rate"
          value={`${summary.onTimeRate}%`}
          icon={Clock}
          tone="success"
          hint="Delivered before deadline"
        />
        <StatTile
          label="Overdue Parts"
          value={summary.overdueNow}
          icon={CalendarClock}
          tone={summary.overdueNow > 0 ? 'danger' : 'neutral'}
          hint="Requiring immediate attention"
        />
        <StatTile
          label="Average Quality Rating"
          value={summary.averageRating > 0 ? `${summary.averageRating.toFixed(1)} / 5.0` : '—'}
          icon={Star}
          tone="amber"
          hint="Lead & core reviews"
        />
      </section>

      {/* Main Grid: Interns Leaderboard + Weekly Chart / Month-End Review */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interns Table */}
        <div className="lg:col-span-7">
          <Card padding="none" className="overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Intern Deliverable Performance
              </h3>
              <span className="text-xs text-slate-400">{interns.length} Active Records</span>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
                Loading intern performance records...
              </div>
            ) : interns.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={<BarChart3 className="w-8 h-8" />}
                  title="No Intern Metrics Recorded Yet"
                  description="Deliverable completions and sprint review ratings will appear here as interns complete tasks."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[11px]">
                      <th className="py-3 px-4">Intern</th>
                      <th className="py-3 px-4">Done</th>
                      <th className="py-3 px-4">On time</th>
                      <th className="py-3 px-4">Overdue</th>
                      <th className="py-3 px-4">Rating</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {interns.map((i: any) => (
                      <tr key={i.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">{i.name}</td>
                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-semibold">{i.done}</td>
                        <td className="py-3.5 px-4 text-emerald-700 dark:text-emerald-400 font-semibold">{i.onTimeRate}%</td>
                        <td className="py-3.5 px-4 text-rose-600 dark:text-rose-400 font-bold">{i.overdueNow}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-current" />
                          <span>{i.averageRating > 0 ? i.averageRating.toFixed(1) : '—'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Right: Weekly Bar Chart & Month-End Review */}
        <div className="lg:col-span-5 space-y-6">
          {/* Weekly Bar Chart */}
          <Card padding="md">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">
              Tasks Completed per Week
            </h3>
            {weeklyCompleted.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No completed task volume recorded yet for this month.
              </div>
            ) : (
              <WeeklyTasksBarChart data={weeklyCompleted} maxCount={Math.max(10, ...weeklyCompleted.map((w: any) => w.count))} />
            )}
          </Card>

          {/* Month-End Level Review Action Pane */}
          {currentReview && (
            <Card padding="md" className="border-t-3 border-t-gold-400">
              <h3 className="text-sm font-display font-bold text-ink mb-1">
                Month-End Level Review
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                {currentReview.internName} · Level {currentReview.currentLevel} of 15
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {currentReview.tasksDone} tasks done · {currentReview.onTimeRate}% on time ·{' '}
                {currentReview.attendanceRate}% attendance
              </p>
              {currentReview.uploads && currentReview.uploads.length > 0 && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Uploads: {currentReview.uploads.join(', ')}
                </p>
              )}

              <div className="flex gap-2.5 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  size="sm"
                  variant="primary"
                  isLoading={reviewMutation.isPending}
                  onClick={() => reviewMutation.mutate('pass')}
                >
                  Pass Level
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  isLoading={reviewMutation.isPending}
                  onClick={() => reviewMutation.mutate('repeat')}
                >
                  Repeat Level
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
