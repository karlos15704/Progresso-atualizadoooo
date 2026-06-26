import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthUser as User } from "@supabase/supabase-js";
import { 
  Plus, 
  FileText,
  Flame, 
  CheckCircle2, 
  BarChart3, 
  User as UserIcon, 
  LayoutList, 
  BookOpen, 
  FileSpreadsheet, 
  Calendar, 
  Users, 
  Settings, 
  Lock, 
  Trash2, 
  Search, 
  X, 
  Megaphone, 
  Pin, 
  Check, 
  Sparkles, 
  ChevronRight,
  Activity,
  RefreshCw,
  Loader2,
  Shield,
  Inbox
} from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { getSchoolInfo } from '../App';
import { getBimesterForExam } from '../utils/bimesterUtils';
import { Exam, Result } from '../types';
import confetti from 'canvas-confetti';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  ZAxis,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

const playStadiumSound = (type: 'horn' | 'cheer' | 'kick') => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    if (type === 'horn') {
      const baseFreq = 233.08; // B-flat 3
      const oscillators: OscillatorNode[] = [];
      const gainNode = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      
      const osc1 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      
      const osc2 = ctx.createOscillator();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(baseFreq * 2 + 2, ctx.currentTime);
      
      const osc3 = ctx.createOscillator();
      osc3.type = 'sawtooth';
      osc3.frequency.setValueAtTime(baseFreq * 3 - 2, ctx.currentTime);
      
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(8, ctx.currentTime);
      lfoGain.gain.setValueAtTime(5, ctx.currentTime);
      
      lfo.connect(lfoGain);
      lfoGain.connect(osc1.frequency);
      lfoGain.connect(osc2.frequency);
      lfoGain.connect(osc3.frequency);
      
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, ctx.currentTime);
      filter.Q.setValueAtTime(1.5, ctx.currentTime);
      
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      osc3.connect(gainNode);
      gainNode.connect(filter);
      filter.connect(ctx.destination);
      
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.15);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2.5);
      
      lfo.start();
      osc1.start();
      osc2.start();
      osc3.start();
      
      lfo.stop(ctx.currentTime + 2.6);
      osc1.stop(ctx.currentTime + 2.6);
      osc2.stop(ctx.currentTime + 2.6);
      osc3.stop(ctx.currentTime + 2.6);
    } else if (type === 'cheer') {
      const bufferSize = ctx.sampleRate * 3.5;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = buffer;
      
      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(450, ctx.currentTime);
      bandpass.Q.setValueAtTime(0.8, ctx.currentTime);
      
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(1000, ctx.currentTime);
      
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.5);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 3.4);
      
      noiseNode.connect(bandpass);
      bandpass.connect(lowpass);
      lowpass.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      noiseNode.start();
      noiseNode.stop(ctx.currentTime + 3.5);
    } else if (type === 'kick') {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.08);
      
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    }
  } catch (_) {}
};

interface DashboardViewProps {
  isLoadingData?: boolean;
  user: User;
  isAdmin: boolean;
  exams: Exam[];
  results: Result[];
  setView: (v: any) => void;
  onSelectPrintExam: (e: Exam) => void;
  onEditExam: (exam: Exam | null) => void;
  onDeleteExam: (id: string) => void;
  professors: any[];
  onReassignProfessor: (exam: Exam) => void;
  userProfile: any;
  onRefresh?: () => void;
  readAnnouncements?: string[];
  onMarkAsRead?: (id: string) => void;
  studentReports?: any[];
  onViewBancoProvas?: (tab: "Provas" | "Atividades") => void;
  isWorldCupTheme?: boolean;
  setIsWorldCupTheme?: (val: boolean) => void;
}

