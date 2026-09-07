import React, { useState } from 'react';

export default function ExamPlayer({ exam }: { exam: any }) {
  const [code, setCode] = useState(
    `class BalancedBST:\n    def __init__(self):\n        self.root = None\n\n    def insert(self, key):\n        # Implement balancing AVL or Red-Black insertion logic\n        pass`
  );
  
  const [showViolationModal, setShowViolationModal] = useState(true);

  return (
    <div className="flex flex-col absolute inset-0 bg-background z-[100]">
      {/* Test Bar Header */}
      <div className="h-[80px] bg-surface-container border-b border-primary/5 px-xl flex items-center justify-between shadow-md relative z-10">
        <div className="flex items-center gap-md">
          <div className="w-1 h-12 bg-tertiary rounded-full"></div>
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight leading-tight max-w-[300px] line-clamp-2">
              {exam?.title || 'Data Structures Midterm - CS202'}
            </h2>
            <div className="flex items-center gap-xs mt-1 text-on-surface-variant/80">
              <span className="material-symbols-outlined text-[14px]">visibility</span>
              <span className="font-body-sm text-[12px] leading-none">Proctored Session Active</span>
            </div>
          </div>
        </div>

        <div className="flex-1 flex justify-center">
          <div className="flex items-center gap-md w-[400px]">
            <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Progress</span>
            <div className="flex-1 h-2 bg-surface-variant rounded-full overflow-hidden">
              <div className="h-full bg-primary w-[26%] rounded-full"></div>
            </div>
            <span className="font-body-md text-on-surface-variant font-mono">4/15</span>
          </div>
        </div>

        <div className="flex items-center gap-md">
          <div className="flex items-center gap-sm font-headline-md text-headline-md text-[#FFA399]">
            <span className="material-symbols-outlined text-[24px]">timer</span>
            <span className="font-mono tracking-wider">00:42:15</span>
          </div>
          <button className="px-lg py-sm bg-primary hover:bg-primary-fixed text-on-primary font-label-md text-label-md rounded-lg ml-md">
            Submit Exam
          </button>
        </div>
      </div>

      {/* Split Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Problem Statement */}
        <div className="w-1/2 p-xl border-r border-primary/5 overflow-y-auto bg-surface relative">
          <div className="flex items-center justify-between mb-xl pb-md border-b border-surface-variant">
            <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest">Question 4</span>
            <span className="font-label-md text-[11px] uppercase px-2 py-0.5 rounded border bg-secondary/10 text-secondary border-secondary/20 tracking-wider">
              Medium
            </span>
          </div>
          <h1 className="font-headline-lg text-[32px] text-on-surface mb-lg leading-tight">Implementing a<br/>Balanced BST</h1>
          
          <div className="font-body-md text-body-md text-on-surface-variant/90 leading-relaxed space-y-md">
            <p>
              Write a Python class <code>BalancedBST</code> that implements a self-balancing binary search tree. The tree should support the following operations: insertion, deletion, and searching.
            </p>
            <p>
              Ensure that the tree remains balanced after every insertion and deletion operation to maintain an <code>O(log n)</code> time complexity for these operations.
            </p>
          </div>

          <div className="mt-xl pt-lg">
            <h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest mb-md">Constraints</h3>
            <div className="bg-surface-variant/30 p-md rounded-lg font-mono text-body-sm text-on-surface-variant border border-surface-variant/50">
              0 &le; key &le; 10^9<br/>
              Maximum 10^5 operations
            </div>
          </div>
        </div>

        {/* Right: Code Editor */}
        <div className="w-1/2 bg-[#0a0e18] flex flex-col relative">
          {/* Header toolbar for editor */}
          <div className="h-12 bg-surface-container-low border-b border-primary/5 flex items-center justify-between px-md">
             <div className="flex gap-2">
               <button className="px-3 py-1 bg-surface-variant text-on-surface-variant rounded text-[12px] font-mono">main.py</button>
             </div>
             <div className="flex items-center gap-sm">
                <button className="material-symbols-outlined text-on-surface-variant text-[18px] hover:text-on-surface">settings</button>
                <button className="material-symbols-outlined text-on-surface-variant text-[18px] hover:text-on-surface">fullscreen</button>
             </div>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full flex-1 bg-transparent font-mono text-[14px] text-primary-fixed outline-none resize-none leading-relaxed p-lg"
            spellCheck={false}
          />
          <div className="h-16 bg-surface-container-low border-t border-primary/5 flex items-center justify-end px-md gap-md">
            <button className="px-lg py-sm bg-surface-variant hover:bg-surface-bright text-on-surface-variant font-label-md text-label-md rounded-lg transition-colors border border-outline-variant/30">
              Run Code
            </button>
            <button className="px-lg py-sm bg-primary hover:bg-primary-fixed text-on-primary font-label-md text-label-md rounded-lg transition-colors">
              Submit Solution
            </button>
          </div>

          {/* Modal Overlay for Security Alert */}
          {showViolationModal && (
            <div className="absolute inset-0 bg-[#0b0f19]/80 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="bg-surface-container-low w-[480px] rounded-[24px] p-xl border border-rose-400/20 shadow-[0_0_50px_rgba(255,0,0,0.1)]">
                <div className="flex items-center gap-md mb-lg">
                  <span className="material-symbols-outlined text-rose-500 text-[32px]">warning</span>
                  <h2 className="font-headline-md text-headline-md text-[#FFA399]">Security Alert</h2>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant mb-xl leading-relaxed">
                  Caution: Window focus loss detected. Leaving the examination environment is strictly prohibited. Repeated violations will result in automatic session termination.
                </p>
                <button 
                  onClick={() => setShowViolationModal(false)}
                  className="w-full py-md bg-[#93000A] hover:bg-[#690005] text-[#FFDAD6] font-label-md text-label-md rounded-xl transition-colors border border-rose-400/30"
                >
                  Acknowledge & Return
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
