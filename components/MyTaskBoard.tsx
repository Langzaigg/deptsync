import React, { useState, useEffect } from 'react';
import { taskService, projectService } from '../services/storage';
import { TaskAssignment, Project } from '../types';
import { useAuth } from '../App';
import { Calendar, AlertCircle, CheckCircle2, PlayCircle, Clock, ArrowUpCircle, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';

const MyTaskBoard: React.FC = () => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<TaskAssignment[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [editingProgress, setEditingProgress] = useState<{id: string, progress: number, remark: string} | null>(null);

    useEffect(() => {
        if (user) {
            refreshData();
        }
    }, [user]);

    const refreshData = () => {
        if (!user) return;
        const allTasks = taskService.getAll();
        const myTasks = allTasks.filter(t => t.assigneeIds.includes(user.id));
        setTasks(myTasks);
        setProjects(projectService.getAll());
    };

    const getProject = (id: string) => projects.find(p => p.id === id);

    const handleUpdateProgress = () => {
        if (!editingProgress || !user) return;
        const task = tasks.find(t => t.id === editingProgress.id);
        if (task) {
             const updated: TaskAssignment = {
                ...task,
                progress: editingProgress.progress,
                status: editingProgress.progress === 100 ? 'COMPLETED' : editingProgress.progress > 0 ? 'IN_PROGRESS' : 'PENDING',
                remarks: editingProgress.remark ? [...task.remarks, { authorId: user.id, authorName: user.username, content: editingProgress.remark, date: new Date().toISOString() }] : task.remarks
            };
            taskService.update(updated);
            refreshData();
            setEditingProgress(null);
        }
    };

    // Helper to calculate days remaining
    const getDaysRemaining = (deadline: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(deadline);
        due.setHours(0, 0, 0, 0);
        const diffTime = due.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    // Helper to get priority weight for sorting
    const getPriorityWeight = (priority?: string) => {
        switch (priority) {
            case 'URGENT': return 3;
            case 'HIGH': return 2;
            default: return 1;
        }
    };

    const StatusColumn = ({ status, title, icon: Icon, colorClass, headerBg }: any) => {
        // Filter tasks by status
        let colTasks = tasks.filter(t => {
            if (status === 'PENDING') return t.status === 'PENDING';
            if (status === 'IN_PROGRESS') return t.status === 'IN_PROGRESS';
            if (status === 'COMPLETED') return t.status === 'COMPLETED';
            return false;
        });

        // Sort tasks: 
        // 1. Project Priority (URGENT > HIGH > NORMAL)
        // 2. Deadline (Earlier/Overdue first)
        colTasks = colTasks.sort((a, b) => {
            const projA = getProject(a.projectId);
            const projB = getProject(b.projectId);
            
            const weightA = getPriorityWeight(projA?.priority);
            const weightB = getPriorityWeight(projB?.priority);

            if (weightA !== weightB) {
                return weightB - weightA; // Descending priority
            }

            return new Date(a.deadline).getTime() - new Date(b.deadline).getTime(); // Ascending date
        });

        return (
            <div className="flex-1 min-w-[320px] flex flex-col h-full bg-slate-100 rounded-xl border border-slate-200">
                <div className={`p-4 border-b border-slate-200 flex items-center justify-between ${headerBg} rounded-t-xl`}>
                    <div className="flex items-center gap-2 font-bold text-slate-700">
                        <Icon size={18} />
                        {title}
                    </div>
                    <span className="bg-white/80 px-2 py-0.5 rounded-full text-xs font-bold shadow-sm text-slate-600">{colTasks.length}</span>
                </div>
                <div className="p-3 space-y-3 overflow-y-auto flex-1">
                    {colTasks.length === 0 && (
                        <div className="text-center py-10 text-slate-400 text-sm">暂无任务</div>
                    )}
                    {colTasks.map(task => {
                        const project = getProject(task.projectId);
                        const daysLeft = getDaysRemaining(task.deadline);
                        const isOverdue = daysLeft < 0;
                        const isDueToday = daysLeft === 0;

                        return (
                            <div key={task.id} className={`bg-white p-4 rounded-lg shadow-sm border transition-all group relative ${project?.priority === 'URGENT' && status !== 'COMPLETED' ? 'border-l-4 border-l-red-500' : 'border-slate-200 hover:border-brand-300 hover:shadow-md'}`}>
                                
                                {/* Header: Priority & Project Name */}
                                <div className="flex justify-between items-start mb-2">
                                    <Link to={`/projects/${task.projectId}`} className="text-xs text-slate-500 hover:text-brand-600 hover:underline font-medium truncate max-w-[180px]" title={project?.title}>
                                        {project?.title || '未知项目'}
                                    </Link>
                                    
                                    {project?.priority === 'URGENT' && (
                                        <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 whitespace-nowrap">
                                            <Flame size={10} fill="currentColor" /> 紧急
                                        </span>
                                    )}
                                    {project?.priority === 'HIGH' && (
                                        <span className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 whitespace-nowrap">
                                            <ArrowUpCircle size={10} /> 高优先
                                        </span>
                                    )}
                                </div>

                                <h4 className="font-bold text-slate-800 mb-2 leading-tight">{task.title}</h4>
                                <p className="text-xs text-slate-500 mb-4 line-clamp-2 min-h-[1.5em]">{task.description}</p>
                                
                                {/* Metadata Row */}
                                <div className="flex items-center justify-between mb-3 text-xs">
                                    {status !== 'COMPLETED' ? (
                                        <div className={`flex items-center gap-1.5 font-medium ${isOverdue ? 'text-red-600' : isDueToday ? 'text-orange-600' : daysLeft <= 3 ? 'text-orange-500' : 'text-slate-500'}`}>
                                            <Clock size={14} />
                                            <span>
                                                {isOverdue ? `逾期 ${Math.abs(daysLeft)} 天` : isDueToday ? '今天截止' : `${daysLeft} 天后截止`}
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 text-green-600 font-medium">
                                            <CheckCircle2 size={14} />
                                            <span>已完成</span>
                                        </div>
                                    )}
                                    
                                    <div className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{task.progress}%</div>
                                </div>
                                
                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3">
                                    <div className={`h-full rounded-full transition-all duration-300 ${task.status === 'COMPLETED' ? 'bg-green-500' : isOverdue ? 'bg-red-500' : 'bg-brand-500'}`} style={{ width: `${task.progress}%` }}></div>
                                </div>

                                <button 
                                    onClick={() => setEditingProgress({id: task.id, progress: task.progress, remark: ''})}
                                    className="w-full py-1.5 text-xs border border-slate-200 rounded text-slate-600 hover:bg-slate-50 hover:text-brand-600 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    更新进度
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col">
            <div className="flex justify-between items-end mb-4 flex-none">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-1 flex items-center gap-2">我的任务看板</h2>
                    <p className="text-slate-500 text-sm">按项目优先级和截止时间自动排序，请优先处理紧急任务。</p>
                </div>
            </div>
            
            <div className="flex-1 overflow-x-auto pb-4">
                <div className="flex gap-6 h-full min-w-full">
                    <StatusColumn status="PENDING" title="待处理" icon={AlertCircle} headerBg="bg-slate-200" />
                    <StatusColumn status="IN_PROGRESS" title="进行中" icon={PlayCircle} headerBg="bg-blue-100" />
                    <StatusColumn status="COMPLETED" title="已完成" icon={CheckCircle2} headerBg="bg-green-100" />
                </div>
            </div>

            {/* Progress Modal */}
            {editingProgress && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
                        <h3 className="font-bold text-lg mb-4">更新任务进度</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">当前进度: {editingProgress.progress}%</label>
                                <input type="range" min="0" max="100" step="5" className="w-full accent-brand-600" value={editingProgress.progress} onChange={e => setEditingProgress({...editingProgress, progress: parseInt(e.target.value)})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">进度说明</label>
                                <textarea rows={3} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500" value={editingProgress.remark} onChange={e => setEditingProgress({...editingProgress, remark: e.target.value})} placeholder="填写具体完成情况..." />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setEditingProgress(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">取消</button>
                                <button onClick={handleUpdateProgress} className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700">确认更新</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyTaskBoard;