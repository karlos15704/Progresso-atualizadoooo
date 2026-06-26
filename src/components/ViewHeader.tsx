import React from 'react';
import { motion } from 'motion/react';

interface ViewHeaderProps {
  title: string;
  subtitle: string;
  badge?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export function ViewHeader({ title, subtitle, badge, icon, children }: ViewHeaderProps) {
  return (
    <div className="print:hidden bg-slate-950 p-5 md:p-6 rounded-3xl shadow-xl relative flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-200 dark:border-slate-800/80 mb-6 text-left">
      {/* Radial-mesh texture */}
      <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'radial-gradient(rgba(212,175,55,0.3) 1px, transparent 1px)', backgroundSize: '14px 14px' }} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_120%,rgba(168,141,68,0.12),transparent_40%)]" />
      </div>
      
      <div className="flex items-center gap-4 relative z-10">
        {icon && (
          <div className="bg-[#a88d44]/10 border border-[#a88d44]/30 p-3 rounded-2xl text-gold shadow-lg shrink-0">
            {icon}
          </div>
        )}
        <div className="space-y-1">
          {badge && (
            <div className="mb-1">
              <span className="inline-flex text-[8px] font-black text-[#d4af37] bg-amber-950/40 border border-[#d4af37]/35 px-2.5 py-0.5 rounded-full uppercase tracking-[0.2em] font-mono select-none">
                {badge}
              </span>
            </div>
          )}
          <h2 className="text-lg md:text-xl font-display font-black uppercase tracking-tight leading-none text-white">
            {title}
          </h2>
          <p className="text-[11px] md:text-xs text-slate-600 dark:text-slate-400 font-medium font-sans text-slate-600 dark:text-slate-400">
            {subtitle}
          </p>
        </div>
      </div>
      
      {children && (
        <div className="relative z-10 flex flex-wrap gap-2.5 items-center justify-start md:justify-end">
          {children}
        </div>
      )}
    </div>
  );
}
