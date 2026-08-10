import React, { useState, useMemo, useEffect } from "react";
import {
  Heart,
  FileCheck,
  Table,
  Printer,
  FileText,
  Search,
  ChevronDown,
  ArrowLeft,
  Calendar,
  ClipboardList,
  Users,
  Download,
  AlertCircle,
  Stethoscope,
  BookOpen,
  Plus,
  X,
  Save,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";
import { Student, Exam, Result, Lesson, Attendance } from "../types";
import { supabase } from "../lib/supabase"; // Assuming it's available there or we export it
import { LOGO_VINHO } from "../assets";
import { exportToPDF } from "../lib/pdfUtils";
import { getBimesterForExam } from "../utils/bimesterUtils";

interface DiaryReportsViewProps {
  onBack: () => void;
  selectedClass: string;
  selectedSubject: string;
  classes: string[];
  subjects: string[];
  students: Student[];
  exams: Exam[];
  results: Result[];
  lessons: Lesson[];
  attendanceRecords: Attendance[];
  medicalRecords: Record<string, { notes: string; fileUrl?: string }>;
  onSaveMedicalInfo: (
    studentName: string,
    info: { notes: string; fileUrl?: string },
  ) => Promise<boolean>;
  isAdmin: boolean;
  schoolInfo: any;
  userProfile: any;
  onRefresh: () => void;
}

export function DiaryReportsView({
  onBack,
  selectedClass: initialClass,
  selectedSubject: initialSubject,
  classes,
  subjects,
  students: initialStudents,
  exams,
  results,
  medicalRecords,
  onSaveMedicalInfo,
  isAdmin,
  schoolInfo,
  userProfile,
  onRefresh,
}: DiaryReportsViewProps) {
  const [activeTab, setActiveTab] = useState<
    "medical" | "annual" | "unified" | "blank"
  >("medical");
  const [selectedClass, setSelectedClass] = useState(initialClass || "");
  const [selectedSubject, setSelectedSubject] = useState(initialSubject || "");

  const infantilClasses = useMemo(
    () =>
      classes.filter(
        (c) =>
          schoolInfo?.classModalities?.[c] === "infantil" ||
          (!schoolInfo?.classModalities?.[c] && (
            c.toLowerCase().includes("maternal") ||
            c.toLowerCase().includes("jardim") ||
            c.toLowerCase().includes("pré") ||
            c.toLowerCase().includes("infantil")
          )),
      ),
    [classes, schoolInfo?.classModalities],
  );

  const fund1Classes = useMemo(
    () =>
      classes.filter(
        (c) =>
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
      ),
    [classes, infantilClasses, schoolInfo?.classModalities],
  );

  const fund2Classes = useMemo(
    () =>
      classes.filter(
        (c) =>
          schoolInfo?.classModalities?.[c] === "fund2" ||
          (!schoolInfo?.classModalities?.[c] && (
            !infantilClasses.includes(c) &&
            (/^[6-9]/g.test(c) ||
              c.toLowerCase().includes("6º") ||
              c.toLowerCase().includes("7º") ||
              c.toLowerCase().includes("8º") ||
              c.toLowerCase().includes("9º"))
          )),
      ),
    [classes, infantilClasses, schoolInfo?.classModalities],
  );

  const otherClasses = useMemo(
    () =>
      classes.filter(
        (c) =>
          !infantilClasses.includes(c) &&
          !fund1Classes.includes(c) &&
          !fund2Classes.includes(c),
      ),
    [classes, infantilClasses, fund1Classes, fund2Classes],
  );

  const studentCourse = useMemo(() => {
    if (!selectedClass) return "ENSINO FUNDAMENTAL";
    const isInf = infantilClasses.includes(selectedClass);
    return isInf ? "ENSINO INFANTIL" : "ENSINO FUNDAMENTAL";
  }, [selectedClass, infantilClasses]);

  const filteredStudents = useMemo(() => {
    if (!selectedClass) return [];
    return initialStudents.filter((s) => s.classId === selectedClass);
  }, [initialStudents, selectedClass]);

  const displayStudents = useMemo(() => {
    let list = [...filteredStudents];
    if (list.length < 25) {
      const paddingCount = 25 - list.length;
      for (let i = 0; i < paddingCount; i++) {
        list.push({ name: "", classId: selectedClass || "" } as any);
      }
    }
    return list;
  }, [filteredStudents, selectedClass]);

  const currentDateFormatted = useMemo(() => {
    const months = [
      "Janeiro",
      "Fevereiro",
      "Março",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro",
    ];
    const d = new Date();
    const day = d.getDate();
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `SANTOS - SP, ${day} DE ${month.toUpperCase()} DE ${year}`;
  }, []);

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(false);

  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editFileUrl, setEditFileUrl] = useState("");
  const [savingMedical, setSavingMedical] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [blankBimester, setBlankBimester] = useState("1º BIMESTRE");
  const [blankTurn, setBlankTurn] = useState("MANHÃ");

  const InstitutionalHeader = () => {
    return (
      <div className="flex flex-row items-center justify-between border-b-2 border-[#800020] pb-5 mb-6 text-center print:flex w-full">
        <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 flex items-center justify-center">
          <img
            src={LOGO_VINHO}
            alt="Logo Colégio Progresso"
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="text-center flex flex-col items-center flex-1">
          <h1 className="text-2xl sm:text-3xl font-black text-[#800020] uppercase tracking-wide leading-none mb-2 font-serif">
            Colégio Progresso Santista
          </h1>
          <div className="space-y-0.5 text-[#800020] font-bold text-[9px] sm:text-[11px] leading-relaxed">
            <p className="uppercase font-extrabold text-[10px] sm:text-[12px] tracking-wide text-slate-700 dark:text-slate-200">
              Educação Infantil e Ensino Fundamental I e II
            </p>
            <p className="opacity-95">
              Rua: Domingos José Martins, n. 486 – Vila São Jorge – Santos- SP
            </p>
            <p className="opacity-95 flex items-center justify-center gap-2">
              <span>Tel: (13) 3307.4350</span>{" "}
              <span>Whatsapp: (13) 99102-8252</span>
            </p>
            <p className="opacity-95 text-[8px] sm:text-[9px]">
              CNPJ: 23.275.906/0001-14
            </p>
            <p className="opacity-95">
              E-mail: secretaria.progressosantista@gmail.com
            </p>
            <p className="opacity-100 font-extrabold text-[#800020]">
              Site: www.colegioprogressosantista.com.br
            </p>
          </div>
        </div>
        <div className="w-20 sm:w-24 flex-shrink-0 invisible"></div>
      </div>
    );
  };

  useEffect(() => {
    if (selectedClass) {
      fetchDetailedData();
    } else {
      setLessons([]);
      setAttendanceRecords([]);
    }
  }, [selectedClass, selectedSubject]);

  const fetchDetailedData = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("lessons")
        .select("*")
        .eq("class_id", selectedClass);

      if (selectedSubject) {
        query = query.eq("subject", selectedSubject);
      }

      const { data: lessonData, error: lessonError } = await query.order(
        "date",
        { ascending: false },
      );
      if (lessonError) throw lessonError;

      setLessons(lessonData || []);

      if (lessonData && lessonData.length > 0) {
        const lessonIds = lessonData.map((l) => l.id);
        const { data: attData, error: attError } = await supabase
          .from("attendance")
          .select("*")
          .in("lesson_id", lessonIds);
        if (attError) throw attError;
        setAttendanceRecords(attData || []);
      } else {
        setAttendanceRecords([]);
      }
    } catch (err) {
      console.error("Erro ao buscar dados do histórico de diários:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        const response = await fetch("/api/admin/upload-laudo", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imageBase64: base64String,
            filename: file.name,
          }),
        });

        const data = await response.json();
        if (data && data.success && data.fileUrl) {
          setEditFileUrl(data.fileUrl);
        } else {
          alert(
            "Falha no upload do laudo: " + (data.error || "Erro desconhecido"),
          );
        }
        setIsUploading(false);
      };
      reader.onerror = () => {
        alert("Erro ao ler o arquivo selecionado.");
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error(err);
      alert("Erro ao enviar o laudo: " + err.message);
      setIsUploading(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setLoading(true);
      const filename = `Diario_Branco_${selectedClass || "Geral"}_${blankBimester.replace(/\s+/g, "_")}`;
      await exportToPDF("blank-diary-pdf", filename);
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      alert("Erro ao exportar o PDF.");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = `Relatorio_${activeTab}_${selectedClass || "Geral"}_${selectedSubject || "Geral"}.csv`;

    if (activeTab === "medical") {
      headers = [
        "Aluno",
        "Data de Nascimento",
        "Laudo / Informacao Medica",
        "Link do Documento",
      ];
      filteredStudents.forEach((student) => {
        const medical = medicalRecords[student.name];
        rows.push([
          student.name,
          student.birthDate
            ? student.birthDate.split("-").reverse().join("/")
            : "—",
          medical?.notes || "Nenhuma informacao registrada.",
          medical?.fileUrl || "",
        ]);
      });
    } else if (activeTab === "annual") {
      headers = [
        "Aluno",
        "1B Nota",
        "1B Faltas",
        "2B Nota",
        "2B Faltas",
        "3B Nota",
        "3B Faltas",
        "4B Nota",
        "4B Faltas",
        "Media Final",
        "Faltas Totais",
      ];
      filteredStudents.forEach((student) => {
        const stats = getStudentStats(student.name);
        const resultsArray: string[] = [];
        let totalSum = 0;
        let bimestersCount = 0;
        let totalAbsences = 0;

        stats.forEach((b) => {
          resultsArray.push(b.avg ? b.avg.toFixed(1) : "-");
          resultsArray.push(b.absences.toString());
          if (b.avg !== null) {
            totalSum += b.avg;
            bimestersCount++;
          }
          totalAbsences += b.absences;
        });

        const finalAvg =
          bimestersCount > 0 ? (totalSum / bimestersCount).toFixed(1) : "-";
        rows.push([
          student.name,
          ...resultsArray,
          finalAvg,
          totalAbsences.toString(),
        ]);
      });
    } else if (activeTab === "unified") {
      headers = [
        "Data",
        "Aula N",
        "Bimestre",
        "Conteudo Ministrado",
        "Faltas Registradas",
      ];
      const filteredLessons = lessons.filter(
        (lesson) =>
          selectedSubject === "" || lesson.subject === selectedSubject,
      );
      filteredLessons.forEach((lesson) => {
        const absents = attendanceRecords.filter(
          (a) => a.lesson_id === lesson.id && a.status === "absent",
        );
        rows.push([
          lesson.date ? new Date(lesson.date).toLocaleDateString("pt-BR") : "—",
          (lesson.lesson_count || 1).toString(),
          lesson.bimester || "—",
          stripHtml(lesson.content || "—"),
          absents.map((a) => a.student_name).join("; ") || "Frequência 100%",
        ]);
      });
    } else if (activeTab === "blank") {
      headers = ["Aula", "Data", "Conteudo Ministrado"];
      for (let i = 1; i <= 30; i++) {
        rows.push([
          i.toString(),
          "____/____/2026",
          "____________________________________________________________________",
        ]);
      }
    }

    const csvContent =
      "\uFEFF" +
      [
        headers.join(","),
        ...rows.map((row) =>
          row.map((cell) => `"${(cell || "").replace(/"/g, '""')}"`).join(","),
        ),
      ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const stripHtml = (html: string) => {
    if (!html) return "";
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent || "";
  };

  const getStudentStats = (studentName: string) => {
    const studentResults = results.filter((r) => r.studentName === studentName);
    const bimesters = [
      "1º Bimestre",
      "2º Bimestre",
      "3º Bimestre",
      "4º Bimestre",
    ];

    return bimesters.map((bim) => {
      const bimResults = studentResults.filter((r) => {
        const ex = exams.find((e) => e.id === r.examId);
        const resolvedBimester = r.bimester || (ex ? getBimesterForExam(ex, schoolInfo?.bimesterDates) : undefined);
        return (
          resolvedBimester === bim &&
          (ex?.subject === selectedSubject || !selectedSubject)
        );
      });

      // Simple average for now
      const avg =
        bimResults.length > 0
          ? bimResults.reduce(
              (acc, curr) => acc + (curr.score / curr.maxScore) * 10,
              0,
            ) / bimResults.length
          : null;

      // Absences
      let absences = 0;
      const bimLessons = lessons.filter(
        (l) =>
          l.bimester === bim &&
          (l.subject === selectedSubject || !selectedSubject),
      );
      bimLessons.forEach((l) => {
        const isAbsent = attendanceRecords.some(
          (a) =>
            a.lesson_id === l.id &&
            a.student_name === studentName &&
            a.status === "absent",
        );
        if (isAbsent) absences += l.lesson_count || 1;
      });

      return { bimester: bim, avg, absences };
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 pb-20"
    >
      <div className="flex items-center justify-between no-print">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-slate-700 dark:text-slate-200 transition-colors font-bold uppercase text-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Diário
        </button>
        <div className="flex items-center gap-3">
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="border rounded-xl px-4 py-2 font-bold transition-all bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
          >
            <option value="">Todas as Turmas</option>
            {infantilClasses.length > 0 && (
              <optgroup
              >
                {infantilClasses.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </optgroup>
            )}
            {fund1Classes.length > 0 && (
              <optgroup
              >
                {fund1Classes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </optgroup>
            )}
            {fund2Classes.length > 0 && (
              <optgroup
              >
                {fund2Classes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </optgroup>
            )}
            {otherClasses.length > 0 && (
              <optgroup
              >
                {otherClasses.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="border rounded-xl px-4 py-2 font-bold transition-all bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
          >
            <option value="">Todas as Disciplinas</option>
            {subjects.map((s) => (
              <option key={s} value={s}>
                {s.toUpperCase()}
              </option>
            ))}
          </select>
          {activeTab === "blank" && (
            <>
              <select
                value={blankBimester}
                onChange={(e) => setBlankBimester(e.target.value)}
                className="border rounded-xl px-4 py-2 font-bold transition-all uppercase cursor-pointer bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
              >
                <option value="1º BIMESTRE">1º BIMESTRE</option>
                <option value="2º BIMESTRE">2º BIMESTRE</option>
                <option value="3º BIMESTRE">3º BIMESTRE</option>
                <option value="4º BIMESTRE">4º BIMESTRE</option>
              </select>
              <select
                value={blankTurn}
                onChange={(e) => setBlankTurn(e.target.value)}
                className="border rounded-xl px-4 py-2 font-bold transition-all uppercase cursor-pointer bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
              >
                <option value="MANHÃ">MANHÃ</option>
                <option value="TARDE">TARDE</option>
                <option value="NOITE">NOITE</option>
              </select>
            </>
          )}
          <button
            type="button"
            onClick={handlePrint}
            className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-md cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Imprimir Relatório
          </button>
          {activeTab === "blank" ? (
            <button
              type="button"
              onClick={handleExportPDF}
              className="bg-[#800020] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-[#600018] transition-all shadow-md cursor-pointer text-white"
            >
              <Download className="w-4 h-4" />
              Exportar PDF
            </button>
          ) : (
            <button
              type="button"
              onClick={handleExport}
              className="bg-[#800020] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-[#600018] transition-all shadow-md cursor-pointer text-white"
            >
              <Download className="w-4 h-4" />
              Exportar XLS/CSV
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden no-print">
        <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto whitespace-nowrap scrollbar-none w-full max-w-full md:flex-wrap">
          <button
            onClick={() => setActiveTab("medical")}
            className={cn(
              "flex-1 sm:flex-none py-4 px-4 sm:px-6 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all border-b-2 flex items-center justify-center gap-1.5 sm:gap-2 shrink-0",
              activeTab === "medical"
                ? "text-primary border-primary bg-primary/5 font-extrabold"
                : "text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200",
            )}
          >
            <Heart className="w-4 h-4" />
            Dados Médicos
          </button>
          <button
            onClick={() => setActiveTab("annual")}
            className={cn(
              "flex-1 sm:flex-none py-4 px-4 sm:px-6 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all border-b-2 flex items-center justify-center gap-1.5 sm:gap-2 shrink-0",
              activeTab === "annual"
                ? "text-primary border-primary bg-primary/5 font-extrabold"
                : "text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200",
            )}
          >
            <Table className="w-4 h-4" />
            Resumo Anual
          </button>
          <button
            onClick={() => setActiveTab("unified")}
            className={cn(
              "flex-1 sm:flex-none py-4 px-4 sm:px-6 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all border-b-2 flex items-center justify-center gap-1.5 sm:gap-2 shrink-0",
              activeTab === "unified"
                ? "text-primary border-primary bg-primary/5 font-extrabold"
                : "text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200",
            )}
          >
            <ClipboardList className="w-4 h-4" />
            Notas & Conteúdo
          </button>
          <button
            onClick={() => setActiveTab("blank")}
            className={cn(
              "flex-1 sm:flex-none py-4 px-4 sm:px-6 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all border-b-2 flex items-center justify-center gap-1.5 sm:gap-2 shrink-0",
              activeTab === "blank"
                ? "text-primary border-primary bg-primary/5 font-extrabold"
                : "text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200",
            )}
          >
            <FileText className="w-4 h-4" />
            Diário Branco
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-8 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl min-h-[600px] print:p-0 print:border-none print:shadow-none print:rounded-none">
        <AnimatePresence mode="wait">
          {activeTab === "medical" && (
            <motion.div
              key="medical"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <InstitutionalHeader />
              <div className="flex items-center justify-between mb-4 no-print">
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-500" />
                  <h2 className="font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">
                    Informações Médicas & Laudos
                  </h2>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => {
                      if (!selectedClass) {
                        alert("Por favor, selecione uma turma primeiro.");
                        return;
                      }
                      setEditingStudent({ name: "", classId: selectedClass });
                      setEditNotes("");
                      setEditFileUrl("");
                    }}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-emerald-700 shadow-sm transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Vincular Laudo
                  </button>
                )}
              </div>

              {!selectedClass ? (
                <div className="py-20 text-center text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest">
                  Selecione uma turma para ver os laudos.
                </div>
              ) : (
                <div className="overflow-x-auto border-2 border-slate-200 dark:border-slate-800 rounded-2xl">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#800020] text-white text-white">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black uppercase  text-white">
                          Aluno
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase  text-white">
                          Data de Nasc.
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase  text-white">
                          Laudo / Informação Médica
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase  no-print text-white">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStudents.map((student) => (
                        <tr
                          key={student.name}
                          className="hover:bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200/ transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center font-black text-slate-600 dark:text-slate-400 text-[10px]">
                                {student.name.charAt(0)}
                              </div>
                              <span className="font-black text-slate-700 dark:text-slate-300 uppercase text-xs">
                                {student.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            {student.birthDate
                              ? student.birthDate.split("-").reverse().join("/")
                              : "—"}
                          </td>
                          <td className="px-6 py-4">
                            {medicalRecords[student.name]?.notes ? (
                              <div className="bg-red-50 text-red-700 p-3 rounded-lg text-[11px] font-medium leading-relaxed border border-red-100">
                                {medicalRecords[student.name].notes}
                              </div>
                            ) : (
                              <span className="text-slate-700 dark:text-slate-300 italic text-[11px]">
                                Nenhuma informação registrada.
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 no-print">
                            <div className="flex gap-2">
                              {medicalRecords[student.name]?.fileUrl && (
                                <a
                                  href={medicalRecords[student.name].fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                  title="Ver Laudo Digitalizado"
                                >
                                  <FileText className="w-4 h-4" />
                                </a>
                              )}
                              {isAdmin && (
                                <button
                                  onClick={() => {
                                    setEditingStudent(student);
                                    setEditNotes(
                                      medicalRecords[student.name]?.notes || "",
                                    );
                                    setEditFileUrl(
                                      medicalRecords[student.name]?.fileUrl ||
                                        "",
                                    );
                                  }}
                                  className="p-2 text-slate-600 dark:text-slate-400 hover:text-primary transition-all"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Edit Medical Info Modal */}
              <AnimatePresence>
                {editingStudent && (
                  <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-[100] backdrop-blur-sm no-print">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-red-100 rounded-lg text-red-600">
                            <Stethoscope className="w-5 h-5" />
                          </div>
                          <h3 className="font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">
                            Editar Dados Médicos
                          </h3>
                        </div>
                        <button
                          onClick={() => setEditingStudent(null)}
                          className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="space-y-6">
                        {editingStudent.name === "" ? (
                          <select
                            value={editingStudent.name}
                            onChange={(e) =>
                              setEditingStudent({
                                ...editingStudent,
                                name: e.target.value,
                              })
                            }
                            className="w-full border rounded-xl px-4 py-3 transition-all font-bold uppercase cursor-pointer bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
                          >
                            <option value="">Selecione o(a) aluno(a)...</option>
                            {filteredStudents
                              .sort((a, b) => a.name.localeCompare(b.name))
                              .map((student) => (
                                <option key={student.name} value={student.name}>
                                  {student.name}
                                </option>
                              ))}
                          </select>
                        ) : (
                          <div className="bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-4 py-3 rounded-xl font-bold text-slate-700 dark:text-slate-300 text-sm uppercase">
                            {editingStudent.name}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 mb-2 block tracking-widest">
                          Informações / Laudos (Visível para todos)
                        </label>
                        <textarea
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          placeholder="Anemia falciforme, Diabetes, Alergias, etc..."
                          className="w-full bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none h-32 transition-all font-medium"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 mb-2 block tracking-widest">
                          Enviar Foto ou Documento do Laudo
                        </label>

                        <div className="space-y-3">
                          <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl py-6 px-4 hover:bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 transition-all cursor-pointer group">
                            <div className="p-3 bg-red-50 text-[#800020] rounded-full group-hover:scale-110 transition-transform">
                              {isUploading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                <Download className="w-5 h-5" />
                              )}
                            </div>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-3">
                              {isUploading
                                ? "Enviando arquivo..."
                                : "Selecionar Foto ou PDF do Laudo"}
                            </span>
                            <span className="text-[9px] text-slate-600 dark:text-slate-400 font-bold uppercase mt-1">
                              Câmera, Galeria ou Computador
                            </span>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={handleFileUpload}
                              disabled={isUploading}
                              className="hidden"
                            />
                          </label>

                          {editFileUrl && (
                            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200/ flex items-center justify-between">
                              <span className="text-[10px] text-slate-700 dark:text-slate-300 truncate max-w-[200px] font-bold">
                                {editFileUrl.startsWith("/uploads/")
                                  ? "Arquivo enviado: " +
                                    editFileUrl.replace("/uploads/", "")
                                  : "Link externo cadastrado"}
                              </span>
                              <a
                                href={editFileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-[#800020] font-black uppercase hover:underline"
                              >
                                Visualizar
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-3 pt-4">
                        <button
                          onClick={() => setEditingStudent(null)}
                          className="flex-1 px-4 py-3 border-2 border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 transition-all"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={async () => {
                            if (!editingStudent.name) {
                              alert("Por favor, selecione um aluno.");
                              return;
                            }
                            setSavingMedical(true);
                            const ok = await onSaveMedicalInfo(
                              editingStudent.name,
                              { notes: editNotes, fileUrl: editFileUrl },
                            );
                            if (ok) {
                              setEditingStudent(null);
                            }
                            setSavingMedical(false);
                          }}
                          disabled={savingMedical}
                          className="flex-1 px-4 py-3 bg-slate-900 border-2 border-slate-900 rounded-xl text-xs font-black uppercase tracking-widest text-white hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                        >
                          {savingMedical ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          Salvar Dados
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {activeTab === "annual" && (
            <motion.div
              key="annual"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <InstitutionalHeader />
              <div className="text-center mb-8">
                <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter">
                  Resumo Anual de Notas e Faltas
                </h1>
                <p className="text-slate-700 dark:text-slate-300 text-xs font-black uppercase tracking-widest mt-1">
                  {selectedClass || "Geral"} •{" "}
                  {selectedSubject || "Todas as Matérias"} • Ano Letivo 2026
                </p>
              </div>

              {!selectedClass ? (
                <div className="py-20 text-center text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest">
                  Selecione uma turma para ver o resumo.
                </div>
              ) : (
                <div className="border-4 border-black p-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 overflow-x-auto shadow-[12px_12px_0px_0px_rgba(0,0,0,0.05)]">
                  <table className="w-full border-collapse border-2 border-black">
                    <thead className="bg-[#800020] text-white text-white">
                <tr className="transition-colors">
                        <th
                          rowSpan={2}
                          className="border-2 border-black p-3 text-left text-[11px] font-black uppercase w-64 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                        >
                          ALUNOS
                        </th>
                        <th
                          colSpan={2}
                          className="border-2 border-black p-2 text-center text-[10px] font-black uppercase"
                        >
                          1º BIMESTRE
                        </th>
                        <th
                          colSpan={2}
                          className="border-2 border-black p-2 text-center text-[10px] font-black uppercase"
                        >
                          2º BIMESTRE
                        </th>
                        <th
                          colSpan={2}
                          className="border-2 border-black p-2 text-center text-[10px] font-black uppercase"
                        >
                          3º BIMESTRE
                        </th>
                        <th
                          colSpan={2}
                          className="border-2 border-black p-2 text-center text-[10px] font-black uppercase"
                        >
                          4º BIMESTRE
                        </th>
                        <th
                          colSpan={2}
                          className="border-2 border-black p-2 text-center text-[11px] font-black uppercase bg-slate-200"
                        >
                          TOTAL ANUAL
                        </th>
                      </tr>
                      <tr className="bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-[8px] font-black uppercase">
                        <th className="border-2 border-black p-1 text-center w-12  text-white">
                          NOTA
                        </th>
                        <th className="border-2 border-black p-1 text-center w-10 text-red-400 text-white">
                          FAUT.
                        </th>
                        <th className="border-2 border-black p-1 text-center w-12  text-white">
                          NOTA
                        </th>
                        <th className="border-2 border-black p-1 text-center w-10 text-red-400 text-white">
                          FAUT.
                        </th>
                        <th className="border-2 border-black p-1 text-center w-12  text-white">
                          NOTA
                        </th>
                        <th className="border-2 border-black p-1 text-center w-10 text-red-400 text-white">
                          FAUT.
                        </th>
                        <th className="border-2 border-black p-1 text-center w-12  text-white">
                          NOTA
                        </th>
                        <th className="border-2 border-black p-1 text-center w-10 text-red-400 text-white">
                          FAUT.
                        </th>
                        <th className="border-2 border-black p-1 text-center w-16 bg-slate-200 text-blue-900 text-white">
                          MÉDIA
                        </th>
                        <th className="border-2 border-black p-1 text-center w-12 bg-slate-200 text-red-900 text-white">
                          F. TOT.
                        </th>
                      </tr>
                    </thead>
                    <tbody className="text-[11px] font-black">
                      {filteredStudents.map((student) => {
                        const stats = getStudentStats(student.name);
                        const totalAbs = stats.reduce(
                          (acc, curr) => acc + curr.absences,
                          0,
                        );
                        const validAverages = stats
                          .filter((s) => s.avg !== null)
                          .map((s) => s.avg as number);
                        const finalAvg =
                          validAverages.length > 0
                            ? validAverages.reduce((a, b) => a + b, 0) /
                              validAverages.length
                            : null;

                        return (
                          <tr
                            key={student.name}
                            className="hover:bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 transition-colors"
                          >
                            <td className="border-2 border-black px-4 py-2 text-left uppercase truncate max-w-[200px]">
                              {student.name}
                            </td>
                            {stats.map((s, i) => (
                              <React.Fragment key={i}>
                                <td
                                  className={cn(
                                    "border-2 border-black px-1 py-2 text-center",
                                    s.avg !== null && s.avg < 6
                                      ? "text-red-600"
                                      : "text-slate-700 dark:text-slate-200",
                                  )}
                                >
                                  {s.avg !== null
                                    ? s.avg.toFixed(1).replace(".", ",")
                                    : "—"}
                                </td>
                                <td className="border-2 border-black px-1 py-2 text-center text-red-600">
                                  {s.absences > 0 ? s.absences : "0"}
                                </td>
                              </React.Fragment>
                            ))}
                            <td
                              className={cn(
                                "border-2 border-black px-1 py-2 text-center bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-blue-900 font-extrabold",
                                finalAvg !== null && finalAvg < 6
                                  ? "text-red-700"
                                  : "",
                              )}
                            >
                              {finalAvg !== null
                                ? finalAvg.toFixed(1).replace(".", ",")
                                : "—"}
                            </td>
                            <td className="border-2 border-black px-1 py-2 text-center bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-red-900 font-extrabold">
                              {totalAbs}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "unified" && (
            <motion.div
              key="unified"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <InstitutionalHeader />
              <div className="flex flex-col items-center mb-8 text-center pt-6">
                <div className="w-16 h-1 bg-primary mb-6"></div>
                <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase">
                  Relatório de Notas, Frequências & Conteúdos
                </h1>
                <p className="text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-widest mt-2">
                  {selectedClass} • {selectedSubject}
                </p>
              </div>

              {!selectedClass ? (
                <div className="py-20 text-center text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest">
                  Selecione uma turma para ver o relatório unificado.
                </div>
              ) : (
                <div className="space-y-12">
                  {lessons
                    .filter(
                      (lesson) =>
                        selectedSubject === "" ||
                        lesson.subject === selectedSubject,
                    )
                    .map((lesson) => (
                      <div
                        key={lesson.id}
                        className="border-2 border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm"
                      >
                        <div className="bg-slate-900 p-5 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-white opacity-50" />
                            <span className="text-white font-black uppercase text-xs tracking-widest">
                              {new Date(lesson.date).toLocaleDateString(
                                "pt-BR",
                                {
                                  weekday: "long",
                                  day: "2-digit",
                                  month: "long",
                                  year: "numeric",
                                },
                              )}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <span className="bg-slate-800/ text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">
                              {lesson.lesson_count} HORAS/AULA
                            </span>
                            <span className="bg-primary text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">
                              {lesson.bimester}
                            </span>
                          </div>
                        </div>

                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                              <BookOpen className="w-4 h-4 text-blue-600" />
                              <h4 className="font-black text-slate-700 dark:text-slate-200 text-[10px] uppercase tracking-widest">
                                Conteúdo Ministrado
                              </h4>
                            </div>
                            <div className="p-5 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-2xl text-[12px] font-medium leading-relaxed text-slate-700 dark:text-slate-300 min-h-[100px]">
                              {lesson.content}
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Users className="w-4 h-4 text-emerald-600" />
                              <h4 className="font-black text-slate-700 dark:text-slate-200 text-[10px] uppercase tracking-widest">
                                Faltas do dia
                              </h4>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {attendanceRecords.filter(
                                (a) =>
                                  a.lesson_id === lesson.id &&
                                  a.status === "absent",
                              ).length === 0 ? (
                                <span className="text-slate-700 dark:text-slate-300 italic text-[11px] p-2">
                                  Nenhuma falta registrada.
                                </span>
                              ) : (
                                attendanceRecords
                                  .filter(
                                    (a) =>
                                      a.lesson_id === lesson.id &&
                                      a.status === "absent",
                                  )
                                  .map((a) => (
                                    <span
                                      key={a.student_name}
                                      className="bg-red-50 text-red-700 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border border-red-100 flex items-center gap-1.5"
                                    >
                                      {a.student_name}
                                    </span>
                                  ))
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Related Exams on this day */}
                        {exams.filter(
                          (e) =>
                            e.examDate === lesson.date &&
                            (e.subject === selectedSubject || !selectedSubject),
                        ).length > 0 && (
                          <div className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200/ p-6 border-t border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-2 mb-4">
                              <AlertCircle className="w-4 h-4 text-amber-500" />
                              <h4 className="font-black text-slate-700 dark:text-slate-200 text-[10px] uppercase tracking-widest">
                                Avaliações Realizadas no Período
                              </h4>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {exams
                                .filter(
                                  (e) =>
                                    e.examDate === lesson.date &&
                                    (e.subject === selectedSubject ||
                                      !selectedSubject),
                                )
                                .map((ex) => (
                                  <div
                                    key={ex.id}
                                    className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-sm"
                                  >
                                    <div>
                                      <h5 className="font-black text-slate-700 dark:text-slate-200 text-xs uppercase">
                                        {stripHtml(ex.title)}
                                      </h5>
                                      <span className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase">
                                        {ex.examType}
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-xs font-black text-primary">
                                        PESO 10.0
                                      </span>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "blank" && (
            <motion.div
              key="blank"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-12 py-10"
            >
              {/* Printable Blank Diary Template */}
              <div
                id="blank-diary-pdf"
                className="p-8 sm:p-12 max-w-[210mm] mx-auto bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl print:shadow-none print:p-0"
              >
                <InstitutionalHeader />
                {/* Metadata Information Box */}
                <div className="grid grid-cols-7 border-2 border-slate-950 text-center text-[10px] font-bold uppercase mb-6 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 tracking-tight">
                  <div className="border-r-2 border-slate-950">
                    <div className="bg-slate-200 py-1.5 border-b-2 border-slate-950 font-black text-[9px] sm:text-[10px]">
                      Exercício
                    </div>
                    <div className="py-2 text-slate-800 dark:text-slate-100 text-[10px] sm:text-[11px] font-extrabold flex items-center justify-center h-8">
                      2026
                    </div>
                  </div>
                  <div className="border-r-2 border-slate-950 col-span-2">
                    <div className="bg-slate-200 py-1.5 border-b-2 border-slate-950 font-black text-[9px] sm:text-[10px]">
                      Curso
                    </div>
                    <div className="py-2 text-slate-800 dark:text-slate-100 text-[10px] sm:text-[11px] font-extrabold flex items-center justify-center truncate px-1 h-8">
                      {studentCourse}
                    </div>
                  </div>
                  <div className="border-r-2 border-slate-950">
                    <div className="bg-slate-200 py-1.5 border-b-2 border-slate-950 font-black text-[9px] sm:text-[10px]">
                      Turma
                    </div>
                    <div className="py-2 text-slate-800 dark:text-slate-100 text-[10px] sm:text-[11px] font-extrabold flex items-center justify-center truncate px-1 h-8">
                      {selectedClass ? selectedClass : "_____________"}
                    </div>
                  </div>
                  <div className="border-r-2 border-slate-950 col-span-2">
                    <div className="bg-slate-200 py-1.5 border-b-2 border-slate-950 font-black text-[9px] sm:text-[10px]">
                      Disciplina
                    </div>
                    <div className="py-2 text-slate-800 dark:text-slate-100 text-[10px] sm:text-[11px] font-extrabold flex items-center justify-center truncate px-2 h-8">
                      {selectedSubject
                        ? selectedSubject.toUpperCase()
                        : "TODAS AS DISCIPLINAS"}
                    </div>
                  </div>
                  <div>
                    <div className="bg-slate-200 py-1.5 border-b-2 border-slate-950 font-black text-[9px] sm:text-[10px]">
                      Turno
                    </div>
                    <div className="py-2 text-slate-800 dark:text-slate-100 text-[10px] sm:text-[11px] font-extrabold flex items-center justify-center uppercase h-8">
                      {blankTurn}
                    </div>
                  </div>
                </div>

                {/* Frequencies Log Grid Title Card */}
                <div className="border-2 border-slate-950 font-sans">
                  <div className="bg-slate-200 py-1.5 border-b-2 border-slate-950 font-black text-center text-xs sm:text-sm uppercase tracking-wider text-black">
                    DIÁRIO DO {blankBimester.toUpperCase()}
                  </div>
                  <div className="bg-slate-200 py-1.5 border-b-2 border-slate-950 font-black text-center text-[10px] sm:text-xs uppercase tracking-widest text-slate-700 dark:text-slate-200">
                    FREQUÊNCIAS
                  </div>

                  {/* Attendance Check Grid Table */}
                  <table className="w-full border-collapse text-[9px] font-sans">
                    <thead className="bg-[#800020] text-white text-white">
                <tr className="transition-colors">
                        <th className="px-3 border-r-2 border-slate-950 border-b border-slate-950 text-left w-64 min-w-[200px] text-[10px] font-black uppercase  text-white">
                          Aluno
                        </th>
                        {[...Array(25)].map((_, i) => (
                          <th
                            key={i}
                            className="border-r border-b border-slate-200 dark:border-slate-800 border-b-slate-950 w-5 text-[8px] font-black select-none"
                          >
                            {/* Small tick headers */}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {displayStudents.map((student, idx) => (
                        <tr
                          key={idx}
                          className="h-[25px] border-b border-slate-950 last:border-b-0 hover:bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 transition-colors"
                        >
                          <td className="px-3 border-r-2 border-slate-950 text-left font-black text-slate-800 dark:text-slate-100 uppercase text-[9px] truncate max-w-[220px]">
                            {student.name
                              ? `${String(idx + 1).padStart(2, "0")}. ${student.name}`
                              : `${String(idx + 1).padStart(2, "0")}. ________________________________________`}
                          </td>
                          {[...Array(25)].map((_, i) => (
                            <td
                              key={i}
                              className="border-r border-slate-200 dark:border-slate-800 last:border-r-0 w-5 h-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 select-none"
                            >
                              {/* Empty square grid cells */}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Comments Area */}
                <div className="space-y-1 my-6 text-[11px] font-bold text-slate-700 dark:text-slate-200">
                  <p className="uppercase font-black text-xs text-black mb-1">
                    Observações:
                  </p>
                  <div className="border-b border-dashed border-slate-200 dark:border-slate-800 h-6"></div>
                  <div className="border-b border-dashed border-slate-200 dark:border-slate-800 h-6"></div>
                  <div className="border-b border-dashed border-slate-200 dark:border-slate-800 h-6"></div>
                </div>

                {/* Date Sign */}
                <div className="text-right text-[10px] font-black uppercase text-slate-700 dark:text-slate-200 tracking-tight my-6">
                  {currentDateFormatted}
                </div>

                {/* Signature Blocks */}
                <div className="grid grid-cols-3 gap-8 mt-14 text-center text-[9px] sm:text-[10px] font-black uppercase text-slate-700 dark:text-slate-200 tracking-tight">
                  <div className="flex flex-col items-center">
                    <div className="w-full border-t border-slate-950 max-w-[170px] mb-1.5"></div>
                    <span>Professor(a) responsável</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-full border-t border-slate-950 max-w-[170px] mb-1.5"></div>
                    <span>Coordenador(a)</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-full border-t border-slate-950 max-w-[170px] mb-1.5"></div>
                    <span>Secretário(a)</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
