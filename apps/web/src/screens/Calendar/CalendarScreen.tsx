import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api.js';
import { Button } from '../../components/ui/Button.js';
import { Badge } from '../../components/ui/Badge.js';
import { Card } from '../../components/ui/Card.js';
import { Modal } from '../../components/ui/Modal.js';
import { Input } from '../../components/ui/Input.js';
import { Select } from '../../components/ui/Select.js';
import { useToast } from '../../components/ui/Toast.js';
import { Plus, Calendar as CalendarIcon, Clock, Users, RefreshCw, CheckCircle, ExternalLink, Search } from 'lucide-react';

export const CalendarScreen: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [activeView, setActiveView] = useState<'month' | 'week' | 'day' | 'list'>('month');
  const [selectedDay, setSelectedDay] = useState<number>(16); // default Oct 16
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState('meeting');
  const [eventDate, setEventDate] = useState('2026-10-20');
  const [eventTime, setEventTime] = useState('10:00');
  const [eventLocation, setEventLocation] = useState('');

  // 1. Fetch real events from DB
  const { data: events = [] } = useQuery({
    queryKey: ['calendar-events'],
    queryFn: () => apiRequest<any[]>('/calendar'),
  });

  // 2. Fetch Google Calendar integration status
  const { data: googleStatus } = useQuery({
    queryKey: ['google-calendar-status'],
    queryFn: () => apiRequest<any>('/calendar/google/status').catch(() => null),
  });

  // Connect Google account
  const handleConnectGoogle = async () => {
    try {
      const res = await apiRequest<{ authUrl: string }>('/calendar/google/auth-url');
      if (res.authUrl) {
        window.location.href = res.authUrl;
      }
    } catch (err: any) {
      showToast({
        type: 'info',
        title: 'Google OAuth Setup Required',
        message: err.message || 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be supplied in .env.',
      });
    }
  };

  // Sync Google calendar mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/calendar/google/sync', { method: 'POST' });
    },
    onSuccess: (res: any) => {
      showToast({ type: 'success', title: 'Calendar Synchronized', message: res.message });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['google-calendar-status'] });
    },
    onError: (err: any) => {
      showToast({ type: 'error', title: 'Synchronization Failed', message: err.message });
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!eventTitle.trim()) throw new Error('Event title is required');

      const startDateTime = new Date(`${eventDate}T${eventTime || '09:00'}:00Z`).toISOString();
      return apiRequest('/calendar', {
        method: 'POST',
        body: JSON.stringify({
          title: eventTitle.trim(),
          type: eventType,
          startTime: startDateTime,
          endTime: startDateTime,
          location: eventLocation.trim() || undefined,
        }),
      });
    },
    onSuccess: () => {
      showToast({ type: 'success', title: 'Event Scheduled', message: 'Event added to calendar.' });
      setIsModalOpen(false);
      setEventTitle('');
      setEventLocation('');
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    },
    onError: (err: any) => {
      showToast({ type: 'error', title: 'Scheduling failed', message: err.message });
    },
  });

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (filterType !== 'all' && e.type !== filterType) return false;
      if (searchQuery.trim() && !e.title?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [events, filterType, searchQuery]);

  // Map events by day of October 2026
  const eventsByDay = useMemo(() => {
    const map: Record<number, any[]> = {};
    filteredEvents.forEach((e: any) => {
      try {
        const d = new Date(e.startTime);
        if (d.getUTCFullYear() === 2026 && d.getUTCMonth() === 9) {
          const dayNum = d.getUTCDate();
          if (!map[dayNum]) map[dayNum] = [];
          map[dayNum].push(e);
        }
      } catch {
        // Ignore invalid dates
      }
    });
    return map;
  }, [filteredEvents]);

  // Calendar grid days for October 2026 (Mon to Sun: Oct 1 is Thursday)
  const daysInGrid = useMemo(() => {
    const grid: any[] = [
      { day: 28, isCurrentMonth: false, events: [] },
      { day: 29, isCurrentMonth: false, events: [] },
      { day: 30, isCurrentMonth: false, events: [] },
    ];

    for (let i = 1; i <= 31; i++) {
      grid.push({
        day: i,
        isCurrentMonth: true,
        events: eventsByDay[i] || [],
      });
    }

    grid.push({ day: 1, isCurrentMonth: false, events: [] });
    return grid;
  }, [eventsByDay]);

  const comingUp = useMemo(() => {
    const sorted = [...filteredEvents]
      .filter((e) => e.startTime)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    return sorted.slice(0, 8).map((e) => {
      const d = new Date(e.startTime);
      const dateLabel = !isNaN(d.getTime())
        ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
        : 'Date TBD';

      return {
        id: e.id,
        date: dateLabel,
        title: e.title,
        type: e.type.replace('_', ' '),
        location: e.location,
        isAutomated: e.isAutomated,
      };
    });
  }, [filteredEvents]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">University Calendar</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Meetings, VC reviews, holidays, and task deadlines synchronized in real time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex p-1 bg-slate-200/70 rounded-lg text-xs font-semibold">
            {(['month', 'week', 'day', 'list'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setActiveView(v)}
                className={`px-3 py-1.5 rounded-md capitalize transition-colors ${
                  activeView === v ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            New Event
          </Button>
        </div>
      </div>

      {/* Google Calendar Status Banner (Section 7) */}
      <Card padding="sm" className="bg-slate-50 border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className={`w-2.5 h-2.5 rounded-full ${googleStatus?.isConnected ? 'bg-emerald-500' : 'bg-amber-400'}`} />
            <div>
              <span className="font-bold text-slate-900">Google Calendar: </span>
              {googleStatus?.isConnected ? (
                <span className="text-emerald-700 font-semibold">
                  Connected & Synchronized {googleStatus?.syncedAt ? `(Last synced: ${new Date(googleStatus.syncedAt).toLocaleTimeString()})` : ''}
                </span>
              ) : googleStatus?.isConfigured ? (
                <span className="text-amber-700">Account not connected. Connect your authorized Google account below.</span>
              ) : (
                <span className="text-slate-600">
                  Google Calendar not configured (OAuth credentials pending in environment variables).
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {googleStatus?.isConnected ? (
              <Button
                size="xs"
                variant="outline"
                isLoading={syncMutation.isPending}
                onClick={() => syncMutation.mutate()}
                leftIcon={<RefreshCw className="w-3 h-3" />}
              >
                Sync with Google
              </Button>
            ) : (
              <Button
                size="xs"
                variant="outline"
                onClick={handleConnectGoogle}
                leftIcon={<ExternalLink className="w-3 h-3" />}
              >
                Connect Google Calendar
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Filter:</span>
          {(['all', 'meeting', 'deadline', 'review', 'holiday'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilterType(t)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                filterType === t
                  ? 'bg-blue-600 text-white font-bold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="relative w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900"
          />
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          {activeView === 'month' && (
            <Card padding="none" className="overflow-hidden">
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center py-2.5 text-[11px] font-bold text-slate-600">
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span className="text-slate-400">Sat</span>
                <span className="text-slate-400">Sun</span>
              </div>

              <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100">
                {daysInGrid.map((cell, idx) => (
                  <div
                    key={idx}
                    onClick={() => cell.isCurrentMonth && setSelectedDay(cell.day)}
                    className={`min-h-[96px] p-2 flex flex-col justify-between transition-colors cursor-pointer ${
                      !cell.isCurrentMonth
                        ? 'bg-slate-50/50 text-slate-300'
                        : cell.day === selectedDay
                        ? 'bg-blue-50/40 ring-1 ring-blue-500 inset-0'
                        : 'bg-white hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                          cell.day === 16 && cell.isCurrentMonth
                            ? 'bg-blue-600 text-white'
                            : cell.isCurrentMonth
                            ? 'text-slate-800'
                            : 'text-slate-300'
                        }`}
                      >
                        {cell.day}
                      </span>
                    </div>

                    <div className="space-y-1 mt-1">
                      {cell.events.slice(0, 2).map((ev: any) => (
                        <div
                          key={ev.id}
                          className={`text-[10px] px-1.5 py-0.5 rounded truncate font-medium ${
                            ev.type === 'deadline'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : ev.type === 'meeting'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}
                          title={ev.title}
                        >
                          {ev.title}
                        </div>
                      ))}
                      {cell.events.length > 2 && (
                        <span className="text-[9px] font-bold text-slate-400 block">
                          +{cell.events.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeView === 'day' && (
            <Card padding="md">
              <h3 className="text-sm font-bold text-slate-900 mb-3">
                Events for October {selectedDay}, 2026
              </h3>
              <div className="divide-y divide-slate-100 text-xs">
                {(eventsByDay[selectedDay] || []).length === 0 ? (
                  <p className="text-slate-400 py-6 text-center">No events scheduled for this day.</p>
                ) : (
                  (eventsByDay[selectedDay] || []).map((e: any) => (
                    <div key={e.id} className="py-3 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900">{e.title}</h4>
                        {e.location && <p className="text-slate-500 text-[11px]">{e.location}</p>}
                      </div>
                      <Badge variant="primary">{e.type}</Badge>
                    </div>
                  ))
                )}
              </div>
            </Card>
          )}

          {activeView === 'list' && (
            <Card padding="none" className="overflow-hidden">
              <div className="divide-y divide-slate-100 text-xs">
                {filteredEvents.map((e: any) => (
                  <div key={e.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="w-20 font-bold text-blue-600">
                        {new Date(e.startTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{e.title}</h4>
                        {e.location && <p className="text-slate-500 text-[11px]">{e.location}</p>}
                      </div>
                    </div>
                    <Badge variant="primary" size="sm">
                      {e.type}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeView === 'week' && (
            <Card padding="md">
              <h3 className="text-sm font-bold text-slate-900 mb-2">Weekly Schedule View</h3>
              <p className="text-xs text-slate-500 mb-4">Monday 19 Oct — Sunday 25 Oct 2026</p>
              <div className="space-y-2 text-xs">
                {filteredEvents.map((e: any) => (
                  <div key={e.id} className="p-2.5 bg-slate-50 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="font-bold text-blue-600 mr-2">
                        {new Date(e.startTime).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}:
                      </span>
                      <span className="font-bold text-slate-900">{e.title}</span>
                    </div>
                    <Badge variant="primary" size="sm">{e.type}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right Column: Coming Up */}
        <div className="lg:col-span-4 space-y-4">
          <Card padding="md">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Coming Up</h3>
            <div className="divide-y divide-slate-100 text-xs">
              {comingUp.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-slate-900 line-clamp-1">{item.title}</h4>
                    <span className="text-[11px] text-slate-400 font-medium">{item.date}</span>
                  </div>
                  <Badge variant="default" size="sm">
                    {item.type}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* New Event Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Schedule University Event"
        description="Add a meeting, deadline, or review session to the Command Center."
      >
        <div className="space-y-4">
          <Input
            label="Event Title"
            placeholder="e.g. Weekly Operations Briefing"
            value={eventTitle}
            onChange={(e) => setEventTitle(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Event Type</label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
              >
                <option value="meeting">Meeting</option>
                <option value="deadline">Task Deadline</option>
                <option value="review">Leadership / VC Review</option>
                <option value="holiday">University Holiday</option>
              </select>
            </div>

            <Input
              label="Date (YYYY-MM-DD)"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Time"
              type="time"
              value={eventTime}
              onChange={(e) => setEventTime(e.target.value)}
            />

            <Input
              label="Location / Meeting Link"
              placeholder="e.g. Conference Room A"
              value={eventLocation}
              onChange={(e) => setEventLocation(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" isLoading={createMutation.isPending} onClick={() => createMutation.mutate()}>
              Schedule Event
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
