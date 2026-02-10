import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, Lightbulb, FileText, Settings, LogOut, Menu, X, ClipboardCheck, MonitorPlay } from 'lucide-react';
import { User, UserRole } from './types';
import { authApi, getToken, setToken, usersApi } from './services/api';

// Pages - lazy load
import ProjectList from './components/projects/ProjectList';
import ProjectDetail from './components/projects/ProjectDetail';
import InspirationBoard from './components/InspirationBoard';
import PersonalReports from './components/PersonalReports';
import AdminDashboard from './components/AdminDashboard';
import MyTaskBoard from './components/MyTaskBoard';
import Login from './components/auth/Login';

// Auth Context
interface AuthContextType {
    user: User | null;
    login: (jobNumber: string, password: string) => Promise<boolean>;
    register: (name: string, jobNumber: string, password: string) => Promise<boolean>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType>(null!);
export const useAuth = () => useContext(AuthContext);

// Layout Component
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const NavItem = ({ to, icon: Icon, label }: any) => {
        const isActive = location.pathname.startsWith(to);
        return (
            <Link
                to={to}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-brand-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
            >
                <Icon size={20} />
                <span className="font-medium">{label}</span>
            </Link>
        );
    };

    return (
        <div className="min-h-screen flex bg-slate-100">
            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-100 transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-200 ease-in-out`}>
                <div className="p-6 flex items-center justify-between">
                    <h1 className="text-2xl font-bold tracking-tight text-brand-500">DeptSync</h1>
                    <button onClick={() => setMobileMenuOpen(false)} className="md:hidden text-slate-400">
                        <X size={24} />
                    </button>
                </div>

                <div className="px-6 mb-6">
                    <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg">
                        <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold">
                            {user?.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                            <p className="font-medium truncate">{user?.username}</p>
                            <p className="text-xs text-slate-400">{user?.role === UserRole.ADMIN ? '管理员' : '普通员工'}</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-2">
                    <NavItem to="/tasks" icon={ClipboardCheck} label="任务看板" />
                    <NavItem to="/projects" icon={LayoutDashboard} label="项目管理" />
                    <NavItem to="/board" icon={Lightbulb} label="灵感看板" />
                    <NavItem to="/reports" icon={FileText} label="我的周报" />
                    {user?.role === UserRole.ADMIN && (
                        <NavItem to="/admin" icon={MonitorPlay} label="管理看板" />
                    )}
                </nav>

                <div className="p-4 mt-auto">
                    <button onClick={logout} className="flex items-center gap-3 px-4 py-3 w-full text-slate-400 hover:text-red-400 transition-colors">
                        <LogOut size={20} />
                        <span>退出登录</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto h-screen flex flex-col">
                <header className="bg-white border-b border-slate-200 px-6 py-4 md:hidden flex items-center justify-between sticky top-0 z-40">
                    <h1 className="font-bold text-slate-800">DeptSync</h1>
                    <button onClick={() => setMobileMenuOpen(true)} className="text-slate-600">
                        <Menu size={24} />
                    </button>
                </header>
                <div className="p-4 md:p-8 w-full h-full">
                    {children}
                </div>
            </main>
        </div>
    );
};

// Main App
const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // On mount, check for existing token and validate
    useEffect(() => {
        const checkAuth = async () => {
            const token = getToken();
            if (token) {
                try {
                    // Try to get current user info from stored data
                    const storedUser = localStorage.getItem('deptsync_current_user');
                    if (storedUser) {
                        setUser(JSON.parse(storedUser));
                    }
                } catch {
                    setToken(null);
                }
            }
            setLoading(false);
        };
        checkAuth();
    }, []);

    const login = async (jobNumber: string, password: string): Promise<boolean> => {
        try {
            const response = await authApi.login(jobNumber, password);
            const userData: User = {
                id: response.userId,
                jobNumber: jobNumber,
                name: response.username.split('(')[0] || response.username,
                username: response.username,
                role: response.role as UserRole,
            };
            setUser(userData);
            localStorage.setItem('deptsync_current_user', JSON.stringify(userData));
            return true;
        } catch (error) {
            console.error('Login failed:', error);
            return false;
        }
    };

    const register = async (name: string, jobNumber: string, password: string): Promise<boolean> => {
        try {
            const response = await authApi.register(name, jobNumber, password);
            const userData: User = {
                id: response.userId,
                jobNumber: jobNumber,
                name: name,
                username: response.username,
                role: response.role as UserRole,
            };
            setUser(userData);
            localStorage.setItem('deptsync_current_user', JSON.stringify(userData));
            return true;
        } catch (error) {
            console.error('Register failed:', error);
            return false;
        }
    };

    const logout = () => {
        authApi.logout();
        setUser(null);
        localStorage.removeItem('deptsync_current_user');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{ user, login, register, logout }}>
            <HashRouter>
                <Routes>
                    <Route path="/login" element={!user ? <Login /> : <Navigate to="/tasks" />} />

                    <Route path="/" element={user ? <Navigate to="/tasks" /> : <Navigate to="/login" />} />

                    <Route path="/*" element={
                        user ? (
                            <Layout>
                                <Routes>
                                    <Route path="/projects" element={<ProjectList />} />
                                    <Route path="/projects/:id" element={<ProjectDetail />} />
                                    <Route path="/tasks" element={<MyTaskBoard />} />
                                    <Route path="/board" element={<InspirationBoard />} />
                                    <Route path="/reports" element={<PersonalReports />} />
                                    <Route path="/admin" element={
                                        user.role === UserRole.ADMIN ? <AdminDashboard /> : <Navigate to="/projects" />
                                    } />
                                </Routes>
                            </Layout>
                        ) : (
                            <Navigate to="/login" />
                        )
                    } />
                </Routes>
            </HashRouter>
        </AuthContext.Provider>
    );
};

export default App;
