import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface BusTransitionOverlayProps {
  view: string;
  isVisible: boolean;
}

interface ViewThemeConfig {
  title: string;
  subtitle: string;
  floatingEmojis: string[];
  passengerEmojis: string[];
  bannerText: string;
  ambientGradient: string;
  busColor: string;
  busSignColor: string;
  busHonkIcon: string;
}

export function BusTransitionOverlay({ view, isVisible }: BusTransitionOverlayProps) {
  const config = useMemo<ViewThemeConfig>(() => {
    switch (view) {
      case 'dashboard':
        return {
          title: "Estacionando no Pátio Geral! 🏫🎒",
          subtitle: "Desembarcando com os professores no painel unificado do CPS...",
          floatingEmojis: ["✏️", "🎒", "📐", "🍎", "📚", "📓", "📝", "✂️"],
          passengerEmojis: ["🧑‍🏫", "🧑‍🎓", "🎒", "🦁"],
          bannerText: "Progresso Santista",
          ambientGradient: "from-slate-950 via-slate-900 to-amber-950/20",
          busColor: "bg-amber-400 border-amber-500",
          busSignColor: "text-amber-400",
          busHonkIcon: "🔔"
        };
      case 'comunicados':
        return {
          title: "Expresso dos Comunicados! 📢🚌",
          subtitle: "Abram espaço para o carro de som oficial das notificações do Colégio...",
          floatingEmojis: ["📢", "📣", "📝", "🔔", "✉️", "📨", "📄", "🗣️"],
          passengerEmojis: ["🗣️", "🧑‍🏫", "📢", "📨"],
          bannerText: "MURAL PROGRESSO • AVISOS",
          ambientGradient: "from-slate-950 via-slate-900 to-blue-950/20",
          busColor: "bg-amber-400 border-amber-500",
          busSignColor: "text-amber-400",
          busHonkIcon: "📢"
        };
      case 'create':
        return {
          title: "Ônibus Carga Pesada de Provas! 📝🛠️",
          subtitle: "Linha de montagem de exames e avaliações didáticas COC em andamento...",
          floatingEmojis: ["📝", "✍️", "✏️", "🗂️", "📏", "💭", "🧠", "💡"],
          passengerEmojis: ["✍️", "🧠", "🎒", "🧑‍🏫"],
          bannerText: "FÁBRICA DE PROVAS • COC",
          ambientGradient: "from-slate-950 via-slate-900 to-purple-950/20",
          busColor: "bg-amber-500 border-amber-600",
          busSignColor: "text-amber-400",
          busHonkIcon: "⚡"
        };
      case 'banco_provas':
        return {
          title: "Cofre Forte Blindado CPS! 🗃️🔐",
          subtitle: "Escolta de segurança máxima das avaliações pedagógicas salvas...",
          floatingEmojis: ["🗃️", "🔒", "🔑", "📁", "📚", "🛡️", "🕵️", "📄"],
          passengerEmojis: ["🕵️", "🛡️", "🔒", "📁"],
          bannerText: "ARQUIVO BLINDADO • CPS",
          ambientGradient: "from-slate-950 via-slate-900 to-slate-800/20",
          busColor: "bg-amber-600 border-amber-700",
          busSignColor: "text-amber-500",
          busHonkIcon: "🛡️"
        };
      case 'studentReports':
        return {
          title: "Expresso Diagnóstico de Desempenho! 📊📈",
          subtitle: "Mapeando o rendimento, médias e gráficos individuais de evolução...",
          floatingEmojis: ["📊", "📈", "📉", "🔍", "🎯", "🔬", "📋", "📐"],
          passengerEmojis: ["🧠", "🔬", "📊", "🧑‍🎓"],
          bannerText: "RAIO-X ACADÊMICO",
          ambientGradient: "from-slate-950 via-slate-900 to-emerald-950/20",
          busColor: "bg-emerald-500 border-emerald-600",
          busSignColor: "text-emerald-300",
          busHonkIcon: "🎯"
        };
      case 'diary':
        return {
          title: "Estação Móvel de Frequências! 📓✔️",
          subtitle: "Estacionando para preencher presenças, notas e ocorrências de aula...",
          floatingEmojis: ["📓", "✔️", "❌", "🍎", "🖊️", "👨‍🏫", "📚", "📅"],
          passengerEmojis: ["👨‍🏫", "📓", "🎒", "🧑‍🎓"],
          bannerText: "DIÁRIO DIGITAL • CLASSE",
          ambientGradient: "from-slate-950 via-slate-900 to-teal-950/20",
          busColor: "bg-teal-500 border-teal-600",
          busSignColor: "text-teal-300",
          busHonkIcon: "✔️"
        };
      case 'boletim':
        return {
          title: "Expresso de Ouro dos Campeões! 🏆🌟",
          subtitle: "Carregando notas máximas, boletins dourados e medalhas pedagógicas...",
          floatingEmojis: ["🏆", "🌟", "🥇", "💯", "🏅", "🎓", "👑", "✨"],
          passengerEmojis: ["👑", "💯", "🏆", "🧑‍🎓"],
          bannerText: "BOLETIM DE PRESTÍGIO 10",
          ambientGradient: "from-slate-950 via-slate-900 to-yellow-950/25",
          busColor: "bg-yellow-400 border-yellow-500",
          busSignColor: "text-yellow-200 animate-pulse",
          busHonkIcon: "✨"
        };
      case 'cronograma':
        return {
          title: "Viagem Temporal de Calendários! 📅🕗",
          subtitle: "Calculando datas de provas, bimestres e prazos limites do ano letivo...",
          floatingEmojis: ["📅", "⏰", "⏳", "🔔", "📆", "🗓️", "⌛", "🕰️"],
          passengerEmojis: ["🕰️", "📅", "⏳", "🧑‍🏫"],
          bannerText: "AGENDA E CRONOGRAMAS",
          ambientGradient: "from-slate-950 via-slate-900 to-cyan-950/20",
          busColor: "bg-cyan-500 border-cyan-600",
          busSignColor: "text-cyan-300",
          busHonkIcon: "⏰"
        };
      case 'settings':
        return {
          title: "Oficina Mecânica e Ajustes! 🔧⚙️",
          subtitle: "Estacionando na rampa hidráulica para atualizar dados e trocar o óleo...",
          floatingEmojis: ["🔧", "🔩", "⚙️", "🛠️", "🩹", "🔑", "💻", "👤"],
          passengerEmojis: ["👨‍🔧", "🔧", "⚙️", "⚙️"],
          bannerText: "MANUTENÇÃO DE PERFIL",
          ambientGradient: "from-slate-950 via-slate-900 to-neutral-800/30",
          busColor: "bg-zinc-500 border-zinc-600",
          busSignColor: "text-zinc-300",
          busHonkIcon: "🔧"
        };
      case 'admin':
        return {
          title: "Comitê Diretor Executivo! 👑👔",
          subtitle: "Reservado para controle corporativo, permissões e decretos de gestão...",
          floatingEmojis: ["👑", "👔", "🎒", "💼", "🏢", "🏛️", "🖋️", "📜"],
          passengerEmojis: ["👑", "👔", "🎓", "💼"],
          bannerText: "CONSELHO DE ESTADO",
          ambientGradient: "from-slate-950 via-slate-900 to-amber-900/30",
          busColor: "bg-[#a88d44] border-yellow-600",
          busSignColor: "text-[#d4af37]",
          busHonkIcon: "👑"
        };
      case 'error_report':
        return {
          title: "Guincho Socorro de TI! 🚨🛠️",
          subtitle: "Despachando o veículo de suporte de emergência para rebocar bugs...",
          floatingEmojis: ["🚨", "🩹", "🪲", "🛠️", "🩹", "👾", "🩹", "🆘"],
          passengerEmojis: ["🚨", "🧰", "🐒", "🩹"],
          bannerText: "REBOCADOR DE BUGS 24H",
          ambientGradient: "from-slate-950 via-slate-900 to-red-950/20",
          busColor: "bg-red-500 border-red-600",
          busSignColor: "text-red-300",
          busHonkIcon: "🚨"
        };
      case 'error_admin':
        return {
          title: "Central de Logística do Suporte CPS! 🖥️🚑",
          subtitle: "Buscando os chamados abertos e relatórios de falha dos usuários...",
          floatingEmojis: ["🖥️", "🛡️", "🩹", "🩹", "📜", "📂", "🕸️", "🩹"],
          passengerEmojis: ["🖥️", "🛡️", "🧬", "🩹"],
          bannerText: "SUPORTE TECNICO CPS",
          ambientGradient: "from-slate-950 via-slate-900 to-indigo-950/20",
          busColor: "bg-indigo-500 border-indigo-600",
          busSignColor: "text-indigo-300",
          busHonkIcon: "🛡️"
        };
      default:
        return {
          title: "Expresso Colégio Progresso! 🚌📝",
          subtitle: "Carregando módulos de ensino e rotas em andamento...",
          floatingEmojis: ["📝", "🍎", "📚", "🖊️", "🎒", "🔔"],
          passengerEmojis: ["🧑‍🏫", "🧑‍🎓", "🎒", "📚"],
          bannerText: "PROGRESSO SANTISTA",
          ambientGradient: "from-slate-950 via-slate-900 to-slate-850/20",
          busColor: "bg-amber-400 border-amber-500",
          busSignColor: "text-amber-400",
          busHonkIcon: "🎺"
        };
    }
  }, [view]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className={`fixed inset-0 z-[99999] bg-gradient-to-br ${config.ambientGradient} backdrop-blur-md flex flex-col items-center justify-center overflow-hidden pointer-events-none select-none`}
        >
          {/* Animated floating theme doodles */}
          <div className="absolute inset-0 pointer-events-none opacity-45">
            {config.floatingEmojis.map((emoji, i) => (
              <motion.div
                key={i}
                initial={{ 
                  opacity: 0, 
                  x: Math.random() * 400 - 200, 
                  y: 400, 
                  rotate: Math.random() * 360 
                }}
                animate={{ 
                  opacity: [0, 1, 1, 0],
                  y: -250, 
                  rotate: Math.random() * 360 + 360,
                  x: Math.random() * 400 - 200
                }}
                transition={{ 
                  duration: 1.4, 
                  delay: i * 0.08,
                  ease: "easeInOut"
                }}
                className="absolute text-[42px]"
                style={{ 
                  left: `${15 + (Math.random() * 70)}%`,
                  top: '55%'
                }}
              >
                {emoji}
              </motion.div>
            ))}
          </div>

          <div className="text-center space-y-7 relative px-4 w-full max-w-lg">
            {/* Extremely funny full-speed school bus driving across */}
            <motion.div
              initial={{ x: "-115vw", rotate: -4 }}
              animate={{ 
                x: ["-115vw", "0vw", "0vw", "115vw"],
                rotate: [2, -2, 2, -1, 1, 3],
                y: [0, -8, 0, -10, 0, -4, 0],
              }}
              transition={{ 
                duration: 1.5,
                times: [0, 0.35, 0.70, 1],
                ease: "easeInOut"
              }}
              className="relative flex justify-center w-full"
            >
              {/* Bus Card */}
              <div className={`relative w-80 h-36 ${config.busColor} rounded-3xl border-4 border-slate-900 shadow-2xl flex flex-col justify-between overflow-hidden p-2`}>
                {/* Windows and custom passengers */}
                <div className="flex gap-2.5 justify-center mt-2.5">
                  {config.passengerEmojis.map((pEmoji, idx) => (
                    <div key={idx} className="w-14 h-11 bg-sky-100 border-2 border-slate-900 rounded-lg flex items-center justify-center relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-full h-1/2 bg-slate-800/ -skew-x-20" />
                      <motion.span 
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 0.28, delay: idx * 0.06, repeat: Infinity }}
                        className="text-2xl relative z-10"
                      >
                        {pEmoji}
                      </motion.span>
                    </div>
                  ))}
                </div>

                {/* CPS customized routing destination banner */}
                <div className={`bg-slate-950 ${config.busSignColor} font-mono font-black text-[9px] py-1.5 px-4 tracking-[0.2em] text-center rounded-lg mx-3 uppercase border border-white/5 truncate`}>
                  {config.bannerText}
                </div>

                {/* Bus lights & grille */}
                <div className="flex justify-between items-center px-4 mb-1">
                  <div className="w-4 h-4 bg-yellow-400 rounded-full border-2 border-slate-900 animate-pulse shadow-[0_0_10px_rgba(250,204,21,1)]" />
                  <div className="flex-1 mx-4 h-2.5 bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800" />
                  <div className="w-4 h-4 bg-yellow-400 rounded-full border-2 border-slate-900 animate-pulse shadow-[0_0_10px_rgba(250,204,21,1)]" />
                </div>
              </div>

              {/* Speedy Smoke clouds in rear */}
              <div className="absolute bottom-1 -left-8 flex flex-col gap-1 items-end pointer-events-none text-2xl animate-pulse">
                💨💨
              </div>
            </motion.div>

            {/* Custom status text box below */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.25 }}
              className="space-y-2 select-none"
            >
              <div className="text-yellow-400 font-display font-black text-xl md:text-2xl uppercase tracking-widest drop-shadow-[0_2px_5px_rgba(0,0,0,0.65)] animate-bounce">
                {config.title}
              </div>
              <div className="text-slate-700 dark:text-slate-400 font-sans font-extrabold text-[9.5px] tracking-widest uppercase px-6 leading-relaxed max-w-sm mx-auto">
                {config.subtitle}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
