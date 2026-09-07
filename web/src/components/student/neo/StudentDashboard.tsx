import React, { useState } from 'react';

export default function StudentDashboard({ onStartExam }: { onStartExam: (exam: any) => void }) {
  const [activeTab, setActiveTab] = useState('available');

  const exams = [
    {
      id: 'cs301',
      title: 'Advanced Algorithms CS301',
      desc: 'Midterm examination covering dynamic programming, graph theory, and computational complexity.',
      duration: '60 Mins',
      tags: ['MCQ', 'Coding'],
      status: 'verified',
      icon: 'code',
      locked: false,
    },
    {
      id: 'cloud101',
      title: 'Cloud Architecture 101',
      desc: 'Foundations of distributed systems, microservices, and serverless deployment models.',
      duration: '90 Mins',
      tags: ['Essay', 'Design'],
      status: 'verified',
      icon: 'dns',
      locked: false,
    },
    {
      id: 'sec201',
      title: 'Cybersecurity Fundamentals',
      desc: 'Threat modeling, cryptographic protocols, and network penetration testing basics.',
      duration: '45 Mins',
      tags: ['MCQ'],
      status: 'locked',
      timeString: 'Opens 2PM',
      icon: 'shield',
      locked: true,
    },
  ];

  return (
    <div className="flex flex-col w-full relative min-h-[800px]">
      <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-primary/20 rounded-full blur-[120px] -z-10 mix-blend-screen pointer-events-none transform translate-x-1/4 -translate-y-1/4"></div>
      <div className="absolute bottom-0 left-0 w-[40vw] h-[40vw] bg-secondary/15 rounded-full blur-[100px] -z-10 mix-blend-screen pointer-events-none transform -translate-x-1/4 translate-y-1/4"></div>
      
      <section className="mb-xl relative z-10 w-full mt-lg">
        <div className="relative w-full rounded-[20px] bg-surface-container-low/80 backdrop-blur-2xl p-xl shadow-[0_0_40px_rgba(99,102,241,0.15)] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 pointer-events-none"></div>
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent pointer-events-none"></div>
          
          <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-xl z-10">
            <div className="flex-1">
              <div className="inline-flex items-center gap-xs mb-sm px-sm py-base rounded-full bg-surface-variant/50 text-label-md font-label-md text-on-surface-variant tracking-wider uppercase backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-tertiary shadow-[0_0_8px_rgba(78,222,163,0.8)]"></span>
                System Status: Secured
              </div>
              <h1 className="font-headline-xl text-headline-xl text-on-surface mb-sm tracking-tight leading-none drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">Good Morning, Alex 👋</h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">Your authentication verified. 4 new assessments require your attention today.</p>
            </div>
            
            <div className="flex flex-wrap gap-sm pt-md md:pt-0">
              <div className="flex flex-col bg-surface-container-highest/60 backdrop-blur-md px-lg py-md rounded-xl min-w-[140px] shadow-[0_0_20px_rgba(0,0,0,0.2)]">
                <span className="font-headline-lg text-headline-lg text-primary mb-base">12</span>
                <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Available Exams</span>
              </div>
              <div className="flex flex-col bg-surface-container-highest/60 backdrop-blur-md px-lg py-md rounded-xl min-w-[140px] shadow-[0_0_20px_rgba(0,0,0,0.2)]">
                <span className="font-headline-lg text-headline-lg text-secondary mb-base">8</span>
                <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Attempts</span>
              </div>
              <div className="flex flex-col bg-surface-container-highest/60 backdrop-blur-md px-lg py-md rounded-xl min-w-[140px] shadow-[0_0_20px_rgba(0,0,0,0.2)] relative overflow-hidden group">
                <div className="absolute inset-0 bg-tertiary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <span className="font-headline-lg text-headline-lg text-tertiary mb-base">6</span>
                <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Results</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-xl w-full z-10 flex items-center justify-between">
        <div className="inline-flex p-base bg-surface-container-low/90 backdrop-blur-md rounded-full shadow-[0_0_15px_rgba(0,0,0,0.3)]">
          <button 
            onClick={() => setActiveTab('available')}
            className={`px-lg py-xs rounded-full font-label-md text-label-md transition-all ${
              activeTab === 'available' 
                ? 'bg-primary/20 text-primary shadow-[0_0_15px_rgba(192,193,255,0.2)]' 
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50'
            }`}
          >
            🎯 Available Exams
          </button>
          <button 
            onClick={() => setActiveTab('past')}
            className={`px-lg py-xs rounded-full font-label-md text-label-md transition-all ${
              activeTab === 'past' 
                ? 'bg-primary/20 text-primary shadow-[0_0_15px_rgba(192,193,255,0.2)]' 
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50'
            }`}
          >
            🕒 Past Attempts
          </button>
        </div>
        <div className="hidden lg:flex items-center gap-sm">
          <span className="font-label-md text-label-md text-on-surface-variant tracking-widest uppercase">Sort By:</span>
          <button className="flex items-center gap-xs px-md py-xs rounded-lg bg-surface-container/50 text-on-surface font-body-sm text-body-sm hover:bg-surface-variant transition-colors">
            Date Added <span className="material-symbols-outlined text-[18px]">keyboard_arrow_down</span>
          </button>
        </div>
      </section>

      <section className="w-full z-10 flex flex-col gap-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md w-full">
          {exams.map((exam, index) => (
            <article key={exam.id} className="group relative flex flex-col p-lg bg-surface-container/80 backdrop-blur-xl rounded-[24px] shadow-lg transition-all duration-300 hover:shadow-[0_0_30px_rgba(192,193,255,0.15)] hover:-translate-y-1">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
              
              <div className="flex items-start justify-between mb-lg">
                <div className={`w-[52px] h-[52px] rounded-xl flex items-center justify-center transition-colors ${
                  index === 0 ? 'bg-primary/10 shadow-[inset_0_0_10px_rgba(192,193,255,0.1)] group-hover:bg-primary/20 text-primary' : 
                  index === 1 ? 'bg-secondary/10 shadow-[inset_0_0_10px_rgba(221,183,255,0.1)] group-hover:bg-secondary/20 text-secondary' :
                  'bg-[rgba(255,180,171,0.1)] shadow-[inset_0_0_10px_rgba(255,180,171,0.1)] group-hover:bg-[rgba(255,180,171,0.2)] text-rose-500'
                }`}>
                  <span className="material-symbols-outlined text-[28px]">{exam.icon}</span>
                </div>
                
                {!exam.locked ? (
                  <div className="inline-flex items-center gap-base px-sm py-[2px] rounded-full bg-tertiary/10 border border-tertiary/30 shadow-[0_0_10px_rgba(78,222,163,0.1)]">
                    <span className="material-symbols-outlined text-tertiary text-[14px]">verified</span>
                    <span className="font-label-md text-label-md text-tertiary tracking-wide uppercase text-[11px]">Verified</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-base px-sm py-[2px] rounded-full bg-surface-variant text-on-surface-variant border border-surface-bright">
                    <span className="material-symbols-outlined text-on-surface-variant text-[14px]">schedule</span>
                    <span className="font-label-md text-label-md tracking-wide uppercase text-[11px]">{exam.timeString}</span>
                  </div>
                )}
              </div>
              
              <div className="mb-lg flex-1">
                <h3 className="font-headline-md text-headline-md text-on-surface mb-xs leading-tight group-hover:text-primary transition-colors">{exam.title}</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">{exam.desc}</p>
              </div>
              
              <div className="flex flex-wrap gap-xs mb-lg">
                <span className="px-sm py-[4px] rounded-md bg-surface-variant text-on-surface-variant font-label-md text-label-md text-[12px]">{exam.duration}</span>
                {exam.tags.map(tag => (
                  <span key={tag} className="px-sm py-[4px] rounded-md bg-surface-variant text-on-surface-variant font-label-md text-label-md text-[12px]">{tag}</span>
                ))}
              </div>
              
              {!exam.locked ? (
                <button onClick={() => onStartExam(exam)} className="w-full relative overflow-hidden rounded-lg bg-gradient-to-r from-primary to-inverse-primary text-on-primary font-label-md text-label-md py-sm flex items-center justify-center gap-xs shadow-[0_0_20px_rgba(192,193,255,0.3)] transition-all duration-300 hover:shadow-[0_0_30px_rgba(192,193,255,0.5)] group/btn">
                  <span className="relative z-10">Start Exam</span>
                  <span className="material-symbols-outlined relative z-10 text-[18px] transition-transform group-hover/btn:translate-x-1">arrow_forward</span>
                </button>
              ) : (
                <button disabled className="w-full relative overflow-hidden rounded-lg bg-surface-variant/50 border border-outline-variant/30 text-on-surface-variant font-label-md text-label-md py-sm flex items-center justify-center gap-xs cursor-not-allowed opacity-70">
                  <span className="material-symbols-outlined text-[18px]">lock</span>
                  <span>Locked</span>
                </button>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
