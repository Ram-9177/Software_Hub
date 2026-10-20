import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { Button } from '../../components/ui/Button.js';
import { Badge } from '../../components/ui/Badge.js';
import { Card } from '../../components/ui/Card.js';
import { Modal } from '../../components/ui/Modal.js';
import { Input } from '../../components/ui/Input.js';
import { Textarea } from '../../components/ui/Textarea.js';
import { Select } from '../../components/ui/Select.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { useToast } from '../../components/ui/Toast.js';
import { cn } from '../../components/ui/utils.js';
import {
  Plus,
  Check,
  Star,
  UploadCloud,
  FileText,
  UserCheck,
  Calendar as CalendarIcon,
  Trash2,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  ListTodo,
  Layers,
  ArrowRight,
  ArrowLeft,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { USER_ROLES, TASK_PRIORITIES, TASK_STATUSES, type TaskPriority, type TaskStatus } from '@command-center/shared';

interface NewTaskPart {
  title: string;
  assignedInternId: string;
  dueDate: string;
}

export const ToDoScreen: React.FC = () => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [selectedPart, setSelectedPart] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [creationStep, setCreationStep] = useState<1 | 2 | 3>(1);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // New Task Form State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>(TASK_PRIORITIES.MEDIUM);
  const [newTaskDueDate, setNewTaskDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [newTaskParts, setNewTaskParts] = useState<NewTaskPart[]>([
    { title: 'Part 1: Initial Discovery & Planning', assignedInternId: '', dueDate: '' },
  ]);

  // Reassign Form State
  const [reassignUserId, setReassignUserId] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [reassignDueDate, setReassignDueDate] = useState('');

  // Deliverable upload state
  const [uploadTab, setUploadTab] = useState<'file' | 'git' | 'doc'>('file');
  const [gitLink, setGitLink] = useState('');
  const [docLink, setDocLink] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Review state
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState('');

  // Fetch tasks
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => apiRequest<any[]>('/tasks'),
  });

  // Fetch users for assignments
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiRequest<any[]>('/users').catch(() => []),
    enabled: currentUser?.role !== USER_ROLES.UNPAID_INTERN,
  });

  // Initialize assigned intern for parts when users load
  React.useEffect(() => {
    if (users.length > 0 && newTaskParts.length > 0 && !newTaskParts[0].assignedInternId) {
      setNewTaskParts((prev) => [
        { ...prev[0], assignedInternId: users[0].id, dueDate: newTaskDueDate },
        ...prev.slice(1),
      ]);
    }
  }, [users, newTaskParts, newTaskDueDate]);

  // Keep selected task and part in sync
  React.useEffect(() => {
    if (tasks.length > 0 && !selectedTask) {
      setSelectedTask(tasks[0]);
      if (tasks[0].parts?.length > 0) {
        setSelectedPart(tasks[0].parts[0]);
      }
    } else if (selectedTask) {
      const refreshedTask = tasks.find((t) => t.id === selectedTask.id);
      if (refreshedTask) {
        setSelectedTask(refreshedTask);
        if (selectedPart) {
          const refreshedPart = refreshedTask.parts?.find((p: any) => p.id === selectedPart.id);
          if (refreshedPart) setSelectedPart(refreshedPart);
        }
      }
    }
  }, [tasks]);

  // Create Task Mutation
  const createTaskMutation = useMutation({
    mutationFn: async () => {
      if (!newTaskTitle.trim()) throw new Error('Task title is required');
      if (newTaskParts.length === 0) throw new Error('At least one task part is required');

      for (const p of newTaskParts) {
        if (!p.title.trim()) throw new Error('Every part must have a title');
        if (!p.assignedInternId) throw new Error('Every part must have an assigned intern');
      }

      return apiRequest('/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          description: newTaskDescription.trim() || undefined,
          priority: newTaskPriority,
          dueDate: new Date(newTaskDueDate).toISOString(),
          parts: newTaskParts.map((p) => ({
            title: p.title.trim(),
            assignedInternId: p.assignedInternId,
            dueDate: new Date(p.dueDate || newTaskDueDate).toISOString(),
          })),
        }),
      });
    },
    onSuccess: () => {
      showToast({ type: 'success', title: 'Task Created', message: 'New task added successfully.' });
      setIsNewTaskModalOpen(false);
      setCreationStep(1);
      setNewTaskTitle('');
      setNewTaskDescription('');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    },
    onError: (err: any) => {
      showToast({ type: 'error', title: 'Create failed', message: err.message });
    },
  });

  // Reassign Mutation
  const reassignMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPart) return;
      if (!reassignUserId) throw new Error('Please select a new assignee');

      return apiRequest(`/tasks/parts/${selectedPart.id}/reassign`, {
        method: 'POST',
        body: JSON.stringify({
          newAssigneeId: reassignUserId,
          reason: reassignReason.trim() || undefined,
          newDueDate: reassignDueDate ? new Date(reassignDueDate).toISOString() : undefined,
        }),
      });
    },
    onSuccess: (data: any) => {
      showToast({ type: 'success', title: 'Reassigned', message: data.message });
      setIsReassignModalOpen(false);
      setReassignReason('');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    },
    onError: (err: any) => {
      showToast({ type: 'error', title: 'Reassign failed', message: err.message });
    },
  });

  // Upload deliverable mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPart) return;
      const formData = new FormData();

      if (uploadTab === 'git') {
        if (!gitLink.trim()) throw new Error('Please enter a Git link');
        formData.append('kind', 'git_link');
        formData.append('gitLink', gitLink.trim());
      } else if (uploadTab === 'doc') {
        if (!docLink.trim()) throw new Error('Please enter a documentation link');
        formData.append('kind', 'documentation');
        formData.append('documentationLink', docLink.trim());
      } else {
        if (!selectedFile) throw new Error('Please choose a file to upload');
        formData.append('kind', 'file');
        formData.append('file', selectedFile);
      }

      return apiRequest(`/tasks/parts/${selectedPart.id}/upload`, {
        method: 'POST',
        body: formData,
      });
    },
    onSuccess: () => {
      showToast({
        type: 'success',
        title: 'Submitted for Review',
        message: 'Your deliverable proof has been recorded.',
      });
      setGitLink('');
      setDocLink('');
      setSelectedFile(null);
      setIsUploadModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (err: any) => {
      showToast({ type: 'error', title: 'Upload failed', message: err.message });
    },
  });

  // Review part mutation
  const reviewMutation = useMutation({
    mutationFn: async (action: 'approve' | 'send_back') => {
      if (!selectedPart) return;
      return apiRequest(`/tasks/parts/${selectedPart.id}/review`, {
        method: 'POST',
        body: JSON.stringify({
          action,
          rating: action === 'approve' ? reviewRating : undefined,
          comment: reviewComment,
        }),
      });
    },
    onSuccess: (_, action) => {
      showToast({
        type: 'success',
        title: action === 'approve' ? 'Part Approved' : 'Part Sent Back',
        message: action === 'approve' ? 'Part marked as Done.' : 'Revision requested.',
      });
      setIsReviewModalOpen(false);
      setReviewComment('');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (err: any) => {
      showToast({ type: 'error', title: 'Review action failed', message: err.message });
    },
  });

  // Aggregate all parts
  const allParts = useMemo(() => {
    const list: any[] = [];
    tasks.forEach((t) => {
      t.parts?.forEach((p: any) => {
        list.push({ ...p, parentTask: t });
      });
    });
    return list;
  }, [tasks]);

  const filteredParts = useMemo(() => {
    if (statusFilter === 'all') return allParts;
    return allParts.filter((p) => p.status === statusFilter);
  }, [allParts, statusFilter]);

  const partsByStatus = {
    to_do: allParts.filter((p) => p.status === 'to_do'),
    in_progress: allParts.filter((p) => p.status === 'in_progress'),
    in_review: allParts.filter((p) => p.status === 'in_review'),
    done: allParts.filter((p) => p.status === 'done'),
    overdue: allParts.filter((p) => p.status === 'overdue'),
  };

  const isReviewer =
    currentUser?.role === USER_ROLES.ADMIN ||
    currentUser?.role === USER_ROLES.MANAGER ||
    currentUser?.role === USER_ROLES.LEAD ||
    currentUser?.role === USER_ROLES.PAID_INTERN;

  const canCreate =
    currentUser?.role === USER_ROLES.ADMIN ||
    currentUser?.role === USER_ROLES.MANAGER ||
    currentUser?.role === USER_ROLES.LEAD ||
    currentUser?.role === USER_ROLES.PAID_INTERN;

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-16">
      {/* SMRU Institutional Executive Header Banner */}
      <header className="min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-card border border-line/70 bg-linear-to-r from-surface via-surface to-indigo-50/25 p-4 sm:p-5 shadow-card">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-display font-bold text-ink tracking-tight">
              To-Do & Part Delegation
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-accent-50 border border-accent-200/80 px-2.5 py-0.5 text-xs font-semibold text-accent-800">
              <span className="size-1.5 rounded-full bg-accent-500 animate-pulse" />
              Sprint Active
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-ink-soft">
            Tasks split into deliverable parts. Marked done only when all parts are approved.
          </p>
        </div>

        {canCreate && (
          <Button
            size="sm"
            onClick={() => {
              setCreationStep(1);
              setIsNewTaskModalOpen(true);
            }}
            leftIcon={<Plus className="size-4" />}
          >
            New Task
          </Button>
        )}
      </header>

      {/* Status Filter Chips */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-tint rounded-control border border-line w-fit">
        {[
          { key: 'all', label: 'All Parts', count: allParts.length },
          { key: 'to_do', label: 'To Do', count: partsByStatus.to_do.length },
          { key: 'in_progress', label: 'In Progress', count: partsByStatus.in_progress.length },
          { key: 'in_review', label: 'In Review', count: partsByStatus.in_review.length },
          { key: 'done', label: 'Done', count: partsByStatus.done.length },
          { key: 'overdue', label: 'Overdue', count: partsByStatus.overdue.length },
        ].map((f) => {
          const isActive = statusFilter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setStatusFilter(f.key)}
              className={cn(
                'px-3 py-1.5 rounded-control text-xs font-bold transition-all min-h-9 flex items-center gap-1.5 cursor-pointer',
                isActive
                  ? 'bg-navy-800 text-white shadow-xs'
                  : 'text-ink-soft hover:text-navy-800'
              )}
            >
              <span>{f.label}</span>
              <span className={cn(
                'text-[10px] px-1.5 py-0.2 rounded-full tabular-nums',
                isActive
                  ? 'bg-gold-400 text-navy-950 font-bold'
                  : 'bg-surface text-ink-faint border border-line'
              )}>
                {f.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-slate-400 animate-pulse">
          Loading assigned sprint tasks...
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="w-8 h-8" />}
          title="No Tasks Found"
          description={
            currentUser?.role === USER_ROLES.UNPAID_INTERN
              ? "You have no assigned task parts at the moment. As work is split and delegated, your parts will appear here."
              : "No central office tasks have been created yet. Create a task and split it into parts for your interns."
          }
          actionLabel={canCreate ? "Create First Task" : undefined}
          onAction={canCreate ? () => setIsNewTaskModalOpen(true) : undefined}
        />
      ) : (
        <div className="space-y-6">
          {/* Kanban Board Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Column 1: To Do */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 px-1">
                <span>To do</span>
                <span className="text-slate-400">{partsByStatus.to_do.length}</span>
              </div>
              <div className="space-y-2.5">
                {partsByStatus.to_do.map((part) => (
                  <div
                    key={part.id}
                    onClick={() => {
                      setSelectedTask(part.parentTask);
                      setSelectedPart(part);
                    }}
                    className={cn(
                      'p-3.5 bg-surface rounded-control border cursor-pointer transition-all duration-150 hover:shadow-card',
                      selectedPart?.id === part.id
                        ? 'border-navy-600 ring-2 ring-navy-500/20'
                        : 'border-line hover:border-line-strong'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <Badge tone="neutral" size="sm">
                        {part.parentTask?.taskNumber}
                      </Badge>
                      <span className="text-[10px] text-ink-faint font-medium">
                        Part {part.partNumber}/{part.totalParts}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-ink leading-snug">{part.title}</h4>
                    <div className="flex items-center justify-between mt-2.5 text-[11px]">
                      <span className="font-semibold text-ink-soft truncate max-w-30">
                        {part.assignedInternName || 'Unassigned'}
                      </span>
                      <span className="text-ink-faint shrink-0">{formatDate(part.dueDate)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 2: In Progress */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-navy-800 dark:text-gold-300 px-1">
                <span>In progress</span>
                <span className="text-navy-600 font-mono">{partsByStatus.in_progress.length}</span>
              </div>
              <div className="space-y-2.5">
                {partsByStatus.in_progress.map((part) => (
                  <div
                    key={part.id}
                    onClick={() => {
                      setSelectedTask(part.parentTask);
                      setSelectedPart(part);
                    }}
                    className={cn(
                      'p-3.5 bg-surface rounded-control border cursor-pointer transition-all duration-150 hover:shadow-card',
                      selectedPart?.id === part.id
                        ? 'border-navy-600 ring-2 ring-navy-500/20'
                        : 'border-line hover:border-line-strong'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <Badge tone="navy" size="sm">
                        {part.parentTask?.taskNumber}
                      </Badge>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Part {part.partNumber}/{part.totalParts}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug">{part.title}</h4>
                    <div className="flex items-center justify-between mt-2.5 text-[11px]">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-30">
                        {part.assignedInternName || 'Unassigned'}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 shrink-0">{formatDate(part.dueDate)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 3: In Review */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-purple-700 dark:text-purple-400 px-1">
                <span>In review</span>
                <span className="text-purple-500">{partsByStatus.in_review.length}</span>
              </div>
              <div className="space-y-2.5">
                {partsByStatus.in_review.map((part) => (
                  <div
                    key={part.id}
                    onClick={() => {
                      setSelectedTask(part.parentTask);
                      setSelectedPart(part);
                    }}
                    className={`p-3.5 bg-white dark:bg-slate-900 rounded-xl border cursor-pointer transition-all duration-150 hover:shadow-sm ${
                      selectedPart?.id === part.id
                        ? 'border-purple-500 ring-2 ring-purple-500/20'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <Badge variant="purple" size="sm">
                        {part.parentTask?.taskNumber}
                      </Badge>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Part {part.partNumber}/{part.totalParts}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug">{part.title}</h4>
                    <div className="flex items-center justify-between mt-2.5 text-[11px]">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-30">
                        {part.assignedInternName}
                      </span>
                      <span className="text-purple-600 font-bold shrink-0">Proof Submitted</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 4: Done / Overdue */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400 px-1">
                <span>Done ({partsByStatus.done.length})</span>
                {partsByStatus.overdue.length > 0 && (
                  <span className="text-rose-600 font-bold">
                    {partsByStatus.overdue.length} Overdue
                  </span>
                )}
              </div>
              <div className="space-y-2.5">
                {partsByStatus.overdue.map((part) => (
                  <div
                    key={part.id}
                    onClick={() => {
                      setSelectedTask(part.parentTask);
                      setSelectedPart(part);
                    }}
                    className="p-3.5 bg-rose-50/50 dark:bg-rose-950/20 rounded-xl border border-rose-300 dark:border-rose-900 cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <Badge variant="danger" size="sm">
                        OVERDUE
                      </Badge>
                      <span className="text-[10px] text-rose-500 font-bold">
                        {part.parentTask?.taskNumber}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug">{part.title}</h4>
                    <div className="flex items-center justify-between mt-2.5 text-[11px]">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-30">
                        {part.assignedInternName}
                      </span>
                      <span className="text-rose-600 font-bold shrink-0">{formatDate(part.dueDate)}</span>
                    </div>
                  </div>
                ))}

                {partsByStatus.done.map((part) => (
                  <div
                    key={part.id}
                    onClick={() => {
                      setSelectedTask(part.parentTask);
                      setSelectedPart(part);
                    }}
                    className={`p-3.5 bg-white dark:bg-slate-900 rounded-xl border cursor-pointer opacity-80 hover:opacity-100 transition-all ${
                      selectedPart?.id === part.id
                        ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <Badge variant="success" size="sm">
                        Done
                      </Badge>
                      {part.rating && (
                        <span className="text-[11px] font-bold text-amber-500">
                          {'★'.repeat(part.rating)}
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-display font-medium text-navy-400 dark:text-navy-400 line-through leading-snug">
                      {part.title}
                    </h4>
                    <div className="flex items-center justify-between mt-2 text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400">{part.assignedInternName}</span>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Selected Task & Part Deep Dive */}
          {selectedTask && (
            <Card padding="lg" className="border-t-3 border-t-navy-800">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-line pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge tone="navy" size="sm">
                      {selectedTask.taskNumber}
                    </Badge>
                    <Badge tone={selectedTask.priority === 'high' ? 'danger' : 'neutral'} size="sm">
                      {selectedTask.priority?.toUpperCase()} PRIORITY
                    </Badge>
                  </div>
                  <h2 className="text-lg font-display font-bold text-ink">
                    {selectedTask.title}
                  </h2>
                  <p className="text-xs text-ink-soft mt-1 max-w-2xl">
                    {selectedTask.description || 'No description provided.'}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] text-ink-faint font-semibold uppercase block">Target Due Date</span>
                    <span className="text-xs font-bold text-ink">
                      {formatDate(selectedTask.dueDate)}
                    </span>
                  </div>
                  <Badge tone={selectedTask.status === 'done' ? 'success' : 'neutral'} size="md">
                    {selectedTask.status === 'done' ? 'All Parts Complete' : 'In Progress'}
                  </Badge>
                </div>
              </div>

              {/* Task Parts List & Active Part Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
                {/* Left: Chain of Parts */}
                <div className="lg:col-span-7 space-y-3">
                  <h3 className="text-xs font-bold text-ink-faint uppercase tracking-wider">
                    Task Parts Breakdown ({selectedTask.parts?.length || 0})
                  </h3>

                  <div className="space-y-2">
                    {selectedTask.parts?.map((part: any) => (
                      <div
                        key={part.id}
                        onClick={() => setSelectedPart(part)}
                        className={cn(
                          'p-3.5 rounded-control border flex items-center justify-between cursor-pointer transition-colors',
                          selectedPart?.id === part.id
                            ? 'bg-tint border-navy-400 ring-1 ring-navy-400'
                            : 'bg-surface border-line hover:bg-canvas'
                        )}
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                              Part {part.partNumber}: {part.title}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {part.assignedInternName} · Due {formatDate(part.dueDate)}
                          </p>
                          {part.rating && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-amber-500 text-xs font-bold">
                                {'★'.repeat(part.rating)}
                              </span>
                              {part.reviewComment && (
                                <span className="text-[10px] text-slate-500 italic">
                                  “{part.reviewComment}”
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <Badge
                          variant={
                            part.status === 'done'
                              ? 'success'
                              : part.status === 'in_review'
                              ? 'purple'
                              : part.status === 'overdue'
                              ? 'danger'
                              : 'default'
                          }
                          size="sm"
                        >
                          {part.status?.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Selected Part Actions / Proof of Work */}
                <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-800/40 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                  {selectedPart ? (
                    <>
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 pb-3">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            Part {selectedPart.partNumber}: {selectedPart.title}
                          </h4>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Assignee: <strong className="text-slate-700 dark:text-slate-300">{selectedPart.assignedInternName}</strong>
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {isReviewer && (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => {
                                setReassignUserId(selectedPart.assignedInternId || '');
                                setReassignDueDate(selectedPart.dueDate ? selectedPart.dueDate.split('T')[0] : '');
                                setIsReassignModalOpen(true);
                              }}
                              leftIcon={<RefreshCw className="w-3 h-3" />}
                            >
                              Reassign
                            </Button>
                          )}

                          {isReviewer && selectedPart.status === 'in_review' && (
                            <Button size="xs" onClick={() => setIsReviewModalOpen(true)}>
                              Review Proof
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Submitted Deliverables List */}
                      {selectedPart.uploads && selectedPart.uploads.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                            Submitted Proof of Work
                          </span>
                          <div className="space-y-1.5 max-h-36 overflow-y-auto">
                            {selectedPart.uploads.map((up: any) => (
                              <div
                                key={up.id}
                                className="p-2.5 bg-surface dark:bg-navy-900 rounded-control border border-line flex items-center justify-between text-xs"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileText className="w-4 h-4 text-gold-500 shrink-0" />
                                  <span className="truncate font-medium text-navy-900 dark:text-navy-100">
                                    {up.fileName || up.urlOrPath}
                                  </span>
                                </div>
                                <a
                                  href={up.urlOrPath}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-navy-900 dark:text-navy-200 hover:text-gold-600 p-1 flex items-center gap-1 font-semibold text-[11px] transition-colors"
                                >
                                  Open <ExternalLink className="w-3 h-3 text-gold-500" />
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Submission Section */}
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            Submit Deliverable Proof
                          </span>
                          <span className="text-[10px] text-slate-400">File, Git repo, or documentation</span>
                        </div>

                        {/* Upload Method Tabs */}
                        <div className="grid grid-cols-3 gap-1 bg-tint p-1 rounded-control text-xs font-semibold border border-line">
                          <button
                            type="button"
                            onClick={() => setUploadTab('file')}
                            className={cn(
                              'py-1 rounded-control transition-colors cursor-pointer',
                              uploadTab === 'file' ? 'bg-navy-800 text-white shadow-xs font-bold' : 'text-ink-soft hover:text-navy-800'
                            )}
                          >
                            File Upload
                          </button>
                          <button
                            type="button"
                            onClick={() => setUploadTab('git')}
                            className={cn(
                              'py-1 rounded-control transition-colors cursor-pointer',
                              uploadTab === 'git' ? 'bg-navy-800 text-white shadow-xs font-bold' : 'text-ink-soft hover:text-navy-800'
                            )}
                          >
                            Git Repo
                          </button>
                          <button
                            type="button"
                            onClick={() => setUploadTab('doc')}
                            className={cn(
                              'py-1 rounded-control transition-colors cursor-pointer',
                              uploadTab === 'doc' ? 'bg-navy-800 text-white shadow-xs font-bold' : 'text-ink-soft hover:text-navy-800'
                            )}
                          >
                            Documentation
                          </button>
                        </div>

                        {uploadTab === 'file' && (
                          <div className="border-2 border-dashed border-line rounded-card p-4 text-center bg-surface">
                            <UploadCloud className="size-6 text-ink-faint mx-auto mb-1.5" />
                            <label className="text-xs text-navy-800 font-semibold cursor-pointer hover:underline block">
                              <span>Choose file to upload</span>
                              <input
                                type="file"
                                className="hidden"
                                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                              />
                            </label>
                            {selectedFile ? (
                              <span className="text-[11px] font-bold text-emerald-600 mt-1 block">
                                Selected: {selectedFile.name}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">PDF, ZIP, DOCX, or images</span>
                            )}
                          </div>
                        )}

                        {uploadTab === 'git' && (
                          <Input
                            placeholder="https://github.com/org/repo/pull/12"
                            value={gitLink}
                            onChange={(e) => setGitLink(e.target.value)}
                            className="text-xs bg-white dark:bg-slate-900"
                          />
                        )}

                        {uploadTab === 'doc' && (
                          <Input
                            placeholder="https://docs.google.com/document/d/..."
                            value={docLink}
                            onChange={(e) => setDocLink(e.target.value)}
                            className="text-xs bg-white dark:bg-slate-900"
                          />
                        )}

                        <Button
                          size="sm"
                          isLoading={uploadMutation.isPending}
                          disabled={
                            uploadMutation.isPending ||
                            (uploadTab === 'file' && !selectedFile) ||
                            (uploadTab === 'git' && !gitLink.trim()) ||
                            (uploadTab === 'doc' && !docLink.trim())
                          }
                          onClick={() => uploadMutation.mutate()}
                          className="w-full min-h-11"
                        >
                          Submit Part for Review
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12 text-xs text-slate-400">
                      Select a task part to view details and submit proof.
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* STEP-BY-STEP TASK CREATION MODAL */}
      <Modal
        isOpen={isNewTaskModalOpen}
        onClose={() => setIsNewTaskModalOpen(false)}
        title="Create New Task (Step-by-Step)"
        description="Split work into parts line-by-line and delegate to interns."
        maxWidth="2xl"
      >
        <div className="space-y-5">
          {/* Step Indicator Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            {[
              { num: 1, label: 'What' },
              { num: 2, label: 'Who & Parts' },
              { num: 3, label: 'When & Priority' },
            ].map((s) => (
              <div
                key={s.num}
                className={cn(
                  'flex items-center gap-2 text-xs font-bold',
                  creationStep === s.num
                    ? 'text-navy-800 dark:text-gold-300'
                    : creationStep > s.num
                    ? 'text-accent-600'
                    : 'text-ink-faint'
                )}
              >
                <span
                  className={cn(
                    'size-6 rounded-control flex items-center justify-center text-xs',
                    creationStep === s.num
                      ? 'bg-navy-800 text-white font-bold'
                      : creationStep > s.num
                      ? 'bg-accent-600 text-white'
                      : 'bg-canvas text-ink-faint border border-line'
                  )}
                >
                  {creationStep > s.num ? '✓' : s.num}
                </span>
                <span>{s.label}</span>
              </div>
            ))}
          </div>

          {/* STEP 1: WHAT */}
          {creationStep === 1 && (
            <div className="space-y-4">
              <Input
                label="Task Title *"
                placeholder="e.g. Wi-Fi Infrastructure Audit & Security Report"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                required
                className="min-h-11"
              />

              <Textarea
                label="Description & Acceptance Criteria"
                placeholder="Define project scope, key deliverables, and expected technical standards..."
                rows={4}
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
              />

              <div className="flex justify-end gap-2.5 pt-3">
                <Button variant="outline" size="sm" onClick={() => setIsNewTaskModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={!newTaskTitle.trim()}
                  onClick={() => setCreationStep(2)}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Next: Who & Parts
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: WHO & PARTS (Line-by-line part splitter) */}
          {creationStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Split Into Parts ({newTaskParts.length})
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Every task must have at least one part assigned to an intern.
                  </p>
                </div>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() =>
                    setNewTaskParts((prev) => [
                      ...prev,
                      {
                        title: `Part ${prev.length + 1}: `,
                        assignedInternId: users[0]?.id || '',
                        dueDate: newTaskDueDate,
                      },
                    ])
                  }
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  Add Part
                </Button>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto">
                {newTaskParts.map((part, index) => (
                  <div
                    key={index}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        placeholder={`Part ${index + 1} Title (e.g. Signal strength topology)`}
                        value={part.title}
                        onChange={(e) => {
                          const updated = [...newTaskParts];
                          updated[index].title = e.target.value;
                          setNewTaskParts(updated);
                        }}
                        className="flex-1 bg-surface border border-line rounded-control py-2 px-3 text-xs text-navy-900 dark:text-navy-100 placeholder:text-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-500"
                      />

                      {newTaskParts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setNewTaskParts(newTaskParts.filter((_, i) => i !== index))}
                          className="text-navy-400 hover:text-rose-600 p-1.5 transition-colors"
                          title="Remove part"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={part.assignedInternId}
                        onChange={(e) => {
                          const updated = [...newTaskParts];
                          updated[index].assignedInternId = e.target.value;
                          setNewTaskParts(updated);
                        }}
                        options={users.map((u: any) => ({
                          value: u.id,
                          label: `${u.name} (${u.role.replace('_', ' ')})`,
                        }))}
                      />

                      <input
                        type="date"
                        value={part.dueDate || newTaskDueDate}
                        onChange={(e) => {
                          const updated = [...newTaskParts];
                          updated[index].dueDate = e.target.value;
                          setNewTaskParts(updated);
                        }}
                        className="bg-surface border border-line rounded-control py-2 px-3 text-xs text-navy-900 dark:text-navy-100 focus:outline-none focus:ring-2 focus:ring-navy-500"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button variant="outline" size="sm" onClick={() => setCreationStep(1)}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button
                  size="sm"
                  disabled={newTaskParts.some((p) => !p.title.trim() || !p.assignedInternId)}
                  onClick={() => setCreationStep(3)}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Next: When & Priority
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: WHEN & PRIORITY */}
          {creationStep === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Task Priority Level *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: TASK_PRIORITIES.LOW, label: 'Low', color: 'border-line text-ink-soft' },
                    { value: TASK_PRIORITIES.MEDIUM, label: 'Medium', color: 'border-navy-200 text-navy-800 bg-navy-50' },
                    { value: TASK_PRIORITIES.HIGH, label: 'High', color: 'border-danger-200 text-danger-700 bg-danger-50' },
                  ].map((chip) => {
                    const isSelected = newTaskPriority === chip.value;
                    return (
                      <button
                        key={chip.value}
                        type="button"
                        onClick={() => setNewTaskPriority(chip.value as TaskPriority)}
                        className={cn(
                          'py-3 px-4 rounded-control border text-xs font-bold transition-all min-h-11 cursor-pointer',
                          isSelected
                            ? 'bg-navy-800 text-white border-navy-800 shadow-sm ring-2 ring-navy-500/30'
                            : `bg-surface ${chip.color} hover:bg-tint`
                        )}
                      >
                        {chip.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Final Task Due Date *
                </label>
                <input
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  className="w-full rounded-control border border-line py-2.5 px-3 text-xs bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-navy-500 min-h-11"
                />
              </div>

              <div className="p-3 rounded-card bg-tint text-xs text-navy-800 border border-navy-200/60">
                <strong>Review Summary:</strong> Task "{newTaskTitle}" with {newTaskParts.length} delegated part(s). All interns assigned will be automatically notified upon creation.
              </div>

              <div className="flex justify-between gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button variant="outline" size="sm" onClick={() => setCreationStep(2)}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button
                  size="sm"
                  isLoading={createTaskMutation.isPending}
                  disabled={createTaskMutation.isPending}
                  onClick={() => createTaskMutation.mutate()}
                >
                  Create & Delegate Task
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* REASSIGN TASK PART MODAL */}
      <Modal
        isOpen={isReassignModalOpen}
        onClose={() => setIsReassignModalOpen(false)}
        title="Reassign Task Part"
        description={`Update assignment or deadline for ${selectedPart?.title}`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60 text-xs space-y-1">
            <div>
              <strong className="text-slate-700 dark:text-slate-300">Current Assignee:</strong> {selectedPart?.assignedInternName}
            </div>
            <div>
              <strong className="text-slate-700 dark:text-slate-300">Current Due Date:</strong>{' '}
              {selectedPart?.dueDate ? formatDate(selectedPart.dueDate) : 'None'}
            </div>
          </div>

          <Select
            label="New Assignee *"
            value={reassignUserId}
            onChange={(e) => setReassignUserId(e.target.value)}
            options={[
              { value: '', label: '-- Select Intern --' },
              ...users.map((u: any) => ({
                value: u.id,
                label: `${u.name} (${u.role.replace('_', ' ')})`,
              })),
            ]}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Extended / Updated Due Date (Optional)
            </label>
            <input
              type="date"
              value={reassignDueDate}
              onChange={(e) => setReassignDueDate(e.target.value)}
              className="w-full rounded-control border border-line py-2 px-3 text-xs bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-navy-500 min-h-11"
            />
          </div>

          <Textarea
            label="Reason for Reassignment"
            placeholder="e.g. Workload rebalancing or subject matter expertise..."
            rows={2}
            value={reassignReason}
            onChange={(e) => setReassignReason(e.target.value)}
          />

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" size="sm" onClick={() => setIsReassignModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              isLoading={reassignMutation.isPending}
              disabled={!reassignUserId || reassignMutation.isPending}
              onClick={() => reassignMutation.mutate()}
            >
              Confirm Reassignment
            </Button>
          </div>
        </div>
      </Modal>

      {/* REVIEW TASK PART MODAL */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title="Review Deliverable Proof"
        description={`Assess work submitted for ${selectedPart?.title}`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1 text-xs">
            <div>
              <strong className="text-slate-700 dark:text-slate-300">Submitted by:</strong> {selectedPart?.assignedInternName}
            </div>
            <div>
              <strong className="text-slate-700 dark:text-slate-300">Submitted at:</strong>{' '}
              {selectedPart?.submittedAt ? new Date(selectedPart.submittedAt).toLocaleString() : 'Recently'}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Deliverable Quality Rating (1 to 5 Stars) *
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setReviewRating(star)}
                  className={`text-2xl transition-transform hover:scale-110 p-1 ${
                    reviewRating >= star ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'
                  }`}
                >
                  ★
                </button>
              ))}
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-2">
                {reviewRating} of 5 Stars
              </span>
            </div>
          </div>

          <Textarea
            label="Reviewer Comments & Feedback"
            placeholder="Feedback for the intern, improvements required, or recognition of quality..."
            rows={3}
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
          />

          <div className="flex justify-between gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              size="sm"
              variant="danger"
              isLoading={reviewMutation.isPending}
              onClick={() => reviewMutation.mutate('send_back')}
            >
              Request Revisions
            </Button>
            <Button
              size="sm"
              variant="primary"
              isLoading={reviewMutation.isPending}
              onClick={() => reviewMutation.mutate('approve')}
            >
              Approve & Mark Done
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
