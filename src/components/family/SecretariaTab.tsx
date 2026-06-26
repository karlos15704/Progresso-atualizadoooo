import React from 'react';
import { motion } from 'motion/react';
import { FileText, GraduationCap, Send, Info, Download, Clock, Printer } from 'lucide-react';
import { Student } from '../../types';
import { cn } from '../../lib/utils';

interface SecretariaTabProps {
  student: Student;
  activeSecretariaTab: 'solicitar' | 'historico';
  setActiveSecretariaTab: (val: 'solicitar' | 'historico') => void;
  selectedDocType: string;
  setSelectedDocType: (val: string) => void;
  docMotive: string;
  setDocMotive: (val: string) => void;
  onCreateDocRequest: (e: React.FormEvent) => void;
  docRequests: any[];
  onTriggerDownload: (filename: string, fileTitle: string) => void;
}

export function SecretariaTab({
  student,
  activeSecretariaTab,
  setActiveSecretariaTab,
  selectedDocType,
  setSelectedDocType,
  docMotive,
  setDocMotive,
  onCreateDocRequest,
  docRequests,
  onTriggerDownload,
}: SecretariaTabProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6 sm:space-y-8 font-sans"
    >
      
      {/* TAB SELECTORS HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-xl sm:text-2xl font-display font-black text-slate-800 dark:text-slate-100 dark:text-white">Secretaria Escolar Digital</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">Canal de autoatendimento oficial para solicitação de certidões acadêmicas ou emissão do histórico.</p>
        </div>
        
        {/* Toggle option pills */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl w-max border border-slate-200 dark:border-slate-800 shrink-0 select-none">
          <button 
            onClick={() => setActiveSecretariaTab('solicitar')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
              activeSecretariaTab === 'solicitar'
                ? "bg-white dark:bg-slate-900 text-indigo-650 dark:text-indigo-400 shadow-sm"
                : "text-slate-700 dark:text-slate-300 hover:text-slate-700 dark:text-slate-200 dark:hover:text-slate-700 dark:text-slate-300"
            )}
          >
            <FileText className="w-4 h-4 text-indigo-505" />
            Certidões & Matrícula
          </button>
          <button 
            onClick={() => setActiveSecretariaTab('historico')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
              activeSecretariaTab === 'historico'
                ? "bg-white dark:bg-slate-900 text-indigo-655 dark:text-indigo-404 shadow-sm"
                : "text-slate-505 hover:text-slate-805"
            )}
          >
            <GraduationCap className="w-4 h-4 text-[#bf821e]" />
            Histórico Escolar Completo
          </button>
        </div>
      </div>

      {activeSecretariaTab === 'solicitar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 sm:gap-8 items-start">
          
          {/* New request form (Left) */}
          <form onSubmit={onCreateDocRequest} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 dark:bg-[#0b0f19] rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 lg:col-span-2">
            <div className="space-y-1 pb-3 border-b border-slate-200 dark:border-slate-800">
              <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 dark:text-white uppercase tracking-wider">Nova Solicitação</h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">Obtenha imediata validação digital em suas certidões escolares:</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Documento Desejado</label>
                <select 
                  value={selectedDocType}
                  onChange={(e) => setSelectedDocType(e.target.value)}
                  className="w-full p-3 border rounded-xl sm: font-bold cursor-pointer bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
                >
                  <option value="Declaração de Matrícula Ativa">Declaração de Matrícula Ativa (Download Imediato)</option>
                  <option value="Histórico Escolar Completo">Histórico Escolar Completo (Prazo: 5 dias úteis)</option>
                  <option value="Declaração de Frequência">Declaração de Frequência (Prazo: 1 dia útil)</option>
                  <option value="Atestado de Quitação de Débitos">Atestado de Quitação de Débitos (Prazo: 2 dias úteis)</option>
                  <option value="Boletim de Notas Oficial Assinado">Boletim de Notas Oficial Assinado (Prazo: 2 dias úteis)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Finalidade ou Motivo</label>
                <textarea 
                  value={docMotive}
                  onChange={(e) => setDocMotive(e.target.value)}
                  placeholder="Ex: Apresentação para plano de saúde ou ingresso em atividade esportiva externa ao colégio..."
                  className="w-full p-3 h-28 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/30 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-655 outline-none text-slate-800 dark:text-slate-100 dark:text-slate-900 dark:text-white resize-none"
                  required
                />
              </div>

              <div className="bg-indigo-50/50 dark:bg-indigo-950/10 p-4 rounded-xl border border-indigo-100/35 text-[11px] text-indigo-800 dark:text-indigo-300 leading-relaxed flex items-start gap-2.5">
                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold block text-indigo-950 dark:text-indigo-100 mb-0.5">Emissão Instantânea</span>
                  A "Declaração de Matrícula Ativa" é processada de forma imediata na Secretaria Virtual e possui código QR de autenticidade para download automático.
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-3 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20"
              >
                <Send className="w-3.5 h-3.5" />
                Solicitar Certificado Escolar
              </button>
            </div>
          </form>

          {/* List of past requests (Right) */}
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 dark:bg-[#0b0f19] rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm lg:col-span-3 space-y-4 h-match">
            <div className="space-y-1 pb-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 dark:text-white uppercase tracking-wider">Histórico de Pedidos</h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">Verifique os trâmites, prazos de recolhimento das vias ou faça download:</p>
              </div>
              <span className="text-[10px] bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-800/40">
                {docRequests.length} solicitações
              </span>
            </div>

            <div className="space-y-3.5 max-h-[460px] overflow-y-auto pr-1">
              {docRequests.map((req) => {
                const isDone = req.status === "Concluído";
                const isProcessing = req.status === "Em Processamento" || req.status === "Em Análise";
                return (
                  <div 
                    key={req.id}
                    className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-slate-800 transition-all font-sans"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-extrabold text-slate-80
                        0 dark:text-slate-100 block truncate">{req.documentType}</span>
                        <span className={cn(
                          "text-[8px] font-black px-2 py-0.5 rounded-full font-mono uppercase tracking-wider border",
                          isDone 
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-100/35" 
                            : isProcessing
                              ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400 border-indigo-100/35"
                              : "bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 border-amber-100/35"
                        )}>
                          {req.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-700 dark:text-slate-300 font-medium italic truncate max-w-sm">"Finalidade: {req.motive}"</p>
                      <div className="flex gap-4 text-[9px] text-slate-600 dark:text-slate-400 font-mono">
                        <span>Abertura: {new Date(req.requestDate).toLocaleDateString('pt-BR')}</span>
                        {isProcessing && req.estimatedDays > 0 && (
                          <span className="text-indigo-500 font-bold">Prazo: {req.estimatedDays} dias úteis</span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 w-full sm:w-auto font-sans text-right self-end sm:self-auto flex sm:block">
                      {isDone ? (
                        <button 
                          onClick={() => onTriggerDownload(`${req.documentType}.pdf`, req.documentType)}
                          className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 w-full"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Baixar PDF
                        </button>
                      ) : (
                        <button 
                          disabled
                          className="px-4 py-2 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-not-allowed w-full"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          Tramitando
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        // TABLE HISTORICO COMPLETO
        <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 dark:bg-[#0b0f19] rounded-2xl p-6 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-sm space-y-8 animate-in fade-in duration-300">
          
          <div className="border-b-2 border-slate-200 dark:border-slate-800 pb-6 text-center space-y-3 relative">
            <p className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 tracking-widest uppercase">Colégio Progresso S/A</p>
            <h4 className="text-base sm:text-lg md:text-xl font-display font-black tracking-tight text-slate-800 dark:text-slate-100 dark:text-white uppercase">REGISTRO GERAL DE HISTÓRICO ACADÊMICO</h4>
            <p className="text-[9px] text-slate-600 dark:text-slate-400 font-mono uppercase tracking-wide">Ficha Cadastral Oficial de Avaliações Unificadas</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-left text-xs bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800/40 max-w-4xl mx-auto font-sans">
              <div>
                <span className="text-[8px] text-slate-600 dark:text-slate-400 font-extrabold uppercase block tracking-wider">Estudante</span>
                <p className="font-extrabold text-slate-700 dark:text-slate-100 truncate">{student.name}</p>
              </div>
              <div>
                <span className="text-[8px] text-slate-600 dark:text-slate-400 font-extrabold uppercase block tracking-wider">Registro Geral (RA)</span>
                <p className="font-extrabold text-slate-700 dark:text-slate-200 font-mono">{student.registrationNumber || "2026.04012"}</p>
              </div>
              <div>
                <span className="text-[8px] text-slate-600 dark:text-slate-400 font-extrabold uppercase block tracking-wider">Vínculo Curricular</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-500 font-mono mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Matrícula Ativa ({student.classId})
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-8 max-w-4xl mx-auto">
            
            {/* Year Block: 7º Ano (2025) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-xs sm:text-sm font-extrabold text-slate-700 dark:text-slate-200 uppercase font-display">7º Ano Fundamental II — Período: 2025</span>
                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-black px-3 py-1 rounded-full uppercase tracking-wider font-mono border border-emerald-100">
                  Aprovado
                </span>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 dark:bg-transparent">
                <div className="grid grid-cols-3 sm:grid-cols-4 bg-slate-50 dark:bg-slate-900/60 p-3 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[8.5px] border-b border-slate-200 dark:border-slate-800">
                  <span className="col-span-2">Componente Curricular</span>
                  <span className="text-center font-mono">Frequência</span>
                  <span className="text-center font-mono">Média Anual Final</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80 font-semibold text-slate-700 dark:text-slate-300">
                  {[
                    { name: "Língua Portuguesa de Ensino", freq: "98%", grade: "8.9" },
                    { name: "Álgebra e Matemática Aplicada", freq: "96%", grade: "8.2" },
                    { name: "Ciências Biológicas e Físicas", freq: "97%", grade: "9.1" },
                    { name: "História do Brasil e Geral", freq: "95%", grade: "8.5" },
                    { name: "Geografia e Geopolítica", freq: "97%", grade: "8.7" },
                    { name: "Língua Inglesa Instrumental", freq: "100%", grade: "9.4" },
                    { name: "Artes Plásticas & Musicalidade", freq: "99%", grade: "10.0" },
                    { name: "Educação Física e Práticas corporais", freq: "94%", grade: "9.5" }
                  ].map((row, rIdx) => (
                    <div key={rIdx} className="grid grid-cols-3 sm:grid-cols-4 p-3 hover:bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200/ dark:hover:bg-slate-900/10">
                      <span className="col-span-2 font-bold text-slate-700 dark:text-slate-100">{row.name}</span>
                      <span className="text-center font-mono text-slate-600 dark:text-slate-400">{row.freq}</span>
                      <span className="text-center font-mono font-black text-indigo-650 dark:text-indigo-400">{row.grade}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Year Block: 6º Ano (2024) */}
            <div className="space-y-3 pb-4">
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-xs sm:text-sm font-extrabold text-slate-700 dark:text-slate-200 uppercase font-display">6º Ano Fundamental II — Período: 2024</span>
                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-black px-3 py-1 rounded-full uppercase tracking-wider font-mono border border-emerald-100 border-dashed">
                  Aprovado
                </span>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 dark:bg-transparent">
                <div className="grid grid-cols-3 sm:grid-cols-4 bg-slate-50 dark:bg-slate-900/60 p-3 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[8.5px] border-b border-slate-200 dark:border-slate-800">
                  <span className="col-span-2">Componente Curricular</span>
                  <span className="text-center font-mono">Frequência</span>
                  <span className="text-center font-mono">Média Anual Final</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80 font-semibold text-slate-700 dark:text-slate-300">
                  {[
                    { name: "Língua Portuguesa de Ensino", freq: "97%", grade: "8.6" },
                    { name: "Álgebra e Matemática Aplicada", freq: "94%", grade: "7.8" },
                    { name: "Ciências Biológicas e Físicas", freq: "99%", grade: "9.3" },
                    { name: "História do Brasil e Geral", freq: "96%", grade: "8.1" },
                    { name: "Geografia e Geopolítica", freq: "98%", grade: "8.2" },
                    { name: "Língua Inglesa Instrumental", freq: "100%", grade: "9.1" },
                    { name: "Artes Plásticas & Musicalidade", freq: "98%", grade: "10.0" },
                    { name: "Educação Física e Práticas corporais", freq: "96%", grade: "9.2" }
                  ].map((row, rIdx) => (
                    <div key={rIdx} className="grid grid-cols-3 sm:grid-cols-4 p-3 hover:bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200/ dark:hover:bg-slate-900/10">
                      <span className="col-span-2 font-bold text-slate-700 dark:text-slate-100">{row.name}</span>
                      <span className="text-center font-mono text-slate-600 dark:text-slate-400">{row.freq}</span>
                      <span className="text-center font-mono font-black text-indigo-650 dark:text-indigo-400">{row.grade}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Verification digital footer */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-center sm:text-left space-y-1">
                <span className="text-[8px] font-extrabold uppercase tracking-widest block text-slate-600 dark:text-slate-400">Chave Unificada de Credencial Digital</span>
                <span className="text-[10px] text-slate-700 dark:text-slate-300 font-mono">CPS-HIST-2026-98BD38FA-012A-4C2E-B9D2-62D2C28912EF</span>
              </div>
              <button 
                onClick={() => window.print()}
                className="px-5 py-3 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 w-full sm:w-auto hover:shadow-sm"
              >
                <Printer className="w-4 h-4 text-indigo-500" />
                Imprimir Histórico Escolar
              </button>
            </div>

          </div>

        </div>
      )}

    </motion.div>
  );
}
