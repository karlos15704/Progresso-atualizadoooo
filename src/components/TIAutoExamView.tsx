import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { ViewHeader } from "./ViewHeader";
import { LOGO_VINHO, LOGO_COC } from "../assets";
import { 
  Upload, 
  AlertCircle, 
  Cpu, 
  FileText, 
  Sparkles, 
  Plus, 
  Trash2, 
  Settings, 
  ArrowLeft, 
  CheckCircle, 
  Loader2,
  HelpCircle,
  Shapes,
  Maximize2,
  Camera
} from "lucide-react";
import { motion } from "motion/react";
import { getFilteredClasses } from "../utils/classUtils";

interface TIAutoExamViewProps {
  user: any;
  userProfile: any;
  schoolInfo: any;
  onBack: () => void;
  initialType?: "Prova" | "Atividade";
}

interface Question {
  id: number;
  type: "objective" | "essay";
  text: string;
  options: string[];
  correctAnswer: string;
  points: number;
  lineCount?: number;
  image?: string;
  imageSize?: number;
  imageAlign?: "left" | "center" | "right";
  drawingShape?: "none" | "circle" | "square" | "rectangle" | "triangle" | "right-triangle" | "line" | "arrow";
  drawingShapeSize?: number;
  drawingShapeHeight?: number;
  drawingShapeFill?: string;
  drawingShapeBorderColor?: string;
  drawingShapeBorderWidth?: number;
  drawingShapeBorderStyle?: "solid" | "dashed" | "dotted";
  drawingShapeText?: string;
  drawingShapeTextColor?: string;
}

