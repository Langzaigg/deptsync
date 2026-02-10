import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { UserRole, User, WeeklyReport, Project, TaskAssignment, Attachment } from '../types';
import { userService, reportService, projectService, taskService, timelineService } from '../services/storage';
import { generateDeptMonthlyReport } from '../services/gemini';
import { Shield, Users, FileText, Search, Download, Square, CheckSquare, BarChart3, PieChart, Sparkles, Loader2, LayoutDashboard, Edit2, Key, CheckCircle, AlertCircle, TrendingUp, Filter, Trello, Calendar, X, File, Image as ImageIcon, Paperclip, MonitorPlay } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<TaskAssignment[]>([]);
  
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'PROJECT_BOARD' | 'REPORTS' | 'USERS' | 'MONTHLY_REPORT'>('OVERVIEW');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filtering state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);
  const [reportViewMode, setReportViewMode] = useState<'USER' | 'DATE'>('USER');
  const [viewingReport, setViewingReport] = useState<WeeklyReport | null>(null);

  // User Management State
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', password: '' });

  // Monthly Report Gen (Now Custom Range)
  const [monthlyReportContent, setMonthlyReportContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [monthlyReportStartDate, setMonthlyReportStartDate] = useState('');
  const [monthlyReportEndDate, setMonthlyReportEndDate] = useState('');

  useEffect(() => {
    refreshData();
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    const dateStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    setEndDate(endStr);
    setStartDate(dateStr);
    
    // Init Monthly Report Dates (Default to current month)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    setMonthlyReportStartDate(firstDay.toISOString().split('T')[0]);
    setMonthlyReportEndDate(lastDay.toISOString().split('T')[0]);

  }, []);

  const refreshData = () => {
    setUsers(userService.getAll());
    setReports(reportService.getAll());
    setProjects(projectService.getAll());
    setTasks(taskService.getAll());
  };

  // User Mgmt
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditFormData({ name: user.name, password: user.password || '' });
    setShowUserModal(true);
  };

  const saveUserEdit = () => {
    if (!editingUser) return;
    const updatedUser = { 
        ...editingUser, 
        name: editFormData.name, 
        username: `${editFormData.name}(${editingUser.jobNumber})`,
        password: editFormData.password 
    };
    userService.update(updatedUser);
    refreshData();
    setShowUserModal(false);
    setEditingUser(null);
  };

  const handleRoleToggle = (targetUser: User) => {
     if (targetUser.id === 'admin-1') {
         alert("无法修改系统默认管理员权限");
         return;
     }

     // Ensure we have the latest user state
     const freshUsers = userService.getAll();
     const freshUser = freshUsers.find(u => u.id === targetUser.id);
     
     if (!freshUser) {
        alert("用户数据异常，请刷新页面重试");
        return;
     }

     const newRole = freshUser.role === UserRole.ADMIN ? UserRole.EMPLOYEE : UserRole.ADMIN;
     const actionName = newRole === UserRole.ADMIN ? '提升为管理员' : '降级为普通员工';
     
     if (window.confirm(`确定将用户 ${freshUser.username} ${actionName} 吗?`)) {
         const updatedUser: User = { 
             ...freshUser, 
             role: newRole 
         };
         userService.update(updatedUser);
         // Immediate refresh
         refreshData();
     }
  };

  // Reports Logic
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const matchesSearch = r.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            r.content.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesDate = true;
      if (startDate) matchesDate = matchesDate && new Date(r.createdAt) >= new Date(startDate);
      if (endDate) {
         const end = new Date(endDate);
         end.setHours(23, 59, 59, 999);
         matchesDate = matchesDate && new Date(r.createdAt) <= end;
      }
      return matchesSearch && matchesDate;
    });
  }, [reports, searchTerm, startDate, endDate]);

  // Group Reports
  const groupedReports = useMemo(() => {
      const groups: Record<string, WeeklyReport[]> = {};
      
      filteredReports.forEach(r => {
          let key = '';
          if (reportViewMode === 'USER') {
              key = r.userId;
          } else {
              // Group by week (Monday date)
              const d = new Date(r.createdAt);
              key = d.toISOString().split('T')[0];
          }

          if (!groups[key]) groups[key] = [];
          groups[key].push(r);
      });
      return groups;
  }, [filteredReports, reportViewMode]);

  const getGroupTitle = (key: string) => {
      if (reportViewMode === 'USER') {
          const u = users.find(u => u.id === key);
          return u ? u.username : '未知用户';
      } else {
          return key;
      }
  };

  const toggleSelectAll = () => setSelectedReportIds(selectedReportIds.length === filteredReports.length ? [] : filteredReports.map(r => r.id));
  const toggleSelectReport = (id: string) => setSelectedReportIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const handleExport = () => {
    const reportsToExport = selectedReportIds.length > 0 ? filteredReports.filter(r => selectedReportIds.includes(r.id)) : filteredReports;
    if (reportsToExport.length === 0) { alert("没有可导出的周报"); return; }
    const exportContent = reportsToExport.map(r => `员工: ${r.username}\n提交日期: ${new Date(r.createdAt).toLocaleString()}\n内容:\n${r.content}\n-----------------------------------\n`).join('\n');
    const blob = new Blob([exportContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `weekly_reports_export_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSingleExport = (report: WeeklyReport) => {
      const exportContent = `员工: ${report.username}\n提交日期: ${new Date(report.createdAt).toLocaleString()}\n内容:\n${report.content}`;
      const blob = new Blob([exportContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report_${report.username}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleGenerateMonthlyReport = async () => {
      if (!monthlyReportStartDate || !monthlyReportEndDate) {
          alert("请选择开始和结束日期");
          return;
      }
      setIsGenerating(true);
      
      const start = new Date(monthlyReportStartDate);
      const end = new Date(monthlyReportEndDate);
      end.setHours(23, 59, 59, 999);

      const allEvents = projects.flatMap(p => timelineService.getByProjectAndDateRange(p.id, start, end));
      const content = await generateDeptMonthlyReport(projects, allEvents, monthlyReportStartDate, monthlyReportEndDate);
      
      setMonthlyReportContent(content);
      setIsGenerating(false);
  };

  // Dashboard Calculations
  const activeProjectsCount = projects.filter(p => p.status === 'EXECUTION' || p.status === 'ACCEPTANCE').length;
  const completedProjectsCount = projects.filter(p => p.status === 'CLOSED').length;
  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter(t => t.status === 'COMPLETED').length;
  
  // Stats by User
  const userStats = users.map(u => {
      const userTasks = tasks.filter(t => t.assigneeIds.includes(u.id));
      const completed = userTasks.filter(t => t.status === 'COMPLETED').length;
      return { 
          name: u.name, 
          total: userTasks.length, 
          completed,
          ratio: userTasks.length ? Math.round((completed / userTasks.length) * 100) : 0
      };
  }).filter(s => s.total > 0).sort((a,b) => b.total - a.total);

  return (
    <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
      <div className="flex-none flex flex-col md:flex-row md:items-center justify-between gap-4">
         <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><MonitorPlay className="text-brand-600" /> 管理看板</h2>
         </div>
         <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
            {['OVERVIEW', 'PROJECT_BOARD', 'REPORTS', 'USERS', 'MONTHLY_REPORT'].map((tab) => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === tab ? 'bg-brand-50 text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {tab === 'OVERVIEW' && <LayoutDashboard size={16}/>}
                  {tab === 'PROJECT_BOARD' && <Trello size={16}/>}
                  {tab === 'REPORTS' && <FileText size={16}/>}
                  {tab === 'USERS' && <Users size={16}/>}
                  {tab === 'MONTHLY_REPORT' && <Sparkles size={16}/>}
                  {tab === 'OVERVIEW' ? '数据看板' : tab === 'PROJECT_BOARD' ? '项目看板' : tab === 'REPORTS' ? '周报管理' : tab === 'USERS' ? '权限管理' : '月报生成'}
                </button>
            ))}
         </div>
      </div>

      <div className="flex-1 overflow-auto">
      {activeTab === 'OVERVIEW' && (
          <div className="space-y-6 pb-6">
              {/* Top Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                      <p className="text-sm text-slate-500 font-medium">项目总数</p>
                      <h3 className="text-3xl font-bold text-brand-600 mt-1">{projects.length}</h3>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                      <p className="text-sm text-slate-500 font-medium">进行中项目</p>
                      <h3 className="text-3xl font-bold text-blue-600 mt-1">{activeProjectsCount}</h3>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                      <p className="text-sm text-slate-500 font-medium">任务完成数</p>
                      <div className="flex items-baseline gap-2 mt-1">
                        <h3 className="text-3xl font-bold text-green-600">{completedTasksCount}</h3>
                        <span className="text-slate-400 text-sm">/ {totalTasksCount}</span>
                      </div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                      <p className="text-sm text-slate-500 font-medium">本周周报提交</p>
                      <h3 className="text-3xl font-bold text-purple-600 mt-1">
                          {reports.filter(r => {
                              const d = new Date(r.createdAt);
                              const now = new Date();
                              const oneWeekAgo = new Date(now.setDate(now.getDate() - 7));
                              return d >= oneWeekAgo;
                          }).length}
                      </h3>
                  </div>
              </div>

              {/* Charts Section - Enhanced for Wide Screens */}
              <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-2 gap-6">
                  {/* Project Status Distribution */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                      <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><PieChart size={18}/> 项目状态分布</h3>
                      <div className="space-y-4">
                          {['INITIATION', 'EXECUTION', 'ACCEPTANCE', 'CLOSED'].map(status => {
                              const count = projects.filter(p => p.status === status).length;
                              const pct = projects.length ? (count / projects.length) * 100 : 0;
                              const label = status === 'INITIATION' ? '立项/筹备' : status === 'EXECUTION' ? '执行/推进' : status === 'ACCEPTANCE' ? '验收/交付' : '已归档';
                              const color = status === 'INITIATION' ? 'bg-blue-400' : status === 'EXECUTION' ? 'bg-yellow-400' : status === 'ACCEPTANCE' ? 'bg-purple-400' : 'bg-green-400';
                              
                              return (
                                  <div key={status} className="space-y-1">
                                      <div className="flex justify-between text-xs font-medium text-slate-600">
                                          <span>{label}</span>
                                          <span>{count} ({pct.toFixed(0)}%)</span>
                                      </div>
                                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                          <div className={`h-full ${color}`} style={{ width: `${pct}%` }}></div>
                                      </div>
                                  </div>
                              )
                          })}
                      </div>
                  </div>

                  {/* Task Stats by User (Bar Chart) */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                      <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><BarChart3 size={18}/> 任务负载与完成情况 (Top 8)</h3>
                      <div className="space-y-4">
                          {userStats.slice(0, 8).map((stat, idx) => (
                              <div key={idx} className="flex items-center gap-3">
                                  <span className="w-16 text-xs font-bold text-slate-600 truncate text-right">{stat.name}</span>
                                  <div className="flex-1 h-6 bg-slate-100 rounded-md overflow-hidden relative flex">
                                      <div className="bg-brand-500 h-full text-[10px] text-white flex items-center justify-center" style={{ width: `${Math.max(5, (stat.completed / stat.total) * 100)}%` }}>
                                          {stat.completed}
                                      </div>
                                      <div className="bg-slate-200 h-full text-[10px] text-slate-600 flex items-center justify-center" style={{ width: `${100 - ((stat.completed / stat.total) * 100)}%` }}>
                                          {stat.total - stat.completed}
                                      </div>
                                  </div>
                                  <span className="w-10 text-xs text-slate-400">{stat.total}项</span>
                              </div>
                          ))}
                          {userStats.length === 0 && <p className="text-center text-slate-400 py-8">暂无任务数据</p>}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'PROJECT_BOARD' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                      <tr>
                          <th className="px-6 py-4 font-semibold">项目名称</th>
                          <th className="px-6 py-4 font-semibold">状态</th>
                          <th className="px-6 py-4 font-semibold">负责人</th>
                          <th className="px-6 py-4 font-semibold">客户/场景</th>
                          <th className="px-6 py-4 font-semibold">任务进度</th>
                          <th className="px-6 py-4 font-semibold">立项日期</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {projects.map(p => {
                          const pTasks = tasks.filter(t => t.projectId === p.id);
                          const pCompleted = pTasks.filter(t => t.status === 'COMPLETED').length;
                          const progress = pTasks.length > 0 ? Math.round((pCompleted / pTasks.length) * 100) : 0;
                          
                          return (
                              <tr key={p.id} className="hover:bg-slate-50/50">
                                  <td className="px-6 py-4">
                                      <div className="font-medium text-slate-800">{p.title}</div>
                                      {p.projectNumber && <div className="text-xs text-slate-400 font-mono">{p.projectNumber}</div>}
                                  </td>
                                  <td className="px-6 py-4">
                                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                          p.status === 'INITIATION' ? 'bg-blue-100 text-blue-700' :
                                          p.status === 'EXECUTION' ? 'bg-yellow-100 text-yellow-700' :
                                          p.status === 'ACCEPTANCE' ? 'bg-purple-100 text-purple-700' :
                                          'bg-green-100 text-green-700'
                                      }`}>
                                          {p.status === 'INITIATION' ? '立项' : p.status === 'EXECUTION' ? '执行' : p.status === 'ACCEPTANCE' ? '验收' : '归档'}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4 text-slate-600">{users.find(u => u.id === p.managerId)?.username || 'Unknown'}</td>
                                  <td className="px-6 py-4">
                                      <div className="text-slate-700">{p.customerName || '-'}</div>
                                      <div className="text-xs text-slate-400">{p.businessScenario}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className="flex items-center gap-2">
                                          <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                              <div className="h-full bg-brand-500" style={{width: `${progress}%`}}></div>
                                          </div>
                                          <span className="text-xs text-slate-500">{progress}%</span>
                                      </div>
                                      <div className="text-[10px] text-slate-400 mt-1">{pTasks.length} 个任务</div>
                                  </td>
                                  <td className="px-6 py-4 text-slate-600">{p.startDate}</td>
                              </tr>
                          );
                      })}
                  </tbody>
              </table>
          </div>
      )}

      {activeTab === 'REPORTS' && (
        <div className="flex flex-col h-full overflow-hidden">
           {/* Filters */}
           <div className="flex-none flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4">
              <div className="relative flex-1"><Search className="absolute left-3 top-3 text-slate-400" size={18} /><input type="text" placeholder="搜索汇报人、内容..." className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
              
              <div className="flex gap-2 items-center bg-slate-100 p-1 rounded-lg">
                  <button onClick={() => setReportViewMode('USER')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${reportViewMode === 'USER' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>按人员</button>
                  <button onClick={() => setReportViewMode('DATE')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${reportViewMode === 'DATE' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>按时间</button>
              </div>

              <div className="flex gap-2 items-center">
                  <Filter size={16} className="text-slate-400"/>
                  <input type="date" className="border rounded-lg px-3 py-2 text-sm" value={startDate} onChange={e => setStartDate(e.target.value)} />
                  <span className="text-slate-400">-</span>
                  <input type="date" className="border rounded-lg px-3 py-2 text-sm" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
              <div className="flex gap-2">
                 <button onClick={toggleSelectAll} className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-sm whitespace-nowrap">{selectedReportIds.length > 0 && selectedReportIds.length === filteredReports.length ? <CheckSquare size={16} /> : <Square size={16} />} 全选</button>
                 <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm whitespace-nowrap shadow-sm"><Download size={16} /> 导出选中 ({selectedReportIds.length})</button>
              </div>
           </div>
           
           {/* Kanban Board */}
           <div className="flex-1 overflow-x-auto overflow-y-hidden border border-slate-200 rounded-xl bg-slate-50/50 p-4">
              <div className="flex gap-4 h-full">
                  {Object.entries(groupedReports).map(([key, groupReports]) => (
                      <div key={key} className="flex-none w-[28rem] bg-slate-100 rounded-xl flex flex-col max-h-full border border-slate-200">
                          {/* Column Header */}
                          <div className="p-3 font-bold text-slate-700 border-b border-slate-200 bg-white rounded-t-xl flex justify-between items-center shadow-sm z-10">
                              <div className="flex items-center gap-2">
                                  {reportViewMode === 'USER' ? (
                                      <div className="w-8 h-8 bg-brand-50 rounded-full flex items-center justify-center text-xs border border-brand-100 text-brand-700">{groupReports[0].username[0]}</div>
                                  ) : (
                                      <Calendar size={18} className="text-slate-400" />
                                  )}
                                  <span className="truncate max-w-[200px]" title={getGroupTitle(key)}>{getGroupTitle(key)}</span>
                              </div>
                              <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full text-slate-500 font-normal">{groupReports.length} 篇</span>
                          </div>
                          {/* Cards List */}
                          <div className="p-2 space-y-3 overflow-y-auto flex-1">
                              {groupReports.map(report => (
                                  <div 
                                    key={report.id} 
                                    onClick={() => setViewingReport(report)}
                                    className={`bg-white p-4 rounded-lg shadow-sm border text-sm cursor-pointer transition-all group relative ${selectedReportIds.includes(report.id) ? 'ring-2 ring-brand-500 border-brand-500' : 'border-slate-200 hover:border-brand-300 hover:shadow-md'}`}
                                  >
                                      <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-50">
                                          {/* Card Header Logic: If grouped by DATE, show USER. If grouped by USER, show DATE. */}
                                          <div className="flex items-center gap-2">
                                              {reportViewMode === 'DATE' ? (
                                                  <div className="flex items-center gap-2">
                                                      <div className="w-6 h-6 bg-brand-100 rounded-full flex items-center justify-center text-[10px] font-bold text-brand-700">{report.username[0]}</div>
                                                      <span className="text-xs font-bold text-slate-700">{report.username}</span>
                                                  </div>
                                              ) : (
                                                  <span className="text-xs font-mono text-slate-500 flex items-center gap-1"><Calendar size={12}/>{new Date(report.createdAt).toLocaleDateString()}</span>
                                              )}
                                              {report.attachments && report.attachments.length > 0 && <Paperclip size={12} className="text-slate-400"/>}
                                          </div>
                                          
                                          {/* Selection Box */}
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); toggleSelectReport(report.id); }}
                                            className="text-slate-400 hover:text-brand-600 transition-colors p-1"
                                          >
                                              {selectedReportIds.includes(report.id) ? <CheckSquare size={18} className="text-brand-600"/> : <Square size={18}/>}
                                          </button>
                                      </div>
                                      <div className="text-slate-700 line-clamp-6 text-sm leading-relaxed opacity-90">
                                          <ReactMarkdown>{report.content.length > 200 ? report.content.substring(0, 200) + '...' : report.content}</ReactMarkdown>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  ))}
                  
                  {Object.keys(groupedReports).length === 0 && (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                          <FileText size={48} className="mb-4 opacity-20"/>
                          <p>暂无符合条件的周报数据</p>
                      </div>
                  )}
              </div>
           </div>
        </div>
      )}

      {activeTab === 'USERS' && (
        <>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                    <tr><th className="px-6 py-4 font-semibold text-slate-600 text-sm">员工姓名</th><th className="px-6 py-4 font-semibold text-slate-600 text-sm">角色</th><th className="px-6 py-4 font-semibold text-slate-600 text-sm text-right">操作</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {users.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs">{u.username[0]}</div>
                            <div>
                                <span className="font-medium text-slate-800 block">{u.name}</span>
                                <span className="text-xs text-slate-400 font-mono">{u.jobNumber}</span>
                            </div>
                        </td>
                        <td className="px-6 py-4"><span className={`text-xs px-2 py-1 rounded-full font-bold ${u.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>{u.role === UserRole.ADMIN ? '管理员' : '普通员工'}</span></td>
                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                            <button onClick={() => handleEditUser(u)} className="flex items-center gap-1 text-xs bg-white border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded transition-colors"><Edit2 size={12}/> 编辑</button>
                            {u.id !== 'admin-1' && (
                                <button onClick={() => handleRoleToggle(u)} className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded transition-colors border ${u.role === UserRole.ADMIN ? 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100' : 'bg-brand-50 text-brand-700 border-brand-200 hover:bg-brand-100'}`}>
                                    {u.role === UserRole.ADMIN ? '降级为员工' : '提升为管理员'}
                                </button>
                            )}
                        </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            </div>

            {/* Edit User Modal */}
            {showUserModal && editingUser && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
                        <h3 className="text-lg font-bold mb-4">编辑用户: {editingUser.jobNumber}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">姓名</label>
                                <input type="text" value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})} className="w-full border rounded-lg px-3 py-2 outline-none focus:border-brand-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">重置密码</label>
                                <div className="relative">
                                    <input type="password" value={editFormData.password} onChange={e => setEditFormData({...editFormData, password: e.target.value})} className="w-full border rounded-lg pl-9 pr-3 py-2 outline-none focus:border-brand-500" placeholder="输入新密码" />
                                    <Key size={16} className="absolute left-3 top-3 text-slate-400"/>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button onClick={() => setShowUserModal(false)} className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">取消</button>
                                <button onClick={saveUserEdit} className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-bold hover:bg-brand-700">保存修改</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
      )}
      
      {activeTab === 'MONTHLY_REPORT' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-6">
             <div className="lg:col-span-1 space-y-4">
                 <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Sparkles className="text-purple-500"/> 月报生成器</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">开始日期</label>
                            <input type="date" value={monthlyReportStartDate} onChange={e => setMonthlyReportStartDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">结束日期</label>
                            <input type="date" value={monthlyReportEndDate} onChange={e => setMonthlyReportEndDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                        </div>
                        <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded">系统将自动分析该时间段内所有前期任务和正式项目的进展，生成综述报告。</p>
                        <button onClick={handleGenerateMonthlyReport} disabled={isGenerating} className="w-full bg-brand-600 text-white py-2 rounded-lg font-bold hover:bg-brand-700 flex items-center justify-center gap-2">
                           {isGenerating ? <Loader2 className="animate-spin"/> : <Sparkles size={18} />} 生成报告
                        </button>
                    </div>
                 </div>
             </div>
             <div className="lg:col-span-2">
                 {monthlyReportContent ? (
                     <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
                         <div className="flex justify-between items-center mb-4">
                             <h3 className="font-bold text-xl">部门月度项目综述</h3>
                             <button onClick={() => setMonthlyReportContent('')} className="text-sm text-slate-400 hover:text-slate-600">清除</button>
                         </div>
                         <textarea value={monthlyReportContent} onChange={e => setMonthlyReportContent(e.target.value)} className="flex-1 w-full p-4 border rounded-lg font-mono text-sm leading-relaxed outline-none focus:border-brand-500 min-h-[500px]" />
                     </div>
                 ) : (
                     <div className="h-full flex items-center justify-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-slate-400">
                         暂无生成内容
                     </div>
                 )}
             </div>
          </div>
      )}

      {/* Report View Modal */}
      {viewingReport && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-brand-50 rounded-full flex items-center justify-center text-brand-700 font-bold">{viewingReport.username[0]}</div>
                          <div>
                              <h3 className="font-bold text-slate-800">{viewingReport.username} 的周报</h3>
                              <p className="text-xs text-slate-500">{new Date(viewingReport.createdAt).toLocaleString()}</p>
                          </div>
                      </div>
                      <div className="flex gap-2">
                          <button onClick={() => handleSingleExport(viewingReport)} className="text-slate-500 hover:text-brand-600"><Download size={20}/></button>
                          <button onClick={() => setViewingReport(null)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                      </div>
                  </div>
                  <div className="p-6 overflow-y-auto flex-1">
                      <div className="prose prose-sm max-w-none text-slate-700 mb-6">
                          <ReactMarkdown>{viewingReport.content}</ReactMarkdown>
                      </div>
                      {viewingReport.attachments && viewingReport.attachments.length > 0 && (
                          <div className="border-t border-slate-100 pt-4">
                              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">附件</h4>
                              <div className="flex flex-wrap gap-3">
                                  {viewingReport.attachments.map((att, i) => (
                                      att.url.startsWith('data:image') ? (
                                          <div key={i} className="w-32 h-32 border rounded-lg overflow-hidden bg-slate-50">
                                              <img src={att.url} className="w-full h-full object-cover" />
                                          </div>
                                      ) : (
                                          <a key={i} href={att.url} download={att.name} className="flex items-center gap-2 px-3 py-2 bg-slate-50 border rounded text-xs hover:bg-slate-100">
                                              <File size={14}/> {att.name}
                                          </a>
                                      )
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
      </div>
    </div>
  );
};

export default AdminDashboard;