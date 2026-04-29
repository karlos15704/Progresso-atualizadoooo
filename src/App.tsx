import React, { useState, useEffect, useRef, useMemo } from 'react';
import { scanBubbleSheet, generatePrintableAnswerSheet } from './lib/omrEngine';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { Editor, EditorProvider, Toolbar, BtnBold, BtnItalic, BtnUnderline, BtnStrikeThrough, BtnNumberedList, BtnBulletList, BtnClearFormatting, BtnStyles, Separator } from 'react-simple-wysiwyg';
import { 
  Sun,
  Moon,
  Plus, 
  FileText, 
  Camera, 
  BarChart3, 
  BookOpen, 
  LogOut, 
  Download, 
  Trash2, 
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Pencil,
  User as UserIcon,
  School,
  Clock,
  Calendar,
  Printer,
  X,
  Users,
  List,
  CheckSquare,
  LayoutList,
  Edit2,
  Edit3,
  Eye,
  Save,
  Search,
  Filter,
  Mail,
  ChevronDown,
  ExternalLink,
  Copy,
  RotateCcw,
  Menu,
  Settings,
  Scan,
  Sparkles,
  UserCircle,
  ShieldCheck,
  Lock,
  UserCog,
  KeyRound
} from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { generateStudyGuide, correctExamFromImage } from './services/aiService';
import { exportToPDF, exportMultipleToPDF } from './lib/pdfUtils';
import { LOGO_VINHO, LOGO_COC } from './assets';
import DefaultEditor from 'react-simple-wysiwyg';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { cn } from './lib/utils';

// Professional Safe HTML Cleaner (especially for Word-to-Web pasted content)
const cleanWordHtml = (html: string) => {
  if (!html) return '';
  
  // 1. Remove Word XML namespaces and Office-specific tags
  let cleaned = html.replace(/<o:p>[\s\S]*?<\/o:p>/g, '')
                    .replace(/<style>[\s\S]*?<\/style>/g, '')
                    .replace(/<!--[\s\S]*?-->/g, '') // Remove comments
                    .replace(/<xml>[\s\S]*?<\/xml>/g, '')
                    .replace(/class="Mso.*?"/g, '')
                    .replace(/lang=".*?"/g, '')
                    .replace(/mso-.*?=".*?"/g, ''); // Remove mso- attributes

  // 2. Remove inline styles that often break layouts (keep only basic font-weight)
  cleaned = cleaned.replace(/style=".*?"/g, (match) => {
    if (match.includes('font-weight:bold') || match.includes('font-weight: 700')) return 'style="font-weight:bold"';
    if (match.includes('font-style:italic')) return 'style="font-style:italic"';
    return '';
  });

  // 3. Remove empty spans that just carry useless meta formatting
  cleaned = cleaned.replace(/<span>([\s\S]*?)<\/span>/g, '$1');
  
  return cleaned.trim();
};

const SafeHTML = ({ html, className }: { html: string, className?: string }) => {
  if (!html) return null;
  const cleaned = cleanWordHtml(html);
  
  // More robust check: if it contains anything that looks like a tag
  const hasTags = /<[a-z/][\s\S]*?>/i.test(cleaned);
  
  // If it's just raw text with encoded entities, we still want to render it through dangerouslySetInnerHTML
  // to decode those entities (like &nbsp; or &lt;)
  const hasEntities = /&[a-z0-9#]+;/i.test(cleaned);

  if (!hasTags && !hasEntities) {
    return <div className={cn("whitespace-pre-wrap font-sans", className)}>{cleaned}</div>;
  }

  return (
    <div 
      className={cn("prose-custom font-sans leading-relaxed", className)}
      dangerouslySetInnerHTML={{ __html: cleaned }}
    />
  );
};

// Utility to strip HTML tags for titles etc
const stripHtml = (html: string) => {
  if (!html) return '';
  // Check if it's actually HTML
  if (!html.includes('<') && !html.includes('>')) return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const text = doc.body.textContent || "";
  return text.trim();
};

// Types
interface Question {
  id: number;
  type?: 'objective' | 'essay';
  text: string;
  image?: string;
  imageSize?: number;
  imageAlign?: 'left' | 'center' | 'right';
  options: string[];
  correctAnswer: string;
  points?: number | string;
}

interface Exam {
  id: string;
  title: string;
  subject: string;
  examType: string;
  examDate?: string;
  examTime?: string;
  classYear?: string;
  bimester?: string;
  content?: string;
  fontSize?: number;
  fontFamily?: string;
  questions: Question[];
  answerKey: any;
  studyGuide: string;
  professorId: string;
  createdAt: any;
}

interface Result {
  id: string;
  examId: string;
  studentName: string;
  studentClass?: string;
  bimester?: string;
  professorId?: string;
  score: number;
  maxScore: number;
  feedback: string;
  answers?: any;
  manuallyReviewed?: boolean;
  correctedAt: any;
}

interface Lesson {
  id: string;
  professor_id: string;
  class_id: string;
  subject: string;
  bimester: string;
  date: string;
  content: string;
  lesson_count: number;
  created_at: string;
}

interface Attendance {
  id: string;
  lesson_id: string;
  student_name: string;
  status: 'present' | 'absent';
}

interface StudentReport {
  id: string;
  studentName: string;
  studentClass: string;
  subject: string;
  content: string;
  professorId: string;
  professorName?: string;
  bimester: string;
  createdAt: any;
  updatedAt: any;
}

interface Student {
  name: string;
  classId: string;
}

interface ClassSubjectsMapping {
  [classId: string]: string[];
}

const DEFAULT_SCHOOL_INFO = {
  subjects: ['Coordenação', 'Português', 'Matemática', 'Ciências', 'História', 'Geografia', 'Inglês', 'Artes', 'Educação Física', 'Física', 'Química', 'Biologia', 'Filosofia', 'Sociologia'],
  classes: ['6º A', '6º B', '6º C', '7º A', '7º B', '8º A', '8º B', '9º A', '9º B'],
  class_subjects: {} as ClassSubjectsMapping,
  studentsDB: {
    '6º ano': [
      { classId: '6º A', name: 'ADRIELLY LUCIA PERES SANTOS SILVA' },
      { classId: '6º A', name: 'BEATRIZ TEIXEIRA DA SILVA' },
      { classId: '6º A', name: 'BERNARDO DE PAULA ARAUJO' },
      { classId: '6º A', name: 'BERNARDO DONATO JAQUES SANTOS' },
      { classId: '6º A', name: 'BERNARDO SILVA' },
      { classId: '6º A', name: 'CATARINA FERREIRA GUIMARAES' },
      { classId: '6º A', name: 'CAUÃ LIMA DOS SANTOS MAFRA' },
      { classId: '6º A', name: 'CECÍLIA FERREIRA DANTAS DORIA DIAS' },
      { classId: '6º A', name: 'CLARA MARIA GOMES DOS SANTOS' },
      { classId: '6º A', name: 'DAVI PONTES TRIGO' },
      { classId: '6º A', name: 'ENZO GABRIEL MARZOCHI ALVES' },
      { classId: '6º A', name: 'HENRIQUE SANTOS CABRAL DE ANDRADE' },
      { classId: '6º A', name: 'LORENZO DA SILVA COSTA' },
      { classId: '6º A', name: 'LUCAS DE JESUS CORREIA' },
      { classId: '6º A', name: 'MANUELLA CARDOSO MATOS' },
      { classId: '6º A', name: 'MATHEUS SANTANA AIRES' },
      { classId: '6º A', name: 'MIGUEL GONÇALVES GOMES DA SILVA' },
      { classId: '6º A', name: 'RAPHAEL DOS SANTOS RODRIGUES' },
      { classId: '6º A', name: 'SARAH VASCONCELOS MARQUES DE OLIVEIRA' },
      { classId: '6º A', name: 'SOPHIA MAIROS BRAZ CARVALHO' },
      { classId: '6º A', name: 'VINÍCIUS VICHI FERREIRA DE ANDRADE SILVA' },

      { classId: '6º B', name: 'AGATHA VIEIRA BATISTA' },
      { classId: '6º B', name: 'AGATHA XAVIER DE LIMA' },
      { classId: '6º B', name: 'ALICE MALTAS SABINO DE FREITAS' },
      { classId: '6º B', name: 'ALICE TORRES FAGUNDES FONSECA' },
      { classId: '6º B', name: 'ANA CLARA HONORATO ACCORSINI' },
      { classId: '6º B', name: 'BERNARDO SANTOS LADISLAÚ' },
      { classId: '6º B', name: 'DANIEL MARINO ZANELLI' },
      { classId: '6º B', name: 'ENZO PASCOAL RESENDE' },
      { classId: '6º B', name: 'FERNANDA SOUZA BATISTA FONSECA' },
      { classId: '6º B', name: 'ISABELLA RIBEIRO DE MELO' },
      { classId: '6º B', name: 'LARISSA FIRMINO DOS SANTOS PEDRO' },
      { classId: '6º B', name: 'LAURA FERNANDES TEIXEIRA' },
      { classId: '6º B', name: 'LETÍCIA SILVA DE CAMARGO' },
      { classId: '6º B', name: 'LIVIA DE CASTRO AGRA COSTA' },
      { classId: '6º B', name: 'LUIZ GUSTAVO PEREIRA ALVES' },
      { classId: '6º B', name: 'LUIZA SENA DE ASSIZ' },
      { classId: '6º B', name: 'MANUELA SANTANA FERNANDES' },
      { classId: '6º B', name: 'MARIA LUIZA BONVETI RAFANINI' },
      { classId: '6º B', name: 'MICHELLI CAMILI CANDIDO GONÇALO' },
      { classId: '6º B', name: 'MURILO JUVINO ALVES' },
      { classId: '6º B', name: 'NICOLAS FEITOSA SANTANA' },
      { classId: '6º B', name: 'NICOLLY WILLIANS FAGUNDES LIMA' },

      { classId: '6º C', name: 'ARTHUR HENRIQUE DA COSTA BRITO' },
      { classId: '6º C', name: 'BRYAN BOSCARDIN MARCIANO' },
      { classId: '6º C', name: 'DAVI LORENZO PEREIRA NASCIMENTO' },
      { classId: '6º C', name: 'ELENA APARECIDA DE SOUZA FERREIRA' },
      { classId: '6º C', name: 'ELISA MIRANDA SATO' },
      { classId: '6º C', name: 'GABRIEL OLIVEIRA MENDES DOS SANTOS' },
      { classId: '6º C', name: 'GIULIA ARCHANJO DE MOURA' },
      { classId: '6º C', name: 'GUILHERME CARVALHO DE ALMEIDA' },
      { classId: '6º C', name: 'HEITOR BARBOSA ALMEIDA' },
      { classId: '6º C', name: 'JAMAL HENRIQUE DA SILVA' },
      { classId: '6º C', name: 'KEVYN CHRISTOPHER CONCEIÇÃO SILVA RODRIGUES' },
      { classId: '6º C', name: 'LAVINIA DE OLIVEIRA SANTOS' },
      { classId: '6º C', name: 'LUIZA KIYOKO WAKAI PINHO' },
      { classId: '6º C', name: 'MARIA FERNANDA NOBRE BORGES' },
      { classId: '6º C', name: 'MARIA LUIZA SILVA BARBOSA' },
      { classId: '6º C', name: 'MATHEUS SALVADOR ROSAS' },
      { classId: '6º C', name: 'MATHEUS XAVIER BRITO DO NASCIMENTO' },
      { classId: '6º C', name: 'MIGUEL CORREIA SOARES DE MOURA' },
      { classId: '6º C', name: 'PEDRO SANTOS DO NASCIMENTO' },
      { classId: '6º C', name: 'SOPHIA DOS SANTOS DE ARRUDA OLIVEIRA' },
    ],
    '7º ano': [
      { classId: '7º A', name: 'ALICE HONORATO ACCORSINI' },
      { classId: '7º A', name: 'BEATRIZ DE MELO SHIMOKOMAKI GONÇALVES' },
      { classId: '7º A', name: 'DAVI DE ARAUJO DA SILVA' },
      { classId: '7º A', name: 'DAVI SILVA FERREIRA MENEZES' },
      { classId: '7º A', name: 'ENZO PEREIRA FARO HERNANDES' },
      { classId: '7º A', name: 'GABRIELA BARRIO CURÁTOLO DE MOURA FÉ' },
      { classId: '7º A', name: 'GUSTAVO MENEZES PASSOS' },
      { classId: '7º A', name: 'GUSTAVO SOUZA FONSECA' },
      { classId: '7º A', name: 'ISABELLA SILVA SANTANA' },
      { classId: '7º A', name: 'JORGE HENRIQUE GOMES DOS SANTOS' },
      { classId: '7º A', name: 'KAUAN BARRADA LIMA COSME' },
      { classId: '7º A', name: 'LUIZ HENRIQUE ESTEVÃO SOARES' },
      { classId: '7º A', name: 'MANUELA TINEU VIEIRA ARAUJO' },
      { classId: '7º A', name: 'MANUELLA DE ANDRADE MARIANO' },
      { classId: '7º A', name: 'PEROLA DE SANTANA BERNARDINHO' },
      { classId: '7º A', name: 'PIETRA VALENTINA LIRA MARQUES XAVIER' },
      { classId: '7º A', name: 'RAPHAEL PEREIRA RIBEIRO DA FONSECA' },
      { classId: '7º A', name: 'YASMIM RODRIGUES AGRA DE OLIVEIRA' },
      { classId: '7º A', name: 'YASMIN SANTANA POLETO' },

      { classId: '7º B', name: 'ANNA JÚLIA FRANCO SILVA' },
      { classId: '7º B', name: 'BERNARDO ANDRADE FRANCO SANTOS' },
      { classId: '7º B', name: 'BERNARDO RIBEIRO DA SILVA SENA' },
      { classId: '7º B', name: 'BRENDA VICTORIA LIMA DA SILVA' },
      { classId: '7º B', name: 'BRENO SANTOS REIS DE OLIVEIRA' },
      { classId: '7º B', name: 'DAVI FELIPE DOS SANTOS PUGLIESI' },
      { classId: '7º B', name: 'DAVI LIMA BALBO' },
      { classId: '7º B', name: 'EDUARDO JESUS ARAÚJO DE OLIVEIRA' },
      { classId: '7º B', name: 'HEITOR MARINHO DINIZ' },
      { classId: '7º B', name: 'HEITOR TEIXEIRA SACRAMENTO' },
      { classId: '7º B', name: 'LAYSA ALVES DE OLIVEIRA LIMA' },
      { classId: '7º B', name: 'LUCAS BRITO SOUSA' },
      { classId: '7º B', name: 'MANUELLA MARINO ZANELLI' },
      { classId: '7º B', name: 'MARCOS VINICIUS CAVACO BROGLIA' },
      { classId: '7º B', name: 'MARIA CLARA VIEIRA DA CRUZ' },
      { classId: '7º B', name: 'NICOLE CORREA DE SOUZA' },
      { classId: '7º B', name: 'NICOLLAS DOS SANTOS SILVA' },
      { classId: '7º B', name: 'PAULO DAVI MOURA DA SILVA' },
      { classId: '7º B', name: 'PEDRO OSWALDO DOS SANTOS AMARAL' },
      { classId: '7º B', name: 'RAYSSA OLIVEIRA SANTOS' },
      { classId: '7º B', name: 'SARAH MARCIANO DOS SANTOS' },
    ],
    '8º ano': [
      { classId: '8º A', name: 'ADRIELLY RODRIGUES CARAMEZ' },
      { classId: '8º A', name: 'BEATRIZ DE LACERDA VILAÇO SULPINO' },
      { classId: '8º A', name: 'BEATRIZ OHANA DE GOUVEIA MENDONÇA' },
      { classId: '8º A', name: 'DANTE MÜLLER AGUIAR' },
      { classId: '8º A', name: 'GABRIEL MENDONÇA DA SILVA' },
      { classId: '8º A', name: 'GIOVANNA SANTOS GONÇALVES' },
      { classId: '8º A', name: 'GUILHERME BELLINI VIEIRA CARMO' },
      { classId: '8º A', name: 'IAN BARALDI AGIANI' },
      { classId: '8º A', name: 'JOÃO PEDRO FERREIRA DA SILVA' },
      { classId: '8º A', name: 'JOSÉ ANDRÉS BARRIOS SÁNCHEZ' },
      { classId: '8º A', name: 'JULIE VITÓRIA AGUIAR CRUZ' },
      { classId: '8º A', name: 'KAUAI RIOS CABRAL' },
      { classId: '8º A', name: 'LUIZ FELIPE DE CASTRO AGRA COSTA' },
      { classId: '8º A', name: 'MATHEUS HENRIQUE SANTOS CAMARGO' },
      { classId: '8º A', name: 'MIKAELLA VITORIA PEREIRA FRANCO' },
      { classId: '8º A', name: 'PIETRA VICENTE DOS SANTOS' },
      { classId: '8º A', name: 'RAFAEL DOS SANTOS MACIEL' },
      { classId: '8º A', name: 'SOPHIA SOUZA DELFINO' },

      { classId: '8º B', name: 'AMANDA AUGUSTO DOS SANTOS MARQUES' },
      { classId: '8º B', name: 'CLARA MENDES DO VALE' },
      { classId: '8º B', name: 'DAVI LUIZ RIOS DA GAMA CARDOZO' },
      { classId: '8º B', name: 'ENZO BARBOSA SILVA' },
      { classId: '8º B', name: 'ESTHELA SANTOS ROSA' },
      { classId: '8º B', name: 'ISABELLA CARDOSO PALLOTTINI COELHO' },
      { classId: '8º B', name: 'JULIA VILLANI PEIXOTO DE CARVALHO' },
      { classId: '8º B', name: 'KAIQUE LEONARDO PEREIRA' },
      { classId: '8º B', name: 'KAUÊ CICARONI PIEMONTE' },
      { classId: '8º B', name: 'KETHELLYN HELENA DA SILVA VIEIRA SOUZA' },
      { classId: '8º B', name: 'LUCAS RIVELA MENDES' },
      { classId: '8º B', name: 'MARIA CLARA TINEO BECK' },
      { classId: '8º B', name: 'MARIA FERNANDA SILVA FERNANDES' },
      { classId: '8º B', name: 'MIGUEL RODRIGUES SILVA' },
      { classId: '8º B', name: 'NICOLAS RIBEIRO GOES' },
      { classId: '8º B', name: 'VINICIUS BULHOES DA SILVA' },
      { classId: '8º B', name: 'YURI GOMES SILVA' },
    ],
    '9º ano': [
      { classId: '9º A', name: 'ARTHUR SOBRAL SARAPIO RIBEIRO' },
      { classId: '9º A', name: 'ERICK DE OLIVEIRA ROCHA' },
      { classId: '9º A', name: 'ESTHER ROSA FONTES' },
      { classId: '9º A', name: 'FELLIPE TEIXEIRA SILVA' },
      { classId: '9º A', name: 'GABRIEL CLEMENTE MAURI' },
      { classId: '9º A', name: 'GABRIEL SILVEIRA LOPES' },
      { classId: '9º A', name: 'GABRIELA FREIRE MATOS' },
      { classId: '9º A', name: 'HELOISA TEIXEIRA SACRAMENTO' },
      { classId: '9º A', name: 'HENRIQUE DOS SANTOS WALTER' },
      { classId: '9º A', name: 'JOÃO VITOR RODRIGUES DA SILVA' },
      { classId: '9º A', name: 'MARCELLO DE SOUZA GALDINO RODRIGUES' },
      { classId: '9º A', name: 'MARIA EDUARDA CAMARGO DOS SANTOS' },
      { classId: '9º A', name: 'PEDRO MIGUEL DA SILVA FERREIRA' },
      { classId: '9º A', name: 'ROGER DO NASCIMENTO CASTRO DOS SANTOS' },
      { classId: '9º A', name: 'SOFIA BUENO DE MELO' },
      { classId: '9º A', name: 'STHEFANY XAVIER DA SILVA' },
      { classId: '9º A', name: 'VALENTINA FERREIRA BARCELOS' },
      { classId: '9º A', name: 'VICTORIA GARCIA CANELAS' },

      { classId: '9º B', name: 'ANA LUIZA SILVEIRA DE OLIVEIRA' },
      { classId: '9º B', name: 'ANNA CLARA FERREIRA DA SILVA' },
      { classId: '9º B', name: 'BERNARDO LUIZ GOMES FIDELIS' },
      { classId: '9º B', name: 'EMILLY SOUZA CARNEIRO' },
      { classId: '9º B', name: 'ENZO TELES GONÇALVES' },
      { classId: '9º B', name: 'GABRIEL SILVA DE CAMARGO' },
      { classId: '9º B', name: 'GIULIA PEREIRA DE JESUS MENDONÇA' },
      { classId: '9º B', name: 'GIULIA ROZADOS DE OLIVEIRA' },
      { classId: '9º B', name: 'GUILHERME DONATO JAQUES DOS SANTOS' },
      { classId: '9º B', name: 'JOÃO MENDONÇA DOS SANTOS' },
      { classId: '9º B', name: 'JOÃO PEDRO ALVES DA SILVA' },
      { classId: '9º B', name: 'KAMILLY INDAUI DE CASTRO FERREIRA' },
      { classId: '9º B', name: 'LETICIA CRISTINA SOUSA CORREA' },
      { classId: '9º B', name: 'LUKAS ANDRADE FERNANDES' },
      { classId: '9º B', name: 'MIGUEL BARROS DA SILVA' },
      { classId: '9º B', name: 'PETRICK VILLANI SILVA' },
      { classId: '9º B', name: 'THIAGO BEZERRA ORIGUELA' },
      { classId: '9º B', name: 'VITÓRIA ALONSO SODRÉ' },
      { classId: '9º B', name: 'WILLER INÁCIO ALVES DOS SANTOS' },
    ]
  } as Record<string, Student[]>
};

// Editor fonts for reference if needed
const EDITOR_FONTS = [
  'Inter', 
  'Arial', 
  'Times New Roman', 
  'Courier New', 
  'Georgia', 
  'Verdana'
];

const ProfessionalEditor = ({ value, onChange, placeholder, className, style }: { 
  value: string, 
  onChange: (val: string) => void, 
  placeholder?: string,
  className?: string,
  style?: React.CSSProperties
}) => {
  return (
    <div className={cn("professional-editor-wrapper", className)} style={style}>
      <EditorProvider>
        <Editor 
          value={value} 
          onChange={(e) => onChange(e.target.value)} 
          placeholder={placeholder}
          className="bg-white rounded-md overflow-hidden min-h-[150px]"
        >
          <Toolbar>
            <BtnBold />
            <BtnItalic />
            <BtnUnderline />
            <BtnStrikeThrough />
            <Separator />
            <BtnNumberedList />
            <BtnBulletList />
            <Separator />
            <BtnClearFormatting />
            <Separator />
            <BtnStyles />
          </Toolbar>
        </Editor>
      </EditorProvider>
      <style>{`
        .professional-editor-wrapper .rsw-ce {
          min-height: 150px;
          padding: 12px;
          outline: none;
        }
        .professional-editor-wrapper .rsw-toolbar {
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          padding: 4px;
        }
      `}</style>
    </div>
  );
};

function getSchoolInfo(): { subjects: string[], classes: string[], class_subjects: Record<string, string[]>, studentsDB: Record<string, Student[]> } {
  const saved = localStorage.getItem('schoolInfo');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      const subjects = parsed.subjects || DEFAULT_SCHOOL_INFO.subjects;
      if (!subjects.includes('Coordenação')) {
        subjects.unshift('Coordenação');
      }
      return {
        subjects,
        classes: DEFAULT_SCHOOL_INFO.classes, // Force to always be the updated list
        class_subjects: parsed.class_subjects || DEFAULT_SCHOOL_INFO.class_subjects,
        studentsDB: parsed.studentsDB || DEFAULT_SCHOOL_INFO.studentsDB
      };
    } catch {
      return DEFAULT_SCHOOL_INFO;
    }
  }
  return DEFAULT_SCHOOL_INFO;
}

