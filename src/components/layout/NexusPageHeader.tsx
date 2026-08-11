import React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

export interface NexusPageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  icon?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
}

export const NexusPageHeader: React.FC<NexusPageHeaderProps> = ({
  title,
  subtitle,
  badge,
  icon,
  breadcrumbs = [{ label: "NexusEdu" }, { label: title }] as BreadcrumbItem[],
  actions,
  className,
}) => {
  return (
    <div
      className={cn(
        "p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-xl relative flex flex-col md:flex-row md:items-center justify-between gap-6 text-left overflow-hidden mb-6 print:hidden",
        className
      )}
    >
      {/* Background Subtle Tech Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[80px] pointer-events-none" />

      <div className="space-y-3 relative z-10">
        {/* Breadcrumb Hierarchy */}
        {breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-600" />}
                {crumb.onClick ? (
                  <button
                    type="button"
                    onClick={crumb.onClick}
                    className="hover:text-blue-400 transition-colors cursor-pointer"
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span className={idx === breadcrumbs.length - 1 ? "text-blue-400 font-black" : ""}>
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-4">
          {icon && (
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shadow-lg shrink-0">
              {icon}
            </div>
          )}

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-white font-display tracking-tight">
                {title}
              </h1>
              {badge && (
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                  {badge}
                </span>
              )}
            </div>
            {subtitle && <p className="text-xs text-slate-400 max-w-2xl font-normal leading-relaxed">{subtitle}</p>}
          </div>
        </div>
      </div>

      {actions && <div className="relative z-10 flex flex-wrap items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
};
