import React from 'react';
import { motion } from 'motion/react';
import { FileCheck, Check, PenTool, Lock } from 'lucide-react';

interface ReportsTabProps {
  filteredReportsList: any[];
  signedReports: Record<string, string>;
  onSignReport: (reportId: string, name: string) => void;
  portalRole?: 'aluno' | 'responsavel';
}

export function ReportsTab({
  filteredReportsList,
  signedReports,
  onSignReport,
  portalRole = 'aluno'
}: ReportsTabProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 sm:space-y-8 font-sans"
    >
      <div className="space-y-1">
        <h3 className="text-xl sm:text-2xl font-display font-black text-slate-800 dark:text-slate-100 dark:text-white">Fichas e Pareceres Pedagógicos</h3>
        <p className="text-xs text-slate-600 dark:text-slate-400">Acompanhe as observações continuadas emitidas pela coordenação, corpo docente e terapeutas acadêmicos.</p>
      </div>

      {filteredReportsList.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 dark:bg-[#0b0f19] rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm text-center text-slate-600 dark:text-slate-400 italic">
          Nenhum parecer pedagógico ou parecer de desempenho foi emitido para o estudante no período letivo atual.
        </div>
      ) : (
        filteredReportsList.map((item) => (
          <div key={item.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 dark:bg-[#0b0f19] rounded-2xl p-5 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="max-w-2xl space-y-2">
              <span className="inline-flex items-center gap-1.5 text-[9px] bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider border border-indigo-100 dark:border-indigo-900/30">
                <FileCheck className="w-3.5 h-3.5" />
                Parecer Acadêmico de {item.subject}
              </span>
              <h4 className="text-base sm:text-lg font-display font-bold text-slate-800 dark:text-slate-100 dark:text-white">Observação Trimestral Consolidada</h4>
              <p className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400">Emitido por: {item.professorName || "Equipe Multidisciplinar"} • Bimestre: {item.bimester}</p>
              
              <div 
                className="mt-4 p-4 sm:p-5 bg-slate-50 dark:bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-705 dark:text-slate-300 leading-relaxed font-sans pr-2 q-text-html-container"
                dangerouslySetInnerHTML={{ __html: item.content }}
              />
            </div>

            {/* Signature Pad logic */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="text-xs">
                <p className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                  <PenTool className="w-3.5 h-3.5 text-indigo-500" />
                  Ciente Digital do Responsável
                </p>
                <p className="text-slate-600 dark:text-slate-400">Verifique os dados e declare-se ciente para arquivamento no histórico.</p>
              </div>

              {signedReports[item.id] ? (
                <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 px-4 py-2 rounded-xl text-xs sm:text-sm border border-emerald-100 font-bold select-none">
                  <Check className="w-4 h-4" />
                  <div>
                    <span className="font-serif italic font-medium pr-1">Assinado:</span> 
                    <span className="font-mono text-[10px] tracking-tight">{signedReports[item.id]}</span>
                  </div>
                </div>
              ) : portalRole === 'aluno' ? (
                <div className="text-rose-500 font-bold text-xs bg-rose-50 dark:bg-rose-950/25 border border-rose-100 dark:border-rose-900/40 px-4 py-2.5 rounded-xl flex items-center gap-2">
                  <Lock className="w-4 h-4 shrink-0 animate-pulse" />
                  <span>Apenas responsáveis autorizados (Modo Responsável) podem assinar</span>
                </div>
              ) : (
                <div className="flex bg-slate-50 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 w-full sm:w-auto font-sans">
                  <input 
                    type="text" 
                    id={`signer-input-${item.id}`}
                    placeholder="Seu nome completo..."
                    className="px-3 py-1.5 bg-transparent text-xs focus:outline-none focus:ring-0 text-slate-800 dark:text-slate-100 dark:text-white placeholder-slate-400 w-full sm:w-56"
                  />
                  <button 
                    onClick={() => {
                      const inputElem = document.getElementById(`signer-input-${item.id}`) as HTMLInputElement;
                      onSignReport(item.id, inputElem?.value || '');
                    }}
                    className="w-full sm:w-auto px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shrink-0"
                  >
                    Dar Ciente Digital
                  </button>
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </motion.div>
  );
}
