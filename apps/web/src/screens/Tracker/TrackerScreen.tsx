import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api.js';
import { Button } from '../../components/ui/Button.js';
import { Badge } from '../../components/ui/Badge.js';
import { Card } from '../../components/ui/Card.js';
import { WeeklyTasksBarChart } from '../../components/charts/WeeklyTasksBarChart.js';
import { useToast } from '../../components/ui/Toast.js';
import { Download, FileSpreadsheet, Star } from 'lucide-react';

export const TrackerScreen: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data: trackerData } = useQuery({
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
    tasksDone: 38,
    onTimeRate: 88,
    overdueNow: 2,
    averageRating: 4.6,
  };

  const interns = trackerData?.interns || [];
  const weeklyCompleted = trackerData?.weeklyCompleted || [
    { week: 'Wk 1', count: 7 },
    { week: 'Wk 2', count: 9 },
    { week: 'Wk 3', count: 11 },
    { week: 'Wk 4', count: 6 },
  ];

  const currentReview = trackerData?.currentReview;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Tracker</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Progress for October 2026, which is month 4 for the current unpaid batch.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
            onClick={async () => {
              const blob = await apiRequest('/exports/tracker');
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'Command-Center-Tracker.xlsx';
              a.click();
            }}
          >
            Export Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="w-4 h-4 text-blue-600" />}
            onClick={() => window.print()}
          >
            Export PDF
          </Button>
        </div>
      </div>

      {/* 4 Summary Cards (Screen 11) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="md">
          <span className="text-xs font-semibold text-slate-500">Tasks done</span>
          <div className="text-3xl font-black text-slate-900 mt-1">{summary.tasksDone}</div>
        </Card>
        <Card padding="md">
          <span className="text-xs font-semibold text-slate-500">On-time rate</span>
          <div className="text-3xl font-black text-emerald-600 mt-1">{summary.onTimeRate}%</div>
        </Card>
        <Card padding="md">
          <span className="text-xs font-semibold text-slate-500">Overdue now</span>
          <div className="text-3xl font-black text-rose-600 mt-1">{summary.overdueNow}</div>
        </Card>
        <Card padding="md">
          <span className="text-xs font-semibold text-slate-500">Average rating</span>
          <div className="text-3xl font-black text-slate-900 mt-1">{summary.averageRating}</div>
        </Card>
      </div>

      {/* Main Grid: Performance Table & Review/Weekly */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Performance Table */}
        <div className="lg:col-span-7">
          <Card padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold uppercase text-[11px]">
                    <th className="py-3 px-4">Intern</th>
                    <th className="py-3 px-4">Done</th>
                    <th className="py-3 px-4">On time</th>
                    <th className="py-3 px-4">Overdue</th>
                    <th className="py-3 px-4">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {interns.map((i: any) => (
                    <tr key={i.id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{i.name}</td>
                      <td className="py-3.5 px-4 text-slate-700 font-semibold">{i.done}</td>
                      <td className="py-3.5 px-4 text-emerald-700 font-semibold">{i.onTimeRate}%</td>
                      <td className="py-3.5 px-4 text-rose-600 font-bold">{i.overdueNow}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-current" />
                        <span>{i.averageRating}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right: Tasks completed per week & Month-end review */}
        <div className="lg:col-span-5 space-y-6">
          {/* Weekly Bar Chart (Screen 11) */}
          <Card padding="md">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Tasks completed per week</h3>
            <WeeklyTasksBarChart data={weeklyCompleted} maxCount={12} />
          </Card>

          {/* Month-End Level Review Action Pane (Screen 11) */}
          {currentReview && (
            <Card padding="md" className="border-t-4 border-t-blue-600">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Month-end level review</h3>
              <p className="text-xs text-slate-600 font-semibold">
                {currentReview.internName} · Level {currentReview.currentLevel} of 15
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {currentReview.tasksDone} tasks done · {currentReview.onTimeRate}% on time ·{' '}
                {currentReview.attendanceRate}% attendance
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Uploads: {currentReview.uploads.join(', ')}
              </p>

              <div className="flex gap-2.5 mt-4 pt-3 border-t border-slate-100">
                <Button
                  size="sm"
                  variant="success"
                  isLoading={reviewMutation.isPending}
                  onClick={() => reviewMutation.mutate('pass')}
                >
                  Pass level
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  isLoading={reviewMutation.isPending}
                  onClick={() => reviewMutation.mutate('repeat')}
                >
                  Repeat level
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
