import React from 'react';
import { motion } from 'motion/react';
import { Printer } from 'lucide-react';
import { Student } from '../../types';
import { cn } from '../../lib/utils';

interface WorkCoverTabProps {
  student: Student;
  coverTitle: string;
  setCoverTitle: (val: string) => void;
  coverSubtitle: string;
  setCoverSubtitle: (val: string) => void;
  coverSubject: string;
  setCoverSubject: (val: string) => void;
  coverTeacher: string;
  setCoverTeacher: (val: string) => void;
  coverDateText: string;
  setCoverDateText: (val: string) => void;
  coverAlignment: 'left' | 'center';
  setCoverAlignment: (val: 'left' | 'center') => void;
  availableClassSubjectsAndProfessors: any[];
}

export function WorkCoverTab({
  student,
  coverTitle,
  setCoverTitle,
  coverSubtitle,
  setCoverSubtitle,
  coverSubject,
  setCoverSubject,
  coverTeacher,
  setCoverTeacher,
  coverDateText,
  setCoverDateText,
  coverAlignment,
  setCoverAlignment,
  availableClassSubjectsAndProfessors,
}: WorkCoverTabProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6 sm:space-y-8 font-sans"
    >
      
      <div className="space-y-1">
        <h3 className="text-xl sm:text-2xl font-display font-black text-slate-800 dark:text-slate-100 dark:text-white">Gerador de Capa de Trabalho</h3>
        <p className="text-xs text-slate-600 dark:text-slate-400">Emita a folha de rosto padronizada ABNT da escola para trabalhos curriculares e relatórios rápidos.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-start">
        
        {/* Form controls */}
        <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 dark:bg-[#0b0f19] rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 dark:text-white uppercase tracking-wider">Identificação do Trabalho</h4>
          
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1.5">Título do Trabalho</label>
              <input 
                type="text"
                value={coverTitle}
                onChange={(e) => setCoverTitle(e.target.value)}
                placeholder="Ex: A Revolução Industrial e Suas Consequências"
                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/30 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-650 outline-none text-slate-800 dark:text-slate-100 dark:text-slate-900 dark:text-white font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1.5">Subtítulo (Opcional)</label>
              <input 
                type="text"
                value={coverSubtitle}
                onChange={(e) => setCoverSubtitle(e.target.value)}
                placeholder="Ex: Os Impactos Tecnológicos do Século XVIII"
                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/30 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-655 outline-none text-slate-800 dark:text-slate-100 dark:text-slate-900 dark:text-white font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1.5">Matéria / Disciplina</label>
                <select 
                  value={coverSubject}
                  onChange={(e) => setCoverSubject(e.target.value)}
                  className="w-full p-3 rounded-xl sm: font-bold cursor-pointer bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
                >
                  {availableClassSubjectsAndProfessors.map(item => (
                    <option key={item.subject} value={item.subject}>{item.subject}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1.5">Professor orientador</label>
                <input 
                  type="text"
                  value={coverTeacher}
                  onChange={(e) => setCoverTeacher(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/30 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-665 outline-none text-slate-800 dark:text-slate-100 dark:text-slate-900 dark:text-white font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1.5">Data de Entrega</label>
                <input 
                  type="text"
                  value={coverDateText}
                  onChange={(e) => setCoverDateText(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/30 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-670 outline-none text-slate-800 dark:text-slate-100 dark:text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1.5">Alinhamento</label>
                <div className="flex gap-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                  <button 
                    type="button"
                    onClick={() => setCoverAlignment('center')}
                    className={cn(
                      "flex-1 py-1 text-xs font-bold rounded-lg text-center transition-colors", 
                      coverAlignment === 'center' 
                        ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                        : "text-slate-505"
                    )}
                  >
                    Centro
                  </button>
                  <button 
                    type="button"
                    onClick={() => setCoverAlignment('left')}
                    className={cn(
                      "flex-1 py-1 text-xs font-bold rounded-lg text-center transition-colors", 
                      coverAlignment === 'left' 
                        ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                        : "text-slate-505"
                    )}
                  >
                    Esquerda
                  </button>
                </div>
              </div>
            </div>

            <button 
              onClick={() => window.print()}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/10"
            >
              <Printer className="w-4 h-4" />
              Imprimir / Salvar Capa A4
            </button>
          </div>
        </div>

        {/* Paper visual preview sheet */}
        <div className="bg-slate-100 dark:bg-slate-900/50 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <span className="text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-widest font-extrabold block text-center">Visualização do Modelo A4</span>
          
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 aspect-[1/1.41] w-full max-w-sm mx-auto shadow-xl rounded p-6 sm:p-8 md:p-10 border border-slate-200 dark:border-slate-800 flex flex-col justify-between text-center select-none font-sans relative overflow-hidden">
            
            {/* Header decor block */}
            <div className="border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center justify-between text-[8px] uppercase tracking-widest text-slate-600 dark:text-slate-400 font-bold">
              <span>Colégio Progresso</span>
              <span>Anos Finais</span>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">COLÉGIO PROGRESSO</p>
              <p className="text-[8px] text-slate-600 dark:text-slate-400 uppercase tracking-widest font-mono">Unidade Central de Ensino</p>
            </div>

            <div className={cn("space-y-2.5 my-auto py-8", coverAlignment === 'left' ? "text-left pl-2" : "text-center")}>
              <h2 className="text-xs sm:text-sm font-display font-black uppercase leading-snug tracking-tight text-slate-950">
                {coverTitle || "Título do Trabalho"}
              </h2>
              {coverSubtitle && (
                <p className="text-[9px] text-slate-700 dark:text-slate-300 font-medium italic border-t border-slate-200 dark:border-slate-800 pt-1 leading-relaxed">
                  {coverSubtitle}
                </p>
              )}
            </div>

            <div className="space-y-4 text-left text-[8px] border-t border-slate-200 dark:border-slate-800 pt-4 text-slate-700 dark:text-slate-300 max-w-[270px]">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="font-bold text-slate-600 dark:text-slate-400 uppercase text-[6.5px] tracking-wider">Autor Estudante:</p>
                  <p className="font-extrabold text-slate-800 dark:text-slate-100 truncate">{student.name}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-600 dark:text-slate-400 uppercase text-[6.5px] tracking-wider">Série & Turma:</p>
                  <p className="font-extrabold text-slate-800 dark:text-slate-100 truncate">Ano: {student.classId}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-slate-200 dark:border-slate-800 pt-2">
                <div>
                  <p className="font-bold text-slate-600 dark:text-slate-400 uppercase text-[6.5px] tracking-wider">Professor Avaliador:</p>
                  <p className="font-extrabold text-slate-800 dark:text-slate-100 truncate">{coverTeacher}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-600 dark:text-slate-400 uppercase text-[6.5px] tracking-wider">Componente Curricular:</p>
                  <p className="font-extrabold text-indigo-600 truncate">{coverSubject}</p>
                </div>
              </div>
            </div>

            {/* Date line */}
            <div className="pt-2 text-[8px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest border-t border-slate-200 dark:border-slate-800 flex justify-between">
              <span>Campinas - SP</span>
              <span>{coverDateText}</span>
            </div>

          </div>
        </div>

      </div>
    </motion.div>
  );
}