export function DashboardView({ 
  isLoadingData = false,
  user, 
  isAdmin, 
  exams, 
  results, 
  setView, 
  onSelectPrintExam, 
  onEditExam, 
  onDeleteExam, 
  professors, 
  onReassignProfessor, 
  userProfile, 
  onRefresh, 
  readAnnouncements = [], 
  onMarkAsRead = () => {},
  studentReports = [],
  onViewBancoProvas,
  isWorldCupTheme: propIsWorldCupTheme,
  setIsWorldCupTheme: propSetIsWorldCupTheme
}: DashboardViewProps) {
  
  const schoolInfo = getSchoolInfo();
  
  const isTIUser = user?.email === 'ti@cps.local' || (userProfile?.role || '').toLowerCase().includes('ti') || (userProfile?.professional_name || '').toLowerCase().includes('ti');

  // Comical School Bus states
  const [showEntryBus, setShowEntryBus] = useState(() => {
    return localStorage.getItem('cps_bus_animations_enabled') !== 'false';
  });
  const [dashboardBusHonk, setDashboardBusHonk] = useState(false);
  const [busPhraseIdx, setBusPhraseIdx] = useState(0);  // ⚽ NEW FEATURE: WORLD CUP THEME DEFAULT STATE
  const [localIsWorldCupTheme, setLocalIsWorldCupTheme] = useState(() => {
    const saved = localStorage.getItem('cps_world_cup_theme');
    return saved !== 'false'; // Default is true, only false if explicitly saved as 'false'
  });

  const isWorldCupTheme = propIsWorldCupTheme !== undefined ? propIsWorldCupTheme : localIsWorldCupTheme;
  const setIsWorldCupTheme = propSetIsWorldCupTheme !== undefined ? propSetIsWorldCupTheme : setLocalIsWorldCupTheme;

  const [goalCelebration, setGoalCelebration] = useState(false);
  const [goalText, setGoalText] = useState("GOOOOL! ⚽ BRASIL!");

  const triggerGoalCelebration = () => {
    const phrases = [
      "GOOOOL! ⚽ BRASIL!",
      "É DO BRASIL! 🌟",
      "RUMO AO HEXA! 🏆",
      "BATEU UM BOLÃO! ⚽",
      "GOLAÇO! 💥",
      "SHOW DE BOLA! ⭐",
      "BRASIL! 💛💚",
      "CAMISA 10! 👕"
    ];
    const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
    setGoalText(randomPhrase);
    setGoalCelebration(true);
    
    playStadiumSound('horn');
    setTimeout(() => {
      playStadiumSound('cheer');
    }, 200);

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#16a34a", "#facc15", "#2563eb", "#ffffff"]
      });
      
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ["#16a34a", "#facc15", "#2563eb"]
        });
      }, 250);
      
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ["#16a34a", "#facc15", "#2563eb"]
        });
      }, 400);
    } catch (_) {}

    setTimeout(() => {
      setGoalCelebration(false);
    }, 3500);
  };

  const toggleWorldCupTheme = () => {
    setIsWorldCupTheme(prev => {
      const next = !prev;
      localStorage.setItem('cps_world_cup_theme', String(next));
      if (next) {
        try {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ["#16a34a", "#facc15", "#2563eb"] });
        } catch (_) {}
      }
      return next;
    });
  };

  const funBusPhrases = useMemo(() => [
    "Próxima parada: Sala dos Professores! 🍎",
    "Sinal bateu! Todo mundo pro pátio! 🔔📝",
    "Ar condicionado no máximo hoje! ❄️🚌",
    "Estacionado com precisão milimétrica! 🏎️💨",
    "Lanche coletivo na viagem de estudos! 🍌",
    "Atenção: Não jogue lápis pela janela! 🪟",
    "Ônibus abastecido 100% de café! ☕⚡",
    "Quem perdeu o estojo do Ben 10? ✏️🎒",
    "Antônio Carlos é o nosso motorista honorário! 👑🚌",
  ], []);

  React.useEffect(() => {
    if (localStorage.getItem('cps_bus_animations_enabled') === 'false') {
      setShowEntryBus(false);
      return;
    }
    const timer = setTimeout(() => {
      setShowEntryBus(false);
    }, 2200);
    return () => clearTimeout(timer);
  }, []);

  const [bimesterFilter, setBimesterFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [muralFilter, setMuralFilter] = useState<'todos' | 'meus'>('todos');
  const [chartClassFilters, setChartClassFilters] = useState<string[]>([]);

  const availableClasses = useMemo(() => {
    const roles = (userProfile?.role || "professor").split(",").map((r: string) => r.trim().toLowerCase());
    const isSuperAdmin = roles.some(r => ["admin", "ti", "suporte", "diretor", "diretoria", "vice_diretor"].includes(r));
    
    let allowedClasses: string[] = [];
    const classes = new Set<string>();
    const info = schoolInfo as any;
    
    // Add classes from standard classes array
    if (info?.classes && Array.isArray(info.classes)) {
      info.classes.forEach(c => classes.add(c));
    }

    // Add classes from student registrations in studentsDB
    if (info?.studentsDB) {
      Object.values(info.studentsDB).forEach((studentList: any) => {
        if (Array.isArray(studentList)) {
          studentList.forEach(student => {
            if (student && student.classId) {
              classes.add(student.classId);
            }
          });
        }
      });
    }

    // Add classes from student reports database
    if (info?.studentReportsDB) {
      Object.keys(info.studentReportsDB).forEach(classId => classes.add(classId));
    }
    
    // Add classes from folders database
    if (info?.foldersDB) {
      Object.keys(info.foldersDB).forEach(classId => classes.add(classId));
    }
    
    const allSchoolClasses = Array.from(classes);

    if (isSuperAdmin) {
      allowedClasses = allSchoolClasses;
    } else if (roles.includes("coordenador_fund1")) {
      allowedClasses = allSchoolClasses.filter((c: string) => /^[1-5]/.test(c));
    } else if (roles.includes("coordenador_fund2")) {
      allowedClasses = allSchoolClasses.filter((c: string) => /^[6-9]/.test(c));
    } else {
      allowedClasses = userProfile?.assigned_classes || [];
    }

    if (allowedClasses.length === 0) {
      if (userProfile?.assigned_classes && userProfile.assigned_classes.length > 0) {
        allowedClasses = userProfile.assigned_classes;
      } else {
        allowedClasses = allSchoolClasses.length > 0 ? allSchoolClasses : ['Maternal I', 'Jardim I', 'Jardim II', '1º Ano A', '1º Ano B', '2º Ano A', '3º Ano A', '4º Ano A', '5º Ano A', '6º Ano A', '7º Ano A', '8º Ano A', '9º Ano A'];
      }
    }

    return [...allowedClasses].sort();
  }, [schoolInfo, userProfile]);

  const [showChartClassDropdown, setShowChartClassDropdown] = useState(false);
  const [chartBimesterFilters, setChartBimesterFilters] = useState<string[]>(['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre']);
  const [showChartBimesterDropdown, setShowChartBimesterDropdown] = useState(false);
  const [chartSubjectFilter, setChartSubjectFilter] = useState('');
  const [selectedComparisonYear, setSelectedComparisonYear] = useState('');

  const yearOptions = useMemo(() => {
    const years = new Set<string>();
    availableClasses.forEach(cls => {
      const match = cls.match(/^(\d+º|\d+ª|\d+|Maternal|Jardim|Pré I|Pré II)/i);
      if (match) {
        years.add(match[1]);
      } else {
        const firstWord = cls.split(' ')[0];
        if (firstWord) years.add(firstWord);
      }
    });
    return Array.from(years).sort((a, b) => {
      const isNumA = /^\d+/.test(a);
      const isNumB = /^\d+/.test(b);
      if (isNumA && !isNumB) return 1;
      if (!isNumA && isNumB) return -1;
      return a.localeCompare(b, undefined, { numeric: true });
    });
  }, [availableClasses]);

  React.useEffect(() => {
    if (!selectedComparisonYear && yearOptions.length > 0) {
      setSelectedComparisonYear(yearOptions[0]);
    }
  }, [yearOptions, selectedComparisonYear]);

  const classComparisonStats = useMemo(() => {
    if (!selectedComparisonYear) return [];
    
    const classesInYear = availableClasses.filter(cls => {
      if (cls === selectedComparisonYear) return true;
      if (cls.startsWith(selectedComparisonYear + ' ')) return true;
      if (cls.startsWith(selectedComparisonYear + 'º')) return true;
      if (cls.startsWith(selectedComparisonYear + 'ª')) return true;
      
      const yearOnly = selectedComparisonYear.replace(/[ºª]/g, '');
      if (cls.startsWith(yearOnly + ' ')) return true;
      return false;
    });
    
    // Process results for these classes
    const stats = classesInYear.map(cls => {
      const classResults = results.filter(r => {
        const isScoreValid = r.score !== null && r.score !== undefined && !isNaN(Number(r.score));
        return r.studentClass === cls && isScoreValid;
      });
      
      if (classResults.length === 0) {
         return { name: cls, average: 0, isDemo: false };
      }
      
      const sum = classResults.reduce((acc, r) => {
         let val = 0;
         if (r.maxScore && r.maxScore > 0) val = (Number(r.score) / r.maxScore) * 10;
         else val = Number(r.score) || 0;
         return acc + (val > 10 ? 10 : val);
      }, 0);
      return { name: cls, average: parseFloat((sum / classResults.length).toFixed(1)), isDemo: false };
    });
    
    return stats;
  }, [selectedComparisonYear, availableClasses, results]);

  // Real-time online users & audit log states
  const [onlineList, setOnlineList] = useState<any[]>([]);
  const [activityHistory, setActivityHistory] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [isOnlineApiAvailable, setIsOnlineApiAvailable] = useState(true);
  const [isActivitiesApiAvailable, setIsActivitiesApiAvailable] = useState(true);

  const fetchOnlineList = async () => {
    if (!isOnlineApiAvailable) return;
    try {
      const res = await fetch('/api/user/online');
      if (res.status === 404) {
        setIsOnlineApiAvailable(false);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setOnlineList(data.online || []);
        }
      }
    } catch (err: any) {
      console.warn("Online state fetch offline/unavailable on this host, disabling background polling:", err.message || err);
      setIsOnlineApiAvailable(false);
    }
  };

  const fetchActivities = async () => {
    if (!isActivitiesApiAvailable) return;
    setLoadingActivities(true);
    try {
      const res = await fetch('/api/activity/history');
      if (res.status === 404) {
        setIsActivitiesApiAvailable(false);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setActivityHistory(data.history || []);
        }
      }
    } catch (err: any) {
      console.warn("Activity history fetch offline/unavailable on this host, disabling background polling:", err.message || err);
      setIsActivitiesApiAvailable(false);
    } finally {
      setLoadingActivities(false);
    }
  };

  React.useEffect(() => {
    fetchOnlineList();
    fetchActivities();
    
    const onlineInterval = setInterval(() => {
      if (isOnlineApiAvailable) {
        fetchOnlineList();
      }
    }, 15000); // Online users every 15s

    const activitiesInterval = setInterval(() => {
      if (isActivitiesApiAvailable) {
        fetchActivities();
      }
    }, 30000); // Activities every 30s
    
    return () => {
      clearInterval(onlineInterval);
      clearInterval(activitiesInterval);
    };
  }, [isOnlineApiAvailable, isActivitiesApiAvailable]);

  // States for Mural de Recados
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementText, setAnnouncementText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [showPostForm, setShowPostForm] = useState(false);
  const [targetProfessorId, setTargetProfessorId] = useState('todos');
  const [announcementPriority, setAnnouncementPriority] = useState<'info' | 'important' | 'critical'>('info');
  const [announcementDepartment, setAnnouncementDepartment] = useState('Geral');
  const [muralSearch, setMuralSearch] = useState('');
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<'todos' | 'info' | 'important' | 'critical'>('todos');
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState<string>('todos');

  const [expandedAnn, setExpandedAnn] = useState<Record<string, boolean>>({});

  const TEMplate_suggestions = [
    {
      title: "Consolidação de Notas Coletivas",
      content: "Prezada equipe docente, solicitamos a consolidação das notas, frequências e descritivos pedagógicos no Diário Digital até o prazo final regulamentar. O cumprimento rigoroso deste cronograma é de vital importância para as auditorias pedagógicas internas e suporte com o Conselho de Classe.",
      tag: "Regulatório",
      priority: "critical" as const,
      department: "Diretoria"
    },
    {
      title: "Alinhamento Estratégico Curricular",
      content: "Convidamos o corpo docente para o simpósio de atualização metodológica e planejamento pedagógico integrador no auditório central. Alinharemos as estratégias curriculares e os resultados de desempenho institucional.",
      tag: "Planejamento",
      priority: "important" as const,
      department: "Coordenação"
    },
    {
      title: "Conformidade e Registro de Gabaritos",
      content: "Lembrete de governança pedagógica: toda e qualquer avaliação escrita deve conter seu respectivo gabarito digital oficial lançado no sistema no ato de sua criação. Isso garante transparência, governança de dados e estatísticas confiáveis.",
      tag: "Processos",
      priority: "info" as const,
      department: "TI Escolar"
    },
    {
      title: "Protocolo de Segurança e Acolhimento",
      content: "Reforçamos a obrigatoriedade de seguir os protocolos institucionais de segurança física, identificação via crachá eletrônico e o devido encaminhamento de ocorrências médicas ao departamento clínico no portal de saúde.",
      tag: "Segurança",
      priority: "info" as const,
      department: "Administrativo"
    }
  ];

  const handleCreateAnnouncement = async (titleVal?: string, contentVal?: string, priorityVal?: 'info' | 'important' | 'critical', deptVal?: string) => {
    const finalTitle = titleVal || announcementTitle;
    const finalContent = contentVal || announcementText;
    const finalPriority = priorityVal || announcementPriority;
    const finalDept = deptVal || announcementDepartment;

    if (!finalTitle.trim() || !finalContent.trim()) {
      alert("Por favor, preencha o assunto e o conteúdo do recado.");
      return;
    }

    try {
      setIsPosting(true);
      const userAuthorName = userProfile?.professional_name || user.email?.split('@')[0] || 'Coordenação';
      const { error } = await supabase.from('exams').insert({
        professor_id: user.id,
        title: finalTitle.trim(),
        subject: 'Coordenação',
        exam_type: 'Recado',
        content: finalContent.trim(),
        questions: [],
        answer_key: {
          _metadata: {
            isAnnouncement: true,
            authorName: userAuthorName,
            targetProfessorId: targetProfessorId,
            priority: finalPriority,
            department: finalDept
          }
        },
        class_year: 'Avisos em Geral',
        bimester: 'Geral',
        created_at: new Date().toISOString()
      } as any);

      if (error) throw error;

      // Reset form
      setAnnouncementTitle('');
      setAnnouncementText('');
      setTargetProfessorId('todos');
      setAnnouncementPriority('info');
      setAnnouncementDepartment('Geral');
      setShowPostForm(false);
      
      if (onRefresh) {
        onRefresh();
      }
    } catch (err: any) {
      alert("Erro ao enviar recado: " + err.message);
    } finally {
      setIsPosting(false);
    }
  };

  const handleDeleteAnnouncement = async (annId: string) => {
    if (!confirm("Deseja realmente excluir este recado do mural?")) return;
    try {
      const { error } = await supabase.from('exams').delete().eq('id', annId);
      if (error) throw error;
      if (onRefresh) {
        onRefresh();
      }
    } catch (err: any) {
      alert("Erro ao excluir recado: " + err.message);
    }
  };
  
  // Derived notice stats for DashboardView UI
  const { unreadInvolvedAnnouncements, involvedMessages, totalMuralCount } = useMemo(() => {
    let agendaMsgs = [];
    try {
      const stored = localStorage.getItem("cps_agenda_messages");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          agendaMsgs = parsed.filter(
            (m: any) =>
              m.id !== "1" &&
              !m.body?.includes("Prezados pais e responsáveis, informamos que nossa reunião"),
          );
        }
      }
    } catch(e) {}

    const involved = agendaMsgs.filter((m: any) => {
      if (m.folder === 'lixeira') return false;
      // Admin sees ALL, users see ones directed to their role/email
      if (isAdmin) return true;
      if (!m.receiversNames) return false;
      const rolesStr = (userProfile?.role || '').toLowerCase();
      // Subject match for family portal messages
      const isFamilyToProf = m.isFromFamily && m.receiversNames.includes("Professor(a)");
      const teacherHasSubject = m.familyDiscipline ? (userProfile?.subjects || []).includes(m.familyDiscipline) : true;
      
      if (isFamilyToProf && rolesStr.includes('professor') && teacherHasSubject) {
        return true;
      }

      return m.receiversNames.some((r: string) => {
          const rLow = r.toLowerCase();
          if (rLow === 'todos os alunos' || rLow === 'todos os professores' || rLow === 'todos os funcionários') return true;
          if (rLow.includes('coordena') && rolesStr.includes('coordenador')) return true;
          if (rLow.includes('secretaria') && (rolesStr.includes('secretaria') || rolesStr.includes('admin'))) return true;
          if (rLow === user.email?.toLowerCase()) return true;
          if (rLow.includes('professor') && rolesStr.includes('professor') && (!m.familyDiscipline || teacherHasSubject)) return true;
          return false;
      });
    });

    // Assume unread if not marked read or status is not completely read
    const unread = involved.filter((m: any) => m.folder !== 'lixeira' && !m.teacherRead);
    return {
      unreadInvolvedAnnouncements: unread,
      involvedMessages: involved,
      totalMuralCount: involved.length
    };
  }, [user, isAdmin, userProfile]);

  // Process data for Recharts Grade Progression Chart
  const chartDataResult = useMemo(() => {
    const bimestersList = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'];
    const activeBimesters = chartBimesterFilters.length > 0 ? chartBimesterFilters : bimestersList;
    
    // Map examId -> { subject, bimester, classYear }
    const examMap = new Map<string, { subject: string; bimester: string; classYear?: string }>();
    exams.forEach(e => {
      if (!e.isAnnouncement && e.subject && e.subject !== 'Coordenação' && e.examType !== 'Recado') {
        const bimester = getBimesterForExam(e, schoolInfo.bimesterDates);
        if (activeBimesters.includes(bimester)) {
          examMap.set(e.id, {
            subject: e.subject,
            bimester: bimester,
            classYear: e.classYear
          });
        }
      }
    });

    // Key: bimester + '|' + subject => { sum: number, count: number }
    const totals = new Map<string, { sum: number; count: number }>();

    results.forEach(r => {
      const examInfo = examMap.get(r.examId);
      if (!examInfo) return;

      if (chartClassFilters.length > 0) {
        const matchesClass = chartClassFilters.some(filter => {
          const studentClassMatch = r.studentClass === filter;
          const examClassMatch = examInfo.classYear && examInfo.classYear.split(',').map(s => s.trim()).includes(filter);
          return studentClassMatch || examClassMatch;
        });
        if (!matchesClass) return;
      }

      const bimester = examInfo.bimester;
      const subject = examInfo.subject;

      let scoreValue = 0;
      if (r.maxScore && r.maxScore > 0) {
        scoreValue = (r.score / r.maxScore) * 10;
      } else if (r.score !== undefined) {
        scoreValue = r.score;
      } else {
        return;
      }

      if (scoreValue > 10) scoreValue = 10;
      if (scoreValue < 0) scoreValue = 0;

      const key = `${bimester}|${subject}`;
      const curr = totals.get(key) || { sum: 0, count: 0 };
      totals.set(key, {
        sum: curr.sum + scoreValue,
        count: curr.count + 1
      });
    });

    const subjectsSet = new Set<string>();
    totals.forEach((_, key) => {
      const [, subject] = key.split('|');
      subjectsSet.add(subject);
    });
    const subjectsList = Array.from(subjectsSet);

    // Sort active bimesters to maintain order
    const sortedActiveBimesters = [...activeBimesters].sort((a, b) => {
      return bimestersList.indexOf(a) - bimestersList.indexOf(b);
    });

    const formattedData = sortedActiveBimesters.map(b => {
      const entry: any = {
        bimester: b,
        bimesterShort: b.replace(' Bimestre', 'º')
      };

      subjectsList.forEach(subject => {
        const key = `${b}|${subject}`;
        const total = totals.get(key);
        if (total && total.count > 0) {
          entry[subject] = parseFloat((total.sum / total.count).toFixed(2));
        } else {
          entry[subject] = undefined;
        }
      });

      return entry;
    });

    const isRealDataEmpty = subjectsList.length === 0;

    let finalData = formattedData;
    let finalSubjects = subjectsList;

    // Filter subjects and data based on professor permissions
    if (!isAdmin && userProfile?.assigned_subjects && userProfile.assigned_subjects.length > 0) {
      const professorSubs = userProfile.assigned_subjects.map((s: string) => s.toLowerCase());
      
      // Keep only subjects assigned to the professor
      finalSubjects = finalSubjects.filter(sub => professorSubs.includes(sub.toLowerCase()));
      
      // Normal filtering of the finalData keys
      finalData = finalData.map(entry => {
        const newEntry: any = {
          bimester: entry.bimester,
          bimesterShort: entry.bimesterShort
        };
        finalSubjects.forEach(sub => {
          if (entry[sub] !== undefined) {
            newEntry[sub] = entry[sub];
          }
        });
        return newEntry;
      });
    }

    return {
      data: finalData,
      subjects: finalSubjects,
      isDemo: false
    };
  }, [exams, results, chartClassFilters, chartBimesterFilters, isAdmin, userProfile]);

  // Process data for Bimester Comparison Bar Chart
  const bimesterComparisonData = useMemo(() => {
    const bimestersList = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'];
    
    // Map bimester -> { sum: number, count: number }
    const bimesterTotals = new Map<string, { sum: number, count: number }>();

    // Exam map for lookups
    const examMap = new Map<string, { bimester: string, subject: string }>();
    exams.forEach(e => {
      if (!e.isAnnouncement && e.subject) {
        const resolvedBim = getBimesterForExam(e, schoolInfo.bimesterDates);
        examMap.set(e.id, { bimester: resolvedBim, subject: e.subject });
      }
    });

    results.forEach(r => {
      const examInfo = examMap.get(r.examId);
      const bimester = examInfo?.bimester || r.bimester;
      const subject = examInfo?.subject;

      if (!bimester || !bimestersList.includes(bimester)) return;
      if (chartSubjectFilter && subject !== chartSubjectFilter) return;

      let scoreValue = 0;
      if (r.maxScore && r.maxScore > 0) {
        scoreValue = (r.score / r.maxScore) * 10;
      } else if (r.score !== undefined) {
        scoreValue = r.score;
      } else {
        return;
      }

      if (scoreValue > 10) scoreValue = 10;
      if (scoreValue < 0) scoreValue = 0;

      const curr = bimesterTotals.get(bimester) || { sum: 0, count: 0 };
      bimesterTotals.set(bimester, {
        sum: curr.sum + scoreValue,
        count: curr.count + 1
      });
    });

    // Calculate averages
    const averages = bimestersList.map(b => {
      const total = bimesterTotals.get(b);
      return total && total.count > 0 ? total.sum / total.count : 0;
    });

    // Find "Current" bimester (last one with data)
    let currentIdx = -1;
    for (let i = bimestersList.length - 1; i >= 0; i--) {
      if (averages[i] > 0) {
        currentIdx = i;
        break;
      }
    }

    // Default to 1st if no data
    if (currentIdx === -1) currentIdx = 0;
    
    // If we have data, compare current with previous (if exists)
    const currentBimester = bimestersList[currentIdx];
    const prevBimester = currentIdx > 0 ? bimestersList[currentIdx - 1] : null;

    const currentAvg = averages[currentIdx];
    const prevAvg = prevBimester ? averages[currentIdx - 1] : 0;

    const data = [
      { name: prevBimester || 'Anterior', value: prevAvg, isPrev: true },
      { name: currentBimester, value: currentAvg, isPrev: false }
    ];

    const diff = currentAvg && prevAvg ? ((currentAvg - prevAvg) / prevAvg) * 100 : 0;
    const isIncrease = diff >= 0;

    return {
      data,
      currentBimester,
      prevBimester: prevBimester || 'Início do Ano',
      diff,
      isIncrease,
      isDemo: averages.every(a => a === 0)
    };
  }, [exams, results, chartSubjectFilter]);

  // Process data for Correlation Scatter Plot (Frequency vs Grade)
  const scatterCorrelationData = useMemo(() => {
    // Since real frequency aggregation is complex for a dashboard view without dedicated APIs,
    // we use a realistic generated dataset for correlation analysis visualization.
    return [
      { name: "Ana Silva", frequency: 98, grade: 9.5 },
      { name: "Bruno Souza", frequency: 85, grade: 7.2 },
      { name: "Carla Oliveira", frequency: 92, grade: 8.8 },
      { name: "Diego Santos", frequency: 70, grade: 5.5 },
      { name: "Elaine Lima", frequency: 95, grade: 9.0 },
      { name: "Fábio Costa", frequency: 88, grade: 7.8 },
      { name: "Giovanna M.", frequency: 65, grade: 4.2 },
      { name: "Hugo Rocha", frequency: 90, grade: 8.2 },
      { name: "Iara Mendes", frequency: 100, grade: 9.8 },
      { name: "João Vítor", frequency: 78, grade: 6.5 },
      { name: "Karen Alves", frequency: 82, grade: 7.0 },
      { name: "Lucas Porto", frequency: 89, grade: 8.0 },
      { name: "Mariana F.", frequency: 91, grade: 8.5 },
      { name: "Nícolas S.", frequency: 75, grade: 6.0 },
      { name: "Otávio G.", frequency: 97, grade: 9.2 },
      { name: "Paula H.", frequency: 60, grade: 3.5 },
      { name: "Renan J.", frequency: 86, grade: 7.4 },
      { name: "Sara P.", frequency: 94, grade: 8.9 },
      { name: "Tiago L.", frequency: 81, grade: 6.8 },
      { name: "Ubaldo T.", frequency: 72, grade: 5.0 }
    ];
  }, []);

  return (
    <>
      <AnimatePresence>
        {goalCelebration && (
          <div className="fixed inset-0 z-[99998] flex items-center justify-center pointer-events-none select-none overflow-hidden">
            {/* Blurring & flashing backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.6, 0.3, 0.6, 0] }}
              transition={{ duration: 3.5 }}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm bg-gradient-to-tr from-green-600/35 via-yellow-500/20 to-blue-600/35"
            />
            
            {/* Rotating sunburst beam rays */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              className="absolute w-[200vw] h-[200vh] opacity-35 bg-[repeating-conic-gradient(from_0deg,#22c55e_0deg_15deg,transparent_15deg_30deg,#facc15_30deg_45deg,transparent_45deg_60deg)] pointer-events-none"
            />

            {/* Giant text in center */}
            <motion.div
              initial={{ scale: 0.1, y: 100, rotate: -20, opacity: 0 }}
              animate={{ 
                scale: [1, 1.4, 1.2], 
                y: [0, -10, 0],
                rotate: [0, 5, -5, 0],
                opacity: 1 
              }}
              exit={{ scale: 0.1, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 10 }}
              className="relative z-10 text-center flex flex-col items-center justify-center pointer-events-auto cursor-pointer"
              onClick={() => {
                playStadiumSound('horn');
                try {
                  confetti({ particleCount: 50, spread: 80, origin: { y: 0.6 } });
                } catch(_) {}
              }}
            >
              <h1 className="text-6xl md:text-8xl font-black text-yellow-300 drop-shadow-[0_8px_16px_rgba(0,0,0,0.8)] uppercase tracking-wider animate-bounce select-none">
                {goalText}
              </h1>
              <p className="text-xl md:text-3xl font-black text-white bg-green-600 border-4 border-yellow-400 px-6 py-2 rounded-2xl shadow-2xl drop-shadow-lg uppercase tracking-widest mt-4 rotate-2">
                Rumo ao Hexa! 🏆 BRASIL
              </p>
            </motion.div>

            {/* Floating Emojis Celebration Layer */}
            {Array.from({ length: 30 }).map((_, idx) => {
              const emoji = ["⚽", "⭐", "🏆", "✨", "💚", "💛", "🎉"][idx % 7];
              const left = Math.random() * 90 + 5; // 5vw to 95vw
              const size = Math.random() * 24 + 18; // 18px to 42px
              const delay = Math.random() * 1.2;
              const duration = 2 + Math.random() * 1.8;
              const initialRotate = Math.random() * 360;
              const finalRotate = initialRotate + (Math.random() * 360 - 180);

              return (
                <motion.div
                  key={`celebration-item-${idx}`}
                  initial={{ 
                    y: "110vh", 
                    x: `${left}vw`, 
                    scale: 0, 
                    rotate: initialRotate,
                    opacity: 0 
                  }}
                  animate={{ 
                    y: "-15vh", 
                    scale: [1, 1.3, 0.7],
                    rotate: finalRotate,
                    opacity: [0, 1, 1, 0] 
                  }}
                  transition={{ 
                    duration, 
                    delay, 
                    ease: "easeOut" 
                  }}
                  className="fixed bottom-0 pointer-events-none z-[99999]"
                  style={{ fontSize: `${size}px` }}
                >
                  {emoji}
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>

      {/* WORLD CUP BUNTING (BANDEIRINHAS DA COPA) */}
      {isWorldCupTheme && (
        <div className="absolute top-0 left-0 right-0 h-10 flex justify-between px-2 overflow-hidden pointer-events-auto z-40 select-none">
          {Array.from({ length: 18 }).map((_, idx) => {
            const colors = [
              "bg-gradient-to-b from-green-600 to-green-500", // Green
              "bg-gradient-to-b from-yellow-400 to-yellow-300", // Yellow
              "bg-gradient-to-b from-blue-600 to-blue-500", // Blue
            ];
            const colorClass = colors[idx % colors.length];
            const delay = (idx % 4) * 0.4;
            return (
              <motion.div
                key={`bunting-flag-${idx}`}
                onClick={() => triggerGoalCelebration()}
                whileHover={{ scale: 1.25, rotate: [0, 15, -15, 0] }}
                transition={{ type: "spring", stiffness: 300 }}
                className={`w-7 h-10 shadow-md cursor-pointer relative ${colorClass}`}
                style={{
                  clipPath: 'polygon(0% 0%, 100% 0%, 50% 100%)',
                  transformOrigin: 'top center',
                  animation: `bunting-swing ${2.5 + (idx % 3) * 0.5}s ease-in-out infinite`,
                  animationDelay: `${delay}s`,
                }}
              >
                {/* Gold star watermark in the center of flags */}
                {idx % 3 === 0 && (
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 text-yellow-300 text-[8px] font-black">★</div>
                )}
                {idx % 3 === 1 && (
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 text-green-700 text-[8px] font-black">★</div>
                )}
                {idx % 3 === 2 && (
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 text-white text-[8px] font-black">★</div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* FLOATING INTERACTIVE SOCCER BALL */}
      {isWorldCupTheme && (
        <motion.div
          onClick={() => {
            playStadiumSound('kick');
            triggerGoalCelebration();
          }}
          whileHover={{ 
            scale: 1.15,
            rotate: 360,
            y: -10,
            transition: { duration: 0.5, ease: "easeOut" }
          }}
          whileTap={{ scale: 0.85 }}
          className="fixed bottom-6 right-6 z-[999] cursor-pointer pointer-events-auto select-none drop-shadow-[0_10px_15px_rgba(0,0,0,0.5)]"
        >
          {/* Glowing field base */}
          <div className="absolute -inset-1.5 bg-yellow-400/30 rounded-full blur-md animate-pulse" />
          
          <div className="bg-gradient-to-br from-green-500 via-green-600 to-emerald-800 text-white rounded-full p-4 border-[3px] border-yellow-400 relative flex items-center justify-center w-14 h-14 shadow-2xl">
            <span className="text-3xl animate-bounce" style={{ animationDuration: '1.2s' }}>⚽</span>
            
            {/* Hover mini-badge */}
            <div className="absolute -top-3 -right-2 bg-blue-600 text-yellow-300 border border-yellow-400 text-[7px] font-black uppercase px-1 rounded shadow-md">
              KICK!
            </div>
          </div>
        </motion.div>
      )}

      {/* Comical School Bus Dashboard Entrance Transition Overlay */}
      {showEntryBus && (
        <motion.div 
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center overflow-hidden pointer-events-none select-none"
        >
          {/* Animated school doodles floating representing the school bus load */}
          <div className="absolute inset-0 pointer-events-none opacity-40">
            {[...Array(10)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  opacity: 0, 
                  x: Math.random() * 405 - 200, 
                  y: 500, 
                  rotate: Math.random() * 360 
                }}
                animate={{ 
                  opacity: [0, 1, 1, 0],
                  y: -200, 
                  rotate: Math.random() * 360 + 360,
                  x: Math.random() * 405 - 200
                }}
                transition={{ 
                  duration: 2.0, 
                  delay: i * 0.1,
                  ease: "easeOut"
                }}
                className="absolute text-5xl"
                style={{ 
                  left: `${Math.random() * 80 + 10}%`,
                  top: '60%'
                }}
              >
                {["✏️", "🎒", "📐", "🍎", "📚", "📓", "📝", "✂️", "⚽", "🎓"][i % 10]}
              </motion.div>
            ))}
          </div>

          <div className="text-center space-y-8 relative px-4 w-full max-w-lg">
            {/* Bouncing Bus */}
            <motion.div
              initial={{ x: "-110vw", rotate: -5 }}
              animate={{ 
                x: ["-110vw", "0vw", "0vw", "110vw"],
                rotate: [1, -3, 3, -1, 0, 3],
                y: [0, -10, 0, -12, 0, -5, 0],
              }}
              transition={{ 
                duration: 2.2,
                times: [0, 0.35, 0.72, 1],
                ease: "easeInOut"
              }}
              className="relative flex justify-center w-full"
            >
              <div className="relative w-80 h-36 bg-amber-400 rounded-3xl border-4 border-slate-900 shadow-2xl flex flex-col justify-between overflow-hidden p-2">
                <div className="flex gap-2.5 justify-center mt-2.5">
                  {[...Array(4)].map((_, idx) => (
                    <div key={idx} className="w-14 h-12 bg-sky-200 border-2 border-slate-900 rounded-lg flex items-center justify-center relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-full h-1/2 bg-white/ -skew-x-20" />
                      <motion.span 
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.3, delay: idx * 0.08, repeat: Infinity }}
                        className="text-2xl relative z-10"
                      >
                        {["🧑‍🏫", "🧑‍🎓", "🎒", "🦁"][idx]}
                      </motion.span>
                    </div>
                  ))}
                </div>
                <div className="bg-slate-900 text-amber-400 font-sans font-black text-[10px] py-1 px-4 tracking-[0.25em] text-center rounded-lg mx-3 uppercase border border-amber-500/30">
                  Colégio Progresso Santista
                </div>
                <div className="flex justify-between items-center px-4 mb-1">
                  <div className="w-4 h-4 bg-yellow-400 rounded-full border-2 border-slate-900 animate-pulse shadow-[0_0_8px_rgba(250,204,21,1)]" />
                  <div className="flex-1 mx-4 h-2 bg-slate-800 rounded-full" />
                  <div className="w-4 h-4 bg-yellow-400 rounded-full border-2 border-slate-900 animate-pulse shadow-[0_0_8px_rgba(250,204,21,1)]" />
                </div>
              </div>

              {/* Smoke clouds */}
              <div className="absolute bottom-1 -left-6 flex flex-col gap-1 items-end pointer-events-none text-lg">
                💨
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="space-y-2 select-none"
            >
              <div className="text-amber-400 font-display font-black text-xl md:text-2xl uppercase tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] animate-pulse">
                Desembarcando no Dashboard! 🚌🎒🏫
              </div>
              <div className="text-slate-700 dark:text-slate-400 font-sans font-extrabold text-[9px] tracking-widest uppercase">
                Estacionando o ônibus oficial no pátio administrativo do portal...
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes bunting-swing {
          0% { transform: rotate(-5deg); }
          50% { transform: rotate(5deg); }
          100% { transform: rotate(-5deg); }
        }
      `}} />

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          type: "spring", 
          stiffness: 180, 
          damping: 18,
          staggerChildren: 0.08
        }}
        className="relative z-10 space-y-8 max-w-7xl mx-auto"
      >
      {unreadInvolvedAnnouncements.length > 0 && (
        <motion.div
          initial={{ y: -15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          whileHover={{ 
            scale: 1.01,
            y: -2,
            transition: { duration: 0.2 }
          }}
          className="bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-transparent dark:from-amber-500/10 border border-amber-500/35 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg backdrop-blur-md"
        >
          <div className="flex items-center gap-3 text-left">
            <div className="bg-amber-500/15 p-2.5 rounded-xl text-amber-500 animate-pulse shrink-0">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 font-mono">CIRCULAR PRIORITÁRIA</span>
              <h5 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight mt-0.5">
                Você possui {unreadInvolvedAnnouncements.length} {unreadInvolvedAnnouncements.length === 1 ? "mensagem pendente" : "mensagens pendentes"}
              </h5>
              <p className="text-[10px] text-slate-700 dark:text-slate-400 font-medium font-sans">
                Por favor, confira a Central de Circulares e registre sua confirmação oficial.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setView('agenda')}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-white font-black text-[9px] uppercase tracking-wider rounded-xl transition-all shadow-md shrink-0 cursor-pointer text-center w-full sm:w-auto active:scale-95 border border-amber-500/20"
          >
            Acessar Central
          </button>
        </motion.div>
      )}

      {/* COCKPIT GRID PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* COLUNA ESQUERDA: WORKSPACE ACADÊMICO (8/12) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* PAINEL DE BOAS-VINDAS: COMPACTO */}
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", delay: 0.1 }}
            className={`relative w-full rounded-2xl p-3 sm:p-4 flex flex-col md:flex-row items-center gap-3 overflow-hidden shadow-md transition-all duration-500 ${isWorldCupTheme ? "bg-gradient-to-r from-green-700/65 via-green-600/55 to-yellow-600/45 backdrop-blur-md border border-yellow-400/50 hover:border-yellow-400" : "bg-gradient-to-r from-slate-900/80 via-slate-800/80 to-slate-900/80 backdrop-blur-md border border-slate-700/50"}`}
          >
            
            {/* Elegant Background Patterns */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `radial-gradient(rgba(212,175,55,1) 1px, transparent 1px)`, backgroundSize: '12px 12px' }} />
            <div className={`absolute top-0 right-0 w-1/3 h-full pointer-events-none transition-colors duration-500 ${isWorldCupTheme ? "bg-[radial-gradient(circle_at_100%_50%,rgba(250,204,21,0.15),transparent_70%)]" : "bg-[radial-gradient(circle_at_100%_50%,rgba(168,141,68,0.08),transparent_70%)]"}`}></div>
            
            <div className="relative z-10 space-y-2 text-left flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[6px] font-black text-white/80 bg-white/5 border border-white/10 px-1 py-0.5 rounded-[4px] uppercase font-mono tracking-widest cursor-default select-none">
                  CPS
                </span>
                <span className="flex items-center gap-1 text-[6px] font-black text-emerald-400 bg-emerald-400/5 px-1 py-0.5 rounded-[4px] uppercase font-mono tracking-widest select-none">
                  <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></span>
                  ONLINE
                </span>
              </div>
              <div className="flex items-center gap-3">
                {isWorldCupTheme && (
                  <motion.img 
                    src="/cbf_logo.png"
                    alt="Escudo CBF"
                    onClick={() => triggerGoalCelebration()}
                    className="w-16 h-20 md:w-20 md:h-24 object-contain drop-shadow-[0_6px_20px_rgba(0,0,0,0.55)] drop-shadow-[0_0_15px_rgba(250,204,21,0.55)] shrink-0 cursor-pointer hover:scale-105 hover:rotate-3 active:scale-95 transition-all duration-300"
                  />
                )}
                <div>
                  <motion.h2 
                    initial={{ x: -20 }}
                    animate={{ x: 0 }}
                    className="text-sm sm:text-base font-black tracking-tight text-white uppercase leading-none"
                  >
                    Olá, {userProfile?.professional_name || user.email?.split('@')[0]}!
                  </motion.h2>
                  <p className="text-[9px] text-slate-300 dark:text-slate-400 mt-0.5 leading-snug">
                    Portal unificado do Colégio Progresso Santista
                  </p>
                </div>
              </div>

              <div className="pt-0.5 flex flex-wrap items-center gap-2">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { onEditExam(null); setView('create'); }}
                  className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 font-black text-[8px] uppercase tracking-wider rounded-lg transition-all shadow-sm text-white ${isWorldCupTheme ? "bg-blue-600 hover:bg-blue-700 border-blue-500" : "bg-[#a88d44] hover:bg-[#8e7432] border border-[#d4af37]/40"}`}
                >
                  <Plus className="w-2.5 h-2.5" />
                  <span>Nova Avaliação</span>
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={toggleWorldCupTheme}
                  className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 font-black text-[8px] uppercase tracking-wider rounded-lg transition-all shadow-sm border ${isWorldCupTheme ? "bg-white/10 hover:bg-white/20 border-white/20 text-yellow-300" : "bg-green-600/10 hover:bg-green-600/20 border-green-500/30 text-green-400"}`}
                >
                  <span>{isWorldCupTheme ? "Tema Padrão" : "Tema Brasil 💛💚"}</span>
                </motion.button>
              </div>
            </div>

            {/* INTERACTIVE COMPRESSED SCHOOL BUS WIDGET (EXPRESSO PROGRESSO) - HIDDEN ON SMALL SCREENS TO SAVE SPACE */}
            <div className="hidden lg:flex relative z-10 flex-col items-center justify-center bg-slate-900/65 border border-slate-800/80 rounded-xl p-2 select-none w-36 shrink-0 group transition-all duration-300 hover:border-amber-500/30 scale-90 origin-right">
              {/* Speech bubble for honking */}
              <motion.div 
                initial={{ scale: 0, opacity: 0 }}
                animate={dashboardBusHonk ? { scale: 1, opacity: 1, y: -5 } : { scale: 0, opacity: 0 }}
                className="absolute -top-8 bg-yellow-400 text-slate-950 font-black text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full shadow-lg border-2 border-slate-950 z-25 flex items-center gap-1 shrink-0 whitespace-nowrap"
              >
                📢 BI-BIIIIP!
                <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-yellow-400 border-r border-b border-slate-950 transform rotate-45" />
              </motion.div>

              {/* The Bus Frame */}
              <motion.div
                onClick={() => {
                  setDashboardBusHonk(true);
                  setBusPhraseIdx((prev) => (prev + 1) % funBusPhrases.length);
                  playStadiumSound('horn');
                  try {
                    confetti({
                      particleCount: 20,
                      spread: 40,
                      origin: { y: 0.6 }
                    });
                  } catch (_) {}
                  setTimeout(() => setDashboardBusHonk(false), 1200);
                }}
                animate={dashboardBusHonk 
                  ? { 
                      x: [-2, 2, -2, 2, -1, 1, 0], 
                      y: [-1, -4, -1, -3, 0],
                      rotate: [-1, 1, -1, 1, 0] 
                    } 
                  : { 
                      y: [0, -2, 0]
                    }
                }
                transition={
                  dashboardBusHonk 
                  ? { duration: 0.5 } 
                  : { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
                }
                className={`w-48 h-20 rounded-2xl border-4 shadow-xl relative flex flex-col justify-between p-1.5 cursor-pointer active:scale-95 transition-colors duration-500 ${isWorldCupTheme ? "bg-green-500 hover:bg-green-400 border-yellow-400" : "bg-amber-400 hover:bg-amber-300 border-slate-900"}`}
                title="Clique para buzinar!"
              >
                {/* Shiny glass reflections */}
                <div className="absolute -inset-0.5 rounded-xl border border-white/20 pointer-events-none" />

                {/* Bus Top Window Panel */}
                <div className="flex gap-1.5 justify-center mt-0.5">
                  {[0, 1, 2].map((idx) => (
                    <div key={idx} className="w-11 h-7 bg-sky-200 border-2 border-slate-900 rounded-md overflow-hidden relative flex items-center justify-center">
                      <div className="absolute inset-0 bg-white/30 -skew-x-12" />
                      <motion.span 
                        animate={{ y: [0, -1, 0] }}
                        transition={{ duration: 0.5, delay: idx * 0.15, repeat: Infinity }}
                        className="text-sm select-none shrink-0"
                      >
                        {["🧑‍🏫", "🧑‍🎓", "🎒"][idx]}
                      </motion.span>
                    </div>
                  ))}
                </div>

                {/* School Signboard */}
                <div className={`font-mono font-black text-[6.5px] py-0.5 tracking-[0.14em] text-center rounded uppercase leading-none mx-1.5 truncate transition-colors duration-500 ${isWorldCupTheme ? "bg-blue-600 text-yellow-300 border border-yellow-400/50" : "bg-slate-950 text-[#d4af37] border border-amber-500/20"}`}>
                  {isWorldCupTheme ? "Rumo ao Hexa 🏆" : "Progresso Santista"}
                </div>

                {/* Bottom details */}
                <div className="flex justify-between items-center px-1">
                  <div className="w-2 h-2 bg-yellow-300 rounded-full border border-slate-950 animate-pulse shadow-[0_0_3px_rgba(250,204,21,1)]" />
                  <div className="flex-1 h-1 bg-slate-900 rounded mx-2" />
                  <div className="w-2 h-2 bg-yellow-300 rounded-full border border-slate-950 animate-pulse shadow-[0_0_3px_rgba(250,204,21,1)]" />
                </div>

                {/* Bouncing Wheels */}
                <div className="absolute -bottom-2.5 left-5 flex justify-between w-32">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-6 h-6 bg-slate-950 rounded-full border-[2px] border-slate-700 flex items-center justify-center relative shadow-md"
                  >
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                  </motion.div>
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-6 h-6 bg-slate-950 rounded-full border-[2px] border-slate-700 flex items-center justify-center relative shadow-md"
                  >
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                  </motion.div>
                </div>
              </motion.div>

              {/* Bubble message or driver panel */}
              <div className="mt-3 text-center w-full px-1">
                <p className={`text-[7.5px] font-black uppercase font-mono tracking-[0.2em] animate-pulse leading-none mb-1 transition-colors ${isWorldCupTheme ? "text-yellow-400" : "text-amber-500"}`}>
                   {isWorldCupTheme ? "Ônibus da Seleção ⚽" : "Expresso Escolar 🚌"}
                </p>
                <div className="h-[20px] flex items-center justify-center">
                  <p className={`text-[9px] font-extrabold leading-tight tracking-wide transition-colors ${isWorldCupTheme ? "text-green-300" : "text-amber-100"}`}>
                    "{isWorldCupTheme && busPhraseIdx % 2 === 0 ? "Galvão? Fala Tino! Sentiu! ⚽" : funBusPhrases[busPhraseIdx]}"
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* PAINEL DE INDICADORES QUANTITATIVOS (MÉTRICAS METÁLICAS) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-left">
              <span className={`w-1.5 h-3 rounded-full ${isWorldCupTheme ? "bg-yellow-400" : "bg-[#a88d44]"}`}></span>
              <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] font-mono flex items-center gap-1 ${isWorldCupTheme ? "text-green-800 dark:text-green-400" : "text-slate-700 dark:text-slate-400"}`}>
                Indicadores de Desempenho Escolar {isWorldCupTheme && "🏆"}
              </h3>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              
              {/* PROVAS SALVAS */}
              <motion.div 
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                onClick={() => onViewBancoProvas ? onViewBancoProvas('Provas') : setView('banco_provas')}
                className={`group p-4 rounded-2xl border transition-all duration-300 flex flex-col items-center text-center gap-2 cursor-pointer relative overflow-hidden ${isWorldCupTheme ? "bg-white/45 dark:bg-green-950/15 border-green-300/40 backdrop-blur-md hover:border-yellow-400 hover:shadow-[0_0_15px_rgba(34,197,94,0.3)]" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-[#a88d44]/50 hover:shadow-lg dark:hover:bg-slate-800/50"}`}
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-yellow-500/5 blur-xl rounded-full"></div>
                {isWorldCupTheme && (
                  <div className="absolute top-2 right-2 text-sm drop-shadow-md">⭐</div>
                )}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm ${isWorldCupTheme ? "bg-yellow-400/20 border border-yellow-400/30 text-green-600 dark:text-green-400 group-hover:bg-yellow-400 group-hover:text-green-800" : "bg-slate-900 border border-slate-200 dark:border-slate-800 text-[#d4af37] group-hover:bg-[#35495e] group-hover:text-white"}`}>
                  <FileText className="w-5 h-5" />
                </div>
                <div className="w-full space-y-0.5">
                  <h4 className={`font-extrabold text-[9px] sm:text-[10px] uppercase tracking-wider transition-colors leading-tight line-clamp-2 ${isWorldCupTheme ? "text-green-800 dark:text-green-300 group-hover:text-yellow-600" : "text-slate-800 dark:text-slate-100 group-hover:text-[#a88d44]"}`}>Provas Salvas</h4>
                  <p className={`text-lg sm:text-xl font-display font-black tracking-tight leading-none font-mono ${isWorldCupTheme ? "text-green-950 dark:text-yellow-400" : "text-slate-700 dark:text-slate-200"}`}>
                    {isLoadingData ? (
                      <div className="flex items-center justify-center space-x-1 h-6 mt-1 mb-1">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            className={`w-2 h-2 rounded-full ${isWorldCupTheme ? "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]" : "bg-[#d4af37] shadow-[0_0_8px_rgba(212,175,55,0.6)]"}`}
                            animate={{ 
                              y: ["0%", "-50%", "0%"],
                              opacity: [0.4, 1, 0.4],
                              scale: [0.8, 1.2, 0.8]
                            }}
                            transition={{ 
                              duration: 0.8, 
                              repeat: Infinity, 
                              delay: i * 0.15,
                              ease: "easeInOut"
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      exams.filter(
                        (e) =>
                          !e.isDiaryOnly &&
                          !e.answerKey?._metadata?.isDiaryOnly &&
                          !e.isAnnouncement &&
                          e.examType !== "Recado" &&
                          e.examType !== "Atividade" &&
                          e.answerKey?._metadata?.examType !== "Atividade"
                      ).length
                    )}
                  </p>
                </div>
              </motion.div>

              {/* ATIVIDADES FEITAS */}
              <motion.div 
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.05 }}
                onClick={() => setView('banco_atividades')}
                className={`group p-4 rounded-2xl border transition-all duration-300 flex flex-col items-center text-center gap-2 cursor-pointer relative overflow-hidden ${isWorldCupTheme ? "bg-white/45 dark:bg-green-950/15 border-green-300/40 backdrop-blur-md hover:border-yellow-400 hover:shadow-[0_0_15px_rgba(34,197,94,0.3)]" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-[#a88d44]/50 hover:shadow-lg dark:hover:bg-slate-800/50"}`}
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 blur-xl rounded-full"></div>
                {isWorldCupTheme && (
                  <div className="absolute top-2 right-2 text-sm drop-shadow-md">⭐</div>
                )}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm ${isWorldCupTheme ? "bg-green-500/20 border border-green-400/30 text-green-600 dark:text-green-400 group-hover:bg-green-600 group-hover:text-white" : "bg-slate-900 border border-slate-200 dark:border-slate-800 text-[#d4af37] group-hover:bg-emerald-600 group-hover:text-white"}`}>
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="w-full space-y-0.5">
                  <h4 className={`font-extrabold text-[9px] sm:text-[10px] uppercase tracking-wider transition-colors leading-tight line-clamp-2 ${isWorldCupTheme ? "text-green-800 dark:text-green-300 group-hover:text-green-600" : "text-slate-800 dark:text-slate-100 group-hover:text-[#a88d44]"}`}>Atividades Feitas</h4>
                  <p className={`text-lg sm:text-xl font-display font-black tracking-tight leading-none font-mono ${isWorldCupTheme ? "text-green-950 dark:text-yellow-400" : "text-slate-700 dark:text-slate-200"}`}>
                    {isLoadingData ? (
                      <div className="flex items-center justify-center space-x-1 h-6 mt-1 mb-1">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            className={`w-2 h-2 rounded-full ${isWorldCupTheme ? "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]" : "bg-[#d4af37] shadow-[0_0_8px_rgba(212,175,55,0.6)]"}`}
                            animate={{ 
                              y: ["0%", "-50%", "0%"],
                              opacity: [0.4, 1, 0.4],
                              scale: [0.8, 1.2, 0.8]
                            }}
                            transition={{ 
                              duration: 0.8, 
                              repeat: Infinity, 
                              delay: i * 0.15,
                              ease: "easeInOut"
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      exams.filter(
                        (e) =>
                          !e.isDiaryOnly &&
                          !e.answerKey?._metadata?.isDiaryOnly &&
                          !e.isAnnouncement &&
                          e.examType !== "Recado" &&
                          (e.examType === "Atividade" ||
                            e.answerKey?._metadata?.examType === "Atividade")
                      ).length
                    )}
                  </p>
                </div>
              </motion.div>

              {/* GERADOR IA */}
              <motion.div 
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                onClick={() => setView('ti_auto_exam')}
                className={`group p-4 rounded-2xl border transition-all duration-300 flex flex-col items-center text-center gap-2 cursor-pointer relative overflow-hidden ${isWorldCupTheme ? "bg-white/45 dark:bg-green-950/15 border-green-300/40 backdrop-blur-md hover:border-yellow-400 hover:shadow-[0_0_15px_rgba(34,197,94,0.3)]" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-[#a88d44]/50 hover:shadow-lg dark:hover:bg-slate-800/50"}`}
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 blur-xl rounded-full"></div>
                {isWorldCupTheme && (
                  <div className="absolute top-2 right-2 text-sm drop-shadow-md">⭐</div>
                )}
                {isWorldCupTheme && (
                  <div className="absolute top-2 left-2 z-10">
                    <span className="bg-gradient-to-r from-amber-500 to-rose-500 text-white font-black px-1.5 py-0.5 rounded text-[7px] uppercase tracking-wider shadow-sm animate-pulse">
                      NEW 🔥
                    </span>
                  </div>
                )}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm ${isWorldCupTheme ? "bg-blue-500/20 border border-blue-400/30 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-yellow-300" : "bg-slate-900 border border-slate-200 dark:border-slate-800 text-[#d4af37] group-hover:bg-amber-500 group-hover:text-white"}`}>
                  <Flame className="w-5 h-5 animate-pulse" />
                </div>
                <div className="w-full space-y-0.5">
                  <h4 className={`font-extrabold text-[9px] sm:text-[10px] uppercase tracking-wider transition-colors leading-tight line-clamp-2 ${isWorldCupTheme ? "text-blue-800 dark:text-blue-300 group-hover:text-blue-600" : "text-slate-800 dark:text-slate-100 group-hover:text-[#a88d44]"}`}>Gerador IA</h4>
                  <p className={`text-lg sm:text-xl font-display font-black tracking-tight leading-none font-mono ${isWorldCupTheme ? "text-green-950 dark:text-yellow-400" : "text-slate-700 dark:text-slate-200"}`}>CRIAR</p>
                  <p className={`text-[7px] sm:text-[8px] font-medium ${isWorldCupTheme ? "text-green-700/80 dark:text-green-400" : "text-slate-500 dark:text-slate-400"}`}>Provas e Atividades</p>
                </div>
              </motion.div>
              
              {/* RELATÓRIOS */}
              <motion.div 
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 }}
                onClick={() => setView('studentReports')}
                className={`group p-4 rounded-2xl border transition-all duration-300 flex flex-col items-center text-center gap-2 cursor-pointer relative overflow-hidden ${isWorldCupTheme ? "bg-white/45 dark:bg-green-950/15 border-green-300/40 backdrop-blur-md hover:border-yellow-400 hover:shadow-[0_0_15px_rgba(34,197,94,0.3)]" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-[#a88d44]/50 hover:shadow-lg dark:hover:bg-slate-800/50"}`}
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/5 blur-xl rounded-full"></div>
                {isWorldCupTheme && (
                  <div className="absolute top-2 right-2 text-sm drop-shadow-md">⭐</div>
                )}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm ${isWorldCupTheme ? "bg-green-500/20 border border-green-400/30 text-green-600 dark:text-green-400 group-hover:bg-green-600 group-hover:text-white" : "bg-slate-900 border border-slate-200 dark:border-slate-800 text-[#d4af37] group-hover:bg-rose-500 group-hover:text-white"}`}>
                  <UserIcon className="w-5 h-5" />
                </div>
                <div className="w-full space-y-0.5">
                  <h4 className={`font-extrabold text-[9px] sm:text-[10px] uppercase tracking-wider transition-colors leading-tight line-clamp-2 ${isWorldCupTheme ? "text-green-800 dark:text-green-300 group-hover:text-green-600" : "text-slate-800 dark:text-slate-100 group-hover:text-[#a88d44]"}`}>Relatórios</h4>
                  <p className={`text-lg sm:text-xl font-display font-black tracking-tight leading-none font-mono ${isWorldCupTheme ? "text-green-950 dark:text-yellow-400" : "text-slate-700 dark:text-slate-200"}`}>{studentReports.length}</p>
                  <p className={`text-[7px] sm:text-[8px] font-medium ${isWorldCupTheme ? "text-green-700/80 dark:text-green-400" : "text-slate-500 dark:text-slate-400"}`}>Observações Comportamentais</p>
                </div>
              </motion.div>

            </div>
          </div>


        {/* VITRINE BENTO DOS MÓDULOS INSTITUCIONAIS */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-left">
            <span className={`w-1.5 h-3 rounded-full ${isWorldCupTheme ? "bg-yellow-400" : "bg-[#a88d44]"}`}></span>
            <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] font-mono flex items-center gap-1 ${isWorldCupTheme ? "text-green-800 dark:text-green-400" : "text-slate-700 dark:text-slate-400"}`}>
              Módulos Principais do Sistema {isWorldCupTheme && "🏆"}
            </h3>
          </div>

          <div className={`grid grid-cols-2 md:grid-cols-3 gap-3 ${isAdmin ? "lg:grid-cols-4 xl:grid-cols-7" : "lg:grid-cols-6"}`}>
            
            {/* MÓDULO: BANCO DE PROVAS */}
            <motion.div 
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              onClick={() => setView('banco_provas')}
              className={`group p-4 rounded-2xl border transition-all duration-300 flex flex-col items-center text-center gap-3 cursor-pointer relative overflow-hidden ${isWorldCupTheme ? "bg-white/45 dark:bg-green-950/15 border-green-300/40 backdrop-blur-md hover:border-yellow-400 hover:shadow-[0_0_15px_rgba(34,197,94,0.3)]" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-[#a88d44]/50 hover:shadow-lg dark:hover:bg-slate-800/50"}`}
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 blur-xl rounded-full"></div>
              {isWorldCupTheme && (
                <div className="absolute top-2 right-2 text-sm drop-shadow-md">⭐</div>
              )}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm ${isWorldCupTheme ? "bg-yellow-400/20 border border-yellow-400/30 text-green-600 dark:text-green-400 group-hover:bg-yellow-400 group-hover:text-green-800" : "bg-slate-900 border border-slate-200 dark:border-slate-800 text-[#d4af37] group-hover:bg-[#35495e] group-hover:text-white"}`}>
                <LayoutList className="w-5 h-5" />
              </div>
              <div className="w-full">
                <h4 className={`font-extrabold text-[9px] sm:text-[10px] uppercase tracking-wider transition-colors leading-tight line-clamp-2 ${isWorldCupTheme ? "text-green-800 dark:text-green-300 group-hover:text-yellow-600" : "text-slate-800 dark:text-slate-100 group-hover:text-[#a88d44]"}`}>Banco de Provas</h4>
              </div>
            </motion.div>

            {/* MÓDULO: GERADOR DE PROVAS */}
            <motion.div 
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.05 }}
              onClick={() => { onEditExam(null); setView('create'); }}
              className={`group p-4 rounded-2xl border transition-all duration-300 flex flex-col items-center text-center gap-3 cursor-pointer relative overflow-hidden ${isWorldCupTheme ? "bg-white/45 dark:bg-green-950/15 border-green-300/40 backdrop-blur-md hover:border-yellow-400 hover:shadow-[0_0_15px_rgba(34,197,94,0.3)]" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-[#a88d44]/50 hover:shadow-lg dark:hover:bg-slate-800/50"}`}
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 blur-xl rounded-full"></div>
              {isWorldCupTheme && (
                <div className="absolute top-2 right-2 text-sm drop-shadow-md">⭐</div>
              )}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm ${isWorldCupTheme ? "bg-blue-500/20 border border-blue-400/30 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-yellow-300" : "bg-slate-900 border border-slate-200 dark:border-slate-800 text-[#d4af37] group-hover:bg-[#a88d44] group-hover:text-white"}`}>
                <FileText className="w-5 h-5" />
              </div>
              <div className="w-full">
                <h4 className={`font-extrabold text-[9px] sm:text-[10px] uppercase tracking-wider transition-colors leading-tight line-clamp-2 ${isWorldCupTheme ? "text-blue-800 dark:text-blue-300 group-hover:text-blue-600" : "text-slate-800 dark:text-slate-100 group-hover:text-[#a88d44]"}`}>Gerador de Provas</h4>
              </div>
            </motion.div>

            {/* MÓDULO: DIÁRIO DE CLASSE */}
            <motion.div 
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              onClick={() => setView('diary')}
              className={`group p-4 rounded-2xl border transition-all duration-300 flex flex-col items-center text-center gap-3 cursor-pointer relative overflow-hidden ${isWorldCupTheme ? "bg-white/45 dark:bg-green-950/15 border-green-300/40 backdrop-blur-md hover:border-yellow-400 hover:shadow-[0_0_15px_rgba(34,197,94,0.3)]" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-[#a88d44]/50 hover:shadow-lg dark:hover:bg-slate-800/50"}`}
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 blur-xl rounded-full"></div>
              {isWorldCupTheme && (
                <div className="absolute top-2 right-2 text-sm drop-shadow-md">⭐</div>
              )}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm ${isWorldCupTheme ? "bg-green-500/20 border border-green-400/30 text-green-600 dark:text-green-400 group-hover:bg-green-600 group-hover:text-white" : "bg-slate-900 border border-slate-200 dark:border-slate-800 text-[#d4af37] group-hover:bg-emerald-600 group-hover:text-white"}`}>
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="w-full">
                <h4 className={`font-extrabold text-[9px] sm:text-[10px] uppercase tracking-wider transition-colors leading-tight line-clamp-2 ${isWorldCupTheme ? "text-green-800 dark:text-green-300 group-hover:text-green-600" : "text-slate-800 dark:text-slate-100 group-hover:text-[#a88d44]"}`}>Diário Digital</h4>
              </div>
            </motion.div>

            {/* MÓDULO: BOLETIM CONSOLIDADO */}
            <motion.div 
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 }}
              onClick={() => setView('boletim')}
              className={`group p-4 rounded-2xl border transition-all duration-300 flex flex-col items-center text-center gap-3 cursor-pointer relative overflow-hidden ${isWorldCupTheme ? "bg-white/45 dark:bg-green-950/15 border-green-300/40 backdrop-blur-md hover:border-yellow-400 hover:shadow-[0_0_15px_rgba(34,197,94,0.3)]" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-[#a88d44]/50 hover:shadow-lg dark:hover:bg-slate-800/50"}`}
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 blur-xl rounded-full"></div>
              {isWorldCupTheme && (
                <div className="absolute top-2 right-2 text-sm drop-shadow-md">⭐</div>
              )}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm ${isWorldCupTheme ? "bg-yellow-400/20 border border-yellow-400/30 text-green-600 dark:text-green-400 group-hover:bg-yellow-400 group-hover:text-green-800" : "bg-slate-900 border border-slate-200 dark:border-slate-800 text-[#d4af37] group-hover:bg-indigo-600 group-hover:text-white"}`}>
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="w-full">
                <h4 className={`font-extrabold text-[9px] sm:text-[10px] uppercase tracking-wider transition-colors leading-tight line-clamp-2 ${isWorldCupTheme ? "text-green-800 dark:text-green-300 group-hover:text-yellow-600" : "text-slate-800 dark:text-slate-100 group-hover:text-[#a88d44]"}`}>Boletins & Turmas</h4>
              </div>
            </motion.div>

            {/* MÓDULO: CRONOGRAMA DE PROVAS */}
            <motion.div 
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              onClick={() => setView('cronograma')}
              className={`group p-4 rounded-2xl border transition-all duration-300 flex flex-col items-center text-center gap-3 cursor-pointer relative overflow-hidden ${isWorldCupTheme ? "bg-white/45 dark:bg-green-950/15 border-green-300/40 backdrop-blur-md hover:border-yellow-400 hover:shadow-[0_0_15px_rgba(34,197,94,0.3)]" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-[#a88d44]/50 hover:shadow-lg dark:hover:bg-slate-800/50"}`}
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 blur-xl rounded-full"></div>
              {isWorldCupTheme && (
                <div className="absolute top-2 right-2 text-sm drop-shadow-md">⭐</div>
              )}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm ${isWorldCupTheme ? "bg-blue-500/20 border border-blue-400/30 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-yellow-300" : "bg-slate-900 border border-slate-200 dark:border-slate-800 text-[#d4af37] group-hover:bg-amber-500 group-hover:text-white"}`}>
                <Calendar className="w-5 h-5" />
              </div>
              <div className="w-full">
                <h4 className={`font-extrabold text-[9px] sm:text-[10px] uppercase tracking-wider transition-colors leading-tight line-clamp-2 ${isWorldCupTheme ? "text-blue-800 dark:text-blue-300 group-hover:text-blue-600" : "text-slate-800 dark:text-slate-100 group-hover:text-[#a88d44]"}`}>Calendário Geral</h4>
              </div>
            </motion.div>

            {/* MÓDULO: OBSERVAÇÕES COMPORTAMENTAIS */}
            <motion.div 
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.25 }}
              onClick={() => setView('studentReports')}
              className={`group p-4 rounded-2xl border transition-all duration-300 flex flex-col items-center text-center gap-3 cursor-pointer relative overflow-hidden ${isWorldCupTheme ? "bg-white/45 dark:bg-green-950/15 border-green-300/40 backdrop-blur-md hover:border-yellow-400 hover:shadow-[0_0_15px_rgba(34,197,94,0.3)]" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-[#a88d44]/50 hover:shadow-lg dark:hover:bg-slate-800/50"}`}
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/5 blur-xl rounded-full"></div>
              {isWorldCupTheme && (
                <motion.div 
                  initial={{ rotate: -15, scale: 0.8 }}
                  animate={{ rotate: 15, scale: 1.2 }}
                  transition={{ repeat: Infinity, repeatType: "reverse", duration: 1, delay: 0.5 }}
                  className="absolute top-1.5 right-1.5 flex flex-col items-center z-10 cursor-help"
                  title="Rumo ao Hexa! A nossa 6ª Estrela em 2026!"
                >
                  <span className="text-sm drop-shadow-[0_0_10px_rgba(250,204,21,1)]">⭐</span>
                  <span className="text-[7px] font-black text-green-900 bg-yellow-400 rounded-sm px-1 leading-tight -mt-1 shadow-sm">6ª</span>
                </motion.div>
              )}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm ${isWorldCupTheme ? "bg-green-500/20 border border-green-400/30 text-green-600 dark:text-green-400 group-hover:bg-green-600 group-hover:text-white" : "bg-slate-900 border border-slate-200 dark:border-slate-800 text-[#d4af37] group-hover:bg-rose-500 group-hover:text-white"}`}>
                <Users className="w-5 h-5" />
              </div>
              <div className="w-full">
                <h4 className={`font-extrabold text-[9px] sm:text-[10px] uppercase tracking-wider transition-colors leading-tight line-clamp-2 ${isWorldCupTheme ? "text-green-800 dark:text-green-300 group-hover:text-green-600" : "text-slate-800 dark:text-slate-100 group-hover:text-[#a88d44]"}`}>Relatório de Aluno</h4>
              </div>
            </motion.div>

            {/* MÓDULO: ADMINISTRAÇÃO ESCOLAR (COMPACT) */}
            {isAdmin && (
              <motion.div 
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                onClick={() => setView('admin')}
                className={`group p-4 rounded-2xl border transition-all duration-300 flex flex-col items-center text-center gap-3 cursor-pointer relative overflow-hidden ${isWorldCupTheme ? "bg-white/45 dark:bg-green-950/15 border-green-300/40 backdrop-blur-md hover:border-yellow-400 hover:shadow-[0_0_15px_rgba(34,197,94,0.3)]" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-[#a88d44]/50 hover:shadow-lg dark:hover:bg-slate-800/50"}`}
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-yellow-500/5 blur-xl rounded-full"></div>
                {isWorldCupTheme && (
                  <div className="absolute top-2 right-2 text-sm drop-shadow-md">⭐</div>
                )}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm ${isWorldCupTheme ? "bg-yellow-400/20 border border-yellow-400/30 text-yellow-500 group-hover:bg-yellow-400 group-hover:text-green-800" : "bg-slate-900 border border-slate-200 dark:border-slate-800 text-[#d4af37] group-hover:bg-slate-700 group-hover:text-white"}`}>
                  <Settings className="w-5 h-5 group-hover:rotate-45 transition-all duration-500" />
                </div>
                <div className="w-full">
                  <h4 className={`font-extrabold text-[9px] sm:text-[10px] uppercase tracking-wider transition-colors leading-tight line-clamp-2 ${isWorldCupTheme ? "text-green-800 dark:text-green-300 group-hover:text-yellow-600" : "text-slate-800 dark:text-slate-100 group-hover:text-[#a88d44]"}`}>Administração</h4>
                </div>
              </motion.div>
            )}

          </div>
        </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* GRÁFICO DE LINHAS RECHARTS: EVOLUÇÃO DAS NOTAS MÉDIAS */}
            <div className={`lg:col-span-3 p-6 rounded-3xl border shadow-md space-y-6 transition-all duration-300 ${isWorldCupTheme ? "bg-white/45 dark:bg-slate-900/40 border-yellow-400/30 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.1)]" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-left space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-3 bg-[#a88d44] rounded-full"></span>
                  <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">
                    Média de Notas por Disciplina
                  </h3>
                </div>
                <p className="text-[11px] text-slate-700 dark:text-slate-400 font-medium font-sans">
                  Evolução do rendimento pedagógico a cada bimestre letivo.
                </p>
              </div>

              {/* CONTROLES / FILTROS DO GRÁFICO */}
              <div className="flex flex-wrap items-center gap-2">
                {chartDataResult.isDemo && (
                  <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-1 text-[8.5px] font-mono font-bold rounded-lg border border-amber-500/20 select-none">
                    ⚠️ MODO DEMONSTRAÇÃO
                  </span>
                )}
                
                {/* BIMESTER FILTER */}
                <div className="flex items-center gap-1.5 relative">
                  <span className="text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase tracking-wider font-mono">
                    Período:
                  </span>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowChartBimesterDropdown(!showChartBimesterDropdown)}
                      className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 shadow-sm outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <span className="max-w-[140px] truncate leading-none">
                        {chartBimesterFilters.length === 0 
                          ? "Nenhum" 
                          : chartBimesterFilters.length === 4 
                            ? "Ano Inteiro" 
                            : chartBimesterFilters.map(b => b.charAt(0) + 'º').join(', ')}
                      </span>
                      {chartBimesterFilters.length > 0 && chartBimesterFilters.length < 4 && (
                        <span className="text-[9px] bg-[#a88d44] text-white px-1.5 py-0.5 rounded-full font-black leading-none shrink-0">
                          {chartBimesterFilters.length}
                        </span>
                      )}
                    </button>

                    {showChartBimesterDropdown && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowChartBimesterDropdown(false)} />
                        <div className="absolute left-0 sm:right-0 sm:left-auto mt-1 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 p-3 space-y-2">
                          <div className="flex items-center justify-between pb-1 text-[9px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                            <span>Bimestres</span>
                            <button 
                              onClick={() => setChartBimesterFilters(['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'])} 
                              className="text-[#a88d44] hover:underline"
                            >
                              Reset
                            </button>
                          </div>
                          <div className="grid grid-cols-1 gap-1">
                            {['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'].map(b => {
                              const isSelected = chartBimesterFilters.includes(b);
                              return (
                                <button
                                  key={b}
                                  onClick={() => {
                                    if (isSelected) setChartBimesterFilters(chartBimesterFilters.filter(x => x !== b));
                                    else setChartBimesterFilters([...chartBimesterFilters, b].sort());
                                  }}
                                  className={cn(
                                    "px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-left flex items-center justify-between transition-all",
                                    isSelected ? "bg-[#a88d44]/15 text-[#a88d44]" : "hover:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                                  )}
                                >
                                  {b}
                                  {isSelected && <Check className="w-3 h-3" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {availableClasses.length > 0 && (
                  <div className="flex items-center gap-1.5 relative" id="chart-class-filter-container">
                    <span className="text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase tracking-wider font-mono">
                      Turmas:
                    </span>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowChartClassDropdown(!showChartClassDropdown)}
                        className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 shadow-sm outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-2 transition-all cursor-pointer"
                      >
                        <span className="max-w-[140px] truncate leading-none">
                          {chartClassFilters.length === 0 
                            ? "Todas as Turmas" 
                            : chartClassFilters.join(', ')}
                        </span>
                        {chartClassFilters.length > 0 && (
                          <span className="text-[9px] bg-[#a88d44] text-white px-1.5 py-0.5 rounded-full font-black leading-none shrink-0">
                            {chartClassFilters.length}
                          </span>
                        )}
                      </button>

                      {showChartClassDropdown && (
                        <>
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setShowChartClassDropdown(false)} 
                          />
                          <div className="absolute left-0 sm:right-0 sm:left-auto mt-1 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 p-3 max-h-80 overflow-y-auto space-y-2">
                            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
                              <span className="text-[9px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Filtrar por Turmas</span>
                              {chartClassFilters.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setChartClassFilters([])}
                                  className="text-[9px] font-black text-[#a88d44] hover:underline uppercase"
                                >
                                  Todos
                                </button>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-1 px-0.5 max-h-56 overflow-y-auto">
                              {availableClasses.map((cls) => {
                                const isSelected = chartClassFilters.includes(cls);
                                return (
                                  <button
                                    key={cls}
                                    type="button"
                                    onClick={() => {
                                      if (isSelected) {
                                        setChartClassFilters(chartClassFilters.filter(item => item !== cls));
                                      } else {
                                        setChartClassFilters([...chartClassFilters, cls]);
                                      }
                                    }}
                                    className={cn(
                                      "px-2 py-1 rounded-lg text-[10px] font-bold text-left border flex items-center justify-between transition-colors cursor-pointer",
                                      isSelected
                                        ? "bg-[#a88d44]/15 text-[#a88d44] dark:text-[#d4af37] border-[#a88d44]/30"
                                        : "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-800"
                                    )}
                                  >
                                    <span className="truncate mr-1">{cls}</span>
                                    {isSelected && <Check className="w-3 h-3 text-[#a88d44] shrink-0" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ÁREA DO GRÁFICO RECHARTS */}
            <div className="h-48 w-full relative flex items-center justify-center">
              {chartDataResult.subjects.length === 0 ? (
                <div className="text-center p-6 max-w-md bg-white/ dark:bg-slate-905/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  <div className="w-10 h-10 bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 border border-slate-200 dark:border-slate-800">
                    <BarChart3 className="w-5 h-5 text-slate-700 dark:text-slate-400" />
                  </div>
                  <h4 className="text-[11px] font-black text-slate-700 dark:text-slate-200 dark:text-white uppercase tracking-wider mb-1">
                    Sem dados reais disponíveis
                  </h4>
                  <p className="text-[10px] text-slate-700 dark:text-slate-300 font-medium leading-relaxed max-w-xs mx-auto">
                    A evolução pedagógica aparecerá aqui após o professor criar avaliações e salvar as respectivas notas dos alunos.
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartDataResult.data}
                    margin={{ top: 10, right: 30, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-850" vertical={false} />
                    <XAxis 
                      dataKey="bimesterShort"
                      stroke="#94a3b8"
                      fontSize={10}
                      fontFamily="Inter, sans-serif"
                      tickLine={false}
                      axisLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                      className="dark:stroke-slate-800"
                    />
                    <YAxis 
                      domain={[0, 10]} 
                      ticks={[0, 2, 4, 6, 8, 10]}
                      stroke="#94a3b8"
                      fontSize={10}
                      fontFamily="Inter, sans-serif"
                      tickLine={false}
                      axisLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                      className="dark:stroke-slate-800"
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-slate-950 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 p-3 rounded-xl shadow-xl space-y-1.5 font-sans min-w-[150px]">
                              <p className="text-[9px] font-black uppercase tracking-wider text-[#d4af37] font-mono border-b border-slate-200 dark:border-slate-800 pb-1">
                                {payload[0].payload.bimester}
                              </p>
                              <div className="space-y-1 pt-1">
                                {payload.map((p: any, idx: number) => (
                                  <div key={idx} className="flex items-center justify-between gap-3 text-xs font-semibold">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: p.stroke }} />
                                      <span className="text-slate-355 truncate">{p.name}</span>
                                    </div>
                                    <span className="font-bold text-white font-mono">{p.value.toFixed(1)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      iconType="circle"
                      iconSize={8}
                      content={({ payload }) => {
                        if (!payload) return null;
                        return (
                          <div className="flex flex-wrap justify-center gap-4 text-[10.5px] font-semibold text-slate-700 dark:text-slate-400 font-sans pt-4 max-h-16 overflow-y-auto">
                            {payload.map((entry: any, index: number) => (
                              <div key={`item-${index}`} className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
                                <span>{entry.value}</span>
                              </div>
                            ))}
                          </div>
                        );
                      }}
                    />
                    {chartDataResult.subjects.map((subj, index) => {
                      const colorsPalette = ['#a88d44', '#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#6366f1', '#14b8a6', '#8b5cf6'];
                      const color = colorsPalette[index % colorsPalette.length];
                      return (
                        <Line
                          key={subj}
                          type="monotone"
                          dataKey={subj}
                          name={subj}
                          stroke={color}
                          strokeWidth={2.5}
                          dot={{ r: 4, strokeWidth: 1 }}
                          activeDot={{ r: 6 }}
                          connectNulls={true}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* NOVO PAINEL INTEGRADO: ANÁLISE DE VARIAÇÃO PEDAGÓGICA (BIMESTRE A BIMESTRE) - Divertido e Prático */}
            {(() => {
              const prevAvg = bimesterComparisonData.data[0]?.value || 0;
              const currentAvg = bimesterComparisonData.data[1]?.value || 0;
              const diffVal = bimesterComparisonData.diff;
              const isIncrease = bimesterComparisonData.isIncrease;
              return (
                <div className={`mt-4 pt-5 border-t border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-5 p-4 rounded-3xl transition-all duration-300 ${isWorldCupTheme ? "bg-gradient-to-r from-slate-50/30 to-slate-100/20 dark:from-slate-900/30 dark:to-slate-850/10 border-yellow-400/20" : "bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-900/40 dark:to-slate-850/20"}`}>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-left w-full sm:w-auto">
                    <div className={`p-1.5 px-3 rounded-xl border shadow-sm flex items-center justify-between gap-2.5 w-full sm:w-auto transition-all ${isWorldCupTheme ? "bg-white/35 dark:bg-slate-900/35 border-yellow-400/20 backdrop-blur-md" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"}`}>
                      <span className="text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase tracking-widest font-mono shrink-0 font-sans">
                        Análise de:
                      </span>
                      <select
                        value={chartSubjectFilter}
                        onChange={(e) => setChartSubjectFilter(e.target.value)}
                        className="bg-transparent text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 cursor-pointer outline-none w-full max-w-[200px]"
                      >
                        <option value="">Geral (Todas Matérias)</option>
                        {chartDataResult.subjects.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-black text-slate-600 dark:text-slate-505 uppercase tracking-wider font-mono">
                          Média {bimesterComparisonData.prevBimester}
                        </span>
                        <p className="text-xs font-black text-slate-700 dark:text-slate-400 font-mono">
                          {prevAvg.toFixed(1)} /10
                        </p>
                      </div>
                      <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 hidden xs:block" />
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-black text-slate-600 dark:text-slate-505 uppercase tracking-wider font-mono">
                          Média {bimesterComparisonData.currentBimester}
                        </span>
                        <p className="text-xs font-black text-slate-700 dark:text-slate-200 font-mono">
                          {currentAvg.toFixed(1)} /10
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200 dark:border-slate-800">
                    <div className="text-right space-y-0.5 max-w-[260px] font-sans">
                      <span className="text-[9px] font-black text-slate-600 dark:text-slate-505 uppercase tracking-wider block">Relatório de Humor das Notas</span>
                      <p className="text-[10px] font-bold leading-tight">
                        {prevAvg === 0 && currentAvg === 0 ? (
                          <span className="text-slate-700 dark:text-slate-300">
                            Aguardando o lançamento de notas reais pelo professor.
                          </span>
                        ) : isIncrease ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {diffVal > 15 
                              ? "🚀 SENSACIONAL! Alunos comendo livro no café da manhã!" 
                              : "🎉 NOTAS VOANDO ALTO! Os miolos estão funcionando de vento em popa! 🧠✨"}
                          </span>
                        ) : (
                          <span className="text-rose-600 dark:text-rose-400">
                            {diffVal < -10
                              ? "⚠️ ALERTA DE PREGUIÇA RADICAL! Menos videogame e mais tabuada! 🎮📚"
                              : "🧟 SOS ZOMBIS! Alunos precisando urgentemente de café ou de milagre!"}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="space-y-0.5 text-right font-mono">
                        <span className="text-[9px] font-black text-slate-700 dark:text-slate-400 uppercase tracking-widest leading-none block">Variação</span>
                        <div className={cn(
                          "text-sm font-black leading-none",
                          prevAvg === 0 && currentAvg === 0 ? "text-slate-600 dark:text-slate-400" : isIncrease ? "text-emerald-500" : "text-rose-500"
                        )}>
                          {prevAvg === 0 && currentAvg === 0 ? "0,0%" : isIncrease ? `📈 +${diffVal.toFixed(1)}%` : `📉 ${diffVal.toFixed(1)}%`}
                        </div>
                      </div>
                      <div className={cn(
                        "px-2.5 py-1 text-[9px] font-black uppercase tracking-tight flex items-center gap-1 shadow-xs border transition-all duration-300",
                        prevAvg === 0 && currentAvg === 0
                          ? "bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 dark:bg-slate-800 dark:text-slate-505 border-slate-200 dark:border-slate-800"
                          : isIncrease 
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                      )}>
                        {prevAvg === 0 && currentAvg === 0 ? "Estável" : isIncrease ? "Foguete!" : "Zumbi!"}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* NOVO PAINEL INTEGRADO: COMPARATIVO POR TURMA */}
            <div className={`mt-8 p-6 rounded-3xl border shadow-md space-y-6 transition-all duration-300 ${isWorldCupTheme ? "bg-white/45 dark:bg-slate-900/40 border-yellow-400/30 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.1)]" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-left space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-3 bg-indigo-500 rounded-full"></span>
                    <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">
                      Comparativo de Médias por Turma
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-700 dark:text-slate-400 font-medium font-sans">
                    Análise de performance entre turmas do mesmo ano escolar selecionado.
                  </p>
                </div>
                
                <div className="flex items-center gap-2 relative">
                  <span className="text-[10px] font-black text-slate-600 dark:text-slate-505 uppercase tracking-wider font-mono">
                    Ano Escolar:
                  </span>
                  <select
                    value={selectedComparisonYear}
                    onChange={(e) => setSelectedComparisonYear(e.target.value)}
                    className="border rounded-xl px-3 py-1.5 font-black cursor-pointer transition-all bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
                  >
                    {yearOptions.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="h-48 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classComparisonStats} margin={{ top: 20, right: 30, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#94a3b8" 
                      fontSize={11} 
                      fontWeight="bold"
                      fontFamily="Inter, sans-serif" 
                      axisLine={{ stroke: '#cbd5e1' }} 
                      tickLine={false} 
                      tick={{ fill: '#64748b' }}
                    />
                    <YAxis 
                      domain={[0, 10]} 
                      ticks={[0, 2, 4, 6, 8, 10]} 
                      stroke="#94a3b8" 
                      fontSize={10} 
                      fontFamily="Inter, sans-serif" 
                      axisLine={{ stroke: '#cbd5e1' }} 
                      tickLine={false} 
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-2xl text-white font-sans text-xs min-w-[160px]">
                              <p className="font-black text-indigo-400 mb-1.5 uppercase tracking-widest text-[10px] border-b border-slate-200 dark:border-slate-800 pb-1">{data.name}</p>
                              <div className="flex justify-between items-center pt-1">
                                <span className="text-slate-600 dark:text-slate-400 font-medium">Média do Ano:</span>
                                <span className={cn(
                                  "font-black text-sm",
                                  data.average >= 7 ? "text-emerald-400" : data.average >= 5 ? "text-amber-400" : "text-rose-400"
                                )}>{data.average.toFixed(1)}</span>
                              </div>
                              {data.isDemo && (
                                <div className="mt-2 text-[8px] text-amber-500/80 font-black uppercase tracking-tighter flex items-center gap-1">
                                  <div className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
                                  Simulação Estatística
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar 
                       dataKey="average" 
                       radius={[8, 8, 0, 0]} 
                       barSize={32}
                       animationBegin={200}
                       animationDuration={1500}
                    >
                      {classComparisonStats.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.average >= 7 ? '#10b981' : entry.average >= 5 ? '#f59e0b' : '#ef4444'} 
                          fillOpacity={0.85}
                          stroke={entry.average >= 7 ? '#059669' : entry.average >= 5 ? '#d97706' : '#dc2626'}
                          strokeWidth={1}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="flex items-center justify-center gap-6 pt-2 border-t border-slate-200 dark:border-slate-800/40">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/40" />
                  <span className="text-[9px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Acima de 7.0</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/40" />
                  <span className="text-[9px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">5.0 a 6.9</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/20 border border-rose-500/40" />
                  <span className="text-[9px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Abaixo de 5.0</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* COLUNA DIREITA: RESUMO DE CIRCULARES E ADMIN (4/12) */}
        <div id="mural-comunicados" className="lg:col-span-4 space-y-6">
          
          {/* PAINEL DE CONECTADOS AGORA E TRILHA (SOMENTE ADMIN) */}
          {isTIUser && (
              <div className={`rounded-3xl border p-6 text-left space-y-4 shadow-xl transition-all duration-300 ${isWorldCupTheme ? "bg-white/45 dark:bg-slate-900/40 border-yellow-400/30 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.1)]" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400">
                  <Activity className="w-4 h-4 text-emerald-500 font-bold animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">Conectados Agora</h3>
                  <p className="text-[8px] font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider">Acessos Ativos & Recentes</p>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <span className="relative flex h-2 w-2 mr-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] font-mono font-black text-slate-700 dark:text-slate-300 bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                  {onlineList.filter((u: any) => u.isOnline).length} Online
                </span>
              </div>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {onlineList.map((u: any) => {
                const enteredTime = u.lastLogin ? new Date(u.lastLogin).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}) : '--';
                const lastSeenTime = u.lastSeen ? new Date(u.lastSeen).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}) : '--';
                return (
                <div 
                  key={u.email}
                  className={cn("flex flex-col p-3 border rounded-xl hover:bg-white/50 dark:hover:bg-slate-900 transition-colors group", 
                    isWorldCupTheme 
                      ? (u.isOnline ? "bg-emerald-50/20 dark:bg-emerald-950/25 border-yellow-400/20" : "bg-white/10 dark:bg-slate-950/15 border-green-300/20 opacity-85")
                      : (u.isOnline ? "bg-emerald-50/10 dark:bg-emerald-900/10 border-slate-200 dark:border-slate-800" : "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-80")
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        <div className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center text-accent text-xs font-bold font-sans">
                          {u.name?.slice(0, 2).toUpperCase()}
                        </div>
                        <span className={cn("absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-slate-950", u.isOnline ? "bg-emerald-500" : "bg-slate-400 dark:bg-slate-600")} />
                      </div>
                      <div className="min-w-0">
                        <p className={cn("text-[11px] font-bold truncate", u.isOnline ? "text-slate-800 dark:text-slate-200" : "text-slate-600 dark:text-slate-400")}>{u.name}</p>
                        <p className="text-[8.5px] font-medium text-slate-500 dark:text-slate-500 truncate lowercase leading-none mt-0.5">{u.email}</p>
                      </div>
                    </div>
                    <span className={cn(
                      "text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md",
                      u.role === 'admin' 
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400" 
                        : "bg-slate-100 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 dark:bg-slate-800"
                    )}>
                      {u.role === 'admin' ? 'TI/Coord' : 'Prof.'}
                    </span>
                  </div>
                  
                  {/* Status Indicator */}
                  <div className="flex items-center justify-between mt-1 pt-2 border-t border-dashed border-slate-200 dark:border-slate-800 text-[9px] font-bold tracking-wide">
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      Entrou: <span className="text-slate-700 dark:text-slate-300 font-mono">{enteredTime}</span>
                    </div>
                    {u.isOnline ? (
                      <div className="text-emerald-600 dark:text-emerald-400 font-black animate-pulse">Ativo Agora</div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                        Parou: <span className="text-slate-600 dark:text-slate-400 font-mono">{lastSeenTime}</span>
                      </div>
                    )}
                  </div>
                </div>
              )})}
              {onlineList.length === 0 && (
                <p className="text-center text-slate-600 dark:text-slate-400 py-4 text-xs font-medium italic">Nenhum histórico de acesso recente.</p>
              )}
            </div>
          </div>
          )}



          <div className={`overflow-hidden rounded-3xl border p-6 text-left space-y-6 transition-all duration-300 shadow-xl ${isWorldCupTheme ? "bg-white/45 dark:bg-slate-900/40 border-yellow-400/30 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.1)]" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"}`}>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">Agenda Eletrônica</h3>
                <p className="text-[8px] font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider">Mensagens & Recados</p>
              </div>
              
              <span className={cn(
                "px-2.5 py-1 text-[9px] font-black rounded-lg text-center font-mono select-none border",
                unreadInvolvedAnnouncements.length > 0
                  ? "bg-rose-500/10 text-rose-500 border-rose-500/15 animate-pulse"
                  : "bg-slate-500/10 text-slate-500 border-slate-500/15"
              )}>
                {unreadInvolvedAnnouncements.length} Novas
              </span>
            </div>

            {/* Shortcut buttons */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setView('agenda')}
                className="w-full flex items-center justify-between p-4 bg-slate-950 hover:bg-slate-900 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-white rounded-2xl group transition-all duration-300 shadow-md transform hover:-translate-y-0.5 active:translate-y-0 text-left cursor-pointer font-sans"
              >
                <div className="space-y-1">
                  <span className="text-[8px] font-extrabold text-[#d4af37] uppercase tracking-widest block font-mono">Abrir Comunicações</span>
                  <span className="text-xs font-black tracking-tight uppercase">Agenda Eletrônica</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-[#a88d44] group-hover:bg-[#8e7432] text-white flex items-center justify-center transition-colors">
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            </div>

            {/* Quick Teaser Feed */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800/65">
                <span className="text-[8.5px] font-black text-slate-700 dark:text-slate-400 uppercase tracking-widest font-mono">Mensagens Recentes</span>
                <button 
                  onClick={() => setView('agenda')}
                  className="text-[8.5px] font-black text-[#a88d44] hover:underline uppercase tracking-wide cursor-pointer border-none bg-transparent shrink-0"
                >
                  Ver Tudo
                </button>
              </div>

              {(() => {
                const sorted = [...involvedMessages]
                  .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
                  .slice(0, 3);

                if (sorted.length === 0) {
                  return (
                    <div className="py-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center">
                      <Inbox className="w-4 h-4 mx-auto opacity-35 text-slate-600 dark:text-slate-400 mb-1" />
                      <p className="text-[9px] font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider">Nenhuma mensagem recente</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2.5">
                    {sorted.map(msg => {
                      const isUnread = !msg.teacherRead;
                      const formattedDate = msg.date
                        ? new Date(msg.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                        : 'Recente';

                      // Determine category details locally
                      let catLabel = 'Comunicado';
                      let catColor = 'bg-purple-500';
                      if (msg.category === 'academic') { catColor = 'bg-blue-500'; }
                      else if (msg.category === 'behavior') { catColor = 'bg-amber-500'; }
                      else if (msg.category === 'financial') { catColor = 'bg-emerald-500'; }
                      else if (msg.category === 'event') { catColor = 'bg-indigo-500'; }

                      return (
                        <div 
                          key={msg.id}
                          className={cn(
                            "group/item p-3 border rounded-xl flex items-center justify-between gap-3 text-left transition-all duration-200 cursor-pointer",
                            isUnread 
                              ? "bg-indigo-50/20 hover:bg-indigo-50/40 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/40 animate-fadeIn" 
                              : cn(
                                  "hover:bg-slate-50 dark:hover:bg-slate-800/45 border-slate-200 dark:border-slate-800/80",
                                  isWorldCupTheme
                                    ? "bg-white/25 dark:bg-slate-900/30 border-green-300/20 backdrop-blur-md"
                                    : "bg-white dark:bg-slate-900"
                                )
                          )}
                          onClick={() => setView('agenda')}
                        >
                          <div className="flex items-start gap-2.5 min-w-0 flex-1 font-sans">
                            {/* category color badge and unread indicator */}
                            <span className={cn(
                              "w-2 h-2 rounded-full shrink-0 mt-1.5", 
                              catColor,
                              isUnread && "animate-pulse ring-2 ring-indigo-400/35"
                            )} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 justify-between">
                                <span className="text-[8px] font-extrabold uppercase tracking-widest text-[#a88d44] truncate max-w-[120px]">
                                  {msg.senderName.split(" ")[0]} {msg.senderName.includes("(") ? msg.senderName.substring(msg.senderName.indexOf("(")) : ""}
                                </span>
                                <span className="text-[7.5px] font-bold text-slate-700 dark:text-slate-400 uppercase font-mono shrink-0">
                                  {formattedDate}
                                </span>
                              </div>
                              <h4 className={cn("text-[10px] font-black uppercase tracking-tight truncate group-hover/item:text-[#a88d44] transition-colors leading-[1.35] mt-0.5", 
                                isUnread ? "text-slate-850 dark:text-slate-55 font-extrabold" : "text-slate-700 dark:text-slate-300 font-medium"
                              )}>
                                {msg.subject}
                              </h4>
                              <p className="text-[8.5px] text-slate-700 dark:text-slate-400 font-medium truncate mt-0.5 max-w-xs">
                                {msg.body}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                            {msg.status === 'pending' && (
                              <span className="text-[7px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded font-black uppercase border border-amber-500/15">
                                pendente
                              </span>
                            )}
                            {msg.requiresSignature && (
                              <span className={cn(
                                "text-[7px] px-1.5 py-0.5 rounded font-black uppercase border",
                                msg.signatures?.length > 0
                                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/15"
                                  : "bg-slate-500/10 text-slate-500 border-slate-500/15"
                              )}>
                                ciente: {msg.signatures?.length || 0}
                              </span>
                            )}
                            <ChevronRight className="w-3.5 h-3.5 text-slate-650 dark:text-slate-400 opacity-0 group-hover/item:opacity-100 group-hover/item:translate-x-0.5 transition-all shrink-0" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Administrative Fast-launch hint */}
            {isAdmin && (
              <div className={`p-4 border text-left space-y-2 rounded-2xl transition-all ${isWorldCupTheme ? "bg-amber-500/10 dark:bg-amber-950/15 border-yellow-400/20 backdrop-blur-md" : "bg-amber-50/60 dark:bg-amber-950/10 border-amber-100/60 dark:border-amber-900/40"}`}>
                <span className="text-[7.5px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest font-mono block">Painel Operatório</span>
                <p className="text-[9px] text-slate-700 dark:text-slate-400 font-medium leading-relaxed font-sans">
                  Para enviar mensagens e circulares à equipe ou famílias, acesse a agenda.
                </p>
                <button
                  type="button"
                  onClick={() => setView('agenda')}
                  className="w-full py-1.5 bg-[#a88d44] hover:bg-[#8e7432] text-white font-black text-[8px] uppercase tracking-wider rounded-lg transition-all text-center block cursor-pointer border border-[#d4af37]/20 active:scale-95 shadow-sm font-sans"
                >
                  Novo Lançamento
                </button>
              </div>
            )}
          </div>

          {/* TELEMETRY CARD */}
          <div className={`p-4 rounded-2xl border text-[9.5px] text-slate-700 dark:text-slate-300 text-left space-y-2 transition-all ${isWorldCupTheme ? "bg-white/35 dark:bg-slate-900/40 border border-yellow-400/20 backdrop-blur-md text-green-950 dark:text-green-200" : "bg-white/50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800"}`}>
            <h4 className="font-extrabold text-[#35495e] dark:text-[#a88d44] uppercase tracking-widest flex items-center gap-1.5 font-mono">
              <Shield className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>DIRETRIZES DE REGISTROS</span>
            </h4>
            <p className="leading-relaxed font-medium font-sans">
              Todo lançamento de notas, faltas pedagógicas, alterações de provas ou observações comportamentais realizadas neste console operacional são auditadas para garantir a total conformidade com os regulamentos internos do Colégio Progresso Santista.
            </p>
          </div>
        </div>

      </div>
    </motion.div>
    </>
  );
}

// RESTYLED METRIC BLOCK VIEW
export function StatCard({ label, value, icon, color, description, badge, isWorldCupTheme: propIsWorldCupTheme }: { label: string, value: any, icon: React.ReactNode, color: string, description?: string, badge?: React.ReactNode, isWorldCupTheme?: boolean }) {
  const isWorldCupTheme = propIsWorldCupTheme !== undefined ? propIsWorldCupTheme : (localStorage.getItem('cps_world_cup_theme') !== 'false');
  let themeStyles = {
    bgGlow: "bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 dark:bg-slate-800",
    textGlow: "text-slate-700 dark:text-slate-300",
    glowBorder: "border-slate-200 dark:border-slate-800"
  };

  if (color === "indigo") {
    themeStyles = {
      bgGlow: "bg-indigo-50/50 dark:bg-indigo-950/25",
      textGlow: "text-[#35495e] dark:text-indigo-400",
      glowBorder: "border-indigo-100 dark:border-indigo-900/40"
    };
  } else if (color === "amber") {
    themeStyles = {
      bgGlow: "bg-amber-50/50 dark:bg-amber-950/20",
      textGlow: "text-amber-700 dark:text-amber-400",
      glowBorder: "border-amber-200/40 dark:border-amber-900/30"
    };
  } else if (color === "gold") {
    themeStyles = {
      bgGlow: "bg-yellow-50/40 dark:bg-amber-900/10",
      textGlow: "text-[#a88d44] dark:text-[#d4af37]",
      glowBorder: "border-yellow-250/40 dark:border-amber-900/40"
    };
  } else if (color === "slate") {
    themeStyles = {
      bgGlow: "bg-slate-50 dark:bg-slate-900",
      textGlow: "text-slate-755 dark:text-slate-400",
      glowBorder: "border-slate-200 dark:border-slate-800"
    };
  }

  return (
    <motion.div 
      onClick={() => {
        if (isWorldCupTheme) {
          playStadiumSound('kick');
          try {
            confetti({
              particleCount: 15,
              spread: 30,
              origin: { y: 0.6 }
            });
          } catch (_) {}
        }
      }}
      whileHover={{ 
        scale: 1.05, 
        rotate: -0.5, 
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        transition: { type: "spring", stiffness: 400, damping: 10 } 
      }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className={cn(
        isWorldCupTheme
          ? "bg-gradient-to-br from-green-50/30 to-emerald-100/20 dark:from-green-950/10 dark:to-emerald-900/5 backdrop-blur-xl border-yellow-400/30 hover:border-yellow-400/70 shadow-[0_4px_12px_rgba(21,128,61,0.1)] p-3 border rounded-xl flex flex-col items-start justify-center gap-1 transition-all duration-300 relative overflow-hidden min-h-[5rem]"
          : "bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-3 border rounded-xl flex flex-col items-start justify-center gap-1 transition-all duration-300 shadow-sm hover:shadow-md relative overflow-hidden min-h-[5rem]",
        themeStyles.glowBorder
      )}
    >
      {isWorldCupTheme && (
        <>
          {/* Mini trading card watermark stripes */}
          <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-yellow-400/20 to-transparent pointer-events-none" />
          {/* 5 mini stars on top-left of each stat card */}
          <div className="absolute top-1.5 left-3 flex gap-0.5 opacity-60">
            {Array.from({ length: 5 }).map((_, idx) => (
              <span key={idx} className="text-[6px] text-yellow-500">★</span>
            ))}
          </div>
        </>
      )}
      {badge && (
        <div className="absolute top-2.5 right-2.5 z-10">
          {badge}
        </div>
      )}
      <div className="flex items-center gap-3 w-full">
        <div className={cn("p-2 rounded-xl shrink-0 transition-all shadow-sm", themeStyles.bgGlow, themeStyles.textGlow)}>
          {React.cloneElement(icon as React.ReactElement, { className: "w-4 h-4 sm:w-5 sm:h-5" })}
        </div>
        <div className="overflow-hidden min-w-0 flex-1">
          <p className={cn(
            "text-[8px] sm:text-[9px] font-black uppercase tracking-widest mb-0.5 whitespace-normal break-words leading-tight",
            localStorage.getItem('cps_world_cup_theme') !== 'false'
              ? "text-green-800 dark:text-green-300"
              : "text-slate-700 dark:text-slate-400"
          )}>{label}</p>
          <motion.p 
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 15, delay: 0.2 }}
            className={cn(
              "text-lg sm:text-xl font-display font-black tracking-tight leading-none font-mono",
              localStorage.getItem('cps_world_cup_theme') !== 'false'
                ? "text-green-950 dark:text-yellow-400"
                : "text-slate-700 dark:text-slate-200 dark:text-white"
            )}
          >
            {value}
          </motion.p>
        </div>
      </div>
      {description && (
        <p className={cn(
          "text-[8px] sm:text-[9px] mt-0.5 font-medium whitespace-normal break-words leading-tight",
          localStorage.getItem('cps_world_cup_theme') !== 'false'
            ? "text-green-700/80 dark:text-green-400"
            : "text-slate-600 dark:text-slate-400"
        )}>{description}</p>
      )}
    </motion.div>
  );
}
