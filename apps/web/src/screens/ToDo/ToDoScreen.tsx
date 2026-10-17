import React, { useState } from 'react';
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
import { useToast } from '../../components/ui/Toast.js';
import {
  Plus,
  Check,
  Star,
  UploadCloud,
  Link as LinkIcon,
  FileText,
  UserCheck,
  Download,
  Calendar as CalendarIcon,
  Trash2,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { USER_ROLES, TASK_PRIORITIES, TASK_STATUSES, type TaskPriority } from '@command-center/shared';

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

  // Modals
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);

  // New Task Form State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>(TASK_PRIORITIES.MEDIUM);
  const [newTaskDueDate, setNewTaskDueDate] = useState('2026-10-25');
  const [newTaskParts, setNewTaskParts] = useState<NewTaskPart[]>([
    { title: 'Part 1: Initial Implementation', assignedInternId: '', dueDate: '2026-10-25' },
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

  // Default assigned intern in parts
  React.useEffect(() => {
    if (users.length > 0 && newTaskParts.length > 0 && !newTaskParts[0].assignedInternId) {
      setNewTaskParts((prev) => [
        { ...prev[0], assignedInternId: users[0].id },
        ...prev.slice(1),
      ]);
    }
  }, [users, newTaskParts]);

  // Sync selected task and part
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
        title: 'Submitted for review',
        message: 'Your deliverable has been recorded.',
      });
      setGitLink('');
      setDocLink('');
      setSelectedFile(null);
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

  // Aggregate all parts for the Kanban board
  const allParts: any[] = [];
  tasks.forEach((t) => {
    t.parts?.forEach((p: any) => {
      allParts.push({ ...p, parentTask: t });
    });
  });

  const partsByStatus = {
    to_do: allParts.filter((p) => p.status === 'to_do'),
    in_progress: allParts.filter((p) => p.status === 'in_progress'),
    in_review: allParts.filter((p) => p.status === 'in_review'),
    done: allParts.filter((p) => p.status === 'done'),
    overdue: allParts.filter((p) => p.status === 'overdue'),
  };

  const isReviewer =
    currentUser?.role === USER_ROLES.ADMIN ||
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">To-Do</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tasks for the whole team, split into parts. Team leads, admins, and core interns manage and review.
          </p>
        </div>
        {currentUser?.role !== USER_ROLES.UNPAID_INTERN && (
          <Button
            size="sm"
            onClick={() => setIsNewTaskModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            New task
          </Button>
        )}
      </div>

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* To Do */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-1">
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
                className={`p-3 bg-white rounded-xl border cursor-pointer transition-all duration-150 hover:shadow-sm ${
                  selectedPart?.id === part.id
                    ? 'border-blue-500 ring-2 ring-blue-500/20'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <Badge variant="default" size="sm">
                    {part.parentTask?.taskNumber}
                  </Badge>
                  <span className="text-[10px] text-slate-400">
                    Part {part.partNumber}/{part.totalParts}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 leading-snug">{part.title}</h4>
                <div className="flex items-center justify-between mt-2.5 text-[11px]">
                  <span className="font-semibold text-slate-700 truncate max-w-[120px]">
                    {part.assignedInternName || 'Unassigned'}
                  </span>
                  <span className="text-slate-500 shrink-0">{formatDate(part.dueDate)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* In Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-blue-700 px-1">
            <span>In progress</span>
            <span className="text-blue-500">{partsByStatus.in_progress.length}</span>
          </div>
          <div className="space-y-2.5">
            {partsByStatus.in_progress.map((part) => (
              <div
                key={part.id}
                onClick={() => {
                  setSelectedTask(part.parentTask);
                  setSelectedPart(part);
                }}
                className={`p-3 bg-white rounded-xl border cursor-pointer transition-all duration-150 hover:shadow-sm ${
                  selectedPart?.id === part.id
                    ? 'border-blue-500 ring-2 ring-blue-500/20'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <Badge variant="primary" size="sm">
                    {part.parentTask?.taskNumber}
                  </Badge>
                  <span className="text-[10px] text-slate-400">
                    Part {part.partNumber}/{part.totalParts}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 leading-snug">{part.title}</h4>
                <div className="flex items-center justify-between mt-2.5 text-[11px]">
                  <span className="font-semibold text-slate-700 truncate max-w-[120px]">
                    {part.assignedInternName}
                  </span>
                  <span className="text-slate-500 shrink-0">{formatDate(part.dueDate)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* In Review */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-amber-700 px-1">
            <span>In review</span>
            <span className="text-amber-500">{partsByStatus.in_review.length}</span>
          </div>
          <div className="space-y-2.5">
            {partsByStatus.in_review.map((part) => (
              <div
                key={part.id}
                onClick={() => {
                  setSelectedTask(part.parentTask);
                  setSelectedPart(part);
                }}
                className={`p-3 bg-white rounded-xl border cursor-pointer transition-all duration-150 hover:shadow-sm ${
                  selectedPart?.id === part.id
                    ? 'border-blue-500 ring-2 ring-blue-500/20'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <Badge variant="warning" size="sm">
                    {part.parentTask?.taskNumber}
                  </Badge>
                  <span className="text-[10px] text-slate-400">
                    Part {part.partNumber}/{part.totalParts}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 leading-snug">{part.title}</h4>
                <div className="flex items-center justify-between mt-2.5 text-[11px]">
                  <span className="font-semibold text-slate-700 truncate max-w-[120px]">
                    {part.assignedInternName}
                  </span>
                  <span className="text-amber-600 font-bold shrink-0">Review pending</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Done */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-700 px-1">
            <span>Done</span>
            <span className="text-emerald-500">{partsByStatus.done.length}</span>
          </div>
          <div className="space-y-2.5">
            {partsByStatus.done.map((part) => (
              <div
                key={part.id}
                onClick={() => {
                  setSelectedTask(part.parentTask);
                  setSelectedPart(part);
                }}
                className={`p-3 bg-white rounded-xl border cursor-pointer transition-all duration-150 hover:shadow-sm ${
                  selectedPart?.id === part.id
                    ? 'border-blue-500 ring-2 ring-blue-500/20'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <Badge variant="success" size="sm">
                    {part.parentTask?.taskNumber}
                  </Badge>
                  <span className="text-[10px] text-slate-400">
                    Part {part.partNumber}/{part.totalParts}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 leading-snug">{part.title}</h4>
                <div className="flex items-center justify-between mt-2.5 text-[11px]">
                  <span className="font-semibold text-slate-700 truncate max-w-[120px]">
                    {part.assignedInternName}
                  </span>
                  <span className="text-emerald-600 font-bold shrink-0">Approved</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Task Split-View Card */}
      {selectedTask && (
        <Card padding="lg" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Task Header & Parts Chain */}
            <div className="lg:col-span-7 space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                    TASK DETAIL · {selectedTask.taskNumber}
                  </span>
                  <Badge variant={selectedTask.priority === 'high' ? 'danger' : 'primary'} size="sm">
                    {selectedTask.priority} priority
                  </Badge>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mt-0.5">{selectedTask.title}</h2>
                {selectedTask.description && (
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {selectedTask.description}
                  </p>
                )}
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Created by {selectedTask.creatorName || 'Lead'}. Due {formatDate(selectedTask.dueDate)}.
                  Done only when all parts pass review.
                </p>
              </div>

              {/* Parts chain list */}
              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Task Parts ({selectedTask.parts?.length || 0})
                </span>
                {selectedTask.parts?.map((part: any) => (
                  <div
                    key={part.id}
                    onClick={() => setSelectedPart(part)}
                    className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                      selectedPart?.id === part.id
                        ? 'bg-blue-50/60 border-blue-300 ring-1 ring-blue-300'
                        : 'bg-slate-50/70 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{part.title}</h4>
                      <p className="text-[11px] text-slate-500">
                        {part.assignedInternName} ({part.assignedInternType || 'intern'}) · due{' '}
                        {formatDate(part.dueDate)}
                      </p>
                      {part.rating && (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-[11px] font-bold text-amber-500">
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
                    <Badge variant={part.status as any}>{part.status.replace('_', ' ')}</Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Deliverable Upload or Review Action */}
            <div className="lg:col-span-5 space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
              {selectedPart ? (
                <>
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{selectedPart.title}</h3>
                      <p className="text-xs text-slate-500">
                        Assignee: <span className="font-semibold text-slate-700">{selectedPart.assignedInternName}</span>
                      </p>
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
                          Review
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Previous Uploads List */}
                  {selectedPart.uploads && selectedPart.uploads.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                        Submitted Deliverables
                      </span>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto">
                        {selectedPart.uploads.map((up: any) => (
                          <div
                            key={up.id}
                            className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span className="truncate font-medium text-slate-800">
                                {up.fileName || up.urlOrPath}
                              </span>
                            </div>
                            <a
                              href={up.urlOrPath}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:text-blue-700 p-1 flex items-center gap-1 font-semibold text-[11px]"
                            >
                              Open <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Submission Form for Interns / Uploaders */}
                  <div className="space-y-3 pt-2">
                    <span className="text-xs font-bold text-slate-800 block">
                      Submit Work for Review (Part {selectedPart.partNumber})
                    </span>

                    {/* Deliverable Type Tabs */}
                    <div className="grid grid-cols-3 gap-1 p-1 bg-slate-200/60 rounded-lg text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setUploadTab('file')}
                        className={`py-1 rounded-md transition-colors ${
                          uploadTab === 'file' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                        }`}
                      >
                        File Upload
                      </button>
                      <button
                        type="button"
                        onClick={() => setUploadTab('git')}
                        className={`py-1 rounded-md transition-colors ${
                          uploadTab === 'git' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                        }`}
                      >
                        Git Link
                      </button>
                      <button
                        type="button"
                        onClick={() => setUploadTab('doc')}
                        className={`py-1 rounded-md transition-colors ${
                          uploadTab === 'doc' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                        }`}
                      >
                        Doc Link
                      </button>
                    </div>

                    {uploadTab === 'file' && (
                      <label className="border-2 border-dashed border-slate-300 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-white transition-colors">
                        <UploadCloud className="w-6 h-6 text-slate-400 mb-1" />
                        <span className="text-xs text-slate-600 font-medium">
                          {selectedFile ? selectedFile.name : 'Choose deliverable file (PDF, ZIP, DOC)'}
                        </span>
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        />
                      </label>
                    )}

                    {uploadTab === 'git' && (
                      <Input
                        label="Git Repository URL"
                        placeholder="https://github.com/..."
                        value={gitLink}
                        onChange={(e) => setGitLink(e.target.value)}
                      />
                    )}

                    {uploadTab === 'doc' && (
                      <Input
                        label="Documentation / Live URL"
                        placeholder="https://docs.google.com/... or https://..."
                        value={docLink}
                        onChange={(e) => setDocLink(e.target.value)}
                      />
                    )}

                    <Button
                      size="sm"
                      className="w-full mt-2"
                      isLoading={uploadMutation.isPending}
                      onClick={() => uploadMutation.mutate()}
                    >
                      Submit for review
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-xs text-slate-400">
                  Select a task part on the left to view uploads or submit work.
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* NEW TASK MODAL */}
      <Modal
        isOpen={isNewTaskModalOpen}
        onClose={() => setIsNewTaskModalOpen(false)}
        title="Create New Task"
        description="Define a parent task and split it into parts for assigned interns."
        maxWidth="2xl"
      >
        <div className="space-y-4">
          <Input
            label="Task Title *"
            placeholder="e.g. Wi-Fi survey report or College events website"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
          />

          <Textarea
            label="Description & Acceptance Criteria"
            placeholder="Objectives, reference links, and expected outcome..."
            rows={2}
            value={newTaskDescription}
            onChange={(e) => setNewTaskDescription(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Priority"
              value={newTaskPriority}
              onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
              options={[
                { value: TASK_PRIORITIES.LOW, label: 'Low' },
                { value: TASK_PRIORITIES.MEDIUM, label: 'Medium' },
                { value: TASK_PRIORITIES.HIGH, label: 'High' },
              ]}
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Task Due Date *
              </label>
              <input
                type="date"
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Task Parts Chain Builder */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Task Parts ({newTaskParts.length})
              </span>
              <button
                type="button"
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
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Part
              </button>
            </div>

            <div className="space-y-2.5 max-h-52 overflow-y-auto">
              {newTaskParts.map((part, index) => (
                <div
                  key={index}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      placeholder={`Part ${index + 1} title (e.g. Network map)`}
                      value={part.title}
                      onChange={(e) => {
                        const updated = [...newTaskParts];
                        updated[index].title = e.target.value;
                        setNewTaskParts(updated);
                      }}
                      className="flex-1 bg-white border border-slate-300 rounded-lg py-1.5 px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />

                    {newTaskParts.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setNewTaskParts(newTaskParts.filter((_, i) => i !== index))
                        }
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
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
                      className="text-xs py-1.5"
                    />

                    <input
                      type="date"
                      value={part.dueDate}
                      onChange={(e) => {
                        const updated = [...newTaskParts];
                        updated[index].dueDate = e.target.value;
                        setNewTaskParts(updated);
                      }}
                      className="bg-white border border-slate-300 rounded-lg py-1.5 px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsNewTaskModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              isLoading={createTaskMutation.isPending}
              disabled={!newTaskTitle.trim() || createTaskMutation.isPending}
              onClick={() => createTaskMutation.mutate()}
            >
              Create Task
            </Button>
          </div>
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
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
            <div>
              Current Assignee:{' '}
              <span className="font-bold text-slate-800">
                {selectedPart?.assignedInternName || 'None'}
              </span>
            </div>
            <div>
              Current Deadline:{' '}
              <span className="font-bold text-slate-800">
                {selectedPart?.dueDate ? formatDate(selectedPart.dueDate) : 'None'}
              </span>
            </div>
          </div>

          <Select
            label="New Assignee *"
            value={reassignUserId}
            onChange={(e) => setReassignUserId(e.target.value)}
            options={users.map((u: any) => ({
              value: u.id,
              label: `${u.name} (${u.role.replace('_', ' ')})`,
            }))}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              New Due Date (Optional)
            </label>
            <input
              type="date"
              value={reassignDueDate}
              onChange={(e) => setReassignDueDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <Textarea
            label="Reason for Reassignment (Optional)"
            placeholder="e.g. Workload balancing or sickness cover..."
            rows={2}
            value={reassignReason}
            onChange={(e) => setReassignReason(e.target.value)}
          />

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
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

      {/* Review Modal */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title="Review Task Part"
        description={`Submit feedback and evaluation for ${selectedPart?.title}`}
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Rating (1 to 5 Stars)
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setReviewRating(star)}
                  className={`p-1.5 rounded-md ${
                    reviewRating >= star ? 'text-amber-500' : 'text-slate-300'
                  }`}
                >
                  <Star className="w-6 h-6 fill-current" />
                </button>
              ))}
            </div>
          </div>

          <Textarea
            label="Feedback comment *"
            placeholder="Guidance, praise, or revision notes..."
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
          />

          <div className="flex justify-end gap-2.5 pt-3">
            <Button
              variant="outline"
              size="sm"
              isLoading={reviewMutation.isPending}
              onClick={() => reviewMutation.mutate('send_back')}
            >
              Request Changes (Send back)
            </Button>
            <Button
              size="sm"
              isLoading={reviewMutation.isPending}
              onClick={() => reviewMutation.mutate('approve')}
            >
              Approve (Done)
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
