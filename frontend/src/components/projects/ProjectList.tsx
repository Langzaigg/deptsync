import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Calendar, User as UserIcon, ArrowRight, Search, Filter, ClipboardList, Briefcase, Archive, Hash, AlertCircle } from 'lucide-react';
import { Project, UserRole } from '../../types';
import { projectsApi } from '../../services/api';
import { useAuth } from '../../App';

const ProjectList: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'PRE' | 'FORMAL' | 'ARCHIVED'>('PRE');

  // Existing customers for autocomplete
  const [existingCustomers, setExistingCustomers] = useState<string[]>([]);

  const [newProject, setNewProject] = useState({
    title: '',
    projectNumber: '',
    customerName: '',
    priority: 'NORMAL' as 'NORMAL' | 'HIGH' | 'URGENT',
    description: '',
    status: 'INITIATION' as 'INITIATION' | 'EXECUTION',
    businessScenario: '内部软件开发',
    startDate: new Date().toISOString().split('T')[0],
    endDate: ''
  });

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [businessFilter, setBusinessFilter] = useState<string>('ALL');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const allProjects = await projectsApi.getAll();
      setProjects(allProjects);

      // Extract unique customer names
      const customers = Array.from(new Set(allProjects.map(p => p.customerName).filter(Boolean) as string[]));
      setExistingCustomers(customers);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const project: Project = {
      id: Math.random().toString(36).substr(2, 9),
      ...newProject,
      managerId: user.id,
      members: [user.id] // Creator is initial member
    };
    try {
      await projectsApi.create(project);
      await loadProjects();
      setShowModal(false);
      // Reset
      setNewProject({
        title: '',
        projectNumber: '',
        customerName: '',
        priority: 'NORMAL',
        description: '',
        status: activeTab === 'PRE' ? 'INITIATION' : 'EXECUTION',
        businessScenario: '内部软件开发',
        startDate: new Date().toISOString().split('T')[0],
        endDate: ''
      });
    } catch (error: any) {
      console.error('Failed to create project:', error);
      alert(`创建项目失败: ${error.message || '未知错误'}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'INITIATION': return 'bg-blue-100 text-blue-800';
      case 'EXECUTION': return 'bg-yellow-100 text-yellow-800';
      case 'ACCEPTANCE': return 'bg-purple-100 text-purple-800';
      case 'CLOSED': return 'bg-green-100 text-green-800';
      default: return 'bg-slate-100';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'INITIATION': return '立项/筹备';
      case 'EXECUTION': return '执行/推进';
      case 'ACCEPTANCE': return '验收/交付';
      case 'CLOSED': return '结束/归档';
      default: return status;
    }
  }

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'URGENT': return <span className="flex items-center gap-1 text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded border border-red-200"><AlertCircle size={10} /> 最高优先</span>;
      case 'HIGH': return <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded border border-orange-200">高优先</span>;
      default: return null;
    }
  };

  const filteredProjects = projects.filter(p => {
    let matchesTab = false;
    if (activeTab === 'PRE') matchesTab = p.status === 'INITIATION';
    else if (activeTab === 'FORMAL') matchesTab = p.status === 'EXECUTION' || p.status === 'ACCEPTANCE';
    else if (activeTab === 'ARCHIVED') matchesTab = p.status === 'CLOSED';

    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.businessScenario?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.customerName && p.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.projectNumber && p.projectNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesBusiness = businessFilter === 'ALL' || p.businessScenario === businessFilter;

    return matchesTab && matchesSearch && matchesBusiness;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">项目管理</h2>
          <p className="text-slate-500">前期任务管控与正式项目全生命周期管理</p>
        </div>
        <button
          onClick={() => {
            setNewProject(prev => ({ ...prev, status: activeTab === 'PRE' ? 'INITIATION' : 'EXECUTION' }));
            setShowModal(true);
          }}
          className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg transition-colors font-medium shadow-sm whitespace-nowrap"
        >
          <Plus size={20} />
          <span>{activeTab === 'PRE' ? '发起前期任务' : '登记正式项目'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('PRE')}
          className={`pb-3 px-1 flex items-center gap-2 font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'PRE' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <ClipboardList size={18} />
          前期任务
          <span className="bg-slate-100 text-slate-600 text-xs py-0.5 px-2 rounded-full">{projects.filter(p => p.status === 'INITIATION').length}</span>
        </button>
        <button
          onClick={() => setActiveTab('FORMAL')}
          className={`pb-3 px-1 flex items-center gap-2 font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'FORMAL' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <Briefcase size={18} />
          正式项目
          <span className="bg-slate-100 text-slate-600 text-xs py-0.5 px-2 rounded-full">{projects.filter(p => p.status === 'EXECUTION' || p.status === 'ACCEPTANCE').length}</span>
        </button>
        <button
          onClick={() => setActiveTab('ARCHIVED')}
          className={`pb-3 px-1 flex items-center gap-2 font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'ARCHIVED' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <Archive size={18} />
          归档项目
          <span className="bg-slate-100 text-slate-600 text-xs py-0.5 px-2 rounded-full">{projects.filter(p => p.status === 'CLOSED').length}</span>
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="搜索名称、客户、编号..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative min-w-[180px]">
          <Filter className="absolute left-3 top-3 text-slate-400" size={18} />
          <select
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none appearance-none bg-white"
            value={businessFilter}
            onChange={(e) => setBusinessFilter(e.target.value)}
          >
            <option value="ALL">所有业务场景</option>
            <option value="内部软件开发">内部软件开发</option>
            <option value="系统运维">系统运维</option>
            <option value="集团专班配合">集团专班配合</option>
            <option value="外部项目跟踪">外部项目跟踪</option>
            <option value="其他">其他</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map(p => (
          <Link key={p.id} to={`/projects/${p.id}`} className="group bg-white rounded-xl shadow-sm border border-slate-200 hover:border-brand-300 hover:shadow-md transition-all p-6 flex flex-col h-full">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(p.status)}`}>
                  {getStatusLabel(p.status)}
                </span>
                {getPriorityBadge(p.priority)}
              </div>
              {p.projectNumber && (
                <span className="text-xs font-mono bg-slate-100 text-slate-500 px-2 py-1 rounded">
                  {p.projectNumber}
                </span>
              )}
            </div>

            <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-brand-600 transition-colors">{p.title}</h3>
            {p.customerName && <p className="text-xs text-slate-500 mb-2">客户: {p.customerName}</p>}

            <div className="mb-3">
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                {p.businessScenario || '通用任务'}
              </span>
            </div>
            <p className="text-slate-500 text-sm mb-6 flex-1 line-clamp-3">{p.description}</p>

            <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 pt-4">
              <div className="flex items-center gap-1.5">
                <Calendar size={14} />
                <span>{p.startDate}</span>
              </div>
              <div className="flex items-center gap-1.5" title="团队成员">
                <UserIcon size={14} />
                <span>{p.members?.length || 1} 人</span>
              </div>
            </div>
          </Link>
        ))}
        {filteredProjects.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <p>没有找到相关项目。</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="text-xl font-bold mb-4">{activeTab === 'PRE' ? '发起前期任务' : '登记正式项目'}</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">名称</label>
                <input required type="text" className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none"
                  value={newProject.title} onChange={e => setNewProject({ ...newProject, title: e.target.value })} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">客户名称</label>
                <input
                  type="text"
                  list="customer-list"
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none"
                  placeholder="输入或选择客户..."
                  value={newProject.customerName}
                  onChange={e => setNewProject({ ...newProject, customerName: e.target.value })}
                />
                <datalist id="customer-list">
                  {existingCustomers.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>

              {/* Formal Project Number */}
              {newProject.status === 'EXECUTION' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">项目编号</label>
                  <input type="text" className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none"
                    placeholder="例如: PRJ-2023-001"
                    value={newProject.projectNumber} onChange={e => setNewProject({ ...newProject, projectNumber: e.target.value })} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">当前状态</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                    value={newProject.status}
                    onChange={e => setNewProject({ ...newProject, status: e.target.value as any })}
                  >
                    <option value="INITIATION">立项/筹备</option>
                    <option value="EXECUTION">执行/推进</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">业务场景</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                    value={newProject.businessScenario}
                    onChange={e => setNewProject({ ...newProject, businessScenario: e.target.value })}
                  >
                    <option value="内部软件开发">内部软件开发</option>
                    <option value="系统运维">系统运维</option>
                    <option value="集团专班配合">集团专班配合</option>
                    <option value="外部项目跟踪">外部项目跟踪</option>
                    <option value="其他">其他</option>
                  </select>
                </div>
              </div>

              {user?.role === UserRole.ADMIN && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">优先级</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                    value={newProject.priority}
                    onChange={e => setNewProject({ ...newProject, priority: e.target.value as any })}
                  >
                    <option value="NORMAL">普通</option>
                    <option value="HIGH">高优先</option>
                    <option value="URGENT">最高优先 (Urgent)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">描述/核心需求</label>
                <textarea required rows={3} className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none"
                  value={newProject.description} onChange={e => setNewProject({ ...newProject, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">开始日期</label>
                  <input required type="date" className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none"
                    value={newProject.startDate} onChange={e => setNewProject({ ...newProject, startDate: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">截止日期 (可选)</label>
                  <input type="date" className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none"
                    value={newProject.endDate} onChange={e => setNewProject({ ...newProject, endDate: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">取消</button>
                <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700">确认创建</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectList;
