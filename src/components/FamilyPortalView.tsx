import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LOGO_VINHO } from '../assets';
import { 
  LogOut, 
  User, 
  Calendar, 
  FileText, 
  Award, 
  MessageSquare, 
  CheckCircle, 
  Download, 
  Send, 
  Plus, 
  Search, 
  Lock, 
  Sparkles, 
  Clock, 
  ChevronRight,
  ChevronLeft,
  Info,
  BadgeAlert,
  Settings,
  X,
  UserCheck,
  Check,
  LayoutDashboard,
  School,
  DollarSign,
  BookOpen
} from 'lucide-react';
import { Student, Exam, Result, StudentReport, Lesson, Attendance } from '../types';
import { cn } from '../lib/utils';
import { exportMultipleToPDF } from '../lib/pdfUtils';
import { Paperclip } from 'lucide-react';

// Import modular family portal tabs
import { DashboardTab } from './family/DashboardTab';
import { GradesTab } from './family/GradesTab';
import { ReportsTab } from './family/ReportsTab';
import { MessagesTab } from './family/MessagesTab';
import { SecretariaTab } from './family/SecretariaTab';
import { FinancialTab } from './family/FinancialTab';
import { WorkCoverTab } from './family/WorkCoverTab';
import { SettingsTab } from './family/SettingsTab';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export function FamilyPortalView({ 
  session, 
  onLogout, 
  schoolInfo, 
  studentReports = [], 
  results = [], 
  exams = [],
  lessons = [],
  attendanceRecords = [],
  onSignReport
}: { 
  session: { student: Student; role: string }, 
  onLogout: () => void, 
  schoolInfo: any, 
  studentReports?: StudentReport[], 
  results?: Result[], 
  exams?: Exam[],
  lessons?: Lesson[],
  attendanceRecords?: Attendance[],
  onSignReport?: (reportId: string, guardianName: string, signatureText: string) => Promise<void>
}) {
  const { student } = session;
  
  // 8-tab modern layout
  const [currentTab, setCurrentTab] = useState<'painel' | 'notas' | 'relatorios' | 'secretaria' | 'financeiro' | 'capas' | 'mensagens' | 'ajustes'>('painel');
  const [portalRole, setPortalRole] = useState<'aluno' | 'responsavel'>('aluno');
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [selectedBimester, setSelectedBimester] = useState<string>('1º Bimestre');
  const [showToast, setShowToast] = useState<string | null>(null);

  // Message filter state
  const [messageFilter, setMessageFilter] = useState<'all' | 'unread' | 'sent'>('all');

  // Secretaria state
  const [activeSecretariaTab, setActiveSecretariaTab] = useState<'solicitar' | 'historico'>('solicitar');
  const [selectedDocType, setSelectedDocType] = useState<string>('');
  const [docMotive, setDocMotive] = useState<string>('');
  const [docRequests, setDocRequests] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem("cps_doc_requests");
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [
      {
        id: "req-1",
        type: "Declaração de Matrícula",
        motive: "Abertura de conta bancária universitária / jovem aprendiz.",
        date: new Date(Date.now() - 3600000 * 240).toISOString(),
        status: "Concluído",
        authKey: "matr-992-cps-2026",
        downloadUrl: "#"
      }
    ];
  });

  // Capas de Trabalho state
  const [coverTitle, setCoverTitle] = useState<string>('Trabalho Bimestral de Pesquisa');
  const [coverSubtitle, setCoverSubtitle] = useState<string>('Análise histórica sobre a Revolução Industrial e seus impactos socioeconômicos');
  const [coverSubject, setCoverSubject] = useState<string>('História');
  const [coverTeacher, setCoverTeacher] = useState<string>('');
  const [coverDateText, setCoverDateText] = useState<string>('Santos - SP\n2026');
  const [coverAlignment, setCoverAlignment] = useState<'left' | 'center'>('center');

  // Ajustes/Segurança state
  const [guardianPin, setGuardianPin] = useState<string>(() => {
    try {
      const stored = localStorage.getItem("cps_guardian_pin");
      if (stored) return stored;
    } catch (e) {}
    return "1234";
  });

  const triggerToast = (message: string) => {
    setShowToast(message);
    setTimeout(() => {
      setShowToast(null);
    }, 4000);
  };

  const handleCreateDocRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocType) {
      triggerToast("Selecione o tipo de documento desejado.");
      return;
    }
    if (!docMotive.trim()) {
      triggerToast("Por favor, descreva o motivo da solicitação.");
      return;
    }
    const newRequest = {
      id: `req-${Date.now()}`,
      type: selectedDocType,
      motive: docMotive,
      date: new Date().toISOString(),
      status: "Concluído",
      authKey: `auth-${Math.floor(Math.random() * 900 + 100)}-cps-2026`,
      downloadUrl: "#"
    };
    const updated = [newRequest, ...docRequests];
    setDocRequests(updated);
    try {
      localStorage.setItem("cps_doc_requests", JSON.stringify(updated));
    } catch (err) {}
    setSelectedDocType("");
    setDocMotive("");
    triggerToast("Solicitação enviada e processada digitalmente com sucesso!");
  };

  const handleChangePin = (newPin: string) => {
    setGuardianPin(newPin);
    try {
      localStorage.setItem("cps_guardian_pin", newPin);
    } catch (e) {}
    triggerToast("PIN familiar de segurança atualizado!");
  };

  const handleCopyPixCode = (code: string) => {
    navigator.clipboard.writeText(code);
    triggerToast("Código Pix Copia e Cola copiado com sucesso!");
  };

  const handleDownloadPdf = () => {
    triggerToast("Carregando comprovante PDF de quitação...");
    setTimeout(() => {
      triggerToast("Download concluído com sucesso!");
    }, 1000);
  };

  // State: Message system
  const [isComposing, setIsComposing] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
  const [messageSearch, setMessageSearch] = useState('');
  const [messageSubject, setMessageSubject] = useState('coord_responsavel');
  const [messageProvider, setMessageProvider] = useState('');
  const [messageStatus, setMessageStatus] = useState<'idle' | 'sending' | 'success'>('idle');
  const [replyBody, setReplyBody] = useState("");
  const [composeAttachments, setComposeAttachments] = useState<any[]>([]);
  const [replyAttachments, setReplyAttachments] = useState<any[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [messages, setMessages] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem("cps_agenda_messages");
      if (stored) {
        let parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          parsed = parsed.filter(
            (m: any) =>
              m.id !== "1" &&
              !m.body?.includes("Prezados pais e responsáveis, informamos que nossa reunião"),
          );
        }
        return parsed
          .filter((m: any) => {
            if (m.folder === 'lixeira' || m.status === 'pending' || m.status === 'pending_reply') return false;
            if (m.isFromFamily) {
              return m.studentName === student.name || m.senderName?.includes(student.name);
            }
            // Message from school/staff
            const isRecipient = 
              m.receiversNames?.includes(student.name) ||
              m.receiversNames?.includes(student.classId) ||
              m.receiversNames?.some((r: string) => {
                const rLow = r.toLowerCase();
                return rLow === 'todos' || rLow === 'todos os alunos' || rLow === 'todos os responsáveis' || rLow === 'responsáveis' || rLow === 'pais' || rLow === 'alunos';
              });
            return isRecipient;
          })
          .map((m: any) => ({
            ...m, 
            subject: m.familySubject || m.subject, 
            content: m.body, 
            status: m.replies?.length > 0 ? 'Respondida' : 'Recebida'
          }))
          .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }
    } catch(e) {}
    return [];
  });

  // State: Digital Signatures
  const [viewingReport, setViewingReport] = useState<StudentReport | null>(null);
  
  const [signedReports, setSignedReports] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem(`signed_reports_${student.name}`);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return {};
  });

  const mergedSignedReports = useMemo(() => {
    const dbSigs: Record<string, string> = {};
    (studentReports || []).forEach(r => {
      if (r.parentSignature) {
        dbSigs[r.id] = r.parentSignature;
      }
    });
    return {
      ...signedReports,
      ...dbSigs
    };
  }, [studentReports, signedReports]);

  const syncMessagesFromServer = () => {
    fetch("/api/agenda/messages")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success && data.messages) {
          const allMsgs = data.messages;
          const filtered = allMsgs
            .filter((m: any) => {
              if (m.folder === 'lixeira' || m.status === 'pending' || m.status === 'pending_reply') return false;
              if (m.isFromFamily) {
                return m.studentName === student.name || m.senderName?.includes(student.name);
              }
              // Message from school/staff
              const isRecipient = 
                m.receiversNames?.includes(student.name) ||
                m.receiversNames?.includes(student.classId) ||
                m.receiversNames?.some((r: string) => {
                  const rLow = r.toLowerCase();
                  return rLow === 'todos' || rLow === 'todos os alunos' || rLow === 'todos os responsáveis' || rLow === 'responsáveis' || rLow === 'pais' || rLow === 'alunos';
                });
              return isRecipient;
            })
            .map((m: any) => ({
              ...m, 
              subject: m.familySubject || m.subject, 
              content: m.body, 
              status: m.replies?.length > 0 ? 'Respondida' : 'Recebida'
            }))
            .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
          setMessages(filtered);
          
          // Keep selectedMessage up to date if one is open
          if (selectedMessage) {
            const updatedSel = filtered.find(m => m.id === selectedMessage.id);
            if (updatedSel) {
              setSelectedMessage(updatedSel);
            }
          }
        }
      })
      .catch((err) => console.warn("Erro ao carregar mensagens da agenda:", err));
  };

  const handleSelectMessage = (msg: any | null) => {
    setSelectedMessage(msg);
    if (msg) {
      setIsComposing(false);
      // Mark as read if not from family and currently unread by family
      if (!msg.isFromFamily && (!msg.read || msg.familyRead === false)) {
        const updatedMsg = { ...msg, read: true, familyRead: true };
        const updatedMessages = messages.map(m => 
          m.id === msg.id 
            ? updatedMsg 
            : m
        );
        setMessages(updatedMessages);
        
        // Sincronizar com o servidor
        fetch("/api/agenda/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: updatedMsg }),
        })
        .then((res) => res.json())
        .then((data) => {
          if (!data.success) throw new Error("Sync read failed");
        })
        .catch((err) => console.warn("Erro ao marcar como lido no servidor:", err));

        // Also update local storage for offline fallback
        try {
          const stored = localStorage.getItem("cps_agenda_messages");
          if (stored) {
            const parsed = JSON.parse(stored);
            const updatedStored = parsed.map((m: any) => 
              m.id === msg.id 
                ? { ...m, read: true, familyRead: true } 
                : m
            );
            localStorage.setItem("cps_agenda_messages", JSON.stringify(updatedStored));
          }
        } catch (e) {}
      }
    }
  };

  // Synchronize messages on mount and poll every 10 seconds
  useEffect(() => {
    syncMessagesFromServer();
    const interval = setInterval(syncMessagesFromServer, 10000);
    return () => clearInterval(interval);
  }, []);

  // Synchronize messages when tab is clicked or changed to refresh in real time
  useEffect(() => {
    if (currentTab === 'mensagens' || currentTab === 'painel') {
      syncMessagesFromServer();
    }
  }, [currentTab]);

  const [loggedViews, setLoggedViews] = useState<Set<string>>(new Set());
  const [showUnreadModal, setShowUnreadModal] = useState(false);
  const [initialUnreadCount, setInitialUnreadCount] = useState(0);

  useEffect(() => {
    const unreadMessages = messages.filter((m: any) => !m.isFromFamily && (!m.read || m.familyRead === false));
    const count = unreadMessages.length;
    if (count > 0) {
      setInitialUnreadCount(count);
      setShowUnreadModal(true);
      triggerToast(`Você tem ${count} nova(s) mensagem(ns)!`);
    }
  }, []);

  const handleSignReport = (report: any, guardianName: string) => {
    if (!guardianName.trim()) {
      triggerToast("Por favor, informe seu nome de responsável.");
      return;
    }
    const signatureText = `Assinado eletronicamente por ${guardianName} em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`;
    const updated = {
      ...signedReports,
      [report.id]: signatureText
    };
    setSignedReports(updated);
    try {
      localStorage.setItem(`signed_reports_${student.name}`, JSON.stringify(updated));
    } catch (e) {}

    // Call database synchronizer
    if (onSignReport) {
      onSignReport(report.id, guardianName, signatureText).catch(err => {
        console.error("Database signature sync error:", err);
      });
    }
    
    // Log signature
    try {
      fetch("/api/activity/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorName: `Resp. ${guardianName} (Aluno: ${student.name})`,
          actorEmail: "portal_familia@cps.local",
          actionType: "sign_report",
          description: `O responsável da família assinou como CIENTE o relatório de desempenho da disciplina '${report.subject}' (${report.bimester}). Assinatura: ${signatureText}`,
        }),
      });
    } catch (e) {}

    triggerToast("Ciente digital coletado e homologado para a coordenação!");
  };

  // Memoized lists and averages
  const availableClassSubjectsAndProfessors = useMemo(() => {
    const list: { id: string; subject: string; professorName: string }[] = [];
    let cachedProfs: any[] = [];
    try {
      const stored = localStorage.getItem("cps_cached_professors");
      if (stored) cachedProfs = JSON.parse(stored);
    } catch (e) {}

    if (cachedProfs && cachedProfs.length > 0) {
      cachedProfs.forEach((p: any) => {
        const teachesClass = p.assigned_classes && p.assigned_classes.includes(student.classId);
        if (teachesClass) {
          const subjects = p.assigned_subjects || [];
          subjects.forEach((sub: string) => {
            list.push({
              id: p.id || p.uid || String(Math.random()),
              subject: sub,
              professorName: p.professional_name || p.name || "Professor"
            });
          });
        }
      });
    }

    const schoolSubjects = schoolInfo?.subjects || ["Língua Portuguesa", "Matemática", "Ciências", "História", "Geografia", "Artes", "Língua Inglesa"];
    schoolSubjects.forEach((sub: string) => {
      if (sub.toLowerCase() === 'coordenação' || sub.toLowerCase() === 'coordenacao') return;
      if (!list.some(p => p.subject === sub)) {
        list.push({
          id: `mock-${sub}`,
          subject: sub,
          professorName: "" // Indicates no professor assigned yet
        });
      }
    });
    return list;
  }, [student.classId, schoolInfo]);

  const studentGrades = useMemo(() => {
    const studentResults = (results || []).filter((r: any) => 
      r.studentName?.toLowerCase() === student.name?.toLowerCase()
    );
    const validGrades = studentResults.map((res: any) => {
      const examInfo = (exams || []).find((e: any) => e.id === res.examId);
      return {
        id: res.id,
        examId: res.examId,
        score: res.score,
        maxScore: res.maxScore || 10,
        feedback: res.feedback || '',
        subject: examInfo?.subject || 'Simulado Geral',
        title: examInfo?.title || 'Avaliação Bimestral',
        bimester: res.bimester || examInfo?.bimester || '1º Bimestre',
        date: res.correctedAt || examInfo?.examDate || new Date().toISOString()
      };
    });

    // Only show grades if the teacher has delivered the diary report for that subject and bimester and it is approved
    return validGrades.filter(g => {
      return (studentReports || []).some((r: any) => 
        r.studentName?.toLowerCase() === student.name?.toLowerCase() &&
        r.bimester === g.bimester &&
        r.subject === g.subject &&
        r.familyPortalStatus === 'Aprovado'
      );
    });
  }, [results, exams, student.name, studentReports]);

  useEffect(() => {
    if (currentTab === 'relatorios') {
      const viewKey = `view_report_${student.name}_${selectedBimester}`;
      if (!loggedViews.has(viewKey) && (studentReports || []).length > 0) {
        setLoggedViews(prev => new Set(prev).add(viewKey));
        // Log that the family viewed the reports section for this bimester
        try {
          fetch("/api/activity/log", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              actorName: `Responsável do Aluno(a) ${student.name}`,
              actorEmail: "portal_familia@cps.local",
              actionType: "view_reports",
              description: `O responsável do aluno(a) '${student.name}' visualizou os Relatórios de Desempenho e Histórico do ${selectedBimester} no Portal da Família.`,
            }),
          });
        } catch (e) {}
      }
    } else if (currentTab === 'notas') {
      const viewKey = `view_notas_${student.name}_${selectedBimester}`;
      if (!loggedViews.has(viewKey) && studentGrades.length > 0) {
        setLoggedViews(prev => new Set(prev).add(viewKey));
        // Log that the family viewed the notes section
        try {
          fetch("/api/activity/log", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              actorName: `Responsável do Aluno(a) ${student.name}`,
              actorEmail: "portal_familia@cps.local",
              actionType: "view_grades",
              description: `O responsável do aluno(a) '${student.name}' acessou o Boletim e Notas do ${selectedBimester} no Portal da Família.`,
            }),
          });
        } catch (e) {}
      }
    }
  }, [currentTab, selectedBimester, student.name, loggedViews, studentReports, studentGrades.length]);

  const subjectAverages = useMemo(() => {
    const grades = studentGrades.filter(g => g.bimester === selectedBimester);
    const groups: Record<string, { total: number; count: number; list: any[] }> = {};
    grades.forEach((g) => {
      const sub = g.subject;
      if (!groups[sub]) {
        groups[sub] = { total: 0, count: 0, list: [] };
      }
      const score10 = (g.score / g.maxScore) * 10;
      groups[sub].total += score10;
      groups[sub].count += 1;
      groups[sub].list.push(g);
    });

    const calculated = Object.keys(groups).map((sub) => ({
      subject: sub,
      average: Math.round((groups[sub].total / groups[sub].count) * 10) / 10,
      count: groups[sub].count,
      grades: groups[sub].list
    }));

    if (calculated.length === 0) {
      return [];
    }
    return calculated;
  }, [studentGrades, selectedBimester]);

  const overallGpa = useMemo(() => {
    if (subjectAverages.length === 0) return 0;
    const total = subjectAverages.reduce((acc, current) => acc + current.average, 0);
    return Math.round((total / subjectAverages.length) * 10) / 10;
  }, [subjectAverages]);

  const attendancePercent = useMemo(() => {
    if (!attendanceRecords || attendanceRecords.length === 0) {
      return "98%";
    }
    const studentRecords = attendanceRecords.filter((r: any) => 
      r.student_name?.toLowerCase() === student.name?.toLowerCase()
    );
    if (studentRecords.length === 0) {
      return "98%";
    }
    const presents = studentRecords.filter((r: any) => r.status === 'present').length;
    const total = studentRecords.length;
    if (total === 0) return "98%";
    return `${Math.round((presents / total) * 100)}%`;
  }, [attendanceRecords, student.name]);

  const filteredReportsList = useMemo(() => {
    return (studentReports || []).filter((r: any) => 
      r.studentName?.toLowerCase() === student.name?.toLowerCase() &&
      r.familyPortalStatus === 'Aprovado'
    );
  }, [studentReports, student.name]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageProvider.trim()) return;
    setMessageStatus('sending');

    let displaySubject = 'Atendimento';
    let receiversNames: string[] = [];
    let targetDiscipline = '';
    let targetProfessorId = '';

    if (messageSubject === 'coord_responsavel') {
      displaySubject = `Coordenação Pedagógica`;
      receiversNames = [`Coordenação do ${student.classId}`, "Coordenação"];
    } else if (messageSubject === 'secretaria') {
      displaySubject = 'Secretaria Principal';
      receiversNames = ["Secretaria"];
    } else if (messageSubject.startsWith('teacher_subject:')) {
      const parts = messageSubject.split(':');
      const profId = parts[1];
      const subName = parts[2] || '';
      const profName = parts[3] || 'Professor';
      displaySubject = `Falar com ${profName} (${subName})`;
      receiversNames = [profName, "Professor(a)"];
      targetDiscipline = subName;
      targetProfessorId = profId;
    }

    const newFamilyMsg = {
      id: Date.now().toString(),
      senderName: `Família de ${student.name}`,
      receiversNames: receiversNames,
      recipientType: 'all',
      subject: displaySubject,
      body: messageProvider,
      date: new Date().toISOString(),
      read: false,
      folder: "enviado",
      attachments: composeAttachments,
      status: "approved",
      replies: [],
      isFromFamily: true,
      familySubject: displaySubject,
      familyDiscipline: targetDiscipline,
      professor_id: targetProfessorId,
      studentName: student.name,
      studentClass: student.classId
    };

    fetch("/api/agenda/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: newFamilyMsg })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        const displayedMsg = {
          ...newFamilyMsg,
          content: newFamilyMsg.body,
          status: 'Recebida'
        };
        const displayedMessages = [displayedMsg, ...messages];
        setMessages(displayedMessages);
        setMessageStatus('success');
        setMessageProvider('');
        setComposeAttachments([]);
        triggerToast("Sua mensagem foi enviada ao colégio!");
        setTimeout(() => { setMessageStatus('idle'); setIsComposing(false); }, 1000);

        // Backup to localStorage
        try {
          const stored = localStorage.getItem("cps_agenda_messages");
          const current: any[] = stored ? JSON.parse(stored) : [];
          current.unshift(newFamilyMsg);
          localStorage.setItem("cps_agenda_messages", JSON.stringify(current));
        } catch (e) {}
      } else {
        throw new Error("Failed to save on server");
      }
    })
    .catch(err => {
      console.error(err);
      triggerToast("Erro ao enviar mensagem.");
      setMessageStatus('idle');
    });
  };

  const handleReplyMessage = () => {
    if ((!replyBody.trim() && replyAttachments.length === 0) || !selectedMessage) return;
    
    const senderName = session.student?.guardianName 
      ? session.student.guardianName 
      : session.student?.name 
        ? `Responsável p/ ${session.student.name.split(" ")[0]}`
        : "Responsável";

    const newReply = { 
      id: Date.now().toString(), 
      senderName: senderName, 
      body: replyBody, 
      date: new Date().toISOString(),
      attachments: replyAttachments,
      isFromFamily: true
    };

    const updatedMessage = {
      ...selectedMessage,
      replies: [...(selectedMessage.replies || []), newReply],
      status: 'Respondida',
      read: false,
      body: selectedMessage.content || selectedMessage.body
    };

    fetch("/api/agenda/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: updatedMessage })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        // Notificar o professor
        fetch('/api/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `Nova resposta na Agenda`,
            body: `${senderName} respondeu a "${selectedMessage.subject}"`
          })
        }).catch(err => console.error('Push notify error:', err));

        const updatedMessages = messages.map(m => 
          m.id === selectedMessage.id ? updatedMessage : m
        );
        setMessages(updatedMessages);
        setReplyBody("");
        setReplyAttachments([]);
        setSelectedMessage(updatedMessage);
        triggerToast("Sua resposta foi anexada ao chat!");

        // Backup to localStorage
        try {
          const stored = localStorage.getItem("cps_agenda_messages");
          if (stored) {
            const parsed = JSON.parse(stored) as any[];
            const updatedStored = parsed.map((m: any) => {
              if (m.id === selectedMessage.id) {
                return {
                  ...m,
                  replies: [...(m.replies || []), newReply],
                  status: 'Respondida',
                  read: false
                };
              }
              return m;
            });
            localStorage.setItem("cps_agenda_messages", JSON.stringify(updatedStored));
          }
        } catch (e) {}
      } else {
        throw new Error("Failed to reply on server");
      }
    })
    .catch(err => {
      console.error(err);
      triggerToast("Erro ao enviar resposta.");
    });
  };

  const handleSignMessage = (messageId: string, guardianName: string) => {
    if (!guardianName.trim()) return;
    
    const signatureText = `Assinado eletronicamente por ${guardianName} em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`;
    
    try {
      fetch("/api/activity/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorName: `Resp. ${guardianName} (Aluno: ${student.name})`,
          actorEmail: "portal_familia@cps.local",
          actionType: "sign_message",
          description: `O responsável assinou como CIENTE o comunicado da agenda escolar. Assinatura: ${signatureText}`,
        }),
      });
    } catch (e) {}
    
    const targetMsg = messages.find(m => m.id === messageId);
    if (!targetMsg) return;

    const signatures = Array.isArray(targetMsg.signatures) ? [...targetMsg.signatures] : [];
    signatures.push({
      guardianName,
      studentName: student.name,
      date: new Date().toISOString()
    });

    const updatedMessage = {
      ...targetMsg,
      signatures,
      read: true,
      familyRead: true,
      body: targetMsg.content || targetMsg.body
    };

    fetch("/api/agenda/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: updatedMessage })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        const updatedMessages = messages.map(m => m.id === messageId ? updatedMessage : m);
        setMessages(updatedMessages);
        if (selectedMessage && selectedMessage.id === messageId) {
          setSelectedMessage(updatedMessage);
        }
        triggerToast("Ciente digital registrado com sucesso!");

        // Backup to localStorage
        try {
          const stored = localStorage.getItem("cps_agenda_messages");
          if (stored) {
            const parsed = JSON.parse(stored);
            const updatedStored = parsed.map((m: any) => {
              if (m.id === messageId) {
                return {
                  ...m,
                  signatures,
                  read: true,
                  familyRead: true
                };
              }
              return m;
            });
            localStorage.setItem("cps_agenda_messages", JSON.stringify(updatedStored));
          }
        } catch (e) {}
      } else {
        throw new Error("Failed to sign on server");
      }
    })
    .catch(err => {
      console.error(err);
      triggerToast("Erro ao registrar ciente.");
    });
  };

  const filteredMessages = useMemo(() => {
    return messages.filter(m => {
      const text = (m.subject || '').toLowerCase() + ' ' + (m.content || m.body || '').toLowerCase() + ' ' + (m.senderName || '').toLowerCase();
      if (!text.includes(messageSearch.toLowerCase())) return false;
      if (messageFilter === 'unread') {
        return !m.isFromFamily && (!m.read || m.familyRead === false);
      }
      if (messageFilter === 'sent') {
        return !!m.isFromFamily;
      }
      return true;
    });
  }, [messages, messageSearch, messageFilter]);

  const handleDownloadMatriculaDoc = (filename: string, fileTitle: string) => {
    triggerToast(`Fazendo download de: ${fileTitle}...`);
    setTimeout(() => {
      const element = document.createElement("a");
      const file = new Blob([
        `============================================================\n` +
        `                 COLÉGIO PROGRESSO CAMPINAS                 \n` +
        `                     SECRETARIA DIGITAL                     \n` +
        `============================================================\n\n` +
        `Declaramos, para os devidos fins legais de comprovação, que:\n` +
        `ALUNO(A): ${student.name.toUpperCase()}\n` +
        `CÓDIGO DE MATRÍCULA (RM): ${student.registrationNumber || "2026.4912"}\n` +
        `SÉRIE/TURMA: ${student.classId}\n` +
        `SITUAÇÃO: Regularmente matriculado, frequente e ativo em 2026.\n\n` +
        `Código de Verificação Acadêmica Digital: KPS-${Math.random().toString(36).substring(2, 10).toUpperCase()}\n` +
        `Emitido eletronicamente em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}\n`
      ], { type: 'text/plain' });
      
      element.href = URL.createObjectURL(file);
      element.download = filename;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }, 1000);
  };

  return (
    <div className="bg-[#f8fafc] w-full h-full flex flex-col overflow-y-auto overflow-x-hidden font-sans text-slate-700 dark:text-slate-200">
      
      {/* Toast Alert Banner */}
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 border border-slate-200 dark:border-slate-800 text-white px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 max-w-sm"
          >
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs font-semibold leading-none">{showToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* COMPACT & GORGEOUS HEADER */}
      <header className="sticky top-0 z-45 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 shadow-sm flex-shrink-0">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-xl flex items-center justify-center shadow-md border border-slate-200 dark:border-slate-800">
              <img src={LOGO_VINHO} alt="Logo" className="w-6 h-6 object-contain" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-1">
                COLÉGIO PROGRESSO
                <span className="text-[8px] bg-indigo-50 text-indigo-700 font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                  FAMÍLIA
                </span>
              </h1>
              <p className="text-[9px] text-slate-700 dark:text-slate-300 font-medium tracking-wide">
                Portal do Responsável e Aluno
              </p>
            </div>
          </div>

          {/* Segmented Toggle for Aluno vs Responsável */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner select-none font-sans shrink-0 items-center mr-2 sm:mr-4">
            <button
              onClick={() => {
                if (portalRole === 'responsavel') {
                  setPortalRole('aluno');
                  triggerToast("Perfil alterado para Aluno.");
                }
              }}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center gap-1 cursor-pointer",
                portalRole === 'aluno'
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-650 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-205"
              )}
            >
              <User className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Aluno</span>
            </button>
            <button
              onClick={() => {
                if (portalRole === 'aluno') {
                  setShowPinModal(true);
                  setPinInput('');
                  setPinError(false);
                }
              }}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center gap-1 cursor-pointer",
                portalRole === 'responsavel'
                  ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                  : "text-slate-650 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-205"
              )}
            >
              <UserCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Responsável</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden xs:block">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">{student.name.split(' ').slice(0, 2).join(' ')}</p>
              <p className="text-[9px] text-slate-700 dark:text-slate-300 font-mono">RM: {student.registrationNumber || "2026.4912"} • {student.classId}</p>
            </div>
            <button 
              onClick={onLogout}
              className="p-2 sm:px-3 sm:py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors text-xs font-bold flex items-center gap-1 pointer-events-auto"
              title="Sair do Portal"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>

        </div>
      </header>

      {/* SCROLLABLE INNER VIEWPORT */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-5 space-y-5">

        {/* COMPACT WELCOME & HIGHLIGHT CARD */}
        <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-50/40 rounded-full blur-2xl pointer-events-none -mr-8 -mt-8"></div>
          
          <div className="space-y-1 z-10 max-w-xl">
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">
              Família de <span className="text-indigo-600">{student.name.split(' ')[0]}</span>
            </h2>
            <p className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">
              Acompanhe o boletim, assine o relatório mensal e converse com a escola sem complicação e com poucos toques.
            </p>
          </div>

          <div className="flex bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl gap-3 w-full sm:w-auto text-xs shrink-0 select-none">
            <div>
              <span className="block text-[8px] uppercase text-slate-700 dark:text-slate-300 font-bold">Frequência</span>
              <span className="text-base font-black text-slate-800 dark:text-slate-100">{attendancePercent}</span>
            </div>
            <div className="w-[1.5px] bg-slate-200"></div>
            <div>
              <span className="block text-[8px] uppercase text-slate-700 dark:text-slate-300 font-bold">Média Global</span>
              <span className="text-base font-black text-slate-800 dark:text-slate-100">{overallGpa > 0 ? overallGpa.toFixed(1) : '-'}</span>
            </div>
            <div className="w-[1.5px] bg-slate-200"></div>
            <div>
              <span className="block text-[8px] uppercase text-slate-700 dark:text-slate-300 font-bold">Turma</span>
              <span className="text-base font-black text-slate-800 dark:text-slate-100">{student.classId}</span>
            </div>
          </div>
        </div>

        {/* 8 PILL TAB NAVIGATION (optimized click touch-target, responsive scrollable) */}
        <div className="flex bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner w-full overflow-x-auto no-scrollbar gap-1 select-none">
          {[
            { id: 'painel', label: 'Painel', icon: LayoutDashboard },
            { id: 'notas', label: 'Boletim', icon: Award },
            { id: 'relatorios', label: 'Relatórios', icon: FileText },
            { id: 'secretaria', label: 'Secretaria', icon: School },
            { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
            { id: 'capas', label: 'Capas', icon: BookOpen },
            { id: 'mensagens', label: 'Fale c/ Escola', icon: MessageSquare, badge: messages.filter((m: any) => !m.isFromFamily && (!m.read || m.familyRead === false)).length > 0 },
            { id: 'ajustes', label: 'Ajustes', icon: Settings },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id as any)}
                className={cn(
                  "flex-1 min-w-[100px] sm:min-w-[120px] py-2 px-3 text-center rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 whitespace-nowrap relative shrink-0",
                  isActive ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-indigo-900 shadow-sm ring-1 ring-slate-200" : "text-slate-700 dark:text-slate-300 hover:text-slate-800 dark:text-slate-100 hover:bg-slate-200/50"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full inline-block absolute top-1 right-2 animate-ping"></span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB CORE VIEWPORT */}
        <div className="mt-2 min-h-[400px]">
          <AnimatePresence mode="wait">
            {currentTab === 'painel' && (
              <DashboardTab
                student={student}
                overallGpa={overallGpa}
                subjectAverages={subjectAverages}
                messages={messages}
                onNavigate={(view) => setCurrentTab(view)}
                filteredReportsCount={filteredReportsList.length}
                attendancePercent={attendancePercent}
              />
            )}

            {currentTab === 'notas' && (
              <GradesTab
                selectedBimester={selectedBimester}
                setSelectedBimester={setSelectedBimester}
                subjectAverages={subjectAverages}
                studentGrades={studentGrades}
                onNavigate={(view) => setCurrentTab(view)}
              />
            )}

            {currentTab === 'relatorios' && (
              <ReportsTab
                filteredReportsList={filteredReportsList}
                signedReports={mergedSignedReports}
                onSignReport={handleSignReport}
                portalRole={portalRole}
              />
            )}

            {currentTab === 'secretaria' && (
              <SecretariaTab
                student={student}
                activeSecretariaTab={activeSecretariaTab}
                setActiveSecretariaTab={setActiveSecretariaTab}
                selectedDocType={selectedDocType}
                setSelectedDocType={setSelectedDocType}
                docMotive={docMotive}
                setDocMotive={setDocMotive}
                onCreateDocRequest={handleCreateDocRequest}
                docRequests={docRequests}
                onTriggerDownload={handleDownloadMatriculaDoc}
              />
            )}

            {currentTab === 'financeiro' && (
              portalRole === 'aluno' ? (
                <div className="bg-white dark:bg-slate-900 text-slate-905 dark:text-slate-100 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm text-center max-w-md mx-auto my-12 space-y-6">
                  <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-2xl flex items-center justify-center mx-auto border border-rose-200/50 dark:border-rose-900/30">
                    <Lock className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">Acesso Restrito</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      A aba Financeiro contém informações confidenciais de mensalidades e boletos. Para acessar, alterne para o <strong>Modo Responsável</strong> no cabeçalho do portal e insira o PIN de segurança familiar.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowPinModal(true);
                      setPinInput('');
                      setPinError(false);
                    }}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    Autenticar como Responsável
                  </button>
                </div>
              ) : (
                <FinancialTab
                  onCopyCode={handleCopyPixCode}
                  onDownloadPdf={handleDownloadPdf}
                />
              )
            )}

            {currentTab === 'capas' && (
              <WorkCoverTab
                student={student}
                coverTitle={coverTitle}
                setCoverTitle={setCoverTitle}
                coverSubtitle={coverSubtitle}
                setCoverSubtitle={setCoverSubtitle}
                coverSubject={coverSubject}
                setCoverSubject={setCoverSubject}
                coverTeacher={coverTeacher}
                setCoverTeacher={setCoverTeacher}
                coverDateText={coverDateText}
                setCoverDateText={setCoverDateText}
                coverAlignment={coverAlignment}
                setCoverAlignment={setCoverAlignment}
                availableClassSubjectsAndProfessors={availableClassSubjectsAndProfessors}
              />
            )}

            {currentTab === 'mensagens' && (
              <MessagesTab
                student={student}
                messages={messages}
                isComposing={isComposing}
                setIsComposing={setIsComposing}
                selectedMessage={selectedMessage}
                setSelectedMessage={handleSelectMessage}
                messageSearch={messageSearch}
                setMessageSearch={setMessageSearch}
                messageFilter={messageFilter}
                setMessageFilter={setMessageFilter}
                filteredMessages={filteredMessages}
                messageSubject={messageSubject}
                setMessageSubject={setMessageSubject}
                messageProvider={messageProvider}
                setMessageProvider={setMessageProvider}
                messageStatus={messageStatus}
                onSendMessage={handleSendMessage}
                availableClassSubjectsAndProfessors={availableClassSubjectsAndProfessors}
                replyBody={replyBody}
                setReplyBody={setReplyBody}
                onSendReply={handleReplyMessage}
                onSignMessage={handleSignMessage}
                portalRole={portalRole}
                composeAttachments={composeAttachments}
                setComposeAttachments={setComposeAttachments}
                replyAttachments={replyAttachments}
                setReplyAttachments={setReplyAttachments}
                setPreviewImage={setPreviewImage}
              />
            )}

            {currentTab === 'ajustes' && (
              <SettingsTab
                student={student}
                guardianPin={guardianPin}
                onChangePin={handleChangePin}
              />
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Full Screen Image Preview Overlay */}
      <AnimatePresence>
        {previewImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 cursor-zoom-out" 
            onClick={() => setPreviewImage(null)}
          >
            <button 
              className="absolute top-4 right-4 text-white hover:text-indigo-400 p-2 bg-black/40 rounded-full transition-colors cursor-pointer"
              onClick={(e) => { e.stopPropagation(); setPreviewImage(null); }}
            >
              <X className="w-8 h-8" />
            </button>
            <motion.img 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              src={previewImage} 
              alt="Preview ampliado" 
              className="max-w-full max-h-full object-contain drop-shadow-2xl rounded-lg cursor-default" 
              onClick={(e) => e.stopPropagation()} 
            />
          </motion.div>
        )}

        {/* Unread Messages Modal */}
        {showUnreadModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-default"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-1.5 bg-indigo-500"></div>
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-6 border border-indigo-200/50 dark:border-indigo-800/50">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-2 tracking-tight">Novas Mensagens!</h3>
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-8">
                  Você tem <span className="text-indigo-600 dark:text-indigo-400">{initialUnreadCount}</span> nova(s) mensagem(ns) aguardando na sua Agenda Eletrônica.
                </p>
                <button
                  onClick={() => {
                    setShowUnreadModal(false);
                    setCurrentTab('mensagens');
                  }}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm uppercase tracking-widest rounded-xl transition-all shadow-md hover:shadow-xl active:scale-95 cursor-pointer"
                >
                  Abrir Agenda
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* PIN Security Modal */}
        {showPinModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden text-center"
            >
              <div className="absolute top-0 inset-x-0 h-1.5 bg-indigo-500"></div>
              <button 
                onClick={() => setShowPinModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100 dark:border-indigo-850">
                <Lock className="w-6 h-6" />
              </div>
              
              <h3 className="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight mb-1">
                PIN de Segurança Familiar
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                Digite seu PIN de 4 dígitos para acessar o perfil de Responsável.
              </p>
              
              <div className="space-y-4">
                <input
                  type="password"
                  maxLength={4}
                  value={pinInput}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setPinInput(val);
                    setPinError(false);
                    if (val.length === 4) {
                      if (val === guardianPin) {
                        setPortalRole('responsavel');
                        setShowPinModal(false);
                        triggerToast("Acesso ao Perfil de Responsável liberado!");
                      } else {
                        setPinError(true);
                        setPinInput('');
                        triggerToast("PIN incorreto. Tente novamente.");
                      }
                    }
                  }}
                  placeholder="••••"
                  className={cn(
                    "text-center text-3xl tracking-[1.5em] pl-[1.5em] py-3 bg-slate-50 dark:bg-slate-950 border rounded-2xl w-44 mx-auto block focus:outline-none font-bold",
                    pinError 
                      ? "border-rose-500 text-rose-500 ring-rose-250 ring-2" 
                      : "border-slate-200 dark:border-slate-800 focus:border-indigo-500 text-slate-800 dark:text-white"
                  )}
                  autoFocus
                />
                
                {pinError && (
                  <p className="text-[10px] text-rose-500 font-bold">PIN inválido. O padrão é 1234.</p>
                )}
                
                <p className="text-[10px] text-slate-500 dark:text-slate-500">
                  Dica: Se não alterou, o PIN padrão é <strong>1234</strong>. Pode ser configurado na aba Ajustes.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
