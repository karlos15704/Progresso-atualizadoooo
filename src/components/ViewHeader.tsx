import React from "react";
import { NexusPageHeader } from "./layout/NexusPageHeader";

interface ViewHeaderProps {
  title: string;
  subtitle: string;
  badge?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export function ViewHeader({ title, subtitle, badge, icon, children }: ViewHeaderProps) {
  return (
    <NexusPageHeader
      title={title}
      subtitle={subtitle}
      badge={badge}
      icon={icon}
      actions={
        <>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Deseja voltar para a Página Inicial do NexusEdu?")) {
                localStorage.removeItem("cps_offline_user");
                window.location.reload();
              }
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-blue-400 hover:text-blue-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Voltar para a Landing Page Inicial"
          >
            <span>🌐 Início NexusEdu</span>
          </button>
          {children}
        </>
      }
    />
  );
}
