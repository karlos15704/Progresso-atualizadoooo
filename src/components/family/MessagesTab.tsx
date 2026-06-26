import React from 'react';
import { motion } from 'motion/react';
import { 
  MessageSquare, 
  Search, 
  Plus, 
  ArrowLeft, 
  Send, 
  User, 
  PlusCircle, 
  CheckCircle2, 
  MessageCircle,
  BookOpen,
  Bell,
  AlertTriangle,
  DollarSign,
  Calendar,
  ShieldCheck,
  Paperclip,
  X,
  FileText,
  Loader2,
  CheckCheck
} from 'lucide-react';
import { Student } from '../../types';
import { cn } from '../../lib/utils';

interface MessagesTabProps {
  student: Student;
  messages: any[];
  isComposing: boolean;
  setIsComposing: (val: boolean) => void;
  selectedMessage: any | null;
  setSelectedMessage: (msg: any | null) => void;
  messageSearch: string;
  setMessageSearch: (val: string) => void;
  messageFilter: 'all' | 'unread' | 'sent';
  setMessageFilter: (val: 'all' | 'unread' | 'sent') => void;
  filteredMessages: any[];
  messageSubject: string;
  setMessageSubject: (val: string) => void;
  messageProvider: string;
  setMessageProvider: (val: string) => void;
  messageStatus: 'idle' | 'sending' | 'success';
  onSendMessage: (e: React.FormEvent) => void;
  availableClassSubjectsAndProfessors: any[];
  replyBody: string;
  setReplyBody: (val: string) => void;
  onSendReply: () => void;
  onSignMessage?: (messageId: string, guardianName: string) => void;
  portalRole?: 'aluno' | 'responsavel';
  composeAttachments?: any[];
  setComposeAttachments?: React.Dispatch<React.SetStateAction<any[]>>;
  replyAttachments?: any[];
  setReplyAttachments?: React.Dispatch<React.SetStateAction<any[]>>;
  setPreviewImage?: (val: string | null) => void;
}

