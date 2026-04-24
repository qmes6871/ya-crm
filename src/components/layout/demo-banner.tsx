"use client";

export function DemoBanner() {
  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-[56px] bg-gradient-to-r from-slate-900 to-teal-900 text-white">
      <div className="h-full max-w-screen-xl mx-auto px-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-teal-500/20 border border-teal-500/30 rounded-full text-xs font-semibold text-teal-300 flex-shrink-0">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            DEMO
          </span>
          <p className="text-sm text-white/80 truncate">
            <span className="hidden md:inline">이 페이지는 클라이언트의 요청사항에 맞춰 개발된 CRM입니다.</span>
            <span className="md:hidden">데모 체험 중입니다.</span>
          </p>
        </div>
        <a
          href="https://yasolu.com/crm/"
          target="_self"
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-1.5 bg-white text-slate-900 text-xs font-bold rounded-full hover:bg-teal-50 transition-colors"
        >
          와이에이솔루션으로 돌아가기
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </a>
      </div>
    </div>
  );
}
