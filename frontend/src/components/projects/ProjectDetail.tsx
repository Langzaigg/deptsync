import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  ArrowLeft, Calendar, User as UserIcon, CheckCircle2, Circle, Clock, Plus,
  FileText, Send, Trash2, Edit2, X, Paperclip, Sparkles, Loader2, ChevronDown,
  CheckSquare, File, Image as ImageIcon, Download, Shield, ShieldCheck, Crown,
  AlertTriangle, Edit3, ArrowUpCircle, Folder, FolderPlus, FolderOpen,
  AlertCircle, Users, Briefcase
} from 'lucide-react';
import { Project, TimelineEvent, User, TaskAssignment, Attachment, UserRole } from '../../types';
import { projectsApi, eventsApi, usersApi, tasksApi, reportsApi, llmApi, filesApi } from '../../services/api';
import { useAuth } from '../../App';

interface PendingAttachment {
  file: File;
  previewUrl: string;
  caption: string;
  id: string;
}

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [tasks, setTasks] = useState<TaskAssignment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'TIMELINE' | 'MEMBERS' | 'SCHEDULE'>('TIMELINE');

  // Timeline State
  const [showEventModal, setShowEventModal] = useState(false);
  const getBeijingTimeString = () => {
    const now = new Date();
    return now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0') + ' ' +
      String(now.getHours()).padStart(2, '0') + ':' +
      String(now.getMinutes()).padStart(2, '0') + ':' +
      String(now.getSeconds()).padStart(2, '0');
  };

  const [newEvent, setNewEvent] = useState({
    type: 'UPDATE' as 'UPDATE' | 'MILESTONE' | 'ISSUE' | 'WEEKLY_REPORT' | 'MEETING' | 'DELIVERABLE',
    content: '',
    date: getBeijingTimeString(),
  });
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editEventContent, setEditEventContent] = useState('');

  // Attachments
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File Archive Folders
  const [folders, setFolders] = useState<string[]>(['文档', '图片']);
  const [expandedFolders, setExpandedFolders] = useState<string[]>(['文档', '图片']);
  const [newFolderName, setNewFolderName] = useState('');
  const [showFolderInput, setShowFolderInput] = useState(false);

  // Tasks State
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskFormMode, setTaskFormMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    assigneeIds: [] as string[],
    deadline: '',
    priority: 'NORMAL' as 'NORMAL' | 'HIGH'
  });
  const [editingTaskProgress, setEditingTaskProgress] = useState<{ id: string, progress: number, remark: string } | null>(null);

  // Report Gen State
  const [showReportAssistant, setShowReportAssistant] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [generatedReport, setGeneratedReport] = useState('');
  const [reportDateRange, setReportDateRange] = useState({ start: '', end: '' });

  // Member Management
  const [showMemberModal, setShowMemberModal] = useState(false);

  // Edit Project State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Project>>({});
  const [showDeleteProjectModal, setShowDeleteProjectModal] = useState(false);
  const [deleteProjectNameInput, setDeleteProjectNameInput] = useState('');
  const [existingCustomers, setExistingCustomers] = useState<string[]>([]);

  // Conversion State
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertProjectNumber, setConvertProjectNumber] = useState('');

  // Generic Confirmation Modal State
  const [confirmation, setConfirmation] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

  useEffect(() => {
    if (id && user) {
      loadProjectData();
    }
  }, [id, user]);

  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    setReportDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    });
  }, []);

  // Folder Logic
  useEffect(() => {
    const extracted = new Set<string>(['文档', '图片']);
    events.forEach(e => e.attachments?.forEach(a => {
      if (a.folder) extracted.add(a.folder);
    }));
    const sortedFolders = Array.from(extracted).sort();
    setFolders(sortedFolders);
  }, [events]);

  const loadProjectData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [proj, projEvents, projTasks, allUsers, allProjects] = await Promise.all([
        projectsApi.getById(id),
        eventsApi.getByProject(id),
        tasksApi.getAll(id),
        usersApi.getAll(),
        projectsApi.getAll()
      ]);

      setProject(proj);
      setEvents(projEvents);
      setTasks(projTasks);
      setUsers(allUsers);

      // Extract unique customer names
      const customers = Array.from(new Set(allProjects.map((p: Project) => p.customerName).filter(Boolean) as string[]));
      setExistingCustomers(customers);
    } catch (error) {
      console.error("Failed to load project:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFolder = (folder: string) => {
    if (expandedFolders.includes(folder)) {
      setExpandedFolders(prev => prev.filter(f => f !== folder));
    } else {
      setExpandedFolders(prev => [...prev, folder]);
    }
  };

  const createFolder = () => {
    if (newFolderName && !folders.includes(newFolderName)) {
      setFolders(prev => [...prev, newFolderName]);
      setNewFolderName('');
      setShowFolderInput(false);
    }
  };

  const moveFileToFolder = async (event: TimelineEvent, attachmentIndex: number, folderName: string) => {
    const newEvents = [...events];
    const evIdx = newEvents.findIndex(e => e.id === event.id);
    if (evIdx > -1 && newEvents[evIdx].attachments) {
      newEvents[evIdx].attachments![attachmentIndex].folder = folderName;
      try {
        await eventsApi.update(event.id, newEvents[evIdx]);
        setEvents(newEvents);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Attachments Logic
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const newAttachments: PendingAttachment[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          newAttachments.push({
            file,
            previewUrl: URL.createObjectURL(file),
            caption: '',
            id: Math.random().toString(36).substr(2, 9)
          });
        }
      }
    }
    if (newAttachments.length > 0) setPendingAttachments(prev => [...prev, ...newAttachments]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newAttachments: PendingAttachment[] = Array.from(e.target.files).map(file => ({
        file,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
        caption: '',
        id: Math.random().toString(36).substr(2, 9)
      }));
      setPendingAttachments(prev => [...prev, ...newAttachments]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id: string) => setPendingAttachments(prev => prev.filter(att => att.id !== id));
  const updateCaption = (id: string, caption: string) => setPendingAttachments(prev => prev.map(att => att.id === id ? { ...att, caption } : att));

  // Timeline Logic
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !user) return;
    if (!newEvent.content.trim() && pendingAttachments.length === 0) return;

    let finalAttachments: Attachment[] = [];
    for (const att of pendingAttachments) {
      try {
        // Upload file to MinIO - backend auto-classifies by project and file type
        const defaultFolder = att.file.type.startsWith('image/') ? '图片' : '文档';
        const result = await filesApi.upload(att.file, undefined, project.title);

        let finalName = att.file.name;
        if (att.file.type.startsWith('image/') || att.caption) {
          const extension = att.file.name.split('.').pop() || 'dat';
          const safeProjectTitle = project.title.replace(/\s+/g, '_').replace(/[\/\\:*?"<>|]/g, '');
          let suffix = '';
          if (att.caption) {
            const safeCaption = att.caption.trim().replace(/\s+/g, '_').replace(/[\/\\:*?"<>|]/g, '');
            suffix = safeCaption.length > 30 ? safeCaption.substring(0, 30) : safeCaption;
          } else {
            const now = new Date();
            const timestamp = now.getFullYear().toString() + (now.getMonth() + 1).toString().padStart(2, '0') + now.getDate().toString().padStart(2, '0') + '_' + now.getHours().toString().padStart(2, '0') + now.getMinutes().toString().padStart(2, '0') + now.getSeconds().toString().padStart(2, '0');
            suffix = timestamp;
          }
          finalName = `${safeProjectTitle}_${suffix}.${extension}`;
        }
        finalAttachments.push({ name: finalName, url: result.url, caption: att.caption, folder: defaultFolder });
      } catch (err) { console.error(err); }
    }

    // 使用北京时间格式 (YYYY-MM-DD HH:mm:ss)
    const now = new Date();
    const beijingTime = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0') + ' ' +
      String(now.getHours()).padStart(2, '0') + ':' +
      String(now.getMinutes()).padStart(2, '0') + ':' +
      String(now.getSeconds()).padStart(2, '0');

    const event: TimelineEvent = {
      id: Math.random().toString(36).substr(2, 9),
      projectId: project.id,
      authorId: user.id,
      authorName: user.username,
      content: newEvent.content,
      date: beijingTime,
      type: newEvent.type,
      attachments: finalAttachments,
      createdAt: beijingTime
    };

    try {
      await eventsApi.create(event);
      const updatedEvents = await eventsApi.getByProject(project.id);
      setEvents(updatedEvents);
      setShowEventModal(false);
      setNewEvent({ type: 'UPDATE', content: '', date: getBeijingTimeString() });
      setPendingAttachments([]);
    } catch (err) { console.error(err); }
  };

  const handleDeleteEvent = async (eventId: string) => {
    openConfirmation("删除时间线记录", "确定要删除这条进度记录吗？删除后无法恢复。", async () => {
      try {
        await eventsApi.delete(eventId);
        setEvents(prev => prev.filter(e => e.id !== eventId));
      } catch (err) { console.error(err); }
    });
  };

  const startEditEvent = (event: TimelineEvent) => {
    setEditingEventId(event.id);
    setEditEventContent(event.content);
  };

  const saveEditEvent = async () => {
    if (!editingEventId || !project) return;
    const event = events.find(e => e.id === editingEventId);
    if (event) {
      const updated = { ...event, content: editEventContent };
      try {
        await eventsApi.update(editingEventId, updated);
        setEvents(prev => prev.map(e => e.id === editingEventId ? updated : e));
        setEditingEventId(null);
      } catch (err) { console.error(err); }
    }
  };

  // Generic Confirmation Helper
  const openConfirmation = (title: string, message: string, onConfirm: () => void) => {
    setConfirmation({ isOpen: true, title, message, onConfirm });
  };

  const closeConfirmation = () => {
    setConfirmation(prev => ({ ...prev, isOpen: false }));
  };

  const executeConfirm = () => {
    confirmation.onConfirm();
    closeConfirmation();
  };

  // Project Operations
  const handleDeleteProject = async () => {
    if (!project) return;
    setShowDeleteProjectModal(true);
    setDeleteProjectNameInput('');
  };

  const executeDeleteProject = async () => {
    if (project && deleteProjectNameInput === project.title) {
      try {
        await projectsApi.delete(project.id);
        navigate('/projects');
      } catch (e) { console.error(e); }
    } else {
      alert("项目名称不匹配");
    }
  };

  const handleUpdateStatus = async (newStatus: any) => {
    if (!project) return;
    const updated = { ...project, status: newStatus };
    try {
      await projectsApi.update(project.id, updated);
      setProject(updated);
    } catch (e) { console.error(e); }
  };

  // --- Project Conversion ---
  const handleConvertToFormalTrigger = () => {
    setShowConvertModal(true);
    setConvertProjectNumber('');
  };

  const confirmConversion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    if (!convertProjectNumber.trim()) {
      alert("请输入项目编号");
      return;
    }
    const updated = {
      ...project,
      status: 'EXECUTION' as const,
      projectNumber: convertProjectNumber
    };
    try {
      await projectsApi.update(project.id, updated);
      setProject(updated);
      setShowConvertModal(false);
    } catch (err) { console.error(err); }
  };

  // --- Project Editing ---
  const handleEditProjectTrigger = () => {
    if (!project) return;
    setEditFormData({
      title: project.title,
      description: project.description,
      customerName: project.customerName || '',
      businessScenario: project.businessScenario,
      priority: project.priority || 'NORMAL',
      projectNumber: project.projectNumber || '',
      status: project.status
    });
    setShowEditModal(true);
  };

  const saveProjectEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    const updated = { ...project, ...editFormData };
    try {
      await projectsApi.update(project.id, updated);
      setProject(updated);
      setShowEditModal(false);
    } catch (err) { console.error(err); }
  };

  // --- Member Management ---
  const handleToggleMember = async (userId: string) => {
    if (!project) return;
    let newMembers = project.members || [];
    if (newMembers.includes(userId)) {
      newMembers = newMembers.filter(id => id !== userId);
    } else {
      newMembers = [...newMembers, userId];
    }
    const updated = { ...project, members: newMembers };
    try {
      await projectsApi.update(project.id, updated);
      setProject(updated);
    } catch (err) { console.error(err); }
  };

  const handleToggleProjectAdmin = async (userId: string) => {
    if (!project) return;
    if (userId === project.managerId) {
      alert("无法更改项目负责人的管理权限");
      return;
    }
    let currentAdmins = project.admins || [];
    if (currentAdmins.includes(userId)) {
      currentAdmins = currentAdmins.filter(id => id !== userId);
    } else {
      currentAdmins = [...currentAdmins, userId];
    }
    const updated = { ...project, admins: currentAdmins };
    try {
      await projectsApi.update(project.id, updated);
      setProject(updated);
    } catch (err) { console.error(err); }
  };

  const handleSetManager = async (userId: string) => {
    if (!project) return;
    if (userId === project.managerId) return;
    if (window.confirm("确定移交项目负责人权限吗？您将变为普通成员（或管理员）。")) {
      const updated = { ...project, managerId: userId };
      try {
        await projectsApi.update(project.id, updated);
        setProject(updated);
      } catch (err) { console.error(err); }
    }
  };

  // --- Task Management ---
  const openCreateTaskModal = () => {
    setTaskFormMode('CREATE');
    setTaskFormData({ title: '', description: '', assigneeIds: [], deadline: '', priority: 'NORMAL' });
    setShowTaskModal(true);
  };

  const openEditTaskModal = (task: TaskAssignment) => {
    setTaskFormMode('EDIT');
    setEditingTaskId(task.id);
    setTaskFormData({
      title: task.title,
      description: task.description,
      assigneeIds: task.assigneeIds,
      deadline: task.deadline,
      priority: task.priority || 'NORMAL'
    });
    setShowTaskModal(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;

    if (taskFormMode === 'CREATE') {
      const task: TaskAssignment = {
        id: Math.random().toString(36).substr(2, 9),
        projectId: project.id,
        projectTitle: project.title,
        title: taskFormData.title,
        description: taskFormData.description,
        assigneeIds: taskFormData.assigneeIds.length > 0 ? taskFormData.assigneeIds : [user!.id],
        deadline: taskFormData.deadline,
        progress: 0,
        status: 'PENDING',
        priority: taskFormData.priority,
        remarks: [],
        creatorId: user!.id,
        createdAt: new Date().toISOString()
      };
      try {
        await tasksApi.create(task);
        const updatedTasks = await tasksApi.getAll(project.id);
        setTasks(updatedTasks);
      } catch (err) { console.error(err); }
    } else if (taskFormMode === 'EDIT' && editingTaskId) {
      const existing = tasks.find(t => t.id === editingTaskId);
      if (existing) {
        const updated: TaskAssignment = {
          ...existing,
          title: taskFormData.title,
          description: taskFormData.description,
          assigneeIds: taskFormData.assigneeIds,
          deadline: taskFormData.deadline,
          priority: taskFormData.priority
        };
        try {
          await tasksApi.update(editingTaskId, updated);
          const updatedTasks = await tasksApi.getAll(project.id);
          setTasks(updatedTasks);
        } catch (err) { console.error(err); }
      }
    }
    setShowTaskModal(false);
  };

  const handleDeleteTask = async () => {
    if (editingTaskId) {
      openConfirmation("删除任务", "确定删除此任务吗？删除后无法恢复。", async () => {
        try {
          await tasksApi.delete(editingTaskId);
          setTasks(prev => prev.filter(t => t.id !== editingTaskId));
          setShowTaskModal(false);
        } catch (err) { console.error(err); }
      });
    }
  };

  const handleUpdateTaskProgress = async (taskId: string) => {
    if (!editingTaskProgress || !user) return;
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const updated: TaskAssignment = {
        ...task,
        progress: editingTaskProgress.progress,
        status: editingTaskProgress.progress === 100 ? 'COMPLETED' : editingTaskProgress.progress > 0 ? 'IN_PROGRESS' : 'PENDING',
        remarks: editingTaskProgress.remark ? [...task.remarks, { authorId: user.id, authorName: user.username, content: editingTaskProgress.remark, date: new Date().toISOString() }] : task.remarks
      };
      try {
        await tasksApi.update(taskId, updated);
        const updatedTasks = await tasksApi.getAll(project!.id);
        setTasks(updatedTasks);
        setEditingTaskProgress(null);
      } catch (err) { console.error(err); }
    }
  };

  const toggleTaskAssignee = (userId: string) => {
    if (taskFormData.assigneeIds.includes(userId)) {
      setTaskFormData(prev => ({ ...prev, assigneeIds: prev.assigneeIds.filter(id => id !== userId) }));
    } else {
      setTaskFormData(prev => ({ ...prev, assigneeIds: [...prev.assigneeIds, userId] }));
    }
  };

  // --- Report Generation ---
  const handleGenerateReport = async () => {
    if (!project || !reportDateRange.start || !reportDateRange.end) return;
    setIsGeneratingReport(true);
    try {
      const relevantEvents = events.filter(e => e.date >= reportDateRange.start && e.date <= reportDateRange.end);
      const relevantTasks = tasks.filter(t => {
        const created = t.createdAt ? t.createdAt.split('T')[0] : new Date().toISOString().split('T')[0];
        return created <= reportDateRange.end && (t.status !== 'COMPLETED' || created >= reportDateRange.start);
      });
      const result = await llmApi.generateProjectReport(project, relevantEvents, relevantTasks, reportDateRange.start, reportDateRange.end);
      setGeneratedReport(result.content);
    } catch (e) {
      console.error(e);
      setGeneratedReport("生成失败，请稍后重试。");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Render Helpers
  const isImage = (url: string) => {
    if (url.startsWith('data:image')) return true;
    const ext = url.split('?')[0].split('.').pop()?.toLowerCase() || '';
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext);
  };

  const formatDateTime = (dateStr: string) => {
    // 如果已经是北京时间格式，直接返回
    if (dateStr.includes(' ') && !dateStr.includes('T')) {
      return dateStr;
    }
    // 如果是 ISO 格式，转换为北京时间
    const date = new Date(dateStr);
    return date.getFullYear() + '-' +
      String(date.getMonth() + 1).padStart(2, '0') + '-' +
      String(date.getDate()).padStart(2, '0') + ' ' +
      String(date.getHours()).padStart(2, '0') + ':' +
      String(date.getMinutes()).padStart(2, '0');
  };

  const getEventLabel = (type: string) => {
    switch (type) {
      case 'UPDATE': return '进展';
      case 'MILESTONE': return '里程碑';
      case 'ISSUE': return '问题';
      case 'WEEKLY_REPORT': return '周报';
      case 'MEETING': return '会议';
      case 'DELIVERABLE': return '交付物';
      default: return type;
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'MILESTONE': return <CheckCircle2 className="text-green-500" />;
      case 'MEETING': return <UserIcon className="text-blue-500" />;
      case 'DELIVERABLE': return <FileText className="text-purple-500" />;
      case 'ISSUE': return <X className="text-red-500" />;
      default: return <Circle className="text-slate-400" />;
    }
  };

  if (loading || !project) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 gap-2">
        <Loader2 className="animate-spin" /> 加载项目详情...
      </div>
    );
  }

  const projectMembers = users.filter(u => project.members?.includes(u.id));
  const manager = users.find(u => u.id === project.managerId);
  const isProjectAdmin = project.admins?.includes(user?.id || '') || project.managerId === user?.id || user?.role === UserRole.ADMIN;
  const isManager = user?.role === UserRole.ADMIN || user?.id === project.managerId;
  const isAdmin = user?.role === UserRole.ADMIN;
  const isMember = project.members?.includes(user?.id || '');

  const getCategoryLabel = () => {
    if (project.status === 'INITIATION') return '前期任务';
    if (project.status === 'CLOSED') return '归档项目';
    return '正式项目';
  };

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'URGENT': return <span className="flex items-center gap-1 text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded border border-red-200"><AlertCircle size={10} /> 最高优先</span>;
      case 'HIGH': return <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded border border-orange-200">高优先</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <Link to="/projects" className="inline-flex items-center text-slate-500 hover:text-brand-600 transition-colors">
        <ArrowLeft size={16} className="mr-1" /> 返回项目列表
      </Link>

      {/* Project Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative">
        {isProjectAdmin && (
          <button
            onClick={handleEditProjectTrigger}
            className="absolute top-6 right-6 p-2 text-slate-400 hover:text-brand-600 bg-slate-50 rounded-full hover:bg-brand-50 transition-colors"
            title="编辑项目信息"
          >
            <Edit3 size={18} />
          </button>
        )}

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex-1 pr-12">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-0.5 text-xs font-bold rounded ${project.status === 'INITIATION' ? 'bg-indigo-100 text-indigo-700' : project.status === 'CLOSED' ? 'bg-slate-200 text-slate-700' : 'bg-brand-100 text-brand-700'}`}>
                {getCategoryLabel()}
              </span>
              {getPriorityBadge(project.priority)}
              {project.projectNumber && (
                <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                  {project.projectNumber}
                </span>
              )}
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                {project.businessScenario}
              </span>
              {project.status === 'INITIATION' && isProjectAdmin && (
                <button onClick={handleConvertToFormalTrigger} className="flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded hover:bg-green-100">
                  <ArrowUpCircle size={12} /> 转为正式项目
                </button>
              )}
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{project.title}</h1>
            {project.customerName && <p className="text-sm font-medium text-slate-700 mb-2">客户: {project.customerName}</p>}
            <p className="text-slate-600 max-w-2xl">{project.description}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-6 mt-6 pt-6 border-t border-slate-100 text-sm text-slate-500 items-center justify-between">
          <div className="flex flex-wrap gap-6 items-center">
            <div className="flex items-center gap-2">
              <span>状态:</span>
              {isProjectAdmin && project.status !== 'INITIATION' ? (
                <select
                  value={project.status}
                  onChange={(e) => handleUpdateStatus(e.target.value)}
                  className="font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none focus:border-brand-500"
                >
                  <option value="EXECUTION">执行/推进</option>
                  <option value="ACCEPTANCE">验收/交付</option>
                  <option value="CLOSED">结束/归档</option>
                </select>
              ) : (
                <span className="font-semibold text-slate-800">
                  {project.status === 'INITIATION' ? '立项/筹备' : project.status === 'EXECUTION' ? '执行/推进' : project.status === 'ACCEPTANCE' ? '验收/交付' : '结束/归档'}
                </span>
              )}
            </div>
            <div>负责人: <span className="font-semibold text-slate-800">{manager?.username || 'Unknown'}</span></div>
            <div>团队: <span className="font-semibold text-slate-800">{project.members?.length || 0} 人</span></div>
            <div>开始日期: <span className="font-semibold text-slate-800">{project.startDate}</span></div>
          </div>

          <div>
            {isMember && (
              <button
                onClick={() => setShowReportAssistant(true)}
                className="flex items-center gap-2 bg-indigo-50 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                <Sparkles size={18} />
                智能报告助手
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-6 rounded-t-xl overflow-x-auto">
        <button onClick={() => setActiveTab('TIMELINE')} className={`py-4 px-4 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'TIMELINE' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          进度与时间线
        </button>
        <button onClick={() => setActiveTab('MEMBERS')} className={`py-4 px-4 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'MEMBERS' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          成员管理
        </button>
        {(project.status !== 'INITIATION') && (
          <button onClick={() => setActiveTab('SCHEDULE')} className={`py-4 px-4 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'SCHEDULE' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            项目进度安排
          </button>
        )}
      </div>

      {activeTab === 'TIMELINE' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="relative border-l-2 border-slate-200 ml-4 pl-8 space-y-8">
              {isMember && (
                <div className="relative">
                  <div className="absolute -left-[41px] bg-brand-500 rounded-full p-2 text-white shadow-sm ring-4 ring-white"><Send size={16} /></div>
                  <form onSubmit={handleCreateEvent} className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
                    <textarea
                      placeholder="发布进度更新... (支持粘贴图片)"
                      className="w-full text-sm border-0 focus:ring-0 p-0 resize-none placeholder:text-slate-400"
                      rows={3}
                      value={newEvent.content}
                      onChange={e => setNewEvent({ ...newEvent, content: e.target.value })}
                      onPaste={handlePaste}
                    />
                    {pendingAttachments.length > 0 && (
                      <div className="mb-4 grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg">
                        {pendingAttachments.map(att => (
                          <div key={att.id} className="relative group/preview bg-white rounded border border-slate-200 p-2">
                            <button type="button" onClick={() => removeAttachment(att.id)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/preview:opacity-100 z-10"><X size={12} /></button>
                            <div className="aspect-video bg-slate-100 rounded mb-2 overflow-hidden flex items-center justify-center">
                              {att.previewUrl ? <img src={att.previewUrl} className="w-full h-full object-cover" /> : <File className="text-slate-400" />}
                            </div>
                            {att.previewUrl ? <input type="text" placeholder="图注..." value={att.caption} onChange={e => updateCaption(att.id, e.target.value)} className="w-full text-xs border-b border-transparent focus:border-brand-300 outline-none bg-transparent" /> : <p className="text-xs truncate">{att.file.name}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <div className="flex gap-2">
                        <select value={newEvent.type} onChange={(e: any) => setNewEvent({ ...newEvent, type: e.target.value })} className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none">
                          <option value="UPDATE">进展</option>
                          <option value="MILESTONE">里程碑</option>
                          <option value="ISSUE">问题</option>
                          <option value="MEETING">会议</option>
                          <option value="DELIVERABLE">交付物</option>
                        </select>
                        <label className="cursor-pointer text-slate-400 hover:text-brand-500 flex items-center">
                          <Paperclip size={18} />
                          <input type="file" className="hidden" multiple ref={fileInputRef} onChange={handleFileSelect} />
                        </label>
                      </div>
                      <button type="submit" className="bg-brand-600 text-white text-xs font-bold px-3 py-1.5 rounded">发布</button>
                    </div>
                  </form>
                </div>
              )}

              {events.map(event => {
                const isAuthor = event.authorId === user?.id;
                const canEdit = isAuthor;
                const canDelete = isProjectAdmin || isAuthor;
                const imgs = event.attachments?.filter(a => isImage(a.url)) || [];
                const files = event.attachments?.filter(a => !isImage(a.url)) || [];
                const isEditing = editingEventId === event.id;

                return (
                  <div key={event.id} className="relative group">
                    <div className={`absolute -left-[39px] w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ring-4 ring-white ${event.type === 'MILESTONE' ? 'bg-purple-500' : 'bg-slate-400'}`}>
                      {event.authorName[0]}
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-800">{event.authorName}</span>
                          <span className="text-xs text-slate-400">{formatDateTime(event.date)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-full border bg-slate-50">{getEventLabel(event.type)}</span>
                          {canEdit && !isEditing && (
                            <button onClick={() => startEditEvent(event)} className="text-slate-300 hover:text-brand-500">
                              <Edit2 size={14} />
                            </button>
                          )}
                          {canDelete && !isEditing && (
                            <button onClick={() => handleDeleteEvent(event.id)} className="text-slate-300 hover:text-red-500">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="space-y-2 mb-2">
                          <textarea
                            value={editEventContent}
                            onChange={e => setEditEventContent(e.target.value)}
                            className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                            rows={3}
                          />
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => setEditingEventId(null)} className="text-xs text-slate-500 hover:bg-slate-100 px-2 py-1 rounded">取消</button>
                            <button onClick={saveEditEvent} className="text-xs bg-brand-600 text-white px-2 py-1 rounded hover:bg-brand-700">保存</button>
                          </div>
                        </div>
                      ) : (
                        <div className="prose prose-sm max-w-none text-slate-700 mb-2">
                          <ReactMarkdown>{event.content}</ReactMarkdown>
                        </div>
                      )}

                      {imgs.length > 0 && (
                        <div className={`grid gap-2 ${imgs.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                          {imgs.map((att, i) => (
                            <div key={i}>
                              <img src={att.url} className="rounded border bg-slate-50 max-h-60 object-contain w-full" />
                              {att.caption && <p className="text-xs text-slate-500 mt-1 italic">{att.caption}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                      {files.length > 0 && (
                        <div className="mt-2 pt-2 border-t flex flex-wrap gap-2">
                          {files.map((f, i) => (
                            <a key={i} href={f.url} download={f.name} className="text-xs bg-slate-50 px-2 py-1 rounded flex items-center gap-1 text-blue-600">
                              <File size={12} />{f.name}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            {/* AI Report Generator Box */}
            {showReportAssistant && (
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-100 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                    <Sparkles className="text-indigo-600" size={18} /> 智能报告助手
                  </h3>
                  <button
                    onClick={() => setShowReportAssistant(false)}
                    className="text-indigo-400 hover:text-indigo-600 p-1"
                  >
                    <X size={16} />
                  </button>
                </div>
                <p className="text-xs text-indigo-700 mb-4">基于时间线和任务数据，自动生成项目阶段性汇报文案。</p>

                <div className="space-y-3 mb-4">
                  <div>
                    <label className="text-xs font-semibold text-indigo-800 block mb-1">开始日期</label>
                    <input
                      type="date"
                      value={reportDateRange.start}
                      onChange={e => setReportDateRange({ ...reportDateRange, start: e.target.value })}
                      className="w-full text-xs p-2 rounded border border-indigo-200 bg-white/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-indigo-800 block mb-1">结束日期</label>
                    <input
                      type="date"
                      value={reportDateRange.end}
                      onChange={e => setReportDateRange({ ...reportDateRange, end: e.target.value })}
                      className="w-full text-xs p-2 rounded border border-indigo-200 bg-white/50"
                    />
                  </div>
                </div>

                <button
                  onClick={handleGenerateReport}
                  disabled={isGeneratingReport}
                  className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                >
                  {isGeneratingReport ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                  {isGeneratingReport ? 'AI生成中...' : '生成汇报草稿'}
                </button>

                {generatedReport && (
                  <div className="mt-4 p-3 bg-white rounded border border-indigo-200">
                    <textarea
                      className="w-full h-40 text-xs text-slate-700 leading-relaxed outline-none resize-none border border-slate-200 rounded p-2"
                      value={generatedReport}
                      onChange={e => setGeneratedReport(e.target.value)}
                      placeholder="可在此编辑报告内容..."
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => { navigator.clipboard.writeText(generatedReport); alert("已复制") }}
                        className="flex-1 text-indigo-600 text-xs font-medium hover:underline py-1"
                      >
                        复制内容
                      </button>
                      <button
                        onClick={async () => {
                          if (!project || !user) return;
                          if (!generatedReport.trim()) {
                            alert("报告内容不能为空");
                            return;
                          }

                          const event: TimelineEvent = {
                            id: Math.random().toString(36).substr(2, 9),
                            projectId: project.id,
                            authorId: user.id,
                            authorName: user.username,
                            content: generatedReport,
                            date: new Date().toISOString(),
                            type: 'UPDATE',
                            createdAt: new Date().toISOString()
                          };

                          try {
                            await eventsApi.create(event);
                            const updatedEvents = await eventsApi.getByProject(project.id);
                            setEvents(updatedEvents);
                            setGeneratedReport('');
                            setShowReportAssistant(false);
                            alert("报告已发布到时间线");
                          } catch (err) {
                            console.error(err);
                            alert("发布失败，请重试");
                          }
                        }}
                        className="flex-1 bg-brand-600 text-white text-xs font-medium py-1 px-3 rounded hover:bg-brand-700"
                      >
                        发布到时间线
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* File Archive */}
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 sticky top-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><FileText size={18} /> 项目文件归档</h3>
                <button onClick={() => setShowFolderInput(true)} className="text-xs bg-white border px-2 py-1 rounded hover:bg-slate-100 flex items-center gap-1">
                  <FolderPlus size={12} /> 新建文件夹
                </button>
              </div>

              {showFolderInput && (
                <div className="mb-3 flex gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                    className="w-full text-xs px-2 py-1 rounded border"
                    placeholder="文件夹名称"
                  />
                  <button onClick={createFolder} className="text-xs bg-brand-600 text-white px-2 rounded">确定</button>
                  <button onClick={() => setShowFolderInput(false)} className="text-xs text-slate-500">取消</button>
                </div>
              )}

              <div className="space-y-3">
                {folders.map(folder => {
                  const folderFiles: { att: Attachment, event: TimelineEvent, idx: number }[] = [];
                  events.forEach(e => e.attachments?.forEach((a, idx) => {
                    if ((a.folder || '文档') === folder) folderFiles.push({ att: a, event: e, idx });
                  }));

                  return (
                    <div key={folder} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                      <div onClick={() => toggleFolder(folder)} className="bg-slate-100 px-3 py-2 flex items-center gap-2 cursor-pointer hover:bg-slate-200 text-xs font-bold text-slate-700">
                        {expandedFolders.includes(folder) ? <FolderOpen size={14} /> : <Folder size={14} />}
                        {folder}
                        <span className="ml-auto text-slate-400 font-normal">{folderFiles.length}</span>
                      </div>
                      {expandedFolders.includes(folder) && (
                        <div className="p-2 space-y-2">
                          {folderFiles.length === 0 && <p className="text-xs text-slate-400 text-center py-2">空文件夹</p>}
                          {folderFiles.map(({ att, event, idx }, i) => (
                            <div key={`${event.id}-${idx}`} className="flex items-start gap-2 p-1.5 hover:bg-slate-50 rounded group relative">
                              <div className="w-8 h-8 flex-shrink-0 bg-slate-100 rounded flex items-center justify-center border border-slate-200">
                                {isImage(att.url) ? <ImageIcon size={14} className="text-slate-500" /> : <File size={14} className="text-slate-500" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <a href={att.url} download={att.name} className="block text-xs font-medium truncate text-slate-700 hover:text-brand-600 hover:underline">{att.caption || att.name}</a>
                                <p className="text-[10px] text-slate-400 truncate">{formatDateTime(event.date)}</p>
                              </div>
                              {isProjectAdmin && (
                                <div className="hidden group-hover:flex absolute right-1 top-1 bg-white shadow-sm border rounded z-20">
                                  <select
                                    className="text-[10px] p-1 outline-none bg-transparent max-w-[80px]"
                                    value={folder}
                                    onChange={(e) => moveFileToFolder(event, idx, e.target.value)}
                                  >
                                    {folders.map(f => <option key={f} value={f}>{f}</option>)}
                                  </select>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'MEMBERS' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-slate-800">项目成员 ({projectMembers.length})</h3>
            {isProjectAdmin && (
              <button onClick={() => setShowMemberModal(true)} className="flex items-center gap-2 text-sm bg-brand-50 text-brand-700 px-3 py-2 rounded-lg hover:bg-brand-100 transition-colors">
                <Users size={16} /> 管理成员
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectMembers.map(m => {
              const isMAdmin = project.admins?.includes(m.id);
              const isMManager = m.id === project.managerId;
              return (
                <div key={m.id} className="relative flex items-center gap-3 p-4 border border-slate-100 rounded-lg bg-slate-50/50 group">
                  <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center font-bold text-brand-600 shadow-sm">
                    {m.username[0]}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-800 flex items-center gap-1">
                      {m.username}
                      {isMAdmin && <span title="项目管理员"><ShieldCheck size={12} className="text-blue-500" /></span>}
                    </p>
                    <p className="text-xs text-slate-500">{m.jobNumber}</p>
                  </div>
                  {isMManager && <span className="ml-auto text-[10px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded border border-yellow-200 font-bold">负责人</span>}

                  {isManager && !isMManager && (
                    <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 rounded backdrop-blur-sm p-0.5">
                      <button
                        onClick={() => handleSetManager(m.id)}
                        className="p-1 text-slate-400 hover:text-yellow-600"
                        title="移交项目负责人"
                      >
                        <Crown size={14} />
                      </button>
                      <button
                        onClick={() => handleToggleProjectAdmin(m.id)}
                        className="p-1 text-slate-400 hover:text-blue-600"
                        title={isMAdmin ? "取消管理员" : "设为管理员"}
                      >
                        <Shield size={14} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'SCHEDULE' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-lg text-slate-800">项目进度安排</h3>
            {isProjectAdmin && (
              <button onClick={openCreateTaskModal} className="flex items-center gap-2 text-sm bg-brand-600 text-white px-3 py-2 rounded-lg hover:bg-brand-700 shadow-sm transition-colors">
                <Plus size={16} /> 新建任务
              </button>
            )}
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="divide-y divide-slate-100">
              {tasks.map(task => (
                <div key={task.id} className="p-4 hover:bg-slate-50 transition-colors group">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-slate-800">{task.title}</h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${task.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                          {task.status === 'COMPLETED' ? '已完成' : task.status === 'IN_PROGRESS' ? '进行中' : '待处理'}
                        </span>
                        {task.priority === 'HIGH' && <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">高优先</span>}
                        {isProjectAdmin && (
                          <button onClick={() => openEditTaskModal(task)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-brand-600 ml-2">
                            <Edit2 size={14} />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mb-2">{task.description}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span className="flex items-center gap-1"><Calendar size={12} /> 截止: {task.deadline}</span>
                        <span className="flex items-center gap-1">
                          <Users size={12} />
                          {task.assigneeIds.map(uid => users.find(u => u.id === uid)?.username.split('(')[0]).join(', ') || '未分配'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-32">
                        <div className="flex justify-between text-xs mb-1 text-slate-500">
                          <span>进度</span>
                          <span>{task.progress}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-500 rounded-full transition-all duration-500" style={{ width: `${task.progress}%` }}></div>
                        </div>
                      </div>
                      {task.assigneeIds.includes(user!.id) && (
                        <button
                          onClick={() => setEditingTaskProgress({ id: task.id, progress: task.progress, remark: '' })}
                          className="text-xs border border-slate-200 px-2 py-1 rounded hover:bg-slate-50 text-slate-600"
                        >
                          更新进度
                        </button>
                      )}
                    </div>
                  </div>
                  {task.remarks && task.remarks.length > 0 && (
                    <div className="mt-3 pl-3 border-l-2 border-slate-100 space-y-1">
                      {task.remarks.slice(-2).map((r, i) => (
                        <p key={i} className="text-xs text-slate-500"><span className="font-bold">{r.authorName}:</span> {r.content}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {tasks.length === 0 && <div className="p-8 text-center text-slate-400">暂无任务安排</div>}
            </div>
          </div>
        </div>
      )}

      {/* Member Management Modal */}
      {showMemberModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto">
            <h3 className="font-bold text-lg mb-4">管理项目成员</h3>
            <div className="space-y-2">
              {users.map(u => {
                const isMember = project.members?.includes(u.id);
                const isManager = u.id === project.managerId;
                return (
                  <div key={u.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700">
                        {u.username[0]}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{u.username}</p>
                        <p className="text-xs text-slate-500">{u.jobNumber}</p>
                      </div>
                    </div>
                    {isManager ? (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">负责人</span>
                    ) : (
                      <button
                        onClick={() => handleToggleMember(u.id)}
                        className={`text-xs px-3 py-1.5 rounded ${isMember ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-600'}`}
                      >
                        {isMember ? '已加入' : '添加'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={() => setShowMemberModal(false)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">关闭</button>
            </div>
          </div>
        </div>
      )}

      {/* Task Modal (Create/Edit) */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 flex flex-col max-h-[90vh]">
            <h3 className="font-bold text-lg mb-4">{taskFormMode === 'CREATE' ? '新建任务' : '编辑任务'}</h3>
            <form onSubmit={handleSaveTask} className="space-y-4 flex-1 overflow-y-auto pr-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">任务标题</label>
                <input
                  required
                  type="text"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={taskFormData.title}
                  onChange={e => setTaskFormData({ ...taskFormData, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">任务描述</label>
                <textarea
                  required
                  rows={3}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={taskFormData.description}
                  onChange={e => setTaskFormData({ ...taskFormData, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">截止日期</label>
                  <input
                    required
                    type="date"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    value={taskFormData.deadline}
                    onChange={e => setTaskFormData({ ...taskFormData, deadline: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">优先级</label>
                  <select
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                    value={taskFormData.priority}
                    onChange={e => setTaskFormData({ ...taskFormData, priority: e.target.value as any })}
                  >
                    <option value="NORMAL">普通</option>
                    <option value="HIGH">高优先</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">指派给</label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-slate-300 rounded-lg">
                  {projectMembers.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleTaskAssignee(m.id)}
                      className={`text-xs px-2 py-1 rounded-full border flex items-center gap-1 transition-colors ${taskFormData.assigneeIds.includes(m.id) ? 'bg-brand-50 border-brand-300 text-brand-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                      {m.username}
                      {taskFormData.assigneeIds.includes(m.id) && <CheckSquare size={10} />}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
                {taskFormMode === 'EDIT' && (
                  <button
                    type="button"
                    onClick={handleDeleteTask}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg mr-auto border border-transparent hover:border-red-200"
                  >
                    删除任务
                  </button>
                )}
                <button type="button" onClick={() => setShowTaskModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">取消</button>
                <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Progress Modal */}
      {editingTaskProgress && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-bold text-lg mb-4">更新任务进度</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">当前进度: {editingTaskProgress.progress}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  className="w-full"
                  value={editingTaskProgress.progress}
                  onChange={e => setEditingTaskProgress({ ...editingTaskProgress, progress: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">备注/说明</label>
                <textarea
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500"
                  value={editingTaskProgress.remark}
                  onChange={e => setEditingTaskProgress({ ...editingTaskProgress, remark: e.target.value })}
                  placeholder="完成情况说明..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setEditingTaskProgress(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">取消</button>
                <button onClick={() => handleUpdateTaskProgress(editingTaskProgress.id)} className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700">更新</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Convert Project Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <ArrowUpCircle className="text-green-600" /> 转为正式项目
            </h3>
            <form onSubmit={confirmConversion}>
              <p className="text-sm text-slate-600 mb-4">
                转为正式项目后，项目状态将变更为"执行中"。请输入正式项目编号。
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">正式项目编号</label>
                <input
                  autoFocus
                  type="text"
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none"
                  placeholder="例如: PRJ-2024-001"
                  value={convertProjectNumber}
                  onChange={e => setConvertProjectNumber(e.target.value)}
                  required
                />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowConvertModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">取消</button>
                <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700">确认转换</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generic Delete Confirmation Modal */}
      {confirmation.isOpen && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4 text-slate-800">
              <AlertCircle size={24} className="text-red-600" />
              <h3 className="text-lg font-bold">{confirmation.title}</h3>
            </div>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              {confirmation.message}
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={closeConfirmation} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">取消</button>
              <button
                onClick={executeConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Project Confirmation Modal */}
      {showDeleteProjectModal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4 text-red-600">
              <AlertTriangle size={32} />
              <h3 className="text-lg font-bold">删除项目确认</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              警告：此操作不可恢复！所有相关的时间线、任务和文件将被永久删除。
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                请输入项目名称以确认: <span className="font-bold select-all">{project.title}</span>
              </label>
              <input
                autoFocus
                type="text"
                value={deleteProjectNameInput}
                onChange={(e) => setDeleteProjectNameInput(e.target.value)}
                className="w-full border border-red-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 outline-none"
                placeholder={project.title}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteProjectModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">取消</button>
              <button
                onClick={executeDeleteProject}
                disabled={deleteProjectNameInput !== project.title}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Edit3 size={20} /> 编辑项目信息
            </h3>
            <form onSubmit={saveProjectEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">项目名称</label>
                <input
                  type="text"
                  value={editFormData.title}
                  onChange={e => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>

              {project.status !== 'INITIATION' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">项目编号</label>
                  <input
                    type="text"
                    value={editFormData.projectNumber}
                    onChange={e => setEditFormData({ ...editFormData, projectNumber: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">客户名称</label>
                <input
                  type="text"
                  list="customer-list-edit"
                  value={editFormData.customerName}
                  onChange={e => setEditFormData({ ...editFormData, customerName: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
                <datalist id="customer-list-edit">
                  {existingCustomers.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>

              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">优先级 (管理员权限)</label>
                  <select
                    className="w-full border rounded px-3 py-2 bg-white"
                    value={editFormData.priority}
                    onChange={e => setEditFormData({ ...editFormData, priority: e.target.value as any })}
                  >
                    <option value="NORMAL">普通</option>
                    <option value="HIGH">高优先</option>
                    <option value="URGENT">最高优先</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">业务场景</label>
                <select
                  value={editFormData.businessScenario}
                  onChange={e => setEditFormData({ ...editFormData, businessScenario: e.target.value })}
                  className="w-full border rounded px-3 py-2 bg-white"
                >
                  <option value="内部软件开发">内部软件开发</option>
                  <option value="系统运维">系统运维</option>
                  <option value="集团专班配合">集团专班配合</option>
                  <option value="外部项目跟踪">外部项目跟踪</option>
                  <option value="其他">其他</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">项目描述</label>
                <textarea
                  rows={3}
                  value={editFormData.description}
                  onChange={e => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDeleteProject}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg mr-auto border border-transparent hover:border-red-200 font-medium"
                >
                  删除项目
                </button>
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">取消</button>
                <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium">保存修改</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;
