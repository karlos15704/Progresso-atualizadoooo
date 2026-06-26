import React from 'react';
import { motion } from 'motion/react';
import { CreditCard, Check, Copy, Download, QrCode } from 'lucide-react';

interface FinancialTabProps {
  onCopyCode: (code: string) => void;
  onDownloadPdf: () => void;
}

export function FinancialTab({
  onCopyCode,
  onDownloadPdf,
}: FinancialTabProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6 sm:space-y-8 font-sans"
    >
      
      <div className="space-y-1">
        <h3 className="text-xl sm:text-2xl font-display font-black text-slate-800 dark:text-slate-100 dark:text-white">Relatórios Financeiros e Mensalidades</h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Consulte boletos, emita recibos de quitação e copie códigos facilitados de Pix para pagamentos.</p>
      </div>

      {/* STYLISH DIGITAL WALLET CARD */}
      <div className="bg-gradient-to-br from-[#101726]/95 via-[#1a253a] to-[#0f172a] rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-60 h-60 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-44 h-44 bg-indigo-500/10 blur-[60px] rounded-full pointer-events-none"></div>

        <div className="space-y-2 relative z-10">
          <span className="inline-flex items-center gap-1 text-[10px] bg-indigo-500/20 text-indigo-300 font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider border border-white/10">
            <CreditCard className="w-3 h-3" />
            Contrato Financeiro Ativo
          </span>
          <div className="text-2xl sm:text-3xl font-display font-black pt-1">
            R$ 1.950,00 
            <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-normal"> / com vencimento todo dia 10</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">Referente a: Turno Integral Ensino Fundamental II</p>
        </div>

        <div className="flex items-center gap-2.5 bg-emerald-500/15 text-emerald-400 px-4 py-2.5 rounded-xl border border-emerald-500/30 text-xs sm:text-sm font-bold shrink-0 self-stretch md:self-auto justify-center shadow-lg shadow-emerald-950/20 relative z-10">
          <Check className="w-5 h-5 shrink-0" />
          Situação: Sem Pendências
        </div>
      </div>

      {/* INVOICES LIST */}
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 dark:bg-[#0b0f19] rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div>
          <h4 className="text-base font-display font-bold text-slate-800 dark:text-slate-100 dark:text-white">Próximas Cobranças Disponíveis</h4>
          <p className="text-xs text-slate-600 dark:text-slate-400">Copie o código de barras, linha digitável ou QR Code para concluir a quitação:</p>
        </div>

        <div className="space-y-4">
          
          {/* Invoice Item 1 */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 hover:border-slate-800 transition-colors">
            
            <div className="flex gap-4 items-start md:items-center flex-1 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center shrink-0 border border-indigo-100/30">
                <QrCode className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
              </div>
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-100">Mensalidade Escolar — Junho 2026</span>
                  <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20 px-2 py-0.5 rounded border border-indigo-100/30 font-mono">
                    Vence em: 10/06/2026
                  </span>
                </div>
                <p className="text-[10px] text-slate-600 dark:text-slate-400 font-mono truncate max-w-xl">
                  Linha Digitável: <span className="text-slate-700 dark:text-slate-300">34191.79001 01043.513184 91020.150008 7 98720000195000</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 md:justify-end">
              <button 
                onClick={() => onCopyCode("34191.790010104351318491020150008798720000195000")}
                className="px-3 py-2 hover:bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-1.5 transition-all text-center flex-1 md:flex-none"
              >
                <Copy className="w-3.5 h-3.5" />
                Copiar
              </button>
              <button 
                onClick={onDownloadPdf}
                className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all text-center flex-1 md:flex-none"
                title="Visualizar PDF"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="md:inline text-[11px]">PDF</span>
              </button>
            </div>

          </div>

          {/* Invoice Item 2 */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            
            <div className="flex gap-4 items-start md:items-center flex-1 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center shrink-0 border border-indigo-100/30">
                <QrCode className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-100">Mensalidade Escolar — Julho 2026</span>
                  <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20 px-2 py-0.5 rounded border border-indigo-100/30 font-mono">
                    Vence em: 10/07/2026
                  </span>
                </div>
                <p className="text-[10px] text-slate-600 dark:text-slate-400 font-mono truncate max-w-xl">
                  Linha Digitável: <span className="text-slate-700 dark:text-slate-200">34191.79001 01043.513184 91020.150008 7 98720000195001</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 md:justify-end">
              <button 
                onClick={() => onCopyCode("34191.790010104351318491020150008798720000195001")}
                className="px-3 py-2 hover:bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-1.5 transition-all text-center flex-1 md:flex-none"
              >
                <Copy className="w-3.5 h-3.5" />
                Copiar
              </button>
              <button 
                onClick={onDownloadPdf}
                className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all text-center flex-1 md:flex-none"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="md:inline text-[11px]">PDF</span>
              </button>
            </div>

          </div>

        </div>
      </div>

    </motion.div>
  );
}
