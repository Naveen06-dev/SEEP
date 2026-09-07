import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Calendar, Settings, LogOut, Bell, Search, Menu, Code2 } from 'lucide-react';
import { Button } from '../ui/Button';

export function StudentLayout() {
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const storedUser = localStorage.getItem('seep_user');
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  const userName = user?.firstName
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : user?.name || user?.email?.split('@')[0] || 'Student';

  const navItems = [
    { label: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
    { label: 'My Exams', path: '/student/dashboard?tab=my-exams', icon: BookOpen },
    { label: 'Results', path: '/student/dashboard?tab=results', icon: Calendar },
    { label: 'Security', path: '/student/dashboard?tab=security', icon: Settings },
  ];

  const handleLogout = () => {
    localStorage.removeItem('seep_user');
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar Desktop */}
      <aside className="w-64 border-r border-border bg-surface hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold mr-3 shadow-sm">
            <Code2 className="h-5 w-5" />
          </div>
          <span className="font-bold text-lg text-slate-900 tracking-tight">Assessment</span>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3">
            Menu
          </div>
          {navItems.map((item) => {
            const isTab = item.path.includes('tab=');
            const searchParams = new URLSearchParams(location.search);
            const currentTab = searchParams.get('tab');
            
            let isActive = false;
            if (isTab) {
               const targetTab = item.path.split('tab=')[1];
               isActive = currentTab === targetTab;
            } else {
               isActive = location.pathname === item.path && !currentTab;
            }

            return (
              <Link
                key={item.label}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium ${
                  isActive 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <item.icon className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-slate-400'}`} />
                {item.label}
              </Link>
            )
          })}
        </div>

        <div className="p-4 border-t border-border">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-rose-500 hover:text-rose-500 hover:bg-rose-50"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Log Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-border bg-surface flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5 text-slate-600" />
            </Button>
            <div className="hidden sm:flex items-center relative">
              <Search className="h-4 w-4 absolute left-3 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search assessments..." 
                className="pl-9 pr-4 py-1.5 h-9 bg-slate-50 border border-border rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all w-64 placeholder:text-slate-400"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative text-slate-600">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full" />
            </Button>
            
            <div className="flex items-center gap-3 pl-4 border-l border-border">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-semibold text-slate-900 leading-none">{userName}</p>
                <p className="text-xs text-slate-400 mt-1">Candidate</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
