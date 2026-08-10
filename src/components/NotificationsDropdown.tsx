import React, { useMemo, useState } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NotificationsDropdownProps {
  exams: any[];
  readAnnouncements: string[];
  user: any;
  userProfile: any;
  isAdmin: boolean;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClose: () => void;
  setView: (view: any) => void;
}

function getRelativeTime(dateString?: string) {
  if (!dateString) return 'há alguns instantes';
  try {
    const diffMs = Date.now() - new Date(dateString).getTime();
    if (diffMs < 0) return 'agora mesmo';
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'agora mesmo';
    if (diffMins < 60) return `há ${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `há ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `há ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`;
    const diffMonths = Math.floor(diffDays / 30);
    return `há ${diffMonths} ${diffMonths === 1 ? 'mês' : 'meses'}`;
  } catch {
    return 'há alguns dias';
  }
}

export const NotificationsDropdown: React.FC<NotificationsDropdownProps> = ({
  exams,
  readAnnouncements,
  user,
  userProfile,
  isAdmin,
  onMarkAsRead,
  onMarkAllAsRead,
  onClose,
  setView
}) => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Ground database announcements with nice high fidelity placeholders to guarantee UI alignment with the image
  const baseNotifications = useMemo(() => {
    // Generate base database notifications
    return exams.filter(e => {
      if (e.deletedAt) return false;
      const hasQuestions = Array.isArray(e.questions) && e.questions.length > 0;
      const isAnn = (e.isAnnouncement || e.examType === 'Recado' || e.exam_type === 'Recado' || e.subject === 'Coordenação' || (e.answerKey?._metadata?.isAnnouncement === true) || (e.answer_key?._metadata?.isAnnouncement === true)) && !hasQuestions;
      if (!isAnn) return false;
      if (e.title && e.title.toLowerCase().includes('teste')) return false;

      const meta = e.answerKey?._metadata || e.answer_key?._metadata || {};
      const targetId = meta.targetProfessorId;
      
      return targetId === user?.id || (userProfile && targetId === userProfile.uid);
    }).map(ann => {
      const meta = ann.answerKey?._metadata || ann.answer_key?._metadata || {};
      const isSimuladoOrAvaliacao = ann.title?.toLowerCase().includes('simulado') || ann.title?.toLowerCase().includes('avaliação') || ann.title?.toLowerCase().includes('avaliacao') || false;
      return {
        id: ann.id,
        title: ann.title || 'Aviso da Coordenação',
        content: ann.content || ann.study_guide || 'Novo informe disponível no portal docente.',
        created_at: ann.createdAt || ann.created_at || new Date().toISOString(),
        isSpecialColor: isSimuladoOrAvaliacao,
        isDb: true
      };
    });
  }, [exams, isAdmin, user, userProfile]);

  // Map to structured display items with real read tracking
  const notificationItems = useMemo(() => {
    return baseNotifications.map(n => ({
      ...n,
      isUnread: !readAnnouncements.includes(n.id)
    })).sort((a, b) => {
      // Keep unread first, then sort by date
      if (a.isUnread !== b.isUnread) {
        return a.isUnread ? -1 : 1;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [baseNotifications, readAnnouncements]);

  const filteredItems = useMemo(() => {
    if (filter === 'unread') {
      return notificationItems.filter(item => item.isUnread);
    }
    return notificationItems;
  }, [notificationItems, filter]);

  const unreadCount = useMemo(() => {
    return notificationItems.filter(item => item.isUnread).length;
  }, [notificationItems]);

  const handleItemClick = (item: any) => {
    if (item.isUnread) {
      onMarkAsRead(item.id);
    }
    setView('agenda');
    onClose();
  };

  const handleMarkAll = () => {
    onMarkAllAsRead();
  };

  return (
    <>
      {/* Dropdown Container */}
      <motion.div 
        id="notifications-dropdown-card"
        initial={{ opacity: 0, y: 15, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 15, scale: 0.95 }}
        transition={{ type: 'spring', duration: 0.3 }}
        className="fixed sm:absolute top-[85px] sm:top-auto left-4 sm:left-auto right-4 sm:right-0 mt-0 sm:mt-3 w-auto sm:w-[410px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-[0_20px_50px_rgba(15,23,42,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] z-50 overflow-hidden font-sans select-none"
      >
        {/* Header Block */}
        <div className="p-5 pb-4 flex items-center justify-between">
          <h3 className="text-slate-800 dark:text-slate-100 font-extrabold text-base xs:text-lg tracking-tight">
            Notificações
          </h3>
          {unreadCount > 0 && (
            <button 
              onClick={handleMarkAll}
              className="text-slate-700 dark:text-slate-400 font-semibold text-xs xs:text-sm hover:text-slate-700 dark:text-slate-200 dark:hover:text-white hover:underline transition-colors cursor-pointer"
            >
              Marcar todas como lidas
            </button>
          )}
        </div>

        {/* Filters Row */}
        <div className="px-5 pb-4 flex items-center gap-2">
          {/* Active Filter: "Todas" */}
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-1.5 rounded-full text-[12px] font-bold tracking-tight transition-all cursor-pointer ${
              filter === 'all' 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60'
                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            Todas
          </button>

          {/* Active Filter: "Não lidas" pill with blue counter */}
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1.5 rounded-full text-[12px] font-bold tracking-tight transition-all cursor-pointer flex items-center gap-2 ${
              filter === 'unread'
                ? 'border border-blue-200 bg-blue-50/50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-400'
                : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-400'
            }`}
          >
            {unreadCount > 0 && (
              <span className="bg-[#1a73e8] text-white text-[10px] font-black leading-none rounded-full w-4.5 h-4.5 flex items-center justify-center animate-scale-in shrink-0">
                {unreadCount}
              </span>
            )}
            <span>Não lidas</span>
          </button>
        </div>

        {/* Scrollable Notifications List */}
        <div className="max-h-[290px] xs:max-h-[350px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 scrollbar-thin scrollbar-thumb-slate-250 border-t border-slate-200 dark:border-slate-800/60">
          <AnimatePresence initial={false}>
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => handleItemClick(item)}
                  className={`flex items-start gap-3.5 p-4 relative cursor-pointer hover:bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200/ dark:hover:bg-slate-800/30 transition-all duration-200 ${
                    item.isUnread ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200/ dark:bg-slate-900/40' : ''
                  }`}
                >
                  {/* Left Icon Badge: Rounded Light Green containing Bell */}
                  <div className="bg-[#e6f4ea] dark:bg-emerald-950/50 text-[#137333] dark:text-emerald-400 p-2.5 rounded-full flex items-center justify-center shrink-0">
                    <Bell className="w-4 h-4" />
                  </div>

                  {/* Middle Text Blocks */}
                  <div className="flex-1 min-w-0 pr-4">
                    {/* Notification Title */}
                    <h4 className={`text-[13px] font-bold leading-snug tracking-normal ${
                      item.isSpecialColor 
                        ? 'text-[#137333] dark:text-emerald-400' 
                        : 'text-slate-700 dark:text-slate-100'
                    }`}>
                      {item.title}
                    </h4>

                    {/* Excerpt Content */}
                    <p className="text-[11px] text-slate-700 dark:text-slate-400 font-sans font-medium leading-relaxed mt-1 line-clamp-2">
                      {item.content}
                    </p>

                    {/* Elapsed Time Label */}
                    <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300 mt-1.5 block">
                      {getRelativeTime(item.created_at)}
                    </span>
                  </div>

                  {/* Right Status Dot: Bright Red Circle for Unread status */}
                  {item.isUnread && (
                    <span className="absolute right-4.5 top-4.5 w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                  )}
                </motion.div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-600 dark:text-slate-300 text-xs">
                Nenhuma notificação encontrada no momento.
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer/Go to Central */}
        <div className="bg-slate-50 dark:bg-slate-900/50 p-3 text-center border-t border-slate-200 dark:border-slate-800/60">
          <button 
            onClick={() => { setView('agenda'); onClose(); }}
            className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 tracking-tight"
          >
            Abrir agenda eletrônica
          </button>
        </div>
      </motion.div>
    </>
  );
};
