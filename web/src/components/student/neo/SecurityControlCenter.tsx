import React, { useState } from 'react';

export default function SecurityControlCenter() {
  const [extensions, setExtensions] = useState([
    {
      id: 'kbfnbcaeplbcio',
      name: 'Grammarly',
      version: 'v14.1.2',
      status: 'unauthorized',
      active: true,
    },
    {
      id: 'cfhdojbkzhnk',
      name: 'AdBlock Plus',
      version: 'v3.18',
      status: 'unauthorized',
      active: true,
    },
    {
      id: 'neoshld_core_x9',
      name: 'NeoExamShield',
      version: 'v2.4.0-build-88',
      status: 'mandatory',
      active: true,
    },
  ]);

  const toggleExtension = (id: string) => {
    setExtensions((prev) =>
      prev.map((ext) => (ext.id === id ? { ...ext, active: !ext.active } : ext))
    );
  };

  const disableAllThirdParty = () => {
    setExtensions((prev) =>
      prev.map((ext) => (ext.status === 'unauthorized' ? { ...ext, active: false } : ext))
    );
  };

  const unauthorizedActiveCount = extensions.filter(
    (e) => e.status === 'unauthorized' && e.active
  ).length;

  return (
    <div className="flex flex-col w-full max-w-[1000px] mx-auto gap-lg">
      
      {/* Header Card */}
      <div className="w-full bg-surface-container-low rounded-[20px] p-xl flex items-center justify-between border border-primary/5">
        <div className="flex items-center gap-md">
          <div className="w-14 h-14 bg-surface-variant rounded-xl flex items-center justify-center border border-outline-variant/30">
            <span className="material-symbols-outlined text-primary-fixed">shield_lock</span>
          </div>
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight leading-tight">NeoExamShield<br/>SCC</h1>
            <div className="flex items-center gap-xs mt-base">
              <span className="w-2.5 h-2.5 rounded-full bg-tertiary"></span>
              <span className="font-label-md text-label-md text-tertiary uppercase tracking-wider">Real-Time Monitoring Active</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-sm">
          <button className="flex items-center gap-xs px-md py-sm bg-surface-variant hover:bg-surface-bright text-on-surface-variant font-label-md text-label-md rounded-lg transition-colors border border-outline-variant/30">
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Refresh Status
          </button>
          <button onClick={disableAllThirdParty} className="flex items-center gap-xs px-md py-sm bg-tertiary hover:bg-tertiary-fixed text-on-tertiary-fixed font-label-md text-label-md rounded-lg transition-colors">
            <span className="material-symbols-outlined text-[18px]">block</span>
            Auto-Disable Third-Party
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
        <div className="bg-surface-container-low p-lg rounded-[20px] border border-primary/5">
          <div className="flex items-center justify-between mb-xl">
            <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Extensions<br/>Scanned</span>
            <span className="material-symbols-outlined text-on-surface-variant">search</span>
          </div>
          <div className="font-headline-xl text-headline-xl text-on-surface">12</div>
          <div className="w-full h-1 bg-surface-variant rounded-full mt-md">
            <div className="h-full bg-secondary w-3/4 rounded-full"></div>
          </div>
        </div>
        
        <div className="bg-[#2A1718] p-lg rounded-[20px] border border-rose-400/20">
          <div className="flex items-center justify-between mb-xl">
            <span className="font-label-md text-label-md text-rose-500 uppercase tracking-wider">Unauthorized<br/>Active</span>
            <span className="material-symbols-outlined text-rose-500">warning</span>
          </div>
          <div className="font-headline-xl text-headline-xl text-rose-500">{unauthorizedActiveCount}</div>
          <div className="font-body-sm text-body-sm text-rose-500/70 mt-md">Immediate attention required</div>
        </div>
        
        <div className="bg-surface-container-low p-lg rounded-[20px] border border-primary/5">
          <div className="flex items-center justify-between mb-xl">
            <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Proctoring State</span>
            <span className="material-symbols-outlined text-on-surface-variant">shield_lock</span>
          </div>
          <div className="font-headline-md text-headline-md text-on-surface">{unauthorizedActiveCount === 0 ? 'Verification Passed' : 'Action Required'}</div>
          <div className="w-full h-1 bg-surface-variant rounded-full mt-md">
            <div className={`h-full rounded-full ${unauthorizedActiveCount === 0 ? 'bg-tertiary w-full' : 'bg-[#FFA399] w-1/3'}`}></div>
          </div>
        </div>
      </div>

      {/* Security Violation Alert */}
      {unauthorizedActiveCount > 0 && (
        <div className="bg-[#2A1718] rounded-[20px] p-md flex items-center justify-between border border-rose-400/20 mt-sm">
          <div className="flex items-center gap-md">
            <div className="w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-rose-500 text-[24px]">gpp_bad</span>
            </div>
            <div>
              <h3 className="font-headline-md text-[20px] text-rose-500 font-bold tracking-tight">Security Violation Detected</h3>
              <p className="font-body-sm text-body-sm text-rose-500/80 mt-1">Turn off conflicting extensions to resume examination. {unauthorizedActiveCount} unauthorized tools currently active.</p>
            </div>
          </div>
          <button className="px-lg py-sm bg-[#FFA399] text-[#410002] font-label-md text-label-md rounded-lg hover:bg-[#FFB4AB] transition-colors">
            Resolve Now
          </button>
        </div>
      )}

      {/* Extension Inventory */}
      <div className="mt-lg">
        <div className="flex items-center gap-md mb-md">
          <h2 className="font-headline-lg text-headline-lg text-on-surface text-[28px]">Extension Inventory</h2>
          <div className="flex-1 h-px bg-surface-variant"></div>
          <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider bg-surface-variant px-sm py-1 rounded">Real-Time Scan</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-md mt-lg">
          {extensions.map((ext) => (
            <div key={ext.id} className={`p-md rounded-[20px] flex items-center justify-between border ${ext.status === 'mandatory' ? 'bg-[#181A2A] border-primary/20' : 'bg-surface-container-low border-outline-variant/20'}`}>
              <div className="flex items-center gap-md">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${ext.status === 'mandatory' ? 'bg-primary/20 text-primary-fixed' : 'bg-surface-variant text-on-surface-variant'}`}>
                  <span className="material-symbols-outlined">{ext.status === 'mandatory' ? 'shield_locked' : 'info'}</span>
                </div>
                <div>
                  <div className="flex items-center gap-sm">
                    <h3 className="font-headline-md text-[20px] text-on-surface font-bold">{ext.name}</h3>
                    <span className={`font-label-md text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${ext.status === 'mandatory' ? 'bg-primary/10 text-primary-fixed border-primary/20' : 'bg-[#2A1718] text-[#FFA399] border-rose-400/20'}`}>
                      {ext.status === 'mandatory' ? 'MANDATORY PROTECTED' : 'UNAUTHORIZED'}
                    </span>
                  </div>
                  <div className="font-body-sm text-body-sm text-on-surface-variant/70 mt-1 font-mono">
                    {ext.version} &bull; id: {ext.id}
                  </div>
                </div>
              </div>
              
              <button
                disabled={ext.status === 'mandatory'}
                onClick={() => toggleExtension(ext.id)}
                className={`w-[50px] h-7 rounded-full transition-colors relative flex items-center px-1 ${
                  ext.active ? (ext.status === 'mandatory' ? 'bg-[#313540]' : 'bg-[#FFA399]') : 'bg-surface-variant'
                } ${ext.status === 'mandatory' ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${ext.active ? 'translate-x-6' : 'translate-x-0'}`}></div>
              </button>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