export function MessagesTab({
  student,
  messages,
  isComposing,
  setIsComposing,
  selectedMessage,
  setSelectedMessage,
  messageSearch,
  setMessageSearch,
  messageFilter,
  setMessageFilter,
  filteredMessages,
  messageSubject,
  setMessageSubject,
  messageProvider,
  setMessageProvider,
  messageStatus,
  onSendMessage,
  availableClassSubjectsAndProfessors,
  replyBody,
  setReplyBody,
  onSendReply,
  onSignMessage,
  composeAttachments = [],
  setComposeAttachments,
  replyAttachments = [],
  setReplyAttachments,
  setPreviewImage,
}: MessagesTabProps) {
  // Preset quick reply suggestions to make user interaction extremely easy & friendly
  const quickRepliesArr = [
    "Obrigado/a pelas informações!",
    "Tudo bem, estou ciente.",
    "Entendido. Vou agendar uma conversa esta semana.",
    "Agradeço o retorno!"
  ];

  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');

  const getCategoryDetails = (category?: string) => {
    switch (category) {
      case 'academic':
        return { label: 'Acadêmico', color: 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-205 dark:border-blue-900/50', icon: BookOpen };
      case 'behavior':
        return { label: 'Comportamento', color: 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-205 dark:border-amber-900/50', icon: AlertTriangle };
      case 'financial':
        return { label: 'Financeiro', color: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-205 dark:border-emerald-900/50', icon: DollarSign };
      case 'event':
        return { label: 'Evento', color: 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-205 dark:border-indigo-900/50', icon: Calendar };
      case 'circular':
      default:
        return { label: 'Comunicado', color: 'bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 border-purple-205 dark:border-purple-900/50', icon: Bell };
    }
  };

  const isSignedByFamily = (msg: any) => {
    if (!msg.requiresSignature) return true;
    return Array.isArray(msg.signatures) && msg.signatures.some((sig: any) => sig.studentName?.toLowerCase() === student.name?.toLowerCase());
  };

  const finalFilteredMessages = React.useMemo(() => {
    if (selectedCategory === 'all') return filteredMessages;
    return filteredMessages.filter(m => m.category === selectedCategory);
  }, [filteredMessages, selectedCategory]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-[calc(100vh-140px)] md:h-[calc(100vh-210px)] flex gap-4 md:gap-5 overflow-hidden font-sans"
    >
      
      {/* MESSAGE LIST SIDEBAR (Left section in desktop, hidden in mobile if reading/writing message) */}
      <div className={cn(
        "w-full md:w-80 shrink-0 flex flex-col h-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 dark:bg-[#0b0f19] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm",
        (isComposing || selectedMessage) ? "hidden md:flex" : "flex"
      )}>
        {/* Header toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800/80 space-y-3 shrink-0">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-display font-black text-slate-800 dark:text-slate-100 dark:text-white">Central de Atendimento</h3>
            <button 
              onClick={() => { setIsComposing(true); setSelectedMessage(null); }}
              className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center transition-all shadow-md shadow-indigo-600/10"
              title="Novo Atendimento"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Search bar inside header */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar atendimentos..."
              value={messageSearch}
              onChange={(e) => setMessageSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-600 outline-none text-slate-800 dark:text-slate-100 dark:text-slate-900 dark:text-white"
            />
          </div>

          {/* Filter subtabs */}
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
            <button 
              onClick={() => setMessageFilter('all')}
              className={cn(
                "flex-1 py-1 rounded-lg text-[10px] font-bold transition-all text-center", 
                messageFilter === 'all' 
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                  : "text-slate-700 dark:text-slate-300"
              )}
            >
              Todas
            </button>
            <button 
              onClick={() => setMessageFilter('unread')}
              className={cn(
                "flex-1 py-1 rounded-lg text-[10px] font-bold transition-all text-center", 
                messageFilter === 'unread' 
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                  : "text-slate-700 dark:text-slate-300"
              )}
            >
              Pendentes / Respostas
            </button>
          </div>

          {/* Category pills filter */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none select-none">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'academic', label: 'Acadêmico' },
              { id: 'circular', label: 'Comunicados' },
              { id: 'behavior', label: 'Comportamento' },
              { id: 'financial', label: 'Financeiro' },
              { id: 'event', label: 'Eventos' }
            ].map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wider transition-all border whitespace-nowrap shrink-0",
                  selectedCategory === cat.id
                    ? "bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 border-transparent shadow-sm"
                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800/85 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Message scroll list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {finalFilteredMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 dark:text-slate-400 p-6 text-center gap-2">
              <MessageSquare className="w-8 h-8 text-slate-700 dark:text-slate-300" />
              <p className="text-xs font-semibold">Nenhuma mensagem registrada</p>
              <p className="text-[10px] text-slate-600 dark:text-slate-400 self-stretch">Nenhum atendimento ou comunicado para esta categoria.</p>
            </div>
          ) : (
            finalFilteredMessages.map((item) => {
              const isActive = selectedMessage?.id === item.id;
              const hasUnsigned = item.requiresSignature && !isSignedByFamily(item);
              const catDetails = getCategoryDetails(item.category);
              const CatIcon = catDetails.icon;

              return (
                <div 
                  key={item.id}
                  onClick={() => { setSelectedMessage(item); setIsComposing(false); }}
                  className={cn(
                    "p-3.5 rounded-xl border transition-all cursor-pointer text-left space-y-2 relative overflow-hidden",
                    isActive 
                      ? "bg-slate-50 dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-950 shadow-sm"
                      : "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 dark:bg-[#0b0f19] border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200/ dark:hover:bg-slate-900/40 text-slate-800 dark:text-slate-100",
                    hasUnsigned && !isActive && "border-l-4 border-l-rose-500"
                  )}
                >
                  <div className="flex justify-between items-center">
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border flex items-center gap-1",
                      catDetails.color
                    )}>
                      <CatIcon className="w-2.5 h-2.5" />
                      {catDetails.label}
                    </span>
                    <span className="text-[8px] font-bold font-mono text-slate-600 dark:text-slate-400 tracking-wider">
                      {new Date(item.date).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  <div className="flex justify-between items-start gap-2">
                    <span className="font-extrabold text-xs truncate max-w-[150px]">{item.subject}</span>
                  </div>
                  
                  <p className="text-xs text-slate-700 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {item.content || item.body}
                  </p>

                  <div className="flex justify-between items-center text-[10px] pt-1">
                    <div className="flex gap-1.5 items-center">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[8px]",
                        item.status === 'Respondida' ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400" : "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400"
                      )}>
                        {item.status}
                      </span>
                      {item.requiresSignature && (
                        <span className={cn(
                          "px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[8px] flex items-center gap-0.5",
                          !hasUnsigned
                            ? "bg-emerald-100/70 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                            : "bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 animate-pulse"
                        )}>
                          {!hasUnsigned ? "✓ Ciente" : "⚠️ Assinar"}
                        </span>
                      )}
                    </div>
                    {item.replies?.length > 0 && (
                      <span className="text-[9px] text-slate-600 dark:text-slate-400 font-bold">{item.replies.length} interação(ões)</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MESSAGE DETAILS VIEW OR NEW FORM COMPOSING */}
      <div className={cn(
        "flex-1 h-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 dark:bg-[#0b0f19] rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden shadow-sm",
        (!isComposing && !selectedMessage) ? "hidden md:flex" : "flex"
      )}>
        
        {/* Empty State */}
        {!isComposing && !selectedMessage && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 flex items-center justify-center">
              <MessageSquare className="w-8 h-8" />
            </div>
            <div className="space-y-1.5 max-w-sm">
              <h4 className="font-display font-bold text-slate-800 dark:text-slate-100 text-lg">Central de Atendimento</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">Selecione uma conversa ou crie um novo atendimento para resolver suas dúvidas com a equipe acadêmica, de forma fácil e moderna.</p>
            </div>
            <button 
              onClick={() => setIsComposing(true)}
              className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-650/15"
            >
              Iniciar Atendimento Online
            </button>
          </div>
        )}

        {/* Composing From - Concierge Style */}
        {isComposing && (
          <form onSubmit={onSendMessage} className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200/ dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <button 
                  type="button"
                  onClick={() => setIsComposing(false)} 
                  className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300 md:hidden transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h4 className="font-display font-bold text-slate-800 dark:text-slate-100 dark:text-white">Direcionar Novo Atendimento</h4>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400">Escolha o setor do colégio ideal para seu questionamento.</p>
                </div>
              </div>
            </div>

            {/* Inputs Layout */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                  Setor / Canal Destinatário
                </label>
                <select 
                  value={messageSubject}
                  onChange={(e) => setMessageSubject(e.target.value)}
                  className="w-full p-3.5 border rounded-xl sm: cursor-pointer font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
                >
                  <optgroup label="Canais Principais">
                    <option value="coord_responsavel">Coordenação Pedagógica Curricular (Ano: {student.classId})</option>
                    <option value="secretaria">Secretaria Geral / Tesouraria Administradora</option>
                  </optgroup>

                  {availableClassSubjectsAndProfessors.length > 0 && (
                    <optgroup label="Docentes de Matérias">
                      {availableClassSubjectsAndProfessors.map((item) => (
                        <option 
                          key={`${item.id}-${item.subject}`} 
                          value={`teacher_subject:${item.id}:${item.subject}:${item.professorName}`}
                        >
                          {item.subject} — {item.professorName}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                  Escreva os detalhes ou solicitação
                </label>
                <textarea 
                  value={messageProvider}
                  onChange={(e) => setMessageProvider(e.target.value)}
                  placeholder="Olá Professor(a), gostaria de esclarecer dúvidas sobre a data da prova mensal pendente..."
                  className="w-full p-4 h-60 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none text-xs sm:text-sm dark:text-slate-900 dark:text-white resize-none"
                  required
                />
              </div>

              {/* Attachments Section in Compose */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/50">
                <div className="flex items-center gap-3">
                  <button 
                    type="button"
                    onClick={() => document.getElementById('compose-portal-file-input')?.click()}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 bg-slate-50 dark:bg-slate-900/50 px-3 py-1.5 rounded-full transition-colors border border-slate-200 dark:border-slate-800 cursor-pointer"
                  >
                    <Paperclip className="w-3.5 h-3.5" /> Anexar Fotos / Vídeos / Arquivos
                  </button>
                  <input 
                    id="compose-portal-file-input"
                    type="file"
                    multiple
                    className="hidden"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []) as File[];
                      const newAttachments = [];
                      for (const f of files) {
                        try {
                          const reader = new FileReader();
                          const base64Data = await new Promise((resolve, reject) => {
                            reader.readAsDataURL(f);
                            reader.onload = () => resolve(reader.result as string);
                            reader.onerror = error => reject(error);
                          }) as string;

                          const uploadRes = await fetch("/api/agenda/upload", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              fileBase64: base64Data,
                              filename: f.name,
                              filetype: f.type
                            })
                          });
                          if (!uploadRes.ok) throw new Error("Upload failed");
                          const uploadData = await uploadRes.json();
                          if (uploadData.success) {
                            newAttachments.push({ 
                              name: f.name, 
                              size: f.size, 
                              type: f.type, 
                              url: uploadData.url 
                            });
                          }
                        } catch(err) {
                          console.error("Error uploading file:", err);
                          alert("Erro ao enviar arquivo: " + f.name);
                        }
                      }
                      if (setComposeAttachments) {
                        setComposeAttachments(prev => [...prev, ...newAttachments]);
                      }
                    }}
                  />
                </div>
                
                {composeAttachments && composeAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {composeAttachments.map((file: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm animate-in fade-in zoom-in-95 group">
                        <div className="w-6 h-6 rounded flex items-center justify-center bg-indigo-50 dark:bg-indigo-900/30">
                          <FileText className="w-3.5 h-3.5 text-indigo-500" />
                        </div>
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[150px]">{file.name}</span>
                        <button 
                          type="button"
                          onClick={() => {
                            if (setComposeAttachments) {
                              setComposeAttachments(prev => prev.filter((_, idx) => idx !== i));
                            }
                          }}
                          className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-rose-100 hover:text-rose-600 text-slate-400 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Form controls */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setIsComposing(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                disabled={messageStatus === 'sending' || !messageProvider.trim()}
                className="w-full sm:w-auto px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 disabled:opacity-55"
              >
                <Send className="w-3.5 h-3.5" />
                {messageStatus === 'sending' ? "Enviando..." : "Enviar Atendimento"}
              </button>
            </div>
          </form>
        )}

        {/* Message Details Chat Timeline flow */}
        {selectedMessage && !isComposing && (
          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* Header Details */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-200/30 dark:bg-slate-900/20">
              <div className="flex items-center gap-3 min-w-0">
                <button 
                  onClick={() => setSelectedMessage(null)} 
                  className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300 md:hidden transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="truncate">
                  <h4 className="font-display font-bold text-slate-800 dark:text-slate-100 dark:text-white truncate">{selectedMessage.subject}</h4>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 font-mono">Iniciado em: {new Date(selectedMessage.date).toLocaleString('pt-BR')}</p>
                </div>
              </div>
              <span className="w-full sm:w-auto px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 shrink-0">
                {selectedMessage.status}
              </span>
            </div>

            {/* Bubble logs */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200/ dark:bg-[#080b15]">
              
              {/* Original Post */}
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 font-extrabold text-sm border border-indigo-200/30">
                  {selectedMessage.isFromFamily ? 'F' : 'C'}
                </div>
                <div className="space-y-1 flex-1 min-w-0 max-w-[85%]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      {selectedMessage.isFromFamily ? 'Sua Mensagem (Família)' : selectedMessage.senderName || 'Colégio'}
                    </span>
                    <span className="text-[9px] text-slate-600 dark:text-slate-400 font-mono">
                      {new Date(selectedMessage.date).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-none shadow-sm space-y-3">
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">
                      {selectedMessage.content || selectedMessage.body}
                    </p>

                    {/* Original Message Attachments */}
                    {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedMessage.attachments.map((file: any, i: number) => {
                          const fileUrl = file.data || file.url; 
                          const isImage = Boolean(fileUrl) && (file.type?.startsWith('image/') || fileUrl?.startsWith('data:image/') || fileUrl?.match(/\.(jpeg|jpg|gif|png|bmp|webp|svg)$/i) || fileUrl?.includes('firebasestorage.googleapis.com') || fileUrl?.includes('unsplash') || fileUrl?.startsWith('data:application/octet-stream') || fileUrl?.startsWith('http'));
                          const isVideo = Boolean(fileUrl) && (file.type?.startsWith('video/') || fileUrl?.match(/\.(mp4|webm|ogg|mov)$/i));
                          
                          if (isImage) {
                            return (
                              <div key={i} className="relative group cursor-pointer w-24 h-24 rounded-lg overflow-hidden border border-black/10" onClick={() => setPreviewImage?.(fileUrl)}>
                                <img src={fileUrl} alt={file.name} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <span className="text-[10px] text-white font-bold tracking-wider">AMPLIAR</span>
                                </div>
                              </div>
                            );
                          }
                          if (isVideo) {
                            return (
                              <div key={i} className="relative group w-48 h-24 rounded-lg overflow-hidden border border-black/10">
                                <video src={fileUrl} controls className="w-full h-full object-cover" />
                              </div>
                            );
                          }
                          return (
                            <a key={i} href={fileUrl} download={file.name} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-2 py-1 bg-black/5 dark:bg-black/20 rounded-lg max-w-full hover:bg-black/10 transition-colors">
                              <Paperclip className="w-3 h-3 text-indigo-500 shrink-0" />
                              <span className="text-[10px] text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{file.name}</span>
                            </a>
                          );
                        })}
                      </div>
                    )}

                    {/* Ciente Digital Confirmation Block */}
                    {selectedMessage.requiresSignature && (
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                        {isSignedByFamily(selectedMessage) ? (
                          (() => {
                            const sig = selectedMessage.signatures?.find((s: any) => s.studentName?.toLowerCase() === student.name?.toLowerCase());
                            return (
                              <div className="flex items-center gap-2.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40 p-3 rounded-xl text-left">
                                <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                                <div className="text-[11px] leading-tight">
                                  <span className="font-extrabold block">CIENTE DIGITAL CONFIRMADO</span>
                                  <span>Assinado por <strong>{sig?.guardianName || student.guardianName || 'Responsável'}</strong> em {sig?.date ? new Date(sig.date).toLocaleString('pt-BR') : new Date().toLocaleDateString('pt-BR')}</span>
                                </div>
                              </div>
                            );
                          })()
                        ) : (
                          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl space-y-3 text-left">
                            <div className="flex items-start gap-2 text-rose-600 dark:text-rose-400">
                              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 animate-pulse" />
                              <div className="text-[11px] font-medium leading-tight">
                                <span className="font-extrabold block">ESTE COMUNICADO REQUER CONFIRMAÇÃO</span>
                                <span className="text-slate-750 dark:text-slate-400">Por favor, assine eletronicamente abaixo para registrar sua ciência de leitura.</span>
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <input 
                                type="text"
                                id="guardian-signature-input"
                                placeholder="Seu nome completo (Responsável)"
                                defaultValue={student.guardianName || ''}
                                className="flex-1 px-3 py-2 bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const inputEl = document.getElementById('guardian-signature-input') as HTMLInputElement;
                                  const name = inputEl?.value?.trim();
                                  if (!name) {
                                    alert("Por favor, digite seu nome completo para assinar.");
                                    return;
                                  }
                                  onSignMessage?.(selectedMessage.id, name);
                                }}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black uppercase tracking-wider shrink-0 transition-colors cursor-pointer"
                              >
                                Dar Ciente
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Replies */}
              {selectedMessage.replies?.map((reply: any) => {
                const isFamily = reply.senderName === "Família" || 
                  reply.senderName.includes("Família") || 
                  reply.senderName.includes("Mãe") || 
                  reply.senderName.includes("Pai") || 
                  reply.senderName.includes("Responsável") || 
                  (student.guardianName && reply.senderName.includes(student.guardianName)) || 
                  reply.senderName.includes(student.name.split(" ")[0]);
                return (
                  <div 
                    key={reply.id} 
                    className={cn("flex gap-3", isFamily ? "flex-row" : "flex-row-reverse")}
                  >
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-extrabold text-sm border",
                      isFamily 
                        ? "bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-250/30" 
                        : "bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-250/30"
                    )}>
                      {isFamily ? "F" : "C"}
                    </div>

                    <div className={cn("space-y-1 flex-1 min-w-0 max-w-[85%]", isFamily ? "text-left" : "text-right")}>
                      <div className={cn("flex items-center gap-2", isFamily ? "justify-start" : "justify-end")}>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{reply.senderName}</span>
                        <span className="text-[9px] text-slate-600 dark:text-slate-400 font-mono">{reply.date ? new Date(reply.date).toLocaleTimeString('pt-BR') : ""}</span>
                      </div>
                      <div className={cn(
                        "p-4 rounded-2xl text-xs sm:text-sm leading-relaxed border text-left shadow-sm space-y-2",
                        isFamily 
                          ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-tl-none text-slate-700 dark:text-slate-300"
                          : "bg-indigo-600 text-white rounded-tr-none border-transparent font-medium"
                      )}>
                        <p className="whitespace-pre-wrap">{reply.body}</p>

                        {/* Reply Attachments */}
                        {reply.attachments && reply.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-2 border-t border-black/5 dark:border-white/5">
                            {reply.attachments.map((file: any, idx: number) => {
                              const fileUrl = file.data || file.url;
                              const isImage = Boolean(fileUrl) && (file.type?.startsWith('image/') || fileUrl?.startsWith('data:image/') || fileUrl?.match(/\.(jpeg|jpg|gif|png|bmp|webp|svg)$/i));
                              const isVideo = Boolean(fileUrl) && (file.type?.startsWith('video/') || fileUrl?.match(/\.(mp4|webm|ogg|mov)$/i));

                              if (isImage) {
                                return (
                                  <div key={idx} className="relative group cursor-pointer w-20 h-20 rounded-lg overflow-hidden border border-black/10" onClick={() => setPreviewImage?.(fileUrl)}>
                                    <img src={fileUrl} alt={file.name} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <span className="text-[8px] text-white font-bold tracking-wider">AMPLIAR</span>
                                    </div>
                                  </div>
                                );
                              }
                              if (isVideo) {
                                return (
                                  <div key={idx} className="relative group w-40 h-20 rounded-lg overflow-hidden border border-black/10">
                                    <video src={fileUrl} controls className="w-full h-full object-cover" />
                                  </div>
                                );
                              }
                              return (
                                <a 
                                  key={idx} 
                                  href={fileUrl} 
                                  download={file.name} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className={cn(
                                    "flex items-center gap-1.5 px-2 py-1 rounded-lg max-w-full transition-colors text-[10px]",
                                    isFamily 
                                      ? "bg-black/5 dark:bg-black/20 hover:bg-black/10 text-slate-700 dark:text-slate-350"
                                      : "bg-white/10 hover:bg-white/20 text-white"
                                  )}
                                >
                                  <Paperclip className="w-3 h-3 shrink-0" />
                                  <span className="truncate max-w-[120px]">{file.name}</span>
                                </a>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

            </div>

            {/* QUICK PRESET REPLY SELECTION TABS */}
            <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 outline-none bg-slate-50 dark:bg-slate-900/40 overflow-x-auto whitespace-nowrap scrollbar-none flex gap-2">
              <span className="text-[10px] text-slate-600 dark:text-slate-400 font-extrabold uppercase py-1 shrink-0 self-center">Sugestões:</span>
              {quickRepliesArr.map((text, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setReplyBody(text)}
                  className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 dark:bg-[#0b0f19] dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 px-3 py-1 text-xs font-bold rounded-full border border-slate-200 dark:border-slate-800 transition-colors shrink-0"
                >
                  {text}
                </button>
              ))}
            </div>

            {/* Chat dynamic input toolbar */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 dark:bg-[#0b0f19] shrink-0">
              {replyAttachments && replyAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 pb-3">
                  {replyAttachments.map((file: any, i: number) => (
                    <div key={i} className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/50 px-2 py-1 rounded-lg border border-slate-250 dark:border-slate-850 text-[10px]">
                      <FileText className="w-3 h-3 text-indigo-500" />
                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{file.name}</span>
                      <button 
                        type="button" 
                        onClick={() => {
                          if (setReplyAttachments) {
                            setReplyAttachments(prev => prev.filter((_, idx) => idx !== i));
                          }
                        }}
                        className="w-4 h-4 hover:bg-rose-100 hover:text-rose-600 rounded-full flex items-center justify-center text-slate-400 transition-colors"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 items-center bg-slate-50 dark:bg-slate-900 px-4 py-1.5 border border-slate-200 dark:border-slate-800 rounded-2xl">
                <button 
                  type="button"
                  onClick={() => document.getElementById('reply-portal-file-input')?.click()}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-850 rounded-lg text-slate-500 cursor-pointer"
                  title="Anexar arquivo"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <input 
                  id="reply-portal-file-input"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []) as File[];
                    const newAttachments = [];
                    for (const f of files) {
                      try {
                        const reader = new FileReader();
                        const base64Data = await new Promise((resolve, reject) => {
                          reader.readAsDataURL(f);
                          reader.onload = () => resolve(reader.result as string);
                          reader.onerror = error => reject(error);
                        }) as string;

                        const uploadRes = await fetch("/api/agenda/upload", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            fileBase64: base64Data,
                            filename: f.name,
                            filetype: f.type
                          })
                        });
                        if (!uploadRes.ok) throw new Error("Upload failed");
                        const uploadData = await uploadRes.json();
                        if (uploadData.success) {
                          newAttachments.push({ 
                            name: f.name, 
                            size: f.size, 
                            type: f.type, 
                            url: uploadData.url 
                          });
                        }
                      } catch(err) {
                        console.error("Error uploading file:", err);
                        alert("Erro ao enviar arquivo: " + f.name);
                      }
                    }
                    if (setReplyAttachments) {
                      setReplyAttachments(prev => [...prev, ...newAttachments]);
                    }
                  }}
                />
                
                <input 
                  type="text"
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder="Escreva sua resposta..."
                  className="flex-1 bg-transparent py-2 text-xs sm:text-sm placeholder-slate-400/90 text-slate-800 dark:text-slate-100 dark:text-white border-none focus:outline-none focus:ring-0"
                />
                <button 
                  onClick={onSendReply}
                  disabled={!replyBody.trim() && (!replyAttachments || replyAttachments.length === 0)}
                  className="w-10 h-10 shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-30 shadow-md shadow-indigo-650/10"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </motion.div>
  );
}
