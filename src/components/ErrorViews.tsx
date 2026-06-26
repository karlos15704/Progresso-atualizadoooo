import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ViewHeader } from '../components/ViewHeader';
import { AlertCircle, ShieldAlert, Check, Loader2, ImagePlus, X, Trash2, Lightbulb, Sparkles, Bug } from 'lucide-react';
import { cn } from '../lib/utils';
import { AuthUser as User } from "@supabase/supabase-js";

export function ErrorReportView({ user, userProfile }: { user: User, userProfile: any }) {
  const [activeTab, setActiveTab] = useState<'bug' | 'sugestao'>('bug');
  const [message, setMessage] = useState('');
  const [imageContent, setImageContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [myReports, setMyReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);

  const fetchMyReports = async () => {
    try {
      const res = await fetch('/api/tickets/log');
      if (res.ok) {
        const data = await res.json();
        const mine = (data.reports || []).filter((r: any) => r.email === user.email);
        setMyReports(mine);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    fetchMyReports();
  }, []);

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("A imagem deve ter no máximo 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageContent(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/tickets/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          professionalName: userProfile?.professional_name || user.email,
          email: user.email,
          message: message,
          image: imageContent,
          type: activeTab
        })
      });
      if (!res.ok) throw new Error('Erro ao enviar o relato.');
      setSuccess(true);
      setMessage('');
      setImageContent(null);
      fetchMyReports();
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      console.error(err);
      alert('Erro ao comunicar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 max-w-4xl mx-auto text-left pb-20">
      <ViewHeader 
        title="Ajuda e Suporte" 
        subtitle="Encontrou algum problema ou tem sugestões para aprimorar o sistema? Fale com a equipe de tecnologia."
        icon={<AlertCircle className="w-5 h-5 text-indigo-500" />}
        badge="Suporte"
      />

      {/* Modern High-Fidelity Accent Tab Selectors */}
      <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-slate-900/80 rounded-2xl max-w-lg border border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => {
            setActiveTab('bug');
            setSuccess(false);
          }}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer",
            activeTab === 'bug'
              ? "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-rose-600 dark:text-rose-450 shadow-[0_4px_12px_rgba(225,29,72,0.08)]"
              : "text-slate-700 dark:text-slate-300 hover:text-slate-700 dark:text-slate-200 dark:hover:text-slate-700 dark:text-slate-200"
          )}
        >
          <Bug className="w-4 h-4" />
          <span>Relatar Problema / Bug</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('sugestao');
            setSuccess(false);
          }}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer",
            activeTab === 'sugestao'
              ? "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 shadow-[0_4px_12px_rgba(16,185,129,0.08)]"
              : "text-slate-700 dark:text-slate-300 hover:text-slate-700 dark:text-slate-200 dark:hover:text-slate-700 dark:text-slate-200"
          )}
        >
          <Lightbulb className="w-4 h-4" />
          <span>Sugestão de Melhoria</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl relative overflow-hidden">
        <div className={cn(
          "absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full opacity-30 transition-all duration-500",
          activeTab === 'bug' ? "bg-rose-500/10" : "bg-emerald-500/10"
        )}></div>
        
        {success ? (
          <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
            <div className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center mb-2 shadow-inner",
              activeTab === 'bug' ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600" : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600"
            )}>
              {activeTab === 'bug' ? <Bug className="w-8 h-8 animate-bounce" /> : <Sparkles className="w-8 h-8 animate-pulse" />}
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 dark:text-white uppercase tracking-wider">
              {activeTab === 'bug' ? 'Relato de Erro Enviado!' : 'Sugestão Enviada com Sucesso!'}
            </h3>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-400 max-w-md">
              {activeTab === 'bug' 
                ? 'Obrigado por nos avisar. A equipe de TI analisará os detalhes para solucionar o erro o mais rápido possível.'
                : 'Adoramos novas ideias! Sua sugestão foi registrada e nossa equipe de produto irá avaliá-la para as próximas melhorias.'
              }
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            <div className="space-y-2">
              <label className={cn(
                "text-xs font-black uppercase tracking-widest transition-colors",
                activeTab === 'bug' ? "text-rose-500" : "text-emerald-500"
              )}>
                {activeTab === 'bug' ? 'Descrição do Problema (Bug)' : 'Ideia ou Sugestão de Melhoria'}
              </label>
              
              <textarea 
                placeholder={activeTab === 'bug' 
                  ? "Descreva com detalhes o erro encontrado, em qual tela aconteceu, o que você tentou fazer e como o sistema se comportou..."
                  : "Descreva seu feedback ou ideia. O que poderia ser melhorado no sistema para facilitar o seu dia a dia? Quais recursos novos você gostaria de ver?"
                }
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={5}
                required
                className={cn(
                  "w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none transition-all resize-none text-sm font-medium text-slate-700 dark:text-slate-200",
                  activeTab === 'bug' 
                    ? "focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20" 
                    : "focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                )}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Captura de Tela ou Anexo (Opcional)</label>
              
              {!imageContent ? (
                <label className="cursor-pointer flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 transition-colors">
                  <ImagePlus className="w-8 h-8 text-slate-600 dark:text-slate-400 mb-2" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Clique para anexar ou arraste a imagem</span>
                  <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={handleImage} />
                </label>
              ) : (
                <div className="relative inline-block border border-slate-200 dark:border-slate-800 p-2 rounded-xl bg-slate-50 dark:bg-slate-900 animate-fade-in">
                  <img src={imageContent} alt="Anexo" className="max-h-48 rounded-lg object-contain" />
                  <button type="button" onClick={() => setImageContent(null)} className="absolute -top-3 -right-3 p-1.5 bg-rose-500 text-white rounded-full shadow-lg hover:bg-rose-600 transition-all">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <button 
              disabled={loading || !message.trim()} 
              type="submit" 
              className={cn(
                "w-full sm:w-auto px-8 py-3 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50",
                activeTab === 'bug'
                  ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/25"
                  : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25"
              )}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Enviando...' : (activeTab === 'bug' ? 'Enviar Relato de Erro' : 'Enviar Sugestão')}
            </button>
          </form>
        )}
      </div>

      <MyHistory myReports={myReports} loading={loadingReports} />
    </motion.div>
  );
}

