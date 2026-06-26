import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AuthUser as User, createClient } from "@supabase/supabase-js";
import confetti from "canvas-confetti";
import {
  UserCog,
  UserIcon,
  Lock,
  Check,
  Plus,
  Users,
  Search,
  Settings,
  KeyRound,
  ShieldCheck,
  Loader2,
  BookOpen,
  School,
  Tags,
  ClipboardList,
  BarChart3,
  FileText,
  Award,
  TrendingUp,
  Trash2,
  CheckSquare,
  X,
  LayoutList,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  GraduationCap,
  Phone,
  Info,
  Calendar,
  CheckCircle,
  HelpCircle,
  ShieldAlert,
  BadgeInfo,
  Database,
  Activity,
  Shield,
  ChevronDown,
  Save,
  RotateCcw,
  Download,
} from "lucide-react";
import { cn } from "../lib/utils";
import { ViewHeader } from "./ViewHeader";

export interface Student {
  name: string;
  classId: string;
  registrationNumber?: string;
  status?: "Ativo" | "Inativo" | "Transferido" | "Cancelado";
  birthDate?: string;
  guardianName?: string;
  phone?: string;
  notes?: string;
  transferDate?: string;
  motherName?: string;
  fatherName?: string;
  financialGuardian?: string;
  phone2?: string;
  email?: string;
  rg?: string;
  cpf?: string;
  photoUrl?: string;
  agendaAccess?: {
    student?: { username: string; passwordHash?: string; pin?: string };
    guardian1?: { username: string; passwordHash?: string; pin?: string };
    guardian2?: { username: string; passwordHash?: string; pin?: string };
    financial?: { username: string; passwordHash?: string; pin?: string };
  };
}

export interface AdminViewProps {
  user: User;
  userProfile?: any;
  onResetPassword: (uid: string, pw: string) => Promise<void>;
  getSchoolInfo: () => any;
  saveSchoolInfo: (info: any) => void;
  DEFAULT_SCHOOL_INFO: any;
  supabase: any;
  absenceJustifications?: any[];
  onSaveAbsenceJustifications?: (newList: any[]) => Promise<void>;
}

