import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Bell,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Sparkles,
  Shield,
  GraduationCap,
  Globe,
  Settings,
  HelpCircle
} from "lucide-react";
import { cn } from "../../lib/utils";

export interface NexusHeaderProps {
  userName?: string;
  userRole?: string;
  schoolName?: string;
  onSignOut: () => void;
  onGoLanding?: () => void;
  onOpenNotifications?: () => void;
  unreadCount?: number;
}

export const NexusHeader: React.FC<NexusHeaderProps> = ({
  userName = "Antônio Carlos",
  userRole = "Professor",
  schoolName = "NexusEdu",
  onSignOut,
  onGoLanding,
  onOpenNotifications,
  unreadCount = 0,
}) => {
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 w-full bg-slate-950/85 border-b border-slate-800/80 backdrop-blur-xl px-4 sm:px-6 py-3 flex items-center justify-between gap-4 text-left select-none print:hidden">
      
      {/* Left Global Quick Search Bar */}
      <div className="relative w-full max-w-md hidden sm:block">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Pesquisa global por aluno, prova, diário..."
          className="w-full pl-10 pr-4 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-white placeholder:text-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-medium"
        />
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 ml-auto">
        
        {/* Public Landing Link Button */}
        {onGoLanding && (
          <button
            type="button"
            onClick={onGoLanding}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-blue-400 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Globe className="w-4 h-4" />
            <span className="hidden md:inline">Página Inicial</span>
          </button>
        )}

        {/* Notifications Icon Button */}
        <button
          type="button"
          onClick={onOpenNotifications}
          className="relative p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white font-mono text-[9px] font-black flex items-center justify-center border-2 border-slate-950">
              {unreadCount}
            </span>
          )}
        </button>

        {/* User Profile Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-3 p-1.5 pr-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-white leading-none font-display">{userName}</span>
              <span className="text-[10px] text-slate-400 font-medium capitalize">{userRole}</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${profileOpen ? "rotate-180 text-blue-400" : ""}`} />
          </button>

          {/* Profile Dropdown Menu */}
          <AnimatePresence>
            {profileOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-56 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50 text-left space-y-1 backdrop-blur-2xl"
              >
                <div className="p-3 border-b border-slate-800 space-y-1">
                  <strong className="text-xs text-white block">{userName}</strong>
                  <span className="text-[10px] text-blue-400 font-mono block">{schoolName}</span>
                </div>

                {onGoLanding && (
                  <button
                    type="button"
                    onClick={() => { setProfileOpen(false); onGoLanding(); }}
                    className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Globe className="w-4 h-4 text-blue-400" />
                    <span>Ver Página Inicial</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onSignOut}
                  className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/40 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-400" />
                  <span>Sair da Conta</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};
