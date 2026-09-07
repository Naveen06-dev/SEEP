import React, { useState, useEffect } from 'react';

export default function EnvironmentVerification({ onVerificationComplete }: { onVerificationComplete: () => void }) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  return (
    <div className="relative min-h-[80vh] flex flex-col items-center justify-center max-w-[800px] mx-auto text-center w-full">
      {/* Background Rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 -z-10">
        <div className="w-[800px] h-[800px] rounded-full border-[2px] border-dashed border-primary-fixed/20 absolute"></div>
        <div className="w-[600px] h-[600px] rounded-full border-[2px] border-dashed border-primary-fixed/30 absolute" style={{ strokeDasharray: '4 12' }}></div>
        <div className="w-[400px] h-[400px] rounded-full border-[2px] border-dashed border-primary-fixed/40 absolute"></div>
      </div>

      <div className="space-y-4 mb-xl">
        <h1 className="font-headline-xl text-[56px] text-on-surface tracking-tight leading-tight">Environment<br/>Verification</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-[500px] mx-auto leading-relaxed">
          Please wait while we establish a secure connection and<br/>verify your system configuration.
        </p>
      </div>

      {/* Circular Animated Countdown Indicator */}
      <div className="relative w-[140px] h-[140px] flex items-center justify-center mb-xl">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="44"
            stroke="currentColor"
            strokeWidth="4"
            className="text-surface-variant fill-[#171b26]/50"
          />
          <circle
            cx="50"
            cy="50"
            r="44"
            stroke="currentColor"
            strokeWidth="4"
            strokeDasharray="276"
            strokeDashoffset={276 - (276 * (5 - countdown)) / 5}
            strokeLinecap="round"
            className="text-primary-fixed fill-none transition-all duration-1000 ease-linear drop-shadow-[0_0_10px_rgba(225,224,255,0.5)]"
          />
        </svg>
        <span className="absolute font-headline-xl text-[52px] text-on-surface tracking-tighter">{countdown}</span>
      </div>

      {/* Checklist */}
      <div className="w-full max-w-[600px] bg-surface-container-low/90 backdrop-blur-xl border border-primary/10 rounded-[20px] p-lg space-y-md text-left shadow-2xl mb-md">
        {[
          { text: 'NeoExamShield Extension Active', icon: 'verified_user' },
          { text: '0 Conflicting Extensions Detected', icon: 'extension_off' },
          { text: 'Session Authenticated Successfully', icon: 'lock_person' },
        ].map((item, idx) => (
          <div key={idx} className="flex items-center justify-between border-b border-surface-variant/50 last:border-0 pb-md last:pb-0 pt-sm first:pt-0">
            <div className="flex items-center gap-md">
              <div className="w-8 h-8 rounded-full bg-tertiary/10 flex items-center justify-center text-tertiary">
                <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
              </div>
              <span className="font-body-md text-body-md text-on-surface-variant">{item.text}</span>
            </div>
            <span className="font-label-md text-label-md text-tertiary tracking-widest uppercase">VERIFIED</span>
          </div>
        ))}
      </div>

      {/* Security Requirement / Action Button */}
      {countdown === 0 ? (
        <button
          onClick={onVerificationComplete}
          className="w-full max-w-[600px] py-md rounded-[16px] bg-primary hover:bg-primary-fixed text-on-primary font-headline-md text-headline-md shadow-[0_0_20px_rgba(192,193,255,0.3)] transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Enter Secure Fullscreen & Begin Test
        </button>
      ) : (
        <div className="w-full max-w-[600px] p-md rounded-[16px] bg-[#2A1718]/80 backdrop-blur-md border border-rose-400/20 text-left flex items-start gap-md">
          <span className="material-symbols-outlined text-[#FFA399] mt-1">warning</span>
          <div>
            <h4 className="font-label-md text-label-md text-[#FFA399] uppercase tracking-wider mb-xs">Security Requirement</h4>
            <p className="font-body-sm text-body-sm text-rose-500/80 leading-relaxed">Secure Fullscreen is required for this examination session. Navigating away or closing fullscreen will trigger a security violation event.</p>
          </div>
        </div>
      )}
    </div>
  );
}
