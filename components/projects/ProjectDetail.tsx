import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, File, Paperclip, Send, Sparkles, Loader2, FileDown, Download, Image as ImageIcon, X, Users, Briefcase, CalendarCheck, Folder, FolderPlus, FolderOpen, ArrowUpCircle, CheckSquare, Trash2, Edit, Edit3, AlertCircle, Plus, Shield, ShieldCheck, Crown, AlertTriangle } from 'lucide-react';
import { Project, TimelineEvent, UserRole, User, TaskAssignment, Attachment } from '../../types';
import { projectService, timelineService, userService, taskService, reportService } from '../../services/storage';
import { useAuth } from '../../App';
import { generateProjectReport } from '../../services/gemini';

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
  const [activeTab, setActiveTab] = useState<'TIMELINE' | 'MEMBERS' | 'SCHEDULE'>('TIMELINE');
  
  // Timeline State
  const [newEventContent, setNewEventContent] = useState('');
  const [eventType, setEventType] = useState<'UPDATE' | 'MILESTONE' | 'ISSUE' | 'WEEKLY_REPORT' | 'MONTHLY_REPORT' | 'MEETING_MINUTES'>('UPDATE');
  
  // Timeline Edit State
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

  // AI Report State
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [reportType, setReportType] = useState<'WEEKLY_REPORT' | 'MONTHLY_REPORT'>('WEEKLY_REPORT');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState('');

  // Team Management
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [projectMembers, setProjectMembers] = useState<User[]>([]);
  const [showMemberModal, setShowMemberModal] = useState(false);

  // Task/Schedule Management
  const [tasks, setTasks] = useState<TaskAssignment[]>([]);
  // Task form state
  const [taskFormMode, setTaskFormMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskFormData, setTaskFormData] = useState({ title: '', description: '', assigneeIds: [] as string[], deadline: '' });
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTaskProgress, setEditingTaskProgress] = useState<{id: string, progress: number, remark: string} | null>(null);

  // Edit Project State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Project>>({});
  const [showDeleteProjectModal, setShowDeleteProjectModal] = useState(false);
  const [deleteProjectNameInput, setDeleteProjectNameInput] = useState('');
  
  // Conversion State
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertProjectNumber, setConvertProjectNumber] = useState('');

  // Generic Confirmation Modal State
  const [confirmation, setConfirmation] = useState<{
      isOpen: boolean;
      title: string;
      message: string;
      onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Existing customers for suggestions
  const [existingCustomers, setExistingCustomers] = useState<string[]>([]);

  useEffect(() => {
    if (id) {
      const p = projectService.getById(id);
      if (p) {
          setProject(p);
          setEvents(timelineService.getByProject(id));
          const users = userService.getAll();
          setAllUsers(users);
          setProjectMembers(users.filter(u => p.members?.includes(u.id)));
          setTasks(taskService.getByProject(id));

           // Extract unique customer names from all projects for suggestions
           const allProjects = projectService.getAll();
           const customers = Array.from(new Set(allProjects.map(p => p.customerName).filter(Boolean) as string[]));
           setExistingCustomers(customers);
      }
    }
  }, [id]);

  // Initial Report Dates
  useEffect(() => {
    if (showReportModal) {
      if (!reportStartDate || !reportEndDate) {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 7);
        setReportEndDate(end.toISOString().split('T')[0]);
        setReportStartDate(start.toISOString().split('T')[0]);
      }
    }
  }, [showReportModal]);

  // Folder Logic
  useEffect(() => {
     // Ensure default folders exist in the set
     const extracted = new Set<string>(['文档', '图片']);
     events.forEach(e => e.attachments?.forEach(a => {
         if (a.folder) extracted.add(a.folder);
     }));
     // Only add folders that contain files or are default
     const sortedFolders = Array.from(extracted).sort();
     setFolders(sortedFolders);
  }, [events]);

  const toggleFolder = (folder: string) => {
      if (expandedFolders.includes(folder)) {
          setExpandedFolders(prev => prev.filter(f => f !== folder));
      } else {
          setExpandedFolders(prev => [...prev, folder]);
      }
  };

  const createFolder = () => {
      if(newFolderName && !folders.includes(newFolderName)) {
          setFolders(prev => [...prev, newFolderName]);
          setNewFolderName('');
          setShowFolderInput(false);
      }
  };

  const moveFileToFolder = (event: TimelineEvent, attachmentIndex: number, folderName: string) => {
     const newEvents = [...events];
     const evIdx = newEvents.findIndex(e => e.id === event.id);
     if (evIdx > -1 && newEvents[evIdx].attachments) {
         newEvents[evIdx].attachments![attachmentIndex].folder = folderName;
         timelineService.updateEvent(newEvents[evIdx]);
         setEvents(timelineService.getByProject(project!.id));
     }
  };

  // Logic Handlers (Paste, File, Caption, Add Event)
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

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !user) return;
    if (!newEventContent.trim() && pendingAttachments.length === 0) return;

    let finalAttachments: Attachment[] = [];
    for (const att of pendingAttachments) {
       try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(att.file);
        });
        
        let finalName = att.file.name;
        // Logic to categorize default folders based on type
        let defaultFolder = '文档';
        if (att.file.type.startsWith('image/')) {
            defaultFolder = '图片';
        }

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
        finalAttachments.push({ name: finalName, url: dataUrl, caption: att.caption, folder: defaultFolder });
       } catch (err) { console.error(err); }
    }

    const newEvent: TimelineEvent = {
      id: Math.random().toString(36).substr(2, 9),
      projectId: project.id,
      authorId: user.id,
      authorName: user.username,
      content: newEventContent,
      date: new Date().toISOString(),
      type: eventType,
      attachments: finalAttachments
    };
    timelineService.addEvent(newEvent);
    setEvents(timelineService.getByProject(project.id));
    setNewEventContent('');
    setPendingAttachments([]);
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

  const handleDeleteEvent = (eventId: string) => {
      openConfirmation("删除时间线记录", "确定要删除这条进度记录吗？删除后无法恢复。", () => {
          timelineService.deleteEvent(eventId);
          setEvents(timelineService.getByProject(project!.id));
      });
  };

  const handleDeleteEventInEdit = () => {
      if (editingEventId) {
          openConfirmation("删除时间线记录", "确定要删除这条进度记录吗？", () => {
              timelineService.deleteEvent(editingEventId);
              setEvents(timelineService.getByProject(project!.id));
              setEditingEventId(null);
          });
      }
  };

  const handleStartEditEvent = (event: TimelineEvent) => {
      setEditingEventId(event.id);
      setEditEventContent(event.content);
  };

  const handleSaveEditEvent = () => {
      if (!editingEventId || !project) return;
      const event = events.find(e => e.id === editingEventId);
      if (event) {
          timelineService.updateEvent({ ...event, content: editEventContent });
          setEvents(timelineService.getByProject(project.id));
          setEditingEventId(null);
          setEditEventContent('');
      }
  };

  // --- Project Conversion ---
  const handleConvertToFormalTrigger = () => {
      setShowConvertModal(true);
      setConvertProjectNumber('');
  };

  const confirmConversion = (e: React.FormEvent) => {
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
      projectService.update(updated);
      setProject(updated);
      setShowConvertModal(false);
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

  const saveProjectEdit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!project) return;
      
      const updated = { ...project, ...editFormData };
      projectService.update(updated);
      setProject(updated);
      setShowEditModal(false);
  };

  const handleDeleteProjectTrigger = () => {
      setShowDeleteProjectModal(true);
      setDeleteProjectNameInput('');
  };

  const executeDeleteProject = () => {
      if (project && deleteProjectNameInput === project.title) {
          projectService.delete(project.id);
          navigate('/projects');
      } else {
          alert("项目名称不匹配");
      }
  };

  // --- Member Management ---
  const handleToggleMember = (userId: string) => {
      if (!project) return;
      let newMembers = project.members || [];
      if (newMembers.includes(userId)) {
          newMembers = newMembers.filter(id => id !== userId);
      } else {
          newMembers = [...newMembers, userId];
      }
      const updated = { ...project, members: newMembers };
      projectService.update(updated);
      setProject(updated);
      
      // Update local state for display
      const all = userService.getAll();
      setProjectMembers(all.filter(u => newMembers.includes(u.id)));
  };

  const handleToggleProjectAdmin = (userId: string) => {
      if (!project) return;
      // Cannot remove the main manager
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
      projectService.update(updated);
      setProject(updated);
  };
  
  const handleSetManager = (userId: string) => {
      if (!project) return;
      if (userId === project.managerId) return;
      
      if (window.confirm("确定移交项目负责人权限吗？您将变为普通成员（或管理员）。")) {
          const updated = { ...project, managerId: userId };
          projectService.update(updated);
          setProject(updated);
      }
  };

  // --- Task Management ---
  const openCreateTaskModal = () => {
      setTaskFormMode('CREATE');
      setTaskFormData({ title: '', description: '', assigneeIds: [], deadline: '' });
      setShowTaskForm(true);
  };

  const openEditTaskModal = (task: TaskAssignment) => {
      setTaskFormMode('EDIT');
      setEditingTaskId(task.id);
      setTaskFormData({
          title: task.title,
          description: task.description,
          assigneeIds: task.assigneeIds,
          deadline: task.deadline
      });
      setShowTaskForm(true);
  };

  const handleSaveTask = (e: React.FormEvent) => {
      e.preventDefault();
      if (!project) return;

      if (taskFormMode === 'CREATE') {
          const task: TaskAssignment = {
              id: Math.random().toString(36).substr(2, 9),
              projectId: project.id,
              title: taskFormData.title,
              description: taskFormData.description,
              assigneeIds: taskFormData.assigneeIds.length > 0 ? taskFormData.assigneeIds : [], // Don't auto-assign everyone unless intended
              deadline: taskFormData.deadline,
              progress: 0,
              status: 'PENDING',
              remarks: []
          };
          taskService.create(task);
      } else if (taskFormMode === 'EDIT' && editingTaskId) {
          const existing = tasks.find(t => t.id === editingTaskId);
          if (existing) {
              const updated: TaskAssignment = {
                  ...existing,
                  title: taskFormData.title,
                  description: taskFormData.description,
                  assigneeIds: taskFormData.assigneeIds,
                  deadline: taskFormData.deadline
              };
              taskService.update(updated);
          }
      }

      setTasks(taskService.getByProject(project.id));
      setShowTaskForm(false);
  };

  const handleDeleteTask = () => {
      if (editingTaskId) {
          openConfirmation("删除任务", "确定删除此任务吗？删除后无法恢复。", () => {
              taskService.delete(editingTaskId);
              setTasks(taskService.getByProject(project!.id));
              setShowTaskForm(false);
          });
      }
  };

  const handleUpdateTaskProgress = (taskId: string) => {
      if (!editingTaskProgress || !user) return;
      const task = tasks.find(t => t.id === taskId);
      if (task) {
          const updated: TaskAssignment = {
              ...task,
              progress: editingTaskProgress.progress,
              status: editingTaskProgress.progress === 100 ? 'COMPLETED' : editingTaskProgress.progress > 0 ? 'IN_PROGRESS' : 'PENDING',
              remarks: editingTaskProgress.remark ? [...task.remarks, { authorId: user.id, authorName: user.username, content: editingTaskProgress.remark, date: new Date().toISOString() }] : task.remarks
          };
          taskService.update(updated);
          setTasks(taskService.getByProject(project!.id));
          setEditingTaskProgress(null);
      }
  };

  const toggleTaskAssignee = (userId: string) => {
      if (taskFormData.assigneeIds.includes(userId)) {
          setTaskFormData(prev => ({ ...prev, assigneeIds: prev.assigneeIds.filter(id => id !== userId) }));
      } else {
          setTaskFormData(prev => ({ ...prev, assigneeIds: [...prev.assigneeIds, userId] }));
      }
  };

  // --- Report Gen ---
  const handleGenerateReport = async () => {
    if (!project || !reportStartDate || !reportEndDate) return;
    setIsGenerating(true);
    let report = '';
    const start = new Date(reportStartDate);
    const end = new Date(reportEndDate);
    end.setHours(23, 59, 59, 999);

    const relevantEvents = timelineService.getByProjectAndDateRange(project.id, start, end);
    report = await generateProjectReport(project, relevantEvents, tasks, reportStartDate, reportEndDate);
    
    setGeneratedReport(report);
    setIsGenerating(false);
  };

  // Render Helpers
  const isImage = (url: string) => url.startsWith('data:image');
  
  const getEventLabel = (type: string) => {
    switch(type) {
        case 'UPDATE': return '进展';
        case 'MILESTONE': return '里程碑';
        case 'ISSUE': return '问题';
        case 'WEEKLY_REPORT': return '周报';
        case 'MONTHLY_REPORT': return '月报';
        case 'MEETING_MINUTES': return '会议纪要';
        default: return type;
    }
  };

  if (!project) return <div>项目未找到</div>;
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
    switch(priority) {
        case 'URGENT': return <span className="flex items-center gap-1 text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded border border-red-200"><AlertCircle size={10}/> 最高优先</span>;
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
                        <ArrowUpCircle size={12}/> 转为正式项目
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
                    {isProjectAdmin ? (
                         <select 
                            value={project.status} 
                            onChange={(e) => {
                                const updated = { ...project, status: e.target.value as any };
                                projectService.update(updated);
                                setProject(updated);
                            }}
                            className="font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none focus:border-brand-500"
                         >
                           <option value="INITIATION">立项/筹备</option>
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
                <div>负责人: <span className="font-semibold text-slate-800">{allUsers.find(u => u.id === project.managerId)?.username || 'Unknown'}</span></div>
                <div>团队: <span className="font-semibold text-slate-800">{project.members?.length || 0} 人</span></div>
                <div>开始日期: <span className="font-semibold text-slate-800">{project.startDate}</span></div>
           </div>
           
           <div>
             {isMember && (
                 <button 
                    onClick={() => setShowReportModal(true)}
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
                        <form onSubmit={handleAddEvent} className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
                            <textarea placeholder="发布进度更新... (支持粘贴图片)" className="w-full text-sm border-0 focus:ring-0 p-0 resize-none placeholder:text-slate-400" rows={3} value={newEventContent} onChange={e => setNewEventContent(e.target.value)} onPaste={handlePaste} />
                            {pendingAttachments.length > 0 && (
                                <div className="mb-4 grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg">{pendingAttachments.map(att => (
                                    <div key={att.id} className="relative group/preview bg-white rounded border border-slate-200 p-2">
                                        <button type="button" onClick={() => removeAttachment(att.id)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/preview:opacity-100 z-10"><X size={12} /></button>
                                        <div className="aspect-video bg-slate-100 rounded mb-2 overflow-hidden flex items-center justify-center">{att.previewUrl ? <img src={att.previewUrl} className="w-full h-full object-cover" /> : <File className="text-slate-400" />}</div>
                                        {att.previewUrl ? <input type="text" placeholder="图注..." value={att.caption} onChange={e => updateCaption(att.id, e.target.value)} className="w-full text-xs border-b border-transparent focus:border-brand-300 outline-none bg-transparent" /> : <p className="text-xs truncate">{att.file.name}</p>}
                                    </div>
                                ))}</div>
                            )}
                            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                <div className="flex gap-2">
                                    <select value={eventType} onChange={(e: any) => setEventType(e.target.value)} className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none">
                                        <option value="UPDATE">进展</option><option value="MILESTONE">里程碑</option><option value="ISSUE">问题</option><option value="WEEKLY_REPORT">项目周报</option>
                                    </select>
                                    <label className="cursor-pointer text-slate-400 hover:text-brand-500 flex items-center"><Paperclip size={18} /><input type="file" className="hidden" multiple ref={fileInputRef} onChange={handleFileSelect} /></label>
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
                            <div className={`absolute -left-[39px] w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ring-4 ring-white ${eventType === 'MILESTONE' ? 'bg-purple-500' : 'bg-slate-400'}`}>{event.authorName[0]}</div>
                            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-slate-800">{event.authorName}</span>
                                        <span className="text-xs text-slate-400">{new Date(event.date).toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] px-2 py-0.5 rounded-full border bg-slate-50">{getEventLabel(event.type)}</span>
                                        {canEdit && !isEditing && (
                                            <button onClick={() => handleStartEditEvent(event)} className="text-slate-300 hover:text-brand-500">
                                                <Edit size={14}/>
                                            </button>
                                        )}
                                        {canDelete && !isEditing && (
                                            <button onClick={() => handleDeleteEvent(event.id)} className="text-slate-300 hover:text-red-500">
                                                <Trash2 size={14}/>
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
                                            <button onClick={handleDeleteEventInEdit} className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded border border-transparent hover:border-red-200">删除</button>
                                            <button onClick={handleSaveEditEvent} className="text-xs bg-brand-600 text-white px-2 py-1 rounded hover:bg-brand-700">保存</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="prose prose-sm max-w-none text-slate-700 mb-2"><ReactMarkdown>{event.content}</ReactMarkdown></div>
                                )}
                                
                                {imgs.length > 0 && <div className={`grid gap-2 ${imgs.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>{imgs.map((att, i) => (<div key={i}><img src={att.url} className="rounded border bg-slate-50 max-h-60 object-contain w-full" />{att.caption && <p className="text-xs text-slate-500 mt-1 italic">{att.caption}</p>}</div>))}</div>}
                                {files.length > 0 && <div className="mt-2 pt-2 border-t flex flex-wrap gap-2">{files.map((f, i) => <a key={i} href={f.url} download={f.name} className="text-xs bg-slate-50 px-2 py-1 rounded flex items-center gap-1 text-blue-600"><File size={12}/>{f.name}</a>)}</div>}
                            </div>
                         </div>
                     );
                 })}
             </div>
          </div>
          
          <div className="space-y-6">
             <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 sticky top-4">
                 <div className="flex items-center justify-between mb-4">
                     <h3 className="font-bold text-slate-800 flex items-center gap-2"><FileDown size={18} /> 项目文件归档</h3>
                     <button onClick={() => setShowFolderInput(true)} className="text-xs bg-white border px-2 py-1 rounded hover:bg-slate-100 flex items-center gap-1"><FolderPlus size={12}/> 新建文件夹</button>
                 </div>
                 
                 {showFolderInput && (
                     <div className="mb-3 flex gap-2">
                         <input autoFocus type="text" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} className="w-full text-xs px-2 py-1 rounded border" placeholder="文件夹名称" />
                         <button onClick={createFolder} className="text-xs bg-brand-600 text-white px-2 rounded">确定</button>
                         <button onClick={() => setShowFolderInput(false)} className="text-xs text-slate-500">取消</button>
                     </div>
                 )}

                 <div className="space-y-3">
                    {folders.map(folder => {
                        const folderFiles: {att: Attachment, event: TimelineEvent, idx: number}[] = [];
                        events.forEach(e => e.attachments?.forEach((a, idx) => {
                            if ((a.folder || '文档') === folder) folderFiles.push({att: a, event: e, idx});
                        }));
                        if (folder !== '文档' && folder !== '图片' && folderFiles.length === 0) return null; // Hide empty non-default folders
                        
                        return (
                            <div key={folder} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                                <div onClick={() => toggleFolder(folder)} className="bg-slate-100 px-3 py-2 flex items-center gap-2 cursor-pointer hover:bg-slate-200 text-xs font-bold text-slate-700">
                                    {expandedFolders.includes(folder) ? <FolderOpen size={14}/> : <Folder size={14}/>}
                                    {folder}
                                    <span className="ml-auto text-slate-400 font-normal">{folderFiles.length}</span>
                                </div>
                                {expandedFolders.includes(folder) && (
                                    <div className="p-2 space-y-2">
                                        {folderFiles.length === 0 && <p className="text-xs text-slate-400 text-center py-2">空文件夹</p>}
                                        {folderFiles.map(({att, event, idx}, i) => (
                                            <div key={`${event.id}-${idx}`} className="flex items-start gap-2 p-1.5 hover:bg-slate-50 rounded group relative">
                                                <div className="w-8 h-8 flex-shrink-0 bg-slate-100 rounded flex items-center justify-center border border-slate-200">
                                                    {isImage(att.url) ? <ImageIcon size={14} className="text-slate-500"/> : <File size={14} className="text-slate-500"/>}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <a href={att.url} download={att.name} className="block text-xs font-medium truncate text-slate-700 hover:text-brand-600 hover:underline">{att.caption || att.name}</a>
                                                    <p className="text-[10px] text-slate-400 truncate">{new Date(event.date).toLocaleDateString()}</p>
                                                </div>
                                                
                                                <div className="hidden group-hover:flex absolute right-1 top-1 bg-white shadow-sm border rounded z-20">
                                                    <select 
                                                        className="text-[10px] p-1 outline-none bg-transparent max-w-[80px]" 
                                                        value={folder}
                                                        onChange={(e) => moveFileToFolder(event, idx, e.target.value)}
                                                    >
                                                        {folders.map(f => <option key={f} value={f}>{f}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
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
                        <Users size={16}/> 管理成员
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
                                     {isMAdmin && <span title="项目管理员"><ShieldCheck size={12} className="text-blue-500"/></span>}
                                 </p>
                                 <p className="text-xs text-slate-500">{m.jobNumber}</p>
                             </div>
                             {isMManager && <span className="ml-auto text-[10px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded border border-yellow-200 font-bold">负责人</span>}
                             
                             {/* Manager Actions */}
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
                         <Plus size={16}/> 新建任务
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
                                         {isProjectAdmin && (
                                             <button onClick={() => openEditTaskModal(task)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-brand-600 ml-2">
                                                 <Edit size={14} />
                                             </button>
                                         )}
                                     </div>
                                     <p className="text-sm text-slate-500 mb-2">{task.description}</p>
                                     <div className="flex items-center gap-4 text-xs text-slate-400">
                                         <span className="flex items-center gap-1"><CalendarCheck size={12}/> 截止: {task.deadline}</span>
                                         <span className="flex items-center gap-1">
                                             <Users size={12}/> 
                                             {task.assigneeIds.map(uid => allUsers.find(u => u.id === uid)?.username.split('(')[0]).join(', ') || '未分配'}
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
                                             <div className="h-full bg-brand-500 rounded-full transition-all duration-500" style={{width: `${task.progress}%`}}></div>
                                         </div>
                                     </div>
                                     {task.assigneeIds.includes(user!.id) && (
                                         <button onClick={() => setEditingTaskProgress({id: task.id, progress: task.progress, remark: ''})} className="text-xs border border-slate-200 px-2 py-1 rounded hover:bg-slate-50 text-slate-600">更新进度</button>
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

      {/* Task Modal (Create/Edit) */}
      {showTaskForm && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 flex flex-col max-h-[90vh]">
                <h3 className="font-bold text-lg mb-4">{taskFormMode === 'CREATE' ? '新建任务' : '编辑任务'}</h3>
                <form onSubmit={handleSaveTask} className="space-y-4 flex-1 overflow-y-auto pr-2">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">任务标题</label>
                        <input required type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all m-0.5" value={taskFormData.title} onChange={e => setTaskFormData({...taskFormData, title: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">任务描述</label>
                        <textarea required rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all m-0.5" value={taskFormData.description} onChange={e => setTaskFormData({...taskFormData, description: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">截止日期</label>
                        <input required type="date" className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all m-0.5" value={taskFormData.deadline} onChange={e => setTaskFormData({...taskFormData, deadline: e.target.value})} />
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
                             <button type="button" onClick={handleDeleteTask} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg mr-auto border border-transparent hover:border-red-200">删除任务</button>
                        )}
                        <button type="button" onClick={() => setShowTaskForm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">取消</button>
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
                          <input type="range" min="0" max="100" step="5" className="w-full" value={editingTaskProgress.progress} onChange={e => setEditingTaskProgress({...editingTaskProgress, progress: parseInt(e.target.value)})} />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">备注/说明</label>
                          <textarea rows={2} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500" value={editingTaskProgress.remark} onChange={e => setEditingTaskProgress({...editingTaskProgress, remark: e.target.value})} placeholder="完成情况说明..." />
                      </div>
                      <div className="flex justify-end gap-3">
                          <button onClick={() => setEditingTaskProgress(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">取消</button>
                          <button onClick={() => handleUpdateTaskProgress(editingTaskProgress.id)} className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700">更新</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Convert Project Modal (Was missing in previous version) */}
      {showConvertModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><ArrowUpCircle className="text-green-600"/> 转为正式项目</h3>
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

      {/* Delete Project Confirmation Modal (Specific) */}
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
                      <label className="block text-sm font-medium text-slate-700 mb-1">请输入项目名称以确认: <span className="font-bold select-all">{project.title}</span></label>
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
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Edit3 size={20}/> 编辑项目信息</h3>
                  <form onSubmit={saveProjectEdit} className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">项目名称</label>
                          <input type="text" value={editFormData.title} onChange={e => setEditFormData({...editFormData, title: e.target.value})} className="w-full border rounded px-3 py-2" required />
                      </div>
                      
                      {project.status !== 'INITIATION' && (
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">项目编号</label>
                            <input type="text" value={editFormData.projectNumber} onChange={e => setEditFormData({...editFormData, projectNumber: e.target.value})} className="w-full border rounded px-3 py-2" />
                          </div>
                      )}

                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">客户名称</label>
                          <input 
                              type="text" 
                              list="customer-list-edit"
                              value={editFormData.customerName} 
                              onChange={e => setEditFormData({...editFormData, customerName: e.target.value})} 
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
                                onChange={e => setEditFormData({...editFormData, priority: e.target.value as any})}
                            >
                                <option value="NORMAL">普通</option>
                                <option value="HIGH">高优先</option>
                                <option value="URGENT">最高优先</option>
                            </select>
                         </div>
                      )}
                      
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">业务场景</label>
                          <select value={editFormData.businessScenario} onChange={e => setEditFormData({...editFormData, businessScenario: e.target.value})} className="w-full border rounded px-3 py-2 bg-white">
                               <option value="内部软件开发">内部软件开发</option>
                               <option value="系统运维">系统运维</option>
                               <option value="集团专班配合">集团专班配合</option>
                               <option value="外部项目跟踪">外部项目跟踪</option>
                               <option value="其他">其他</option>
                          </select>
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">项目描述</label>
                          <textarea rows={3} value={editFormData.description} onChange={e => setEditFormData({...editFormData, description: e.target.value})} className="w-full border rounded px-3 py-2" />
                      </div>

                      <div className="flex justify-end gap-3 pt-2">
                          <button type="button" onClick={handleDeleteProjectTrigger} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg mr-auto border border-transparent hover:border-red-200 font-medium">删除项目</button>
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