export default function TIAutoExamView({ user, userProfile, schoolInfo, onBack, initialType }: TIAutoExamViewProps) {
  const [documentType, setDocumentType] = useState(initialType || "Prova");
  const [professors, setProfessors] = useState<any[]>([]);
  const [selectedProfId, setSelectedProfId] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedBimester, setSelectedBimester] = useState("1º Bimestre");
  const [selectedExamType, setSelectedExamType] = useState("PII");
  const [customInstructions, setCustomInstructions] = useState("");
  const [conteudoProva, setConteudoProva] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileMime, setFileMime] = useState<string>("");
  const [inputMode, setInputMode] = useState<"file" | "text">("file");
  const [pastedText, setPastedText] = useState("");
  
  // App States
  const [step, setStep] = useState<"setup" | "loading" | "editor">("setup");
  const [loadingMessage, setLoadingMessage] = useState("Iniciando processamento...");
  const [parsedTitle, setParsedTitle] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cycling messages for loading state
  const loadingTexts = [
    "Carregando o arquivo e validando integridade...",
    "Conectando com o servidor multimodal do Gemini...",
    "Analisando estrutura geral do documento...",
    "Extraindo textos de enunciados e cabeçalho...",
    "Identificando questões objetivas e dissertativas...",
    "Separando alternativas de múltipla escolha e detectando gabarito...",
    "Buscando formas geométricas, tabelas ou gráficos no arquivo...",
    "Mapeando formas detectadas (círculos, triângulos, retângulos)...",
    "Configurando propriedades dos vetores SVG nativos...",
    "Organizando o layout final da prova no padrão Colégio Progresso..."
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === "loading") {
      let index = 0;
      setLoadingMessage(loadingTexts[0]);
      interval = setInterval(() => {
        index = (index + 1) % loadingTexts.length;
        setLoadingMessage(loadingTexts[index]);
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [step]);

  // Fetch professors list from database
  useEffect(() => {
    const fetchProfessors = async () => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("uid, professional_name, email")
          .order("professional_name");
        
        if (error) throw error;
        if (data) {
          setProfessors(data);
          // Set default selected professor
          if (userProfile?.uid) {
            setSelectedProfId(userProfile.uid);
          } else if (data.length > 0) {
            setSelectedProfId(data[0].uid);
          }
        }
      } catch (err) {
        console.error("Error fetching professors:", err);
      }
    };

    fetchProfessors();
    
    // Set default class & subject from schoolInfo
    if (schoolInfo) {
      if (schoolInfo.classes && schoolInfo.classes.length > 0) {
        setSelectedClass(schoolInfo.classes[0]);
      }
      
      const allowedSubs = (userProfile?.assigned_subjects && userProfile.assigned_subjects.length > 0)
        ? schoolInfo.subjects?.filter((s: string) => userProfile.assigned_subjects.includes(s))
        : schoolInfo.subjects;

      if (allowedSubs && allowedSubs.length > 0) {
        setSelectedSubject(allowedSubs[0]);
      }
    }
  }, [schoolInfo, userProfile]);

  // Dynamically update parsedTitle when subject, type, bimester or conteudoProva changes
  useEffect(() => {
    if (documentType === "Atividade") {
      setParsedTitle(`Atividade de ${selectedSubject} (${selectedBimester})`);
    } else {
      if (conteudoProva.trim()) {
        setParsedTitle(`Avaliação de ${selectedSubject} (${selectedExamType} - ${selectedBimester}) - ${conteudoProva}`);
      } else {
        setParsedTitle(`Avaliação de ${selectedSubject} (${selectedExamType} - ${selectedBimester})`);
      }
    }
  }, [documentType, selectedSubject, selectedExamType, selectedBimester, conteudoProva]);

  // Handle file drop / selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = (selectedFile: File) => {
    setFile(selectedFile);
    setFileMime(selectedFile.type);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Extract the raw base64 string without data:mime;base64, prefix
      const base64 = result.split(",")[1];
      setFileBase64(base64);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  // Call the backend parsing API
  const handleGenerateExam = async () => {
    if (inputMode === "file" && !fileBase64) {
      setErrorMessage("Por favor, selecione ou arraste um arquivo de prova.");
      return;
    }
    if (inputMode === "text" && !pastedText.trim()) {
      setErrorMessage("Por favor, insira ou cole o texto da prova.");
      return;
    }
    
    setErrorMessage("");
    setStep("loading");

    try {
      const response = await fetch("/api/admin/parse-exam-file", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fileBase64: inputMode === "file" ? fileBase64 : null,
          mimeType: inputMode === "file" ? fileMime : null,
          fileName: inputMode === "file" ? (file ? file.name : "") : null,
          rawText: inputMode === "text" ? pastedText : null,
          customInstructions
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        let errJson;
        try {
          errJson = JSON.parse(errText);
        } catch {
          errJson = { error: `Erro no servidor (${response.status})` };
        }
        throw new Error(errJson.error || "Erro ao processar prova.");
      }

      const data = await response.json();
      
      // Clean and normalize questions
      const parsedQuestions = (data.questions || []).map((q: any, idx: number) => ({
        id: q.id || idx + 1,
        type: q.type === "objective" ? "objective" : "essay",
        text: q.text || `Questão ${idx + 1}`,
        options: Array.isArray(q.options) ? q.options : [],
        correctAnswer: q.correctAnswer || "A",
        points: typeof q.points === "number" ? q.points : 1,
        lineCount: typeof q.lineCount === "number" ? q.lineCount : 5,
        drawingShape: q.drawingShape || "none",
        drawingShapeSize: q.drawingShapeSize || 150,
        drawingShapeHeight: q.drawingShapeHeight || 100,
        drawingShapeFill: q.drawingShapeFill || "transparent",
        drawingShapeBorderColor: q.drawingShapeBorderColor || "black",
        drawingShapeBorderWidth: q.drawingShapeBorderWidth || 2,
        drawingShapeBorderStyle: q.drawingShapeBorderStyle || "solid",
        drawingShapeText: q.drawingShapeText || ""
      }));

      setParsedTitle(data.title || `Avaliação ${selectedSubject} ${selectedExamType}`);
      setQuestions(parsedQuestions);
      setStep("editor");
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Erro de conexão ou erro no processamento do Gemini.");
      setStep("setup");
    }
  };

  // Question editing handlers
  const updateQuestionText = (index: number, text: string) => {
    const updated = [...questions];
    updated[index].text = text;
    setQuestions(updated);
  };

  const updateQuestionType = (index: number, type: "objective" | "essay") => {
    const updated = [...questions];
    updated[index].type = type;
    if (type === "objective" && updated[index].options.length === 0) {
      updated[index].options = ["Opção A", "Opção B", "Opção C", "Opção D"];
      updated[index].correctAnswer = "A";
    }
    setQuestions(updated);
  };

  const updateQuestionPoints = (index: number, points: number) => {
    const updated = [...questions];
    updated[index].points = points;
    setQuestions(updated);
  };

  const updateQuestionLineCount = (index: number, lines: number) => {
    const updated = [...questions];
    updated[index].lineCount = lines;
    setQuestions(updated);
  };

  const updateOptionText = (qIndex: number, optIndex: number, text: string) => {
    const updated = [...questions];
    updated[qIndex].options[optIndex] = text;
    setQuestions(updated);
  };

  const addOption = (qIndex: number) => {
    const updated = [...questions];
    const letter = String.fromCharCode(65 + updated[qIndex].options.length); // A, B, C, D, E...
    updated[qIndex].options.push(`Nova Opção ${letter}`);
    setQuestions(updated);
  };

  const removeOption = (qIndex: number, optIndex: number) => {
    const updated = [...questions];
    updated[qIndex].options.splice(optIndex, 1);
    // Adjust correct answer if out of bounds
    if (updated[qIndex].correctAnswer.charCodeAt(0) - 65 >= updated[qIndex].options.length) {
      updated[qIndex].correctAnswer = "A";
    }
    setQuestions(updated);
  };

  const updateCorrectAnswer = (qIndex: number, val: string) => {
    const updated = [...questions];
    updated[qIndex].correctAnswer = val;
    setQuestions(updated);
  };

  const deleteQuestion = (index: number) => {
    const updated = questions.filter((_, i) => i !== index);
    // Re-index questions
    const reindexed = updated.map((q, i) => ({ ...q, id: i + 1 }));
    setQuestions(reindexed);
  };

  const addEmptyQuestion = () => {
    const newQ: Question = {
      id: questions.length + 1,
      type: "essay",
      text: "Escreva o enunciado da nova questão aqui...",
      options: [],
      correctAnswer: "",
      points: 1,
      lineCount: 5,
      drawingShape: "none",
      drawingShapeSize: 150,
      drawingShapeHeight: 100,
      drawingShapeFill: "transparent",
      drawingShapeBorderColor: "black",
      drawingShapeBorderWidth: 2,
      drawingShapeBorderStyle: "solid",
      drawingShapeText: ""
    };
    setQuestions([...questions, newQ]);
  };

  const updateShapeProperty = (qIndex: number, field: string, val: any) => {
    const updated = [...questions];
    (updated[qIndex] as any)[field] = val;
    setQuestions(updated);
  };

  // Submit and save exam
  const handleSaveExam = async () => {
    setIsSaving(true);
    setErrorMessage("");
    try {
      const selectedProf = professors.find(p => p.uid === selectedProfId);
      const displayProfessorName = selectedProf?.professional_name || selectedProf?.email.split("@")[0] || "Professor";

      // Build answer key structured JSON
      const answerKey: any = {};
      questions.forEach((q) => {
        answerKey[q.id.toString()] = q.type === "objective" ? q.correctAnswer : "__ESSAY__";
      });

      const saveExamType = documentType === "Atividade" ? "Atividade" : selectedExamType;
      answerKey["_metadata"] = {
        content: `<div>${parsedTitle}</div>`,
        examDate: "",
        examTime: "",
        examType: saveExamType,
        fontSize: 12,
        classYear: selectedClass,
        isAdapted: false,
        fontFamily: "Inter",
        isExternal: false,
        adaptedStudents: []
      };

      const { error } = await supabase
        .from("exams")
        .insert([
          {
            professor_id: selectedProfId,
            title: parsedTitle,
            subject: selectedSubject,
            exam_type: documentType === "Atividade" ? "Atividade" : selectedExamType,
            exam_date: null,
            exam_time: null,
            class_year: selectedClass,
            bimester: selectedBimester,
            content: `<div>${parsedTitle}</div>`,
            questions: questions,
            answer_key: answerKey,
            study_guide: "",
            font_size: 12,
            font_family: "Inter"
          }
        ]);

      if (error) throw error;
      setSaveSuccess(true);
      setTimeout(() => {
        onBack();
      }, 2000);
    } catch (err: any) {
      console.error("Error saving exam:", err);
      setErrorMessage(err.message || "Erro ao salvar a prova no banco de dados.");
    } finally {
      setIsSaving(false);
    }
  };

  // SVG drawing shape renderer
  const renderShapeSVG = (q: Question) => {
    if (!q.drawingShape || q.drawingShape === "none") return null;

    const width = q.drawingShapeSize || 150;
    const height = q.drawingShape === "circle" || q.drawingShape === "square" ? width : (q.drawingShapeHeight || 100);
    const strokeWidth = q.drawingShapeBorderWidth || 2;
    const isDashed = q.drawingShapeBorderStyle === "dashed";
    const isDotted = q.drawingShapeBorderStyle === "dotted";
    const borderStyle = isDashed ? "5,5" : isDotted ? "2,2" : "none";

    const shapeProps = {
      fill: q.drawingShapeFill === "transparent" ? "none" : q.drawingShapeFill || "none",
      stroke: q.drawingShapeBorderColor || "black",
      strokeWidth: strokeWidth,
      strokeDasharray: borderStyle
    };

    let svgElement = null;
    const cx = width / 2;
    const cy = height / 2;

    switch (q.drawingShape) {
      case "circle":
        svgElement = <circle cx={cx} cy={cy} r={Math.min(width, height) / 2 - strokeWidth} {...shapeProps} />;
        break;
      case "square":
      case "rectangle":
        svgElement = (
          <rect
            x={strokeWidth}
            y={strokeWidth}
            width={width - strokeWidth * 2}
            height={height - strokeWidth * 2}
            {...shapeProps}
          />
        );
        break;
      case "triangle":
        const topX = width / 2;
        const topY = strokeWidth;
        const leftX = strokeWidth;
        const leftY = height - strokeWidth;
        const rightX = width - strokeWidth;
        const rightY = height - strokeWidth;
        svgElement = <polygon points={`${topX},${topY} ${leftX},${leftY} ${rightX},${rightY}`} {...shapeProps} />;
        break;
      case "right-triangle":
        svgElement = (
          <polygon
            points={`${strokeWidth},${strokeWidth} ${strokeWidth},${height - strokeWidth} ${width - strokeWidth},${height - strokeWidth}`}
            {...shapeProps}
          />
        );
        break;
      case "line":
        svgElement = <line x1={strokeWidth} y1={cy} x2={width - strokeWidth} y2={cy} {...shapeProps} />;
        break;
      case "arrow":
        svgElement = (
          <>
            <line x1={strokeWidth} y1={cy} x2={width - strokeWidth - 10} y2={cy} {...shapeProps} />
            <polygon
              points={`${width - strokeWidth},${cy} ${width - strokeWidth - 12},${cy - 6} ${width - strokeWidth - 12},${cy + 6}`}
              fill={shapeProps.stroke}
            />
          </>
        );
        break;
      default:
        return null;
    }

    return (
      <div className="flex justify-center my-3 relative">
        <svg width={width} height={height} className="overflow-visible">
          {svgElement}
          {q.drawingShapeText && (
            <text
              x={cx}
              y={cy}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={q.drawingShapeTextColor || "black"}
              fontSize={12}
              fontWeight="bold"
            >
              {q.drawingShapeText}
            </text>
          )}
        </svg>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      <div className="max-w-[1600px] w-full mx-auto px-4 md:px-6 py-6 flex-1 flex flex-col">
        {/* Header */}
        <ViewHeader 
          title={documentType === "Atividade" ? "Gerador IA de Atividades" : "Gerador IA de Provas"} 
          subtitle="Área administrativa de TI para importação e extração de avaliações via Gemini Multimodal"
          badge="Gestão de TI"
          icon={<Cpu className="w-6 h-6 text-amber-400" />}
        >
          <button 
            onClick={onBack}
            className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all duration-300"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar ao Painel
          </button>
        </ViewHeader>

        {errorMessage && (
          <div className="bg-red-950/40 border border-red-800/60 p-4 rounded-2xl flex items-start gap-3 text-red-300 mb-6 text-left relative overflow-hidden">
            <div className="absolute inset-0 bg-red-950/10" />
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400 relative z-10" />
            <div className="text-sm font-semibold relative z-10">{errorMessage}</div>
          </div>
        )}

        {/* STEP 1: SETUP */}
        {step === "setup" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-left">
            <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex bg-slate-950 p-1 rounded-xl mb-4 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setDocumentType("Prova")}
                  className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${documentType === "Prova" ? "bg-amber-400 text-slate-950 shadow-md" : "text-slate-400 hover:text-slate-200"}`}
                >
                  Gerador de Provas
                </button>
                <button
                  type="button"
                  onClick={() => setDocumentType("Atividade")}
                  className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${documentType === "Atividade" ? "bg-amber-400 text-slate-950 shadow-md" : "text-slate-400 hover:text-slate-200"}`}
                >
                  Gerador de Atividades
                </button>
              </div>
              <h3 className="font-display font-black text-sm uppercase tracking-wider text-amber-400 border-b border-slate-800 pb-3">
                {documentType === "Atividade" ? "Configurações da Atividade" : "Configurações da Prova"}
              </h3>

              <div className="space-y-4">
                {/* Professor */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                    Professor Responsável
                  </label>
                  <select
                    value={selectedProfId}
                    onChange={(e) => setSelectedProfId(e.target.value)}
                    className="bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm outline-none text-slate-100 transition-all cursor-pointer font-medium"
                  >
                    {(() => {
                      const roles = (userProfile?.role || "").toLowerCase();
                      const isAdmin = roles.includes("admin") || roles.includes("diretor") || roles.includes("coordenador") || roles.includes("secretaria") || roles.includes("ti");

                      if (isAdmin) {
                        return professors.map((prof) => (
                          <option key={prof.uid} value={prof.uid}>
                            {prof.professional_name || prof.email?.split("@")[0]} ({prof.email})
                          </option>
                        ));
                      }

                      const loggedInProf = professors.find(p => p.uid === userProfile?.uid);
                      const displayList = loggedInProf 
                        ? [loggedInProf] 
                        : (userProfile ? [{ 
                            uid: userProfile.uid || userProfile.id, 
                            professional_name: userProfile.professional_name || userProfile.username || userProfile.email?.split("@")[0] || "Professor", 
                            email: userProfile.email 
                          }] : professors);
                      
                      return displayList.map((prof) => (
                        <option key={prof.uid} value={prof.uid}>
                          {prof.professional_name || prof.email?.split("@")[0]} ({prof.email})
                        </option>
                      ));
                    })()}
                  </select>
                </div>

                {/* Class */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                    Classe/Turma (Selecione uma ou mais)
                  </label>
                  <div className="flex flex-wrap gap-2 p-2 bg-slate-950 border border-slate-800 rounded-xl max-h-[140px] overflow-y-auto">
                    {getFilteredClasses(userProfile, schoolInfo?.classes || [])?.map((c: string) => {
                      const selectedClasses = selectedClass ? selectedClass.split(", ").filter(Boolean) : [];
                      const isSelected = selectedClasses.includes(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            let newClasses;
                            if (isSelected) {
                              newClasses = selectedClasses.filter(x => x !== c);
                            } else {
                              newClasses = [...selectedClasses, c];
                            }
                            setSelectedClass(newClasses.join(", "));
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-tight transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-400 text-slate-950 font-black border border-amber-400'
                              : 'bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-300'
                          }`}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Subject */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                    Disciplina
                  </label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm outline-none text-slate-100 transition-all cursor-pointer font-medium"
                  >
                    {(() => {
                      const roles = (userProfile?.role || "").toLowerCase();
                      const isAdmin = roles.includes("admin") || roles.includes("ti") || roles.includes("diretor") || roles.includes("coordenador") || roles.includes("secretaria");
                      if (isAdmin) return schoolInfo?.subjects || [];
                      return userProfile?.assigned_subjects?.length > 0 ? userProfile.assigned_subjects : (schoolInfo?.subjects || []);
                    })()?.map((s: string) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5 col-span-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                      Tipo de Documento
                    </label>
                    <select
                      value={documentType}
                      onChange={(e) => setDocumentType(e.target.value as any)}
                      className="bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm outline-none text-slate-100 transition-all cursor-pointer font-medium"
                    >
                      <option value="Prova">Prova</option>
                      <option value="Atividade">Atividade</option>
                    </select>
                  </div>
                  {/* Bimester */}
                  <div className={`flex flex-col gap-1.5 ${documentType === "Atividade" ? "col-span-2" : ""}`}>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                      Bimestre
                    </label>
                    <select
                      value={selectedBimester}
                      onChange={(e) => setSelectedBimester(e.target.value)}
                      className="bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm outline-none text-slate-100 transition-all cursor-pointer font-medium"
                    >
                      <option value="1º Bimestre">1º Bimestre</option>
                      <option value="2º Bimestre">2º Bimestre</option>
                      <option value="3º Bimestre">3º Bimestre</option>
                      <option value="4º Bimestre">4º Bimestre</option>
                    </select>
                  </div>

                  {/* Exam Type */}
                  {documentType !== "Atividade" && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                        Tipo
                      </label>
                      <select
                        value={selectedExamType}
                        onChange={(e) => setSelectedExamType(e.target.value)}
                        className="bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm outline-none text-slate-100 transition-all cursor-pointer font-medium"
                      >
                        <option value="PI">PI</option>
                        <option value="PII">PII</option>
                        <option value="PIII">PIII</option>
                        <option value="PIV">PIV</option>
                        <option value="PV">PV</option>
                        <option value="Recuperação">Recuperação</option>
                        <option value="Recuperação Bimestral">Recuperação Bimestral</option>
                        <option value="Recuperação Final">Recuperação Final</option>
                        <option value="Provão">Provão</option>
                        <option value="Avaliação Especial">Avaliação Especial</option>
                        <option value="Simulado">Simulado</option>
                        <option value="Trabalho">Trabalho</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Conteúdo da Prova */}
                {documentType !== "Atividade" && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                      Conteúdo da Prova
                    </label>
                    <input
                      type="text"
                      value={conteudoProva}
                      onChange={(e) => setConteudoProva(e.target.value)}
                      className="bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm outline-none text-slate-100 transition-all font-bold"
                    />
                  </div>
                )}

                {/* Custom Instructions */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                    Instruções para a IA (Opcional)
                  </label>
                  <textarea
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder="Ex: Foque no capítulo 3. Ignore a questão 4. Gere uma questão com um triângulo no lugar da questão 6..."
                    className="bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm outline-none text-slate-100 transition-all font-sans min-h-[90px] resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col h-full justify-between gap-6">
              <h3 className="font-display font-black text-sm uppercase tracking-wider text-amber-400 border-b border-slate-800 pb-3">
                Origem da Prova
              </h3>

              {/* Tab Selector */}
              <div className="flex gap-2 p-1 bg-slate-950 border border-slate-800/80 rounded-2xl mb-2 w-fit">
                <button
                  type="button"
                  onClick={() => setInputMode("file")}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                    inputMode === "file"
                      ? "bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-400/10"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Upload de Arquivo (DOCX/PDF/IMG)
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode("text")}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                    inputMode === "text"
                      ? "bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-400/10"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Colar Texto da Prova
                </button>
              </div>

              {inputMode === "file" ? (
                /* Drop Zone */
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 border-2 border-dashed border-slate-800 hover:border-amber-400/50 bg-slate-950/40 rounded-2xl flex flex-col items-center justify-center p-12 text-center cursor-pointer transition-all duration-300 relative group min-h-[250px]"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf,.png,.jpg,.jpeg,.txt,.doc,.docx"
                    className="hidden"
                  />
                  
                  <div className="bg-[#a88d44]/5 group-hover:bg-[#a88d44]/10 border border-slate-800 group-hover:border-amber-400/35 p-4 rounded-2xl text-slate-400 group-hover:text-amber-400 shadow-md mb-4 transition-all duration-300">
                    <Upload className="w-8 h-8" />
                  </div>
                  
                  {file ? (
                    <div className="space-y-2">
                      <p className="text-sm font-bold text-slate-200">{file.name}</p>
                      <p className="text-xs text-slate-500">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB • Clique ou arraste outro para trocar
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm font-bold text-slate-200">Arraste a prova ou clique para selecionar</p>
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                        Formatos aceitos: PDF, Imagens (PNG, JPG), Word (DOC, DOCX) ou Texto (.txt)
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* Text Area for Pasted Content */
                <div className="flex-1 flex flex-col gap-2 min-h-[250px]">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                    Cole as questões da sua prova abaixo:
                  </label>
                  <textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Ex:&#10;1- Qual a capital do Brasil?&#10;a) Rio de Janeiro&#10;b) São Paulo&#10;c) Brasília&#10;d) Salvador&#10;&#10;2- Explique o que é a Revolução Industrial."
                    className="flex-1 bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-2xl p-4 text-sm outline-none text-slate-100 transition-all font-sans min-h-[200px] resize-y"
                  />
                </div>
              )}

              <button
                onClick={handleGenerateExam}
                disabled={!selectedClass || (documentType !== "Atividade" && !conteudoProva.trim()) || (inputMode === "file" ? !fileBase64 : !pastedText.trim())}
                className="w-full bg-[#a88d44] hover:bg-[#a88d44]/90 disabled:bg-slate-800 disabled:opacity-50 text-slate-950 font-black uppercase text-xs tracking-widest py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg hover:shadow-amber-400/5 transition-all duration-300 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-slate-950" /> Gerar Prova Estruturada com IA
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: LOADING */}
        {step === "loading" && (
          <div className="flex-1 flex flex-col items-center justify-center p-12">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center max-w-lg w-full text-center space-y-6 relative overflow-hidden">
              <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.05]">
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#d4af37 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
              </div>

              <div className="relative">
                <div className="absolute -inset-1 rounded-full bg-amber-400/20 blur animate-pulse" />
                <div className="bg-[#a88d44]/10 border border-[#a88d44]/35 p-5 rounded-full text-gold shadow-lg relative z-10">
                  <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
                </div>
              </div>

              <div className="space-y-2 relative z-10">
                <h3 className="font-display font-black text-xs uppercase tracking-widest text-amber-400">
                  Processando Prova com Gemini
                </h3>
                <p className="text-[13px] text-slate-300 font-bold min-h-[40px] flex items-center justify-center transition-all duration-300 uppercase">
                  {loadingMessage}
                </p>
              </div>

              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                <motion.div 
                  className="bg-amber-400 h-full rounded-full"
                  initial={{ width: "5%" }}
                  animate={{ width: "95%" }}
                  transition={{ duration: 30, ease: "linear" }}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: EDITOR & PREVIEW */}
        {step === "editor" && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start flex-1 text-left">
            {/* Editor Panel (Left) */}
            <div className="xl:col-span-6 space-y-4 max-h-[85vh] overflow-y-auto pr-2 custom-scrollbar">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-display font-black text-sm uppercase tracking-wider text-amber-400">
                    Editor de Questões
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-full text-slate-400">
                    {questions.length} Questões Detectadas
                  </span>
                </div>

                {/* AI Warning Banner */}
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3 text-amber-400">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400 animate-pulse" />
                  <div className="text-xs space-y-1">
                    <p className="font-bold uppercase tracking-wider">Aviso de IA</p>
                    <p className="font-medium leading-relaxed">
                      Esta prova foi gerada com inteligência artificial. 
                      Revise todas as questões, alternativas e gabaritos com atenção antes de salvá-la, 
                      pois o modelo pode cometer erros ou gerar imprecisões.
                    </p>
                  </div>
                </div>

                {/* Conteúdo da Prova */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                    Conteúdo da Prova
                  </label>
                  <input
                    type="text"
                    value={conteudoProva}
                    onChange={(e) => setConteudoProva(e.target.value)}
                    className="bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm outline-none text-slate-100 transition-all font-bold"
                  />
                </div>

                {/* Class Selection during Review */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                    Classe/Turma (Selecione uma ou mais)
                  </label>
                  <div className="flex flex-wrap gap-2 p-2 bg-slate-950 border border-slate-800 rounded-xl max-h-[140px] overflow-y-auto">
                    {schoolInfo?.classes?.map((c: string) => {
                      const selectedClasses = selectedClass ? selectedClass.split(", ").filter(Boolean) : [];
                      const isSelected = selectedClasses.includes(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            let newClasses;
                            if (isSelected) {
                              newClasses = selectedClasses.filter(x => x !== c);
                            } else {
                              newClasses = [...selectedClasses, c];
                            }
                            setSelectedClass(newClasses.join(", "));
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-tight transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-400 text-slate-950 font-black border border-amber-400'
                              : 'bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-300'
                          }`}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className={documentType === "Atividade" ? "grid grid-cols-1" : "grid grid-cols-2 gap-4"}>
                  {/* Bimester */}
                  <div className={`flex flex-col gap-1.5 ${documentType === "Atividade" ? "col-span-1" : ""}`}>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                      Bimestre
                    </label>
                    <select
                      value={selectedBimester}
                      onChange={(e) => setSelectedBimester(e.target.value)}
                      className="bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm outline-none text-slate-100 transition-all cursor-pointer font-medium"
                    >
                      <option value="1º Bimestre">1º Bimestre</option>
                      <option value="2º Bimestre">2º Bimestre</option>
                      <option value="3º Bimestre">3º Bimestre</option>
                      <option value="4º Bimestre">4º Bimestre</option>
                    </select>
                  </div>

                  {/* Exam Type */}
                  {documentType !== "Atividade" && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                        Tipo
                      </label>
                      <select
                        value={selectedExamType}
                        onChange={(e) => setSelectedExamType(e.target.value)}
                        className="bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm outline-none text-slate-100 transition-all cursor-pointer font-medium"
                      >
                        <option value="PI">PI</option>
                        <option value="PII">PII</option>
                        <option value="PIII">PIII</option>
                        <option value="PIV">PIV</option>
                        <option value="PV">PV</option>
                        <option value="Recuperação">Recuperação</option>
                        <option value="Recuperação Bimestral">Recuperação Bimestral</option>
                        <option value="Recuperação Final">Recuperação Final</option>
                        <option value="Provão">Provão</option>
                        <option value="Avaliação Especial">Avaliação Especial</option>
                        <option value="Simulado">Simulado</option>
                        <option value="Trabalho">Trabalho</option>
                      </select>
                    </div>
                  )}
                </div>

              <div className="space-y-4">
                {questions.map((q, qIndex) => (
                  <div key={q.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-md space-y-4 relative group">
                    <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="bg-slate-950 border border-slate-800 w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm text-amber-400">
                          {q.id}
                        </span>
                        <select
                          value={q.type}
                          onChange={(e) => updateQuestionType(qIndex, e.target.value as any)}
                          className="bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-lg px-2 py-1 text-xs outline-none text-slate-200 cursor-pointer font-bold uppercase"
                        >
                          <option value="objective">Objetiva</option>
                          <option value="essay">Dissertativa</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Points */}
                        <div className="flex items-center gap-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Nota:
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            value={q.points}
                            onChange={(e) => updateQuestionPoints(qIndex, parseFloat(e.target.value) || 0)}
                            className="bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-lg w-14 px-2 py-1 text-xs outline-none text-slate-200 text-center font-bold"
                          />
                        </div>

                        {/* Delete button */}
                        <button
                          onClick={() => deleteQuestion(qIndex)}
                          className="text-slate-500 hover:text-red-400 p-1.5 hover:bg-red-950/20 border border-transparent hover:border-red-900/30 rounded-lg transition-all"
                          title="Excluir questão"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Question text */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Enunciado da Questão
                      </label>
                      <textarea
                        value={q.text}
                        onChange={(e) => updateQuestionText(qIndex, e.target.value)}
                        className="bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm outline-none text-slate-100 transition-all font-sans min-h-[70px] resize-y"
                      />
                    </div>

                    {/* Imagem da Questão */}
                    <div className="flex flex-col gap-2 border-t border-slate-800/40 pt-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-slate-500 hover:text-amber-400 uppercase tracking-wider flex items-center gap-1.5 cursor-pointer select-none transition-colors">
                          <Camera className="w-3.5 h-3.5 text-amber-400" />
                          <span>Adicionar Imagem</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  const img = new Image();
                                  img.onload = () => {
                                    const canvas = document.createElement("canvas");
                                    const ctx = canvas.getContext("2d");
                                    const maxDim = 1000;
                                    let width = img.width;
                                    let height = img.height;
                                    if (width > maxDim || height > maxDim) {
                                      if (width > height) {
                                        height = Math.round((height * maxDim) / width);
                                        width = maxDim;
                                      } else {
                                        width = Math.round((width * maxDim) / height);
                                        height = maxDim;
                                      }
                                    }
                                    canvas.width = width;
                                    canvas.height = height;
                                    ctx?.drawImage(img, 0, 0, width, height);
                                    const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
                                    
                                    const updated = [...questions];
                                    updated[qIndex].image = compressedBase64;
                                    updated[qIndex].imageSize = 100;
                                    updated[qIndex].imageAlign = "center";
                                    setQuestions(updated);
                                  };
                                  img.src = reader.result as string;
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                        {q.image && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...questions];
                              updated[qIndex].image = undefined;
                              setQuestions(updated);
                            }}
                            className="text-red-400 hover:text-red-300 text-[10px] font-bold uppercase flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Remover Imagem
                          </button>
                        )}
                      </div>

                      {q.image && (
                        <div className="flex items-center gap-4 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                          <img
                            src={q.image}
                            alt=""
                            className="max-h-20 object-contain rounded-md border border-slate-800 bg-white"
                          />
                          <div className="flex flex-col gap-1.5 flex-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                              Largura da Imagem ({q.imageSize || 100}%)
                            </label>
                            <input
                              type="range"
                              min="10"
                              max="100"
                              value={q.imageSize || 100}
                              onChange={(e) => {
                                const updated = [...questions];
                                updated[qIndex].imageSize = parseInt(e.target.value);
                                setQuestions(updated);
                              }}
                              className="w-full accent-amber-400 cursor-pointer h-1 bg-slate-900 rounded-lg appearance-none"
                            />
                            
                            <div className="flex items-center gap-2 mt-1">
                              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                                Alinhamento:
                              </label>
                              <select
                                value={q.imageAlign || "center"}
                                onChange={(e) => {
                                  const updated = [...questions];
                                  updated[qIndex].imageAlign = e.target.value as any;
                                  setQuestions(updated);
                                }}
                                className="bg-slate-900 border border-slate-850 rounded-lg px-2 py-0.5 text-[10px] outline-none text-slate-200 cursor-pointer font-semibold uppercase"
                              >
                                <option value="center">Centralizado</option>
                                <option value="left">Esquerda</option>
                                <option value="right">Direita</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Objective options editor */}
                    {q.type === "objective" && (
                      <div className="space-y-2 border-t border-slate-800/40 pt-3">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Alternativas e Gabarito
                        </label>
                        
                        <div className="space-y-2">
                          {q.options.map((opt, optIndex) => {
                            const letter = String.fromCharCode(65 + optIndex); // A, B, C, D...
                            return (
                              <div key={optIndex} className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-400 w-4 shrink-0 text-center">
                                  {letter}
                                </span>
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) => updateOptionText(qIndex, optIndex, e.target.value)}
                                  className="bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-lg px-3 py-1.5 text-xs outline-none text-slate-200 flex-1 transition-all"
                                />
                                {q.options.length > 2 && (
                                  <button
                                    onClick={() => removeOption(qIndex, optIndex)}
                                    className="text-slate-500 hover:text-red-400 p-1 hover:bg-red-950/10 rounded"
                                    title="Remover alternativa"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex items-center justify-between gap-4 pt-2">
                          <button
                            onClick={() => addOption(qIndex)}
                            className="bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" /> Adicionar Alternativa
                          </button>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              Correta:
                            </span>
                            <select
                              value={q.correctAnswer}
                              onChange={(e) => updateCorrectAnswer(qIndex, e.target.value)}
                              className="bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-lg px-2 py-1 text-xs outline-none text-slate-200 cursor-pointer font-bold"
                            >
                              {q.options.map((_, idx) => {
                                const letter = String.fromCharCode(65 + idx);
                                return (
                                  <option key={letter} value={letter}>
                                    {letter}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Essay lines editor */}
                    {q.type === "essay" && (
                      <div className="flex items-center gap-2 border-t border-slate-800/40 pt-3">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Linhas para Resposta:
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={q.lineCount ?? 5}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            updateQuestionLineCount(qIndex, isNaN(val) ? 0 : Math.max(0, val));
                          }}
                          className="bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-lg w-14 px-2 py-1 text-xs outline-none text-slate-200 text-center font-bold"
                        />
                      </div>
                    )}

                    {/* Geometric shape editor toggle */}
                    <div className="border-t border-slate-800/40 pt-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                          <Shapes className="w-3.5 h-3.5 text-amber-400" /> Forma Geométrica Nativa
                        </label>
                        <select
                          value={q.drawingShape || "none"}
                          onChange={(e) => updateShapeProperty(qIndex, "drawingShape", e.target.value)}
                          className="bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-lg px-2 py-1 text-xs outline-none text-slate-200 cursor-pointer font-bold"
                        >
                          <option value="none">Nenhuma</option>
                          <option value="circle">Círculo</option>
                          <option value="square">Quadrado</option>
                          <option value="rectangle">Retângulo</option>
                          <option value="triangle">Triângulo Equilátero</option>
                          <option value="right-triangle">Triângulo Retângulo</option>
                          <option value="line">Linha</option>
                          <option value="arrow">Seta</option>
                        </select>
                      </div>

                      {q.drawingShape && q.drawingShape !== "none" && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/60">
                          {/* Size */}
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Largura (px)</span>
                            <input
                              type="number"
                              min="30"
                              max="400"
                              value={q.drawingShapeSize || 150}
                              onChange={(e) => updateShapeProperty(qIndex, "drawingShapeSize", parseInt(e.target.value) || 150)}
                              className="bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-lg px-2 py-1 text-xs outline-none text-slate-200 text-center font-semibold"
                            />
                          </div>

                          {/* Height (only for rect and triangle) */}
                          {(q.drawingShape === "rectangle" || q.drawingShape === "triangle" || q.drawingShape === "right-triangle") && (
                            <div className="flex flex-col gap-1">
                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Altura (px)</span>
                              <input
                                type="number"
                                min="30"
                                max="400"
                                value={q.drawingShapeHeight || 100}
                                onChange={(e) => updateShapeProperty(qIndex, "drawingShapeHeight", parseInt(e.target.value) || 100)}
                                className="bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-lg px-2 py-1 text-xs outline-none text-slate-200 text-center font-semibold"
                              />
                            </div>
                          )}

                          {/* Border width */}
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Espessura Borda</span>
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={q.drawingShapeBorderWidth || 2}
                              onChange={(e) => updateShapeProperty(qIndex, "drawingShapeBorderWidth", parseInt(e.target.value) || 2)}
                              className="bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-lg px-2 py-1 text-xs outline-none text-slate-200 text-center font-semibold"
                            />
                          </div>

                          {/* Legend / Text */}
                          <div className="flex flex-col gap-1 col-span-2">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Legenda / Rótulo</span>
                            <input
                              type="text"
                              value={q.drawingShapeText || ""}
                              placeholder="Ex: 5cm, A, B, C, R..."
                              onChange={(e) => updateShapeProperty(qIndex, "drawingShapeText", e.target.value)}
                              className="bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-lg px-2 py-1 text-xs outline-none text-slate-200 font-semibold"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pb-12">
                <button
                  onClick={addEmptyQuestion}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 font-black uppercase text-[10px] tracking-wider py-4 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-slate-400" /> Adicionar Questão Vazia
                </button>

                <button
                  onClick={handleSaveExam}
                  disabled={isSaving}
                  className="flex-1 bg-[#a88d44] hover:bg-[#a88d44]/90 disabled:bg-slate-800 disabled:opacity-50 text-slate-950 font-black uppercase text-[10px] tracking-widest py-4 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 text-slate-950 animate-spin" /> Salvando...
                    </>
                  ) : saveSuccess ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-slate-950 animate-bounce" /> Salvo com Sucesso!
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 text-slate-950" /> Salvar Prova no Banco
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

            {/* Live Preview Panel (Right) */}
            <div className="xl:col-span-6 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar flex flex-col text-slate-900 text-left">
              <h3 className="font-display font-black text-sm uppercase tracking-wider text-amber-400 border-b border-slate-800 pb-3 mb-2">
                Live Preview (Folha Oficial A4)
              </h3>

              {/* Printable Exam Card */}
              <div 
                className="bg-white border-[3px] border-dashed border-black p-4 w-full max-w-[210mm] min-h-[297mm] mx-auto flex flex-col justify-between"
                style={{
                  fontFamily: "Inter, sans-serif",
                  boxSizing: "border-box"
                }}
              >
                <div className="flex-1">
                  {/* School Header */}
                  <div className="border-[3px] border-black border-dashed p-1 mb-4">
                    <div className="flex items-center justify-between border-b-[3px] border-black border-dashed pb-2 mb-1 px-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={LOGO_VINHO}
                          alt="Logo CPS"
                          className="w-10 h-10 object-contain"
                        />
                        <div className="flex flex-col border-l border-black pl-2 py-0.5">
                          <span className="text-[5px] uppercase font-bold text-slate-700 leading-none mb-0.5">
                            Plataforma
                            <br />
                            de Educação
                          </span>
                          <img
                            src={LOGO_COC}
                            alt="COC"
                            className="h-3 object-contain"
                          />
                        </div>
                      </div>
                      <h1 className="text-lg font-black uppercase text-center flex-1 tracking-wide mr-8 text-black font-serif">
                        Colégio Progresso Santista
                      </h1>
                    </div>

                    {/* Student Info Fields */}
                    <div className="text-[10px] font-bold flex uppercase w-full text-black">
                      {/* Left Column (80%) */}
                      <div className="w-[80%] flex flex-col border-r-[3px] border-black border-dashed">
                        {/* Row 1 */}
                        <div className="flex border-b-[3px] border-black border-dashed h-8 w-full items-center">
                          <div className="w-[75%] border-r-[3px] border-black border-dashed px-2 py-1 flex items-center min-w-0">
                            <span>Nome:</span>
                            <span className="flex-1 border-b border-black mx-2 pt-2" />
                          </div>
                          <div className="w-[25%] px-2 py-1 flex items-center">
                            Classe: {selectedClass || "____"}
                          </div>
                        </div>
                        
                        {/* Row 2 */}
                        <div className="flex h-8 w-full items-center">
                          <div className="w-[50%] border-r-[3px] border-black border-dashed px-2 py-1 flex items-center min-w-0">
                            <span className="truncate">Disciplina: <span className="font-normal normal-case">{selectedSubject}</span></span>
                          </div>
                          <div className="w-[25%] border-r-[3px] border-black border-dashed px-2 py-1 flex items-center min-w-0">
                            <span className="truncate">Prof: <span className="font-normal normal-case">
                              {professors.find(p => p.uid === selectedProfId)?.professional_name || "____"}
                            </span></span>
                          </div>
                          <div className="w-[25%] px-2 py-1 flex items-center">
                            <span>Data: ___/___/___</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Column (20%) */}
                      <div className="w-[20%] flex flex-col text-center">
                        <div className="border-b-[3px] border-black border-dashed py-1 font-bold text-[8px] uppercase">
                          Nota
                        </div>
                        <div className="flex-1 flex items-center justify-center text-lg font-black text-slate-300">
                          -
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Exam Title */}
                  <div className="text-center font-black uppercase text-sm mb-4 border-b border-black pb-1 text-black font-sans tracking-wide">
                    {parsedTitle}
                  </div>

                  {/* Questions Rendered */}
                  <div className="space-y-4 text-black text-xs font-medium">
                    {questions.map((q, idx) => (
                      <div key={q.id} className="space-y-1">
                        <div className="flex gap-1.5 items-start font-semibold">
                          <span className="shrink-0 font-bold">{idx + 1}.</span>
                          <span className="text-justify font-sans leading-relaxed">
                            {q.points && q.points > 0 && (
                              <span className="font-bold">({q.points.toFixed(1).replace(".", ",")} pts) </span>
                            )}
                            {q.text}
                          </span>
                        </div>

                        {/* Rendering shape */}
                        {q.drawingShape && q.drawingShape !== "none" && renderShapeSVG(q)}

                        {/* Rendering image */}
                        {q.image && (
                          <div
                            className={`flex my-2 w-full justify-${
                              q.imageAlign === "left"
                                ? "start"
                                : q.imageAlign === "right"
                                ? "end"
                                : "center"
                            }`}
                          >
                            <img
                              src={q.image}
                              alt=""
                              style={{ width: `${q.imageSize || 100}%` }}
                              className="max-h-[160px] object-contain rounded-md border border-slate-200"
                            />
                          </div>
                        )}

                        {/* Objective options */}
                        {q.type === "objective" && q.options && (
                          <div className="pl-5 grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                            {q.options.map((opt, optIdx) => {
                              const letter = String.fromCharCode(65 + optIdx);
                              return (
                                <div key={optIdx} className="flex gap-1.5 items-start text-xs font-sans leading-relaxed">
                                  <span className="font-black shrink-0">{letter})</span>
                                  <span>{opt}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Essay lines */}
                        {q.type === "essay" && (
                          <div className="space-y-1.5 mt-2.5">
                            {Array.from({ length: q.lineCount || 5 }).map((_, lIdx) => (
                              <div key={lIdx} className="border-b border-slate-300 h-4 w-full" />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-8 pt-4 border-t border-black text-center flex flex-col items-center gap-0.5">
                  <span className="text-[7px] font-black uppercase tracking-[0.25em] text-[#a88d44]">
                    Colégio Progresso Santista
                  </span>
                  <span className="text-[6px] font-bold uppercase tracking-wider text-slate-500">
                    Mural Pedagógico • Gerador IA de Provas
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
