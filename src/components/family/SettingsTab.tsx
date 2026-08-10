import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, ShieldAlert, Lock, Fingerprint, Save, Check } from 'lucide-react';
import { Student } from '../../types';

interface SettingsTabProps {
  student: Student;
  guardianPin: string;
  onChangePin: (newPin: string) => void;
}

export function SettingsTab({
  student,
  guardianPin,
  onChangePin,
}: SettingsTabProps) {
  const [pinInput, setPinInput] = useState(guardianPin);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  const handleUpdatePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.length === 4 && /^\d+$/.test(pinInput)) {
      onChangePin(pinInput);
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 3000);
    } else {
      alert("Por favor, digite um PIN numérico contendo exatamente 4 dígitos.");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 sm:space-y-8 font-sans"
    >
      <div className="space-y-1">
        <h3 className="text-xl sm:text-2xl font-display font-black text-slate-800 dark:text-slate-100 dark:text-white">Configurações de Conta e PIN</h3>
        <p className="text-xs text-slate-600 dark:text-slate-400">Gerencie seus dados de acesso de responsável e configure o código PIN de guarda para visualização de pareceres confidenciais.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-start">
        
        {/* STUDENT MATRICULATION CARD DATA */}
        <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 dark:bg-[#0b0f19] rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <User className="w-5 h-5 text-indigo-500" />
            <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 dark:text-white uppercase tracking-wider">Ficha de Matrícula Consubstanciada</h4>
          </div>

          <div className="space-y-4 text-xs font-semibold text-slate-705 dark:text-slate-300">
            <div className="grid grid-cols-2 gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[9px] text-slate-600 dark:text-slate-400 uppercase tracking-widest block mb-0.5">Nome Completo do Aluno</span>
                <p className="text-sm font-extrabold text-slate-700 dark:text-slate-100">{student.name}</p>
              </div>
              <div>
                <span className="text-[9px] text-slate-600 dark:text-slate-400 uppercase tracking-widest block mb-0.5">Série Escolar Atual</span>
                <p className="text-sm font-extrabold text-slate-700 dark:text-slate-100">{student.classId}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[9px] text-slate-600 dark:text-slate-400 uppercase tracking-widest block mb-0.5">Responsável Financeiro</span>
                <p className="font-extrabold text-slate-700 dark:text-slate-200">{student.financialGuardian || student.guardianName || "Mãe / Pai Cadastrado"}</p>
              </div>
              <div>
                <span className="text-[9px] text-slate-600 dark:text-slate-400 uppercase tracking-widest block mb-0.5 font-sans">Telefone de Urgência</span>
                <p className="font-bold font-mono text-slate-700 dark:text-slate-200">{student.phone || "(19) 99823-1122"}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 pb-2">
              <div>
                <span className="text-[9px] text-slate-600 dark:text-slate-400 uppercase tracking-widest block mb-0.5">E-mail Cadastrado para Avisos</span>
                <p className="font-mono text-slate-700 dark:text-slate-200 truncate">{student.email || "responsavel.familia@colegioprogresso.com.br"}</p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800/40 text-[10.5px] text-slate-700 dark:text-slate-300 leading-normal font-sans prose dark:prose-invert">
              Para retificar qualquer e-mail, telefone, filiação ou observações médicas de restrições alimentares, entre em contato imediatamente com a Secretaria Central no canal de atendimento.
            </div>
          </div>
        </div>

        {/* PIN CODE SECURITY PROTECTION SETTINGS FORM */}
        <form onSubmit={handleUpdatePin} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 dark:bg-[#0b0f19] rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800 justify-between">
            <div className="flex items-center gap-2.5">
              <Lock className="w-5 h-5 text-indigo-500" />
              <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 dark:text-white uppercase tracking-wider">PIN de Segurança Familiar</h4>
            </div>
            <span className="text-[9px] uppercase font-bold tracking-widest bg-indigo-50 dark:bg-indigo-950/25 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">
              Ativo
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
            O PIN numérico de 4 dígitos é solicitado para validar e dar "Ciente Digital" ou ler pareceres socioemocionais sensíveis ou relatórios emitidos por terapeutas multidisciplinares.
          </p>

          <div className="space-y-3.5 pt-1">
            <div className="space-y-1.5 focus-within:text-indigo-600">
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Código PIN de Responsável (4 Dígitos)</label>
              <div className="relative font-sans">
                <Fingerprint className="w-5 h-5 text-slate-600 dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="password"
                  maxLength={4}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ex: 1234"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/35 rounded-xl text-center text-lg tracking-[0.5em] font-black focus:ring-2 focus:ring-indigo-650 outline-none text-slate-800 dark:text-slate-100 dark:text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-200/50"
                  required
                />
              </div>
            </div>

            {copiedSuccess && (
              <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2 rounded-xl border border-emerald-100 font-bold">
                <Check className="w-4 h-4 shrink-0" />
                Novo PIN de segurança gravado com sucesso!
              </div>
            )}

            <button 
              type="submit"
              className="w-full py-3 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
            >
              <Save className="w-3.5 h-3.5" />
              Salvar Novo Código PIN
            </button>
          </div>
        </form>

      </div>
    </motion.div>
  );
}
