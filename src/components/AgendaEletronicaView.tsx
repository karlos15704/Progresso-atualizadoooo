import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Inbox,
  Send,
  Archive,
  Trash2,
  Tag,
  Paperclip,
  MoreVertical,
  Search,
  Check,
  CheckCheck,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Users,
  Edit3,
  MessageCircle,
  X,
  Bell,
  BellRing,
  ShieldCheck,
  Plus,
  ArrowLeft,
  MessageSquare,
  Clock,
  Sparkles,
  Loader2,
  BookOpen,
  AlertTriangle,
  DollarSign,
  Calendar
} from "lucide-react";
import { cn } from "../lib/utils";
import { AuthUser as User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { registerServiceWorker, requestNotificationPermission } from "../lib/notifications";
import { getFilteredClasses } from "../utils/classUtils";

const ANNOUNCEMENT_TEMPLATES = [
  {
    name: "— Selecionar Modelo de Mensagem —",
    category: "circular",
    subject: "",
    body: "",
    requiresSignature: false
  },
  {
    name: "Dever de Casa Pendente",
    category: "academic",
    subject: "Dever de Casa Não Entregue",
    body: "Prezados pais e responsáveis,\n\nInformamos que o(a) aluno(a) não entregou a tarefa de casa solicitada para o dia de hoje na disciplina de [Disciplina].\n\nSolicitamos o acompanhamento na realização das atividades para evitar prejuízo no aprendizado.\n\nAtenciosamente,\n[Nome do Professor]",
    requiresSignature: true
  },
  {
    name: "Ocorrência de Comportamento",
    category: "behavior",
    subject: "Notificação de Comportamento / Indisciplina",
    body: "Prezados pais e responsáveis,\n\nGostaríamos de conversar sobre o comportamento do(a) aluno(a) na data de hoje. Ocorreu um episódio de dispersão/indisciplina durante as atividades escolares.\n\nPedimos que conversem com o(a) estudante para reforçar as regras de convivência do colégio.\n\nAtenciosamente,\nCoordenação Pedagógica",
    requiresSignature: true
  },
  {
    name: "Convocação para Reunião",
    category: "circular",
    subject: "Convocação para Reunião de Pais e Mestres",
    body: "Prezados pais e responsáveis,\n\nConvidamos a todos para a nossa Reunião de Pais e Mestres referente ao bimestre letivo.\n\nData: [Data]\nHorário: [Horário]\nLocal: [Local]\n\nSua presença é fundamental para o alinhamento pedagógico do(a) aluno(a).\n\nAtenciosamente,\nEquipe de Coordenação",
    requiresSignature: true
  },
  {
    name: "Autorização para Passeio / Saída",
    category: "event",
    subject: "Autorização de Saída Pedagógica",
    body: "Prezados pais e responsáveis,\n\nNo dia [Data] realizaremos uma saída pedagógica / passeio cultural com destino a [Destino].\n\nValor: R$ [Valor]\nHorário de Saída: [Saída]\nRetorno Previsto: [Retorno]\n\nSolicitamos a assinatura eletrônica deste termo para autorizar a participação do(a) aluno(a).\n\nAtenciosamente,\nDireção Escolar",
    requiresSignature: true
  },
  {
    name: "Elogio e Desempenho",
    category: "academic",
    subject: "Parabéns pelo Excelente Desempenho Escolar!",
    body: "Prezada família,\n\nÉ com grande satisfação que compartilhamos que o(a) aluno(a) demonstrou excelente empenho, dedicação e ótimo rendimento nas últimas semanas nas atividades escolares.\n\nParabéns pelo sucesso e dedicação! Continuem apoiando esta jornada de estudos.\n\nAtenciosamente,\nEquipe Escolar",
    requiresSignature: false
  }
];

export function AgendaEletronicaView({
  user,
  schoolInfo,
  userProfile,
  professors = [],
}: {
  user: User;
  schoolInfo: any;
  userProfile: any;
  professors?: any[];
}) {
  const [activeFolder, setActiveFolder] = useState("recebido");
  const [composeOpen, setComposeOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [notificationStatus, setNotificationStatus] = useState<PermissionState | 'unsupported'>('prompt');

  useEffect(() => {
    if (!('Notification' in window)) {
      setNotificationStatus('unsupported');
    } else {
      setNotificationStatus(Notification.permission);
    }
    registerServiceWorker();
  }, []);

  const handleEnableNotifications = async () => {
    const permission = await requestNotificationPermission();
    setNotificationStatus(permission);
    if (permission === 'granted') {
       const registration = await registerServiceWorker();
       if (registration) {
         const publicVapidKey = "BBIRjtfRMYIYh6BcB9kfp26uOYvbEX4ecWP50-mbb0grmGNdIR8L_k1I-pMdjBBocxOaFQRnJYAMUIEdwA-7Z6M";
         try {
           const subscription = await registration.pushManager.subscribe({
             userVisibleOnly: true,
             applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
           });
           
           await fetch('/api/push/subscribe', {
             method: 'POST',
             body: JSON.stringify(subscription),
             headers: {
               'content-type': 'application/json'
             }
           });
           console.log('Notificações autorizadas e inscritas.');
         } catch (err) {
           console.error('Erro ao subscrever push:', err);
         }
       }
    }
  };

  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');
  
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
  
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  const [recipientModalOpen, setRecipientModalOpen] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const rolesArr = (userProfile?.role || "").split(",").map((r: string) => r.trim());
  const isAdmin = rolesArr.some((r: string) =>
    [
      "admin",
      "vice_diretor",
      "coordenador_fund1",
      "coordenador_fund2",
      "coordenador_all",
      "secretaria_fund1",
      "secretaria_fund2",
      "secretaria_all",
    ].includes(r)
  );

  // Compute Students Data
  const allStudents = useMemo(() => {
    if (!schoolInfo?.studentsDB) return [];
    return Object.values(schoolInfo.studentsDB).flat() as any[];
  }, [schoolInfo]);

  const classesWithStudents = useMemo(() => {
    const groupings: Record<string, any[]> = {};
    allStudents.forEach((s) => {
      if (!groupings[s.classId]) groupings[s.classId] = [];
      groupings[s.classId].push(s);
    });
    return groupings;
  }, [allStudents]);

  const allClasses = useMemo(() => {
    const combined = Array.from(new Set([
      ...(schoolInfo?.classes || []),
      ...Object.keys(classesWithStudents)
    ]));
    return getFilteredClasses(userProfile, combined);
  }, [schoolInfo?.classes, classesWithStudents, userProfile]);

  const infantilClasses = allClasses.filter(
    (c: string) =>
      schoolInfo?.classModalities?.[c] === "infantil" ||
      (!schoolInfo?.classModalities?.[c] && (
        c.toLowerCase().includes("maternal") ||
        c.toLowerCase().includes("jardim") ||
        c.toLowerCase().includes("pré") ||
        c.toLowerCase().includes("infantil")
      )),
  );

  const fund1Classes = allClasses.filter(
    (c: string) =>
      schoolInfo?.classModalities?.[c] === "fund1" ||
      (!schoolInfo?.classModalities?.[c] && (
        !infantilClasses.includes(c) &&
        (/^[1-5]/g.test(c) ||
          c.toLowerCase().includes("1º") ||
          c.toLowerCase().includes("2º") ||
          c.toLowerCase().includes("3º") ||
          c.toLowerCase().includes("4º") ||
          c.toLowerCase().includes("5º"))
      )),
  );

  const fund2Classes = allClasses.filter(
    (c: string) =>
      schoolInfo?.classModalities?.[c] === "fund2" ||
      (!schoolInfo?.classModalities?.[c] && (
        !infantilClasses.includes(c) &&
        (/^[6-9]/g.test(c) ||
          c.toLowerCase().includes("6º") ||
          c.toLowerCase().includes("7º") ||
          c.toLowerCase().includes("8º") ||
          c.toLowerCase().includes("9º"))
      )),
  );

  const otherClasses = allClasses.filter(
    (c: string) =>
      !infantilClasses.includes(c) &&
      !fund1Classes.includes(c) &&
      !fund2Classes.includes(c),
  );

  const renderClassNode = (classId: string) => {
    const studentsInClass = classesWithStudents[classId] || [];
    const isExpanded = expandedGroups.includes(classId);
    const classSelected = isSelected(classId);

    return (
      <div key={classId} className="flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 dark:hover:bg-slate-800/50 transition-colors group">
          <div
            className="flex items-center cursor-pointer flex-1"
            onClick={() =>
              toggleSelection(
                classId,
                studentsInClass.map((s) => s.id || s.name),
              )
            }
          >
            <div className="w-5 h-5 rounded-full border-2 border-slate-200 dark:border-slate-800 flex items-center justify-center shrink-0 mr-4">
              {classSelected && (
                <div className="w-3 h-3 rounded-full bg-slate-400 dark:bg-slate-900 text-slate-800 dark:text-slate-2000" />
              )}
            </div>
            <span className="text-slate-700 dark:text-slate-200 text-[15px] font-medium">
              {classId}
            </span>
          </div>
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => toggleGroupExpand(classId)}
          >
            <span className="text-slate-700 dark:text-slate-300 text-xs flex items-center gap-1 font-medium">
              <Users className="w-3 h-3" />{" "}
              {studentsInClass.length}
            </span>
            <svg
              className={`w-5 h-5 text-slate-600 dark:text-slate-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </div>

        {isExpanded && (
          <div className="flex flex-col bg-slate-50 dark:bg-slate-900/20 py-2">
            {studentsInClass.map((student) => {
              const identifier = student.id || student.name;
              return (
                <div
                  key={identifier}
                  className="flex items-center px-6 py-2.5 hover:bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                  onClick={() =>
                    toggleSelection(identifier)
                  }
                >
                  <div className="w-5 h-5 rounded-full border-2 border-slate-200 dark:border-slate-800 flex items-center justify-center shrink-0 mr-4">
                    {isSelected(identifier) && (
                      <div className="w-3 h-3 rounded-full bg-slate-400 dark:bg-slate-900 text-slate-800 dark:text-slate-2000" />
                    )}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-indigo-500 text-white font-bold flex items-center justify-center shrink-0 mr-4 text-sm uppercase">
                    {student.name.substring(0, 2)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-800 dark:text-slate-100 dark:text-white text-[15px]">
                      {student.name}
                    </span>
                    <span className="text-slate-600 dark:text-slate-400 text-xs mt-0.5">
                      {classId}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };


  const toggleSelection = (id: string, groupIds?: string[]) => {
    setSelectedIds((prev) => {
      let next = [...prev];
      if (next.includes(id)) {
        next = next.filter((x) => x !== id);
        if (groupIds) next = next.filter((x) => !groupIds.includes(x));
      } else {
        next.push(id);
        if (groupIds) next = [...new Set([...next, ...groupIds])];
      }
      return next;
    });
  };

  const isSelected = (id: string) => selectedIds.includes(id);

  const toggleGroupExpand = (groupId: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((x) => x !== groupId)
        : [...prev, groupId],
    );
  };

  // Compose States
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeAttachments, setComposeAttachments] = useState<any[]>([]);
  const [composeScheduledDate, setComposeScheduledDate] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [recipientType, setRecipientType] = useState<'all' | 'guardians' | 'student' | 'financial'>('all');
  const [composeCategory, setComposeCategory] = useState<'academic' | 'circular' | 'behavior' | 'event' | 'financial'>('circular');
  const [composeRequiresSignature, setComposeRequiresSignature] = useState(false);

  const [isImproving, setIsImproving] = useState(false);

  const getCategoryDetails = (category?: string) => {
    switch (category) {
      case 'academic':
        return { label: 'Acadêmico', color: 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40', icon: BookOpen };
      case 'behavior':
        return { label: 'Comportamento', color: 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40', icon: AlertTriangle };
      case 'financial':
        return { label: 'Financeiro', color: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40', icon: DollarSign };
      case 'event':
        return { label: 'Evento', color: 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/40', icon: Calendar };
      case 'circular':
      default:
        return { label: 'Comunicado', color: 'bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/40', icon: Bell };
    }
  };

  const handleImproveAnnouncement = async () => {
    if (!composeBody.trim()) {
      alert("Escreva alguma mensagem no corpo do texto antes de aprimorar com IA.");
      return;
    }
    setIsImproving(true);
    try {
      const response = await fetch("/api/ai/improve-announcement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: composeSubject,
          body: composeBody
        })
      });
      if (!response.ok) throw new Error("Erro na requisição de IA.");
      const data = await response.json();
      if (data.subject) setComposeSubject(data.subject);
      if (data.body) setComposeBody(data.body);
    } catch (err) {
      console.error("Erro ao aprimorar comunicados com IA:", err);
      alert("Houve um erro ao tentar aprimorar seu comunicado com Inteligência Artificial.");
    } finally {
      setIsImproving(false);
    }
  };

  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [replyAttachments, setReplyAttachments] = useState<any[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const replyFileInputRef = React.useRef<HTMLInputElement>(null);

  // Messages Mock
  const [messages, setMessages] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem("cps_agenda_messages");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (m: any) =>
              m.id !== "1" &&
              !m.body?.includes("Prezados pais e responsáveis, informamos que nossa reunião"),
          );
        }
      }
    } catch(e) {}
    return [];
  });

  const [showUnreadModal, setShowUnreadModal] = useState(false);
  const [initialUnreadCount, setInitialUnreadCount] = useState(0);

  React.useEffect(() => {
    // Only count unread messages that are from families to teachers (or generally "recebidos") and not read by teacher
    const unreadMessages = messages.filter(m => (m.folder === 'recebido' || m.isFromFamily || m.replies?.some((r: any) => r.senderName !== (userProfile?.professional_name || user.email?.split("@")[0]))) && !m.teacherRead);
    const count = unreadMessages.length;
    if (count > 0) {
      setInitialUnreadCount(count);
      setShowUnreadModal(true);
    }
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem("cps_agenda_messages", JSON.stringify(messages));
    } catch(err) { console.warn("Storage full"); }
  }, [messages]);

  const syncSaveMessage = (msg: any) => {
    fetch("/api/agenda/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg }),
    }).catch((err) => console.warn("Erro ao sincronizar comunicado no servidor:", err));
  };

  React.useEffect(() => {
    const fetchMessages = () => {
      fetch("/api/agenda/messages")
        .then((res) => res.json())
        .then((data) => {
          if (data && data.success && data.messages) {
            setMessages(data.messages);
          }
        })
        .catch((err) => console.warn("Erro ao carregar mensagens da agenda:", err));
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSend = () => {
    if (!composeSubject || !composeBody || selectedIds.length === 0) {
      alert("Preencha todos os campos e selecione os destinatários.");
      return;
    }

    if (editingMessageId) {
      const existing = messages.find(m => m.id === editingMessageId);
      if (existing) {
        const isContentChanged = 
          existing.subject !== composeSubject || 
          existing.body !== composeBody || 
          existing.category !== composeCategory ||
          existing.requiresSignature !== composeRequiresSignature ||
          JSON.stringify(existing.receiversNames) !== JSON.stringify(selectedIds) || 
          JSON.stringify(existing.attachments) !== JSON.stringify(composeAttachments);

        const updatedMessage = {
          ...existing,
          receiversNames: selectedIds,
          recipientType: recipientType,
          subject: composeSubject,
          body: composeBody,
          category: composeCategory,
          requiresSignature: composeRequiresSignature,
          date: composeScheduledDate || existing.date,
          attachments: composeAttachments,
          status: isAdmin && existing.status === 'pending' ? 'approved' : existing.status,
          ...(isContentChanged ? {
            lastEditedAt: new Date().toISOString(),
            editedBy: userProfile?.professional_name || user.email?.split("@")[0] || "Admin"
          } : {})
        };

        setMessages(prev => prev.map(m => m.id === editingMessageId ? updatedMessage : m));
        syncSaveMessage(updatedMessage);
      }
    } else {
      const newMessage = {
        id: Date.now().toString(),
        senderName: userProfile?.professional_name || user.email?.split("@")[0] || "Professor",
        receiversNames: selectedIds,
        recipientType: recipientType,
        subject: composeSubject,
        body: composeBody,
        category: composeCategory,
        requiresSignature: composeRequiresSignature,
        signatures: [],
        date: composeScheduledDate || new Date().toISOString(),
        read: true,
        folder: "enviado",
        attachments: composeAttachments,
        status: isAdmin ? "approved" : "pending",
        replies: []
      };
      
      setMessages(prev => [newMessage, ...prev]);
      syncSaveMessage(newMessage);
      
      fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Novo Comunicado: ${newMessage.subject}`,
          body: `De: ${newMessage.senderName}. Clique para abrir a agenda.`
        })
      }).catch(err => console.error('Push notify error:', err));
    }
    
    setComposeOpen(false);
    resetCompose();
  };

  const resetCompose = () => {
    setComposeSubject("");
    setComposeBody("");
    setComposeAttachments([]);
    setComposeScheduledDate("");
    setSelectedIds([]);
    setEditingMessageId(null);
    setRecipientType('all');
    setComposeCategory('circular');
    setComposeRequiresSignature(false);
  };

  const handleDeleteMessage = (id: string) => {
    const msg = messages.find(m => m.id === id);
    if (!msg) return;

    let confirmMsg = "Deseja mover esta mensagem para a lixeira?";
    let permanent = false;
    if (msg.folder === "lixeira") {
      confirmMsg = "Deseja excluir permanentemente esta mensagem? Esta ação não pode ser desfeita.";
      permanent = true;
    }
    
    if (!confirm(confirmMsg)) return;

    if (permanent) {
      fetch("/api/agenda/messages/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, permanent: true }),
      }).catch((err) => console.warn("Failed delete permanently:", err));
    } else {
      const updatedMsg = { ...msg, folder: "lixeira" };
      syncSaveMessage(updatedMsg);
    }

    const updatedMessages = messages.map(m => {
      if (m.id === id) {
        if (m.folder === "lixeira") {
          return null; // delete permanently
        }
        return { ...m, folder: "lixeira" };
      }
      return m;
    }).filter((m): m is any => m !== null);
    
    setMessages(updatedMessages);
    setSelectedMessage(null);
  };

  const openEdit = (msg: any) => {
    setEditingMessageId(msg.id);
    setComposeSubject(msg.subject);
    setComposeBody(msg.body);
    setComposeScheduledDate(msg.date);
    setSelectedIds(msg.receiversNames || []);
    setRecipientType(msg.recipientType || 'all');
    setComposeCategory(msg.category || 'circular');
    setComposeRequiresSignature(msg.requiresSignature || false);
    setComposeOpen(true);
  };

  const handleApproveSelectedMessage = () => {
    if (!selectedMessage) return;
    const updatedMsg = {
      ...selectedMessage,
      status: 'approved'
    };
    syncSaveMessage(updatedMsg);

    const updatedMessages = messages.map(m => {
      if (m.id === selectedMessage.id) {
        return updatedMsg;
      }
      return m;
    });
    setMessages(updatedMessages);
    setSelectedMessage(updatedMsg);
  };

  const handleReply = () => {
    if (!replyBody.trim() || !selectedMessage) return;

    const newReply = {
      id: Date.now().toString(),
      senderName: userProfile?.professional_name || user.email?.split("@")[0] || "Professor",
      body: replyBody.trim(),
      date: new Date().toISOString(),
      attachments: replyAttachments.map(f => ({ name: f.name, type: f.type, size: f.size, url: f.url })),
      status: isAdmin ? "approved" : "pending"
    };

    const updatedMsg = {
      ...selectedMessage,
      replies: [...(selectedMessage.replies || []), newReply],
      read: true,
      familyRead: false,
      status: isAdmin ? selectedMessage.status : "pending_reply"
    };
    syncSaveMessage(updatedMsg);

    const updatedMessages = messages.map(m => {
      if (m.id === selectedMessage.id) {
        return updatedMsg;
      }
      return m;
    });

    setMessages(updatedMessages);
    
    // Notificar o destinatário da resposta (Mock)
    fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Nova resposta de ${newReply.senderName}`,
        body: newReply.body.length > 50 ? newReply.body.substring(0, 47) + '...' : newReply.body
      })
    }).catch(err => console.error('Push notify error:', err));

    setReplyBody("");
    setReplyAttachments([]);
    // Update selected message to show the new reply
    setSelectedMessage(updatedMsg);
  };

  const handleMarkReadByTeacher = () => {
    if (!selectedMessage) return;
    const updatedMsg = {
      ...selectedMessage,
      teacherRead: true
    };
    syncSaveMessage(updatedMsg);

    const updatedMessages = messages.map(m => {
      if (m.id === selectedMessage.id) {
        return updatedMsg;
      }
      return m;
    });
    setMessages(updatedMessages);
    setSelectedMessage(updatedMsg);
  };

  const toggleModal = () => {
    if (composeOpen) resetCompose();
    setComposeOpen(!composeOpen);
  };

  return (
    <div className="w-full max-w-7xl mx-auto h-[calc(100vh-6rem)] mt-6 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex overflow-hidden">
      {/* Sidebar - Folders & Tags */}
      <div className="w-64 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 hidden md:flex flex-col">
        <div className="p-4 space-y-3">
          <button
            onClick={toggleModal}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Edit3 className="w-4 h-4" /> Nova Mensagem
          </button>

          {notificationStatus !== 'granted' && notificationStatus !== 'unsupported' && (
            <button
              onClick={handleEnableNotifications}
              className="w-full bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all border border-slate-200 dark:border-slate-800 text-xs"
            >
              <Bell className="w-4 h-4" /> Ativar Alertas Push
            </button>
          )}

          {notificationStatus === 'granted' && (
            <div className="w-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 border border-emerald-100 dark:border-emerald-800/50 text-[10px] uppercase tracking-widest">
              <ShieldCheck className="w-3.5 h-3.5" /> Alertas Ativos
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto w-full">
          <div className="px-3 space-y-1 mb-6">
            <h3 className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest px-3 mb-2">
              Caixas
            </h3>
            {[
              { id: "todos", label: "Todos", icon: Inbox },
              { id: "nao_lido", label: "Não lido", icon: MessageCircle },
              { id: "recebido", label: "Recebidos", icon: Inbox },
              { id: "aguardando_aprovacao", label: "Aguardando Aprovação", icon: Check },
              { id: "enviado", label: "Enviados", icon: Send },
              { id: "arquivado", label: "Arquivadas", icon: Archive },
              { id: "lixeira", label: "Lixeira", icon: Trash2 },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveFolder(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-bold transition-all",
                  activeFolder === item.id
                    ? "bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-100 dark:text-white"
                    : "text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/60 hover:text-slate-800 dark:text-slate-100 dark:hover:text-slate-700 dark:text-slate-200",
                )}
              >
                <item.icon className="w-4 h-4" /> {item.label}
              </button>
            ))}
          </div>
        </nav>
      </div>

      {/* Main Mail Area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 min-w-0">
        <div className="min-h-[4rem] border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-3 sm:py-0 gap-3 sm:gap-6">
          <h2 className="text-base sm:text-lg font-black text-slate-700 dark:text-slate-200 dark:text-white uppercase tracking-tight">
            {activeFolder === "recebido"
              ? "Caixa de Entrada"
              : activeFolder.replace("_", " ").toUpperCase()}
          </h2>
          <div className="relative w-full sm:w-auto">
            <Search className="w-4 h-4 text-slate-600 dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar em mensagens..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 w-full sm:w-64 transition-all"
            />
          </div>
        </div>

        {/* Mobile Horizontal Folder Scroll */}
        <div className="flex md:hidden overflow-x-auto px-4 py-2 gap-2 border-b border-slate-200 dark:border-slate-800 scrollbar-none bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 dark:bg-slate-900/10 flex-shrink-0">
          {[
            { id: "todos", label: "Todos", icon: Inbox },
            { id: "nao_lido", label: "Não lidos", icon: MessageCircle },
            { id: "recebido", label: "Recebidos", icon: Inbox },
            { id: "aguardando_aprovacao", label: "Aprovações", icon: Check },
            { id: "enviado", label: "Enviados", icon: Send },
            { id: "arquivado", label: "Arquivados", icon: Archive },
            { id: "lixeira", label: "Lixeira", icon: Trash2 },
          ].map((item) => {
            const isCurrent = activeFolder === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveFolder(item.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex-shrink-0",
                  isCurrent
                    ? "bg-indigo-600 text-white"
                    : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                )}
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 relative">
          {(() => {
            const filteredMessages = messages.filter(m => {
                 const matchesQuery = !searchTerm || 
                   m.subject?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                   m.body?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   m.senderName?.toLowerCase().includes(searchTerm.toLowerCase());
                   
                 if (!matchesQuery) return false;
                 if (activeFolder === 'todos') return true;
                 if (activeFolder === 'nao_lido') return !m.read;
                 if (activeFolder === 'aguardando_aprovacao') return m.status === 'pending' || m.status === 'pending_reply';
                 if (activeFolder === 'recebido') return m.folder === 'recebido' || (m.folder === 'enviado' && m.replies && m.replies.length > 0) || m.isFromFamily;
                 if (activeFolder === 'enviado') return m.folder === 'enviado' && m.status !== 'pending' && !m.isFromFamily && m.status !== 'pending_reply';
                 return m.folder === activeFolder && m.status !== 'pending' && m.status !== 'pending_reply';
            });
            
            if (filteredMessages.length === 0) {
              return (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 dark:text-slate-400 opacity-50 py-10">
                  <Inbox className="w-16 h-16 mb-4" />
                  <p className="font-extrabold uppercase tracking-widest text-sm text-center">
                    Nenhuma mensagem encontrada
                  </p>
                </div>
              );
            }
            
            return filteredMessages.map((msg) => (
              <div
                key={msg.id}
                onClick={() => {
                   if (msg.status === 'pending') {
                       openEdit(msg);
                   } else {
                       setSelectedMessage(msg);
                       // Mark as read
                        const updatedMsg = { ...msg, read: true };
                        setMessages(prev => prev.map(m => m.id === msg.id ? updatedMsg : m));
                        syncSaveMessage(updatedMsg);
                   }
                }}
                className={cn(
                  "flex items-start gap-4 p-4 rounded-xl border hover:border-slate-800 dark:hover:border-slate-700 bg-white dark:bg-slate-900/10 cursor-pointer shadow-sm hover:shadow transition-all group relative overflow-hidden",
                  msg.status === 'pending' ? "border-amber-200 dark:border-amber-900 border-dashed" : (selectedMessage?.id === msg.id ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10" : "border-slate-200 dark:border-slate-800/80")
                )}
              >
                {msg.status === 'pending' && (
                  <div className="absolute top-0 right-0 bg-amber-500 text-white text-[9px] font-black uppercase px-2 py-1 rounded-bl-xl tracking-wider">
                    Pendente de Aprovação
                  </div>
                )}
                {msg.status === 'pending_reply' && (
                  <div className="absolute top-0 right-0 bg-amber-500 text-white text-[9px] font-black uppercase px-2 py-1 rounded-bl-xl tracking-wider">
                    Resposta Pendente de Aprovação
                  </div>
                )}
                {msg.lastEditedAt && (
                  <div className="absolute top-0 right-0 mt-[26px] bg-slate-200 text-slate-700 dark:text-slate-300 dark:bg-slate-800 dark:text-slate-400 text-[9px] font-black uppercase px-2 py-0.5 rounded-bl-xl tracking-wider opacity-80">
                    Editado por: {msg.editedBy}
                  </div>
                )}
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0 text-indigo-600 dark:text-indigo-400 font-extrabold text-sm uppercase mt-1">
                  {msg.senderName.substring(0, 2)}
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4
                      className={cn(
                        "text-sm font-black truncate",
                        !msg.read
                          ? "text-slate-800 dark:text-slate-100 dark:text-white"
                          : "text-slate-700 dark:text-slate-300",
                      )}
                    >
                      {msg.senderName}
                    </h4>
                    <span className="text-[10px] font-extrabold text-slate-700 dark:text-slate-400 uppercase mt-[-8px]">
                      {new Date(msg.date).toLocaleDateString()}
                    </span>
                  </div>
                  <h5
                    className={cn(
                      "text-sm mb-1 truncate",
                      !msg.read
                        ? "font-extrabold text-slate-800 dark:text-slate-100 dark:text-white"
                        : "font-semibold text-slate-700 dark:text-slate-305",
                    )}
                  >
                    {msg.subject}
                  </h5>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium line-clamp-1 mb-1">
                    {msg.body}
                  </p>
                  
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border flex items-center gap-1",
                      getCategoryDetails(msg.category).color
                    )}>
                      {msg.category === 'academic' && <BookOpen className="w-2 h-2" />}
                      {msg.category === 'behavior' && <AlertTriangle className="w-2 h-2" />}
                      {msg.category === 'financial' && <DollarSign className="w-2 h-2" />}
                      {msg.category === 'event' && <Calendar className="w-2 h-2" />}
                      {(!msg.category || msg.category === 'circular') && <Bell className="w-2 h-2" />}
                      {getCategoryDetails(msg.category).label}
                    </span>

                    {msg.requiresSignature && (
                      <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 px-1.5 py-0.5 rounded-md w-fit font-mono">
                        ✍️ Cientes: {msg.signatures?.length || 0} / {msg.receiversNames?.length || 1}
                      </span>
                    )}

                    {msg.folder === 'enviado' && (
                      <div className="flex items-center gap-1">
                        {msg.familyRead ? (
                          <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-emerald-500 border border-emerald-100 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded-md w-fit transition-all">
                            <CheckCheck className="w-3.5 h-3.5" /> Lido
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 px-1.5 py-0.5 rounded-md w-fit transition-all">
                            <Check className="w-3 h-3" /> Entregue
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* Conversation Thread Panel */}
      <AnimatePresence>
        {selectedMessage && (
          <motion.div 
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            className="fixed inset-0 md:relative md:inset-auto md:w-[450px] md:border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl md:shadow-xl z-50 md:z-20 flex flex-col h-full overflow-hidden"
          >
            <div className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:px-6 bg-slate-50 dark:bg-slate-900/50 flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <button 
                  onClick={() => setSelectedMessage(null)}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors md:hidden text-slate-700 dark:text-slate-300 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-700 dark:text-slate-300 flex-shrink-0"
                  title="Voltar"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 dark:text-white uppercase tracking-tight truncate max-w-[170px] md:max-w-[240px]">
                  {selectedMessage.subject}
                </h3>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => handleDeleteMessage(selectedMessage.id)}
                  title="Excluir mensagem"
                  className="p-2 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 hover:text-red-700 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setSelectedMessage(null)}
                  title="Fechar"
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-800 dark:text-slate-200 rounded-lg transition-colors hidden md:block"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
               {/* Original Message */}
               <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-extrabold text-xs uppercase">
                      {selectedMessage.senderName.substring(0, 2)}
                    </div>
                    <span className="text-sm font-black text-slate-800 dark:text-slate-100 dark:text-white">{selectedMessage.senderName}</span>
                    <span className="text-[10px] text-slate-600 dark:text-slate-400 font-bold ml-auto">{new Date(selectedMessage.date).toLocaleString()}</span>
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-900/40 p-4 rounded-2xl rounded-tl-none border border-slate-200 dark:border-slate-800">
                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{selectedMessage.body}</p>
                    
                    {selectedMessage.attachments?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedMessage.attachments.map((file: any, i: number) => {
                          const fileUrl = file.data || file.url; 
                          const isImage = Boolean(fileUrl) && (file.type?.startsWith('image/') || fileUrl?.startsWith('data:image/') || fileUrl?.match(/\.(jpeg|jpg|gif|png|bmp|webp|svg)$/i) || fileUrl?.includes('firebasestorage.googleapis.com') || fileUrl?.includes('unsplash') || fileUrl?.startsWith('data:application/octet-stream') || fileUrl?.startsWith('http'));
                          const isVideo = Boolean(fileUrl) && (file.type?.startsWith('video/') || fileUrl?.match(/\.(mp4|webm|ogg|mov)$/i));
                          
                          if (isImage) {
                            return (
                              <div key={i} className="relative group cursor-pointer w-24 h-24 rounded-lg overflow-hidden border border-black/10" onClick={() => setPreviewImage(fileUrl)}>
                                <img src={fileUrl} alt={file.name} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <span className="text-[10px] text-white font-bold tracking-wider">AMPLIAR</span>
                                </div>
                              </div>
                            );
                          }
                          if (isVideo) {
                            return (
                              <div key={i} className="relative group w-48 h-24 rounded-lg overflow-hidden border border-black/10">
                                <video src={fileUrl} controls className="w-full h-full object-cover" />
                              </div>
                            );
                          }
                          return (
                            <a key={i} href={fileUrl} download={file.name} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-2 py-1 bg-black/5 dark:bg-black/20 rounded-lg max-w-full hover:bg-black/10 transition-colors">
                              <Paperclip className="w-3 h-3 text-indigo-500 shrink-0" />
                              <span className="text-[10px] text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{file.name}</span>
                            </a>
                          );
                        })}
                      </div>
                    )}
                    
                    {selectedMessage.folder === 'enviado' && (
                      <div className="flex justify-end mt-2">
                        {selectedMessage.familyRead ? (
                          <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-500">
                            <CheckCheck className="w-3.5 h-3.5" /> Lido
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">
                            <Check className="w-3 h-3" /> Entregue
                          </span>
                        )}
                      </div>
                    )}
                  </div>
               </div>

               {/* Signature tracking block */}
               {selectedMessage.requiresSignature && (
                 <div className="bg-slate-50 dark:bg-slate-900/60 p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-3 text-left">
                   <h4 className="text-xs font-black uppercase text-slate-600 dark:text-slate-400 tracking-wider flex items-center gap-1.5">
                     ✍️ Controle de Ciente Digital
                   </h4>
                   
                   {(() => {
                     const total = selectedMessage.receiversNames?.length || 1;
                     const signed = selectedMessage.signatures?.length || 0;
                     const percent = Math.round((signed / total) * 100);
                     
                     // Separate signed from pending
                     const signedList = selectedMessage.signatures || [];
                     const signedNames = new Set(signedList.map((s: any) => s.studentName?.toLowerCase()));
                     const pendingList = selectedMessage.receiversNames?.filter((name: string) => !signedNames.has(name.toLowerCase())) || [];

                     return (
                       <div className="space-y-3.5">
                         {/* Progress bar */}
                         <div className="space-y-1">
                           <div className="flex justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                             <span>Taxa de Leitura/Ciente: {percent}%</span>
                             <span>{signed} de {total}</span>
                           </div>
                           <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                             <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${percent}%` }}></div>
                           </div>
                         </div>
                         
                         {/* Accordion / Split view of Signed vs Pending */}
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                           {/* Signed list */}
                           <div className="space-y-1.5 bg-white dark:bg-[#0b0f19] p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                             <span className="block text-[10px] font-black text-emerald-600 uppercase tracking-wider">✓ Assinados ({signed})</span>
                             {signedList.length === 0 ? (
                               <span className="block text-[10px] text-slate-600 dark:text-slate-450 italic">Nenhum ciente recebido ainda.</span>
                             ) : (
                               <div className="max-h-36 overflow-y-auto space-y-1 divide-y divide-slate-50 dark:divide-slate-800/50 pr-1">
                                 {signedList.map((sig: any, idx: number) => (
                                   <div key={idx} className="pt-1.5 first:pt-0">
                                     <span className="font-semibold block truncate text-slate-700 dark:text-slate-350">{sig.guardianName}</span>
                                     <span className="text-[9px] text-slate-600 dark:text-slate-400 block truncate">Aluno: {sig.studentName}</span>
                                     <span className="text-[8px] text-slate-500 dark:text-slate-400 block font-mono">{new Date(sig.date).toLocaleString()}</span>
                                   </div>
                                 ))}
                               </div>
                             )}
                           </div>
                           
                           {/* Pending list */}
                           <div className="space-y-1.5 bg-white dark:bg-[#0b0f19] p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                             <span className="block text-[10px] font-black text-rose-600 uppercase tracking-wider">⚠️ Pendentes ({pendingList.length})</span>
                             {pendingList.length === 0 ? (
                               <span className="block text-[10px] text-emerald-600 font-semibold italic">Todos deram ciente! 🎉</span>
                             ) : (
                               <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                                 {pendingList.map((name: string, idx: number) => (
                                   <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-slate-800/50 last:border-b-0">
                                     <span className="font-semibold truncate text-slate-700 dark:text-slate-350">{name}</span>
                                   </div>
                                 ))}
                               </div>
                             )}
                           </div>
                         </div>
                       </div>
                     );
                   })()}
                 </div>
               )}

               {/* Replies */}
               {selectedMessage.replies?.map((reply: any) => (
                  <div key={reply.id} className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-xs uppercase",
                        reply.isFromFamily
                          ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" 
                          : "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                      )}>
                        {reply.senderName.substring(0, 2)}
                      </div>
                      <span className="text-sm font-black text-slate-800 dark:text-slate-100 dark:text-white">{reply.senderName}</span>
                      <span className="text-[10px] text-slate-605 dark:text-slate-400 font-bold ml-auto">{new Date(reply.date).toLocaleString()}</span>
                    </div>
                    <div className={cn(
                      "p-4 rounded-2xl rounded-tl-none border",
                      reply.isFromFamily
                        ? "bg-amber-50 dark:bg-amber-900/10 border-amber-200/50 dark:border-amber-800/50"
                        : "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800"
                    )}>
                      <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{reply.body}</p>
                      
                      {reply.attachments?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                       {reply.attachments.map((file: any, i: number) => {
                            const fileUrl = file.data || file.url; 
                            const isImage = Boolean(fileUrl) && (file.type?.startsWith('image/') || fileUrl?.startsWith('data:image/') || fileUrl?.match(/.(jpeg|jpg|gif|png|bmp|webp|svg)$/i) || fileUrl?.includes('firebasestorage.googleapis.com') || fileUrl?.includes('unsplash') || fileUrl?.startsWith('data:application/octet-stream') || fileUrl?.startsWith('http'));
                            const isVideo = Boolean(fileUrl) && (file.type?.startsWith('video/') || fileUrl?.match(/\.(mp4|webm|ogg|mov)$/i));
                            
                            if (isImage) {
                              return (
                                <div key={i} className="relative group cursor-pointer w-24 h-24 rounded-lg overflow-hidden border border-black/10" onClick={() => setPreviewImage(fileUrl)}>
                                  <img src={fileUrl} alt={file.name} className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <span className="text-[10px] text-white font-bold tracking-wider">AMPLIAR</span>
                                  </div>
                                </div>
                              );
                            }
                            if (isVideo) {
                              return (
                                <div key={i} className="relative group w-48 h-24 rounded-lg overflow-hidden border border-black/10">
                                  <video src={fileUrl} controls className="w-full h-full object-cover" />
                                </div>
                              );
                            }
                            return (
                              <a key={i} href={fileUrl} download={file.name} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-2 py-1 bg-black/5 dark:bg-black/20 rounded-lg max-w-full hover:bg-black/10 transition-colors">
                                <Paperclip className="w-3 h-3 text-indigo-500 shrink-0" />
                                <span className="text-[10px] text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{file.name}</span>
                              </a>
                            );
                          })}
                        </div>
                      )}
                      
                    </div>
                  </div>
               ))}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800">
               <div className="flex flex-col gap-3">
                  {!selectedMessage.teacherRead && selectedMessage.replies?.some((r: any) => r.senderName !== (userProfile?.professional_name || user.email?.split("@")[0])) && (
                    <button
                       onClick={handleMarkReadByTeacher}
                       className="w-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-bold py-2 rounded-xl text-xs uppercase tracking-widest transition-all border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center gap-2 mb-2 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                    >
                       <Check className="w-4 h-4" /> Marcar como Visualizado
                    </button>
                  )}
                  {selectedMessage.teacherRead && (
                    <div className="w-full bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold py-2 rounded-xl text-[10px] uppercase tracking-widest text-center flex items-center justify-center gap-1.5 mb-2">
                      <Check className="w-3.5 h-3.5" /> Visualizado pelo Professor
                    </div>
                  )}
                  {replyAttachments.length > 0 && (
                     <div className="flex flex-wrap gap-2 pb-2">
                        {replyAttachments.map((file: any, i: number) => {
                          const fileUrl = file.data || file.url; const isImage = Boolean(fileUrl) && (file.type?.startsWith('image/') || fileUrl?.startsWith('data:image/') || fileUrl?.match(/.(jpeg|jpg|gif|png|bmp|webp|svg)$/i) || fileUrl?.includes('firebasestorage.googleapis.com') || fileUrl?.includes('unsplash') || fileUrl?.startsWith('data:application/octet-stream') || fileUrl?.startsWith('http'));
                          return (
                            <div key={i} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative group">
                               <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center overflow-hidden">
                                  {isImage ? <img src={fileUrl} alt="thumb" className="w-full h-full object-cover" /> : <FileText className="w-3 h-3 text-indigo-600" />}
                               </div>
                               <span className="text-[10px] font-black text-slate-700 dark:text-slate-400 truncate max-w-[100px] uppercase tracking-wider">{file.name}</span>
                               <button 
                                 type="button"
                                 onClick={() => setReplyAttachments(prev => prev.filter((_, idx) => idx !== i))}
                                 className="w-5 h-5 flex items-center justify-center rounded-full bg-rose-100 text-rose-500 absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                               >
                                 <X className="w-3 h-3" />
                               </button>
                            </div>
                          );
                        })}
                     </div>
                  )}
                  {isAdmin && (selectedMessage.status === 'pending' || selectedMessage.status === 'pending_reply') && (
                    <button
                       onClick={handleApproveSelectedMessage}
                       className="w-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 font-bold py-2 rounded-xl text-xs uppercase tracking-widest transition-all border border-amber-200 dark:border-amber-800/50 flex items-center justify-center gap-2 mb-2 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                    >
                       <Check className="w-4 h-4" /> Aprovar Mensagem/Resposta
                    </button>
                  )}
                  <textarea 
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder="Escreva uma resposta..."
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500 transition-all resize-none h-24"
                  />
                  <div className="flex gap-2">
                     <button 
                        type="button"
                        onClick={() => document.getElementById('compose-reply-file-input')?.click()}
                        className="px-4 py-2 bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors shrink-0"
                        title="Anexar arquivo"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>
                      <input 
                        id="compose-reply-file-input"
                        type="file"
                        multiple
                        className="hidden"
                        onChange={async (e) => {
                          const files = Array.from(e.target.files || []) as File[];
                          const newAttachments = [];
                          for (const f of files) {
                            try {
                              const reader = new FileReader();
                              const base64Data = await new Promise((resolve, reject) => {
                                reader.readAsDataURL(f);
                                reader.onload = () => resolve(reader.result as string);
                                reader.onerror = error => reject(error);
                              }) as string;

                              const uploadRes = await fetch("/api/agenda/upload", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  fileBase64: base64Data,
                                  filename: f.name,
                                  filetype: f.type
                                })
                              });
                              if (!uploadRes.ok) throw new Error("Upload failed");
                              const uploadData = await uploadRes.json();
                              if (uploadData.success) {
                                newAttachments.push({ 
                                  name: f.name, 
                                  size: f.size, 
                                  type: f.type, 
                                  url: uploadData.url 
                                });
                              }
                            } catch(err) {
                              console.error("Error uploading file:", err);
                              alert("Erro ao enviar arquivo: " + f.name);
                            }
                          }
                          setReplyAttachments(prev => [...prev, ...newAttachments]);
                        }}
                      />
                      <button 
                        onClick={handleReply}
                        disabled={!replyBody.trim()}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-xl text-xs uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <Send className="w-3.5 h-3.5" /> Enviar Resposta
                      </button>
                  </div>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compose Modal */}
      <AnimatePresence>
        {composeOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden max-h-[90vh]"
            >
              <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-indigo-500" /> Nova Mensagem
                </h3>
                <button
                  onClick={toggleModal}
                  className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-6 py-2 overflow-y-auto flex-1 flex flex-col">
                {/* Templates Selector */}
                <div className="flex flex-col md:flex-row md:items-center py-3 border-b border-slate-100 dark:border-slate-800/50 gap-2 md:gap-0">
                  <span className="text-sm font-semibold text-slate-500 w-20 shrink-0">Modelos:</span>
                  <select
                    onChange={(e: any) => {
                      const idx = parseInt(e.target.value);
                      if (idx > 0) {
                        const tpl = ANNOUNCEMENT_TEMPLATES[idx];
                        setComposeCategory(tpl.category as any);
                        setComposeSubject(tpl.subject);
                        setComposeBody(tpl.body);
                        setComposeRequiresSignature(tpl.requiresSignature);
                      }
                    }}
                    className="flex-1 md:w-auto px-3 py-1.5 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-705 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg outline-none cursor-pointer focus:border-indigo-505 transition-colors"
                  >
                    {ANNOUNCEMENT_TEMPLATES.map((tpl, i) => (
                      <option key={i} value={i}>{tpl.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col md:flex-row md:items-center py-3 border-b border-slate-100 dark:border-slate-800/50 gap-2 md:gap-0">
                  <span className="text-sm font-semibold text-slate-500 w-20 shrink-0">Para:</span>
                  <button
                    type="button"
                    onClick={() => setRecipientModalOpen(true)}
                    className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700 text-left text-sm text-slate-700 dark:text-slate-300 -ml-3 md:ml-0"
                  >
                    <Users className="w-4 h-4 text-slate-400" />
                    {selectedIds.length > 0 ? (
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">{selectedIds.length} Destinatário(s)</span>
                    ) : (
                      <span className="text-slate-450">Selecionar alunos ou turmas...</span>
                    )}
                  </button>
                  <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 hidden md:block mx-3"></div>
                  <div className="flex items-center gap-2 mt-2 md:mt-0">
                    <span className="text-sm font-semibold text-slate-500 md:hidden w-20 shrink-0">Acesso:</span>
                    <select 
                      value={recipientType}
                      onChange={(e: any) => setRecipientType(e.target.value)}
                      className="flex-1 md:w-auto px-3 py-1.5 bg-transparent text-sm font-medium text-slate-700 dark:text-slate-300 outline-none cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:bg-white dark:focus:bg-slate-900 -ml-3 md:ml-0"
                    >
                      <option value="all">Todos (Alunos & Pais)</option>
                      <option value="guardians">Somente Responsáveis</option>
                      <option value="student">Somente Alunos</option>
                      <option value="financial">Somente Resp. Financeiro</option>
                    </select>
                  </div>
                </div>

                {/* Category & Signature Row */}
                <div className="flex flex-col md:flex-row md:items-center py-3 border-b border-slate-100 dark:border-slate-800/50 gap-4 md:gap-0">
                  <div className="flex items-center flex-1">
                    <span className="text-sm font-semibold text-slate-500 w-20 shrink-0">Categoria:</span>
                    <select
                      value={composeCategory}
                      onChange={(e: any) => setComposeCategory(e.target.value as any)}
                      className="px-3 py-1.5 bg-transparent text-sm font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-lg outline-none cursor-pointer focus:border-indigo-500 transition-colors"
                    >
                      <option value="circular">Circular / Comunicado</option>
                      <option value="academic">Acadêmico / Dever de Casa</option>
                      <option value="behavior">Ocorrência / Comportamento</option>
                      <option value="event">Evento / Atividade</option>
                      <option value="financial">Financeiro / Administrativo</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="requires-signature"
                      checked={composeRequiresSignature}
                      onChange={(e) => setComposeRequiresSignature(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-slate-300 dark:border-slate-800 rounded focus:ring-indigo-500 focus:ring-opacity-50 cursor-pointer"
                    />
                    <label htmlFor="requires-signature" className="text-sm font-semibold text-slate-750 dark:text-slate-300 cursor-pointer select-none">
                      Requer Assinatura Digital (Ciente)
                    </label>
                  </div>
                </div>

                <div className="flex items-center py-3 border-b border-slate-100 dark:border-slate-800/50">
                  <span className="text-sm font-semibold text-slate-500 w-20 shrink-0">Assunto:</span>
                  <input
                    type="text"
                    placeholder="Título da mensagem"
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    className="flex-1 bg-transparent text-sm font-semibold text-slate-800 dark:text-slate-200 outline-none placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>

                <div className="flex-1 py-4 flex flex-col min-h-[250px]">
                  <textarea
                    className="w-full flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-200 outline-none resize-none placeholder:text-slate-400"
                    placeholder="Escreva os detalhes da mensagem aqui..."
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value)}
                  />
                </div>

                {/* Attachments Area */}
                <div className="flex flex-col space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/50 mt-auto pb-4">
                   <div className="flex items-center gap-3">
                     <button 
                       type="button"
                       onClick={() => document.getElementById('compose-file-input')?.click()}
                       className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 bg-slate-50 dark:bg-slate-900/50 px-3 py-1.5 rounded-full transition-colors border border-slate-200 dark:border-slate-800"
                     >
                       <Paperclip className="w-3.5 h-3.5" /> Anexar Arquivos
                     </button>
                      <button 
                        type="button"
                        onClick={handleImproveAnnouncement}
                        disabled={isImproving}
                        className="flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-3 py-1.5 rounded-full transition-colors border border-transparent shadow-sm cursor-pointer"
                      >
                        {isImproving ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5" />
                        )}
                        <span>Aprimorar com IA</span>
                      </button>
                     <input 
                       id="compose-file-input"
                       type="file"
                       multiple
                       className="hidden"
                       onChange={async (e) => {
                         const files = Array.from(e.target.files || []) as File[];
                         const newAttachments = [];
                         for (const f of files) {
                           try {
                             const reader = new FileReader();
                             const base64Data = await new Promise((resolve, reject) => {
                               reader.readAsDataURL(f);
                               reader.onload = () => resolve(reader.result as string);
                               reader.onerror = error => reject(error);
                             }) as string;

                             const uploadRes = await fetch("/api/agenda/upload", {
                               method: "POST",
                               headers: { "Content-Type": "application/json" },
                               body: JSON.stringify({
                                 fileBase64: base64Data,
                                 filename: f.name,
                                 filetype: f.type
                               })
                             });
                             if (!uploadRes.ok) throw new Error("Upload failed");
                             const uploadData = await uploadRes.json();
                             if (uploadData.success) {
                               newAttachments.push({ 
                                 name: f.name, 
                                 size: f.size, 
                                 type: f.type, 
                                 url: uploadData.url 
                               });
                             }
                           } catch(err) {
                             console.error("Error uploading file:", err);
                             alert("Erro ao enviar arquivo: " + f.name);
                           }
                         }
                         setComposeAttachments(prev => [...prev, ...newAttachments]);
                       }}
                     />
                   </div>
                   
                   {composeAttachments.length > 0 && (
                     <div className="flex flex-wrap gap-2">
                        {composeAttachments.map((file: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm animate-in fade-in zoom-in-95 group">
                             <div className="w-6 h-6 rounded flex items-center justify-center bg-indigo-50 dark:bg-indigo-900/30">
                                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                             </div>
                             <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[150px]">{file.name}</span>
                             <button 
                               type="button"
                               onClick={() => setComposeAttachments(prev => prev.filter((_, idx) => idx !== i))}
                               className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-rose-100 hover:text-rose-600 text-slate-400 transition-colors opacity-0 group-hover:opacity-100"
                             >
                               <X className="w-3 h-3" />
                             </button>
                          </div>
                        ))}
                     </div>
                   )}
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row items-center justify-between gap-4 rounded-b-3xl">
                <button
                  onClick={toggleModal}
                  className="w-full sm:w-auto p-2.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  <Trash2 className="w-5 h-5" />
                  <span className="sm:hidden">Descartar</span>
                </button>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all w-full sm:w-auto">
                     <Clock className="w-4 h-4 text-slate-400" />
                     <input
                       type="datetime-local"
                       value={composeScheduledDate}
                       onChange={(e) => setComposeScheduledDate(e.target.value)}
                       className="bg-transparent text-sm font-semibold text-slate-700 dark:text-slate-300 outline-none placeholder:font-normal w-full"
                       title="Agendar Envio"
                     />
                  </div>
                  <button 
                    onClick={handleSend}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center justify-center gap-2 transition-all group"
                  >
                    <Send className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    <span className="truncate">{isAdmin ? (editingMessageId ? "Atualizar" : "Enviar") : (editingMessageId ? "Atualizar p/ Aprovação" : "Enviar p/ Aprovação")}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Recipient Selection Modal */}
      <AnimatePresence>
        {recipientModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-xl overflow-hidden flex flex-col h-[600px] max-h-[90vh]"
            >
              <div className="flex items-center justify-between p-5">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 dark:text-white">
                  Destinatários
                </h2>
                <button
                  onClick={() => setRecipientModalOpen(false)}
                  className="text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="px-5 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-600 dark:text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Pesquisar..."
                    className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-slate-700 rounded-full text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all text-slate-800 dark:text-slate-200"
                    value={recipientSearch}
                    onChange={(e) => setRecipientSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto w-full select-none">
                {recipientSearch.trim() === "" ? (
                  <div className="flex flex-col">
                    {/* Select All */}
                    <div
                      className="flex items-center px-6 py-4 hover:bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                      onClick={() => toggleSelection("all")}
                    >
                      <div className="w-5 h-5 rounded-full border-2 border-slate-200 dark:border-slate-800 flex items-center justify-center shrink-0 mr-4">
                        {isSelected("all") && (
                          <div className="w-3 h-3 rounded-full bg-slate-400 dark:bg-slate-900 text-slate-800 dark:text-slate-2000" />
                        )}
                      </div>
                      <span className="text-slate-700 dark:text-slate-200 text-[15px] font-medium">
                        Selecionar todos
                      </span>
                    </div>

                    {/* Employee Node */}
                    <div className="flex flex-col">
                      <div className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 dark:hover:bg-slate-800/50 transition-colors group">
                        <div
                          className="flex items-center cursor-pointer flex-1"
                          onClick={() => toggleSelection("employees", professors.map(p => p.uid || p.id))}
                        >
                          <div className="w-5 h-5 rounded-full border-2 border-slate-200 dark:border-slate-800 flex items-center justify-center shrink-0 mr-4">
                            {isSelected("employees") && (
                              <div className="w-3 h-3 rounded-full bg-slate-400 dark:bg-slate-900 text-slate-800 dark:text-slate-2000" />
                            )}
                          </div>
                          <span className="text-slate-700 dark:text-slate-200 text-[15px] font-medium">
                            Funcionário
                          </span>
                        </div>
                        <div
                          className="flex items-center gap-3 cursor-pointer"
                          onClick={() => toggleGroupExpand("employees")}
                        >
                          <span className="text-slate-700 dark:text-slate-300 text-xs flex items-center gap-1 font-medium">
                            <Users className="w-3 h-3" /> {professors.length}
                          </span>
                          <svg
                            className={`w-5 h-5 text-slate-600 dark:text-slate-400 transition-transform ${expandedGroups.includes("employees") ? "rotate-90" : ""}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>

                      {expandedGroups.includes("employees") && (
                        <div className="flex flex-col bg-slate-50 dark:bg-slate-900/20 py-2">
                          {professors.map((prof) => {
                            const identifier = prof.uid || prof.id;
                            const name = prof.professional_name || prof.email?.split("@")[0] || "Funcionário";
                            return (
                              <div
                                key={identifier}
                                className="flex items-center px-6 py-2.5 hover:bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                                onClick={() => toggleSelection(identifier)}
                              >
                                <div className="w-5 h-5 rounded-full border-2 border-slate-200 dark:border-slate-800 flex items-center justify-center shrink-0 mr-4">
                                  {isSelected(identifier) && (
                                    <div className="w-3 h-3 rounded-full bg-slate-400 dark:bg-slate-900 text-slate-800 dark:text-slate-2000" />
                                  )}
                                </div>
                                <div className="w-10 h-10 rounded-full bg-indigo-500 text-white font-bold flex items-center justify-center shrink-0 mr-4 text-sm uppercase">
                                  {name.substring(0, 2)}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-slate-800 dark:text-slate-100 dark:text-white text-[15px]">
                                    {name}
                                  </span>
                                  <span className="text-slate-600 dark:text-slate-400 text-xs mt-0.5">
                                    Funcionário
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Educação Infantil */}
                    {infantilClasses.length > 0 && (
                      <div className="flex flex-col">
                        <div className="bg-emerald-50 dark:bg-emerald-950/20 px-6 py-2 border-y border-emerald-100 dark:border-emerald-900/30">
                          <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-500 tracking-widest">
                            Educação Infantil
                          </span>
                        </div>
                        {infantilClasses.sort().map(classId => renderClassNode(classId))}
                      </div>
                    )}

                    {/* Ensino Fundamental I */}
                    {fund1Classes.length > 0 && (
                      <div className="flex flex-col">
                        <div className="bg-rose-50 dark:bg-rose-950/20 px-6 py-2 border-y border-rose-100 dark:border-rose-900/30">
                          <span className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-500 tracking-widest">
                            Ensino Fundamental I (1º ao 5º ano)
                          </span>
                        </div>
                        {fund1Classes.sort().map(classId => renderClassNode(classId))}
                      </div>
                    )}

                    {/* Ensino Fundamental II */}
                    {fund2Classes.length > 0 && (
                      <div className="flex flex-col">
                        <div className="bg-indigo-50 dark:bg-indigo-950/20 px-6 py-2 border-y border-indigo-100 dark:border-indigo-900/30">
                          <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-500 tracking-widest">
                            Ensino Fundamental II (6º ao 9º ano)
                          </span>
                        </div>
                        {fund2Classes.sort().map(classId => renderClassNode(classId))}
                      </div>
                    )}

                    {/* Outras Turmas */}
                    {otherClasses.length > 0 && (
                      <div className="flex flex-col">
                        <div className="bg-slate-100 dark:bg-slate-900/40 px-6 py-2 border-y border-slate-200 dark:border-slate-800/50">
                          <span className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-400 tracking-widest">
                            Outras Turmas
                          </span>
                        </div>
                        {otherClasses.sort().map(classId => renderClassNode(classId))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {allClasses
                      .filter((c) =>
                        c.toLowerCase().includes(recipientSearch.toLowerCase()),
                      )
                      .map((c) => renderClassNode(c))}
                    {allStudents
                      .filter((s) =>
                        s.name
                          .toLowerCase()
                          .includes(recipientSearch.toLowerCase()),
                      )
                      .map((student) => {
                        const identifier = student.id || student.name;
                        return (
                          <div
                            key={identifier}
                            className="flex items-center px-6 py-2.5 hover:bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                            onClick={() => toggleSelection(identifier)}
                          >
                            <div className="w-5 h-5 rounded-full border-2 border-slate-200 dark:border-slate-800 flex items-center justify-center shrink-0 mr-4">
                              {isSelected(identifier) && (
                                <div className="w-3 h-3 rounded-full bg-slate-400 dark:bg-slate-900 text-slate-800 dark:text-slate-2000" />
                              )}
                            </div>
                            <div className="w-10 h-10 rounded-full bg-red-500 text-white font-bold flex items-center justify-center shrink-0 mr-4 text-sm uppercase">
                              {student.name.substring(0, 2)}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-slate-800 dark:text-slate-100 dark:text-white text-[15px]">
                                {student.name}
                              </span>
                              <span className="text-slate-600 dark:text-slate-400 text-xs mt-0.5">
                                Aluno
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    {professors
                      .filter((p) => {
                        const name = p.professional_name || p.email?.split("@")[0] || "Funcionário";
                        return name.toLowerCase().includes(recipientSearch.toLowerCase());
                      })
                      .map((prof) => {
                        const identifier = prof.uid || prof.id;
                        const name = prof.professional_name || prof.email?.split("@")[0] || "Funcionário";
                        return (
                          <div
                            key={identifier}
                            className="flex items-center px-6 py-2.5 hover:bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                            onClick={() => toggleSelection(identifier)}
                          >
                            <div className="w-5 h-5 rounded-full border-2 border-slate-200 dark:border-slate-800 flex items-center justify-center shrink-0 mr-4">
                              {isSelected(identifier) && (
                                <div className="w-3 h-3 rounded-full bg-slate-400 dark:bg-slate-900 text-slate-800 dark:text-slate-2000" />
                              )}
                            </div>
                            <div className="w-10 h-10 rounded-full bg-indigo-500 text-white font-bold flex items-center justify-center shrink-0 mr-4 text-sm uppercase">
                              {name.substring(0, 2)}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-slate-800 dark:text-slate-100 dark:text-white text-[15px]">
                                {name}
                              </span>
                              <span className="text-slate-600 dark:text-slate-400 text-xs mt-0.5">
                                Funcionário
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
              
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
                <button
                  onClick={() => setRecipientModalOpen(false)}
                  className="px-5 py-2.5 rounded-full font-bold text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 transition-all shadow-sm"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => setRecipientModalOpen(false)}
                  className="px-6 py-2.5 rounded-full font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-2 transition-all"
                >
                  <Check className="w-4 h-4" /> Adicionar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Floating Action Button (FAB) for New Message */}
      <button
        onClick={toggleModal}
        className="fixed bottom-24 right-6 md:hidden bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-lg z-30 flex items-center justify-center transition-all active:scale-95 border border-indigo-500/20"
        title="Nova Mensagem"
      >
        <Plus className="w-5 h-5" />
      </button>

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

        {/* Unread Messages Modal Agenda/Teacher/Admin */}
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
                  Você tem <span className="text-indigo-600 dark:text-indigo-400">{initialUnreadCount}</span> notificação(ões) / alerta(s) nova(s) aguardando na sua Agenda.
                </p>
                <button
                  onClick={() => setShowUnreadModal(false)}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm uppercase tracking-widest rounded-xl transition-all shadow-md hover:shadow-xl active:scale-95 cursor-pointer"
                >
                  Abrir Agenda
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