function MyHistory({ myReports, loading }: { myReports: any[], loading: boolean }) {
  if (loading) return <div className="py-10 text-center text-slate-600 dark:text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;
  if (!myReports || myReports.length === 0) return null;

  return (
    <div className="mt-8 space-y-4 px-2">
      <h3 className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-4">Meus Tickets (Histórico)</h3>
      <div className="space-y-3">
        {myReports.slice().reverse().map(r => {
          const type = r.type || 'bug';
          return (
            <div key={r.id} className={cn("bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm transition-all", r.status === 'resolvido' ? "border-emerald-200 dark:border-emerald-900/50" : "border-slate-200 dark:border-slate-800")}>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-700 dark:text-slate-300 font-bold uppercase">{new Date(r.created_at).toLocaleString('pt-BR')}</span>
                  
                  {/* High Quality Type Badge */}
                  {type === 'sugestao' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200/50 dark:border-emerald-900/40">
                      <Lightbulb className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
                      SUGESTÃO
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 border border-rose-200/50 dark:border-rose-900/40">
                      <Bug className="w-2.5 h-2.5 text-rose-500 shrink-0" />
                      BUG / PROBLEMA
                    </span>
                  )}
                </div>

                <span className={cn("px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider", r.status === 'resolvido' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-400")}>
                  {r.status}
                </span>
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 line-clamp-3 leading-relaxed whitespace-pre-wrap">{r.message}</p>
              
              {r.reply && (
                <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-xl relative">
                  <span className="block text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1">Resposta do Suporte TI</span>
                  <p className="text-sm text-indigo-900 dark:text-indigo-200 whitespace-pre-wrap">{r.reply}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ErrorAdminView() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState<{[key: string] : string}>({});
  const [adminFilterTab, setAdminFilterTab] = useState<'todos' | 'bug' | 'sugestao'>('todos');

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/tickets/log');
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await fetch('/api/tickets/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      fetchReports();
    } catch(e) {
      console.error(e);
    }
  }

  const handleDeleteReport = async (id: string) => {
    if (!confirm("Deseja realmente excluir este ticket permanentemente?")) return;
    try {
      const res = await fetch('/api/tickets/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        fetchReports();
      } else {
        alert("Erro ao excluir o reporte.");
      }
    } catch (e) {
      console.error(e);
      alert("Erro de conexão ao excluir o reporte.");
    }
  }
  
  const handleReply = async (id: string) => {
    try {
      if (replyText[id] == null) return;
      await fetch('/api/tickets/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, reply: replyText[id] })
      });
      fetchReports();
      setReplyText(prev => {
        const next = {...prev};
        delete next[id];
        return next;
      });
    } catch(e) {
      console.error(e);
    }
  }

  // Handle high quality filtering of tickets
  const filteredReports = reports.filter(r => {
    if (adminFilterTab === 'todos') return true;
    const type = r.type || 'bug';
    return type === adminFilterTab;
  });

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 max-w-5xl mx-auto text-left pb-20">
      <ViewHeader 
        title="Gestão de Tickets & Sugestões" 
        subtitle="Gerenciamento e acompanhamento de relatórios de erros e sugestões enviados pelos profissionais."
        icon={<ShieldAlert className="w-5 h-5 text-indigo-500" />}
      />

      {/* Admin Tabs Filter Menu */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-3xl">
        <div className="flex gap-2">
          {(['todos', 'bug', 'sugestao'] as const).map(tab => {
            const label = tab === 'todos' ? 'Todos os Tickets' : tab === 'bug' ? 'Bugs / Erros' : 'Sugestões';
            const count = reports.filter(r => tab === 'todos' ? true : (r.type || 'bug') === tab).length;
            
            return (
              <button
                key={tab}
                onClick={() => setAdminFilterTab(tab)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer",
                  adminFilterTab === tab
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-700 dark:text-slate-200"
                )}
              >
                {tab === 'bug' && <Bug className="w-3.5 h-3.5" />}
                {tab === 'sugestao' && <Lightbulb className="w-3.5 h-3.5" />}
                <span>{label}</span>
                <span className={cn(
                  "px-1.5 py-0.5 rounded-full text-[9px] font-black leading-none",
                  adminFilterTab === tab ? "bg-slate-800/ text-white" : "bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-400"
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
          Mostrando {filteredReports.length} de {reports.length} tickets cadastrados
        </p>
      </div>

      <div className="space-y-4">
        {loading ? (
           <div className="py-20 flex justify-center">
             <Loader2 className="w-8 h-8 animate-spin text-slate-600 dark:text-slate-400" />
           </div>
        ) : filteredReports.length === 0 ? (
           <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center shadow-xl">
             <ShieldAlert className="w-12 h-12 text-slate-700 dark:text-slate-300 mx-auto mb-4" />
             <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-1">Nenhum registro encontrado</h3>
             <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">Não há itens de feedback nesta categoria no momento.</p>
           </div>
        ) : (
          [...filteredReports].reverse().map(r => {
             const type = r.type || 'bug';
             const isSugestao = type === 'sugestao';
             return (
               <div key={r.id} className={cn("bg-white dark:bg-slate-900 border rounded-3xl p-6 shadow-md transition-all relative overflow-hidden", r.status === 'resolvido' ? "border-emerald-200/50 dark:border-emerald-900/20 opacity-70" : isSugestao ? "border-emerald-200 dark:border-emerald-900/50" : "border-rose-200 dark:border-rose-900/50")}>
                 
                 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                   <div>
                     <div className="flex items-center gap-2 flex-wrap mb-1">
                       <h4 className="font-extrabold text-slate-800 dark:text-slate-100 dark:text-white text-sm">{r.professionalName}</h4>
                       
                       {/* High Quality Type Badge inside Admin lists */}
                       {isSugestao ? (
                         <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200/50 dark:border-emerald-900/40">
                           <Lightbulb className="w-2.5 h-2.5 text-emerald-500" />
                           SUGESTÃO DE DEPOIMENTO / MELHORIA
                         </span>
                       ) : (
                         <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-rose-50 dark:bg-rose-950/40 text-rose-600 border border-rose-200/50 dark:border-rose-900/40">
                           <Bug className="w-2.5 h-2.5 text-rose-500" />
                           RELATO DE ERRO / BUG
                         </span>
                       )}
                     </div>
                     <p className="text-[10px] text-slate-700 dark:text-slate-300">{r.email} • {new Date(r.created_at).toLocaleString('pt-BR')}</p>
                   </div>
                   <div className="flex items-center gap-3">
                     <select 
                       value={r.status} 
                       onChange={(e) => handleUpdateStatus(r.id, e.target.value)}
                       className={cn("px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider border-none outline-none cursor-pointer", r.status === 'resolvido' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}
                     >
                       <option value="pendente">Pendente</option>
                       <option value="resolvido">Resolvido</option>
                     </select>
                      <button 
                        onClick={() => handleDeleteReport(r.id)}
                        className="p-2 hover: hover: rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
                        title="Excluir Ticket"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                   </div>
                 </div>

                 <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-medium leading-relaxed">
                   {r.message}
                 </div>

                 {r.image && (
                   <div className="mt-4">
                     <p className="text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-2">Captura de Tela Anexada</p>
                     <a href={r.image} target="_blank" rel="noreferrer" className="inline-block">
                       <img src={r.image} alt="Screenshot" className="max-h-64 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:opacity-90 transition-opacity object-contain" />
                     </a>
                   </div>
                 )}
                 
                 <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2">Mensagem de Resposta para o Usuário</p>
                    <div className="flex flex-col gap-2">
                      {r.reply && replyText[r.id] === undefined && (
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-xl text-sm text-indigo-900 dark:text-indigo-200 mb-2">
                          {r.reply}
                        </div>
                      )}
                      <textarea 
                        value={replyText[r.id] !== undefined ? replyText[r.id] : (r.reply || '')}
                        onChange={(e) => setReplyText({ ...replyText, [r.id]: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-sm outline-none focus:border-indigo-400 min-h-[60px]"
                        placeholder="Escreva uma resposta de suporte, feedback ou agradecimento..."
                      />
                      <div className="flex justify-end">
                        <button 
                          onClick={() => handleReply(r.id)}
                          disabled={replyText[r.id] === undefined || replyText[r.id] === (r.reply || '')}
                          className="w-full sm:w-auto px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors"
                        >
                          Enviar Mensagem
                        </button>
                      </div>
                    </div>
                 </div>
               </div>
             );
          })
        )}
      </div>
    </motion.div>
  );
}
