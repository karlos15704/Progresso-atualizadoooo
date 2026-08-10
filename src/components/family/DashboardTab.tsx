import React from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  Calendar, 
  MessageCircle, 
  FileText, 
  CheckCircle, 
  Sparkles, 
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
import { Student } from '../../types';

interface DashboardTabProps {
  student: Student;
  overallGpa: number | string;
  subjectAverages: any[];
  messages: any[];
  onNavigate: (view: any) => void;
  filteredReportsCount: number;
  attendancePercent: string;
}

export function DashboardTab({
  student,
  overallGpa,
  subjectAverages,
  messages,
  onNavigate,
  filteredReportsCount,
  attendancePercent,
}: DashboardTabProps) {

  const gpaValue = typeof overallGpa === 'number' ? overallGpa : 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 sm:space-y-8"
      id="family-dashboard-root"
    >
      {/* WELCOME HERO BANNER */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-[#131a2d] to-[#0b0f19] rounded-3xl p-6 sm:p-8 md:p-10 border border-slate-200 dark:border-slate-800 text-white shadow-xl" id="family-welcome-hero">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-12 w-64 h-64 bg-emerald-500/5 blur-[90px] rounded-full pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-extrabold bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full border border-indigo-500/30">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Ano Letivo 2026
            </span>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-extrabold tracking-tight pt-1">
              Olá, bem-vindo <span className="bg-gradient-to-r from-indigo-300 via-indigo-100 to-white bg-clip-text text-transparent">Família de {student.name.split(' ')[0]}!</span>
            </h1>
            <p className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm md:text-base font-normal leading-relaxed">
              Aqui você acompanha o progresso estudantil de {student.name}, boletins, pareceres pedagógicos oficiais e garante comunicação direta com os professores e coordenação.
            </p>
          </div>

          {/* KPI Badge Student Info */}
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100/[0.03] backdrop-blur-md border border-white/10 p-5 rounded-2xl flex items-center gap-4 shrink-0 self-stretch md:self-auto justify-center md:justify-start">
            <div className="text-right">
              <p className="text-[10px] text-slate-600 dark:text-slate-400 font-extrabold uppercase tracking-widest">Média Global</p>
              <p className="text-3xl font-display font-black text-white leading-none pt-1">
                {gpaValue > 0 ? gpaValue.toFixed(1) : "—"} <span className="text-xs text-slate-600 dark:text-slate-400 font-normal">/10</span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* RE-DESIGNED BENTO STATS KPI GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5" id="stats-kpi-grid">
        {/* Metric 1: Frequency */}
        <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 dark:bg-[#0b0f19] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-4 hover:shadow-md transition-all">
          <div className="space-y-1">
            <p className="text-xs text-slate-600 dark:text-slate-400 font-extrabold tracking-widest uppercase">Frequência Real</p>
            <h3 className="text-2xl font-display font-black text-slate-700 dark:text-slate-100">{attendancePercent}</h3>
            <p className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Presença calculada
            </p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 2: Messages */}
        <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 dark:bg-[#0b0f19] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-4 hover:shadow-md transition-all">
          <div className="space-y-1">
            <p className="text-xs text-slate-600 dark:text-slate-400 font-extrabold tracking-widest uppercase">Mensagens na Agenda</p>
            <h3 className="text-2xl font-display font-black text-slate-700 dark:text-slate-100">{messages.length}</h3>
            <button 
              onClick={() => onNavigate('mensagens')}
              className="text-[10px] text-indigo-500 font-bold hover:underline text-left block"
            >
              Acessar timeline →
            </button>
          </div>
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
            <MessageCircle className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 3: Reports */}
        <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 dark:bg-[#0b0f19] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-4 hover:shadow-md transition-all">
          <div className="space-y-1">
            <p className="text-xs text-slate-600 dark:text-slate-400 font-extrabold tracking-widest uppercase">Pareceres Pendentes</p>
            <h3 className="text-2xl font-display font-black text-slate-700 dark:text-slate-100">
              {filteredReportsCount > 0 ? filteredReportsCount : "Tudo Lido"}
            </h3>
            <p className="text-[10px] text-amber-500 font-semibold">
              {filteredReportsCount > 0 ? "Requer assinatura digital" : "Ambiente em dia"}
            </p>
          </div>
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 4: Real Student Status */}
        <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 dark:bg-[#0b0f19] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-4 hover:shadow-md transition-all">
          <div className="space-y-1">
            <p className="text-xs text-slate-600 dark:text-slate-400 font-extrabold tracking-widest uppercase">Situação Cadastral</p>
            <h3 className="text-2xl font-display font-black text-slate-700 dark:text-slate-100">{student.status || "Ativo"}</h3>
            <p className="text-[10px] text-emerald-500 font-semibold">Turma {student.classId}</p>
          </div>
          <div className="w-12 h-12 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-400 rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle className="w-6 h-6 text-emerald-500" />
          </div>
        </div>
      </div>

      {/* GRADE TRACKING EXCLUSIVELY REAL DATA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="gpa-charts-section">
        
        {/* Desempenho Chart block */}
        <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 dark:bg-[#0b0f19] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm lg:col-span-2 space-y-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-display font-bold text-slate-800 dark:text-slate-100 dark:text-white">Aproveitamento das Médias</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">Evolução de notas reais lançadas pelos professores no diário eletrônico.</p>
              </div>
              <button 
                onClick={() => onNavigate('desempenho')}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-extrabold flex items-center gap-1 hover:underline"
              >
                Ver Boletim Completo
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="h-64 w-full">
            {subjectAverages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 dark:text-slate-400 gap-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-5">
                <BookOpen className="w-8 h-8 text-slate-700 dark:text-slate-300" />
                <p className="text-xs font-semibold">Aguardando lançamentos deste bimestre</p>
                <p className="text-[9px] text-slate-600 dark:text-slate-400">Suas notas aparecerão aqui no momento em que forem publicadas.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={subjectAverages} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gpaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" dark:stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="subject" tick={{fill: '#94a3b8', fontSize: 10}} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 10]} tick={{fill: '#94a3b8', fontSize: 10}} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="average" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#gpaGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Real Grade Summary list */}
        <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 dark:bg-[#0b0f19] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="text-base font-display font-bold text-slate-800 dark:text-slate-100 dark:text-white">Notas Consolidadas</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Resumo aproximado das disciplinas com notas ativas apuradas no banco de provas:
            </p>
          </div>

          <div className="space-y-4 my-4 flex-1 overflow-y-auto max-h-[160px] pr-1">
            {subjectAverages.length === 0 ? (
              <p className="text-xs text-slate-600 dark:text-slate-400 italic text-center py-6">Nenhuma avaliação corrigida localizada no banco.</p>
            ) : (
              subjectAverages.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs pb-2.5 border-b border-slate-200 dark:border-slate-800/60 last:border-0 last:pb-0">
                  <span className="font-bold text-slate-700 dark:text-slate-300 pr-2 truncate max-w-[150px]">{item.subject}</span>
                  <span className={`font-mono font-black border text-[11px] px-2.5 py-1 rounded-lg ${
                    item.average >= 7.0 
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/35" 
                      : "bg-amber-50 text-amber-600 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/35"
                  }`}>
                    {item.average.toFixed(1)}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="bg-indigo-50/50 dark:bg-indigo-950/10 p-3 rounded-xl border border-indigo-100/30 text-[10px] text-indigo-800 dark:text-indigo-400 leading-relaxed">
            Consulte a aba de Boletins para verificar observações detalhadas e correções por questão acadêmica.
          </div>
        </div>

      </div>

      {/* LATEST COMMUNICATION TIMELINE ROW */}
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 dark:bg-[#0b0f19] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5" id="timeline-announcements">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-display font-bold text-slate-800 dark:text-slate-100 dark:text-white">Mural & Recados Escolares</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">Resumo dos últimos comunicados ou atendimentos enviados pela coordenação.</p>
          </div>
          <button 
            onClick={() => onNavigate('mensagens')}
            className="text-xs text-indigo-600 dark:text-indigo-400 font-extrabold flex items-center gap-1 hover:underline"
          >
            Mural Completo →
          </button>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {messages.slice(0, 3).map((item) => (
            <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex items-start gap-4 group cursor-pointer animate-in fade-in duration-200" onClick={() => onNavigate('mensagens')}>
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/25 text-indigo-600 dark:text-indigo-400 rounded-xl group-hover:scale-105 transition-transform shrink-0">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1 flex-1 min-w-0 font-sans">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {item.subject}
                  </h4>
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 font-bold font-mono">{new Date(item.date).toLocaleDateString('pt-BR')}</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-400 line-clamp-1 leading-relaxed">
                  {item.content || item.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
