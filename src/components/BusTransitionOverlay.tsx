import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Cpu, ShieldCheck, GraduationCap, Zap, Layers } from 'lucide-react';

interface BusTransitionOverlayProps {
  view: string;
  isVisible: boolean;
}

interface ViewThemeConfig {
  title: string;
  subtitle: string;
  badge: string;
  accentColor: string;
  icon: React.ElementType;
}

export function BusTransitionOverlay({ view, isVisible }: BusTransitionOverlayProps) {
  const config = useMemo<ViewThemeConfig>(() => {
    switch (view) {
      case 'dashboard':
        return {
          title: "NextEdu Cloud Engine",
          subtitle: "Carregando ecossistema de gestão pedagógica...",
          badge: "Painel Geral 360°",
          accentColor: "from-cyan-500 to-blue-600",
          icon: Cpu
        };
      case 'comunicados':
        return {
          title: "NextEdu Connect",
          subtitle: "Sincronizando mural e notificações virtuais...",
          badge: "Mural Digital",
          accentColor: "from-blue-500 to-indigo-600",
          icon: Sparkles
        };
      case 'create':
        return {
          title: "NextEdu Exam Studio",
          subtitle: "Inicializando motor de criação e diagramação inteligente...",
          badge: "Estúdio de Provas",
          accentColor: "from-indigo-500 to-purple-600",
          icon: Layers
        };
      case 'banco_provas':
        return {
          title: "NextEdu Vault",
          subtitle: "Acessando acervo de exames com criptografia end-to-end...",
          badge: "Repositório Seguro",
          accentColor: "from-emerald-500 to-teal-600",
          icon: ShieldCheck
        };
      case 'studentReports':
        return {
          title: "NextEdu Analytics",
          subtitle: "Processando métricas e diagnósticos acadêmicos...",
          badge: "Relatórios & IA",
          accentColor: "from-cyan-400 to-emerald-500",
          icon: Zap
        };
      case 'diary':
        return {
          title: "NextEdu Diário de Classe",
          subtitle: "Carregando frequências, ocorrências e notas...",
          badge: "Diário Digital",
          accentColor: "from-teal-500 to-cyan-600",
          icon: GraduationCap
        };
      default:
        return {
          title: "NextEdu Platform",
          subtitle: "Inicializando módulos do sistema escolar...",
          badge: "EdTech SaaS",
          accentColor: "from-cyan-500 to-blue-600",
          icon: Sparkles
        };
    }
  }, [view]);

  const Icon = config.icon;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[99999] bg-[#070b14]/90 backdrop-blur-xl flex flex-col items-center justify-center overflow-hidden pointer-events-none select-none"
        >
          {/* Glowing Ambient Backdrop */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col items-center space-y-6 max-w-sm text-center px-4">
            {/* Tech Logo Badge */}
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="relative p-3.5 rounded-2xl bg-slate-900/90 border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.25)] flex items-center justify-center"
            >
              <div className={`p-3 rounded-xl bg-gradient-to-r ${config.accentColor} text-white shadow-lg`}>
                <Icon className="w-7 h-7 animate-pulse" />
              </div>
            </motion.div>

            {/* Title & Badge */}
            <div className="space-y-1.5">
              <span className="inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.25em] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                {config.badge}
              </span>
              <h3 className="text-lg font-black font-display text-white uppercase tracking-wider">
                {config.title}
              </h3>
              <p className="text-[11px] font-medium text-slate-400 tracking-wide max-w-xs mx-auto">
                {config.subtitle}
              </p>
            </div>

            {/* Glowing Neon Loader Bar */}
            <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden relative border border-slate-700/50">
              <motion.div 
                className={`h-full bg-gradient-to-r ${config.accentColor} shadow-[0_0_12px_rgba(6,182,212,0.8)]`}
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
