import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Plus, Tag, Search, Filter, Edit2, Check } from 'lucide-react';
import { Inspiration } from '../types';
import { inspirationService } from '../services/storage';
import { useAuth } from '../App';

const colors = [
  'bg-yellow-200 text-yellow-900',
  'bg-green-200 text-green-900',
  'bg-pink-200 text-pink-900',
  'bg-blue-200 text-blue-900',
  'bg-purple-200 text-purple-900',
  'bg-orange-200 text-orange-900',
];

const InspirationBoard: React.FC = () => {
  const { user } = useAuth();
  const [inspirations, setInspirations] = useState<Inspiration[]>([]);
  const [filteredInspirations, setFilteredInspirations] = useState<Inspiration[]>([]);
  const [showModal, setShowModal] = useState(false);
  
  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newNote, setNewNote] = useState({ content: '', tags: '', color: colors[0] });
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('');

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    const data = inspirationService.getAll();
    setInspirations(data);
  };

  useEffect(() => {
    const results = inspirations.filter(note => {
        const matchesSearch = note.content.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              note.authorName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTag = selectedTag ? note.tags.includes(selectedTag) : true;
        return matchesSearch && matchesTag;
    });
    setFilteredInspirations(results);
  }, [searchTerm, selectedTag, inspirations]);

  const allTags = Array.from(new Set(inspirations.flatMap(i => i.tags))).sort();

  const handleOpenModal = (note?: Inspiration) => {
    if (note) {
      setEditingId(note.id);
      setNewNote({
        content: note.content,
        tags: note.tags.join(', '),
        color: note.color
      });
    } else {
      setEditingId(null);
      setNewNote({ content: '', tags: '', color: colors[0] });
    }
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const tagsArray = newNote.tags.split(',').map(t => t.trim()).filter(t => t);

    if (editingId) {
      // Update
      const existing = inspirations.find(i => i.id === editingId);
      if (existing) {
        const updated: Inspiration = {
           ...existing,
           content: newNote.content,
           tags: tagsArray,
           color: newNote.color
        };
        inspirationService.update(updated);
      }
    } else {
      // Create
      const inspiration: Inspiration = {
        id: Math.random().toString(36).substr(2, 9),
        authorId: user.id,
        authorName: user.username,
        content: newNote.content,
        tags: tagsArray,
        color: newNote.color,
        createdAt: new Date().toISOString()
      };
      inspirationService.create(inspiration);
    }

    refreshData();
    setShowModal(false);
    setNewNote({ content: '', tags: '', color: colors[0] });
  };

  const handleDelete = () => {
    if (editingId && window.confirm("确定删除此灵感便签吗？")) {
        inspirationService.delete(editingId);
        refreshData();
        setShowModal(false);
        setNewNote({ content: '', tags: '', color: colors[0] });
    }
  };

  const toggleTagInInput = (tag: string) => {
     const currentTags = newNote.tags.split(',').map(t => t.trim()).filter(t => t);
     if (currentTags.includes(tag)) {
        setNewNote({ ...newNote, tags: currentTags.filter(t => t !== tag).join(', ') });
     } else {
        setNewNote({ ...newNote, tags: [...currentTags, tag].join(', ') });
     }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">灵感看板</h2>
          <p className="text-slate-500">分享工作突破、跨部门需求和创意点子。</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm font-medium whitespace-nowrap"
        >
          <Plus size={20} />
          <span>发布灵感</span>
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
         <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
            <input 
               type="text" 
               placeholder="搜索灵感内容或发布者..."
               className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
            />
         </div>
         <div className="relative min-w-[200px]">
            <Filter className="absolute left-3 top-3 text-slate-400" size={18} />
            <select
               className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none appearance-none bg-white"
               value={selectedTag}
               onChange={(e) => setSelectedTag(e.target.value)}
            >
               <option value="">所有标签</option>
               {allTags.map(tag => (
                   <option key={tag} value={tag}>{tag}</option>
               ))}
            </select>
         </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredInspirations.map(note => (
          <div key={note.id} className={`${note.color} p-6 rounded-sm shadow-md rotate-1 hover:rotate-0 transition-transform duration-200 flex flex-col min-h-[240px] relative group`}>
             {user?.id === note.authorId && (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleOpenModal(note); }}
                  className="absolute top-2 right-2 p-1.5 bg-black/10 rounded-full hover:bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Edit2 size={14} className="text-black/60" />
                </button>
             )}
             {/* Optimized Text Display */}
             <div className="flex-1 overflow-hidden">
                <div className="prose prose-sm prose-p:my-1 prose-headings:my-1 max-w-none break-words line-clamp-[8] font-medium">
                    <ReactMarkdown>{note.content}</ReactMarkdown>
                </div>
             </div>
             <div className="mt-4 pt-4 border-t border-black/5">
                <div className="flex flex-wrap gap-2 mb-2">
                  {note.tags.map((tag, i) => (
                    <span 
                        key={i} 
                        className="text-[10px] uppercase tracking-wider font-bold opacity-60 cursor-pointer hover:underline"
                        onClick={(e) => { e.stopPropagation(); setSelectedTag(tag); }}
                    >
                        #{tag}
                    </span>
                  ))}
                </div>
                <div className="flex justify-between items-end text-xs opacity-70 font-semibold">
                   <span>{note.authorName}</span>
                   <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                </div>
             </div>
          </div>
        ))}
        {filteredInspirations.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-300">
             <p className="text-lg">没有找到相关灵感。</p>
             <p className="text-sm">尝试调整搜索词或标签。</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
             <h3 className="text-xl font-bold mb-4">{editingId ? '编辑灵感' : '发布新灵感'}</h3>
             <form onSubmit={handleSave} className="space-y-4">
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">您的想法 (支持 Markdown)</label>
                 <textarea required rows={5} className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none" 
                   value={newNote.content} onChange={e => setNewNote({...newNote, content: e.target.value})} placeholder="有什么突破性的想法？支持 **加粗** 等格式" />
               </div>
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">标签</label>
                 <div className="relative mb-2">
                   <Tag size={16} className="absolute left-3 top-3 text-slate-400" />
                   <input type="text" className="w-full border rounded-lg pl-9 pr-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none" 
                     value={newNote.tags} onChange={e => setNewNote({...newNote, tags: e.target.value})} placeholder="手动输入标签，用逗号分隔..." />
                 </div>
                 {/* Existing Tags Selection */}
                 {allTags.length > 0 && (
                   <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-lg border border-slate-100 max-h-24 overflow-y-auto">
                      <span className="text-xs text-slate-400 w-full mb-1">选择已有标签:</span>
                      {allTags.map(tag => {
                         const isSelected = newNote.tags.split(',').map(t=>t.trim()).includes(tag);
                         return (
                            <button
                                type="button"
                                key={tag}
                                onClick={() => toggleTagInInput(tag)}
                                className={`text-xs px-2 py-1 rounded-full border transition-colors flex items-center gap-1 ${isSelected ? 'bg-brand-100 border-brand-300 text-brand-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                            >
                               {tag}
                               {isSelected && <Check size={10} />}
                            </button>
                         )
                      })}
                   </div>
                 )}
               </div>
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">便签颜色</label>
                  <div className="flex gap-2">
                    {colors.map(c => (
                      <button 
                        key={c}
                        type="button"
                        onClick={() => setNewNote({...newNote, color: c})}
                        className={`w-8 h-8 rounded-full ${c.split(' ')[0]} border-2 ${newNote.color === c ? 'border-slate-600' : 'border-transparent'}`}
                      />
                    ))}
                  </div>
               </div>
               <div className="flex justify-end gap-3 mt-6">
                 {editingId && <button type="button" onClick={handleDelete} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg mr-auto border border-transparent hover:border-red-200">删除</button>}
                 <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">取消</button>
                 <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700">{editingId ? '保存修改' : '发布便签'}</button>
               </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InspirationBoard;