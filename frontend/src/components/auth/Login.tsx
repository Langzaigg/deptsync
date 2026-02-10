import React, { useState } from 'react';
import { useAuth } from '../../App';
import { UserCheck, Briefcase, Hash, Lock, User as UserIcon, Loader2 } from 'lucide-react';

const Login: React.FC = () => {
  const { login, register } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    jobNumber: '',
    password: ''
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const { name, jobNumber, password } = formData;

    if (!jobNumber.trim() || !password.trim()) {
      setError('请输入工号和密码');
      return;
    }
    if (isRegistering && !name.trim()) {
      setError('请输入姓名');
      return;
    }

    setLoading(true);
    try {
      const success = isRegistering
        ? await register(name, jobNumber, password)
        : await login(jobNumber, password);

      if (!success) {
        setError(isRegistering ? '工号已存在' : '工号或密码错误');
      }
    } catch (err: any) {
      setError(err.message || '请求失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-brand-500 rounded-2xl flex items-center justify-center text-white mb-4 rotate-3 shadow-lg shadow-brand-200">
            <Briefcase size={32} />
          </div>
          <h2 className="text-3xl font-bold text-slate-800">DeptSync</h2>
          <p className="text-slate-500 mt-2 text-center">
            {isRegistering ? '注册部门协作账号' : '欢迎回来，请登录'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegistering && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">姓名</label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                  placeholder="请输入真实姓名"
                />
                <UserIcon className="absolute left-3 top-3.5 text-slate-400" size={20} />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">工号</label>
            <div className="relative">
              <input
                type="text"
                value={formData.jobNumber}
                onChange={(e) => setFormData({ ...formData, jobNumber: e.target.value })}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                placeholder="请输入工号 (Login ID)"
              />
              <Hash className="absolute left-3 top-3.5 text-slate-400" size={20} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">密码</label>
            <div className="relative">
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                placeholder="请输入密码"
              />
              <Lock className="absolute left-3 top-3.5 text-slate-400" size={20} />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-md shadow-brand-100 mt-2 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="animate-spin" size={20} />}
            {isRegistering ? '创建账号' : '登录'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => { setIsRegistering(!isRegistering); setError(''); setFormData({ name: '', jobNumber: '', password: '' }); }}
            className="text-sm text-brand-600 hover:text-brand-800 font-medium"
          >
            {isRegistering ? '已有账号？点击登录' : '新员工？点击注册'}
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 text-xs text-center text-slate-400">
          默认管理员: 工号 <span className="font-mono bg-slate-100 px-1 rounded">admin</span> / 密码 <span className="font-mono bg-slate-100 px-1 rounded">admin</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
