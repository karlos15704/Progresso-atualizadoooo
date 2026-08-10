import React from 'react';
import { motion } from 'motion/react';
import { Award, Info, AlertTriangle, ArrowRightLeft, Sparkles, MessageCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface GradesTabProps {
  selectedBimester: string;
  setSelectedBimester: (val: string) => void;
  subjectAverages: any[];
  studentGrades: any[];
  onNavigate: (view: any) => void;
}

export function GradesTab({
  selectedBimester,
  setSelectedBimester,
  subjectAverages,
  studentGrades,
  onNavigate,
}: GradesTabProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6 sm:space-y-8 font-sans"
    >
      {/* HEADER BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-xl sm:text-2xl font-display font-black text-slate-800 dark:text-slate-100 dark:text-white">Boletim Escolar Oficial</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">Consulte as médias bimestrais consolidadas por matéria acadêmica.</p>
        </div>
        
        {/* Sliding Pill Bimester selectors */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl w-max border border-slate-200 dark:border-slate-800 shrink-0">
          {['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'].map((bimester) => (
            <button 
              key={bimester}
              onClick={() => setSelectedBimester(bimester)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                selectedBimester === bimester
                  ? "bg-white dark:bg-slate-900 text-indigo-650 dark:text-indigo-400 shadow-sm"
                  : "text-slate-700 dark:text-slate-300 hover:text-slate-700 dark:text-slate-200 dark:hover:text-slate-700 dark:text-slate-200"
              )}
            >
              {bimester.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* DETAILED CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        {subjectAverages.map((item, idx) => {
          const isPassing = item.average >= 7.0;
          return (
            <div 
              key={idx} 
              className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 dark:bg-[#0b0f19] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 hover:border-indigo-400 dark:hover:border-indigo-900 transition-all hover:shadow-md flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <h4 className="text-sm font-display font-extrabold text-slate-700 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {item.subject}
                    </h4>
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">Situação para o {selectedBimester}</p>
                  </div>
                  
                  <div className="text-right">
                    <span className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-mono font-black shadow-sm shrink-0",
                      isPassing
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400"
                        : "bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-455"
                    )}>
                      Média: {item.average.toFixed(1)}
                    </span>
                  </div>
                </div>

                {/* Progress ratio indicator */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-600 dark:text-slate-400">
                    <span>Aproveitamento Geral</span>
                    <span>{((item.average / 10) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-900 h-2 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-1000",
                        isPassing ? "bg-indigo-600 dark:bg-indigo-500" : "bg-amber-500"
                      )} 
                      style={{ width: `${item.average * 10}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Informative advice based on performance & Actionable Contact link */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-3 text-[10.5px]">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                  <Info className="w-3.5 h-3.5" />
                  Regra Mínima: 7.0
                </span>

                {!isPassing ? (
                  <button 
                    onClick={() => onNavigate('mensagens')}
                    className="text-amber-600 dark:text-amber-400 font-extrabold hover:underline flex items-center gap-1 shrink-0"
                  >
                    <AlertTriangle className="w-3 h-3 text-amber-500" />
                    Enviar mensagem ao professor
                  </button>
                ) : (
                  <span className="text-emerald-500 font-bold">Aprovado</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* INDIVIDUAL TESTS RECORD TABLE LIST */}
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 dark:bg-[#0b0f19] rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-indigo-500" />
          <h4 className="text-base font-display font-bold text-slate-800 dark:text-slate-100 dark:text-white">Detalhamento de Testes Bimestrais</h4>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400">Confira o histórico de provas, notas originais e anotações explicativas deixadas pelos corretores:</p>

        <div className="overflow-x-auto min-w-0">
          <table className="w-full text-xs">
            <thead className="bg-[#800020] text-white text-white">
                <tr className="transition-colors">
                <th className="pb-3 font-semibold text-white">Matéria / Avaliação</th>
                <th className="pb-3 font-semibold text-white">Bimestre</th>
                <th className="pb-3 font-semibold text-center text-white">Nota / Máx.</th>
                <th className="pb-3 font-semibold text-white">Feedback e Observações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {studentGrades.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-600 dark:text-slate-400 italic">
                    Nenhuma nota ou avaliação foi publicada no sistema até o momento.
                  </td>
                </tr>
              ) : (
                studentGrades.map((grade) => (
                  <tr key={grade.id} className="text-slate-700 dark:text-slate-300">
                    <td className="py-3.5 font-bold">
                      {grade.subject}
                      <span className="block text-[10px] text-slate-600 dark:text-slate-400 font-normal">{grade.title}</span>
                    </td>
                    <td className="py-3.5 font-mono">{grade.bimester}</td>
                    <td className="py-3.5 text-center font-bold font-mono text-indigo-600 dark:text-indigo-400">
                      {grade.score} <span className="text-slate-600 dark:text-slate-400 font-normal">/ {grade.maxScore}</span>
                    </td>
                    <td className="py-3.5 text-slate-600 dark:text-slate-400 italic max-w-sm truncate whitespace-normal font-mono pr-2">
                      {grade.feedback || "Sem observações adicionais gravadas."}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