function saveSchoolInfo(info: any) {
  localStorage.setItem('schoolInfo', JSON.stringify(info));
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [view, setView] = useState<'dashboard' | 'create' | 'correct' | 'reports' | 'guides' | 'admin' | 'schedule' | 'print' | 'studentReports' | 'printReport' | 'boletim' | 'diary' | 'cronograma' | 'settings'>('dashboard');
  const [selectedPrintExam, setSelectedPrintExam] = useState<Exam | null>(null);
  const [selectedReportForPrint, setSelectedReportForPrint] = useState<StudentReport | null>(null);
  const [multipleReportsToPrint, setMultipleReportsToPrint] = useState<StudentReport[]>([]);
  const [examToEdit, setExamToEdit] = useState<Exam | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [studentReports, setStudentReports] = useState<StudentReport[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [professors, setProfessors] = useState<any[]>([]);
  const [examBeingReassigned, setExamBeingReassigned] = useState<Exam | null>(null);

  // Auth Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.warn("Session error detected:", error.message);
        if (error.message.includes('Refresh Token Not Found')) {
          supabase.auth.signOut();
        }
      }
      handleUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
         // Force clear state on explicit sign out or update errors
      }
      handleUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleUser = async (currentUser: User | null) => {
    if (currentUser) {
      try {
        const isAdminEmail = ['cps@cps.local', 'karlos15704@gmail.com'].includes(currentUser.email?.toLowerCase() || '');
        const isUserMaster = isAdminEmail;
        const { data: profile, error } = await supabase.from('users').select('*').eq('uid', currentUser.id).maybeSingle();
        
        if (error && error.code !== 'PGRST116') {
           console.error("Database user fetch error, continuing securely... ", error);
        } else if (!profile) {
          // If first time, try to get data from allowed_professors
          const { data: allowed } = await supabase.from('allowed_professors').select('*').eq('email', currentUser.email?.toLowerCase()).single();
          
          const cleanUsername = currentUser.email?.split('@')[0] || '';
          const newProfile = {
            uid: currentUser.id,
            email: currentUser.email,
            username: allowed?.username || cleanUsername,
            role: isUserMaster ? 'admin' : 'professor',
            professional_name: allowed?.full_name || currentUser.user_metadata?.displayName || cleanUsername,
            assigned_subjects: allowed?.assigned_subjects || [],
            assigned_classes: []
          };
          await supabase.from('users').insert(newProfile);
          setUserProfile(newProfile);
          setIsAdmin(true);
        } else {
          // Check if role needs sync for master account
          if (isUserMaster && profile.role !== 'admin') {
            await supabase.from('users').update({ role: 'admin' }).eq('uid', currentUser.id);
            profile.role = 'admin';
          }

          // Fill missing fields on old profiles
          const updatedProfile = {
             ...profile,
             professional_name: profile.professional_name || profile.username || profile.email?.split('@')[0] || 'Professor',
             assigned_subjects: profile.assigned_subjects || [],
             assigned_classes: profile.assigned_classes || []
          };
          setUserProfile(updatedProfile);
          setIsAdmin(isUserMaster || updatedProfile.role === 'admin');
        }
        
        setUser(currentUser);
      } catch (err) {
        console.error("Error setting up user:", err);
        // Do not force sign out, let them proceed even if profile logic throws.
        setIsAdmin(currentUser.email?.toLowerCase() === 'cps@cps.local');
        setUser(currentUser);
      }
    } else {
      setUser(null);
      setIsAdmin(false);
      setUserProfile(null);
    }
    setLoading(false);
  };

  // Data Listeners
  useEffect(() => {
    if (!user) return;

    const fetchExams = async () => {
      const { data, error } = await supabase.from('exams').select('*').order('created_at', { ascending: false });
      if (error) {
         console.error("Fetch exams failed:", error.message);
         if (!error.message.includes('infinite recursion')) {
           alert("Alerta de Sincronização: Não foi possível carregar as provas. (" + error.message + ")");
         }
      }
      
      if (data) {
        // Remove professor_id filter to allow all teachers to see the full schedule
        let validData = data;
        
        setExams(validData.map(exam => {
          const meta = exam.answer_key?._metadata || {};
          return {
            ...exam,
            answerKey: exam.answer_key,
            studyGuide: exam.study_guide,
            professorId: exam.professor_id,
            examType: exam.exam_type || meta.examType,
            examDate: exam.exam_date || meta.examDate,
            examTime: exam.exam_time || meta.examTime,
            classYear: exam.class_year || meta.classYear,
            fontSize: meta.fontSize,
            fontFamily: meta.fontFamily,
            content: exam.content || meta.content || exam.study_guide,
            createdAt: exam.created_at
          };
        }));
      }
    };

    const fetchResults = async () => {
      let query = supabase.from('results').select('*');
      // Remove the professor_id filter to allow seeing results for shared classes/subjects
      const { data } = await query;
      if (data) {
        setResults(data.map(r => ({
          ...r,
          examId: r.exam_id,
          professorId: r.professor_id,
          studentName: r.student_name,
          studentClass: r.student_class,
          score: r.points,
          maxScore: r.total_points,
          correctedAt: r.corrected_at
        })));
      }
    };

    const fetchStudentReports = async () => {
      let query = supabase.from('student_reports').select('*').order('created_at', { ascending: false });
      
      if (!isAdmin) {
        query = query.eq('professor_id', user.id);
      }
      const { data } = await query;
      if (data) {
        setStudentReports(data.map(r => ({
          id: r.id,
          studentName: r.student_name,
          studentClass: r.class_name,
          subject: r.subject,
          content: r.report_text,
          professorId: r.professor_id,
          professorName: user.id === r.professor_id ? userProfile?.professional_name : 'Professor',
          bimester: r.bimester,
          createdAt: r.created_at,
          updatedAt: r.created_at
        })));
      }
    };

    fetchExams();
    fetchResults();
    fetchStudentReports();

    // Fetch professors for admin console - ensure we only fetch when admin
    const fetchProfessors = async () => {
      try {
        const { data, error } = await supabase.from('users').select('*').order('professional_name', { ascending: true });
        if (error) throw error;
        if (data) setProfessors(data);
      } catch (err: any) {
        console.error("Erro ao buscar usuários para administração:", err);
      }
    };
    
    if (isAdmin || user.email === 'cps@cps.local') {
      fetchProfessors();
    } else {
      // Logic removed but we can still fetch if needed for mapping, 
      // however for professors they only see their own reports
    }

    const examsFilter = isAdmin ? undefined : undefined; // Subscription for all exams to see global schedule updates
    
    const examsSub = supabase.channel('exams_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exams' }, fetchExams)
      .subscribe();

    const resultsSub = supabase.channel('results_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'results', filter: examsFilter }, fetchResults)
      .subscribe();

    return () => {
      supabase.removeChannel(examsSub);
      supabase.removeChannel(resultsSub);
    };
  }, [user, isAdmin, refreshTrigger]);

  const handleLogout = () => supabase.auth.signOut();

  const handleReassignProfessor = async (examId: string, newProfessorId: string) => {
    try {
      const { error: examError } = await supabase.from('exams').update({ professor_id: newProfessorId }).eq('id', examId);
      if (examError) throw examError;

      // Also update results associated with this exam
      const { error: resultsError } = await supabase.from('results').update({ professor_id: newProfessorId }).eq('exam_id', examId);
      if (resultsError) throw resultsError;

      setRefreshTrigger(prev => prev + 1);
      setExamBeingReassigned(null);
      alert("Professor reatribuído com sucesso!");
    } catch (err: any) {
      alert("Erro ao reatribuir: " + err.message);
    }
  };

  const handleDeleteExam = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta prova? Esta ação também excluirá todos os resultados associados.")) return;
    try {
      const { error } = await supabase.from('exams').delete().eq('id', id);
      if (error) throw error;
      setExams(exams.filter(e => e.id !== id));
    } catch (err: any) {
      alert("Erro ao excluir: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <LoginView error={error} setError={setError} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />;
  }

  return (
    <div className={cn("h-screen flex flex-col print:h-auto print:bg-white print:block overflow-hidden transition-colors duration-300", 
      isDarkMode ? "dark bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
    )}>
      {/* Header */}
      <header className="bg-white dark:bg-black border-b border-slate-200 dark:border-slate-800 h-[70px] px-4 md:px-8 flex-shrink-0 flex items-center justify-between sticky top-0 z-40 print:hidden shadow-sm transition-colors">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex p-2 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg transition-colors text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            title={sidebarCollapsed ? "Expandir Menu" : "Recolher Menu"}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-2">
              <img src={LOGO_VINHO} alt="Logo CPS" className="w-4 h-4 md:w-5 md:h-5 object-contain" />
              <div className="w-px h-4 bg-slate-200 dark:bg-slate-700"></div>
              <img src={LOGO_COC} alt="Plataforma COC" className="h-3 md:h-4 object-contain" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-[10px] md:text-xs font-display font-black text-slate-800 dark:text-slate-100 tracking-tight uppercase leading-none">Colégio Progresso Santista</h1>
              <span className="text-[8px] md:text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">Gestão Acadêmica</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400"
            title={isDarkMode ? "Mudar para modo claro" : "Mudar para modo escuro"}
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-medium text-slate-900 dark:text-slate-200">{user.displayName || user.email?.replace('@cps.local', '')}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{isAdmin ? 'Administrador' : 'Professor'}</span>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden print:overflow-visible print:block">
        {/* Sidebar */}
        <aside className={cn(
          "bg-slate-900 text-white flex flex-col hidden lg:flex print:hidden shadow-xl z-20 transition-all duration-300 ease-in-out",
          sidebarCollapsed ? "w-[70px]" : "w-[240px]"
        )}>
          <div className="py-6 px-3 flex flex-col gap-2">
            <NavButton 
              active={view === 'dashboard'} 
              onClick={() => { setView('dashboard'); setExamToEdit(null); }} 
              icon={<BarChart3 className="w-5 h-5" />} 
              label="Visão Geral" 
              collapsed={sidebarCollapsed}
            />
            <NavButton 
              active={view === 'diary'} 
              onClick={() => { setView('diary'); setExamToEdit(null); }} 
              icon={<BookOpen className="w-5 h-5" />} 
              label="Diário & Notas" 
              collapsed={sidebarCollapsed}
            />
            <NavButton 
              active={view === 'correct'} 
              onClick={() => { setView('correct'); setExamToEdit(null); }} 
              icon={<Scan className="w-5 h-5" />} 
              label="Correção Automática" 
              collapsed={sidebarCollapsed}
            />
            <NavButton 
              active={view === 'boletim'} 
              onClick={() => { setView('boletim'); setExamToEdit(null); }} 
              icon={<FileText className="w-5 h-5" />} 
              label="Boletim Consolidado" 
              collapsed={sidebarCollapsed}
            />
            <NavButton 
              active={view === 'cronograma'} 
              onClick={() => { setView('cronograma'); setExamToEdit(null); }} 
              icon={<Calendar className="w-5 h-5" />} 
              label="Cronograma de Provas" 
              collapsed={sidebarCollapsed}
            />
            <NavButton 
              active={view === 'studentReports'} 
              onClick={() => { setView('studentReports'); setExamToEdit(null); }} 
              icon={<UserIcon className="w-5 h-5" />} 
              label="Observações Individuais" 
              collapsed={sidebarCollapsed}
            />
            <div className="h-px bg-slate-800 my-2 mx-4" />
            <NavButton 
              active={view === 'settings'} 
              onClick={() => { setView('settings'); setExamToEdit(null); }} 
              icon={<UserCircle className="w-5 h-5" />} 
              label="Minha Conta" 
              collapsed={sidebarCollapsed}
            />
            {isAdmin && (
              <NavButton 
                active={view === 'admin'} 
                onClick={() => { setView('admin'); setExamToEdit(null); }} 
                icon={<Settings className="w-5 h-5" />} 
                label="Administração" 
                collapsed={sidebarCollapsed}
              />
            )}
          </div>
          {!sidebarCollapsed && (
            <div className="mt-auto p-4 md:p-6 text-[10px] uppercase tracking-widest text-slate-500 font-bold truncate">
              Colégio Progresso Santista
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-[30px] pb-32 lg:pb-[30px] bg-[#f8fafc] print:overflow-visible print:p-0 print:static print:block print-container">
          <AnimatePresence mode="wait">
            {view === 'dashboard' && <DashboardView user={user} isAdmin={isAdmin} exams={exams} results={results} setView={setView} onSelectPrintExam={setSelectedPrintExam} onEditExam={e => { setExamToEdit(e); setView('create'); }} onDeleteExam={handleDeleteExam} professors={professors} onReassignProfessor={setExamBeingReassigned} userProfile={userProfile} />}
            {view === 'create' && <CreateExamView user={user} userProfile={userProfile} setView={setView} examToEdit={examToEdit} onExamSaved={() => { setExamToEdit(null); setRefreshTrigger(prev => prev + 1); setView('dashboard'); }} />}
            {view === 'correct' && <CorrectExamView user={user} exams={exams} setView={setView} setRefreshTrigger={setRefreshTrigger} />}
            {view === 'guides' && <GuidesView exams={exams} />}
            {view === 'studentReports' && (
              <StudentReportsView 
                user={user} 
                userProfile={userProfile} 
                isAdmin={isAdmin} 
                reports={studentReports.map(r => {
                  if (isAdmin && professors.length > 0) {
                    const prof = professors.find(p => p.uid === r.professorId);
                    if (prof) return { ...r, professorName: prof.professional_name };
                  }
                  return r;
                })} 
                refresh={() => setRefreshTrigger(prev => prev + 1)} 
                onPrint={(report) => { setSelectedReportForPrint(report); setView('printReport'); setMultipleReportsToPrint([]); }} 
                onPrintAll={(reports) => { setMultipleReportsToPrint(reports); setSelectedReportForPrint(null); setView('printReport'); }} 
              />
            )}
            {view === 'printReport' && (selectedReportForPrint || multipleReportsToPrint.length > 0) && <StudentReportPrintView reports={selectedReportForPrint ? [selectedReportForPrint] : multipleReportsToPrint} onBack={() => setView('studentReports')} />}
            {view === 'print' && selectedPrintExam && <ExamPrintView exam={selectedPrintExam} onBack={() => setView('dashboard')} />}
            {view === 'admin' && isAdmin && <AdminView user={user} onResetPassword={async (targetUid, newPw) => {
              const { data: { session } } = await supabase.auth.getSession();
              const response = await fetch('/api/admin/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  targetUid,
                  newPassword: newPw,
                  adminToken: session?.access_token
                })
              });
              const data = await response.json();
              if (!response.ok) throw new Error(data.error);
            }} />}
            {view === 'settings' && <SettingsView user={user} userProfile={userProfile} onPasswordChange={async (newPw) => {
              const { error } = await supabase.auth.updateUser({ password: newPw + "_cpsAuth" });
              if (error) throw error;
            }} />}
            {view === 'diary' && <DigitalDiaryView user={user} isAdmin={isAdmin} userProfile={userProfile} />}
            {view === 'boletim' && <BoletimView results={results} exams={exams} isAdmin={isAdmin} user={user} userProfile={userProfile} onRefresh={() => setRefreshTrigger(prev => prev + 1)} />}
            {view === 'cronograma' && <CronogramaEstudosView exams={exams} isAdmin={isAdmin} schoolInfo={getSchoolInfo()} bimesters={['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre']} userProfile={userProfile} onRefresh={() => setRefreshTrigger(prev => prev + 1)} />}
          </AnimatePresence>
          <div className="mt-16 mb-12 text-center border-t border-slate-200 dark:border-slate-800 pt-12 print:hidden overflow-hidden relative">
            <div className="inline-flex flex-col items-center gap-4 relative z-10">
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ 
                  y: [0, -10, 0],
                  opacity: 1
                }}
                transition={{ 
                  y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                  opacity: { duration: 0.5 }
                }}
                whileHover={{ 
                  scale: 1.15, 
                  rotate: [0, -5, 10, -10, 5, 0]
                }}
                transition={{
                  scale: { type: "spring", stiffness: 400, damping: 10 },
                  rotate: { duration: 0.5, ease: "backOut" }
                }}
                whileTap={{ scale: 0.8 }}
                onClick={() => {
                  confetti({
                    particleCount: 150,
                    startVelocity: 30,
                    spread: 360,
                    origin: { x: Math.random(), y: Math.random() - 0.2 }
                  });
                }}
                className="relative px-10 py-5 bg-slate-950 dark:bg-slate-900 rounded-[3rem] shadow-2xl shadow-accent/30 cursor-pointer border-2 border-slate-800 group overflow-hidden"
              >
                {/* Rainbow background on hover */}
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 opacity-0 group-hover:opacity-10 transition-opacity"
                />
                {/* Decorative particles */}
                <motion.div 
                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -top-2 -left-2 w-4 h-4 bg-accent rounded-full blur-sm" 
                />
                <motion.div 
                  animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.5, 0.2] }}
                  transition={{ duration: 3, repeat: Infinity, delay: 1 }}
                  className="absolute -bottom-1 -right-3 w-6 h-6 bg-blue-500 rounded-full blur-md" 
                />

                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-1 group-hover:text-accent transition-colors">
                  Sistema de Gestão Escolar
                </p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-white">Desenvolvido por</span>
                  <motion.span 
                    animate={{ 
                      color: ["#ff3b30", "#ff9500", "#ffcc00", "#4cd964", "#5ac8fa", "#007aff", "#5856d6", "#ff3b30"],
                    }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    className="text-lg font-black italic tracking-tighter drop-shadow-[0_0_8px_rgba(var(--accent-rgb),0.5)]"
                  >
                    Antônio Carlos
                  </motion.span>
                </div>
              </motion.div>

              <div className="flex items-center gap-4">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                  className="text-accent/40"
                >
                  <Sparkles className="w-4 h-4" />
                </motion.div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-default">
                  Tecnologia & Inovação v2.5
                </p>
                <motion.div 
                  animate={{ rotate: -360 }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                  className="text-blue-400/40"
                >
                  <Sparkles className="w-4 h-4" />
                </motion.div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {examBeingReassigned && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 border border-border"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-primary uppercase tracking-tight">Reatribuir Professor</h3>
              <button onClick={() => setExamBeingReassigned(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Você está mudando o vínculo da avaliação <b className="text-accent">"{stripHtml(examBeingReassigned.title)}"</b>. 
              Isso fará com que os resultados e diários sejam migrados para o novo professor.
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Selecione o Novo Professor</label>
                <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2">
                  {professors.filter(p => p.uid !== examBeingReassigned.professorId).map(prof => (
                    <button
                      key={prof.uid}
                      onClick={() => handleReassignProfessor(examBeingReassigned.id, prof.uid)}
                      className="flex items-center gap-3 p-3 text-left bg-slate-50 border border-slate-200 rounded-lg hover:border-accent hover:bg-slate-100 transition-all group"
                    >
                      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-colors">
                        <UserIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{prof.professional_name || prof.display_name}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-medium">{prof.email}</p>
                      </div>
                    </button>
                  ))}
                  {professors.length <= 1 && (
                    <p className="text-center text-slate-400 py-4 text-sm font-medium italic">Nenhum outro professor disponível.</p>
                  )}
                </div>
              </div>
            </div>

            <button 
              onClick={() => setExamBeingReassigned(null)}
              className="w-full mt-6 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-200"
            >
              Cancelar
            </button>
          </motion.div>
        </div>
      )}

      {/* Mobile Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-black border-t border-slate-200 dark:border-slate-800 px-1 py-1 flex justify-between items-center overflow-x-auto gap-0.5 shadow-[0_-8px_15px_rgba(0,0,0,0.08)] z-[100] animate-in slide-in-from-bottom-5 print:hidden text-slate-600 dark:text-slate-400 transition-colors">
        <MobileNavButton active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<BarChart3 size={18} />} label="Início" />
        <MobileNavButton active={view === 'diary'} onClick={() => setView('diary')} icon={<BookOpen size={18} />} label="Diário" />
        <MobileNavButton active={view === 'correct'} onClick={() => setView('correct')} icon={<Scan size={18} />} label="Correção" />
        <MobileNavButton active={view === 'boletim'} onClick={() => setView('boletim')} icon={<FileText size={18} />} label="Boletim" />
        <MobileNavButton active={view === 'cronograma'} onClick={() => setView('cronograma')} icon={<Calendar size={18} />} label="Provas" />
        <MobileNavButton active={view === 'studentReports'} onClick={() => setView('studentReports')} icon={<UserIcon size={18} />} label="Obs" />
        <MobileNavButton active={view === 'settings'} onClick={() => setView('settings')} icon={<UserCircle size={18} />} label="Perfil" />
        {isAdmin && (
          <MobileNavButton active={view === 'admin'} onClick={() => setView('admin')} icon={<Settings size={18} />} label="Admin" />
        )}
      </nav>
    </div>
  );
}

// Sub-components
function NavButton({ active, onClick, icon, label, collapsed }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, collapsed?: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center transition-all duration-200 text-sm font-medium w-full text-left rounded-md",
        collapsed ? "justify-center px-0 py-3" : "gap-3 px-5 py-3",
        active 
          ? "bg-secondary opacity-100 border-l-4 border-accent text-white" 
          : "opacity-80 hover:bg-secondary/50 hover:opacity-100 text-slate-300"
      )}
      title={collapsed ? label : ""}
    >
      <div className={cn("flex-shrink-0", active ? "text-accent" : "")}>
        {icon}
      </div>
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );
}

function MobileNavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center p-2 rounded-xl transition-all flex-1 min-w-[50px] relative",
        active ? "text-accent dark:text-accent" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
      )}
    >
      {active && (
        <motion.div 
          layoutId="mobile-nav-indicator"
          className="absolute inset-0 bg-accent/5 dark:bg-accent/10 rounded-xl -z-10"
        />
      )}
      <div className={cn("mb-1 transition-all duration-300", active ? "scale-110 -translate-y-1" : "")}>
        {React.cloneElement(icon as React.ReactElement, { size: 20 })}
      </div>
      <span className={cn("text-[9px] font-black uppercase tracking-wider transition-opacity", active ? "opacity-100" : "opacity-60")}>{label}</span>
    </button>
  );
}

function LoginView({ error, setError, isDarkMode, setIsDarkMode }: { error: string | null, setError: (e: string | null) => void, isDarkMode: boolean, setIsDarkMode: (v: boolean) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabaseEmail = `${username.toLowerCase().trim()}@cps.local`;
      const supabasePassword = password + "_cpsAuth"; // Ensures >= 6 chars

      const { error } = await supabase.auth.signInWithPassword({ email: supabaseEmail, password: supabasePassword });
      if (error) throw error;
    } catch (err: any) {
      if (err.message?.includes('rate limit')) {
        setError('Muitas tentativas. Por favor, aguarde alguns minutos antes de tentar novamente.');
      } else if (err.message?.includes('Invalid login credentials')) {
        setError('Usuário ou senha incorretos.');
      } else {
        setError(err.message || 'Ocorreu um erro ao autenticar.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("min-h-screen flex items-center justify-center p-6 transition-colors", isDarkMode ? "bg-slate-950" : "bg-slate-50")}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white dark:bg-slate-900 rounded-lg shadow-xl p-10 text-center border border-slate-200 dark:border-slate-800 relative shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
      >
        <div className="absolute top-4 right-4 print:hidden">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 dark:text-slate-500"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
        <div className="bg-white dark:bg-slate-800 w-full max-w-[200px] h-16 rounded-xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100 dark:border-slate-700 gap-3 px-4">
          <img src={LOGO_VINHO} alt="Logo CPS" className="w-10 h-10 object-contain" />
          <div className="w-px h-8 bg-slate-200 dark:bg-slate-600"></div>
          <img src={LOGO_COC} alt="Plataforma COC" className="h-6 object-contain" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Colégio Progresso Santista</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm">Acesso restrito para professores.</p>
        
        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 p-3 rounded-md text-sm font-bold mb-6 flex items-center gap-2 border border-red-100 dark:border-red-900">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-left space-y-1">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Usuário</label>
            <input 
              type="text" 
              placeholder="Ex: joao.silva" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:border-accent outline-none text-sm transition-colors"
            />
          </div>
          <div className="text-left space-y-1">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Senha</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:border-accent outline-none text-sm transition-colors"
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 dark:bg-white text-white dark:text-black py-3 px-6 rounded-md font-bold flex items-center justify-center gap-3 hover:opacity-90 transition-all shadow-sm disabled:opacity-50 mt-4"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Entrar no Sistema'}
          </button>
        </form>

        <p className="mt-8 text-xs text-slate-400 dark:text-slate-500 font-medium">
          Caso tenha esquecido seus dados, entre em contato com a secretaria pedagógica.
        </p>
      </motion.div>
    </div>
  );
}

// Categories for exams
const EXAM_CATEGORIES = [
  'PI', 
  'PII', 
  'PIII', 
  'PIV', 
  'PV', 
  'PVI', 
  'Recuperação Bimestral', 
  'Recuperação Final',
  'Trabalho',
  'Simulado',
  'Atividade'
];

function DashboardView({ user, isAdmin, exams, results, setView, onSelectPrintExam, onEditExam, onDeleteExam, professors, onReassignProfessor, userProfile }: { 
  user: User, 
  isAdmin: boolean, 
  exams: Exam[], 
  results: Result[], 
  setView: (v: any) => void, 
  onSelectPrintExam: (e: Exam) => void, 
  onEditExam: (exam: Exam) => void, 
  onDeleteExam: (id: string) => void,
  professors: any[],
  onReassignProfessor: (exam: Exam) => void,
  userProfile: any
}) {
  const schoolInfo = getSchoolInfo();
  const [showAll, setShowAll] = useState(false);
  const [bimesterFilter, setBimesterFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showMasterAlert, setShowMasterAlert] = useState(true);
  
  const filteredExams = exams.filter(e => {
    const matchBimester = bimesterFilter === '' || e.bimester === bimesterFilter;
    const matchClass = classFilter === '' || (e.classYear || '').includes(classFilter);
    const matchCategory = categoryFilter === '' || e.examType === categoryFilter;
    return matchBimester && matchClass && matchCategory;
  });
  const displayExams = showAll ? filteredExams : filteredExams.slice(0, 10);

  // Auto-check if we are the special master admin
  const isMasterAdmin = user.email === 'cps@cps.local';

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {isMasterAdmin && showMasterAlert && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-center justify-between shadow-sm relative">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-2 rounded-full text-amber-600">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900">Acesso Master Detectado</p>
              <p className="text-xs text-amber-700 font-medium">Você pode gerenciar permissões e autorizar novos professores no painel de administração.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setView('admin')}
              className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-md hover:bg-amber-700 transition-colors shadow-sm"
            >
              Abrir Administração
            </button>
            <button 
              onClick={() => setShowMasterAlert(false)}
              className="p-2 text-amber-400 hover:text-amber-600 hover:bg-amber-100 rounded-full transition-colors"
              title="Fechar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
        <StatCard label="Provas" value={exams.length} icon={<FileText />} color="" />
        <StatCard label="Pendentes" value={results.filter(r => r.score === undefined).length} icon={<CheckCircle2 />} color="" />
        <StatCard label="Média (PII)" value={results.filter(r => exams.find(e => e.id === r.examId)?.examType === 'PII').length ? (results.filter(r => exams.find(e => e.id === r.examId)?.examType === 'PII').reduce((acc, r) => acc + (r.score/r.maxScore), 0) / results.filter(r => exams.find(e => e.id === r.examId)?.examType === 'PII').length * 10).toFixed(1) : '0.0'} icon={<BarChart3 />} color="" />
        <StatCard label="Avaliados" value={results.length} icon={<UserIcon />} color="" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="px-4 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="space-y-3">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">{showAll ? 'Base de Dados Completa' : 'Avaliações Recentes'}</h3>
              
              <div className="flex flex-wrap gap-2">
                <select 
                  value={bimesterFilter}
                  onChange={e => setBimesterFilter(e.target.value)}
                  className="text-[10px] font-black border-2 border-black dark:border-slate-700 rounded-lg px-3 py-1.5 outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.1)] focus:ring-0 transition-all"
                >
                  <option value="">Bimestres</option>
                  <option value="1º Bimestre">1º Bim.</option>
                  <option value="2º Bimestre">2º Bim.</option>
                  <option value="3º Bimestre">3º Bim.</option>
                  <option value="4º Bimestre">4º Bim.</option>
                </select>

                <select 
                   value={classFilter}
                   onChange={e => setClassFilter(e.target.value)}
                   className="text-[10px] font-black border-2 border-black dark:border-slate-700 rounded-lg px-3 py-1.5 outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.1)] focus:ring-0 transition-all"
                >
                  <option value="">Turmas</option>
                  {schoolInfo.classes.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <select 
                   value={categoryFilter}
                   onChange={e => setCategoryFilter(e.target.value)}
                   className="text-[10px] font-black border-2 border-black dark:border-slate-700 rounded-lg px-3 py-1.5 outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.1)] focus:ring-0 transition-all"
                >
                  <option value="">Tipos</option>
                  {EXAM_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
            <button 
              onClick={() => setShowAll(!showAll)} 
              className="text-[10px] bg-white dark:bg-slate-900 border-2 border-black dark:border-slate-700 text-slate-900 dark:text-slate-100 px-4 py-2 rounded-lg font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] self-start sm:self-center active:translate-x-0.5 active:translate-y-0.5"
            >
              {showAll ? 'Ver Resumo' : 'Expandir Tudo'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 transition-colors">
                  <th className="text-left px-4 py-3 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100 dark:border-slate-800">Turma</th>
                  <th className="text-left px-4 py-3 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100 dark:border-slate-800">Matéria</th>
                  <th className="text-left px-4 py-3 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100 dark:border-slate-800">Tipo</th>
                  <th className="text-left px-4 py-3 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100 dark:border-slate-800">Data</th>
                  <th className="text-right px-4 py-3 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100 dark:border-slate-800">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {displayExams.length > 0 ? (
                  Array.from(new Set(displayExams.map(e => e.bimester || '1º Bimestre'))).map(bim => (
                    <React.Fragment key={bim}>
                      <tr className="bg-slate-50/30 dark:bg-slate-800/20">
                        <td colSpan={5} className="px-4 py-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                          {bim}
                        </td>
                      </tr>
                      {displayExams.filter(e => (e.bimester || '1º Bimestre') === bim).map(exam => (
                        <tr key={exam.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                          <td className="px-4 py-3 text-slate-900 dark:text-slate-200 font-bold whitespace-nowrap">
                            {exam.classYear || '--'}
                          </td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium max-w-[200px] truncate" title={stripHtml(exam.subject)}>
                            {stripHtml(exam.subject)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold uppercase">
                              {stripHtml(exam.examType)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-500 text-[11px] whitespace-nowrap">
                            {new Date(exam.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => {
                                  onSelectPrintExam(exam);
                                  setView('print');
                                }}
                                className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                title="Imprimir"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => generatePrintableAnswerSheet(exam, LOGO_VINHO, [""])}
                                className="p-1.5 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                                title="OMR"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              {(isAdmin || exam.professorId === user.id || (userProfile && (exam.professorId === userProfile.id || exam.professorId === userProfile.uid))) && (
                                <>
                                  <button 
                                    onClick={() => onEditExam(exam)}
                                    className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-all active:scale-90"
                                    title="Editar"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => onDeleteExam(exam.id)}
                                    className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-all active:scale-90"
                                    title="Excluir"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-5 py-20 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Search className="w-8 h-8 text-slate-200 dark:text-slate-800" />
                        <p className="text-slate-400 dark:text-slate-600 font-medium">Nenhuma prova encontrada.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-1 flex flex-col gap-5">
          <button 
            onClick={() => { onEditExam(null as any); setView('create'); }}
            className="bg-accent text-white p-3 rounded-md font-bold text-sm hover:bg-accent/90 transition-all shadow-sm"
          >
            + Criar Nova Prova
          </button>
          <button 
            onClick={() => setView('correct')}
            className="bg-white text-primary border border-primary p-3 rounded-md font-bold text-sm hover:bg-primary hover:text-white transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Baixar Folhas de Resposta
          </button>
          
          <div className="bg-[#edf2f7] p-4 rounded-lg border-l-4 border-primary text-[13px] leading-relaxed">
            <h4 className="font-bold text-primary mb-2">📍 Guia de Estudo</h4>
            <p className="text-slate-600 mb-3">Prepare o material de apoio para os alunos. Inclua tópicos, referências bibliográficas e exercícios recomendados.</p>
            <button 
              onClick={() => setView('guides')}
              className="text-[11px] border border-[#718096] px-2 py-1 rounded hover:bg-white transition-all font-bold text-slate-600"
            >
              Editar Conteúdos
            </button>
          </div>

          <div className="bg-[#ebf8ff] p-4 rounded-lg border-l-4 border-accent text-[13px] leading-relaxed">
            <h4 className="font-bold text-primary mb-2">📈 Desempenho</h4>
            {results.length > 0 ? (
               <p className="text-slate-600">
                 Registramos <b>{results.length}</b> resultados. Média atual:{' '}
                 <b>{((results.reduce((acc, r) => acc + (r.score / Math.max(1, r.maxScore)), 0) / results.length) * 100).toFixed(1)}%</b>. Continue monitorando os resultados dos alunos.
               </p>
            ) : (
               <p className="text-slate-600">
                 A evolução da turma será calculada após as correções da primeira prova. Realize correções para ver os dados.
               </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ label, value, icon, color }: { label: string, value: any, icon: React.ReactNode, color: string }) {
  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 text-primary dark:text-accent">
        {React.cloneElement(icon as React.ReactElement, { className: "w-6 h-6" })}
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">{label}</p>
        <p className="text-xl font-display font-black text-slate-800 dark:text-slate-100 tracking-tight leading-none">{value}</p>
      </div>
    </div>
  );
}

function CreateExamView({ user, userProfile, setView, examToEdit, onExamSaved }: { user: User, userProfile: any, setView: (v: any) => void, examToEdit?: Exam | null, onExamSaved: () => void }) {
  const schoolInfo = getSchoolInfo();
  
  const [title, setTitle] = useState(examToEdit?.title || '');
  
  // Default subject from profile if available, otherwise first subject in schoolInfo
  const defaultSubject = userProfile?.assigned_subjects?.[0] || schoolInfo.subjects[0] || '';
  const [subject, setSubject] = useState(examToEdit?.subject || defaultSubject);
  
  // Default class from profile if available, otherwise first class in schoolInfo
  const defaultClass = userProfile?.assigned_classes?.[0] || schoolInfo.classes[0] || '';
  const [classYear, setClassYear] = useState(examToEdit?.classYear || defaultClass);
  
  const [bimester, setBimester] = useState(examToEdit?.bimester || '1º Bimestre');
  const [content, setContent] = useState(examToEdit?.content || '');
  const [examType, setExamType] = useState<string>(examToEdit?.examType || 'PII');
  const [examDate, setExamDate] = useState(examToEdit?.examDate || '');
  const [examTime, setExamTime] = useState(examToEdit?.examTime || '');
  const [fontSize, setFontSize] = useState(examToEdit?.fontSize || 13);
  const [fontFamily, setFontFamily] = useState(examToEdit?.fontFamily || 'Inter');
  const [questions, setQuestions] = useState<Question[]>(examToEdit?.questions || []);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [isExternal, setIsExternal] = useState(examToEdit?.answerKey?._metadata?.isExternal || false);

  const addQuestion = (type: 'objective' | 'essay' = 'objective') => {
    setQuestions([...questions, {
      id: questions.length + 1,
      type: type,
      text: '',
      options: type === 'objective' ? ['', '', '', '', ''] : [],
      correctAnswer: type === 'objective' ? 'A' : '',
      points: 1,
      imageSize: 100,
      imageAlign: 'center'
    }]);
  };

  const [newCustomSubject, setNewCustomSubject] = useState('');

  const handleSave = async () => {
    if (!title) { setValidationError('O título da prova é obrigatório.'); return; }
    if (!subject) { setValidationError('A disciplina é obrigatória.'); return; }
    if (!classYear) { setValidationError('Selecione pelo menos uma turma.'); return; }
    if (!examType) { setValidationError('O tipo de prova (ex: PII, Recuperação) é obrigatório.'); return; }
    if (!isExternal && questions.length === 0) { setValidationError('Adicione pelo menos uma questão ou marque a prova como "Externa" (apenas para cronograma).'); return; }
    
    setValidationError('');
    setSaving(true);
    try {
      // Re-sort questions: objective first, essay last
      const sortedQuestions = [...questions].sort((a, b) => {
        if (a.type === 'essay' && b.type !== 'essay') return 1;
        if (a.type !== 'essay' && b.type === 'essay') return -1;
        return (a.id || 0) - (b.id || 0);
      }).map((q, idx) => ({ ...q, id: idx + 1 })); // Re-assign IDs for clarity

      const answerKey: Record<string, any> = {
        _metadata: {
          classYear,
          content,
          examType,
          examDate,
          examTime,
          isExternal,
          fontSize,
          fontFamily
        }
      };
      
      let guide = examToEdit?.studyGuide || '';
      if (!isExternal) {
        sortedQuestions.forEach(q => {
          if (q.type === 'objective') {
            answerKey[q.id] = q.correctAnswer;
          } else {
            answerKey[q.id] = '__ESSAY__'; // Marker for essay questions
          }
        });

        // Generate study guide
        const promptText = content 
          ? `${title} - ${subject} (${classYear}). Conteúdo programático: ${content}. Baseado nisso e nas questões: ${sortedQuestions.map(q => q.text).join(', ')}` 
          : `${title} - ${subject}: ${sortedQuestions.map(q => q.text).join(', ')}`;
        
        guide = await generateStudyGuide(promptText);
      }

      const examData = {
        title,
        subject,
        questions: isExternal ? [] : sortedQuestions,
        answer_key: answerKey,
        study_guide: guide,
        professor_id: user.id,
        exam_type: examType,
        exam_date: examDate ? examDate : null,
        exam_time: examTime ? examTime : null,
        class_year: classYear,
        bimester: bimester,
        content
      };

      let error;
      if (examToEdit) {
        const res = await supabase.from('exams').update(examData).eq('id', examToEdit.id);
        error = res.error;
      } else {
        const res = await supabase.from('exams').insert({ ...examData, created_at: new Date().toISOString() });
        error = res.error;
      }
      
      if (error) {
        alert("Erro no banco de dados (Supabase): " + error.message);
        throw error;
      }
      alert("Sucesso! A prova foi salva corretamente no servidor. Você agora pode imprimi-la.");
      onExamSaved();
      setView('dashboard');
    } catch (err: any) {
      alert("Erro ao tentar salvar: " + (err.message || 'Erro desconhecido. A imagem pode ser muito pesada ou há um problema de conexão.'));
      console.error("Error saving exam:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-6 pb-20"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-primary">{examToEdit ? 'Editar Prova' : 'Nova Prova'}</h2>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600 font-bold bg-slate-50 px-3 py-1 rounded border border-slate-200 cursor-pointer">
            <input 
              type="checkbox" 
              checked={isExternal} 
              onChange={(e) => setIsExternal(e.target.checked)} 
              className="accent-primary"
            />
            Prova Externa (Apenas Cronograma)
          </label>
          <button onClick={() => setView('dashboard')} className="px-4 py-2 text-slate-500 font-bold text-sm">Cancelar</button>
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-accent text-white px-6 py-2 rounded-md font-bold text-sm flex items-center gap-2 hover:bg-accent/90 transition-all shadow-sm disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Download className="w-4 h-4" />}
            Salvar Prova
          </button>
        </div>
      </div>

      {validationError && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-md text-sm font-bold flex items-center gap-2 shadow-sm">
          <AlertCircle className="w-5 h-5" />
          {validationError}
        </div>
      )}

      <div className="bg-white p-6 rounded-lg border border-border shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Título da Prova</label>
            <input 
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Prova Mensal de História"
              className="w-full px-4 py-2 rounded-md border border-border focus:border-accent outline-none transition-all text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Bimestre</label>
            <select 
              value={bimester}
              onChange={e => setBimester(e.target.value)}
              className="w-full px-4 py-2 rounded-md border border-border focus:border-accent outline-none transition-all text-sm bg-white"
            >
              <option value="1º Bimestre">1º Bimestre</option>
              <option value="2º Bimestre">2º Bimestre</option>
              <option value="3º Bimestre">3º Bimestre</option>
              <option value="4º Bimestre">4º Bimestre</option>
            </select>
          </div>
          <div className="space-y-2 col-span-1 md:col-span-3">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Turmas (Pode ser mais de uma)</label>
            <div className="flex flex-wrap gap-2">
              {schoolInfo.classes.map(c => {
                const isSelected = classYear.split(', ').includes(c);
                return (
                  <button 
                    key={c}
                    type="button"
                    onClick={() => {
                      const arr = classYear.split(', ').filter(Boolean);
                      if (arr.includes(c)) setClassYear(arr.filter(x => x !== c).join(', '));
                      else setClassYear([...arr, c].join(', '));
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-colors ${isSelected ? 'bg-primary text-white border-primary' : 'bg-slate-50 text-slate-600 border-border hover:border-slate-400'}`}
                  >
                    {c}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Matéria</label>
            <select 
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full px-4 py-2 rounded-md border border-border focus:border-accent outline-none transition-all text-sm bg-white"
            >
              <option value="">Selecione uma disciplina...</option>
              {schoolInfo.subjects.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tipo (Preencha ou Selecione)</label>
            <div className="flex gap-2">
              <input 
                type="text"
                list="exam-types"
                value={examType}
                onChange={e => setExamType(e.target.value)}
                placeholder="Ex: PII, AP1, Recuperação..."
                className="w-full px-4 py-2 rounded-md border border-border focus:border-accent outline-none transition-all text-sm"
              />
              <datalist id="exam-types">
                {EXAM_CATEGORIES.map(cat => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Data da Prova</label>
            <input 
              type="date"
              value={examDate}
              onChange={e => setExamDate(e.target.value)}
              className="w-full px-4 py-2 rounded-md border border-border focus:border-accent outline-none transition-all text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Horário</label>
            <input 
              type="time"
              value={examTime}
              onChange={e => setExamTime(e.target.value)}
              className="w-full px-4 py-2 rounded-md border border-border focus:border-accent outline-none transition-all text-sm"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left block">Conteúdo Programático</label>
          <ProfessionalEditor 
            value={content}
            onChange={setContent}
            placeholder="Digite o conteúdo que será cobrado nesta prova..."
          />
        </div>

        <div className="pt-4 border-t border-slate-100 flex flex-col md:flex-row gap-6">
          <div className="space-y-2 flex-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tamanho da Fonte (Principal)</label>
            <div className="flex items-center gap-3">
              <input 
                type="range" 
                min="10" 
                max="24" 
                value={fontSize} 
                onChange={e => setFontSize(parseInt(e.target.value))}
                className="flex-1 accent-accent"
              />
              <span className="text-sm font-bold text-primary w-10">{fontSize}px</span>
            </div>
          </div>
          <div className="space-y-2 flex-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Fonte da Prova</label>
            <select 
              value={fontFamily}
              onChange={e => setFontFamily(e.target.value)}
              className="w-full px-4 py-2 rounded-md border border-border focus:border-accent outline-none text-sm bg-white"
            >
              <option value="Inter">Sem Serifa (Inter)</option>
              <option value="Playfair Display">Serifada (Playfair)</option>
              <option value="JetBrains Mono">Monoespaçada (Código)</option>
              <option value="Outfit">Moderna (Outfit)</option>
            </select>
          </div>
        </div>
      </div>

      {!isExternal && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-primary">Questões</h3>
            <div className="flex gap-4">
              <button 
                onClick={() => addQuestion('objective')}
                className="text-accent font-bold text-sm flex items-center gap-2 hover:underline"
              >
                <Plus className="w-4 h-4" />
                + Objetiva
              </button>
              <button 
                onClick={() => addQuestion('essay')}
                className="text-primary font-bold text-sm flex items-center gap-2 hover:underline"
              >
                <Plus className="w-4 h-4" />
                + Dissertativa
              </button>
            </div>
          </div>

          {[...questions].sort((a, b) => {
            if (a.type === 'essay' && b.type !== 'essay') return 1;
            if (a.type !== 'essay' && b.type === 'essay') return -1;
            return (a.id || 0) - (b.id || 0);
          }).map((q, idx) => (
            <div key={idx} className="bg-white p-6 rounded-lg border border-border shadow-sm space-y-4 text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[11px] font-bold uppercase tracking-wider">Questão {idx + 1}</span>
                  <span className={cn(
                    "text-[10px] font-black uppercase px-2 py-0.5 rounded-full",
                    q.type === 'essay' ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"
                  )}>
                    {q.type === 'essay' ? 'Dissertativa' : 'Objetiva'}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-500">Pontuação:</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      min="0"
                      value={q.points || 1}
                      onChange={e => {
                        const newQs = [...questions];
                        const realIdx = questions.findIndex(origQ => origQ.id === q.id);
                        if (realIdx !== -1) {
                          newQs[realIdx].points = e.target.value;
                          setQuestions(newQs);
                        }
                      }}
                      className="w-16 px-2 py-1 rounded border border-border focus:border-accent text-sm outline-none bg-slate-50 text-center"
                    />
                  </div>
                  <button 
                    onClick={() => setQuestions(questions.filter(origQ => origQ.id !== q.id))}
                    className="text-red-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <ProfessionalEditor 
                value={q.text}
                onChange={(val) => {
                  const newQs = [...questions];
                  const realIdx = questions.findIndex(origQ => origQ.id === q.id);
                  if (realIdx !== -1) {
                    newQs[realIdx].text = val;
                    setQuestions(newQs);
                  }
                }}
                placeholder={q.type === 'essay' ? "Escreva o enunciado da questão dissertativa..." : "Digite o enunciado da questão objetiva..."}
              />
              
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 cursor-pointer w-fit hover:text-primary transition-colors">
                  <Camera className="w-4 h-4" />
                  Adicionar Imagem à Questão
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
                            const canvas = document.createElement('canvas');
                            const MAX_WIDTH = 1000;
                            const MAX_HEIGHT = 1000;
                            let width = img.width;
                            let height = img.height;

                            if (width > height) {
                              if (width > MAX_WIDTH) {
                                height *= MAX_WIDTH / width;
                                width = MAX_WIDTH;
                              }
                            } else {
                              if (height > MAX_HEIGHT) {
                                width *= MAX_HEIGHT / height;
                                height = MAX_HEIGHT;
                              }
                            }

                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            ctx?.drawImage(img, 0, 0, width, height);
                            const resizedBase64 = canvas.toDataURL('image/jpeg', 0.8);

                            const newQs = [...questions];
                            const realIdx = questions.findIndex(origQ => origQ.id === q.id);
                            if (realIdx !== -1) {
                              newQs[realIdx].text = (newQs[realIdx].text || '') + `<br/><br/><div style="text-align: center;"><img src="${resizedBase64}" style="max-width: 100%; display: inline-block;" /></div><br/>`;
                              setQuestions(newQs);
                            }
                          };
                          img.src = reader.result as string;
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>

              {q.type !== 'essay' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {['A', 'B', 'C', 'D', 'E'].map((opt, optIdx) => (
                    <div key={opt} className="flex items-center gap-3">
                      <button 
                        onClick={() => {
                          const newQs = [...questions];
                          const realIdx = questions.findIndex(origQ => origQ.id === q.id);
                          if (realIdx !== -1) {
                            newQs[realIdx].correctAnswer = opt;
                            setQuestions(newQs);
                          }
                        }}
                        className={cn(
                          "w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-xs transition-all",
                          q.correctAnswer === opt 
                            ? "bg-primary border-primary text-white" 
                            : "border-border text-slate-400 hover:border-slate-300"
                        )}
                      >
                        {opt}
                      </button>
                      <input 
                        value={q.options[optIdx]}
                        onChange={e => {
                          const newQs = [...questions];
                          const realIdx = questions.findIndex(origQ => origQ.id === q.id);
                          if (realIdx !== -1) {
                            newQs[realIdx].options[optIdx] = e.target.value;
                            setQuestions(newQs);
                          }
                        }}
                        placeholder={`Opção ${opt}`}
                        className="flex-1 px-3 py-1.5 rounded border border-slate-100 focus:border-accent outline-none text-sm"
                      />
                    </div>
                  ))}
                </div>
              )}
              
              {q.type === 'essay' && (
                <div className="bg-slate-50 p-4 rounded-md border border-dashed border-slate-200">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Espaço para resposta dissertativa aparecerá na prova impressa</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function CorrectExamView({ user, exams, setView, setRefreshTrigger }: { user: User, exams: Exam[], setView: (v: any) => void, setRefreshTrigger: React.Dispatch<React.SetStateAction<number>> }) {
  const [selectedExamId, setSelectedExamId] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState<number>(-1);
  const [batchResults, setBatchResults] = useState<any[]>([]);
  const [correcting, setCorrecting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [mode, setMode] = useState<'ai' | 'scan' | 'manual'>('ai');
  const [manualAnswers, setManualAnswers] = useState<Record<string | number, string>>({});
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const selectedExam = useMemo(() => exams.find(e => e.id === selectedExamId), [exams, selectedExamId]);

  const [batchNames, setBatchNames] = useState('');
  const [showBatchModal, setShowBatchModal] = useState(false);

  const downloadSheetTemplate = (names: string[] = [""]) => {
    if (selectedExam) {
      generatePrintableAnswerSheet(selectedExam, LOGO_VINHO, names);
    } else {
      alert("Selecione uma prova primeiro.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const loaders = files.map((file: File) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(loaders).then(results => {
      setImages(prev => [...prev, ...results]);
      setResult(null);
      setBatchResults([]);
    });
  };

  const handleManualCorrect = async () => {
    if (!selectedExam || !studentName) {
      alert("Por favor, preencha o nome do aluno e selecione a prova.");
      return;
    }

    setCorrecting(true);
    try {
      let score = 0;
      let maxScore = 0;
      
      selectedExam.questions.forEach((q) => {
        const questionPoints = parseFloat(String(q.points || 1));
        maxScore += questionPoints;
        
        const studentRaw = (manualAnswers[q.id] || "").toString().trim().toUpperCase();
        let studentAns = studentRaw;
        if (q.type !== 'essay') {
          const match = studentRaw.match(/([A-E])/);
          if (match) studentAns = match[1];
        }

        const correctRaw = (q.correctAnswer || "").toString().trim().toUpperCase();
        let correctAns = correctRaw;
        if (q.type !== 'essay') {
          const match = correctRaw.match(/([A-E])/);
          if (match) correctAns = match[1];
        }

        if (studentAns !== "" && studentAns === correctAns) {
          score += questionPoints;
        }
      });

      const resultData: any = {
        exam_id: selectedExamId,
        professor_id: user.id,
        student_name: studentName,
        points: score,
        total_points: maxScore,
        corrected_at: new Date().toISOString(),
        answers: manualAnswers,
        student_class: studentClass || selectedExam.classYear || ''
      };

      const { error } = await supabase.from('results').insert(resultData);
      
      if (error) {
        if (!error.message.includes('column')) throw error;
        console.warn("Salvando sem coluna opcional:", error.message);
      }
      
      setResult({
        studentName,
        score,
        maxScore,
        answers: manualAnswers
      });
      setRefreshTrigger(prev => prev + 1); // Atualiza os dados (Boletim)

      if (score / maxScore >= 0.7) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setCorrecting(false);
    }
  };

  const handleScannerCorrect = async () => {
    if (!selectedExamId || images.length === 0 || !selectedExam) return;

    setCorrecting(true);
    setBatchResults([]);
    const newResults = [];

    try {
      for (let i = 0; i < images.length; i++) {
        setCurrentProcessingIndex(i);
        const imgData = images[i];
        
        const img = new Image();
        img.src = imgData;
        await new Promise(resolve => img.onload = resolve);

        const canvas = canvasRef.current;
        if (!canvas) continue;
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx?.drawImage(img, 0, 0);

        try {
          let scanResult;
          if (mode === 'ai') {
            scanResult = await correctExamFromImage(
              imgData.split(',')[1],
              "image/jpeg",
              selectedExam.title,
              selectedExam.questions
            );
          } else {
            scanResult = await scanBubbleSheet(canvas, selectedExam.questions);
          }
          
          const resultData: any = {
            exam_id: selectedExamId,
            professor_id: user.id,
            student_name: scanResult.studentName || `Aluno ${newResults.length + 1}`,
            points: scanResult.score,
            total_points: scanResult.maxScore,
            corrected_at: new Date().toISOString(),
            answers: scanResult.answers || {},
            student_class: scanResult.studentClass || selectedExam.classYear || '',
            bimester: selectedExam.bimester
          };

          const { error } = await supabase.from('results').insert(resultData);
          if (error && !error.message.includes('column')) throw error;
          
          newResults.push(scanResult);
        } catch (err: any) {
          console.error(`Erro na imagem ${i + 1}:`, err);
          newResults.push({ error: err.message || "Erro de leitura", studentName: `Imagem ${i + 1}` });
        }
      }

      setBatchResults(newResults);
      setRefreshTrigger(prev => prev + 1);
      
      const successCount = newResults.filter(r => !r.error).length;
      if (successCount > 0) {
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      }
    } catch (err: any) {
      alert(err.message || "Erro no processamento em lote.");
    } finally {
      setCorrecting(false);
      setCurrentProcessingIndex(-1);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-6 pb-20"
    >
      <canvas ref={canvasRef} className="hidden" />

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-primary">Correção</h2>
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button 
            onClick={() => setMode('ai')}
            className={cn("px-4 py-1.5 rounded-md text-xs font-bold transition-all", mode === 'ai' ? "bg-white text-accent shadow-sm" : "text-slate-500")}
          >
            Correção por IA (Mais Preciso)
          </button>
          <button 
            onClick={() => setMode('manual')}
            className={cn("px-4 py-1.5 rounded-md text-xs font-bold transition-all", mode === 'manual' ? "bg-white text-accent shadow-sm" : "text-slate-500")}
          >
            Manual
          </button>
          <button 
            onClick={() => setMode('scan')}
            className={cn("px-4 py-1.5 rounded-md text-xs font-bold transition-all", mode === 'scan' ? "bg-white text-accent shadow-sm" : "text-slate-500")}
          >
            Digital Scan (Foto)
          </button>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg border border-border shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex-1 space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Selecione a Prova</label>
            <select 
              value={selectedExamId}
              onChange={e => {
                setSelectedExamId(e.target.value);
                setResult(null);
                setManualAnswers({});
              }}
              className="w-full px-4 py-2 rounded-md border border-border focus:border-accent outline-none text-sm"
            >
              <option value="">Escolha uma prova...</option>
              {exams.map(e => (
                <option key={e.id} value={e.id}>{e.title} ({e.examType})</option>
              ))}
            </select>
          </div>
          
          {selectedExam && (
            <div className="flex gap-2">
              <button 
                onClick={() => downloadSheetTemplate()}
                className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 text-slate-600 rounded-md text-xs font-bold hover:bg-slate-50 transition-all"
                title="Gera uma folha em branco"
              >
                <Download className="w-4 h-4" />
                Folha em Branco
              </button>
              <button 
                onClick={() => setShowBatchModal(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-accent text-white rounded-md text-xs font-bold hover:bg-accent/90 transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Gerar com Nomes (Lote)
              </button>
            </div>
          )}
        </div>

        {showBatchModal && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-accent/5 border border-accent/20 p-4 rounded-lg space-y-3"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-accent uppercase tracking-wider">Gerar Folhas em Lote</h4>
              <button onClick={() => setShowBatchModal(false)} className="text-slate-400 hover:text-slate-600">
                <Plus className="w-4 h-4 rotate-45" />
              </button>
            </div>
            <p className="text-[11px] text-slate-500">Cole a lista de nomes dos alunos abaixo (um por linha) para gerar uma folha personalizada para cada um com o logo da escola.</p>
            <textarea 
              value={batchNames}
              onChange={e => setBatchNames(e.target.value)}
              placeholder="João Silva&#10;Maria Oliveira&#10;..."
              className="w-full h-32 p-3 text-sm border border-border rounded-md outline-none focus:border-accent"
            />
            <button 
              onClick={() => {
                const names = batchNames.split('\n').map(n => n.trim()).filter(n => n !== '');
                if (names.length === 0) {
                  alert("Por favor, insira pelo menos um nome.");
                  return;
                }
                downloadSheetTemplate(names);
                setShowBatchModal(false);
              }}
              className="w-full bg-accent text-white py-2 rounded-md text-xs font-bold hover:bg-accent/90 transition-all"
            >
              Gerar PDF com {batchNames.split('\n').filter(n => n.trim() !== '').length} Folhas
            </button>
          </motion.div>
        )}

        {mode === 'manual' ? (
          <div className="space-y-6 text-left">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Nome do Aluno</label>
                <input 
                  value={studentName}
                  onChange={e => setStudentName(e.target.value)}
                  placeholder="Nome do aluno"
                  className="w-full px-4 py-2 rounded-md border border-border outline-none text-sm focus:border-accent"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Turma</label>
                <input 
                  value={studentClass}
                  onChange={e => setStudentClass(e.target.value)}
                  placeholder="Ex: 9A"
                  className="w-full px-4 py-2 rounded-md border border-border outline-none text-sm focus:border-accent"
                />
              </div>
            </div>

            {selectedExam && (
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-700">Respostas do Aluno:</h3>
                <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2">
                  {selectedExam.questions.map((q, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                         <span className="w-6 h-6 bg-primary text-white text-[10px] rounded-full flex items-center justify-center font-bold">{idx + 1}</span>
                         <span className="text-xs font-bold text-slate-500 truncate max-w-[150px] text-left">{q.text}</span>
                      </div>
                      <div className="flex gap-2">
                        {['A', 'B', 'C', 'D', 'E'].map(opt => (
                          <button
                            key={opt}
                            onClick={() => setManualAnswers({...manualAnswers, [q.id]: opt})}
                            className={cn(
                              "w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold transition-all",
                              manualAnswers[q.id] === opt ? "bg-accent border-accent text-white" : "bg-white border-border text-slate-400"
                            )}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button 
              onClick={handleManualCorrect}
              disabled={!selectedExamId || !studentName || correcting}
              className="w-full bg-accent text-white py-3 rounded-md font-bold text-sm flex items-center justify-center gap-3 hover:bg-accent/90 transition-all shadow-sm disabled:opacity-50"
            >
              {correcting ? <Loader2 className="animate-spin w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
              Salvar Nota
            </button>
          </div>
        ) : (
          <>
            <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg flex gap-3 text-left">
              <Sparkles className="w-5 h-5 text-indigo-600 shrink-0" />
              <div className="text-[12px] text-indigo-900 leading-relaxed">
                <p className="font-bold">Correção com Inteligência Artificial (Gratuita):</p>
                <p className="mt-1">A IA do Gemini analisa a foto da prova e identifica as respostas automaticamente. É o método mais confiável para fotos tiradas pelo celular.</p>
                <p className="mt-2 text-[10px] opacity-70">Aviso: Não é necessário configurar nenhuma chave, o sistema já utiliza a tecnologia integrada do Google.</p>
              </div>
            </div>

            <div className="space-y-2 text-left">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Fotos dos Gabaritos ({images.length})</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed border-slate-200 rounded-xl p-8 transition-all hover:border-accent cursor-pointer bg-slate-50",
                  images.length > 0 && "p-4"
                )}
              >
                {images.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative group aspect-square">
                        <img src={img} className="w-full h-full object-cover rounded-md shadow-sm border border-slate-200" alt={`Preview ${idx}`} />
                        <button 
                          onClick={(ev) => {
                            ev.stopPropagation();
                            setImages(prev => prev.filter((_, i) => i !== idx));
                          }}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Plus className="w-3 h-3 rotate-45" />
                        </button>
                      </div>
                    ))}
                    <div className="aspect-square border-2 border-dashed border-slate-300 rounded-md flex flex-col items-center justify-center text-slate-400 hover:text-accent hover:border-accent transition-colors">
                      <Plus className="w-5 h-5" />
                      <span className="text-[10px] font-bold mt-1">Mais</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 text-center">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                      <Camera className="text-slate-400 w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-primary font-bold text-sm">Tirar fotos ou Upload</p>
                      <p className="text-slate-500 text-[12px]">Selecione várias fotos de uma vez se desejar.</p>
                    </div>
                  </div>
                )}
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" multiple />
              </div>
            </div>

            <button 
              onClick={handleScannerCorrect}
              disabled={images.length === 0 || !selectedExamId || correcting}
              className="w-full bg-accent text-white py-3 rounded-md font-bold text-sm flex items-center justify-center gap-3 hover:bg-accent/90 transition-all shadow-sm disabled:opacity-50"
            >
              {correcting ? (
                <>
                  <Loader2 className="animate-spin w-5 h-5" />
                  Corrigindo ({currentProcessingIndex + 1}/{images.length})...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Escanear Lote ({images.length} fotos)
                </>
              )}
            </button>
          </>
        )}
      </div>

      {result && !correcting && batchResults.length === 0 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 bg-[#f0fff4] border border-[#38a169]/30 rounded-xl space-y-4 shadow-sm text-left"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-[#22543d] flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#38a169]" />
                Correção Finalizada
              </h3>
              <p className="text-sm font-bold text-[#2f855a] uppercase">{result.studentName}</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-[#38a169]">
                {((result.score / result.maxScore) * 10).toFixed(1).replace('.', ',')}
              </span>
              <p className="text-[10px] font-bold text-[#2f855a] uppercase">Nota 0-10</p>
            </div>
          </div>
          
          <button 
            onClick={() => {
              setResult(null);
              setImages([]);
              setStudentName('');
              setManualAnswers({});
            }}
            className="w-full bg-[#38a169] text-white py-3 rounded-md font-bold text-sm hover:bg-[#2f855a] transition-all shadow-md"
          >
            Digitalizar Próxima Prova
          </button>
        </motion.div>
      )}

      {batchResults.length > 0 && !correcting && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 text-left"
        >
          <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-accent" />
            Resultados do Lote ({batchResults.length})
          </h3>
          <div className="bg-white border border-border rounded-xl divide-y divide-slate-100 overflow-hidden shadow-sm">
            {batchResults.map((res, idx) => (
              <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm",
                    res.error ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
                  )}>
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">{res.studentName}</p>
                    {res.error ? (
                      <p className="text-[10px] text-red-500 font-bold uppercase">{res.error}</p>
                    ) : (
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Nota: {((res.score / res.maxScore) * 10).toFixed(1)}</p>
                    )}
                  </div>
                </div>
                {!res.error && (
                  <div className="text-right">
                     <span className={cn(
                       "text-sm font-black",
                       (res.score / res.maxScore) >= 0.6 ? "text-green-600" : "text-red-500"
                     )}>
                       {res.score}/{res.maxScore}
                     </span>
                  </div>
                )}
              </div>
            ))}
          </div>
          <button 
            onClick={() => {
              setBatchResults([]);
              setImages([]);
              setResult(null);
            }}
            className="w-full bg-accent text-white py-3 rounded-md font-bold text-sm hover:bg-accent/90 transition-all shadow-md"
          >
            Iniciar Nova Correção
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}

function GuidesView({ exams }: { exams: Exam[] }) {
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-primary">Guias de Estudo</h2>
        {selectedExam && (
          <button 
            onClick={() => exportToPDF(`guide-${selectedExam.id}`, `Guia-${selectedExam.title}`)}
            className="bg-white border border-border text-slate-700 px-4 py-2 rounded-md font-bold text-sm flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Download className="w-4 h-4" />
            Exportar PDF
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-2">
          <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Suas Provas</h3>
          {exams.map(exam => (
            <button
              key={exam.id}
              onClick={() => setSelectedExam(exam)}
              className={cn(
                "w-full text-left px-4 py-3 rounded-md border transition-all text-sm",
                selectedExam?.id === exam.id 
                  ? "bg-primary border-primary text-white shadow-sm" 
                  : "bg-white border-border text-slate-700 hover:border-accent/40"
              )}
            >
              <p className="font-bold">{stripHtml(exam.title)}</p>
              <p className={cn("text-[11px] opacity-70 font-bold uppercase", selectedExam?.id === exam.id ? "text-white" : "text-slate-500")}>
                {stripHtml(exam.subject)}
              </p>
            </button>
          ))}
        </div>

        <div className="lg:col-span-2">
          {selectedExam ? (
            <div id={`guide-${selectedExam.id}`} className="bg-white p-8 rounded-lg border border-border min-h-[500px]">
              <div className="border-b border-border pb-4 mb-6">
                <h3 className="text-2xl font-bold text-primary mb-1">{selectedExam.title}</h3>
                <p className="text-accent font-bold uppercase tracking-widest text-[11px]">Guia de Estudos • {selectedExam.subject}</p>
              </div>
              <div className="bg-[#fcfcfd] p-6 rounded-lg border border-border shadow-sm print:shadow-none">
                <SafeHTML 
                  html={selectedExam.studyGuide} 
                  className="text-slate-800 leading-relaxed text-sm"
                />
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-border rounded-lg p-20 text-center">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-bold text-sm">Selecione uma prova para ver o guia de estudos gerado por IA.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingsView({ user, userProfile, onPasswordChange }: { user: User, userProfile: any, onPasswordChange: (pw: string) => Promise<void> }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profName, setProfName] = useState(userProfile?.professional_name || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    try {
      // Update professional name in DB
      const { error } = await supabase
        .from('users')
        .update({ professional_name: profName })
        .eq('uid', user.id);
      
      if (error) throw error;
      
      // Update password if provided
      if (newPassword) {
        if (newPassword !== confirmPassword) {
          alert("As senhas não coincidem.");
          return;
        }
        if (newPassword.length < 6) {
          alert("A senha deve ter pelo menos 6 caracteres.");
          return;
        }
        await onPasswordChange(newPassword);
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.7 },
          colors: ['#ff3b30', '#4cd964', '#007aff', '#ffcc00']
        });
        setNewPassword('');
        setConfirmPassword('');
      }
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      alert("Erro ao atualizar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
          <UserCircle className="w-10 h-10" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Minha Conta</h2>
          <p className="text-sm text-slate-500 font-medium">{user.email}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 p-8 shadow-sm">
        <form onSubmit={handleUpdateProfile} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Nome Profissional</label>
            <input 
              type="text" 
              value={profName}
              onChange={e => setProfName(e.target.value)}
              placeholder="Ex: Prof. Dr. Carlos Silva"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:border-accent transition-all font-bold"
            />
            <p className="text-[10px] text-slate-400 pl-1 italic">Como seu nome aparecerá no cabeçalho das provas.</p>
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-800 my-4" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Nova Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:border-accent transition-all font-bold"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Confirmar Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:border-accent transition-all font-bold"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex flex-col gap-3">
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 dark:bg-accent text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-slate-800 dark:hover:bg-accent/90 transition-all flex items-center justify-center gap-3 shadow-lg active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : success ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  Atualizado com Sucesso!
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Salvar Alterações
                </>
              )}
            </button>
            <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest">
              Segurança reforçada por Colégio Progresso Santista
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdminView({ user, onResetPassword }: { user: User, onResetPassword: (uid: string, pw: string) => Promise<void> }) {
  const [activeTab, setActiveTab] = useState<'users' | 'school'>('users');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [allowedUsers, setAllowedUsers] = useState<any[]>([]);
  const [networkUsers, setNetworkUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [schoolInfo, setSchoolInfoState] = useState(getSchoolInfo());
  const [newSubject, setNewSubject] = useState('');
  const [newClass, setNewClass] = useState('');
  
  const [configuringUser, setConfiguringUser] = useState<any | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [resettingPwUser, setResettingPwUser] = useState<any | null>(null);
  const [newPwVal, setNewPwVal] = useState('');

  const toggleSubject = (sub: string) => {
    setSelectedSubjects(prev => 
      prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]
    );
  };

  const handleUpdateUserConfig = async () => {
    if (!configuringUser) return;
    setConfigLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          professional_name: configuringUser.professional_name,
          assigned_subjects: configuringUser.assigned_subjects || [],
          assigned_classes: configuringUser.assigned_classes || []
        })
        .eq('uid', configuringUser.uid);
      
      if (error) throw error;
      alert("Configurações do professor atualizadas com sucesso!");
      setConfiguringUser(null);
    } catch (err) {
      console.error(err);
      alert("Erro ao atualizar configurações.");
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
        colors: ['#5ac8fa', '#007aff', '#ff3b30']
      });
      alert("Senha redefinida com sucesso!");
      setResettingPwUser(null);
      setNewPwVal('');
    } catch (err: any) {
      alert("Erro ao redefinir senha: " + err.message);
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
    saveInfo({ ...schoolInfo, subjects: [...schoolInfo.subjects, newSubject.trim()] });
    setNewSubject('');
  };

  const handleRemoveSubject = (subject: string) => {
    saveInfo({ ...schoolInfo, subjects: schoolInfo.subjects.filter((s: string) => s !== subject) });
  };

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClass.trim()) return;
    if (schoolInfo.classes.includes(newClass.trim())) {
      alert("Esta turma já existe.");
      return;
    }
    saveInfo({ ...schoolInfo, classes: [...schoolInfo.classes, newClass.trim()] });
    setNewClass('');
  };

  const handleRemoveClass = (cls: string) => {
    saveInfo({ ...schoolInfo, classes: schoolInfo.classes.filter((c: string) => c !== cls) });
  };

  const handleToggleClassSubject = (cls: string, sub: string) => {
    const currentSubjects = schoolInfo.class_subjects[cls] || [];
    const newSubjects = currentSubjects.includes(sub)
      ? currentSubjects.filter(s => s !== sub)
      : [...currentSubjects, sub];
    
    saveInfo({
      ...schoolInfo,
      class_subjects: {
        ...schoolInfo.class_subjects,
        [cls]: newSubjects
      }
    });
  };

  useEffect(() => {
    const fetchAllowed = async () => {
      const { data } = await supabase.from('allowed_professors').select('*');
      if (data) setAllowedUsers(data);
      
      const { data: usersData } = await supabase.from('users').select('*');
      if (usersData) setNetworkUsers(usersData);
    };
    fetchAllowed();

    const sub = supabase.channel('allowed_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'allowed_professors' }, fetchAllowed)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, fetchAllowed)
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !fullName || !password) {
      alert("Por favor, preencha todos os campos (usuário, nome e senha).");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/admin/create-professor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.toLowerCase().trim(),
          fullName: fullName.trim(),
          password: password,
          assignedSubjects: selectedSubjects
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao criar professor.");
      }

      setUsername('');
      setFullName('');
      setPassword('');
      setSelectedSubjects([]);
      alert("Professor criado e autorizado com sucesso!");
    } catch (err: any) {
      console.error(err);
      alert("Erro ao criar professor: " + (err.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!confirm("Remover autorização deste professor?")) return;
    try {
      await supabase.from('allowed_professors').delete().eq('id', userId);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Painel de Controle</h2>
          <p className="text-sm text-slate-500 font-medium">Gestão centralizada de usuários e estrutura escolar</p>
        </div>
        
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl relative overflow-hidden">
          <button 
            onClick={() => setActiveTab('users')}
            className={cn(
              "relative z-10 px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300",
              activeTab === 'users' ? "text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <span className="relative z-20">Equipe</span>
            {activeTab === 'users' && (
              <motion.div 
                layoutId="admin-tab-pill"
                className="absolute inset-0 bg-white dark:bg-slate-700 rounded-xl shadow-md z-10"
                transition={{ type: "spring", bounce: 0.4, duration: 0.6 }}
              />
            )}
          </button>
          <button 
            onClick={() => setActiveTab('school')}
            className={cn(
              "relative z-10 px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300",
              activeTab === 'school' ? "text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <span className="relative z-20">Escola</span>
            {activeTab === 'school' && (
              <motion.div 
                layoutId="admin-tab-pill"
                className="absolute inset-0 bg-white dark:bg-slate-700 rounded-xl shadow-md z-10"
                transition={{ type: "spring", bounce: 0.4, duration: 0.6 }}
              />
            )}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'users' ? (
          <motion.div 
            key="users-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Add User Form */}
              <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                    <UserCog className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Novo Professor</h3>
                </div>

                <form onSubmit={handleAddUser} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Nome Completo</label>
                      <input 
                        type="text" 
                        placeholder="Ex: João da Silva Santos" 
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        required
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:border-accent transition-all font-bold"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Usuário</label>
                        <input 
                          type="text" 
                          placeholder="joao.silva" 
                          value={username}
                          onChange={e => setUsername(e.target.value)}
                          required
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:border-accent transition-all font-mono text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Senha Inicial</label>
                        <input 
                          type="text" 
                          placeholder="Senha 123" 
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          required
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:border-accent transition-all font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Disciplinas sugeridas</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl overflow-y-auto max-h-[160px]">
                      {schoolInfo.subjects.map((sub: string) => (
                        <label key={sub} className="flex items-center gap-2 cursor-pointer hover:bg-white dark:hover:bg-slate-700 p-2 rounded-lg transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-600">
                          <input 
                            type="checkbox" 
                            checked={selectedSubjects.includes(sub)}
                            onChange={() => toggleSubject(sub)}
                            className="w-4 h-4 rounded border-slate-300 text-accent focus:ring-accent"
                          />
                          <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase truncate">{sub}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-slate-900 dark:bg-accent text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                    Criar Login de Professor
                  </button>
                </form>
              </div>

              {/* User List */}
              <div className="space-y-6">
                 <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                          <Users className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Professores Registrados</h3>
                      </div>
                      <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-black rounded-full uppercase">{networkUsers.length}</span>
                    </div>

                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                      {networkUsers.map((item, idx) => (
                        <div key={item.uid || `user-${idx}`} className="group p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-accent/40 hover:bg-white dark:hover:bg-slate-800 transition-all">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                               <p className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">{item.professional_name || item.email?.split('@')[0]}</p>
                               <div className="flex items-center gap-2 mt-1">
                                  <span className={cn(
                                    "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                                    item.role === 'admin' ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                                  )}>{item.role}</span>
                                  <span className="text-[10px] text-slate-400 font-mono truncate">{item.email}</span>
                               </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => setConfiguringUser({...item})}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                title="Configurar Vínculos"
                              >
                                <Settings className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => setResettingPwUser(item)}
                                className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                title="Resetar Senha"
                              >
                                <KeyRound className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={async () => {
                                  if (item.email?.toLowerCase() === 'cps@cps.local') return;
                                  const newRole = item.role === 'admin' ? 'professor' : 'admin';
                                  if (confirm(`Alterar permissão de ${item.email} para ${newRole}?`)) {
                                    await supabase.from('users').update({ role: newRole }).eq('uid', item.uid);
                                  }
                                }}
                                disabled={item.email?.toLowerCase() === 'cps@cps.local'}
                                className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all disabled:opacity-30"
                                title="Alterar Cargo"
                              >
                                <ShieldCheck className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                 </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="school-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            <div className="space-y-8">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight mb-6">Disciplinas</h3>
                <form onSubmit={handleAddSubject} className="flex gap-4 mb-6">
                  <input 
                    type="text" 
                    placeholder="Nova disciplina..." 
                    value={newSubject}
                    onChange={e => setNewSubject(e.target.value)}
                    required
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:border-accent transition-all font-bold"
                  />
                  <button type="submit" className="bg-accent text-white px-6 py-2 rounded-xl font-black uppercase tracking-widest hover:bg-accent/90 transition-all shadow-md active:scale-95">Add</button>
                </form>
                <div className="flex flex-wrap gap-2">
                  {schoolInfo.subjects.map((sub: string) => (
                    <span key={sub} className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                      {sub}
                      <button onClick={() => handleRemoveSubject(sub)} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight mb-6">Turmas / Anos</h3>
                <form onSubmit={handleAddClass} className="flex gap-4 mb-6">
                  <input 
                    type="text" 
                    placeholder="Nova turma..." 
                    value={newClass}
                    onChange={e => setNewClass(e.target.value)}
                    required
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:border-accent transition-all font-bold"
                  />
                  <button type="submit" className="bg-accent text-white px-6 py-2 rounded-xl font-black uppercase tracking-widest hover:bg-accent/90 transition-all shadow-md active:scale-95">Add</button>
                </form>
                <div className="flex flex-wrap gap-2">
                  {schoolInfo.classes.map((cls: string) => (
                    <span key={cls} className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                      {cls}
                      <button onClick={() => handleRemoveClass(cls)} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight mb-2">Relacionamento Turma/Matéria</h3>
              <p className="text-xs text-slate-500 mb-8 font-medium italic">Selecione quais matérias aparecem para cada sala.</p>
              
              <div className="space-y-6 max-h-[700px] overflow-y-auto pr-4 custom-scrollbar">
                {schoolInfo.classes.map((cls: string) => (
                  <div key={cls} className="p-6 bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-2xl transition-all">
                     <div className="flex items-center gap-3 mb-4">
                        <div className="w-1 h-6 bg-accent rounded-full"></div>
                        <span className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-tighter">{cls}</span>
                     </div>
                     <div className="flex flex-wrap gap-2">
                        {schoolInfo.subjects.map((sub: string) => {
                           const isSelected = (schoolInfo.class_subjects[cls] || []).includes(sub);
                           return (
                             <button 
                               key={sub}
                               onClick={() => handleToggleClassSubject(cls, sub)}
                               className={cn(
                                 "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all active:scale-95",
                                 isSelected 
                                   ? "bg-accent text-white border-accent shadow-lg shadow-accent/20" 
                                   : "bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-accent/40"
                               )}
                             >
                               {sub}
                             </button>
                           );
                        })}
                     </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Password Reset Modal */}
      {resettingPwUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-2xl p-8 max-w-sm w-full shadow-2xl border border-border"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tight">Redefinir Senha</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase truncate max-w-[200px]">{resettingPwUser.email}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Nova Senha</label>
                <input 
                  type="text"
                  value={newPwVal}
                  onChange={e => setNewPwVal(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:border-accent font-bold"
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setResettingPwUser(null)}
                  className="flex-1 py-3 text-xs font-black text-slate-500 uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleResetPassword}
                  disabled={loading || newPwVal.length < 6}
                  className="flex-1 py-3 bg-slate-900 dark:bg-amber-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 dark:hover:bg-amber-500 transition-all disabled:opacity-50 active:scale-95 shadow-lg"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirmar'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {configuringUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-border"
          >
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Vínculos Profissionais</h3>
                <p className="text-sm text-slate-500 font-medium">{configuringUser.email}</p>
              </div>
              <button 
                onClick={() => setConfiguringUser(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            
            <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Nome de Exibição nas Provas</label>
                <input 
                  type="text"
                  value={configuringUser.professional_name || ''}
                  onChange={e => setConfiguringUser({...configuringUser, professional_name: e.target.value})}
                  placeholder="Ex: Prof. Dr. Carlos Silva"
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl outline-none focus:border-accent font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Disciplinas que Ministra</label>
                <div className="flex flex-wrap gap-2 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                  {schoolInfo.subjects.map(sub => {
                    const selected = (configuringUser.assigned_subjects || []).includes(sub);
                    return (
                      <button 
                        key={sub}
                        onClick={() => {
                          const current = configuringUser.assigned_subjects || [];
                          if (selected) setConfiguringUser({...configuringUser, assigned_subjects: current.filter((s: string) => s !== sub)});
                          else setConfiguringUser({...configuringUser, assigned_subjects: [...current, sub]});
                        }}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight border transition-all ${selected ? 'bg-accent text-white border-accent shadow-lg shadow-accent/20' : 'bg-white dark:bg-slate-700 text-slate-500 border-slate-200 dark:border-slate-600'}`}
                      >
                        {sub}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Turmas Atribuídas</label>
                <div className="flex flex-wrap gap-2 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                  {schoolInfo.classes.map(cls => {
                    const selected = (configuringUser.assigned_classes || []).includes(cls);
                    return (
                      <button 
                        key={cls}
                        onClick={() => {
                          const current = configuringUser.assigned_classes || [];
                          if (selected) setConfiguringUser({...configuringUser, assigned_classes: current.filter((c: string) => c !== cls)});
                          else setConfiguringUser({...configuringUser, assigned_classes: [...current, cls]});
                        }}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight border transition-all ${selected ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white dark:bg-slate-700 text-slate-500 border-slate-200 dark:border-slate-600'}`}
                      >
                        {cls}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800 flex gap-4">
              <button 
                onClick={() => setConfiguringUser(null)}
                className="flex-1 px-6 py-4 rounded-xl font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-xs"
              >
                Cancelar
              </button>
              <button 
                onClick={handleUpdateUserConfig}
                disabled={configLoading}
                className="flex-1 bg-slate-900 dark:bg-accent text-white px-6 py-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-lg text-xs active:scale-95 disabled:opacity-50"
              >
                {configLoading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Salvar Alterações'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function ReportsView({ exams, results }: { exams: Exam[], results: Result[] }) {
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedBimester, setSelectedBimester] = useState('');

  const validExamIds = new Set(results.map(r => r.examId));
  const relevantExams = exams.filter(e => validExamIds.has(e.id));

  // Extract unique subjects and classes from the available exams that actually have results
  const subjects = Array.from(new Set(relevantExams.map(e => e.subject).filter(Boolean)));
  const classes = Array.from(new Set(
    results.map(r => r.studentClass).filter(Boolean).map(c => c!.trim())
  ));
  const bimesters = Array.from(new Set(
    relevantExams.map(e => e.bimester).filter(Boolean)
  ));

  // Determine which exams are relevant based on filters
  const filteredExams = relevantExams.filter(e => {
    if (selectedSubject && e.subject !== selectedSubject) return false;
    if (selectedClass && !(e.classYear || '').includes(selectedClass)) return false;
    if (selectedBimester && e.bimester !== selectedBimester) return false;
    return true;
  });

  const filteredExamIds = filteredExams.map(e => e.id);

  const filteredResults = results.filter(r => {
    // If we have exams filtered by subject, result must belong to one of them
    if (selectedSubject && !filteredExamIds.includes(r.examId)) return false;
    // If we have a class filter, the result's studentClass must match
    if (selectedClass && r.studentClass !== selectedClass) return false;
    return true;
  });

  const averageScore = filteredResults.length 
    ? (filteredResults.reduce((acc, r) => acc + (r.score/r.maxScore), 0) / filteredResults.length * 10).toFixed(1)
    : 0;

  const scoreDistribution = [
    { name: '0-5', value: filteredResults.filter(r => (r.score/r.maxScore) < 0.5).length },
    { name: '5-7', value: filteredResults.filter(r => (r.score/r.maxScore) >= 0.5 && (r.score/r.maxScore) < 0.7).length },
    { name: '7-9', value: filteredResults.filter(r => (r.score/r.maxScore) >= 0.7 && (r.score/r.maxScore) < 0.9).length },
    { name: '9-10', value: filteredResults.filter(r => (r.score/r.maxScore) >= 0.9).length },
  ];

  const COLORS = ['#EF4444', '#F59E0B', '#3182ce', '#38a169'];

  // Calculate most missed questions
  const missedQuestionsMap: Record<string, { count: number, total: number, examTitle: string, questionText: string }> = {};
  filteredResults.forEach(r => {
    if (!r.answers) return;
    const exam = exams.find(e => e.id === r.examId);
    if (!exam || !exam.questions) return;

    exam.questions.forEach((q, index) => {
      const qNum = (index + 1).toString();
      const studentAnswer = r.answers[q.id] || r.answers[index.toString()] || r.answers[qNum];
      const isCorrect = studentAnswer && studentAnswer.toUpperCase() === q.correctAnswer?.toUpperCase();
      
      const key = `${exam.id}-${q.id}`;
      if (!missedQuestionsMap[key]) {
        missedQuestionsMap[key] = { count: 0, total: 0, examTitle: exam.title, questionText: q.text || `Questão ${qNum}` };
      }
      missedQuestionsMap[key].total++;
      if (!isCorrect) {
        missedQuestionsMap[key].count++;
      }
    });
  });

  const mostMissedQuestions = Object.values(missedQuestionsMap)
    .sort((a, b) => b.count - a.count)
    .filter(q => q.count > 0)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-primary">Relatórios de Desempenho</h2>
          <p className="text-sm text-slate-500">Dados educacionais completos por sala e disciplina</p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={selectedBimester}
            onChange={e => setSelectedBimester(e.target.value)}
            className="bg-white border border-border px-4 py-2 rounded-md outline-none text-sm font-bold text-slate-600"
          >
            <option value="">Todos os Bimestres</option>
            {bimesters.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select 
            value={selectedSubject}
            onChange={e => setSelectedSubject(e.target.value)}
            className="bg-white border border-border px-4 py-2 rounded-md outline-none text-sm font-bold text-slate-600"
          >
            <option value="">Todas as Disciplinas</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select 
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            className="bg-white border border-border px-4 py-2 rounded-md outline-none text-sm font-bold text-slate-600"
          >
            <option value="">Todas as Turmas</option>
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <StatCard label="Média da Turma" value={averageScore} icon={<BarChart3 />} color="" />
        <StatCard label="Total de Alunos" value={filteredResults.length} icon={<UserIcon />} color="" />
        <StatCard label="Taxa de Aprovação" value={filteredResults.length ? (filteredResults.filter(r => (r.score/r.maxScore) >= 0.6).length / filteredResults.length * 100).toFixed(0) + '%' : '0%'} icon={<CheckCircle2 />} color="" />
        <div className="bg-white p-5 rounded-lg border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Maior Nota</p>
            <h4 className="text-2xl font-black text-slate-700">
              {filteredResults.length ? Math.max(...filteredResults.map(r => r.maxScore > 0 ? (r.score/r.maxScore)*10 : 0)).toFixed(1) : '0.0'}
            </h4>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
             <BarChart3 className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border border-border shadow-sm">
          <h3 className="text-base font-bold text-primary mb-6">Distribuição de Notas</h3>
          <div className="h-[250px]">
            {filteredResults.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={scoreDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {scoreDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">
                Sem dados para exibir
              </div>
            )}
          </div>
          <div className="flex justify-center gap-4 mt-4">
            {scoreDistribution.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                <span className="text-[10px] text-slate-500 font-bold uppercase">{d.name} ({d.value})</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-border shadow-sm flex flex-col h-[400px]">
          <h3 className="text-base font-bold text-primary mb-6 shrink-0">Onde a Sala Errou Mais</h3>
          <div className="space-y-4 overflow-y-auto pr-2 pb-4">
            {mostMissedQuestions.map((q, idx) => (
              <div key={idx} className="p-4 bg-red-50 border border-red-100 rounded-lg">
                <div className="flex justify-between items-start gap-4 mb-2">
                  <div className="text-sm font-bold text-slate-700 line-clamp-2" dangerouslySetInnerHTML={{ __html: q.questionText }}></div>
                  <div className="shrink-0 px-2 py-1 bg-red-100 text-red-700 font-black text-xs rounded-full">
                    {q.count} ERROS
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
                  <span>Prova: {q.examTitle}</span>
                  <span>{(q.count / q.total * 100).toFixed(0)}% de falha</span>
                </div>
              </div>
            ))}
            {mostMissedQuestions.length === 0 && <p className="text-center text-slate-400 py-10 text-sm">Dados insuficientes sobre erros.</p>}
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg border border-border shadow-sm">
        <h3 className="text-base font-bold text-primary mb-6">Lista de Alunos e Desempenhos</h3>
        <div className="space-y-3">
          {filteredResults.map(result => (
            <div key={result.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-md border border-slate-100">
              <div>
                <p className="font-bold text-slate-700 text-sm">{result.studentName} <span className="text-slate-400 font-normal ml-2">{result.studentClass}</span></p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">
                    {exams.find(e => e.id === result.examId)?.title || 'Prova Desconhecida'} • {new Date(result.correctedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {result.feedback && (
                   <span className="text-xs text-slate-500 hidden md:block max-w-[200px] truncate">{result.feedback}</span>
                )}
                <div className={cn(
                  "px-3 py-1 rounded-full font-bold text-xs min-w-[70px] text-center",
                  (result.score/result.maxScore) >= 0.6 ? "bg-[#c6f6d5] text-[#22543d]" : "bg-red-100 text-red-700"
                )}>
                  {result.maxScore > 0 ? ((result.score/result.maxScore)*10).toFixed(1) : 'S/N'}
                </div>
              </div>
            </div>
          ))}
          {filteredResults.length === 0 && <p className="text-center text-slate-400 py-10 text-sm">Nenhum resultado encontrado. Não esqueça de corrigir as avaliações no painel principal ou aba Corrigir Prova.</p>}
        </div>
      </div>
    </div>
  );
}

function ScheduleView({ exams, isAdmin, user, onExamSaved }: { exams: Exam[], isAdmin: boolean, user: User, onExamSaved: () => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Exam>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterClass, setFilterClass] = useState<string>('');

  const schoolInfo = getSchoolInfo();

  // Expand exams that have multiple classes
  const expandedExams: (Exam & { displayClass: string })[] = [];
  for (const exam of exams) {
    const classes = (exam.classYear || '').split(',').map(c => c.trim()).filter(Boolean);
    if (classes.length === 0) {
      expandedExams.push({ ...exam, displayClass: '' });
    } else {
      classes.forEach(cls => {
        expandedExams.push({ ...exam, displayClass: cls, id: exam.id + '-' + cls }); // Unique ID per class
      });
    }
  }

  const filteredExams = expandedExams.filter(e => filterClass === '' || e.displayClass === filterClass);

  const sortedExams = [...filteredExams].sort((a, b) => {
    if (!a.examDate) return 1;
    if (!b.examDate) return -1;
    return new Date(a.examDate).getTime() - new Date(b.examDate).getTime();
  });

  const groupedExams = sortedExams.reduce((acc, exam) => {
    const key = exam.examDate ? exam.examDate : 'A definir';
    if (!acc[key]) acc[key] = [];
    acc[key].push(exam);
    return acc;
  }, {} as Record<string, (Exam & { displayClass: string })[]>);

  const handleEditClick = (exam: Exam & { displayClass: string }) => {
    setEditingId(exam.id.split('-')[0]); // Recover original ID
    const originalExam = exams.find(e => e.id === exam.id.split('-')[0]);
    setFormData({ ...(originalExam || exam) });
  };

  const handleSave = async () => {
    if (!formData.subject) {
      alert("Atenção: A disciplina é obrigatória para o agendamento.");
      return;
    }
    if (!formData.classYear) {
      alert("Atenção: A(s) turma(s) são obrigatórias para o agendamento.");
      return;
    }
    
    setSaving(true);
    try {
      if (editingId && editingId !== 'new') {
        const { error, data } = await supabase.from('exams').update({
          subject: formData.subject,
          class_year: formData.classYear,
          exam_date: formData.examDate ? formData.examDate : null,
          exam_type: formData.examType,
          bimester: formData.bimester,
          content: formData.content
        }).eq('id', editingId).select();
        if (error) {
          alert(`Erro RLS Update: ${error.message}`);
          throw error;
        }
      } else {
        const { error, data } = await supabase.from('exams').insert({
          title: `Agendamento: ${formData.subject}`,
          subject: formData.subject,
          exam_type: formData.examType || 'PII',
          exam_date: formData.examDate ? formData.examDate : null,
          class_year: formData.classYear,
          bimester: formData.bimester || '1º Bimestre',
          content: formData.content,
          questions: [],
          answer_key: { _metadata: { isExternal: true, examType: formData.examType } },
          study_guide: '',
          professor_id: user.id
        }).select();
        if (error) {
          alert(`Erro RLS Insert: ${error.message} \nDetalhes: ${error.details}`);
          throw error;
        }
      }
      setEditingId(null);
      setIsAdding(false);
      onExamSaved();
      alert("Sucesso! Agendamento/Prova salvo corretamente no servidor.");
    } catch (err: any) {
      alert("Erro ao salvar no banco de dados: " + (err.message || JSON.stringify(err)));
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja apagar esse agendamento?')) {
      await supabase.from('exams').delete().eq('id', id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <h2 className="text-xl font-bold text-primary">Cronograma de Provas</h2>
        <div className="flex gap-3">
          {true && (
            <button 
              onClick={() => { setIsAdding(true); setFormData({}); setEditingId('new'); }}
              className="bg-primary text-white px-4 py-2 rounded-md font-bold text-sm flex items-center gap-2 hover:bg-primary/90 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Adicionar Agendamento
            </button>
          )}
          <button 
            onClick={() => {
              const originalTitle = document.title;
              document.title = 'Cronograma-Provas';
              window.print();
              document.title = originalTitle;
            }}
            className="bg-accent text-white px-4 py-2 rounded-md font-bold text-sm flex items-center gap-2 hover:bg-accent/90 shadow-sm"
          >
            <Printer className="w-4 h-4" />
            Imprimir Cronograma
          </button>
        </div>
      </div>

      <datalist id="exam-types">
        <option value="PI" />
        <option value="PII" />
        <option value="PIII" />
        <option value="AP1" />
        <option value="AP2" />
        <option value="AP3" />
        <option value="Recuperação Mensal" />
        <option value="Recuperação Bimestral" />
        <option value="Recuperação Final" />
        <option value="Simulado" />
      </datalist>

      <div className="bg-white p-4 rounded-lg border border-border shadow-sm flex items-center gap-3 print:hidden">
        <label className="text-sm font-bold text-slate-500 uppercase">Filtrar por Turma:</label>
        <select 
          value={filterClass} 
          onChange={e => setFilterClass(e.target.value)}
          className="border border-border rounded-md px-3 py-1.5 text-sm outline-none"
        >
          <option value="">Todas as Turmas (Completo)</option>
          {schoolInfo.classes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div id="schedule-container" className="bg-white rounded-lg border border-border overflow-hidden p-8 mb-8">
        <div className="text-center mb-8 border-b border-border pb-6">
          <div className="w-fit h-14 rounded-lg flex items-center justify-center mx-auto mb-4 bg-white px-4 border border-slate-100 gap-4">
            <img src={LOGO_VINHO} alt="Logo CPS" className="w-10 h-10 object-contain" />
            <div className="w-px h-8 bg-slate-200"></div>
            <img src={LOGO_COC} alt="Plataforma COC" className="h-6 object-contain" />
          </div>
          <h1 className="text-xl font-bold text-primary uppercase">Colégio Progresso Santista</h1>
          <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">Cronograma de Avaliações Semestrais</p>
        </div>

        {isAdding && (
          <div className="mb-8 p-4 bg-slate-50 border border-slate-200 rounded-lg print:hidden">
            <h3 className="font-bold text-primary mb-4">Novo Agendamento</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data</label>
                <input type="date" value={formData.examDate || ''} onChange={e => setFormData({...formData, examDate: e.target.value})} className="w-full border border-border rounded-md px-3 py-2 text-sm" />
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Turmas</label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {schoolInfo.classes.map(c => {
                    const isSelected = (formData.classYear || '').split(', ').includes(c);
                    return (
                      <button 
                        key={c}
                        type="button"
                        onClick={() => {
                          const arr = (formData.classYear || '').split(', ').filter(Boolean);
                          if (arr.includes(c)) setFormData({...formData, classYear: arr.filter(x => x !== c).join(', ')});
                          else setFormData({...formData, classYear: [...arr, c].join(', ')});
                        }}
                        className={`px-2 py-1 rounded text-[11px] font-bold border transition-colors ${isSelected ? 'bg-primary text-white border-primary' : 'bg-slate-50 text-slate-600 border-border hover:border-slate-400'}`}
                      >
                        {c}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Disciplina</label>
                <select value={formData.subject || ''} onChange={e => setFormData({...formData, subject: e.target.value})} className="w-full border border-border rounded-md px-3 py-2 text-sm">
                  <option value="">Selecione...</option>
                  {schoolInfo.subjects.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
                <div className="flex gap-2">
                  <input 
                    list="exam-types"
                    type="text"
                    placeholder="Ex: AP1, PII..."
                    value={formData.examType || ''} 
                    onChange={e => setFormData({...formData, examType: e.target.value})} 
                    className="w-full border border-border rounded-md px-3 py-2 text-sm" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bimestre</label>
                <select 
                  value={formData.bimester || '1º Bimestre'} 
                  onChange={e => setFormData({...formData, bimester: e.target.value})} 
                  className="w-full border border-border rounded-md px-3 py-2 text-sm"
                >
                  <option value="1º Bimestre">1º Bimestre</option>
                  <option value="2º Bimestre">2º Bimestre</option>
                  <option value="3º Bimestre">3º Bimestre</option>
                  <option value="4º Bimestre">4º Bimestre</option>
                </select>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Conteúdo para Estudo</label>
              <DefaultEditor value={formData.content || ''} onChange={e => setFormData({...formData, content: e.target.value})} className="w-full border border-border rounded-md min-h-[80px]" />
            </div>
            <div className="flex gap-2">
              <button disabled={saving} onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded-md font-bold text-sm">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
              <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="bg-white border border-slate-300 px-4 py-2 rounded-md font-bold text-sm text-slate-600">Cancelar</button>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {Object.entries(groupedExams).length === 0 && !isAdding && (
            <div className="text-center text-slate-400 italic py-10">Nenhuma data agendada.</div>
          )}
          {Object.entries(groupedExams).map(([date, dateExams]) => (
            <div key={date} className="break-inside-avoid shadow-sm rounded-lg border border-slate-200 overflow-hidden">
              <div className="bg-slate-100 px-4 py-3 border-b border-slate-200">
                <h3 className="font-bold text-primary text-lg">
                  {date === 'A definir' ? 'Sem data definida' : new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
              </div>
              <div className="divide-y divide-slate-100">
                {dateExams.map(exam => (
                  <div key={exam.id} className="p-4 bg-white hover:bg-slate-50 transition-colors">
                    {editingId === exam.id.split('-')[0] ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-2 print:hidden">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data</label>
                            <input type="date" value={formData.examDate || ''} onChange={e => setFormData({...formData, examDate: e.target.value})} className="w-full border border-border rounded-md px-3 py-2 text-sm" />
                          </div>
                          <div className="col-span-1 md:col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Turmas</label>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {schoolInfo.classes.map(c => {
                                const isSelected = (formData.classYear || '').split(', ').includes(c);
                                return (
                                  <button 
                                    key={c}
                                    type="button"
                                    onClick={() => {
                                      const arr = (formData.classYear || '').split(', ').filter(Boolean);
                                      if (arr.includes(c)) setFormData({...formData, classYear: arr.filter(x => x !== c).join(', ')});
                                      else setFormData({...formData, classYear: [...arr, c].join(', ')});
                                    }}
                                    className={`px-2 py-1 rounded text-[11px] font-bold border transition-colors ${isSelected ? 'bg-primary text-white border-primary' : 'bg-slate-50 text-slate-600 border-border hover:border-slate-400'}`}
                                  >
                                    {c}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Disciplina</label>
                            <select value={formData.subject || ''} onChange={e => setFormData({...formData, subject: e.target.value})} className="w-full border border-border rounded-md px-3 py-2 text-sm">
                              {schoolInfo.subjects.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
                            <div className="flex gap-2">
                              <input 
                                list="exam-types"
                                type="text"
                                placeholder="Ex: Recuperação..."
                                value={formData.examType || ''} 
                                onChange={e => setFormData({...formData, examType: e.target.value})} 
                                className="w-full border border-border rounded-md px-3 py-2 text-sm" 
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bimestre</label>
                            <select 
                              value={formData.bimester || '1º Bimestre'} 
                              onChange={e => setFormData({...formData, bimester: e.target.value})} 
                              className="w-full border border-border rounded-md px-3 py-2 text-sm"
                            >
                              <option value="1º Bimestre">1º Bimestre</option>
                              <option value="2º Bimestre">2º Bimestre</option>
                              <option value="3º Bimestre">3º Bimestre</option>
                              <option value="4º Bimestre">4º Bimestre</option>
                            </select>
                          </div>
                        </div>
                        <div className="mb-4">
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Conteúdo</label>
                          <DefaultEditor 
                            value={formData.content || ''} 
                            onChange={e => setFormData({...formData, content: e.target.value})} 
                            className="w-full border border-border rounded-md min-h-[80px]" 
                          />
                        </div>
                        <div className="flex gap-2">
                          <button disabled={saving} onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded-md font-bold text-sm">Salvar</button>
                          <button onClick={() => setEditingId(null)} className="bg-white border border-slate-300 px-4 py-2 rounded-md font-bold text-sm text-slate-600">Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-primary">{exam.subject}</span>
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase">{exam.examType}</span>
                            <span className="text-sm font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">{exam.displayClass || exam.classYear}</span>
                          </div>
                          <div className="text-sm text-slate-600 whitespace-pre-wrap"><strong className="text-slate-500">Conteúdo:</strong> <div dangerouslySetInnerHTML={{ __html: exam.content || 'Nenhum conteúdo específico providenciado.' }} className="inline-block relative top-0 [&>*:first-child]:inline" /></div>
                        </div>
                        {(isAdmin || exam.professorId === user.id) && (
                          <div className="flex items-center gap-1 print:hidden">
                            <button 
                              onClick={() => handleEditClick(exam)} 
                              className="p-1 px-2 text-slate-500 hover:text-primary hover:bg-slate-50 rounded transition-all flex items-center gap-1 text-[11px] font-bold"
                              title="Editar Agendamento"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Editar</span>
                            </button>
                            <button 
                              onClick={() => handleDelete(exam.id.split('-')[0])} 
                              className="p-1 px-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-all flex items-center gap-1 text-[11px] font-bold"
                              title="Excluir Agendamento"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Excluir</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-dashed border-border flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
          <span>Emitido em: {new Date().toLocaleDateString('pt-BR')}</span>
          <span>Colégio Progresso Santista</span>
        </div>
      </div>
    </div>
  );
}

function QRCodeImage({ data }: { data: string }) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    QRCode.toDataURL(data, { margin: 0, width: 200, color: { dark: '#000000', light: '#ffffff' } })
      .then(setUrl)
      .catch(console.error);
  }, [data]);

  if (!url) return <div className="w-16 h-16 bg-slate-100 flex items-center justify-center text-[8px] text-slate-400">QR</div>;
  return <img src={url} alt="QR Code" className="w-16 h-16 mix-blend-multiply" />;
}

function ExamPrintView({ exam, onBack }: { exam: Exam, onBack: () => void }) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState("");
  const [professorName, setProfessorName] = useState<string>('____________________');

  const schoolInfo = getSchoolInfo();

  useEffect(() => {
    const fetchProf = async () => {
      if (!exam.professorId) return;
      const { data } = await supabase.from('users').select('professional_name, email').eq('uid', exam.professorId).single();
      if (data) {
        setProfessorName(data.professional_name || data.email.split('@')[0]);
      }
    };
    fetchProf();
  }, [exam.professorId]);

  const totalValue = exam.questions.reduce((acc, q) => acc + (parseFloat(q.points as string) || 0), 0);
  
  // Get all registered students
  const allStudents: Student[] = Object.values(schoolInfo.studentsDB).flat();
  // Get all available classes sorted
  const availableClasses: string[] = Array.from(new Set(allStudents.map((s: Student) => s.classId))).sort();

  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedStudentNames, setSelectedStudentNames] = useState<string[]>([]);
  const [includeBlank, setIncludeBlank] = useState<boolean>(false);

  // Initialize selected class and students based on exam's classYear
  useEffect(() => {
    let initialClassId = '';
    if (exam.classYear) {
      // Find the first matching sub-class (e.g. if exam.classYear === '6º ano', pick '6º A')
      const target = exam.classYear.toLowerCase();
      const match = availableClasses.find(c => c.toLowerCase().includes(target) || target.includes(c.toLowerCase()));
      initialClassId = match || (availableClasses.length > 0 ? availableClasses[0] : '');
    } else if (availableClasses.length > 0) {
      initialClassId = availableClasses[0];
    }
    
    setSelectedClassId(initialClassId);
  }, [exam.classYear]);

  useEffect(() => {
    if (selectedClassId) {
      const studsForClass = allStudents.filter((s: Student) => s.classId === selectedClassId).map((s: Student) => s.name);
      setSelectedStudentNames(studsForClass);
    } else {
      setSelectedStudentNames([]);
    }
  }, [selectedClassId]);

  const toggleStudent = (name: string) => {
    if (selectedStudentNames.includes(name)) {
      setSelectedStudentNames(prev => prev.filter(n => n !== name));
    } else {
      setSelectedStudentNames(prev => [...prev, name]);
    }
  };

  const handleStandardPrint = () => {
    const sheets = document.getElementById('answer-sheets-container');
    const exams = document.getElementById('exams-container');
    if (sheets && exams) {
      sheets.classList.remove('print:hidden');
      exams.classList.remove('print:hidden');
      window.print();
    }
  };

  const handlePrintGabaritos = () => {
    const sheets = document.getElementById('answer-sheets-container');
    const exams = document.getElementById('exams-container');
    if (sheets && exams) {
      exams.classList.add('print:hidden');
      sheets.classList.remove('print:hidden');
      window.print();
      exams.classList.remove('print:hidden');
    }
  };

  // Determine students to render (minimum 1 blank if none selected)
  let studentsToRender: Student[] = selectedStudentNames.length > 0 
    ? allStudents.filter((s: Student) => selectedStudentNames.includes(s.name) && s.classId === selectedClassId)
    : [];

  if (studentsToRender.length === 0 && !includeBlank) {
    studentsToRender = [{ name: '', classId: selectedClassId || exam.classYear || '' }];
  } else if (includeBlank) {
    studentsToRender = [...studentsToRender, { name: '', classId: selectedClassId || exam.classYear || '' }];
  }

  return (
    <div className="space-y-8 print-container print:space-y-0">
      <div className="flex items-center justify-between no-print mb-4 px-4">
        <button 
          onClick={onBack}
          className="text-slate-500 font-bold text-sm flex items-center gap-2 hover:text-slate-700"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          Voltar ao Painel
        </button>
        <div className="flex gap-3">
          <button 
            onClick={() => {
              alert("Dica: Na próxima tela, mude o destino (Impressora) para 'Salvar como PDF' caso queira o arquivo em PDF, ou selecione sua impressora para imprimir em papel.");
              handleStandardPrint();
            }}
            className="bg-primary text-white px-4 py-2 rounded-md font-bold text-sm flex items-center gap-2 hover:bg-primary/90 shadow-sm disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            Imprimir Provas
          </button>
          <button 
            onClick={() => {
              alert("Dica: Na próxima tela, mude o destino (Impressora) para 'Salvar como PDF' caso queira o arquivo em PDF, ou selecione sua impressora para imprimir em papel.");
              handlePrintGabaritos();
            }}
            className="bg-accent text-white px-4 py-2 rounded-md font-bold text-sm flex items-center gap-2 hover:bg-accent/90 shadow-sm disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            Imprimir Gabaritos
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      <div className="bg-white p-6 border border-border shadow-sm rounded-lg print:hidden no-print">
        <h3 className="text-lg font-bold text-primary mb-4">Configurações de Impressão</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Turma Alvo</label>
            <select 
              value={selectedClassId} 
              onChange={e => setSelectedClassId(e.target.value)}
              className="w-full border border-border rounded-md px-3 py-2 text-sm"
            >
              <option value="">Selecione uma turma...</option>
              {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <p className="text-xs text-slate-500 mt-2">
              Selecione a sala específica. Todos os alunos desta sala serão marcados para impressão por padrão.
            </p>
            <div className="mt-6 p-4 border border-slate-200 rounded-md bg-slate-50">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={includeBlank}
                  onChange={e => setIncludeBlank(e.target.checked)}
                  className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
                />
                <span className="text-sm font-bold text-slate-700">Incluir cópia em branco extra</span>
              </label>
              <p className="text-xs text-slate-500 mt-1 ml-7">
                Gera uma cópia sem nome no final, ideal para alunos novatos na sala.
              </p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Alunos Selecionados ({selectedStudentNames.length})
            </label>
            <div className="border border-border rounded-md h-48 overflow-y-auto p-3 bg-slate-50 space-y-1">
              {allStudents.filter((s: Student) => s.classId === selectedClassId).length === 0 && (
                <div className="text-sm text-slate-400 italic">Por favor selecione uma turma...</div>
              )}
              {allStudents.filter((s: Student) => s.classId === selectedClassId).map((student: Student) => (
                <label key={student.name} className="flex items-center gap-3 p-2 hover:bg-slate-100 rounded cursor-pointer transition-colors">
                  <input 
                    type="checkbox" 
                    checked={selectedStudentNames.includes(student.name)}
                    onChange={() => toggleStudent(student.name)}
                    className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-slate-700 truncate">{student.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Generated Exams */}
      <div id="exams-container" className="space-y-12 print:space-y-0">
        {studentsToRender.map((student, sIdx) => (
          <div 
            key={`exam-${sIdx}`} 
            className={cn(
              "exam-content bg-white p-8 border border-border max-w-[210mm] mx-auto text-black print:border-none print:shadow-none print:max-w-none print:w-[210mm] print:min-h-[297mm] flex flex-col justify-between print:m-0 print:p-8",
              sIdx === studentsToRender.length - 1 ? "" : "print:break-after-page"
            )}
            style={{ fontSize: `${exam.fontSize || 13}px`, fontFamily: exam.fontFamily || 'Inter' }}
          >
            <div className="flex-1">
            {/* Main Header Box */}
            <div className="border-[3px] border-black border-dashed p-1 mb-8">
              
              {/* Top Row: Logos and School Name */}
              <div className="flex items-center justify-between border-b-[3px] border-black border-dashed pb-2 mb-1 px-4">
                <div className="flex items-center gap-4">
                  <img src={LOGO_VINHO} alt="Logo CPS" className="w-12 h-12 object-contain" referrerPolicy="no-referrer" />
                  <div className="flex flex-col border-l border-black pl-3 py-1">
                    <span className="text-[6px] uppercase font-bold text-slate-800 leading-none mb-1">Plataforma<br/>de Educação</span>
                    <img src={LOGO_COC} alt="COC" className="h-4 object-contain" referrerPolicy="no-referrer" />
                  </div>
                </div>
                <h1 className="text-2xl font-bold uppercase text-center flex-1 tracking-wide mr-12">Colégio Progresso Santista</h1>
              </div>

              {/* Student Info Fields */}
              <div className="text-[12px] font-bold flex flex-col uppercase">
                {/* Row 1 */}
                <div className="flex border-b-[3px] border-black border-dashed">
                  <div className="flex-[3] border-r-[3px] border-black border-dashed px-2 py-0.5 flex items-center overflow-hidden">
                    <span className="shrink-0">Nome:</span>
                    {student.name ? (
                      <span className="ml-2 font-black text-[13px] truncate flex-1">{student.name}</span>
                    ) : (
                      <span className="flex-1 border-b border-black mx-2 pt-3"></span>
                    )}
                  </div>
                  <div className="flex-1 border-r-[3px] border-black border-dashed px-2 py-0.5 whitespace-nowrap">
                    Classe: {student.classId || '____'}
                  </div>
                  <div className="flex-1 px-2 py-0.5 whitespace-nowrap">
                    Valor: <span className="font-black ml-1 text-sm">{totalValue || '____'}</span>
                  </div>
                </div>
                {/* Row 2 */}
                <div className="flex border-b-[3px] border-black border-dashed">
                  <div className="flex-[2] border-r-[3px] border-black border-dashed px-2 py-0.5">
                    Disciplina: <span className="font-normal normal-case">{exam.subject}</span>
                  </div>
                  <div className="flex-[2] border-r-[3px] border-black border-dashed px-2 py-0.5 flex items-center overflow-hidden">
                    <span className="shrink-0">Prof:</span>
                    <span className="ml-2 font-normal normal-case truncate">{professorName}</span>
                  </div>
                  <div className="flex-1 border-r-[3px] border-black border-dashed px-2 py-0.5">
                    Data: <span className="font-normal text-xs">{exam.examDate ? new Date(exam.examDate + 'T00:00:00').toLocaleDateString('pt-BR') : '___/___/____'}</span>
                  </div>
                  <div className="flex-1 px-2 py-0.5 whitespace-nowrap">
                    Nota: <span className="border-b border-black w-12 inline-block"></span>
                  </div>
                </div>
                {/* Row 3 */}
                <div className="flex min-h-[100px]">
                  <div className="flex-[4] border-r-[3px] border-black border-dashed px-2 py-2 normal-case">
                    <span className="uppercase">Instruções:</span>
                    <ul className="text-[11px] font-normal list-none ml-6 mt-1 space-y-1 text-black">
                      <li>❖ Faça letra legível;</li>
                      <li>❖ Mantenha a limpeza e a organização da prova;</li>
                      <li>❖ Evite rasuras e não deixe questões em branco.</li>
                    </ul>
                  </div>
                  <div className="flex-1 flex flex-col justify-between items-center text-center px-0 py-0">
                    <div className="w-full border-b-[3px] border-black border-dashed pb-1 pt-0.5 h-[65%] flex items-start justify-center font-bold uppercase text-[10px]">
                      Ass. do professor
                    </div>
                    <div className="h-[35%] flex items-center justify-center text-[10px] uppercase font-bold px-1">
                      {exam.examType}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content / Title */}
            {(() => {
              const rawTitle = (exam.content || exam.title || '');
              const cleanTitle = rawTitle
                .replace(/[-–]?\s*\(?\b(PII|PIII)\b\)?\s*/gi, '')
                .replace(/\(\s*\)/g, '')
                .trim();
                
              if (!cleanTitle) return null;
              
              return (
                <div className="text-center mb-8 px-8">
                  <SafeHTML 
                    html={cleanTitle} 
                    className="text-sm font-bold q-text-html-container [&_p]:inline" 
                  />
                </div>
              );
            })()}

            {/* Questions */}
            <div className="space-y-10">
              {exam.questions.map((q, idx) => (
                <div key={q.id} className="space-y-4 break-inside-avoid">
                  <div className="w-full text-left px-4 flex items-start justify-start gap-1">
                    <span className="font-bold text-sm min-w-[20px]">{idx + 1}.</span>
                    <SafeHTML 
                      html={q.text} 
                      className="text-sm font-bold leading-relaxed q-text-html-container flex-1" 
                    />
                  </div>
                  
                  {q.image && (
                    <div className={cn(
                      "flex my-4",
                      q.imageAlign === 'left' ? "justify-start" : q.imageAlign === 'right' ? "justify-end" : "justify-center"
                    )}>
                      <img 
                        src={q.image} 
                        alt={`Imagem da Questão ${q.id}`} 
                        className="object-contain" 
                        style={{ width: `${q.imageSize || 100}%`, maxWidth: '100%' }}
                      />
                    </div>
                  )}

                  {q.type === 'essay' ? (
                    <div className="px-8 space-y-4 pt-2">
                       {Array.from({ length: 5 }).map((_, i) => (
                         <div key={i} className="border-b border-black/30 h-8"></div>
                       ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-start w-fit mx-auto space-y-1">
                      {['a', 'b', 'c', 'd', 'e'].map((letter, i) => (
                        q.options[i] && (
                          <div key={letter} className="flex gap-2">
                            <span className="text-sm font-bold">{letter})</span>
                            <SafeHTML 
                              html={q.options[i]} 
                              className="text-sm q-text-html-container" 
                            />
                          </div>
                        )
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            </div>

            <div className="mt-20 pt-8 border-t border-black/10 flex items-end justify-between text-[11px] font-bold uppercase">
              <div className="flex flex-col gap-1">
                <span>Boa Sorte! • {exam.subject}</span>
                <span className="text-[8px] opacity-40">Colégio Progresso Santista</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Answer Sheets Container (OMR Compatible) */}
      <div id="answer-sheets-container" className="space-y-12 print:space-y-0 print:break-before-page">
        {studentsToRender.map((student, sIdx) => (
          <div 
            key={`sheet-${sIdx}`} 
            className={cn(
              "answer-sheet-page bg-white p-12 border border-border max-w-[210mm] mx-auto mt-10 print:border-none print:shadow-none print:mt-0 print:max-w-none print:w-[210mm] print:min-h-[297mm] relative print:overflow-visible print-avoid-break",
              sIdx === studentsToRender.length - 1 ? "" : "print:break-after-page"
            )}
          >
            {/* OMR Markers */}
            <div className="absolute top-4 left-4 omr-marker"></div>
            <div className="absolute top-4 right-4 omr-marker"></div>
            <div className="absolute bottom-4 left-4 omr-marker"></div>
            <div className="absolute bottom-4 right-4 omr-marker"></div>

            {/* Identity QR Code */}
            {student.name && (
              <div className="absolute top-6 right-12 z-10 border-2 border-black/5 p-1 bg-white">
                <QRCodeImage data={`${student.name}|${student.classId || exam.classYear || ''}`} />
                <div className="text-[6px] text-center font-black mt-0.5 opacity-50 uppercase">ID DIGITAL</div>
              </div>
            )}

            <div className="text-center border-b-2 border-primary pb-6 mb-8 mt-4">
              <div className="flex justify-center mb-2">
                <img src={LOGO_VINHO} alt="Logo" className="h-10 object-contain" />
              </div>
              <h2 className="text-lg font-black text-primary uppercase">Caderno de Respostas • Folha Óptica</h2>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                {(exam.title || '').replace(/<[^>]*>/g, '').replace(/[-–]?\s*\(?\b(PII|PIII)\b\)?\s*/gi, '').replace(/\(\s*\)/g, '').trim()} • {exam.subject}
              </p>
            </div>

            <div className="grid grid-cols-4 gap-6 mb-10">
              <div className="col-span-2 border border-slate-200 p-4 rounded bg-slate-50">
                <label className="block text-[10px] font-black text-primary uppercase mb-1">Nome do Aluno:</label>
                {student.name ? (
                  <div className="h-8 border-b-2 border-transparent flex items-end pb-1 font-bold text-slate-800 text-lg uppercase truncate">{student.name}</div>
                ) : (
                  <div className="h-8 border-b-2 border-slate-400 flex items-end pb-1 font-bold text-slate-800 text-lg uppercase truncate"></div>
                )}
              </div>
              <div className="border border-slate-200 p-4 rounded bg-slate-50">
                <label className="block text-[10px] font-black text-primary uppercase mb-1 text-center">Turma:</label>
                <div className="h-8 border-b-2 border-slate-400 flex items-end justify-center pb-1 font-black text-primary text-xl uppercase tracking-widest">{student.classId || exam.classYear}</div>
              </div>
              <div className="border border-slate-200 p-4 rounded bg-slate-50">
                <label className="block text-[10px] font-black text-primary uppercase mb-1 text-center">Professor:</label>
                <div className="h-8 border-b-2 border-transparent flex items-end justify-center pb-1 font-bold text-slate-700 text-[10px] uppercase truncate">{professorName}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-y-4 gap-x-8 p-6 border-2 border-slate-100 rounded-xl print:border-slate-300 print:gap-y-3">
              {exam.questions.filter(q => q.type !== 'essay').map((q, idx) => (
                <div key={q.id} className="flex items-center gap-4 print-avoid-break">
                  <span className="w-8 font-black text-primary text-sm">{String(idx + 1).padStart(2, '0')}</span>
                  <div className="flex gap-2">
                    {['A', 'B', 'C', 'D', 'E'].map(letter => (
                      <div 
                        key={letter}
                        className="w-10 h-10 rounded-full border-2 border-slate-300 flex items-center justify-center text-xs font-black text-slate-400"
                      >
                        {letter}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 bg-slate-50 p-6 rounded-lg border border-slate-200">
              <h3 className="text-xs font-black text-primary uppercase mb-4 text-center">Instruções de Preenchimento:</h3>
              <div className="grid grid-cols-2 gap-4">
                <ul className="text-[10px] text-slate-600 space-y-2 list-disc ml-4 font-bold">
                  <li>Utilize caneta azul ou preta.</li>
                  <li>Preencha totalmente o círculo.</li>
                </ul>
                <ul className="text-[10px] text-slate-600 space-y-2 list-disc ml-4 font-bold">
                  <li>Não rasure os quadrados pretos nos cantos.</li>
                  <li>O scanner não lerá marcas duplas.</li>
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StudentReportsView({ user, userProfile, isAdmin, reports, refresh, onPrint, onPrintAll }: { 
  user: User, 
  userProfile: any,
  isAdmin: boolean, 
  reports: StudentReport[], 
  refresh: () => void,
  onPrint: (report: StudentReport) => void,
  onPrintAll: (reports: StudentReport[]) => void
}) {
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedBimester, setSelectedBimester] = useState('1º Bimestre');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [schoolInfo] = useState(getSchoolInfo());

  // Filtering state for the list
  const [filterClass, setFilterClass] = useState('');
  const [filterStudent, setFilterStudent] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterBimester, setFilterBimester] = useState('');
  const [listSearch, setListSearch] = useState('');
  const [showListSuggestions, setShowListSuggestions] = useState(false);

  // Initialize subject if user is a professor
  useEffect(() => {
    if (!isAdmin && userProfile?.assigned_subjects?.length > 0 && !selectedSubject) {
      setSelectedSubject(userProfile.assigned_subjects[0]);
    }
  }, [isAdmin, userProfile, selectedSubject]);

  const [studentSearch, setStudentSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const studentSuggestions = useMemo(() => {
    if (studentSearch.length < 2) return [];
    const search = studentSearch.toLowerCase();
    const list: { name: string, year: string }[] = [];
    
    Object.entries(schoolInfo.studentsDB).forEach(([year, students]: [string, any]) => {
      students.forEach((s: any) => {
        if (s.name.toLowerCase().includes(search)) {
          list.push({ name: s.name, year });
        }
      });
    });
    return list.slice(0, 10);
  }, [studentSearch, schoolInfo.studentsDB]);

  const studentsInClass = useMemo(() => {
    if (!selectedClass) return [];
    // Extract year like "6º" from "6º A"
    const yearMatch = selectedClass.match(/^(\d+º)/);
    if (!yearMatch) return [];
    const yearKey = `${yearMatch[1]} ano`;
    return (schoolInfo.studentsDB[yearKey] || []).filter((s: any) => s.classId === selectedClass);
  }, [selectedClass, schoolInfo]);

  const handleSave = async () => {
    if (!selectedStudent || !content || !selectedSubject || !selectedClass) {
      alert("Preencha todos os campos: turma, aluno, disciplina e conteúdo.");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase.from('student_reports').update({
          report_text: content,
          class_name: selectedClass,
          subject: selectedSubject,
          bimester: selectedBimester
          // Removed created_at update
        }).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('student_reports').insert({
          student_name: selectedStudent,
          class_name: selectedClass,
          subject: selectedSubject,
          report_text: content,
          bimester: selectedBimester,
          professor_id: user.id
        });
        if (error) throw error;
      }
      alert("Relatório salvo com sucesso!");
      setContent('');
      setSelectedStudent('');
      setStudentSearch('');
      setEditingId(null);
      refresh();
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (report: StudentReport) => {
    setEditingId(report.id);
    setSelectedClass(report.studentClass);
    setSelectedStudent(report.studentName);
    setStudentSearch('');
    setSelectedSubject(report.subject);
    setSelectedBimester(report.bimester);
    setContent(report.content);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este relatório?")) return;
    try {
      const { error } = await supabase.from('student_reports').delete().eq('id', id);
      if (error) throw error;
      refresh();
    } catch (err: any) {
      alert("Erro ao excluir: " + err.message);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');

  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const matchesTextSearch = !searchQuery || 
                               r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                               r.studentClass.toLowerCase().includes(searchQuery.toLowerCase()) ||
                               r.subject.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesClass = !filterClass || r.studentClass === filterClass;
      const matchesStudent = !filterStudent || r.studentName.toLowerCase().includes(filterStudent.toLowerCase());
      const matchesSubject = !filterSubject || r.subject === filterSubject;
      const matchesBimester = !filterBimester || r.bimester === filterBimester;

      return matchesTextSearch && matchesClass && matchesStudent && matchesSubject && matchesBimester;
    });
  }, [reports, searchQuery, filterClass, filterStudent, filterSubject, filterBimester]);

  const listStudentSuggestions = useMemo(() => {
    // Get unique student names from the reports themselves
    let students = Array.from(new Set(reports.map(r => r.studentName)));
    
    // Sort alphabetically
    students.sort((a, b) => a.localeCompare(b));

    // If there's a search term, filter by it
    if (listSearch) {
      const search = listSearch.toLowerCase();
      return students.filter(name => name.toLowerCase().includes(search));
    }
    
    // If a class is selected, prioritize students from that class
    if (filterClass) {
      const classStudents = Array.from(new Set(
        reports.filter(r => r.studentClass === filterClass).map(r => r.studentName)
      ));
      classStudents.sort((a, b) => a.localeCompare(b));
      return classStudents.length > 0 ? classStudents : students;
    }

    return students;
  }, [listSearch, reports, filterClass]);

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-primary">Relatórios Individuais do Aluno</h2>
        <div className="flex items-center gap-3">
          {isAdmin && filteredReports.length > 0 && searchQuery.length > 2 && (
            <button 
              onClick={() => onPrintAll(filteredReports)} 
              className="bg-accent text-white px-4 py-2 rounded-md font-bold text-sm flex items-center gap-2 hover:bg-accent/90 shadow-sm transition-all"
            >
              <Printer className="w-4 h-4" />
              Imprimir Consolidado ({filteredReports.length})
            </button>
          )}
          {isAdmin && searchQuery === '' && (
            <button 
              onClick={() => onPrintAll(reports)} 
              className="bg-slate-800 text-white px-4 py-2 rounded-md font-bold text-sm flex items-center gap-2 hover:bg-slate-900 shadow-sm transition-all"
            >
              <Printer className="w-4 h-4" />
              Imprimir Tudo ({reports.length})
            </button>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-border shadow-sm space-y-6">
        <h3 className="text-sm font-bold text-primary uppercase tracking-wider">{editingId ? 'Editar Relatório' : 'Novo Relatório'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Turma / Sala</label>
            <select 
              value={selectedClass} 
              onChange={e => { setSelectedClass(e.target.value); setSelectedStudent(''); }}
              className="w-full px-4 py-2 border border-border rounded-md text-sm outline-none focus:border-accent bg-white"
            >
              <option value="">Selecione a turma...</option>
              {schoolInfo.classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-2 relative">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Aluno</label>
            <div className="relative group">
              <input
                type="text"
                placeholder={selectedClass ? "Selecione ou digite..." : "Busque por nome ou escolha turma..."}
                value={studentSearch || selectedStudent}
                onChange={e => {
                  setStudentSearch(e.target.value);
                  setSelectedStudent(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  // Small delay to allow click on button before closing
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                className="w-full px-4 py-2 border border-border rounded-md text-sm outline-none focus:border-accent bg-white pr-8 transition-all"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 pointer-events-none" />
            </div>

            {showSuggestions && (
              <div className="absolute z-[110] left-0 right-0 top-full mt-1 bg-white border border-border rounded-md shadow-xl max-h-[300px] overflow-y-auto animate-in fade-in zoom-in-95 duration-200 ring-1 ring-black/5">
                {/* Global Search Suggestions */}
                {studentSuggestions.length > 0 && (
                  <div className="p-1 border-b border-slate-50">
                    <div className="px-3 py-1.5 text-[9px] font-black text-accent uppercase tracking-widest bg-accent/5 rounded mb-1">Sugestões de Busca</div>
                    {studentSuggestions.map((s, i) => (
                      <button
                        key={`sug-${i}`}
                        type="button"
                        onMouseDown={() => {
                          setSelectedStudent(s.name);
                          setStudentSearch('');
                          setShowSuggestions(false);
                          if (!selectedClass) {
                            const yearPref = s.year.split(' ')[0];
                            const firstClass = schoolInfo.classes.find(c => c.startsWith(yearPref));
                            if (firstClass) setSelectedClass(firstClass);
                          }
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors flex justify-between items-center group rounded-sm"
                      >
                        <span className="font-bold text-slate-700 group-hover:text-accent">{s.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded">{s.year}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Class-specific list */}
                {selectedClass && studentsInClass.length > 0 && (
                  <div className="p-1">
                    <div className="px-3 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 rounded mb-1">Alunos da {selectedClass}</div>
                    {studentsInClass
                      .filter((s: any) => !studentSearch || s.name.toLowerCase().includes(studentSearch.toLowerCase()))
                      .map((s: any, i: number) => (
                        <button
                          key={`class-${i}`}
                          type="button"
                          onMouseDown={() => {
                            setSelectedStudent(s.name);
                            setStudentSearch('');
                            setShowSuggestions(false);
                          }}
                          className={cn(
                            "w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors flex justify-between items-center group rounded-sm mb-px",
                            selectedStudent === s.name ? "bg-accent/5 border-l-2 border-accent" : ""
                          )}
                        >
                          <span className={cn("font-medium text-slate-600 group-hover:text-slate-900", selectedStudent === s.name && "font-bold text-accent")}>{s.name}</span>
                          {selectedStudent === s.name && <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />}
                        </button>
                      ))}
                  </div>
                )}

                {studentSuggestions.length === 0 && (!selectedClass || studentsInClass.length === 0) && studentSearch.length > 0 && (
                  <div className="p-4 text-center text-slate-400 text-xs italic">Nenhum aluno encontrado...</div>
                )}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Disciplina</label>
            <select 
              value={selectedSubject} 
              onChange={e => setSelectedSubject(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-md text-sm outline-none focus:border-accent bg-white"
            >
              <option value="">Selecione...</option>
              {isAdmin ? (
                schoolInfo.subjects.map(s => <option key={s} value={s}>{s}</option>)
              ) : (
                <>
                  {/* Coordenadores usually have Admin=true, but if not, we allow them to see it if they have it assigned */}
                  {userProfile?.assigned_subjects?.map((s: string) => <option key={s} value={s}>{s}</option>)}
                  {!userProfile?.assigned_subjects?.includes('Coordenação') && <option value="Coordenação">Coordenação</option>}
                </>
              )}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Bimestre</label>
            <select 
              value={selectedBimester} 
              onChange={e => setSelectedBimester(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-md text-sm outline-none focus:border-accent bg-white"
            >
              <option value="1º Bimestre">1º Bimestre</option>
              <option value="2º Bimestre">2º Bimestre</option>
              <option value="3º Bimestre">3º Bimestre</option>
              <option value="4º Bimestre">4º Bimestre</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Conteúdo do Relatório (Observações, Desempenho, Comportamento)</label>
          <DefaultEditor 
            value={content} 
            onChange={e => setContent(e.target.value)}
            className="w-full border border-border rounded-md min-h-[200px]"
          />
        </div>

        <div className="flex justify-end gap-3">
          {editingId && (
            <button 
              onClick={() => { setEditingId(null); setContent(''); setSelectedStudent(''); }}
              className="px-6 py-2 rounded-md font-bold text-sm text-slate-500 hover:bg-slate-50"
            >
              Cancelar Edição
            </button>
          )}
          <button 
            onClick={handleSave}
            disabled={saving}
            className="bg-primary text-white px-8 py-2 rounded-md font-bold text-sm shadow-sm hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Download className="w-4 h-4" />}
            {editingId ? 'Salvar Alterações' : 'Salvar Relatório'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-border overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-border bg-slate-50 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-base font-bold text-primary">Relatórios Enviados</h3>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Busca rápida geral..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-md text-sm outline-none focus:border-accent bg-white shadow-inner"
              />
            </div>
          </div>

          {/* Advanced Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Filtrar Turma</label>
              <select 
                value={filterClass} 
                onChange={e => setFilterClass(e.target.value)}
                className="w-full px-3 py-1.5 border border-border rounded-md text-[13px] outline-none bg-white font-medium"
              >
                <option value="">Todas as turmas</option>
                {schoolInfo.classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1 relative">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Filtrar Aluno</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder={filterClass ? "Escolha o aluno..." : "Todos os alunos"}
                  value={listSearch || filterStudent}
                  onChange={e => {
                    setListSearch(e.target.value);
                    setFilterStudent(e.target.value);
                    setShowListSuggestions(true);
                  }}
                  onFocus={() => setShowListSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowListSuggestions(false), 200)}
                  className="w-full px-3 py-1.5 border border-border rounded-md text-[13px] outline-none bg-white pr-7 font-medium cursor-pointer"
                />
                <button 
                  type="button"
                  onClick={() => setShowListSuggestions(!showListSuggestions)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
              {showListSuggestions && listStudentSuggestions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-border rounded-md shadow-lg py-1 max-h-56 overflow-y-auto animate-in fade-in slide-in-from-top-1">
                  <button
                    onMouseDown={() => {
                      setFilterStudent('');
                      setListSearch('');
                      setShowListSuggestions(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-bold text-slate-400 hover:bg-slate-50 uppercase tracking-widest border-b border-slate-50"
                  >
                    Limpar Filtro
                  </button>
                  {listStudentSuggestions.map((name, i) => (
                    <button
                      key={i}
                      onMouseDown={() => {
                        setFilterStudent(name);
                        setListSearch('');
                        setShowListSuggestions(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 text-[12px] hover:bg-slate-50 font-bold transition-colors",
                        filterStudent === name ? "text-accent bg-accent/5" : "text-slate-700"
                      )}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Filtrar Disciplina</label>
              <select 
                value={filterSubject} 
                onChange={e => setFilterSubject(e.target.value)}
                className="w-full px-3 py-1.5 border border-border rounded-md text-[13px] outline-none bg-white font-medium"
              >
                <option value="">Todas disciplinas</option>
                {schoolInfo.subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Filtrar Bimestre</label>
              <select 
                value={filterBimester} 
                onChange={e => setFilterBimester(e.target.value)}
                className="w-full px-3 py-1.5 border border-border rounded-md text-[13px] outline-none bg-white font-medium"
              >
                <option value="">Todos bimesters</option>
                {['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'].map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-5 py-3 border-b text-slate-500 uppercase font-black text-[10px] tracking-wider">Aluno</th>
                <th className="px-5 py-3 border-b text-slate-500 uppercase font-black text-[10px] tracking-wider">Turma</th>
                {isAdmin && <th className="px-5 py-3 border-b text-slate-500 uppercase font-black text-[10px] tracking-wider font-mono">Professor</th>}
                <th className="px-5 py-3 border-b text-slate-500 uppercase font-black text-[10px] tracking-wider border-l border-slate-100">Disciplina</th>
                <th className="px-5 py-3 border-b text-slate-500 uppercase font-black text-[10px] tracking-wider">Bimestre</th>
                <th className="px-5 py-3 border-b text-slate-500 uppercase font-black text-[10px] tracking-wider font-mono">Data</th>
                <th className="px-5 py-3 border-b text-slate-500 uppercase font-black text-[10px] tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReports.map(r => (
                <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4 font-bold text-slate-700">{r.studentName}</td>
                  <td className="px-5 py-4 text-slate-600 font-mono text-xs">{r.studentClass}</td>
                  {isAdmin && <td className="px-5 py-4 text-slate-500 text-[11px] font-medium leading-tight max-w-[120px]">{r.professorName}</td>}
                  <td className="px-5 py-4 text-slate-600 font-bold border-l border-slate-100">{r.subject}</td>
                  <td className="px-5 py-4">
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-black uppercase whitespace-nowrap">{r.bimester}</span>
                  </td>
                  <td className="px-5 py-4 text-slate-500 font-mono text-xs">{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <button onClick={() => onPrint(r)} className="text-accent font-bold hover:underline flex items-center gap-1 whitespace-nowrap">
                      <Printer className="w-4 h-4" />
                      Imprimir
                    </button>
                    <button onClick={() => handleEdit(r)} className="text-blue-600 font-bold hover:underline flex items-center gap-1 whitespace-nowrap">
                      <Pencil className="w-4 h-4" />
                      Editar
                    </button>
                    <button onClick={() => handleDelete(r.id)} className="text-red-400 font-bold hover:underline flex items-center gap-1 whitespace-nowrap">
                      <Trash2 className="w-4 h-4" />
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
              {reports.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400 italic">Nenhum relatório encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StudentReportPrintView({ reports, onBack }: { reports: StudentReport[], onBack: () => void }) {
  const schoolInfo = getSchoolInfo();

  useEffect(() => {
    // Hidden browser title trick for clean prints
    const originalTitle = document.title;
    document.title = 'Relatorios-Alunos-CPS';
    return () => { document.title = originalTitle; };
  }, []);

  return (
    <div className="space-y-12 print-container">
      <div className="flex items-center justify-between print:hidden no-print p-8 border-b border-border bg-white sticky top-0 z-20">
        <button onClick={onBack} className="text-slate-500 font-bold hover:text-primary flex items-center gap-2">
          ← Voltar ao Sistema
        </button>
        <button 
          onClick={() => window.print()}
          className="bg-accent text-white px-6 py-2 rounded-md font-bold text-sm flex items-center gap-2 hover:bg-accent/90 shadow-sm"
        >
          <Printer className="w-4 h-4" />
          Imprimir Agora
        </button>
      </div>

      <div className="print-content space-y-12 bg-slate-100 py-10 print:p-0 print:bg-white print:space-y-0">
        {reports.map((report, idx) => {
          // Lookup full student name
          let fullStudentName = report.studentName;
          const classYearMatch = report.studentClass.match(/^(\d+)º/);
          if (classYearMatch) {
            const yearKey = `${classYearMatch[1]}º ano`;
            const yearStudents = schoolInfo.studentsDB[yearKey] || [];
            // Try exact or prefix match
            const studentMatch = yearStudents.find(s => s.name.toUpperCase().startsWith(report.studentName.toUpperCase()));
            if (studentMatch) {
              fullStudentName = studentMatch.name;
            }
          }

          return (
            <div 
              key={report.id} 
              className={cn(
                "bg-white p-16 border border-border max-w-[210mm] mx-auto shadow-sm print:border-none print:shadow-none print:m-0 print:w-[210mm] flex flex-col print-avoid-break print:min-h-[297mm]",
                idx === reports.length - 1 ? "" : "print:break-after-page"
              )}
            >
            {/* Header */}
            <div className="border-b-2 border-primary pb-8 mb-10 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <img src={LOGO_VINHO} alt="Logo" className="w-16 h-16 object-contain" />
                <div className="flex flex-col">
                  <h1 className="text-2xl font-black text-primary uppercase tracking-tight">Colégio Progresso Santista</h1>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-[3px] mt-1 border-t border-slate-100 pt-1">Educação por Excelência • Sistema COC</p>
                </div>
              </div>
              <div className="text-right">
                <span className="bg-primary text-white px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest">{report.bimester}</span>
              </div>
            </div>

            <div className="text-center mb-12">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest border-b-2 border-slate-100 inline-block pb-1">Relatório de Acompanhamento Escolar</h2>
            </div>

            {/* Student Info Box */}
            <div className="grid grid-cols-2 gap-px bg-slate-200 border-2 border-slate-200 rounded-lg overflow-hidden mb-12 shadow-sm">
              <div className="bg-white p-4">
                <label className="block text-[10px] font-black text-primary uppercase mb-1">Nome do Aluno:</label>
                <div className="font-bold text-slate-800 text-lg uppercase truncate">{fullStudentName}</div>
              </div>
              <div className="bg-white p-4">
                <label className="block text-[10px] font-black text-primary uppercase mb-1">Turma:</label>
                <div className="font-black text-primary text-xl uppercase tracking-widest">{report.studentClass}</div>
              </div>
              <div className="bg-white p-4">
                <label className="block text-[10px] font-black text-primary uppercase mb-1">Disciplina:</label>
                <div className="font-bold text-slate-800 text-sm">{report.subject}</div>
              </div>
              <div className="bg-white p-4">
                <label className="block text-[10px] font-black text-primary uppercase mb-1">Data da Emissão:</label>
                <div className="text-sm font-bold text-slate-700">{new Date(report.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 space-y-6">
              <h3 className="text-xs font-black text-primary uppercase border-l-4 border-primary pl-3 mb-4 tracking-wider">Desenvolvimento e Observações Pedagógicas:</h3>
              <div 
                className="text-base text-slate-800 leading-[1.8] text-justify font-medium q-text-html-container border border-slate-100 p-8 rounded-xl bg-slate-50/50"
                dangerouslySetInnerHTML={{ __html: report.content }}
              />
            </div>

            {/* Footer Signatures */}
            <div className="mt-20 pt-16 grid grid-cols-3 gap-10">
              <div className="border-t-2 border-slate-300 pt-4 text-center">
                <div className="text-sm font-bold text-slate-800 uppercase mb-1">{report.professorName}</div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Professor(a) Responsável</div>
              </div>
              <div className="border-t-2 border-slate-300 pt-4 text-center">
                <div className="text-sm font-bold text-slate-300 uppercase mb-1 invisible">Responsável</div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsável</div>
              </div>
              <div className="border-t-2 border-slate-300 pt-4 text-center">
                <div className="text-sm font-bold text-slate-300 uppercase mb-1 invisible">Coordenação</div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Coordenação Pedagógica</div>
              </div>
            </div>

            <div className="mt-auto pt-10 text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[4px]">Colégio Progresso Santista</p>
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}

// --- DIGITAL DIARY VIEW (PROESC STYLE) ---
function DigitalDiaryView({ user, isAdmin, userProfile }: { user: User, isAdmin: boolean, userProfile: any }) {
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedBimester, setSelectedBimester] = useState('1º Bimestre');
  
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newContent, setNewContent] = useState('');
  const [newCount, setNewCount] = useState(2);
  const [isHoliday, setIsHoliday] = useState(false);

  // Generator State
  const [showCronogramaGenerator, setShowCronogramaGenerator] = useState(false);
  const [generatorStartDate, setGeneratorStartDate] = useState('');
  const [generatorEndDate, setGeneratorEndDate] = useState('');
  const [generatorDays, setGeneratorDays] = useState<Record<number, number>>({
    0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0
  });
  
  const [viewingAttendance, setViewingAttendance] = useState<Lesson | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [launchingGradesFor, setLaunchingGradesFor] = useState<Exam | null>(null);
  const [gradeInputs, setGradeInputs] = useState<{[key: string]: number}>({});
  const [savingGrades, setSavingGrades] = useState(false);
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [bulkGrades, setBulkGrades] = useState<Record<string, number>>({});
  const [savingBulk, setSavingBulk] = useState(false);
  const [showOnlyBelowAverage, setShowOnlyBelowAverage] = useState(false);
  const [showOnlyBelowAvgMain, setShowOnlyBelowAvgMain] = useState(false);

  const calculateStudentBaseAvg = (studentName: string) => {
    const studentResults = results.filter(r => r.studentName === studentName);
    const regularResults = studentResults.filter(r => {
      const ex = exams.find(e => e.id === r.examId);
      return ex && ex.examType !== 'Recuperação Bimestral' && ex.examType !== 'Recuperação Final';
    });
    return regularResults.length > 0 
      ? regularResults.reduce((acc, r) => acc + (Number(r.score) / r.maxScore * 10), 0) / regularResults.length
      : 0;
  };

  const isAuthorized = (cls: string = selectedClass, sub: string = selectedSubject) => {
    if (isAdmin) return true;
    const assignedSubjects = userProfile?.assigned_subjects || [];
    const assignedClasses = userProfile?.assigned_classes || [];
    return assignedSubjects.includes(sub) && assignedClasses.includes(cls);
  };

  const schoolInfo = getSchoolInfo();
  // Filter subjects based on defined class_subjects. If none defined for this class, show all.
  const subjects = useMemo(() => {
    if (!selectedClass) return schoolInfo.subjects;
    const defined = schoolInfo.class_subjects[selectedClass];
    return (defined && defined.length > 0) ? defined : schoolInfo.subjects;
  }, [schoolInfo, selectedClass]);

  const classes = schoolInfo.classes;
  const bimesters = [
    '1º Bimestre', 
    '2º Bimestre', 
    '3º Bimestre', 
    '4º Bimestre', 
    'Conselho de Classe', 
    'Prova Final', 
    'Recuperação'
  ];

  const [newExamTitle, setNewExamTitle] = useState('');
  const [newExamDate, setNewExamDate] = useState(new Date().toISOString().split('T')[0]);
  const [newExamType, setNewExamType] = useState('PI');
  const [showAddExam, setShowAddExam] = useState(false);
  const [savingExam, setSavingExam] = useState(false);

  // -- Duplicate Exam --
  const handleDuplicateExam = async (exam: Exam) => {
    if (!isAuthorized()) {
      alert("Acesso Negado: Você não tem autorização para criar avaliações nesta turma.");
      return;
    }
    if (!window.confirm("Deseja duplicar esta prova?")) return;
    try {
      const { error } = await supabase.from('exams').insert({
        professor_id: user.id,
        title: `${exam.title} (Cópia)`,
        subject: exam.subject,
        exam_type: exam.examType,
        exam_date: new Date().toISOString().split('T')[0],
        class_year: exam.classYear,
        bimester: exam.bimester,
        questions: exam.questions || [],
        answer_key: exam.answerKey || { _metadata: { isExternal: true, bimester: exam.bimester, examType: exam.examType } }
      });
      if (error) throw error;
      fetchData();
      alert("Avaliação duplicada com sucesso!");
    } catch (err: any) {
      alert("Erro ao duplicar: " + err.message);
    }
  };

  useEffect(() => {
    if (selectedClass && selectedSubject && selectedBimester) {
      fetchData();
    }
  }, [selectedClass, selectedSubject, selectedBimester]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Lessons
      const { data: lessonData } = await supabase
        .from('lessons')
        .select('*')
        .eq('class_id', selectedClass)
        .eq('subject', selectedSubject)
        .eq('bimester', selectedBimester)
        .order('date', { ascending: false });
      
      setLessons(lessonData || []);

      // Fetch Exams for this class/subject
      const { data: examData } = await supabase
        .from('exams')
        .select('*')
        .eq('class_year', selectedClass)
        .eq('subject', selectedSubject)
        .eq('bimester', selectedBimester);
      
      setExams((examData || []).map(exam => {
        const meta = exam.answer_key?._metadata || {};
        return {
          ...exam,
          answerKey: exam.answer_key,
          studyGuide: exam.study_guide,
          professorId: exam.professor_id,
          examType: exam.exam_type || meta.examType,
          examDate: exam.exam_date || meta.examDate,
          examTime: exam.exam_time || meta.examTime,
          classYear: exam.class_year || meta.classYear,
          fontSize: meta.fontSize,
          fontFamily: meta.fontFamily,
          content: exam.content,
          createdAt: exam.created_at
        };
      }));

      // Fetch Results
      const { data: resultData } = await supabase
        .from('results')
        .select('*')
        .eq('student_class', selectedClass);
      
      setResults((resultData || []).map(r => ({
        ...r,
        examId: r.exam_id,
        professorId: r.professor_id,
        studentName: r.student_name,
        studentClass: r.student_class,
        score: r.points,
        maxScore: r.total_points,
        correctedAt: r.corrected_at
      })));

      // Filter Students
      const allStudentsFiltered = Object.values(schoolInfo.studentsDB).flat();
      const classStudents = allStudentsFiltered.filter((s: any) => s.classId === selectedClass);
      setStudents(classStudents);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLesson = async () => {
    if (!newContent) return;
    
    if (!isAuthorized()) {
      alert("Acesso Negado: Você não tem autorização para lecionar nesta turma e disciplina.");
      return;
    }

    try {
      if (editingLesson) {
         const { error } = await supabase.from('lessons').update({
           date: newDate,
           content: isHoliday ? "FERIADO NACIONAL / RECESSO" : newContent,
           lesson_count: isHoliday ? 0 : newCount
         }).eq('id', editingLesson.id);
         if (error) throw error;
      } else {
         const { error } = await supabase.from('lessons').insert({
           professor_id: user.id,
           class_id: selectedClass,
           subject: selectedSubject,
           bimester: selectedBimester,
           date: newDate,
           content: isHoliday ? "FERIADO NACIONAL / RECESSO" : newContent,
           lesson_count: isHoliday ? 0 : newCount
         });
         if (error) throw error;
      }
      setShowAddLesson(false);
      setEditingLesson(null);
      setNewContent('');
      setIsHoliday(false);
      fetchData();
    } catch (err: any) {
      alert("Erro ao salvar aula: " + err.message);
    }
  };

  const handleGenerateCronograma = async () => {
    if (!generatorStartDate || !generatorEndDate) return;
    
    if (!isAuthorized()) {
      alert("Acesso Negado: Somente o professor responsável por esta turma e disciplina pode gerar cronogramas.");
      return;
    }

    const start = new Date(generatorStartDate + 'T00:00:00');
    const end = new Date(generatorEndDate + 'T00:00:00');
    
    if (start > end) {
      alert("A data de início deve ser menor que a data final.");
      return;
    }

    const lessonsToInsert = [];
    
    let currentDate = new Date(start);
    while (currentDate <= end) {
      // 0 is Sunday, 1 is Monday ... 6 is Saturday
      const dayOfWeek = currentDate.getDay(); 
      const lessonCount = generatorDays[dayOfWeek] || 0;
      
      if (lessonCount > 0) {
        lessonsToInsert.push({
          professor_id: user.id,
          class_id: selectedClass,
          subject: selectedSubject,
          bimester: selectedBimester,
          date: currentDate.toISOString().split('T')[0],
          content: 'Conteúdo a definir (Editar para alterar)',
          lesson_count: lessonCount
        });
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    if(lessonsToInsert.length === 0) {
       alert("Nenhuma aula gerada para os dias selecionados no período.");
       return;
    }
    
    try {
      const { error } = await supabase.from('lessons').insert(lessonsToInsert);
      if (error) throw error;
      
      setShowCronogramaGenerator(false);
      fetchData();
      alert(`Foram geradas ${lessonsToInsert.length} aulas no cronograma!`);
    } catch (err: any) {
      alert("Erro ao gerar cronograma: " + err.message);
    }
  };

  const openAttendance = async (lesson: Lesson) => {
    setViewingAttendance(lesson);
    setLoading(true);
    try {
      const { data: existing, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('lesson_id', lesson.id);
      
      if (error) throw error;

      if (!existing || existing.length === 0) {
        setAttendanceRecords(students.map((s: any) => ({
          id: '',
          lesson_id: lesson.id,
          student_name: s.name,
          status: 'present' as const
        })));
      } else {
        setAttendanceRecords(existing);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleAttendance = (index: number) => {
    const newRecords = [...attendanceRecords];
    newRecords[index].status = newRecords[index].status === 'present' ? 'absent' : 'present';
    setAttendanceRecords(newRecords);
  };

  const saveAttendance = async () => {
    if (!viewingAttendance) return;
    setSavingAttendance(true);
    try {
      await supabase.from('attendance').delete().eq('lesson_id', viewingAttendance.id);
      const { error } = await supabase.from('attendance').insert(attendanceRecords.map(r => ({
        lesson_id: viewingAttendance.id,
        student_name: r.student_name,
        status: r.status
      })));
      if (error) throw error;
      setViewingAttendance(null);
      alert("Frequência salva com sucesso!");
    } catch (err: any) {
      alert("Erro ao salvar frequência: " + err.message);
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleSaveExam = async () => {
    if (!newExamTitle || !selectedClass || !selectedSubject) return;

    if (!isAuthorized()) {
      alert("Acesso Negado: Você não tem autorização para criar avaliações para esta turma e disciplina.");
      return;
    }

    setSavingExam(true);
    try {
      const { error } = await supabase.from('exams').insert({
        professor_id: user.id,
        title: newExamTitle.toUpperCase(),
        subject: selectedSubject,
        exam_type: newExamType,
        exam_date: newExamDate,
        class_year: selectedClass,
        bimester: selectedBimester,
        questions: [],
        answer_key: { _metadata: { isExternal: true, bimester: selectedBimester, examType: newExamType } }
      });

      if (error) throw error;
      setShowAddExam(false);
      setNewExamTitle('');
      fetchData();
      alert("Avaliação criada com sucesso!");
    } catch (err: any) {
      alert("Erro ao criar avaliação: " + err.message);
    } finally {
      setSavingExam(false);
    }
  };

  const handleSaveBulkGrades = async () => {
    setSavingBulk(true);
    try {
      const updates = [];
      const deletions = [];
      const errorExams = new Set();

      for (const [key, value] of Object.entries(bulkGrades)) {
        const [studentName, examId] = key.split('|');
        const exam = exams.find(e => e.id === examId);
        const existingResult = results.find(r => r.examId === examId && r.studentName === studentName);
        
        if (exam && isAuthorized(exam.classYear, exam.subject)) {
          // If value is empty, mark for deletion
          if (value === null || value === undefined || value === "") {
            if (existingResult?.id) {
              deletions.push(existingResult.id);
            }
            continue;
          }

          updates.push({
            ...(existingResult?.id ? { id: existingResult.id } : {}),
            exam_id: examId,
            student_name: studentName,
            points: Number(value),
            total_points: 10,
            professor_id: user.id,
            student_class: selectedClass,
            corrected_at: new Date().toISOString()
          });
        } else if (exam) {
          errorExams.add(stripHtml(exam.title));
        }
      }

      if (errorExams.size > 0) {
        alert("Atenção: Você não tem permissão para editar notas das seguintes avaliações: " + Array.from(errorExams).join(', '));
        if (updates.length === 0 && deletions.length === 0) {
          setSavingBulk(false);
          return;
        }
      }

      // Handle deletions
      if (deletions.length > 0) {
        await supabase.from('results').delete().in('id', deletions);
      }

      // Upsert results
      for (const payload of updates) {
        const { error } = await supabase
          .from('results')
          .upsert(payload);
          
        if (error) {
          console.error("Erro no upsert bulk:", error);
          throw new Error(`Falha ao salvar nota de ${payload.student_name}: ${error.message}`);
        }
      }

      setIsBulkEditing(false);
      setBulkGrades({});
      fetchData();
      alert("Todas as notas foram salvas com sucesso!");
    } catch (err: any) {
      console.error("Erro fatal ao salvar bulk:", err);
      alert("ERRO CRÍTICO AO SALVAR: " + err.message);
    } finally {
      setSavingBulk(false);
    }
  };

  const handleExportCSV = () => {
    let csv = "Aluno;";
    exams.forEach(exam => {
      csv += `${exam.title};`;
    });
    csv += "Media\n";

    students.forEach(student => {
      let row = `${student.name};`;
      const studentResults = results.filter(r => r.studentName === student.name);
      let total = 0;
      exams.forEach(exam => {
        const res = studentResults.find(r => r.examId === exam.id);
        if (res) {
          const score = (res.score / res.maxScore) * 10;
          row += `${score.toFixed(1).replace('.', ',')};`;
          total += score;
        } else {
          row += "-;";
        }
      });
      const avg = studentResults.length > 0 ? (total / studentResults.length).toFixed(1).replace('.', ',') : "0,0";
      row += `${avg}\n`;
      csv += row;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Notas_${selectedClass}_${selectedSubject}.csv`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const showStudentDetails = (studentName: string) => {
     const studentResults = results.filter(r => r.studentName === studentName);
     alert(`Histórico de ${studentName}\nAvaliações concluídas: ${studentResults.length}`);
  };

  const handleDeleteExamLocal = async (exam: Exam) => {
    if (!window.confirm("Deseja realmente excluir esta avaliação?")) return;
    
    if (!isAuthorized(exam.classYear, exam.subject)) {
      alert("Acesso Negado: Você não tem autorização para gerenciar esta avaliação.");
      return;
    }

    try {
      const { error } = await supabase.from('exams').delete().eq('id', exam.id);
      if (error) throw error;
      fetchData();
    } catch (err: any) {
      alert("Erro ao excluir: " + err.message);
    }
  };

  const startLaunchingGrades = (exam: Exam) => {
    if (!isAuthorized(exam.classYear, exam.subject)) {
      alert("Acesso Negado: Você não tem autorização para lançar notas nesta turma e disciplina.");
      return;
    }
    setLaunchingGradesFor(exam);
    const existingGrades: {[key: string]: number} = {};
    results.filter(r => r.examId === exam.id).forEach(r => {
      existingGrades[r.studentName] = r.score;
    });
    setGradeInputs(existingGrades);
  };

  const handleSaveGrades = async () => {
    if (!launchingGradesFor) return;

    // Apenas o professor autorizado ou admin
    if (!isAuthorized(launchingGradesFor.classYear, launchingGradesFor.subject)) {
      alert("Acesso Negado: Você não tem autorização para lançar notas nesta turma e disciplina.");
      setSavingGrades(false);
      return;
    }

    setSavingGrades(true);
    try {
      const payloads = [];
      const deletions = [];

      for (const student of students) {
        const existingResult = results.find(r => r.examId === launchingGradesFor.id && r.studentName === student.name);
        const inputValue = gradeInputs[student.name];

        if (inputValue === undefined || inputValue === null || inputValue === "") {
          if (existingResult?.id) {
            deletions.push(existingResult.id);
          }
          continue;
        }

        payloads.push({
          ...(existingResult?.id ? { id: existingResult.id } : {}),
          exam_id: launchingGradesFor.id,
          professor_id: user.id,
          student_name: student.name,
          points: Number(inputValue),
          total_points: 10,
          corrected_at: new Date().toISOString(),
          student_class: selectedClass
        });
      }

      if (deletions.length > 0) {
        await supabase.from('results').delete().in('id', deletions);
      }

      // Upsert results
      for (const payload of payloads) {
        const { error } = await supabase
          .from('results')
          .upsert(payload);
          
        if (error) {
          console.error("Erro no upsert:", error);
          throw new Error(`Falha ao salvar nota de ${payload.student_name}: ${error.message}`);
        }
      }
      
      setLaunchingGradesFor(null);
      fetchData();
      alert("Notas salvas com sucesso!");
    } catch (err: any) {
      console.error("Erro completo ao salvar:", err);
      alert("Erro ao salvar notas: " + err.message);
    } finally {
      setSavingGrades(false);
    }
  };

  const displayRegularExams = exams.filter(e => e.examType !== 'Recuperação Bimestral' && e.examType !== 'Recuperação Final');
  const displayRecoveryExams = exams.filter(e => e.examType === 'Recuperação Bimestral' || e.examType === 'Recuperação Final');

  const examSortOrder = ['PI', 'PII', 'PIII', 'PIV', 'PV', 'PVI', 'Trabalho', 'Simulado', 'Atividade'];
  const sortedRegularExams = [...displayRegularExams].sort((a, b) => {
    const idxA = examSortOrder.indexOf(a.examType);
    const idxB = examSortOrder.indexOf(b.examType);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.title.localeCompare(b.title);
  });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-20 text-left bg-white min-h-screen text-slate-800 font-sans">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mt-3 gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tight">Diário & Correção</h1>
          <p className="text-xs md:text-sm text-slate-500 font-medium">Gestão unificada do planejamento, provas e notas.</p>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
          <select 
            value={selectedClass} 
            onChange={e => setSelectedClass(e.target.value)}
            className="w-full md:w-40 bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-sm font-black text-slate-900 outline-none focus:border-accent transition-all shadow-md"
          >
            <option value="">Selecione a Turma</option>
            {(isAdmin ? classes : (userProfile?.assigned_classes || [])).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select 
            value={selectedSubject} 
            onChange={e => setSelectedSubject(e.target.value)}
            className="w-full md:w-64 bg-white border-2 border-slate-300 rounded-xl px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all shadow-md cursor-pointer appearance-none"
          >
            <option value="" className="font-bold text-slate-400">SELECIONE A DISCIPLINA</option>
            {(isAdmin ? subjects : (userProfile?.assigned_subjects || [])).map(s => <option key={s} value={s} className="font-black">{s.toUpperCase()}</option>)}
          </select>
          <select 
            value={selectedBimester} 
            onChange={e => setSelectedBimester(e.target.value)}
            className="w-full md:w-40 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
          >
            {bimesters.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      </div>

      {(!selectedClass || !selectedSubject) ? (
        <div className="flex flex-col items-center justify-center py-32 text-center bg-slate-50 border border-slate-200 border-dashed rounded-2xl">
          <BookOpen className="w-16 h-16 text-slate-300 mb-4" />
          <h2 className="text-xl font-black text-slate-400 uppercase tracking-widest">Nenhuma turma selecionada</h2>
          <p className="text-slate-500 text-sm mt-2 max-w-sm">Utilize os filtros acima para selecionar a turma, disciplina e visualização do diário.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: Cronograma & Frequência (4 cols wide on desktop) */}
          <div className="xl:col-span-4 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0 gap-2">
                <h3 className="font-black text-slate-800 text-sm tracking-widest uppercase">Cronograma & Aulas</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowCronogramaGenerator(true)}
                    className="bg-primary text-white p-2 rounded-lg hover:bg-opacity-90 transition-colors shadow-sm flex items-center gap-1 text-[10px] font-bold uppercase"
                    title="Gerador de Cronograma (Período)"
                  >
                    <Calendar className="w-4 h-4" /> Gerar Período
                  </button>
                  <button 
                    onClick={() => {
                      setEditingLesson(null);
                      setNewDate(new Date().toISOString().split('T')[0]);
                      setNewContent('');
                      setNewCount(2);
                      setIsHoliday(false);
                      setShowAddLesson(true);
                    }}
                    className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-[10px] items-center gap-1 uppercase font-bold"
                    title="Novo Registro de Aula"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-0 overflow-y-auto max-h-[600px]">
                {lessons.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm font-medium">Nenhuma aula gravada neste bimestre.</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {lessons.map(lesson => (
                      <div key={lesson.id} className="p-4 hover:bg-slate-50 transition-colors group">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block mb-2">
                              {new Date(lesson.date).toLocaleDateString('pt-BR')} ({lesson.lesson_count} h/a)
                            </span>
                            <p className="text-sm font-medium text-slate-700 leading-relaxed mb-3">
                              {lesson.content}
                            </p>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => openAttendance(lesson)}
                                className="text-[11px] font-bold text-slate-500 border border-slate-200 py-1.5 px-3 rounded hover:bg-slate-100 transition-colors flex items-center gap-1.5"
                              >
                                <Users className="w-3.5 h-3.5" /> Lançar/Ver Frequência
                              </button>
                              <button 
                                onClick={() => {
                                  setEditingLesson(lesson);
                                  setNewDate(lesson.date);
                                  setNewContent(lesson.content);
                                  setNewCount(lesson.lesson_count);
                                  setIsHoliday(lesson.lesson_count === 0 || lesson.content.includes("FERIADO"));
                                  setShowAddLesson(true);
                                }}
                                className="text-[11px] font-bold text-slate-500 border border-slate-200 py-1.5 px-3 rounded hover:bg-slate-100 transition-colors flex items-center gap-1.5"
                              >
                                Edit / Feriado
                              </button>
                            </div>
                          </div>
                          <button 
                            onClick={async () => {
                              if (!isAuthorized()) {
                                alert("Acesso Negado: Você não tem autorização para excluir aulas nesta turma.");
                                return;
                              }
                              if(window.confirm("Deseja deletar esta aula?")) {
                                await supabase.from('lessons').delete().eq('id', lesson.id);
                                fetchData();
                              }
                            }}
                            className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Quick Summary Block */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-100 rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col justify-center">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Aulas dadas</span>
                <span className="text-2xl font-black text-slate-800">{lessons.length}</span>
              </div>
              <div className="bg-slate-100 rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col justify-center">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Média Geral</span>
                <span className="text-2xl font-black text-slate-800">
                  {results.length > 0 ? (results.reduce((acc, r) => acc + (r.score/r.maxScore*10), 0) / results.length).toFixed(1).replace('.', ',') : '0,0'}
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Avaliações, Correção e Gabaritos (8 cols wide on desktop) */}
          <div className="xl:col-span-8 space-y-6">
            
            <div className="bg-white border text-left border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 bg-[#3b5998] text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 opacity-80" />
                  <h3 className="font-black text-white text-sm tracking-widest uppercase">Criação & Lançamento de Provas</h3>
                </div>
              </div>
              
              {/* Form Inline Avaliações */}
              <div className="p-6 bg-slate-50 border-b-2 border-slate-200">
                <div className="flex flex-col md:flex-row items-end gap-4">
                  <div className="w-full md:flex-1 space-y-2">
                    <label className="text-[11px] font-black text-slate-800 uppercase tracking-widest">TÍTULO DA AVALIAÇÃO</label>
                    <input 
                      type="text" 
                      value={newExamTitle}
                      onChange={e => setNewExamTitle(e.target.value)}
                      placeholder="EX: PROVA MENSAL"
                      className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-accent transition-all shadow-sm placeholder:text-slate-300"
                    />
                  </div>
                  <div className="w-full md:w-44 space-y-2">
                    <label className="text-[11px] font-black text-slate-800 uppercase tracking-widest">DATA PREVISTA</label>
                    <input 
                      type="date" 
                      value={newExamDate} 
                      onChange={e => setNewExamDate(e.target.value)}
                      className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-accent transition-all shadow-sm"
                    />
                  </div>
                  <div className="w-full md:w-56 space-y-2">
                    <label className="text-[11px] font-black text-slate-800 uppercase tracking-widest">TIPO PADRÃO</label>
                    <select 
                      value={newExamType}
                      onChange={e => setNewExamType(e.target.value)}
                      className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-accent transition-all shadow-sm cursor-pointer"
                    >
                      {EXAM_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat} (10.0)</option>
                      ))}
                    </select>
                  </div>
                  <button 
                    onClick={handleSaveExam}
                    disabled={savingExam || !newExamTitle}
                    className="w-full md:w-auto bg-slate-900 text-white px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-accent transition-all active:scale-95 disabled:opacity-50"
                  >
                    {savingExam ? 'SALVANDO...' : 'ADICIONAR PROVA'}
                  </button>
                </div>
              </div>

              {/* Listagem Avaliações criadas neste bimestre agrupadas por categoria */}
              <div className="p-0 overflow-y-auto max-h-[400px]">
                {exams.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm">Ainda não há avaliações criadas para este bimestre.</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {Array.from(new Set(exams.map(e => e.examType))).sort().map(cat => (
                      <div key={cat} className="bg-slate-50/30">
                        <div className="px-4 py-2 border-y border-slate-100 bg-slate-50">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cat || 'Sem Categoria'}</span>
                        </div>
                        {exams.filter(e => e.examType === cat).map(exam => (
                          <div key={exam.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white transition-colors">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] text-slate-400 font-bold uppercase">{new Date(exam.examDate || new Date().toISOString()).toLocaleDateString('pt-BR')}</span>
                              </div>
                              <h4 className="font-bold text-sm text-slate-800 uppercase">{stripHtml(exam.title)}</h4>
                            </div>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => handleDuplicateExam(exam)}
                                className="bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase hover:bg-slate-50 shadow-sm flex items-center gap-1"
                              >
                                <Copy className="w-3.5 h-3.5" /> Duplicar
                              </button>
                              <button 
                                onClick={() => startLaunchingGrades(exam)}
                                className="bg-green-600 text-white px-3 py-1.5 rounded-md text-[10px] font-black uppercase hover:bg-green-700 shadow-sm flex items-center gap-1"
                              >
                                <Edit2 className="w-3.5 h-3.5" /> Lançar/Corrigir Notas
                              </button>
                              <button onClick={() => handleDeleteExamLocal(exam)} className="text-slate-300 hover:text-red-500 p-2 transition-colors ml-2">
                                 <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

              {/* Quadro de Notas Consolidado */}
              <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col">
                <div className="p-6 border-b-2 border-slate-100 flex items-center justify-between bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-6 bg-accent rounded-full" />
                    <h3 className="font-black text-slate-900 text-base tracking-tight uppercase">QUADRO CONSOLIDADO (BOLETIM PRÉVIA)</h3>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setShowOnlyBelowAvgMain(!showOnlyBelowAvgMain)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${showOnlyBelowAvgMain ? 'bg-red-600 text-white shadow-lg ring-2 ring-red-100' : 'bg-white text-slate-700 border border-slate-200 hover:border-red-400 hover:text-red-600'}`}
                    >
                      <Filter className="w-3.5 h-3.5" />
                      {showOnlyBelowAvgMain ? 'Vendo Recuperação' : 'Filtro Recuperação'}
                    </button>
                    {isBulkEditing ? (
                      <>
                        <button 
                          onClick={() => setIsBulkEditing(false)}
                          className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-slate-300 transition-all"
                        >
                          Cancelar
                        </button>
                        <button 
                          onClick={handleSaveBulkGrades}
                          disabled={savingBulk}
                          className="bg-accent text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest shadow-md hover:bg-opacity-90 flex items-center gap-2 transition-all disabled:opacity-50"
                        >
                          {savingBulk ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 
                          Salvar Tudo
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => {
                            const initial = {};
                            results.forEach(r => {
                              initial[`${r.studentName}|${r.examId}`] = r.score;
                            });
                            setBulkGrades(initial);
                            setIsBulkEditing(true);
                          }}
                          className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest shadow-md hover:bg-slate-800 flex items-center gap-2 transition-all"
                        >
                          <Edit3 className="w-4 h-4" /> Editar Notas
                        </button>
                        <button 
                          onClick={handleExportCSV}
                          className="bg-primary text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest shadow-md hover:bg-opacity-90 flex items-center gap-2 transition-all"
                        >
                           <Download className="w-4 h-4" /> Exportar Planilha
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-900 border-b-2 border-slate-800">
                        <th className="p-5 text-xs font-black text-white text-left uppercase sticky left-0 bg-slate-900 z-10 w-80 border-r border-white/10 tracking-widest">Aluno</th>
                        {sortedRegularExams.map(exam => (
                           <th key={exam.id} className="p-5 text-xs font-black text-white text-center uppercase min-w-[130px] border-r border-white/10 tracking-widest leading-tight">
                             {stripHtml(exam.title)}
                           </th>
                        ))}
                        <th className="p-5 text-xs font-black text-slate-300 text-center uppercase bg-slate-800 tracking-widest border-r border-white/10">Média</th>
                        {displayRecoveryExams.map(exam => (
                           <th key={exam.id} className="p-5 text-xs font-black text-red-400 text-center uppercase min-w-[130px] border-r border-white/10 tracking-widest leading-tight">
                             {stripHtml(exam.title)}
                           </th>
                        ))}
                        <th className="p-5 text-xs font-black text-accent text-center uppercase bg-slate-800 tracking-widest">Nota Final</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {students
                        .filter(student => !showOnlyBelowAvgMain || calculateStudentBaseAvg(student.name) < 6)
                        .map(student => {
                          const studentResults = results.filter(r => r.studentName === student.name);
                          
                          // Separate Regular Exams from Recovery
                          const regularResults = studentResults.filter(r => {
                            const exam = exams.find(e => e.id === r.examId);
                            return exam && exam.examType !== 'Recuperação Bimestral' && exam.examType !== 'Recuperação Final';
                          });
                          
                          const recoveryResult = studentResults.find(r => {
                            const exam = exams.find(e => e.id === r.examId);
                            return exam && (exam.examType === 'Recuperação Bimestral' || exam.examType === 'Recuperação Final');
                          });

                          // Base Average (Regular Exams)
                          const baseAvg = regularResults.length > 0 
                            ? (regularResults.reduce((acc, r) => acc + (Number(r.score) / r.maxScore * 10), 0) / regularResults.length)
                            : 0;
                          
                          const isEligible = baseAvg < 6;
                          
                          // Final Bimonthly Grade with Recovery formula
                          let finalBimesterGrade = baseAvg;
                          if (recoveryResult && isEligible) {
                            const recoveryScore = (recoveryResult.score / recoveryResult.maxScore * 10);
                            finalBimesterGrade = (baseAvg + recoveryScore) / 2;
                          }

                          const avgDisplay = baseAvg.toFixed(1);
                          const finalDisplay = finalBimesterGrade.toFixed(1);
                          
                          return (
                            <tr key={student.name} className="hover:bg-slate-50 transition-colors group">
                              <td className="p-5 font-black text-slate-900 text-sm uppercase sticky left-0 bg-white border-r-2 border-slate-100 shadow-[3px_0_15px_rgba(0,0,0,0.1)] flex justify-between items-center min-w-[320px]">
                                <span className="truncate pr-4 leading-relaxed tracking-tight">{student.name}</span>
                                {!isBulkEditing && (
                                  <button onClick={() => showStudentDetails(student.name)} className="text-accent hover:scale-125 transition-all opacity-0 group-hover:opacity-100" title="Ver Histórico">
                                    <Search className="w-4 h-4 shadow-sm" />
                                  </button>
                                )}
                              </td>
                              {sortedRegularExams.map(exam => {
                                  const res = studentResults.find(r => r.examId === exam.id);
                                  const normalizedScore = res ? (res.score / res.maxScore * 10) : null;
                                  const key = `${student.name}|${exam.id}`;
                                  
                                  return (
                                    <td key={exam.id} className="p-5 text-center text-sm font-black border-r border-slate-100">
                                      {isBulkEditing ? (
                                        <input 
                                          type="number"
                                          step="0.1"
                                          min="0"
                                          max="10"
                                          value={bulkGrades[key] !== undefined ? bulkGrades[key] : (normalizedScore !== null ? normalizedScore : '')}
                                          onChange={e => setBulkGrades({...bulkGrades, [key]: e.target.value})}
                                          className="w-16 bg-slate-50 border-2 border-slate-200 rounded-lg p-1 text-center font-black focus:border-accent outline-none"
                                        />
                                      ) : (
                                        <span className={normalizedScore !== null ? (normalizedScore >= 6 ? 'text-blue-700' : 'text-red-600') : 'text-slate-300 font-bold'}>
                                          {normalizedScore !== null ? normalizedScore.toFixed(1).replace('.', ',') : '-'}
                                        </span>
                                      )}
                                    </td>
                                  );
                              })}
                              <td className="p-5 text-center text-sm font-black bg-slate-50 border-x border-slate-200">
                                <span className={Number(avgDisplay) >= 6 ? 'text-blue-800' : 'text-red-700'}>
                                  {avgDisplay.replace('.', ',')}
                                </span>
                              </td>
                              {displayRecoveryExams.map(exam => {
                                  const res = studentResults.find(r => r.examId === exam.id);
                                  const normalizedScore = res ? (res.score / res.maxScore * 10) : null;
                                  const key = `${student.name}|${exam.id}`;
                                  
                                  return (
                                    <td key={exam.id} className={`p-5 text-center text-sm font-black border-r border-slate-100 bg-red-50/30 ${!isEligible ? 'opacity-30' : ''}`}>
                                      {isBulkEditing ? (
                                        <input 
                                          type="number"
                                          step="0.1"
                                          min="0"
                                          max="10"
                                          disabled={!isEligible}
                                          value={bulkGrades[key] !== undefined ? bulkGrades[key] : (normalizedScore !== null ? normalizedScore : '')}
                                          onChange={e => setBulkGrades({...bulkGrades, [key]: e.target.value})}
                                          placeholder={!isEligible ? 'N/A' : ''}
                                          className="w-16 bg-white border-2 border-slate-200 rounded-lg p-1 text-center font-black focus:border-accent outline-none disabled:bg-slate-200"
                                        />
                                      ) : (
                                        <span className={normalizedScore !== null ? (normalizedScore >= 6 ? 'text-purple-600' : 'text-red-600') : 'text-slate-300 font-bold'}>
                                          {normalizedScore !== null ? normalizedScore.toFixed(1).replace('.', ',') : (isEligible ? '-' : '—')}
                                        </span>
                                      )}
                                    </td>
                                  );
                              })}
                            <td className="p-5 text-center text-base font-black bg-blue-50/50">
                              <span className={Number(finalDisplay) >= 6 ? 'text-blue-900 underline decoration-2 underline-offset-4' : 'text-red-800 underline decoration-2 underline-offset-4'}>
                                {finalDisplay.replace('.', ',')}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

          </div>
        </div>
      )}


      {/* Modal Novo Lançamento de Notas (Collective Entry) */}
      <AnimatePresence>
        {launchingGradesFor && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[110] p-4 text-left">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl overflow-hidden text-left border-4 border-white">
              <div className="p-8 border-b-2 border-slate-100 bg-[#3b5998] text-white flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-white/20 rounded text-[9px] font-black uppercase tracking-widest text-white">Lançamento de Notas</span>
                    {!isAuthorized(launchingGradesFor.classYear, launchingGradesFor.subject) && (
                      <span className="px-2 py-0.5 bg-red-500 rounded text-[9px] font-black uppercase tracking-widest text-white">Somente Leitura</span>
                    )}
                  </div>
                  <h3 className="font-black text-2xl uppercase tracking-tighter leading-tight drop-shadow-sm">{stripHtml(launchingGradesFor.title)}</h3>
                  <p className="text-xs font-bold text-white/70 uppercase tracking-widest mt-2 flex items-center gap-2">
                    <Users className="w-3.5 h-3.5" /> {selectedClass} <span className="opacity-30">|</span> <BookOpen className="w-3.5 h-3.5" /> {selectedSubject}
                  </p>
                </div>
                <button onClick={() => setLaunchingGradesFor(null)} className="p-3 hover:bg-white/10 rounded-full transition-all active:scale-90"><X className="w-7 h-7" /></button>
              </div>
              <div className="max-h-[500px] overflow-y-auto p-4 space-y-2">
                {(launchingGradesFor.examType === 'Recuperação Bimestral' || launchingGradesFor.examType === 'Recuperação Final') && (
                  <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-2xl border border-yellow-100 mb-4">
                    <input 
                      type="checkbox" 
                      id="belowAvgToggle"
                      checked={showOnlyBelowAverage}
                      onChange={e => setShowOnlyBelowAverage(e.target.checked)}
                      className="w-5 h-5 accent-slate-900 cursor-pointer"
                    />
                    <label htmlFor="belowAvgToggle" className="text-xs font-black text-slate-700 uppercase cursor-pointer">
                      Ver apenas alunos com média abaixo de 6,0
                    </label>
                  </div>
                )}
                <table className="w-full border-collapse">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr>
                      <th className="p-3 text-[10px] font-bold text-slate-500 uppercase text-left">Aluno</th>
                      <th className="p-3 text-[10px] font-bold text-slate-500 uppercase text-center w-40">Média Atual</th>
                      <th className="p-3 text-[10px] font-bold text-slate-500 uppercase text-center w-32">Nota da Recuperação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.filter(student => {
                      if (!showOnlyBelowAverage) return true;
                      
                      const studentResults = results.filter(r => r.studentName === student.name);
                      
                      if (launchingGradesFor.examType === 'Recuperação Bimestral') {
                        const bimesterResults = studentResults.filter(r => 
                          r.bimester === launchingGradesFor.bimester && 
                          r.examId !== launchingGradesFor.id
                        );
                        
                        const regularResults = bimesterResults.filter(r => {
                          const ex = exams.find(e => e.id === r.examId);
                          return ex && ex.examType !== 'Recuperação Bimestral' && ex.examType !== 'Recuperação Final';
                        });

                        const baseAvg = regularResults.length > 0 
                          ? regularResults.reduce((acc, r) => acc + (Number(r.score) / r.maxScore * 10), 0) / regularResults.length
                          : 0;
                        return baseAvg < 6;
                      }

                      if (launchingGradesFor.examType === 'Recuperação Final') {
                        // Media Anual
                        const bimesters = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'];
                        const bimesterAverages = bimesters.map(bim => {
                          const bimResults = studentResults.filter(r => r.bimester === bim);
                          
                          const regular = bimResults.filter(r => {
                            const ex = exams.find(e => e.id === r.examId);
                            return ex && ex.examType !== 'Recuperação Bimestral' && ex.examType !== 'Recuperação Final';
                          });
                          const recovery = bimResults.find(r => {
                            const ex = exams.find(e => e.id === r.examId);
                            return ex && ex.examType === 'Recuperação Bimestral';
                          });

                          const base = regular.length > 0
                            ? regular.reduce((acc, r) => acc + (Number(r.score) / r.maxScore * 10), 0) / regular.length
                            : 0;
                          
                          if (recovery && base < 6) {
                            return (base + (recovery.score / recovery.maxScore * 10)) / 2;
                          }
                          return base;
                        });

                        const yearlyAvg = bimesterAverages.reduce((acc, v) => acc + v, 0) / 4;
                        return yearlyAvg < 6;
                      }

                      return true;
                    }).map((student) => {
                      const studentResults = results.filter(r => r.studentName === student.name);
                      let currentAvg = 0;

                      if (launchingGradesFor.examType === 'Recuperação Bimestral') {
                        const bimesterResults = studentResults.filter(r => 
                          r.bimester === launchingGradesFor.bimester && 
                          r.examId !== launchingGradesFor.id
                        );
                        const regularResults = bimesterResults.filter(r => {
                          const ex = exams.find(e => e.id === r.examId);
                          return ex && ex.examType !== 'Recuperação Bimestral' && ex.examType !== 'Recuperação Final';
                        });
                        currentAvg = regularResults.length > 0 
                          ? regularResults.reduce((acc, r) => acc + (Number(r.score) / r.maxScore * 10), 0) / regularResults.length
                          : 0;
                      } else if (launchingGradesFor.examType === 'Recuperação Final') {
                        const bimesters = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'];
                        const bimesterAverages = bimesters.map(bim => {
                          const bimResults = studentResults.filter(r => r.bimester === bim);
                          const regular = bimResults.filter(r => {
                            const ex = exams.find(e => e.id === r.examId);
                            return ex && ex.examType !== 'Recuperação Bimestral' && ex.examType !== 'Recuperação Final';
                          });
                          const recovery = bimResults.find(r => {
                            const ex = exams.find(e => e.id === r.examId);
                            return ex && ex.examType === 'Recuperação Bimestral';
                          });
                          const base = regular.length > 0 ? regular.reduce((acc, r) => acc + (Number(r.score) / r.maxScore * 10), 0) / regular.length : 0;
                          return (recovery && base < 6) ? (base + (recovery.score / recovery.maxScore * 10)) / 2 : base;
                        });
                        currentAvg = bimesterAverages.reduce((acc, v) => acc + v, 0) / 4;
                      }

                      return (
                        <tr key={student.name} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="p-3 text-xs font-bold text-slate-700 uppercase">{student.name}</td>
                          <td className="p-3 text-center">
                             {(launchingGradesFor.examType === 'Recuperação Bimestral' || launchingGradesFor.examType === 'Recuperação Final') ? (
                               <span className={`text-sm font-black ${currentAvg < 6 ? 'text-red-600' : 'text-blue-600'}`}>
                                 {currentAvg.toFixed(1).replace('.', ',')}
                               </span>
                             ) : '-'}
                          </td>
                          <td className="p-3">
                              <input 
                                type="number" 
                                step="0.1"
                                min="0"
                                max="10"
                                disabled={!isAuthorized(launchingGradesFor.classYear, launchingGradesFor.subject) || ((launchingGradesFor.examType === 'Recuperação Bimestral' || launchingGradesFor.examType === 'Recuperação Final') && currentAvg >= 6)}
                                value={gradeInputs[student.name] !== undefined ? gradeInputs[student.name] : ''}
                                onChange={e => setGradeInputs({...gradeInputs, [student.name]: e.target.value})}
                                placeholder={((launchingGradesFor.examType === 'Recuperação Bimestral' || launchingGradesFor.examType === 'Recuperação Final') && currentAvg >= 6) ? 'N/A' : '0,0'}
                                className="w-full bg-slate-100 border-2 border-transparent focus:border-accent focus:bg-white rounded-xl px-4 py-2 text-center text-lg font-black text-slate-900 outline-none transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-inner"
                              />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="p-8 border-t-2 border-slate-100 bg-white flex gap-4">
                <button 
                  onClick={() => setLaunchingGradesFor(null)}
                  className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-200 transition-all active:scale-95 shadow-sm"
                >
                  Fechar Janela
                </button>
                {isAuthorized(launchingGradesFor.classYear, launchingGradesFor.subject) && (
                  <button 
                    onClick={handleSaveGrades}
                    disabled={savingGrades}
                    className="flex-[2] bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-slate-200 hover:bg-accent hover:shadow-accent/40 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {savingGrades ? (
                      <>
                        <RotateCcw className="w-5 h-5 animate-spin" />
                        Salvando Notas no Banco...
                      </>
                    ) : (
                      <>
                        <CheckSquare className="w-5 h-5" />
                        Salvar Notas Agora
                      </>
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Modal Lançar/Editar Aula */}
      <AnimatePresence>
        {showAddLesson && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 text-left">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden text-left">
              <div className="p-6 border-b border-slate-100 bg-primary text-white flex items-center justify-between">
                <h3 className="font-black text-lg uppercase tracking-tight">{editingLesson ? "Editar Registro de Aula" : "Novo Registro de Aula"}</h3>
                <button onClick={() => setShowAddLesson(false)} className="text-white/60 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
              </div>
              <div className="p-6 space-y-5 text-left text-slate-700">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</label>
                    <input 
                      type="date" 
                      value={newDate} 
                      onChange={e => setNewDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm font-bold text-left outline-none focus:border-accent"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Qtd. Aulas (Horas)</label>
                    <input 
                      type="number" 
                      value={newCount} 
                      onChange={e => setNewCount(parseInt(e.target.value))}
                      disabled={isHoliday}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm font-bold text-left outline-none focus:border-accent disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 p-3 border border-amber-200 bg-amber-50 rounded-lg">
                  <input 
                    type="checkbox" 
                    id="isHolidayToggle"
                    checked={isHoliday}
                    onChange={(e) => setIsHoliday(e.target.checked)}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="isHolidayToggle" className="text-sm font-bold text-amber-800 cursor-pointer select-none">
                    Marcar dia como FERIADO / RECESSO
                  </label>
                </div>

                {!isHoliday && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Conteúdo Ministrado</label>
                    <textarea 
                      rows={4}
                      value={newContent}
                      onChange={e => setNewContent(e.target.value)}
                      placeholder="Descreva o que foi trabalhado em aula..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-accent resize-none text-left"
                    />
                  </div>
                )}
                <button 
                  onClick={handleSaveLesson}
                  disabled={!isHoliday && !newContent}
                  className="w-full bg-accent text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg hover:shadow-accent/40 transition-all disabled:opacity-50"
                >
                  Confirmar Registro
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Gerador de Cronograma */}
      <AnimatePresence>
        {showCronogramaGenerator && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 text-left">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden text-left">
              <div className="p-6 border-b border-slate-100 bg-primary text-white flex items-center justify-between">
                <div>
                  <h3 className="font-black text-lg uppercase tracking-tight">Gerador de Aula/Cronograma</h3>
                  <p className="text-xs font-bold text-slate-300">Crie os dias letivos no período</p>
                </div>
                <button onClick={() => setShowCronogramaGenerator(false)} className="text-white/60 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
              </div>
              <div className="p-6 space-y-6 text-left text-slate-700">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Inicial</label>
                    <input 
                      type="date" 
                      value={generatorStartDate} 
                      onChange={e => setGeneratorStartDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm font-bold text-left outline-none focus:border-accent"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Final</label>
                    <input 
                      type="date" 
                      value={generatorEndDate} 
                      onChange={e => setGeneratorEndDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm font-bold text-left outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantas aulas por dia da semana?</label>
                  <p className="text-xs text-slate-500 mb-2 leading-relaxed">Em cada dia marcado, o sistema criará o número de aulas (horas/aula) preenchido. Deixe vazio ou 0 para dias em que você não leciona.</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { idx: 1, label: 'Segunda-feira' },
                      { idx: 2, label: 'Terça-feira' },
                      { idx: 3, label: 'Quarta-feira' },
                      { idx: 4, label: 'Quinta-feira' },
                      { idx: 5, label: 'Sexta-feira' },
                      { idx: 6, label: 'Sábado' }
                    ].map(day => (
                      <div key={day.idx} className="bg-slate-50 border border-slate-200 rounded p-2 flex flex-col justify-center items-center gap-1">
                        <span className="text-[10px] font-bold text-slate-600 uppercase">{day.label}</span>
                        <input
                           type="number"
                           min="0"
                           max="10"
                           value={generatorDays[day.idx] || ''}
                           onChange={(e) => setGeneratorDays(prev => ({ ...prev, [day.idx]: parseInt(e.target.value) || 0 }))}
                           className="w-16 text-center border border-slate-200 rounded px-2 py-1 text-sm font-bold"
                           placeholder="0"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    onClick={handleGenerateCronograma}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 hover:bg-blue-700"
                  >
                    <Calendar className="w-5 h-5" /> Gerar Cronograma
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Frequência */}
      <AnimatePresence>
        {viewingAttendance && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 text-left">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden text-left">
              <div className="p-6 border-b border-slate-100 bg-red-600 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-black text-lg uppercase tracking-tight">Lançamento de Frequência</h3>
                  <p className="text-[10px] font-bold text-white/80 uppercase">Aula do dia {new Date(viewingAttendance.date).toLocaleDateString('pt-BR')}</p>
                </div>
                <button onClick={() => setViewingAttendance(null)} className="text-white/60 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
              </div>
              <div className="max-h-[400px] overflow-y-auto p-4 space-y-2">
                {attendanceRecords.map((record, idx) => (
                  <div key={record.student_name} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="font-black text-slate-700 text-xs uppercase">{record.student_name}</span>
                    <button 
                      onClick={() => toggleAttendance(idx)}
                      className={cn(
                        "px-4 py-1.5 rounded font-black text-[10px] uppercase tracking-wider transition-all",
                        record.status === 'present' 
                          ? 'bg-green-100 text-green-700 border border-green-200' 
                          : 'bg-red-100 text-red-700 border border-red-200'
                      )}
                    >
                      {record.status === 'present' ? 'Presente' : 'Faltou'}
                    </button>
                  </div>
                ))}
              </div>
              <div className="p-6 border-t border-slate-100 text-left">
                <button 
                  onClick={saveAttendance}
                  disabled={savingAttendance}
                  className="w-full bg-red-600 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg hover:shadow-red-500/40 transition-all disabled:opacity-50"
                >
                  {savingAttendance ? 'Salvando...' : 'Salvar Lista de Chamada'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function CronogramaEstudosView({ 
  exams, 
  isAdmin, 
  schoolInfo, 
  bimesters,
  userProfile,
  onRefresh 
}: { 
  exams: Exam[], 
  isAdmin: boolean, 
  schoolInfo: any, 
  bimesters: string[],
  userProfile: any,
  onRefresh: () => void
}) {
  const [selectedClass, setSelectedClass] = useState(schoolInfo.classes[0] || '');
  const [selectedBimester, setSelectedBimester] = useState(bimesters[0] || '');
  const [selectedExamType, setSelectedExamType] = useState('TODAS');
  const [isEditing, setIsEditing] = useState(false);
  const [tempExams, setTempExams] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newContentData, setNewContentData] = useState({
    subject: '',
    examDate: new Date().toISOString().split('T')[0],
    examType: 'Cronograma'
  });

  const availableExamTypes = useMemo(() => {
    const types = new Set(exams.map(e => e.examType));
    return ['TODAS', ...Array.from(types).sort()];
  }, [exams]);

  const filteredExams = useMemo(() => {
    return exams.filter(e => {
      const classes = (e.classYear || '').split(',').map(s => s.trim());
      return classes.includes(selectedClass) && 
        e.bimester === selectedBimester &&
        (selectedExamType === 'TODAS' || e.examType === selectedExamType);
    }).sort((a, b) => {
      if (!a.examDate) return 1;
      if (!b.examDate) return -1;
      return new Date(a.examDate).getTime() - new Date(b.examDate).getTime();
    });
  }, [exams, selectedClass, selectedBimester, selectedExamType]);

  const examsByDate = useMemo(() => {
    const groups: Record<string, Exam[]> = {};
    filteredExams.forEach(e => {
      const dateKey = e.examDate || 'Sem Data';
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(e);
    });
    return groups;
  }, [filteredExams]);

  const handlePrint = () => {
    window.print();
  };

  const handleContentChange = (examId: string, content: string) => {
    setTempExams(prev => ({ ...prev, [examId]: content }));
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const updates = Object.entries(tempExams).map(([id, content]) => 
        supabase.from('exams').update({ content }).eq('id', id)
      );
      await Promise.all(updates);
      setIsEditing(false);
      setTempExams({});
      onRefresh();
    } catch (error) {
      console.error("Error saving content:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Deseja realmente excluir o conteúdo de "${title}"?`)) return;
    
    try {
      await supabase.from('exams').delete().eq('id', id);
      onRefresh();
    } catch (error) {
      console.error("Error deleting content:", error);
    }
  };

  const handleAddContent = async () => {
    if (!newContentData.subject) return;
    
    try {
      await supabase.from('exams').insert({
        professor_id: userProfile.uid,
        class_year: selectedClass,
        subject: newContentData.subject,
        exam_type: newContentData.examType,
        exam_date: newContentData.examDate,
        bimester: selectedBimester,
        content: '',
        answer_key: { _metadata: { isExternal: true, subject: newContentData.subject, classYear: selectedClass } }
      });
      setIsAdding(false);
      setNewContentData({ ...newContentData, subject: '' });
      onRefresh();
    } catch (error) {
      console.error("Error adding content:", error);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body {
            background: white !important;
          }
          .print-container {
            width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            border: 2px solid black !important;
          }
          th, td {
            border: 1px solid black !important;
            padding: 6px 10px !important;
            font-size: 10px !important;
            line-height: 1.4 !important;
            vertical-align: top !important;
          }
          th {
            background-color: #f8fafc !important; /* light slate-50 */
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .markdown-body {
            font-size: 10px !important;
          }
        }
      `}</style>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Cronograma de Provas</h2>
          <p className="text-slate-500 font-medium tracking-tight">Organize os conteúdos para as avaliações por período.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select 
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-slate-900 border-2 border-black dark:border-slate-800 rounded-lg font-black text-xs uppercase text-slate-900 dark:text-slate-100"
          >
            {schoolInfo.classes.map((c: string) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select 
            value={selectedBimester}
            onChange={(e) => setSelectedBimester(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-slate-900 border-2 border-black dark:border-slate-800 rounded-lg font-black text-xs uppercase text-slate-900 dark:text-slate-100"
          >
            {bimesters.map((b: string) => <option key={b} value={b}>{b}</option>)}
          </select>
          <select 
            value={selectedExamType}
            onChange={(e) => setSelectedExamType(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-slate-900 border-2 border-black dark:border-slate-800 rounded-lg font-black text-xs uppercase text-slate-900 dark:text-slate-100"
          >
            {availableExamTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-6 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg font-black text-xs uppercase hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border-2 border-black dark:border-slate-800"
          >
            <Plus className="w-4 h-4" />
            Novo Conteúdo
          </button>
          <button 
            onClick={() => {
              if (isEditing) {
                handleSaveAll();
              } else {
                setIsEditing(true);
              }
            }}
            disabled={isSaving}
            className={cn(
              "flex items-center gap-2 px-6 py-2 rounded-lg font-black text-xs uppercase transition-colors border-2 border-black dark:border-slate-800",
              isEditing ? "bg-accent text-white" : "bg-white dark:bg-slate-900 text-black dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800"
            )}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : isEditing ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
            {isSaving ? "Salvando..." : isEditing ? "Salvar Alterações" : "Editar Conteúdos"}
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-2 bg-black text-white rounded-lg font-black text-xs uppercase hover:bg-slate-800 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
        </div>
      </div>

      <div className="bg-white p-8 md:p-12 print:p-0 print:shadow-none border-4 border-black rounded-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] print-container">
        {/* Print Header */}
        <div className="flex flex-col items-center mb-6 border-b-4 border-black pb-4">
          <div className="flex items-center gap-4 mb-4">
             <img src={LOGO_VINHO} alt="Logo" className="w-12 h-12 object-contain" />
             <div className="text-left">
               <h1 className="text-xl font-black uppercase leading-none print:text-lg">Cronograma de Provas</h1>
               <p className="text-[10px] font-bold uppercase text-slate-600 mt-0.5">Colégio Progresso Santista</p>
             </div>
          </div>
          <div className="grid grid-cols-3 w-full gap-2">
            <div className="border-2 border-black p-1 text-center uppercase font-black text-[10px]">
              Turma: {selectedClass}
            </div>
            <div className="border-2 border-black p-1 text-center uppercase font-black text-[10px]">
              Período: {selectedBimester}
            </div>
            <div className="border-2 border-black p-1 text-center uppercase font-black text-[10px]">
              {selectedExamType === 'TODAS' ? 'Todas Avaliações' : `Tipo: ${selectedExamType}`}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border-2 border-black">
            <thead>
              <tr className="bg-slate-50 border-b-2 border-black">
                <th className="p-2 text-left font-black uppercase text-[11px] border-r border-black w-[80px]">Data</th>
                <th className="p-2 text-left font-black uppercase text-[11px] border-r border-black w-[150px]">Avaliação</th>
                <th className="p-2 text-left font-black uppercase text-[11px] border-r border-black">Conteúdo Programático</th>
              </tr>
            </thead>
            <tbody className="divide-y border-b border-black divide-black">
              {Object.keys(examsByDate).length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-12 text-center text-slate-400 font-bold uppercase italic border-black">
                    Nenhum conteúdo cadastrado para esta seleção.
                  </td>
                </tr>
              ) : (
                Object.entries(examsByDate).map(([date, dailyExams]) => (
                  <tr key={date} className="print:break-inside-avoid">
                    <td className="p-2 border-r border-black align-top bg-slate-50/30">
                      <div className="font-black text-sm leading-tight uppercase">
                        {date !== 'Sem Data' ? new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '-'}
                      </div>
                      <div className="text-[9px] font-bold text-slate-500 uppercase">
                        {date !== 'Sem Data' ? new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short' }) : ''}
                      </div>
                    </td>
                    <td className="p-2 border-r border-black align-top space-y-3">
                      {(dailyExams as Exam[]).map(ex => (
                        <div key={ex.id} className="group relative space-y-0.5">
                          <div className="inline-block px-1 py-px bg-black text-white text-[8px] font-black uppercase rounded-[2px]">
                            {ex.examType}
                          </div>
                          <div className="font-black text-black text-[11px] uppercase leading-tight pr-6">
                            {stripHtml(ex.subject)}
                          </div>
                          <button 
                            onClick={() => handleDelete(ex.id, stripHtml(ex.subject))}
                            className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100 print:hidden"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </td>
                    <td className="p-2 border-r border-black align-top">
                      <div className="space-y-4">
                        {(dailyExams as Exam[]).map((ex: Exam) => (
                          <div key={ex.id} className="space-y-1">
                            {(dailyExams as Exam[]).length > 1 && (
                              <div className="text-[9px] font-black uppercase text-slate-400 border-b border-slate-50 pb-0.5">
                                {stripHtml(ex.subject)}:
                              </div>
                            )}
                            <div className="text-[11px] font-medium text-slate-800 leading-relaxed max-w-none">
                              {isEditing ? (
                                <textarea
                                  className="w-full p-2 border border-slate-300 rounded font-sans text-xs min-h-[60px]"
                                  value={tempExams[ex.id] ?? (ex.content ? stripHtml(ex.content) : "")}
                                  onChange={(e) => handleContentChange(ex.id, e.target.value)}
                                  placeholder="Digite o conteúdo aqui..."
                                />
                              ) : (
                                <div className="markdown-body">
                                  {tempExams[ex.id] ? (
                                    <div className="whitespace-pre-wrap">{tempExams[ex.id]}</div>
                                  ) : ex.content ? (
                                    <div dangerouslySetInnerHTML={{ __html: ex.content }} />
                                  ) : (
                                    <span className="italic text-slate-400">Conteúdo não informado.</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {isAdding && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 no-print">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-slate-900 border-4 border-black p-8 rounded-sm max-w-md w-full shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]"
            >
              <h3 className="text-xl font-black uppercase mb-6 flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Adicionar Conteúdo
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Disciplina</label>
                  <input 
                    type="text"
                    value={newContentData.subject}
                    onChange={e => setNewContentData({...newContentData, subject: e.target.value})}
                    placeholder="Ex: Matemática"
                    className="w-full px-4 py-2 border-2 border-black rounded-lg font-bold outline-none dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Data</label>
                    <input 
                      type="date"
                      value={newContentData.examDate}
                      onChange={e => setNewContentData({...newContentData, examDate: e.target.value})}
                      className="w-full px-4 py-2 border-2 border-black rounded-lg font-bold outline-none dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Tipo</label>
                    <select
                      value={newContentData.examType}
                      onChange={e => setNewContentData({...newContentData, examType: e.target.value})}
                      className="w-full px-4 py-2 border-2 border-black rounded-lg font-bold outline-none dark:bg-slate-800 dark:text-white"
                    >
                      <option value="PI">PI</option>
                      <option value="PII">PII</option>
                      <option value="PIII">PIII</option>
                      <option value="Atividade">Atividade</option>
                      <option value="Cronograma">Cronograma</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <button 
                    onClick={() => setIsAdding(false)}
                    className="flex-1 py-3 px-4 border-2 border-black font-black uppercase text-xs hover:bg-slate-50 transition-colors dark:text-white dark:hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleAddContent}
                    className="flex-1 py-3 px-4 bg-black text-white border-2 border-black font-black uppercase text-xs hover:bg-slate-800 transition-colors"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Print Footer */}
        <div className="hidden print:block mt-8 border-t border-black pt-4 text-center">
          <p className="text-[9px] font-bold uppercase text-slate-500 italic">
            "A educação é a base para o desenvolvimento de um futuro extraordinário."
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function BoletimItem({ 
  studentName, 
  isLast = false, 
  results, 
  exams, 
  isAdmin, 
  userProfile, 
  allPossibleStudents, 
  schoolInfo, 
  bimesters 
}: { 
  key?: string | number,
  studentName: string, 
  isLast?: boolean, 
  results: Result[], 
  exams: Exam[], 
  isAdmin: boolean, 
  userProfile: any, 
  allPossibleStudents: any[], 
  schoolInfo: any, 
  bimesters: string[] 
}) {
  const studentResults = results.filter(r => r.studentName === studentName);
  const studentInfo = allPossibleStudents.find(s => s.name === studentName);
  const studentClass = studentInfo?.classId || 'N/A';
  
  // Subjects specifically for this class according to schoolInfo mapping
  const subjects = useMemo(() => {
    const defined = schoolInfo.class_subjects[studentClass];
    if (defined && defined.length > 0) return defined;
    // Fallback to current subjects found in exams for this class
    return Array.from(new Set(exams.filter(e => e.classYear === studentClass).map(e => stripHtml(e.subject))));
  }, [studentClass, schoolInfo, exams]);

  const filteredSubjects = useMemo(() => {
    let list = subjects;
    if (!isAdmin && userProfile?.assigned_subjects) {
      list = list.filter(s => userProfile.assigned_subjects.includes(s));
    }
    return list;
  }, [subjects, isAdmin, userProfile]);

  return (
    <div key={studentName} className={cn("bg-white text-black p-4 md:p-12 print:p-8 w-full max-w-5xl mx-auto mb-8 print:mb-0 print:min-h-[297mm] print:break-inside-avoid print-avoid-break flex flex-col", isLast ? "" : "print:break-after-page")}>
      {/* HEADER BOLETIM MEK */}
      <div className="flex flex-col sm:flex-row items-center justify-between border-b-4 border-black pb-4 mb-8 gap-4">
         <div className="flex items-center gap-6">
           <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-100 rounded px-1 flex flex-col items-center justify-center font-black text-[10px] text-slate-400 overflow-hidden border-2 border-black">
              <img src={LOGO_VINHO} alt="Logo" className="w-full h-full object-contain" />
           </div>
           <div>
             <h1 className="text-xl md:text-3xl font-black uppercase tracking-tighter leading-none">Boletim Escolar</h1>
             <p className="text-[10px] md:text-[12px] font-black uppercase text-black mt-1">Educação Infantil • Ensino Fundamental I e II</p>
           </div>
         </div>
         <div className="text-center sm:text-right">
           <p className="text-sm md:text-lg font-black uppercase">Ano Letivo: 2026</p>
           <p className="text-[10px] md:text-xs font-bold uppercase text-slate-600">Emissão: {new Date().toLocaleDateString('pt-BR')}</p>
         </div>
      </div>

      {/* INFO ALUNO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
         <div className="flex items-stretch border-2 border-black rounded-sm overflow-hidden">
           <div className="bg-slate-100 border-r-2 border-black px-4 py-2 min-w-[100px] flex items-center justify-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-center">Aluno(a)</span>
           </div>
           <div className="px-4 py-2 flex-1 bg-white flex items-center">
              <span className="text-base font-black uppercase tracking-tight">{studentName}</span>
           </div>
         </div>
         <div className="flex items-stretch border-2 border-black rounded-sm overflow-hidden">
           <div className="bg-slate-100 border-r-2 border-black px-4 py-2 min-w-[100px] flex items-center justify-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-center">Turma</span>
           </div>
           <div className="px-4 py-2 flex-1 bg-white flex items-center">
              <span className="text-base font-black uppercase tracking-tight">{studentClass}</span>
           </div>
         </div>
      </div>

      {/* QUADRO DE NOTAS */}
      <div className="border-2 border-black rounded-sm overflow-hidden flex-1">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="border-r-2 border-black p-3 text-left text-[12px] font-black uppercase w-1/3 bg-slate-100">Componentes Curriculares</th>
              <th className="border-r-2 border-black p-3 text-center text-[11px] font-black uppercase">1º Bim</th>
              <th className="border-r-2 border-black p-3 text-center text-[11px] font-black uppercase">2º Bim</th>
              <th className="border-r-2 border-black p-3 text-center text-[11px] font-black uppercase">3º Bim</th>
              <th className="border-r-2 border-black p-3 text-center text-[11px] font-black uppercase">4º Bim</th>
              <th className="p-3 text-center text-[12px] font-black uppercase bg-slate-100">Média Final</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-black">
            {filteredSubjects.length === 0 && (
               <tr><td colSpan={6} className="p-8 text-center text-sm font-black uppercase text-slate-400">Nenhuma disciplina avaliada neste período.</td></tr>
            )}
            {filteredSubjects.map(subject => {
              const rowBimFinals: (number | null)[] = bimesters.map(bim => {
                const subjectBimResults = studentResults.filter(r => {
                    const ex = exams.find(e => e.id === r.examId);
                    return r.bimester === bim && ex && stripHtml(ex.subject) === subject;
                });
                
                if (subjectBimResults.length === 0) return null;

                // Separate Regular from Recovery
                const regular = subjectBimResults.filter(r => {
                  const ex = exams.find(e => e.id === r.examId);
                  return ex && ex.examType !== 'Recuperação Bimestral';
                });
                const recovery = subjectBimResults.find(r => {
                  const ex = exams.find(e => e.id === r.examId);
                  return ex && ex.examType === 'Recuperação Bimestral';
                });

                const baseAvg = regular.length > 0
                  ? regular.reduce((acc, r) => acc + ((r.score / r.maxScore) * 10), 0) / regular.length
                  : 0;
                
                if (recovery && baseAvg < 6) {
                  const recScore = (recovery.score / recovery.maxScore) * 10;
                  return (baseAvg + recScore) / 2;
                }
                
                return baseAvg;
              });

              // Recuperação Final
              const yearRecovery = studentResults.find(r => {
                const ex = exams.find(e => e.id === r.examId);
                return ex && stripHtml(ex.subject) === subject && ex.examType === 'Recuperação Final';
              });

              const bimsComNota = rowBimFinals.filter(b => b !== null) as number[];
              const mediaAnualBase = bimsComNota.length > 0 
                ? bimsComNota.reduce((acc, curr) => (acc || 0) + (curr || 0), 0) / 4 
                : 0;

              let mediaFinalTotal = mediaAnualBase;
              if (yearRecovery && mediaAnualBase < 6) {
                 const recFinalScore = (yearRecovery.score / yearRecovery.maxScore) * 10;
                 mediaFinalTotal = (mediaAnualBase + recFinalScore) / 2;
              }

              return (
                <tr key={subject}>
                  <td className="border-r-2 border-black p-3 pl-4 text-[12px] font-black uppercase">{stripHtml(subject)}</td>
                  {rowBimFinals.map((avg, i) => (
                    <td key={i} className="border-r-2 border-black p-3 text-center text-[16px] font-black">
                       {avg !== null ? (
                         <span className={avg < 6 ? 'text-red-700' : 'text-blue-800'}>{avg.toFixed(1).replace('.', ',')}</span>
                       ) : '-'}
                    </td>
                  ))}
                  <td className="p-3 text-center text-[18px] font-black bg-slate-50">
                    {bimsComNota.length > 0 ? (
                       <span className={mediaFinalTotal >= 6 ? 'text-blue-900 underline decoration-2 underline-offset-4' : 'text-red-800 underline decoration-2 underline-offset-4'}>
                         {mediaFinalTotal.toFixed(1).replace('.', ',')}
                       </span>
                    ) : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* INFO EXTRA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <div className="border-2 border-black p-4 text-[11px] uppercase font-black text-black rounded-sm leading-relaxed">
           <h4 className="border-b border-black pb-1 mb-2">Legenda / Critérios</h4>
           <p>• Média para Aprovação: 6,0</p>
           <p>• Recuperação Bimestral: (Média + Recuperação) / 2</p>
           <p>• Média Final Anual: (Soma Bimestres + Rec. Final) / 2</p>
        </div>
        <div className="border-2 border-black p-4 text-[11px] uppercase font-black text-black rounded-sm flex flex-col justify-center">
           <p className="text-center italic opacity-70">"A educação é o passaporte para o futuro."</p>
        </div>
      </div>

      {/* FOOTER ASSINATURAS */}
      <div className="grid grid-cols-2 gap-16 mt-32 px-12 pb-12">
         <div className="border-t-2 border-black pt-4 text-center">
           <p className="text-[12px] font-black uppercase">Direção / Coordenação</p>
         </div>
         <div className="border-t-2 border-black pt-4 text-center">
           <p className="text-[12px] font-black uppercase">Assinatura do Responsável</p>
         </div>
      </div>
    </div>
  );
}

function BoletimView({ results, exams, user, isAdmin, userProfile, onRefresh }: { results: Result[], exams: Exam[], isAdmin: boolean, user: User, userProfile: any, onRefresh: () => void }) {
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const schoolInfo = getSchoolInfo();
  const classes = schoolInfo.classes;
  const bimesters = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'];

  const allPossibleStudents = Object.values(schoolInfo.studentsDB).flat() as any[];
  
  const studentsFiltered = useMemo(() => {
    let list = allPossibleStudents;

    if (selectedClass) {
      list = list.filter((s: any) => s.classId === selectedClass);
    }
    if (searchTerm) {
      list = list.filter((s: any) => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return list.map(s => s.name).sort();
  }, [allPossibleStudents, selectedClass, searchTerm]);

  const handlePrint = () => {
    window.print();
  };

  const handlePrintAll = () => {
    if (studentsFiltered.length === 0) return;
    if (studentsFiltered.length > 50 && !window.confirm(`Você está prestes a gerar ${studentsFiltered.length} boletins. Isso pode deixar o sistema lento. Deseja continuar?`)) return;
    setSelectedStudent("TODOS");
    setTimeout(() => window.print(), 800);
  };

  // Se nenhum aluno selecionado, mostra a lista para escolher
  if (!selectedStudent) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-5xl mx-auto print:hidden">
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
           <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
             <div className="flex items-center gap-3">
               <div className="p-3 bg-[#3b5998]/10 rounded-xl">
                 <FileText className="w-6 h-6 text-[#3b5998]" />
               </div>
               <div>
                 <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Boletins Escolares</h2>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Gestão de resultados por aluno/sala</p>
               </div>
             </div>
             <div className="flex flex-wrap items-center gap-2">
               {studentsFiltered.length > 0 && (
                 <button 
                   onClick={handlePrintAll}
                   className="flex items-center gap-2 px-6 py-3 bg-[#3b5998] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-opacity-95 transition-all shadow-lg hover:shadow-[#3b5998]/40 active:scale-95"
                 >
                   <Printer className="w-4 h-4" /> Impressão em Lote ({studentsFiltered.length})
                 </button>
               )}
             </div>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
             <div>
               <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest ml-1">Filtro por Turma</label>
               <div className="relative">
                 <School className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3b5998]" />
                 <select 
                   value={selectedClass}
                   onChange={e => setSelectedClass(e.target.value)}
                   className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-[#3b5998] focus:bg-white font-black text-xs text-slate-800 transition-all uppercase appearance-none"
                 >
                   <option value="">TODAS AS TURMAS</option>
                   {classes.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
                 <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
               </div>
             </div>
             <div>
               <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest ml-1">Pesquisar Aluno</label>
               <div className="relative">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3b5998]" />
                 <input 
                   type="text"
                   placeholder="DIGITE O NOME DO ALUNO..."
                   value={searchTerm}
                   onChange={e => setSearchTerm(e.target.value)}
                   className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-[#3b5998] focus:bg-white font-black text-xs text-slate-800 transition-all uppercase"
                 />
               </div>
             </div>
           </div>

           <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-inner">
             {studentsFiltered.length > 0 ? (
               <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 p-4 gap-3">
                   {studentsFiltered.map(studentName => {
                      const studentClass = allPossibleStudents.find(s => s.name === studentName)?.classId || 'N/A';
                      return (
                        <button 
                          key={studentName}
                          onClick={() => setSelectedStudent(studentName)}
                          className="flex flex-col p-4 text-left bg-white border border-slate-200 rounded-2xl hover:border-[#3b5998] hover:shadow-md transition-all group active:scale-[0.98]"
                        >
                          <div className="flex items-center gap-3 mb-2">
                             <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[#3b5998] group-hover:bg-[#3b5998] group-hover:text-white transition-colors">
                               <UserIcon className="w-4 h-4" />
                             </div>
                             <span className="text-[9px] font-black text-[#3b5998] bg-blue-50 px-2 py-0.5 rounded-full uppercase">{studentClass}</span>
                          </div>
                          <p className="text-xs font-black text-slate-700 uppercase leading-tight group-hover:text-[#3b5998] transition-colors">{studentName}</p>
                          <div className="mt-3 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
                             <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Ver Detalhes</span>
                             <Printer className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-slate-600" />
                          </div>
                        </button>
                      );
                   })}
                 </div>
               </div>
             ) : (
               <div className="text-center py-32">
                   <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                   <p className="text-slate-400 text-sm font-black uppercase tracking-widest">Nenhum aluno encontrado</p>
                   <p className="text-slate-300 text-[10px] font-bold uppercase mt-2">Tente ajustar seus filtros de busca</p>
               </div>
             )}
           </div>
         </div>
      </motion.div>
    );
  }

  // Visualização do Boletim Múltiplo ou Individual
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-20 print:space-y-0 print:pb-0 print-container">
      <div className="print:hidden no-print flex items-center justify-between max-w-5xl mx-auto mb-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <button 
          onClick={() => setSelectedStudent(null)}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-black uppercase hover:bg-slate-200 transition-all shadow-sm active:scale-95"
        >
          <ChevronLeft className="w-4 h-4" /> Voltar à lista
        </button>
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#3b5998] text-white rounded-xl text-xs font-black uppercase hover:bg-opacity-95 transition-all shadow-md active:scale-95"
        >
          <Printer className="w-4 h-4" /> Imprimir {selectedStudent === "TODOS" ? `Lote (${studentsFiltered.length})` : "Boletim"}
        </button>
      </div>

      {selectedStudent === "TODOS" ? (
        <div className="w-full h-full">
          {studentsFiltered.map((student, idx) => (
            <BoletimItem 
              key={student}
              studentName={student}
              isLast={idx === studentsFiltered.length - 1}
              results={results}
              exams={exams}
              isAdmin={isAdmin}
              userProfile={userProfile}
              allPossibleStudents={allPossibleStudents}
              schoolInfo={schoolInfo}
              bimesters={bimesters}
            />
          ))}
        </div>
      ) : (
        <BoletimItem 
          studentName={selectedStudent}
          isLast={true}
          results={results}
          exams={exams}
          isAdmin={isAdmin}
          userProfile={userProfile}
          allPossibleStudents={allPossibleStudents}
          schoolInfo={schoolInfo}
          bimesters={bimesters}
        />
      )}
    </motion.div>
  );
}

