import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Plus, FileText, Sparkles, Check, Loader2, Download, Briefcase, RefreshCw, Paperclip, X, Image as ImageIcon, File, Trash2 } from 'lucide-react';
import { WeeklyReport, Project, Inspiration, WeeklyReportItem, Attachment } from '../types';
import { reportService, projectService, timelineService, inspirationService, taskService } from '../services/storage';
import { generatePersonalReport } from '../services/gemini';
import { useAuth } from '../App';

interface PendingAttachment {
  file: File;
  previewUrl: string;
  caption: string;
  id: string;
}

const PersonalReports: React.FC = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  
  // Data
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [availableInspirations, setAvailableInspirations] = useState<Inspiration[]>([]);

  // Form State
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectedInspirationIds, setSelectedInspirationIds] = useState<string[]>([]);
  
  // Structured Content State
  const [projectInputs, setProjectInputs] = useState<Record<string, { content: string, plan: string }>>({});
  const [generalContent, setGeneralContent] = useState('');
  
  // Attachments State
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (user) {
      setReports(reportService.getByUser(user.id));
      // Only show projects where user is a member
      const allProjects = projectService.getAll();
      const myProjects = allProjects.filter(p => p.members && p.members.includes(user.id));
      setAvailableProjects(myProjects);
      setAvailableInspirations(inspirationService.getAll());
    }
  }, [user]);

  const toggleProject = (id: string) => {
    if (selectedProjectIds.includes(id)) {
        setSelectedProjectIds(prev => prev.filter(p => p !== id));
        // Cleanup input
        const newInputs = {...projectInputs};
        delete newInputs[id];
        setProjectInputs(newInputs);
    } else {
        setSelectedProjectIds(prev => [...prev, id]);
        setProjectInputs(prev => ({...prev, [id]: { content: '', plan: '' }}));
    }
  };

  const updateProjectInput = (id: string, field: 'content' | 'plan', value: string) => {
      setProjectInputs(prev => ({
          ...prev,
          [id]: { ...prev[id], [field]: value }
      }));
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

  const handleDeleteReport = (id: string) => {
      if (window.confirm("确定删除此周报吗？")) {
          reportService.delete(id);
          if (user) setReports(reportService.getByUser(user.id));
      }
  };

  const handleSmartGenerate = async () => {
    if (!user || selectedProjectIds.length === 0) return;
    setIsGenerating(true);

    const projectData = selectedProjectIds.map(pid => {
       const proj = availableProjects.find(p => p.id === pid)!;
       
       // Fetch relevant timeline events from last 7 days authored by user
       const sevenDaysAgo = new Date();
       sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
       const events = timelineService.getByProject(pid).filter(e => 
           e.authorId === user.id && new Date(e.date) >= sevenDaysAgo
       );

       // Fetch relevant task assignments
       const tasks = taskService.getByProject(pid).filter(t => 
           t.assigneeIds.includes(user.id) && t.status !== 'COMPLETED'
       );

       return { title: proj.title, id: proj.id, events, tasks };
    });

    const inspirationContext = availableInspirations.filter(i => selectedInspirationIds.includes(i.id));

    try {
        const resultJSONString = await generatePersonalReport(user.username, projectData, inspirationContext);
        
        try {
            // Attempt to parse strictly formatted JSON from AI
            const cleanJson = resultJSONString.replace(/```json/g, '').replace(/```/g, '').trim();
            const resultData = JSON.parse(cleanJson);

            // Update inputs
            const newInputs = { ...projectInputs };
            selectedProjectIds.forEach(pid => {
                if (resultData[pid]) {
                    newInputs[pid] = {
                        content: resultData[pid].content || newInputs[pid]?.content || '',
                        plan: resultData[pid].plan || newInputs[pid]?.plan || '',
                    };
                }
            });
            setProjectInputs(newInputs);
            if (resultData.generalSummary) {
                setGeneralContent(resultData.generalSummary);
            }
        } catch (e) {
            console.error("Failed to parse AI response", e);
            setGeneralContent("AI 生成了内容，但格式解析失败，请手动查看控制台或重试。\n" + resultJSONString);
        }

    } catch (e) {
        console.error("AI Generation Error", e);
    } finally {
        setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Process attachments
    let finalAttachments: Attachment[] = [];
    for (const att of pendingAttachments) {
       try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(att.file);
        });
        finalAttachments.push({ name: att.file.name, url: dataUrl, caption: att.caption });
       } catch (err) { console.error(err); }
    }

    // Build structured details
    const details: WeeklyReportItem[] = selectedProjectIds.map(pid => ({
        projectId: pid,
        projectTitle: availableProjects.find(p => p.id === pid)?.title || 'Unknown',
        content: projectInputs[pid]?.content || '',
        plan: projectInputs[pid]?.plan || '',
        manDays: 0 
    }));

    // Construct legacy content string for backward compatibility
    let fullContent = "";
    if (generalContent) {
        fullContent += `### 总体备注/其他事项\n${generalContent}\n\n`;
    }
    
    details.forEach(d => {
        fullContent += `#### 项目: ${d.projectTitle}\n- **本周进展**: ${d.content}\n- **下周计划**: ${d.plan}\n\n`;
    });

    const report: WeeklyReport = {
      id: Math.random().toString(36).substr(2, 9),
      userId: user.id,
      username: user.username,
      weekStartDate: new Date().toISOString(), 
      content: fullContent,
      details: details,
      linkedProjectIds: selectedProjectIds,
      linkedInspirationIds: selectedInspirationIds,
      attachments: finalAttachments,
      createdAt: new Date().toISOString()
    };

    reportService.create(report);
    
    setReports(reportService.getByUser(user.id));
    setIsCreating(false);
    // Reset
    setSelectedProjectIds([]);
    setProjectInputs({});
    setGeneralContent('');
    setPendingAttachments([]);
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

  const isImage = (url: string) => url.startsWith('data:image');

  return (
    <div className="space-y-6">
      {!isCreating ? (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">我的周报</h2>
              <p className="text-slate-500">每周个人工作总结。</p>
            </div>
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg transition-colors font-medium shadow-sm"
            >
              <Plus size={20} />
              <span>写周报</span>
            </button>
          </div>

          <div className="space-y-4">
            {reports.map(report => (
              <div key={report.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 group relative">
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
                   <div className="flex items-center gap-3">
                     <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <FileText size={20} />
                     </div>
                     <div>
                       <h3 className="font-bold text-slate-800">周报</h3>
                       <p className="text-xs text-slate-500">{new Date(report.createdAt).toLocaleDateString()} • 关联 {report.linkedProjectIds.length} 个项目</p>
                     </div>
                   </div>
                   <div className="flex gap-2">
                       <button onClick={() => handleDeleteReport(report.id)} className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={18} /></button>
                       <button onClick={() => handleSingleExport(report)} className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-full transition-colors"><Download size={18} /></button>
                   </div>
                </div>
                <div className="prose prose-sm prose-slate max-w-none text-slate-600 mb-4">
                  <ReactMarkdown>{report.content}</ReactMarkdown>
                </div>
                {/* Attachments Display */}
                {report.attachments && report.attachments.length > 0 && (
                     <div className="border-t border-slate-100 pt-4 flex flex-wrap gap-2">
                         {report.attachments.map((att, i) => (
                             isImage(att.url) ? (
                                 <div key={i} className="w-20 h-20 border rounded overflow-hidden">
                                     <img src={att.url} className="w-full h-full object-cover" title={att.name} />
                                 </div>
                             ) : (
                                 <a key={i} href={att.url} download={att.name} className="flex items-center gap-2 px-3 py-2 bg-slate-50 border rounded text-xs text-slate-600 hover:bg-slate-100">
                                     <File size={14}/> {att.name}
                                 </a>
                             )
                         ))}
                     </div>
                )}
              </div>
            ))}
            {reports.length === 0 && <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-300">暂无周报记录。</div>}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 max-w-5xl mx-auto">
           <h2 className="text-xl font-bold mb-6">创建周报</h2>
           
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-6">
              <div className="lg:col-span-1 space-y-4 border-r border-slate-100 pr-4">
                 <h4 className="font-semibold text-slate-700 flex items-center gap-2">1. 选择本周工作项目</h4>
                 <div className="space-y-2 max-h-[500px] overflow-y-auto">
                   {availableProjects.length === 0 && <p className="text-xs text-slate-400 p-2">您当前没有参与任何项目。</p>}
                   {availableProjects.map(p => (
                     <div key={p.id} onClick={() => toggleProject(p.id)} className={`p-3 rounded-lg cursor-pointer text-sm border transition-all ${selectedProjectIds.includes(p.id) ? 'bg-brand-50 border-brand-300 shadow-sm' : 'hover:bg-slate-50 border-transparent'}`}>
                        <div className="flex items-center justify-between mb-1">
                            <span className={`font-medium ${selectedProjectIds.includes(p.id) ? 'text-brand-700' : 'text-slate-700'}`}>{p.title}</span>
                            {selectedProjectIds.includes(p.id) && <Check size={16} className="text-brand-600" />}
                        </div>
                        <span className="text-xs text-slate-400 block">
                            {p.status === 'INITIATION' ? '前期任务' : '正式项目'}
                        </span>
                     </div>
                   ))}
                 </div>
              </div>

              <div className="lg:col-span-2 space-y-6">
                 {selectedProjectIds.length === 0 ? (
                     <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-xl p-8">
                         <Briefcase size={48} className="mb-2 opacity-20" />
                         <p>请先从左侧选择本周参与的项目</p>
                     </div>
                 ) : (
                     <>
                        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex justify-between items-center">
                            <div>
                                <h4 className="font-bold text-indigo-900">智能填报助手</h4>
                                <p className="text-xs text-indigo-700">自动读取您在所选项目的时间线更新和任务进度，生成周报初稿。</p>
                            </div>
                            <button 
                                onClick={handleSmartGenerate} 
                                disabled={isGenerating}
                                className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                            >
                                {isGenerating ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16}/>}
                                {isGenerating ? '生成中...' : '一键生成'}
                            </button>
                        </div>

                        <div className="space-y-6">
                            {selectedProjectIds.map(pid => {
                                const proj = availableProjects.find(p => p.id === pid);
                                return (
                                    <div key={pid} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                        <h4 className="font-bold text-slate-800 mb-3 flex justify-between">
                                            {proj?.title}
                                            <span className="text-xs font-normal bg-white px-2 py-1 rounded border border-slate-200">{proj?.businessScenario}</span>
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 mb-1">本周具体工作内容</label>
                                                <textarea 
                                                    rows={4} 
                                                    className="w-full border border-slate-300 rounded p-2 text-sm focus:border-brand-500 outline-none" 
                                                    placeholder="AI生成或手动填写..." 
                                                    value={projectInputs[pid]?.content}
                                                    onChange={e => updateProjectInput(pid, 'content', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 mb-1">下周计划</label>
                                                <textarea 
                                                    rows={4} 
                                                    className="w-full border border-slate-300 rounded p-2 text-sm focus:border-brand-500 outline-none" 
                                                    placeholder="AI生成或手动填写..." 
                                                    value={projectInputs[pid]?.plan}
                                                    onChange={e => updateProjectInput(pid, 'plan', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        
                        <div className="border-t border-slate-100 pt-6">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-slate-700">总体备注 / 其他事项</h4>
                            </div>
                            <textarea 
                                rows={3} 
                                className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                                value={generalContent}
                                onChange={e => setGeneralContent(e.target.value)}
                                placeholder="是否有需要公司协调的资源或其他补充说明..."
                            />
                        </div>

                        {/* Attachments Section */}
                        <div className="border-t border-slate-100 pt-6">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-slate-700">附件上传</h4>
                                <label className="cursor-pointer text-brand-600 hover:text-brand-700 flex items-center text-sm"><Paperclip size={16} className="mr-1"/><input type="file" className="hidden" multiple ref={fileInputRef} onChange={handleFileSelect} />添加文件</label>
                            </div>
                            {pendingAttachments.length > 0 && (
                                <div className="grid grid-cols-4 gap-3">
                                    {pendingAttachments.map(att => (
                                        <div key={att.id} className="relative group/preview bg-white rounded border border-slate-200 p-2">
                                            <button type="button" onClick={() => removeAttachment(att.id)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/preview:opacity-100 z-10"><X size={12} /></button>
                                            <div className="aspect-square bg-slate-100 rounded mb-2 overflow-hidden flex items-center justify-center">
                                                {att.previewUrl ? <img src={att.previewUrl} className="w-full h-full object-cover" /> : <File className="text-slate-400" />}
                                            </div>
                                            <p className="text-xs truncate">{att.file.name}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                     </>
                 )}
              </div>
           </div>

           <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
             <button onClick={() => setIsCreating(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">取消</button>
             <button onClick={handleSubmit} className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium">提交周报</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default PersonalReports;