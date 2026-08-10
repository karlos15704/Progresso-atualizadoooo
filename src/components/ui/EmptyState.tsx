import React from "react";
import { FolderOpen } from "lucide-react";
import { cn } from "../../lib/utils";

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = "Nenhum dado encontrado",
  description = "Não há registros disponíveis no momento para os filtros selecionados.",
  icon,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        "p-12 rounded-3xl bg-slate-900/60 border border-dashed border-slate-800 text-center space-y-4 flex flex-col items-center justify-center my-4",
        className
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 text-slate-500 flex items-center justify-center shadow-inner">
        {icon || <FolderOpen className="w-7 h-7 text-blue-400 animate-pulse" />}
      </div>

      <div className="space-y-1 max-w-sm">
        <h4 className="text-sm font-bold text-white font-display">{title}</h4>
        <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
      </div>

      {action && <div className="pt-2">{action}</div>}
    </div>
  );
};
