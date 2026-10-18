import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { Button } from '../../components/ui/Button.js';
import { Badge } from '../../components/ui/Badge.js';
import { Input } from '../../components/ui/Input.js';
import { Textarea } from '../../components/ui/Textarea.js';
import { Select } from '../../components/ui/Select.js';
import { Modal } from '../../components/ui/Modal.js';
import { useToast } from '../../components/ui/Toast.js';
import { USER_ROLES } from '@command-center/shared';
import {
  Pin,
  Send,
  Paperclip,
  Image,
  FileText,
  ThumbsUp,
  Download,
  Plus,
  Users,
  Trash2,
  UserPlus,
  Search,
  MessageSquare,
  Shield,
  X,
  EyeOff,
  LogOut,
  AlertOctagon,
  RotateCcw,
  ArrowLeft,
} from 'lucide-react';

export const ChatScreen: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [activeChannelId, setActiveChannelId] = useState<string>('');
  const [channelSearch, setChannelSearch] = useState('');
  const [messageText, setMessageText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Safety Modal States
  const [isClearViewModalOpen, setIsClearViewModalOpen] = useState(false);
  const [isClearSessionModalOpen, setIsClearSessionModalOpen] = useState(false);
  const [isDeleteHistoryModalOpen, setIsDeleteHistoryModalOpen] = useState(false);
  const [deleteConfirmWord, setDeleteConfirmWord] = useState('');

  // Local view clearing timestamps per channel
  const [clearedViewTimestamps, setClearedViewTimestamps] = useState<Record<string, number>>(() => {
    try {
      const stored = localStorage.getItem('chat_cleared_views');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const handleClearLocalView = () => {
    if (!activeChannelId) return;
    const updated = { ...clearedViewTimestamps, [activeChannelId]: Date.now() };
    setClearedViewTimestamps(updated);
    try {
      localStorage.setItem('chat_cleared_views', JSON.stringify(updated));
    } catch {
      // ignore
    }
    showToast({
      type: 'info',
      title: 'Local View Cleared',
      message: 'Prior messages hidden from your view on this device only.',
    });
    setIsClearViewModalOpen(false);
  };

  const handleRestoreLocalView = () => {
    if (!activeChannelId) return;
    const updated = { ...clearedViewTimestamps };
    delete updated[activeChannelId];
    setClearedViewTimestamps(updated);
    try {
      localStorage.setItem('chat_cleared_views', JSON.stringify(updated));
    } catch {
      // ignore
    }
    showToast({
      type: 'success',
      title: 'Local View Restored',
      message: 'Full channel history restored in your view.',
    });
  };

  // Create Team Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [teamLeadId, setTeamLeadId] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [createTeamError, setCreateTeamError] = useState('');

  // Members Management Modal State
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [memberToAddId, setMemberToAddId] = useState('');

  // Permissions
  const canManageTeams =
    currentUser?.role === USER_ROLES.ADMIN || currentUser?.role === USER_ROLES.LEAD;

  // 1. Fetch channels
  const { data: channels = [], isLoading: isLoadingChannels } = useQuery({
    queryKey: ['chat-channels'],
    queryFn: () => apiRequest<any[]>('/chat/channels'),
  });

  // 2. Fetch users for member/lead selection (only for authorized users)
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiRequest<any[]>('/users').catch(() => []),
    enabled: canManageTeams,
  });

  // Select initial channel if none selected
  React.useEffect(() => {
    if (channels.length > 0 && !activeChannelId) {
      setActiveChannelId(channels[0].id);
    }
  }, [channels, activeChannelId]);

  // Set default team lead when users load
  React.useEffect(() => {
    if (users.length > 0 && !teamLeadId) {
      const defaultLead = users.find((u: any) => u.id === currentUser?.id) || users[0];
      setTeamLeadId(defaultLead?.id || '');
    }
  }, [users, currentUser, teamLeadId]);

  // 3. Fetch messages for active channel
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ['chat-messages', activeChannelId],
    queryFn: () => apiRequest<any[]>(`/chat/channels/${activeChannelId}/messages`),
    enabled: !!activeChannelId,
    refetchInterval: 3000,
  });

  // Active channel reference
  const activeChannel = channels.find((c: any) => c.id === activeChannelId) || channels[0];

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!messageText.trim() && !selectedFile) return;

      const formData = new FormData();
      if (messageText.trim()) formData.append('text', messageText.trim());
      if (selectedFile) formData.append('file', selectedFile);

      return apiRequest(`/chat/channels/${activeChannelId}/messages`, {
        method: 'POST',
        body: formData,
      });
    },
    onSuccess: () => {
      setMessageText('');
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ['chat-messages', activeChannelId] });
      queryClient.invalidateQueries({ queryKey: ['chat-channels'] });
    },
    onError: (err: any) => {
      showToast({ type: 'error', title: 'Send failed', message: err.message });
    },
  });

  // Central Office Permanent Channel Deletion Mutation (Admin & Lead)
  const clearHistoryMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/chat/channels/${activeChannelId}/messages`, {
        method: 'DELETE',
      });
    },
    onSuccess: (data: any) => {
      showToast({ type: 'success', title: 'Channel Cleared', message: data.message });
      setIsDeleteHistoryModalOpen(false);
      setDeleteConfirmWord('');
      queryClient.invalidateQueries({ queryKey: ['chat-messages', activeChannelId] });
      queryClient.invalidateQueries({ queryKey: ['chat-channels'] });
    },
    onError: (err: any) => {
      showToast({ type: 'error', title: 'Action Failed', message: err.message });
    },
  });

  // Reaction toggle mutation
  const reactionMutation = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      return apiRequest(`/chat/messages/${messageId}/reactions`, {
        method: 'POST',
        body: JSON.stringify({ emoji }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', activeChannelId] });
    },
  });

  // Create team mutation
  const createTeamMutation = useMutation({
    mutationFn: async () => {
      if (!teamName.trim()) {
        throw new Error('Team name is required');
      }
      if (!teamLeadId) {
        throw new Error('Please select a team lead');
      }

      return apiRequest<{ message: string; teamId: string; channelId: string }>('/chat/teams', {
        method: 'POST',
        body: JSON.stringify({
          name: teamName.trim(),
          description: teamDescription.trim() || undefined,
          leadId: teamLeadId,
          memberIds: selectedMemberIds,
        }),
      });
    },
    onSuccess: (data) => {
      showToast({ type: 'success', title: 'Team Created', message: data.message });
      setIsCreateModalOpen(false);
      setTeamName('');
      setTeamDescription('');
      setSelectedMemberIds([]);
      setCreateTeamError('');
      queryClient.invalidateQueries({ queryKey: ['chat-channels'] });
      if (data.channelId) {
        setActiveChannelId(data.channelId);
      }
    },
    onError: (err: any) => {
      setCreateTeamError(err.message);
      showToast({ type: 'error', title: 'Creation failed', message: err.message });
    },
  });

  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!activeChannel?.teamId) return;
      return apiRequest(`/chat/teams/${activeChannel.teamId}/members`, {
        method: 'POST',
        body: JSON.stringify({ userId }),
      });
    },
    onSuccess: (data: any) => {
      showToast({ type: 'success', title: 'Member Added', message: data.message });
      setMemberToAddId('');
      queryClient.invalidateQueries({ queryKey: ['chat-channels'] });
    },
    onError: (err: any) => {
      showToast({ type: 'error', title: 'Add failed', message: err.message });
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!activeChannel?.teamId) return;
      return apiRequest(`/chat/teams/${activeChannel.teamId}/members/${userId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: (data: any) => {
      showToast({ type: 'success', title: 'Member Removed', message: data.message });
      queryClient.invalidateQueries({ queryKey: ['chat-channels'] });
    },
    onError: (err: any) => {
      showToast({ type: 'error', title: 'Remove failed', message: err.message });
    },
  });

  // Filter channels based on search
  const filteredChannels = useMemo(() => {
    if (!channelSearch.trim()) return channels;
    const term = channelSearch.toLowerCase();
    return channels.filter((c: any) => c.name.toLowerCase().includes(term));
  }, [channels, channelSearch]);

  const groupAndTeamChannels = filteredChannels.filter(
    (c: any) => c.type === 'team' || c.type === 'group'
  );
  const directChannels = filteredChannels.filter((c: any) => c.type === 'direct');

  // Dynamic shared files aggregated from active channel messages
  const sharedFiles = useMemo(() => {
    const files: any[] = [];
    messages.forEach((msg: any) => {
      if (msg.attachments && Array.isArray(msg.attachments)) {
        msg.attachments.forEach((att: any) => {
          files.push({
            name: att.fileName || 'Attachment',
            url: att.url,
            size: att.fileSize ? `${(att.fileSize / (1024 * 1024)).toFixed(1)} MB` : '',
            sender: msg.senderName || 'Member',
            date: new Date(msg.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }),
            ext: (att.fileName?.split('.').pop() || 'FILE').toUpperCase(),
          });
        });
      }
    });
    return files;
  }, [messages]);

  // Candidates for adding to active team
  const existingMemberIds = useMemo(() => {
    return new Set(activeChannel?.members?.map((m: any) => m.id) || []);
  }, [activeChannel]);

  const nonMemberUsers = useMemo(() => {
    return users.filter((u: any) => !existingMemberIds.has(u.id));
  }, [users, existingMemberIds]);

  // Search filtered users for Team Creation
  const filteredCandidateUsers = useMemo(() => {
    if (!memberSearchTerm.trim()) return users;
    const t = memberSearchTerm.toLowerCase();
    return users.filter(
      (u: any) => u.name.toLowerCase().includes(t) || u.email?.toLowerCase().includes(t)
    );
  }, [users, memberSearchTerm]);

  const toggleMemberSelection = (userId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Chat</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Team groups and direct messages. Share files, link tasks, and keep discussions in one place.
          </p>
        </div>

        {canManageTeams && (
          <Button
            size="sm"
            onClick={() => {
              setCreateTeamError('');
              setIsCreateModalOpen(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Create Team
          </Button>
        )}
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-200 overflow-hidden flex shadow-xs">
        {/* Left Sidebar: Groups, Teams & DMs */}
        <div className={`w-full md:w-64 border-r border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex flex-col shrink-0 ${activeChannelId ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-3 border-b border-slate-200">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search chats"
                value={channelSearch}
                onChange={(e) => setChannelSearch(e.target.value)}
                className="py-1.5 pl-8 text-xs bg-white"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {/* Teams & Groups Section */}
            <div>
              <div className="flex items-center justify-between px-2 mb-1.5">
                <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
                  TEAMS & GROUPS
                </span>
                {canManageTeams && (
                  <button
                    type="button"
                    onClick={() => {
                      setCreateTeamError('');
                      setIsCreateModalOpen(true);
                    }}
                    title="Create new team"
                    className="text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {isLoadingChannels ? (
                <div className="px-3 py-4 text-xs text-slate-400 text-center animate-pulse">
                  Loading channels...
                </div>
              ) : groupAndTeamChannels.length === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-400 italic">No channels found</div>
              ) : (
                <div className="space-y-0.5">
                  {groupAndTeamChannels.map((item: any) => {
                    const isSelected = activeChannelId === item.id;
                    const isTeam = item.type === 'team';

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveChannelId(item.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                          isSelected
                            ? 'bg-blue-50 text-blue-700 font-bold'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          {isTeam ? (
                            <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          ) : (
                            <span className="text-slate-400 shrink-0">#</span>
                          )}
                          <span className="truncate">{item.name}</span>
                        </div>
                        {item.unreadCount > 0 && (
                          <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                            {item.unreadCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Direct Messages Section */}
            {directChannels.length > 0 && (
              <div>
                <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 block mb-1">
                  DIRECT
                </span>
                <div className="space-y-0.5">
                  {directChannels.map((item: any) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveChannelId(item.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                        activeChannelId === item.id
                          ? 'bg-blue-50 text-blue-700 font-bold'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="truncate">{item.name}</span>
                      {item.unreadCount > 0 && (
                        <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                          {item.unreadCount}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: Conversation Stream */}
        <div className={`flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 ${!activeChannelId ? 'hidden md:flex' : 'flex'}`}>
          {/* Channel Header */}
          <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
            <div className="min-w-0 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveChannelId('')}
                className="md:hidden p-1.5 -ml-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
                title="Back to channels"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {activeChannel?.type === 'team' ? (
                    <Users className="w-4 h-4 text-blue-600 shrink-0" />
                  ) : (
                    <span className="text-slate-400 font-bold">#</span>
                  )}
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-none truncate">
                  {activeChannel?.name || 'General Channel'}
                </h3>
                {activeChannel?.type === 'team' && (
                  <Badge variant="primary" size="sm">
                    Team
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 truncate">
                {activeChannel?.memberCount || activeChannel?.members?.length || 0} members
                {activeChannel?.leadName ? ` · Lead: ${activeChannel.leadName}` : ''}
                {activeChannel?.description ? ` · ${activeChannel.description}` : ''}
              </p>
            </div>
          </div>

          {/* Header Actions */}
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMembersModalOpen(true)}
                leftIcon={<Users className="w-3.5 h-3.5" />}
              >
                Members ({activeChannel?.members?.length || 0})
              </Button>

              {/* Local View Clear / Restore */}
              {clearedViewTimestamps[activeChannelId] ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRestoreLocalView}
                  leftIcon={<RotateCcw className="w-3.5 h-3.5 text-blue-600" />}
                  title="Restore hidden messages in your local view"
                >
                  Restore View
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsClearViewModalOpen(true)}
                  leftIcon={<EyeOff className="w-3.5 h-3.5 text-slate-500" />}
                  title="Hide prior messages from local view"
                >
                  Clear View
                </Button>
              )}

              {/* Safe Session Clear */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsClearSessionModalOpen(true)}
                leftIcon={<LogOut className="w-3.5 h-3.5 text-slate-500" />}
                title="End session safely"
              >
                Clear Session
              </Button>

              {/* Admin/Lead Permanent Channel Delete */}
              {canManageTeams && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDeleteHistoryModalOpen(true)}
                  leftIcon={<Trash2 className="w-3.5 h-3.5 text-rose-600" />}
                  className="text-rose-600 hover:bg-rose-50 border-rose-200"
                  title="Permanently delete channel history"
                >
                  Purge History
                </Button>
              )}
            </div>
          </div>

          {/* Pinned Announcement Banner */}
          {activeChannel?.pinnedMessage && (
            <div className="px-4 py-2 bg-amber-50/70 border-b border-amber-200/60 flex items-center gap-2 text-xs text-amber-900">
              <Pin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="font-semibold text-amber-800">Pinned:</span>
              <span className="truncate flex-1">{activeChannel.pinnedMessage.text}</span>
            </div>
          )}

          {/* Messages Feed */}
          {(() => {
            const cutoff = clearedViewTimestamps[activeChannelId] || 0;
            const visibleMessages = messages.filter((m: any) => new Date(m.createdAt).getTime() > cutoff);

            return (
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center h-full text-slate-400 text-xs animate-pulse">
                    Loading conversation...
                  </div>
                ) : visibleMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 space-y-2">
                    <MessageSquare className="w-8 h-8 text-slate-300" />
                    <p className="text-xs font-semibold text-slate-600">
                      {clearedViewTimestamps[activeChannelId] ? 'Local view cleared' : 'No messages yet'}
                    </p>
                    <p className="text-[11px]">
                      {clearedViewTimestamps[activeChannelId]
                        ? 'Previous messages hidden on this device. Click "Restore View" above to display them again.'
                        : 'Send a message below to start the conversation!'}
                    </p>
                  </div>
                ) : (
                  visibleMessages.map((msg: any) => {
                const isMe = msg.senderId === currentUser?.id;

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-xl ${
                      isMe ? 'ml-auto' : 'mr-auto'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1 text-[11px]">
                      <span className="font-bold text-slate-800">{msg.senderName}</span>
                      {msg.senderRole && (
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                          ({msg.senderRole})
                        </span>
                      )}
                      <span className="text-slate-400 text-[10px]">
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div
                      className={`p-3.5 rounded-2xl text-xs space-y-2 border ${
                        isMe
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-100 text-slate-900 border-slate-200/60'
                      }`}
                    >
                      {msg.text && <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>}

                      {/* Linked Task Card */}
                      {msg.linkedTaskNumber && (
                        <div
                          className={`p-2.5 rounded-lg border flex items-center justify-between gap-3 ${
                            isMe ? 'bg-blue-700/60 border-blue-500 text-white' : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant={isMe ? 'default' : 'primary'} size="sm">
                              {msg.linkedTaskNumber}
                            </Badge>
                            <span className="font-bold truncate">{msg.linkedTaskTitle}</span>
                          </div>
                        </div>
                      )}

                      {/* File Attachments */}
                      {msg.attachments?.map((file: any, i: number) => (
                        <div
                          key={i}
                          className={`p-2.5 rounded-lg border flex items-center justify-between gap-3 ${
                            isMe ? 'bg-blue-700/60 border-blue-500 text-white' : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className={`w-4 h-4 shrink-0 ${isMe ? 'text-blue-200' : 'text-blue-600'}`} />
                            <div className="min-w-0">
                              <span className="font-bold block truncate leading-tight">
                                {file.fileName}
                              </span>
                              {file.fileSize && (
                                <span className={`text-[10px] block ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                                  {(file.fileSize / (1024 * 1024)).toFixed(1)} MB
                                </span>
                              )}
                            </div>
                          </div>
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noreferrer"
                            className={`p-1 transition-colors ${
                              isMe ? 'text-blue-100 hover:text-white' : 'text-slate-400 hover:text-blue-600'
                            }`}
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      ))}
                    </div>

                    {/* Reactions */}
                    <div className="flex items-center gap-1.5 mt-1 text-[11px]">
                      {msg.reactions?.map((r: any) => (
                        <button
                          key={r.emoji}
                          type="button"
                          onClick={() =>
                            reactionMutation.mutate({ messageId: msg.id, emoji: r.emoji })
                          }
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] transition-colors ${
                            r.userReacted
                              ? 'bg-blue-50 border-blue-300 text-blue-700 font-bold'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span>{r.emoji}</span>
                          <span>{r.count}</span>
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={() => reactionMutation.mutate({ messageId: msg.id, emoji: '👍' })}
                        className="text-slate-400 hover:text-slate-600 px-1"
                        title="React with 👍"
                      >
                        👍
                      </button>
                      <button
                        type="button"
                        onClick={() => reactionMutation.mutate({ messageId: msg.id, emoji: '✅' })}
                        className="text-slate-400 hover:text-slate-600 px-1"
                        title="React with ✅"
                      >
                        ✅
                      </button>
                    </div>
                  </div>
                );
              }))}
            </div>
          );
        })()}

          {/* Message Input Bar */}
          <div className="p-3 border-t border-slate-200 bg-slate-50/50 space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <label className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 cursor-pointer font-medium px-2 py-1 rounded-md hover:bg-slate-200/60">
                <Paperclip className="w-3.5 h-3.5" />
                <span>Attach file</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </label>

              <label className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 cursor-pointer font-medium px-2 py-1 rounded-md hover:bg-slate-200/60">
                <Image className="w-3.5 h-3.5" />
                <span>Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </label>

              {selectedFile && (
                <div className="flex items-center gap-1.5 text-[11px] text-blue-700 dark:text-blue-300 font-semibold bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                  <span className="truncate max-w-[200px]">{selectedFile.name}</span>
                  {sendMutation.isPending ? (
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold animate-pulse">Uploading...</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="text-blue-500 hover:text-rose-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Type a message, or drop files here... (Press Enter to send)"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (messageText.trim() || selectedFile) {
                      sendMutation.mutate();
                    }
                  }
                }}
                className="flex-1 bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button
                size="sm"
                onClick={() => sendMutation.mutate()}
                isLoading={sendMutation.isPending}
                disabled={!messageText.trim() && !selectedFile}
                leftIcon={<Send className="w-3.5 h-3.5" />}
              >
                Send
              </Button>
            </div>
          </div>
        </div>

        {/* Right Panel: Shared Files */}
        <div className="w-64 border-l border-slate-200 bg-slate-50/50 p-4 shrink-0 hidden xl:flex flex-col">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
            Shared files ({sharedFiles.length})
          </h3>

          {sharedFiles.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              No files shared yet in this conversation.
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto">
              {sharedFiles.map((f, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs">
                  <Badge variant="primary" size="sm" className="mt-0.5 uppercase">
                    {f.ext}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-slate-800 truncate block leading-tight hover:text-blue-600"
                      title={f.name}
                    >
                      {f.name}
                    </a>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {f.sender} · {f.date} {f.size ? `· ${f.size}` : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CREATE TEAM MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Team"
        description="Establish a dedicated team with group chat, members, and a designated team lead."
        maxWidth="lg"
      >
        <div className="space-y-4">
          {createTeamError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {createTeamError}
            </div>
          )}

          <Input
            label="Team Name *"
            placeholder="e.g. Frontend Development Core"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
          />

          <Textarea
            label="Team Description"
            placeholder="Objectives, batch scope, or projects handled by this team..."
            rows={2}
            value={teamDescription}
            onChange={(e) => setTeamDescription(e.target.value)}
          />

          <Select
            label="Team Lead *"
            value={teamLeadId}
            onChange={(e) => setTeamLeadId(e.target.value)}
            options={users.map((u: any) => ({
              value: u.id,
              label: `${u.name} (${u.role.replace('_', ' ')})`,
            }))}
          />

          {/* Members Searchable Multi-Select */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Team Members ({selectedMemberIds.length} selected)
              </label>
              {selectedMemberIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedMemberIds([])}
                  className="text-[11px] text-rose-600 hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search candidates by name or email..."
                value={memberSearchTerm}
                onChange={(e) => setMemberSearchTerm(e.target.value)}
                className="w-full text-xs py-1.5 pl-8 pr-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Member Candidates List */}
            <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white">
              {filteredCandidateUsers.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-400">No matching users found</div>
              ) : (
                filteredCandidateUsers.map((u: any) => {
                  const isChecked = selectedMemberIds.includes(u.id);

                  return (
                    <label
                      key={u.id}
                      className="flex items-center justify-between p-2 hover:bg-slate-50 cursor-pointer text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleMemberSelection(u.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-semibold text-slate-800">{u.name}</span>
                        <span className="text-[10px] text-slate-400">({u.role})</span>
                      </div>
                      <span className="text-[11px] text-slate-400">{u.email}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={createTeamMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              isLoading={createTeamMutation.isPending}
              disabled={!teamName.trim() || !teamLeadId || createTeamMutation.isPending}
              onClick={() => createTeamMutation.mutate()}
            >
              Create Team
            </Button>
          </div>
        </div>
      </Modal>

      {/* MANAGE TEAM MEMBERS MODAL */}
      <Modal
        isOpen={isMembersModalOpen}
        onClose={() => setIsMembersModalOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span>{activeChannel?.name} — Team Members</span>
          </div>
        }
        description="View current conversation members and manage team roster."
        maxWidth="lg"
      >
        <div className="space-y-4">
          {/* Add Member Row (for Admin / Lead) */}
          {canManageTeams && activeChannel?.teamId && nonMemberUsers.length > 0 && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-800 block">Add New Member</span>
              <div className="flex gap-2">
                <Select
                  value={memberToAddId}
                  onChange={(e) => setMemberToAddId(e.target.value)}
                  options={[
                    { value: '', label: 'Select a user to add...' },
                    ...nonMemberUsers.map((u: any) => ({
                      value: u.id,
                      label: `${u.name} (${u.role.replace('_', ' ')})`,
                    })),
                  ]}
                  className="text-xs py-1.5"
                />
                <Button
                  size="sm"
                  disabled={!memberToAddId || addMemberMutation.isPending}
                  isLoading={addMemberMutation.isPending}
                  onClick={() => {
                    if (memberToAddId) addMemberMutation.mutate(memberToAddId);
                  }}
                  leftIcon={<UserPlus className="w-3.5 h-3.5" />}
                >
                  Add
                </Button>
              </div>
            </div>
          )}

          {/* Current Members List */}
          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto">
            {activeChannel?.members?.map((m: any) => {
              const isLead = m.id === activeChannel?.leadId;

              return (
                <div key={m.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50/50">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                      {m.name
                        ?.split(' ')
                        .map((n: string) => n[0])
                        .join('')}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900">{m.name}</span>
                        {isLead && (
                          <Badge variant="warning" size="sm">
                            Team Lead
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">{m.email}</span>
                    </div>
                  </div>

                  {canManageTeams && activeChannel?.teamId && !isLead && (
                    <button
                      type="button"
                      title={`Remove ${m.name}`}
                      disabled={removeMemberMutation.isPending}
                      onClick={() => {
                        if (confirm(`Remove ${m.name} from ${activeChannel.name}?`)) {
                          removeMemberMutation.mutate(m.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-2">
            <Button size="sm" variant="outline" onClick={() => setIsMembersModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* 1. Clear Local View Modal */}
      <Modal
        isOpen={isClearViewModalOpen}
        onClose={() => setIsClearViewModalOpen(false)}
        title="Clear Channel from Local View"
        description="Clear visible messages on this workstation without affecting other members or the database."
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl text-xs space-y-2">
            <div className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
              <EyeOff className="w-4 h-4 text-blue-600" />
              What this does:
            </div>
            <ul className="list-disc pl-5 space-y-1 text-blue-800 dark:text-blue-300">
              <li>Hides prior messages from your screen on this device only.</li>
              <li><strong>Does NOT delete</strong> messages from the Central Office database.</li>
              <li><strong>Does NOT affect</strong> other interns or leads in this channel.</li>
              <li>You can click <strong>"Restore View"</strong> in the channel header at any time.</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsClearViewModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleClearLocalView}>
              Clear My Local View
            </Button>
          </div>
        </div>
      </Modal>

      {/* 2. Clear Session Modal */}
      <Modal
        isOpen={isClearSessionModalOpen}
        onClose={() => setIsClearSessionModalOpen(false)}
        title="Clear Session & Sign Out"
        description="Safely end your session and clear local security tokens from this browser."
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs space-y-2 text-slate-700 dark:text-slate-300">
            <div className="font-bold flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
              <LogOut className="w-4 h-4 text-slate-600" />
              Session Security Summary:
            </div>
            <ul className="list-disc pl-5 space-y-1">
              <li>Authentication tokens and cached permissions will be securely destroyed.</li>
              <li>Local drafts and pending connections will be reset.</li>
              <li>You will be redirected to the official university login portal.</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsClearSessionModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={async () => {
                setIsClearSessionModalOpen(false);
                await logout();
              }}
            >
              Sign Out & Clear Session
            </Button>
          </div>
        </div>
      </Modal>

      {/* 3. Central Office Permanent Channel Purge (Admin & Lead) */}
      <Modal
        isOpen={isDeleteHistoryModalOpen}
        onClose={() => {
          setIsDeleteHistoryModalOpen(false);
          setDeleteConfirmWord('');
        }}
        title="Permanent Channel Message Purge"
        description="Permanently delete all messages and attachments from the database."
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-xs space-y-2">
            <div className="font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
              <AlertOctagon className="w-4 h-4 text-rose-600" />
              CRITICAL WARNING — IRREVERSIBLE ACTION:
            </div>
            <ul className="list-disc pl-5 space-y-1 text-rose-800 dark:text-rose-300">
              <li>All chat messages in <strong>#{activeChannel?.name}</strong> will be erased from the database.</li>
              <li>Reactions and message attachments will be permanently deleted.</li>
              <li>This deletion affects <strong>ALL members</strong> of the channel immediately.</li>
              <li>An administrative audit entry will be logged under your account.</li>
            </ul>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              To proceed, please type <span className="font-mono font-bold text-rose-600">DELETE</span> below:
            </label>
            <Input
              value={deleteConfirmWord}
              onChange={(e) => setDeleteConfirmWord(e.target.value)}
              placeholder="Type DELETE to confirm"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsDeleteHistoryModalOpen(false);
                setDeleteConfirmWord('');
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={deleteConfirmWord !== 'DELETE' || clearHistoryMutation.isPending}
              isLoading={clearHistoryMutation.isPending}
              onClick={() => clearHistoryMutation.mutate()}
            >
              Permanently Delete Channel Messages
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