function BimesterSettingsView({ schoolInfo, saveInfo }: { schoolInfo: any; saveInfo: (info: any) => void }) {
  const bimesters = ["1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre"];
  const currentDates = schoolInfo.bimesterDates || {
    "1º Bimestre": { startDate: "2026-02-01", endDate: "2026-04-15" },
    "2º Bimestre": { startDate: "2026-04-16", endDate: "2026-06-30" },
    "3º Bimestre": { startDate: "2026-08-01", endDate: "2026-10-15" },
    "4º Bimestre": { startDate: "2026-10-16", endDate: "2026-12-15" }
  };

  const [datesState, setDatesState] = useState<Record<string, { startDate: string; endDate: string }>>(currentDates);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleDateChange = (bimester: string, field: 'startDate' | 'endDate', value: string) => {
    setDatesState(prev => ({
      ...prev,
      [bimester]: {
        ...prev[bimester],
        [field]: value
      }
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate ranges
    for (const bimester of bimesters) {
      const { startDate, endDate } = datesState[bimester] || {};
      if (startDate && endDate) {
        if (new Date(startDate) > new Date(endDate)) {
          alert(`Erro no ${bimester}: A data final não pode ser anterior à data inicial.`);
          return;
        }
      } else {
        alert(`Erro: Por favor preencha todas as datas de início e término para o ${bimester}.`);
        return;
      }
    }

    saveInfo({
      ...schoolInfo,
      bimesterDates: datesState
    });

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 3000);
  };

  const bimesterColors: Record<string, string> = {
    "1º Bimestre": "border-l-teal-500 bg-teal-55/5 dark:bg-teal-950/5 text-teal-600 dark:text-teal-400",
    "2º Bimestre": "border-l-indigo-500 bg-indigo-55/5 dark:bg-indigo-950/5 text-indigo-600 dark:text-indigo-400",
    "3º Bimestre": "border-l-amber-500 bg-amber-55/5 dark:bg-amber-950/5 text-amber-600 dark:text-amber-400",
    "4º Bimestre": "border-l-rose-500 bg-rose-55/5 dark:bg-rose-950/5 text-rose-600 dark:text-rose-400"
  };

  return (
    <div className="space-y-6 flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl p-4">
      <div>
        <h4 className="text-sm font-black text-slate-700 dark:text-slate-200 dark:text-white uppercase mb-1">
          Calendário de Bimestres Letivos
        </h4>
        <p className="text-[10px] text-slate-700 dark:text-slate-300 uppercase font-bold tracking-widest leading-relaxed">
          Defina as datas de início e término de cada período letivo do ano. Quando uma avaliação tem data definida, o sistema automaticamente determina seu bimestre com base nessas faixas.
        </p>
      </div>

      <form onSubmit={handleSave} className="flex-1 flex flex-col justify-between space-y-6">
        <div className="space-y-4 overflow-y-auto max-h-[380px] pr-1">
          {bimesters.map((bim) => {
            const range = datesState[bim] || { startDate: "", endDate: "" };
            const colorClass = bimesterColors[bim] || "";

            return (
              <div 
                key={bim} 
                className={cn(
                  "p-4 rounded-2xl border-2 border-l-[6px] border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all hover:border-slate-800 dark:hover:border-slate-700 bg-white dark:bg-slate-900",
                  colorClass
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-white dark:bg-slate-800 flex items-center justify-center font-black text-xs select-none">
                    {bim.charAt(0)}
                  </div>
                  <div>
                    <h5 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 dark:text-white uppercase">
                      {bim}
                    </h5>
                    <p className="text-[9px] text-slate-600 dark:text-slate-400 uppercase font-bold tracking-wider leading-tight mt-0.5">
                      Período de Aula
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full md:w-auto">
                  <div className="flex-1 sm:flex-initial space-y-1">
                    <label className="text-[8px] font-black uppercase text-slate-700 dark:text-slate-300 tracking-widest block pl-1">
                      Início
                    </label>
                    <input
                      type="date"
                      value={range.startDate}
                      onChange={(e) => handleDateChange(bim, 'startDate', e.target.value)}
                      required
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 dark:text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-xs"
                    />
                  </div>

                  <span className="text-slate-600 dark:text-slate-400 font-bold text-xs pt-4 hidden sm:inline select-none">Até</span>

                  <div className="flex-1 sm:flex-initial space-y-1">
                    <label className="text-[8px] font-black uppercase text-slate-700 dark:text-slate-300 tracking-widest block pl-1">
                      Término
                    </label>
                    <input
                      type="date"
                      value={range.endDate}
                      onChange={(e) => handleDateChange(bim, 'endDate', e.target.value)}
                      required
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 dark:text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-xs"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="submit"
          className="bg-slate-900 hover:bg-slate-800 text-white py-3.5 px-6 rounded-2xl font-black uppercase text-xs w-full flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer mt-4"
        >
          {saveSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-green-400 animate-bounce" />
              <span>Salvo com Sucesso!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Gravar Datas do Calendário</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}

const ALL_ROLES_MAP: Record<string, string> = {
  admin: "Diretor (Administrador Geral)",
  vice_diretor: "Vice-Diretor(a)",
  coordenador_fund1: "Coordenador(a) - Fund I",
  coordenador_fund2: "Coordenador(a) - Fund II",
  coordenador_all: "Coordenador(a) Geral",
  secretaria_fund1: "Secretaria - Fund I",
  secretaria_fund2: "Secretaria - Fund II",
  secretaria_all: "Secretaria Geral",
  professor: "Professor(a)",
};

export default function AdminView({
  user,
  userProfile,
  onResetPassword,
  getSchoolInfo,
  saveSchoolInfo,
  DEFAULT_SCHOOL_INFO,
  supabase,
  absenceJustifications = [],
  onSaveAbsenceJustifications,
}: AdminViewProps) {
  const [activeTab, setActiveTab] = useState<
    "users" | "school" | "students" | "justifications" | "productivity" | "login_history" | "activity_history"
  >("users");
  const [schoolConfigTab, setSchoolConfigTab] = useState<
    "subjects" | "classes" | "categories" | "bimesters"
  >("subjects");
  const [showGuide, setShowGuide] = useState(true);

  // Create User Modal & Form States
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["professor"]);

  // Roster lists
  const [allowedUsers, setAllowedUsers] = useState<any[]>([]);
  const [networkUsers, setNetworkUsers] = useState<any[]>([]);
  const [professorSearch, setProfessorSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // School Matrix
  const [schoolInfo, setSchoolInfoState] = useState(getSchoolInfo());
  const [newSubject, setNewSubject] = useState("");
  const [editingSubject, setEditingSubject] = useState<{oldName: string, newName: string} | null>(null);
  const [newClass, setNewClass] = useState("");
  const [newClassShift, setNewClassShift] = useState("Manhã");
  const [newClassModality, setNewClassModality] = useState<"infantil" | "fund1" | "fund2">("fund1");
  const [newCategory, setNewCategory] = useState("");
  const [selectedRelClass, setSelectedRelClass] = useState<string | null>(null);

  // Edit Mappings & Password modals
  const [configuringUser, setConfiguringUser] = useState<any | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [resettingPwUser, setResettingPwUser] = useState<any | null>(null);
  const [newPwVal, setNewPwVal] = useState("");
  const [isServerConfigured, setIsServerConfigured] = useState(true);

  const [deletePassword, setDeletePassword] = useState(() => {
    return localStorage.getItem("cps_delete_professor_password") || "0";
  });
  const [isChangingDeletePassword, setIsChangingDeletePassword] =
    useState(false);
  const [newDeletePassword, setNewDeletePassword] = useState("");

  // Professor deletion modal state
  const [deletingUser, setDeletingUser] = useState<any | null>(null);
  const [deleteInputPassword, setDeleteInputPassword] = useState("");

  const handleSaveDeletePassword = () => {
    if (!newDeletePassword.trim()) {
      alert("A senha de exclusão não pode estar em branco.");
      return;
    }
    localStorage.setItem(
      "cps_delete_professor_password",
      newDeletePassword.trim(),
    );
    setDeletePassword(newDeletePassword.trim());
    setIsChangingDeletePassword(false);
    setNewDeletePassword("");
    alert("Senha de exclusão de professores atualizada com sucesso!");
  };

  const handleSaveJustification = async () => {
    if (!justStudentName) {
      alert("Por favor, selecione um aluno.");
      return;
    }
    if (!justStartDate || !justEndDate) {
      alert("Por favor, preencha o período (De/Até).");
      return;
    }
    if (justStartDate > justEndDate) {
      alert("A data inicial não pode ser maior que a data final.");
      return;
    }

    const newJustification = {
      id:
        "just_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9),
      studentName: justStudentName,
      startDate: justStartDate,
      endDate: justEndDate,
      reason: justReason,
      notes: justNotes,
      fileUrl: justFileUrl,
      createdAt: new Date().toISOString(),
    };

    const updatedList = [...absenceJustifications, newJustification];
    if (onSaveAbsenceJustifications) {
      await onSaveAbsenceJustifications(updatedList);
    }

    // reset form
    setIsJustModalOpen(false);
    setJustStudentName("");
    setJustStartDate("");
    setJustEndDate("");
    setJustReason("Atestado Médico");
    setJustNotes("");
    setJustFileUrl("");
    alert("Justificativa de falta cadastrada com sucesso!");
  };

  const handleUploadJustificationFile = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setJustUploadProgress(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const response = await fetch("/api/admin/upload-laudo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageBase64: reader.result as string,
              filename: file.name,
            }),
          });
          const data = await response.json();
          if (!response.ok)
            throw new Error(data.error || "Erro ao fazer upload.");
          setJustFileUrl(data.avatar_url);
          alert("Atestado digitalizado enviado com sucesso!");
        } catch (err: any) {
          alert("Erro no upload do arquivo: " + err.message);
        } finally {
          setJustUploadProgress(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      alert("Erro na leitura do arquivo: " + err.message);
      setJustUploadProgress(false);
    }
  };

  // Student Modal & Form Sates
  const [isCreateStudentModalOpen, setIsCreateStudentModalOpen] =
    useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studName, setStudName] = useState("");
  const [studClass, setStudClass] = useState("");
  const [studReg, setStudReg] = useState("");
  const [studStatus, setStudStatus] = useState<
    "Ativo" | "Inativo" | "Transferido" | "Cancelado"
  >("Ativo");
  const [studTransferDate, setStudTransferDate] = useState("");
  const [studBirth, setStudBirth] = useState("");
  const [studGuardian, setStudGuardian] = useState("");
  const [studMother, setStudMother] = useState("");
  const [studFather, setStudFather] = useState("");
  const [studFinancial, setStudFinancial] = useState("");
  const [studPhone, setStudPhone] = useState("");
  const [studPhone2, setStudPhone2] = useState("");
  const [studEmail, setStudEmail] = useState("");
  const [studRG, setStudRG] = useState("");
  const [studCPF, setStudCPF] = useState("");
  const [studNotes, setStudNotes] = useState("");
  const [studPhotoUrl, setStudPhotoUrl] = useState("");
  const [studAgendaAccess, setStudAgendaAccess] = useState<
    Student["agendaAccess"]
  >({});

  // Student Filters
  const [studFilterClass, setStudFilterClass] = useState("TODAS");
  const [studFilterSearch, setStudFilterSearch] = useState("");
  const [studFilterStatus, setStudFilterStatus] = useState("TODOS");

  // Atestados & Justificativas state
  const [isJustModalOpen, setIsJustModalOpen] = useState(false);
  const [justStudentName, setJustStudentName] = useState("");
  const [justStudentSearchOpen, setJustStudentSearchOpen] = useState(false);
  const [justStudentSearchText, setJustStudentSearchText] = useState("");
  const [justExpandedClass, setJustExpandedClass] = useState<string | null>(null);
  const [justStartDate, setJustStartDate] = useState("");
  const [justEndDate, setJustEndDate] = useState("");
  const [justReason, setJustReason] = useState("Atestado Médico");
  const [justNotes, setJustNotes] = useState("");
  const [justFileUrl, setJustFileUrl] = useState("");
  const [justUploadProgress, setJustUploadProgress] = useState(false);
  const [justFilterSearch, setJustFilterSearch] = useState("");
  const [selectedJustificationImage, setSelectedJustificationImage] = useState<
    string | null
  >(null);

  // Logins history state
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Activity history state
  const [activityHistory, setActivityHistory] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [activitySearch, setActivitySearch] = useState("");
  const [activityActionFilter, setActivityActionFilter] = useState("all");
  const [activityProfessorFilter, setActivityProfessorFilter] = useState("all");

  // Performance reports states
  const [reportsData, setReportsData] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  // Database Diagnostics
  const [diagResult, setDiagResult] = useState<any>(null);
  const [loadingDiag, setLoadingDiag] = useState(false);

  // Define local robustFetch if not passed as prop
  const robustFetch = async (
    url: string,
    options: RequestInit = {},
    retries = 2,
  ): Promise<Response> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok && retries > 0)
        return robustFetch(url, options, retries - 1);
      return response;
    } catch (e) {
      if (retries > 0) return robustFetch(url, options, retries - 1);
      throw e;
    }
  };

  const runDatabaseDiagnosis = async () => {
    setLoadingDiag(true);
    try {
      const res = await robustFetch("/api/debug/database");
      const data = await res.json();
      setDiagResult(data);
    } catch (err: any) {
      alert("Falha no diagnóstico: " + err.message);
    } finally {
      setLoadingDiag(false);
    }
  };

  // Load backend variables with resilient auto-retry behavior
  useEffect(() => {
    let active = true;
    const checkConfig = async (retries = 5, delay = 1500) => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        if (!active) return;
        try {
          const res = await fetch("/api/debug-env");
          if (!res.ok) {
            throw new Error(`HTTP status ${res.status}`);
          }
          const data = await res.json();
          if (active) {
            setIsServerConfigured(data.hasSupabaseServiceKey);
          }
          return; // Success
        } catch (err) {
          console.warn(
            `Attempt ${attempt} to check server config failed:`,
            err,
          );
          if (attempt === retries) {
            console.error(
              "Failed to check server config after maximum retries:",
              err,
            );
          } else {
            // Wait before next attempt
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }
    };
    checkConfig();
    return () => {
      active = false;
    };
  }, []);

  // Sync network users & allowed professors
  const fetchAllowed = async () => {
    try {
      const { data, error } = await supabase
        .from("allowed_professors")
        .select("*");
      if (error) throw error;
      if (data) setAllowedUsers(data);
    } catch (err: any) {
      console.warn(
        "Offline/Network warning fetching allowed professors:",
        err.message || err,
      );
    }

    try {
      const res = await fetch("/api/admin/list-professors");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.users) {
          let users = data.users;
          if (userProfile?.role?.includes("coordenador_fund1")) {
            users = users.filter(
              (u: any) =>
                u.assigned_classes?.some((c: string) => /^[1-5]/.test(c)) ||
                u.role?.includes("fund1"),
            );
          } else if (userProfile?.role?.includes("coordenador_fund2")) {
            users = users.filter(
              (u: any) =>
                u.assigned_classes?.some((c: string) => /^[6-9]/.test(c)) ||
                u.role?.includes("fund2"),
            );
          }
          setNetworkUsers(users);
        }
      } else {
        throw new Error("Falha HTTP: " + res.status);
      }
    } catch (err: any) {
      console.warn(
        "Offline/Network warning fetching network users profiles through admin API. Fallback client fetch:",
        err.message || err,
      );
      // Fallback
      const { data: usersData, error } = await supabase
        .from("users")
        .select("*");
      if (!error && usersData) {
        let users = usersData.filter((u: any) => u.email !== "ti@cps.local");
        if (userProfile?.role?.includes("coordenador_fund1")) {
          users = users.filter(
            (u: any) =>
              u.assigned_classes?.some((c: string) => /^[1-5]/.test(c)) ||
              u.role?.includes("fund1"),
          );
        } else if (userProfile?.role?.includes("coordenador_fund2")) {
          users = users.filter(
            (u: any) =>
              u.assigned_classes?.some((c: string) => /^[6-9]/.test(c)) ||
              u.role?.includes("fund2"),
          );
        }
        setNetworkUsers(users);
      }
    }
  };

  const fetchLoginHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/admin/login-history");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setLoginHistory(data.history || []);
        }
      }
    } catch (err) {
      console.error("Error fetching login history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchActivityHistory = async () => {
    setLoadingActivity(true);
    try {
      const res = await fetch("/api/activity/history");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setActivityHistory(data.history || []);
        }
      }
    } catch (err) {
      console.error("Error fetching activity history:", err);
    } finally {
      setLoadingActivity(false);
    }
  };

  useEffect(() => {
    if ((activeTab as any) === "login_history") {
      fetchLoginHistory();
    } else if (activeTab === "activity_history") {
      fetchActivityHistory();
    }
  }, [activeTab]);

  // Unique professors in activity history
  const uniqueProfessors = React.useMemo(() => {
    const map = new Map<string, string>(); // email -> name
    activityHistory.forEach(item => {
      if (item.actor_email) {
        map.set(item.actor_email, item.actor_name || item.actor_email.split('@')[0]);
      }
    });
    return Array.from(map.entries()).map(([email, name]) => ({ email, name }));
  }, [activityHistory]);

  // Combined filters
  const filteredActivities = React.useMemo(() => {
    return activityHistory.filter(item => {
      // 1. Text filter
      if (activitySearch) {
        const matchText = activitySearch.toLowerCase();
        const name = (item.actor_name || "").toLowerCase();
        const email = (item.actor_email || "").toLowerCase();
        const desc = (item.description || "").toLowerCase();
        const type = (item.action_type || "").toLowerCase();
        if (!name.includes(matchText) && !email.includes(matchText) && !desc.includes(matchText) && !type.includes(matchText)) {
          return false;
        }
      }

      // 2. Action category filter
      if (activityActionFilter !== "all") {
        const type = item.action_type || "";
        if (activityActionFilter === "exams") {
          if (type !== "create_exam" && type !== "delete_exam") return false;
        } else if (activityActionFilter === "grades") {
          if (type !== "edit_grades") return false;
        } else if (activityActionFilter === "reports") {
          if (type !== "create_report" && type !== "edit_report" && type !== "delete_report") return false;
        } else if (activityActionFilter === "profile") {
          if (type !== "update_profile") return false;
        }
      }

      // 3. Professor filter
      if (activityProfessorFilter !== "all") {
        if (item.actor_email !== activityProfessorFilter) return false;
      }

      return true;
    });
  }, [activityHistory, activitySearch, activityActionFilter, activityProfessorFilter]);

  // Statistics
  const activityStats = React.useMemo(() => {
    const total = activityHistory.length;
    const examChanges = activityHistory.filter(h => h.action_type === "create_exam" || h.action_type === "delete_exam").length;
    const gradeChanges = activityHistory.filter(h => h.action_type === "edit_grades").length;
    const reportChanges = activityHistory.filter(h => h.action_type === "create_report" || h.action_type === "edit_report" || h.action_type === "delete_report").length;

    return { total, examChanges, gradeChanges, reportChanges };
  }, [activityHistory]);

  const fetchReportsData = async () => {
    setLoadingReports(true);
    try {
      const { data, error } = await supabase
        .from("student_reports")
        .select("id, class_name, bimester, subject, professor_id, created_at");
      if (error) throw error;
      if (data) {
        setReportsData(data);
      }
    } catch (err: any) {
      console.warn("Error fetching student reports for admin dashboard:", err.message || err);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    if (activeTab === "productivity") {
      fetchReportsData();
    }
  }, [activeTab]);

  useEffect(() => {
    fetchAllowed();

    const sub = supabase
      .channel("allowed_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "allowed_professors" },
        fetchAllowed,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "users" },
        fetchAllowed,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, []);

  const toggleSubject = (sub: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub],
    );
  };

  const toggleSelectedClass = (cls: string) => {
    setSelectedClasses((prev) =>
      prev.includes(cls) ? prev.filter((c) => c !== cls) : [...prev, cls],
    );
  };

  const toggleSelectedRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  const handleUpdateUserConfig = async () => {
    if (!configuringUser) return;
    setConfigLoading(true);
    let success = false;
    let message = "Configurações do professor atualizadas com sucesso!";
    try {
      try {
        const response = await fetch("/api/admin/update-professor-metadata", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            targetUid: configuringUser.uid,
            professionalName: configuringUser.professional_name,
            newUsername: configuringUser.username, // MOD: Allow username update sync
            avatarUrl:
              configuringUser.avatar_base64 || configuringUser.avatar_url,
            initialAvatarUrl: configuringUser.avatar_url,
            assignedSubjects: configuringUser.assigned_subjects || [],
            assignedClasses: configuringUser.assigned_classes || [],
            role: configuringUser.role || "professor",
          }),
        });

        const text = await response.text();
        let result: any = {};
        try {
          result = JSON.parse(text);
        } catch (parseErr) {
          throw new Error("API_NOT_FOUND");
        }

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Ocorreu um erro ao atualizar.");
        }

        message = result.message || message;
        success = true;
      } catch (apiErr: any) {
        console.warn(
          "API de atualização falhou, iniciando contingência client-side:",
          apiErr,
        );

        const dbRole =
          configuringUser.role && configuringUser.role.includes("admin")
            ? "admin"
            : "professor";

        // Direct update via Supabase Client (RLS-backed)
        const updatePayload: any = {
          professional_name: configuringUser.professional_name,
          assigned_subjects: configuringUser.assigned_subjects || [],
          assigned_classes: configuringUser.assigned_classes || [],
          role: dbRole,
        };

        if (configuringUser.username) {
          const safeUsername = configuringUser.username
            .toLowerCase()
            .trim()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, "");
          updatePayload.username = configuringUser.username
            .toLowerCase()
            .trim();
          updatePayload.email = `${safeUsername}@cps.local`;
        }

        const { error: dbError } = await supabase
          .from("users")
          .update(updatePayload)
          .eq("uid", configuringUser.uid);

        if (dbError) {
          throw new Error(
            `Falha ao atualizar tabela users diretamente: ${dbError.message}`,
          );
        }

        // Sync to allowed_professors table as well
        if (configuringUser.email) {
          try {
            await supabase
              .from("allowed_professors")
              .update({
                full_name: configuringUser.professional_name,
                assigned_subjects: configuringUser.assigned_subjects || [],
              })
              .eq("email", configuringUser.email);
          } catch (allowedErr: any) {
            console.warn(
              "Allowed professors sync in contingency failed:",
              allowedErr.message || allowedErr,
            );
          }
        }

        success = true;
      }

      if (success) {
        alert(message);
        setConfiguringUser(null);
        fetchAllowed(); // reload
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.message || "";
      if (
        msg.includes("Refresh Token Not Found") ||
        msg.includes("Invalid Refresh Token")
      ) {
        alert(
          "Sua sessão expirou. Por favor, atualize a página e faça login novamente para salvar as configurações.",
        );
      } else if (
        msg.toLowerCase().includes("failed to fetch") ||
        msg.toLowerCase().includes("load failed") ||
        msg.toLowerCase().includes("network error")
      ) {
        console.warn("Background fetch failed in AdminView (Squashed):", msg);
        return;
      } else {
        alert(`Erro: ${msg}`);
      }
    } finally {
      setConfigLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resettingPwUser || !newPwVal) return;
    setLoading(true);
    try {
      await onResetPassword(resettingPwUser.uid, newPwVal);
      confetti({
        particleCount: 100,
        spread: 90,
        origin: { y: 0.6 },
        colors: ["#5ac8fa", "#007aff", "#ff3b30"],
      });
      alert(`Senha de ${resettingPwUser.email} redefinida com sucesso!`);
      setResettingPwUser(null);
      setNewPwVal("");
    } catch (err: any) {
      alert("Erro ao redefinir senha: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProfessor = (targetUser: any) => {
    if (targetUser.email?.toLowerCase() === "cps@cps.local") {
      alert("O administrador geral do colégio não pode ser excluído.");
      return;
    }

    if (targetUser.uid === user.id) {
      alert(
        "Você não pode excluir sua própria conta enquanto estiver conectado.",
      );
      return;
    }

    setDeletingUser(targetUser);
    setDeleteInputPassword("");
  };

  const handleDeleteProfessorConfirmed = async () => {
    if (!deletingUser) return;

    const savedPassword =
      localStorage.getItem("cps_delete_professor_password") || "0";
    if (deleteInputPassword.trim() !== savedPassword) {
      alert("Senha de exclusão incorreta! Operação cancelada.");
      return;
    }

    setLoading(true);
    try {
      const sessionRes = await supabase.auth.getSession();
      const adminToken = sessionRes.data.session?.access_token;

      if (!adminToken) {
        throw new Error("Não foi possível autenticar a sessão administrativa.");
      }

      let success = false;
      try {
        const response = await fetch("/api/admin/delete-professor", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            targetUid: deletingUser.uid,
            email: deletingUser.email,
            adminToken,
          }),
        });

        const text = await response.text();
        let result: any = {};
        try {
          result = JSON.parse(text);
        } catch (e) {
          throw new Error("API_NOT_FOUND");
        }

        if (!response.ok) {
          throw new Error(result.error || "Erro ao excluir professor.");
        }
        success = true;
      } catch (apiErr: any) {
        console.warn(
          "API de exclusão falhou, iniciando contingência client-side:",
          apiErr,
        );

        // Contingência client-side usando RLS do administrador logado
        const { error: allowedDeleteErr } = await supabase
          .from("allowed_professors")
          .delete()
          .eq("email", deletingUser.email);

        if (allowedDeleteErr) {
          throw new Error(
            `Falha ao excluir e-mail cadastrado em allowed_professors: ${allowedDeleteErr.message}`,
          );
        }

        const { error: userDeleteErr } = await supabase
          .from("users")
          .delete()
          .eq("uid", deletingUser.uid);

        if (userDeleteErr) {
          throw new Error(
            `Falha ao excluir perfil escolar do docente em users: ${userDeleteErr.message}`,
          );
        }

        success = true;
      }

      if (success) {
        alert("Professor(a) excluído(a) com sucesso!");
        setDeletingUser(null);
        setDeleteInputPassword("");
        fetchAllowed();
      }
    } catch (err: any) {
      alert(
        "Erro ao excluir professor: " + (err.message || "Erro desconhecido."),
      );
    } finally {
      setLoading(false);
    }
  };

  const saveInfo = (newInfo: any) => {
    setSchoolInfoState(newInfo);
    saveSchoolInfo(newInfo);
  };

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim()) return;
    if (schoolInfo.subjects.includes(newSubject.trim())) {
      alert("Esta disciplina já existe.");
      return;
    }
    saveInfo({
      ...schoolInfo,
      subjects: [...schoolInfo.subjects, newSubject.trim()],
    });
    setNewSubject("");
  };

  const handleRemoveSubject = (subject: string) => {
    saveInfo({
      ...schoolInfo,
      subjects: schoolInfo.subjects.filter((s: string) => s !== subject),
    });
  };

  const handleEditSubjectSave = (oldName: string, newName: string) => {
    if (!newName.trim() || oldName === newName.trim()) {
      setEditingSubject(null);
      return;
    }
    if (schoolInfo.subjects.includes(newName.trim())) {
      alert("Esta disciplina já existe.");
      return;
    }
    
    // Update the subject in schoolInfo
    const updatedSubjects = schoolInfo.subjects.map((s: string) => s === oldName ? newName.trim() : s);
    
    saveInfo({
      ...schoolInfo,
      subjects: updatedSubjects,
    });
    setEditingSubject(null);
  };

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClass.trim()) return;
    if (schoolInfo.classes.includes(newClass.trim())) {
      alert("Esta turma já existe.");
      return;
    }
    saveInfo({
      ...schoolInfo,
      classes: [...schoolInfo.classes, newClass.trim()],
      classShifts: {
        ...(schoolInfo.classShifts || {}),
        [newClass.trim()]: newClassShift
      },
      classModalities: {
        ...(schoolInfo.classModalities || {}),
        [newClass.trim()]: newClassModality
      }
    });
    setNewClass("");
  };

  const handleRemoveClass = (cls: string) => {
    const updatedShifts = { ...(schoolInfo.classShifts || {}) };
    delete updatedShifts[cls];
    const updatedModalities = { ...(schoolInfo.classModalities || {}) };
    delete updatedModalities[cls];
    saveInfo({
      ...schoolInfo,
      classShifts: updatedShifts,
      classModalities: updatedModalities,
      classes: schoolInfo.classes.filter((c: string) => c !== cls),
    });
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    const cleanCat = newCategory.trim();
    const currentCats =
      schoolInfo.examCategories || DEFAULT_SCHOOL_INFO.examCategories;
    if (currentCats.includes(cleanCat)) {
      alert("Esta categoria já existe.");
      return;
    }
    const updatedCats = [...currentCats, cleanCat];
    saveInfo({ ...schoolInfo, examCategories: updatedCats });
    setNewCategory("");
  };

  const handleRemoveCategory = (cat: string) => {
    const currentCats =
      schoolInfo.examCategories || DEFAULT_SCHOOL_INFO.examCategories;
    if (currentCats.length <= 1) {
      alert("A escola precisa ter pelo menos uma categoria de avaliação.");
      return;
    }
    if (
      !confirm(
        `Deseja realmente remover a categoria "${cat}"? Isso não apagará as provas já criadas, mas ela sairá das opções.`,
      )
    )
      return;
    const updatedCats = currentCats.filter((c) => c !== cat);
    saveInfo({ ...schoolInfo, examCategories: updatedCats });
  };

  const handleToggleClassSubject = (cls: string, sub: string) => {
    const currentSubjects = schoolInfo.class_subjects[cls] || [];
    const newSubjects = currentSubjects.includes(sub)
      ? currentSubjects.filter((s) => s !== sub)
      : [...currentSubjects, sub];

    saveInfo({
      ...schoolInfo,
      class_subjects: {
        ...schoolInfo.class_subjects,
        [cls]: newSubjects,
      },
    });
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !fullName || !password) {
      alert("Por favor, preencha todos os campos (usuário, nome e senha).");
      return;
    }
    setLoading(true);
    try {
      let success = false;
      try {
        const response = await fetch("/api/admin/create-professor", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: username.toLowerCase().trim(),
            fullName: fullName.trim(),
            password: password,
            assignedSubjects: selectedSubjects,
            assignedClasses: selectedClasses,
            role: selectedRoles.join(","),
          }),
        });

        const text = await response.text();
        let result: any = {};
        try {
          result = JSON.parse(text);
        } catch (parseErr) {
          throw new Error("API_NOT_FOUND");
        }

        if (!response.ok) {
          throw new Error(result.error || "Erro ao criar professor.");
        }
        success = true;
      } catch (apiErr: any) {
        console.warn(
          "API de criação falhou, iniciando contingência client-side:",
          apiErr,
        );
        // Contingência client-side usando um cliente temporário para registrar o docente no Supabase Auth
        // sem corromper ou desconectar a sessão do administrador atual!
        const email = `${username.toLowerCase().trim()}@cps.local`;
        const finalPassword = password + "_cpsAuth";

        const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || "";
        const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || "";
        if (!supabaseUrl || !supabaseAnonKey) {
          alert("Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY precisam estar configuradas no arquivo .env para criar contas.");
          setLoading(false);
          return;
        }

        // Cria o cliente temporário sem persistência de sessão
        const tempClient: any = createClient(supabaseUrl, supabaseAnonKey, {
          auth: { persistSession: false },
        });

        let userUid = "";
        try {
          // 1. Cadastra o usuário no Supabase Auth
          const { data: authData, error: authError } =
            await tempClient.auth.signUp({
              email,
              password: finalPassword,
              options: {
                data: { displayName: fullName.trim() },
              },
            });

          if (authError) {
            const errMsg = authError.message.toLowerCase();
            const isAlready =
              errMsg.includes("already") ||
              errMsg.includes("exist") ||
              errMsg.includes("registrado");
            if (!isAlready) {
              throw authError;
            }
          }

          if (authData?.user?.id) {
            userUid = authData.user.id;
          }
        } catch (authErr: any) {
          console.warn("Aviso no Auth signup da contingência:", authErr);
        }

        // 2. Insere/Atualiza autorização na tabela allowed_professors usando o cliente do admin ativo
        const { data: existingAllowed } = await supabase
          .from("allowed_professors")
          .select("id")
          .eq("email", email)
          .maybeSingle();

        if (existingAllowed) {
          const { error: allowedErr } = await supabase
            .from("allowed_professors")
            .update({
              username: username.toLowerCase().trim(),
              full_name: fullName.trim(),
              assigned_subjects: selectedSubjects || [],
            })
            .eq("email", email);

          if (allowedErr)
            throw new Error(
              `Falha ao autorizar em allowed_professors via contingência: ${allowedErr.message}`,
            );
        } else {
          const { error: allowedErr } = await supabase
            .from("allowed_professors")
            .insert([
              {
                email,
                username: username.toLowerCase().trim(),
                full_name: fullName.trim(),
                assigned_subjects: selectedSubjects || [],
              },
            ]);

          if (allowedErr)
            throw new Error(
              `Falha ao autorizar em allowed_professors via contingência: ${allowedErr.message}`,
            );
        }

        // 3. Opcionalmente já insere/atualiza o perfil correspondente na tabela users
        const { data: existingUser } = await supabase
          .from("users")
          .select("uid")
          .eq("email", email)
          .maybeSingle();

        const finalUid = userUid || existingUser?.uid;

        if (finalUid) {
          const dbRole =
            selectedRoles && selectedRoles.includes("admin")
              ? "admin"
              : "professor";

          if (existingUser) {
            const { error: usersErr } = await supabase
              .from("users")
              .update({
                uid: finalUid,
                username: username.toLowerCase().trim(),
                professional_name: fullName.trim(),
                role: dbRole,
                assigned_subjects: selectedSubjects || [],
                assigned_classes: selectedClasses || [],
              })
              .eq("email", email);

            if (usersErr)
              console.warn(
                "Aviso ao atualizar perfil em users via contingência:",
                usersErr,
              );
          } else {
            const { error: usersErr } = await supabase.from("users").insert([
              {
                uid: finalUid,
                email: email,
                username: username.toLowerCase().trim(),
                professional_name: fullName.trim(),
                role: dbRole,
                assigned_subjects: selectedSubjects || [],
                assigned_classes: selectedClasses || [],
              },
            ]);

            if (
              usersErr &&
              !usersErr.message.includes("unique") &&
              !usersErr.message.includes("duplicate")
            ) {
              console.warn(
                "Aviso ao criar perfil em users via contingência:",
                usersErr,
              );
            }
          }
        } else {
          const dbRole =
            selectedRoles && selectedRoles.includes("admin")
              ? "admin"
              : "professor";
          // Se não há um UID gerado pelo Auth SignUp, criamos um UUID randômico para não impedir a criação do docente
          const tempUid = crypto.randomUUID();
          const { error: usersErr } = await supabase.from("users").insert([
            {
              uid: tempUid,
              email: email,
              username: username.toLowerCase().trim(),
              professional_name: fullName.trim(),
              role: dbRole,
              assigned_subjects: selectedSubjects || [],
              assigned_classes: selectedClasses || [],
            },
          ]);
          if (
            usersErr &&
            !usersErr.message.includes("unique") &&
            !usersErr.message.includes("duplicate")
          ) {
            console.warn(
              "Aviso ao criar perfil com UUID temporário em users via contingência:",
              usersErr,
            );
          }
        }

        success = true;
      }

      if (success) {
        setUsername("");
        setFullName("");
        setPassword("");
        setSelectedSubjects([]);
        setSelectedClasses([]);
        setSelectedRoles(["professor"]);
        setIsCreateUserModalOpen(false);
        alert("Professor cadastrado e autorizado com sucesso!");
        fetchAllowed();
      }
    } catch (err: any) {
      console.error(err);
      alert("Erro ao criar professor: " + (err.message || "Erro desconhecido"));
    } finally {
      setLoading(false);
    }
  };

  const openEditStudentModal = (st: Student) => {
    setEditingStudent(st);
    setStudName(st.name);
    setStudClass(st.classId);
    setStudReg(st.registrationNumber || "");
    setStudStatus(st.status || "Ativo");
    setStudTransferDate(st.transferDate || "");
    setStudBirth(st.birthDate || "");
    setStudGuardian(st.guardianName || "");
    setStudMother(st.motherName || "");
    setStudFather(st.fatherName || "");
    setStudFinancial(st.financialGuardian || "");
    setStudPhone(st.phone || "");
    setStudPhone2(st.phone2 || "");
    setStudEmail(st.email || "");
    setStudRG(st.rg || "");
    setStudCPF(st.cpf || "");
    setStudNotes(st.notes || "");
    setStudPhotoUrl(st.photoUrl || "");
    setStudAgendaAccess(st.agendaAccess || {});
    setIsCreateStudentModalOpen(true);
  };

  const openAddStudentModal = () => {
    setEditingStudent(null);
    setStudName("");
    setStudClass("");
    setStudReg("");
    setStudStatus("Ativo");
    setStudTransferDate("");
    setStudBirth("");
    setStudGuardian("");
    setStudMother("");
    setStudFather("");
    setStudFinancial("");
    setStudPhone("");
    setStudPhone2("");
    setStudEmail("");
    setStudRG("");
    setStudCPF("");
    setStudNotes("");
    setStudPhotoUrl("");
    setStudAgendaAccess({});
    setIsCreateStudentModalOpen(true);
  };

  const closeStudentModal = () => {
    setEditingStudent(null);
    setStudName("");
    setStudClass("");
    setStudReg("");
    setStudStatus("Ativo");
    setStudTransferDate("");
    setStudBirth("");
    setStudGuardian("");
    setStudMother("");
    setStudFather("");
    setStudFinancial("");
    setStudPhone("");
    setStudPhone2("");
    setStudEmail("");
    setStudRG("");
    setStudCPF("");
    setStudNotes("");
    setStudAgendaAccess({});
    setIsCreateStudentModalOpen(false);
  };

  // Student filtering & statistics
  const studentsList: (Student & { yearKey: string })[] = [];
  Object.entries(schoolInfo.studentsDB || {}).forEach(
    ([yk, arr]: [string, any]) => {
      if (Array.isArray(arr)) {
        arr.forEach((st: any) => {
          studentsList.push({ ...st, yearKey: yk });
        });
      }
    },
  );

  const filteredStudentsList = studentsList.filter((st) => {
    if (studFilterSearch.trim()) {
      const searchTerm = studFilterSearch.toLowerCase().trim();
      const matchesName = st.name.toLowerCase().includes(searchTerm);
      const matchesRA = (st.registrationNumber || "")
        .toLowerCase()
        .includes(searchTerm);
      const matchesGuardian = (st.guardianName || "")
        .toLowerCase()
        .includes(searchTerm);
      if (!matchesName && !matchesRA && !matchesGuardian) return false;
    }
    if (studFilterClass !== "TODAS" && st.classId !== studFilterClass) {
      return false;
    }
    if (studFilterStatus !== "TODOS") {
      const currentStatus = st.status || "Ativo";
      if (currentStatus !== studFilterStatus) return false;
    }
    return true;
  });

  filteredStudentsList.sort((a, b) => a.name.localeCompare(b.name));

  const countAdmins = networkUsers.filter(
    (u) =>
      (u.role || "").includes("admin") ||
      (u.role || "").includes("vice_diretor"),
  ).length;
  const countCoordinators = networkUsers.filter((u) =>
    (u.role || "").includes("coordenador"),
  ).length;
  const countProfessors = networkUsers.filter(
    (u) => (u.role || "").includes("professor") || !u.role,
  ).length;

  const countStudentsActive = studentsList.filter(
    (s) => (s.status || "Ativo") === "Ativo",
  ).length;
  const countStudentsInactive = studentsList.filter(
    (s) => (s.status || "Ativo") === "Inativo",
  ).length;
  const countStudentsTransferred = studentsList.filter(
    (s) => (s.status || "Ativo") === "Transferido",
  ).length;

  const sortedClasses = [...schoolInfo.classes].sort();
  const sortedSubjects = [...schoolInfo.subjects].sort();

  const infantilClasses = schoolInfo.classes.filter(
    (c) =>
      schoolInfo.classModalities?.[c] === "infantil" ||
      (!schoolInfo.classModalities?.[c] && (
        c.toLowerCase().includes("maternal") ||
        c.toLowerCase().includes("jardim") ||
        c.toLowerCase().includes("pré") ||
        c.toLowerCase().includes("infantil")
      )),
  );

  const fund1Classes = schoolInfo.classes.filter(
    (c) =>
      schoolInfo.classModalities?.[c] === "fund1" ||
      (!schoolInfo.classModalities?.[c] && (
        !infantilClasses.includes(c) &&
        (/^[1-5]/g.test(c) ||
          c.toLowerCase().includes("1º") ||
          c.toLowerCase().includes("2º") ||
          c.toLowerCase().includes("3º") ||
          c.toLowerCase().includes("4º") ||
          c.toLowerCase().includes("5º"))
      )),
  );

  const fund2Classes = schoolInfo.classes.filter(
    (c) =>
      schoolInfo.classModalities?.[c] === "fund2" ||
      (!schoolInfo.classModalities?.[c] && (
        !infantilClasses.includes(c) &&
        (/^[6-9]/g.test(c) ||
          c.toLowerCase().includes("6º") ||
          c.toLowerCase().includes("7º") ||
          c.toLowerCase().includes("8º") ||
          c.toLowerCase().includes("9º"))
      )),
  );

  const otherClasses = schoolInfo.classes.filter(
    (c) =>
      !infantilClasses.includes(c) &&
      !fund1Classes.includes(c) &&
      !fund2Classes.includes(c),
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24">
      <ViewHeader
        title="Painel Administrativo"
        subtitle="Gerenciamento centralizado de equipe acadêmica, turmas, disciplinas e matrículas estudantis."
        icon={<UserCog className="w-5 h-5 text-gold" />}
        badge="Painel de Controle"
      >
        <div className="flex bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-800 select-none gap-0.5 sm:gap-1 overflow-x-auto whitespace-nowrap scrollbar-none w-full max-w-full md:flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab("users")}
            className={cn(
              "flex-1 sm:flex-none px-2 sm:px-4 py-2 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer shrink-0",
              activeTab === "users"
                ? "bg-slate-900 text-white dark:bg-slate-700 shadow-sm"
                : "text-slate-700 dark:text-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-700 dark:text-slate-200",
            )}
          >
            <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Equipe</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("students");
              setEditingStudent(null);
            }}
            className={cn(
              "flex-1 sm:flex-none px-2 sm:px-4 py-2 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer shrink-0",
              activeTab === "students"
                ? "bg-slate-900 text-white dark:bg-slate-700 shadow-sm"
                : "text-slate-700 dark:text-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-700 dark:text-slate-200",
            )}
          >
            <GraduationCap className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Alunos</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("justifications");
              setEditingStudent(null);
            }}
            className={cn(
              "flex-1 sm:flex-none px-2 sm:px-4 py-2 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer shrink-0",
              activeTab === "justifications"
                ? "bg-slate-900 text-white dark:bg-slate-700 shadow-sm"
                : "text-slate-700 dark:text-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-700 dark:text-slate-200",
            )}
          >
            <ClipboardList className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Atestados &amp; Justificativas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("school")}
            className={cn(
              "flex-1 sm:flex-none px-2 sm:px-4 py-2 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer shrink-0",
              activeTab === "school"
                ? "bg-slate-900 text-white dark:bg-slate-700 shadow-sm"
                : "text-slate-700 dark:text-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-700 dark:text-slate-200",
            )}
          >
            <School className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Escola</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("productivity")}
            className={cn(
              "flex-1 sm:flex-none px-2 sm:px-4 py-2 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer shrink-0",
              activeTab === "productivity"
                ? "bg-slate-900 text-white dark:bg-slate-700 shadow-sm"
                : "text-slate-700 dark:text-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-700 dark:text-slate-200",
            )}
          >
            <BarChart3 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Produtividade</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("login_history" as any)}
            className={cn(
              "flex-1 sm:flex-none px-2 sm:px-4 py-2 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer shrink-0",
              (activeTab as any) === "login_history"
                ? "bg-slate-900 text-white dark:bg-slate-700 shadow-sm"
                : "text-slate-700 dark:text-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-700 dark:text-slate-200",
            )}
          >
            <ShieldAlert className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Logins</span>
          </button>

        </div>
      </ViewHeader>

      {/* WARNING DE CONFIG SUPABASE DE FORMA POLIDA */}
      {!isServerConfigured && (
        <div className="bg-rose-50 border border-rose-200/60 p-5 rounded-2xl dark:bg-rose-950/10 dark:border-rose-900/30 flex items-start gap-4">
          <div className="p-2.5 bg-white dark:bg-slate-900 shadow-sm border border-rose-100 dark:border-rose-900/40 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-rose-900 dark:text-rose-400 uppercase tracking-tight text-sm">
              Chave Servidora Ausente
            </h3>
            <p className="text-xs text-rose-700 dark:text-rose-300/80 leading-relaxed mt-1">
              A <code>SUPABASE_SERVICE_ROLE_KEY</code> não foi encontrada ou
              configurada nos Secrets da aplicação. Sem essa chave, comandos
              como criação automática de usuários e redefinição remota de senhas
              retornarão erro. Por favor, adicione esta chave secreta do console
              Supabase em <b>Settings &gt; Secrets</b> no AI Studio.
            </p>
          </div>
        </div>
      )}

      {/* --- ABA DOS USUÁRIOS (EQUIPE) --- */}
      <AnimatePresence mode="wait">
        {activeTab === "users" && (
          <motion.div
            key="users-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* CARDS COM MÉTRICAS CHAVES DA EQUIPE */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 select-none">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 block tracking-widest">
                  Colaboradores
                </span>
                <span className="text-base font-black text-slate-700 dark:text-slate-200 dark:text-white mt-1 block leading-none">
                  {networkUsers.length}
                </span>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-bold block mt-1.5 uppercase">
                  Membros Registrados
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 block tracking-widest">
                  Administradores
                </span>
                <span className="text-base font-black text-slate-700 dark:text-slate-200 dark:text-white mt-1 block leading-none">
                  {countAdmins}
                </span>
                <span className="text-[10px] text-indigo-600 font-bold block mt-1.5 uppercase">
                  Direção
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 block tracking-widest">
                  Coordenadores
                </span>
                <span className="text-base font-black text-slate-700 dark:text-slate-200 dark:text-white mt-1 block leading-none">
                  {countCoordinators}
                </span>
                <span className="text-[10px] text-purple-600 font-bold block mt-1.5 uppercase">
                  Orientadores / Liderança
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 block tracking-widest">
                  Professores
                </span>
                <span className="text-base font-black text-slate-700 dark:text-slate-200 dark:text-white mt-1 block leading-none">
                  {countProfessors}
                </span>
                <span className="text-[10px] text-teal-600 font-bold block mt-1.5 uppercase">
                  Corpo de Docentes
                </span>
              </div>
            </div>

            {/* CONFIGURAÇÃO DE SEGURANÇA: EXCLUSÃO DE PROFESSORES */}
            <div className="bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl shrink-0">
                  <ShieldAlert className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-amber-850 dark:text-amber-300 uppercase tracking-wider">
                    Segurança de Exclusão de Professor
                  </h4>
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 font-bold uppercase tracking-widest mt-0.5">
                    Senha de confirmação necessária para excluir qualquer
                    professor do sistema. Senha atual:{" "}
                    <code className="bg-amber-200/50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded font-mono font-black text-amber-900 dark:text-amber-200">
                      {deletePassword}
                    </code>
                  </p>
                </div>
              </div>

              {!isChangingDeletePassword ? (
                <button
                  type="button"
                  onClick={() => {
                    setNewDeletePassword(deletePassword);
                    setIsChangingDeletePassword(true);
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-[10px] font-black tracking-wider uppercase rounded-xl transition-all flex items-center gap-1.5 cursor-pointer self-start md:self-auto shadow-sm"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Modificar Senha</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <input
                    type="text"
                    value={newDeletePassword}
                    onChange={(e) => setNewDeletePassword(e.target.value)}
                    placeholder="Nova senha de exclusão"
                    className="px-3 py-1.5 text-[11px] font-black uppercase text-slate-800 dark:text-slate-200 dark:text-white bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-900/50 rounded-xl outline-none w-full md:w-44 focus:ring-1 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleSaveDeletePassword}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase rounded-xl transition-all cursor-pointer whitespace-nowrap"
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsChangingDeletePassword(false)}
                    className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-black uppercase rounded-xl transition-all cursor-pointer whitespace-nowrap"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>

            {/* DIRECTÓRIO DE EQUIPE - FILTRAGEM E AÇÕES */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 dark:text-white uppercase tracking-wider">
                    Diretório Escolar
                  </h3>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">
                    Gerencie logins, senhas, cargos e vínculos de disciplinas
                  </p>
                </div>

                {/* BOTÃO PARA CADASTRAR NOVO - CONFORME EXIGIDO PELO USUÁRIO (NADA Inline MAIS!) */}
                <button
                  onClick={() => setIsCreateUserModalOpen(true)}
                  className="w-full sm:w-auto px-5 py-3 bg-indigo-600 hover:bg-indigo-550 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Cadastrar Colaborador</span>
                </button>
              </div>

              {/* BARRA DE PESQUISA */}
              <div className="relative mb-6">
                <Search className="w-4.5 h-4.5 text-slate-600 dark:text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filtrar por nome do professor ou endereço de e-mail registrado..."
                  value={professorSearch}
                  onChange={(e) => setProfessorSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 dark:bg-slate-900/30 dark:text-white outline-none focus:ring-2 focus:ring-indigo-120 dark:focus:ring-indigo-900/20 focus:border-indigo-500 transition-all font-semibold text-sm placeholder-slate-400"
                />
              </div>

              {/* LISTAGEM MODERNIZADA COM CARDS DE USUÁRIOS */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {networkUsers
                  .filter((u) => {
                    const term = professorSearch.toLowerCase().trim();
                    if (!term) return true;
                    const name = (
                      u.professional_name ||
                      u.fullName ||
                      ""
                    ).toLowerCase();
                    const email = (u.email || "").toLowerCase();
                    return name.includes(term) || email.includes(term);
                  })
                  .sort((a, b) => {
                    const roleA = (a.role || "").toLowerCase();
                    const roleB = (b.role || "").toLowerCase();

                    const isAdmA = [
                      "admin",
                      "coordenador_all",
                      "coordenador_fund1",
                      "coordenador_fund2",
                      "secretaria_all",
                      "secretaria_fund1",
                      "secretaria_fund2",
                    ].includes(roleA);
                    const isAdmB = [
                      "admin",
                      "coordenador_all",
                      "coordenador_fund1",
                      "coordenador_fund2",
                      "secretaria_all",
                      "secretaria_fund1",
                      "secretaria_fund2",
                    ].includes(roleB);

                    if (isAdmA && !isAdmB) return -1;
                    if (!isAdmA && isAdmB) return 1;

                    // Same group - sort alphabetically by displayName
                    const nameA = (
                      a.professional_name ||
                      a.fullName ||
                      a.email?.split("@")[0] ||
                      ""
                    ).toLowerCase();
                    const nameB = (
                      b.professional_name ||
                      b.fullName ||
                      b.email?.split("@")[0] ||
                      ""
                    ).toLowerCase();
                    return nameA.localeCompare(nameB, "pt", {
                      sensitivity: "base",
                    });
                  })
                  .map((item, idx) => {
                    const isMaster =
                      item.email?.toLowerCase() === "cps@cps.local";
                    const assignmentsCount =
                      (item.assigned_subjects?.length || 0) +
                      (item.assigned_classes?.length || 0);
                    const displayName =
                      item.professional_name ||
                      item.fullName ||
                      item.email?.split("@")[0] ||
                      "Docente sem Nome";

                    const initials = displayName
                      .split(" ")
                      .filter(Boolean)
                      .map((n: string) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();

                    const roleMap: Record<
                      string,
                      { label: string; color: string }
                    > = {
                      admin: {
                        label: "Admin Geral",
                        color:
                          "bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-950/20 dark:text-rose-405 dark:border-rose-900/30",
                      },
                      vice_diretor: {
                        label: "Vice-Diretor(a)",
                        color:
                          "bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-950/20 dark:text-rose-405 dark:border-rose-900/30",
                      },
                      coordenador_all: {
                        label: "Coord Geral",
                        color:
                          "bg-purple-50 text-purple-700 border-purple-200/60 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/30",
                      },
                      coordenador_fund1: {
                        label: "Coord (Fund 1)",
                        color:
                          "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30",
                      },
                      coordenador_fund2: {
                        label: "Coord (Fund 2)",
                        color:
                          "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30",
                      },
                      secretaria_all: {
                        label: "Secretaria Geral",
                        color:
                          "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30",
                      },
                      secretaria_fund1: {
                        label: "Sec (Fund 1)",
                        color:
                          "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/30",
                      },
                      secretaria_fund2: {
                        label: "Sec (Fund 2)",
                        color:
                          "bg-yellow-50 text-yellow-750 border-yellow-200 dark:bg-yellow-950/20 dark:text-yellow-405 dark:border-yellow-905/30",
                      },
                      professor: {
                        label: "Professor(a)",
                        color:
                          "bg-emerald-50 text-emerald-705 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30",
                      },
                    };

                    const activeRole = roleMap[item.role] || {
                      label: item.role || "Colaborador",
                      color:
                        "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
                    };

                    // Advanced role differentiation styling
                    const roleLower = (item.role || "").toLowerCase();
                    let cardTheme = {
                      borderLeft: "border-l-4 border-l-emerald-500",
                      bg: "bg-emerald-50/5 hover:bg-emerald-50/10 dark:bg-slate-900 border-slate-200 dark:border-slate-800",
                      badgeColor:
                        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30",
                      groupLabel: "Professor(a)",
                      icon: (
                        <GraduationCap className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ),
                    };

                    let avatarBgClass =
                      "bg-slate-900 text-white dark:bg-slate-800";

                    if (
                      roleLower.includes("admin") ||
                      roleLower.includes("vice_diretor")
                    ) {
                      cardTheme = {
                        borderLeft: "border-l-4 border-l-rose-500",
                        bg: "bg-rose-50/20 hover:bg-rose-50/35 dark:bg-rose-950/5 dark:hover:bg-rose-950/10 border-rose-200/50 dark:border-rose-900/20",
                        badgeColor:
                          "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/40",
                        groupLabel: "Diretor (Adm Geral)",
                        icon: (
                          <ShieldCheck className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        ),
                      };
                      avatarBgClass = "bg-rose-600 text-white";
                    } else if (roleLower.includes("coordenador")) {
                      cardTheme = {
                        borderLeft: "border-l-4 border-l-purple-500",
                        bg: "bg-purple-50/20 hover:bg-purple-50/35 dark:bg-purple-950/5 dark:hover:bg-purple-950/10 border-purple-200/50 dark:border-purple-900/20",
                        badgeColor:
                          "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/40",
                        groupLabel: "Coordenação",
                        icon: (
                          <BookOpen className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                        ),
                      };
                      avatarBgClass = "bg-purple-600 text-white";
                    } else if (roleLower.includes("secretaria")) {
                      cardTheme = {
                        borderLeft: "border-l-4 border-l-amber-500",
                        bg: "bg-amber-50/20 hover:bg-amber-50/35 dark:bg-amber-950/5 dark:hover:bg-amber-950/10 border-amber-200/50 dark:border-amber-900/20",
                        badgeColor:
                          "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40",
                        groupLabel: "Secretaria",
                        icon: (
                          <ClipboardList className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        ),
                      };
                      avatarBgClass = "bg-amber-500 text-white";
                    }

                    return (
                      <div
                        key={item.uid || `user-${idx}`}
                        className={cn(
                          "group hover:bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border hover:shadow-lg transition-all duration-300 flex flex-col justify-between p-5 rounded-2xl relative overflow-hidden",
                          cardTheme.borderLeft,
                          cardTheme.bg,
                        )}
                      >
                        {/* Elegant faint background accent decoration */}
                        <div className="absolute top-0 right-0 w-16 h-16 -mr-4 -mt-4 bg-slate-200 dark:bg-slate-800 rounded-full opacity-10 blur-md pointer-events-none" />

                        <div className="space-y-4">
                          <div
                            className="flex items-start justify-between gap-3 group/header cursor-pointer select-none rounded-xl hover:bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 dark:hover:bg-slate-800/50 p-2 -m-2 transition-colors"
                            onClick={() => setConfiguringUser({ ...item })}
                            title="Clique para configurar os vínculos deste servidor"
                          >
                            <div className="flex items-center gap-3">
                              {item.avatar_url || item.avatar_base64 ? (
                                <div className="relative">
                                  <img
                                    src={item.avatar_url || item.avatar_base64}
                                    alt={displayName}
                                    className="w-11 h-11 rounded-2xl object-cover shrink-0 select-none shadow-sm transition-transform duration-300 group-hover/header:-rotate-3 group-hover/header:scale-105"
                                  />
                                  <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 rounded-full p-0.5 shadow-sm opacity-0 group-hover/header:opacity-100 transition-opacity">
                                    <div className="bg-indigo-100 dark:bg-indigo-900/40 p-1 rounded-full">
                                      <Settings className="w-2 h-2 text-indigo-500" />
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="relative">
                                  <div
                                    className={cn(
                                      "w-11 h-11 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 select-none shadow-sm transition-transform duration-300 group-hover/header:-rotate-3 group-hover/header:scale-105",
                                      avatarBgClass,
                                    )}
                                  >
                                    {initials}
                                  </div>
                                  <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 rounded-full p-0.5 shadow-sm opacity-0 group-hover/header:opacity-100 transition-opacity">
                                    <div className="bg-indigo-100 dark:bg-indigo-900/40 p-1 rounded-full">
                                      <Settings className="w-2 h-2 text-indigo-500" />
                                    </div>
                                  </div>
                                </div>
                              )}
                              <div className="min-w-0 transition-transform duration-300 group-hover/header:translate-x-1">
                                <span className="flex items-center gap-1.5 text-[8px] font-black tracking-wider text-slate-600 dark:text-slate-300 uppercase">
                                  {cardTheme.icon}
                                  {cardTheme.groupLabel}
                                </span>
                                <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm truncate uppercase tracking-tight mt-0.5 group-hover/header:text-indigo-600 dark:group-hover/header:text-indigo-400 transition-colors">
                                  {displayName}
                                </h4>
                                <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium truncate mt-0.5">
                                  {item.email}
                                </p>
                              </div>
                            </div>
                            <div className="opacity-0 group-hover/header:opacity-100 transition-opacity pt-2 pr-1">
                              <Settings className="w-4 h-4 text-indigo-400/50" />
                            </div>
                          </div>

                          {/* CARGO E VÍNCULOS INFO */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-dashed border-slate-200 dark:border-slate-800">
                            {(item.role || "professor")
                              .split(",")
                              .map((r: string) => r.trim())
                              .filter(Boolean)
                              .map((roleStr: string) => {
                                const badgeDef = roleMap[roleStr] || {
                                  label: roleStr,
                                  color:
                                    "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
                                };
                                return (
                                  <span
                                    key={roleStr}
                                    className={cn(
                                      "text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shadow-sm",
                                      badgeDef.color,
                                    )}
                                  >
                                    {badgeDef.label}
                                  </span>
                                );
                              })}

                            {assignmentsCount > 0 && (
                              <span className="text-[9px] font-extrabold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 dark:bg-slate-800 px-2.5 py-0.5 rounded-full select-none">
                                {assignmentsCount} atribuições
                              </span>
                            )}
                          </div>

                          {/* LISTA RESUMIDA DE MATÉRIAS OU TURMAS SE HOUVER */}
                          {(item.assigned_classes?.length > 0 ||
                            item.assigned_subjects?.length > 0) && (
                            <div className="text-[10px] space-y-1 text-slate-600 dark:text-slate-400 py-1">
                              {item.assigned_subjects?.length > 0 && (
                                <div className="truncate">
                                  <strong className="text-slate-700 dark:text-slate-300">
                                    Aulas:
                                  </strong>{" "}
                                  {item.assigned_subjects.join(", ")}
                                </div>
                              )}
                              {item.assigned_classes?.length > 0 && (
                                <div className="truncate">
                                  <strong className="text-slate-700 dark:text-slate-300">
                                    Turmas:
                                  </strong>{" "}
                                  {item.assigned_classes.join(", ")}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* CONTROLES DE DOCENTE */}
                        <div className="flex flex-wrap items-center justify-end gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 select-none">
                          <button
                            id={`editar-btn-${item.uid || idx}`}
                            onClick={() => setConfiguringUser({ ...item })}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black tracking-wider transition-all duration-150 uppercase shadow-xs shadow-indigo-500/20 cursor-pointer"
                            title="Editar turmas e disciplinas vinculadas a este professor"
                          >
                            <Settings className="w-3.5 h-3.5" />
                            <span>Editar Vínculos</span>
                          </button>
                          <button
                            id={`senha-btn-${item.uid || idx}`}
                            onClick={() => setResettingPwUser(item)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black tracking-wider transition-all duration-150 uppercase shadow-xs shadow-amber-500/20 cursor-pointer"
                            title="Fazer redefinição de senha de segurança"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Alterar Senha</span>
                          </button>
                          {!isMaster && (
                            <button
                              id={`excluir-btn-${item.uid || idx}`}
                              onClick={() => handleDeleteProfessor(item)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black tracking-wider transition-all duration-150 uppercase shadow-xs shadow-rose-500/20 cursor-pointer"
                              title="Excluir professor permanentemente"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Excluir</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                {networkUsers.filter((u) => {
                  const term = professorSearch.toLowerCase().trim();
                  if (!term) return true;
                  const name = (
                    u.professional_name ||
                    u.fullName ||
                    ""
                  ).toLowerCase();
                  const email = (u.email || "").toLowerCase();
                  return name.includes(term) || email.includes(term);
                }).length === 0 && (
                  <div className="col-span-full text-center py-16 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 dark:bg-slate-900/10 dark:border-slate-800">
                    Nenhum colaborador registrado corresponde a este termo.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* --- ABA DOS ESTUDANTES (ALUNOS) --- */}
        {activeTab === "students" && (
          <motion.div
            key="students-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* CARDS COM MÉTRICAS CHAVES DE MATRÍCULA */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 select-none">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 block tracking-widest">
                  Alunos Matriculados
                </span>
                <span className="text-base font-black text-slate-700 dark:text-slate-200 dark:text-white mt-1 block leading-none">
                  {studentsList.length}
                </span>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-bold block mt-1.5 uppercase">
                  Capacidade Escolar Total
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 block tracking-widest">
                  Matrículas Ativas
                </span>
                <span className="text-base font-black text-emerald-600 mt-1 block leading-none">
                  {countStudentsActive}
                </span>
                <span className="text-[10px] text-emerald-500 font-bold block mt-1.5 uppercase">
                  Frequência Regular
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 block tracking-widest">
                  Transferidos
                </span>
                <span className="text-base font-black text-blue-600 mt-1 block leading-none">
                  {countStudentsTransferred}
                </span>
                <span className="text-[10px] text-blue-500 font-bold block mt-1.5 uppercase">
                  Aguardando Ficha
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 block tracking-widest">
                  Inativos / Outros
                </span>
                <span className="text-base font-black text-rose-500 mt-1 block leading-none">
                  {countStudentsInactive +
                    studentsList.filter((s) => s.status === "Cancelado").length}
                </span>
                <span className="text-[10px] text-rose-455 font-bold block mt-1.5 uppercase">
                  Matrícula Trancada
                </span>
              </div>
            </div>

            {/* FICHA - FILTRAGEM, TABELA E CADASTROS */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 dark:text-white uppercase tracking-wider">
                    Matrículas e Ficha Escolar
                  </h3>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">
                    Busque alunos, mude status de frequência, edite contatos de
                    pais
                  </p>
                </div>

                {/* BOTÃO PARA MATRICULAR NOVO (LIVRE DE INLINE!) */}
                <button
                  onClick={openAddStudentModal}
                  className="w-full sm:w-auto px-5 py-3 bg-indigo-600 hover:bg-indigo-550 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Matricular Novo Aluno</span>
                </button>
              </div>

              {/* BARRA DE FILTRAGEM MULTILINHA */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-6 select-none">
                <div className="md:col-span-6 relative">
                  <Search className="w-4 h-4 text-slate-600 dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar pelo nome completo do aluno, RA do registro escolar ou tutor responsável..."
                    value={studFilterSearch}
                    onChange={(e) => setStudFilterSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-900/40 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold text-xs placeholder-slate-400"
                  />
                </div>

                <div className="md:col-span-3">
                  <select
                    value={studFilterClass}
                    onChange={(e) => setStudFilterClass(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border transition-all font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
                  >
                    <option value="TODAS">TODAS AS TURMAS</option>
                    {infantilClasses.length > 0 && (
                      <optgroup label="Educação Infantil">
                        {infantilClasses.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </optgroup>
                    )}
                    {fund1Classes.length > 0 && (
                      <optgroup label="Ensino Fundamental I">
                        {fund1Classes.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </optgroup>
                    )}
                    {fund2Classes.length > 0 && (
                      <optgroup label="Ensino Fundamental II">
                        {fund2Classes.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </optgroup>
                    )}
                    {otherClasses.length > 0 && (
                      <optgroup label="Outras Turmas">
                        {otherClasses.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                <div className="md:col-span-3">
                  <select
                    value={studFilterStatus}
                    onChange={(e) => setStudFilterStatus(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border transition-all font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
                  >
                    <option value="TODOS">TODOS OS STATUS</option>
                    <option value="Ativo">ATIVOS (REGULARES)</option>
                    <option value="Inativo">INATIVOS (AFASTADOS)</option>
                    <option value="Transferido">TRANSFERIDOS</option>
                    <option value="Cancelado">CANCELADOS</option>
                  </select>
                </div>
              </div>

              {/* LISTAGEM DOS ALUNOS ATRIBUÍDOS */}
              <div className="space-y-3">
                {studFilterClass === "TODAS" && !studFilterSearch.trim() ? (
                  <div className="space-y-8 py-2">
                    <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/60 flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 dark:bg-slate-800 text-indigo-600 rounded-lg shrink-0">
                        <Info className="w-4 h-4" />
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-normal animate-pulse">
                        Selecione uma turma abaixo para visualizar os estudantes
                        matriculados e gerenciar suas fichas, ou utilize a busca
                        global para filtrar por nome/RA.
                      </p>
                    </div>

                    {infantilClasses.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-emerald-100 dark:border-emerald-955/20">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                          <h3 className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                            Educação Infantil
                          </h3>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2 sm:gap-3">
                          {infantilClasses.map((c, i) => {
                            const studentCount = studentsList.filter(
                              (s: any) => s.classId === c,
                            ).length;
                            return (
                              <motion.button
                                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{ type: "spring", stiffness: 300, damping: 20, delay: i * 0.03 }}
                                key={c}
                                type="button"
                                onClick={() => setStudFilterClass(c)}
                                className="p-2 sm:p-3 text-left bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl hover:border-emerald-500 dark:hover:border-emerald-550 hover:shadow-lg transition-all active:scale-[0.98] group relative overflow-hidden flex flex-col justify-between cursor-pointer"
                              >
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
                                <div className="pl-2">
                                  <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full uppercase">
                                    Infantil
                                  </span>
                                  <h4 className="text-base font-black text-slate-700 dark:text-slate-200 dark:text-white mt-1 tracking-tight group-hover:text-emerald-600 transition-colors">
                                    {c}
                                  </h4>
                                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-1 uppercase tracking-wider flex items-center gap-1">
                                    <Users className="w-3.5 h-3.5" />{" "}
                                    {studentCount}{" "}
                                    {studentCount === 1 ? "Aluno" : "Alunos"}
                                  </p>
                                </div>
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {fund1Classes.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-rose-100 dark:border-rose-955/20">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                          <h3 className="text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">
                            Ensino Fundamental I (1º ao 5º ano)
                          </h3>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2 sm:gap-3">
                          {fund1Classes.map((c, i) => {
                            const studentCount = studentsList.filter(
                              (s: any) => s.classId === c,
                            ).length;
                            return (
                              <motion.button
                                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{ type: "spring", stiffness: 300, damping: 20, delay: i * 0.03 }}
                                key={c}
                                type="button"
                                onClick={() => setStudFilterClass(c)}
                                className="p-2 sm:p-3 text-left bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl hover:border-rose-500 dark:hover:border-rose-550 hover:shadow-lg transition-all active:scale-[0.98] group relative overflow-hidden flex flex-col justify-between cursor-pointer"
                              >
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500"></div>
                                <div className="pl-2">
                                  <span className="text-[10px] font-black text-rose-500 bg-rose-50 dark:bg-rose-950/20 px-2 py-0.5 rounded-full uppercase">
                                    Fund 1
                                  </span>
                                  <h4 className="text-base font-black text-slate-700 dark:text-slate-200 dark:text-white mt-1 tracking-tight group-hover:text-rose-600 transition-colors">
                                    {c}
                                  </h4>
                                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-1 uppercase tracking-wider flex items-center gap-1">
                                    <Users className="w-3.5 h-3.5" />{" "}
                                    {studentCount}{" "}
                                    {studentCount === 1 ? "Aluno" : "Alunos"}
                                  </p>
                                </div>
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {fund2Classes.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-blue-100 dark:border-blue-955/20">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                          <h3 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                            Ensino Fundamental II (6º ao 9º ano)
                          </h3>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2 sm:gap-3">
                          {fund2Classes.map((c, i) => {
                            const studentCount = studentsList.filter(
                              (s: any) => s.classId === c,
                            ).length;
                            return (
                              <motion.button
                                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{ type: "spring", stiffness: 300, damping: 20, delay: i * 0.03 }}
                                key={c}
                                type="button"
                                onClick={() => setStudFilterClass(c)}
                                className="p-2 sm:p-3 text-left bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl hover:border-blue-500 dark:hover:border-blue-550 hover:shadow-lg transition-all active:scale-[0.98] group relative overflow-hidden flex flex-col justify-between cursor-pointer"
                              >
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
                                <div className="pl-2">
                                  <span className="text-[10px] font-black text-blue-505 bg-blue-50 dark:bg-blue-955/20 px-2 py-0.5 rounded-full uppercase">
                                    Fund 2
                                  </span>
                                  <h4 className="text-base font-black text-slate-700 dark:text-slate-200 dark:text-white mt-1 tracking-tight group-hover:text-blue-600 transition-colors">
                                    {c}
                                  </h4>
                                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-1 uppercase tracking-wider flex items-center gap-1">
                                    <Users className="w-3.5 h-3.5" />{" "}
                                    {studentCount}{" "}
                                    {studentCount === 1 ? "Aluno" : "Alunos"}
                                  </p>
                                </div>
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {otherClasses.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
                          <span className="w-2.5 h-2.5 rounded-full bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-2000"></span>
                          <h3 className="text-xs font-black text-slate-700 dark:text-slate-400 uppercase tracking-widest">
                            Outros Segmentos
                          </h3>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2 sm:gap-3">
                          {otherClasses.map((c, i) => {
                            const studentCount = studentsList.filter(
                              (s: any) => s.classId === c,
                            ).length;
                            return (
                              <motion.button
                                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{ type: "spring", stiffness: 300, damping: 20, delay: i * 0.03 }}
                                key={c}
                                type="button"
                                onClick={() => setStudFilterClass(c)}
                                className="p-2 sm:p-3 text-left bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl hover:border-slate-600 dark:hover:border-slate-500 hover:shadow-lg transition-all active:scale-[0.98] group relative overflow-hidden flex flex-col justify-between cursor-pointer"
                              >
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-2000"></div>
                                <div className="pl-2">
                                  <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full uppercase">
                                    Outros
                                  </span>
                                  <h4 className="text-base font-black text-slate-700 dark:text-slate-200 dark:text-white mt-1 tracking-tight group-hover:text-slate-605 transition-colors">
                                    {c}
                                  </h4>
                                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-1 uppercase tracking-wider flex items-center gap-1">
                                    <Users className="w-3.5 h-3.5" />{" "}
                                    {studentCount}{" "}
                                    {studentCount === 1 ? "Aluno" : "Alunos"}
                                  </p>
                                </div>
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* BACK BUTTON FOR ACTIVE CLASS FILTER */}
                    {studFilterClass !== "TODAS" && (
                      <div className="mb-4 flex items-center justify-between bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800/60">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">
                            Filtro Ativo: Turma{" "}
                            <span className="text-indigo-650 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 px-2 py-0.5 rounded font-black">
                              {studFilterClass}
                            </span>
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setStudFilterClass("TODAS")}
                          className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-800 text-[9px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 rounded-lg transition-all cursor-pointer"
                        >
                          Voltar para Todas as Turmas
                        </button>
                      </div>
                    )}

                    {filteredStudentsList.map((st, idx) => {
                      const currentStatus = st.status || "Ativo";
                      const statusColors = {
                        Ativo:
                          "bg-emerald-50 text-emerald-800 border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30",
                        Inativo:
                          "bg-amber-50 text-amber-800 border-amber-250 dark:bg-amber-955/20 dark:text-amber-400 dark:border-amber-910/30",
                        Transferido:
                          "bg-blue-50 text-blue-800 border-blue-250 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30",
                        Cancelado:
                          "bg-rose-50 text-rose-800 border-rose-250 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30",
                      }[currentStatus];

                      return (
                        <div
                          key={`${st.name}-${st.classId}-${idx}`}
                          className="group bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-800 dark:hover:border-slate-700 p-4 rounded-2xl transition-all duration-200 hover:shadow-sm"
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-extrabold text-slate-700 dark:text-slate-3005 text-sm uppercase tracking-tight truncate">
                                  {st.name}
                                </h4>
                                <span className="text-[9px] font-black bg-slate-900 text-white dark:bg-slate-800 px-2 py-0.5 rounded-full uppercase tracking-widest leading-none">
                                  {st.classId}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                                {st.registrationNumber && (
                                  <span className="font-mono text-[9px] font-black uppercase text-slate-505 bg-slate-300/60 dark:bg-slate-800 px-1.5 py-0.5 rounded select-none">
                                    {st.registrationNumber}
                                  </span>
                                )}
                                {st.birthDate && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                                    Nasc:{" "}
                                    {st.birthDate
                                      .split("-")
                                      .reverse()
                                      .join("/")}
                                  </span>
                                )}
                                {st.guardianName && (
                                  <span className="truncate max-w-[170px]">
                                    Responsável: {st.guardianName}
                                  </span>
                                )}
                                {st.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                                    {st.phone}
                                  </span>
                                )}
                                {st.transferDate &&
                                  currentStatus === "Transferido" && (
                                    <span className="text-blue-600 font-bold dark:text-blue-400">
                                      Transf:{" "}
                                      {st.transferDate
                                        .split("-")
                                        .reverse()
                                        .join("/")}
                                    </span>
                                  )}
                              </div>

                              {st.notes && (
                                <p
                                  className="text-[10px] text-slate-600 dark:text-slate-300 italic mt-2 border-t border-dashed border-slate-200 dark:border-slate-800 pt-1 leading-normal max-w-4xl truncate"
                                  title={st.notes}
                                >
                                  Obs: {st.notes}
                                </p>
                              )}
                            </div>

                            {/* STATUS BADGE E CONTROLES (EDIT/DELETE) */}
                            <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                              <span
                                className={cn(
                                  "text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border",
                                  statusColors,
                                )}
                              >
                                {currentStatus}
                              </span>

                              <div className="flex items-center gap-1 select-none">
                                <button
                                  onClick={() => openEditStudentModal(st)}
                                  className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-indigo-650 hover:bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                  title="Editar dados da matrícula"
                                >
                                  <Settings className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (
                                      !confirm(
                                        `Deseja realmente excluir a ficha escolar de ${st.name}? Esta operação é irreversível.`,
                                      )
                                    )
                                      return;
                                    const updatedDB = {
                                      ...schoolInfo.studentsDB,
                                    };
                                    if (updatedDB[st.yearKey]) {
                                      updatedDB[st.yearKey] = updatedDB[
                                        st.yearKey
                                      ].filter(
                                        (s: Student) =>
                                          !(
                                            s.name === st.name &&
                                            s.classId === st.classId
                                          ),
                                      );
                                      saveInfo({
                                        ...schoolInfo,
                                        studentsDB: updatedDB,
                                      });
                                    }
                                  }}
                                  className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                  title="Apagar dados permanentemente"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {filteredStudentsList.length === 0 && (
                      <div className="text-center py-16 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 dark:bg-slate-900/10 dark:border-slate-800">
                        Nenhum aluno cadastrado corresponde aos filtros ativos.
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* --- ABA DE ATESTADOS & JUSTIFICATIVAS DE FALTAS --- */}
        {activeTab === "justifications" && (
          <motion.div
            key="justifications-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6 text-left"
          >
            <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-3xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-amber-500 text-white rounded-xl shadow-md shadow-amber-500/20">
                      <ClipboardList className="w-5 h-5" />
                    </div>
                    <h2 className="text-base font-black text-slate-700 dark:text-slate-100 uppercase tracking-tight">
                      Atestados &amp; Justificativas de Ausências
                    </h2>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-2 leading-relaxed max-w-2xl">
                    Registre atestados médicos, justificativas, declarações de
                    comparecimento e licenças. O sistema marcará as frequências
                    do aluno de forma automática e exibirá o atestado e o motivo
                    diretamente no diário do professor que leciona no período.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsJustModalOpen(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-black text-xs uppercase tracking-wider py-3.5 px-6 rounded-xl transition-all shadow-md hover:shadow-lg hover:translate-y-[-1px] shrink-0 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Lançar Justificativa
                </button>
              </div>
            </div>

            {/* BARRA DE PESQUISA */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 dark:text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar pelo nome do aluno..."
                  value={justFilterSearch}
                  onChange={(e) => setJustFilterSearch(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-11 pr-4 text-xs font-bold text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none focus:border-amber-500 tracking-wide"
                />
              </div>
            </div>

            {/* LISTAGEM DE REGISTROS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {absenceJustifications
                .filter(
                  (j) =>
                    !justFilterSearch ||
                    j.studentName
                      .toLowerCase()
                      .includes(justFilterSearch.toLowerCase()),
                )
                .map((just) => (
                  <div
                    key={just.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between gap-4"
                  >
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />

                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[9px] font-black text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded uppercase border border-amber-100/50">
                            {just.reason}
                          </span>
                          <h4 className="font-black text-slate-700 dark:text-slate-100 text-xs uppercase tracking-tight mt-1.5 leading-snug">
                            {just.studentName}
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              confirm(
                                "Tem certeza que deseja excluir esta justificativa?",
                              )
                            ) {
                              const updated = absenceJustifications.filter(
                                (x) => x.id !== just.id,
                              );
                              if (onSaveAbsenceJustifications)
                                onSaveAbsenceJustifications(updated);
                            }
                          }}
                          className="p-2 text-rose-500 hover:text-white hover:bg-rose-500 rounded-xl transition-all cursor-pointer border border-transparent hover:border-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                        <div>
                          <span className="block text-[8px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                            Início
                          </span>
                          <span className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300">
                            {new Date(
                              just.startDate + "T00:00:00",
                            ).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[8px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                            Término
                          </span>
                          <span className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300">
                            {new Date(
                              just.endDate + "T00:00:00",
                            ).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      </div>

                      {just.notes && (
                        <div className="mt-3 text-[10px] font-bold text-slate-700 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 leading-normal">
                          <span className="block text-[8px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-0.5">
                            Observações
                          </span>
                          {just.notes}
                        </div>
                      )}
                    </div>

                    {just.fileUrl && (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-[9px] font-extrabold text-slate-600 dark:text-slate-400 uppercase">
                          Documento Digitalizado:
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedJustificationImage(just.fileUrl)
                          }
                          className="text-[10px] font-extrabold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-lg border border-blue-100 transition-colors uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                        >
                          Ver Documento / Foto
                        </button>
                      </div>
                    )}
                  </div>
                ))}

              {absenceJustifications.filter(
                (j) =>
                  !justFilterSearch ||
                  j.studentName
                    .toLowerCase()
                    .includes(justFilterSearch.toLowerCase()),
              ).length === 0 && (
                <div className="col-span-full py-16 text-center text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest bg-slate-50 dark:bg-slate-900/10 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center gap-3">
                  <ClipboardList className="w-12 h-12 text-slate-700 dark:text-slate-300" />
                  <span>Nenhuma justificativa registrada correspondente.</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* --- ABA DA ESCOLA (MATRIZ INTERATIVA) --- */}
        {activeTab === "school" && (
          <motion.div
            key="school-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* BOTÃO DE DIAGNÓSTICO DO BANCO DE DADOS ("SUPER DATABASE") */}
            <div className="bg-slate-900 dark:bg-indigo-950/20 border border-slate-200 dark:border-slate-800 dark:border-indigo-500/20 rounded-3xl p-5 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <Database className="w-24 h-24 text-white" />
              </div>
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center border border-indigo-500/30">
                    <Activity className="w-6 h-6 text-indigo-400 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-white font-black text-sm uppercase tracking-wider">
                      Verificação de Integridade (Super Database)
                    </h3>
                    <p className="text-indigo-300/60 text-[10px] font-bold uppercase tracking-widest leading-tight mt-0.5">
                      Analise o status das tabelas e permissões do Supabase em
                      tempo real
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={runDatabaseDiagnosis}
                    disabled={loadingDiag}
                    className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 border border-indigo-400/30"
                  >
                    {loadingDiag ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5" />
                    )}
                    {loadingDiag ? "Varrendo Sistema..." : "Executar Varredura"}
                  </button>
                  {diagResult && (
                    <button
                      onClick={() => setDiagResult(null)}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-700"
                    >
                      Ocultar
                    </button>
                  )}
                </div>
              </div>

              {/* RESULTADOS DA VARREDURA */}
              {diagResult && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-6 border-t border-indigo-500/10 pt-6 space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* STATUS DAS TABELAS */}
                    <div className="bg-white/ border border-white/5 rounded-2xl p-5 space-y-3">
                      <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                        <Database className="w-3.5 h-3.5" /> Integridade de
                        Tabelas
                      </h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {Object.entries(diagResult.tables || {}).map(
                          ([table, status]: [string, any]) => (
                            <div
                              key={table}
                              className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0"
                            >
                              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 font-mono">
                                {table}
                              </span>
                              <span
                                className={cn(
                                  "text-[10px] font-black uppercase tracking-tight",
                                  status.toString().includes("OK")
                                    ? "text-emerald-400"
                                    : "text-rose-400",
                                )}
                              >
                                {status.toString()}
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>

                    {/* DIAGNÓSTICO ESPECÍFICO (ANTONIO) */}
                    <div className="bg-white/ border border-white/5 rounded-2xl p-5 space-y-3">
                      <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5" /> Caso Especial:
                        Antonio
                      </h4>
                      <div className="p-4 bg-slate-900 rounded-xl border border-white/5">
                        <p className="text-[11px] text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                          {diagResult.antonioRepair ||
                            "Nenhum problema detectado para esta conta específica."}
                        </p>
                        {diagResult.antonioRepair?.includes("REPAIRED") && (
                          <p className="text-[10px] text-emerald-400 font-black uppercase mt-2">
                            Corrigido!
                          </p>
                        )}
                      </div>
                      <div className="pt-2">
                        <p className="text-[9px] text-slate-700 dark:text-slate-300 uppercase font-bold tracking-tight">
                          Recomendação Geral:
                        </p>
                        <p className="text-[10px] text-indigo-300/80 font-medium italic mt-1">
                          Se o erro "Failed to fetch" persistir após o reparo,
                          verifique se a conexão de internet do usuário é
                          estável ou se ele possui extensões de navegador que
                          bloqueiam URLs dinâmicas.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* CARDS COM METRICAS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-teal-500/20 transition-all duration-300">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-teal-500"></div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-600 dark:text-slate-400 block mb-1">
                      Currículo Geral
                    </span>
                    <h4 className="text-base font-black text-slate-805 dark:text-white leading-none">
                      {schoolInfo.subjects.length}
                    </h4>
                    <p className="text-xs text-slate-405 font-medium mt-1.5 uppercase">
                      Disciplinas Cadastradas
                    </p>
                  </div>
                  <div className="p-3 bg-teal-50 dark:bg-teal-950/25 rounded-2xl text-teal-600">
                    <BookOpen className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-indigo-500/20 transition-all duration-300">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-600 dark:text-slate-400 block mb-1">
                      Organização de Salas
                    </span>
                    <h4 className="text-base font-black text-slate-700 dark:text-slate-200 dark:text-white leading-none">
                      {schoolInfo.classes.length}
                    </h4>
                    <p className="text-xs text-slate-405 font-medium mt-1.5 uppercase">
                      {infantilClasses.length} Infantil • {fund1Classes.length} Fund I • {fund2Classes.length} Fund II
                    </p>
                  </div>
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/25 rounded-2xl text-indigo-600">
                    <School className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-pink-500/20 transition-all duration-300">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-pink-500"></div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-600 dark:text-slate-400 block mb-1">
                      Avaliações
                    </span>
                    <h4 className="text-base font-black text-slate-700 dark:text-slate-200 dark:text-white leading-none">
                      {
                        (
                          schoolInfo.examCategories ||
                          DEFAULT_SCHOOL_INFO.examCategories
                        ).length
                      }
                    </h4>
                    <p className="text-xs text-slate-405 font-medium mt-1.5 uppercase">
                      Categorias de de Atividade
                    </p>
                  </div>
                  <div className="p-3 bg-pink-50 dark:bg-pink-955/25 rounded-2xl text-pink-600">
                    <Tags className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>

            {/* SEÇÃO PRINCIPAL DUAS COLUNAS */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* ESQUERDA: CADASTROS DAS ESTRUTURAS */}
              <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[400px] lg:h-[545px] flex flex-col justify-between">
                {/* SUB-TABS INTERNAS DO FORM DA ESCOLA */}
                <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-900/40 border-b border-indigo-50 dark:border-slate-800 flex gap-1 select-none shrink-0 text-slate-700 dark:text-slate-400 overflow-x-auto scrollbar-none">
                  <button
                    onClick={() => setSchoolConfigTab("subjects")}
                    className={cn(
                      "flex-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer",
                      schoolConfigTab === "subjects"
                        ? "bg-slate-900 text-white dark:bg-slate-700 shadow"
                        : "text-slate-700 dark:text-slate-300 hover:text-slate-700 dark:text-slate-200 dark:hover:text-white hover:bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 dark:hover:bg-slate-800",
                    )}
                  >
                    <BookOpen className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    <span>Disciplinas</span>
                  </button>

                  <button
                    onClick={() => setSchoolConfigTab("classes")}
                    className={cn(
                      "flex-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer",
                      schoolConfigTab === "classes"
                        ? "bg-slate-900 text-white dark:bg-slate-700 shadow"
                        : "text-slate-700 dark:text-slate-300 hover:text-slate-700 dark:text-slate-200 dark:hover:text-white hover:bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 dark:hover:bg-slate-800",
                    )}
                  >
                    <School className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    <span>Turmas</span>
                  </button>

                  <button
                    onClick={() => setSchoolConfigTab("categories")}
                    className={cn(
                      "flex-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer",
                      schoolConfigTab === "categories"
                        ? "bg-slate-900 text-white dark:bg-slate-700 shadow"
                        : "text-slate-700 dark:text-slate-300 hover:text-slate-700 dark:text-slate-200 dark:hover:text-white hover:bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 dark:hover:bg-slate-800",
                    )}
                  >
                    <Tags className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    <span>Modelos</span>
                  </button>

                  <button
                    onClick={() => setSchoolConfigTab("bimesters")}
                    className={cn(
                      "flex-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer",
                      schoolConfigTab === "bimesters"
                        ? "bg-slate-900 text-white dark:bg-slate-700 shadow"
                        : "text-slate-700 dark:text-slate-300 hover:text-slate-700 dark:text-slate-200 dark:hover:text-white hover:bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 dark:hover:bg-slate-800",
                    )}
                  >
                    <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    <span>Bimestres</span>
                  </button>
                </div>

                {/* VISUALIZAÇÕES DOS CONTEÚDOS */}
                <div className="p-6 flex-1 flex flex-col justify-between overflow-y-auto">
                  {/* CONFIG DISCIPLINAS */}
                  {schoolConfigTab === "subjects" && (
                    <div className="space-y-6 flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl p-4">
                      <form
                        onSubmit={handleAddSubject}
                        className="flex flex-col sm:flex-row gap-4 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 max-w-xl shadow-sm items-start sm:items-end"
                      >
                        <div className="w-full">
                          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 dark:text-white uppercase mb-3">Adicionar Nova Disciplina</h4>
                          <input
                            type="text"
                            placeholder="Ex: Língua Portuguesa"
                            value={newSubject}
                            onChange={(e) => setNewSubject(e.target.value)}
                            required
                            className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 dark:text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm w-full"
                          />
                        </div>
                        <button
                          type="submit"
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold uppercase text-xs w-full sm:w-auto flex items-center justify-center gap-2 transition-colors mt-2 sm:mt-0"
                        >
                          <Plus className="w-5 h-5" /> Adicionar
                        </button>
                      </form>

                      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wide border-b border-slate-200 dark:border-slate-800 pb-2">
                            Disciplinas Cadastradas ({sortedSubjects.length})
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {sortedSubjects.map((sub, idx) => (
                            <div
                              key={sub}
                              className="bg-white dark:bg-slate-900 rounded-xl px-4 py-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                            >
                              {editingSubject?.oldName === sub ? (
                                <input
                                  type="text"
                                  autoFocus
                                  className="w-full text-sm font-bold uppercase bg-slate-50 dark:bg-slate-800 border-2 border-indigo-500 rounded-lg px-2 py-1.5 outline-none dark:text-white"
                                  value={editingSubject.newName}
                                  onChange={(e) => setEditingSubject({ ...editingSubject, newName: e.target.value.toUpperCase() })}
                                  onBlur={() => handleEditSubjectSave(editingSubject.oldName, editingSubject.newName)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleEditSubjectSave(editingSubject.oldName, editingSubject.newName);
                                    if (e.key === "Escape") setEditingSubject(null);
                                  }}
                                />
                              ) : (
                                <span className="font-bold text-slate-700 dark:text-slate-200 dark:text-white text-sm uppercase break-words leading-tight flex-1">
                                  {sub}
                                </span>
                              )}
                              
                              {sub !== "Coordenação" && editingSubject?.oldName !== sub && (
                                <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0 mt-2 sm:mt-0">
                                  <button
                                    onClick={() => setEditingSubject({ oldName: sub, newName: sub })}
                                    className="text-slate-600 dark:text-slate-400 hover:text-indigo-500 transition-colors bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 dark:bg-slate-900 p-2 rounded-lg"
                                    title="Editar disciplina"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                  </button>
                                  <button
                                    onClick={() => handleRemoveSubject(sub)}
                                    className="text-slate-600 dark:text-slate-400 hover:text-rose-500 transition-colors bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 dark:bg-slate-900 p-2 rounded-lg"
                                    title="Remover disciplina"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                          </div>
                      </div>
                    </div>
                  )}

                  {/* CONFIG TURMAS */}
                  {schoolConfigTab === "classes" && (
                    <div className="space-y-6 flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl p-4">
                      <form
                        onSubmit={handleAddClass}
                        className="flex flex-col gap-4 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 max-w-xl shadow-sm"
                      >
                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 dark:text-white uppercase">Adicionar Nova Turma</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <input
                            type="text"
                            placeholder="Ex: 6º Ano A"
                            value={newClass}
                            onChange={(e) => setNewClass(e.target.value)}
                            required
                            className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 dark:text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm w-full"
                          />
                          <select
                            value={newClassShift}
                            onChange={(e) => setNewClassShift(e.target.value)}
                            className="px-4 py-3 rounded-xl border font-medium w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
                          >
                            <option value="Manhã">Manhã</option>
                            <option value="Tarde">Tarde</option>
                            <option value="Noite">Noite</option>
                          </select>
                          <select
                            value={newClassModality}
                            onChange={(e) => setNewClassModality(e.target.value as any)}
                            className="px-4 py-3 rounded-xl border font-medium w-full font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
                          >
                            <option value="infantil">Infantil 🧸</option>
                            <option value="fund1">Fundamental I 📚</option>
                            <option value="fund2">Fundamental II 🔬</option>
                          </select>
                        </div>
                        <button
                          type="submit"
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold uppercase text-xs w-full sm:w-auto self-start flex items-center gap-2 transition-colors"
                        >
                          <Plus className="w-5 h-5" /> Adicionar Turma
                        </button>
                      </form>

                      <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                        {infantilClasses.length > 0 && (
                          <div className="space-y-4">
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wide border-b border-slate-200 dark:border-slate-800 pb-2">
                              Educação Infantil
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                              {infantilClasses.map((cls: string) => (
                                <div
                                  key={cls}
                                  className="bg-white dark:bg-slate-900 rounded-xl px-3 py-3 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <span className="font-bold text-slate-700 dark:text-slate-200 dark:text-white uppercase">{cls}</span>
                                    <button
                                      onClick={() => handleRemoveClass(cls)}
                                      className="text-slate-600 dark:text-slate-400 hover:text-rose-500 transition-colors"
                                      title="Remover turma"
                                    >
                                      <X className="w-5 h-5" />
                                    </button>
                                  </div>
                                  <span className="text-xs font-medium text-slate-700 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 dark:bg-slate-900 rounded-md px-2 py-1 self-start">
                                    {schoolInfo.classShifts?.[cls] || "Manhã"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {fund1Classes.length > 0 && (
                          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wide border-b border-slate-200 dark:border-slate-800 pb-2">
                              Ensino Fundamental I
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                              {fund1Classes.map((cls: string) => (
                                <div
                                  key={cls}
                                  className="bg-white dark:bg-slate-900 rounded-xl px-3 py-3 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <span className="font-bold text-slate-700 dark:text-slate-200 dark:text-white uppercase">{cls}</span>
                                    <button
                                      onClick={() => handleRemoveClass(cls)}
                                      className="text-slate-600 dark:text-slate-400 hover:text-rose-500 transition-colors"
                                      title="Remover turma"
                                    >
                                      <X className="w-5 h-5" />
                                    </button>
                                  </div>
                                  <span className="text-xs font-medium text-slate-700 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 dark:bg-slate-900 rounded-md px-2 py-1 self-start">
                                    {schoolInfo.classShifts?.[cls] || "Manhã"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {fund2Classes.length > 0 && (
                          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wide border-b border-slate-200 dark:border-slate-800 pb-2">
                              Ensino Fundamental II
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                              {fund2Classes.map((cls: string) => (
                                <div
                                  key={cls}
                                  className="bg-white dark:bg-slate-900 rounded-xl px-3 py-3 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <span className="font-bold text-slate-700 dark:text-slate-200 dark:text-white uppercase">{cls}</span>
                                    <button
                                      onClick={() => handleRemoveClass(cls)}
                                      className="text-slate-600 dark:text-slate-400 hover:text-rose-500 transition-colors"
                                      title="Remover turma"
                                    >
                                      <X className="w-5 h-5" />
                                    </button>
                                  </div>
                                  <span className="text-xs font-medium text-slate-700 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 dark:bg-slate-900 rounded-md px-2 py-1 self-start">
                                    {schoolInfo.classShifts?.[cls] || "Manhã"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {otherClasses.length > 0 && (
                          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wide border-b border-slate-200 dark:border-slate-800 pb-2">
                              Outros Segmentos
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                              {otherClasses.map((cls: string) => (
                                <div
                                  key={cls}
                                  className="bg-white dark:bg-slate-900 rounded-xl px-3 py-3 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <span className="font-bold text-slate-700 dark:text-slate-200 dark:text-white uppercase">{cls}</span>
                                    <button
                                      onClick={() => handleRemoveClass(cls)}
                                      className="text-slate-600 dark:text-slate-400 hover:text-rose-500 transition-colors"
                                      title="Remover turma"
                                    >
                                      <X className="w-5 h-5" />
                                    </button>
                                  </div>
                                  <span className="text-xs font-medium text-slate-700 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 dark:bg-slate-900 rounded-md px-2 py-1 self-start">
                                    {schoolInfo.classShifts?.[cls] || "Manhã"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* CONFIG MODELOS DE AVALIAÇÃO */}
                  {schoolConfigTab === "categories" && (
                    <div className="space-y-6 flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl p-4">
                      <form
                        onSubmit={handleAddCategory}
                        className="flex flex-col sm:flex-row gap-4 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 max-w-xl shadow-sm items-start sm:items-end"
                      >
                       <div className="w-full">
                         <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 dark:text-white uppercase mb-3">Adicionar Modelo de Avaliação</h4>
                          <input
                            type="text"
                            placeholder="Ex: Novo Provão"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            required
                            className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 dark:text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm w-full uppercase"
                          />
                        </div>
                        <button
                          type="submit"
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold uppercase text-xs w-full sm:w-auto flex items-center justify-center gap-2 transition-colors mt-2 sm:mt-0"
                        >
                          <Plus className="w-5 h-5" /> Adicionar
                        </button>
                      </form>

                      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wide border-b border-slate-200 dark:border-slate-800 pb-2">
                             Modelos Cadastrados ({(schoolInfo.examCategories || DEFAULT_SCHOOL_INFO.examCategories).length})
                          </h4>
                          <div className="flex flex-wrap gap-3">
                          {(
                            schoolInfo.examCategories ||
                            DEFAULT_SCHOOL_INFO.examCategories
                          ).map((cat, idx) => (
                            <div
                              key={cat}
                              className="bg-white dark:bg-slate-900 rounded-xl px-4 py-3 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3"
                            >
                              <span className="font-bold text-slate-700 dark:text-slate-200 dark:text-white text-sm uppercase">{cat}</span>
                              <button
                                onClick={() => handleRemoveCategory(cat)}
                                className="text-slate-600 dark:text-slate-400 hover:text-rose-500 transition-colors p-1"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          </div>
                      </div>
                    </div>
                  )}

                  {schoolConfigTab === "bimesters" && (
                    <BimesterSettingsView
                      schoolInfo={schoolInfo}
                      saveInfo={saveInfo}
                    />
                  )}
                </div>
              </div>

              {/* DIREITA: VÍNCULOS INTERATIVOS DA MATRIZ */}
              <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[500px] lg:h-[545px] flex flex-col justify-between">
                <div className="px-6 py-4 border-b border-indigo-50 dark:bg-slate-950/20 dark:border-slate-800 shrink-0">
                  <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 dark:text-white uppercase tracking-wider">
                    Matriz Curricular Ativa
                  </h3>
                  <p className="text-[10px] text-slate-404 font-bold uppercase tracking-widest mt-0.5">
                    Defina de forma interativa quais as disciplinas de cada ano
                    curricular
                  </p>
                </div>

                {schoolInfo.classes.length === 0 ? (
                  <div className="flex-1 p-16 flex flex-col items-center justify-center text-center text-slate-405">
                    <School className="w-12 h-12 text-slate-700 dark:text-slate-300 opacity-40 mb-3" />
                    <p className="text-xs uppercase font-extrabold tracking-wider">
                      Nenhuma turma registrada. Cadastre turmas à esquerda para
                      vincular currículo.
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                    {/* TURMAS SELETOR INTERNO */}
                    <div className="w-full md:w-5/12 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 overflow-y-auto p-4 flex md:flex-col gap-1.5 md:gap-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 dark:bg-slate-950/5 select-none shrink-0 scrollbar-none">
                      {schoolInfo.classes.map((cls: string) => {
                        const activeClass =
                          selectedRelClass || schoolInfo.classes[0];
                        const isSelected = activeClass === cls;
                        const boundSubjects = (
                          schoolInfo.class_subjects[cls] || []
                        ).length;

                        return (
                          <button
                            key={cls}
                            onClick={() => setSelectedRelClass(cls)}
                            className={cn(
                              "whitespace-nowrap md:whitespace-normal px-4 py-3.5 rounded-xl flex items-center justify-between text-left font-bold text-sm transition-all border shrink-0 md:shrink",
                              isSelected
                                ? "bg-indigo-600 text-white dark:bg-indigo-500 border-transparent shadow shadow-indigo-500/20"
                                : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 cursor-pointer",
                            )}
                          >
                            <span>{cls}</span>
                            <span
                              className={cn(
                                "hidden sm:inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded-full",
                                isSelected
                                  ? "bg-white/ text-slate-900 dark:text-white"
                                  : boundSubjects > 0
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-rose-100 text-rose-700"
                              )}
                            >
                              {boundSubjects} disc.
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* DISCIPLINAS TOGGLES */}
                    {(() => {
                      const activeClass =
                        selectedRelClass || schoolInfo.classes[0];
                      const currentBound =
                        schoolInfo.class_subjects[activeClass] || [];

                      return (
                        <div className="w-full md:w-7/12 overflow-y-auto p-4 sm:p-5 space-y-5 bg-white dark:bg-slate-900">
                          <div className="flex items-center justify-between select-none border-b border-slate-200 dark:border-slate-800 pb-3">
                            <span className="text-sm font-black text-slate-700 dark:text-slate-200 dark:text-white uppercase tracking-wide">
                              Turma: <span className="text-indigo-600 dark:text-indigo-400">{activeClass}</span>
                            </span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  saveInfo({
                                    ...schoolInfo,
                                    class_subjects: {
                                      ...schoolInfo.class_subjects,
                                      [activeClass]: [...schoolInfo.subjects],
                                    },
                                  });
                                }}
                                className="w-full sm:w-auto px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold uppercase transition-colors"
                              >
                                Todas
                              </button>
                              <button
                                onClick={() => {
                                  saveInfo({
                                    ...schoolInfo,
                                    class_subjects: {
                                      ...schoolInfo.class_subjects,
                                      [activeClass]: [],
                                    },
                                  });
                                }}
                                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-xs font-bold uppercase transition-colors"
                              >
                                Limpar
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-2 select-none">
                            {sortedSubjects.map((sub) => {
                              const isChecked = currentBound.includes(sub);
                              return (
                                <div
                                  key={sub}
                                  onClick={() =>
                                    handleToggleClassSubject(activeClass, sub)
                                  }
                                  className={cn(
                                    "flex items-center justify-between px-4 py-3 rounded-xl border font-bold text-sm uppercase cursor-pointer select-none transition-all",
                                    isChecked
                                      ? "bg-indigo-50 border-indigo-200 text-indigo-900 shadow-sm dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-100"
                                      : "bg-white dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:border-slate-700",
                                  )}
                                >
                                  <span>{sub}</span>
                                  <div
                                    className={cn(
                                      "w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors",
                                      isChecked
                                        ? "bg-indigo-600 border-indigo-600 text-white"
                                        : "bg-white dark:bg-slate-900 dark:border-slate-600",
                                    )}
                                  >
                                    {isChecked && (
                                      <Check className="w-4 h-4 stroke-[3]" />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* --- ABA DE HISTÓRICO DE LOGINS --- */}
        {(activeTab as any) === "login_history" && (
          <motion.div
            key="login-history-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5 mb-6 select-none">
                <div>
                  <h3 className="font-extrabold text-slate-905 dark:text-white uppercase tracking-tight text-sm flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-amber-500" />
                    Histórico de Acessos e Tentativas de Login
                  </h3>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                    Monitoramento de logins bem-sucedidos ou tentativas com
                    credenciais incorretas
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchLoginHistory}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-705 dark:text-slate-300 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  {loadingHistory ? "Atualizando..." : "Recarregar"}
                </button>
              </div>

              {loadingHistory && loginHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-600 dark:text-slate-400 select-none">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-505 mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest">
                    Carregando Histórico de Acessos...
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                    <thead className="bg-[#800020] text-white text-white">
                <tr className="transition-colors">
                        <th className="pb-3.5 pl-2 text-white">Data/Hora</th>
                        <th className="pb-3.5 text-white">E-mail</th>
                        <th className="pb-3.5 text-white">Endereço IP</th>
                        <th className="pb-3.5 text-white">Dispositivo / Agente</th>
                        <th className="pb-3.5 text-white">Status</th>
                        <th className="pb-3.5 pr-2 text-white">Observação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/70 dark:divide-slate-800/60 font-semibold text-xs">
                      {loginHistory.map((item: any) => (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 dark:hover:bg-slate-800/10 transition-colors"
                        >
                          <td className="py-3.5 pl-2 font-mono text-[10px] text-slate-600 dark:text-slate-300">
                            {new Date(item.attempted_at).toLocaleString(
                              "pt-BR",
                            )}
                          </td>
                          <td className="py-3.5 font-bold uppercase tracking-tight text-slate-700 dark:text-slate-200 dark:text-white">
                            {item.email}
                          </td>
                          <td className="py-3.5 font-mono text-[10px] text-slate-700 dark:text-slate-300">
                            {item.ip_address || "—"}
                          </td>
                          <td
                            className="py-3.5 max-w-xs truncate text-[11px] text-slate-600 dark:text-slate-400"
                            title={item.user_agent}
                          >
                            {item.user_agent || "—"}
                          </td>
                          <td className="py-3.5">
                            <span
                              className={cn(
                                "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                                item.status === "success"
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                                  : "bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400",
                              )}
                            >
                              {item.status === "success" ? "Sucesso" : "Falhou"}
                            </span>
                          </td>
                          <td className="py-3.5 text-[11px] text-slate-600 dark:text-slate-400 italic pr-2">
                            {item.failure_reason || "—"}
                          </td>
                        </tr>
                      ))}
                      {loginHistory.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="text-center py-16 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800"
                          >
                            Nenhum registro de acesso encontrado no histórico.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* --- ABA DE HISTÓRICO DE ATIVIDADES --- */}
        {activeTab === "activity_history" && false && (
          <motion.div
            key="activity-history-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* STATS DE ATIVIDADE */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 select-none">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-extrabold uppercase tracking-widest block">Total de Atividades</span>
                <span className="text-base font-black text-slate-700 dark:text-slate-200 dark:text-white mt-1 block">{loadingActivity ? "..." : activityStats.total}</span>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-extrabold uppercase tracking-widest block">Ações em Provas</span>
                <span className="text-base font-black text-blue-600 dark:text-blue-400 mt-1 block">{loadingActivity ? "..." : activityStats.examChanges}</span>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-extrabold uppercase tracking-widest block">Notas Lançadas</span>
                <span className="text-base font-black text-violet-600 dark:text-violet-400 mt-1 block">{loadingActivity ? "..." : activityStats.gradeChanges}</span>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-extrabold uppercase tracking-widest block">Relatórios Emitidos</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-1 block">{loadingActivity ? "..." : activityStats.reportChanges}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5 mb-6 select-none">
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-slate-100 dark:text-white uppercase tracking-tight text-sm flex items-center gap-2">
                    <Activity className="w-5 h-5 text-indigo-500" />
                    Histórico de Auditoria e Atividade Docente
                  </h3>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                    Histórico consolidado de alterações ou criações de provas, notas e relatórios observacionais
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchActivityHistory}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  {loadingActivity ? "Atualizando..." : "Recarregar"}
                </button>
              </div>

              {/* FILTROS E BUSCADOR */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={activitySearch}
                    onChange={(e) => setActivitySearch(e.target.value)}
                    placeholder="Buscar por descrição, nome ou email..."
                    className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 w-full transition-all"
                  />
                </div>

                <div>
                  <select
                    value={activityActionFilter}
                    onChange={(e) => setActivityActionFilter(e.target.value)}
                    className="px-3.5 py-2 border font-bold rounded-xl w-full transition-all cursor-pointer bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
                  >
                    <option value="all">Filtro: Todas as Ações</option>
                    <option value="exams">Agendamentos &amp; Provas</option>
                    <option value="grades">Notas &amp; Boletins</option>
                    <option value="reports">Pareceres &amp; Relatórios</option>
                    <option value="profile">Modificou de Perfil</option>
                  </select>
                </div>

                <div>
                  <select
                    value={activityProfessorFilter}
                    onChange={(e) => setActivityProfessorFilter(e.target.value)}
                    className="px-3.5 py-2 border font-bold rounded-xl w-full transition-all cursor-pointer bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
                  >
                    <option value="all">Professor: Todos</option>
                    {uniqueProfessors.map((p) => (
                      <option key={p.email} value={p.email}>
                        {p.name} ({p.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {loadingActivity && activityHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-slate-600 dark:text-slate-400 select-none">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest">
                    Carregando Histórico de Atividades...
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                    <thead className="bg-[#800020] text-white text-white">
                      <tr className="transition-colors">
                        <th className="pb-3.5 pl-2 text-white">Data/Hora</th>
                        <th className="pb-3.5 text-white">Prof. / Usuário</th>
                        <th className="pb-3.5 text-white">Modo</th>
                        <th className="pb-3.5 pr-2 text-white">Descrição da Atividade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/70 dark:divide-slate-800/60 font-semibold text-xs">
                      {filteredActivities.map((item: any) => {
                        // Badge formatting helper
                        let badgeClass = "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400";
                        let badgeLabel = "Outro";
                        
                        const type = item.action_type || "";
                        if (type === "create_exam") {
                          badgeClass = "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400";
                          badgeLabel = "Nova Prova";
                        } else if (type === "delete_exam") {
                          badgeClass = "bg-rose-50 text-rose-700 dark:bg-rose-955/20 dark:text-rose-400";
                          badgeLabel = "Prova Excluída";
                        } else if (type === "edit_grades") {
                          badgeClass = "bg-violet-50 text-violet-700 dark:bg-violet-950/20 dark:text-violet-400";
                          badgeLabel = "Boletim";
                        } else if (type === "create_report") {
                          badgeClass = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400";
                          badgeLabel = "Novo Parecer";
                        } else if (type === "edit_report") {
                          badgeClass = "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400";
                          badgeLabel = "Alterou Parecer";
                        } else if (type === "delete_report") {
                          badgeClass = "bg-rose-50 text-rose-700 dark:bg-rose-955/20 dark:text-rose-405";
                          badgeLabel = "Excluiu Parecer";
                        } else if (type === "update_profile") {
                          badgeClass = "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 dark:bg-slate-950/20 dark:text-slate-400";
                          badgeLabel = "Perfil";
                        }

                        return (
                          <tr
                            key={item.id || `${item.actor_email}-${item.created_at}`}
                            className="hover:bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 dark:hover:bg-slate-800/10 transition-colors"
                          >
                            <td className="py-3.5 pl-2 font-mono text-[10px] text-slate-600 dark:text-slate-300 whitespace-nowrap">
                              {new Date(item.created_at || item.createdAt).toLocaleString(
                                "pt-BR",
                              )}
                            </td>
                            <td className="py-3.5 whitespace-nowrap">
                              <span className="font-extrabold text-slate-700 dark:text-slate-200 dark:text-white block truncate max-w-[160px]">
                                {item.actor_name}
                              </span>
                              <span className="text-[9.5px] font-medium text-slate-600 dark:text-slate-300 block">
                                {item.actor_email}
                              </span>
                            </td>
                            <td className="py-3.5 whitespace-nowrap">
                              <span
                                className={cn(
                                  "text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full",
                                  badgeClass
                                )}
                              >
                                {badgeLabel}
                              </span>
                            </td>
                            <td className="py-3.5 text-[11.5px] text-slate-700 dark:text-slate-300 pr-2 leading-relaxed font-medium">
                              {item.description}
                            </td>
                          </tr>
                        );
                      })}
                      {filteredActivities.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="text-center py-16 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800"
                          >
                            Nenhuma atividade encontrada com os filtros selecionados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* --- ABA DE MONITORAMENTO DE PRODUTIVIDADE DOCENTE --- */}
        {activeTab === "productivity" && (
          <motion.div
            key="productivity-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* CONTAINER PRINCIPAL */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5 mb-6 select-none">
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-slate-100 dark:text-white uppercase tracking-tight text-sm flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-500" />
                    Monitoramento de Produtividade Docente
                  </h3>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest mt-0.5 animate-pulse">
                    Visualização em tempo real de Pareceres de Desempenho gerados por turma, disciplina e bimestre
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={fetchReportsData}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {loadingReports ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RotateCcw className="w-3 h-3" />
                    )}
                    {loadingReports ? "Atualizando..." : "Recarregar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // CSV Download functionality
                      const headers = "Professor;Turma;Bimestre;Materia;Data de Criacao\n";
                      const rows = reportsData.map(r => {
                        const prof = networkUsers.find(u => u.id === r.professor_id);
                        const profName = prof ? (prof.professional_name || prof.fullName) : "Desconhecido";
                        const formattedDate = new Date(r.created_at || r.createdAt).toLocaleDateString("pt-BR");
                        return `"${profName}";"${r.class_name || r.studentClass}";"${r.bimester}";"${r.subject}";"${formattedDate}"`;
                      }).join("\n");
                      const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.setAttribute("href", url);
                      link.setAttribute("download", `produtividade_docente_${new Date().toISOString().slice(0, 10)}.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    disabled={reportsData.length === 0}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-505 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border border-emerald-550 shadow-sm"
                  >
                    <Download className="w-3 h-3" />
                    Exportar Planilha
                  </button>
                </div>
              </div>

              {loadingReports && reportsData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-600 dark:text-slate-400 select-none">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest">
                    Coletando estatísticas de pareceres pedagógicos...
                  </p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* CARDS DE KPI */}
                  {(() => {
                    const totalReports = reportsData.length;
                    const registeredClasses = schoolInfo?.classes || [];
                    
                    const uniqueClassesWithReports = Array.from(new Set(reportsData.map(r => r.class_name || r.studentClass).filter(Boolean)));
                    const classPercentage = registeredClasses.length > 0
                      ? Math.round((uniqueClassesWithReports.length / registeredClasses.length) * 100)
                      : 0;
                    
                    const uniqueProfessors = Array.from(new Set(reportsData.map(r => r.professor_id).filter(Boolean)));

                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-slate-50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 block mb-1">
                            Total de Pareceres Emitidos
                          </span>
                          <div className="flex items-baseline gap-2">
                            <span className="text-base font-black text-indigo-600 dark:text-indigo-400 leading-none">
                              {totalReports}
                            </span>
                            <span className="text-[10px] text-slate-600 dark:text-slate-400 font-bold">pareceres</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded-full mt-3 overflow-hidden">
                            <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${Math.min(totalReports * 2, 100)}%` }} />
                          </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 block mb-1">
                            Adesão de Turmas (Com Parecer)
                          </span>
                          <div className="flex items-baseline gap-2">
                            <span className="text-base font-black text-teal-600 dark:text-teal-400 leading-none">
                              {uniqueClassesWithReports.length}/{registeredClasses.length}
                            </span>
                            <span className="text-[10px] text-slate-600 dark:text-slate-400 font-bold">({classPercentage}%)</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded-full mt-3 overflow-hidden">
                            <div className="bg-teal-500 h-full rounded-full" style={{ width: `${classPercentage}%` }} />
                          </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 block mb-1">
                            Docentes Ativos no Período
                          </span>
                          <div className="flex items-baseline gap-2">
                            <span className="text-base font-black text-purple-650 dark:text-purple-400 leading-none">
                              {uniqueProfessors.length}
                            </span>
                            <span className="text-[10px] text-slate-600 dark:text-slate-400 font-bold">professores</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded-full mt-3 overflow-hidden">
                            <div className="bg-purple-500 h-full rounded-full" style={{ width: `${Math.min(uniqueProfessors.length * 15, 100)}%` }} />
                          </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 block mb-1">
                            Bimestre Líder de Emissões
                          </span>
                          {(() => {
                            const bimesterCounts: Record<string, number> = {};
                            reportsData.forEach(r => {
                              if (r.bimester) bimesterCounts[r.bimester] = (bimesterCounts[r.bimester] || 0) + 1;
                            });
                            let topBimester = "—";
                            let topCount = 0;
                            Object.entries(bimesterCounts).forEach(([bim, count]) => {
                              if (count > topCount) {
                                topBimester = bim;
                                topCount = count;
                              }
                            });
                            return (
                              <>
                                <div className="flex items-baseline gap-2">
                                  <span className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-tight truncate max-w-full">
                                    {topBimester}
                                  </span>
                                  {topCount > 0 && <span className="text-[10px] text-slate-600 dark:text-slate-400 font-bold">({topCount})</span>}
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded-full mt-4 overflow-hidden">
                                  <div className="bg-amber-505 bg-amber-500 h-full rounded-full" style={{ width: topCount > 0 ? '100%' : '0%' }} />
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })()}

                  {/* DOUBLE BREAKDOWN: MATRIX AND RANKING */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* MATRIX TABLE: TURMAS VS BIMESTRES */}
                    <div className="lg:col-span-7 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 dark:bg-slate-900/10 p-5 md:p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <div className="mb-4 select-none">
                        <h4 className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-200 dark:text-white tracking-wider flex items-center gap-1.5">
                          <School className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                          Matriz de Emissão por Turma & Bimestre
                        </h4>
                        <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                          Total de relatórios de desempenho gerados em cada quadrante letivo
                        </p>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <table className="w-full text-left text-xs text-slate-605 dark:text-slate-300">
                          <thead className="bg-[#800020] text-white text-white">
                <tr className="transition-colors">
                              <th className="py-3 px-4 text-white">Turma (Grupo)</th>
                              <th className="py-3 px-2 text-center text-white">1º Bim</th>
                              <th className="py-3 px-2 text-center text-white">2º Bim</th>
                              <th className="py-3 px-2 text-center text-white">3º Bim</th>
                              <th className="py-3 px-2 text-center text-white">4º Bim</th>
                              <th className="py-3 px-4 text-center text-white">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-150 dark:divide-slate-800 font-semibold text-xs">
                            {(() => {
                              const bimesters = ["1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre"];
                              const registered = schoolInfo?.classes || [];
                              const fromReports = Array.from(new Set(reportsData.map(r => r.class_name || r.studentClass).filter(Boolean)));
                              const allClassesList = Array.from(new Set([...registered, ...fromReports])).filter(Boolean);

                              if (allClassesList.length === 0) {
                                return (
                                  <tr>
                                    <td colSpan={6} className="text-center py-8 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest">
                                      Nenhuma turma cadastrada
                                    </td>
                                  </tr>
                                );
                              }

                              return allClassesList.map(cls => {
                                const rowReports = reportsData.filter(r => (r.class_name || r.studentClass) === cls);
                                let totalRow = 0;

                                return (
                                  <tr key={cls} className="hover:bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 dark:hover:bg-slate-800/10 transition-colors">
                                    <td className="py-3.5 px-4 font-extrabold text-slate-700 dark:text-slate-200 truncate max-w-[150px]">
                                      {cls}
                                    </td>
                                    {bimesters.map(bim => {
                                      const count = rowReports.filter(r => r.bimester === bim).length;
                                      totalRow += count;

                                      return (
                                        <td key={bim} className="py-3.5 px-2 text-center">
                                          {count > 0 ? (
                                            <span className={cn(
                                              "inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[10px] font-black leading-none",
                                              count >= 15 
                                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/45 dark:text-emerald-400"
                                                : count >= 5
                                                  ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/45 dark:text-indigo-400"
                                                  : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 dark:bg-slate-800 dark:text-slate-300"
                                            )}>
                                              {count}
                                            </span>
                                          ) : (
                                            <span className="text-slate-700 dark:text-slate-300 font-medium">—</span>
                                          )}
                                        </td>
                                      );
                                    })}
                                    <td className="py-3.5 px-4 text-center font-black text-indigo-700 dark:text-indigo-400 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 dark:bg-slate-800/10">
                                      {totalRow > 0 ? totalRow : <span className="text-slate-700 dark:text-slate-300 font-medium">—</span>}
                                    </td>
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* RANKING DOCENTE: PRODUCTIVITY RANKING */}
                    <div className="lg:col-span-5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 dark:bg-slate-900/10 p-5 md:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
                      <div className="mb-4 select-none">
                        <h4 className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-200 dark:text-white tracking-wider flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                          Ranking e Produção da Equipe Docente
                        </h4>
                        <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                          Número total de pareceres entregues por professor(a)
                        </p>
                      </div>

                      <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1 flex-1 custom-scrollbar">
                        {(() => {
                          const profCounts: Record<string, number> = {};
                          const profSubjects: Record<string, Set<string>> = {};
                          reportsData.forEach(r => {
                            if (r.professor_id) {
                              profCounts[r.professor_id] = (profCounts[r.professor_id] || 0) + 1;
                              if (!profSubjects[r.professor_id]) profSubjects[r.professor_id] = new Set();
                              if (r.subject) profSubjects[r.professor_id].add(r.subject);
                            }
                          });

                          const rankingData = Object.entries(profCounts).map(([pid, count]) => {
                            const profUser = networkUsers.find(u => u.id === pid);
                            const name = profUser ? (profUser.professional_name || profUser.fullName) : null;
                            const email = profUser?.email || "professor@cps.local";
                            const subjects = Array.from(profSubjects[pid] || []);
                            
                            return {
                              id: pid,
                              name: name || email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
                              email,
                              count,
                              subjects
                            };
                          });

                          rankingData.sort((a,b) => b.count - a.count);

                          if (rankingData.length === 0) {
                            return (
                              <div className="flex flex-col items-center justify-center py-12 text-slate-600 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/20 select-none">
                                <FileText className="w-8 h-8 text-slate-700 dark:text-slate-300 mb-2" />
                                <p className="text-[10px] font-black uppercase tracking-widest leading-none">
                                  Sem dados de produção
                                </p>
                                <p className="text-[9px] text-slate-600 dark:text-slate-400 mt-1 font-bold">
                                  Nenhum professor emitiu parecer ainda.
                                </p>
                              </div>
                            );
                          }

                          const maxCount = rankingData[0]?.count || 1;

                          return rankingData.map((prof, idx) => {
                            const barPercentage = Math.round((prof.count / maxCount) * 100);
                            
                            return (
                              <div key={prof.id} className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col gap-2">
                                <div className="flex items-center justify-between gap-3 select-none">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className={cn(
                                      "w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center shrink-0 border",
                                      idx === 0 
                                        ? "bg-amber-50 border-amber-200/50 text-amber-600 dark:bg-amber-950/20 dark:border-amber-900/30" 
                                        : idx === 1
                                          ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-700"
                                          : idx === 2
                                            ? "bg-amber-50/20 border-amber-100/50 text-amber-700/80 dark:bg-amber-900/10"
                                            : "bg-slate-50 dark:bg-slate-900 dark:border-slate-800"
                                    )}>
                                      #{idx + 1}
                                    </div>
                                    <div className="min-w-0">
                                      <h5 className="text-[11px] font-black text-slate-700 dark:text-slate-200 dark:text-white truncate uppercase tracking-tight">
                                        {prof.name}
                                      </h5>
                                      <p className="text-[9px] text-slate-600 dark:text-slate-300 font-bold truncate tracking-widest uppercase">
                                        {prof.subjects.join(", ") || "Sem disciplina"}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="text-right shrink-0 font-mono">
                                    <span className="text-sm font-black text-indigo-700 dark:text-indigo-400">
                                      {prof.count}
                                    </span>
                                    <span className="text-[8px] font-black uppercase text-slate-600 dark:text-slate-400 block tracking-wider leading-none">
                                      pareceres
                                    </span>
                                  </div>
                                </div>

                                <div className="w-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 dark:bg-slate-800/85 h-1.5 rounded-full overflow-hidden relative">
                                  <div 
                                    className={cn(
                                      "h-full rounded-full transition-all duration-500",
                                      idx === 0 
                                        ? "bg-gradient-to-r from-amber-500 to-indigo-500" 
                                        : idx === 1
                                          ? "bg-indigo-500"
                                          : idx === 2
                                            ? "bg-teal-500"
                                            : "bg-slate-400"
                                    )} 
                                    style={{ width: `${barPercentage}%` }} 
                                  />
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================= */}
      {/* MODAL: REGISTRAR COLABORADOR (NOVO MEMBRO) */}
      {/* ========================================= */}
      <AnimatePresence>
        {isCreateUserModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[80] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar"
            >
              {/* Cabeçalho */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-6 select-none">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-100 dark:bg-slate-800 dark:border-slate-700">
                    <UserCog className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-910 dark:text-white uppercase tracking-tight text-sm">
                      Adicionar Membro à Equipe
                    </h3>
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">
                      Crie credenciais e configure permissões
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreateUserModalOpen(false)}
                  className="p-1.5 hover:bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-600 dark:text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Formulário */}
              <form onSubmit={handleAddUser} className="space-y-5">
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest pl-1">
                    Nome Completo do Servidor
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 dark:text-slate-400" />
                    <input
                      type="text"
                      placeholder="Ex: Professor Dr. Heitor Villa-Lobos"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-extrabold text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 flex flex-col">
                    <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest pl-1">
                      ID de Usuário / E-mail
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-600 dark:text-slate-300">
                        @
                      </span>
                      <input
                        type="text"
                        placeholder="heitor.villa"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono text-xs shadow-inner"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 flex flex-col">
                    <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest pl-1">
                      Senha Inicial de de Acesso
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                      <input
                        type="text"
                        placeholder="Mínimo 6 caracteres"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-bold text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* ATRIBUIR CARGOS RAPIDAMENTE */}
                <div className="space-y-2 select-none">
                  <div className="flex justify-between items-center pl-1">
                    <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                      Perfis de Permissão / Cargos
                    </label>
                    <span className="text-[9px] font-black bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 dark:bg-slate-805 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full">
                      {selectedRoles.length} selecionados
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-3.5 bg-slate-50 dark:bg-slate-900/20 border border-slate-205 rounded-2xl overflow-y-auto max-h-[140px] custom-scrollbar">
                    {Object.entries(ALL_ROLES_MAP).map(
                      ([roleKey, roleLabel]) => {
                        const isSelected = selectedRoles.includes(roleKey);
                        return (
                          <div
                            key={roleKey}
                            onClick={() => toggleSelectedRole(roleKey)}
                            className={cn(
                              "flex items-center justify-between cursor-pointer p-2 rounded-xl border text-[9px] font-black uppercase truncate",
                              isSelected
                                ? "bg-indigo-50 border-indigo-200 text-indigo-705"
                                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300",
                            )}
                          >
                            <span className="truncate">{roleLabel}</span>
                            <div
                              className={cn(
                                "w-4 h-4 rounded border flex items-center justify-center shrink-0 ml-1.5",
                                isSelected
                                  ? "bg-indigo-600 border-indigo-600 text-white"
                                  : "border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100",
                              )}
                            >
                              {isSelected && (
                                <Check className="w-2.5 h-2.5 stroke-[3.5]" />
                              )}
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>

                {/* ATRIBUIR DISCIPLINAS RAPIDAMENTE */}
                <div className="space-y-2 select-none">
                  <div className="flex justify-between items-center pl-1">
                    <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                      Atribuir Disciplinas Iniciais
                    </label>
                    <span className="text-[9px] font-black bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 dark:bg-slate-805 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full">
                      {selectedSubjects.length} selecionadas
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-3.5 bg-slate-50 dark:bg-slate-900/20 border border-slate-205 rounded-2xl overflow-y-auto max-h-[125px] custom-scrollbar">
                    {schoolInfo.subjects.map((sub: string) => {
                      const isSelected = selectedSubjects.includes(sub);
                      return (
                        <div
                          key={sub}
                          onClick={() => toggleSubject(sub)}
                          className={cn(
                            "flex items-center justify-between cursor-pointer p-2 rounded-xl border text-[9px] font-black uppercase truncate",
                            isSelected
                              ? "bg-indigo-50 border-indigo-200 text-indigo-705"
                              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300",
                          )}
                        >
                          <span className="truncate">{sub}</span>
                          <div
                            className={cn(
                              "w-4 h-4 rounded border flex items-center justify-center shrink-0 ml-1.5",
                              isSelected
                                ? "bg-indigo-600 border-indigo-600 text-white"
                                : "border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100",
                            )}
                          >
                            {isSelected && (
                              <Check className="w-2.5 h-2.5 stroke-[3.5]" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ATRIBUIR TURMAS RAPIDAMENTE */}
                <div className="space-y-2 select-none">
                  <div className="flex justify-between items-center pl-1">
                    <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                      Atribuir Turmas Iniciais
                    </label>
                    <span className="text-[9px] font-black bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 dark:bg-slate-805 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full">
                      {selectedClasses.length} selecionadas
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5 p-3.5 bg-slate-50 dark:bg-slate-900/20 border border-slate-205 rounded-2xl overflow-y-auto max-h-[125px] custom-scrollbar">
                    {schoolInfo.classes.map((cls: string) => {
                      const isSelected = selectedClasses.includes(cls);
                      return (
                        <div
                          key={cls}
                          onClick={() => toggleSelectedClass(cls)}
                          className={cn(
                            "flex items-center justify-between cursor-pointer p-2 rounded-xl border text-[9px] font-black uppercase truncate",
                            isSelected
                              ? "bg-indigo-50 border-indigo-200 text-indigo-705"
                              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300",
                          )}
                        >
                          <span className="truncate">{cls}</span>
                          <div
                            className={cn(
                              "w-4 h-4 rounded border flex items-center justify-center shrink-0 ml-1.5",
                              isSelected
                                ? "bg-indigo-600 border-indigo-600 text-white"
                                : "border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100",
                            )}
                          >
                            {isSelected && (
                              <Check className="w-2.5 h-2.5 stroke-[3.5]" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-3 pt-4 select-none">
                  <button
                    type="button"
                    onClick={() => setIsCreateUserModalOpen(false)}
                    className="flex-1 py-3 text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors uppercase tracking-widest"
                  >
                    Mudar de Ideia
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !isServerConfigured}
                    className="flex-[2] bg-slate-900 hover:bg-slate-950 dark:bg-indigo-600 dark:hover:bg-indigo-550 text-white py-3 rounded-xl font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-40"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    ) : (
                      "Criar Conta de Acesso"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================= */}
      {/* MODAL: MATRICULAR ESTUDANTE (NOVO / EDIT) */}
      {/* ========================================= */}
      <AnimatePresence>
        {isCreateStudentModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[80] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar"
            >
              {/* Cabeçalho */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-6 select-none">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-100 dark:bg-slate-800 dark:border-slate-700">
                    <GraduationCap className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-910 dark:text-white uppercase tracking-tight text-sm">
                      {editingStudent
                        ? "Editar Matrícula Escolar"
                        : "Matricular Novo Estudante"}
                    </h3>
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">
                      {editingStudent
                        ? "Altere a ficha cadastral do discente"
                        : "Registre uma nova matrícula e atribua uma série"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeStudentModal}
                  className="p-1.5 hover:bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-600 dark:text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Formulário */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!studName.trim()) {
                    alert("Nome do aluno é obrigatório");
                    return;
                  }
                  if (!studClass) {
                    alert("Série/Turma é obrigatória");
                    return;
                  }

                  const getYearKey = (clsId: string): string => {
                    const match = clsId.match(/^(\d+º?)/);
                    if (match) {
                      let numStr = match[1];
                      if (!numStr.includes("º")) numStr += "º";
                      return `${numStr} ano`;
                    }
                    return "Outros";
                  };

                  const targetYearKey = getYearKey(studClass);
                  const updatedStudentsDB = { ...schoolInfo.studentsDB };

                  const studentObj: Student = {
                    name: studName.trim().toUpperCase(),
                    classId: studClass,
                    registrationNumber: studReg.trim() || undefined,
                    status: studStatus,
                    birthDate: studBirth.trim() || undefined,
                    guardianName: studGuardian.trim() || undefined,
                    motherName: studMother.trim() || undefined,
                    fatherName: studFather.trim() || undefined,
                    financialGuardian: studFinancial.trim() || undefined,
                    phone: studPhone.trim() || undefined,
                    phone2: studPhone2.trim() || undefined,
                    email: studEmail.trim() || undefined,
                    rg: studRG.trim() || undefined,
                    cpf: studCPF.trim() || undefined,
                    notes: studNotes.trim() || undefined,
                    photoUrl: studPhotoUrl.trim() || undefined,
                    agendaAccess:
                      Object.keys(studAgendaAccess).length > 0
                        ? studAgendaAccess
                        : undefined,
                    transferDate:
                      studStatus === "Transferido" && studTransferDate
                        ? studTransferDate
                        : undefined,
                  };

                  // Remove original entry when editing matching primary identifiers
                  if (editingStudent) {
                    const prevYearKey = getYearKey(editingStudent.classId);
                    if (updatedStudentsDB[prevYearKey]) {
                      updatedStudentsDB[prevYearKey] = updatedStudentsDB[
                        prevYearKey
                      ].filter(
                        (s: Student) =>
                          !(
                            s.name === editingStudent.name &&
                            s.classId === editingStudent.classId
                          ),
                      );
                    }
                  }

                  if (!updatedStudentsDB[targetYearKey]) {
                    updatedStudentsDB[targetYearKey] = [];
                  }

                  const isDuplicate = updatedStudentsDB[targetYearKey].some(
                    (s: Student) =>
                      s.name === studentObj.name &&
                      s.classId === studentObj.classId,
                  );
                  if (isDuplicate && !editingStudent) {
                    alert(
                      "Atenção: Já existe um aluno matriculado com este nome exato nesta turma.",
                    );
                    return;
                  }

                  updatedStudentsDB[targetYearKey] = [...updatedStudentsDB[targetYearKey], studentObj];
                  updatedStudentsDB[targetYearKey].sort((a, b) =>
                    a.name.localeCompare(b.name),
                  );

                  saveInfo({
                    ...schoolInfo,
                    studentsDB: updatedStudentsDB,
                  });

                  closeStudentModal();
                }}
                className="space-y-4"
              >
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest pl-1">
                    Nome Completo do Estudante
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Pedro de Alcântara de Bragança e Bourbon"
                    value={studName}
                    onChange={(e) => setStudName(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-extrabold placeholder-slate-300 dark:placeholder-slate-550 uppercase text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 flex flex-col">
                    <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest pl-1">
                      Turma Atribuída
                    </label>
                    <select
                      value={studClass}
                      onChange={(e) => setStudClass(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 rounded-xl border transition-all font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
                    >
                      <option value="">Selecione...</option>
                      {infantilClasses.length > 0 && (
                        <optgroup label="Educação Infantil">
                          {infantilClasses.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </optgroup>
                      )}
                      {fund1Classes.length > 0 && (
                        <optgroup label="Ensino Fundamental I">
                          {fund1Classes.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </optgroup>
                      )}
                      {fund2Classes.length > 0 && (
                        <optgroup label="Ensino Fundamental II">
                          {fund2Classes.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </optgroup>
                      )}
                      {otherClasses.length > 0 && (
                        <optgroup label="Outras Turmas">
                          {otherClasses.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </div>

                  <div className="space-y-1.5 flex flex-col">
                    <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest pl-1">
                      Situação de Matrícula
                    </label>
                    <select
                      value={studStatus}
                      onChange={(e) => setStudStatus(e.target.value as any)}
                      className="w-full px-4 py-2.5 rounded-xl border transition-all font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
                    >
                      <option value="Ativo">Ativo (Frequência Regular)</option>
                      <option value="Inativo">
                        Inativo (Afastado Temporário)
                      </option>
                      <option value="Transferido">
                        Transferido de Turma/Unidade
                      </option>
                      <option value="Cancelado">Cancelado / Abandono</option>
                    </select>
                  </div>
                </div>

                {studStatus === "Transferido" && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-1.5 flex flex-col bg-amber-500/5 p-4 border border-amber-500/20 rounded-2xl"
                  >
                    <label className="text-[9px] font-black text-amber-650 uppercase tracking-widest pl-1">
                      Data da Efetivação da Transferência
                    </label>
                    <input
                      type="date"
                      value={studTransferDate}
                      onChange={(e) => setStudTransferDate(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 rounded-xl border border-amber-200/50 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-amber-550 transition-all font-bold text-xs"
                    />
                  </motion.div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 flex flex-col">
                    <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest pl-1">
                      Número de Registro (RA)
                    </label>
                    <div className="relative font-mono">
                      <input
                        type="text"
                        placeholder="Ex: RA-729A"
                        value={studReg}
                        onChange={(e) => setStudReg(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-indigo-550 transition-all font-mono text-xs uppercase font-extrabold"
                      />
                      {!studReg && (
                        <button
                          type="button"
                          onClick={() => {
                            const ra =
                              "RA-" +
                              Math.floor(100000 + Math.random() * 900000);
                            setStudReg(ra);
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-800 px-2 py-1 text-[9px] font-black rounded uppercase text-slate-700 dark:text-slate-300"
                        >
                          Auto
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 flex flex-col">
                    <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest pl-1">
                      Data de Nascimento
                    </label>
                    <input
                      type="date"
                      value={studBirth}
                      onChange={(e) => setStudBirth(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-805 dark:text-white outline-none focus:ring-1 focus:ring-indigo-550 transition-all font-bold text-xs"
                    />
                  </div>
                </div>

                {/* Documentação do Aluno */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 flex flex-col">
                    <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest pl-1">
                      RG do Aluno
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 12.345.678-9"
                      value={studRG}
                      onChange={(e) => setStudRG(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-indigo-550 transition-all font-bold text-xs"
                    />
                  </div>

                  <div className="space-y-1.5 flex flex-col">
                    <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest pl-1">
                      CPF do Aluno
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 123.456.789-00"
                      value={studCPF}
                      onChange={(e) => setStudCPF(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-indigo-550 transition-all font-bold text-xs"
                    />
                  </div>
                </div>

                {/* Filiação */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 flex flex-col">
                    <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest pl-1">
                      Nome da Mãe
                    </label>
                    <input
                      type="text"
                      placeholder="Nome completo da Mãe"
                      value={studMother}
                      onChange={(e) => setStudMother(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-indigo-550 transition-all font-bold text-xs text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  <div className="space-y-1.5 flex flex-col">
                    <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest pl-1">
                      Nome do Pai
                    </label>
                    <input
                      type="text"
                      placeholder="Nome completo do Pai"
                      value={studFather}
                      onChange={(e) => setStudFather(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-indigo-550 transition-all font-bold text-xs text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>

                {/* Responsáveis */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 flex flex-col">
                    <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest pl-1">
                      Responsável Legal (Tutor)
                    </label>
                    <input
                      type="text"
                      placeholder="Nome do Tutor / Responsável pelo Aluno"
                      value={studGuardian}
                      onChange={(e) => setStudGuardian(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-indigo-550 transition-all font-bold text-xs"
                    />
                  </div>

                  <div className="space-y-1.5 flex flex-col">
                    <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest pl-1">
                      Responsável Financeiro
                    </label>
                    <input
                      type="text"
                      placeholder="Nome do Responsável Financeiro"
                      value={studFinancial}
                      onChange={(e) => setStudFinancial(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-indigo-550 transition-all font-bold text-xs text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>

                {/* Contato e Comunicação */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 flex flex-col">
                    <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest pl-1">
                      Telefone Principal (Contato 1)
                    </label>
                    <input
                      type="text"
                      placeholder="(DD) 99999-9999"
                      value={studPhone}
                      onChange={(e) => setStudPhone(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-indigo-505 transition-all font-bold text-xs"
                    />
                  </div>

                  <div className="space-y-1.5 flex flex-col">
                    <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest pl-1">
                      Telefone Alternativo (Contato 2)
                    </label>
                    <input
                      type="text"
                      placeholder="(DD) 99999-9999"
                      value={studPhone2}
                      onChange={(e) => setStudPhone2(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-indigo-505 transition-all font-bold text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 flex flex-col">
                  <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest pl-1">
                    E-mail de Contato
                  </label>
                  <input
                    type="email"
                    placeholder="email@responsavel.com.br"
                    value={studEmail}
                    onChange={(e) => setStudEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-indigo-505 transition-all font-bold text-xs"
                  />
                </div>

                <div className="space-y-1.5 flex flex-col">
                  <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest pl-1">
                    URL da Foto do Aluno (Para Portal da Família)
                  </label>
                  <input
                    type="url"
                    placeholder="https://exemplo.com/foto.jpg"
                    value={studPhotoUrl}
                    onChange={(e) => setStudPhotoUrl(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-indigo-550 transition-all font-semibold text-xs"
                  />
                  {studPhotoUrl && (
                    <img src={studPhotoUrl} alt="Preview do Aluno" className="w-12 h-12 rounded-full object-cover mt-1 border border-slate-200 dark:border-slate-800 shadow-sm" />
                  )}
                </div>

                <div className="space-y-1.5 flex flex-col">
                  <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest pl-1">
                    Ficha Médica / Observações da Secretaria
                  </label>
                  <textarea
                    placeholder="Notas importantes como reações alérgicas, intolerâncias, declarações ou pendências de documentos de matrícula..."
                    value={studNotes}
                    onChange={(e) => setStudNotes(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-indigo-550 transition-all font-semibold text-xs resize-none"
                  />
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                  <h4 className="text-[10px] font-black text-slate-700 dark:text-slate-100 uppercase tracking-widest pl-1 mb-3 flex items-center gap-2">
                    <KeyRound className="w-3 h-3 text-indigo-500" /> Contas de
                    Acesso (Agenda Eletrônica)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      {
                        key: "student",
                        label: "Acesso do Aluno",
                        holder: "aluno",
                      },
                      {
                        key: "guardian1",
                        label: "Responsável 1",
                        holder: "resp1",
                      },
                      {
                        key: "guardian2",
                        label: "Responsável 2",
                        holder: "resp2",
                      },
                      {
                        key: "financial",
                        label: "Resp. Financeiro",
                        holder: "finan",
                      },
                    ].map((acc) => (
                      <div
                        key={acc.key}
                        className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800"
                      >
                        <label className="text-[9px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-1.5 block">
                          {acc.label}
                        </label>
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder={`Usuário (${acc.holder})`}
                            value={
                              studAgendaAccess?.[
                                acc.key as keyof typeof studAgendaAccess
                              ]?.username || ""
                            }
                            onChange={(e) =>
                              setStudAgendaAccess((prev) => ({
                                ...prev,
                                [acc.key]: {
                                  ...prev?.[acc.key],
                                  username: e.target.value,
                                },
                              }))
                            }
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-bold text-[10px]"
                          />
                          <input
                            type="text"
                            placeholder="Senha Provisória"
                            value={
                              studAgendaAccess?.[
                                acc.key as keyof typeof studAgendaAccess
                              ]?.pin || ""
                            }
                            onChange={(e) =>
                              setStudAgendaAccess((prev) => ({
                                ...prev,
                                [acc.key]: {
                                  ...prev?.[acc.key],
                                  pin: e.target.value,
                                },
                              }))
                            }
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-bold text-[10px]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-3 select-none">
                  <button
                    type="button"
                    onClick={closeStudentModal}
                    className="flex-1 py-3 text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors uppercase tracking-widest"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] bg-slate-900 hover:bg-slate-950 dark:bg-indigo-600 dark:hover:bg-indigo-550 text-white py-3 rounded-xl font-black uppercase tracking-widest transition-all shadow-md active:scale-95"
                  >
                    {editingStudent ? "Salvar Ficha" : "Efetivar Matrícula"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================= */}
      {/* MODAL: REDEFINIÇÃO DE SENHAS DE USUÁRIOS */}
      {/* ========================================= */}
      <AnimatePresence>
        {resettingPwUser && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[80] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800"
            >
              <div className="flex items-center gap-3.5 mb-6 select-none">
                <div className="w-11 h-11 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center">
                  <KeyRound className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-905 dark:text-white uppercase tracking-tight text-sm">
                    Redefinir Senha
                  </h3>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold truncate max-w-[200px]">
                    {resettingPwUser.email}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest pl-1">
                    Nova Senha Provisória
                  </label>
                  <input
                    type="text"
                    value={newPwVal}
                    onChange={(e) => setNewPwVal(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-white outline-none focus:border-amber-550 font-bold text-xs"
                  />
                </div>

                <div className="flex gap-3 pt-2 select-none">
                  <button
                    onClick={() => setResettingPwUser(null)}
                    className="flex-1 py-3 text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest hover:bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 rounded-xl"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleResetPassword}
                    disabled={loading || newPwVal.length < 6}
                    className="flex-1 py-3 bg-amber-500 hover:bg-amber-450 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow active:scale-95 disabled:opacity-40"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    ) : (
                      "Confirmar"
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================= */}
      {/* MODAL: CONFIRMAÇÃO DE EXCLUSÃO DE PROFESSOR */}
      {/* ========================================= */}
      <AnimatePresence>
        {deletingUser && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[80] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center gap-3.5 mb-6 select-none">
                <div className="w-11 h-11 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center">
                  <Trash2 className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-905 dark:text-white uppercase tracking-tight text-sm">
                    Excluir Professor
                  </h3>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold truncate max-w-[200px]">
                    {deletingUser.email}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-rose-500/10 dark:bg-rose-950/20 p-4 rounded-2xl border border-rose-100 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-[11px] font-bold leading-relaxed shadow-inner">
                  Atenção! Você está prestes a excluir permanentemente o(a)
                  docente:{" "}
                  <strong className="font-extrabold underline block mt-1 text-xs text-rose-800 dark:text-rose-350">
                    {deletingUser.professional_name ||
                      deletingUser.fullName ||
                      deletingUser.email?.split("@")[0]}
                  </strong>
                  . Esta ação não poderá ser desfeita.
                </div>

                <div className="space-y-1.5 flex flex-col">
                  <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest pl-1">
                    Senha de Exclusão de Segurança
                  </label>
                  <input
                    type="password"
                    value={deleteInputPassword}
                    onChange={(e) => setDeleteInputPassword(e.target.value)}
                    placeholder="Digite a senha de exclusão para prosseguir"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-white outline-none focus:border-rose-500 font-bold text-xs"
                  />
                  <p className="text-[9px] text-slate-600 dark:text-slate-400 font-bold tracking-wide mt-1">
                    * Caso nunca tenha mudado, a senha de exclusão padrão do
                    colégio é{" "}
                    <code className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-rose-600 font-black">
                      0
                    </code>
                    .
                  </p>
                </div>

                <div className="flex gap-3 pt-2 select-none">
                  <button
                    onClick={() => {
                      setDeletingUser(null);
                      setDeleteInputPassword("");
                    }}
                    type="button"
                    className="flex-1 py-3 text-[10px] font-black text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-700 uppercase tracking-widest rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer text-center font-extrabold"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleDeleteProfessorConfirmed}
                    disabled={loading || !deleteInputPassword}
                    type="button"
                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 dark:disabled:bg-slate-800/60 disabled:text-slate-600 dark:text-slate-400 dark:disabled:text-slate-700 dark:text-slate-300 text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm active:scale-95 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center min-h-[42px] font-extrabold"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    ) : (
                      "Confirmar"
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================= */}
      {/* MODAL: CONFIGURAÇÃO DE VÍNCULOS / DETALHES */}
      {/* ========================================= */}
      <AnimatePresence>
        {configuringUser && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[75] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800"
            >
              <div className="p-6 md:p-8 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center select-none shrink-0">
                <div className="flex items-center gap-4">
                  {configuringUser.avatar_url ||
                  configuringUser.avatar_base64 ? (
                    <img
                      src={
                        configuringUser.avatar_url ||
                        configuringUser.avatar_base64
                      }
                      alt="Avatar"
                      className="w-12 h-12 rounded-2xl object-cover shadow-sm bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 dark:bg-slate-800"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500 flex items-center justify-center font-black shadow-sm">
                      <Settings className="w-5 h-5 opacity-50" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      Vínculos e Atribuições
                    </h3>
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest leading-none mt-1.5">
                      {configuringUser.professional_name ||
                        configuringUser.fullName ||
                        configuringUser.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setConfiguringUser(null)}
                  className="p-1.5 hover:bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-600 dark:text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 md:p-8 space-y-5 overflow-y-auto custom-scrollbar flex-1">
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest pl-1">
                    Nome de Login / Usuário
                  </label>
                  <label className="text-[9px] text-slate-600 dark:text-slate-400 font-bold -mt-0.5 pl-1 leading-none mb-1">
                    * Modificar o usuário alterará o e-mail de acesso. O sufixo
                    @cps.local será adicionado automaticamente.
                  </label>
                  <input
                    type="text"
                    value={configuringUser.username || ""}
                    onChange={(e) => {
                      const v = e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9_.-]/g, "");
                      setConfiguringUser({ ...configuringUser, username: v });
                    }}
                    placeholder="Ex: joao.silva"
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-white rounded-xl outline-none focus:border-primary font-bold text-xs"
                  />
                </div>

                <div className="space-y-1.5 flex flex-col">
                  <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest pl-1">
                    Nome Acadêmico / Assinatura de Provas
                  </label>
                  <input
                    type="text"
                    value={configuringUser.professional_name || ""}
                    onChange={(e) =>
                      setConfiguringUser({
                        ...configuringUser,
                        professional_name: e.target.value,
                      })
                    }
                    placeholder="Ex: Prof. Mestre Heitor Villa Lobos"
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-white rounded-xl outline-none focus:border-primary font-extrabold text-xs"
                  />
                </div>

                <div className="space-y-1.5 flex flex-col select-none">
                  <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest pl-1">
                    Perfis de Permissão / Cargos
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-3.5 bg-slate-50 dark:bg-slate-900/20 border border-slate-205 rounded-2xl overflow-y-auto max-h-[160px] custom-scrollbar">
                    {Object.entries(ALL_ROLES_MAP).map(
                      ([roleKey, roleLabel]) => {
                        const userRoles = (configuringUser.role || "professor")
                          .split(",")
                          .map((r: string) => r.trim());
                        const isSelected = userRoles.includes(roleKey);
                        return (
                          <div
                            key={roleKey}
                            onClick={() => {
                              const newRoles = isSelected
                                ? userRoles.filter((r: string) => r !== roleKey)
                                : [...userRoles, roleKey];
                              if (newRoles.length === 0)
                                newRoles.push("professor");
                              setConfiguringUser({
                                ...configuringUser,
                                role: newRoles.join(","),
                              });
                            }}
                            className={cn(
                              "flex items-center justify-between cursor-pointer p-2 flex-1 rounded-xl border text-[9px] font-black uppercase truncate",
                              isSelected
                                ? "bg-indigo-50 border-indigo-200 text-indigo-705"
                                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300",
                            )}
                          >
                            <span className="truncate">{roleLabel}</span>
                            <div
                              className={cn(
                                "w-4 h-4 rounded border flex items-center justify-center shrink-0 ml-1.5",
                                isSelected
                                  ? "bg-indigo-600 border-indigo-600 text-white"
                                  : "border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100",
                              )}
                            >
                              {isSelected && (
                                <Check className="w-2.5 h-2.5 stroke-[3.5]" />
                              )}
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>

                {/* DISCIPLINAS HABILITADAS */}
                <div className="space-y-1.5 select-none">
                  <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest pl-1 block">
                    Disciplinas que Ministra Habilitação
                  </label>
                  <div className="flex flex-wrap gap-1.5 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                    {sortedSubjects.map((sub) => {
                      const selected = (
                        configuringUser.assigned_subjects || []
                      ).some((s: string) => s.toUpperCase() === sub.toUpperCase());
                      return (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => {
                            const current =
                              configuringUser.assigned_subjects || [];
                            if (selected)
                              setConfiguringUser({
                                ...configuringUser,
                                assigned_subjects: current.filter(
                                  (s: string) => s.toUpperCase() !== sub.toUpperCase(),
                                ),
                              });
                            else
                              setConfiguringUser({
                                ...configuringUser,
                                assigned_subjects: [...current, sub],
                              });
                          }}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight border transition-all ${selected ? "bg-slate-900 border-transparent text-white dark:bg-slate-800" : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800"}`}
                        >
                          {sub}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* TURMAS ATRIBUÍDAS */}
                <div className="space-y-1.5 select-none">
                  <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest pl-1 block">
                    Salas e Turmas Ministradas
                  </label>
                  <div className="flex flex-wrap gap-1.5 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                    {sortedClasses.map((cls) => {
                      const selected = (
                        configuringUser.assigned_classes || []
                      ).includes(cls);
                      return (
                        <button
                          key={cls}
                          type="button"
                          onClick={() => {
                            const current =
                              configuringUser.assigned_classes || [];
                            if (selected)
                              setConfiguringUser({
                                ...configuringUser,
                                assigned_classes: current.filter(
                                  (c: string) => c !== cls,
                                ),
                              });
                            else
                              setConfiguringUser({
                                ...configuringUser,
                                assigned_classes: [...current, cls],
                              });
                          }}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight border transition-all ${selected ? "bg-slate-900 border-transparent text-white dark:bg-slate-800" : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800"}`}
                        >
                          {cls}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* SEÇÃO: ALTERAR SENHA DO PROFESSOR */}
                <div className="mt-6 p-5 bg-amber-500/5 dark:bg-amber-500/10 rounded-2xl border border-amber-500/20 dark:border-amber-500/15">
                  <div className="flex items-center gap-2 mb-2 select-none">
                    <KeyRound className="w-4 h-4 text-amber-505 animate-pulse" />
                    <h4 className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                      Alterar Senha do Professor
                    </h4>
                  </div>
                  <p className="text-[10px] text-slate-700 dark:text-slate-400 font-medium leading-relaxed mb-3">
                    Como administrador, você pode alterar a senha de acesso
                    deste colaborador instantaneamente. A nova senha deve ter no
                    mínimo 6 caracteres.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Nova senha (mín. 6 caracteres)"
                      value={newPwVal}
                      onChange={(e) => setNewPwVal(e.target.value)}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-amber-550 font-bold text-xs"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!newPwVal || newPwVal.length < 6) {
                          alert(
                            "A senha de acesso provisória deve ter no mínimo 6 caracteres.",
                          );
                          return;
                        }
                        if (
                          !confirm(
                            `Deseja realmente alterar a senha do professor ${configuringUser.email || ""}?`,
                          )
                        ) {
                          return;
                        }
                        try {
                          setConfigLoading(true);
                          await onResetPassword(configuringUser.uid, newPwVal);
                          confetti({
                            particleCount: 150,
                            spread: 120,
                            origin: { y: 0.6 },
                          });
                          alert(
                            `Senha do professor ${configuringUser.email} atualizada com sucesso!`,
                          );
                          setNewPwVal("");
                        } catch (err: any) {
                          alert("Erro ao alterar senha: " + err.message);
                        } finally {
                          setConfigLoading(false);
                        }
                      }}
                      disabled={
                        configLoading || !newPwVal || newPwVal.length < 6
                      }
                      className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-40 shrink-0 cursor-pointer"
                    >
                      Atualizar Senha Agora
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 dark:bg-slate-900/20 border-t border-slate-200 dark:border-slate-800 flex gap-4 shrink-0 select-none">
                <button
                  onClick={() => setConfiguringUser(null)}
                  className="flex-1 px-4 py-3 rounded-xl font-black uppercase text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Voltar
                </button>
                <button
                  onClick={handleUpdateUserConfig}
                  disabled={configLoading}
                  className="flex-[2] bg-slate-900 hover:bg-slate-950 dark:bg-indigo-600 dark:hover:bg-indigo-550 text-white px-4 py-3 rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 active:scale-95 disabled:opacity-40"
                >
                  {configLoading ? (
                    <Loader2 className="animate-spin w-4 h-4" />
                  ) : (
                    "Salvar Alterações"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL PARA LANÇAMENTO DE JUSTIFICATIVAS / ATESTADOS --- */}
      <AnimatePresence>
        {isJustModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 text-left select-none">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden text-left border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90dvh]"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-amber-600 text-white flex items-center justify-between shrink-0">
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wider">
                    Lançar Atestado / Justificativa
                  </h3>
                  <p className="text-[9px] font-black text-amber-100 uppercase tracking-widest">
                    Secretaria &amp; Diretoria Escolar
                  </p>
                </div>
                <button
                  onClick={() => setIsJustModalOpen(false)}
                  className="text-white/80 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 text-left">
                {/* Selecionar Aluno */}
                <div className="space-y-1 relative">
                  <label className="block text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                    Aluno(a) Beneficiário
                  </label>
                  <div
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3.5 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none flex items-center justify-between cursor-pointer"
                    onClick={() => setJustStudentSearchOpen(!justStudentSearchOpen)}
                  >
                    <span className="uppercase truncate">
                      {justStudentName || "Selecione o(a) aluno(a)..."}
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  </div>

                  {justStudentSearchOpen && (
                    <div className="absolute z-50 left-0 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col">
                      <div className="p-2 border-b border-slate-200 dark:border-slate-800">
                        <input
                          type="text"
                          autoFocus
                          placeholder="Pesquisar por nome ou turma (ex: 6º a, joão)..."
                          value={justStudentSearchText}
                          onChange={(e) => setJustStudentSearchText(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-amber-500 text-slate-800 dark:text-slate-200"
                        />
                      </div>
                      <div className="max-h-60 overflow-y-auto overflow-x-hidden">
                        {(() => {
                          const query = justStudentSearchText.toLowerCase().trim();
                          
                          if (query) {
                            let allStudents: any[] = [];
                            Object.entries(schoolInfo.studentsDB || {}).forEach(([yearLabel, sList]: [string, any]) => {
                              const validStudents = (sList || []).filter((s: any) => 
                                s.status !== "Transferido" &&
                                s.status !== "Inativo" &&
                                s.status !== "Cancelado"
                              );
                              allStudents.push(...validStudents);
                            });

                            allStudents.sort((a, b) => a.name.localeCompare(b.name));

                            const filtered = allStudents.filter((s) => {
                              const term1 = s.name.toLowerCase();
                              const term2 = (s.classId || "").toLowerCase();
                              return term1.includes(query) || term2.includes(query);
                            });

                            if (filtered.length === 0) {
                              return (
                                <div className="p-4 text-center text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">
                                  Nenhum aluno encontrado
                                </div>
                              );
                            }

                            return filtered.map((s) => (
                              <button
                                key={s.name}
                                type="button"
                                onClick={() => {
                                  setJustStudentName(s.name);
                                  setJustStudentSearchOpen(false);
                                  setJustStudentSearchText("");
                                  setJustExpandedClass(null);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 dark:hover:bg-slate-800/80 transition-colors uppercase text-xs border-b border-slate-200 dark:border-slate-800/50 last:border-0"
                              >
                                <div className="font-bold text-slate-700 dark:text-slate-200 truncate">{s.name}</div>
                                <div className="text-[10px] font-black text-amber-600 dark:text-amber-500 tracking-wider">
                                  {s.classId}
                                </div>
                              </button>
                            ));
                          } else {
                            const classesMap: Record<string, any[]> = {};
                            Object.entries(schoolInfo.studentsDB || {}).forEach(([yearLabel, sList]: [string, any]) => {
                              const validStudents = (sList || []).filter((s: any) => 
                                s.status !== "Transferido" &&
                                s.status !== "Inativo" &&
                                s.status !== "Cancelado"
                              );
                              validStudents.forEach(s => {
                                if (!classesMap[s.classId]) classesMap[s.classId] = [];
                                classesMap[s.classId].push(s);
                              });
                            });
                            
                            const sortedClasses = Object.keys(classesMap).sort();
                            
                            return sortedClasses.map(classId => {
                               const students = classesMap[classId].sort((a,b) => a.name.localeCompare(b.name));
                               const isExpanded = justExpandedClass === classId;
                               
                               return (
                                 <div key={classId} className="border-b border-slate-200 dark:border-slate-800/50 last:border-0">
                                   <button
                                     type="button"
                                     className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 dark:hover:bg-slate-800/80 transition-colors flex items-center justify-between group"
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       setJustExpandedClass(isExpanded ? null : classId);
                                     }}
                                   >
                                     <div className="flex items-center gap-2">
                                       <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                                       <span className="font-black text-slate-700 dark:text-slate-300 uppercase text-xs tracking-wider">
                                         {classId}
                                       </span>
                                     </div>
                                     <div className="flex items-center gap-3">
                                       <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 group-hover:text-amber-600 transition-colors">
                                         {students.length} alunos
                                       </span>
                                       <ChevronDown 
                                         className={`w-4 h-4 text-slate-600 dark:text-slate-400 transition-transform ${isExpanded ? "rotate-180 text-amber-500" : ""}`}
                                       />
                                     </div>
                                   </button>
                                   
                                   {isExpanded && (
                                     <div className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 dark:bg-slate-950/20 divide-y divide-slate-100 dark:divide-slate-800/50 border-t border-slate-200 dark:border-slate-800/50">
                                       {students.map(s => (
                                         <button
                                           key={s.name}
                                           type="button"
                                           onClick={() => {
                                             setJustStudentName(s.name);
                                             setJustStudentSearchOpen(false);
                                             setJustStudentSearchText("");
                                             setJustExpandedClass(null);
                                           }}
                                           className="w-full text-left pl-8 pr-4 py-2 hover:bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 transition-colors uppercase text-[11px]"
                                         >
                                           <div className="font-bold text-slate-700 dark:text-slate-300 truncate">
                                             {s.name}
                                           </div>
                                         </button>
                                       ))}
                                     </div>
                                   )}
                                 </div>
                               );
                            });
                          }
                        })()}
                      </div>
                    </div>
                  )}
                </div>

                {/* Período */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                      Data Inicial
                    </label>
                    <input
                      type="date"
                      value={justStartDate}
                      onChange={(e) => setJustStartDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-amber-500 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                      Data Final
                    </label>
                    <input
                      type="date"
                      value={justEndDate}
                      onChange={(e) => setJustEndDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-amber-500 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>

                {/* Tipo/Motivo */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                    Motivo Principal
                  </label>
                  <select
                    value={justReason}
                    onChange={(e) => setJustReason(e.target.value)}
                    className="w-full border rounded-xl px-4 py-3 font-bold cursor-pointer uppercase bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
                  >
                    <option value="Atestado Médico">
                      Atestado Médico / Licença Saúde
                    </option>
                    <option value="Atestado Odontológico">
                      Atestado Odontológico
                    </option>
                    <option value="Declaração de Comparecimento">
                      Declaração de Comparecimento
                    </option>
                    <option value="Justificativa Familiar / Luto">
                      Justificativa Familiar / Luto
                    </option>
                    <option value="Serviço Militar / Eleitoral">
                      Serviço Militar / Eleitoral
                    </option>
                    <option value="Licença Maternidade/Paternidade">
                      Licença Maternidade/Paternidade
                    </option>
                    <option value="Outros Assuntos">
                      Outros Assuntos Justificados
                    </option>
                  </select>
                </div>

                {/* Observações */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                    Detalhamento / Notas
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Especifique maiores detalhes sobre a justificativa..."
                    value={justNotes}
                    onChange={(e) => setJustNotes(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs font-bold outline-none focus:border-amber-500 text-slate-800 dark:text-slate-200"
                  />
                </div>

                {/* Upload Foto do Atestado */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                    Foto do Atestado ou Laudo Digitalizado
                  </label>
                  <div className="border border-dashed border-slate-200 dark:border-slate-800 hover:border-amber-500/50 rounded-xl p-4 transition-all relative flex flex-col items-center justify-center text-center gap-1.5 bg-slate-50 dark:bg-slate-900/50 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadJustificationFile}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    {justUploadProgress ? (
                      <div className="flex flex-col items-center gap-1.5 py-2">
                        <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                        <span className="text-[9px] font-black uppercase text-amber-500 tracking-wider">
                          Enviando Documento...
                        </span>
                      </div>
                    ) : justFileUrl ? (
                      <div className="flex flex-col items-center gap-1 text-green-600 py-1">
                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                        <span className="text-[9px] font-black uppercase tracking-wider">
                          Documento Enviado com Sucesso!
                        </span>
                      </div>
                    ) : (
                      <>
                        <Plus className="w-6 h-6 text-slate-600 dark:text-slate-400 group-hover:text-amber-500 transition-colors" />
                        <span className="text-[9px] font-black uppercase text-slate-700 dark:text-slate-400">
                          Clique para enviar a foto/laudo
                        </span>
                        <span className="text-[8px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                          Arquivos de imagem até 25MB
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex gap-4 bg-slate-50 dark:bg-slate-900/20 shrink-0 select-none">
                <button
                  onClick={() => setIsJustModalOpen(false)}
                  className="flex-1 px-4 py-3.5 rounded-xl font-black uppercase text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveJustification}
                  className="flex-[2] bg-amber-600 hover:bg-amber-700 text-white px-4 py-3.5 rounded-xl font-black uppercase text-xs shadow-md transition-all active:scale-[0.98] cursor-pointer"
                >
                  Confirmar Justificativa
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- LIGHTBOX MODAL PARA DOCUMENTOS / FOTOS DE LAUDOS E ATESTADOS --- */}
      <AnimatePresence>
        {selectedJustificationImage && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[120] p-4 text-left">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative max-w-4xl w-full flex flex-col gap-4 text-left items-center"
            >
              <button
                onClick={() => setSelectedJustificationImage(null)}
                className="absolute top-[-45px] right-0 bg-white/ hover:bg-white/ text-slate-900 dark:text-white rounded-full p-2.5 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-2xl max-h-[80dvh] overflow-hidden flex items-center justify-center">
                <img
                  src={selectedJustificationImage}
                  alt="Atestado / Justificativa Digitalizado"
                  className="max-h-[75dvh] max-w-full rounded-2xl object-contain shadow-lg"
                  referrerPolicy="no-referrer"
                />
              </div>

              <a
                href={selectedJustificationImage}
                download="atestado_justificado.png"
                target="_blank"
                rel="noreferrer"
                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-extrabold text-[10px] uppercase tracking-wider px-6 py-3 rounded-xl shadow-lg hover:shadow-xl hover:translate-y-[-1px] transition-all cursor-pointer"
              >
                Abrir em Nova Aba / Download Completo
              </a>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
