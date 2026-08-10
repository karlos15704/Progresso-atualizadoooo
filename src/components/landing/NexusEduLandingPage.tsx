import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  Sparkles,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Users,
  BookOpen,
  FileText,
  BarChart3,
  Calendar,
  MessageSquare,
  Lock,
  Layers,
  ArrowRight,
  ChevronDown,
  Menu,
  X,
  Building2,
  Laptop,
  Smartphone,
  Cpu,
  Check,
  Globe,
  Award,
  Clock,
  Send,
  SlidersHorizontal,
  FileSpreadsheet,
  Palette,
  Shield,
  HelpCircle,
  TrendingUp,
  UserCheck
} from "lucide-react";
import { Canvas3DEducation } from "./Canvas3DEducation";

interface NexusEduLandingPageProps {
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onOpenDemo: () => void;
}

export const NexusEduLandingPage: React.FC<NexusEduLandingPageProps> = ({
  onOpenLogin,
  onOpenRegister,
  onOpenDemo,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // White label interactive switcher state
  const [activeTheme, setActiveTheme] = useState<"blue" | "emerald" | "purple">("blue");

  // Pricing Billing Toggle
  const [isAnnual, setIsAnnual] = useState(true);

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 30) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0b0f19] text-slate-100 font-sans selection:bg-blue-600 selection:text-white relative overflow-x-hidden">
      
      {/* Dynamic Background Ambient Glow Orbs */}
      <div className="fixed top-[-10%] left-1/4 w-[700px] h-[500px] bg-blue-600/10 rounded-full blur-[160px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-1/4 w-[700px] h-[500px] bg-indigo-600/10 rounded-full blur-[180px] pointer-events-none z-0" />

      {/* 5. NAVBAR (Fixed, Glassmorphic on Scroll) */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "py-3 bg-slate-950/85 backdrop-blur-xl border-b border-slate-800/80 shadow-2xl"
            : "py-5 bg-transparent border-b border-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          
          {/* Logo */}
          <div
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-white font-display">
                Nexus<span className="text-blue-400">Edu</span>
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20">
                SaaS
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-300">
            <button onClick={() => scrollToSection("produto")} className="hover:text-white transition-colors cursor-pointer">Produto</button>
            <button onClick={() => scrollToSection("solucoes")} className="hover:text-white transition-colors cursor-pointer">Soluções</button>
            <button onClick={() => scrollToSection("recursos")} className="hover:text-white transition-colors cursor-pointer">Recursos</button>
            <button onClick={() => scrollToSection("para-escolas")} className="hover:text-white transition-colors cursor-pointer">Para Escolas</button>
            <button onClick={() => scrollToSection("planos")} className="hover:text-white transition-colors cursor-pointer">Planos</button>
            <button onClick={() => scrollToSection("faq")} className="hover:text-white transition-colors cursor-pointer">FAQ</button>
          </nav>

          {/* Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              type="button"
              onClick={onOpenLogin}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all cursor-pointer"
            >
              Entrar
            </button>

            <button
              type="button"
              onClick={onOpenRegister}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-600/25 transition-all hover:scale-[1.02] active:scale-98 cursor-pointer"
            >
              Começar agora
            </button>
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-slate-950/95 border-b border-slate-800 px-6 py-6 space-y-4 shadow-2xl backdrop-blur-2xl"
            >
              <nav className="flex flex-col gap-3 text-sm font-semibold text-slate-300 text-left">
                <button onClick={() => scrollToSection("produto")} className="py-1 text-left hover:text-white">Produto</button>
                <button onClick={() => scrollToSection("solucoes")} className="py-1 text-left hover:text-white">Soluções</button>
                <button onClick={() => scrollToSection("recursos")} className="py-1 text-left hover:text-white">Recursos</button>
                <button onClick={() => scrollToSection("para-escolas")} className="py-1 text-left hover:text-white">Para Escolas</button>
                <button onClick={() => scrollToSection("planos")} className="py-1 text-left hover:text-white">Planos</button>
                <button onClick={() => scrollToSection("faq")} className="py-1 text-left hover:text-white">FAQ</button>
              </nav>

              <div className="pt-4 border-t border-slate-800 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => { setMobileMenuOpen(false); onOpenLogin(); }}
                  className="w-full py-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold text-xs"
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => { setMobileMenuOpen(false); onOpenRegister(); }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs"
                >
                  Começar agora
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* 3. HERO SECTION */}
      <section className="relative z-10 pt-32 sm:pt-40 pb-16 md:pb-24 max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Side Copy & CTAs */}
        <div className="lg:col-span-7 space-y-8 text-left">
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold backdrop-blur-md"
          >
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span>A plataforma que conecta toda a sua escola</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-4"
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.08] font-display">
              A escola do futuro <br />
              <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                começa agora.
              </span>
            </h1>
            <p className="text-slate-400 text-base sm:text-lg md:text-xl leading-relaxed max-w-2xl font-normal">
              O NexusEdu conecta gestão, professores, alunos, responsáveis e toda a comunidade escolar em uma única plataforma inteligente.
            </p>
          </motion.div>

          {/* Triple Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-wrap items-center gap-3.5 pt-2"
          >
            <button
              type="button"
              onClick={onOpenRegister}
              className="px-6 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold uppercase tracking-wider shadow-xl shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-98 cursor-pointer flex items-center gap-2"
            >
              <span>Começar agora</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => scrollToSection("produto")}
              className="px-6 py-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-98 cursor-pointer"
            >
              Conhecer a plataforma
            </button>

            <button
              type="button"
              onClick={onOpenDemo}
              className="px-6 py-4 rounded-2xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-98 cursor-pointer"
            >
              Agendar demonstração
            </button>
          </motion.div>

          {/* Quick Metrics Badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800/80 max-w-xl"
          >
            <div>
              <span className="text-xl font-bold text-white block font-display">+10</span>
              <span className="text-[11px] text-slate-400 font-medium">Módulos Integrados</span>
            </div>
            <div>
              <span className="text-xl font-bold text-blue-400 block font-display">99.8%</span>
              <span className="text-[11px] text-slate-400 font-medium">Precisão OMR por IA</span>
            </div>
            <div>
              <span className="text-xl font-bold text-indigo-400 block font-display">100% VPS</span>
              <span className="text-[11px] text-slate-400 font-medium">Dados Privativos</span>
            </div>
          </motion.div>
        </div>

        {/* Right Side: 4. ELEMENTO 3D */}
        <div className="lg:col-span-5 w-full">
          <Canvas3DEducation />
        </div>
      </section>

      {/* 6. SEÇÃO "TUDO EM UM SÓ LUGAR" */}
      <section id="produto" className="relative z-10 py-20 max-w-7xl mx-auto px-4 sm:px-6 text-center space-y-12">
        <div className="space-y-3 max-w-3xl mx-auto">
          <span className="text-xs font-extrabold uppercase tracking-widest text-blue-400 font-mono">
            Módulos Unificados
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white font-display tracking-tight">
            Tudo o que sua escola precisa. Em um só lugar.
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Elimine a fragmentação de sistemas com uma arquitetura de dados verdadeiramente unificada.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-left">
          {[
            { icon: Building2, title: "Gestão Escolar", desc: "Controle institucional completo de turmas, matrículas e diretrizes." },
            { icon: BookOpen, title: "Gestão Pedagógica", desc: "Acompanhamento de planos de aula, diretrizes curriculares e metas." },
            { icon: Users, title: "Professores", desc: "Diário eletrônico intuitivo, lançamento de notas e frequências." },
            { icon: GraduationCap, title: "Alunos", desc: "Histórico escolar unificado, desempenho acadêmico e boletins." },
            { icon: UserCheck, title: "Responsáveis", desc: "Portal da família com atualizações presenciais e avisos instantâneos." },
            { icon: MessageSquare, title: "Comunicação", desc: "Canal direto de mensagens organizadas entre escola e famílias." },
            { icon: FileText, title: "Provas & OMR", desc: "Geração de avaliações e correção automatizada por IA em segundos." },
            { icon: BarChart3, title: "Relatórios", desc: "Dashboards analíticos de desempenho por turma e por aluno." },
            { icon: Clock, title: "Frequência", desc: "Controle diário de presença automatizado com alerta aos pais." },
            { icon: Award, title: "Notas & Boletim", desc: "Cálculo automático de médias bimestrais e recuperação." },
            { icon: Calendar, title: "Agenda Eletrônica", desc: "Cronograma de eventos, provas e reuniões acadêmicas." },
            { icon: FileSpreadsheet, title: "Documentos", desc: "Emissão de histórico escolar, atestados e declarações." },
            { icon: Shield, title: "Financeiro & VPS", desc: "Infraestrutura isolada em VPS privativa com máxima segurança." },
          ].map((card, idx) => (
            <motion.div
              key={`feature-card-${idx}`}
              whileHover={{ y: -6, scale: 1.02 }}
              transition={{ duration: 0.2 }}
              className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-blue-500/40 backdrop-blur-xl transition-all shadow-lg hover:shadow-2xl hover:shadow-blue-600/10 space-y-3 cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <card.icon className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white font-display group-hover:text-blue-400 transition-colors">
                {card.title}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed font-normal">
                {card.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 7. SEÇÃO DE CONEXÃO */}
      <section className="relative z-10 py-20 bg-slate-950/60 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center space-y-12">
          
          <div className="space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-extrabold uppercase tracking-widest text-blue-400 font-mono">
              Fluxo Integrado
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white font-display tracking-tight">
              Uma escola. Uma plataforma. Todos conectados.
            </h2>
          </div>

          {/* Connected Workflow Line Diagram */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center justify-center relative">
            {[
              { step: "01", label: "DIREÇÃO", icon: Building2, color: "text-blue-400 border-blue-500/30" },
              { step: "02", label: "COORDENAÇÃO", icon: SlidersHorizontal, color: "text-indigo-400 border-indigo-500/30" },
              { step: "03", label: "PROFESSORES", icon: Users, color: "text-cyan-400 border-cyan-500/30" },
              { step: "04", label: "ALUNOS", icon: GraduationCap, color: "text-emerald-400 border-emerald-500/30" },
              { step: "05", label: "RESPONSÁVEIS", icon: UserCheck, color: "text-purple-400 border-purple-500/30" },
            ].map((node, i) => (
              <React.Fragment key={`conn-node-${i}`}>
                <div className={`p-6 rounded-3xl bg-slate-900 border ${node.color} shadow-xl text-center space-y-2 relative group hover:scale-105 transition-transform`}>
                  <div className="text-[10px] font-black text-slate-500 block font-mono">{node.step}</div>
                  <node.icon className={`w-8 h-8 mx-auto ${node.color.split(" ")[0]}`} />
                  <span className="text-xs font-black tracking-wider text-white block">{node.label}</span>
                </div>
                {i < 4 && (
                  <div className="hidden md:flex items-center justify-center text-slate-600 font-bold">
                    <ArrowRight className="w-6 h-6 animate-pulse text-blue-500" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* 8. SEÇÃO PARA DIREÇÃO */}
      <section id="solucoes" className="relative z-10 py-20 max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-5 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
            <Building2 className="w-4 h-4" />
            <span>Para a Gestão e Direção</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white font-display leading-tight">
            Tenha sua escola inteira na palma da mão.
          </h2>

          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Acompanhe indicadores institucionais estratégicos, desempenho acadêmico das turmas, frequências gerais e emissão de dados com precisão cirúrgica.
          </p>

          <ul className="space-y-3 pt-2 text-xs sm:text-sm text-slate-300 font-medium">
            <li className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4.5 h-4.5 text-blue-400 shrink-0" />
              <span>Dashboard executivo com métricas consolidadas.</span>
            </li>
            <li className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4.5 h-4.5 text-blue-400 shrink-0" />
              <span>Controle total de permissões por perfil profissional.</span>
            </li>
            <li className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4.5 h-4.5 text-blue-400 shrink-0" />
              <span>Relatórios estatísticos prontos para reuniões de conselho.</span>
            </li>
          </ul>
        </div>

        {/* Dashboard Mockup Representation */}
        <div className="lg:col-span-7">
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-6 text-left">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-slate-400 ml-2">Painel de Controle Institucional — NexusEdu</span>
              </div>
              <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">Live Sync</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Alunos</span>
                <span className="text-xl font-extrabold text-white font-display">1.240</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Frequência Média</span>
                <span className="text-xl font-extrabold text-emerald-400 font-display">96.4%</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Provas Corrigidas</span>
                <span className="text-xl font-extrabold text-blue-400 font-display">4.890</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span>Evolução de Desempenho por Bimestre</span>
                <span className="text-blue-400">Média Geral: 8.4</span>
              </div>
              <div className="h-28 w-full flex items-end justify-between gap-2 pt-4 px-2">
                {[65, 78, 85, 92, 88, 95].map((h, i) => (
                  <div key={i} className="w-full bg-slate-900 rounded-t-lg relative group">
                    <div
                      className="bg-gradient-to-t from-blue-600 to-indigo-500 rounded-t-lg transition-all"
                      style={{ height: `${h}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. SEÇÃO PARA PROFESSORES */}
      <section className="relative z-10 py-20 bg-slate-950/40 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-7 order-2 lg:order-1">
            <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-left space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span>Gerador de Avaliações por IA & Diário Eletrônico</span>
                </span>
                <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">Modelo Oficial</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-300 block">Questão 01 — Matemática Aplicada</span>
                <p className="text-xs text-slate-400">Em uma matriz estatística escolar com 120 alunos, determine a variação percentual...</p>
                <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] font-medium text-slate-300">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-blue-400 font-bold">A) 15.4% (Correta)</div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">B) 12.8%</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-bold text-slate-400 pt-1">
                <span>⚡ Leitura OMR por Câmera: &lt; 1.2s</span>
                <span className="text-emerald-400">Gabarito Validado ✅</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6 text-left order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
              <Users className="w-4 h-4" />
              <span>Para Corpo Docente</span>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white font-display leading-tight">
              Mais tempo para ensinar. Menos tempo organizando.
            </h2>

            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Simplifique a rotina docente. Crie avaliações em minutos, registre a frequência em segundos e acompanhe o aprendizado com o diário digital inteligente.
            </p>
          </div>
        </div>
      </section>

      {/* 10. SEÇÃO PARA RESPONSÁVEIS */}
      <section className="relative z-10 py-20 max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-5 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold">
            <UserCheck className="w-4 h-4" />
            <span>Portal da Família</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white font-display leading-tight">
            A escola mais perto das famílias.
          </h2>

          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Os pais acompanham boletins acadêmicos, presença em tempo real e avisos pedagógicos diretamente pelo aplicativo ou portal web da escola.
          </p>
        </div>

        <div className="lg:col-span-7">
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-left space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-cyan-400" />
                <span>Portal da Família — Aluno Lucas Silva (9º Ano)</span>
              </span>
              <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">Notificações Ativas</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Matemática</span>
                <span className="text-lg font-black text-emerald-400 font-display">9.5</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Física</span>
                <span className="text-lg font-black text-blue-400 font-display">8.8</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">História</span>
                <span className="text-lg font-black text-indigo-400 font-display">9.0</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Frequência</span>
                <span className="text-lg font-black text-emerald-400 font-display">98%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 11. SEÇÃO DE COMUNICAÇÃO */}
      <section className="relative z-10 py-20 bg-slate-950/60 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center space-y-12">
          
          <div className="space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-extrabold uppercase tracking-widest text-blue-400 font-mono">
              Comunicação Segura
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white font-display tracking-tight">
              Comunicação que realmente conecta.
            </h2>
          </div>

          <div className="max-w-xl mx-auto rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-left space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold text-white">Canal Institucional — Coordenação Pedagógica</span>
              <span className="text-[10px] text-slate-400 font-mono">Hoje, 14:30</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 max-w-[85%]">
                <span className="text-[10px] font-bold text-blue-400 block mb-1">Coordenação</span>
                <span>Prezados pais, informamos que a reunião de alinhamento bimestral ocorrerá nesta quinta-feira às 19h.</span>
                <span className="text-[9px] text-slate-500 block text-right mt-1">14:31 • Entregue</span>
              </div>

              <div className="p-3 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-white max-w-[85%] ml-auto">
                <span className="text-[10px] font-bold text-blue-300 block mb-1">Responsável (Mãe do Lucas)</span>
                <span>Confirmo nossa presença! Obrigado pelo aviso.</span>
                <span className="text-[9px] text-blue-400 block text-right mt-1">14:35 • Lido ✓✓</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 12. SEÇÃO DE PROVAS (MODELOS) */}
      <section id="recursos" className="relative z-10 py-20 max-w-7xl mx-auto px-4 sm:px-6 text-center space-y-12">
        <div className="space-y-3 max-w-3xl mx-auto">
          <span className="text-xs font-extrabold uppercase tracking-widest text-blue-400 font-mono">
            Modelos de Avaliação
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white font-display tracking-tight">
            Crie provas profissionais em poucos minutos.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 text-left">
          {[
            { name: "Modelo Progresso", badge: "Padrão Oficial" },
            { name: "Modelo Moderno", badge: "Layout Clean" },
            { name: "Modelo Minimalista", badge: "Alta Densidade" },
            { name: "Modelo Institucional", badge: "Com Logotipo" },
            { name: "Modelo Clássico", badge: "Tradicional" },
          ].map((model, idx) => (
            <div key={`model-${idx}`} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition-all text-center space-y-3 cursor-pointer group">
              <div className="w-full h-24 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between p-2">
                <div className="w-1/2 h-2 bg-blue-500/40 rounded" />
                <div className="space-y-1">
                  <div className="w-full h-1.5 bg-slate-800 rounded" />
                  <div className="w-4/5 h-1.5 bg-slate-800 rounded" />
                </div>
              </div>
              <div>
                <span className="text-xs font-bold text-white block">{model.name}</span>
                <span className="text-[10px] text-blue-400 font-mono">{model.badge}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 14. SEÇÃO DE INTELIGÊNCIA ARTIFICIAL */}
      <section className="relative z-10 py-20 bg-slate-950/60 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center space-y-12">
          
          <div className="space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-extrabold uppercase tracking-widest text-blue-400 font-mono">
              IA Educacional
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white font-display tracking-tight">
              A inteligência artificial trabalhando a favor da educação.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
            {[
              { title: "Gerar Provas & Questões", status: "✅ Disponível", desc: "Elabore questões inéditas adaptadas à BNCC em segundos." },
              { title: "Planos de Aula Inteligentes", status: "✅ Disponível", desc: "Sugestões de metodologias e cronogramas pedagógicos." },
              { title: "Análise de Desempenho", status: "✅ Disponível", desc: "Identificação automática de defasagens de aprendizagem." },
              { title: "Relatórios Preditivos", status: "⚡ Em breve", desc: "Previsão de evasão e alertas pedagógicos preventivos." },
            ].map((aiItem, idx) => (
              <div key={`ai-${idx}`} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
                <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  {aiItem.status}
                </span>
                <h3 className="text-base font-bold text-white font-display">{aiItem.title}</h3>
                <p className="text-xs text-slate-400">{aiItem.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 15. PARA QUALQUER ESCOLA */}
      <section id="para-escolas" className="relative z-10 py-20 max-w-7xl mx-auto px-4 sm:px-6 text-center space-y-12">
        <div className="space-y-3 max-w-3xl mx-auto">
          <span className="text-xs font-extrabold uppercase tracking-widest text-blue-400 font-mono">
            Versatilidade
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white font-display tracking-tight">
            Uma plataforma que se adapta à sua escola.
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
          {["Educação Infantil", "Fundamental I", "Fundamental II", "Ensino Médio", "Cursos Libres", "Faculdades"].map((level, i) => (
            <div key={i} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-200 hover:border-blue-500/40 transition-colors cursor-pointer">
              {level}
            </div>
          ))}
        </div>
      </section>

      {/* 16. WHITE LABEL */}
      <section className="relative z-10 py-20 bg-slate-950/60 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center space-y-12">
          
          <div className="space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-extrabold uppercase tracking-widest text-blue-400 font-mono">
              White Label
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white font-display tracking-tight">
              A plataforma é sua. A identidade também.
            </h2>
            <p className="text-slate-400 text-sm">
              Personalize logotipo, cores institucionais e subdomínio próprio para sua escola.
            </p>
          </div>

          <div className="flex justify-center gap-3">
            <button
              onClick={() => setActiveTheme("blue")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTheme === "blue" ? "bg-blue-600 text-white" : "bg-slate-900 text-slate-400"
              }`}
            >
              Tema Colégio Futuro (Azul)
            </button>
            <button
              onClick={() => setActiveTheme("emerald")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTheme === "emerald" ? "bg-emerald-600 text-white" : "bg-slate-900 text-slate-400"
              }`}
            >
              Tema Escola Verde (Esmeralda)
            </button>
            <button
              onClick={() => setActiveTheme("purple")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTheme === "purple" ? "bg-purple-600 text-white" : "bg-slate-900 text-slate-400"
              }`}
            >
              Tema Instituto Inovação (Roxo)
            </button>
          </div>
        </div>
      </section>

      {/* 17. SEGURANÇA */}
      <section className="relative z-10 py-20 max-w-7xl mx-auto px-4 sm:px-6 text-center space-y-12">
        <div className="space-y-3 max-w-3xl mx-auto">
          <span className="text-xs font-extrabold uppercase tracking-widest text-blue-400 font-mono">
            Proteção Privativa
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white font-display tracking-tight">
            Os dados da sua escola merecem proteção.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
            <ShieldCheck className="w-8 h-8 text-blue-400" />
            <h3 className="text-base font-bold text-white font-display">Conformidade LGPD</h3>
            <p className="text-xs text-slate-400">Controle rigoroso de privacidade de dados de alunos e responsáveis.</p>
          </div>
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
            <Lock className="w-8 h-8 text-indigo-400" />
            <h3 className="text-base font-bold text-white font-display">VPS Isolada & Backup</h3>
            <p className="text-xs text-slate-400">Instância de banco de dados privativa de alta velocidade com backup diário.</p>
          </div>
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
            <UserCheck className="w-8 h-8 text-cyan-400" />
            <h3 className="text-base font-bold text-white font-display">Controle por Permissão</h3>
            <p className="text-xs text-slate-400">Acesso restrito por papel funcional (Direção, Professor, Aluno, Secretaria).</p>
          </div>
        </div>
      </section>

      {/* 20. PLANOS */}
      <section id="planos" className="relative z-10 py-20 bg-slate-950/60 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center space-y-12">
          
          <div className="space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-extrabold uppercase tracking-widest text-blue-400 font-mono">
              Investimento Transparente
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white font-display tracking-tight">
              Escolha o plano ideal para sua escola.
            </h2>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-left">
            {[
              { name: "Plano Essencial", price: "Sob Consulta", desc: "Ideal para pequenas escolas e cursos.", features: ["Até 300 Alunos", "Diário Digital", "Boletins em PDF", "Suporte Escolar"] },
              { name: "Plano Profissional", price: "Recomendado", desc: "A escolha completa para escolas em crescimento.", features: ["Até 1.000 Alunos", "IA de Correção OMR", "Gerador de Provas", "Portal da Família", "VPS Dedicada"], popular: true },
              { name: "Plano Premium", price: "Sob Consulta", desc: "Para grandes colégios e redes de ensino.", features: ["Alunos Ilimitados", "Módulo White Label", "IA Avançada", "Suporte Prioritário 24/7"] },
              { name: "Plano Enterprise", price: "Customizado", desc: "Para redes de ensino e secretarias de educação.", features: ["Multi-unidades", "Infraestrutura Privativa", "SLA Garantido", "Treinamento Presencial"] },
            ].map((plan, i) => (
              <div key={i} className={`p-6 rounded-3xl bg-slate-900 border text-left space-y-6 relative flex flex-col justify-between ${plan.popular ? "border-blue-500 shadow-2xl shadow-blue-600/20" : "border-slate-800"}`}>
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-600 text-white">
                    Mais Escolhido
                  </span>
                )}
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-white font-display">{plan.name}</h3>
                  <div className="text-xl font-extrabold text-blue-400 font-display">{plan.price}</div>
                  <p className="text-xs text-slate-400">{plan.desc}</p>

                  <ul className="space-y-2 text-xs text-slate-300 pt-2 font-medium">
                    {plan.features.map((f, fi) => (
                      <li key={fi} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-blue-400 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={onOpenDemo}
                  className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                    plan.popular ? "bg-blue-600 hover:bg-blue-500 text-white" : "bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800"
                  }`}
                >
                  Solicitar Proposta
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 22. FAQ ACCORDION */}
      <section id="faq" className="relative z-10 py-20 max-w-4xl mx-auto px-4 sm:px-6 space-y-8 text-left">
        <div className="text-center space-y-3">
          <span className="text-xs font-extrabold uppercase tracking-widest text-blue-400 font-mono">
            Tire Suas Dúvidas
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white font-display tracking-tight">
            Perguntas Frequentes
          </h2>
        </div>

        <div className="space-y-3">
          {[
            { q: "O que é o NexusEdu?", a: "O NexusEdu é uma plataforma SaaS completa de gestão educacional que conecta direção, professores, alunos e famílias em um único ecossistema inteligente." },
            { q: "Para quais escolas ele serve?", a: "Atende desde a Educação Infantil, Fundamental I e II, Ensino Médio, Cursos Livres e Faculdades." },
            { q: "Preciso instalar alguma coisa?", a: "Não. O NexusEdu é 100% online e funciona diretamente em qualquer navegador pelo computador, tablet ou celular." },
            { q: "Meus dados ficam seguros?", a: "Sim. Seus dados são armazenados em servidores isolados em VPS privativa com rotinas automáticas de backup e conformidade LGPD." },
            { q: "Posso personalizar a plataforma com a minha marca?", a: "Sim! Disponibilizamos o módulo White Label para personalização de logotipo e cores institucionais." },
            { q: "Como funciona a correção de provas por IA?", a: "O professor tira uma foto do gabarito pelo celular ou webcam e o sistema lê as marcações OMR em menos de 1.2 segundos." },
          ].map((item, idx) => (
            <div key={idx} className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                className="w-full p-5 text-left font-bold text-xs sm:text-sm text-white flex items-center justify-between cursor-pointer"
              >
                <span>{item.q}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openFaqIndex === idx ? "rotate-180 text-blue-400" : ""}`} />
              </button>
              {openFaqIndex === idx && (
                <div className="px-5 pb-5 text-xs text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 23. CTA FINAL */}
      <section className="relative z-10 py-24 max-w-7xl mx-auto px-4 sm:px-6 text-center">
        <div className="p-10 sm:p-16 rounded-3xl bg-gradient-to-br from-blue-900/40 via-indigo-900/30 to-slate-900 border border-blue-500/30 backdrop-blur-2xl shadow-2xl space-y-8">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white font-display tracking-tight">
            Sua escola merece mais.
          </h2>
          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Menos sistemas. Menos burocracia. Mais conexão, organização e tempo para aquilo que realmente importa: educar.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              type="button"
              onClick={onOpenRegister}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold uppercase tracking-wider shadow-2xl shadow-blue-600/40 transition-all hover:scale-[1.02] active:scale-98 cursor-pointer"
            >
              Começar agora
            </button>
            <button
              type="button"
              onClick={onOpenDemo}
              className="px-8 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-98 cursor-pointer"
            >
              Agendar demonstração
            </button>
          </div>
        </div>
      </section>

      {/* 24. FOOTER */}
      <footer className="relative z-10 w-full bg-slate-950 border-t border-slate-800/80 pt-16 pb-12 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 text-left">
          
          <div className="space-y-4 lg:col-span-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="text-lg font-bold text-white font-display">NexusEdu</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Plataforma SaaS de Gestão Escolar Inteligente. Conectando direção, coordenação, professores, alunos e famílias.
            </p>
          </div>

          <div className="space-y-3">
            <strong className="text-white block font-display">Produto</strong>
            <ul className="space-y-2">
              <li><button onClick={() => scrollToSection("produto")} className="hover:text-white">Módulos Escolares</button></li>
              <li><button onClick={() => scrollToSection("recursos")} className="hover:text-white">Correção OMR IA</button></li>
              <li><button onClick={() => scrollToSection("solucoes")} className="hover:text-white">Portal da Direção</button></li>
            </ul>
          </div>

          <div className="space-y-3">
            <strong className="text-white block font-display">Empresa & Legislação</strong>
            <ul className="space-y-2">
              <li><a href="#faq" className="hover:text-white">Política de Privacidade</a></li>
              <li><a href="#faq" className="hover:text-white">Termos de Uso</a></li>
              <li><a href="#faq" className="hover:text-white">Conformidade LGPD</a></li>
            </ul>
          </div>

          <div className="space-y-3">
            <strong className="text-white block font-display">Acesso Direto</strong>
            <div className="space-y-2">
              <button
                type="button"
                onClick={onOpenLogin}
                className="w-full py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-blue-400 font-bold text-xs text-center cursor-pointer"
              >
                Acessar Plataforma
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 mt-12 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>
            © {new Date().getFullYear()} <strong className="text-slate-300">NexusEdu EdTech SaaS</strong>. Todos os direitos reservados.
          </div>
          <div>
            Desenvolvido com excelência por <strong className="text-blue-400">Antônio Carlos</strong>
          </div>
        </div>
      </footer>
    </div>
  );
};
