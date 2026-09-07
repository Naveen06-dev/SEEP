import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function AppShell({ activeRoute, setActiveRoute, children }: { activeRoute: string, setActiveRoute: (route: string) => void, children: React.ReactNode }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="bg-background font-body-md text-on-surface flex w-full min-h-screen">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-72 bg-surface-container/60 backdrop-blur-xl border-r border-primary/10 z-50 flex flex-col pt-24 pb-8">
        <nav className="flex-1 px-sm space-y-base" data-active-classes="bg-secondary-container text-on-secondary-container shadow-[0_0_15px_rgba(111,0,190,0.3)]">
          <div className="px-sm mb-xs text-label-md text-on-surface-variant/50 uppercase tracking-widest font-label-md">System</div>
          <a className="flex items-center px-md py-sm rounded-lg text-on-surface-variant hover:bg-surface-variant hover:text-on-surface transition-all group cursor-pointer" onClick={() => setActiveRoute('support')}>
            <span className="material-symbols-outlined mr-md">contact_support</span>
            <span className="font-body-md">Support</span>
          </a>
          <a className="flex items-center px-md py-sm rounded-lg text-on-surface-variant hover:bg-surface-variant hover:text-on-surface transition-all group cursor-pointer" onClick={() => setActiveRoute('settings')}>
            <span className="material-symbols-outlined mr-md">settings</span>
            <span className="font-body-md">Settings</span>
          </a>
          <div className="pt-lg mt-lg border-t border-primary/5">
            <a className="flex items-center px-md py-sm rounded-lg text-rose-500 hover:bg-rose-500-container/20 transition-all group cursor-pointer" onClick={handleLogout}>
              <span className="material-symbols-outlined mr-md">logout</span>
              <span className="font-body-md">Log Out</span>
            </a>
          </div>
        </nav>
      </aside>
      
      {/* Main Container */}
      <div className="pl-72 w-full flex flex-col">
        {/* Top Navbar */}
        <header className="fixed top-0 left-0 right-0 h-20 bg-surface-container-low/80 backdrop-blur-2xl border-b border-primary/10 z-[60] px-xl flex items-center justify-between">
          <div className="flex items-center gap-md">
            <img alt="NeoExamShield Logo" className="h-8 w-auto object-contain" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD3_ao_lCwd9BOQYTH5UaF6K0whfDAPH_rJpinTzNO0MVVdzuvVTHK5FSx5yGDlqT4R9UqCLerzrKjdBEkrZpMLhYQUMu0m1vwcuGmXUe_uow2TjzoaxJKAVYg1NHm2qBTk-a8QKk3M7sMuN6ub--O6yS-WJ4BICBSVZBiaKLTQYIGz_BQYtcyY-YpF0m72B8TBmabwNhB4SXl9X2b5EalhThFzjoZT2qo3PA-bM4x_Qdv93DJpY7qW7w"/>
            <span className="font-headline-md text-headline-md text-on-surface tracking-tight hidden lg:block">NeoExamShield</span>
            <nav className="ml-xl flex items-center gap-lg h-full">
              <a onClick={() => setActiveRoute('dashboard')} aria-current={activeRoute === 'dashboard' ? "page" : undefined} className={`cursor-pointer transition-colors py-xs border-b-2 ${activeRoute === 'dashboard' ? 'font-label-md text-primary border-primary' : 'text-body-md font-label-md text-on-surface-variant hover:text-primary border-transparent'}`}>Dashboard</a>
              <a onClick={() => setActiveRoute('my-exams')} className={`cursor-pointer transition-colors py-xs border-b-2 ${activeRoute === 'my-exams' ? 'font-label-md text-primary border-primary' : 'text-body-md font-label-md text-on-surface-variant hover:text-primary border-transparent'}`}>My Exams</a>
              <a onClick={() => setActiveRoute('results')} className={`cursor-pointer transition-colors py-xs border-b-2 ${activeRoute === 'results' ? 'font-label-md text-primary border-primary' : 'text-body-md font-label-md text-on-surface-variant hover:text-primary border-transparent'}`}>Results</a>
              <a onClick={() => setActiveRoute('security-center')} className={`cursor-pointer transition-colors py-xs border-b-2 ${activeRoute === 'security-center' ? 'font-label-md text-primary border-primary' : 'text-body-md font-label-md text-on-surface-variant hover:text-primary border-transparent'}`}>Security Center</a>
            </nav>
          </div>
          <div className="flex items-center gap-md">
            <div className="w-10 h-10 rounded-full border border-primary/20 bg-surface-container-highest flex items-center justify-center">
              <span className="material-symbols-outlined text-on-surface-variant text-[20px]">notifications</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(192,193,255,0.4)]">
              <span className="material-symbols-outlined text-on-primary text-[20px]">person</span>
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <main className="relative pt-20 w-full px-xl py-lg flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
