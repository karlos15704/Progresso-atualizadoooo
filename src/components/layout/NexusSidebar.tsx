import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Building2,
  BookOpen,
  FileText,
  BarChart3,
  Calendar,
  MessageSquare,
  Lock,
  SlidersHorizontal,
  FileSpreadsheet,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Award,
  Bell,
  Cpu,
  LogOut,
  Globe
} from "lucide-react";
import { cn } from "../../lib/utils";

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
  roles?: string[];
}

export interface NavCategory {
  category: string;
  items: NavItem[];
}

export interface NexusSidebarProps {
  currentView: string;
  onSelectView: (viewId: string) => void;
  userRole?: string;
  schoolName?: string;
  onGoHomeLanding?: () => void;
}

export const NexusSidebar: React.FC<NexusSidebarProps> = ({
  currentView,
  onSelectView,
  userRole = "professor",
  schoolName = "NexusEdu",
  onGoHomeLanding,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  const categories: NavCategory[] = [
    {
      category: "INÍCIO",
      items: [
        { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
      ],
    },
    {
      category: "GESTÃO ACADÊMICA",
      items: [
        { id: "alunos", label: "Alunos & Boletins", icon: <GraduationCap className="w-4 h-4" /> },
        { id: "professores", label: "Corpo Docente", icon: <Users className="w-4 h-4" />, roles: ["admin", "secretaria"] },
        { id: "turmas", label: "Turmas & Disciplinas", icon: <Building2 className="w-4 h-4" />, roles: ["admin", "secretaria"] },
      ],
    },
    {
      category: "PEDAGÓGICO",
      items: [
        { id: "banco_provas", label: "Banco de Provas", icon: <FileSpreadsheet className="w-4 h-4" /> },
        { id: "banco_atividades", label: "Banco de Exercícios", icon: <BookOpen className="w-4 h-4" /> },
        { id: "ia_auto_exam", label: "Gerador de Provas IA", icon: <Sparkles className="w-4 h-4 text-blue-400" /> },
        { id: "diario_classe", label: "Diário de Classe", icon: <FileText className="w-4 h-4" /> },
        { id: "relatorios", label: "Relatórios & Análises", icon: <BarChart3 className="w-4 h-4" /> },
      ],
    },
    {
      category: "COMUNICAÇÃO",
      items: [
        { id: "family_portal", label: "Portal da Família", icon: <Award className="w-4 h-4 text-cyan-400" /> },
        { id: "agenda_eletronica", label: "Agenda & Avisos", icon: <Calendar className="w-4 h-4" /> },
      ],
    },
    {
      category: "ADMINISTRAÇÃO",
      items: [
        { id: "admin", label: "Painel Gestor / TI", icon: <SlidersHorizontal className="w-4 h-4" />, roles: ["admin"] },
      ],
    },
  ];

  return (
    <aside
      className={cn(
        "relative z-40 bg-slate-950/95 border-r border-slate-800/80 flex flex-col justify-between transition-all duration-300 backdrop-blur-xl h-screen sticky top-0 select-none text-left print:hidden",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Sidebar Header / Brand Logo */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
        <div
          onClick={onGoHomeLanding}
          className="flex items-center gap-3 cursor-pointer group overflow-hidden"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 shrink-0 group-hover:scale-105 transition-transform">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-white font-display">
                Nexus<span className="text-blue-400">Edu</span>
              </span>
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 truncate max-w-[120px]">
                {schoolName}
              </span>
            </div>
          )}
        </div>

        {/* Collapse Toggle Button */}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav Menu Content */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {categories.map((cat, idx) => {
          const visibleItems = cat.items.filter(
            (item) => !item.roles || item.roles.includes(userRole.toLowerCase()) || userRole.toLowerCase() === "admin"
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={`cat-${idx}`} className="space-y-2">
              {!collapsed && (
                <span className="px-3 text-[9px] font-black uppercase tracking-widest text-slate-500 font-mono block">
                  {cat.category}
                </span>
              )}

              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectView(item.id)}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "w-full px-3 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer",
                        isActive
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/25"
                          : "text-slate-400 hover:text-slate-100 hover:bg-slate-900"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className={cn("shrink-0", isActive ? "text-white" : "text-slate-400")}>
                          {item.icon}
                        </span>
                        {!collapsed && <span>{item.label}</span>}
                      </div>

                      {!collapsed && item.badge && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sidebar Footer / Return to Public Site */}
      <div className="p-3 border-t border-slate-800/80">
        <button
          type="button"
          onClick={onGoHomeLanding}
          className={cn(
            "w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-blue-400 hover:text-blue-300 text-xs font-bold flex items-center transition-all cursor-pointer",
            collapsed ? "justify-center" : "gap-2.5"
          )}
          title="Ver Página Inicial do NexusEdu"
        >
          <Globe className="w-4 h-4 text-blue-400 shrink-0" />
          {!collapsed && <span>Página Inicial</span>}
        </button>
      </div>
    </aside>
  );
};
