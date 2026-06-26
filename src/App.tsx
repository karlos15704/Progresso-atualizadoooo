import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import QRCode from "qrcode";
import confetti from "canvas-confetti";
import {
  Editor,
  EditorProvider,
  Toolbar,
  BtnBold,
  BtnItalic,
  BtnUnderline,
  BtnStrikeThrough,
  BtnNumberedList,
  BtnBulletList,
  BtnClearFormatting,
  Separator,
  createButton,
  createDropdown,
} from "react-simple-wysiwyg";
import {
  Sun,
  Moon,
  Plus,
  FileText,
  Camera,
  Shapes,
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
  Tags,
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
  EyeOff,
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
  KeyRound,
  Layout,
  Info,
  Check,
  ClipboardList,
  ArrowLeft,
  ArrowRight,
  LayoutDashboard,
  FileSpreadsheet,
  Paperclip,
  PlusSquare,
  FilePlus,
  Scissors,
  Megaphone,
  Pin,
  Bell,
  ShieldAlert,
  Send as SendIcon,
  GraduationCap,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Palette,
  Cpu,
  Flame,
  Calculator,
  Languages,
  Compass,
  Leaf,
  Beaker,
  Globe,
  Hourglass,
  Activity,
  GitMerge,
  Bookmark,
  Maximize2,
  Move,
  Image as ImageIcon,
  WrapText,
  Layers,
  RectangleHorizontal,
  Square as SquareIcon,
  Type,
  Minus
} from "lucide-react";
import { AuthUser as User } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import { exportToPDF, exportMultipleToPDF } from "./lib/pdfUtils";
import { LOGO_VINHO, LOGO_COC } from "./assets";
import DefaultEditor from "react-simple-wysiwyg";
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
  Cell,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "./lib/utils";
import Cropper, { Area } from "react-easy-crop";
import { getCroppedImg } from "./lib/cropUtils";
import { getBimesterForExam, getBimesterForDate } from "./utils/bimesterUtils";
import { getFilteredClasses } from "./utils/classUtils";
import { DashboardView, StatCard } from "./components/DashboardView";
import { ViewHeader } from "./components/ViewHeader";
import AdminViewComponent from "./components/AdminView";

import { ErrorReportView, ErrorAdminView } from "./components/ErrorViews";
import { NotificationsDropdown } from "./components/NotificationsDropdown";
import { DiaryReportsView } from "./components/DiaryReportsView";
import { AgendaEletronicaView } from "./components/AgendaEletronicaView";
import { FamilyPortalView } from "./components/FamilyPortalView";
import TIAutoExamView from "./components/TIAutoExamView";


// Global alert override to friendly translate English technical errors (Supabase) to Portuguese
const originalAlert = window.alert;
window.alert = (message: any) => {
  if (typeof message === "string") {
    const msg = message.toLowerCase();
    if (
      msg.includes("refresh token not found") ||
      msg.includes("invalid refresh token") ||
      msg.includes("invalid_grant")
    ) {
      console.warn("Auth Session Error (Squashed):", message);
      // Instead of alert, we let our handleAuthError heal the state silently or with a non-intrusive UI element if possible
      // but for now, we just redirect or clear to prevent the loop of errors
      return;
    }
    if (
      msg.includes("failed to fetch") ||
      msg.includes("network error") ||
      msg.includes("load failed") ||
      msg.includes("conexão recusada") ||
      msg.includes("network_error")
    ) {
      console.warn("Network Error (Squashed):", message);
      return; // Squash Failed to fetch and similar network errors for background syncs
    }
  }
  return originalAlert(message);
};

const cleanStyleString = (styleStr: string): string => {
  if (!styleStr) return "";
  const declarations = styleStr.split(";");
  const cleanedDecl: string[] = [];
  for (let decl of declarations) {
    const trimmed = decl.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) {
      cleanedDecl.push(trimmed);
      continue;
    }
    const prop = trimmed.substring(0, colonIdx).trim().toLowerCase();
    const val = trimmed.substring(colonIdx + 1).trim();
    const valLower = val.toLowerCase();

    // 1. Block positioning that could break layout flow or overlap numbers
    if (prop === "position" && (valLower.includes("absolute") || valLower.includes("fixed") || valLower.includes("relative"))) {
      continue;
    }
    // 2. Block text-indent completely to prevent text from shifting leftwards into the question number
    if (prop === "text-indent") {
      continue;
    }
    // 3. Block negative margins/paddings or left/top offsets
    if (val.includes("-") && /-\s*[0-9]/.test(val)) {
      continue;
    }
    // 4. Block margin-left/padding-left if negative or too large
    if ((prop === "left" || prop === "top" || prop === "margin-left" || prop === "padding-left" || prop === "right" || prop === "bottom") && val.includes("-")) {
      continue;
    }
    // 5. Block absolute inline dimensions (width and height over 10) to prevent page overflowing
    if (prop === "width" || prop === "height") {
      const isAbsolute = /^[0-9.]+(px|pt|cm|in|pc|mm)$/i.test(valLower);
      if (isAbsolute) {
        const numVal = parseFloat(valLower);
        if (numVal > 10) {
          continue;
        }
      }
    }
    // 6. Strip font-size, font-family, and line-height to enforce exam standard formatting
    // This prevents teacher-pasted rich text from overriding the exam's standard layout
    if (prop === "font-size" || prop === "font-family" || prop === "line-height") {
      continue;
    }

    cleanedDecl.push(`${prop}: ${val}`);
  }
  return cleanedDecl.join("; ");
};

// Professional Safe HTML Cleaner (especially for Word-to-Web pasted content)
const cleanWordHtml = (html: string) => {
  if (!html) return "";

  let cleaned = html;

  // 1. SECURITY: Remove script tags and all event handlers (XSS protection)
  cleaned = cleaned
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "")
    .replace(/javascript:[^"']*/gi, "");

  // 2. Remove all Microsoft Word conditional fragments safely
  cleaned = cleaned
    .replace(/<!--\[if[\s\S]*?\]>/gi, "")
    .replace(/<!\[endif\]-->/gi, "")
    .replace(/<!--\[if[\s\S]*?endif\]-->/gi, "")
    .replace(/<!\[if [^\]]*\]>/gi, "")
    .replace(/<!\[endif\]>/gi, "")
    .replace(/-->/g, "");

  // 3. Remove latent styles and Word XML documents/namespaces COMPLETELY including inner text
  cleaned = cleaned
    .replace(/<xml>[\s\S]*?<\/xml>/gi, "")
    .replace(/<style>[\s\S]*?<\/style>/gi, "")
    // Usually we don't want to remove contents of <w:...> if they contain text, but word xml blocks don't contain real user text.
    // Actually, to be safe, let's just remove the tags themselves, not the content, unless it is a style/xml block
    .replace(/<(w|o|m|v|x|p):[^>]*>/gi, "")
    .replace(/<\/(w|o|m|v|x|p):[^>]*>/gi, "");

  // 3.5. Strip <font> tags (keeping inner content) to prevent custom font injection
  cleaned = cleaned.replace(/<\/?font\b[^>]*>/gi, "");

  // 4. Remove comments
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, "");

  // 5. General cleanup of margins, paddings, languages
  cleaned = cleaned
    .replace(/class="Mso.*?"/gi, "")
    .replace(/class='Mso.*?'/gi, "")
    .replace(/lang=".*?"/gi, "")
    .replace(/lang='.*?'/gi, "")
    .replace(/mso-[a-zA-Z0-9\-]+="[^"]*"/gi, "")
    .replace(/mso-[a-zA-Z0-9\-]+='[^']*'/gi, "");

  // Remove absolute width and height attributes to avoid layout expansion
  // (Be careful not to overmatch)
  cleaned = cleaned
    .replace(/\bwidth="[0-9]+"/gi, "")
    .replace(/\bheight="[0-9]+"/gi, "")
    .replace(/\bwidth='[0-9]+'/gi, "")
    .replace(/\bheight='[0-9]+'/gi, "");

  // We parse and sanitize style attributes to ensure no paragraph has absolute layout, negative margins,
  // or text-indent styling that could shift it into the question/option numbers.
  cleaned = cleaned.replace(/style="([^"]*)"/gi, (match, p1) => {
    const cleanedStyle = cleanStyleString(p1);
    return cleanedStyle ? `style="${cleanedStyle}"` : '';
  });
  cleaned = cleaned.replace(/style='([^']*)'/gi, (match, p1) => {
    const cleanedStyle = cleanStyleString(p1);
    return cleanedStyle ? `style="${cleanedStyle}"` : '';
  });

  // Failsafe: if our cleaning stripped literally everything but there was content,
  // it might be because the user typed something that looked like an aggressive tag.
  // We prefer to at least return the HTML encoded version of the original rather than blank.
  if (html.trim().length > 0 && cleaned.trim().length === 0) {
    return html.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  return cleaned;
};

// --- ROBUST FETCH UTILITY (Global Scope) ---
async function robustFetch(
  url: string,
  options: RequestInit = {},
  retries = 2,
  userEmail?: string,
): Promise<Response> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok && retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return robustFetch(url, options, retries - 1, userEmail);
    }
    return response;
  } catch (err: any) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return robustFetch(url, options, retries - 1, userEmail);
    }

    // Remote Log Error to Backend for Diagnostics
    try {
      fetch("/api/debug/client-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `FETCH_FAILED: ${url} - ${err.message || String(err)}`,
          stack: err.stack,
          userEmail: userEmail || "Unknown",
        }),
      }).catch(() => {}); // Fire and forget
    } catch (_) {}

    throw err;
  }
}

function PageBreakSeparator({ pageNumber }: { pageNumber?: number }) {
  return (
    <div className="my-10 flex items-center justify-center gap-4 no-print print:hidden select-none">
      <div className="h-[2px] bg-dashed border-t-2 border-slate-200 dark:border-slate-800 flex-1"></div>
      <span className="text-[10px] uppercase font-black text-rose-500 bg-rose-50 border border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/30 px-3.5 py-1.5 rounded-full flex items-center gap-2 shadow-sm tracking-widest">
        <Scissors className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
        Quebra de Página {pageNumber ? `⬢ Página ${pageNumber}` : ""} ⬢ Próxima
        Folha na Impressão
      </span>
      <div className="h-[2px] bg-dashed border-t-2 border-slate-200 dark:border-slate-800 flex-1"></div>
    </div>
  );
}

const SafeHTML = ({
  html,
  className,
}: {
  html: string;
  className?: string;
}) => {
  if (!html) return null;
  const cleaned = cleanWordHtml(html);

  const finalHtml = cleaned.trim().length === 0 && html.trim().length > 0 ? html : cleaned;

  // More robust check: if it contains anything that looks like a tag
  const hasTags = /<[a-z/][\s\S]*?>/i.test(finalHtml);

  // If it's just raw text with encoded entities, we still want to render it through dangerouslySetInnerHTML
  // to decode those entities (like &nbsp; or &lt;)
  const hasEntities = /&[a-z0-9#]+;/i.test(finalHtml);

  if (!hasTags && !hasEntities) {
    return (
      <div className={cn("whitespace-pre-wrap font-sans text-slate-900 dark:text-slate-100 print:text-black", className)}>
        {finalHtml}
      </div>
    );
  }

  return (
    <div
      className={cn("prose-custom font-sans leading-relaxed text-slate-900 dark:text-slate-100 print:text-black", className)}
      dangerouslySetInnerHTML={{ __html: finalHtml }}
    />
  );
};

const renderQuestionShape = (q: any, isPreview: boolean = false) => {
  if (!q.drawingShape || q.drawingShape === "none") return null;

  const width = q.drawingShapeSize || 150;
  const height = q.drawingShape === "circle" || q.drawingShape === "square"
    ? width
    : (q.drawingShapeHeight || 100);

  // Outline/border weight
  const strokeWidth = q.drawingShapeBorderWidth ?? 2;

  // Outline style
  let strokeDasharray: string | undefined = undefined;
  if (q.drawingShapeBorderStyle === "dashed") {
    strokeDasharray = `${strokeWidth * 3},${strokeWidth * 2}`;
  } else if (q.drawingShapeBorderStyle === "dotted") {
    strokeDasharray = `${strokeWidth},${strokeWidth * 1.5}`;
  }

  // Colors mapping
  const fillMap: Record<string, string> = {
    transparent: "transparent",
    white: "#ffffff",
    lightgray: "#f8fafc",
    gray: "#e2e8f0",
    yellow: "#fef9c3",
    blue: "#dbeafe",
    green: "#dcfce7",
    red: "#fee2e2",
  };
  const fill = fillMap[q.drawingShapeFill || "transparent"] || "transparent";

  const strokeMap: Record<string, string> = {
    black: "#000000",
    gray: "#475569",
    none: "none",
  };
  const stroke = q.drawingShapeBorderColor === "none" ? "none" : (strokeMap[q.drawingShapeBorderColor || "black"] || "#000000");

  const textColorMap: Record<string, string> = {
    black: "#000000",
    white: "#ffffff",
    gray: "#475569",
    red: "#dc2626",
    blue: "#2563eb",
    green: "#16a34a",
  };
  const textColor = textColorMap[q.drawingShapeTextColor || "black"] || "#000000";

  const text = q.drawingShapeText || "";

  // Adjust SVG content based on shape type
  let svgContent = null;
  const uniqueId = `shape-marker-${q.id}`;

  switch (q.drawingShape) {
    case "circle":
      svgContent = (
        <circle
          cx={width / 2}
          cy={width / 2}
          r={Math.max(2, (width - strokeWidth) / 2)}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
        />
      );
      break;
    case "square":
      svgContent = (
        <rect
          x={strokeWidth / 2}
          y={strokeWidth / 2}
          width={Math.max(2, width - strokeWidth)}
          height={Math.max(2, width - strokeWidth)}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
        />
      );
      break;
    case "rectangle":
      svgContent = (
        <rect
          x={strokeWidth / 2}
          y={strokeWidth / 2}
          width={Math.max(2, width - strokeWidth)}
          height={Math.max(2, height - strokeWidth)}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
        />
      );
      break;
    case "triangle":
      svgContent = (
        <polygon
          points={`${width / 2},${strokeWidth} ${strokeWidth},${height - strokeWidth} ${width - strokeWidth},${height - strokeWidth}`}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
        />
      );
      break;
    case "right-triangle":
      svgContent = (
        <polygon
          points={`${strokeWidth},${strokeWidth} ${strokeWidth},${height - strokeWidth} ${width - strokeWidth},${height - strokeWidth}`}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
        />
      );
      break;
    case "line":
      svgContent = (
        <line
          x1={strokeWidth}
          y1={height / 2}
          x2={width - strokeWidth}
          y2={height / 2}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
        />
      );
      break;
    case "arrow":
      svgContent = (
        <>
          <defs>
            <marker
              id={uniqueId}
              markerWidth="10"
              markerHeight="7"
              refX="8"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill={stroke} />
            </marker>
          </defs>
          <line
            x1={strokeWidth}
            y1={height / 2}
            x2={width - 8 - strokeWidth}
            y2={height / 2}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            markerEnd={`url(#${uniqueId})`}
          />
        </>
      );
      break;
    default:
      return null;
  }

  // Align text nicely based on shape
  let textY = "50%";
  if (q.drawingShape === "triangle") {
    textY = "62%";
  } else if (q.drawingShape === "right-triangle") {
    textY = "62%";
  } else if (q.drawingShape === "line" || q.drawingShape === "arrow") {
    textY = "32%"; // Render above the line/arrow
  }

  return (
    <svg width={width} height={height} className="max-w-full">
      {svgContent}
      {text && (
        <text
          x="50%"
          y={textY}
          dominantBaseline="central"
          textAnchor="middle"
          fill={textColor}
          fontSize="12"
          fontWeight="bold"
          className="select-none font-sans"
        >
          {text}
        </text>
      )}
    </svg>
  );
};

function InteractiveShape({ q, isPreview, onResize, onPositionChange }: any) {
  const [selected, setSelected] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const shapeRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<{ x: number; y: number; w: number; h: number }>({ x: 0, y: 0, w: 0, h: 0 });

  const width = q.drawingShapeSize || 150;
  const height = q.drawingShape === "circle" || q.drawingShape === "square"
    ? width
    : (q.drawingShapeHeight || 100);

  // Click-outside to deselect
  useEffect(() => {
    if (!selected || !isPreview) return;
    const handler = (e: MouseEvent) => {
      if (shapeRef.current && !shapeRef.current.contains(e.target as Node)) {
        setSelected(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [selected, isPreview]);

  // Resize handler
  const handleResizeStart = (e: React.MouseEvent, corner: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onResize) return;
    startRef.current = { x: e.clientX, y: e.clientY, w: width, h: height };
    setResizing(true);

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startRef.current.x;
      const dy = ev.clientY - startRef.current.y;
      
      let newWidth = startRef.current.w;
      let newHeight = startRef.current.h;

      if (corner.includes('e') || corner === 'se' || corner === 'ne') {
        newWidth = Math.max(40, startRef.current.w + dx);
      }
      if (corner.includes('s') || corner === 'se' || corner === 'sw') {
        newHeight = Math.max(20, startRef.current.h + dy);
      }
      
      onResize(newWidth, newHeight);
    };

    const onUp = () => {
      setResizing(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // Drag handler
  const handleDragStart = (e: React.MouseEvent) => {
    if (!isPreview) return;
    if ((e.target as HTMLElement).closest('.resize-handle') || (e.target as HTMLElement).closest('button')) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setSelected(true);
    setDragging(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const initialLeft = q.drawingShapeLeft ?? 0;
    const initialTop = q.drawingShapeTop ?? 0;

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      onPositionChange?.(initialLeft + dx, initialTop + dy);
    };

    const onUp = () => {
      setDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const showHandles = isPreview && selected;
  const hasPosition = q.drawingShapeLeft !== undefined && q.drawingShapeTop !== undefined;

  return (
    <div
      ref={shapeRef}
      className={cn(
        "group relative print:border-transparent transition-all duration-75 flex flex-col items-center justify-center",
        isPreview && "cursor-move",
        showHandles && "ring-2 ring-emerald-500 ring-offset-1",
        (resizing || dragging) && "select-none"
      )}
      style={hasPosition ? {
        position: 'absolute',
        left: `${q.drawingShapeLeft}px`,
        top: `${q.drawingShapeTop}px`,
        zIndex: 10,
        width: `${width}px`,
        height: `${height}px`,
      } : {
        width: `${width}px`,
        height: `${height}px`,
        margin: '0 auto',
      }}
      onClick={(e) => {
        if (isPreview) {
          e.stopPropagation();
          setSelected(true);
        }
      }}
      onMouseDown={handleDragStart}
    >
      {renderQuestionShape(q, isPreview)}

      {/* Resize Handles */}
      {showHandles && onResize && (
        <>
          {(['nw', 'ne', 'sw', 'se'] as const).map((corner) => (
            <div
              key={corner}
              onMouseDown={(e) => handleResizeStart(e, corner)}
              className={cn(
                "resize-handle absolute w-3 h-3 bg-emerald-500 border border-white rounded-full z-20 hover:scale-125 transition-transform",
                corner === 'nw' && "-top-1.5 -left-1.5 cursor-nwse-resize",
                corner === 'ne' && "-top-1.5 -right-1.5 cursor-nesw-resize",
                corner === 'sw' && "-bottom-1.5 -left-1.5 cursor-nesw-resize",
                corner === 'se' && "-bottom-1.5 -right-1.5 cursor-nwse-resize"
              )}
            />
          ))}
        </>
      )}
    </div>
  );
}

// Utility to strip HTML tags for titles etc
const stripHtml = (html: string) => {
  if (!html) return "";
  // Check if it's actually HTML
  if (!html.includes("<") && !html.includes(">")) return html;
  const doc = new DOMParser().parseFromString(html, "text/html");
  const text = doc.body.textContent || "";
  return text.trim();
};

import {
  Question,
  Exam,
  Result,
  Lesson,
  Attendance,
  StudentReport,
  Student,
} from "./types";

// Types (already in types.ts)

interface ClassSubjectsMapping {
  [classId: string]: string[];
}

const DEFAULT_SCHOOL_INFO = {
  subjects: [
    "Artes",
    "Biologia",
    "Ciências da Natureza",
    "Ciências Sociais",
    "Coordenação",
    "Educação Física",
    "Espanhol",
    "Física",
    "Geografia",
    "História",
    "Língua Inglesa",
    "Língua Portuguesa",
    "Matemática",
    "Química",
    "Robótica",
  ],
  classes: [
    "6º A",
    "6º B",
    "6º C",
    "7º A",
    "7º B",
    "8º A",
    "8º B",
    "9º A",
    "9º B",
  ],
  classShifts: {} as Record<string, string>,
  class_subjects: {} as ClassSubjectsMapping,
  examCategories: [
    "PI",
    "PII",
    "PIII",
    "PIV",
    "PV",
    "PVI",
    "Recuperação",
    "Recuperação Bimestral",
    "Recuperação Final",
    "Trabalho",
    "Simulado",
    "Atividade",
    "Projeto",
  ],
  studentsDB: {
    Maternal: [
      { classId: "Maternal A", name: "ALICE DE OLIVEIRA RODRIGUES" },
      { classId: "Maternal A", name: "BENÍCIO GOMES DA SILVA" },
      { classId: "Maternal B", name: "HELENA CARDOSO PINTO" },
      { classId: "Maternal B", name: "LUCAS MOREIRA SANTOS" },
    ],
    Jardim: [
      { classId: "Jardim A", name: "DAVÍ CARVALHO ALMEIDA" },
      { classId: "Jardim A", name: "MANUELA SOUZA LIMA" },
      { classId: "Jardim B", name: "MATEUS TEIXEIRA AMARAL" },
      { classId: "Jardim B", name: "VALENTINA DIAS GABRIEL" },
    ],
    "Pré I": [
      { classId: "Pré I A", name: "ANA JÚLIA MENDES" },
      { classId: "Pré I A", name: "ENZO GABRIEL COSTA" },
      { classId: "Pré I B", name: "SOPHIA BARCELLOS REIS" },
      { classId: "Pré I B", name: "YAGO FERREIRA NETO" },
    ],
    "Pré II": [
      { classId: "Pré II A", name: "ARTHUR ALVES CHAVES" },
      { classId: "Pré II A", name: "BEATRIZ MORAES DIAS" },
      { classId: "Pré II B", name: "GABRIEL ROMEIRO SILVA" },
      { classId: "Pré II B", name: "LARA MEIRELES COSTA" },
    ],
    "1º ano": [
      { classId: "1º A", name: "ANA CLARA DE SOUZA" },
      { classId: "1º A", name: "BERNARDO MARTINS" },
      { classId: "1º B", name: "DAVID LUCAS SILVA" },
      { classId: "1º B", name: "EMILY COSTA CONCEIÇÃO" },
    ],
    "2º ano": [
      { classId: "2º A", name: "GABRIEL ALMEIDA SILVA" },
      { classId: "2º A", name: "HELENA ROMEIRO MEIRELES" },
      { classId: "2º B", name: "JOÃO PEDRO SOUZA" },
      { classId: "2º B", name: "LARA FERNANDES PINTO" },
    ],
    "3º ano": [
      { classId: "3º A", name: "MATEUS PINTO BARBOSA" },
      { classId: "3º A", name: "MANUELA FREITAS" },
      { classId: "3º B", name: "PEDRO GOMES NOGUEIRA" },
      { classId: "3º B", name: "SOPHIA MENDES DE CARVALHO" },
    ],
    "4º ano": [
      { classId: "4º A", name: "VALENTINA CARDOSO NETO" },
      { classId: "4º A", name: "YAGO BARCELLOS REIS" },
      { classId: "4º B", name: "ALICE TEIXEIRA AMARAL" },
      { classId: "4º B", name: "ENZO SILVA MOREIRA" },
    ],
    "5º ano": [
      { classId: "5º A", name: "FELIPE MONTEIRO SANTOS" },
      { classId: "5º A", name: "GIOVANNA CARAMEZ DIAS" },
      { classId: "5º B", name: "ARTHUR ALVES BRITO" },
      { classId: "5º B", name: "BEATRIZ VILAÇÃO FAGUNDES" },
    ],
    "6º ano": [
      { classId: "6º A", name: "ADRIELLY LUCIA PERES SANTOS SILVA" },
      { classId: "6º A", name: "BEATRIZ TEIXEIRA DA SILVA" },
      { classId: "6º A", name: "BERNARDO DE PAULA ARAUJO" },
      { classId: "6º A", name: "BERNARDO DONATO JAQUES SANTOS" },
      { classId: "6º A", name: "BERNARDO SILVA" },
      { classId: "6º A", name: "CATARINA FERREIRA GUIMARAES" },
      { classId: "6º A", name: "CAUÒ LIMA DOS SANTOS MAFRA" },
      { classId: "6º A", name: "CECÍLIA FERREIRA DANTAS DORIA DIAS" },
      { classId: "6º A", name: "CLARA MARIA GOMES DOS SANTOS" },
      { classId: "6º A", name: "DAVI PONTES TRIGO" },
      { classId: "6º A", name: "ENZO GABRIEL MARZOCHI ALVES" },
      { classId: "6º A", name: "HENRIQUE SANTOS CABRAL DE ANDRADE" },
      { classId: "6º A", name: "LORENZO DA SILVA COSTA" },
      { classId: "6º A", name: "LUCAS DE JESUS CORREIA" },
      { classId: "6º A", name: "MANUELLA CARDOSO MATOS" },
      { classId: "6º A", name: "MATHEUS SANTANA AIRES" },
      { classId: "6º A", name: "MIGUEL GONÇALVES GOMES DA SILVA" },
      { classId: "6º A", name: "RAPHAEL DOS SANTOS RODRIGUES" },
      { classId: "6º A", name: "SARAH VASCONCELOS MARQUES DE OLIVEIRA" },
      { classId: "6º A", name: "SOPHIA MAIROS BRAZ CARVALHO" },
      { classId: "6º A", name: "VINÍCIUS VICHI FERREIRA DE ANDRADE SILVA" },

      { classId: "6º B", name: "AGATHA VIEIRA BATISTA" },
      { classId: "6º B", name: "AGATHA XAVIER DE LIMA" },
      { classId: "6º B", name: "ALICE MALTAS SABINO DE FREITAS" },
      { classId: "6º B", name: "ALICE TORRES FAGUNDES FONSECA" },
      { classId: "6º B", name: "ANA CLARA HONORATO ACCORSINI" },
      { classId: "6º B", name: "BERNARDO SANTOS LADISLAU" },
      { classId: "6º B", name: "DANIEL MARINO ZANELLI" },
      { classId: "6º B", name: "ENZO PASCOAL RESENDE" },
      { classId: "6º B", name: "FERNANDA SOUZA BATISTA FONSECA" },
      { classId: "6º B", name: "ISABELLA RIBEIRO DE MELO" },
      { classId: "6º B", name: "LARISSA FIRMINO DOS SANTOS PEDRO" },
      { classId: "6º B", name: "LAURA FERNANDES TEIXEIRA" },
      { classId: "6º B", name: "LETÍCIA SILVA DE CAMARGO" },
      { classId: "6º B", name: "LIVIA DE CASTRO AGRA COSTA" },
      { classId: "6º B", name: "LUIZ GUSTAVO PEREIRA ALVES" },
      { classId: "6º B", name: "LUIZA SENA DE ASSIZ" },
      { classId: "6º B", name: "MANUELA SANTANA FERNANDES" },
      { classId: "6º B", name: "MARIA LUIZA BONVETI RAFANINI" },
      { classId: "6º B", name: "MICHELLI CAMILI CANDIDO GONÇALO" },
      { classId: "6º B", name: "MURILO JUVINO ALVES" },
      { classId: "6º B", name: "NICOLAS FEITOSA SANTANA" },
      { classId: "6º B", name: "NICOLLY WILLIANS FAGUNDES LIMA" },

      { classId: "6º C", name: "ARTHUR HENRIQUE DA COSTA BRITO" },
      { classId: "6º C", name: "BRYAN BOSCARDIN MARCIANO" },
      { classId: "6º C", name: "DAVI LORENZO PEREIRA NASCIMENTO" },
      { classId: "6º C", name: "ELENA APARECIDA DE SOUZA FERREIRA" },
      { classId: "6º C", name: "ELISA MIRANDA SATO" },
      { classId: "6º C", name: "GABRIEL OLIVEIRA MENDES DOS SANTOS" },
      { classId: "6º C", name: "GIULIA ARCHANJO DE MOURA" },
      { classId: "6º C", name: "GUILHERME CARVALHO DE ALMEIDA" },
      { classId: "6º C", name: "HEITOR BARBOSA ALMEIDA" },
      { classId: "6º C", name: "JAMAL HENRIQUE DA SILVA" },
      { classId: "6º C", name: "KEVYN CHRISTOPHER CONCEIÇÃO SILVA RODRIGUES" },
      { classId: "6º C", name: "LAVINIA DE OLIVEIRA SANTOS" },
      { classId: "6º C", name: "LUIZA KIYOKO WAKAI PINHO" },
      { classId: "6º C", name: "MARIA FERNANDA NOBRE BORGES" },
      { classId: "6º C", name: "MARIA LUIZA SILVA BARBOSA" },
      { classId: "6º C", name: "MATHEUS SALVADOR ROSAS" },
      { classId: "6º C", name: "MATHEUS XAVIER BRITO DO NASCIMENTO" },
      { classId: "6º C", name: "MIGUEL CORREIA SOARES DE MOURA" },
      { classId: "6º C", name: "PEDRO SANTOS DO NASCIMENTO" },
      { classId: "6º C", name: "SOPHIA DOS SANTOS DE ARRUDA OLIVEIRA" },
    ],
    "7º ano": [
      { classId: "7º A", name: "ALICE HONORATO ACCORSINI" },
      { classId: "7º A", name: "BEATRIZ DE MELO SHIMOKOMAKI GONÇALVES" },
      { classId: "7º A", name: "DAVI DE ARAUJO DA SILVA" },
      { classId: "7º A", name: "DAVI SILVA FERREIRA MENEZES" },
      { classId: "7º A", name: "ENZO PEREIRA FARO HERNANDES" },
      { classId: "7º A", name: "GABRIELA BARRIO CURÁTOLO DE MOURA FÉ" },
      { classId: "7º A", name: "GUSTAVO MENEZES PASSOS" },
      { classId: "7º A", name: "GUSTAVO SOUZA FONSECA" },
      { classId: "7º A", name: "ISABELLA SILVA SANTANA" },
      { classId: "7º A", name: "JORGE HENRIQUE GOMES DOS SANTOS" },
      { classId: "7º A", name: "KAUAN BARRADA LIMA COSME" },
      { classId: "7º A", name: "LUIZ HENRIQUE ESTEVÃO SOARES" },
      { classId: "7º A", name: "MANUELA TINEU VIEIRA ARAUJO" },
      { classId: "7º A", name: "MANUELLA DE ANDRADE MARIANO" },
      { classId: "7º A", name: "PEROLA DE SANTANA BERNARDINHO" },
      { classId: "7º A", name: "PIETRA VALENTINA LIRA MARQUES XAVIER" },
      { classId: "7º A", name: "RAPHAEL PEREIRA RIBEIRO DA FONSECA" },
      { classId: "7º A", name: "YASMIM RODRIGUES AGRA DE OLIVEIRA" },
      { classId: "7º A", name: "YASMIN SANTANA POLETO" },

      { classId: "7º B", name: "ANNA JÚLIA FRANCO SILVA" },
      { classId: "7º B", name: "BERNARDO ANDRADE FRANCO SANTOS" },
      { classId: "7º B", name: "BERNARDO RIBEIRO DA SILVA SENA" },
      { classId: "7º B", name: "BRENDA VICTORIA LIMA DA SILVA" },
      { classId: "7º B", name: "BRENO SANTOS REIS DE OLIVEIRA" },
      { classId: "7º B", name: "DAVI FELIPE DOS SANTOS PUGLIESI" },
      { classId: "7º B", name: "DAVI LIMA BALBO" },
      { classId: "7º B", name: "EDUARDO JESUS ARAÚJO DE OLIVEIRA" },
      { classId: "7º B", name: "HEITOR MARINHO DINIZ" },
      { classId: "7º B", name: "HEITOR TEIXEIRA SACRAMENTO" },
      { classId: "7º B", name: "LAYSA ALVES DE OLIVEIRA LIMA" },
      { classId: "7º B", name: "LUCAS BRITO SOUSA" },
      { classId: "7º B", name: "MANUELLA MARINO ZANELLI" },
      { classId: "7º B", name: "MARCOS VINICIUS CAVACO BROGLIA" },
      { classId: "7º B", name: "MARIA CLARA VIEIRA DA CRUZ" },
      { classId: "7º B", name: "NICOLE CORREA DE SOUZA" },
      { classId: "7º B", name: "NICOLLAS DOS SANTOS SILVA" },
      { classId: "7º B", name: "PAULO DAVI MOURA DA SILVA" },
      { classId: "7º B", name: "PEDRO OSWALDO DOS SANTOS AMARAL" },
      { classId: "7º B", name: "RAYSSA OLIVEIRA SANTOS" },
      { classId: "7º B", name: "SARAH MARCIANO DOS SANTOS" },
    ],
    "8º ano": [
      { classId: "8º A", name: "ADRIELLY RODRIGUES CARAMEZ" },
      { classId: "8º A", name: "BEATRIZ DE LACERDA VILAÇÃO SULPINO" },
      { classId: "8º A", name: "BEATRIZ OHANA DE GOUVEIA MENDONÇA" },
      { classId: "8º A", name: "DANTE MMÜLLER AGUIAR" },
      { classId: "8º A", name: "GABRIEL MENDONÇA DA SILVA" },
      { classId: "8º A", name: "GIOVANNA SANTOS GONÇALVES" },
      { classId: "8º A", name: "GUILHERME BELLINI VIEIRA CARMO" },
      { classId: "8º A", name: "IAN BARALDI AGIANI" },
      { classId: "8º A", name: "JOÃO PEDRO FERREIRA DA SILVA" },
      { classId: "8º A", name: "JOSÉ ANDRÉS BARRIOS SÁNCHEZ" },
      { classId: "8º A", name: "JULIE VITÓRIA AGUIAR CRUZ" },
      { classId: "8º A", name: "KAUAI RIOS CABRAL" },
      { classId: "8º A", name: "LUIZ FELIPE DE CASTRO AGRA COSTA" },
      { classId: "8º A", name: "MATHEUS HENRIQUE SANTOS CAMARGO" },
      { classId: "8º A", name: "MIKAELLA VITORIA PEREIRA FRANCO" },
      { classId: "8º A", name: "PIETRA VICENTE DOS SANTOS" },
      { classId: "8º A", name: "RAFAEL DOS SANTOS MACIEL" },
      { classId: "8º A", name: "SOPHIA SOUZA DELFINO" },

      { classId: "8º B", name: "AMANDA AUGUSTO DOS SANTOS MARQUES" },
      { classId: "8º B", name: "CLARA MENDES DO VALE" },
      { classId: "8º B", name: "DAVI LUIZ RIOS DA GAMA CARDOZO" },
      { classId: "8º B", name: "ENZO BARBOSA SILVA" },
      { classId: "8º B", name: "ESTHELA SANTOS ROSA" },
      { classId: "8º B", name: "ISABELLA CARDOSO PALLOTTINI COELHO" },
      { classId: "8º B", name: "JULIA VILLANI PEIXOTO DE CARVALHO" },
      { classId: "8º B", name: "KAIQUE LEONARDO PEREIRA" },
      { classId: "8º B", name: "KAUÊ CICARONI PIEMONTE" },
      { classId: "8º B", name: "KETHELLYN HELENA DA SILVA VIEIRA SOUZA" },
      { classId: "8º B", name: "LUCAS RIVELA MENDES" },
      { classId: "8º B", name: "MARIA CLARA TINEO BECK" },
      { classId: "8º B", name: "MARIA FERNANDA SILVA FERNANDES" },
      { classId: "8º B", name: "MIGUEL RODRIGUES SILVA" },
      { classId: "8º B", name: "NICOLAS RIBEIRO GOES" },
      { classId: "8º B", name: "VINICIUS BULHOES DA SILVA" },
      { classId: "8º B", name: "YURI GOMES SILVA" },
    ],
    "9º ano": [
      { classId: "9º A", name: "ARTHUR SOBRAL SARAPIO RIBEIRO" },
      { classId: "9º A", name: "ERICK DE OLIVEIRA ROCHA" },
      { classId: "9º A", name: "ESTHER ROSA FONTES" },
      { classId: "9º A", name: "FELLIPE TEIXEIRA SILVA" },
      { classId: "9º A", name: "GABRIEL CLEMENTE MAURI" },
      { classId: "9º A", name: "GABRIEL SILVEIRA LOPES" },
      { classId: "9º A", name: "GABRIELA FREIRE MATOS" },
      { classId: "9º A", name: "HELOISA TEIXEIRA SACRAMENTO" },
      { classId: "9º A", name: "HENRIQUE DOS SANTOS WALTER" },
      { classId: "9º A", name: "JOÃO VITOR RODRIGUES DA SILVA" },
      { classId: "9º A", name: "MARCELLO DE SOUZA GALDINO RODRIGUES" },
      { classId: "9º A", name: "MARIA EDUARDA CAMARGO DOS SANTOS" },
      { classId: "9º A", name: "PEDRO MIGUEL DA SILVA FERREIRA" },
      { classId: "9º A", name: "ROGER DO NASCIMENTO CASTRO DOS SANTOS" },
      { classId: "9º A", name: "SOFIA BUENO DE MELO" },
      { classId: "9º A", name: "STHEFANY XAVIER DA SILVA" },
      { classId: "9º A", name: "VALENTINA FERREIRA BARCELOS" },
      { classId: "9º A", name: "VICTORIA GARCIA CANELAS" },

      { classId: "9º B", name: "ANA LUIZA SILVEIRA DE OLIVEIRA" },
      { classId: "9º B", name: "ANNA CLARA FERREIRA DA SILVA" },
      { classId: "9º B", name: "BERNARDO LUIZ GOMES FIDELIS" },
      { classId: "9º B", name: "EMILLY SOUZA CARNEIRO" },
      { classId: "9º B", name: "ENZO TELES GONÇALVES" },
      { classId: "9º B", name: "GABRIEL SILVA DE CAMARGO" },
      { classId: "9º B", name: "GIULIA PEREIRA DE JESUS MENDONÇA" },
      { classId: "9º B", name: "GIULIA ROZADOS DE OLIVEIRA" },
      { classId: "9º B", name: "GUILHERME DONATO JAQUES DOS SANTOS" },
      { classId: "9º B", name: "JOÃO MENDONÇA DOS SANTOS" },
      { classId: "9º B", name: "JOÃO PEDRO ALVES DA SILVA" },
      { classId: "9º B", name: "KAMILLY INDAUI DE CASTRO FERREIRA" },
      { classId: "9º B", name: "LETICIA CRISTINA SOUSA CORREA" },
      { classId: "9º B", name: "LUKAS ANDRADE FERNANDES" },
      { classId: "9º B", name: "MIGUEL BARROS DA SILVA" },
      { classId: "9º B", name: "PETRICK VILLANI SILVA" },
      { classId: "9º B", name: "THIAGO BEZERRA ORIGUELA" },
      { classId: "9º B", name: "VITÓRIA ALONSO SODRÉ" },
      { classId: "9º B", name: "WILLER INÁCIO ALVES DOS SANTOS" },
    ],
  } as Record<string, Student[]>,
};

// Editor fonts for reference if needed
const EDITOR_FONTS = [
  "Arial",
  "Inter",
  "Times New Roman",
  "Courier New",
  "Georgia",
  "Verdana",
];

const BtnAlignLeft = createButton("Alinhar à Esquerda", <AlignLeft className="w-3.5 h-3.5" />, "justifyLeft");
const BtnAlignCenter = createButton("Alinhar ao Centro", <AlignCenter className="w-3.5 h-3.5" />, "justifyCenter");
const BtnAlignRight = createButton("Alinhar à Direita", <AlignRight className="w-3.5 h-3.5" />, "justifyRight");
const BtnAlignJustify = createButton("Justificar", <AlignJustify className="w-3.5 h-3.5" />, "justifyFull");

const BtnColor = createDropdown("Cor", [
  ["Preto", "foreColor", "#0f172a"],
  ["Cinza", "foreColor", "#475569"],
  ["Vermelho", "foreColor", "#dc2626"],
  ["Laranja", "foreColor", "#ea580c"],
  ["Amarelo", "foreColor", "#eab308"],
  ["Verde", "foreColor", "#16a34a"],
  ["Azul", "foreColor", "#2563eb"],
  ["Roxo", "foreColor", "#9333ea"],
  ["Rosa", "foreColor", "#db2777"],
]);

const ProfessionalEditor = ({
  value,
  onChange,
  placeholder,
  className,
  style,
  id,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
}) => {
  const storageKey = useMemo(() => {
    const cleanKey = placeholder ? placeholder.replace(/[^a-zA-Z0-9]/g, "_") : "default";
    return id ? `cps_draft_editor_${id}` : `cps_draft_editor_${cleanKey}`;
  }, [id, placeholder]);

  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [showRestoreAlert, setShowRestoreAlert] = useState(false);
  const [savedDraft, setSavedDraft] = useState<string | null>(null);
  const [showToolbar, setShowToolbar] = useState(false);

  // Check for saved draft on mount
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved && saved !== value && saved.trim() !== "" && saved !== "<p><br></p>") {
      setSavedDraft(saved);
      setShowRestoreAlert(true);
    }
  }, [storageKey]);

  // Save changes every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (value && value.trim() !== "" && value !== "<p><br></p>") {
        localStorage.setItem(storageKey, value);
        setLastSaved(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [value, storageKey]);

  // Save immediately on window close/unload or unmount to prevent loss
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (value && value.trim() !== "" && value !== "<p><br></p>") {
        localStorage.setItem(storageKey, value);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (value && value.trim() !== "" && value !== "<p><br></p>") {
        localStorage.setItem(storageKey, value);
      }
    };
  }, [value, storageKey]);

  // Clean draft when field is or becomes empty
  useEffect(() => {
    if (!value || value.trim() === "" || value === "<p><br></p>") {
      const t = setTimeout(() => {
        localStorage.removeItem(storageKey);
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [value, storageKey]);

  const handleRestore = () => {
    if (savedDraft) {
      onChange(savedDraft);
      setShowRestoreAlert(false);
      setLastSaved(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }
  };

  const handleDiscard = () => {
    localStorage.removeItem(storageKey);
    setSavedDraft(null);
    setShowRestoreAlert(false);
  };

  return (
    <div className={cn("professional-editor-wrapper", className)} style={style}>
      {showRestoreAlert && savedDraft && (
        <div className="mb-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
            <Clock className="w-4 h-4 shrink-0 animate-pulse text-amber-500" />
            <div>
              <span className="font-extrabold block">Rascunho não salvo encontrado!</span>
              <span className="opacity-80">Identificamos um rascunho anterior que foi salvo automaticamente.</span>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={handleRestore}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-md shadow-sm transition-all flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Restaurar
            </button>
            <button
              type="button"
              onClick={handleDiscard}
              className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold rounded-md transition-all cursor-pointer"
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      <EditorProvider>
        <div className="flex flex-col border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden bg-white dark:bg-slate-900 group">
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-150 dark:border-slate-800 select-none">
            <span className="text-[9px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500">
              Enunciado da Questão
            </span>
            <button
              type="button"
              onClick={() => setShowToolbar(!showToolbar)}
              className="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded text-[9px] uppercase font-black tracking-wider flex items-center gap-1.5 shadow-sm border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              <Settings className="w-3 h-3" />
              {showToolbar ? "Ocultar Formatação" : "Formatar Texto"}
            </button>
          </div>
          <Editor
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full text-slate-900 dark:text-slate-100 min-h-[150px] border-none!"
            spellCheck={true}
          >
            {showToolbar && (
              <Toolbar>
                <div className="flex flex-wrap gap-1 items-center">
                  <BtnBold />
                  <BtnItalic />
                  <BtnUnderline />
                  <BtnStrikeThrough />
                  <Separator />
                  <BtnAlignLeft />
                  <BtnAlignCenter />
                  <BtnAlignRight />
                  <BtnAlignJustify />
                  <Separator />
                  <BtnColor />
                  <Separator />
                  <BtnNumberedList />
                  <BtnBulletList />
                  <Separator />
                  <BtnClearFormatting />
                </div>
              </Toolbar>
            )}
          </Editor>
        </div>
      </EditorProvider>

      <div className="flex justify-between items-center mt-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-bold px-1 select-none">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Auto-salvamento ativo (a cada 30s)
        </div>
        {lastSaved && (
          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <Check className="w-3 h-3 font-black" />
            Rascunho salvo às {lastSaved}
          </div>
        )}
      </div>

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
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }
        .professional-editor-wrapper .rsw-btn {
          margin: 0 !important;
        }
      `}</style>
    </div>
  );
};

export function getSchoolInfo(): {
  subjects: string[];
  classes: string[];
  classShifts?: Record<string, string>;
  classModalities?: Record<string, string>;
  class_subjects: Record<string, string[]>;
  examCategories: string[];
  studentsDB: Record<string, Student[]>;
  bimesterDates?: Record<string, { startDate: string; endDate: string }>;
} {
  const saved = localStorage.getItem("schoolInfo");
  const defaultBimesterDates = {
    "1º Bimestre": { startDate: "2026-02-01", endDate: "2026-04-15" },
    "2º Bimestre": { startDate: "2026-04-16", endDate: "2026-06-30" },
    "3º Bimestre": { startDate: "2026-08-01", endDate: "2026-10-15" },
    "4º Bimestre": { startDate: "2026-10-16", endDate: "2026-12-15" }
  };

  if (saved) {
    try {
      let parsed = JSON.parse(saved);
      
      // Force migration to new updated subjects and classes
      if (parsed.classes && (parsed.classes.includes("Maternal A") || !parsed.subjects.includes("Ciências da Natureza") || parsed.subjects.includes("Português") || parsed.subjects.includes("Inglês"))) {
        localStorage.removeItem("schoolInfo");
        return {
          ...DEFAULT_SCHOOL_INFO,
          bimesterDates: defaultBimesterDates,
          classModalities: {},
          classShifts: {}
        };
      }

      let subjects = parsed.subjects || DEFAULT_SCHOOL_INFO.subjects;
      
      if (!subjects.includes("Coordenação")) {
        subjects.unshift("Coordenação");
      }
      
      // Always keep subjects alphabetically sorted
      subjects = [...subjects].sort((a, b) => a.localeCompare(b, 'pt'));
      
      let class_subjects = parsed.class_subjects || DEFAULT_SCHOOL_INFO.class_subjects;

      // Also sort each class's subjects alphabetically
      for (const cls of Object.keys(class_subjects)) {
        if (class_subjects[cls]) {
          class_subjects[cls] = [...class_subjects[cls]].sort((a, b) => a.localeCompare(b, 'pt'));
        }
      }

      return {
        subjects,
        classes: parsed.classes || DEFAULT_SCHOOL_INFO.classes,
        classShifts: parsed.classShifts || {},
        classModalities: parsed.classModalities || {},
        class_subjects,
        examCategories:
          parsed.examCategories || DEFAULT_SCHOOL_INFO.examCategories,
        studentsDB: parsed.studentsDB || DEFAULT_SCHOOL_INFO.studentsDB,
        bimesterDates: parsed.bimesterDates || defaultBimesterDates,
      };
    } catch {
      return { ...DEFAULT_SCHOOL_INFO, bimesterDates: defaultBimesterDates, classModalities: {} };
    }
  }
  return { ...DEFAULT_SCHOOL_INFO, bimesterDates: defaultBimesterDates, classModalities: {} };
}

function saveSchoolInfo(info: any) {
  // Always keep subjects alphabetically sorted
  if (info.subjects) {
    info.subjects = [...info.subjects].sort((a, b) => a.localeCompare(b, 'pt'));
  }
  if (info.class_subjects) {
    for (const cls of Object.keys(info.class_subjects)) {
      if (info.class_subjects[cls]) {
        info.class_subjects[cls] = [...info.class_subjects[cls]].sort((a, b) => a.localeCompare(b, 'pt'));
      }
    }
  }
  localStorage.setItem("schoolInfo", JSON.stringify(info));
  // Global propagation via API
  fetch("/api/admin/school-settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ schoolInfo: info }),
  })
  .then(async (res) => {
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${res.status}`);
    }
  })
  .catch((err) => {
    console.warn("Falha ao sincronizar schoolInfo global:", err);
    alert("Erro ao salvar no servidor: " + err.message + "\n\nSuas alterações ficaram salvas temporariamente no seu navegador, mas NÃO estão salvas no banco de dados.");
  });
  
  // Real-time propagation via Supabase
  (async () => {
    try {
      const { error } = await supabase
        .from("school_settings")
        .upsert(
          {
            key: "school_info",
            data: info,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );
      if (error) {
        console.warn("Falha ao sincronizar no Supabase:", error.message);
      }
    } catch (err) {
      console.warn("Erro ao chamar Supabase upsert:", err);
    }
  })();

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("schoolInfoUpdated"));
  }
}

function getClassSegment(className: string, classModalities?: Record<string, string>): string {
  const mappers = classModalities || getSchoolInfo()?.classModalities;
  if (mappers && mappers[className]) {
    const mod = mappers[className];
    if (mod === "infantil") return "Educação Infantil";
    if (mod === "fund1") return "Ensino Fundamental I";
    if (mod === "fund2") return "Ensino Fundamental II";
  }

  const c = className.toLowerCase();
  
  if (c.includes("maternal") || c.includes("jardim") || c.includes("pré ") || c.includes("pre ") || c.includes("infantil")) {
    return "Educação Infantil";
  }
  
  if (c.includes("1º") || c.includes("2º") || c.includes("3º") || c.includes("4º") || c.includes("5º")) {
    return "Ensino Fundamental I";
  }
  
  if (c.includes("6º") || c.includes("7º") || c.includes("8º") || c.includes("9º")) {
    return "Ensino Fundamental II";
  }
  
  if (c.includes("1ª") || c.includes("2ª") || c.includes("3ª") || c.includes("médio") || c.includes("medio")) {
    return "Ensino Médio";
  }
  
  return "Outras Turmas";
}

function renderClassOptions(classes: string[], classModalities?: Record<string, string>) {
  const grouped: Record<string, string[]> = {
    "Educação Infantil": [],
    "Ensino Fundamental I": [],
    "Ensino Fundamental II": [],
    "Ensino Médio": [],
    "Outras Turmas": []
  };

  classes.forEach(c => {
    grouped[getClassSegment(c, classModalities)].push(c);
  });

  return Object.entries(grouped)
    .filter(([_, list]) => list.length > 0)
    .map(([segment, list]) => (<optgroup key={segment} label={segment}>{list.map(c => (<option key={c} value={c}>{c}</option>))}</optgroup>));
}

const getTabAnimation = (v: string, enabled: boolean) => {
  if (!enabled) {
    return {
      initial: { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 },
      animate: { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 },
      exit: { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 },
      transition: { duration: 0.001 },
    };
  }

  switch (v) {
    case "dashboard":
      // Bouncing in from left like a school bus pulls into the station.
      return {
        initial: { opacity: 0, x: -120, y: 15, scale: 0.96, rotate: -2 },
        animate: {
          opacity: 1,
          x: 0,
          y: 0,
          scale: 1,
          rotate: 0,
          transition: {
            type: "spring",
            stiffness: 140,
            damping: 12,
            mass: 0.9,
          },
        },
        exit: {
          opacity: 0,
          x: 120,
          scale: 0.96,
          rotate: 2,
          transition: { duration: 0.2, ease: "easeIn" },
        },
      };
    case "banco_provas":
      // Armored security bus delivering exam safes - vertical slide like heavy garage door security
      return {
        initial: { opacity: 0, y: -100, scale: 0.95 },
        animate: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            type: "spring",
            stiffness: 160,
            damping: 15,
          },
        },
        exit: {
          opacity: 0,
          y: 100,
          scale: 0.95,
          transition: { duration: 0.2 },
        },
      };
    case "create":
      // Assembly line heavy cargo truck delivery - drop down from above
      return {
        initial: { opacity: 0, y: -70, rotate: 1 },
        animate: {
          opacity: 1,
          y: 0,
          rotate: 0,
          transition: {
            type: "spring",
            stiffness: 180,
            damping: 14,
          },
        },
        exit: { opacity: 0, y: 70, rotate: -1, transition: { duration: 0.2 } },
      };
    case "comunicados":
      // Loudspeaker bus vibrating animation bouncy entry as if talking
      return {
        initial: { opacity: 0, scale: 0.93, x: 80 },
        animate: {
          opacity: 1,
          scale: [0.93, 1.03, 0.98, 1.01, 1],
          x: 0,
          transition: {
            duration: 0.45,
            ease: "easeInOut",
          },
        },
        exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
      };
    case "studentReports":
      // Diagnostics stop-by-stop sequencing of stats!
      return {
        initial: { opacity: 0, x: 150, scale: 0.97 },
        animate: {
          opacity: 1,
          x: 0,
          scale: 1,
          transition: {
            type: "spring",
            stiffness: 130,
            damping: 14,
          },
        },
        exit: {
          opacity: 0,
          x: -150,
          scale: 0.97,
          transition: { duration: 0.2 },
        },
      };
    case "diary":
      // Attendance book/logbook open-page 3D swing transition
      return {
        initial: {
          opacity: 0,
          rotateY: -30,
          x: -50,
          transformOrigin: "left center",
        },
        animate: {
          opacity: 1,
          rotateY: 0,
          x: 0,
          transition: {
            duration: 0.38,
            ease: "easeOut",
          },
        },
        exit: { opacity: 0, rotateY: 20, transition: { duration: 0.18 } },
      };
    case "cronograma":
      // Time-travel scheduling bus clockwork calendar slide-up
      return {
        initial: { opacity: 0, y: 150, rotate: -0.5 },
        animate: {
          opacity: 1,
          y: 0,
          rotate: 0,
          transition: {
            type: "spring",
            stiffness: 150,
            damping: 13,
          },
        },
        exit: { opacity: 0, y: -150, transition: { duration: 0.2 } },
      };
    case "settings":
      // Mechanic car platform raising up smoothly
      return {
        initial: { opacity: 0, y: 140, scale: 0.98 },
        animate: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            type: "spring",
            stiffness: 120,
            damping: 16,
          },
        },
        exit: { opacity: 0, y: -140, transition: { duration: 0.2 } },
      };
    case "admin":
      // Royal state carriage carriage slide with bounce
      return {
        initial: { opacity: 0, scale: 0.92, y: 60 },
        animate: {
          opacity: 1,
          scale: 1,
          y: 0,
          transition: {
            type: "spring",
            stiffness: 140,
            damping: 15,
          },
        },
        exit: {
          opacity: 0,
          scale: 0.92,
          y: -60,
          transition: { duration: 0.2 },
        },
      };
    case "error_report":
    case "error_admin":
      // Emergency response tow truck with rapid flashy slide
      return {
        initial: { opacity: 0, x: -180, skewX: -4 },
        animate: {
          opacity: 1,
          x: 0,
          skewX: 0,
          transition: {
            type: "spring",
            stiffness: 180,
            damping: 12,
          },
        },
        exit: { opacity: 0, x: 180, transition: { duration: 0.15 } },
      };
    default:
      return {
        initial: { opacity: 0, scale: 0.98, y: 15 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.98, y: -15 },
        transition: { duration: 0.22 },
      };
  }
};

// Animated Fire Icon helper component using Framer Motion
const FlameNewBadge = () => {
  return (
    <span className="relative inline-flex items-center justify-center ml-2.5 select-none w-8 h-5">
      {/* Outer glow flame */}
      <motion.span
        animate={{
          scale: [1, 1.2, 0.95, 1.25, 1],
          opacity: [0.4, 0.7, 0.3, 0.8, 0.4],
          skewY: [0, 2, -2, 3, 0],
        }}
        transition={{
          duration: 1.2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute text-red-500 blur-[2px] w-8 h-5 flex items-center justify-center"
      >
        <Flame className="w-6.5 h-6.5 fill-red-500" />
      </motion.span>
      
      {/* Middle flame */}
      <motion.span
        animate={{
          scale: [1, 1.1, 0.9, 1.15, 1],
          y: [0, -2, 0.5, -3, 0],
          skewX: [0, -2, 2, -3, 0],
        }}
        transition={{
          duration: 0.9,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.1,
        }}
        className="absolute text-orange-500 w-8 h-5 flex items-center justify-center"
      >
        <Flame className="w-5.5 h-5.5 fill-orange-500" />
      </motion.span>

      {/* Inner core flame */}
      <motion.span
        animate={{
          scale: [1, 1.05, 1, 1.1, 1],
          y: [0, -1, 0, -1.5, 0],
        }}
        transition={{
          duration: 0.7,
          repeat: Infinity,
          ease: "linear",
          delay: 0.2,
        }}
        className="absolute text-yellow-400 w-8 h-5 flex items-center justify-center"
      >
        <Flame className="w-4.5 h-4.5 fill-yellow-400" />
      </motion.span>

      {/* NEW text styled like glowing embers, overlaid on top of the flames */}
      <motion.span
        animate={{
          color: ["#fef08a", "#f97316", "#ef4444", "#f97316", "#fef08a"],
          textShadow: [
            "0 0 3px #ef4444, 0 0 8px #f97316",
            "0 0 5px #ef4444, 0 0 12px #f59e0b",
            "0 0 2px #b91c1c, 0 0 6px #ef4444",
            "0 0 5px #ef4444, 0 0 12px #f59e0b",
            "0 0 3px #ef4444, 0 0 8px #f97316",
          ],
        }}
        transition={{
          duration: 0.8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="relative z-10 text-[9px] font-black uppercase tracking-widest leading-none"
      >
        NEW
      </motion.span>
    </span>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [backupStatus, setBackupStatus] = useState<any>(null);

  useEffect(() => {
    fetch("/api/backup/status")
      .then(res => res.json())
      .then(data => {
        if (data && data.success) {
          setBackupStatus(data);
        }
      })
      .catch(err => console.warn("Erro ao obter status do backup:", err));
  }, []);
  const [syncStatus, setSyncStatus] = useState<any>(null);

  useEffect(() => {
    const handleSyncStatus = (e: any) => {
      setSyncStatus(e.detail);
      if (e.detail?.status === "success") {
        setTimeout(() => setSyncStatus(null), 5000);
      }
    };
    window.addEventListener("cps_sync_status", handleSyncStatus);
    return () => window.removeEventListener("cps_sync_status", handleSyncStatus);
  }, []);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('cps_dark_mode');
    if (saved !== null) {
      return saved === 'true';
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    localStorage.setItem('cps_dark_mode', String(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      // Only change if user hasn't explicitly set a preference
      if (localStorage.getItem('cps_dark_mode') === null) {
        setIsDarkMode(e.matches);
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Eduardo migration - runs only once (guarded by localStorage flag)
  useEffect(() => {
    if (localStorage.getItem('cps_migration_v2_done')) return;
    const runMigration = async () => {
      localStorage.setItem('cps_migration_v2_done', '1');
      try {
        const info = getSchoolInfo();
        let changed = false;
        if (!info.subjects.includes("CIÊNCIAS DA NATUREZA")) {
          info.subjects.push("CIÊNCIAS DA NATUREZA");
          changed = true;
        }
        
        info.class_subjects = info.class_subjects || {};
        
        const ciencClasses = ["6º A", "6º B", "6º C", "7º A", "7º B", "8º A", "8º B"];
        for (const c of ciencClasses) {
          if (!info.class_subjects[c]) info.class_subjects[c] = [];
          if (!info.class_subjects[c].includes("CIÊNCIAS DA NATUREZA")) {
            info.class_subjects[c].push("CIÊNCIAS DA NATUREZA");
            changed = true;
          }
        }
        
        const qfbClasses = ["9º A", "9º B"];
        const qfbSubjects = ["QUÍMICA", "FÍSICA", "BIOLOGIA"];
        for (const c of qfbClasses) {
          if (!info.class_subjects[c]) info.class_subjects[c] = [];
          for (const s of qfbSubjects) {
            if (!info.class_subjects[c].includes(s)) {
              info.class_subjects[c].push(s);
              changed = true;
            }
          }
        }
        
        if (changed) {
          saveSchoolInfo(info);
        }

        // Espanhol in all classes
        let espanholChanged = false;
        if (!info.subjects.includes("ESPANHOL")) {
          info.subjects.push("ESPANHOL");
          espanholChanged = true;
        }

        for (const c of info.classes) {
          if (!info.class_subjects[c]) {
             info.class_subjects[c] = [...info.subjects];
             espanholChanged = true;
          }
          if (!info.class_subjects[c].includes("ESPANHOL")) {
             info.class_subjects[c].push("ESPANHOL");
             espanholChanged = true;
          }
        }

        if (espanholChanged) {
          saveSchoolInfo(info);
        }

        // Update eduardo
        const { data: users, error } = await supabase.from('users').select('*').ilike('email', '%eduardo%');
        const adminNames = await supabase.from('users').select('*').ilike('professional_name', '%eduardo%');
        const allEduardos = [...(users || []), ...(adminNames.data || [])];
        const unique = Array.from(new Set(allEduardos.map(u => u.uid)))
                             .map(uid => allEduardos.find(u => u.uid === uid));

        if (unique.length > 0) {
          for (const eduardo of unique) {
             if (!eduardo) continue;
             const assigned_classes = eduardo.assigned_classes || [];
             const assigned_subjects = eduardo.assigned_subjects || [];
             let uChanged = false;
             
             const targetClasses = ["6º A", "6º B", "6º C", "7º A", "7º B", "8º A", "8º B", "9º A", "9º B"];
             for (const tc of targetClasses) {
                if (!assigned_classes.includes(tc)) {
                   assigned_classes.push(tc);
                   uChanged = true;
                }
             }
             
             const targetSubjects = ["CIÊNCIAS DA NATUREZA", "QUÍMICA", "FÍSICA", "BIOLOGIA"];
             for (const ts of targetSubjects) {
                if (!assigned_subjects.includes(ts)) {
                   assigned_subjects.push(ts);
                   uChanged = true;
                }
             }
             
             if (uChanged) {
                await supabase.from('users').update({
                   assigned_classes,
                   assigned_subjects
                }).eq('uid', eduardo.uid);
             }
          }
        }

        // update daniella
        const { data: daniUsers } = await supabase.from('users').select('*').ilike('professional_name', '%daniella%');
        if (daniUsers && daniUsers.length > 0) {
           for (const dani of daniUsers) {
              const assigned_subjects = dani.assigned_subjects || [];
              let uChanged = false;
              const targetSubjects = ["PORTUGUÊS", "LÍNGUA PORTUGUESA"];
              
              for (const ts of targetSubjects) {
                if (!info.subjects.includes(ts)) {
                  info.subjects.push(ts);
                  saveSchoolInfo(info);
                }

                let upperSubjects = assigned_subjects.map(s => s.toUpperCase());
                if (!upperSubjects.includes(ts)) {
                   assigned_subjects.push(ts);
                   uChanged = true;
                }
              }

              if (uChanged) {
                 await supabase.from('users').update({
                    assigned_subjects
                 }).eq('uid', dani.uid);
              }
           }
        }

      } catch (err) {
        console.warn("Eduardo migration failed", err);
      }
    };
    runMigration();

    // v3 migration: split "Biologia, Química e Física" into separate subjects
    if (!localStorage.getItem('cps_migration_v3_done')) {
      localStorage.setItem('cps_migration_v3_done', '1');
      try {
        const info = getSchoolInfo();
        let changed = false;

        const combined = "Biologia, Química e Física";
        const newSubjects = ["Biologia", "Química", "Física"];

        // Remove combined from global subjects, add individual ones
        if (info.subjects.includes(combined)) {
          info.subjects = info.subjects.filter(s => s !== combined);
          for (const ns of newSubjects) {
            if (!info.subjects.includes(ns)) {
              info.subjects.push(ns);
              changed = true;
            }
          }
        }

        // Update class_subjects: replace combined with individual, normalize uppercase ones
        for (const cls of info.classes) {
          const cs = info.class_subjects[cls];
          if (!cs) continue;
          const origLen = cs.length;

          // Remove the old combined entry
          const filtered = cs.filter(s => s !== combined);
          // Remove uppercase versions (QUÍMICA, FÍSICA, BIOLOGIA) if present
          const clean = filtered.filter(s => {
            const u = s.toUpperCase();
            return u !== "QUÍMICA" && u !== "FÍSICA" && u !== "BIOLOGIA";
          });

          // Add the new properly capitalized entries (if not already present)
          for (const ns of newSubjects) {
            if (!clean.includes(ns)) {
              clean.push(ns);
            }
          }

          if (clean.length !== origLen) {
            info.class_subjects[cls] = clean;
            changed = true;
          }
        }

        // Sort subjects alphabetically
        info.subjects = [...info.subjects].sort((a, b) => a.localeCompare(b, 'pt'));
        for (const cls of Object.keys(info.class_subjects || {})) {
          if (info.class_subjects[cls]) {
            info.class_subjects[cls] = [...info.class_subjects[cls]].sort((a, b) => a.localeCompare(b, 'pt'));
          }
        }

        if (changed) {
          saveSchoolInfo(info);
        }

        // Update Eduardo's assigned_subjects in the database
        (async () => {
          try {
            const { data: users } = await supabase.from('users').select('*').ilike('email', '%eduardo%');
            const adminNames = await supabase.from('users').select('*').ilike('professional_name', '%eduardo%');
            const allEduardos = [...(users || []), ...(adminNames.data || [])];
            const unique = Array.from(new Set(allEduardos.map(u => u.uid)))
                               .map(uid => allEduardos.find(u => u.uid === uid));
            for (const eduardo of unique) {
              if (!eduardo) continue;
              const subj = eduardo.assigned_subjects || [];
              let changed2 = false;

              const idx = subj.indexOf("Biologia, Química e Física");
              if (idx !== -1) {
                subj.splice(idx, 1, "Biologia", "Química", "Física");
                changed2 = true;
              }

              // Replace uppercase versions if present
              const upperMap: Record<string, string> = { "QUÍMICA": "Química", "FÍSICA": "Física", "BIOLOGIA": "Biologia" };
              for (const [oldUp, newCap] of Object.entries(upperMap)) {
                const ui = subj.indexOf(oldUp);
                if (ui !== -1) {
                  subj[ui] = newCap;
                  changed2 = true;
                }
              }

              if (changed2) {
                await supabase.from('users').update({ assigned_subjects: subj }).eq('uid', eduardo.uid);
              }
            }
          } catch (e) {
            console.warn("v3 eduardo update failed", e);
          }
        })();
      } catch (err) {
        console.warn("v3 subject split migration failed", err);
      }
    }

    // Initialize empty Agenda Messages if not present
    try {
      const agendaStored = localStorage.getItem("cps_agenda_messages");
      if (agendaStored === null) {
        localStorage.setItem("cps_agenda_messages", JSON.stringify([]));
      }
    } catch (e) {
      console.warn("Agenda initialization failed", e);
    }
  }, []);

  const [familySession, setFamilySession] = useState<{ student: Student; role: string } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('family_session_v1');
    if (saved) {
      try {
        setFamilySession(JSON.parse(saved));
      } catch (err) {}
    }
    // Register SW for push notifications
    import('./lib/notifications').then(({ registerServiceWorker }) => {
      registerServiceWorker();
    });
  }, []);

  const handleFamilyLogin = (student: Student, role: string) => {
    const session = { student, role };
    setFamilySession(session);
    localStorage.setItem('family_session_v1', JSON.stringify(session));
  };

  const handleFamilyLogout = () => {
    setFamilySession(null);
    localStorage.removeItem('family_session_v1');
  };

  const handleFamilySignReport = async (reportId: string, guardianName: string, signatureText: string) => {
    try {
      const { error } = await supabase
        .from("student_reports")
        .update({
          parent_signature: signatureText,
          parent_signature_at: new Date().toISOString()
        })
        .eq("id", reportId);

      if (error) {
        console.error("Error signing report on Database:", error);
      } else {
        // Optimistically update studentReports list so it reflects changes immediately in state!
        setStudentReports(prev =>
          prev.map(r => r.id === reportId ? {
            ...r,
            parentSignature: signatureText,
            parentSignatureAt: new Date().toISOString()
          } : r)
        );
      }
    } catch (e) {
      console.error("Signature DB sync error:", e);
    }
  };

  // States for comical school bus login/logoff transition
  const [showBusAnim, setShowBusAnim] = useState(false);
  const [busText, setBusText] = useState("A caminho da escola! 🚌🎒 ");
  const prevUserRef = useRef<User | null>(null);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    // Disabled school bus animation triggers to respect user request and avoid irritation
  }, []);

  // Sync Global School Settings
  useEffect(() => {
    fetch("/api/admin/school-settings")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success && data.schoolInfo) {
          localStorage.setItem("schoolInfo", JSON.stringify(data.schoolInfo));
          setRefreshTrigger((prev) => prev + 1); // trigger react update
        }
      })
      .catch((err) => console.warn("Falha ping school settings:", err));

    const subChannelName = `school_settings_realtime_${Math.random().toString(36).substring(7)}`;
    const schoolSettingsSub = supabase
      .channel(subChannelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "school_settings" },
        (payload: any) => {
          if (payload.new && payload.new.key === "school_info") {
            const newInfo = payload.new.data;
            const currentStr = localStorage.getItem("schoolInfo");
            const newStr = JSON.stringify(newInfo);
            if (currentStr !== newStr) {
              localStorage.setItem("schoolInfo", newStr);
              setRefreshTrigger((prev) => prev + 1);
              window.dispatchEvent(new Event("schoolInfoUpdated"));
            }
          }
        }
      )
      .subscribe();

    const handleLocalUpdate = () => setRefreshTrigger((prev) => prev + 1);
    window.addEventListener("schoolInfoUpdated", handleLocalUpdate);
    return () => {
      window.removeEventListener("schoolInfoUpdated", handleLocalUpdate);
      supabase.removeChannel(schoolSettingsSub);
    };
  }, []);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isWorldCupTheme, setIsWorldCupTheme] = useState(() => {
    return localStorage.getItem('cps_world_cup_theme') !== 'false';
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [view, setView] = useState<
    | "dashboard"
    | "create"
    | "reports"
    | "admin"
    | "schedule"
    | "print"
    | "studentReports"
    | "printReport"
    | "boletim"
    | "diary"
    | "cronograma"
    | "settings"
    | "banco_provas"
    | "error_report"
    | "error_admin"
  >(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "");
      const validViews = [
        "dashboard",
        "create",
        "reports",
        "admin",
        "ti",
        "schedule",
        "print",
        "studentReports",
        "printReport",
        "boletim",
        "diary",
        "diary-reports",
        "cronograma",
        "settings",
        "banco_provas",
        "comunicados",
      ];
      if (hash && validViews.includes(hash)) {
        return hash as any;
      }
    }
    return "dashboard";
  });

  const [busAnimationsEnabled, setBusAnimationsEnabled] = useState(() => {
    return localStorage.getItem("cps_bus_animations_enabled") !== "false";
  });

  useEffect(() => {
    localStorage.setItem(
      "cps_bus_animations_enabled",
      String(busAnimationsEnabled),
    );
  }, [busAnimationsEnabled]);

  const [transitioningView, setTransitioningView] =
    useState<string>("dashboard");

  const prevViewRef = useRef(view);
  useEffect(() => {
    if (prevViewRef.current !== view) {
      setTransitioningView(view);
      prevViewRef.current = view;
    }
  }, [view]);

  const [backToView, setBackToView] = useState<"dashboard" | "banco_provas">(
    "banco_provas",
  );
  const [bancoProvasInitialTab, setBancoProvasInitialTab] = useState<"Provas" | "Atividades">("Provas");
  const [selectedPrintExam, setSelectedPrintExam] = useState<Exam | null>(null);
  const [selectedReportForPrint, setSelectedReportForPrint] =
    useState<StudentReport | null>(null);
  const [multipleReportsToPrint, setMultipleReportsToPrint] = useState<
    StudentReport[]
  >([]);
  const [examToEdit, setExamToEdit] = useState<Exam | null>(null);
  const [loadingFullExam, setLoadingFullExam] = useState(false);

  const loadFullExam = async (examId: string): Promise<Exam | null> => {
    // Helper to build exam object from raw data
    const buildExam = (data: any): Exam => {
      const meta = data.answer_key?._metadata || {};
      return {
        ...data,
        answerKey: data.answer_key || data.answerKey,
        studyGuide: data.study_guide || data.studyGuide,
        professorId: data.professor_id || data.professorId,
        examType: data.exam_type || data.examType || meta.examType,
        examDate: data.exam_date || data.examDate || meta.examDate,
        examTime: data.exam_time || data.examTime || meta.examTime,
        classYear: data.class_year || data.classYear || meta.classYear,
        fontSize: meta.fontSize || data.fontSize,
        fontFamily: meta.fontFamily || data.fontFamily,
        content: data.content || meta.content || data.study_guide || data.studyGuide,
        createdAt: data.created_at || data.createdAt,
        isDiaryOnly: meta.isDiaryOnly === true || data.isDiaryOnly === true,
        isAnnouncement:
          (meta.isAnnouncement === true ||
            (data.exam_type || data.examType) === "Recado" ||
            data.subject === "Coordenação") &&
          !(Array.isArray(data.questions) && data.questions.length > 0),
        deletedAt: meta.deletedAt || data.deletedAt || null,
      };
    };

    try {
      const { data, error } = await supabase
        .from("exams")
        .select("*")
        .eq("id", examId)
        .single();
      if (error) throw error;
      if (data) {
        return buildExam(data);
      }
    } catch (err) {
      console.error("Erro ao carregar conteúdo da prova (tentando cache offline):", err);

      // ── OFFLINE FALLBACK: Search in cached exams (prefer offline_exams.json for full data) ──
      try {
        // First try the localStorage cache
        const cachedExamsStr = localStorage.getItem("cps_cached_exams");
        if (cachedExamsStr) {
          const cachedExams = JSON.parse(cachedExamsStr);
          const found = cachedExams.find((e: any) => e.id === examId);
          if (found && Array.isArray(found.questions) && found.questions.length > 0) {
            console.warn("[OFFLINE] Loaded exam from local cache (with questions):", examId);
            return buildExam(found);
          }
          // Cache has exam but no questions — try offline_exams.json directly
          if (found) {
            console.warn("[OFFLINE] Cache exam has no questions, trying offline_exams.json...");
          }
        }
      } catch (cacheErr) {
        console.error("Erro ao buscar prova no cache local:", cacheErr);
      }

      // Try loading directly from offline_exams.json
      try {
        const res = await fetch("/offline_exams.json");
        if (res.ok) {
          const offlineExams = await res.json();
          const found = offlineExams.find((e: any) => e.id === examId);
          if (found) {
            console.warn("[OFFLINE] Loaded exam from offline_exams.json:", examId);
            return buildExam(found);
          }
        }
      } catch (fetchErr) {
        console.error("Erro ao buscar prova no offline_exams.json:", fetchErr);
      }
    }
    return null;
  };
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [exams, setExams] = useState<Exam[]>(() => {
    try {
      const cached = localStorage.getItem("cps_cached_exams");
      return cached ? JSON.parse(cached) : [];
    } catch (_) {
      return [];
    }
  });
  const [showNotificationsDropdown, setShowNotificationsDropdown] =
    useState(false);
  const [bellBadgeCleared, setBellBadgeCleared] = useState(false);
  const notificationsDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleNotificationsOutside(event: MouseEvent) {
      if (
        notificationsDropdownRef.current &&
        !notificationsDropdownRef.current.contains(event.target as Node)
      ) {
        setShowNotificationsDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleNotificationsOutside);
    return () => {
      document.removeEventListener("mousedown", handleNotificationsOutside);
    };
  }, []);
  const [results, setResults] = useState<Result[]>(() => {
    try {
      const cached = localStorage.getItem("cps_cached_results");
      return cached ? JSON.parse(cached) : [];
    } catch (_) {
      return [];
    }
  });
  const [studentReports, setStudentReports] = useState<StudentReport[]>(() => {
    try {
      const cached = localStorage.getItem("cps_cached_student_reports");
      return cached ? JSON.parse(cached) : [];
    } catch (_) {
      return [];
    }
  });
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [professors, setProfessors] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem("cps_cached_professors");
      return cached ? JSON.parse(cached) : [];
    } catch (_) {
      return [];
    }
  });
  const [examBeingReassigned, setExamBeingReassigned] = useState<Exam | null>(
    null,
  );

  const [duplicatingExam, setDuplicatingExam] = useState<Exam | null>(null);
  const [dupClass, setDupClass] = useState("");
  const [dupBimester, setDupBimester] = useState("");
  const [dupExamType, setDupExamType] = useState("");
  const [dupExamDate, setDupExamDate] = useState("");

  const isAuthorizedInApp = (cls: string = "", sub: string = "") => {
    if (isAdmin) return true;
    const assignedSubjects = userProfile?.assigned_subjects || [];
    const assignedClasses = userProfile?.assigned_classes || [];
    
    const normalize = (s: string) => {
      if (!s) return "";
      return s.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/lingua\s+/gi, "")
        .replace(/estrangeira\s*-\s*/gi, "")
        .trim();
    };

    const normSub = normalize(sub);
    const hasSubject = assignedSubjects.some((asSub: string) => {
      const normAsSub = normalize(asSub);
      return normAsSub === normSub || 
             normAsSub.startsWith(normSub) || 
             normSub.startsWith(normAsSub) || 
             normAsSub.includes(normSub) || 
             normSub.includes(normAsSub);
    });

    const hasClass = assignedClasses.includes(cls);
    return hasSubject && hasClass;
  };

  const handleStartDuplicate = async (exam: Exam) => {
    setLoadingFullExam(true);
    const full = await loadFullExam(exam.id);
    setLoadingFullExam(false);
    if (full) {
      setDuplicatingExam(full);
      setDupClass(full.classYear || (full as any).class_year || "");
      setDupBimester(full.bimester || "1º Bimestre");
      setDupExamType(full.examType || (full as any).exam_type || "PI");
      setDupExamDate(new Date().toISOString().split("T")[0]);
    } else {
      alert("Não foi possível carregar a prova para duplicação.");
    }
  };

  const [isAntonioEggActive, setIsAntonioEggActive] = useState(false);
  const [initialDiaryConfig, setInitialDiaryConfig] = useState<{
    class: string;
    subject: string;
  } | null>(null);

  useEffect(() => {
    if (!familySession) return;

    const loadFamilyPortalData = async () => {
      try {
        const { data } = await supabase.from("lessons").select("*");
        if (data) {
          const mapped: Lesson[] = data.map((l: any) => ({
            id: l.id,
            professor_id: l.professor_id || "",
            class_id: l.class_id || "",
            subject: l.subject || "",
            bimester: l.bimester || "1º Bimestre",
            date: l.date || "",
            content: l.content || l.title || l.description || "",
            lesson_count: l.lesson_count || 1,
            created_at: l.created_at || ""
          }));
          setLessons(mapped);
          localStorage.setItem("cps_cached_lessons", JSON.stringify(mapped));
        }
      } catch (e) {}

      try {
        const { data } = await supabase.from("attendance").select("*");
        if (data) {
          const mapped: Attendance[] = data.map((a: any) => ({
            id: a.id,
            lessonId: a.lesson_id,
            studentName: a.student_name,
            status: a.status,
            student_name: a.student_name,
            lesson_id: a.lesson_id
          }));
          setAttendanceRecords(mapped);
          localStorage.setItem("cps_cached_attendance", JSON.stringify(mapped));
        }
      } catch (e) {}

      try {
        const { data } = await supabase.from("exams").select("id, subject, title, bimester, exam_date, max_score, answer_key");
        if (data) {
          const mapped = data.map((e: any) => {
            const meta = e.answer_key?._metadata || {};
            return {
              id: e.id,
              subject: e.subject,
              title: e.title,
              bimester: e.bimester || "1º Bimestre",
              examDate: e.exam_date,
              maxScore: e.max_score || 10,
              deletedAt: meta.deletedAt || null,
              questions: e.questions || [],
            };
          });
          setExams(mapped);
        }
      } catch (e) {}

      try {
        const { data } = await supabase.from("results").select("*");
        if (data) {
          const mapped = data.map((r: any) => ({
            id: r.id,
            examId: r.exam_id,
            score: r.points,
            maxScore: r.total_points,
            studentName: r.student_name,
            bimester: r.bimester,
            feedback: r.feedback
          }));
          setResults(mapped);
        }
      } catch (e) {}

      try {
        const { data } = await supabase.from("student_reports").select("*");
        if (data) {
          let cachedProfs: any[] = [];
          try {
            const stored = localStorage.getItem("cps_cached_professors");
            if (stored) cachedProfs = JSON.parse(stored);
          } catch (e) {}

          const mappedReports = data.map((r: any) => {
            let profName = "Professor";
            const matchedProf = cachedProfs.find((p: any) => p.id === r.professor_id || p.uid === r.professor_id);
            
            let rawProfName = "Professor";
            if (matchedProf) {
              rawProfName = matchedProf.professional_name || matchedProf.name || matchedProf.email?.split("@")[0] || "Professor";
            }
            
            // Format name to "Title + First + Last"
            const parts = rawProfName.split(" ").filter((p: string) => p.trim() !== "");
            if (parts.length > 2) {
              let firstIndex = 0;
              const lowerTitles = ["prof", "prof.", "profa", "profa.", "professor", "professora", "dr", "dr.", "dra", "dra."];
              while (firstIndex < parts.length && lowerTitles.includes(parts[firstIndex].toLowerCase())) {
                firstIndex++;
              }
              if (firstIndex < parts.length - 1) {
                const firstName = parts[firstIndex];
                const lastName = parts[parts.length - 1];
                const titles = firstIndex > 0 ? parts.slice(0, firstIndex).join(" ") + " " : "";
                profName = titles + firstName + " " + lastName;
              } else {
                profName = parts.join(" ");
              }
            } else {
              profName = parts.join(" ");
            }

            return {
              id: r.id,
              studentName: r.student_name,
              studentClass: r.class_name,
              subject: r.subject,
              content: r.report_text,
              professorId: r.professor_id,
              professorName: profName,
              bimester: r.bimester,
              familyPortalStatus: r.family_portal_status || 'Nao_Enviado',
              familyPortalSentAt: r.family_portal_sent_at,
              parentSignature: r.parent_signature,
              parentSignatureAt: r.parent_signature_at,
              createdAt: r.created_at,
              updatedAt: r.created_at,
            };
          });
          setStudentReports(mappedReports);
          localStorage.setItem("cps_cached_student_reports", JSON.stringify(mappedReports));
        }
      } catch (e) {}
    };

    loadFamilyPortalData();
  }, [familySession]);

  const [medicalRecords, setMedicalRecords] = useState<
    Record<string, { notes: string; fileUrl?: string }>
  >({});
  const [absenceJustifications, setAbsenceJustifications] = useState<any[]>([]);

  useEffect(() => {
    const fetchMedicalRecords = async () => {
      let loaded = false;
      try {
        const localRes = await fetch("/api/admin/get-medical-records");
        const localData = await localRes.json();
        if (localData && localData.success && localData.medicalRecords) {
          setMedicalRecords(localData.medicalRecords);
          loaded = true;
        }
      } catch (e) {
        console.warn("Could not read local medical records:", e);
      }

      try {
        const { data } = await supabase
          .from("school_settings")
          .select("data")
          .eq("key", "medical_records")
          .maybeSingle();
        if (data?.data) {
          if (!loaded) {
            setMedicalRecords(data.data);
          } else {
            setMedicalRecords((prev) => ({ ...data.data, ...prev }));
          }
        }
      } catch (subErr) {
        console.warn("Supabase medical records fetch failed:", subErr);
      }
    };

    const fetchAbsenceJustifications = async () => {
      try {
        const { data } = await supabase
          .from("school_settings")
          .select("data")
          .eq("key", "absence_justifications")
          .maybeSingle();
        if (data?.data && Array.isArray(data.data)) {
          setAbsenceJustifications(data.data);
        } else {
          const local = localStorage.getItem("cps_absence_justifications");
          if (local) {
            setAbsenceJustifications(JSON.parse(local));
          }
        }
      } catch (err) {
        console.warn("Error fetching absence justifications:", err);
        const local = localStorage.getItem("cps_absence_justifications");
        if (local) {
          setAbsenceJustifications(JSON.parse(local));
        }
      }
    };

    fetchMedicalRecords();
    fetchAbsenceJustifications();
  }, [refreshTrigger]);
  const [eggPhraseIndex, setEggPhraseIndex] = useState(0);

  const antonioPhrases = useMemo(
    () => [
      "AUTORIZADO PELO BRABO! Antônio Carlos programou cada pixel deste sistema lendário!",
      "CÉREBRO INFINITO! Diz a lenda que Antônio Carlos digita 800 palavras por minuto enquanto toma café!",
      "MISTÉRIOS DA CIÊNCIA: Este sistema roda sob leis rígidas: 90% café, 10% gênio puro de Antônio Carlos!",
      "ESTILO ÚNICO: Se este software fosse um carro, seria um foguete espacial guiado pelo próprio Antônio Carlos!",
      "MODO DEUS ATIVADO: Você clicou na marca real! Antônio Carlos abençoou sua sessão!",
      "LEVEL MAX! Antônio Carlos derrotou todos os bugs com apenas uma mão no teclado!",
    ],
    [],
  );

  const triggerAntonioEasterEgg = () => {
    setIsAntonioEggActive(true);
    setEggPhraseIndex(Math.floor(Math.random() * antonioPhrases.length));
  };

  // Filtros aplicados para segmentação de Coordenadores e Secretarias
  const filteredExams = useMemo(() => {
    if (!userProfile) return [];
    
    // Filter out soft deleted exams in standard views
    const activeExams = exams.filter((e) => !e.deletedAt);

    const roles = (userProfile.role || "professor")
      .split(",")
      .map((r: string) => r.trim());
    const isMaster = [
      "cps@cps.local",
      "karlos15704@gmail.com",
      "ti@cps.local",
    ].includes(userProfile.email?.toLowerCase());

    const hasFullAccess = roles.some(
      (r: string) =>
        [
          "admin", "ti",
          "ti",
          "suporte",
          "tecnico",
          "vice_diretor",
          "coordenador_all",
          "secretaria_all",
          "diretor",
          "diretoria",
        ].includes(r.toLowerCase()) ||
        r.toLowerCase().includes("admin") ||
        r.toLowerCase().includes("ti") ||
        r.toLowerCase().includes("suporte") ||
        r.toLowerCase().includes("diretoria") ||
        r.toLowerCase().includes("diretor"),
    );

    if (hasFullAccess || isMaster) {
      return activeExams;
    }

    if (roles.includes("coordenador_fund1")) {
      return activeExams
        .filter((e) => {
          if (e.isAnnouncement && !e.classYear) return true;
          const cls = e.classYear || e.class_year || "";
          if (!cls) return true;
          const classes = cls
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean);
          return classes.some((c) => /^[1-5]/.test(c));
        })
        .sort((a, b) =>
          (a.classYear || "").localeCompare(b.classYear || "", undefined, {
            numeric: true,
            sensitivity: "base",
          }),
        );
    }

    if (roles.includes("coordenador_fund2")) {
      return activeExams
        .filter((e) => {
          if (e.isAnnouncement && !e.classYear) return true;
          const cls = e.classYear || e.class_year || "";
          if (!cls) return true;
          const classes = cls
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean);
          return classes.some((c) => /^[6-9]/.test(c));
        })
        .sort((a, b) =>
          (a.classYear || "").localeCompare(b.classYear || "", undefined, {
            numeric: true,
            sensitivity: "base",
          }),
        );
    }

    // For standard professors, only show their own exams or those in their assigned subjects
    if (roles.includes("professor") || roles.length === 0) {
      if (!user || !userProfile) return [];
      return activeExams
        .filter((e) => {
          // Always show announcements targeted at "todos" or them
          if (e.isAnnouncement || e.examType === "Recado") {
            const targetId = e.answerKey?._metadata?.targetProfessorId;
            return (
              !targetId ||
              targetId === "todos" ||
              targetId === user.id ||
              targetId === userProfile.uid
            );
          }

          // Show their own exams
          if (e.professorId === user.id || e.professorId === userProfile.uid)
            return true;

          const assignedSubjects = (userProfile.assigned_subjects || []).map(
            (s: string) => s.toLowerCase(),
          );
          if (assignedSubjects.includes((e.subject || "").toLowerCase()))
            return true;

          return false;
        })
        .sort((a, b) => {
          // Natural Sort by Class
          const classA = a.classYear || "";
          const classB = b.classYear || "";
          const classComp = classA.localeCompare(classB, undefined, {
            numeric: true,
            sensitivity: "base",
          });
          if (classComp !== 0) return classComp;

          // Then by Date (Newest First)
          const dateA = new Date(a.created_at || a.createdAt || 0).getTime();
          const dateB = new Date(b.created_at || b.createdAt || 0).getTime();
          return dateB - dateA;
        });
    }

    return activeExams;
  }, [exams, userProfile, user]);

  const deletedExams = useMemo(() => {
    if (!userProfile) return [];
    
    // Only get soft deleted exams
    const trashedExams = exams.filter((e) => !!e.deletedAt);

    const roles = (userProfile.role || "professor")
      .split(",")
      .map((r: string) => r.trim());
    const isMaster = [
      "cps@cps.local",
      "karlos15704@gmail.com",
      "ti@cps.local",
    ].includes(userProfile.email?.toLowerCase());

    const hasFullAccess = roles.some(
      (r: string) =>
        [
          "admin", "ti",
          "ti",
          "suporte",
          "tecnico",
          "vice_diretor",
          "coordenador_all",
          "secretaria_all",
          "diretor",
          "diretoria",
        ].includes(r.toLowerCase()) ||
        r.toLowerCase().includes("admin") ||
        r.toLowerCase().includes("ti") ||
        r.toLowerCase().includes("suporte") ||
        r.toLowerCase().includes("diretoria") ||
        r.toLowerCase().includes("diretor"),
    );

    if (hasFullAccess || isMaster) {
      return trashedExams;
    }

    if (roles.includes("coordenador_fund1")) {
      return trashedExams
        .filter((e) => {
          if (e.isAnnouncement && !e.classYear) return true;
          const cls = e.classYear || e.class_year || "";
          if (!cls) return true;
          const classes = cls
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean);
          return classes.some((c) => /^[1-5]/.test(c));
        })
        .sort((a, b) =>
          (a.classYear || "").localeCompare(b.classYear || "", undefined, {
            numeric: true,
            sensitivity: "base",
          }),
        );
    }

    if (roles.includes("coordenador_fund2")) {
      return trashedExams
        .filter((e) => {
          if (e.isAnnouncement && !e.classYear) return true;
          const cls = e.classYear || e.class_year || "";
          if (!cls) return true;
          const classes = cls
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean);
          return classes.some((c) => /^[6-9]/.test(c));
        })
        .sort((a, b) =>
          (a.classYear || "").localeCompare(b.classYear || "", undefined, {
            numeric: true,
            sensitivity: "base",
          }),
        );
    }

    if (roles.includes("professor") || roles.length === 0) {
      if (!user || !userProfile) return [];
      return trashedExams
        .filter((e) => {
          if (e.isAnnouncement || e.examType === "Recado") {
            const targetId = e.answerKey?._metadata?.targetProfessorId;
            return (
              !targetId ||
              targetId === "todos" ||
              targetId === user.id ||
              targetId === userProfile.uid
            );
          }

          if (e.professorId === user.id || e.professorId === userProfile.uid)
            return true;

          const assignedSubjects = (userProfile.assigned_subjects || []).map(
            (s: string) => s.toLowerCase(),
          );
          if (assignedSubjects.includes((e.subject || "").toLowerCase()))
            return true;

          return false;
        })
        .sort((a, b) => {
          const classA = a.classYear || "";
          const classB = b.classYear || "";
          const classComp = classA.localeCompare(classB, undefined, {
            numeric: true,
            sensitivity: "base",
          });
          if (classComp !== 0) return classComp;

          const dateA = new Date(a.created_at || a.createdAt || 0).getTime();
          const dateB = new Date(b.created_at || b.createdAt || 0).getTime();
          return dateB - dateA;
        });
    }

    return trashedExams;
  }, [exams, userProfile, user]);

  const filteredResults = useMemo(() => {
    if (!userProfile) return [];
    const roles = (userProfile.role || "professor")
      .split(",")
      .map((r: string) => r.trim());
    const isMaster = [
      "cps@cps.local",
      "karlos15704@gmail.com",
      "ti@cps.local",
    ].includes(userProfile.email?.toLowerCase());

    const hasFullAccess = roles.some(
      (r: string) =>
        [
          "admin", "ti",
          "ti",
          "suporte",
          "tecnico",
          "vice_diretor",
          "coordenador_all",
          "secretaria_all",
          "diretor",
          "diretoria",
        ].includes(r.toLowerCase()) ||
        r.toLowerCase().includes("admin") ||
        r.toLowerCase().includes("ti") ||
        r.toLowerCase().includes("suporte") ||
        r.toLowerCase().includes("diretoria") ||
        r.toLowerCase().includes("diretor"),
    );

    if (hasFullAccess || isMaster) {
      return results;
    }

    if (roles.includes("coordenador_fund1")) {
      return results.filter((r) => {
        const cls = r.studentClass || r.student_class || "";
        return /^[1-5]/.test(cls);
      });
    }

    if (roles.includes("coordenador_fund2")) {
      return results.filter((r) => {
        const cls = r.studentClass || r.student_class || "";
        return /^[6-9]/.test(cls);
      });
    }

    // For standard professors, only show their own results
    if (roles.includes("professor") || roles.length === 0) {
      return results.filter((r) => {
        if (r.professorId === user.id || r.professorId === userProfile.uid)
          return true;
        // Also allow seeing results of exams in their assigned subjects
        const ex = exams.find((e) => e.id === r.examId);
        if (
          ex &&
          userProfile.assigned_subjects
            ?.map((s: string) => s.toLowerCase())
            .includes((ex.subject || "").toLowerCase())
        )
          return true;
        return false;
      });
    }

    return results;
  }, [results, userProfile]);

  const filteredStudentReports = useMemo(() => {
    if (!userProfile) return [];
    const roles = (userProfile.role || "professor")
      .split(",")
      .map((r: string) => r.trim());
    const isMaster = [
      "cps@cps.local",
      "karlos15704@gmail.com",
      "ti@cps.local",
    ].includes(userProfile.email?.toLowerCase());

    const hasSecretariaRole = roles.some((r: string) =>
      r.toLowerCase().includes("secretaria"),
    );
    const hasDiretoriaRole = roles.some(
      (r: string) =>
        r.toLowerCase().includes("diretor") ||
        r.toLowerCase().includes("diretoria"),
    );

    if (
      roles.includes("admin") ||
      roles.includes("vice_diretor") ||
      isMaster ||
      roles.includes("coordenador_all") ||
      roles.includes("secretaria_all") ||
      hasSecretariaRole ||
      hasDiretoriaRole
    ) {
      return studentReports;
    }

    if (roles.includes("coordenador_fund1")) {
      return studentReports.filter((r) => {
        const cls = r.studentClass || r.student_class || "";
        return /^[1-5]/.test(cls);
      });
    }

    if (roles.includes("coordenador_fund2")) {
      return studentReports.filter((r) => {
        const cls = r.studentClass || r.student_class || "";
        return /^[6-9]/.test(cls);
      });
    }

    // For standard professors, only show their own reports or those in their assigned subjects
    if (roles.includes("professor") || roles.length === 0) {
      const assignedSubjects = (userProfile.assigned_subjects || []).map(
        (s: string) => s.toLowerCase(),
      );
      return studentReports.filter((r) => {
        if (r.professorId === user?.id || r.professorId === userProfile.uid)
          return true;
        if (assignedSubjects.includes((r.subject || "").toLowerCase()))
          return true;
        return false;
      });
    }

    return [];
  }, [studentReports, userProfile, user]);

  // ==========================================
  // NAVIGATION HISTORY SYNC (INTERN & BROWSER NAVIGATION BACK + FORWARD)
  // Ensures browser back/forward acts as SPA tab transitions, not app exits!
  // ==========================================
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    const validViews = [
      "dashboard",
      "create",
      "reports",
      "admin", "ti",
      "schedule",
      "print",
      "studentReports",
      "printReport",
      "boletim",
      "diary",
      "diary-reports",
      "cronograma",
      "settings",
      "banco_provas",
      "comunicados",
    ];
    if (hash && validViews.includes(hash)) {
      setView(hash as any);
      window.history.replaceState({ view: hash }, "", "#" + hash);
    } else {
      window.history.replaceState({ view: "dashboard" }, "", "#dashboard");
    }
  }, []);

  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (window.history.state?.view !== view) {
      window.history.pushState({ view }, "", "#" + view);
    }
  }, [view]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.view) {
        setView(event.state.view);
      } else {
        const hash = window.location.hash.replace("#", "");
        const validViews = [
          "dashboard",
          "create",
          "reports",
          "admin", "ti",
          "schedule",
          "print",
          "studentReports",
          "printReport",
          "boletim",
          "diary",
          "diary-reports",
          "cronograma",
          "settings",
          "banco_provas",
          "comunicados",
        ];
        if (hash && validViews.includes(hash)) {
          setView(hash as any);
        }
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  // Read announcements tracking
  const [readAnnouncements, setGlobalReadAnnouncements] = useState<string[]>(
    () => {
      try {
        const stored = localStorage.getItem("cps_read_announcements");
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    },
  );

  const unreadInvolvedCount = useMemo(() => {
    if (!user) return 0;
    const dbUnreads = exams.filter((e) => {
      const hasQuestions = Array.isArray(e.questions) && e.questions.length > 0;
      const isAnn =
        (e.isAnnouncement ||
          e.examType === "Recado" ||
          e.exam_type === "Recado" ||
          e.subject === "Coordenação" ||
          e.answerKey?._metadata?.isAnnouncement === true ||
          e.answer_key?._metadata?.isAnnouncement === true) &&
        !hasQuestions;
      if (!isAnn) return false;

      if (readAnnouncements.includes(e.id)) return false;

      const meta = e.answerKey?._metadata || e.answer_key?._metadata || {};
      const targetId = meta.targetProfessorId;

      if (isAdmin) return true;

      return (
        targetId === user.id ||
        (userProfile && targetId === userProfile.uid)
      );
    }).length;

    return dbUnreads;
  }, [exams, readAnnouncements, user, isAdmin, userProfile]);

  // Auth Listener
  useEffect(() => {
    const handleAuthError = (msg: string) => {
      const lowerMsg = msg.toLowerCase();
      const isSessionError =
        lowerMsg.includes("refresh token not found") ||
        lowerMsg.includes("refresh token") ||
        lowerMsg.includes("invalid refresh token") ||
        lowerMsg.includes("invalid_grant") ||
        lowerMsg.includes("session_not_found") ||
        lowerMsg.includes("jwt expired") ||
        lowerMsg.includes("token is expired") ||
        lowerMsg.includes("session_expired") ||
        lowerMsg.includes("authsessionmissingerror");

      if (isSessionError) {
        console.warn(
          "Critical Auth Error detected, performing emergency state cleanup:",
          msg,
        );
        try {
          // Robust storage purge
          const allKeys = Object.keys(localStorage);
          allKeys.forEach((key) => {
            if (
              key.startsWith("sb-") ||
              key.includes("auth-token") ||
              key === "cps_cached_profile" ||
              key.includes("supabase.auth.token") ||
              key.includes("supabase") ||
              key.includes("auth")
            ) {
              localStorage.removeItem(key);
            }
          });

          // Clear session storage too
          sessionStorage.clear();

          // Attempt to clear specific Supabase cookies if any (cannot easily clear all, but common ones)
          document.cookie.split(";").forEach((c) => {
            document.cookie = c
              .replace(/^ +/, "")
              .replace(
                /=.*/,
                "=;expires=" + new Date().toUTCString() + ";path=/",
              );
          });
        } catch (e) {
          console.error("Emergent storage clear error:", e);
        }

        // Use a flag with timestamp to avoid infinite reload loops
        const lastHeal = localStorage.getItem("cps_last_auth_heal");
        const now = Date.now();

        // If we sense we are looping, don't reload, just force user to login screen
        const isLooping = lastHeal && now - parseInt(lastHeal) < 2000;

        localStorage.setItem("cps_last_auth_heal", now.toString());

        const forceReset = () => {
          handleUser(null);
          setUser(null);
          setUserProfile(null);
          setIsAdmin(false);
          setLoading(false);

          if (!isLooping) {
            setTimeout(() => {
              window.location.reload();
            }, 500);
          }
        };

        // Try to sign out but don't wait for it if it fails
        supabase.auth.signOut().catch((err) => console.warn("Sign-out falhou:", err)).finally(() => forceReset());
      }
    };

    // Remove the healing flag after a successful mount
    // setTimeout(() => localStorage.removeItem('cps_last_auth_heal'), 10000);

    // Safety timeout: if Supabase auth hangs, force stop loading after 3s
    const loadingTimeout = setTimeout(() => {
      setLoading((prev) => {
        if (prev) {
          console.warn("Auth loading timeout - forcing loading=false");
          return false;
        }
        return prev;
      });
    }, 3000);

    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        clearTimeout(loadingTimeout);
        if (error) {
          console.warn("Initial session fetch error:", error.message);
          handleAuthError(error.message);
        }
        handleUser(session?.user ?? null);
      })
      .catch((err) => {
        clearTimeout(loadingTimeout);
        console.warn("Failed to get initial session:", err);
        const errMsg = err?.message || String(err || "");
        handleAuthError(errMsg);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || event === "USER_UPDATED") {
        // Force clear state on explicit sign out or update errors
      }
      handleUser(session?.user ?? null);
    });

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      if (!reason) return;
      let rawMsg = "";
      if (typeof reason === "string") {
        rawMsg = reason;
      } else {
        rawMsg = reason?.message || reason?.error_description || reason?.error || "";
        if (!rawMsg && typeof reason === "object") {
          try {
            rawMsg = JSON.stringify(reason);
          } catch (_) {
            rawMsg = String(reason || "");
          }
        }
      }
      const message = rawMsg.toLowerCase();
      if (
        message.includes("refresh token not found") ||
        message.includes("refresh token") ||
        message.includes("invalid refresh token") ||
        message.includes("invalid_grant") ||
        message.includes("session not found") ||
        message.includes("authsessionmissingerror")
      ) {
        event.preventDefault(); // Stop bubbling to prevent crash boundaries
        handleAuthError(message);
      }
    };

    const onError = (event: ErrorEvent) => {
      const errorDetails = event.error;
      let rawMsg = event.message || "";
      if (errorDetails) {
        rawMsg = rawMsg + " " + (errorDetails.message || errorDetails.error_description || errorDetails.error || String(errorDetails || ""));
      }
      const message = rawMsg.toLowerCase();
      if (
        message.includes("refresh token not found") ||
        message.includes("refresh token") ||
        message.includes("invalid refresh token") ||
        message.includes("invalid_grant") ||
        message.includes("session not found") ||
        message.includes("authsessionmissingerror")
      ) {
        event.preventDefault(); // Stop default rendering
        handleAuthError(message);
      }
    };

    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("error", onError);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("error", onError);
    };
  }, []);
  const handleUser = async (currentUser: User | null) => {
    if (currentUser) {
      // Clear offline mode flag when a real Supabase user logs in
      localStorage.removeItem("cps_offline_mode");
      try {
        const isAdminEmail = [
          "cps@cps.local",
          "karlos15704@gmail.com",
          "ti@cps.local",
        ].includes(currentUser.email?.toLowerCase() || "");
        const isUserMaster = isAdminEmail;
        // Wrap with a 5s timeout so DB fetch never hangs the UI
        function withTimeout(promise: any, ms = 5000): Promise<any> {
          return Promise.race([
            Promise.resolve(promise),
            new Promise<any>((_, reject) => setTimeout(() => reject(new Error("DB timeout")), ms))
          ]);
        }
        const { data: profile, error } = await withTimeout(supabase
          .from("users")
          .select("*")
          .eq("uid", currentUser.id)
          .maybeSingle());

        if (error && error.code !== "PGRST116") {
          console.error(
            "Database user fetch error, continuing securely... ",
            error,
          );
        } else if (!profile) {
          // If first time, try to get data from allowed_professors safely without throwing
          const { data: allowed, error: allowedError } = await supabase
            .from("allowed_professors")
            .select("*")
            .eq("email", currentUser.email?.toLowerCase())
            .maybeSingle();
          if (allowedError) {
            console.error("Error fetching allowed professors:", allowedError);
          }

          const cleanUsername = currentUser.email?.split("@")[0] || "";
          // Ensure we capture true role from metadata if available (like secretaria_all, etc)
          const metaRole = currentUser.user_metadata?.role;
          const assignedRole =
            metaRole || (isUserMaster ? "admin" : "professor");

          const newProfile = {
            uid: currentUser.id,
            email: currentUser.email,
            username: allowed?.username || cleanUsername,
            role: assignedRole,
            professional_name:
              allowed?.full_name ||
              currentUser.user_metadata?.displayName ||
              cleanUsername,
            assigned_subjects: allowed?.assigned_subjects || [],
            assigned_classes: [],
          };

          // Before inserting into DB, sanitize the role due to strictly-enforced CHECK constraints
          const dbRole =
            assignedRole && assignedRole.includes("admin")
              ? "admin"
              : "professor";

          const { error: insertErr } = await supabase
            .from("users")
            .insert({ ...newProfile, role: dbRole });
          if (insertErr) {
            console.error(
              "Error inserting users profile database row:",
              insertErr,
            );
          } else if (newProfile.role !== dbRole) {
            // Try to set the true role in the background if no check constraint blocks it
            supabase
              .from("users")
              .update({ role: newProfile.role })
              .eq("uid", currentUser.id)
              .then(({ error }) => {
                if (!error) {
                  console.log("Successfully set true role after insertion:", newProfile.role);
                }
              });
          }

          setUserProfile(newProfile); // Keep true role in memory!
          localStorage.setItem(
            "cps_cached_profile",
            JSON.stringify(newProfile),
          );
          const rolesArr = (newProfile.role || "")
            .split(",")
            .map((r: string) => r.trim());
          const hasAdminRole = rolesArr.some(
            (r: string) =>
              [
                "admin", "ti",
                "suporte",
                "tecnico",
                "vice_diretor",
                "coordenador_all",
                "coordenador_fund1",
                "coordenador_fund2",
                "secretaria_all",
                "diretor",
                "diretoria",
              ].includes(r.toLowerCase()) ||
              r.toLowerCase().includes("secretaria") ||
              r.toLowerCase().includes("diretor") ||
              r.toLowerCase().includes("diretoria") ||
              r.toLowerCase().includes("admin") ||
              r.toLowerCase().includes("ti") ||
              r.toLowerCase().includes("suporte") ||
              r.toLowerCase().includes("coordenador") ||
              r.toLowerCase().includes("coordenadora"),
          );
          setIsAdmin(isUserMaster || hasAdminRole);
        } else {
          // Check if role needs sync for master account
          if (isUserMaster && profile.role !== "admin") {
            await supabase
              .from("users")
              .update({ role: "admin" })
              .eq("uid", currentUser.id);
            profile.role = "admin";
          }

          // Override DB role with metadata true role if present and sync back to DB if different
          const metaRole = currentUser.user_metadata?.role;
          if (metaRole) {
            if (profile.role !== metaRole) {
              const oldRole = profile.role;
              profile.role = metaRole;
              // Asynchronously sync the role to the users table
              supabase
                .from("users")
                .update({ role: metaRole })
                .eq("uid", currentUser.id)
                .then(({ error }) => {
                  if (error) {
                    console.warn(
                      `Failed to sync role to database users table for ${currentUser.email}:`,
                      error.message
                    );
                  } else {
                    console.debug(
                      `Successfully synced role '${metaRole}' (was '${oldRole}') to database`
                    );
                  }
                });
            }
          }

          // Fill missing fields on old profiles
          const migratedSubjects = (profile.assigned_subjects || []).map((s: string) => s === "Inglês" ? "Língua Inglesa" : s);
          const updatedProfile = {
            ...profile,
            professional_name:
              profile.professional_name ||
              profile.username ||
              profile.email?.split("@")[0] ||
              "Professor",
            assigned_subjects: migratedSubjects,
            assigned_classes: profile.assigned_classes || [],
          };
          setUserProfile(updatedProfile);
          localStorage.setItem(
            "cps_cached_profile",
            JSON.stringify(updatedProfile),
          );
          const rolesArr = (updatedProfile.role || "")
            .split(",")
            .map((r: string) => r.trim());
          const hasAdminRole = rolesArr.some(
            (r: string) =>
              [
                "admin", "ti",
                "suporte",
                "tecnico",
                "vice_diretor",
                "coordenador_all",
                "coordenador_fund1",
                "coordenador_fund2",
                "secretaria_all",
                "diretor",
                "diretoria",
              ].includes(r.toLowerCase()) ||
              r.toLowerCase().includes("secretaria") ||
              r.toLowerCase().includes("diretor") ||
              r.toLowerCase().includes("diretoria") ||
              r.toLowerCase().includes("admin") ||
              r.toLowerCase().includes("ti") ||
              r.toLowerCase().includes("suporte") ||
              r.toLowerCase().includes("coordenador") ||
              r.toLowerCase().includes("coordenadora"),
          );
          setIsAdmin(isUserMaster || hasAdminRole);
        }

        setUser(currentUser);
      } catch (err: any) {
        console.error("Error setting up user:", err);
        const cachedProfile = localStorage.getItem("cps_cached_profile");
        if (cachedProfile) {
          try {
            setUserProfile(JSON.parse(cachedProfile));
          } catch (_) {}
        }
        // Do not force sign out, let them proceed even if profile logic throws.
        setIsAdmin(currentUser.email?.toLowerCase() === "cps@cps.local");
        setUser(currentUser);
      }
    } else {
      setUser(null);
      setIsAdmin(false);
      setUserProfile(null);
    }
    setLoading(false);
  };

  // Derive admin status directly from userProfile.role to avoid race conditions
  const profileRole = (userProfile?.role || "professor").toLowerCase();
  const isAdminNow = isAdmin ||
    (user && (
      user.email === "cps@cps.local" ||
      user.email === "karlos15704@gmail.com" ||
      user.email === "ti@cps.local"
    )) ||
    profileRole.includes("admin") ||
    profileRole.includes("ti") ||
    profileRole.includes("suporte") ||
    profileRole.includes("coordenador") ||
    profileRole.includes("coordenadora") ||
    profileRole.includes("secretaria") ||
    profileRole.includes("diretor") ||
    profileRole.includes("diretoria") ||
    profileRole.includes("vice_diretor");

  const fetchExams = useCallback(async () => {
    if (!user || !userProfile) return;
    try {
      let query = supabase
        .from("exams")
        .select("id, subject, title, bimester, exam_date, exam_time, class_year, created_at, professor_id, exam_type, content, study_guide, answer_key")
        .order("created_at", { ascending: false });

      // Requirement: Professors see their own exams, coordination messages, or exams of subjects they teach.
      // Admins (isAdminNow) fetch ALL exams with no filter.
      if (!isAdminNow) {
        let filterParts = [
          `professor_id.eq.${user.id}`,
          ...(userProfile?.uid ? [`professor_id.eq.${userProfile.uid}`] : []),
          "subject.eq.Coordenação",
          "exam_type.eq.Recado",
        ];
        query = query.or(filterParts.join(","));
      }

      const { data, error } = await query;
      if (error) {
        throw error;
      }

      if (data) {
        const expiredIds: string[] = [];
        const now = Date.now();
        const fifteenDaysMs = 15 * 24 * 60 * 60 * 1000;

        const mappedExams = data.map((exam) => {
          const meta = exam.answer_key?._metadata || {};
          const deletedAt = meta.deletedAt || null;

          if (deletedAt) {
            const age = now - new Date(deletedAt).getTime();
            if (age > fifteenDaysMs) {
              expiredIds.push(exam.id);
            }
          }

          return {
            ...exam,
            questions: exam.questions || [],
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
            createdAt: exam.created_at,
            isDiaryOnly: meta.isDiaryOnly === true,
            isAnnouncement:
              (meta.isAnnouncement === true ||
                exam.exam_type === "Recado" ||
                exam.subject === "Coordenação") &&
              !(Array.isArray((exam as any).questions) && (exam as any).questions.length > 0),
            deletedAt: deletedAt,
          };
        });

        // Purge expired exams
        if (expiredIds.length > 0) {
          supabase
            .from("exams")
            .delete()
            .in("id", expiredIds)
            .then(({ error }) => {
              if (error) {
                console.error("Failed to permanent delete expired exams:", error);
              }
            });
        }

        const activeAndValidTrash = mappedExams.filter((e) => !expiredIds.includes(e.id));
        setExams(activeAndValidTrash);
        localStorage.setItem("cps_cached_exams", JSON.stringify(activeAndValidTrash));
      }
    } catch (err: any) {
      console.warn(
        "Fetch exams failed, using offline fallback:",
        err.message || err,
      );

      // Always load fresh from offline_exams.json when Supabase is down
      try {
        console.warn("[OFFLINE] Loading exams from /offline_exams.json...");
        const res = await fetch("/offline_exams.json");
        if (res.ok) {
          const offlineExams = await res.json();
          if (Array.isArray(offlineExams) && offlineExams.length > 0) {
            setExams(offlineExams);
            localStorage.setItem("cps_cached_exams", JSON.stringify(offlineExams));
            return;
          }
        }
      } catch (offlineErr) {
        console.error("Failed to load offline_exams.json:", offlineErr);
      }

      // Final fallback: use whatever is in localStorage cache
      const cached = localStorage.getItem("cps_cached_exams");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.length > 0) {
            setExams(parsed);
          }
        } catch (pErr) {
          console.error("Failed to parse cached exams:", pErr);
        }
      }
    }
  }, [user, userProfile, isAdminNow]);

  const fetchResults = useCallback(async () => {
    if (!user || !userProfile) return;
    try {
      let query = supabase
        .from("results")
        .select("*, exams!inner(subject, bimester)");

      if (!isAdmin) {
        const filterParts = [
          `professor_id.eq.${user.id}`,
          ...(userProfile?.uid ? [`professor_id.eq.${userProfile.uid}`] : [])
        ];
        query = query.or(filterParts.join(","));
      }

      const { data, error } = await query;
      if (error) {
        throw error;
      }

      if (data) {
        const mappedResults = data.map((r) => ({
          ...r,
          examId: r.exam_id,
          professorId: r.professor_id,
          studentName: r.student_name,
          studentClass: r.student_class,
          score: r.points,
          maxScore: r.total_points,
          correctedAt: r.corrected_at,
          bimester: r.bimester || (r.exams as any)?.bimester,
        }));
        setResults(mappedResults);
        localStorage.setItem(
          "cps_cached_results",
          JSON.stringify(mappedResults),
        );
      }
    } catch (err: any) {
      console.warn(
        "Fetch results failed, using local offline cache fallback:",
        err.message || err,
      );
      const cached = localStorage.getItem("cps_cached_results");
      if (cached) {
        try {
          setResults(JSON.parse(cached));
        } catch (pErr) {
          console.error("Failed to parse cached results:", pErr);
        }
      }
    }
  }, [user, userProfile, isAdmin]);

  const fetchStudentReports = useCallback(async () => {
    if (!user || !userProfile) return;
    try {
      let query = supabase
        .from("student_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (!isAdmin) {
        const filterParts = [
          `professor_id.eq.${user.id}`,
          ...(userProfile?.uid ? [`professor_id.eq.${userProfile.uid}`] : [])
        ];
        query = query.or(filterParts.join(","));
      }
      const { data, error } = await query;
      if (error) {
        throw error;
      }

      if (data) {
        let cachedProfs: any[] = [];
        try {
          const stored = localStorage.getItem("cps_cached_professors");
          if (stored) cachedProfs = JSON.parse(stored);
        } catch (e) {}

        const mappedReports = data.map((r) => {
          let profName = "Professor";
          let rawProfName = "Professor";
          
          if (user?.id === r.professor_id) {
            rawProfName = userProfile?.professional_name || userProfile?.name || user?.email?.split("@")[0] || "Professor";
          } else {
            const matchedProf = cachedProfs.find((p: any) => p.id === r.professor_id || p.uid === r.professor_id);
            if (matchedProf) {
              rawProfName = matchedProf.professional_name || matchedProf.name || matchedProf.email?.split("@")[0] || "Professor";
            }
          }
          profName = rawProfName;

          return {
            id: r.id,
            studentName: r.student_name,
            studentClass: r.class_name,
            subject: r.subject,
            content: r.report_text,
            bimester: r.bimester,
            professorId: r.professor_id,
            professorName: profName,
            createdAt: r.created_at,
          };
        });
        setStudentReports(mappedReports);
      }
    } catch (err: any) {
      console.warn("Fetch student reports failed:", err.message || err);
    }
  }, [user, userProfile, isAdmin]);

  const fetchProfessors = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("professional_name", { ascending: true });
      if (error) throw error;
      if (data) {
        const filteredData = data.filter(
          (p: any) => p.email !== "ti@cps.local",
        );
        setProfessors(filteredData);
        localStorage.setItem(
          "cps_cached_professors",
          JSON.stringify(filteredData),
        );
      }
    } catch (err: any) {
      console.warn(
        "Fetch professors failed, trying local offline cache fallback:",
        err.message || err,
      );
      const cached = localStorage.getItem("cps_cached_professors");
      if (cached) {
        try {
          setProfessors(JSON.parse(cached));
        } catch (pErr) {
          console.error("Failed to parse cached professors:", pErr);
        }
      }
    }
  }, []);

  const checkNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await robustFetch(
        `/api/tickets/my-notifications?email=${encodeURIComponent(user.email || "")}`,
      );
      const data = await res.json();
      if (data.notifications && data.notifications.length > 0) {
        for (const notif of data.notifications) {
          alert(
            `Equipe de Suporte:

Um problema que você reportou ("${notif.message.substring(0, 30)}...") foi resolvido. Muito obrigado pelo aviso!`,
          );
          await robustFetch("/api/tickets/mark-notified", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: notif.id }),
          });
        }
      }
    } catch (err) {
      console.warn("Failed to check notifications:", err);
    }
  }, [user]);

  const loadInitialData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const promises = [
        fetchExams(),
        fetchResults(),
        fetchStudentReports()
      ];

      if (isAdminNow || (user && user.email === "cps@cps.local")) {
        promises.push(fetchProfessors());
      }

      if (user && userProfile) {
        promises.push(checkNotifications());
      }

      await Promise.all(promises);
    } catch (err) {
      console.warn("Parallel initialization partially failed:", err);
    } finally {
      setIsLoadingData(false);
    }
  }, [user, userProfile, isAdminNow, fetchExams, fetchResults, fetchStudentReports, fetchProfessors, checkNotifications]);

  // Data Listeners and Subscriptions
  useEffect(() => {
    if (!user || !userProfile) return;

    // Keep cache on admin login so data loads instantly as a placeholder
    const cacheKey = `${user.id}_${isAdminNow}`;
    const previousCacheKey = localStorage.getItem("cps_cached_exams_user");
    if (isAdminNow && previousCacheKey !== cacheKey && !localStorage.getItem("cps_offline_mode")) {
      // localStorage.removeItem("cps_cached_exams"); // Removed to allow instant preload
      localStorage.setItem("cps_cached_exams_user", cacheKey);
    }

    loadInitialData();

    const examsFilter = isAdmin ? undefined : undefined; // Subscription for all exams to see global schedule updates
    const channelUniqueId = Math.random().toString(36).substring(2, 9);

    const examsSub = supabase
      .channel(`exams_changes_${channelUniqueId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "exams" },
        fetchExams,
      )
      .subscribe();

    const resultsSub = supabase
      .channel(`results_changes_${channelUniqueId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "results", filter: examsFilter },
        fetchResults,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(examsSub);
      supabase.removeChannel(resultsSub);
    };
  }, [user, userProfile, isAdminNow, loadInitialData, fetchExams, fetchResults, isAdmin]);

  // Dedicated effect for manually triggered refreshes without rebuilding WebSocket connections
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchExams();
      fetchResults();
      fetchStudentReports();
    }
  }, [refreshTrigger, fetchExams, fetchResults, fetchStudentReports]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Sign out error:", err);
    } finally {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("sb-") || key.includes("auth-token"))) {
          localStorage.removeItem(key);
        }
      }
      handleUser(null);
    }
  };

  const handleReassignProfessor = async (
    examId: string,
    newProfessorId: string,
  ) => {
    try {
      const { error: examError } = await supabase
        .from("exams")
        .update({ professor_id: newProfessorId })
        .eq("id", examId);
      if (examError) throw examError;

      // Also update results associated with this exam
      const { error: resultsError } = await supabase
        .from("results")
        .update({ professor_id: newProfessorId })
        .eq("exam_id", examId);
      if (resultsError) throw resultsError;

      setRefreshTrigger((prev) => prev + 1);
      setExamBeingReassigned(null);
      alert("Professor reatribuído com sucesso!");
    } catch (err: any) {
      alert("Erro ao reatribuir: " + err.message);
    }
  };

  const handleDeleteExam = async (id: string) => {
    if (userProfile?.role?.includes("secretaria")) {
      alert(
        "Acesso Negado: Usuários do setor de Secretaria não possuem permissão para excluir avaliações.",
      );
      return;
    }
    const targetExam = exams.find((e) => e.id === id);
    if (!targetExam) return;
    if (
      !window.confirm(
        "Tem certeza que deseja enviar esta prova para a lixeira? Ela ficará disponível para restauração por 15 dias, após os quais será excluída permanentemente.",
      )
    )
      return;
    try {
      const meta = targetExam.answerKey?._metadata || targetExam.answer_key?._metadata || {};
      const updatedAnswerKey = {
        ...(targetExam.answerKey || {}),
        _metadata: {
          ...meta,
          deletedAt: new Date().toISOString()
        }
      };

      const { error } = await supabase
        .from("exams")
        .update({ answer_key: updatedAnswerKey })
        .eq("id", id);

      if (error) throw error;

      // Update local state
      setExams(
        exams.map((e) =>
          e.id === id ? { ...e, answerKey: updatedAnswerKey, deletedAt: new Date().toISOString() } : e
        )
      );

      try {
        if (!isAdmin) await fetch("/api/activity/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actorName:
              userProfile?.professional_name || user.email?.split("@")[0],
            actorEmail: user.email,
            actionType: "trash_exam",
            description: `O professor ${userProfile?.professional_name || user.email?.split("@")[0]} enviou a prova '${targetExam.title}' (${targetExam.subject} - ${targetExam.classYear || targetExam.class_year || ""}) para a lixeira`,
          }),
        });
      } catch (logErr) {
        console.warn("Log error:", logErr);
      }

      alert("Avaliação movida para a lixeira com sucesso!");
    } catch (err: any) {
      alert("Erro ao mover para a lixeira: " + err.message);
    }
  };

  const checkAndResolveExamConflict = async (
    targetClass: string,
    targetBimester: string,
    targetSubject: string,
    targetType: string
  ): Promise<{ proceed: boolean; error?: any }> => {
    try {
      const { data, error } = await supabase
        .from("exams")
        .select("id, title, exam_type, answer_key")
        .eq("class_year", targetClass)
        .eq("bimester", targetBimester)
        .eq("subject", targetSubject)
        .eq("exam_type", targetType);
      
      if (error) throw error;
      
      const activeConflictingExams = (data || []).filter((e: any) => {
        if (e.exam_type === "Recado") return false;
        const meta = e.answer_key?._metadata || {};
        return !meta.deletedAt;
      });

      if (activeConflictingExams.length > 0) {
        const currentActive = activeConflictingExams[0];
        const confirmReplace = window.confirm(
          `Já existe uma avaliação ativa do tipo "${targetType}" para a disciplina "${targetSubject}" na turma "${targetClass}" no "${targetBimester}".

Deseja substituí-la? (A avaliação ativa anterior será enviada para a lixeira)`
        );
        if (!confirmReplace) {
          return { proceed: false };
        }

        const meta = currentActive.answer_key?._metadata || {};
        const updatedAnswerKey = {
          ...(currentActive.answer_key || {}),
          _metadata: {
            ...meta,
            deletedAt: new Date().toISOString()
          }
        };

        const { error: updateError } = await supabase
          .from("exams")
          .update({ answer_key: updatedAnswerKey })
          .eq("id", currentActive.id);

        if (updateError) throw updateError;

        // Update local state immediately
        setExams(prev =>
          prev.map((e) =>
            e.id === currentActive.id ? { ...e, answerKey: updatedAnswerKey, deletedAt: new Date().toISOString() } : e
          )
        );

        // Log activity
        try {
          if (!isAdmin) await fetch("/api/activity/log", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              actorName: userProfile?.professional_name || user.email?.split("@")[0],
              actorEmail: user.email,
              actionType: "trash_exam",
              description: `O professor ${userProfile?.professional_name || user.email?.split("@")[0]} substituiu a prova '${currentActive.title}' enviando-a para a lixeira ao criar/restaurar uma nova prova do mesmo tipo no mesmo bimestre.`,
            }),
          });
        } catch (logErr) {
          console.warn("Log error:", logErr);
        }
      }
      return { proceed: true };
    } catch (err: any) {
      console.error("Error checking exam conflict:", err);
      return { proceed: false, error: err };
    }
  };

  const handleRestoreExam = async (id: string) => {
    const targetExam = exams.find((e) => e.id === id);
    if (!targetExam) return;

    // --- CHECK CONFLICT BEFORE RESTORING ---
    const conflictRes = await checkAndResolveExamConflict(
      targetExam.classYear || targetExam.class_year || "",
      targetExam.bimester || "",
      targetExam.subject || "",
      targetExam.examType || targetExam.exam_type || ""
    );
    if (!conflictRes.proceed) {
      if (conflictRes.error) {
        alert("Erro ao verificar conflitos de avaliação: " + conflictRes.error.message);
      }
      return;
    }
    // ---------------------------------------

    try {
      const meta = targetExam.answerKey?._metadata || targetExam.answer_key?._metadata || {};
      const updatedMeta = { ...meta };
      delete updatedMeta.deletedAt; // remove the deletedAt flag to restore

      const updatedAnswerKey = {
        ...targetExam.answerKey,
        _metadata: updatedMeta
      };

      const { error } = await supabase
        .from("exams")
        .update({ answer_key: updatedAnswerKey })
        .eq("id", id);

      if (error) throw error;

      // Update local state
      setExams(
        exams.map((e) =>
          e.id === id ? { ...e, answerKey: updatedAnswerKey, deletedAt: null } : e
        )
      );

      try {
        if (!isAdmin) await fetch("/api/activity/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actorName:
              userProfile?.professional_name || user.email?.split("@")[0],
            actorEmail: user.email,
            actionType: "restore_exam",
            description: `O professor ${userProfile?.professional_name || user.email?.split("@")[0]} restaurou a prova '${targetExam.title}' (${targetExam.subject} - ${targetExam.classYear || ""}) da lixeira`,
          }),
        });
      } catch (logErr) {
        console.warn("Log error:", logErr);
      }

      alert("Avaliação restaurada com sucesso!");
    } catch (err: any) {
      alert("Erro ao restaurar prova: " + err.message);
    }
  };

  const handleDeletePermanentExam = async (id: string) => {
    const targetExam = exams.find((e) => e.id === id);
    if (!targetExam) return;
    if (
      !window.confirm(
        "Tem certeza que deseja excluir esta prova permanentemente? Esta ação é irreversível e removerá todos os resultados de notas associados.",
      )
    )
      return;

    try {
      const { error } = await supabase.from("exams").delete().eq("id", id);
      if (error) throw error;

      // Update state
      setExams(exams.filter((e) => e.id !== id));

      try {
        if (!isAdmin) await fetch("/api/activity/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actorName:
              userProfile?.professional_name || user.email?.split("@")[0],
            actorEmail: user.email,
            actionType: "permanent_delete_exam",
            description: `O professor ${userProfile?.professional_name || user.email?.split("@")[0]} excluiu permanentemente a prova '${targetExam.title}' (${targetExam.subject} - ${targetExam.classYear || ""})`,
          }),
        });
      } catch (logErr) {
        console.warn("Log error:", logErr);
      }

      alert("Avaliação excluída permanentemente com sucesso!");
    } catch (err: any) {
      alert("Erro ao excluir permanentemente: " + err.message);
    }
  };

  const saveMedicalInfo = async (
    studentName: string,
    info: { notes: string; fileUrl?: string },
  ) => {
    try {
      let currentRecords: Record<string, { notes: string; fileUrl?: string }> =
        {};
      try {
        const localRes = await fetch("/api/admin/get-medical-records");
        const localData = await localRes.json();
        if (localData && localData.success) {
          currentRecords = localData.medicalRecords || {};
        }
      } catch (localErr) {
        console.warn(
          "Could not load current medical records from local storage",
          localErr,
        );
      }

      const newData = { ...currentRecords, [studentName]: info };

      try {
        await fetch("/api/admin/save-medical-records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ medicalRecords: newData }),
        });
      } catch (localSaveErr) {
        console.warn(
          "Could not save medical records to local storage",
          localSaveErr,
        );
      }

      try {
        const { data: currentSettings } = await supabase
          .from("school_settings")
          .select("data")
          .eq("key", "medical_records")
          .maybeSingle();
        const supabaseData = currentSettings?.data || {};
        const mergedData = { ...supabaseData, ...newData };
        await supabase.from("school_settings").upsert(
          {
            key: "medical_records",
            data: mergedData,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" },
        );
      } catch (subErr) {
        console.warn(
          "Supabase database sync restricted, saved locally only:",
          subErr,
        );
      }

      setMedicalRecords(newData);
      setRefreshTrigger((prev) => prev + 1);
      return true;
    } catch (err: any) {
      alert("Erro ao salvar dados médicos: " + err.message);
      return false;
    }
  };

  const handleSaveAbsenceJustifications = async (newList: any[]) => {
    localStorage.setItem("cps_absence_justifications", JSON.stringify(newList));
    try {
      await supabase.from("school_settings").upsert(
        {
          key: "absence_justifications",
          data: newList,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      );
    } catch (err) {
      console.warn("Error saving justifications to supabase:", err);
    }
    setAbsenceJustifications(newList);
    setRefreshTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    if (!user) return;
    
    const sendPing = () => {
      fetch('/api/user/ping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: user.id,
          email: user.email,
          name: userProfile?.professional_name || user.user_metadata?.name || user.email?.split('@')[0],
          role: userProfile?.role || 'professor'
        })
      }).catch(err => console.warn('Pinging failed', err));
    };

    sendPing(); // initial ping
    const interval = setInterval(sendPing, 15000); // Poll every 15s
    
    return () => clearInterval(interval);
  }, [user, userProfile]);

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-slate-50 dark:bg-slate-900 print:overflow-visible print:h-auto">
      {loadingFullExam && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-xl flex flex-col items-center gap-3 border border-slate-200 dark:border-slate-700">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Carregando conteúdo completo da prova...</span>
          </div>
        </div>
      )}
      

      
      <AnimatePresence mode="wait" initial={false}>
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{
              opacity: 0,
              scale: 1.05,
              filter: "blur(8px)",
              transition: { duration: 0.3 },
            }}
            className="min-h-screen flex items-center justify-center bg-[#F8FAFC] absolute inset-0 z-50 w-full h-full"
          >
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </motion.div>
        ) : (!user && !familySession) ? (
          <motion.div
            key="login"
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              transition: { type: "spring", stiffness: 180, damping: 16 },
            }}
            exit={{
              opacity: 0,
              scale: 1.04,
              y: -30,
              filter: "blur(6px)",
              transition: { duration: 0.35, ease: [0.34, 1.56, 0.64, 1] },
            }}
            className="w-full h-[100dvh] absolute inset-0 z-40 bg-[#fbfbfa] dark:bg-slate-950"
          >
            <LoginView
              error={error}
              setError={setError}
              triggerAntonioEasterEgg={triggerAntonioEasterEgg}
              onFamilyLogin={handleFamilyLogin}
              schoolInfo={getSchoolInfo()}
              onOfflineLogin={(syntheticUser, profile, admin) => {
                setUser(syntheticUser);
                setUserProfile(profile);
                setIsAdmin(admin);
                setLoading(false);
              }}
            />
          </motion.div>
        ) : familySession ? (
          <motion.div
            key="family-portal"
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 180, damping: 16 } }}
            exit={{ opacity: 0, scale: 0.96, y: -20, transition: { duration: 0.2 } }}
            className="w-full h-full fixed inset-0 z-40 bg-[#fbfbfa] overflow-hidden"
          >
            <FamilyPortalView
               session={familySession}
               onLogout={handleFamilyLogout}
               schoolInfo={getSchoolInfo()}
               studentReports={studentReports || []}
               exams={exams}
               results={results}
               lessons={lessons}
               attendanceRecords={attendanceRecords}
               onSignReport={handleFamilySignReport}
            />
          </motion.div>
        ) : (
          <motion.div
            key="app-shell"
            initial={{ opacity: 0, scale: 0.97, y: 30 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              transition: {
                type: "spring",
                stiffness: 140,
                damping: 14,
                delay: 0.05,
              },
            }}
            exit={{
              opacity: 0,
              scale: 0.96,
              y: 40,
              filter: "blur(8px)",
              transition: { duration: 0.35, ease: "easeInOut" },
            }}
            className={cn(
              "h-[100dvh] flex flex-col print:h-auto print:bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 print:block overflow-hidden print:overflow-visible transition-colors duration-300 absolute print:static inset-0 w-full z-30",
              isDarkMode
                ? "dark bg-slate-950 text-slate-800 dark:text-slate-100"
                : "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100",
            )}
          >
            {/* World Cup Immersive Background Overlay */}
            {isWorldCupTheme && view === "dashboard" && (
              <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#051e0b]">
                {/* Base Background Image */}
                <div 
                  className="absolute inset-0 bg-[url('/brazil_stadium_background.png')] bg-[length:100%_100%] bg-no-repeat bg-center opacity-80 transition-opacity duration-1000"
                />
                {/* Vignette Overlay for premium readable contrast */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#051e0b]/90 via-transparent to-[#051e0b]/45 mix-blend-multiply" />
                
                {/* Moving spotlights overlay */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(250,204,21,0.15),transparent_50%)] animate-pulse" style={{ animationDuration: '4s' }} />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(34,197,94,0.15),transparent_60%)] animate-pulse" style={{ animationDuration: '6s' }} />
                
                {/* Drifting Gold, Green, and Blue Confetti Particles */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-60">
                  {Array.from({ length: 40 }).map((_, idx) => {
                    const left = Math.random() * 100;
                    const delay = Math.random() * 5;
                    const duration = 6 + Math.random() * 8;
                    const size = 3 + Math.random() * 6;
                    return (
                      <div
                        key={`confetti-${idx}`}
                        className="absolute rounded-sm"
                        style={{
                          width: `${size}px`,
                          height: `${size}px`,
                          backgroundColor: idx % 3 === 0 ? '#facc15' : idx % 3 === 1 ? '#22c55e' : '#3b82f6',
                          left: `${left}%`,
                          top: `-10px`,
                          opacity: 0.7,
                          animation: `confetti-drift ${duration}s linear infinite`,
                          animationDelay: `${delay}s`,
                          transform: `rotate(${Math.random() * 360}deg)`
                        }}
                      />
                    );
                  })}
                </div>

                <style dangerouslySetInnerHTML={{__html: `
                  @keyframes confetti-drift {
                    0% { transform: translateY(0) rotate(0deg); opacity: 0.8; }
                    50% { transform: translateY(50vh) rotate(180deg) translateX(15px); opacity: 0.8; }
                    100% { transform: translateY(105vh) rotate(360deg) translateX(-15px); opacity: 0; }
                  }
                `}} />
              </div>
            )}

            {localStorage.getItem("cps_offline_mode") === "true" && (
              <div className="bg-amber-600 text-slate-950 px-4 py-2 text-[10px] font-black text-center flex items-center justify-center gap-2 select-none border-b border-amber-500/20 z-50 print:hidden animate-pulse">
                <span>⚠️ MODO DE BACKUP LOCAL ATIVO - EXIBINDO DADOS LOCAIS (APENAS LEITURA) - ÚLTIMO BACKUP: {backupStatus?.timestamp ? new Date(backupStatus.timestamp).toLocaleString("pt-BR") : "NÃO REALIZADO"}</span>
              </div>
            )}

            {/* Header */}
            <header className={cn(
              "h-[74px] px-4 md:px-8 flex-shrink-0 flex items-center justify-between sticky top-0 z-40 print:hidden shadow-lg transition-colors relative text-white",
              isWorldCupTheme && view === "dashboard"
                ? "bg-slate-950/45 backdrop-blur-md border-b border-yellow-400/30"
                : "bg-slate-950 border-b border-[#a88d44]/30"
            )}>
              <div
                className="absolute inset-0 opacity-[0.05] pointer-events-none"
                style={{
                  backgroundImage: `radial-gradient(rgba(212,175,55,0.4) 1px, transparent 1px)`,
                  backgroundSize: "16px 16px",
                }}
              />
              <div className="flex items-center gap-3 relative z-10">
                <button
                  onClick={() => {
                    if (window.innerWidth < 1024) {
                      setIsMobileMenuOpen(!isMobileMenuOpen);
                    } else {
                      setSidebarCollapsed(!sidebarCollapsed);
                    }
                  }}
                  className="flex p-2 hover:bg-slate-900 rounded-lg transition-colors text-slate-600 dark:text-slate-400 hover:text-white"
                  title="Menu de Navegação"
                >
                  <Menu className="w-5 h-5 text-gold" />
                </button>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-1 sm:p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-1.5 sm:gap-2">
                    <img
                      src={LOGO_VINHO}
                      alt="Logo CPS"
                      className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 object-contain"
                      referrerPolicy="no-referrer"
                    />
                    <div className="w-px h-3 sm:h-4 bg-slate-200"></div>
                    <img
                      src={LOGO_COC}
                      alt="Plataforma COC"
                      className="h-2.5 sm:h-3 md:h-4 object-contain filter brightness-110"
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <h1 className="text-[9px] min-[360px]:text-[10px] min-[400px]:text-[11px] sm:text-sm font-display font-black text-[#d4af37] tracking-tight uppercase leading-none truncate max-w-[120px] min-[400px]:max-w-none">
                      Colégio Progresso Santista
                    </h1>
                    <span className="text-[7px] min-[360px]:text-[8px] sm:text-[9.5px] font-bold text-slate-700 dark:text-slate-400 uppercase tracking-[0.1em] sm:tracking-widest mt-0.5 truncate">
                      Gestão Acadêmica Unificada
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-4 relative z-10">
                {/* Theme Toggle */}
                <button
                  onClick={() => {
                    setIsDarkMode(!isDarkMode);
                    // Clear the implicit preference flag so the current manual toggle acts as explicitly setting pref.
                    localStorage.setItem('cps_dark_mode', String(!isDarkMode));
                  }}
                  className="flex p-2 hover:bg-slate-900 rounded-lg transition-colors text-slate-600 dark:text-slate-400 hover:text-white"
                  title={isDarkMode ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
                >
                  {isDarkMode ? <Sun className="w-5 h-5 text-gold" /> : <Moon className="w-5 h-5 text-gold" />}
                </button>
                {/* Notification Bell */}
                <div ref={notificationsDropdownRef} className="relative">
                  <button
                    onClick={() => {
                      setShowNotificationsDropdown(!showNotificationsDropdown);
                      setBellBadgeCleared(true);
                    }}
                    className="p-2 relative bg-slate-900 hover:bg-slate-800 rounded-xl text-[#d4af37] cursor-pointer transition-all border border-slate-200 dark:border-slate-800 flex items-center justify-center"
                    title="Notificações"
                  >
                    <Bell
                      className={cn(
                        "w-4 h-4",
                        unreadInvolvedCount > 0 && !bellBadgeCleared &&
                          "animate-bounce text-[#d4af37]",
                      )}
                    />
                    {unreadInvolvedCount > 0 && !bellBadgeCleared && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-white text-[8px] font-black animate-scale-in">
                        {unreadInvolvedCount}
                      </span>
                    )}
                  </button>

                    {showNotificationsDropdown && (
                      <NotificationsDropdown
                        exams={exams}
                        readAnnouncements={readAnnouncements}
                        user={user}
                        userProfile={userProfile}
                        isAdmin={isAdmin}
                        onMarkAsRead={(id) => {
                          const updated = [...readAnnouncements, id];
                          setGlobalReadAnnouncements(updated);
                          localStorage.setItem(
                            "cps_read_announcements",
                            JSON.stringify(updated),
                          );
                        }}
                        onMarkAllAsRead={() => {
                          const allAnnIds = exams
                            .filter((e) => {
                              const hasQuestions = Array.isArray(e.questions) && e.questions.length > 0;
                              const isAnn =
                                (e.isAnnouncement ||
                                  e.examType === "Recado" ||
                                  e.subject === "Coordenação") &&
                                !hasQuestions;
                              return isAnn;
                            })
                            .map((e) => e.id);
                          const updated = Array.from(
                            new Set([...readAnnouncements, ...allAnnIds]),
                          );
                          setGlobalReadAnnouncements(updated);
                          localStorage.setItem(
                            "cps_read_announcements",
                            JSON.stringify(updated),
                          );
                        }}
                        onClose={() => setShowNotificationsDropdown(false)}
                        setView={setView}
                      />
                    )}
                  </div>

                <div className="hidden md:flex flex-col items-end mr-2">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    {userProfile?.professional_name ||
                      user.displayName ||
                      user.email?.replace("@cps.local", "")}
                  </span>
                  <span className="text-[10px] font-black text-gold uppercase tracking-wider">
                    {isAdmin ? "Administrador" : "Professor"}
                  </span>
                </div>
                {user.user_metadata?.avatar_base64 ||
                user.user_metadata?.avatar_url ? (
                  <img
                    src={
                      user.user_metadata.avatar_base64 ||
                      user.user_metadata.avatar_url
                    }
                    alt="Perfil"
                    className="w-10 h-10 rounded-full object-cover border-2 border-slate-700/50 shadow-sm mr-1 ml-1 cursor-pointer transition-transform hover:scale-105 hover:border-gold"
                    onClick={() => {
                      setView("settings");
                      setExamToEdit(null);
                    }}
                  />
                ) : (
                  <UserCircle
                    className="w-10 h-10 text-slate-600 dark:text-slate-400 mr-1 ml-1 cursor-pointer transition-transform hover:scale-105 hover:text-gold"
                    onClick={() => {
                      setView("settings");
                      setExamToEdit(null);
                    }}
                  />
                )}
              </div>
            </header>

            {/* Mobile Slide-out Menu Drawer */}
            {isMobileMenuOpen && (
              <div className="fixed inset-0 z-50 flex lg:hidden">
                {/* Backdrop */}
                <div
                  className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
                  onClick={() => setIsMobileMenuOpen(false)}
                />
                {/* Sidebar content */}
                <div className="relative flex w-full max-w-xs flex-1 flex-col bg-slate-950 p-6 text-white shadow-2xl animate-slide-in-left">
                  <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <img
                        src={LOGO_VINHO}
                        alt="Logo"
                        className="w-5 h-5"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-gold uppercase tracking-wider">
                          Progresso Santista
                        </span>
                        <span className="text-[8px] tracking-widest text-slate-600 dark:text-slate-400 uppercase font-bold">
                          Portal Docente
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="p-1 rounded-lg text-slate-600 dark:text-slate-400 hover:text-white hover:bg-slate-950 transition-colors"
                    >
                      <X className="w-5 h-5 text-gold" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-2 overflow-y-auto">
                    <NavButton
                      active={view === "dashboard"}
                      onClick={() => {
                        setView("dashboard");
                        setExamToEdit(null);
                        setIsMobileMenuOpen(false);
                      }}
                      icon={<BarChart3 className="w-5 h-5" />}
                      label="Visão Geral"
                    />
                    <NavButton
                      active={view === "diary"}
                      onClick={() => {
                        setView("diary");
                        setExamToEdit(null);
                        setIsMobileMenuOpen(false);
                      }}
                      icon={<BookOpen className="w-5 h-5" />}
                      label="Diário & Notas"
                    />
                    {true && (
                      <NavButton
                        active={view === "ti_auto_exam"}
                        onClick={() => {
                          setView("ti_auto_exam");
                          setExamToEdit(null);
                          setIsMobileMenuOpen(false);
                        }}
                        icon={<Cpu className="w-5 h-5 text-amber-400 animate-pulse" />}
                        label={
                          <span className="flex items-center gap-1 font-bold">
                            <span>Provas/Atividades Inteligentes</span>
                            <FlameNewBadge />
                          </span>
                        }
                      />
                    )}
                    <NavButton
                      active={view === "banco_provas"}
                      onClick={() => {
                        setView("banco_provas");
                        setExamToEdit(null);
                        setIsMobileMenuOpen(false);
                      }}
                      icon={<LayoutList className="w-5 h-5" />}
                      label="Banco de Provas"
                    />
                    <NavButton
                      active={view === "banco_atividades"}
                      onClick={() => {
                        setView("banco_atividades");
                        setExamToEdit(null);
                        setIsMobileMenuOpen(false);
                      }}
                      icon={<ClipboardList className="w-5 h-5" />}
                      label="Banco de Atividades"
                    />
                    <NavButton
                      active={view === "boletim"}
                      onClick={() => {
                        setView("boletim");
                        setExamToEdit(null);
                        setIsMobileMenuOpen(false);
                      }}
                      icon={<FileText className="w-5 h-5" />}
                      label="Boletim Consolidado"
                    />
                    <NavButton
                      active={view === "cronograma"}
                      onClick={() => {
                        setView("cronograma");
                        setExamToEdit(null);
                        setIsMobileMenuOpen(false);
                      }}
                      icon={<Calendar className="w-5 h-5" />}
                      label="Cronograma de Provas"
                    />
                    {true && (
                      <NavButton
                        active={view === "studentReports"}
                        onClick={() => {
                          setView("studentReports");
                          setExamToEdit(null);
                          setIsMobileMenuOpen(false);
                        }}
                        icon={<UserIcon className="w-5 h-5" />}
                        label="Relatório de Aluno"
                      />
                    )}

                    <NavButton
                      active={view === "agenda"}
                      onClick={() => {
                        setView("agenda");
                        setExamToEdit(null);
                        setIsMobileMenuOpen(false);
                      }}
                      icon={<Mail className="w-5 h-5" />}
                      label="Agenda Eletrônica"
                    />
                    <div className="h-px bg-slate-800 my-2 mx-4" />
                    <NavButton
                      active={view === "settings"}
                      onClick={() => {
                        setView("settings");
                        setExamToEdit(null);
                        setIsMobileMenuOpen(false);
                      }}
                      icon={<UserCircle className="w-5 h-5" />}
                      label="Minha Conta"
                    />
                    {isAdmin && (
                      <NavButton
                        active={view === "admin"}
                        onClick={() => {
                          setView("admin");
                          setExamToEdit(null);
                          setIsMobileMenuOpen(false);
                        }}
                        icon={<Settings className="w-5 h-5" />}
                        label="Administração"
                      />
                    )}
                    {["ti@cps.local", "karlos15704@gmail.com"].includes(
                      userProfile?.email?.toLowerCase() || "",
                    ) && (
                      <NavButton
                        active={view === "error_admin"}
                        onClick={() => {
                          setView("error_admin");
                          setExamToEdit(null);
                          setIsMobileMenuOpen(false);
                        }}
                        icon={<ShieldAlert className="w-5 h-5" />}
                        label="Gestão de Tickets"
                      />
                    )}
                    <NavButton
                      active={view === "error_report"}
                      onClick={() => {
                        setView("error_report");
                        setExamToEdit(null);
                        setIsMobileMenuOpen(false);
                      }}
                      icon={<AlertCircle className="w-5 h-5 text-indigo-400" />}
                      label="Suporte"
                    />
                    <div className="h-px bg-slate-800 my-2 mx-4" />
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        handleLogout();
                      }}
                      className="flex items-center gap-3 px-5 py-3 text-red-400 hover:text-red-300 hover:bg-slate-800 rounded-xl transition-all duration-300 text-[15px] font-bold w-full text-left"
                    >
                      <LogOut className="w-5 h-5" />
                      <span>Encerrar Sessão</span>
                    </button>

                    <div className="mt-8 pt-6 pb-2 text-center flex flex-col items-center gap-1 border-t border-slate-900">
                      <span className="text-[9px] font-black uppercase tracking-[0.25em] text-gold">
                        Colégio Progresso Santista
                      </span>
                      <span className="text-[8px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Portal Corporativo
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-1 overflow-hidden print:overflow-visible print:block">
              {/* Sidebar */}
              <aside
                className={cn(
                  "text-white flex flex-col hidden lg:flex print:hidden shadow-2xl z-20 transition-all duration-300 ease-in-out relative",
                  sidebarCollapsed ? "w-[70px]" : "w-[260px]",
                  isWorldCupTheme && view === "dashboard"
                    ? "bg-slate-950/45 backdrop-blur-md border-r border-yellow-400/20"
                    : "bg-slate-950 border-r border-slate-900"
                )}
              >
                <div className="py-4 px-2 flex-1 flex flex-col gap-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
                  <NavButton
                    active={view === "dashboard"}
                    onClick={() => {
                      setView("dashboard");
                      setExamToEdit(null);
                    }}
                    icon={<BarChart3 className="w-5 h-5" />}
                    label="Visão Geral"
                    collapsed={sidebarCollapsed}
                  />
                  <NavButton
                    active={view === "diary"}
                    onClick={() => {
                      setView("diary");
                      setExamToEdit(null);
                    }}
                    icon={<BookOpen className="w-5 h-5" />}
                    label="Diário & Notas"
                    collapsed={sidebarCollapsed}
                  />
                  {true && (
                    <NavButton
                      active={view === "ti_auto_exam"}
                      onClick={() => {
                        setView("ti_auto_exam");
                        setExamToEdit(null);
                      }}
                      icon={<Cpu className="w-5 h-5 text-amber-400 animate-pulse" />}
                      label={
                        <span className="flex items-center gap-1 font-bold">
                          <span>Provas/Atividades Inteligentes</span>
                          <FlameNewBadge />
                        </span>
                      }
                      collapsed={sidebarCollapsed}
                    />
                  )}
                  <NavButton
                    active={view === "banco_provas"}
                    onClick={() => {
                      setView("banco_provas");
                      setExamToEdit(null);
                    }}
                    icon={<LayoutList className="w-5 h-5" />}
                    label="Banco de Provas"
                    collapsed={sidebarCollapsed}
                  />
                  <NavButton
                    active={view === "banco_atividades"}
                    onClick={() => {
                      setView("banco_atividades");
                      setExamToEdit(null);
                    }}
                    icon={<ClipboardList className="w-5 h-5" />}
                    label="Banco de Atividades"
                    collapsed={sidebarCollapsed}
                  />
                  <NavButton
                    active={view === "boletim"}
                    onClick={() => {
                      setView("boletim");
                      setExamToEdit(null);
                    }}
                    icon={<FileText className="w-5 h-5" />}
                    label="Boletim Consolidado"
                    collapsed={sidebarCollapsed}
                  />
                  <NavButton
                    active={view === "cronograma"}
                    onClick={() => {
                      setView("cronograma");
                      setExamToEdit(null);
                    }}
                    icon={<Calendar className="w-5 h-5" />}
                    label="Cronograma de Provas"
                    collapsed={sidebarCollapsed}
                  />
                  {true && (
                    <NavButton
                      active={view === "studentReports"}
                      onClick={() => {
                        setView("studentReports");
                        setExamToEdit(null);
                      }}
                      icon={<UserIcon className="w-5 h-5" />}
                      label="Relatório de Aluno"
                      collapsed={sidebarCollapsed}
                    />
                  )}

                  <NavButton
                    active={view === "agenda"}
                    onClick={() => {
                      setView("agenda");
                      setExamToEdit(null);
                    }}
                    icon={<Mail className="w-5 h-5" />}
                    label="Agenda Eletrônica"
                    collapsed={sidebarCollapsed}
                  />
                  <div className="h-px bg-slate-800 my-2 mx-4" />
                  <NavButton
                    active={view === "settings"}
                    onClick={() => {
                      setView("settings");
                      setExamToEdit(null);
                    }}
                    icon={<UserCircle className="w-5 h-5" />}
                    label="Minha Conta"
                    collapsed={sidebarCollapsed}
                  />
                  {isAdmin && (
                    <NavButton
                      active={view === "admin"}
                      onClick={() => {
                        setView("admin");
                        setExamToEdit(null);
                      }}
                      icon={<Settings className="w-5 h-5" />}
                      label="Administração"
                      collapsed={sidebarCollapsed}
                    />
                  )}
                  {/* --- Remove old button location --- */}
                  {["ti@cps.local", "karlos15704@gmail.com"].includes(
                    userProfile?.email?.toLowerCase() || "",
                  ) && (
                    <NavButton
                      active={view === "error_admin"}
                      onClick={() => {
                        setView("error_admin");
                        setExamToEdit(null);
                      }}
                      icon={<ShieldAlert className="w-5 h-5 text-indigo-400" />}
                      label="Gestão de Tickets"
                      collapsed={sidebarCollapsed}
                    />
                  )}
                  <NavButton
                    active={view === "error_report"}
                    onClick={() => {
                      setView("error_report");
                      setExamToEdit(null);
                    }}
                    icon={<AlertCircle className="w-5 h-5 text-indigo-400" />}
                    label="Suporte"
                    collapsed={sidebarCollapsed}
                  />
                  <div className="h-px bg-slate-800 my-2 mx-4" />
                  <button
                    onClick={handleLogout}
                    className={cn(
                      "flex items-center transition-all duration-300 text-[15px] font-bold w-full text-left rounded-xl text-red-400 hover:text-red-300 hover:bg-slate-800 shrink-0",
                      sidebarCollapsed
                        ? "justify-center px-0 py-3"
                        : "gap-3 px-4 py-3",
                    )}
                    title={sidebarCollapsed ? "Sair" : ""}
                  >
                    <LogOut className="w-5 h-5" />
                    {!sidebarCollapsed && <span className="text-inherit">Sair</span>}
                  </button>
                </div>
                {!sidebarCollapsed && (
                  <div className="mt-auto p-5 border-t border-slate-900/50 flex flex-col gap-0.5">
                    <span className="text-[9px] font-black uppercase tracking-[0.25em] text-gold">
                      Colégio Progresso Santista
                    </span>
                    <span className="text-[8px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Portal Corporativo
                    </span>
                  </div>
                )}
              </aside>

              {/* Main Content */}
              <main className={cn(
                "flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-4 md:p-[30px] pb-8 lg:pb-[30px] text-slate-800 dark:text-slate-200 print:overflow-visible print:p-0 print:static print:block print-container relative",
                isWorldCupTheme && view === "dashboard"
                  ? "bg-transparent"
                  : "bg-slate-100 dark:bg-slate-800"
              )}>
                <div
                  className="absolute inset-0 opacity-[0.10] pointer-events-none"
                  style={{
                    backgroundImage: `radial-gradient(rgba(168,141,68,0.2) 1px, transparent 1px)`,
                    backgroundSize: "18px 18px",
                  }}
                />
                <div className="relative z-10">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={view}
                      className="w-full"
                      {...getTabAnimation(view, busAnimationsEnabled)}
                    >
                      {view === "dashboard" && (
                        <DashboardView
                          isWorldCupTheme={isWorldCupTheme}
                          setIsWorldCupTheme={setIsWorldCupTheme}
                          user={user}
                          isAdmin={isAdmin}
                          isLoadingData={isLoadingData}
                          exams={filteredExams}
                          results={filteredResults}
                          setView={setView}
                          onSelectPrintExam={async (e) => {
                            setLoadingFullExam(true);
                            const full = await loadFullExam(e.id);
                            setLoadingFullExam(false);
                            if (full) {
                              setSelectedPrintExam(full);
                              setBackToView("dashboard");
                            } else {
                              alert("Não foi possível carregar a prova para visualização.");
                            }
                          }}
                          onEditExam={async (e) => {
                            if (!e || !e.id) {
                              setExamToEdit(e as any);
                              setView("create");
                              return;
                            }
                            setLoadingFullExam(true);
                            const full = await loadFullExam(e.id);
                            setLoadingFullExam(false);
                            if (full) {
                              setExamToEdit(full);
                              setView("create");
                            } else {
                              alert("Não foi possível carregar a prova.");
                            }
                          }}
                          onDeleteExam={handleDeleteExam}
                          professors={professors}
                          onReassignProfessor={setExamBeingReassigned}
                          userProfile={userProfile}
                          onRefresh={() =>
                            setRefreshTrigger((prev) => prev + 1)
                          }
                          readAnnouncements={readAnnouncements}
                          onMarkAsRead={(id) => {
                            const updated = [...readAnnouncements, id];
                            setGlobalReadAnnouncements(updated);
                            localStorage.setItem(
                              "cps_read_announcements",
                              JSON.stringify(updated),
                            );
                          }}
                          studentReports={filteredStudentReports}
                          onViewBancoProvas={(tab) => {
                            setBancoProvasInitialTab(tab);
                            setView("banco_provas");
                          }}
                        />
                      )}

                      {view === "agenda" && (
                        <AgendaEletronicaView
                          user={user}
                          schoolInfo={getSchoolInfo()}
                          userProfile={userProfile}
                          professors={professors}
                        />
                      )}
                      {view === "create" && (
                        <CreateExamView
                          user={user}
                          userProfile={userProfile}
                          setView={setView}
                          examToEdit={examToEdit}
                          professors={professors}
                          checkAndResolveExamConflict={checkAndResolveExamConflict}
                          onExamSaved={() => {
                            setExamToEdit(null);
                            setRefreshTrigger((prev) => prev + 1);
                            setView("banco_provas");
                          }}
                        />
                      )}
                                            {view === "banco_provas" && (
                        <BancoProvasView
                          viewMode="provas"
                          user={user}
                          isAdmin={isAdmin}
                          exams={exams}
                          setView={setView}
                          onSelectPrintExam={async (e) => {
                            setLoadingFullExam(true);
                            const full = await loadFullExam(e.id);
                            setLoadingFullExam(false);
                            if (full) {
                              setSelectedPrintExam(full);
                            } else {
                              alert("Não foi possível carregar a prova para visualização.");
                            }
                          }}
                          onEditExam={async (e) => {
                            if (!e || !e.id) {
                              setExamToEdit(e as any);
                              setView("create");
                              return;
                            }
                            setLoadingFullExam(true);
                            const full = await loadFullExam(e.id);
                            setLoadingFullExam(false);
                            if (full) {
                              setExamToEdit(full);
                              setView("create");
                            } else {
                              alert("Não foi possível carregar a prova.");
                            }
                          }}
                          onDeleteExam={handleDeleteExam}
                          onRestoreExam={handleRestoreExam}
                          onDeletePermanentExam={handleDeletePermanentExam}
                          onDuplicateExam={handleStartDuplicate}
                          userProfile={userProfile}
                          setBackToView={setBackToView}
                          professors={professors}
                          initialTab={bancoProvasInitialTab}
                        />
                      )}
                      {view === "banco_atividades" && (
                        <BancoProvasView
                          viewMode="atividades"
                          user={user}
                          isAdmin={isAdmin}
                          exams={exams}
                          setView={setView}
                          onSelectPrintExam={async (e) => {
                            setLoadingFullExam(true);
                            const full = await loadFullExam(e.id);
                            setLoadingFullExam(false);
                            if (full) {
                              setSelectedPrintExam(full);
                            } else {
                              alert("Não foi possível carregar a atividade para visualização.");
                            }
                          }}
                          onEditExam={async (e) => {
                            if (!e || !e.id) {
                              setExamToEdit(e as any);
                              setView("create");
                              return;
                            }
                            setLoadingFullExam(true);
                            const full = await loadFullExam(e.id);
                            setLoadingFullExam(false);
                            if (full) {
                              setExamToEdit(full);
                              setView("create");
                            } else {
                              alert("Não foi possível carregar a atividade.");
                            }
                          }}
                          onDeleteExam={handleDeleteExam}
                          onRestoreExam={handleRestoreExam}
                          onDeletePermanentExam={handleDeletePermanentExam}
                          onDuplicateExam={handleStartDuplicate}
                          userProfile={userProfile}
                          setBackToView={setBackToView}
                          professors={professors}
                          initialTab="Atividades"
                        />
                      )}
                      {view === "studentReports" && (
                        <StudentReportsView
                          user={user}
                          userProfile={userProfile}
                          isAdmin={isAdmin}
                          reports={filteredStudentReports.map((r) => {
                            if (isAdmin && professors.length > 0) {
                              const prof = professors.find(
                                (p) => p.uid === r.professorId,
                              );
                              if (prof)
                                return {
                                  ...r,
                                  professorName: prof.professional_name,
                                };
                            }
                            return r;
                          })}
                          refresh={() => setRefreshTrigger((prev) => prev + 1)}
                          onPrint={(report) => {
                            setSelectedReportForPrint(report);
                            setView("printReport");
                            setMultipleReportsToPrint([]);
                          }}
                          onPrintAll={(reports) => {
                            setMultipleReportsToPrint(reports);
                            setSelectedReportForPrint(null);
                            setView("printReport");
                          }}
                        />
                      )}
                      {view === "printReport" &&
                        (selectedReportForPrint ||
                          multipleReportsToPrint.length > 0) && (
                          <StudentReportPrintView
                            reports={
                              selectedReportForPrint
                                ? [selectedReportForPrint]
                                : multipleReportsToPrint
                            }
                            onBack={() => setView("studentReports")}
                          />
                        )}
                      {view === "print" && selectedPrintExam && (
                        <ExamPrintView
                          exam={selectedPrintExam}
                          onBack={() => setView(backToView)}
                        />
                      )}
                      {view === "admin" && isAdmin && (
                        <AdminView
                          user={user}
                          userProfile={userProfile}
                          absenceJustifications={absenceJustifications}
                          onSaveAbsenceJustifications={
                            handleSaveAbsenceJustifications
                          }
                          onResetPassword={async (targetUid, newPw) => {
                            const {
                              data: { session },
                            } = await supabase.auth.getSession();
                            const response = await fetch(
                              "/api/admin/reset-password",
                              {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  targetUid,
                                  newPassword: newPw,
                                  adminToken: session?.access_token,
                                }),
                              },
                            );
                            // Safely parse response - Vercel can return plain text errors
                            const text = await response.text();
                            let data: any = {};
                            try {
                              data = JSON.parse(text);
                            } catch {
                              // Server returned non-JSON (e.g. Vercel "A server error occurred")
                              throw new Error(
                                `Erro no servidor ao redefinir senha. Tente novamente. (${response.status})`
                              );
                            }
                            if (!response.ok) throw new Error(data.error || "Erro ao redefinir senha.");
                          }}
                        />
                      )}
                      {view === "settings" && (
                        <SettingsView
                          user={user}
                          userProfile={userProfile}
                          onProfileUpdated={(name, avatarUrl) => {
                            setUserProfile((prev: any) => {
                              const nextVal = prev
                                ? {
                                    ...prev,
                                    professional_name: name,
                                    avatar_url: avatarUrl,
                                  }
                                : {
                                    professional_name: name,
                                    avatar_url: avatarUrl,
                                  };
                              localStorage.setItem(
                                "cps_cached_profile",
                                JSON.stringify(nextVal),
                              );
                              return nextVal;
                            });
                            setUser((prev: any) => {
                              if (!prev) return prev;
                              return {
                                ...prev,
                                user_metadata: {
                                  ...prev.user_metadata,
                                  displayName: name,
                                  avatar_url: avatarUrl,
                                  avatar_base64: null,
                                },
                              };
                            });
                          }}
                          onPasswordChange={async (newPw) => {
                            const { error } = await supabase.auth.updateUser({
                              password: newPw + "_cpsAuth",
                            });
                            if (error) throw error;
                          }}
                          busAnimationsEnabled={busAnimationsEnabled}
                          onToggleBusAnimations={setBusAnimationsEnabled}
                        />
                      )}
                      {view === "diary" && (
                        <DigitalDiaryView
                          user={user}
                          isAdmin={isAdmin}
                          userProfile={userProfile}
                          setView={setView}
                          onConfigChange={setInitialDiaryConfig}
                          absenceJustifications={absenceJustifications}
                          onDuplicateExam={handleStartDuplicate}
                          checkAndResolveExamConflict={checkAndResolveExamConflict}
                          refreshTrigger={refreshTrigger}
                          onRefreshParentExams={fetchExams}
                          onRefreshParentResults={fetchResults}
                        />
                      )}
                      {view === "diary-reports" && (
                        <DiaryReportsView
                          onBack={() => setView("diary")}
                          selectedClass={initialDiaryConfig?.class || ""}
                          selectedSubject={initialDiaryConfig?.subject || ""}
                          classes={getFilteredClasses(userProfile, getSchoolInfo().classes)}
                          subjects={getSchoolInfo().subjects}
                          students={
                            Object.values(
                              getSchoolInfo().studentsDB,
                            ).flat() as any[]
                          }
                          exams={exams}
                          results={results}
                          lessons={[]}
                          attendanceRecords={[]}
                          medicalRecords={medicalRecords}
                          onSaveMedicalInfo={saveMedicalInfo}
                          isAdmin={isAdmin}
                          schoolInfo={getSchoolInfo()}
                          userProfile={userProfile}
                          onRefresh={() =>
                            setRefreshTrigger((prev) => prev + 1)
                          }
                        />
                      )}
                      {view === "boletim" && (
                        <BoletimView
                          results={filteredResults}
                          exams={filteredExams.filter((e) => !e.isAnnouncement)}
                          isAdmin={isAdmin}
                          user={user}
                          userProfile={userProfile}
                          onRefresh={() =>
                            setRefreshTrigger((prev) => prev + 1)
                          }
                        />
                      )}
                      {view === "cronograma" && (
                        <CronogramaEstudosView
                          exams={filteredExams.filter((e) => !e.isAnnouncement)}
                          isAdmin={isAdmin}
                          schoolInfo={getSchoolInfo()}
                          bimesters={[
                            "1º Bimestre",
                            "2º Bimestre",
                            "3º Bimestre",
                            "4º Bimestre",
                          ]}
                          userProfile={userProfile}
                          onRefresh={() =>
                            setRefreshTrigger((prev) => prev + 1)
                          }
                          user={user}
                        />
                      )}
                      {view === "error_report" && (
                        <ErrorReportView
                          user={user}
                          userProfile={userProfile}
                        />
                      )}
                      {view === "error_admin" && <ErrorAdminView />}
                      {view === "ti_auto_exam" && (
                        <TIAutoExamView
                          user={user}
                          userProfile={userProfile}
                          schoolInfo={getSchoolInfo()}
                          onBack={() => setView("dashboard")}
                        />
                      )}
                    </motion.div>
                  </AnimatePresence>

                  {/* Rodapé centralizado de assinatura do desenvolvedor (Antônio Carlos) */}
                  <div className="mt-12 mb-4 py-8 border-t border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center select-none print:hidden">
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-gold/80 mb-1">
                      Colégio Progresso Santista
                    </span>
                    <span className="text-[8px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-400 mb-4 font-sans">
                      Portal Corporativo
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        confetti({
                          particleCount: 155,
                          spread: 80,
                          origin: { y: 0.85 },
                        });
                        triggerAntonioEasterEgg();
                      }}
                      className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-600 hover:text-amber-500 dark:text-amber-500 dark:hover:text-amber-400 transition-all cursor-pointer outline-none transform active:scale-95 select-none"
                    >
                      <span className="inline-block animate-bounce text-sm">
                        👨‍💻
                      </span>
                      <span className="border-b border-dashed border-amber-500/40 group-hover:border-amber-450">
                        Criado por Antônio Carlos
                      </span>
                    </button>
                  </div>
                </div>
              </main>
            </div>

            {examBeingReassigned && (
              <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl shadow-2xl max-w-md w-full p-8 border border-border"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-primary uppercase tracking-tight">
                      Reatribuir Professor
                    </h3>
                    <button
                      onClick={() => setExamBeingReassigned(null)}
                      className="text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <p className="text-sm text-slate-700 dark:text-slate-300 mb-6 leading-relaxed">
                    Você está mudando o vínculo da avaliação{" "}
                    <b className="text-accent">
                      "{stripHtml(examBeingReassigned.title)}"
                    </b>
                    . Isso fará com que os resultados e diários sejam migrados
                    para o novo professor.
                  </p>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                        Selecione o Novo Professor
                      </label>
                      <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2">
                        {professors
                          .filter(
                            (p) => p.uid !== examBeingReassigned.professorId,
                          )
                          .map((prof) => (
                            <button
                              key={prof.uid}
                              onClick={() =>
                                handleReassignProfessor(
                                  examBeingReassigned.id,
                                  prof.uid,
                                )
                              }
                              className="flex items-center gap-3 p-3 text-left bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-accent hover:bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 transition-all group"
                            >
                              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-colors">
                                <UserIcon className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                  {prof.professional_name || prof.display_name}
                                </p>
                                <p className="text-[10px] text-slate-700 dark:text-slate-300 uppercase font-medium">
                                  {prof.email}
                                </p>
                              </div>
                            </button>
                          ))}
                        {professors.length <= 1 && (
                          <p className="text-center text-slate-600 dark:text-slate-400 py-4 text-sm font-medium italic">
                            Nenhum outro professor disponível.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setExamBeingReassigned(null)}
                    className="w-full mt-6 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-lg transition-colors border border-transparent hover:border-slate-400 dark:hover:border-slate-700"
                  >
                    Cancelar
                  </button>
                </motion.div>
              </div>
            )}

            {/* EASTER EGG POP-UP DE ASSINATURA DE ANTÔNIO CARLOS */}
            <AnimatePresence>
              {isAntonioEggActive && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.3, rotate: -25 }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      rotate: 0,
                      transition: {
                        type: "spring",
                        stiffness: 200,
                        damping: 15,
                      },
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0.5,
                      rotate: 15,
                      transition: { duration: 0.2 },
                    }}
                    className="relative max-w-sm w-full bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 shadow-2xl text-center overflow-hidden"
                  >
                    {/* Decorative top border */}
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600" />

                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

                    {/* Fun bouncy crown animation */}
                    <div className="flex justify-center mb-4">
                      <motion.div
                        animate={{
                          rotate: [0, 15, -15, 15, 0],
                          scale: [1, 1.15, 0.95, 1.1, 1],
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          repeatType: "reverse",
                        }}
                        className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center shadow-lg border border-amber-400 text-3xl select-none"
                      >
                        👨‍💻
                      </motion.div>
                    </div>

                    <h3 className="text-lg font-black text-amber-500 uppercase tracking-tight mb-1">
                      SELADO PELO DESENVOLVEDOR
                    </h3>
                    <p className="text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-4">
                      SISTEMA HOMOLOGADO ✅ </p>

                    <div className="bg-slate-950/80 rounded-2xl p-5 border border-amber-500/30 mb-5 text-left relative shadow-inner">
                      <span className="absolute -top-2.5 left-4 bg-slate-900 px-2 py-0.5 text-[8px] font-black text-amber-400 border border-amber-500/30 rounded font-mono">
                        AUTOR DO PORTAL:
                      </span>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-100 mb-1 font-mono">
                        Antônio Carlos
                      </p>
                      <div className="h-px bg-slate-800/80 my-2" />
                      <p className="text-[12px] text-amber-200 font-extrabold tracking-wide leading-relaxed whitespace-pre-line drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                        "{antonioPhrases[eggPhraseIndex]}"
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAntonioEggActive(false)}
                        className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all duration-300 shadow-lg active:scale-95 cursor-pointer outline-none"
                      >
                        Sensacional! Antônio é o mestre! 👑
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setEggPhraseIndex(
                            (prev) => (prev + 1) % antonioPhrases.length,
                          )
                        }
                        className="w-full py-1.5 bg-slate-800 hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-all border border-slate-200 dark:border-slate-800/60 cursor-pointer outline-none"
                      >
                        Girar mais lógica 🔄
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Comical School Bus Transition overlay on Login/Logout */}
      <AnimatePresence>
        {showBusAnim && <SchoolBusTransition text={busText} />}
      </AnimatePresence>

      {/* Modal Duplicar Prova */}
      <AnimatePresence>
        {duplicatingExam && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[110] p-4 text-left">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden text-left border-4 border-white"
            >
              <div className="p-6 border-b-2 border-slate-200 dark:border-slate-800 bg-[#3b5998] text-white flex items-center justify-between">
                <div>
                  <span className="px-2 py-0.5 bg-white/20 rounded text-[9px] font-black uppercase tracking-widest text-white">
                    Duplicar Avaliação
                  </span>
                  <h3 className="font-black text-xl uppercase tracking-tighter leading-tight drop-shadow-sm mt-1">
                    {stripHtml(duplicatingExam.title)}
                  </h3>
                </div>
                <button
                  onClick={() => setDuplicatingExam(null)}
                  className="p-2 hover:bg-white/10 rounded-full transition-all active:scale-90"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {/* Turma / Class selection */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-35 mb-1">
                    Turma de Destino
                  </label>
                  <select
                    value={dupClass}
                    onChange={(e) => setDupClass(e.target.value)}
                    className="w-full rounded-xl px-4 py-2 text-sm font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500 outline-none"
                  >
                    {getFilteredClasses(userProfile, getSchoolInfo().classes).map((cls) => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Bimestre selection */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-35 mb-1">
                    Bimestre de Destino
                  </label>
                  <select
                    value={dupBimester}
                    onChange={(e) => setDupBimester(e.target.value)}
                    className="w-full rounded-xl px-4 py-2 text-sm font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500 outline-none"
                  >
                    <option value="1º Bimestre">1º Bimestre</option>
                    <option value="2º Bimestre">2º Bimestre</option>
                    <option value="3º Bimestre">3º Bimestre</option>
                    <option value="4º Bimestre">4º Bimestre</option>
                  </select>
                </div>

                {/* Tipo de Prova selection */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-35 mb-1">
                    Tipo de Prova de Destino
                  </label>
                  <select
                    value={dupExamType}
                    onChange={(e) => setDupExamType(e.target.value)}
                    className="w-full rounded-xl px-4 py-2 text-sm font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500 outline-none"
                  >
                    {(getSchoolInfo().examCategories || DEFAULT_SCHOOL_INFO.examCategories).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Data prevista selection */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-35 mb-1">
                    Data Prevista
                  </label>
                  <input
                    type="date"
                    value={dupExamDate}
                    onChange={(e) => setDupExamDate(e.target.value)}
                    className="w-full rounded-xl px-4 py-2 text-sm font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>

                {/* Warning message if no change */}
                {(() => {
                  const isSameClass = dupClass === (duplicatingExam.classYear || duplicatingExam.class_year);
                  const isSameBimester = dupBimester === duplicatingExam.bimester;
                  const isSameType = dupExamType === (duplicatingExam.examType || duplicatingExam.exam_type);
                  
                  const violatesDuplicationRequirement = isSameClass && isSameBimester && isSameType;

                  if (violatesDuplicationRequirement) {
                    return (
                      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-400 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600 dark:text-amber-450" />
                        <span>Você deve alterar o tipo de prova (ex: de PI para PII) ou o bimestre para poder continuar a duplicação na mesma turma.</span>
                      </div>
                    );
                  }
                  return null;
                })()}

              </div>
              <div className="p-6 border-t-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end gap-2">
                <button
                  onClick={() => setDuplicatingExam(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs uppercase transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    const isSameClass = dupClass === (duplicatingExam.classYear || duplicatingExam.class_year);
                    const isSameBimester = dupBimester === duplicatingExam.bimester;
                    const isSameType = dupExamType === (duplicatingExam.examType || duplicatingExam.exam_type);
                    if (isSameClass && isSameBimester && isSameType) {
                      alert("Para duplicar na mesma turma, você deve alterar o tipo de prova (PI, PII, etc.) ou o bimestre.");
                      return;
                    }

                    const targetSubject = duplicatingExam.subject;
                    try {
                      const { data, error } = await supabase
                        .from("exams")
                        .select("id, title, answer_key")
                        .eq("class_year", dupClass)
                        .eq("bimester", dupBimester)
                        .eq("subject", targetSubject)
                        .eq("exam_type", dupExamType);

                      if (error) throw error;

                      const activeConflicts = (data || []).filter((e: any) => {
                        const meta = e.answer_key?._metadata || {};
                        return !meta.deletedAt;
                      });

                      if (activeConflicts.length > 0) {
                        alert(`Já existe uma prova ativa do tipo "${dupExamType}" no "${dupBimester}" para a turma "${dupClass}" e disciplina "${targetSubject}". Altere o tipo de prova, o bimestre ou a turma de destino para prosseguir.`);
                        return;
                      }

                      const cleanTitle = duplicatingExam.title.replace(/\s*\(CÓPIA\)/gi, "");
                      const newTitle = `${cleanTitle} (CÓPIA)`;
                      const { error: insertError } = await supabase.from("exams").insert({
                        professor_id: user.id,
                        title: newTitle.toUpperCase(),
                        subject: targetSubject,
                        exam_type: dupExamType,
                        exam_date: dupExamDate || new Date().toISOString().split("T")[0],
                        class_year: dupClass,
                        bimester: dupBimester,
                        questions: duplicatingExam.questions || [],
                        answer_key: {
                          ...(duplicatingExam.answerKey || duplicatingExam.answer_key || {}),
                          _metadata: {
                            ...(duplicatingExam.answerKey?._metadata || duplicatingExam.answer_key?._metadata || {}),
                            classYear: dupClass,
                            bimester: dupBimester,
                            examType: dupExamType,
                            examDate: dupExamDate,
                            deletedAt: undefined
                          }
                        }
                      });

                      if (insertError) throw insertError;

                      alert("Avaliação duplicada com sucesso!");
                      setDuplicatingExam(null);
                      setRefreshTrigger((prev) => prev + 1);
                    } catch (err: any) {
                      alert("Erro ao duplicar prova: " + err.message);
                    }
                  }}
                  disabled={(() => {
                    const isSameClass = dupClass === (duplicatingExam.classYear || duplicatingExam.class_year);
                    const isSameBimester = dupBimester === duplicatingExam.bimester;
                    const isSameType = dupExamType === (duplicatingExam.examType || duplicatingExam.exam_type);
                    return isSameClass && isSameBimester && isSameType;
                  })()}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs uppercase disabled:opacity-50 transition-colors"
                >
                  Confirmar Duplicação
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Global Comical School Bus transition component
function SchoolBusTransition({ text }: { text: string }) {
  return (
    <div className="fixed inset-0 z-[999] bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center overflow-hidden pointer-events-none select-none">
      {/* Floating school backdrops representing the classroom environment */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            initial={{
              opacity: 0,
              x: Math.random() * 400 - 200,
              y: 600,
              rotate: Math.random() * 360,
            }}
            animate={{
              opacity: [0, 1, 1, 0],
              y: -250,
              rotate: Math.random() * 360 + 360,
              x: Math.random() * 400 - 200,
            }}
            transition={{
              duration: 2.3,
              delay: i * 0.12,
              ease: "easeOut",
            }}
            className="absolute text-5xl"
            style={{
              left: `${Math.random() * 80 + 10}%`,
              top: `${Math.random() * 50 + 20}%`,
            }}
          >
            {
              ["✨", "🎒", "📚", "✏️", "📐", "🚌", "🌟", "🎉", "🎨", "🎭"][
                i % 10
              ]
            }
          </motion.div>
        ))}
      </div>

      <div className="text-center space-y-9 relative px-4 w-full max-w-lg">
        {/* The School Bus container */}
        <div className="relative flex justify-center w-full">
          <motion.div
            initial={{ x: "-120vw", rotate: -5 }}
            animate={{
              x: ["-120vw", "0vw", "0vw", "120vw"],
              rotate: [1, -3, 3, -1, 0, 3],
              y: [0, -10, 0, -12, 0, -5, 0],
            }}
            transition={{
              duration: 2.5,
              times: [0, 0.35, 0.72, 1], // holds briefly in middle to build anticipation, then departs
              ease: "easeInOut",
            }}
            className="relative"
          >
            {/* Bus Frame */}
            <div className="relative w-80 h-36 bg-amber-400 rounded-3xl border-4 border-slate-900 shadow-2xl flex flex-col justify-between overflow-hidden p-2">
              {/* Bus Glass Windows featuring passengers */}
              <div className="flex gap-2.5 justify-center mt-2.5">
                {[...Array(4)].map((_, idx) => (
                  <div
                    key={idx}
                    className="w-14 h-12 bg-sky-200 border-2 border-slate-900 rounded-lg flex items-center justify-center relative overflow-hidden"
                  >
                    {/* Gloss / shine reflection overlay */}
                    <div className="absolute top-0 right-0 w-full h-1/2 bg-white/ -skew-x-20" />
                    <motion.span
                      animate={{ y: [0, -4, 0] }}
                      transition={{
                        duration: 0.3,
                        delay: idx * 0.08,
                        repeat: Infinity,
                      }}
                      className="text-2xl relative z-10"
                    >
                      {["👩‍🏫", "👨‍🎓", "🎒", "🏫"][idx]}
                    </motion.span>
                  </div>
                ))}
              </div>

              {/* School Label prominently placed */}
              <div className="bg-slate-900 text-amber-400 font-sans font-black text-[10px] py-1 px-4 tracking-[0.25em] text-center rounded-lg mx-3 uppercase border border-amber-500/30">
                Colégio Progresso
              </div>

              {/* Bottom Details (Grill, Lights) */}
              <div className="flex justify-between items-center px-4 mb-1">
                <div className="w-4 h-4 bg-yellow-400 rounded-full border-2 border-slate-900 animate-pulse shadow-[0_0_8px_rgba(250,204,21,1)]" />
                <div className="flex-1 mx-4 h-2 bg-slate-800 rounded-full" />
                <div className="w-4 h-4 bg-yellow-400 rounded-full border-2 border-slate-900 animate-pulse shadow-[0_0_8px_rgba(250,204,21,1)]" />
              </div>
            </div>

            {/* Wheels bouncing independently */}
            <div className="absolute -bottom-5 left-10 flex justify-between w-60">
              {/* Left Wheel */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{
                  duration: 0.35,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="w-11 h-11 bg-slate-950 rounded-full border-4 border-slate-700 flex items-center justify-center relative shadow-md"
              >
                <div className="w-4 h-4 bg-slate-400 rounded-full" />
                <div className="absolute inset-0 border-2 border-dashed border-white/20 rounded-full" />
              </motion.div>

              {/* Right Wheel */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{
                  duration: 0.35,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="w-11 h-11 bg-slate-950 rounded-full border-4 border-slate-700 flex items-center justify-center relative shadow-md"
              >
                <div className="w-4 h-4 bg-slate-400 rounded-full" />
                <div className="absolute inset-0 border-2 border-dashed border-white/20 rounded-full" />
              </motion.div>
            </div>

            {/* Comical smoke puff cloud trails */}
            <div className="absolute bottom-1 -left-6 flex flex-col gap-1 items-end pointer-events-none">
              <motion.span
                animate={{
                  scale: [0.5, 1.5],
                  opacity: [1, 0],
                  x: [-10, -40],
                  y: [-5, -15],
                }}
                transition={{
                  duration: 0.5,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
                className="text-lg"
              >
                💨</motion.span>
              <motion.span
                animate={{
                  scale: [0.3, 1.2],
                  opacity: [1, 0],
                  x: [-5, -25],
                  y: [0, -10],
                }}
                transition={{
                  duration: 0.4,
                  repeat: Infinity,
                  delay: 0.15,
                  ease: "easeOut",
                }}
                className="text-sm"
              >
                💨</motion.span>
            </div>

            {/* Simulated Headlight Cones */}
            <div className="absolute bottom-4 -right-16 w-16 h-10 bg-amber-400/20 rounded-r-3xl blur-md pointer-events-none transform origin-left" />

            {/* Comic book style "BI-BIIIP!" popup bubble text */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0, 1, 1, 0],
                opacity: [0, 1, 1, 0],
                y: [-20, -35, -35, -50],
              }}
              transition={{ times: [0, 0.15, 0.85, 1], duration: 2.3 }}
              className="absolute -top-14 right-2 bg-yellow-400 text-slate-950 border-2 border-slate-900 px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-2xl shadow-xl flex items-center gap-1 shrink-0 whitespace-nowrap"
            >
              <span className="text-xs">🤖</span> BI-BIIIP!
              <div className="absolute bottom-[-6px] right-6 w-2 h-2 bg-yellow-400 border-r-2 border-b-2 border-slate-900 transform rotate-45" />
            </motion.div>
          </motion.div>
        </div>

        {/* Dynamic transition quote or message */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, type: "spring", stiffness: 140 }}
          className="space-y-2 select-none"
        >
          <div className="text-amber-400 font-display font-black text-xl md:text-2xl uppercase tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] flex items-center justify-center gap-3">
            <span>✨</span>
            <span className="animate-pulse">{text}</span>
            <span>✨</span>
          </div>
          <div className="text-slate-700 dark:text-slate-400 font-sans font-extrabold text-[9px] tracking-widest uppercase">
            Sincronizando com os servidores pedagógicos do colégio...
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// Sub-components
function NavButton({
  active,
  onClick,
  icon,
  label,
  collapsed,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: React.ReactNode;
  collapsed?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center transition-all duration-300 font-semibold w-full text-left rounded-xl",
        collapsed ? "justify-center px-0 py-3" : "gap-3 px-4 py-3 text-[15px]",
        active
          ? "bg-accent/15 border-l-4 border-gold text-white shadow-inner shadow-black/10 font-bold"
          : "text-slate-300 hover:bg-slate-800 hover:text-white",
      )}
      title={collapsed ? label : ""}
    >
      <div
        className={cn(
          "flex-shrink-0 transition-colors",
          active ? "text-gold" : "text-slate-600 dark:text-slate-400 group-hover:text-white",
        )}
      >
        {icon}
      </div>
      {!collapsed && <span className="text-inherit flex items-center min-w-0 w-full">{label}</span>}
    </button>
  );
}

function MobileNavButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center p-2 rounded-xl transition-all flex-1 min-w-[50px] relative",
        active
          ? "text-accent dark:text-accent"
          : "text-slate-700 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-700 dark:text-slate-300",
      )}
    >
      {active && (
        <motion.div
          layoutId="mobile-nav-indicator"
          className="absolute inset-0 bg-accent/5 dark:bg-accent/10 rounded-xl -z-10"
        />
      )}
      <div
        className={cn(
          "mb-1 transition-all duration-300",
          active ? "scale-110 -translate-y-1" : "",
        )}
      >
        {React.cloneElement(icon as React.ReactElement, { size: 20 })}
      </div>
      <span
        className={cn(
          "text-[9px] font-black uppercase tracking-wider transition-opacity text-inherit",
          active ? "opacity-100" : "opacity-60",
        )}
      >
        {label}
      </span>
    </button>
  );
}

function LoginView({
  error,
  setError,
  triggerAntonioEasterEgg,
  onFamilyLogin,
  schoolInfo,
  onOfflineLogin,
}: {
  error: string | null;
  setError: (e: string | null) => void;
  triggerAntonioEasterEgg: () => void;
  onFamilyLogin: (student: any, role: string) => void;
  schoolInfo: any;
  onOfflineLogin?: (user: any, profile: any, isAdmin: boolean) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginType, setLoginType] = useState<"employee" | "student">("student");
  const [isMobileLoginOpen, setIsMobileLoginOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (loginType === "student") {
      try {
        // Fetch fresh settings from the server right before validating to avoid stale cache on mobile
        let freshSchoolInfo = schoolInfo;
        try {
          const resSettings = await fetch("/api/admin/school-settings");
          const settingsData = await resSettings.json();
          if (settingsData && settingsData.success && settingsData.schoolInfo) {
            freshSchoolInfo = settingsData.schoolInfo;
            localStorage.setItem("schoolInfo", JSON.stringify(freshSchoolInfo));
          }
        } catch (settingsErr) {
          console.warn("Could not fetch fresh school settings for login:", settingsErr);
        }

        let matchedSession: { student: any; role: string } | null = null;
        const allStudents = Object.values(freshSchoolInfo?.studentsDB || {}).flat() as any[];
        
        for (const st of allStudents) {
          if (st.agendaAccess) {
            const roles = ["student", "guardian1", "guardian2", "financial"];
            for (const role of roles) {
              const access = (st.agendaAccess as any)[role];
              // strict string comparison
              if (
                 access && 
                 access.username?.trim().toLowerCase() === username.trim().toLowerCase() && 
                 access.pin?.trim() === password.trim()
              ) {
                matchedSession = { student: st, role };
                break;
              }
            }
          }
          if (matchedSession) break;
        }

        if (matchedSession) {
          setTimeout(() => {
            onFamilyLogin(matchedSession?.student, matchedSession?.role || "student");
            setLoading(false);
          }, 800);
          return;
        } else {
          setError("Usuário ou senha inválidos. Verifique as credenciais.");
          setLoading(false);
          return;
        }
      } catch (err) {
        setError("Erro de autenticação");
        setLoading(false);
        return;
      }
    }

    // Safety: Clear any potentially corrupted auth tokens before attempting a fresh login
    // this helps prevent "Refresh Token Not Found" errors during the sign-in exchange
    try {
      const allKeys = Object.keys(localStorage);
      allKeys.forEach((key) => {
        if (key.includes("sb-") && key.includes("auth-token")) {
          localStorage.removeItem(key);
        }
      });
    } catch (_) {}

    try {
      const safeUsername = username
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "");
      const supabaseEmail = `${safeUsername}@cps.local`;
      const supabasePassword = password + "_cpsAuth"; // Ensures >= 6 chars

      // SignIn
      let { data: authData, error } = await supabase.auth.signInWithPassword({
        email: supabaseEmail,
        password: supabasePassword,
      });

      // Auto-create TI user if it doesn't exist
      if (error && safeUsername === "ti" && password === "15704") {
        const { error: signUpError } = await supabase.auth.signUp({
          email: supabaseEmail,
          password: supabasePassword,
          options: {
            data: {
              professional_name: "TI Escolar",
              role: "admin, ti",
            },
          },
        });
        if (!signUpError) {
          const res = await supabase.auth.signInWithPassword({
            email: supabaseEmail,
            password: supabasePassword,
          });
          authData = res.data;
          error = res.error;
        }
      }

      if (error) {
        // Record failed login attempt (Attempt to self-heal if it's Antonio)
        robustFetch("/api/auth/record-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: supabaseEmail,
            uid: null,
            status: "failed",
            failureReason: error.message,
          }),
        }).catch(() => {});

        throw error;
      }

      // Record successful login attempt
      if (authData?.user) {
        robustFetch("/api/auth/record-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: supabaseEmail,
            uid: authData.user.id,
            status: "success",
          }),
        }).catch(() => {});
      }
    } catch (err: any) {
      const msg = err.message || String(err || "");
      const isNetworkOrQuotaError = (
        msg === "Failed to fetch" ||
        msg.includes("Failed to fetch") ||
        msg.includes("Network Error") ||
        msg.includes("NetworkError") ||
        msg.includes("exceed_egress_quota") ||
        msg.includes("restricted") ||
        msg.includes("CORS") ||
        msg.includes("ERR_NETWORK") ||
        msg.includes("ERR_CONNECTION") ||
        msg.includes("TypeError") ||
        msg.includes("AbortError") ||
        msg.includes("Load failed") ||
        msg.includes("net::") ||
        msg.includes("fetch")
      );

      // ── OFFLINE FALLBACK: When Supabase is unreachable or if we are in local fallback mode, allow local backup logins ──
      if ((isNetworkOrQuotaError || localStorage.getItem("cps_offline_mode") === "true") && onOfflineLogin) {
        const safeUser = username.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
        const fallbackEmail = safeUser.includes("@") ? safeUser : `${safeUser}@cps.local`;

        try {
          const res = await fetch("/api/backup/offline-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: fallbackEmail })
          });

          if (res.ok) {
            const data = await res.json();
            const profile = data.user;
            
            const syntheticUser = {
              id: profile.id,
              email: profile.email,
              app_metadata: {},
              user_metadata: {
                professional_name: profile.user_metadata.professional_name,
                role: profile.user_metadata.role,
              },
              aud: "authenticated",
              created_at: new Date().toISOString(),
            } as any;

            const profileDetails = {
              uid: profile.id,
              email: profile.email,
              username: profile.user_metadata.username || safeUser,
              role: profile.user_metadata.role,
              professional_name: profile.user_metadata.professional_name,
              assigned_subjects: profile.user_metadata.assigned_subjects || [],
              assigned_classes: profile.user_metadata.assigned_classes || []
            };

            const rolesArr = (profile.user_metadata.role || "").split(",").map((r: string) => r.trim().toLowerCase());
            const cachedIsAdmin = rolesArr.some((r: string) =>
              ["admin", "ti", "suporte", "tecnico", "vice_diretor", "coordenador_all", "coordenador_fund1", "coordenador_fund2", "secretaria_all", "diretor", "diretoria"].includes(r) ||
              r.includes("admin") || r.includes("ti") || r.includes("diretor") || r.includes("coordenador") || r.includes("secretaria")
            );

            localStorage.setItem("cps_cached_profile", JSON.stringify(profileDetails));
            localStorage.setItem("cps_offline_mode", "true");
            localStorage.setItem("cps_offline_user", JSON.stringify(syntheticUser));
            
            console.warn("[OFFLINE LOGIN] Logged in offline via backup registry:", safeUser);
            onOfflineLogin(syntheticUser, profileDetails, cachedIsAdmin);
            return; // Skip error display
          }
        } catch (offlineErr) {
          console.error("Erro ao autenticar localmente:", offlineErr);
        }

        // Hardcoded offline credentials for critical accounts as backup
        const offlineAccounts: Record<string, { password: string; profile: any; isAdmin: boolean }> = {
          "ti": {
            password: "15704",
            profile: {
              uid: "offline-ti-user",
              email: "ti@cps.local",
              username: "ti",
              role: "admin, ti",
              professional_name: "TI Escolar",
              assigned_subjects: [],
              assigned_classes: [],
            },
            isAdmin: true,
          },
          "cps": {
            password: "15704",
            profile: {
              uid: "offline-cps-user",
              email: "cps@cps.local",
              username: "cps",
              role: "admin",
              professional_name: "Administrador CPS",
              assigned_subjects: [],
              assigned_classes: [],
            },
            isAdmin: true,
          },
        };

        const offlineAccount = offlineAccounts[safeUser];
        if (offlineAccount && password === offlineAccount.password) {
          const syntheticUser = {
            id: offlineAccount.profile.uid,
            email: offlineAccount.profile.email,
            app_metadata: {},
            user_metadata: {
              professional_name: offlineAccount.profile.professional_name,
              role: offlineAccount.profile.role,
            },
            aud: "authenticated",
            created_at: new Date().toISOString(),
          } as any;

          localStorage.setItem("cps_cached_profile", JSON.stringify(offlineAccount.profile));
          localStorage.setItem("cps_offline_mode", "true");
          localStorage.setItem("cps_offline_user", JSON.stringify(syntheticUser));

          console.warn("[OFFLINE LOGIN] Supabase unreachable. Logging in offline as critical user:", safeUser);
          onOfflineLogin(syntheticUser, offlineAccount.profile, offlineAccount.isAdmin);
          return;
        }
      }

      // ── Standard error handling ──
      if (msg.includes("rate limit")) {
        setError(
          "Muitas tentativas. Por favor, aguarde alguns minutos antes de tentar novamente.",
        );
      } else if (msg.includes("Invalid login credentials")) {
        setError("Usuário ou senha incorretos.");
      } else if (
        msg.includes("Refresh Token Not Found") ||
        msg.includes("Invalid Refresh Token")
      ) {
        setError(
          "Sua sessão expirou. Por favor, atualize a página e tente novamente.",
        );
      } else if (isNetworkOrQuotaError) {
        setError(
          "Erro de Conexão: Servidor indisponível. Para login offline, use as credenciais TI.",
        );
      } else {
        setError(msg || "Ocorreu um erro ao processar sua solicitação.");
      }
    } finally {
      setLoading(false);
    }
  };

  const worldCupTeams = [
    { code: "us", name: "Estados Unidos" },
    { code: "mx", name: "México" },
    { code: "ca", name: "Canadá" },
    { code: "ar", name: "Argentina" },
    { code: "fr", name: "França" },
    { code: "de", name: "Alemanha" },
    { code: "es", name: "Espanha" },
    { code: "pt", name: "Portugal" },
    { code: "it", name: "Itália" },
    { code: "gb", name: "Inglaterra" },
    { code: "nl", name: "Holanda" },
    { code: "be", name: "Bélgica" },
    { code: "hr", name: "Croácia" },
    { code: "jp", name: "Japão" },
    { code: "kr", name: "Coreia do Sul" },
    { code: "au", name: "Austrália" },
    { code: "uy", name: "Uruguai" },
    { code: "co", name: "Colômbia" },
    { code: "ma", name: "Marrocos" },
    { code: "sn", name: "Senegal" },
    { code: "cm", name: "Camarões" },
    { code: "gh", name: "Gana" },
    { code: "sa", name: "Arábia Saudita" },
    { code: "cr", name: "Costa Rica" },
    { code: "pa", name: "Panamá" },
    { code: "jm", name: "Jamaica" },
    { code: "ec", name: "Equador" },
    { code: "pe", name: "Peru" },
    { code: "ch", name: "Suíça" },
    { code: "dk", name: "Dinamarca" },
    { code: "pl", name: "Polônia" },
    { code: "dz", name: "Argélia" },
    { code: "cl", name: "Chile" },
    { code: "py", name: "Paraguai" },
    { code: "ve", name: "Venezuela" },
    { code: "ua", name: "Ucrânia" },
    { code: "tr", name: "Turquia" },
    { code: "at", name: "Áustria" },
    { code: "se", name: "Suécia" },
    { code: "no", name: "Noruega" },
    { code: "hu", name: "Hungria" },
    { code: "ir", name: "Irã" },
    { code: "qa", name: "Catar" },
    { code: "ae", name: "Emirados Árabes" },
    { code: "eg", name: "Egito" },
    { code: "ng", name: "Nigéria" },
    { code: "nz", name: "Nova Zelândia" },
    { code: "za", name: "África do Sul" }
  ];

  return (
    <div className="min-h-screen flex items-start justify-center p-6 transition-colors bg-[#020d04] relative overflow-hidden bg-[url('/neymar_background.png')] bg-cover bg-no-repeat bg-center pt-8 md:pt-12">
      {/* Drifting World Cup Flags (Windows-compatible PNGs distributed on side columns to keep center readable) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-100">
        {worldCupTeams.map((team, idx) => {
          // Keep center area (30% to 70%) clear of drifting flags
          const isLeft = idx % 2 === 0;
          const left = isLeft 
            ? (idx * 2.5) % 26 + 2  // Left side: 2% to 28%
            : (idx * 2.5) % 26 + 72; // Right side: 72% to 98%
          
          const top = (idx * 6.5) % 90 + 5; // vertical distribution
          const delay = (idx % 8) * 0.4;
          const duration = 12 + (idx % 6) * 4;
          const scale = 0.75 + (idx % 3) * 0.15; // varying sizes
          const opacity = 1; // 100% opaque as requested

          return (
            <motion.div
              key={`flag-drift-${idx}`}
              className="absolute"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                scale,
                opacity,
              }}
              animate={{
                y: [0, -15, 15, 0],
                x: [0, 10, -10, 0],
                rotate: [0, 8, -8, 0]
              }}
              transition={{
                duration,
                delay,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <img
                src={`https://flagcdn.com/w40/${team.code}.png`}
                alt={team.name}
                className="w-10 h-7 object-cover rounded shadow-lg border border-white/25 hover:opacity-100 transition-opacity duration-300"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          );
        })}
      </div>

      {/* Ambient overlay with stadium lighting glow */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#010803]/95 via-transparent to-[#010803]/70 mix-blend-multiply pointer-events-none z-0" />

      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full bg-slate-950/90 backdrop-blur-md text-white border-b border-yellow-400/40 shadow-[0_10px_50px_rgba(0,0,0,0.6)] z-10 transition-all duration-500 py-3.5 px-4 md:px-8 relative"
      >
        <div className="max-w-7xl mx-auto flex flex-col xl:flex-row items-center justify-between gap-4">
          
          {/* Section 1: Logos & School Title */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-slate-900/90 p-2 rounded-xl flex items-center gap-2 border border-yellow-400/20">
              <img src={LOGO_VINHO} alt="Logo CPS" className="w-8 h-8 object-contain" />
              <div className="w-px h-6 bg-slate-700"></div>
              <img src={LOGO_COC} alt="Plataforma COC" className="h-5 object-contain" />
            </div>
            <div className="text-left">
              <h1 className="text-xs md:text-sm font-display font-black text-white uppercase tracking-tight leading-none">
                Colégio Progresso
              </h1>
              <span className="text-[8px] font-black tracking-[0.2em] text-slate-400 uppercase block mt-1">
                Portal Unificado
              </span>
            </div>
          </div>

          {/* Section 2: Big Highlighted Brazil Flag & Stars & Rumo ao Hexa */}
          <div className="flex items-center gap-3 shrink-0 bg-slate-900/40 px-3.5 py-1.5 rounded-xl border border-yellow-400/15">
            {/* Stars */}
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((starIdx) => (
                <svg 
                  key={`star-gold-${starIdx}`} 
                  className="w-4 h-4 text-yellow-400 fill-yellow-400 drop-shadow-[0_0_3px_rgba(250,204,21,0.8)]" 
                  viewBox="0 0 24 24"
                >
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                </svg>
              ))}
              <motion.div
                animate={{ scale: [1, 1.25, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="relative flex items-center justify-center"
              >
                <svg className="w-5.5 h-5.5 text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,1)]" viewBox="0 0 24 24">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                </svg>
                <span className="absolute text-[8px] font-black text-green-950 top-[5px]">6ª</span>
              </motion.div>
            </div>

            {/* Brazil Flag */}
            <motion.div 
              animate={{ rotate: [0, 1, -1, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="relative p-0.5 rounded-lg bg-gradient-to-r from-green-500 to-yellow-400 border border-yellow-400 shadow-[0_0_12px_rgba(34,197,94,0.5)]"
            >
              <img
                src="https://flagcdn.com/w80/br.png"
                alt="Brasil"
                className="w-12 h-8 object-cover rounded"
                referrerPolicy="no-referrer"
              />
            </motion.div>

            {/* Title / Hexa Text */}
            <div className="text-left hidden sm:block">
              <span className="text-[10px] font-black text-yellow-300 block tracking-widest animate-pulse">
                🏆 RUMO AO HEXA 2026 🏆
              </span>
            </div>
          </div>

          {/* Section 3: Forms and Switcher */}
          <div className="flex flex-col md:flex-row items-center gap-3 w-full xl:w-auto mt-2 md:mt-0">
            {/* Mobile Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMobileLoginOpen(!isMobileLoginOpen)}
              className="md:hidden w-full bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 py-2 rounded-lg font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
            >
              {isMobileLoginOpen ? (
                <>
                  <X className="w-3.5 h-3.5" /> Ocultar Login
                </>
              ) : (
                <>
                  <UserIcon className="w-3.5 h-3.5" /> Fazer Login
                </>
              )}
            </button>

            {/* Form Content */}
            <div className={`w-full md:w-auto flex-col md:flex-row items-center gap-3 ${isMobileLoginOpen ? "flex" : "hidden md:flex"}`}>
              {/* Custom Toggle Switcher */}
              <div className="flex w-full sm:w-auto bg-slate-900/60 p-0.5 rounded-lg border border-yellow-400/20 shrink-0">
                <button
                  type="button"
                onClick={() => setLoginType("student")}
                className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all duration-300 ${
                  loginType === "student"
                    ? "text-white bg-green-600 shadow-md border border-yellow-400/20"
                    : "text-slate-400 hover:bg-slate-800/40"
                }`}
              >
                Aluno
              </button>
              <button
                type="button"
                onClick={() => setLoginType("employee")}
                className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all duration-300 ${
                  loginType === "employee"
                    ? "text-white bg-blue-600 shadow-md border border-yellow-400/20"
                    : "text-slate-400 hover:bg-slate-800/40"
                }`}
              >
                Equipe
              </button>
              </div>
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-3.5 w-full md:w-auto">
              {/* User Field */}
              <div className="relative w-full sm:w-36 lg:w-40">
                <UserIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder={loginType === "student" ? "RA do Aluno" : "Usuário / ID"}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoCapitalize="none"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                  className="w-full pl-8 pr-2 py-1.5 rounded-lg border border-yellow-400/20 bg-slate-900/90 text-white outline-none text-[11px] font-semibold uppercase tracking-wider placeholder:text-slate-600 transition-all focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/10"
                />
              </div>

              {/* Password Field */}
              <div className="relative w-full sm:w-32 lg:w-36">
                <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="password"
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoCapitalize="none"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                  className="w-full pl-8 pr-2 py-1.5 rounded-lg border border-yellow-400/20 bg-slate-900/90 text-white outline-none text-[11px] placeholder:text-slate-600 transition-all focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/10"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto text-slate-950 py-1.5 px-4.5 rounded-lg font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50 bg-gradient-to-r from-yellow-400 to-green-500 hover:from-yellow-300 hover:to-green-400 cursor-pointer"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Acessar Portal"}
              </button>
            </form>
            </div>
          </div>

        </div>

        {/* Dynamic sub-row for error notification and password reset hint */}
        <div className={`max-w-7xl mx-auto flex-col md:flex-row items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-900/50 ${isMobileLoginOpen ? "flex" : "hidden md:flex"}`}>
          <p className="text-[9px] text-slate-400 font-medium text-center md:text-left w-full md:w-auto">
            Esqueceu ou deseja redefinir seus dados? Contate a <b className="text-yellow-400">Secretaria Escolar</b>.
          </p>

          {error && (
            <div className="bg-red-950/80 text-red-300 px-3 py-1 rounded-lg text-[9px] font-bold flex items-center gap-1.5 border border-red-500/20 animate-shake">
              <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Floating Developer Credits at the bottom right/center */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 select-none">
        <button
          type="button"
          onClick={() => {
            confetti({
              particleCount: 155,
              spread: 80,
              origin: { y: 0.85 },
            });
            triggerAntonioEasterEgg();
          }}
          className="group flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-950/85 backdrop-blur-md border border-yellow-400/25 text-[9px] font-black text-amber-500 hover:text-amber-450 transition-all cursor-pointer shadow-lg transform active:scale-95 animate-pulse hover:animate-none"
        >
          <span className="inline-block animate-bounce text-xs">👨‍💻</span>
          <span className="border-b border-dashed border-amber-500/40 group-hover:border-amber-450">
            Criado com dedicação por Antônio Carlos
          </span>
        </button>
      </div>
    </div>
  );
}

// Categories for exams
const EXAM_CATEGORIES = [
  "PI",
  "PII",
  "PIII",
  "PIV",
  "PV",
  "PVI",
  "Recuperação",
  "Recuperação Bimestral",
  "Recuperação Final",
  "Trabalho",
  "Simulado",
  "Atividade",
  "Projeto",
];

function OldUNUSED_DashboardView({
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
}: {
  user: User;
  isAdmin: boolean;
  exams: Exam[];
  results: Result[];
  setView: (v: any) => void;
  onSelectPrintExam: (e: Exam) => void;
  onEditExam: (exam: Exam) => void;
  onDeleteExam: (id: string) => void;
  professors: any[];
  onReassignProfessor: (exam: Exam) => void;
  userProfile: any;
  onRefresh?: () => void;
  readAnnouncements?: string[];
  onMarkAsRead?: (id: string) => void;
}) {
  return null;
  const schoolInfo = getSchoolInfo();
  const [bimesterFilter, setBimesterFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [muralFilter, setMuralFilter] = useState<"todos" | "meus">("todos");

  // States for Mural de Recados
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementText, setAnnouncementText] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [showPostForm, setShowPostForm] = useState(false);
  const [targetProfessorId, setTargetProfessorId] = useState("todos");
  const [announcementPriority, setAnnouncementPriority] = useState<
    "info" | "important" | "critical"
  >("info");
  const [announcementDepartment, setAnnouncementDepartment] = useState("Geral");
  const [muralSearchInput, setMuralSearchInput] = useState("");
  const [muralSearch, setMuralSearch] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setMuralSearch(muralSearchInput);
    }, 400);
    return () => clearTimeout(handler);
  }, [muralSearchInput]);
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<
    "todos" | "info" | "important" | "critical"
  >("todos");
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] =
    useState<string>("todos");

  const TEMplate_suggestions = [
    {
      title: "Consolidação de Notas Coletivas",
      content:
        "Prezada equipe docente, solicitamos a consolidação das notas, frequências e descritivos pedagógicos no Diário Digital até o prazo final regulamentar. O cumprimento rigoroso deste cronograma é de vital importância para as auditorias pedagógicas internas e suporte com o Conselho de Classe.",
      tag: "Regulatório",
      priority: "critical" as const,
      department: "Diretoria",
    },
    {
      title: "Alinhamento Estratégico Curricular",
      content:
        "Convidamos o corpo docente para o simpósio de atualização metodológica e planejamento pedagógico integrador no auditório central. Alinharemos as estratégias curriculares e os resultados de desempenho institucional.",
      tag: "Planejamento",
      priority: "important" as const,
      department: "Coordenação",
    },
    {
      title: "Conformidade e Registro de Gabaritos",
      content:
        "Lembrete de governança pedagógica: toda e qualquer avaliação escrita deve conter seu respectivo gabarito digital oficial lançado no sistema no ato de sua criação. Isso garante transparência, governança de dados e estatísticas confiáveis.",
      tag: "Processos",
      priority: "info" as const,
      department: "TI Escolar",
    },
    {
      title: "Protocolo de Segurança e Acolhimento",
      content:
        "Reforçamos a obrigatoriedade de seguir os protocolos institucionais de segurança física, identificação via crachá eletrônico e o devido encaminhamento de ocorrências médicas ao departamento clínico no portal de saúde.",
      tag: "Segurança",
      priority: "info" as const,
      department: "Administrativo",
    },
  ];

  const handleCreateAnnouncement = async (
    titleVal?: string,
    contentVal?: string,
    priorityVal?: "info" | "important" | "critical",
    deptVal?: string,
  ) => {
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
      const userAuthorName =
        userProfile?.professional_name ||
        user.email?.split("@")[0] ||
        "Coordenação";
      const { error } = await supabase.from("exams").insert({
        professor_id: user.id,
        title: finalTitle.trim(),
        subject: "Coordenação",
        exam_type: "Recado",
        content: finalContent.trim(),
        questions: [],
        answer_key: {
          _metadata: {
            isAnnouncement: true,
            authorName: userAuthorName,
            targetProfessorId: targetProfessorId,
            priority: finalPriority,
            department: finalDept,
          },
        },
        class_year: "Avisos em Geral",
        bimester: "Geral",
        created_at: new Date().toISOString(),
      } as any);

      if (error) throw error;

      // Reset form
      setAnnouncementTitle("");
      setAnnouncementText("");
      setTargetProfessorId("todos");
      setAnnouncementPriority("info");
      setAnnouncementDepartment("Geral");
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
    if (!confirm("Deseja realmente excluir este recado do mural? Ele será enviado para a lixeira e poderá ser restaurado em até 15 dias.")) return;
    try {
      const annItem = exams.find((e) => e.id === annId);
      const meta = annItem?.answerKey?._metadata || {};
      const updatedAnswerKey = {
        ...(annItem?.answerKey || {}),
        _metadata: {
          ...meta,
          deletedAt: new Date().toISOString()
        }
      };

      const { error } = await supabase
        .from("exams")
        .update({ answer_key: updatedAnswerKey })
        .eq("id", annId);

      if (error) throw error;
      if (onRefresh) {
        onRefresh();
      }
    } catch (err: any) {
      alert("Erro ao excluir recado: " + err.message);
    }
  };

  // Derived notice stats for DashboardView UI
  const { unreadInvolvedAnnouncements, totalMuralCount } = useMemo(() => {
    const all = exams.filter((e) => {
      const hasQuestions = Array.isArray(e.questions) && e.questions.length > 0;
      return (
        !e.deletedAt &&
        (e.isAnnouncement ||
          e.examType === "Recado" ||
          e.subject === "Coordenação") &&
        !hasQuestions
      );
    });

    const involved = all.filter((e) => {
      const meta = e.answerKey?._metadata || {};
      const targetId = meta.targetProfessorId;
      if (isAdmin) return true;
      return (
        targetId === undefined ||
        targetId === "todos" ||
        targetId === user.id ||
        (userProfile && targetId === userProfile.uid)
      );
    });

    const unread = involved.filter((e) => !readAnnouncements.includes(e.id));
    return {
      unreadInvolvedAnnouncements: unread,
      totalMuralCount: involved.length,
    };
  }, [exams, readAnnouncements, user, isAdmin, userProfile]);

  const filteredExams = exams.filter((e) => {
    if (
      e.isDiaryOnly ||
      e.answerKey?._metadata?.isDiaryOnly ||
      e.isAnnouncement ||
      e.examType === "Recado"
    )
      return false;

    // For non-admin professors, only show their own exams on the Dashboard
    if (!isAdmin) {
      if (e.professorId !== user.id && e.professorId !== userProfile?.uid) return false;
    }

    const examBimester = getBimesterForExam(e, getSchoolInfo().bimesterDates);
    const matchBimester =
      bimesterFilter === "" || examBimester === bimesterFilter;
    const matchClass =
      classFilter === "" || (e.classYear || "").toLowerCase().includes(classFilter.toLowerCase());
    const matchCategory =
      categoryFilter === "" || e.examType === categoryFilter;
    return matchBimester && matchClass && matchCategory;
  });
  const displayExams = filteredExams;

  // Auto-check if we are the special master admin
  const isMasterAdmin = user.email === "cps@cps.local";

  const anyFilterActive =
    bimesterFilter !== "" || classFilter !== "" || categoryFilter !== "";

  const [expandedAnn, setExpandedAnn] = useState<Record<string, boolean>>({});

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      {/* ALERTA DE NOVOS COMUNICADOS DIRECIONADOS */}
      {unreadInvolvedAnnouncements.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-950/20 dark:to-slate-900 border-2 border-amber-400 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm"
        >
          <div className="flex items-start gap-3 text-left">
            <div className="bg-amber-100 dark:bg-amber-950/60 p-2.5 rounded-xl text-amber-600 dark:text-amber-400 animate-pulse shrink-0 mt-0.5">
              <Megaphone className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-450">
                Atenção Prioritária
              </span>
              <h5 className="text-xs font-black text-slate-700 dark:text-slate-100 uppercase tracking-tight">
                Você tem {unreadInvolvedAnnouncements.length}{" "}
                {unreadInvolvedAnnouncements.length === 1
                  ? "novo comunicado importante direcionado a você!"
                  : "novos comunicados importantes direcionados a você!"}
              </h5>
              <p className="text-[10px] text-slate-700 dark:text-slate-400 font-medium leading-relaxed">
                Um ou mais recados exigem sua ciência imediata. Por favor,
                revise as notas da coordenação no painel abaixo.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const element = document.getElementById("mural-comunicados");
              if (element) {
                element.scrollIntoView({ behavior: "smooth", block: "center" });
                element.classList.add(
                  "ring-4",
                  "ring-amber-500/50",
                  "transition-all",
                );
                setTimeout(() => {
                  element.classList.remove("ring-4", "ring-amber-500/50");
                }, 2000);
              }
            }}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-sm shrink-0 cursor-pointer"
          >
            Ver Detalhes
          </button>
        </motion.div>
      )}

      {/* PAINEL DE BOAS-VINDAS E APRESENTAÇÃO */}
      <div className="bg-slate-950 text-white rounded-[2rem] shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between border border-[#a88d44]/30 min-h-[220px]">
        {/* Animated Background Gradients & Patterns */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[150%] bg-gradient-to-br from-[#a88d44]/20 via-[#4a2e15]/20 to-transparent blur-3xl transform rotate-12"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[120%] bg-gradient-to-tl from-[#a88d44]/10 via-[#3a0808]/40 to-transparent blur-2xl transform -rotate-12"></div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#a88d44]/50 to-transparent"></div>
        </div>

        <div className="relative z-10 w-full p-6 flex flex-col xl:flex-row justify-between gap-6 h-full items-start xl:items-center">
          {/* Text Content */}
          <div className="space-y-4 max-w-lg text-left w-full xl:w-auto">
            <div className="flex flex-wrap items-center justify-start gap-2">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/ border border-white/10 text-[10px] font-black tracking-widest uppercase text-[#a88d44] backdrop-blur-md shadow-[0_0_15px_rgba(168,141,68,0.1)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#a88d44] animate-pulse"></span>
                Portal Docente
              </span>
            </div>
            
            <h2 className="text-3xl xl:text-4xl font-display font-black tracking-tight text-white uppercase leading-none drop-shadow-md">
              Olá, <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e3c472] to-[#a88d44]">{userProfile?.professional_name || user.email?.split("@")[0]}</span>!
            </h2>
            
            <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed max-w-sm opacity-90">
              Acesse rapidamente os recursos de gestão, cadernos de provas e pautas pedagógicas no painel ao lado.
            </p>
          </div>

          <div className="hidden xl:block w-px h-32 bg-gradient-to-b from-transparent via-white/10 to-transparent shrink-0"></div>

          {/* Action Area & Shortcut Widgets */}
          <div className="w-full flex-1 min-w-0">
            <div className="flex flex-col lg:flex-row gap-3 w-full">
              {/* Quick Status Bento Widget */}
              <div className="w-full lg:w-[220px] shrink-0 bg-white/ backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col justify-center relative overflow-hidden group">
                <div className="absolute right-0 bottom-[-10px] opacity-10 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
                  <LayoutDashboard className="w-24 h-24" />
                </div>
                <div className="flex justify-between items-start mb-2 relative z-10">
                  <p className="text-[10px] uppercase font-black text-slate-600 dark:text-slate-400 tracking-wider">Métricas</p>
                  <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded flex items-center justify-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Online
                  </p>
                </div>
                <div className="flex items-end gap-x-4 gap-y-2 flex-wrap relative z-10">
                  <div>
                    <h4 className="text-2xl font-black font-mono text-white leading-none">{totalMuralCount}</h4>
                    <p className="text-[9px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest mt-0.5">Avisos</p>
                  </div>
                  <div className="w-px h-6 bg-white/ hidden sm:block"></div>
                  <div>
                    <h4 className="text-2xl font-black font-mono text-white leading-none">{displayExams.length}</h4>
                    <p className="text-[9px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest mt-0.5">Avaliações</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 flex-1 w-full relative z-10">
                <button onClick={() => { onEditExam(null as any); setView("create"); }} className="group px-3 py-2 min-h-[48px] bg-white/ hover:bg-[#a88d44]/20 border border-white/10 hover:border-[#a88d44]/50 rounded-xl transition-all flex flex-row items-center justify-start gap-2.5 text-left text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-wider relative overflow-hidden backdrop-blur-md">
                  <div className="w-7 h-7 shrink-0 rounded-lg bg-gradient-to-br from-[#a88d44] to-[#8e7432] flex items-center justify-center shadow-[0_0_10px_rgba(168,141,68,0.4)] group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                    <Plus className="w-4 h-4 text-white" />
                  </div>
                  <span className="w-full truncate">Nova Avaliação</span>
                </button>
                
                <button onClick={() => setView("diary")} className="group px-3 py-2 min-h-[48px] bg-white/ hover:bg-slate-700/50 border border-white/10 hover:border-slate-500/50 rounded-xl transition-all flex flex-row items-center justify-start gap-2.5 text-left text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-wider relative overflow-hidden backdrop-blur-md">
                  <div className="w-7 h-7 shrink-0 rounded-lg bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center shadow-[0_0_10px_rgba(71,85,105,0.4)] group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                    <BookOpen className="w-4 h-4 text-white" />
                  </div>
                  <span className="w-full truncate">Diário de Classe</span>
                </button>
                
                <button onClick={() => setView("agenda")} className="group px-3 py-2 min-h-[48px] bg-white/ hover:bg-zinc-700/50 border border-white/10 hover:border-zinc-500/50 rounded-xl transition-all flex flex-row items-center justify-start gap-2.5 text-left text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-wider relative overflow-hidden backdrop-blur-md">
                  <div className="w-7 h-7 shrink-0 rounded-lg bg-gradient-to-br from-zinc-600 to-zinc-800 flex items-center justify-center shadow-[0_0_10px_rgba(82,82,91,0.4)] group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                    <Mail className="w-4 h-4 text-white" />
                  </div>
                  <span className="w-full truncate">Agenda Escolar</span>
                </button>

                <button onClick={() => setView("cronograma")} className="group px-3 py-2 min-h-[48px] bg-white/ hover:bg-emerald-700/50 border border-white/10 hover:border-emerald-500/50 rounded-xl transition-all flex flex-row items-center justify-start gap-2.5 text-left text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-wider relative overflow-hidden backdrop-blur-md">
                  <div className="w-7 h-7 shrink-0 rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center shadow-[0_0_10px_rgba(4,120,87,0.4)] group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                    <Calendar className="w-4 h-4 text-white" />
                  </div>
                  <span className="w-full truncate">Cronograma</span>
                </button>
                
                <button onClick={() => setView("banco_provas")} className="group px-3 py-2 min-h-[48px] bg-white/ hover:bg-amber-700/50 border border-white/10 hover:border-amber-500/50 rounded-xl transition-all flex flex-row items-center justify-start gap-2.5 text-left text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-wider relative overflow-hidden backdrop-blur-md">
                  <div className="w-7 h-7 shrink-0 rounded-lg bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center shadow-[0_0_10px_rgba(217,119,6,0.4)] group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                    <FileSpreadsheet className="w-4 h-4 text-white" />
                  </div>
                  <span className="w-full truncate">Banco de Provas</span>
                </button>
                
                <button onClick={() => setView("boletim")} className="group px-3 py-2 min-h-[48px] bg-white/ hover:bg-neutral-700/50 border border-white/10 hover:border-neutral-500/50 rounded-xl transition-all flex flex-row items-center justify-start gap-2.5 text-left text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-wider relative overflow-hidden backdrop-blur-md">
                  <div className="w-7 h-7 shrink-0 rounded-lg bg-gradient-to-br from-neutral-600 to-neutral-800 flex items-center justify-center shadow-[0_0_10px_rgba(64,64,64,0.4)] group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                    <GraduationCap className="w-4 h-4 text-white" />
                  </div>
                  <span className="w-full truncate">Lançar Notas</span>
                </button>
              </div>
            </div>
            
            <div className="flex items-center justify-center xl:justify-end gap-4 w-full mt-4 xl:absolute xl:-bottom-10 xl:right-0 opacity-70 hover:opacity-100 transition-opacity">
               <div className="flex items-center gap-2 text-[10px] uppercase font-black tracking-wider text-slate-700 dark:text-slate-300">
                 <Clock className="w-3 h-3" /> Ano: 2026
               </div>
               <div className="w-1 h-1 rounded-full bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-2000"></div>
               <div className="flex items-center gap-1.5 text-[10px] uppercase font-black tracking-wider text-emerald-400">
                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                 Online
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO: MURAL DE COMUNICADOS INTERNOS - PORTAL CORPORATIVO EXECUTIVE HUB */}
      <div
        id="mural-comunicados"
        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl transition-all duration-300"
      >
        {/* CABEÇALHO INTEGRADO COM METRICAS DO PORTAL */}
        <div className="bg-gradient-to-b from-slate-50 to-white dark:from-slate-950/40 dark:to-slate-900 px-6 py-6 border-b border-slate-200 dark:border-slate-800/80">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1 text-left">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-900 dark:bg-indigo-950/40 rounded-xl text-white dark:text-indigo-400 shadow-sm">
                  <Megaphone className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-950 dark:text-slate-100 uppercase tracking-widest">
                    Portal de Comunicação Corporativa & Diretrizes
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    <span>Governança Interna</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    <span>Colégio Progresso Santista Group</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ACTION TRIGGERS & STATUS BAR */}
            <div className="flex flex-wrap items-center gap-3">
              {/* MICRO DATA KPI BAR */}
              <div className="hidden sm:flex bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 dark:bg-slate-950/45 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <div className="px-3.5 py-1.5 border-r border-slate-200 dark:border-slate-800 flex items-center gap-1.5">
                  <span className="text-slate-600 dark:text-slate-400">Total:</span>
                  <span className="text-slate-800 dark:text-slate-100 dark:text-white font-extrabold">
                    {totalMuralCount}
                  </span>
                </div>
                <div className="px-3.5 py-1.5 border-r border-slate-200 dark:border-slate-800 flex items-center gap-1.5">
                  <span className="text-rose-500 font-extrabold animate-pulse">
                    🚨  </span>
                  <span className="text-slate-600 dark:text-slate-400">Críticos:</span>
                  <span className="text-rose-650 dark:text-rose-400 font-extrabold">
                    {
                      exams.filter((e) => {
                        const hasQuestions = Array.isArray(e.questions) && e.questions.length > 0;
                        const isAnn =
                          (e.isAnnouncement ||
                            e.examType === "Recado" ||
                            e.subject === "Coordenação") &&
                          !hasQuestions;
                        return (
                          isAnn &&
                          e.answerKey?._metadata?.priority === "critical"
                        );
                      }).length
                    }
                  </span>
                </div>
                <div className="px-3.5 py-1.5 flex items-center gap-1.5">
                  <span className="text-amber-500">🔔  </span>
                  <span className="text-slate-600 dark:text-slate-400">Pendentes:</span>
                  <span className="text-amber-600 dark:text-amber-400 font-extrabold">
                    {unreadInvolvedAnnouncements.length}
                  </span>
                </div>
              </div>

              {/* QUICK ACKNOWLEDGE ALL */}
              {unreadInvolvedAnnouncements.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (
                      confirm(
                        `Deseja assinar e confirmar ciência digital de todos os ${unreadInvolvedAnnouncements.length} comunicados pendentes simultaneamente?`,
                      )
                    ) {
                      unreadInvolvedAnnouncements.forEach((ann) =>
                        onMarkAsRead(ann.id),
                      );
                    }
                  }}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-755 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 font-black text-[9px] uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Assinar Todos</span>
                </button>
              )}

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowPostForm(!showPostForm)}
                  className="px-3.5 py-2 bg-slate-950 hover:bg-black dark:bg-indigo-650 dark:hover:bg-indigo-600 text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-all shadow-md hover:shadow-indigo-500/10 active:scale-95 flex items-center gap-1.5 cursor-pointer border border-transparent"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>
                    {showPostForm ? "Ocultar Painel" : "Lançar Comunicado"}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* CONTROLES AVANÇADOS: BUSCA INTEGRADA E FILTROS DE GOVERNANÇA */}
          <div className="mt-5 pt-5 border-t border-slate-200 dark:border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* BUSCA EM TEMPO REAL */}
            <div className="relative flex-1 max-w-lg text-left">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-600 dark:text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={muralSearchInput}
                onChange={(e) => setMuralSearchInput(e.target.value)}
                placeholder="Pesquisar circular por termo, assunto ou autor institucional..."
                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:bg-white dark:bg-slate-900/60 dark:hover:bg-slate-950 dark:focus:bg-slate-950 border border-slate-200 dark:border-slate-800 pl-10 pr-8 py-2.5 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-100 placeholder:text-slate-600 dark:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-500/50 outline-none transition-all"
              />
              {muralSearchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setMuralSearchInput("");
                    setMuralSearch("");
                  }}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* SELETORES DE FILTRAGEM MULTI-CATEGORIA */}
            <div className="flex flex-wrap items-center gap-3">
              {/* FILTRAGEM POR ESCOPO (MEUS / TODOS) */}
              <div className="flex bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 dark:bg-slate-950/80 p-0.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setMuralFilter("todos")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer",
                    muralFilter === "todos"
                      ? "bg-white dark:bg-slate-900 text-slate-950 dark:text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-700 dark:text-slate-300 hover:text-slate-700 dark:text-slate-400",
                  )}
                >
                  Todos ({totalMuralCount})
                </button>
                <button
                  type="button"
                  onClick={() => setMuralFilter("meus")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5",
                    muralFilter === "meus"
                      ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm"
                      : "text-slate-700 dark:text-slate-300 hover:text-slate-700 dark:text-slate-400",
                  )}
                >
                  <span>Direcionados</span>
                  {unreadInvolvedAnnouncements.length > 0 && (
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
                  )}
                </button>
              </div>

              {/* DROPDOWN DE PRIORIDADE */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 dark:bg-slate-950/80 px-2.5 py-1 text-[9px] font-black uppercase text-slate-600 dark:text-slate-400 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[8px] font-black text-slate-600 dark:text-slate-400">
                  Nível:
                </span>
                <select
                  value={selectedPriorityFilter}
                  onChange={(e: any) =>
                    setSelectedPriorityFilter(e.target.value)
                  }
                  className="cursor-pointer pr-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
                >
                  <option value="todos">Todas Prioridades</option>
                  <option value="critical">Crítico</option>
                  <option value="important">Importante</option>
                  <option value="info">Informativo</option>
                </select>
              </div>

              {/* DROPDOWN DE DEPARTAMENTO */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 dark:bg-slate-950/80 px-2.5 py-1 text-[9px] font-black uppercase text-slate-600 dark:text-slate-400 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[8px] font-black text-slate-600 dark:text-slate-400 font-mono">
                  Depto:
                </span>
                <select
                  value={selectedDepartmentFilter}
                  onChange={(e) => setSelectedDepartmentFilter(e.target.value)}
                  className="cursor-pointer pr-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
                >
                  <option value="todos">Todos Deptos</option>
                  <option value="Diretoria">Diretoria</option>
                  <option value="Coordenação">Coordenação</option>
                  <option value="RH">Recursos Humanos (RH)</option>
                  <option value="Administrativo">Administrativo</option>
                  <option value="TI Escolar">Tecnologia (TI)</option>
                  <option value="Geral">Geral</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ADMIN BROADCAST FORM PANEL */}
        {isAdmin && showPostForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="border-b border-slate-200 dark:border-slate-800/80 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 dark:bg-slate-950/15 p-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* COMPACT TEMPLATES COLUMN */}
              <div className="lg:col-span-1 space-y-3.5 text-left border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800/80 pb-6 lg:pb-0 lg:pr-6">
                <div className="flex items-center gap-1.5">
                  <ClipboardList className="w-4 h-4 text-[#a88d44]" />
                  <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest block">
                    Diretrizes Prontas para Lançar:
                  </span>
                </div>
                <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto pr-2 pb-1 scrollbar-thin">
                  {TEMplate_suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setAnnouncementTitle(s.title);
                        setAnnouncementText(s.content);
                        setAnnouncementPriority(s.priority);
                        setAnnouncementDepartment(s.department);
                      }}
                      className="text-left p-3 bg-white dark:bg-slate-900 dark:hover:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-2xl transition-all cursor-pointer space-y-1.5 shadow-sm w-full group"
                    >
                      <div className="flex items-center justify-between">
                        <h6 className="font-extrabold text-[9px] text-slate-950 dark:text-slate-100 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">
                          {s.tag}
                        </h6>
                        <span
                          className={cn(
                            "text-[7px] font-black uppercase px-2 py-0.5 rounded-full",
                            s.priority === "critical"
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-450"
                              : s.priority === "important"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-450"
                                : "bg-slate-300 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 dark:bg-slate-800 dark:text-slate-300",
                          )}
                        >
                          {s.priority === "critical"
                            ? "Crítico"
                            : s.priority === "important"
                              ? "Importante"
                              : "Geral"}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-700 dark:text-slate-400 line-clamp-2 leading-relaxed font-medium">
                        {s.content}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* BROADCASTER FORM FIELDS COLUMN */}
              <div className="lg:col-span-2 space-y-5 text-left">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* RECIPIENT */}
                  <div className="space-y-1 sm:col-span-1">
                    <label className="text-[9px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                      Escopo de Destinatários:
                    </label>
                    <select
                      value={targetProfessorId}
                      onChange={(e) => setTargetProfessorId(e.target.value)}
                      className="w-full border px-3 py-2 rounded-xl font-bold uppercase tracking-wider placeholder: cursor-pointer bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
                    >
                      <option value="todos">Todos os Docentes (Geral)</option>
                      {professors
                        .filter((p) => p.professional_name || p.email)
                        .map((p) => (
                          <option key={p.uid || p.id} value={p.uid || p.id}>
                            {p.professional_name || p.email}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* DEPARTMENT CHIP */}
                  <div className="space-y-1 sm:col-span-1">
                    <label className="text-[9px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                      Departamento Emissor:
                    </label>
                    <select
                      value={announcementDepartment}
                      onChange={(e) =>
                        setAnnouncementDepartment(e.target.value)
                      }
                      className="w-full border px-3 py-2 rounded-xl font-bold uppercase tracking-wider placeholder: cursor-pointer bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
                    >
                      <option value="Geral">Administração Geral</option>
                      <option value="Diretoria">Conselho Diretor</option>
                      <option value="Coordenação">
                        Coordenação Pedagógica
                      </option>
                      <option value="RH">Recursos Humanos (RH)</option>
                      <option value="Administrativo">Administrativo</option>
                      <option value="TI Escolar">Infraestrutura TI</option>
                    </select>
                  </div>

                  {/* SUBJECT */}
                  <div className="space-y-1 sm:col-span-1">
                    <label className="text-[9px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                      Assunto Oficial:
                    </label>
                    <input
                      type="text"
                      value={announcementTitle}
                      onChange={(e) => setAnnouncementTitle(e.target.value)}
                      placeholder="Assunto / Título do aviso..."
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-100 placeholder:text-slate-600 dark:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 outline-none shadow-sm"
                    />
                  </div>
                </div>

                {/* PRIORITY INTERACTIVE CHIP SELECTOR */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                    Nível de Severidade / Urgência:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setAnnouncementPriority("info")}
                      className={cn(
                        "p-3 rounded-2xl border-2 text-left transition-all flex flex-col gap-0.5 cursor-pointer",
                        announcementPriority === "info"
                          ? "bg-slate-50 dark:bg-slate-900 dark:border-slate-400 dark:text-slate-900 dark:text-white"
                          : "bg-white dark:bg-slate-900 dark:border-slate-800 hover:bg-slate-300/50",
                      )}
                    >
                      <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        Informativo
                      </span>
                      <span className="text-[8.5px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                        Lembretes normais e comunicados em geral
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAnnouncementPriority("important")}
                      className={cn(
                        "p-3 rounded-2xl border-2 text-left transition-all flex flex-col gap-0.5 cursor-pointer",
                        announcementPriority === "important"
                          ? "bg-amber-500/5 border-amber-500 text-amber-955 dark:bg-amber-950/20 dark:border-amber-450 dark:text-amber-400"
                          : "bg-white dark:bg-slate-900 dark:border-slate-800 hover:bg-slate-300/50",
                      )}
                    >
                      <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Importante
                      </span>
                      <span className="text-[8.5px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                        Exige atenção prioritária da equipe de campo
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAnnouncementPriority("critical")}
                      className={cn(
                        "p-3 rounded-2xl border-2 text-left transition-all flex flex-col gap-0.5 cursor-pointer",
                        announcementPriority === "critical"
                          ? "bg-rose-500/5 border-rose-500 text-rose-955 dark:bg-rose-950/20 dark:border-rose-450 dark:text-rose-400"
                          : "bg-white dark:bg-slate-900 dark:border-slate-800 hover:bg-slate-300/50",
                      )}
                    >
                      <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                        Crítico / Urgente
                      </span>
                      <span className="text-[8.5px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                        Requer termo de ciência oficial e validação
                      </span>
                    </button>
                  </div>
                </div>

                {/* CONTENT TEXTAREA */}
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                    Mensagem da Circular / Resolução:
                  </label>
                  <textarea
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    placeholder="Escreva os detalhes, orientações operacionais, resoluções ou instruções corporativas..."
                    rows={4}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-100 placeholder:text-slate-600 dark:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 outline-none leading-relaxed shadow-sm"
                  />
                </div>

                {/* ACTIONS */}
                <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-3.5 border-t border-slate-200 dark:border-slate-800/80 w-full">
                  <button
                    type="button"
                    onClick={() => {
                      setAnnouncementTitle("");
                      setAnnouncementText("");
                      setTargetProfessorId("todos");
                      setAnnouncementPriority("info");
                      setShowPostForm(false);
                    }}
                    className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 hover:text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors"
                  >
                    Descartar
                  </button>
                  <button
                    type="button"
                    disabled={isPosting}
                    onClick={() =>
                      handleCreateAnnouncement(
                        announcementTitle,
                        announcementText,
                        announcementPriority,
                        announcementDepartment,
                      )
                    }
                    className="w-full sm:w-auto px-5 py-2.5 text-[10px] font-black uppercase tracking-wider bg-slate-900 hover:bg-black dark:bg-indigo-600 dark:hover:bg-indigo-550 text-white rounded-xl disabled:opacity-50 cursor-pointer shadow-md active:scale-95 transition-all"
                  >
                    {isPosting
                      ? "Registrando Circular..."
                      : "Publicar Comunicado oficial"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* FEED GRID DE CIRCULARES */}
        <div className="px-6 py-6 md:p-8 border-t border-slate-200 dark:border-slate-800/60 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 dark:bg-slate-950/5">
          {(() => {
            const announcements = exams.filter((e) => {
              const hasQuestions = Array.isArray(e.questions) && e.questions.length > 0;
              const isAnn =
                (e.isAnnouncement ||
                  e.examType === "Recado" ||
                  e.subject === "Coordenação") &&
                !hasQuestions;
              if (!isAnn) return false;

              const meta = e.answerKey?._metadata || {};
              const targetId = meta.targetProfessorId;

              const worksForCurrent =
                targetId === undefined ||
                targetId === "todos" ||
                targetId === user.id ||
                (userProfile && targetId === userProfile.uid);

              if (muralFilter === "todos") {
                if (isAdmin) return true;
                return worksForCurrent;
              } else {
                // 'meus' -> specifically targeted/private messages
                const isPersonal =
                  targetId !== undefined &&
                  targetId !== "todos" &&
                  (targetId === user.id ||
                    (userProfile && targetId === userProfile.uid));
                return isPersonal;
              }
            });

            // Apply search & multi-criteria filters
            const filteredAnnouncements = announcements.filter((ann) => {
              const meta = ann.answerKey?._metadata || {};
              const priority = meta.priority || "info";
              const department = meta.department || "Geral";
              const author = meta.authorName || "Diretoria";

              // Text Match
              const query = muralSearch.toLowerCase().trim();
              const textMatch = query
                ? ann.title?.toLowerCase().includes(query) ||
                  ann.content?.toLowerCase().includes(query) ||
                  author.toLowerCase().includes(query)
                : true;

              // Priority Match
              const priorityMatch =
                selectedPriorityFilter === "todos"
                  ? true
                  : priority === selectedPriorityFilter;

              // Department Match
              const departmentMatch =
                selectedDepartmentFilter === "todos"
                  ? true
                  : department.toLowerCase() ===
                    selectedDepartmentFilter.toLowerCase();

              return textMatch && priorityMatch && departmentMatch;
            });

            // Sort by Date
            const sorted = [...filteredAnnouncements].sort(
              (a, b) =>
                new Date(b.createdAt || 0).getTime() -
                new Date(a.createdAt || 0).getTime(),
            );

            if (sorted.length === 0) {
              return (
                <div className="py-14 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center text-slate-700 dark:text-slate-400">
                  <Pin className="w-6 h-6 mx-auto opacity-35 text-indigo-500 mb-2.5" />
                  <p className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">
                    Nenhum Comunicado Encontrado
                  </p>
                  <p className="text-[10px] text-slate-700 dark:text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
                    Não existem diretrizes operacionais sob as condições
                    selecionadas. Use os filtros acima para escanear outros
                    arquivos do comitê.
                  </p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {sorted.map((ann) => {
                  const meta = ann.answerKey?._metadata || {};
                  const author = meta.authorName || "Conselho Diretor";
                  const targetId = meta.targetProfessorId;
                  const priority: "info" | "important" | "critical" =
                    meta.priority || "info";
                  const department = meta.department || "Geral";

                  const isUnread = !readAnnouncements.includes(ann.id);
                  const isSpecificallyForMe =
                    targetId !== undefined &&
                    targetId !== "todos" &&
                    (targetId === user.id ||
                      (userProfile && targetId === userProfile.uid));

                  // Get target label
                  let targetLabel = "Diretrizes Gerais";
                  if (targetId && targetId !== "todos") {
                    const profObj = professors.find(
                      (p) => p.uid === targetId || p.id === targetId,
                    );
                    targetLabel = profObj
                      ? profObj.professional_name ||
                        profObj.email?.split("@")[0]
                      : "Uso Reservado";
                  }

                  const dateStr = ann.createdAt
                    ? new Date(ann.createdAt).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "Hoje";

                  // Styles depending on priority level
                  let priorityStyles = {
                    container:
                      "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm",
                    lineBadge: "bg-slate-200 dark:bg-slate-700",
                    pills:
                      "bg-slate-300 text-slate-700 dark:text-slate-300 dark:bg-slate-950 dark:text-slate-300",
                    pillsBorder: "border-slate-200 dark:border-slate-800/80",
                    dot: "bg-slate-400",
                    tagLabel: "DIRETRIZ INSTITUCIONAL",
                  };

                  if (priority === "critical") {
                    priorityStyles = {
                      container:
                        "bg-rose-50/40 dark:bg-rose-955/20 border-rose-300 dark:border-rose-900/40 shadow-md ring-1 ring-rose-500/10",
                      lineBadge: "bg-rose-500",
                      pills:
                        "bg-rose-600 text-slate-900 dark:text-white dark:bg-rose-900/60 dark:text-rose-100 font-extrabold",
                      pillsBorder: "border-rose-400/50 dark:border-rose-900",
                      dot: "bg-rose-500 animate-ping",
                      tagLabel: "RESOLUÇÃO CRÍTICA",
                    };
                  } else if (priority === "important") {
                    priorityStyles = {
                      container:
                        "bg-amber-500/5 dark:bg-amber-950/15 border-amber-300 dark:border-amber-850 shadow-md",
                      lineBadge: "bg-amber-500",
                      pills:
                        "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-350 font-black",
                      pillsBorder: "border-amber-300/60 dark:border-amber-850",
                      dot: "bg-amber-500",
                      tagLabel: "DIRETRIZ RELEVANTE",
                    };
                  }

                  return (
                    <motion.div
                      key={ann.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "rounded-2xl border p-5 flex flex-col justify-between gap-5 transition-all duration-300 relative text-left",
                        priorityStyles.container,
                        isUnread &&
                          "ring-2 ring-indigo-500/10 shadow-[0_4px_20px_rgba(99,102,241,0.06)]",
                      )}
                    >
                      {/* CARD CORNER GRADIENT ACCENT FOR VISUAL RICHNESS */}
                      <div
                        className={cn(
                          "absolute top-0 right-0 w-32 h-32 rounded-tr-2xl bg-[radial-gradient(circle_at_100%_0%,rgba(99,102,241,0.03),transparent_60%)] pointer-events-none",
                        )}
                      />

                      <div className="space-y-3.5 relative z-10">
                        {/* HEADER DEPARTAMENTO & PRIORIDADE */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 border-b border-slate-200 dark:border-slate-800/80 pb-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "w-2 h-2 rounded-full",
                                priorityStyles.dot,
                              )}
                            />
                            <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-400">
                              [{department}] ⬢ {priorityStyles.tagLabel}
                            </span>
                          </div>

                          <span
                            className={cn(
                              "text-[7px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full shadow-sm border",
                              priorityStyles.pills,
                              priorityStyles.pillsBorder,
                            )}
                          >
                            {priority === "critical"
                              ? "Crítico"
                              : priority === "important"
                                ? "Importante"
                                : "Geral"}
                          </span>
                        </div>

                        {/* CORPO DE TEXTO DO COMUNICADO */}
                        <div className="space-y-2">
                          <div className="flex items-start gap-1.5 justify-between">
                            <h4
                              className={cn(
                                "font-extrabold text-xs uppercase tracking-tight leading-snug flex-1",
                                isUnread
                                  ? "text-slate-950 dark:text-white"
                                  : "text-slate-700 dark:text-slate-300",
                              )}
                            >
                              {ann.title}
                            </h4>
                            <span className="text-[8.5px] font-semibold text-slate-700 dark:text-slate-400 shrink-0 select-none">
                              {dateStr}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-700 dark:text-slate-400 font-medium leading-relaxed whitespace-pre-line">
                            {ann.content}
                          </p>
                        </div>
                      </div>

                      {/* CARD FOOTER CONSOLIDADO EM PROTOCOLO CORPORATIVO */}
                      <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800/80 pt-3.5 mt-auto text-[9px] text-slate-600 dark:text-slate-400 relative z-10">
                        {/* EMISSOR INFO */}
                        <div className="flex items-center gap-2 overflow-hidden max-w-[150px]">
                          <div className="w-5.5 h-5.5 bg-slate-900 text-white dark:bg-slate-800 rounded-full flex items-center justify-center text-[8px] font-black uppercase select-none shrink-0 border border-slate-200 dark:border-slate-800 shadow-sm">
                            {author.substring(0, 2)}
                          </div>
                          <div className="flex flex-col text-left truncate">
                            <span className="text-[7.5px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                              Emissor
                            </span>
                            <span className="font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-tight truncate pl-0.5">
                              {author}
                            </span>
                          </div>
                        </div>

                        {/* INTERAÇÕES - ASSINATURA ELETRONICA */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* STATUS DE CIENCIA */}
                          {!isUnread ? (
                            <span
                              className="px-2.5 py-1 text-[8px] font-black text-emerald-650 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-1 select-none shadow-sm h-[22px]"
                              title="Sua ciência já foi autenticada neste portal para auditoria."
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              <span>CIÊNCIA REGISTRADA</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                onMarkAsRead(ann.id);
                                confetti({
                                  particleCount: 40,
                                  spread: 40,
                                  origin: { y: 0.8 },
                                });
                              }}
                              className={cn(
                                "px-2.5 py-1 text-[8px] font-black uppercase rounded-lg cursor-pointer transition-all flex items-center gap-1 border shadow-sm active:scale-95 h-[22px]",
                                priority === "critical"
                                  ? "bg-rose-600 hover:bg-rose-700 text-white border-rose-500"
                                  : "bg-white dark:bg-slate-900 dark:hover:bg-slate-900 border-indigo-150 dark:border-slate-800",
                              )}
                              title="Marcar como ciente eletronicamente"
                            >
                              <Check className="w-3 h-3" />
                              <span>ASSINAR CIÊNCIA</span>
                            </button>
                          )}

                          {/* RECEPTOR INDICATOR (SE FOR INDIVIDUAL) */}
                          {isSpecificallyForMe && (
                            <span
                              className="px-1.5 py-0.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[7px] font-bold rounded uppercase select-none"
                              title="Contém diretrizes reservadas ao seu cargo ou perfil."
                            >
                              Reservado
                            </span>
                          )}

                          {/* ADMIN TRASH */}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteAnnouncement(ann.id)}
                              className="p-1 hover:bg-rose-50 dark:hover:bg-rose-955 rounded-lg text-rose-500 hover:text-rose-700 transition-colors cursor-pointer border border-transparent hover:border-rose-100 dark:hover:border-rose-900/30"
                              title="Remover circular do portal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

      {/* METRICAS DE VISÃO GERAL */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => setView("banco_provas")}
          className="text-left w-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-xl transition-all"
        >
          <StatCard
            label="Provas Cadastradas"
            value={
              exams.filter(
                (e) =>
                  !e.isDiaryOnly &&
                  !e.answerKey?._metadata?.isDiaryOnly &&
                  !e.isAnnouncement &&
                  e.examType !== "Recado",
              ).length
            }
            icon={<FileText />}
            color=""
          />
        </button>
        <button
          onClick={() => setView("boletim")}
          className="text-left w-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-xl transition-all"
        >
          <StatCard
            label="Entregas Pendentes"
            value={
              results.filter(
                (r) =>
                  r.score === undefined &&
                  !exams.find((e) => e.id === r.examId)?.isDiaryOnly,
              ).length
            }
            icon={<CheckCircle2 />}
            color=""
          />
        </button>
        <button
          onClick={() => setView("boletim")}
          className="text-left w-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-xl transition-all"
        >
          <StatCard
            label="Média Geral (PII)"
            value={(() => {
              const piiResults = results.filter((r) => {
                const ex = exams.find((e) => e.id === r.examId);
                return ex && !ex.isDiaryOnly && ex.examType === "PII";
              });
              if (piiResults.length === 0) return "0.0";
              const sum = piiResults.reduce(
                (acc, r) =>
                  acc + (r.score !== undefined ? r.score / r.maxScore : 0),
                0,
              );
              return ((sum / piiResults.length) * 10).toFixed(1);
            })()}
            icon={<BarChart3 />}
            color=""
          />
        </button>
        <button
          onClick={() => setView("studentReports")}
          className="text-left w-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-xl transition-all"
        >
          <StatCard
            label="Alunos Avaliados"
            value={
              results.filter(
                (r) => !exams.find((e) => e.id === r.examId)?.isDiaryOnly,
              ).length
            }
            icon={<UserIcon />}
            color=""
          />
        </button>
      </div>

      {/* VITRINE/BENTO DE MÓDULOS E FUNÇÕES DO SISTEMA */}
      <div className="space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200 dark:border-slate-800">
          <LayoutDashboard className="w-4 h-4 text-accent dark:text-gold" />
          <h3 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-[0.15em] font-display">
            Painel Geral de Funções do Sistema
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Módulo: Banco de Provas */}
          <div
            onClick={() => setView("banco_provas")}
            className="group bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-600 hover:shadow-lg hover:shadow-indigo-650/5 transition-all active:scale-[0.99] flex flex-col justify-between gap-4 cursor-pointer"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 rounded-xl flex items-center justify-center transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                <LayoutList className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm uppercase tracking-tight group-hover:text-indigo-750 transition-colors">
                Banco de Provas & Avaliações
              </h4>
              <p className="text-[11px] text-slate-700 dark:text-slate-400 font-medium leading-relaxed">
                Repositório completo de provas e avaliações. Busque por turmas e
                bimestres, consulte gabaritos, edite conteúdos e realize a
                impressão institucional das avaliações do Colégio Progresso
                Santista.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-indigo-700 dark:text-indigo-400 tracking-wider pt-2 border-t border-slate-200 dark:border-slate-800/40 select-none">
              <span>Acessar Repositório</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Módulo 1: Gerador de Provas */}
          <div
            onClick={() => {
              onEditExam(null as any);
              setView("create");
            }}
            className="group bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-accent hover:shadow-lg hover:shadow-accent/5 transition-all active:scale-[0.99] flex flex-col justify-between gap-4 cursor-pointer"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 bg-accent/5 dark:bg-accent/15 text-accent dark:text-accent-hover rounded-xl flex items-center justify-center transition-colors group-hover:bg-accent group-hover:text-white">
                <FileText className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm uppercase tracking-tight group-hover:text-accent transition-colors">
                Gerador de Provas & Simulados
              </h4>
              <p className="text-[11px] text-slate-700 dark:text-slate-400 font-medium leading-relaxed">
                Elabore avaliações estruturadas no formato ideal, com cabeçalhos
                padronizados, inserção de fórmulas, gabaritos integrados e
                diagramação limpa.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-accent tracking-wider pt-2 border-t border-slate-200 dark:border-slate-800/40 select-none">
              <span>Criar Avaliação</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform text-gold" />
            </div>
          </div>

          {/* Módulo 2: Diário de Classe */}
          <div
            onClick={() => setView("diary")}
            className="group bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-emerald-600 hover:shadow-lg hover:shadow-emerald-650/5 transition-all active:scale-[0.99] flex flex-col justify-between gap-4 cursor-pointer"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 rounded-xl flex items-center justify-center transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                <BookOpen className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm uppercase tracking-tight group-hover:text-emerald-700 transition-colors">
                Diário Digital & Notas
              </h4>
              <p className="text-[11px] text-slate-700 dark:text-slate-400 font-medium leading-relaxed">
                Gerencie chamadas diárias de alunos, descreva a matéria
                ministrada, controle notas de atividades ou crie avaliações
                contínuas de participação.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-emerald-700 tracking-wider pt-2 border-t border-slate-200 dark:border-slate-800/40 select-none">
              <span>Acessar Diários</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Módulo 3: Boletim Consolidado */}
          <div
            onClick={() => setView("boletim")}
            className="group bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-primary hover:shadow-lg hover:shadow-primary/5 transition-all active:scale-[0.99] flex flex-col justify-between gap-4 cursor-pointer"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl flex items-center justify-center transition-colors group-hover:bg-primary group-hover:text-slate-900 dark:text-white">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm uppercase tracking-tight group-hover:text-primary transition-colors">
                Boletins & Turmas
              </h4>
              <p className="text-[11px] text-slate-700 dark:text-slate-400 font-medium leading-relaxed">
                Visualize as médias de todas as turmas cadastradas em tempo
                real. Identifique facilmente alunos em recuperação e status
                bimesitrais completos.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-[#0f172a] dark:text-white tracking-wider pt-2 border-t border-slate-200 dark:border-slate-800/40 select-none">
              <span>Ver Boletins</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform text-gold" />
            </div>
          </div>

          {/* Módulo 4: Cronograma de Provas */}
          <div
            onClick={() => setView("cronograma")}
            className="group bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-gold hover:shadow-lg hover:shadow-gold/5 transition-all active:scale-[0.99] flex flex-col justify-between gap-4 cursor-pointer"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 bg-gold/5 dark:bg-gold/15 text-gold rounded-xl flex items-center justify-center transition-colors group-hover:bg-gold group-hover:text-white">
                <Calendar className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm uppercase tracking-tight group-hover:text-gold transition-colors">
                Cronograma de Provas
              </h4>
              <p className="text-[11px] text-slate-700 dark:text-slate-400 font-medium leading-relaxed">
                Monitore todo o calendário de avaliações agendadas, garantindo
                uma distribuição equilibrada de exames para as turmas escolares.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-gold tracking-wider pt-2 border-t border-slate-200 dark:border-slate-800/40 select-none">
              <span>Ver Cronograma</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Módulo 5: Observações Comportamentais */}
          <div
            onClick={() => setView("studentReports")}
            className="group bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-accent hover:shadow-lg hover:shadow-accent/5 transition-all active:scale-[0.99] flex flex-col justify-between gap-4 cursor-pointer"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 bg-accent/5 dark:bg-accent/15 text-accent rounded-xl flex items-center justify-center transition-colors group-hover:bg-accent group-hover:text-white">
                <Users className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm uppercase tracking-tight group-hover:text-accent transition-colors">
                Relatório de Aluno
              </h4>
              <p className="text-[11px] text-slate-700 dark:text-slate-400 font-medium leading-relaxed">
                Diário de ocorrências e anotações médicas, alimentares ou de
                comportamento. Mantenha as fichas individuais atualizadas com
                detalhes importantes.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-accent tracking-wider pt-2 border-t border-slate-200 dark:border-slate-800/40 select-none">
              <span>Ver Observações</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform text-gold" />
            </div>
          </div>

          {/* Módulo 6: Administração Escolar */}
          {isAdmin ? (
            <div
              onClick={() => setView("admin")}
              className="group bg-gradient-to-br from-slate-950 to-slate-905 p-6 rounded-2xl border border-gold/30 hover:border-gold hover:shadow-xl hover:shadow-gold/10 transition-all active:scale-[0.99] flex flex-col justify-between gap-4 cursor-pointer relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gold/5 blur-2xl rounded-full"></div>
              <div className="space-y-3 relative z-10">
                <div className="w-10 h-10 bg-gold text-slate-950 rounded-xl flex items-center justify-center shadow-md">
                  <Settings className="w-5 h-5 group-hover:rotate-45 transition-transform duration-500" />
                </div>
                <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm uppercase tracking-tight group-hover:text-gold transition-colors">
                  Central de Administração
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                  Controle logins dos docentes, redefina senhas provisórias,
                  vincule turmas, gerencie fichas de matrículas dos alunos e
                  configure matérias letivas.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-gold tracking-wider pt-2 border-t border-slate-200 dark:border-slate-800/50 select-none relative z-10">
                <span>Painel Administrativo</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-900/20 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between opacity-60">
              <div className="space-y-3">
                <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400 rounded-xl flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <h4 className="font-extrabold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-tight">
                  Recursos de Administrador
                </h4>
                <p className="text-[11px] text-slate-700 dark:text-slate-400 font-medium leading-relaxed">
                  Vários recursos adicionais de configuração institucional e
                  controle de contas de docentes estão disponíveis apenas para
                  coordenadores adm.
                </p>
              </div>
              <div className="text-[9px] font-black uppercase text-slate-700 dark:text-slate-400 tracking-widest pt-2 border-t border-slate-200 dark:border-slate-800 select-none">
                Vínculo Docente Ativo
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function OldUNUSED_StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: any;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 text-primary dark:text-accent">
        {React.cloneElement(icon as React.ReactElement, {
          className: "w-6 h-6",
        })}
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-400 mb-0.5">
          {label}
        </p>
        <p className="text-xl font-display font-black text-slate-700 dark:text-slate-100 tracking-tight leading-none">
          {value}
        </p>
      </div>
    </div>
  );
}

function CreateExamView({
  user,
  userProfile,
  setView,
  examToEdit,
  professors,
  onExamSaved,
  checkAndResolveExamConflict,
}: {
  user: User;
  userProfile: any;
  setView: (v: any) => void;
  examToEdit?: Exam | null;
  professors: any[];
  onExamSaved: () => void;
  checkAndResolveExamConflict: (
    targetClass: string,
    targetBimester: string,
    targetSubject: string,
    targetType: string
  ) => Promise<{ proceed: boolean; error?: any }>;
}) {
  const schoolInfo = getSchoolInfo();
  const rolesArr = (userProfile?.role || "")
    .split(",")
    .map((r: string) => r.trim());
  const isAdmin = rolesArr.some((r: string) =>
    [
      "admin", "ti",
      "vice_diretor",
      "coordenador_fund1",
      "coordenador_fund2",
      "coordenador_all",
      "secretaria_fund1",
      "secretaria_fund2",
      "secretaria_all",
    ].includes(r),
  );
  const allowedClasses = getFilteredClasses(userProfile, schoolInfo.classes);

  const [selectedProfId, setSelectedProfId] = useState(examToEdit?.professorId || user.id);
  const [title, setTitle] = useState(examToEdit?.title || "");

  // Default subject from profile if available, otherwise first subject in schoolInfo for admins
  const defaultSubject =
    userProfile?.assigned_subjects?.[0] ||
    (isAdmin ? schoolInfo.subjects[0] : "") ||
    "";
  const [subject, setSubject] = useState(examToEdit?.subject || defaultSubject);

  // Default class from profile if available, otherwise first class in schoolInfo for admins
  const defaultClass =
    userProfile?.assigned_classes?.[0] || allowedClasses[0] || "";
  const [classYear, setClassYear] = useState(
    examToEdit?.classYear || defaultClass,
  );

  const [bimester, setBimester] = useState(
    examToEdit?.bimester || "1º Bimestre",
  );
  const [content, setContent] = useState(examToEdit?.content || "");
  const [examType, setExamType] = useState<string>(
    examToEdit?.examType || "PII",
  );
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const typeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        typeDropdownRef.current &&
        !typeDropdownRef.current.contains(event.target as Node)
      ) {
        setShowTypeDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const [examDate, setExamDate] = useState(examToEdit?.examDate || "");
  const [examTime, setExamTime] = useState(examToEdit?.examTime || "");
  const [fontSize, setFontSize] = useState(examToEdit?.fontSize || 13);
  const [fontFamily, setFontFamily] = useState(
    examToEdit?.fontFamily || "Arial",
  );
  const [questions, setQuestions] = useState<Question[]>(
    Array.isArray(examToEdit?.questions) ? examToEdit.questions : [],
  );
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [isExternal, setIsExternal] = useState(
    examToEdit?.answerKey?._metadata?.isExternal || false,
  );
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [editingImageQId, setEditingImageQId] = useState<number | null>(null);
  const editingQuestion = editingImageQId !== null ? questions.find(q => q.id === editingImageQId) : null;

  // Listen for double-click image editing events from the preview
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvt = e as CustomEvent;
      if (customEvt.detail?.questionId != null) {
        setEditingImageQId(customEvt.detail.questionId);
      }
    };
    window.addEventListener('open-image-editor', handler);
    return () => window.removeEventListener('open-image-editor', handler);
  }, []);

  const [isAdapted, setIsAdapted] = useState(
    examToEdit?.answerKey?._metadata?.isAdapted || false,
  );
  const [adaptedStudents, setAdaptedStudents] = useState<string[]>(
    examToEdit?.answerKey?._metadata?.adaptedStudents || [],
  );

  const availableStudentsForAdapted = useMemo(() => {
    if (!classYear) return [];
    const arr = classYear.split(", ").filter(Boolean);
    const allStudents = Object.values(schoolInfo.studentsDB).flat() as any[];
    return allStudents.filter(s => arr.includes(s.classId)).sort((a,b) => a.name.localeCompare(b.name));
  }, [classYear, schoolInfo.studentsDB]);

  const addQuestion = (type: "objective" | "essay" = "objective") => {
    setQuestions([
      ...questions,
      {
        id: questions.length + 1,
        type: type,
        text: "",
        options: type === "objective" ? ["", "", "", "", ""] : [],
        correctAnswer: type === "objective" ? "A" : "",
        points: 1,
        imageSize: 100,
        imageAlign: "center",
        align: "left",
        lineCount: type === "essay" ? 5 : undefined,
      },
    ]);
  };

  const [newCustomSubject, setNewCustomSubject] = useState("");

  const handleSave = async () => {
    if (!title) {
      setValidationError("O título da prova é obrigatório.");
      return;
    }
    if (!subject) {
      setValidationError("A disciplina é obrigatória.");
      return;
    }
    if (!classYear) {
      setValidationError("Selecione pelo menos uma turma.");
      return;
    }
    if (!examType) {
      setValidationError(
        "O tipo de prova (ex: PII, Recuperação) é obrigatório.",
      );
      return;
    }
    if (!isExternal && questions.length === 0) {
      setValidationError(
        'Adicione pelo menos uma questão ou marque a prova como "Externa" (apenas para cronograma).',
      );
      return;
    }

    setValidationError("");
    setSaving(true);
    try {
      // Re-sort questions: objective first, essay last
      const sortedQuestions = [...questions]
        .sort((a, b) => {
          if (a.type === "essay" && b.type !== "essay") return 1;
          if (a.type !== "essay" && b.type === "essay") return -1;
          return (a.id || 0) - (b.id || 0);
        })
        .map((q, idx) => ({ ...q, id: idx + 1 })); // Re-assign IDs for clarity

      const answerKey: Record<string, any> = {
        _metadata: {
          classYear,
          content,
          examType,
          examDate,
          examTime,
          isExternal,
          fontSize,
          fontFamily,
          isAdapted,
          adaptedStudents: (isAdapted || (examType && examType.toLowerCase().includes("recupera"))) ? adaptedStudents : [],
        },
      };

      let guide = examToEdit?.studyGuide || "";
      if (!isExternal) {
        sortedQuestions.forEach((q) => {
          if (q.type === "objective") {
            answerKey[q.id] = q.correctAnswer;
          } else {
            answerKey[q.id] = "__ESSAY__"; // Marker for essay questions
          }
        });
      }

      const examData = {
        title,
        subject,
        questions: isExternal ? [] : sortedQuestions,
        answer_key: answerKey,
        study_guide: guide,
        professor_id: selectedProfId,
        exam_type: examType,
        exam_date: examDate ? examDate : null,
        exam_time: examTime ? examTime : null,
        class_year: classYear,
        bimester: bimester,
        content,
      };

      let error;
      if (examToEdit) {
        const res = await supabase
          .from("exams")
          .update(examData)
          .eq("id", examToEdit.id)
          .select();
        error = res.error;
      } else {
        // --- CHECK CONFLICT FOR NEW EXAMS ---
        const conflictRes = await checkAndResolveExamConflict(
          classYear,
          bimester,
          subject,
          examType
        );
        if (!conflictRes.proceed) {
          if (conflictRes.error) {
            alert("Erro ao verificar conflitos de avaliação: " + conflictRes.error.message);
          }
          setSaving(false);
          return;
        }
        // --------------------------------------

        const res = await supabase
          .from("exams")
          .insert({ ...examData, created_at: new Date().toISOString() })
          .select();
        error = res.error;
      }

      if (error) {
        alert("Erro no banco de dados (Supabase): " + error.message);
        throw error;
      }
      alert(
        "Sucesso! A prova foi salva corretamente no servidor. Você agora pode imprimi-la.",
      );
      onExamSaved();
      setView("dashboard");
    } catch (err: any) {
      alert(
        "Erro ao tentar salvar: " +
          (err.message ||
            "Erro desconhecido. A imagem pode ser muito pesada ou há um problema de conexão."),
      );
      console.error("Error saving exam:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-[1400px] mx-auto space-y-6 pb-20 px-4"
    >
      <ViewHeader
        title={examToEdit ? "Editar Avaliação" : "Nova Avaliação"}
        icon={<FilePlus className="w-5 h-5 text-gold" />}
        badge="Editor Acadêmico"
        subtitle="Criação e edição de provas e gabaritos automáticos"
      >
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setView("dashboard")}
            className="px-3.5 py-2 justify-center bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-black text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-[#a88d44] hover:bg-[#8e7432] justify-center text-white border border-[#d4af37]/45 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <Loader2 className="animate-spin w-3.5 h-3.5" />
            ) : (
              <Download className="w-3.5 h-3.5 text-white" />
            )}
            <span>Salvar</span>
          </button>
        </div>
      </ViewHeader>

      {validationError && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-md text-sm font-bold flex items-center gap-2 shadow-sm">
          <AlertCircle className="w-5 h-5" />
          {validationError}
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Editor Side */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6 rounded-lg border border-border shadow-sm space-y-6">
            
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full max-w-sm">
              <button
                type="button"
                onClick={() => {
                  if (examType === "Atividade") setExamType("");
                }}
                className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${
                  examType !== "Atividade" ? "bg-white dark:bg-slate-700 shadow-sm text-[#a88d44] dark:text-[#d4af37]" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                Prova
              </button>
              <button
                type="button"
                onClick={() => setExamType("Atividade")}
                className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${
                  examType === "Atividade" ? "bg-white dark:bg-slate-700 shadow-sm text-green-600 dark:text-green-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                Atividade
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Título da {examType === "Atividade" ? "Atividade" : "Prova"}
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Prova Mensal de História"
                  className="w-full px-4 py-2 rounded-md border border-border focus:border-accent outline-none transition-all text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Bimestre
                </label>
                <select
                  value={bimester}
                  onChange={(e) => setBimester(e.target.value)}
                  className="w-full px-4 py-2 rounded-md border transition-all bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
                >
                  <option value="1º Bimestre">1º Bimestre</option>
                  <option value="2º Bimestre">2º Bimestre</option>
                  <option value="3º Bimestre">3º Bimestre</option>
                  <option value="4º Bimestre">4º Bimestre</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Matéria
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-2 rounded-md border transition-all bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
                >
                  <option value="">Selecione uma disciplina...</option>
                  {(isAdmin
                    ? schoolInfo.subjects
                    : userProfile?.assigned_subjects || []
                  ).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Turmas (Pode ser mais de uma)
              </label>
              <div className="flex flex-wrap gap-2">
                {allowedClasses.map((c) => {
                  const isSelected = classYear.split(", ").includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        const arr = classYear.split(", ").filter(Boolean);
                        if (arr.includes(c))
                          setClassYear(arr.filter((x) => x !== c).join(", "));
                        else setClassYear([...arr, c].join(", "));
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-xs font-bold border transition-all",
                        isSelected
                          ? "bg-primary text-white border-primary shadow-sm"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-800 hover:border-slate-400",
                      )}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {examType !== "Atividade" ? (
                <div className="space-y-2 relative" ref={typeDropdownRef}>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Tipo de Prova
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={examType}
                      onChange={(e) => {
                        setExamType(e.target.value);
                        setShowTypeDropdown(true);
                      }}
                      onFocus={() => setShowTypeDropdown(true)}
                      placeholder="Ex: PII, AP1, Recuperação..."
                      className="w-full px-4 py-2 pr-10 rounded-md border border-border focus:border-accent outline-none transition-all text-sm h-[38px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                      className="absolute right-0 top-0 h-full px-3 text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300 flex items-center justify-center border-l border-slate-200 dark:border-slate-800"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>

                  {showTypeDropdown && (
                    <div className="absolute left-0 right-0 z-[110] mt-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {(
                        schoolInfo.examCategories ||
                        DEFAULT_SCHOOL_INFO.examCategories
                      ).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setExamType(cat);
                            if (isAdapted && !title.toLowerCase().includes("adaptada")) {
                              setTitle(`Adaptação da ${cat}`);
                            }
                            setShowTypeDropdown(false);
                          }}
                          className={cn(
                            "w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 transition-colors font-bold",
                            examType === cat
                              ? "bg-accent/10 text-accent font-black"
                              : "text-slate-700 dark:text-slate-300",
                          )}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  {examType === "Atividade" ? "Data da Atividade" : "Data da Prova"}
                </label>
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full px-4 py-2 rounded-md border border-border focus:border-accent outline-none transition-all text-sm"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl relative overflow-hidden">
                <div className="flex items-center gap-2 relative z-10 w-fit">
                  <input
                    type="checkbox"
                    checked={isAdapted}
                    onChange={(e) => {
                      const adapted = e.target.checked;
                      setIsAdapted(adapted);
                      if (adapted && examType && !title.toLowerCase().includes("adaptada")) {
                        setTitle(`Adaptação da ${examType}`);
                      }
                    }}
                    className="w-4 h-4 text-primary bg-slate-100 border-gray-300 rounded focus:ring-primary dark:focus:ring-primary dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                    id="adapted-exam-checkbox"
                  />
                  <label htmlFor="adapted-exam-checkbox" className="text-sm font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                    Prova Adaptada
                  </label>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Marcando como Prova Adaptada, esta avaliação não constará no cronograma geral da turma.
                </p>
                
                {(isAdapted || (examType && examType.toLowerCase().includes("recupera"))) && (
                  <div className="mt-2 space-y-2">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      {isAdapted ? "Alunos para adaptação:" : "Alunos em recuperação:"}
                    </label>
                    {availableStudentsForAdapted.length === 0 ? (
                      <p className="text-xs text-amber-500 font-medium">Selecione uma turma com alunos cadastrados.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {availableStudentsForAdapted.map((st: any) => {
                          const isSelected = adaptedStudents.includes(st.name);
                          return (
                            <button
                              key={st.name}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setAdaptedStudents(adaptedStudents.filter(name => name !== st.name));
                                } else {
                                  setAdaptedStudents([...adaptedStudents, st.name]);
                                }
                              }}
                              className={cn(
                                "text-xs px-3 py-1.5 rounded-full border transition-colors",
                                isSelected 
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800 font-bold"
                                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-700"
                              )}
                            >
                              {st.name.split(" ")[0]} {st.name.split(" ").slice(-1)} ({st.classId})
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {!isAdapted && (
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-left block">
                  Conteúdo Programático
                </label>
                <ProfessionalEditor
                  id="exam-programmatic-content"
                  value={content}
                  onChange={setContent}
                  placeholder="Digite o conteúdo que será cobrado nesta prova..."
                />
              </div>
            )}
          </div>

          {!isExternal && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-lg font-bold text-primary">Questões</h3>
                <div className="flex flex-wrap gap-4">
                  {questions.length > 1 && (
                    <button
                      onClick={() => {
                        const newQs = [...questions].sort(() => Math.random() - 0.5);
                        setQuestions(newQs);
                      }}
                      className="text-slate-600 dark:text-slate-400 font-bold text-sm flex items-center gap-2 hover:underline"
                    >
                      <RotateCcw className="w-4 h-4" /> Embaralhar
                    </button>
                  )}
                  <button
                    onClick={() => addQuestion("objective")}
                    className="bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 dark:text-amber-400 font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors border border-amber-200 dark:border-amber-800"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Objetiva
                  </button>
                  <button
                    onClick={() => addQuestion("essay")}
                    className="bg-blue-100 hover:bg-blue-200 text-blue-900 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400 font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors border border-blue-200 dark:border-blue-800"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Dissertativa
                  </button>
                </div>
              </div>

              {(Array.isArray(questions) ? questions : []).map((q, idx) => (
                <div
                  key={q.id}
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-4 sm:p-6 rounded-lg border border-border shadow-sm space-y-4 text-left relative overflow-hidden"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-1 rounded text-[11px] font-bold uppercase tracking-wider">
                        Questão {idx + 1}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0",
                          q.type === "essay"
                            ? "bg-blue-100 text-blue-600"
                            : "bg-green-100 text-green-600",
                        )}
                      >
                        {q.type === "essay" ? "Dissertativa" : "Objetiva"}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                      {q.type !== "essay" && (
                        <button
                          onClick={() => {
                            const newQs = [...questions];
                            const realIdx = questions.findIndex(
                              (origQ) => origQ.id === q.id,
                            );
                            if (realIdx !== -1) {
                              newQs[realIdx].options = ["Verdadeiro", "Falso"];
                              newQs[realIdx].correctAnswer = "A";
                              setQuestions(newQs);
                            }
                          }}
                          className="px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-[10px] font-bold uppercase rounded-md transition-colors whitespace-nowrap shadow-sm"
                        >
                          Pré-preencher: V ou F
                        </button>
                       )}
                      <button
                        onClick={() =>
                          setQuestions(
                            questions.filter((origQ) => origQ.id !== q.id),
                          )
                        }
                        className="text-red-400 hover:text-red-600 transition-colors p-1.5 bg-red-50/50 hover:bg-red-50 dark:bg-red-950/20 rounded-md border border-red-100 dark:border-red-900/20"
                        title="Excluir Questão"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm select-none">
                    
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 p-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => {
                            const newQs = [...questions];
                            const ridx = questions.findIndex((x) => x.id === q.id);
                            newQs[ridx].align = "left";
                            setQuestions(newQs);
                          }}
                          className={cn(
                            "p-1.5 rounded transition-colors cursor-pointer",
                            (!q.align || q.align === "left")
                              ? "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white"
                              : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                          )}
                          title="Alinhar Enunciado à Esquerda"
                        >
                          <AlignLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const newQs = [...questions];
                            const ridx = questions.findIndex((x) => x.id === q.id);
                            newQs[ridx].align = "center";
                            setQuestions(newQs);
                          }}
                          className={cn(
                            "p-1.5 rounded transition-colors cursor-pointer",
                            q.align === "center"
                              ? "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white"
                              : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                          )}
                          title="Centralizar Enunciado"
                        >
                          <AlignCenter className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {/* RESPOSTA DISCURSIVA (LINES COUNT) */}
                      {q.type === "essay" && (
                        <div className="flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-700 pl-3">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                            Linhas:
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="50"
                            className="w-12 text-center text-xs font-black bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded px-1 py-1 focus:ring-1 focus:ring-indigo-500 outline-none"
                            value={q.lineCount ?? 5}
                            onChange={(e) => {
                              const newQs = [...questions];
                              const ridx = questions.findIndex((x) => x.id === q.id);
                              newQs[ridx].lineCount = e.target.value === "" ? "" : parseInt(e.target.value);
                              setQuestions(newQs);
                            }}
                          />
                        </div>
                      )}

                      {/* VALOR DA QUESTÃO (POINTS) */}
                      <div className="flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-700 pl-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                          Valor:
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          max="100"
                          placeholder="1,0"
                          className="w-12 text-center text-xs font-black bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded px-1 py-1 focus:ring-1 focus:ring-indigo-500 outline-none"
                          value={q.points ?? ""}
                          onChange={(e) => {
                            const newQs = [...questions];
                            const ridx = questions.findIndex((x) => x.id === q.id);
                            const val = e.target.value;
                            newQs[ridx].points = val === "" ? "" : parseFloat(val);
                            setQuestions(newQs);
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-[10px] font-extrabold uppercase rounded-md transition-colors cursor-pointer select-none">
                        <Camera className="w-3.5 h-3.5 text-blue-500" />
                        <span>Inserir Imagem</span>
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
                                  
                                  const newQs = [...questions];
                                  const ridx = questions.findIndex((x) => x.id === q.id);
                                  newQs[ridx].image = compressedBase64;
                                  newQs[ridx].imageSize = 100;
                                  newQs[ridx].imageAlign = "center";
                                  setQuestions(newQs);
                                };
                                img.src = reader.result as string;
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>

                      {/* INSERT GEOMETRIC SHAPE SELECT */}
                      <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-1.5 py-0.5">
                        <Shapes className="w-3.5 h-3.5 text-indigo-500" />
                        <select
                          value={q.drawingShape || "none"}
                          onChange={(e) => {
                            const newQs = [...questions];
                            const ridx = questions.findIndex((x) => x.id === q.id);
                            newQs[ridx].drawingShape = e.target.value as any;
                            if (e.target.value !== "none") {
                              newQs[ridx].drawingShapeSize = 150;
                              newQs[ridx].drawingShapeAlign = "center";
                              newQs[ridx].drawingShapeFill = "transparent";
                              newQs[ridx].drawingShapeBorderColor = "black";
                              newQs[ridx].drawingShapeBorderWidth = 2;
                              newQs[ridx].drawingShapeBorderStyle = "solid";
                              newQs[ridx].drawingShapeText = "";
                              newQs[ridx].drawingShapeTextColor = "black";
                              if (e.target.value === "rectangle" || e.target.value === "triangle" || e.target.value === "right-triangle") {
                                newQs[ridx].drawingShapeHeight = 100;
                              } else if (e.target.value === "line" || e.target.value === "arrow") {
                                newQs[ridx].drawingShapeHeight = 40;
                              }
                            }
                            setQuestions(newQs);
                          }}
                          className="bg-transparent border-none text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 outline-none cursor-pointer pr-1"
                        >
                          <option value="none">Sem Forma</option>
                          <option value="circle">Forma: Círculo</option>
                          <option value="square">Forma: Quadrado</option>
                          <option value="rectangle">Forma: Retângulo</option>
                          <option value="triangle">Forma: Triângulo</option>
                          <option value="right-triangle">Forma: Triâng. Retângulo</option>
                          <option value="line">Forma: Linha</option>
                          <option value="arrow">Forma: Seta</option>
                        </select>
                      </div>
                    </div>

                  </div>

                  <ProfessionalEditor
                    id={`question-${q.id}`}
                    value={q.text}
                    onChange={(val) => {
                      const newQs = [...questions];
                      const ridx = questions.findIndex((x) => x.id === q.id);
                      newQs[ridx].text = val;
                      setQuestions(newQs);
                    }}
                  />

                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2 cursor-pointer w-fit hover:text-primary transition-colors">
                      <Camera className="w-4 h-4" />
                      Imagem
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              const base64 = reader.result as string;
                              const newQs = [...questions];
                              const ridx = questions.findIndex((x) => x.id === q.id);
                              newQs[ridx].image = base64;
                              newQs[ridx].imageSize = 100;
                              newQs[ridx].imageAlign = "center";
                              setQuestions(newQs);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                    {q.image && (
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 space-y-4">
                        <div className="flex justify-between items-start gap-4">
                          <img
                            src={q.image}
                            alt=""
                            className="max-h-32 object-contain rounded-md border border-slate-200 dark:border-slate-700 bg-white"
                          />
                          <div className="flex flex-col gap-2 shrink-0">
                            <button
                              onClick={() => setEditingImageQId(q.id)}
                              className="bg-emerald-100 text-emerald-600 p-2 rounded-lg hover:bg-emerald-200 transition-colors shrink-0"
                              title="Editar Tamanho e Posição da Imagem"
                            >
                              <Maximize2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                const newQs = [...questions];
                                const ridx = questions.findIndex((x) => x.id === q.id);
                                newQs[ridx].image = undefined;
                                setQuestions(newQs);
                              }}
                              className="bg-red-100 text-red-600 p-2 rounded-lg hover:bg-red-200 transition-colors shrink-0"
                              title="Remover Imagem"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}


                  </div>

                  {/* CONFIGURAÇÃO DO ESPAÇO GEOMÉTRICO DE DESENHO */}
                  {q.drawingShape && q.drawingShape !== "none" && (
                    <div className="bg-slate-50 dark:bg-slate-800/45 p-4.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                        <div className="flex items-center gap-2">
                          <Shapes className="w-4 h-4 text-indigo-500" />
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                            Ferramentas de Desenho - Formatar Forma
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newQs = [...questions];
                            const ridx = questions.findIndex((x) => x.id === q.id);
                            newQs[ridx].drawingShape = "none";
                            setQuestions(newQs);
                          }}
                          className="text-[10px] text-red-500 hover:text-red-600 font-extrabold uppercase transition-colors cursor-pointer"
                        >
                          Remover Forma
                        </button>
                      </div>

                      {/* Config Panel + Live Preview */}
                      <div className="flex flex-col lg:flex-row gap-6">
                        
                        {/* Config columns */}
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                          
                          {/* Col 1: Alignment, Width, Height */}
                          <div className="space-y-3.5">
                            {/* Shape Alignment */}
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">
                                Posição da Forma
                              </label>
                              <div className="flex bg-slate-200 dark:bg-slate-700 rounded-lg p-1">
                                {['left', 'center', 'right'].map((align) => (
                                  <button
                                    key={align}
                                    type="button"
                                    onClick={() => {
                                      const newQs = [...questions];
                                      const ridx = questions.findIndex((x) => x.id === q.id);
                                      newQs[ridx].drawingShapeAlign = align as any;
                                      setQuestions(newQs);
                                    }}
                                    className={cn(
                                      "flex-1 py-1 text-[10px] font-black uppercase rounded-md transition-all border-none outline-none cursor-pointer",
                                      (q.drawingShapeAlign || 'center') === align
                                        ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                                    )}
                                  >
                                    {align === 'left' ? 'Esquerda' : align === 'center' ? 'Centro' : 'Direita'}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Dimension 1: Width */}
                            <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                  {q.drawingShape === "circle" ? "Diâmetro" : "Largura"}
                                </label>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min="40"
                                    max="450"
                                    value={q.drawingShapeSize || 150}
                                    onChange={(e) => {
                                      const newQs = [...questions];
                                      const ridx = questions.findIndex((x) => x.id === q.id);
                                      newQs[ridx].drawingShapeSize = Math.min(450, Math.max(40, Number(e.target.value) || 40));
                                      setQuestions(newQs);
                                    }}
                                    className="w-12 text-center text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded px-1 py-0.5 outline-none"
                                  />
                                  <span className="text-[10px] text-slate-400 font-bold">px</span>
                                </div>
                              </div>
                              <input
                                type="range"
                                min="40"
                                max="450"
                                step="5"
                                value={q.drawingShapeSize || 150}
                                onChange={(e) => {
                                  const newQs = [...questions];
                                  const ridx = questions.findIndex((x) => x.id === q.id);
                                  newQs[ridx].drawingShapeSize = Number(e.target.value);
                                  setQuestions(newQs);
                                }}
                                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                              />
                            </div>

                            {/* Dimension 2: Height (if not square/circle) */}
                            {q.drawingShape !== "circle" && q.drawingShape !== "square" && (
                              <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    Altura
                                  </label>
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      min="20"
                                      max="400"
                                      value={q.drawingShapeHeight || (q.drawingShape === 'line' || q.drawingShape === 'arrow' ? 40 : 100)}
                                      onChange={(e) => {
                                        const newQs = [...questions];
                                        const ridx = questions.findIndex((x) => x.id === q.id);
                                        newQs[ridx].drawingShapeHeight = Math.min(400, Math.max(20, Number(e.target.value) || 20));
                                        setQuestions(newQs);
                                      }}
                                      className="w-12 text-center text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded px-1 py-0.5 outline-none"
                                    />
                                    <span className="text-[10px] text-slate-400 font-bold">px</span>
                                  </div>
                                </div>
                                <input
                                  type="range"
                                  min="20"
                                  max="400"
                                  step="5"
                                  value={q.drawingShapeHeight || (q.drawingShape === 'line' || q.drawingShape === 'arrow' ? 40 : 100)}
                                  onChange={(e) => {
                                    const newQs = [...questions];
                                    const ridx = questions.findIndex((x) => x.id === q.id);
                                    newQs[ridx].drawingShapeHeight = Number(e.target.value);
                                    setQuestions(newQs);
                                  }}
                                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                />
                              </div>
                            )}
                          </div>

                          {/* Col 2: Colors, Styles & Inner Text */}
                          <div className="space-y-3.5">
                            {/* Line 1: Preenchimento (Fill) & Contorno Color */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                  Preenchimento
                                </label>
                                <select
                                  value={q.drawingShapeFill || "transparent"}
                                  onChange={(e) => {
                                    const newQs = [...questions];
                                    const ridx = questions.findIndex((x) => x.id === q.id);
                                    newQs[ridx].drawingShapeFill = e.target.value;
                                    setQuestions(newQs);
                                  }}
                                  className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 rounded outline-none cursor-pointer"
                                >
                                  <option value="transparent">Sem Cor (Transparente)</option>
                                  <option value="white">Branco</option>
                                  <option value="lightgray">Cinza Claro</option>
                                  <option value="gray">Cinza Médio</option>
                                  <option value="yellow">Amarelo Claro</option>
                                  <option value="blue">Azul Claro</option>
                                  <option value="green">Verde Claro</option>
                                  <option value="red">Vermelho Claro</option>
                                </select>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                  Contorno
                                </label>
                                <select
                                  value={q.drawingShapeBorderColor || "black"}
                                  onChange={(e) => {
                                    const newQs = [...questions];
                                    const ridx = questions.findIndex((x) => x.id === q.id);
                                    newQs[ridx].drawingShapeBorderColor = e.target.value;
                                    setQuestions(newQs);
                                  }}
                                  className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 rounded outline-none cursor-pointer"
                                >
                                  <option value="black">Preto</option>
                                  <option value="gray">Cinza</option>
                                  <option value="none">Sem Contorno</option>
                                </select>
                              </div>
                            </div>

                            {/* Line 2: Espessura Contorno & Estilo Contorno */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                  Espessura
                                </label>
                                <select
                                  value={q.drawingShapeBorderWidth ?? 2}
                                  onChange={(e) => {
                                    const newQs = [...questions];
                                    const ridx = questions.findIndex((x) => x.id === q.id);
                                    newQs[ridx].drawingShapeBorderWidth = Number(e.target.value);
                                    setQuestions(newQs);
                                  }}
                                  className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 rounded outline-none cursor-pointer"
                                >
                                  <option value={1}>1px (Fina)</option>
                                  <option value={2}>2px (Média)</option>
                                  <option value={3}>3px (Espessa)</option>
                                  <option value={4}>4px (Grossa)</option>
                                  <option value={5}>5px (Extra Grossa)</option>
                                </select>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                  Tipo de Linha
                                </label>
                                <select
                                  value={q.drawingShapeBorderStyle || "solid"}
                                  onChange={(e) => {
                                    const newQs = [...questions];
                                    const ridx = questions.findIndex((x) => x.id === q.id);
                                    newQs[ridx].drawingShapeBorderStyle = e.target.value as any;
                                    setQuestions(newQs);
                                  }}
                                  className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 rounded outline-none cursor-pointer"
                                >
                                  <option value="solid">Linha Contínua</option>
                                  <option value="dashed">Tracejado</option>
                                  <option value="dotted">Pontilhado</option>
                                </select>
                              </div>
                            </div>

                            {/* Line 3: Texto Interno & Cor do Texto */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                  Texto Interno
                                </label>
                                <input
                                  type="text"
                                  value={q.drawingShapeText || ""}
                                  onChange={(e) => {
                                    const newQs = [...questions];
                                    const ridx = questions.findIndex((x) => x.id === q.id);
                                    newQs[ridx].drawingShapeText = e.target.value;
                                    setQuestions(newQs);
                                  }}
                                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 rounded outline-none focus:border-indigo-500"
                                  placeholder="Ex: A, x, 5 cm"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                  Cor do Texto
                                </label>
                                <select
                                  value={q.drawingShapeTextColor || "black"}
                                  onChange={(e) => {
                                    const newQs = [...questions];
                                    const ridx = questions.findIndex((x) => x.id === q.id);
                                    newQs[ridx].drawingShapeTextColor = e.target.value;
                                    setQuestions(newQs);
                                  }}
                                  className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 rounded outline-none cursor-pointer"
                                >
                                  <option value="black">Preto</option>
                                  <option value="white">Branco</option>
                                  <option value="gray">Cinza</option>
                                  <option value="red">Vermelho</option>
                                  <option value="blue">Azul</option>
                                  <option value="green">Verde</option>
                                </select>
                              </div>
                            </div>
                          </div>

                        </div>

                        {/* Live Preview Pane */}
                        <div className="w-full lg:w-48 shrink-0 flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl relative select-none" style={{ minHeight: '160px' }}>
                          <span className="absolute top-1.5 left-2 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                            Live Preview
                          </span>
                          <div className="flex items-center justify-center w-full h-full p-2 overflow-hidden">
                            {renderQuestionShape(q)}
                          </div>
                        </div>

                      </div>
                    </div>
                  )
                  }

                  {q.type !== "essay" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      {(q.options || []).map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2 relative group">
                          <button
                            onClick={() => {
                              const newQs = [...questions];
                              const ridx = questions.findIndex(
                                (x) => x.id === q.id,
                              );
                              newQs[ridx].correctAnswer = String.fromCharCode(
                                65 + optIdx,
                              );
                              setQuestions(newQs);
                            }}
                            className={cn(
                              "w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0",
                              q.correctAnswer ===
                                String.fromCharCode(65 + optIdx)
                                ? "bg-primary text-white"
                                : "text-slate-600 dark:text-slate-400 hover:border-primary",
                            )}
                          >
                            {String.fromCharCode(65 + optIdx)}
                          </button>
                          <input
                            value={opt}
                            onChange={(e) => {
                              const newQs = [...questions];
                              const ridx = questions.findIndex(
                                (x) => x.id === q.id,
                              );
                              const newOpts = [...(newQs[ridx].options || [])];
                              newOpts[optIdx] = e.target.value;
                              newQs[ridx].options = newOpts;
                              setQuestions(newQs);
                            }}
                            className="flex-1 px-3 py-1 rounded border border-slate-200 dark:border-slate-800 text-sm"
                          />
                          {(q.options || []).length > 2 && (
                            <button
                              onClick={() => {
                                const newQs = [...questions];
                                const ridx = questions.findIndex(
                                  (x) => x.id === q.id,
                                );
                                const newOpts = [...(newQs[ridx].options || [])];
                                newOpts.splice(optIdx, 1);
                                newQs[ridx].options = newOpts;
                                // se a resposta correta era essa e foi removida, ou era depois dessa
                                const correctAnswerIndex = newQs[ridx].correctAnswer.charCodeAt(0) - 65;
                                if (correctAnswerIndex === optIdx) {
                                  newQs[ridx].correctAnswer = "A"; // reset
                                } else if (correctAnswerIndex > optIdx) {
                                  newQs[ridx].correctAnswer = String.fromCharCode(65 + correctAnswerIndex - 1);
                                }
                                setQuestions(newQs);
                              }}
                              className="w-6 h-6 rounded-full bg-slate-100 hover:bg-red-100 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors shrink-0 md:opacity-0 md:group-hover:opacity-100"
                              title="Remover opção"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => {
                            const newQs = [...questions];
                            const ridx = questions.findIndex(
                              (x) => x.id === q.id,
                            );
                            const newOpts = [...(newQs[ridx].options || [])];
                            newOpts.push("");
                            newQs[ridx].options = newOpts;
                            setQuestions(newQs);
                          }}
                          className="text-xs font-bold text-accent hover:underline flex items-center gap-1.5 px-2 py-1"
                        >
                          <Plus className="w-3 h-3" /> Adicionar Opção
                        </button>
                        {(q.options || []).length > 1 && (
                            <button
                                onClick={() => {
                                    const newQs = [...questions];
                                    const ridx = questions.findIndex(x => x.id === q.id);
                                    let newOpts = [...(newQs[ridx].options || [])];
                                    // Identify current correct answer option index
                                    const correctIdx = newQs[ridx].correctAnswer ? newQs[ridx].correctAnswer.charCodeAt(0) - 65 : 0;
                                    const correctValue = newOpts[correctIdx];
                                    
                                    // Shuffle options along with their original indices
                                    const shuffled = newOpts.map((val, idx) => ({val, idx})).sort(() => Math.random() - 0.5);
                                    newQs[ridx].options = shuffled.map(x => x.val);
                                    
                                    // Update correct answer based on where it ended up
                                    const newCorrectIdx = shuffled.findIndex(x => x.idx === correctIdx);
                                    if (newCorrectIdx !== -1) {
                                      newQs[ridx].correctAnswer = String.fromCharCode(65 + newCorrectIdx);
                                    }
                                    setQuestions(newQs);
                                }}
                                className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:underline flex items-center gap-1.5 px-2 py-1"
                            >
                                <RotateCcw className="w-3 h-3" /> Embaralhar Opções
                            </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        <label className="flex items-center justify-between gap-3 text-[10px] text-slate-800 dark:text-slate-200 font-black uppercase tracking-widest bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl px-4 py-3 rounded-2xl cursor-pointer select-none transition-all hover:-translate-y-1 hover:shadow-2xl">
          <div className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={isExternal}
              onChange={(e) => setIsExternal(e.target.checked)}
              className="accent-[#a88d44] w-4 h-4 cursor-pointer"
            />
            <span className="mt-[2px]">Prova Externa</span>
          </div>
          <span className="text-[8px] text-slate-400 font-medium">(Apenas Conteúdo)</span>
        </label>
        
        <button
          type="button"
          onClick={() => setShowLivePreview(true)}
          className="flex items-center justify-center gap-2 bg-[#a88d44] hover:bg-[#8e7432] text-white px-5 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-[#a88d44]/30 transition-all hover:-translate-y-1 hover:shadow-2xl cursor-pointer border border-[#d4af37]/45"
        >
          <Eye className="w-5 h-5 flex-shrink-0" />
          <span>Pré-visualizar Prova</span>
        </button>
      </div>

      {/* Real-time Full Screen Preview Overlay Modal */}
      {showLivePreview && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[999] overflow-y-auto p-4 md:p-10 flex justify-center items-start">
          <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-[245mm] w-full border border-slate-700/50 overflow-hidden flex flex-col my-4">
            {/* Sticky Header inside Overlay */}
            <div className="sticky top-0 bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between z-[1000] shadow-sm">
              <div className="flex items-center gap-3">
                <div className="bg-accent/15 p-2 rounded-lg text-accent">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                    Visualização em Tamanho Real (A4)
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    Verifique a diagramação e espaçamento exato de cada questão
                    antes de imprimir ou salvar
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700/30 hidden sm:inline-block">
                  {fontFamily} ({fontSize}px)
                </span>
                <button
                  type="button"
                  onClick={() => setShowLivePreview(false)}
                  className="bg-accent hover:bg-accent/90 text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-lg transition-all shadow-md flex items-center gap-1.5"
                >
                  <EyeOff className="w-4 h-4" />
                  Fechar Visualização
                </button>
              </div>
            </div>

            {/* Container for the real document */}
            <div id="exam-doc-container" className="p-4 md:p-10 overflow-x-auto bg-slate-950 flex justify-center min-h-[calc(100vh-180px)] select-none">
              {!isExternal ? (
                <div className="w-full max-w-[210mm] h-fit">
                  <ExamDocument
                    exam={{
                      title,
                      subject,
                      examType,
                      examDate,
                      fontSize,
                      fontFamily,
                      content: content || title,
                      questions: questions,
                    }}
                    studentName="NOME COMPLETO DO ALUNO EXEMPLO"
                    classId={classYear.split(", ")[0] || "9º ANO A"}
                    professorName={
                      userProfile?.professional_name ||
                      professors.find((p) => p.uid === user.id)
                        ?.professional_name ||
                      "Prof. Examinador"
                    }
                    totalValue={questions.reduce(
                      (acc, q) =>
                        acc +
                        (parseFloat(
                          String(
                            q.points !== undefined &&
                              q.points !== null &&
                              q.points !== ""
                              ? q.points
                              : 1,
                          ),
                        ) || 0),
                      0,
                    )}
                    isPreview={true}
                    onImageResize={(qId, size, height) => {
                      setQuestions(qs => qs.map(q => q.id === qId ? { ...q, imageSize: size, imageHeight: height } : q));
                    }}
                    onImagePositionChange={(qId, left, top) => {
                      setQuestions(qs => qs.map(q => q.id === qId ? { ...q, imageLeft: left, imageTop: top } : q));
                    }}
                    onShapeResize={(qId, w, h) => {
                      setQuestions(qs => qs.map(q => q.id === qId ? { ...q, drawingShapeSize: w, drawingShapeHeight: h } : q));
                    }}
                    onShapePositionChange={(qId, left, top) => {
                      setQuestions(qs => qs.map(q => q.id === qId ? { ...q, drawingShapeLeft: left, drawingShapeTop: top } : q));
                    }}
                    onImageCaptionChange={(qId, caption) => {
                      setQuestions(qs => qs.map(q => q.id === qId ? { ...q, imageCaption: caption } : q));
                    }}
                  />
                </div>
              ) : (
                <div className="max-w-md mx-auto my-auto flex flex-col items-center justify-center p-12 text-center space-y-4 bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl">
                  <div className="p-4 bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl">
                    <ExternalLink className="w-12 h-12" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight">
                      Prova Externa
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                      Esta prova não possui questões cadastradas na plataforma.
                      Ela aparecerá apenas no cronograma de estudos.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {editingQuestion && editingQuestion.image && (
        <ImageEditorModal 
           src={editingQuestion.image}
           initialWidth={editingQuestion.imageSize || (editingQuestion.imageAlign === 'center' || !editingQuestion.imageAlign ? 100 : 40)}
           initialHeight={editingQuestion.imageHeight || 150}
           initialCaption={editingQuestion.imageCaption || ''}
           initialAlign={editingQuestion.imageAlign || 'center'}
           initialWrap={editingQuestion.imageWrap || ''}
           initialOpacity={editingQuestion.imageOpacity ?? 0.15}
           onSave={(w: number, h: number, c: string, align: 'left'|'center'|'right', wrapMode: string, opacityVal: number) => {
               const newQs = [...questions];
               const ridx = questions.findIndex((x) => x.id === editingQuestion.id);
               if (ridx !== -1) {
                 newQs[ridx].imageSize = w;
                 newQs[ridx].imageHeight = h;
                 newQs[ridx].imageCaption = c;
                 newQs[ridx].imageAlign = align;
                 newQs[ridx].imageWrap = wrapMode as any;
                 newQs[ridx].imageOpacity = opacityVal;
                 setQuestions(newQs);
               }
               setEditingImageQId(null);
           }}
           onClose={() => setEditingImageQId(null)}
        />
      )}
    </motion.div>
  );
}

function SettingsView({
  user,
  userProfile,
  onPasswordChange,
  onProfileUpdated,
  busAnimationsEnabled = true,
  onToggleBusAnimations = () => {},
}: {
  user: User;
  userProfile: any;
  onPasswordChange: (pw: string) => Promise<void>;
  onProfileUpdated: (name: string, avatarUrl: string | null) => void;
  busAnimationsEnabled?: boolean;
  onToggleBusAnimations?: (enabled: boolean) => void;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profName, setProfName] = useState(
    userProfile?.professional_name || "",
  );
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    user.user_metadata?.avatar_base64 || user.user_metadata?.avatar_url || null,
  );
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    try {
      const initialAvatar =
        user.user_metadata?.avatar_base64 ||
        user.user_metadata?.avatar_url ||
        null;
      const avatarChanged = avatarUrl !== initialAvatar;

      let data: any = {};
      let usedFallback = false;

      // 1. Attempt updating via Express Backend Server first
      try {
        const res = await robustFetch("/api/admin/update-professor-metadata", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            targetUid: user.id,
            professionalName: profName,
            avatarUrl: avatarChanged ? avatarUrl : undefined,
            initialAvatarUrl: initialAvatar,
          }),
        });

        const resText = await res.text();
        try {
          data = JSON.parse(resText);
        } catch (pErr) {
          throw new Error(
            `Resposta do servidor inválida (Status ${res.status}): ${resText.substring(0, 200) || "Resposta vazia"}`,
          );
        }

        if (!res.ok) {
          // If 404 (Not Found, typical for Vercel when backend is not mapped) or host-specific routing failures
          if (
            res.status === 404 ||
            resText.includes("NOT_FOUND") ||
            resText.toLowerCase().includes("could not be found") ||
            resText.toLowerCase().includes("404")
          ) {
            console.warn(
              "Backend endpoint de atualização retornou 404. Usando fallback Supabase diretamente.",
            );
            usedFallback = true;
          } else {
            throw new Error(
              data.error || `Erro ao atualizar perfil (Status ${res.status})`,
            );
          }
        }
      } catch (fetchErr: any) {
        // If there's a network error (e.g. TypeError: Failed to fetch, CORS, etc.), we fall back
        console.warn(
          "Express backend update failed or is unreachable, trying direct client-side Supabase update:",
          fetchErr.message || fetchErr,
        );
        usedFallback = true;
      }

      // 2. Client-Side fallback update (Using Browser Supabase Client directly with non-blocking try-catches)
      if (usedFallback) {
        console.log(
          "Executing updates on Supabase directly from browser client with fault-tolerance...",
        );

        // A. Update users table in background
        try {
          const { error: dbError } = await supabase
            .from("users")
            .update({ professional_name: profName })
            .eq("uid", user.id);

          if (dbError) {
            console.warn(
              "Aviso ao atualizar tabela users diretamente do cliente:",
              dbError.message,
            );
          }
        } catch (dbErr: any) {
          console.warn(
            "Falha de rede/permissão gravando tabela users diretamente:",
            dbErr,
          );
        }

        // B. Update allowed_professors for sync in background
        if (user.email) {
          try {
            await supabase
              .from("allowed_professors")
              .update({ full_name: profName })
              .eq("email", user.email);
          } catch (e: any) {
            console.warn(
              "Aviso ao sincronizar allowed_professors do cliente:",
              e.message,
            );
          }
        }

        // C. Storage image upload & auth metadata
        let finalAvatarUrl = avatarUrl;
        try {
          if (avatarChanged) {
            if (avatarUrl === null) {
              // Remove avatar from storage
              try {
                await supabase.storage
                  .from("avatars")
                  .remove([`${user.id}.jpeg`]);
              } catch (storageDelErr: any) {
                console.warn(
                  "Aviso ao remover foto do storage:",
                  storageDelErr.message,
                );
              }

              // Update auth metadata
              try {
                await supabase.auth.updateUser({
                  data: {
                    avatar_url: null,
                    avatar_base64: null,
                    displayName: profName,
                  },
                });
              } catch (e: any) {
                console.warn(
                  "Aviso ao sincronizar metadados de exclusão do avatar:",
                  e,
                );
              }
              finalAvatarUrl = null;
            } else if (avatarUrl.startsWith("data:image")) {
              // --- ROBUST PROXY UPLOAD ---
              // Instead of saving Base64 in JWT (metadata), we send it to our server
              // which saves it to disk/cloud and returns a clean URL.
              try {
                const uploadRes = await fetch("/api/user/upload-avatar", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    targetUid: user.id,
                    imageBase64: avatarUrl,
                  }),
                });

                const uploadData = await uploadRes.json();
                if (uploadData.success && uploadData.avatar_url) {
                  finalAvatarUrl = uploadData.avatar_url;
                  // The server already updated auth metadata to clear base64,
                  // but we sync the local session state too if needed
                  try {
                    await supabase.auth.refreshSession();
                  } catch (refreshErr) {
                    console.warn(
                      "Silent refreshSession error (expected if token expired during upload):",
                      refreshErr,
                    );
                  }
                } else {
                  console.warn(
                    "Server-side upload failed, falling back to client-only context:",
                    uploadData.error,
                  );
                  finalAvatarUrl = avatarUrl;
                }
              } catch (proxyErr) {
                console.error("Critical Proxy Upload Error:", proxyErr);
                finalAvatarUrl = avatarUrl; // Last resort fallback
              }
            }
          } else {
            // Just update profile/displayName
            try {
              await supabase.auth.updateUser({
                data: { displayName: profName },
              });
            } catch (metaErr: any) {
              console.warn(
                "Aviso ao sincronizar displayName simples no supabase auth:",
                metaErr,
              );
            }
          }
        } catch (avatarProcessError: any) {
          console.warn(
            "Aviso no processamento do avatar/auth no fallback:",
            avatarProcessError,
          );
        }

        data = { avatar_url: finalAvatarUrl };
      }

      // Update password if provided
      if (newPassword) {
        if (newPassword !== confirmPassword) {
          alert("As senhas não coincidem.");
          setLoading(false);
          return;
        }
        if (newPassword.length < 6) {
          alert("A senha deve ter pelo menos 6 caracteres.");
          setLoading(false);
          return;
        }
        await onPasswordChange(newPassword);
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.7 },
          colors: ["#ff3b30", "#4cd964", "#007aff", "#ffcc00"],
        });
        setNewPassword("");
        setConfirmPassword("");
      } else if (!newPassword && success === false) {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.7 },
          colors: ["#ff3b30", "#4cd964", "#007aff", "#ffcc00"],
        });
      }

      // LOG SYSTEM ACTIVITY AFTER PROFILE SAVE (with try-catch to keep it robust)
      try {
        const _localIsAdm = userProfile?.role?.includes("ti"); if (!_localIsAdm) await fetch("/api/activity/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actorName:
              profName ||
              userProfile?.professional_name ||
              user.email?.split("@")[0],
            actorEmail: user.email,
            actionType: "update_profile",
            description: `O professor ${profName || userProfile?.professional_name || user.email?.split("@")[0]} atualizou seus dados de perfil e conta.`,
          }),
        });
      } catch (logErr) {
        console.warn("Audit Log Profile Error:", logErr);
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);

      // Reactive state updating instead of window.location.reload() to maintain a smooth experience
      const resolvedAvatar =
        data.avatar_url !== undefined ? data.avatar_url : avatarUrl;
      onProfileUpdated(profName, resolvedAvatar);
    } catch (err: any) {
      const msg = err.message || "";
      if (
        msg.includes("Refresh Token Not Found") ||
        msg.includes("Invalid Refresh Token")
      ) {
        alert(
          "Sua sessão expirou. Por favor, saia e faça login novamente para salvar suas alterações.",
        );
      } else if (msg === "Failed to fetch" || msg.includes("Failed to fetch")) {
        return; // Squash alert
      } else {
        alert("Erro ao atualizar: " + msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("A imagem deve ter no máximo 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageToCrop(event.target?.result as string);
      setIsCropping(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCropComplete = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;
    try {
      const croppedImage = await getCroppedImg(
        imageToCrop,
        croppedAreaPixels,
        0,
      );
      setAvatarUrl(croppedImage);
      setIsCropping(false);
      setImageToCrop(null);
    } catch (e) {
      console.error(e);
      alert("Erro ao processar imagem. Tente novamente.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <ViewHeader
        title="Minha Conta"
        subtitle={`Gestão do seu perfil de docente e credenciais de segurança acadêmica (${user.email}).`}
        icon={<UserCircle className="w-5 h-5 text-gold" />}
        badge="Ajustes do Perfil"
      />

      {isCropping && imageToCrop && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4 touch-none">
          <div className="relative w-full max-w-lg h-[50vh] md:h-[60vh] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl mb-6 border border-slate-700/50">
            <Cropper
              image={imageToCrop}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onCropComplete={(_, croppedPixels) =>
                setCroppedAreaPixels(croppedPixels)
              }
              onZoomChange={setZoom}
            />
          </div>
          <div className="w-full max-w-lg bg-slate-900 rounded-3xl p-6 border border-slate-700/50 shadow-xl space-y-6">
            <div className="flex flex-col gap-3">
              <label className="text-white text-[10px] font-black uppercase tracking-widest text-center opacity-80">
                Zoom da Imagem
              </label>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.05}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-gold h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsCropping(false);
                  setImageToCrop(null);
                }}
                className="flex-1 py-3.5 bg-slate-800 text-white text-[11px] font-black uppercase tracking-wider rounded-xl hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCropComplete}
                className="flex-1 py-3.5 bg-gold text-slate-950 text-[11px] font-black uppercase tracking-wider rounded-xl hover:bg-[#b0902c] hover:text-white transition-colors shadow-lg shadow-gold/20"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-md relative overflow-hidden">
        <form onSubmit={handleUpdateProfile} className="space-y-6">
          <div className="flex flex-col md:flex-row gap-6 md:items-center">
            <div className="flex-shrink-0 flex flex-col items-center gap-3">
              <label className="cursor-pointer group flex flex-col items-center gap-2">
                <div className="w-24 h-24 rounded-full border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden relative shadow-sm transition-all group-hover:border-gold">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserCircle className="w-10 h-10 text-slate-700 dark:text-slate-300" />
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest group-hover:text-gold transition-colors">
                  Alterar Foto
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </label>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl(null)}
                  className="text-[10px] uppercase tracking-wider font-bold text-red-500 hover:text-red-400 transition-colors"
                >
                  Remover Foto
                </button>
              )}
            </div>

            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest pl-1">
                Nome Profissional
              </label>
              <input
                type="text"
                value={profName}
                onChange={(e) => setProfName(e.target.value)}
                placeholder="Ex: Prof. Dr. Carlos Silva"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-white outline-none focus:border-accent transition-all font-bold"
              />
              <p className="text-[10px] text-slate-600 dark:text-slate-400 pl-1 italic">
                Como seu nome aparecerá no cabeçalho das provas.
              </p>
            </div>
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 dark:bg-slate-800 my-4" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest pl-1">
                Nova Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 dark:text-slate-400" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-white outline-none focus:border-accent transition-all font-bold"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest pl-1">
                Confirmar Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 dark:text-slate-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-white outline-none focus:border-accent transition-all font-bold"
                />
              </div>
            </div>
          </div>

          {/* CONFIGURAÇÃO DE ANIMAÇÕES DO ÔNIBUS ESCOLAR */}
          <div className="h-px bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 dark:bg-slate-800 my-4" />

          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest pl-1 font-sans">
              Empatia Visual & Performance
            </h4>
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/45 border border-slate-200 dark:border-slate-800 hover:border-amber-500/20 transition-all group">
              <div className="flex items-start gap-3.5 pr-4">
                <div className="text-2xl select-none pt-0.5 group-hover:animate-bounce">
                  🚌
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    Animações do Expresso Progresso
                    <span className="text-[8px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-500 border border-amber-200 dark:border-amber-900/10">
                      EXCLUSIVO
                    </span>
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-slate-700 dark:text-slate-400 font-medium leading-relaxed">
                    Habilitar transições divertidas do ônibus escolar ao
                    alternar entre as abas e ao carregar o portal. Desative para
                    navegação instantânea.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onToggleBusAnimations(!busAnimationsEnabled)}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2",
                  busAnimationsEnabled
                    ? "bg-amber-500"
                    : "bg-slate-200 dark:bg-slate-800",
                )}
              >
                <span className="sr-only">Toggle de animações</span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-md ring-0 transition duration-200 ease-in-out",
                    busAnimationsEnabled ? "translate-x-5" : "translate-x-0",
                  )}
                />
              </button>
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
            <p className="text-[10px] text-center text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest">
              Segurança reforçada por Colégio Progresso Santista
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdminView({
  user,
  onResetPassword,
  userProfile,
  absenceJustifications = [],
  onSaveAbsenceJustifications,
}: {
  user: User;
  onResetPassword: (uid: string, pw: string) => Promise<void>;
  userProfile: any;
  absenceJustifications?: any[];
  onSaveAbsenceJustifications?: (newList: any[]) => Promise<void>;
}) {
  return (
    <AdminViewComponent
      user={user}
      userProfile={userProfile}
      onResetPassword={onResetPassword}
      getSchoolInfo={getSchoolInfo}
      saveSchoolInfo={saveSchoolInfo}
      DEFAULT_SCHOOL_INFO={DEFAULT_SCHOOL_INFO}
      supabase={supabase}
      absenceJustifications={absenceJustifications}
      onSaveAbsenceJustifications={onSaveAbsenceJustifications}
    />
  );
}

function ReportsView({ exams, results }: { exams: Exam[]; results: Result[] }) {
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedBimester, setSelectedBimester] = useState("");

  const validExamIds = new Set(results.map((r) => r.examId));
  const relevantExams = exams.filter((e) => validExamIds.has(e.id));

  // Extract unique subjects and classes from the available exams that actually have results
  const subjects = Array.from(
    new Set(relevantExams.map((e) => e.subject).filter(Boolean)),
  );
  const classes = Array.from(
    new Set(
      results
        .map((r) => r.studentClass)
        .filter(Boolean)
        .map((c) => c!.trim()),
    ),
  );
  const bimesters = Array.from(
    new Set(relevantExams.map((e) => e.bimester).filter(Boolean)),
  );

  // Determine which exams are relevant based on filters
  const filteredExams = relevantExams.filter((e) => {
    if (selectedSubject && e.subject !== selectedSubject) return false;
    if (selectedClass && !(e.classYear || "").includes(selectedClass))
      return false;
    if (selectedBimester && e.bimester !== selectedBimester) return false;
    return true;
  });

  const filteredExamIds = filteredExams.map((e) => e.id);

  const filteredResults = results.filter((r) => {
    // If we have exams filtered by subject or bimester, result must belong to one of them
    if ((selectedSubject || selectedBimester) && !filteredExamIds.includes(r.examId)) return false;
    // If we have a class filter, the result's studentClass must match
    if (selectedClass && r.studentClass !== selectedClass) return false;
    const isScoreValid = r.score !== null && r.score !== undefined && !isNaN(Number(r.score));
    return isScoreValid;
  });

  const averageScore = filteredResults.length
    ? (
        (filteredResults.reduce((acc, r) => acc + Number(r.score) / r.maxScore, 0) /
          filteredResults.length) *
        10
      ).toFixed(1)
    : 0;

  const scoreDistribution = [
    {
      name: "0-5",
      value: filteredResults.filter((r) => r.score / r.maxScore < 0.5).length,
    },
    {
      name: "5-7",
      value: filteredResults.filter(
        (r) => r.score / r.maxScore >= 0.5 && r.score / r.maxScore < 0.7,
      ).length,
    },
    {
      name: "7-9",
      value: filteredResults.filter(
        (r) => r.score / r.maxScore >= 0.7 && r.score / r.maxScore < 0.9,
      ).length,
    },
    {
      name: "9-10",
      value: filteredResults.filter((r) => r.score / r.maxScore >= 0.9).length,
    },
  ];

  const COLORS = ["#EF4444", "#F59E0B", "#3182ce", "#38a169"];

  // Calculate most missed questions
  const missedQuestionsMap: Record<
    string,
    { count: number; total: number; examTitle: string; questionText: string }
  > = {};
  filteredResults.forEach((r) => {
    if (!r.answers) return;
    const exam = exams.find((e) => e.id === r.examId);
    if (!exam || !Array.isArray(exam.questions)) return;

    exam.questions.forEach((q, index) => {
      const qNum = (index + 1).toString();
      const studentAnswer =
        r.answers[q.id] || r.answers[index.toString()] || r.answers[qNum];
      const isCorrect =
        studentAnswer &&
        studentAnswer.toUpperCase() === q.correctAnswer?.toUpperCase();

      const key = `${exam.id}-${q.id}`;
      if (!missedQuestionsMap[key]) {
        missedQuestionsMap[key] = {
          count: 0,
          total: 0,
          examTitle: exam.title,
          questionText: q.text || `Questão ${qNum}`,
        };
      }
      missedQuestionsMap[key].total++;
      if (!isCorrect) {
        missedQuestionsMap[key].count++;
      }
    });
  });

  const mostMissedQuestions = Object.values(missedQuestionsMap)
    .sort((a, b) => b.count - a.count)
    .filter((q) => q.count > 0)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-primary">
            Relatórios de Desempenho
          </h2>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Dados educacionais completos por sala e disciplina
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedBimester}
            onChange={(e) => setSelectedBimester(e.target.value)}
            className="border px-4 py-2 rounded-md font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
          >
            <option value="">Todos os Bimestres</option>
            {bimesters.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="border px-4 py-2 rounded-md font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
          >
            <option value="">Todas as Disciplinas</option>
            {subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="border px-4 py-2 rounded-md font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
          >
            <option value="">Todas as Turmas</option>
            {renderClassOptions(classes)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <StatCard
          label="Média da Turma"
          value={averageScore}
          icon={<BarChart3 />}
          color=""
        />
        <StatCard
          label="Total de Alunos avaliados"
          value={
            Array.from(new Set(filteredResults.map((r) => r.studentName)))
              .length
          }
          icon={<UserIcon />}
          color=""
          description="Alunos na base de resultados"
        />
        <StatCard
          label="Taxa de Aprovação"
          value={
            filteredResults.length
              ? (
                  (filteredResults.filter((r) => r.score / r.maxScore >= 0.6)
                    .length /
                    filteredResults.length) *
                  100
                ).toFixed(0) + "%"
              : "0%"
          }
          icon={<CheckCircle2 />}
          color=""
        />
        <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-5 rounded-lg border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Maior Nota
            </p>
            <h4 className="text-2xl font-black text-slate-700 dark:text-slate-200">
              {filteredResults.length
                ? Math.max(
                    ...filteredResults.map((r) =>
                      r.maxScore > 0 ? (r.score / r.maxScore) * 10 : 0,
                    ),
                  ).toFixed(1)
                : "0.0"}
            </h4>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 flex items-center justify-center text-slate-600 dark:text-slate-400">
            <BarChart3 className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6 rounded-lg border border-border shadow-sm">
          <h3 className="text-base font-bold text-primary mb-6">
            Distribuição de Notas
          </h3>
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
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-slate-600 dark:text-slate-400">
                Sem dados para exibir
              </div>
            )}
          </div>
          <div className="flex justify-center gap-4 mt-4">
            {scoreDistribution.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: COLORS[i] }}
                />
                <span className="text-[10px] text-slate-700 dark:text-slate-300 font-bold uppercase">
                  {d.name} ({d.value})
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6 rounded-lg border border-border shadow-sm flex flex-col h-[400px]">
          <h3 className="text-base font-bold text-primary mb-6 shrink-0">
            Onde a Sala Errou Mais
          </h3>
          <div className="space-y-4 overflow-y-auto pr-2 pb-4">
            {mostMissedQuestions.map((q, idx) => (
              <div
                key={idx}
                className="p-4 bg-red-50 border border-red-100 rounded-lg"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-2">
                  <div
                    className="text-sm font-bold text-slate-700 dark:text-slate-200 line-clamp-2"
                    dangerouslySetInnerHTML={{ __html: q.questionText }}
                  ></div>
                  <div className="shrink-0 px-2 py-1 bg-red-100 text-red-700 font-black text-xs rounded-full">
                    {q.count} ERROS
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 font-bold">
                  <span>Prova: {q.examTitle}</span>
                  <span>
                    {((q.count / q.total) * 100).toFixed(0)}% de falha
                  </span>
                </div>
              </div>
            ))}
            {mostMissedQuestions.length === 0 && (
              <p className="text-center text-slate-600 dark:text-slate-400 py-10 text-sm">
                Dados insuficientes sobre erros.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6 rounded-lg border border-border shadow-sm">
        <h3 className="text-base font-bold text-primary mb-6">
          Lista de Alunos e Desempenhos
        </h3>
        <div className="space-y-3">
          {filteredResults.map((result) => (
            <div
              key={result.id}
              className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-md border border-slate-200 dark:border-slate-800"
            >
              <div>
                <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                  {result.studentName}{" "}
                  <span className="text-slate-600 dark:text-slate-400 font-normal ml-2">
                    {result.studentClass}
                  </span>
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-[10px] text-slate-700 dark:text-slate-300 font-bold uppercase flex items-center gap-2">
                    {(() => {
                      const ex = exams.find((e) => e.id === result.examId);
                      return (
                        <>
                          <span className="px-1.5 py-0.5 text-[8px] bg-indigo-50 dark:bg-indigo-950 text-[#800020] dark:text-indigo-300 border border-indigo-200/40 rounded-md shrink-0">
                            {ex?.bimester || "1º Bimestre"}
                          </span>
                          <span>
                            {ex?.title || "Prova Desconhecida"} ⬢ {new Date(result.correctedAt).toLocaleDateString()}
                          </span>
                        </>
                      );
                    })()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {result.feedback && (
                  <span className="text-xs text-slate-700 dark:text-slate-300 hidden md:block max-w-[200px] truncate">
                    {result.feedback}
                  </span>
                )}
                <div
                  className={cn(
                    "px-3 py-1 rounded-full font-bold text-xs min-w-[70px] text-center",
                    result.score / result.maxScore >= 0.6
                      ? "bg-[#c6f6d5] text-[#22543d]"
                      : "bg-red-100 text-red-700",
                  )}
                >
                  {result.maxScore > 0
                    ? ((result.score / result.maxScore) * 10).toFixed(1)
                    : "S/N"}
                </div>
              </div>
            </div>
          ))}
          {filteredResults.length === 0 && (
            <p className="text-center text-slate-600 dark:text-slate-400 py-10 text-sm">
              Nenhum resultado encontrado. Os lançamentos aparecerão aqui após o
              preenchimento das notas.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ScheduleView({
  exams,
  isAdmin,
  user,
  onExamSaved,
  userProfile,
}: {
  exams: Exam[];
  isAdmin: boolean;
  user: User;
  onExamSaved: () => void;
  userProfile: any;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Exam>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterClass, setFilterClass] = useState<string>("");

  const schoolInfo = getSchoolInfo();

  // Expand exams that have multiple classes (excluding diary-only exams)
  const expandedExams: (Exam & { displayClass: string })[] = [];
  const nonDiaryExams = exams.filter(
    (e) => !e.isDiaryOnly && !e.answerKey?._metadata?.isDiaryOnly,
  );
  for (const exam of nonDiaryExams) {
    const classes = (exam.classYear || "")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    if (classes.length === 0) {
      expandedExams.push({ ...exam, displayClass: "" });
    } else {
      classes.forEach((cls) => {
        expandedExams.push({
          ...exam,
          displayClass: cls,
          id: exam.id + "-" + cls,
        }); // Unique ID per class
      });
    }
  }

  const filteredExams = expandedExams.filter(
    (e) => filterClass === "" || e.displayClass === filterClass,
  );

  const sortedExams = [...filteredExams].sort((a, b) => {
    if (!a.examDate) return 1;
    if (!b.examDate) return -1;
    return new Date(a.examDate).getTime() - new Date(b.examDate).getTime();
  });

  const groupedExams = sortedExams.reduce(
    (acc, exam) => {
      const key = exam.examDate ? exam.examDate : "A definir";
      if (!acc[key]) acc[key] = [];
      acc[key].push(exam);
      return acc;
    },
    {} as Record<string, (Exam & { displayClass: string })[]>,
  );

  const handleEditClick = (exam: Exam & { displayClass: string }) => {
    setEditingId(exam.id.split("-")[0]); // Recover original ID
    const originalExam = exams.find((e) => e.id === exam.id.split("-")[0]);
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
      if (editingId && editingId !== "new") {
        const { error, data } = await supabase
          .from("exams")
          .update({
            subject: formData.subject,
            class_year: formData.classYear,
            exam_date: formData.examDate ? formData.examDate : null,
            exam_type: formData.examType,
            bimester: formData.bimester,
            content: formData.content,
          })
          .eq("id", editingId)
          .select();
        if (error) {
          alert(`Erro RLS Update: ${error.message}`);
          throw error;
        }
      } else {
        const { error, data } = await supabase
          .from("exams")
          .insert({
            title: `Agendamento: ${formData.subject}`,
            subject: formData.subject,
            exam_type: formData.examType || "PII",
            exam_date: formData.examDate ? formData.examDate : null,
            class_year: formData.classYear,
            bimester: formData.bimester || "1º Bimestre",
            content: formData.content,
            questions: [],
            answer_key: {
              _metadata: { isExternal: true, examType: formData.examType },
            },
            study_guide: "",
            professor_id: user.id,
          })
          .select();
        if (error) {
          alert(
            `Erro RLS Insert: ${error.message} 
Detalhes: ${error.details}`,
          );
          throw error;
        }
      }
      setEditingId(null);
      setIsAdding(false);
      onExamSaved();
      alert("Sucesso! Agendamento/Prova salvo corretamente no servidor.");
    } catch (err: any) {
      alert(
        "Erro ao salvar no banco de dados: " +
          (err.message || JSON.stringify(err)),
      );
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja apagar esse agendamento?")) {
      await supabase.from("exams").delete().eq("id", id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <h2 className="text-xl font-bold text-primary">Cronograma de Provas</h2>
        <div className="flex gap-3">
          {true && (
            <button
              onClick={() => {
                setIsAdding(true);
                setFormData({});
                setEditingId("new");
              }}
              className="bg-primary text-white px-4 py-2 rounded-md font-bold text-sm flex items-center gap-2 hover:bg-primary/90 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Adicionar Agendamento
            </button>
          )}
          <button
            onClick={() => {
              const originalTitle = document.title;
              document.title = "Cronograma-Provas";
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

      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-4 rounded-lg border border-border shadow-sm flex items-center gap-3 print:hidden">
        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase">
          Filtrar por Turma:
        </label>
        <select
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
          className="border rounded-md px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
        >
          <option value="">Todas as Turmas (Completo)</option>
          {renderClassOptions(schoolInfo.classes)}
        </select>
      </div>

      <div
        id="schedule-container"
        className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg border border-border overflow-hidden p-8 mb-8"
      >
        <div className="text-center mb-8 border-b border-border pb-6">
          <div className="w-fit h-14 rounded-lg flex items-center justify-center mx-auto mb-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-4 border border-slate-200 dark:border-slate-800 gap-4">
            <img
              src={LOGO_VINHO}
              alt="Logo CPS"
              className="w-10 h-10 object-contain"
            />
            <div className="w-px h-8 bg-slate-200"></div>
            <img
              src={LOGO_COC}
              alt="Plataforma COC"
              className="h-6 object-contain"
            />
          </div>
          <h1 className="text-xl font-bold text-primary uppercase">
            Colégio Progresso Santista
          </h1>
          <p className="text-sm text-slate-700 dark:text-slate-300 font-bold uppercase tracking-widest mt-1">
            Cronograma de Avaliações Semestrais
          </p>
        </div>

        {isAdding && (
          <div className="mb-8 p-4 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-lg print:hidden">
            <h3 className="font-bold text-primary mb-4">Novo Agendamento</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Data
                </label>
                <input
                  type="date"
                  value={formData.examDate || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, examDate: e.target.value })
                  }
                  className="w-full border border-border rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Turmas
                </label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {schoolInfo.classes
                    .filter((c: string) => {
                      if (isAdmin || userProfile?.role?.includes("admin") || userProfile?.role?.includes("vice_diretor")) return true;
                      return (userProfile?.assigned_classes || []).includes(c);
                    })
                    .map((c) => {
                      const isSelected = (formData.classYear || "")
                        .split(", ")
                        .includes(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            const arr = (formData.classYear || "")
                              .split(", ")
                              .filter(Boolean);
                            if (arr.includes(c))
                              setFormData({
                                ...formData,
                                classYear: arr.filter((x) => x !== c).join(", "),
                              });
                            else
                              setFormData({
                                ...formData,
                                classYear: [...arr, c].join(", "),
                              });
                          }}
                          className={`px-2 py-1 rounded text-[11px] font-bold border transition-colors ${isSelected ? "bg-primary text-white border-primary" : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-border hover:border-slate-400"}`}
                        >
                          {c}
                        </button>
                      );
                    })}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Disciplina
                </label>
                <select
                  value={formData.subject || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, subject: e.target.value })
                  }
                  className="w-full border rounded-md px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
                >
                  <option value="">Selecione...</option>
                  {(schoolInfo.subjects || [])
                    .filter((c: string) => {
                      if (isAdmin || userProfile?.role?.includes("admin") || userProfile?.role?.includes("vice_diretor")) return true;
                      return (userProfile?.assigned_subjects || []).includes(c);
                    })
                    .map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Tipo
                </label>
                <div className="flex gap-2">
                  <input
                    list="exam-types"
                    type="text"
                    placeholder="Ex: AP1, PII..."
                    value={formData.examType || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, examType: e.target.value })
                    }
                    className="w-full border border-border rounded-md px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Bimestre
                </label>
                <select
                  value={formData.bimester || "1º Bimestre"}
                  onChange={(e) =>
                    setFormData({ ...formData, bimester: e.target.value })
                  }
                  className="w-full border rounded-md px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
                >
                  <option value="1º Bimestre">1º Bimestre</option>
                  <option value="2º Bimestre">2º Bimestre</option>
                  <option value="3º Bimestre">3º Bimestre</option>
                  <option value="4º Bimestre">4º Bimestre</option>
                </select>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Conteúdo para Estudo
              </label>
              <DefaultEditor
                value={formData.content || ""}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                className="w-full border border-border rounded-md min-h-[80px]"
              />
            </div>
            <div className="flex gap-2">
              <button
                disabled={saving}
                onClick={handleSave}
                className="bg-green-600 text-white px-4 py-2 rounded-md font-bold text-sm"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setEditingId(null);
                }}
                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-md font-bold text-sm text-slate-700 dark:text-slate-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {Object.entries(groupedExams).length === 0 && !isAdding && (
            <div className="text-center text-slate-600 dark:text-slate-400 italic py-10">
              Nenhuma data agendada.
            </div>
          )}
          {Object.entries(groupedExams).map(([date, dateExams]) => (
            <div
              key={date}
              className="break-inside-avoid shadow-sm rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              <div className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-primary text-lg">
                  {date === "A definir"
                    ? "Sem data definida"
                    : new Date(date + "T00:00:00").toLocaleDateString("pt-BR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                </h3>
              </div>
              <div className="divide-y divide-slate-100">
                {dateExams.map((exam) => (
                  <div
                    key={exam.id}
                    className="p-4 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 transition-colors"
                  >
                    {editingId === exam.id.split("-")[0] ? (
                      <div className="bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-lg p-4 mb-2 print:hidden">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                              Data
                            </label>
                            <input
                              type="date"
                              value={formData.examDate || ""}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  examDate: e.target.value,
                                })
                              }
                              className="w-full border border-border rounded-md px-3 py-2 text-sm"
                            />
                          </div>
                          <div className="col-span-1 md:col-span-2">
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                              Turmas
                            </label>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {schoolInfo.classes
                                .filter((c: string) => {
                                  if (isAdmin || userProfile?.role?.includes("admin") || userProfile?.role?.includes("vice_diretor")) return true;
                                  return (userProfile?.assigned_classes || []).includes(c);
                                })
                                .map((c) => {
                                  const isSelected = (formData.classYear || "")
                                    .split(", ")
                                    .includes(c);
                                  return (
                                    <button
                                      key={c}
                                      type="button"
                                      onClick={() => {
                                        const arr = (formData.classYear || "")
                                          .split(", ")
                                          .filter(Boolean);
                                        if (arr.includes(c))
                                          setFormData({
                                            ...formData,
                                            classYear: arr
                                              .filter((x) => x !== c)
                                              .join(", "),
                                          });
                                        else
                                          setFormData({
                                            ...formData,
                                            classYear: [...arr, c].join(", "),
                                          });
                                      }}
                                      className={`px-2 py-1 rounded text-[11px] font-bold border transition-colors ${isSelected ? "bg-primary text-white border-primary" : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-border hover:border-slate-400"}`}
                                    >
                                      {c}
                                    </button>
                                  );
                                })}
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                              Disciplina
                            </label>
                            <select
                              value={formData.subject || ""}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  subject: e.target.value,
                                })
                              }
                              className="w-full border rounded-md px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
                            >
                              {(schoolInfo.subjects || [])
                                .filter((c: string) => {
                                  if (isAdmin || userProfile?.role?.includes("admin") || userProfile?.role?.includes("vice_diretor")) return true;
                                  return (userProfile?.assigned_subjects || []).includes(c);
                                })
                                .map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                              Tipo
                            </label>
                            <div className="flex gap-2">
                              <input
                                list="exam-types"
                                type="text"
                                placeholder="Ex: Recuperação..."
                                value={formData.examType || ""}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    examType: e.target.value,
                                  })
                                }
                                className="w-full border border-border rounded-md px-3 py-2 text-sm"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                              Bimestre
                            </label>
                            <select
                              value={formData.bimester || "1º Bimestre"}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  bimester: e.target.value,
                                })
                              }
                              className="w-full border rounded-md px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
                            >
                              <option value="1º Bimestre">1º Bimestre</option>
                              <option value="2º Bimestre">2º Bimestre</option>
                              <option value="3º Bimestre">3º Bimestre</option>
                              <option value="4º Bimestre">4º Bimestre</option>
                            </select>
                          </div>
                        </div>
                        <div className="mb-4">
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                            Conteúdo
                          </label>
                          <DefaultEditor
                            value={formData.content || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                content: e.target.value,
                              })
                            }
                            className="w-full border border-border rounded-md min-h-[80px]"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            disabled={saving}
                            onClick={handleSave}
                            className="bg-green-600 text-white px-4 py-2 rounded-md font-bold text-sm"
                          >
                            Salvar
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-md font-bold text-sm text-slate-700 dark:text-slate-300"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-primary">
                              {exam.subject}
                            </span>
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded text-[10px] font-bold uppercase">
                              {exam.examType}
                            </span>
                            <span className="text-sm font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                              {exam.displayClass || exam.classYear}
                            </span>
                          </div>
                          <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                            <strong className="text-slate-700 dark:text-slate-300">
                              Conteúdo:
                            </strong>{" "}
                            <div
                              dangerouslySetInnerHTML={{
                                __html:
                                  exam.content ||
                                  "Nenhum conteúdo específico providenciado.",
                              }}
                              className="inline-block relative top-0 [&>*:first-child]:inline"
                            />
                          </div>
                        </div>
                        {(isAdmin || exam.professorId === user.id) && (
                          <div className="flex items-center gap-1 print:hidden">
                            <button
                              onClick={() => handleEditClick(exam)}
                              className="p-1 px-2 text-slate-700 dark:text-slate-300 hover:text-primary hover:bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded transition-all flex items-center gap-1 text-[11px] font-bold"
                              title="Editar Agendamento"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Editar</span>
                            </button>
                            <button
                              onClick={() =>
                                handleDelete(exam.id.split("-")[0])
                              }
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

        <div className="mt-8 pt-6 border-t border-dashed border-border flex justify-between items-center text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-tighter">
          <span>Emitido em: {new Date().toLocaleDateString("pt-BR")}</span>
          <span>Colégio Progresso Santista</span>
        </div>
      </div>
    </div>
  );
}

function QRCodeImage({ data }: { data: string }) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    QRCode.toDataURL(data, {
      margin: 0,
      width: 200,
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then(setUrl)
      .catch(console.error);
  }, [data]);

  if (!url)
    return (
      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center text-[8px] text-slate-600 dark:text-slate-400">
        QR
      </div>
    );
  return (
    <img src={url} alt="QR Code" className="w-16 h-16 mix-blend-multiply" />
  );
}

function InteractiveImage({ src, initialSize, initialHeight, align, isPreview, caption, wrap, opacity, onResize, onOpenEditor, left, top, onPositionChange }: any) {
  const [selected, setSelected] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<{ x: number; y: number; w: number }>({ x: 0, y: 0, w: 0 });

  // Determine CSS based on wrap mode (backward compat: fall back to align)
  const effectiveWrap = wrap || (align === 'left' ? 'wrap-left' : align === 'right' ? 'wrap-right' : 'inline');
  
  const wrapperClass = (() => {
    switch (effectiveWrap) {
      case 'wrap-left': return 'float-left mr-5 mb-2';
      case 'wrap-right': return 'float-right ml-5 mb-2';
      case 'behind': return cn('absolute left-1/2 top-0 -translate-x-1/2 z-0', !isPreview && 'pointer-events-none');
      case 'front': return 'absolute left-1/2 top-0 -translate-x-1/2 z-[10]';
      default: return 'relative mx-auto my-3 flex flex-col items-center';
    }
  })();

  const imageOpacity = effectiveWrap === 'behind' ? (opacity ?? 0.15) : 1;

  // Click-outside to deselect
  useEffect(() => {
    if (!selected || !isPreview) return;
    const handler = (e: MouseEvent) => {
      if (imgRef.current && !imgRef.current.contains(e.target as Node)) {
        setSelected(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [selected, isPreview]);

  // Resize handler
  const handleResizeStart = (e: React.MouseEvent, _corner: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!imgRef.current || !onResize) return;
    const parentWidth = imgRef.current.parentElement?.getBoundingClientRect().width || 700;
    const currentPxWidth = imgRef.current.getBoundingClientRect().width;
    startRef.current = { x: e.clientX, y: e.clientY, w: currentPxWidth };
    setResizing(true);

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startRef.current.x;
      const newPxWidth = Math.max(40, startRef.current.w + dx);
      const newPercent = Math.round(Math.min(100, Math.max(5, (newPxWidth / parentWidth) * 100)));
      onResize(newPercent);
    };

    const onUp = () => {
      setResizing(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // Drag handler
  const handleDragStart = (e: React.MouseEvent) => {
    if (!isPreview) return;
    if ((e.target as HTMLElement).closest('.resize-handle') || (e.target as HTMLElement).closest('button')) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setSelected(true);
    setDragging(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const initialLeft = left ?? 0;
    const initialTop = top ?? 0;

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      onPositionChange?.(initialLeft + dx, initialTop + dy);
    };

    const onUp = () => {
      setDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const showHandles = isPreview && selected && onResize;
  const hasPosition = left !== undefined && top !== undefined;

  return (
     <div 
       ref={imgRef}
       className={cn(
         "group relative max-w-full print:border-transparent transition-all duration-75 flex flex-col items-center",
         !hasPosition && wrapperClass,
         isPreview && "cursor-move",
         showHandles && "ring-2 ring-emerald-500 ring-offset-1",
         (resizing || dragging) && "select-none"
       )} 
       style={hasPosition ? {
         position: 'absolute',
         left: `${left}px`,
         top: `${top}px`,
         zIndex: wrap === 'behind' ? 0 : 10,
         width: `${initialSize}%`,
       } : {
         width: `${initialSize}%`
       }}
       onClick={(e) => {
         if (isPreview) {
           e.stopPropagation();
           setSelected(true);
         }
       }}
       onDoubleClick={(e) => {
         if (isPreview && onOpenEditor) {
           e.stopPropagation();
           onOpenEditor();
         }
       }}
       onMouseDown={handleDragStart}
     >
       <img 
          src={src} 
          className="h-auto object-contain block pointer-events-none mx-auto w-full select-none rounded-[1px] print:rounded-none" 
          crossOrigin="anonymous" 
          referrerPolicy="no-referrer" 
          style={{ 
            maxHeight: initialHeight ? `${initialHeight}mm` : '150mm',
            opacity: imageOpacity,
          }} 
       />
       
       {caption ? (
           <p className="mt-1 text-[10px] sm:text-[11px] print:text-[11px] text-center font-medium text-slate-700 dark:text-slate-300 w-full leading-tight select-none px-4">{caption}</p>
       ) : null}

       {/* Resize Handles */}
       {showHandles && (
         <>
           {/* Corner handles */}
           {(['nw', 'ne', 'sw', 'se'] as const).map((corner) => (
             <div
               key={corner}
               onMouseDown={(e) => handleResizeStart(e, corner)}
               className={cn(
                 "absolute w-3 h-3 bg-emerald-500 border-2 border-white rounded-sm shadow-md z-20 cursor-nwse-resize hover:bg-emerald-600 transition-colors",
                 corner.includes('n') ? 'top-[-5px]' : 'bottom-[-5px]',
                 corner.includes('w') ? 'left-[-5px]' : 'right-[-5px]',
                 corner === 'ne' || corner === 'sw' ? 'cursor-nesw-resize' : ''
               )}
             />
           ))}
           {/* Side handles */}
           {(['n', 's', 'e', 'w'] as const).map((side) => (
             <div
               key={side}
               onMouseDown={(e) => handleResizeStart(e, side)}
               className={cn(
                 "absolute bg-emerald-500 border-2 border-white rounded-sm shadow-md z-20 transition-colors hover:bg-emerald-600",
                 (side === 'n' || side === 's') ? 'w-6 h-2.5 left-1/2 -translate-x-1/2 cursor-ns-resize' : 'w-2.5 h-6 top-1/2 -translate-y-1/2 cursor-ew-resize',
                 side === 'n' ? 'top-[-4px]' : '',
                 side === 's' ? 'bottom-[-4px]' : '',
                 side === 'e' ? 'right-[-4px]' : '',
                 side === 'w' ? 'left-[-4px]' : '',
               )}
             />
           ))}
           {/* Size tooltip */}
           <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-lg whitespace-nowrap z-30">
             {initialSize}%
           </div>
           {/* Quick action bar */}
           {onOpenEditor && (
             <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-1 z-30">
               <button 
                 onClick={(e) => { e.stopPropagation(); onOpenEditor(); }}
                 className="p-1.5 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950 text-emerald-600 transition-colors"
                 title="Abrir Editor Completo"
               >
                 <Maximize2 className="w-3.5 h-3.5" />
               </button>
             </div>
           )}
         </>
       )}
     </div>
  );
}

function ImageEditorModal({ src, initialWidth, initialHeight, initialCaption, initialAlign, initialWrap, initialOpacity, onSave, onClose }: any) {
  const [w, setW] = useState(initialWidth);
  const [h, setH] = useState(initialHeight);
  const [c, setC] = useState(initialCaption);
  const [align, setAlign] = useState(initialAlign || 'center');
  const [wrap, setWrap] = useState<string>(initialWrap || (initialAlign === 'left' ? 'wrap-left' : initialAlign === 'right' ? 'wrap-right' : 'inline'));
  const [opacity, setOpacity] = useState(initialOpacity ?? 0.15);

  // Sync align from wrap mode
  useEffect(() => {
    if (wrap === 'wrap-left') setAlign('left');
    else if (wrap === 'wrap-right') setAlign('right');
    else setAlign('center');
  }, [wrap]);

  const wrapModes = [
    { id: 'inline', label: 'Em Linha', desc: 'Imagem centralizada entre os blocos de texto', icon: <RectangleHorizontal className="w-5 h-5" /> },
    { id: 'wrap-left', label: 'Esquerda', desc: 'Imagem à esquerda, texto contorna pela direita', icon: <AlignLeft className="w-5 h-5" /> },
    { id: 'wrap-right', label: 'Direita', desc: 'Imagem à direita, texto contorna pela esquerda', icon: <AlignRight className="w-5 h-5" /> },
    { id: 'behind', label: 'Atrás do Texto', desc: 'Imagem como fundo atrás do texto', icon: <Layers className="w-5 h-5" /> },
    { id: 'front', label: 'Na Frente', desc: 'Imagem sobreposta ao texto', icon: <ImageIcon className="w-5 h-5" /> },
  ];

  // Preview wrapping class
  const previewWrapClass = (() => {
    switch (wrap) {
      case 'wrap-left': return 'float-left mr-5 mb-2';
      case 'wrap-right': return 'float-right ml-5 mb-2';
      case 'behind': return 'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-0';
      case 'front': return 'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[10]';
      default: return 'relative mx-auto my-3 flex flex-col items-center flex-shrink-0';
    }
  })();

  const previewOpacity = wrap === 'behind' ? opacity : 1;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[99999] p-4 md:p-6 flex items-center justify-center select-none print:hidden">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col w-full max-w-6xl h-full md:h-[90vh] max-h-[850px] border border-slate-200 dark:border-slate-800">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-2">
                   <ImageIcon className="w-5 h-5 text-emerald-600" />
                   <h2 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight text-sm">Editor de Imagem Avançado</h2>
                </div>
                <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-400 transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Content pane: preview + controls */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-50 dark:bg-slate-950">
                {/* Visual Preview Area */}
                <div className="flex-1 overflow-auto p-4 md:p-8 flex items-start justify-center relative">
                    <div className="w-[210mm] max-w-full bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 p-8 pt-10 flex flex-col relative transition-all duration-300 rounded-lg">
                        <div className="absolute top-2 left-0 right-0 text-center text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">
                            Preview em Largura de Folha A4
                        </div>

                        {/* Simulated question text */}
                        <div className="relative w-full" style={{ minHeight: '200px' }}>
                          {(wrap === 'behind' || wrap === 'front') && (
                            <div className={cn("max-w-full print:border-transparent transition-all duration-200 flex flex-col items-center", previewWrapClass)} style={{ width: `${w}%`, opacity: previewOpacity }}>
                              <img src={src} className="h-auto object-contain block mx-auto w-full select-none rounded-[1px] border border-emerald-500/20 shadow-inner" crossOrigin="anonymous" referrerPolicy="no-referrer" style={{ maxHeight: `${h}mm` }} />
                            </div>
                          )}

                          {(wrap === 'wrap-left' || wrap === 'wrap-right') && (
                            <div className={cn("max-w-full print:border-transparent transition-all duration-200 flex flex-col items-center", previewWrapClass)} style={{ width: `${w}%` }}>
                              <img src={src} className="h-auto object-contain block mx-auto w-full select-none rounded-[1px] border border-emerald-500/20 shadow-inner" crossOrigin="anonymous" referrerPolicy="no-referrer" style={{ maxHeight: `${h}mm` }} />
                              {c && <p className="mt-1 text-[11px] text-center font-medium text-slate-700 dark:text-slate-300 w-full leading-tight select-none px-4">{c}</p>}
                            </div>
                          )}

                          {/* Simulated text blocks */}
                          <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-dashed border-emerald-500/30 rounded-lg p-3.5 mb-4 text-center select-none relative z-[1]">
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                              Exemplo de Visualização (Texto Demonstrativo)
                            </span>
                            <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                              Este é um exemplo de como o texto do enunciado se comportará ao redor da imagem na prova real.
                            </p>
                          </div>
                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-2 relative z-[1]" style={{ textAlign: 'justify' }}>
                            <span className="font-bold mr-1">1.</span>
                            Esta é uma questão de exemplo em português para visualização de layout. O texto do enunciado se ajustará automaticamente de acordo com o modo de posicionamento escolhido na barra lateral, permitindo alinhar a imagem à esquerda, à direita, deixá-la em linha ou posicioná-la atrás ou na frente do texto.
                          </p>
                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-2 relative z-[1]" style={{ textAlign: 'justify' }}>
                            O objetivo deste editor é permitir uma diagramação fluida e precisa, semelhante a softwares de edição como o Microsoft Word, garantindo que o layout da prova não seja quebrado e que as imagens se acomodem da melhor forma no espaço impresso.
                          </p>
                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-2 relative z-[1]" style={{ textAlign: 'justify' }}>
                            Você pode alterar a largura da imagem (em porcentagem do espaço útil da folha A4) e a altura máxima para ajustar a proporção ideal para os seus alunos.
                          </p>
                          <div className="clear-both"></div>
                        </div>

                        {/* Inline mode - image after text */}
                        {wrap === 'inline' && (
                          <div className="flex justify-center w-full my-4">
                            <div className="flex flex-col items-center" style={{ width: `${w}%` }}>
                              <img src={src} className="h-auto object-contain block mx-auto w-full select-none rounded-[1px] border border-emerald-500/20 shadow-inner" crossOrigin="anonymous" referrerPolicy="no-referrer" style={{ maxHeight: `${h}mm` }} />
                              {c && <p className="mt-1 text-[11px] text-center font-medium text-slate-700 dark:text-slate-300 w-full leading-tight select-none px-4">{c}</p>}
                            </div>
                          </div>
                        )}

                        {/* More simulated text */}
                        <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full mb-2 mt-4"></div>
                        <div className="w-4/5 h-2 bg-slate-200 dark:bg-slate-800 rounded-full mb-2"></div>
                        <div className="w-3/5 h-2 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
                    </div>
                </div>

                {/* Controls Sidebar */}
                <div className="w-full md:w-96 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto p-6 shrink-0 flex flex-col gap-5">
                     {/* SECTION: Wrapping Mode */}
                     <div className="space-y-3">
                        <label className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2">
                          <WrapText className="w-4 h-4 text-emerald-600" />
                          Modo de Posicionamento
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {wrapModes.map((m) => (
                            <button
                              key={m.id}
                              onClick={() => setWrap(m.id)}
                              className={cn(
                                "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center",
                                wrap === m.id
                                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 shadow-sm"
                                  : "border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
                              )}
                              title={m.desc}
                            >
                              {m.icon}
                              <span className="text-[10px] font-bold leading-tight">{m.label}</span>
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 italic leading-tight">
                          {wrapModes.find(m => m.id === wrap)?.desc}
                        </p>
                        {(wrap === 'behind' || wrap === 'front') && (
                          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-lg p-3">
                            <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              Este modo usa posição absoluta. Verifique o resultado na impressão.
                            </p>
                          </div>
                        )}
                     </div>

                     {/* SECTION: Dimensions */}
                     <div className="space-y-4 border-t border-slate-200 dark:border-slate-700 pt-5">
                        <label className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2">
                          <Maximize2 className="w-4 h-4 text-blue-600" />
                          Dimensões
                        </label>

                        {/* Width */}
                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Largura</label>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min="5"
                                    max="100"
                                    value={w}
                                    onChange={(e) => setW(Math.min(100, Math.max(5, Number(e.target.value) || 5)))}
                                    className="w-14 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800 text-center outline-none focus:ring-1 focus:ring-emerald-500"
                                  />
                                  <span className="text-xs font-bold text-slate-400">%</span>
                                </div>
                            </div>
                            <input
                                type="range"
                                min="5"
                                max="100"
                                step="1"
                                value={w}
                                onChange={(e) => setW(Number(e.target.value))}
                                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                        </div>
                        
                        {/* Height */}
                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Altura Máx</label>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min="10"
                                    max="250"
                                    step="5"
                                    value={h}
                                    onChange={(e) => setH(Math.min(250, Math.max(10, Number(e.target.value) || 10)))}
                                    className="w-14 text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded border border-blue-200 dark:border-blue-800 text-center outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                  <span className="text-xs font-bold text-slate-400">mm</span>
                                </div>
                            </div>
                            <input
                                type="range"
                                min="10"
                                max="250"
                                step="5"
                                value={h}
                                onChange={(e) => setH(Number(e.target.value))}
                                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                        </div>
                     </div>

                     {/* SECTION: Opacity (only for "behind" mode) */}
                     {wrap === 'behind' && (
                       <div className="space-y-3 border-t border-slate-200 dark:border-slate-700 pt-5">
                         <label className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2">
                           <Eye className="w-4 h-4 text-purple-600" />
                           Opacidade
                         </label>
                         <div>
                           <div className="flex justify-between items-center mb-1.5">
                             <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Transparência</label>
                             <div className="flex items-center gap-1">
                               <input
                                 type="number"
                                 min="0.05"
                                 max="1"
                                 step="0.05"
                                 value={opacity}
                                 onChange={(e) => setOpacity(Math.min(1, Math.max(0.05, Number(e.target.value) || 0.15)))}
                                 className="w-14 text-xs font-bold text-purple-600 bg-purple-50 dark:bg-purple-500/10 px-2 py-1 rounded border border-purple-200 dark:border-purple-800 text-center outline-none focus:ring-1 focus:ring-purple-500"
                               />
                             </div>
                           </div>
                           <input
                             type="range"
                             min="0.05"
                             max="1"
                             step="0.05"
                             value={opacity}
                             onChange={(e) => setOpacity(Number(e.target.value))}
                             className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                           />
                           <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                             <span>Transparente</span>
                             <span>Opaco</span>
                           </div>
                         </div>
                       </div>
                     )}

                     {/* SECTION: Caption */}
                     <div className="space-y-2 border-t border-slate-200 dark:border-slate-700 pt-5">
                        <label className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2">
                          <Type className="w-4 h-4 text-orange-600" />
                          Legenda
                        </label>
                        <textarea
                           value={c}
                           onChange={(e) => setC(e.target.value)}
                           className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 resize-none h-20 text-slate-800 dark:text-slate-200"
                           placeholder="Ex: Figura 1 - Célula animal"
                        />
                     </div>

                     {/* SECTION: Save */}
                     <div className="mt-auto pt-4">
                        <button
                           onClick={() => onSave(w, h, c, align, wrap, opacity)}
                           className="w-full bg-emerald-600 text-white font-black uppercase tracking-widest text-xs rounded-xl py-4 hover:bg-emerald-700 transition duration-300 shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
                        >
                           <Save className="w-4 h-4" />
                           Aplicar Ajustes
                        </button>
                     </div>
                </div>
            </div>
        </div>
    </div>
  );
}

function ExamDocument({
  exam,
  studentName,
  classId,
  professorName,
  totalValue,
  isPreview = false,
  onImageResize,
  onImageCaptionChange,
  onImagePositionChange,
  onShapeResize,
  onShapePositionChange
}: {
  exam: Partial<Exam>;
  studentName?: string;
  classId?: string;
  professorName?: string;
  totalValue?: number;
  isPreview?: boolean;
  onImageResize?: (qId: number, size: number, height: number) => void;
  onImageCaptionChange?: (qId: number, caption: string) => void;
  onImagePositionChange?: (qId: number, left: number, top: number) => void;
  onShapeResize?: (qId: number, size: number, height: number) => void;
  onShapePositionChange?: (qId: number, left: number, top: number) => void;
}) {
  let displayProfessorName = professorName || "";
  const formatPoints = (pts: any) => {
    if (pts === undefined || pts === null || pts === "") return "";
    const num = parseFloat(String(pts));
    if (isNaN(num)) return "";
    const formatted = num % 1 === 0 ? num.toFixed(1).replace(".", ",") : num.toString().replace(".", ",");
    return `(${formatted}) `;
  };

  const abbreviateSubject = (subject: string) => {
    if (!subject) return "";
    const s = subject.toUpperCase();
    if (s.includes("CIÊNCIAS DA NATUREZA")) return subject.replace(/CIÊNCIAS DA NATUREZA/i, "Ciências da Nat.");
    if (s.includes("LÍNGUA PORTUGUESA")) return subject.replace(/LÍNGUA PORTUGUESA/i, "Língua Port.");
    if (s.includes("EDUCAÇÃO FÍSICA")) return subject.replace(/EDUCAÇÃO FÍSICA/i, "Ed. Física");
    if (s.includes("MATEMÁTICA E SUAS TECNOLOGIAS")) return "Matemática";
    if (s.includes("LINGUAGENS E SUAS TECNOLOGIAS")) return "Linguagens";
    if (s.includes("CIÊNCIAS HUMANAS E SUAS TECNOLOGIAS")) return "Ciências Humanas";
    if (subject.length > 22) {
      return subject.substring(0, 20) + "...";
    }
    return subject;
  };
  const parts = displayProfessorName
    .split(" ")
    .filter((p: string) => p.trim() !== "");
  if (parts.length > 2) {
    let firstIndex = 0;
    const lowerTitles = [
      "prof",
      "prof.",
      "profa",
      "profa.",
      "professor",
      "professora",
      "dr",
      "dr.",
      "dra",
      "dra.",
    ];
    while (
      firstIndex < parts.length &&
      lowerTitles.includes(parts[firstIndex].toLowerCase())
    ) {
      firstIndex++;
    }
    if (firstIndex >= parts.length - 1) {
      displayProfessorName = parts.join(" ");
    } else {
      const firstName = parts[firstIndex];
      const secondName = parts[firstIndex + 1];
      const titles =
        firstIndex > 0 ? parts.slice(0, firstIndex).join(" ") + " " : "";
      displayProfessorName = titles + firstName + (secondName ? " " + secondName : "");
    }
  } else {
    displayProfessorName = parts.join(" ");
  }

   // Helper to estimate height of questions in millimeters to paginate automatically
  const estimateQuestionHeight = (q: Question) => {
    let h = 0;

    // Dynamic scale calculations based on chosen fontSize (inherits parent size)
    const currentFontSize = exam.fontSize || 13;
    // Line height of leading-snug (1.375 * fontSize) in millimeters (1px = 0.26458mm)
    const lineMmHeight = currentFontSize * 1.375 * 0.26458;
    // Character wrapping density limit: horizontal content space is ~650px depending on margins.
    // Average character width is ~53% of font size for safe, conservative pagination.
    const charsPerLine = Math.floor(650 / (currentFontSize * 0.53));

    // Helper to estimate text lines taking HTML block elements, paragraphs, and list margins into account
    const estimateLinesForHeight = (html: string) => {
      if (!html) return { totalLines: 0, blockCount: 0 };
      
      // Clean Word metadata and comments first so hidden stylesheet text isn't counted in lines
      const cleanedHtml = cleanWordHtml(html);
      
      // 1. Replace closing block tags with newline placeholders to separate paragraphs properly
      let prepared = cleanedHtml.replace(/<\/p>|<\/div>|<\/li>|<\/tr>|<\/h1>|<\/h2>|<\/h3>|<\/h4>|<\/h5>|<\/h6>|<\/ol>|<\/ul>/gi, "\\n");
      
      // 2. Replace br with newlines
      prepared = prepared.replace(/<br\s*\/?>/gi, "\\n");
      
      // 3. Strip all other HTML tags
      prepared = prepared.replace(/<[^>]*>/g, "");
      
      // 4. Decode basic HTML entities to avoid counting extra characters or broken tags
      prepared = prepared
        .replace(/&nbsp;/gi, " ")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'");
      
      const preparedTrimmed = prepared.trim();
      const linesArr = preparedTrimmed.split("\\n");
      let totalLines = 0;
      let blockCount = 0;
      
      linesArr.forEach((line) => {
        const trimmed = line.trim();
        if (trimmed.length > 0) {
          totalLines += Math.max(1, Math.ceil(trimmed.length / charsPerLine));
          blockCount++;
        } else {
          totalLines += 0.8; // empty paragraph / line break
          blockCount++;
        }
      });
      
      return { totalLines: Math.max(1, totalLines), blockCount: Math.max(1, blockCount) };
    };

    if (!q.hideBaseContent) {
      // 1. Text height
      const trMatches = (q.text || "").match(/<tr\b/gi);
      const trCount = trMatches ? trMatches.length : 0;
      h += trCount * lineMmHeight * 1.5;

      const { totalLines, blockCount } = estimateLinesForHeight(q.text || "");
      // Each line of text takes lineMmHeight
      // Each paragraph block adds a tiny logical separation margin of 0.2mm
      h += totalLines * lineMmHeight;
      h += blockCount * 0.2;

      // 2. Gap between text and choices/lines (mt-1 is 4px = 1.06mm)
      h += 1.06;

      // 3. Image height contribution
      if (q.image) {
        if (q.imageHeight) {
          h += q.imageHeight + 4;
        } else {
          const sizePercent = q.imageSize || 100;
          // Container width is ~190mm. Assume a landscape 16:9 aspect ratio or similar wide ratio rather than tall portrait.
          const widthMm = 190 * (sizePercent / 100);
          let estImg = widthMm * 0.55; 
          
          // InteractiveImage caps maxHeight at 150mm by default when not specified
          estImg = Math.min(150, estImg);
          h += estImg + 4; // height + vertical safety gap
        }
        // Caption height
        if (q.imageCaption) {
          const { totalLines: capLines } = estimateLinesForHeight(q.imageCaption);
          h += capLines * lineMmHeight + 2.0;
        }
      }

      // 3.5. Geometric Drawing Shape height contribution
      if (q.drawingShape && q.drawingShape !== "none") {
        const isCircleOrSquare = q.drawingShape === "circle" || q.drawingShape === "square";
        const defaultHeight = q.drawingShape === "line" || q.drawingShape === "arrow" ? 40 : 100;
        const shapeHeightPx = isCircleOrSquare
          ? (q.drawingShapeSize || 150)
          : (q.drawingShapeHeight || defaultHeight);
        h += (shapeHeightPx * 0.264) + 8.4; // convert px to mm (1px = 0.264mm) + vertical margins (my-4 = 16px * 2 = 32px = 8.46mm)
      }
    } else {
      // It's a continuation, so we just have a small marker text "(continuação da questão anterior...)"
      h += 6.0; // roughly the height of the marker text and its margins
    }


    // 4. Options or Essay lines
    if (q.type === "essay") {
      const lines = q.lineCount ?? 5;
      h += 1.58; // mt-1.5 is 6px = 1.58mm
      h += 3.7; // first line is 14px = 3.7mm
      h += (lines - 1) * 4.76; // other lines are 18px = 4.76mm
    } else {
      const options = q.options || [];
      const nonemptyOptions = options.filter((opt) => !!opt);
      let optionsLines = 0;
      
      nonemptyOptions.forEach((opt) => {
        const { totalLines: optLines } = estimateLinesForHeight(opt);
        optionsLines += optLines;
      });
      
      // Each option line takes lineMmHeight
      h += optionsLines * lineMmHeight;
      // space-y-0.5 adds 2px (0.53mm) between options
      if (nonemptyOptions.length > 1) {
        h += (nonemptyOptions.length - 1) * 0.53;
      }
    }

    // 5. Spacing/gap between consecutive questions inside the vertical layout
    // space-y-0.5 adds 2px = 0.53mm
    h += 0.53;

    return h;
  };

  // Group questions by pages dynamically based on estimated heights and manual pageBreakAfter
  const pages: Question[][] = [];
  let currentPage: Question[] = [];
  let currentPageHeight = 0;

  (Array.isArray(exam.questions) ? exam.questions : []).forEach((originalQ) => {
    let currentQ = { ...originalQ };
    let qHeight = estimateQuestionHeight(currentQ);
    let currentLimit = pages.length === 0 ? 170 : 230;

    // Handle manual page break from previous question
    const prevQ = currentPage[currentPage.length - 1];
    if (prevQ && prevQ.pageBreakAfter && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [];
      currentPageHeight = 0;
      currentLimit = pages.length === 0 ? 170 : 230;
    }

    while (currentPage.length > 0 && currentPageHeight + qHeight > currentLimit) {
      const remainingSpace = currentLimit - currentPageHeight;
      const baseHeight = estimateQuestionHeight({ ...currentQ, options: [], lineCount: 0, type: "objective" as any });
      
      let splitSuccess = false;

      // Only attempt split if there's enough space for base content + small margin
      if (remainingSpace > baseHeight + 10) {
        if (currentQ.type === "essay" && (currentQ.lineCount || 5) > 1) {
          const totalLines = currentQ.lineCount || 5;
          const linesHeight = qHeight - baseHeight;
          const avgLineHeight = linesHeight / totalLines;
          const linesThatFit = Math.floor((remainingSpace - baseHeight) / avgLineHeight);

          if (linesThatFit > 0 && linesThatFit < totalLines) {
            const qPart1 = { ...currentQ, lineCount: linesThatFit };
            const qPart2 = { 
              ...currentQ, 
              isContinuation: true, 
              hideBaseContent: true, 
              lineCount: totalLines - linesThatFit 
            };
            currentPage.push(qPart1);
            pages.push(currentPage);
            currentPage = [];
            currentPageHeight = 0;
            currentLimit = pages.length === 0 ? 170 : 230;
            currentQ = qPart2;
            qHeight = estimateQuestionHeight(currentQ);
            splitSuccess = true;
          }
        } else if ((currentQ.type !== "essay" && currentQ.type !== "true-false") && (currentQ.options || []).length > 1) {
          const options = currentQ.options || [];
          const optionsHeight = qHeight - baseHeight;
          const avgOptionHeight = optionsHeight / options.length;
          const optionsThatFit = Math.floor((remainingSpace - baseHeight) / avgOptionHeight);

          if (optionsThatFit > 0 && optionsThatFit < options.length) {
            const qPart1 = { ...currentQ, options: options.slice(0, optionsThatFit) };
            const qPart2 = { 
              ...currentQ, 
              isContinuation: true, 
              hideBaseContent: true, 
              optionsOffset: (currentQ.optionsOffset || 0) + optionsThatFit, 
              options: options.slice(optionsThatFit) 
            };
            currentPage.push(qPart1);
            pages.push(currentPage);
            currentPage = [];
            currentPageHeight = 0;
            currentLimit = pages.length === 0 ? 170 : 230;
            currentQ = qPart2;
            qHeight = estimateQuestionHeight(currentQ);
            splitSuccess = true;
          }
        }
      }

      if (!splitSuccess) {
        // Can't split, just move to next page
        pages.push(currentPage);
        currentPage = [];
        currentPageHeight = 0;
        currentLimit = pages.length === 0 ? 170 : 230;
      }
    }

    // Add remaining part or full question to current page
    currentPage.push(currentQ);
    currentPageHeight += qHeight;
  });

  if (currentPage.length > 0 || pages.length === 0) {
    pages.push(currentPage);
  }

  // Calculate logical question indices for each page, properly handling continuations
  let currentAbsoluteIdx = 0;
  pages.forEach((pageQuestions) => {
    pageQuestions.forEach((q) => {
      if (q.isContinuation) {
        (q as any)._renderedIdx = currentAbsoluteIdx - 1;
      } else {
        (q as any)._renderedIdx = currentAbsoluteIdx++;
      }
    });
  });

  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const parentWidth =
          containerRef.current.parentElement?.getBoundingClientRect().width ||
          window.innerWidth;
        const targetWidth = 794; // approx 210mm in pixels
        const computedScale = Math.min(1, parentWidth / targetWidth);
        setScale(computedScale);
      }
    };

    handleResize();
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    if (containerRef.current?.parentElement) {
      resizeObserver.observe(containerRef.current.parentElement);
    }

    window.addEventListener("resize", handleResize);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="exam-document-outer w-full flex flex-col gap-6 print:gap-0"
      style={{
        fontSize: `${exam.fontSize || 13}px`,
        fontFamily: exam.fontFamily || "Arial",
      }}
    >
      {pages.map((pageQuestions, pageIdx) => {
        const isFirstPage = pageIdx === 0;
        const isLastPage = pageIdx === pages.length - 1;
        const isScaled = scale < 1;

        return (
          <React.Fragment key={`page-blk-${pageIdx}`}>
            <div
              className="exam-page-scale-wrapper w-full flex justify-center overflow-hidden print:overflow-visible print:h-auto"
              style={{
                height: isScaled ? `${1123 * scale}px` : "auto",
                marginBottom: isScaled ? "12px" : isLastPage ? "0" : "24px",
              }}
            >
              <div
                className={cn(
                  "exam-page bg-white text-black shadow-sm flex flex-col justify-between print-page-wrapper select-none origin-top print:transform-none print:origin-unset",
                  isLastPage ? "" : "break-after-page print:break-after-page",
                )}
                style={{
                  width: "210mm",
                  minWidth: "210mm",
                  flexShrink: 0,
                  minHeight: "297mm",
                  height: "297mm",
                  maxHeight: "297mm",
                  padding: "10mm",
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  background: "white",
                  transform: isScaled ? `scale(${scale})` : "none",
                }}
              >
                <div
                  className="border-[3px] border-dashed border-black flex flex-col justify-between p-3 w-full h-full min-w-0"
                  style={{
                    boxSizing: "border-box",
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <div className="flex-1 flex flex-col w-full min-w-0 min-h-[0px]">
                    {/* School Header only on page 1 */}
                    {isFirstPage && (
                      <div className="border-[3px] border-black border-dashed p-1 mb-2">
                        {/* Top Row: Logos and School Name */}
                        <div className="flex items-center justify-between border-b-[3px] border-black border-dashed pb-1.5 mb-0.5 px-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={LOGO_VINHO}
                              alt="Logo CPS"
                              className="w-10 h-10 object-contain"
                              referrerPolicy="no-referrer"
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
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          </div>
                          <h1 className="text-xl font-bold uppercase text-center flex-1 tracking-wide mr-8">
                            Colégio Progresso Santista
                          </h1>
                        </div>

                        {/* Student Info Fields */}
                        <div className="text-[12px] font-bold flex uppercase w-full">
                          {/* Left Column (80%) */}
                          <div className="w-[80%] flex flex-col border-r-[3px] border-black border-dashed">
                            {/* Row 1 (Nome / Classe) */}
                            <div className="flex border-b-[3px] border-black border-dashed h-9 w-full min-w-0">
                              <div
                                style={{ width: "75%" }}
                                className="border-r-[3px] border-black border-dashed px-2 py-1.5 flex items-center min-w-0"
                              >
                                <span className="shrink-0">Nome:</span>
                                {studentName ? (
                                  <span className="ml-2 font-black text-[14px] leading-tight flex-1 block truncate">
                                    {studentName}
                                  </span>
                                ) : (
                                  <span className="flex-1 border-b border-black mx-2 pt-3"></span>
                                )}
                              </div>
                              <div
                                style={{ width: "25%" }}
                                className="px-2 py-1.5 flex items-center whitespace-nowrap min-w-0 overflow-hidden text-ellipsis"
                              >
                                Classe: {classId || "____"}
                              </div>
                            </div>
                            
                            {/* Row 2 (Disciplina / Prof / Data) */}
                            <div className="flex border-b-[3px] border-black border-dashed h-9 w-full min-w-0">
                              <div
                                style={{ width: "40%" }}
                                className="border-r-[3px] border-black border-dashed px-2 py-1.5 flex items-center min-w-0"
                              >
                                <div className="w-full truncate">
                                  Disciplina:{" "}
                                  <span className="font-normal normal-case">
                                    {abbreviateSubject(exam.subject)}
                                  </span>
                                </div>
                              </div>
                              <div
                                style={{ width: "35%" }}
                                className="border-r-[3px] border-black border-dashed px-2 py-1.5 flex items-center min-w-0"
                              >
                                <span className="shrink-0">Prof:</span>
                                <span className="ml-2 font-normal normal-case flex-1 leading-tight truncate">
                                  {displayProfessorName}
                                </span>
                              </div>
                              <div
                                style={{ width: "25%" }}
                                className="px-2 py-1.5 flex items-center min-w-0"
                              >
                                <div className="truncate">
                                  Data:{" "}
                                  <span className="font-normal text-xs">
                                    {exam.examDate
                                      ? new Date(
                                          exam.examDate + "T00:00:00",
                                        ).toLocaleDateString("pt-BR")
                                      : "___/___/____"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Row 3 (Instruções) */}
                            <div className="flex h-[76px] w-full min-w-0">
                              <div className="px-2 py-2 normal-case min-w-0 w-full">
                                <span className="uppercase font-bold text-[10px]">
                                  Instruções:
                                </span>
                                <ul className="text-[10px] font-normal list-none ml-4 mt-0.5 space-y-0.5 text-black">
                                  <li>❖ Faça letra legível;</li>
                                  <li>❖ Mantenha a limpeza e a organização da {exam?.examType === "Atividade" ? "atividade" : "prova"};</li>
                                  <li>❖ Evite rasuras e não deixe questões em branco.</li>
                                </ul>
                              </div>
                            </div>
                          </div>

                          {/* Right Column (20%) */}
                          <div className="w-[20%] flex flex-col">
                            {/* Cell 1: Valor */}
                            <div className="border-b-[3px] border-black border-dashed h-9 px-2 py-1.5 flex items-center whitespace-nowrap min-w-0">
                              Valor:{" "}
                              <span className="font-black ml-1 text-sm">
                                {totalValue || "____"}
                              </span>
                            </div>

                            {/* Cell 2: Nota */}
                            <div className="border-b-[3px] border-black border-dashed h-9 px-2 pt-1 pb-1 flex flex-col justify-between items-start min-w-0">
                              <span className="text-[9px] text-black leading-none font-bold">
                                NOTA:
                              </span>
                              <span className="border-b border-black w-full mb-0.5"></span>
                            </div>

                            {/* Cell 3: Ass. do Professor */}
                            <div className="border-b-[3px] border-black border-dashed h-[50px] px-2 py-1 flex flex-col justify-between items-center text-center whitespace-nowrap min-w-0">
                              <span className="text-[8px] font-bold uppercase leading-none">
                                ASS. DO PROFESSOR
                              </span>
                              <div className="flex-1"></div>
                            </div>

                            {/* Cell 4: Exam Type */}
                            <div className="h-[26px] flex items-center justify-center text-sm font-black uppercase text-center min-w-0">
                              {exam.examType || "PROVA"}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Body container matching width horizontal space inside padding */}
                    <div className="border-[3px] border-transparent p-1 flex-1 min-h-[0px] flex flex-col justify-start relative z-0 exam-body-container">
                      {/* If there are no questions, render the exam content (e.g., cronogramas, study guides) */}
                      {(!Array.isArray(exam.questions) || exam.questions.length === 0) && exam.content && (
                        <div className="p-4 normal-case text-justify leading-relaxed q-text-html-container break-words text-sm border border-black/10 rounded-lg bg-slate-50/20">
                          <SafeHTML html={exam.content} />
                        </div>
                      )}

                      {/* Questions for this page */}
                      <div className="space-y-0.5">
                        {pageQuestions.map((q, qPageIdx) => {
                          const absoluteIdx = (q as any)._renderedIdx;
                          return (
                            <div
                              key={q.id + (q.isContinuation ? "_cont" : "")}
                              className={cn(
                                "space-y-0.5 relative",
                                q.align === "center"
                                  ? "text-center"
                                  : "text-left",
                              )}
                            >
                                {!q.hideBaseContent ? (
                                  <>
                                    <div className={cn(
                                      "w-full pl-2 sm:pl-4 pr-1 min-w-0 block",
                                      q.align === "center" ? "text-center" : "text-left",
                                      (q.imageWrap === 'behind' || q.imageWrap === 'front') ? "relative" : ""
                                    )}>
                                      {/* IMAGE RENDERING - supports all 5 wrapping modes */}
                                      {(() => {
                                        if (!q.image) return null;
                                        const effectiveWrap = q.imageWrap || (q.imageAlign === 'left' ? 'wrap-left' : q.imageAlign === 'right' ? 'wrap-right' : 'inline');
                                        
                                        // Wrap-left and wrap-right: float image before text
                                        if (effectiveWrap === 'wrap-left' || effectiveWrap === 'wrap-right') {
                                          return (
                                            <InteractiveImage
                                              src={q.image}
                                              initialSize={q.imageSize || 40}
                                              initialHeight={q.imageHeight}
                                              align={effectiveWrap === 'wrap-left' ? 'left' : 'right'}
                                              wrap={effectiveWrap}
                                              caption={q.imageCaption}
                                              isPreview={isPreview}
                                              onResize={isPreview && onImageResize ? (newSize: number) => onImageResize(q.id, newSize, q.imageHeight || 150) : undefined}
                                              onOpenEditor={isPreview ? () => {
                                                // Signal parent to open editor for this question's image
                                                const event = new CustomEvent('open-image-editor', { detail: { questionId: q.id } });
                                                window.dispatchEvent(event);
                                              } : undefined}
                                              left={q.imageLeft}
                                              top={q.imageTop}
                                              onPositionChange={isPreview && onImagePositionChange ? (left: number, top: number) => onImagePositionChange(q.id, left, top) : undefined}
                                            />
                                          );
                                        }
                                        
                                        // Behind / Front: absolute positioned overlay
                                        if (effectiveWrap === 'behind' || effectiveWrap === 'front') {
                                          return (
                                            <InteractiveImage
                                              src={q.image}
                                              initialSize={q.imageSize || 60}
                                              initialHeight={q.imageHeight}
                                              align="center"
                                              wrap={effectiveWrap}
                                              opacity={q.imageOpacity}
                                              caption={effectiveWrap === 'front' ? q.imageCaption : undefined}
                                              isPreview={isPreview}
                                              onResize={isPreview && onImageResize ? (newSize: number) => onImageResize(q.id, newSize, q.imageHeight || 150) : undefined}
                                              left={q.imageLeft}
                                              top={q.imageTop}
                                              onPositionChange={isPreview && onImagePositionChange ? (left: number, top: number) => onImagePositionChange(q.id, left, top) : undefined}
                                              onOpenEditor={isPreview ? () => {
                                                const event = new CustomEvent('open-image-editor', { detail: { questionId: q.id } });
                                                window.dispatchEvent(event);
                                              } : undefined}
                                            />
                                          );
                                        }
                                        
                                        // Inline: rendered AFTER text (below)
                                        return null;
                                      })()}

                                      {q.align === "center" ? (
                                        <div className="text-center w-full break-words">
                                          <span className="font-bold text-[inherit] mr-1.5 whitespace-nowrap">
                                            {absoluteIdx + 1}. {formatPoints(q.points)}
                                          </span>
                                          <SafeHTML
                                            html={q.text}
                                            className="leading-snug q-text-html-container break-words text-center [&_p]:text-center [&_div]:text-center inline"
                                          />
                                        </div>
                                      ) : (
                                        <div className="block">
                                          <span className="font-bold text-[inherit] shrink-0 text-left float-left mr-1.5">
                                            {absoluteIdx + 1}. {formatPoints(q.points)}
                                          </span>
                                          <SafeHTML
                                            html={q.text}
                                            className="leading-snug q-text-html-container break-words text-justify [&_p]:text-justify [&_div]:text-justify block"
                                          />
                                        </div>
                                      )}
                                      <div className="clear-both"></div>
                                    </div>

                                    {/* INLINE IMAGE: rendered below the text */}
                                    {q.image && (!q.imageWrap || q.imageWrap === 'inline') && (!q.imageAlign || q.imageAlign === 'center') && (
                                      <div
                                        className={cn(
                                          "flex w-full max-w-full my-2 px-6 justify-center"
                                        )}
                                      >
                                        <InteractiveImage
                                          src={q.image}
                                          initialSize={q.imageSize || 100}
                                          initialHeight={q.imageHeight}
                                          align="center"
                                          wrap="inline"
                                          caption={q.imageCaption}
                                          isPreview={isPreview}
                                          onResize={isPreview && onImageResize ? (newSize: number) => onImageResize(q.id, newSize, q.imageHeight || 150) : undefined}
                                          left={q.imageLeft}
                                          top={q.imageTop}
                                          onPositionChange={isPreview && onImagePositionChange ? (left: number, top: number) => onImagePositionChange(q.id, left, top) : undefined}
                                          onOpenEditor={isPreview ? () => {
                                            const event = new CustomEvent('open-image-editor', { detail: { questionId: q.id } });
                                            window.dispatchEvent(event);
                                          } : undefined}
                                        />
                                      </div>
                                    )}

                                    {/* ESPAÇO GEOMÉTRICO DE DESENHO OU EXPRESSÃO DO ALUNO */}
                                    {q.drawingShape && q.drawingShape !== "none" && (
                                      <div
                                        className={cn(
                                          "flex my-4 select-none relative",
                                          q.drawingShapeAlign === "left"
                                            ? "justify-start pl-6"
                                            : q.drawingShapeAlign === "right"
                                              ? "justify-end pr-6"
                                              : "justify-center",
                                        )}
                                      >
                                        <InteractiveShape
                                          q={q}
                                          isPreview={isPreview}
                                          onResize={isPreview && onShapeResize ? (w: number, h: number) => onShapeResize(q.id, w, h) : undefined}
                                          onPositionChange={isPreview && onShapePositionChange ? (left: number, top: number) => onShapePositionChange(q.id, left, top) : undefined}
                                        />
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div className="text-sm italic text-slate-500 w-full pl-2 sm:pl-4 pr-1 mt-1 font-bold">
                                    (Questão {absoluteIdx + 1} • continuação...)
                                  </div>
                                )}

                                {q.type === "essay" ? (
                                  <div
                                    className={cn(
                                      "px-8 space-y-0 mt-1.5",
                                      q.align === "center"
                                        ? "mx-auto w-full"
                                        : "",
                                    )}
                                  >
                                    {Array.from({ length: q.lineCount ?? 5 }).map(
                                      (_, i) => (
                                        <div
                                          key={i}
                                          className={cn("border-b border-black/30", (i === 0 && !q.hideBaseContent) ? "h-[14px]" : "h-[18px]")}
                                        ></div>
                                      ),
                                    )}
                                  </div>
                                ) : (
                                  <div
                                    className={cn(
                                      "flex flex-col w-full space-y-0.5 mt-1 min-w-0",
                                      q.align === "center"
                                        ? "mx-auto items-center text-center"
                                        : "pl-4 sm:pl-10 pr-2 sm:pr-4 items-start",
                                    )}
                                  >
                                    {(q.options || []).map((optText, i) => {
                                      const letter = String.fromCharCode(97 + i + (q.optionsOffset || 0)); // a, b, c...
                                      return (
                                        optText && (
                                          <div
                                            key={letter}
                                            className={cn(
                                              "flex gap-2 min-w-0",
                                              q.align === "center" ? "w-fit max-w-full text-left" : "w-full"
                                            )}
                                          >
                                            <span className="text-[inherit] font-bold shrink-0">
                                              {letter})
                                            </span>
                                            <SafeHTML
                                              html={optText}
                                              className="leading-snug q-text-html-container flex-1 min-w-0 break-words"
                                            />
                                          </div>
                                        )
                                      );
                                    })}
                                  </div>
                                )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Page Footer */}
                  <div className="mt-2 flex items-center justify-between text-[11px] font-bold uppercase print:mt-1 text-slate-600 dark:text-slate-400 select-none pb-1 border-t border-black pt-1 px-1 shrink-0 w-full">
                    <div className="flex items-center gap-2">
                      <img
                        src={LOGO_VINHO}
                        alt="Logo CPS"
                        className="h-7 w-auto object-contain print:black-and-white"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex flex-col text-right text-slate-700 dark:text-slate-300 print:text-black">
                      <span>Boa Prova! ⬢ {exam.subject}</span>
                      <span className="text-[8px] opacity-60">
                        COLEGIO PROGRESSO SANTISTA
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {!isLastPage && <PageBreakSeparator pageNumber={pageIdx + 1} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Global helper to estimate height of questions in millimeters to paginate automatically
function getQuestionHeightEstimate(q: Question, fontSize: number = 13) {
  let h = 0;
  const currentFontSize = fontSize;
  const lineMmHeight = currentFontSize * 1.375 * 0.26458;
  const charsPerLine = Math.floor(650 / (currentFontSize * 0.53));

  const estimateLinesForHeight = (html: string) => {
    if (!html) return { totalLines: 0, blockCount: 0 };
    const cleanedHtml = cleanWordHtml(html);
    let prepared = cleanedHtml.replace(/<\/p>|<\/div>|<\/li>|<\/tr>|<\/h1>|<\/h2>|<\/h3>|<\/h4>|<\/h5>|<\/h6>|<\/ol>|<\/ul>/gi, "\n");
    prepared = prepared.replace(/<br\s*\/?>/gi, "\n");
    prepared = prepared.replace(/<[^>]*>/g, "");
    prepared = prepared
      .replace(/&nbsp;/gi, " ")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'");
    const preparedTrimmed = prepared.trim();
    const linesArr = preparedTrimmed.split("\n");
    let totalLines = 0;
    let blockCount = 0;
    linesArr.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed.length > 0) {
        totalLines += Math.max(1, Math.ceil(trimmed.length / charsPerLine));
        blockCount++;
      } else {
        totalLines += 0.8;
        blockCount++;
      }
    });
    return { totalLines: Math.max(1, totalLines), blockCount: Math.max(1, blockCount) };
  };

  const trMatches = (q.text || "").match(/<tr\b/gi);
  const trCount = trMatches ? trMatches.length : 0;
  h += trCount * lineMmHeight * 1.5;

  const { totalLines, blockCount } = estimateLinesForHeight(q.text || "");
  h += totalLines * lineMmHeight;
  h += blockCount * 0.2;
  h += 1.06;

  if (q.image) {
    if (q.imageHeight) {
      h += q.imageHeight + 4;
    } else {
      const sizePercent = q.imageSize || 100;
      const widthMm = 190 * (sizePercent / 100);
      let estImg = widthMm * 0.55; 
      estImg = Math.min(150, estImg);
      h += estImg + 4;
    }
    if (q.imageCaption) {
      const { totalLines: capLines } = estimateLinesForHeight(q.imageCaption);
      h += capLines * lineMmHeight + 2.0;
    }
  }

  if (q.drawingShape && q.drawingShape !== "none") {
    const isCircleOrSquare = q.drawingShape === "circle" || q.drawingShape === "square";
    const defaultHeight = q.drawingShape === "line" || q.drawingShape === "arrow" ? 40 : 100;
    const shapeHeightPx = isCircleOrSquare
      ? (q.drawingShapeSize || 150)
      : (q.drawingShapeHeight || defaultHeight);
    h += (shapeHeightPx * 0.264) + 8.4;
  }

  if (q.type === "essay") {
    const lines = q.lineCount ?? 5;
    h += 1.58;
    h += 3.7;
    h += (lines - 1) * 4.76;
  } else {
    const options = q.options || [];
    const nonemptyOptions = options.filter((opt) => !!opt);
    let optionsLines = 0;
    nonemptyOptions.forEach((opt) => {
      const { totalLines: optLines } = estimateLinesForHeight(opt);
      optionsLines += optLines;
    });
    h += optionsLines * lineMmHeight;
    if (nonemptyOptions.length > 1) {
      h += (nonemptyOptions.length - 1) * 0.53;
    }
  }

  h += 0.53;
  return h;
}

function ExamPrintView({ exam, onBack }: { exam: Exam; onBack: () => void }) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState("");
  const [professorName, setProfessorName] = useState<string>(
    "____________________",
  );

  const schoolInfo = useMemo(() => getSchoolInfo(), []);
  
  useEffect(() => {
    const fetchProf = async () => {
      if (!exam.professorId) return;
      const { data } = await supabase
        .from("users")
        .select("professional_name, email")
        .eq("uid", exam.professorId)
        .single();
      if (data) {
        setProfessorName(data.professional_name || data.email.split("@")[0]);
      }
    };
    fetchProf();
  }, [exam.professorId]);

  const totalValue = (Array.isArray(exam.questions) ? exam.questions : []).reduce(
    (acc, q) =>
      acc +
      (parseFloat(
        String(
          q.points !== undefined && q.points !== null && q.points !== ""
            ? q.points
            : 1,
        ),
      ) || 0),
    0,
  );

  // Get all registered students
  const allStudents: Student[] = useMemo(() => Object.values(schoolInfo.studentsDB).flat(), [schoolInfo]);
  // Get all available classes sorted
  const availableClasses: string[] = useMemo(() => Array.from(
    new Set(allStudents.map((s: Student) => s.classId)),
  ).sort(), [allStudents]);

  // Restrict classes listed to only those matches in exam's classYear
  const filteredAvailableClasses = React.useMemo(() => {
    if (!exam.classYear) return availableClasses;

    const targetClasses = (exam.classYear || "")
      .split(",")
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean);

    if (targetClasses.length === 0) return availableClasses;

    const filtered = availableClasses.filter((c) => {
      const classLower = c.toLowerCase();

      return targetClasses.some((tc) => {
        // Direct equality
        if (classLower === tc) return true;

        // Check grade numbers match (e.g. 7 and 7)
        const matchTcGrade = tc.match(/(\d+)/);
        const matchCGrade = classLower.match(/(\d+)/);

        if (matchTcGrade && matchCGrade && matchTcGrade[1] === matchCGrade[1]) {
          // Check if tc has specific letters [A, B, C, D]
          const classLetterMatch = classLower.match(/([a-z])\b/);
          if (classLetterMatch) {
            const letter = classLetterMatch[1];
            // Get all isolated letters of length 1 in tc, excluding words like "ano", "s"
            const tcLetters = tc
              .split(/[\s,]+/)
              .map((part) =>
                part
                  .trim()
                  .replace(/[^a-z]/gi, "")
                  .toLowerCase(),
              )
              .filter(
                (part) => part.length === 1 && part !== "o" && part !== "s",
              ); // exclude 'o' (from 7º) or 's' (from 7ºs)

            if (tcLetters.length > 0) {
              return tcLetters.includes(letter);
            }
          }
          return true;
        }

        return tc.includes(classLower) || classLower.includes(tc);
      });
    });

    return filtered.length > 0 ? filtered : availableClasses;
  }, [availableClasses, exam.classYear]);

  // Calculate estimated page count of the exam document
  const estimatedPageCount = useMemo(() => {
    const pages: Question[][] = [];
    let currentPage: Question[] = [];
    let currentPageHeight = 0;
    const questions = exam.questions || [];

    questions.forEach((q) => {
      const qHeight = getQuestionHeightEstimate(q, exam.fontSize || 13);
      const currentLimit = pages.length === 0 ? 170 : 230;
      const prevQ = currentPage[currentPage.length - 1];
      const forceBreakFromPrev = prevQ && prevQ.pageBreakAfter;
      const overflowBreak =
        currentPage.length > 0 && (currentPageHeight + qHeight > currentLimit || forceBreakFromPrev);

      if (overflowBreak) {
        pages.push(currentPage);
        currentPage = [q];
        currentPageHeight = qHeight;
      } else {
        currentPage.push(q);
        currentPageHeight += qHeight;
      }
    });

    if (currentPage.length > 0 || pages.length === 0) {
      pages.push(currentPage);
    }
    return pages.length;
  }, [exam]);

  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedStudentNames, setSelectedStudentNames] = useState<string[]>(
    [],
  );
  const [includeBlank, setIncludeBlank] = useState<boolean>(false);
  const [insertSpacerPage, setInsertSpacerPage] = useState<boolean>(
    estimatedPageCount % 2 !== 0
  );

  // Sync state when exam.id or estimatedPageCount changes
  useEffect(() => {
    setInsertSpacerPage(estimatedPageCount % 2 !== 0);
  }, [exam.id, estimatedPageCount]);

  // Initialize selected class and students based on exam's classYear
  useEffect(() => {
    if (selectedClassId !== "") return;

    let initialClassId = "";
    if (exam.classYear) {
      // Find the first matching sub-class (e.g. if exam.classYear === '6º ano', pick '6º A')
      const target = exam.classYear.toLowerCase();
      const match = filteredAvailableClasses.find(
        (c) =>
          c.toLowerCase().includes(target) || target.includes(c.toLowerCase()),
      );
      initialClassId =
        match ||
        (filteredAvailableClasses.length > 0
          ? filteredAvailableClasses[0]
          : "");
    } else if (filteredAvailableClasses.length > 0) {
      initialClassId = filteredAvailableClasses[0];
    }

    setSelectedClassId(initialClassId);
  }, [exam.classYear, filteredAvailableClasses, selectedClassId]);

  useEffect(() => {
    if (selectedClassId) {
      const isRecuperacao = (exam as any).exam_type?.toLowerCase().includes("recuperação") || exam.examType?.toLowerCase().includes("recuperação") || exam.answerKey?._metadata?.examType?.toLowerCase().includes("recuperação");
      if (exam.answerKey?._metadata?.isAdapted || isRecuperacao) {
        setSelectedStudentNames(exam.answerKey._metadata.adaptedStudents || []);
      } else {
        const studsForClass = allStudents
          .filter((s: Student) => {
            if (s.classId !== selectedClassId) return false;
            const isTransferred =
              s.status === "Transferido" &&
              s.transferDate &&
              exam.examDate &&
              exam.examDate >= s.transferDate;
            return !isTransferred;
          })
          .map((s: Student) => s.name);
        setSelectedStudentNames(studsForClass);
      }
    } else {
      setSelectedStudentNames([]);
    }
  }, [selectedClassId, exam]);

  const toggleStudent = (name: string) => {
    if (selectedStudentNames.includes(name)) {
      setSelectedStudentNames((prev) => prev.filter((n) => n !== name));
    } else {
      setSelectedStudentNames((prev) => [...prev, name]);
    }
  };

  const handleStandardPrint = () => {
    const exams = document.getElementById("exams-container");
    if (exams) {
      const originalTitle = document.title;
      // Format: Turma - Tipo de Prova
      const classYear = selectedClassId || exam.classYear || "Geral";
      const examType = exam.examType || "Prova";
      document.title = `${classYear} - ${examType}`;

      exams.classList.remove("print:hidden");
      window.print();

      // Restore title after a short delay so the print dialog captures it
      setTimeout(() => {
        document.title = originalTitle;
      }, 500);
    }
  };

  const handleExportExamPDF = async () => {
    setIsExporting(true);
    setExportProgress("Preparando conteúdo das provas...");
    try {
      const classYear = selectedClassId || exam.classYear || "Geral";
      const examType = exam.examType || "Prova";
      const subject = exam.subject || "Exame";
      const filename = `Prova_${subject.replace(/\s+/g, "_")}_${classYear.replace(/\s+/g, "_")}_${examType.replace(/\s+/g, "_")}`;

      // Delay to let React render and settle
      await new Promise((resolve) => setTimeout(resolve, 600));

      setExportProgress("Renderizando páginas A4...");
      await exportMultipleToPDF("exam-page", filename, (msg) => {
        setExportProgress(msg);
      });
    } catch (err) {
      console.error("Erro ao exportar PDF das provas:", err);
      alert("Houve um erro ao exportar a(s) prova(s) em PDF.");
    } finally {
      setIsExporting(false);
      setExportProgress("");
    }
  };

  // Determine students to render (minimum 1 blank if none selected)
  let studentsToRender: Student[] =
    selectedStudentNames.length > 0
      ? allStudents.filter((s: Student) => {
          if (
            !selectedStudentNames.includes(s.name) ||
            s.classId !== selectedClassId
          )
            return false;
          const isTransferred =
            s.status === "Transferido" &&
            s.transferDate &&
            exam.examDate &&
            exam.examDate >= s.transferDate;
          return !isTransferred;
        })
      : [];

  if (studentsToRender.length === 0 && !includeBlank) {
    studentsToRender = [
      { name: "", classId: selectedClassId || exam.classYear || "" },
    ];
  } else if (includeBlank) {
    studentsToRender = [
      ...studentsToRender,
      { name: "", classId: selectedClassId || exam.classYear || "" },
    ];
  }

  return (
    <div className="space-y-8 print-container print:space-y-0">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        /* === ENFORCE STANDARD EXAM FONT === */
        /* Override ALL nested elements to inherit the exam's standard font-size and font-family.
           This prevents teacher-pasted content with custom fonts/sizes from breaking pagination. */
        .q-text-html-container,
        .q-text-html-container * {
          font-size: inherit !important;
          font-family: inherit !important;
          line-height: inherit !important;
        }
        /* Resets for HTML question paragraphs to use space efficiently and avoid empty paper space */
        .q-text-html-container p {
          margin: 0 0 2px 0 !important;
          padding: 0 !important;
        }
        .q-text-html-container p, 
        .q-text-html-container div, 
        .q-text-html-container span,
        .q-text-html-container blockquote {
          position: static !important;
          float: none !important;
        }
        .q-text-html-container table {
          width: 100% !important;
          max-width: 100% !important;
          table-layout: fixed !important;
          border-collapse: collapse !important;
          margin-left: 0px !important;
          margin-right: 0px !important;
          float: none !important;
        }
        .q-text-html-container td,
        .q-text-html-container th {
          max-width: 100% !important;
          word-break: break-word !important;
          overflow-wrap: break-word !important;
          box-sizing: border-box !important;
        }
        .q-text-html-container ul, .q-text-html-container ol {
          margin-top: 2px !important;
          margin-bottom: 2px !important;
          padding-left: 1.25rem !important;
        }
        .q-text-html-container li {
          margin: 1px 0 !important;
        }
        @page {
          size: A4 portrait;
          margin: 0 !important;
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: auto !important;
            height: auto !important;
            background: white !important;
            -webkit-print-color-adjust: exact;
            overflow: visible !important;
          }
          .print-container {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            display: block !important;
          }
          .exam-page-scale-wrapper {
            height: auto !important;
            min-height: auto !important;
            max-height: auto !important;
            overflow: visible !important;
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .exam-page {
            width: 210mm !important;
            max-width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            padding: 10mm !important;
            box-sizing: border-box !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            overflow: hidden !important;
            transform: none !important;
            transform-origin: unset !important;
          }
          .break-after-page {
            page-break-after: always !important;
            break-after: page !important;
          }
          .break-after-right {
            page-break-after: right !important;
            break-after: right !important;
          }
          .print-page-wrapper {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `,
        }}
      />
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between no-print mb-4 px-4">
        <button
          onClick={onBack}
          className="text-slate-700 dark:text-slate-300 font-bold text-sm flex items-center gap-2 hover:text-slate-700 dark:text-slate-200"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          Voltar ao Painel
        </button>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleExportExamPDF}
            disabled={isExporting}
            className="w-full sm:w-auto bg-emerald-600 text-white px-4 py-2.5 rounded-md font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            {isExporting ? "Exportando..." : "Exportar de Fato para PDF"}
          </button>
          <button
            onClick={() => {
              handleStandardPrint();
            }}
            className="w-full sm:w-auto bg-primary text-white px-4 py-2.5 rounded-md font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 shadow-sm disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            Imprimir Provas
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6 border border-border shadow-sm rounded-lg print:hidden no-print">
        <h3 className="text-lg font-bold text-primary mb-4">
          Configurações de Impressão
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
              Turma Alvo
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full border rounded-md px-3 py-2 font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
            >
              <option value="">Selecione uma turma...</option>
              {renderClassOptions(filteredAvailableClasses)}
            </select>
            <p className="text-xs text-slate-700 dark:text-slate-300 mt-2">
              Selecione a sala específica. Todos os alunos desta sala serão
              marcados para impressão por padrão.
            </p>
            <div className="mt-6 p-4 border border-slate-200 dark:border-slate-800 rounded-md bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeBlank}
                  onChange={(e) => setIncludeBlank(e.target.checked)}
                  className="w-4 h-4 text-primary rounded border-slate-200 dark:border-slate-800 focus:ring-primary"
                />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  Incluir cópia em branco extra
                </span>
              </label>
              <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 ml-7 mb-4">
                Gera uma cópia sem nome no final, ideal para alunos novatos na
                sala.
              </p>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={insertSpacerPage}
                  onChange={(e) => setInsertSpacerPage(e.target.checked)}
                  className="w-4 h-4 text-primary rounded border-slate-200 dark:border-slate-800 focus:ring-primary"
                />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  Imprimir Frente-e-Verso (adicionar página em branco ao final)
                </span>
              </label>
              <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 ml-7">
                Marque se a prova tiver número ÍMPAR de páginas, para evitar que o próximo aluno imprima no verso.
              </p>
            </div>
          </div>
          <div>
            <div className="flex justify-between items-end mb-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                Alunos Selecionados ({selectedStudentNames.length})
              </label>
              {selectedClassId && (
                <button
                  onClick={() => {
                    const studsForClass = allStudents
                      .filter((s: Student) => {
                        if (s.classId !== selectedClassId) return false;
                        const isTransferred =
                          s.status === "Transferido" &&
                          s.transferDate &&
                          exam.examDate &&
                          exam.examDate >= s.transferDate;
                        return !isTransferred;
                      })
                      .map((s: Student) => s.name);

                    if (selectedStudentNames.length === studsForClass.length) {
                      setSelectedStudentNames([]);
                    } else {
                      setSelectedStudentNames(studsForClass);
                    }
                  }}
                  className="text-[10px] uppercase font-black text-primary hover:underline"
                >
                  {selectedStudentNames.length ===
                  allStudents.filter((s: Student) => {
                    if (s.classId !== selectedClassId) return false;
                    const isTransferred =
                      s.status === "Transferido" &&
                      s.transferDate &&
                      exam.examDate &&
                      exam.examDate >= s.transferDate;
                    return !isTransferred;
                  }).length
                    ? "Desmarcar Todos"
                    : "Selecionar Todos"}
                </button>
              )}
            </div>
            <div className="border border-border rounded-md h-48 overflow-y-auto p-3 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 space-y-1">
              {allStudents.filter((s: Student) => {
                if (s.classId !== selectedClassId) return false;
                const isTransferred =
                  s.status === "Transferido" &&
                  s.transferDate &&
                  exam.examDate &&
                  exam.examDate >= s.transferDate;
                return !isTransferred;
              }).length === 0 && (
                <div className="text-sm text-slate-600 dark:text-slate-400 italic">
                  Nenhum aluno ativo para esta turma nesta data...
                </div>
              )}
              {allStudents
                .filter((s: Student) => {
                  if (s.classId !== selectedClassId) return false;
                  const isTransferred =
                    s.status === "Transferido" &&
                    s.transferDate &&
                    exam.examDate &&
                    exam.examDate >= s.transferDate;
                  return !isTransferred;
                })
                .map((student: Student) => (
                  <label
                    key={student.name}
                    className="flex items-center gap-3 p-2 hover:bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudentNames.includes(student.name)}
                      onChange={() => toggleStudent(student.name)}
                      className="w-4 h-4 text-primary rounded border-slate-200 dark:border-slate-800 focus:ring-primary"
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                      {student.name}
                    </span>
                  </label>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Generated Exams */}
      <div
        id="exams-container"
        className="space-y-12 print:space-y-0 flex flex-col"
      >
        {studentsToRender.map((student, sIdx) => (
          <React.Fragment key={`exam-frag-${sIdx}`}>
            <div
              className={cn(
                "student-exam-wrapper w-full",
                (sIdx === studentsToRender.length - 1 && !insertSpacerPage)
                  ? ""
                  : "break-after-page print:break-after-page",
              )}
            >
              <ExamDocument
                exam={exam}
                studentName={student.name}
                classId={student.classId}
                professorName={professorName}
                totalValue={totalValue}
              />
            </div>
            {insertSpacerPage && (
              <div
                className={cn(
                  "blank-spacer-page w-full flex items-center justify-center bg-white",
                  sIdx === studentsToRender.length - 1
                    ? ""
                    : "break-after-page print:break-after-page"
                )}
                style={{ height: "1px", color: "transparent" }}
              >
                &nbsp;
              </div>
            )}
            {sIdx < studentsToRender.length - 1 && (
              <PageBreakSeparator pageNumber={sIdx + 1} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* OVERLAY LOADER */}
      {isExporting && (
        <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-sm flex items-center justify-center z-[99999] no-print">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col items-center max-w-sm text-center space-y-4">
            <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
            <h3 className="font-black text-slate-700 dark:text-slate-200 uppercase text-xs tracking-wider">
              Exportando Prova(s)
            </h3>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-bold leading-relaxed uppercase">
              {exportProgress || "Processando arquivo PDF..."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function StudentReportsView({
  user,
  userProfile,
  isAdmin,
  reports,
  refresh,
  onPrint,
  onPrintAll,
}: {
  user: User;
  userProfile: any;
  isAdmin: boolean;
  reports: StudentReport[];
  refresh: () => void;
  onPrint: (report: StudentReport) => void;
  onPrintAll: (reports: StudentReport[]) => void;
}) {
  const [activeTab, setActiveTab] = useState<"new" | "list">("new");
  const [localReports, setLocalReports] = useState<StudentReport[]>(reports);

  useEffect(() => {
    setLocalReports(reports);
  }, [reports]);

  const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(
    new Set(),
  );
  const [loadingActionReportId, setLoadingActionReportId] = useState<string | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [pdfProgress, setPdfProgress] = useState("");
  const [pdfReportsToRender, setPdfReportsToRender] = useState<StudentReport[]>(
    [],
  );

  const handleExportReportsPDF = async (reportsToExport: StudentReport[]) => {
    if (reportsToExport.length === 0) return;
    try {
      setIsExportingPDF(true);
      setPdfProgress("Preparando relatórios para exportação...");
      setPdfReportsToRender(reportsToExport);

      // Delay to let React render and paint the offscreen container
      await new Promise((resolve) => setTimeout(resolve, 800));

      setPdfProgress("Capturando páginas...");
      const filename =
        reportsToExport.length === 1
          ? `Relatorio_${reportsToExport[0].studentName.replace(/\s+/g, "_")}_${reportsToExport[0].subject.replace(/\s+/g, "_")}`
          : `Relatorios_Lote_${reportsToExport.length}_estudantes`;

      await exportMultipleToPDF("report-pdf-page", filename, (msg) => {
        setPdfProgress(msg);
      });
    } catch (err) {
      console.error("Erro exportando PDF relatórios:", err);
      alert("Houve um erro ao exportar o(s) relatório(s) em PDF.");
    } finally {
      setIsExportingPDF(false);
      setPdfProgress("");
      setPdfReportsToRender([]);
    }
  };

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedBimester, setSelectedBimester] = useState("1º Bimestre");
  const [selectedProfId, setSelectedProfId] = useState(user.id);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [schoolInfo] = useState(getSchoolInfo());

  // Filtering state for the list
  const [filterClass, setFilterClass] = useState("");
  const [filterStudent, setFilterStudent] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterBimester, setFilterBimester] = useState("");
  const [listSearch, setListSearch] = useState("");
  const [showListSuggestions, setShowListSuggestions] = useState(false);

  // Initialize subject if user is a professor
  useEffect(() => {
    if (
      !isAdmin &&
      userProfile?.assigned_subjects?.length > 0 &&
      !selectedSubject
    ) {
      setSelectedSubject(userProfile.assigned_subjects[0]);
    }
  }, [isAdmin, userProfile, selectedSubject]);

  const [studentSearch, setStudentSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const studentSuggestions = useMemo(() => {
    if (studentSearch.length < 2) return [];
    const search = studentSearch.toLowerCase();
    const list: { name: string; year: string }[] = [];
    const allowedClasses = getFilteredClasses(userProfile, schoolInfo.classes);

    Object.entries(schoolInfo.studentsDB).forEach(
      ([year, students]: [string, any]) => {
        students.forEach((s: any) => {
          if (
            s.name.toLowerCase().includes(search) &&
            allowedClasses.includes(s.classId)
          ) {
            list.push({ name: s.name, year });
          }
        });
      },
    );
    return list.slice(0, 10);
  }, [studentSearch, schoolInfo.studentsDB, userProfile, schoolInfo.classes]);

  const studentsInClass = useMemo(() => {
    if (!selectedClass) return [];
    // Extract year like "6º" from "6º A"
    const yearMatch = selectedClass.match(/^(\d+º)/);
    if (!yearMatch) return [];
    const yearKey = `${yearMatch[1]} ano`;
    return (schoolInfo.studentsDB[yearKey] || []).filter(
      (s: any) => s.classId === selectedClass,
    );
  }, [selectedClass, schoolInfo]);

  const handleSave = async () => {
    if (!selectedStudent || !content || !selectedSubject || !selectedClass) {
      alert("Preencha todos os campos: turma, aluno, disciplina e conteúdo.");
      return;
    }
    
    // Permission validation
    if (editingId) {
      const reportItem = reports.find((r) => r.id === editingId);
      const isCreatorOrAdmin =
        isAdmin ||
        userProfile?.role?.includes("admin") ||
        userProfile?.role?.includes("vice_diretor") ||
        reportItem?.professorId === user.id ||
        reportItem?.professorId === userProfile?.uid ||
        reportItem?.professorId === userProfile?.id;
      if (!isCreatorOrAdmin) {
        alert("Acesso Negado: Você não tem permissão para editar este relatório.");
        return;
      }
    } else {
      const isAllowed =
        isAdmin ||
        userProfile?.role?.includes("admin") ||
        userProfile?.role?.includes("vice_diretor") ||
        ((userProfile?.assigned_subjects || []).includes(selectedSubject) &&
          getFilteredClasses(userProfile, schoolInfo.classes).includes(selectedClass));
      if (!isAllowed) {
        alert("Acesso Negado: Você não tem permissão para criar relatórios para esta turma e disciplina.");
        return;
      }
    }

    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from("student_reports")
          .update({
            report_text: content,
            class_name: selectedClass,
            subject: selectedSubject,
            bimester: selectedBimester,
            // Removed created_at update
          })
          .eq("id", editingId);
        if (error) throw error;

        // LOG SYSTEM ACTIVITY
        try {
          if (!isAdmin) {
            await fetch("/api/activity/log", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                actorName:
                  userProfile?.professional_name || user.email?.split("@")[0],
                actorEmail: user.email,
                actionType: "edit_report",
                description: `O professor ${userProfile?.professional_name || user.email?.split("@")[0]} alterou o relatório observacional do aluno '${selectedStudent}' (${selectedClass} - ${selectedSubject})`,
              }),
            });
          }
        } catch (logErr) {
          console.warn("Log error:", logErr);
        }
      } else {
        const { error } = await supabase.from("student_reports").insert({
          student_name: selectedStudent,
          class_name: selectedClass,
          subject: selectedSubject,
          report_text: content,
          bimester: selectedBimester,
          professor_id: user.id,
        });
        if (error) throw error;

        // LOG SYSTEM ACTIVITY
        try {
          if (!isAdmin) await fetch("/api/activity/log", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              actorName:
                userProfile?.professional_name || user.email?.split("@")[0],
              actorEmail: user.email,
              actionType: "create_report",
              description: `O professor ${userProfile?.professional_name || user.email?.split("@")[0]} realizou um relatório observacional do aluno '${selectedStudent}' (${selectedClass} - ${selectedSubject})`,
            }),
          });
        } catch (logErr) {
          console.warn("Log error:", logErr);
        }
      }
      alert("Relatório salvo com sucesso!");
      setContent("");
      setSelectedStudent("");
      setStudentSearch("");
      setEditingId(null);
      refresh();
      setActiveTab("list");
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
    setStudentSearch("");
    setSelectedSubject(report.subject);
    setSelectedBimester(report.bimester);
    setContent(report.content);
    setActiveTab("new");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    const targetReport = reports.find((r) => r.id === id);
    if (!confirm("Deseja realmente excluir este relatório?")) return;
    try {
      const { error } = await supabase
        .from("student_reports")
        .delete()
        .eq("id", id);
      if (error) throw error;
      refresh();

      if (targetReport) {
        try {
          if (!isAdmin) {
            await robustFetch("/api/activity/log", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                actorName:
                  userProfile?.professional_name || user.email?.split("@")[0],
                actorEmail: user.email,
                actionType: "delete_report",
                description: `O professor ${userProfile?.professional_name || user.email?.split("@")[0]} excluiu o relatório do aluno '${targetReport.studentName}' (${targetReport.studentClass} - ${targetReport.subject})`,
              }),
            });
          }
        } catch (logErr) {
          console.warn("Log error:", logErr);
        }
      }
    } catch (err: any) {
      alert("Erro ao excluir: " + err.message);
    }
  };

  const handleActionFamilyPortal = async (r: StudentReport, action: 'send' | 'approve' | 'revoke') => {
    if (!r.id) {
      alert("Erro: ID do relatório não encontrado.");
      return;
    }
    
    if (action === 'revoke') {
      if (!window.confirm("Deseja realmente revogar este relatório? A família perderá o acesso imediatamente.")) {
        return;
      }
    }

    try {
      setLoadingActionReportId(r.id);
      console.log(`Action Family Portal: ${action} for report ${r.id} (isAdmin: ${isAdmin})`);
      
      let newStatus = '';
      if (action === 'send') {
        // Updated rule: Both ADM and Professor send directly to the Family Portal
        // This avoids confusion where reports stay 'Pendente' and families can't see them.
        newStatus = 'Aprovado';
      }
      else if (action === 'approve') newStatus = 'Aprovado';
      else if (action === 'revoke') newStatus = 'Nao_Enviado';

      console.log(`Setting status to: ${newStatus}`);

      // Optimistic update for instant button visual state update
      setLocalReports((prev) =>
        prev.map((item) =>
          item.id === r.id
            ? {
                ...item,
                familyPortalStatus: newStatus,
                familyPortalSentAt: newStatus === 'Aprovado' ? new Date().toISOString() : null,
              }
            : item
        )
      );

      const { error } = await supabase
        .from("student_reports")
        .update({
          family_portal_status: newStatus,
          family_portal_sent_at: newStatus === 'Aprovado' ? new Date().toISOString() : null,
        })
        .eq("id", r.id);
      
      if (error) throw error;
      
      // Artificial delay to show loading and ensure sync
      await new Promise(res => setTimeout(res, 800));
      
      refresh();
      
      if (newStatus === 'Aprovado') {
        alert("Relatório disponibilizado no Portal da Família!");
      } else if (newStatus === 'Pendente') {
        alert("Relatório enviado para aprovação da coordenação.");
      } else {
        alert("Relatório removido do Portal da Família.");
      }

      console.log(`Action ${action} successful. New status: ${newStatus}`);
    } catch(e: any) {
      console.error("Action Family Portal Error:", e);
      if (e.message?.includes("family_portal_status") || e.message?.includes("column")) {
        alert("Erro no Banco de Dados: As colunas 'family_portal_status' e 'family_portal_sent_at' precisam ser adicionadas na tabela 'student_reports'. Execute o SQL pelo Supabase: ALTER TABLE student_reports ADD COLUMN family_portal_status text DEFAULT 'Nao_Enviado', ADD COLUMN family_portal_sent_at timestamptz;");
      } else {
        alert("Erro ao processar ação: " + (e.message || "Erro desconhecido"));
      }
      refresh();
    } finally {
      setLoadingActionReportId(null);
    }
  };

  const [searchQuery, setSearchQuery] = useState("");

  const filteredReports = useMemo(() => {
    return localReports.filter((r) => {
      const matchesTextSearch =
        !searchQuery ||
        r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.studentClass.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.subject.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesClass = !filterClass || r.studentClass === filterClass;
      const matchesStudent =
        !filterStudent ||
        r.studentName.toLowerCase().includes(filterStudent.toLowerCase());
      const matchesSubject = !filterSubject || r.subject === filterSubject;
      const matchesBimester = !filterBimester || r.bimester === filterBimester;

      return (
        matchesTextSearch &&
        matchesClass &&
        matchesStudent &&
        matchesSubject &&
        matchesBimester
      );
    });
  }, [
    localReports,
    searchQuery,
    filterClass,
    filterStudent,
    filterSubject,
    filterBimester,
  ]);

  const listStudentSuggestions = useMemo(() => {
    // Get unique student names from the reports themselves
    let students = Array.from(new Set(localReports.map((r) => r.studentName))) as string[];

    // Sort alphabetically
    students.sort((a, b) => a.localeCompare(b));

    // If there's a search term, filter by it
    if (listSearch) {
      const search = listSearch.toLowerCase();
      return students.filter((name) => name.toLowerCase().includes(search));
    }

    // If a class is selected, prioritize students from that class
    if (filterClass) {
      const classStudents = Array.from(
        new Set(
          localReports
            .filter((r) => r.studentClass === filterClass)
            .map((r) => r.studentName),
        ),
      ) as string[];
      classStudents.sort((a, b) => a.localeCompare(b));
      return classStudents.length > 0 ? classStudents : students;
    }

    return students;
  }, [listSearch, localReports, filterClass]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20 text-left">
      <ViewHeader
        title="Relatório de Aluno"
        subtitle="Registro pedagógico, ocorrências de aprendizagem, acompanhamento discente e diretrizes psicopedagógicas."
        icon={<UserIcon className="w-5 h-5 text-gold" />}
        badge="Acompanhamento Discente"
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl shadow-inner">
            <button
              type="button"
              onClick={() => setActiveTab("new")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
                activeTab === "new"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200",
              )}
            >
              <div className="flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                <span>{editingId ? "Editar Relatório" : "Novo Registro"}</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("list")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
                activeTab === "list"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200",
              )}
            >
              <div className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>Histórico de Relatórios</span>
              </div>
            </button>
          </div>

          {activeTab === "list" && isAdmin && selectedReportIds.size > 0 && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const selectedReports = reports.filter((r) =>
                    selectedReportIds.has(r.id),
                  );
                  onPrintAll(selectedReports);
                }}
                className="bg-[#a88d44] hover:bg-[#8e7432] text-white border border-[#d4af37]/40 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Selecionados ({selectedReportIds.size})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const selectedReports = reports.filter((r) =>
                    selectedReportIds.has(r.id),
                  );
                  handleExportReportsPDF(selectedReports);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500/30 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>
                  Exportar Selecionados PDF ({selectedReportIds.size})
                </span>
              </button>
            </div>
          )}

          {activeTab === "list" &&
            isAdmin &&
            selectedReportIds.size === 0 &&
            filteredReports.length > 0 &&
            searchQuery.length > 2 && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onPrintAll(filteredReports)}
                  className="bg-slate-900 border border-slate-200 dark:border-slate-800 text-[#a88d44] px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 hover:bg-slate-800 shadow-sm transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir Consolidado ({filteredReports.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportReportsPDF(filteredReports)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500/30 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>
                    Exportar Consolidado PDF ({filteredReports.length})
                  </span>
                </button>
              </div>
            )}
          {activeTab === "list" &&
            isAdmin &&
            selectedReportIds.size === 0 &&
            searchQuery === "" && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onPrintAll(reports)}
                  className="bg-slate-900 border border-slate-200 dark:border-slate-800 text-[#a88d44] px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 hover:bg-slate-800 shadow-sm transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir Todos ({reports.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportReportsPDF(reports)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500/30 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Exportar Todos PDF ({reports.length})</span>
                </button>
              </div>
            )}
        </div>
      </ViewHeader>

      <AnimatePresence mode="wait">
        {activeTab === "new" ? (
          <motion.div
            key="new-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6 rounded-lg border border-border shadow-sm space-y-6"
          >
            <h3 className="text-sm font-bold text-primary uppercase tracking-wider">
              {editingId ? "Editar Relatório" : "Novo Relatório"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Turma / Sala
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => {
                    setSelectedClass(e.target.value);
                    setSelectedStudent("");
                  }}
                  className="w-full px-4 py-2 border rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
                >
                  <option value="">Selecione a turma...</option>
                  {renderClassOptions(getFilteredClasses(userProfile, schoolInfo.classes))}
                </select>
              </div>
              <div className="space-y-2 relative">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Aluno
                </label>
                <div className="relative group">
                  <input
                    type="text"
                    placeholder={
                      selectedClass
                        ? "Selecione ou digite..."
                        : "Busque por nome ou escolha turma..."
                    }
                    value={studentSearch || selectedStudent}
                    onChange={(e) => {
                      setStudentSearch(e.target.value);
                      setSelectedStudent(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => {
                      // Small delay to allow click on button before closing
                      setTimeout(() => setShowSuggestions(false), 200);
                    }}
                    className="w-full px-4 py-2 border border-border rounded-md text-sm outline-none focus:border-accent bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 pr-8 transition-all"
                  />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-700 dark:text-slate-300 pointer-events-none" />
                </div>

                {showSuggestions && (
                  <div className="absolute z-[110] left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-border rounded-md shadow-xl max-h-[300px] overflow-y-auto animate-in fade-in zoom-in-95 duration-200 ring-1 ring-black/5">
                    {/* Global Search Suggestions */}
                    {studentSuggestions.length > 0 && (
                      <div className="p-1 border-b border-slate-50">
                        <div className="px-3 py-1.5 text-[9px] font-black text-accent uppercase tracking-widest bg-accent/5 rounded mb-1">
                          Sugestões de Busca
                        </div>
                        {studentSuggestions.map((s, i) => (
                          <button
                            key={`sug-${i}`}
                            type="button"
                            onMouseDown={() => {
                              setSelectedStudent(s.name);
                              setStudentSearch("");
                              setShowSuggestions(false);
                              if (!selectedClass) {
                                const yearPref = s.year.split(" ")[0];
                                const firstClass = schoolInfo.classes.find(
                                  (c) => c.startsWith(yearPref),
                                );
                                if (firstClass) setSelectedClass(firstClass);
                              }
                            }}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 transition-colors flex justify-between items-center group rounded-sm"
                          >
                            <span className="font-bold text-slate-700 dark:text-slate-200 group-hover:text-accent">
                              {s.name}
                            </span>
                            <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-1.5 py-0.5 rounded">
                              {s.year}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Class-specific list */}
                    {selectedClass && studentsInClass.length > 0 && (
                      <div className="p-1">
                        <div className="px-3 py-1.5 text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded mb-1">
                          Alunos da {selectedClass}
                        </div>
                        {studentsInClass
                          .filter(
                            (s: any) =>
                              !studentSearch ||
                              s.name
                                .toLowerCase()
                                .includes(studentSearch.toLowerCase()),
                          )
                          .map((s: any, i: number) => (
                            <button
                              key={`class-${i}`}
                              type="button"
                              onMouseDown={() => {
                                setSelectedStudent(s.name);
                                setStudentSearch("");
                                setShowSuggestions(false);
                              }}
                              className={cn(
                                "w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 transition-colors flex justify-between items-center group rounded-sm mb-px",
                                selectedStudent === s.name
                                  ? "bg-accent/5 border-l-2 border-accent"
                                  : "",
                              )}
                            >
                              <span
                                className={cn(
                                  "font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-800 dark:text-slate-100",
                                  selectedStudent === s.name &&
                                    "font-bold text-accent",
                                )}
                              >
                                {s.name}
                              </span>
                              {selectedStudent === s.name && (
                                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                              )}
                            </button>
                          ))}
                      </div>
                    )}

                    {studentSuggestions.length === 0 &&
                      (!selectedClass || studentsInClass.length === 0) &&
                      studentSearch.length > 0 && (
                        <div className="p-4 text-center text-slate-600 dark:text-slate-400 text-xs italic">
                          Nenhum aluno encontrado...
                        </div>
                      )}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Disciplina
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-4 py-2 border rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
                >
                  <option value="">Selecione...</option>
                  {isAdmin
                    ? schoolInfo.subjects.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))
                    : (userProfile?.assigned_subjects || []).map(
                        (s: string) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ),
                      )}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Bimestre
                </label>
                <select
                  value={selectedBimester}
                  onChange={(e) => setSelectedBimester(e.target.value)}
                  className="w-full px-4 py-2 border rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
                >
                  <option value="1º Bimestre">1º Bimestre</option>
                  <option value="2º Bimestre">2º Bimestre</option>
                  <option value="3º Bimestre">3º Bimestre</option>
                  <option value="4º Bimestre">4º Bimestre</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Conteúdo do Relatório (Observações, Desempenho, Comportamento)
              </label>
              <DefaultEditor
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full border border-border rounded-md min-h-[200px]"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
              {editingId && (
                <button
                  onClick={() => {
                    setEditingId(null);
                    setContent("");
                    setSelectedStudent("");
                  }}
                  className="px-6 py-2 rounded-md font-bold text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                >
                  Cancelar Edição
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-primary text-white px-8 py-2 rounded-md font-bold text-sm shadow-sm hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="animate-spin w-4 h-4" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {editingId ? "Salvar Alterações" : "Salvar Relatório"}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="list-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {reports.filter(r => r.parentSignature).length > 0 && (
              <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4.5 text-left flex gap-3.5 items-start">
                <div className="bg-emerald-600 text-white p-2.5 rounded-2xl shrink-0 shadow-xs">
                  <Bell className="w-4 h-4 animate-bounce" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-black text-emerald-900 uppercase tracking-widest">Aviso de Ciência Eletrônica (Assinados pela Família)</h4>
                  <p className="text-[11px] text-emerald-700/90 font-bold mt-0.5">Os responsáveis registraram ciente no portal oficial para os seguintes relatórios:</p>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {reports.filter(r => r.parentSignature).slice(0, 6).map(sr => (
                      <div key={sr.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-emerald-100 p-2.5 rounded-xl flex flex-col gap-0.5 shadow-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded leading-none">
                            {sr.studentClass}
                          </span>
                          <span className="text-[9px] font-mono font-extrabold text-slate-600 dark:text-slate-400">
                            {sr.bimester}
                          </span>
                        </div>
                        <p className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase mt-1.5 truncate">
                          {sr.studentName}
                        </p>
                        <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 leading-none">
                          {sr.subject}
                        </p>
                        <p className="text-[9px] text-emerald-600/90 font-extrabold italic mt-2 border-t border-slate-50 pt-1">
                          ✓ {sr.parentSignature?.split(" em ")[0]}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg border border-border overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-border bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <h3 className="text-base font-bold text-primary">
                    Relatórios Enviados
                  </h3>
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 dark:text-slate-400" />
                    <input
                      type="text"
                      placeholder="Busca rápida geral..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-border rounded-md text-sm outline-none focus:border-accent bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-inner"
                    />
                  </div>
                </div>

                {/* Advanced Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                      Filtrar Turma
                    </label>
                    <select
                      value={filterClass}
                      onChange={(e) => setFilterClass(e.target.value)}
                      className="w-full px-3 py-1.5 border rounded-md font-medium bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
                    >
                      <option value="">Todas as turmas</option>
                      {getFilteredClasses(userProfile, schoolInfo.classes).map(
                        (c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                  <div className="space-y-1 relative">
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                      Filtrar Aluno
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={
                          filterClass ? "Escolha o aluno..." : "Todos os alunos"
                        }
                        value={listSearch || filterStudent}
                        onChange={(e) => {
                          setListSearch(e.target.value);
                          setFilterStudent(e.target.value);
                          setShowListSuggestions(true);
                        }}
                        onFocus={() => setShowListSuggestions(true)}
                        onBlur={() =>
                          setTimeout(() => setShowListSuggestions(false), 200)
                        }
                        className="w-full px-3 py-1.5 border border-border rounded-md text-[13px] outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 pr-7 font-medium cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowListSuggestions(!showListSuggestions)
                        }
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {showListSuggestions &&
                      listStudentSuggestions.length > 0 && (
                        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-border rounded-md shadow-lg py-1 max-h-56 overflow-y-auto animate-in fade-in slide-in-from-top-1">
                          <button
                            onMouseDown={() => {
                              setFilterStudent("");
                              setListSearch("");
                              setShowListSuggestions(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 uppercase tracking-widest border-b border-slate-50"
                          >
                            Limpar Filtro
                          </button>
                          {listStudentSuggestions.map((name, i) => (
                            <button
                              key={i}
                              onMouseDown={() => {
                                setFilterStudent(name);
                                setListSearch("");
                                setShowListSuggestions(false);
                              }}
                              className={cn(
                                "w-full text-left px-3 py-2 text-[12px] hover:bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-bold transition-colors",
                                filterStudent === name
                                  ? "text-accent bg-accent/5"
                                  : "text-slate-700 dark:text-slate-300",
                              )}
                            >
                              {name}
                            </button>
                          ))}
                        </div>
                      )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                      Filtrar Disciplina
                    </label>
                    <select
                      value={filterSubject}
                      onChange={(e) => setFilterSubject(e.target.value)}
                      className="w-full px-3 py-1.5 border rounded-md font-medium bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
                    >
                      <option value="">Todas disciplinas</option>
                      {schoolInfo.subjects.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                      Filtrar Bimestre
                    </label>
                    <select
                      value={filterBimester}
                      onChange={(e) => setFilterBimester(e.target.value)}
                      className="w-full px-3 py-1.5 border rounded-md font-medium bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
                    >
                      <option value="">Todos bimesters</option>
                      {[
                        "1º Bimestre",
                        "2º Bimestre",
                        "3º Bimestre",
                        "4º Bimestre",
                      ].map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* DESKTOP VIEW */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-collapse text-sm text-left">
                  <thead className="bg-[#800020] text-white text-white">
                <tr className="transition-colors">
                      {isAdmin && (
                        <th className="px-5 py-3 border-b border-r border-slate-200 dark:border-slate-800  uppercase font-black text-[10px] tracking-wider text-center w-12 text-white">
                          <input
                            type="checkbox"
                            className="rounded border-slate-200 dark:border-slate-800 text-accent focus:ring-accent cursor-pointer w-4 h-4"
                            checked={
                              filteredReports.length > 0 &&
                              selectedReportIds.size === filteredReports.length
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedReportIds(
                                  new Set(filteredReports.map((r) => r.id)),
                                );
                              } else {
                                setSelectedReportIds(new Set());
                              }
                            }}
                          />
                        </th>
                      )}
                      <th className="px-5 py-3 border-b  uppercase font-black text-[10px] tracking-wider text-white">
                        Aluno
                      </th>
                      <th className="px-5 py-3 border-b  uppercase font-black text-[10px] tracking-wider text-white">
                        Turma
                      </th>
                      {isAdmin && (
                        <th className="px-5 py-3 border-b  uppercase font-black text-[10px] tracking-wider font-mono text-white">
                          Professor
                        </th>
                      )}
                      <th className="px-5 py-3 border-b  uppercase font-black text-[10px] tracking-wider border-l border-slate-200 dark:border-slate-800 text-white">
                        Disciplina
                      </th>
                      <th className="px-5 py-3 border-b  uppercase font-black text-[10px] tracking-wider text-white">
                        Bimestre
                      </th>
                      <th className="px-5 py-3 border-b  uppercase font-black text-[10px] tracking-wider text-white">
                        Assinatura
                      </th>
                      <th className="px-5 py-3 border-b  uppercase font-black text-[10px] tracking-wider font-mono text-white">
                        Data
                      </th>
                      <th className="px-5 py-3 border-b  uppercase font-black text-[10px] tracking-wider text-white">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredReports.map((r) => (
                      <tr
                        key={r.id}
                        className={cn(
                          "hover:bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100/ transition-colors",
                          selectedReportIds.has(r.id) && "bg-accent/5",
                        )}
                      >
                        {isAdmin && (
                          <td className="px-5 py-4 border-r border-slate-200 dark:border-slate-800 text-center">
                            <input
                              type="checkbox"
                              className="rounded border-slate-200 dark:border-slate-800 text-accent focus:ring-accent cursor-pointer w-4 h-4"
                              checked={selectedReportIds.has(r.id)}
                              onChange={() => {
                                const newSelected = new Set(selectedReportIds);
                                if (newSelected.has(r.id)) {
                                  newSelected.delete(r.id);
                                } else {
                                  newSelected.add(r.id);
                                }
                                setSelectedReportIds(newSelected);
                              }}
                            />
                          </td>
                        )}
                        <td className="px-5 py-4 font-bold text-slate-700 dark:text-slate-200">
                          {r.studentName}
                        </td>
                        <td className="px-5 py-4 text-slate-700 dark:text-slate-300 font-mono text-xs">
                          {r.studentClass}
                        </td>
                        {isAdmin && (
                          <td className="px-5 py-4 text-slate-700 dark:text-slate-300 text-[11px] font-medium leading-tight max-w-[120px]">
                            {r.professorName}
                          </td>
                        )}
                        <td className="px-5 py-4 text-slate-700 dark:text-slate-300 font-bold border-l border-slate-200 dark:border-slate-800">
                          {r.subject}
                        </td>
                        <td className="px-5 py-4">
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded text-[10px] font-black uppercase whitespace-nowrap">
                            {r.bimester}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {r.parentSignature ? (
                            <div className="flex flex-col text-left">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 w-fit" title={r.parentSignature}>
                                <Check className="w-2.5 h-2.5 text-emerald-600" />
                                Assinado
                              </span>
                              <span className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 font-medium truncate max-w-[130px] block" title={r.parentSignature}>
                                {r.parentSignature.replace("Assinado eletronicamente por ", "")}
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 whitespace-nowrap">
                              <Clock className="w-2.5 h-2.5 text-slate-700 dark:text-slate-300" />
                              Pendente
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-slate-700 dark:text-slate-300 font-mono text-xs">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                          <button
                            onClick={() => onPrint(r)}
                            className="text-accent font-bold hover:underline flex items-center gap-1 whitespace-nowrap"
                          >
                            <Printer className="w-4 h-4" />
                            Imprimir
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExportReportsPDF([r])}
                            className="text-emerald-600 font-bold hover:underline flex items-center gap-1 whitespace-nowrap"
                          >
                            <FileText className="w-4 h-4 text-emerald-600" />
                            Exportar PDF
                          </button>
                          <button
                            type="button"
                            disabled={loadingActionReportId === r.id || (r.familyPortalStatus === 'Pendente' && !isAdmin)}
                            onClick={() => {
                               if (r.familyPortalStatus === 'Pendente' && !isAdmin) return;
                               handleActionFamilyPortal(r, r.familyPortalStatus === 'Aprovado' ? 'revoke' : (r.familyPortalStatus === 'Pendente' && isAdmin ? 'approve' : 'send'))
                            }}
                            className={`font-bold hover:underline flex items-center gap-1 whitespace-nowrap disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed ${r.familyPortalStatus === 'Aprovado' ? 'text-amber-600' : (r.familyPortalStatus === 'Pendente' ? 'text-orange-500' : 'text-indigo-600')}`}
                          >
                            {loadingActionReportId === r.id ? (
                               <Loader2 className="w-4 h-4 animate-spin" />
                            ) : r.familyPortalStatus === 'Pendente' && !isAdmin ? (
                               <Clock className="w-4 h-4 text-orange-500 animate-pulse" />
                            ) : (
                               <SendIcon className="w-4 h-4" />
                            )}
                            {r.familyPortalStatus === 'Aprovado' ? 'Revogar do Portal' : (r.familyPortalStatus === 'Pendente' ? (isAdmin ? 'Aprovar p/ Família' : 'Aguardando Coordenação') : 'Enviar p/ Família')}
                          </button>
                          {(isAdmin ||
                            r.professorId === user.id ||
                            (userProfile &&
                              (r.professorId === userProfile.id ||
                                r.professorId === userProfile.uid))) && (
                            <>
                              <button
                                onClick={() => handleEdit(r)}
                                className="text-blue-600 font-bold hover:underline flex items-center gap-1 whitespace-nowrap"
                              >
                                <Pencil className="w-4 h-4" />
                                Editar
                              </button>
                              <button
                                onClick={() => handleDelete(r.id)}
                                className="text-red-400 font-bold hover:underline flex items-center gap-1 whitespace-nowrap"
                              >
                                <Trash2 className="w-4 h-4" />
                                Excluir
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                    {reports.length === 0 && (
                      <tr>
                        <td
                          colSpan={isAdmin ? 8 : 7}
                          className="px-5 py-10 text-center text-slate-600 dark:text-slate-400 italic"
                        >
                          Nenhum relatório encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS VIEW */}
              <div className="block md:hidden space-y-4">
                {filteredReports.map((r) => (
                  <div
                    key={r.id}
                    className={cn(
                      "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl border border-slate-200 dark:border-slate-800/80 p-5 shadow-sm space-y-4 flex flex-col transition-all",
                      selectedReportIds.has(r.id) &&
                        "border-accent bg-accent/5 ring-1 ring-accent/30",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        {isAdmin && (
                          <input
                            type="checkbox"
                            className="rounded border-slate-200 dark:border-slate-800 text-accent focus:ring-accent cursor-pointer w-4 h-4"
                            checked={selectedReportIds.has(r.id)}
                            onChange={() => {
                              const newSelected = new Set(selectedReportIds);
                              if (newSelected.has(r.id)) {
                                newSelected.delete(r.id);
                              } else {
                                newSelected.add(r.id);
                              }
                              setSelectedReportIds(newSelected);
                            }}
                          />
                        )}
                        <div className="text-left">
                          <h4 className="font-extrabold text-slate-700 dark:text-slate-200 uppercase text-xs tracking-tight leading-snug">
                            {r.studentName}
                          </h4>
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-1.5 py-0.5 rounded text-[9px] font-black uppercase inline-block mt-1 font-mono">
                            {r.studentClass}
                          </span>
                        </div>
                      </div>
                      <span className="bg-emerald-55 text-emerald-800 border border-emerald-100/45 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase whitespace-nowrap tracking-wider font-sans">
                        {r.bimester}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-y-3 gap-x-1 text-left text-xs border-t border-b border-dashed border-slate-200 dark:border-slate-800 py-3 mt-1">
                      <div>
                        <span className="text-slate-600 dark:text-slate-400 font-extrabold text-[8px] tracking-wider uppercase block mb-0.5">
                          Disciplina
                        </span>
                        <span className="text-slate-700 dark:text-slate-300 font-bold">
                          {r.subject}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-600 dark:text-slate-400 font-extrabold text-[8px] tracking-wider uppercase block mb-0.5">
                          Emissão
                        </span>
                        <span className="text-slate-700 dark:text-slate-300 font-mono font-bold">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-600 dark:text-slate-400 font-extrabold text-[8px] tracking-wider uppercase block mb-0.5">
                          Assinatura
                        </span>
                        {r.parentSignature ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px] leading-tight" title={r.parentSignature}>
                            ✓ Assinado
                          </span>
                        ) : (
                          <span className="text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1 text-[10.5px] leading-tight">
                            Pendente
                          </span>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="col-span-2 pt-1.5 border-t border-slate-200 dark:border-slate-800">
                          <span className="text-slate-600 dark:text-slate-400 font-extrabold text-[8px] tracking-wider uppercase block mb-0.5">
                            Professor(a)
                          </span>
                          <span className="text-slate-700 dark:text-slate-300 font-semibold text-[11px] leading-tight block">
                            {r.professorName}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions Row */}
                    <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2.5 pt-1.5">
                      <button
                        type="button"
                        onClick={() => onPrint(r)}
                        className="text-accent font-bold hover:underline flex items-center gap-1.5 whitespace-nowrap text-xs py-1 px-2 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-3005 border border-slate-200 dark:border-slate-800"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Imprimir
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportReportsPDF([r])}
                        className="text-emerald-600 font-bold hover:underline flex items-center gap-1.5 whitespace-nowrap text-xs py-1 px-2 rounded-lg bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-100/30"
                      >
                        <FileText className="w-3.5 h-3.5 text-emerald-600" />
                        Exportar PDF
                      </button>
                      <button
                        type="button"
                        disabled={loadingActionReportId === r.id || (r.familyPortalStatus === 'Pendente' && !isAdmin)}
                        onClick={() => {
                           if (r.familyPortalStatus === 'Pendente' && !isAdmin) return;
                           handleActionFamilyPortal(r, r.familyPortalStatus === 'Aprovado' ? 'revoke' : (r.familyPortalStatus === 'Pendente' && isAdmin ? 'approve' : 'send'))
                        }}
                        className={`font-bold hover:underline flex items-center gap-1.5 whitespace-nowrap text-xs py-1 px-2 rounded-lg border disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed ${r.familyPortalStatus === 'Aprovado' ? 'text-amber-600 bg-amber-50 border-amber-100' : (r.familyPortalStatus === 'Pendente' ? 'text-orange-500 bg-orange-50 border-orange-100' : 'text-indigo-600 bg-indigo-50 border-indigo-100')}`}
                      >
                        {loadingActionReportId === r.id ? (
                           <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : r.familyPortalStatus === 'Pendente' && !isAdmin ? (
                           <Clock className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
                        ) : (
                           <SendIcon className="w-3.5 h-3.5" />
                        )}
                        {r.familyPortalStatus === 'Aprovado' ? 'Revogar' : (r.familyPortalStatus === 'Pendente' ? (isAdmin ? 'Aprovar Envio' : 'Aguard. Coord.') : 'Enviar Família')}
                      </button>
                      {(isAdmin ||
                        r.professorId === user.id ||
                        (userProfile &&
                          (r.professorId === userProfile.id ||
                            r.professorId === userProfile.uid))) && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleEdit(r)}
                            className="text-blue-600 font-bold hover:underline flex items-center gap-1.5 whitespace-nowrap text-xs py-1 px-2 rounded-lg bg-blue-50/50 hover:bg-blue-50 border border-blue-100/30"
                          >
                            <Pencil className="w-3.5 h-3.5 text-blue-600" />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(r.id)}
                            className="text-red-500 font-bold hover:underline flex items-center gap-1.5 whitespace-nowrap text-xs py-1 px-2 rounded-lg bg-red-50/50 hover:bg-red-55 border border-red-100/30"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            Excluir
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {filteredReports.length === 0 && (
                  <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-12 text-center text-slate-600 dark:text-slate-400 font-bold italic border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm uppercase text-xs">
                    Nenhum relatório encontrado.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OFF-SCREEN RENDER CONTAINER FOR OBSERVATION REPORTS PDF GENERATION */}
      {isExportingPDF && pdfReportsToRender.length > 0 && (
        <div
          id="pdf-reports-offscreen-render"
          style={{
            position: "fixed",
            left: "-9999px",
            top: "-9999px",
            width: "1024px",
            zIndex: -99999,
            backgroundColor: "#ffffff",
          }}
        >
          {pdfReportsToRender.map((report, idx) => (
            <div
              key={`pdf-report-${report.id}-${idx}`}
              className="report-pdf-page bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-12 text-black w-[1024px]"
              style={{
                backgroundColor: "#ffffff",
                color: "#000000",
                boxSizing: "border-box",
              }}
            >
              <div className="flex border-4 border-black p-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 mb-6">
                <div className="border-[3px] border-black border-dashed flex items-center justify-between p-4 w-full">
                  <div className="flex items-center gap-4">
                    <img
                      src={LOGO_VINHO}
                      alt="Logo"
                      className="w-14 h-14 object-contain"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h2 className="text-[#800020] font-black text-2xl uppercase font-serif tracking-tight leading-none">
                        Colégio Progresso
                      </h2>
                      <p className="text-[10px] text-slate-700 dark:text-slate-300 font-extrabold uppercase tracking-widest mt-1">
                        SANTISTA
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="bg-[#800020] text-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md text-white">
                      {report.bimester}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-center mb-8">
                <h3 className="text-xl font-black text-[#800020] uppercase border-b-2 border-black pb-2 inline-block">
                  Relatório de Acompanhamento Escolar
                </h3>
              </div>

              <div className="border-[3px] border-black p-4 space-y-3 mb-6 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-left">
                  <div>
                    <span className="text-slate-600 dark:text-slate-400 font-bold uppercase text-[9px] block">
                      Estudante
                    </span>
                    <span className="font-extrabold text-slate-700 dark:text-slate-200 uppercase">
                      {report.studentName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600 dark:text-slate-400 font-bold uppercase text-[9px] block">
                      Turma / Período
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {report.studentClass}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600 dark:text-slate-400 font-bold uppercase text-[9px] block">
                      Disciplina Curricular
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {report.subject}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600 dark:text-slate-400 font-bold uppercase text-[9px] block">
                      Professor(a) Responsável
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {report.professorName || "Administração Pedagógica"}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-600 dark:text-slate-400 font-bold uppercase text-[9px] block">
                      Data de Emissão
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {new Date(report.createdAt).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-[3px] border-black p-6 space-y-4 flex-1 text-left">
                <h4 className="font-black text-[11px] text-[#800020] uppercase tracking-widest border-b border-slate-205 pb-1">
                  Desenvolvimento & Observações Pedagógicas
                </h4>
                <div
                  className="text-slate-700 dark:text-slate-200 text-xs leading-relaxed space-y-2 whitespace-pre-wrap font-sans"
                  style={{ minHeight: "320px" }}
                  dangerouslySetInnerHTML={{ __html: report.content }}
                />
              </div>

              <div className="mt-16 pt-8 border-t-2 border-dashed border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-8 text-center">
                <div className="flex flex-col items-center">
                  <div className="w-56 border-b border-black h-8 mb-1"></div>
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Assinatura do Responsável
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-56 border-b border-black h-8 mb-1"></div>
                  <span className="text-[10px] font-bold text-[#800020] uppercase tracking-wider">
                    Coordenação Pedagógica
                  </span>
                </div>
              </div>

              {idx < pdfReportsToRender.length - 1 && (
                <div
                  style={{
                    pageBreakAfter: "always",
                    breakAfter: "page",
                    height: "1px",
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* OVERLAY LOADER */}
      {isExportingPDF && (
        <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-sm flex items-center justify-center z-[99999] no-print">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col items-center max-w-sm text-center space-y-4">
            <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
            <h3 className="font-black text-slate-700 dark:text-slate-200 uppercase text-xs tracking-wider">
              Exportando Relatório(s)
            </h3>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-bold leading-relaxed uppercase">
              {pdfProgress || "Processando arquivo PDF..."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function StudentReportPrintView({
  reports,
  onBack,
}: {
  reports: StudentReport[];
  onBack: () => void;
}) {
  const schoolInfo = getSchoolInfo();
  const [isExporting, setIsExporting] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");

  const getReportFilename = (rep: StudentReport) => {
    const formatForFilename = (str: string) => {
      return str
        .replace(/[^\w\s-]/gi, '')
        .trim()
        .replace(/\s+/g, '_');
    };
    const formatClassForFilename = (str: string) => {
      return str.replace(/[^a-zA-Z0-9]/g, '');
    };
    
    let dateStr = "";
    try {
      const d = rep.createdAt ? new Date(rep.createdAt) : new Date();
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      dateStr = `${day}_${month}_${year}`;
    } catch (e) {
      const d = new Date();
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      dateStr = `${day}_${month}_${year}`;
    }
    
    return `Relatório_${formatForFilename(rep.studentName)}_${formatClassForFilename(rep.studentClass)}_${dateStr}`;
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    setProgressMsg("Iniciando geração de PDF estruturado...");
    try {
      const filename =
        reports.length === 1
          ? getReportFilename(reports[0])
          : `Relatorios_Lote_${reports.length}_alunos`;

      // Delay to let UI mount
      await new Promise((resolve) => setTimeout(resolve, 500));

      await exportMultipleToPDF("report-print-page", filename, (msg) => {
        setProgressMsg(msg);
      });
    } catch (err) {
      console.error("Erro exportando PDF:", err);
      alert("Houve um erro ao exportar o PDF.");
    } finally {
      setIsExporting(false);
      setProgressMsg("");
    }
  };

  useEffect(() => {
    const originalTitle = document.title;
    if (reports.length === 1) {
      document.title = getReportFilename(reports[0]);
    } else {
      document.title = `Relatorios_Lote_${reports.length}_alunos`;
    }
    return () => {
      document.title = originalTitle;
    };
  }, [reports]);

  return (
    <div className="space-y-12 print-container">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between print:hidden no-print p-4 sm:p-6 md:p-8 border-b border-border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 sticky top-0 z-20 w-full">
        <button
          onClick={onBack}
          className="text-slate-700 dark:text-slate-300 font-bold hover:text-primary flex items-center gap-2 text-xs sm:text-sm md:text-base cursor-pointer"
        >
          ← Voltar ao Sistema
        </button>
        <div className="flex flex-row gap-2 sm:gap-3 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex-1 sm:flex-initial bg-emerald-600 text-white px-3 sm:px-6 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 hover:bg-emerald-700 shadow-sm disabled:opacity-50 transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>{isExporting ? "Exportando..." : "Exportar de Fato para PDF"}</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex-1 sm:flex-initial bg-accent text-white px-3 sm:px-6 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 hover:bg-accent/90 shadow-sm transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Imprimir Agora</span>
          </button>
        </div>
      </div>

      <div className="print-content space-y-12 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 py-10 print:p-0 print:bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 print:space-y-0">
        {reports.map((report, idx) => {
          // Lookup full student name
          let fullStudentName = report.studentName;
          const classYearMatch = report.studentClass.match(/^(\d+)º/);
          if (classYearMatch) {
            const yearKey = `${classYearMatch[1]}º ano`;
            const yearStudents = schoolInfo.studentsDB[yearKey] || [];
            // Try exact or prefix match
            const studentMatch = yearStudents.find((s) =>
              s.name.toUpperCase().startsWith(report.studentName.toUpperCase()),
            );
            if (studentMatch) {
              fullStudentName = studentMatch.name;
            }
          }

          return (
            <React.Fragment key={report.id}>
              <div
                className={cn(
                  "report-print-page bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-4 sm:p-8 md:p-16 print:p-8 print:py-12 border border-border max-w-[210mm] mx-auto shadow-sm print:border-none print:shadow-none print:m-0 print:w-[210mm] flex flex-col print:min-h-[297mm] relative print:relative w-full",
                  idx === reports.length - 1
                    ? ""
                    : "break-after-page print:break-after-page",
                )}
              >
                {/* Header */}
                <div className="border-b-2 border-primary pb-4 sm:pb-8 mb-6 sm:mb-10 print:pb-4 print:mb-6 flex flex-col min-[480px]:flex-row gap-4 items-center min-[480px]:justify-between print:flex-row print:items-center print:justify-between">
                  <div className="flex flex-col min-[480px]:flex-row items-center gap-3 sm:gap-6 print:flex-row print:items-center print:gap-6 text-center min-[480px]:text-left">
                    <img
                      src={LOGO_VINHO}
                      alt="Logo"
                      className="w-12 h-12 sm:w-16 sm:h-16 object-contain shrink-0"
                    />
                    <div className="flex flex-col">
                      <h1 className="text-base sm:text-2xl print:text-2xl font-black text-primary uppercase tracking-tight">
                        Colégio Progresso Santista
                      </h1>
                      <p className="text-[9px] sm:text-xs print:text-xs text-slate-700 dark:text-slate-300 font-bold uppercase tracking-[2px] sm:tracking-[3px] mt-1 border-t border-slate-200 dark:border-slate-800 pt-1">
                        Educação por Excelência ⬢ Sistema COC
                      </p>
                    </div>
                  </div>
                  <div className="text-center min-[480px]:text-right shrink-0">
                    <span className="bg-primary text-white px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest leading-none">
                      {report.bimester}
                    </span>
                  </div>
                </div>

                <div className="text-center mb-6 sm:mb-12 print:mb-6">
                  <h2 className="text-sm sm:text-xl print:text-xl font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest border-b-2 border-slate-200 dark:border-slate-800 inline-block pb-1">
                    Relatório de Acompanhamento Escolar
                  </h2>
                </div>

                {/* Student Info Box */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-slate-200 border-2 border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden mb-6 sm:mb-12 print:mb-6 shadow-sm">
                  <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-3 sm:p-4 print:p-3">
                    <label className="block text-[8px] sm:text-[10px] font-black text-primary uppercase mb-1">
                      Nome do Aluno:
                    </label>
                    <div className="font-bold text-slate-700 dark:text-slate-200 text-sm sm:text-lg uppercase truncate">
                      {fullStudentName}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-3 sm:p-4 print:p-3">
                    <label className="block text-[8px] sm:text-[10px] font-black text-primary uppercase mb-1">
                      Turma:
                    </label>
                    <div className="font-black text-primary text-sm sm:text-xl uppercase tracking-widest">
                      {report.studentClass}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-3 sm:p-4 print:p-3">
                    <label className="block text-[8px] sm:text-[10px] font-black text-primary uppercase mb-1">
                      Disciplina:
                    </label>
                    <div className="font-bold text-slate-700 dark:text-slate-200 text-xs sm:text-sm">
                      {report.subject}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-3 sm:p-4 print:p-3">
                    <label className="block text-[8px] sm:text-[10px] font-black text-primary uppercase mb-1">
                      Data da Emissão:
                    </label>
                    <div className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200">
                      {new Date(report.createdAt).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 space-y-4 sm:space-y-6">
                  <h3 className="text-[10px] sm:text-xs font-black text-primary uppercase border-l-4 border-primary pl-3 mb-2 sm:mb-4 tracking-wider">
                    Desenvolvimento e Observações Pedagógicas:
                  </h3>
                  <div
                    className="text-xs sm:text-base text-slate-800 dark:text-slate-200 leading-[1.8] text-justify font-medium q-text-html-container border border-slate-200 dark:border-slate-800 p-4 sm:p-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 print:bg-transparent print:p-0 print:border-none print:shadow-none"
                    dangerouslySetInnerHTML={{ __html: report.content }}
                  />
                </div>

                {/* Footer Signatures and School Name wrapper to prevent breaking across pages */}
                <div className="mt-auto pt-8 sm:pt-12 print:pt-6 print-avoid-break flex flex-col">
                  {/* Signatures */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-6 sm:gap-10">
                    <div className="border-t-2 border-slate-200 dark:border-slate-800 pt-3 sm:pt-4 text-center">
                      <div className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 uppercase mb-1">
                        {report.professorName}
                      </div>
                      <div className="text-[8px] sm:text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                        Professor(a) Responsável
                      </div>
                    </div>
                    <div className="border-t-2 border-slate-200 dark:border-slate-800 pt-3 sm:pt-4 text-center flex flex-col items-center justify-end">
                      {report.parentSignature ? (
                        <div className="text-[9px] sm:text-[9.5px] text-emerald-700 font-extrabold leading-tight mb-2 max-w-[180px] text-center italic bg-emerald-50/50 p-2 rounded-xl border border-emerald-100 flex flex-col items-center">
                          <span className="text-[7px] sm:text-[8px] uppercase tracking-wider text-emerald-800 font-black mb-0.5 block">✓ CIÊNCIA REGISTRADA</span>
                          <span className="leading-tight text-center font-sans whitespace-pre-wrap">{report.parentSignature}</span>
                        </div>
                      ) : (
                        <div className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 uppercase mb-1 invisible">
                          Pendente
                        </div>
                      )}
                      <div className="text-[8px] sm:text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mt-auto">
                        Responsável
                      </div>
                    </div>
                    <div className="border-t-2 border-slate-200 dark:border-slate-800 pt-3 sm:pt-4 text-center">
                      <div className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 uppercase mb-1 invisible">
                        Coordenação
                      </div>
                      <div className="text-[8px] sm:text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                        Coordenação Pedagógica
                      </div>
                    </div>
                  </div>

                  {/* School name always at the bottom of the printed page element block */}
                  <div className="pt-6 sm:pt-8 print:pt-4 text-center mt-auto print:absolute print:bottom-4 print:left-0 print:right-0 print:pt-0">
                    <p className="text-[8px] sm:text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-[4px]">
                      Colégio Progresso Santista
                    </p>
                  </div>
                </div>
              </div>
              {idx < reports.length - 1 && (
                <PageBreakSeparator pageNumber={idx + 1} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* OVERLAY LOADER */}
      {isExporting && (
        <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-sm flex items-center justify-center z-[99999] no-print">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col items-center max-w-sm text-center space-y-4">
            <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
            <h3 className="font-black text-slate-700 dark:text-slate-200 uppercase text-xs tracking-wider">
              Exportando Relatório(s)
            </h3>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-bold leading-relaxed uppercase">
              {progressMsg || "Processando arquivo PDF..."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// --- DIGITAL DIARY VIEW (PROESC STYLE) ---
function DigitalDiaryView({
  user,
  isAdmin,
  userProfile,
  setView,
  onConfigChange,
  absenceJustifications = [],
  onDuplicateExam,
  refreshTrigger,
  checkAndResolveExamConflict,
  onRefreshParentExams,
  onRefreshParentResults,
}: {
  user: User;
  isAdmin: boolean;
  userProfile: any;
  setView: (v: any) => void;
  onConfigChange: (config: any) => void;
  absenceJustifications?: any[];
  onDuplicateExam: (exam: Exam) => void;
  refreshTrigger?: number;
  checkAndResolveExamConflict: (
    targetClass: string,
    targetBimester: string,
    targetSubject: string,
    targetType: string
  ) => Promise<{ proceed: boolean; error?: any }>;
  onRefreshParentExams?: () => void;
  onRefreshParentResults?: () => void;
}) {
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedBimester, setSelectedBimester] = useState("1º Bimestre");
  const [diaryTab, setDiaryTab] = useState<
    "schedule" | "attendance" | "grades"
  >("schedule");
  const [bimesterAttendance, setBimesterAttendance] = useState<Attendance[]>(
    [],
  );

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<Result[]>([]);

  const [loading, setLoading] = useState(false);
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  const [newDate, setNewDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [newContent, setNewContent] = useState("");
  const [newCount, setNewCount] = useState(2);
  const [isHoliday, setIsHoliday] = useState(false);

  // Generator State
  const [showCronogramaGenerator, setShowCronogramaGenerator] = useState(false);
  const [showCopyDiary, setShowCopyDiary] = useState(false);
  const [targetCopyClass, setTargetCopyClass] = useState("");
  const [generatorStartDate, setGeneratorStartDate] = useState("");
  const [generatorEndDate, setGeneratorEndDate] = useState("");
  const [generatorDays, setGeneratorDays] = useState<Record<number, number>>({
    0: 0,
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
  });

  const [viewingAttendance, setViewingAttendance] = useState<Lesson | null>(
    null,
  );
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [launchingGradesFor, setLaunchingGradesFor] = useState<Exam | null>(
    null,
  );
  const [gradeInputs, setGradeInputs] = useState<{ [key: string]: number }>({});
  const [savingGrades, setSavingGrades] = useState(false);
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [bulkGrades, setBulkGrades] = useState<Record<string, number>>({});
  const [savingBulk, setSavingBulk] = useState(false);
  const [showOnlyBelowAverage, setShowOnlyBelowAverage] = useState(false);
  const [showOnlyBelowAvgMain, setShowOnlyBelowAvgMain] = useState(false);

  const calculateStudentBaseAvg = (studentName: string) => {
    const studentResults = results.filter((r) => r.studentName === studentName);
    const regularResults = studentResults.filter((r) => {
      const ex = exams.find((e) => e.id === r.examId);
      const isScoreValid = r.score !== null && r.score !== undefined && r.score !== "" && !isNaN(Number(r.score));
      return ex && !ex.examType?.toLowerCase().includes("recuperação") && isScoreValid;
    });
    return regularResults.length > 0
      ? regularResults.reduce(
          (acc, r) => acc + (Number(r.score) / r.maxScore) * 10,
          0,
        ) / regularResults.length
      : 0;
  };

  const isAuthorized = (
    cls: string = selectedClass,
    sub: string = selectedSubject,
  ) => {
    if (isAdmin) return true;
    const assignedSubjects = userProfile?.assigned_subjects || [];
    const assignedClasses = userProfile?.assigned_classes || [];
    
    const normalize = (s: string) => {
      if (!s) return "";
      return s.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/lingua\s+/gi, "")
        .replace(/estrangeira\s*-\s*/gi, "")
        .trim();
    };

    const normSub = normalize(sub);
    const hasSubject = assignedSubjects.some((asSub: string) => {
      const normAsSub = normalize(asSub);
      return normAsSub === normSub || 
             normAsSub.startsWith(normSub) || 
             normSub.startsWith(normAsSub) || 
             normAsSub.includes(normSub) || 
             normSub.includes(normAsSub);
    });

    const examClasses = (cls || "")
      .split(",")
      .map((c: string) => c.trim())
      .filter(Boolean);
    const hasClass =
      examClasses.length === 0 ||
      examClasses.some((c: string) => assignedClasses.includes(c));
    return hasSubject && hasClass;
  };

  const schoolInfo = getSchoolInfo();
  // Filter subjects based on defined class_subjects. If none defined for this class, show all.
  const subjects = useMemo(() => {
    if (isAdmin) return schoolInfo.subjects;
    if (!selectedClass) return schoolInfo.subjects;
    const defined = schoolInfo.class_subjects[selectedClass];
    return defined && defined.length > 0 ? defined : schoolInfo.subjects;
  }, [schoolInfo, selectedClass, isAdmin]);

  const classes = getFilteredClasses(userProfile, schoolInfo.classes);
  const bimesters = [
    "1º Bimestre",
    "2º Bimestre",
    "3º Bimestre",
    "4º Bimestre",
    "Conselho de Classe",
    "Prova Final",
    "Recuperação",
  ];

  const [newExamTitle, setNewExamTitle] = useState("");
  const [newExamDate, setNewExamDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [newExamType, setNewExamType] = useState("PI");
  const [showAddExam, setShowAddExam] = useState(false);
  const [savingExam, setSavingExam] = useState(false);

  // -- Duplicate Exam --
  const handleDuplicateExam = async (exam: Exam) => {
    if (!isAuthorized()) {
      alert(
        "Acesso Negado: Você não tem autorização para criar avaliações nesta turma.",
      );
      return;
    }
    if (!window.confirm("Deseja duplicar esta prova?")) return;
    try {
      const { error } = await supabase.from("exams").insert({
        professor_id: user.id,
        title: `${exam.title} (Cópia)`,
        subject: exam.subject,
        exam_type: exam.examType,
        exam_date: exam.examDate || new Date().toISOString().split("T")[0],
        class_year: exam.classYear,
        bimester: exam.bimester,
        questions: exam.questions || [],
        answer_key: exam.answerKey || {
          _metadata: {
            isExternal: true,
            bimester: exam.bimester,
            examType: exam.examType,
          },
        },
      });
      if (error) throw error;
      fetchData();
      if (onRefreshParentExams) onRefreshParentExams();
      alert("Avaliação duplicada com sucesso!");
    } catch (err: any) {
      alert("Erro ao duplicar: " + err.message);
    }
  };

  useEffect(() => {
    if (selectedClass && selectedSubject && selectedBimester) {
      fetchData();
    }
  }, [selectedClass, selectedSubject, selectedBimester, refreshTrigger]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Lessons
      const { data: lessonData } = await supabase
        .from("lessons")
        .select("*")
        .eq("class_id", selectedClass)
        .eq("subject", selectedSubject)
        .eq("bimester", selectedBimester)
        .order("date", { ascending: false });

      setLessons(lessonData || []);

      if (lessonData && lessonData.length > 0) {
        const lessonIds = lessonData.map((l) => l.id);
        const { data: attData } = await supabase
          .from("attendance")
          .select("*")
          .in("lesson_id", lessonIds);
        setBimesterAttendance(attData || []);
      } else {
        setBimesterAttendance([]);
      }

      // Fetch Exams for this class/subject
      const { data: examData } = await supabase
        .from("exams")
        .select("*")
        .ilike("class_year", `%${selectedClass}%`)
        .eq("subject", selectedSubject)
        .eq("bimester", selectedBimester);

      setExams(
        (examData || [])
          .map((exam) => {
            const meta = exam.answer_key?._metadata || {};
            return {
              ...exam,
              questions: [],
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
              createdAt: exam.created_at,
              isDiaryOnly: meta.isDiaryOnly === true,
              deletedAt: meta.deletedAt || null,
            };
          })
          .filter((e) => !e.deletedAt),
      );

      // Fetch Results
      const { data: resultData } = await supabase
        .from("results")
        .select("*, exams(subject, bimester)")
        .eq("student_class", selectedClass);

      setResults(
        (resultData || []).map((r) => ({
          ...r,
          examId: r.exam_id,
          professorId: r.professor_id,
          studentName: r.student_name,
          studentClass: r.student_class,
          score: r.points,
          maxScore: r.total_points,
          correctedAt: r.corrected_at,
          bimester: r.bimester || (r.exams as any)?.bimester,
        })),
      );

      // Filter Students
      const allStudentsFiltered = Object.values(schoolInfo.studentsDB).flat();
      const classStudents = allStudentsFiltered.filter(
        (s: any) => s.classId === selectedClass,
      );
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
      alert(
        "Acesso Negado: Você não tem autorização para lecionar nesta turma e disciplina.",
      );
      return;
    }

    try {
      if (editingLesson) {
        const { error } = await supabase
          .from("lessons")
          .update({
            date: newDate,
            content: isHoliday ? "FERIADO NACIONAL / RECESSO" : newContent,
            lesson_count: isHoliday ? 0 : newCount,
          })
          .eq("id", editingLesson.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("lessons").insert({
          professor_id: user.id,
          class_id: selectedClass,
          subject: selectedSubject,
          bimester: selectedBimester,
          date: newDate,
          content: isHoliday ? "FERIADO NACIONAL / RECESSO" : newContent,
          lesson_count: isHoliday ? 0 : newCount,
        });
        if (error) throw error;
      }
      setShowAddLesson(false);
      setEditingLesson(null);
      setNewContent("");
      setIsHoliday(false);
      fetchData();
    } catch (err: any) {
      alert("Erro ao salvar aula: " + err.message);
    }
  };

  const handleGenerateCronograma = async () => {
    if (!generatorStartDate || !generatorEndDate) return;

    if (!isAuthorized()) {
      alert(
        "Acesso Negado: Somente o professor responsável por esta turma e disciplina pode gerar cronogramas.",
      );
      return;
    }

    const start = new Date(generatorStartDate + "T00:00:00");
    const end = new Date(generatorEndDate + "T00:00:00");

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
          date: currentDate.toISOString().split("T")[0],
          content: "Conteúdo a definir (Editar para alterar)",
          lesson_count: lessonCount,
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (lessonsToInsert.length === 0) {
      alert("Nenhuma aula gerada para os dias selecionados no período.");
      return;
    }

    try {
      const { error } = await supabase.from("lessons").insert(lessonsToInsert);
      if (error) throw error;

      setShowCronogramaGenerator(false);
      fetchData();
      alert(`Foram geradas ${lessonsToInsert.length} aulas no cronograma!`);
    } catch (err: any) {
      alert("Erro ao gerar cronograma: " + err.message);
    }
  };

  const handleCopyDiary = async () => {
    if (!targetCopyClass) {
      alert("Selecione a turma destino.");
      return;
    }
    if (targetCopyClass === selectedClass) {
      alert("Selecione uma turma diferente da atual.");
      return;
    }
    if (lessons.length === 0) {
      alert("Não há aulas neste diário para copiar.");
      return;
    }
    if (!isAuthorized()) {
      alert(
        "Acesso Negado: Somente o professor responsável por esta turma e disciplina pode copiar cronogramas.",
      );
      return;
    }

    try {
      const lessonsToInsert = lessons.map(l => ({
        professor_id: user?.id,
        class_id: targetCopyClass,
        subject: selectedSubject,
        bimester: selectedBimester,
        date: l.date,
        content: l.content,
        lesson_count: l.lesson_count
      }));

      const { error } = await supabase.from("lessons").insert(lessonsToInsert);
      if (error) throw error;
      
      alert(`Foram copiadas ${lessonsToInsert.length} aulas para a turma ${targetCopyClass}!`);
      setShowCopyDiary(false);
      setTargetCopyClass("");
    } catch (error: any) {
      alert("Erro ao copiar diário: " + error.message);
    }
  };

  const openAttendance = async (lesson: Lesson) => {
    setViewingAttendance(lesson);
    setLoading(true);
    try {
      const { data: existing, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("lesson_id", lesson.id);

      if (error) throw error;

      if (!existing || existing.length === 0) {
        setAttendanceRecords(
          students.map((s: any) => ({
            id: "",
            lesson_id: lesson.id,
            student_name: s.name,
            status: "present" as const,
          })),
        );
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
    const record = attendanceRecords[index];
    const studentInfo = students.find(
      (s: any) => s.name === record.student_name,
    );
    const isTransferred =
      studentInfo?.status === "Transferido" &&
      studentInfo?.transferDate &&
      viewingAttendance &&
      viewingAttendance.date >= studentInfo.transferDate;
    if (isTransferred) return;

    const newRecords = [...attendanceRecords];
    newRecords[index].status =
      newRecords[index].status === "present" ? "absent" : "present";
    setAttendanceRecords(newRecords);
  };

  const saveAttendance = async () => {
    if (!viewingAttendance) return;
    setSavingAttendance(true);
    try {
      await supabase
        .from("attendance")
        .delete()
        .eq("lesson_id", viewingAttendance.id);

      const payloadRecords = attendanceRecords.map((r) => {
        const studentInfo = students.find(
          (s: any) => s.name === r.student_name,
        );
        const isTransferred =
          studentInfo?.status === "Transferido" &&
          studentInfo?.transferDate &&
          viewingAttendance.date >= studentInfo.transferDate;

        return {
          lesson_id: viewingAttendance.id,
          student_name: r.student_name,
          status: isTransferred ? ("present" as const) : r.status,
        };
      });

      const { error } = await supabase
        .from("attendance")
        .insert(payloadRecords);
      if (error) throw error;
      setViewingAttendance(null);
      alert("Frequência salva com sucesso!");
      fetchData();
    } catch (err: any) {
      alert("Erro ao salvar frequência: " + err.message);
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleSaveExam = async () => {
    if (!newExamTitle || !selectedClass || !selectedSubject) return;

    if (!isAuthorized()) {
      alert(
        "Acesso Negado: Você não tem autorização para criar avaliações para esta turma e disciplina.",
      );
      return;
    }

    // --- CHECK CONFLICT BEFORE PROCEEDING ---
    const conflictRes = await checkAndResolveExamConflict(
      selectedClass,
      selectedBimester,
      selectedSubject,
      newExamType
    );
    if (!conflictRes.proceed) {
      if (conflictRes.error) {
        alert("Erro ao verificar conflitos de avaliação: " + conflictRes.error.message);
      }
      return;
    }
    // ----------------------------------------

    setSavingExam(true);
    try {
      const { error } = await supabase.from("exams").insert({
        professor_id: user.id,
        title: newExamTitle.toUpperCase(),
        subject: selectedSubject,
        exam_type: newExamType,
        exam_date: newExamDate,
        class_year: selectedClass,
        bimester: selectedBimester,
        questions: [],
        answer_key: {
          _metadata: {
            isExternal: true,
            bimester: selectedBimester,
            examType: newExamType,
            isDiaryOnly: true,
          },
        },
      }).select();

      if (error) throw error;

      // LOG SYSTEM ACTIVITY
      try {
        if (!isAdmin) await fetch("/api/activity/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actorName:
              userProfile?.professional_name || user.email?.split("@")[0],
            actorEmail: user.email,
            actionType: "create_exam",
            description: `O professor ${userProfile?.professional_name || user.email?.split("@")[0]} criou a avaliação '${newExamTitle.toUpperCase()}' (${selectedClass} - ${selectedSubject} / ${selectedBimester})`,
          }),
        });
      } catch (logErr) {
        console.warn("Log error:", logErr);
      }

      setShowAddExam(false);
      setNewExamTitle("");
      fetchData();
      if (onRefreshParentExams) onRefreshParentExams();
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
        const [studentName, examId] = key.split("|");
        const exam = exams.find((e) => e.id === examId);
        const existingResult = results.find(
          (r) => r.examId === examId && r.studentName === studentName,
        );

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
            corrected_at: new Date().toISOString(),
          });
        } else if (exam) {
          errorExams.add(stripHtml(exam.title));
        }
      }

      if (errorExams.size > 0) {
        alert(
          "Atenção: Você não tem permissão para editar notas das seguintes avaliações: " +
            Array.from(errorExams).join(", "),
        );
        if (updates.length === 0 && deletions.length === 0) {
          setSavingBulk(false);
          return;
        }
      }

      // Handle deletions
      if (deletions.length > 0) {
        await supabase.from("results").delete().in("id", deletions);
      }

      // Upsert results
      for (const payload of updates) {
        const { error } = await supabase.from("results").upsert(payload);

        if (error) {
          console.error("Erro no upsert bulk:", error);
          throw new Error(
            `Falha ao salvar nota de ${payload.student_name}: ${error.message}`,
          );
        }
      }

      setIsBulkEditing(false);
      setBulkGrades({});
      fetchData();
      if (onRefreshParentResults) onRefreshParentResults();

      // LOG SYSTEM ACTIVITY
      try {
        if (!isAdmin) {
          await fetch("/api/activity/log", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              actorName:
                userProfile?.professional_name || user.email?.split("@")[0],
              actorEmail: user.email,
              actionType: "edit_grades",
              description: `O professor ${userProfile?.professional_name || user.email?.split("@")[0]} alterou/registrou notas da turma ${selectedClass} (${selectedSubject} / ${selectedBimester})`,
            }),
          });
        }
      } catch (logErr) {
        console.warn("Log error:", logErr);
      }

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
    exams.forEach((exam) => {
      csv += `${exam.title};`;
    });
    csv += "Media\\n";

    students.forEach((student) => {
      let row = `${student.name};`;
      const studentResults = results.filter(
        (r) => r.studentName === student.name,
      );
      let total = 0;
      exams.forEach((exam) => {
        const res = studentResults.find((r) => r.examId === exam.id);
        if (res) {
          const score = (res.score / res.maxScore) * 10;
          row += `${score.toFixed(1).replace(".", ",")};`;
          total += score;
        } else {
          row += "-;";
        }
      });
      const avg =
        studentResults.length > 0
          ? (total / studentResults.length).toFixed(1).replace(".", ",")
          : "0,0";
      row += `${avg}
`;
      csv += row;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Notas_${selectedClass}_${selectedSubject}.csv`;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const showStudentDetails = (studentName: string) => {
    const studentResults = results.filter((r) => r.studentName === studentName);
    alert(
      `Histórico de ${studentName}
Avaliações concluídas: ${studentResults.length}`,
    );
  };

  const handleSingleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
  ) => {
    let nextRow = rowIndex;
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      nextRow = rowIndex - 1;
      e.preventDefault();
    } else if (e.key === "ArrowDown" || e.key === "ArrowRight" || e.key === "Enter") {
      nextRow = rowIndex + 1;
      e.preventDefault();
    } else {
      return;
    }

    const selector = `[data-grid-item="single-${nextRow}"]`;
    const el = document.querySelector(selector) as HTMLInputElement | null;
    if (el && !el.disabled) {
      el.focus();
      el.select();
    } else if (el && el.disabled) {
       // Recursively try to find next if disabled (skip blocked/transferred)
       if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
         handleSingleKeyDown(e, nextRow);
       } else {
         handleSingleKeyDown(e, nextRow);
       }
    }
  };

  const handleBulkKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    colIndex: number,
    maxRows: number,
    maxCols: number,
  ) => {
    const findNextFocusable = (r: number, c: number, key: string): HTMLInputElement | null => {
      let currR = r;
      let currC = c;
      const stepRow = key === "ArrowUp" ? -1 : (key === "ArrowDown" || key === "Enter" ? 1 : 0);
      const stepCol = key === "ArrowLeft" ? -1 : (key === "ArrowRight" ? 1 : 0);

      while (true) {
        currR += stepRow;
        currC += stepCol;

        if (currR < 0 || currR >= maxRows || currC < 0 || currC >= maxCols) {
          return null;
        }

        const selector = `[data-grid-item="bulk-${currR}-${currC}"]`;
        const el = document.querySelector(selector) as HTMLInputElement | null;
        if (el && !el.disabled) {
          return el;
        }

        if (stepRow === 0 && stepCol === 0) {
          return null;
        }
      }
    };

    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter"].includes(e.key)) {
      e.preventDefault();
      const el = findNextFocusable(rowIndex, colIndex, e.key);
      if (el) {
        el.focus();
        el.select();
      }
    }
  };

  const handleDeleteExamLocal = async (exam: Exam) => {
    if (userProfile?.role?.includes("secretaria")) {
      alert(
        "Acesso Negado: Usuários do setor de Secretaria não possuem permissão para excluir avaliações.",
      );
      return;
    }
    if (!window.confirm("Deseja realmente excluir esta avaliação? Elas serão enviadas para a lixeira e poderão ser restauradas em até 15 dias.")) return;

    if (!isAuthorized(exam.classYear, exam.subject)) {
      alert(
        "Acesso Negado: Você não tem autorização para gerenciar esta avaliação.",
      );
      return;
    }

    try {
      const meta = exam.answerKey?._metadata || {};
      const updatedAnswerKey = {
        ...(exam.answerKey || {}),
        _metadata: {
          ...meta,
          deletedAt: new Date().toISOString()
        }
      };

      const { error } = await supabase
        .from("exams")
        .update({ answer_key: updatedAnswerKey })
        .eq("id", exam.id);

      if (error) throw error;
      fetchData();
    } catch (err: any) {
      alert("Erro ao excluir: " + err.message);
    }
  };

  const startLaunchingGrades = (exam: Exam) => {
    if (!isAuthorized(exam.classYear, exam.subject)) {
      alert(
        "Acesso Negado: Você não tem autorização para lançar notas nesta turma e disciplina.",
      );
      return;
    }
    setLaunchingGradesFor(exam);
    const existingGrades: { [key: string]: number } = {};
    results
      .filter((r) => r.examId === exam.id)
      .forEach((r) => {
        existingGrades[r.studentName] = r.score;
      });
    setGradeInputs(existingGrades);
  };

  const handleSaveGrades = async () => {
    if (!launchingGradesFor) return;

    // Apenas o professor autorizado ou admin
    if (
      !isAuthorized(launchingGradesFor.classYear, launchingGradesFor.subject)
    ) {
      alert(
        "Acesso Negado: Você não tem autorização para lançar notas nesta turma e disciplina.",
      );
      setSavingGrades(false);
      return;
    }

    setSavingGrades(true);
    try {
      const payloads = [];
      const deletions = [];

      for (const student of students) {
        const existingResult = results.find(
          (r) =>
            r.examId === launchingGradesFor.id &&
            r.studentName === student.name,
        );
        const isTransferred =
          student.status === "Transferido" &&
          student.transferDate &&
          launchingGradesFor.examDate &&
          launchingGradesFor.examDate >= student.transferDate;

        if (isTransferred) {
          if (existingResult?.id) {
            deletions.push(existingResult.id);
          }
          continue;
        }

        const inputValue = gradeInputs[student.name];

        if (
          inputValue === undefined ||
          inputValue === null ||
          inputValue === ""
        ) {
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
          student_class: selectedClass,
        });
      }

      if (deletions.length > 0) {
        await supabase.from("results").delete().in("id", deletions);
      }

      // Upsert results
      for (const payload of payloads) {
        const { error } = await supabase.from("results").upsert(payload);

        if (error) {
          console.error("Erro no upsert:", error);
          throw new Error(
            `Falha ao salvar nota de ${payload.student_name}: ${error.message}`,
          );
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

  const displayRegularExams = exams.filter(
    (e) => !e.examType?.toLowerCase().includes("recuperação"),
  );
  const displayRecoveryExams = exams.filter((e) =>
    e.examType?.toLowerCase().includes("recuperação"),
  );

  const examSortOrder = [
    "PI",
    "PII",
    "PIII",
    "PIV",
    "PV",
    "PVI",
    "Trabalho",
    "Simulado",
    "Atividade",
    "Projeto",
  ];
  const sortedRegularExams = [...displayRegularExams].sort((a, b) => {
    const idxA = examSortOrder.indexOf(a.examType);
    const idxB = examSortOrder.indexOf(b.examType);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.title.localeCompare(b.title);
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pb-20 text-left"
    >
      {/* Header */}
      <ViewHeader
        title="Diário & Planejamento"
        subtitle="Gestão unificada do planejamento, frequências e lançamento de notas individuais."
        icon={<BookOpen className="w-5 h-5 text-gold" />}
        badge="Área Pedagógica"
      >
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => {
              // Store current config and switch view
              onConfigChange({
                class: selectedClass,
                subject: selectedSubject,
              });
              setView("diary-reports");
            }}
            className="w-full md:w-auto bg-rose-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:bg-rose-700 transition-all flex items-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            Relatórios do Diário
          </button>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full md:w-40 border rounded-xl px-3 py-2 font-black transition-all cursor-pointer bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
          >
            <option value="">Selecione a Turma</option>
            {renderClassOptions(classes)}
          </select>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full md:w-56 border rounded-xl px-3 py-2 font-black transition-all cursor-pointer bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
          >
            <option value="">Selecione a Disciplina</option>
            {(isAdmin ? subjects : userProfile?.assigned_subjects || []).map((s) => (<option key={s} value={s}>{s.toUpperCase()}</option>))}
          </select>
          <select
            value={selectedBimester}
            onChange={(e) => setSelectedBimester(e.target.value)}
            className="w-full md:w-40 border rounded-xl px-3 py-2 font-black transition-all cursor-pointer bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
          >
            {bimesters.map((b) => (<option key={b} value={b}>{b}</option>))}
          </select>
        </div>
      </ViewHeader>

      {!selectedClass || !selectedSubject ? (
        <div className="flex flex-col items-center justify-center py-32 text-center bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 border-dashed rounded-2xl">
          <BookOpen className="w-16 h-16 text-slate-700 dark:text-slate-300 mb-4" />
          <h2 className="text-xl font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">
            Nenhuma turma selecionada
          </h2>
          <p className="text-slate-700 dark:text-slate-300 text-sm mt-2 max-w-sm">
            Utilize os filtros acima para selecionar a turma, disciplina e
            visualização do diário.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tabs Selector */}
          <div className="grid grid-cols-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 sm:max-w-xl shadow-sm gap-1">
            <button
              onClick={() => setDiaryTab("schedule")}
              className={cn(
                "flex items-center justify-center gap-2 py-2.5 sm:py-3 px-2 sm:px-4 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all",
                diaryTab === "schedule"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-md border border-slate-200 dark:border-slate-800"
                  : "text-slate-700 dark:text-slate-400 hover:text-slate-800 dark:text-slate-100 dark:hover:text-slate-900 dark:text-white",
              )}
            >
              <Calendar className="w-3.5 h-3.5 sm:w-4 h-4" />
              <span className="truncate">Diário & Planejamento</span>
            </button>
            <button
              onClick={() => setDiaryTab("grades")}
              className={cn(
                "flex items-center justify-center gap-2 py-2.5 sm:py-3 px-2 sm:px-4 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all",
                diaryTab === "grades"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-md border border-slate-200 dark:border-slate-800"
                  : "text-slate-700 dark:text-slate-400 hover:text-slate-800 dark:text-slate-100 dark:hover:text-slate-900 dark:text-white",
              )}
            >
              <CheckSquare className="w-3.5 h-3.5 sm:w-4 h-4" />
              <span className="truncate">Provas & Notas</span>
            </button>
          </div>

          <AnimatePresence mode="wait">
            {diaryTab === "schedule" ? (
              <motion.div
                key="schedule"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 xl:grid-cols-4 gap-8"
              >
                {/* --- SEÇÃO DE AULAS (Ex-Left Column) --- */}
                <div className="xl:col-span-3 space-y-6">
                  <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex flex-col sm:flex-row sm:items-center justify-between shrink-0 gap-4">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-blue-600" />
                        <h3 className="font-black text-slate-700 dark:text-slate-200 text-sm tracking-widest uppercase">
                          Cronograma & Aulas dadas
                        </h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => setShowCronogramaGenerator(true)}
                          className="flex-1 sm:flex-none justify-center bg-primary text-white p-2.5 rounded-xl hover:bg-opacity-90 transition-colors shadow-sm flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase"
                          title="Gerador de Cronograma (Período)"
                        >
                          <Calendar className="w-3.5 h-3.5 sm:w-4 h-4" />
                          <span className="truncate">Gerar Período</span>
                        </button>
                        <button
                          onClick={() => setShowCopyDiary(true)}
                          className="flex-1 sm:flex-none justify-center bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase"
                          title="Copiar Diário"
                        >
                          <Copy className="w-3.5 h-3.5 sm:w-4 h-4" />
                          <span className="truncate">Copiar Diário</span>
                        </button>
                        <button
                          onClick={() => {
                            setEditingLesson(null);
                            setNewDate(new Date().toISOString().split("T")[0]);
                            setNewContent("");
                            setNewCount(2);
                            setIsHoliday(false);
                            setShowAddLesson(true);
                          }}
                          className="flex-1 sm:flex-none justify-center bg-blue-600 text-white p-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase"
                          title="Novo Registro de Aula"
                        >
                          <Plus className="w-3.5 h-3.5 sm:w-4 h-4" />
                          <span className="truncate">Registrar Aula</span>
                        </button>
                      </div>
                    </div>
                    <div className="p-0 overflow-y-auto max-h-[600px]">
                      {lessons.length === 0 ? (
                        <div className="p-12 text-center text-slate-600 dark:text-slate-400 text-sm font-medium">
                          Nenhuma aula gravada neste bimestre.
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {lessons.map((lesson) => (
                            <div
                              key={lesson.id}
                              className="p-5 hover:bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 transition-colors group"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block mb-2">
                                    {new Date(lesson.date).toLocaleDateString(
                                      "pt-BR",
                                    )}{" "}
                                    ({lesson.lesson_count} h/a)
                                  </span>
                                  {lesson.lesson_count === 0 ||
                                  lesson.content.includes("FERIADO") ||
                                  lesson.content.includes("RECESSO") ? (
                                    <span className="ml-2 text-xs font-black text-amber-600 bg-amber-50 px-2 py-1 rounded inline-block mb-2">
                                      FERIADO / RECESSO
                                    </span>
                                  ) : null}
                                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-relaxed mb-3">
                                    {lesson.content}
                                  </p>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => openAttendance(lesson)}
                                      className="text-[11px] font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 py-1.5 px-3 rounded hover:bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors flex items-center gap-1.5"
                                    >
                                      <Users className="w-3.5 h-3.5" />{" "}
                                      Lançar/Ver Frequência
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingLesson(lesson);
                                        setNewDate(lesson.date);
                                        setNewContent(lesson.content);
                                        setNewCount(lesson.lesson_count);
                                        setIsHoliday(
                                          lesson.lesson_count === 0 ||
                                            lesson.content.includes("FERIADO"),
                                        );
                                        setShowAddLesson(true);
                                      }}
                                      className="text-[11px] font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 py-1.5 px-3 rounded hover:bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors flex items-center gap-1.5"
                                    >
                                      Editar Aula / Feriado
                                    </button>
                                  </div>
                                </div>
                                <button
                                  onClick={async () => {
                                    if (!isAuthorized()) {
                                      alert(
                                        "Acesso Negado: Você não tem autorização para excluir aulas nesta turma.",
                                      );
                                      return;
                                    }
                                    if (
                                      window.confirm(
                                        "Deseja deletar esta aula?",
                                      )
                                    ) {
                                      await supabase
                                        .from("lessons")
                                        .delete()
                                        .eq("id", lesson.id);
                                      fetchData();
                                    }
                                  }}
                                  className="text-slate-700 dark:text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
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
                </div>

                {/* Right Sidebar under Schedule tab */}
                <div className="xl:col-span-1 space-y-6">
                  {/* Quick Summary Block */}
                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                      <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Aulas registradas
                      </span>
                      <span className="text-3xl font-black text-slate-700 dark:text-slate-200">
                        {lessons.length}
                      </span>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                        Total de horas/aula dadas ou planejadas no bimestre para{" "}
                        {selectedClass}.
                      </p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                      <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Média do Bimestre
                      </span>
                      <span className="text-3xl font-black text-slate-700 dark:text-slate-200">
                        {(() => {
                          const validResults = results.filter((r) => r.score !== null && r.score !== undefined && r.score !== "" && !isNaN(Number(r.score)));
                          return validResults.length > 0
                            ? (
                                validResults.reduce(
                                  (acc, r) => acc + (Number(r.score) / r.maxScore) * 10,
                                  0,
                                ) / validResults.length
                              )
                                .toFixed(1)
                                .replace(".", ",")
                            : "-";
                        })()}
                      </span>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                        Média ponderada baseada nos lançamentos de avaliações
                        desta turma.
                      </p>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 p-5 rounded-2xl text-xs space-y-2 text-blue-800">
                    <h4 className="font-black text-blue-900 uppercase">
                      📝 REGISTRO COMPLETO
                    </h4>
                    <p className="leading-relaxed">
                      Como professor, utilize o "Registrar Aula" ou o "Gerar
                      Período" para desenhar seu cronograma. Posteriormente,
                      lance a Frequência dos alunos por aula.
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="grades"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* --- SEÇÃO DE CRIAÇÃO E QUADRO DE NOTAS (Ex-Right Column) --- */}
                <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border text-left border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                  <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-[#3b5998] text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="w-5 h-5 opacity-80" />
                      <h3 className="font-white text-white text-sm font-black tracking-widest uppercase">
                        Criação & Lançamento de Provas
                      </h3>
                    </div>
                  </div>

                  {/* Form Inline Avaliações */}
                  <div className="p-6 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-b-2 border-slate-200 dark:border-slate-800">
                    <div className="flex flex-col md:flex-row items-end gap-4">
                      <div className="w-full md:flex-1 space-y-2">
                        <label className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">
                          TÍTULO DA AVALIAÇÃO
                        </label>
                        <input
                          type="text"
                          value={newExamTitle}
                          onChange={(e) => setNewExamTitle(e.target.value)}
                          placeholder="EX: PROVA MENSAL"
                          className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-2 border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-black text-slate-800 dark:text-slate-200 outline-none focus:border-accent transition-all shadow-sm placeholder:text-slate-700 dark:text-slate-300"
                        />
                      </div>
                      <div className="w-full md:w-44 space-y-2">
                        <label className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">
                          DATA PREVISTA
                        </label>
                        <input
                          type="date"
                          value={newExamDate}
                          onChange={(e) => setNewExamDate(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-2 border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-black text-slate-800 dark:text-slate-200 outline-none focus:border-accent transition-all shadow-sm"
                        />
                      </div>
                      <div className="w-full md:w-56 space-y-2">
                        <label className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">
                          TIPO PADRÃO
                        </label>
                        <select
                          value={newExamType}
                          onChange={(e) => setNewExamType(e.target.value)}
                          className="w-full rounded-xl px-4 py-3 font-black transition-all cursor-pointer bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
                        >
                          {(
                            schoolInfo.examCategories ||
                            DEFAULT_SCHOOL_INFO.examCategories
                          ).map((cat) => (
                            <option key={cat} value={cat}>
                              {cat} (10.0)
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={handleSaveExam}
                        disabled={savingExam || !newExamTitle}
                        className="w-full md:w-auto bg-slate-900 text-white px-8 py-3.5 rounded-xl text-sm font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-accent transition-all active:scale-95 disabled:opacity-50"
                      >
                        {savingExam ? "SALVANDO..." : "ADICIONAR PROVA"}
                      </button>
                    </div>
                  </div>

                  {/* Listagem Avaliações criadas neste bimestre agrupadas por categoria */}
                  <div className="p-0 overflow-y-auto max-h-[300px]">
                    {exams.length === 0 ? (
                      <div className="p-8 text-center text-slate-700 dark:text-slate-300 text-sm">
                        Ainda não há avaliações criadas para este bimestre.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {Array.from(new Set(exams.map((e) => e.examType)))
                          .sort()
                          .map((cat) => (
                            <div key={cat} className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                              <div className="px-4 py-2 border-y border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                                <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                                  {cat || "Sem Categoria"}
                                </span>
                              </div>
                              {exams
                                .filter((e) => e.examType === cat)
                                .map((exam) => (
                                  <div
                                    key={exam.id}
                                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors"
                                  >
                                    <div>
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase">
                                          {new Date(
                                            exam.examDate ||
                                              new Date().toISOString(),
                                          ).toLocaleDateString("pt-BR")}
                                        </span>
                                      </div>
                                      <h4 className="font-bold text-sm text-slate-700 dark:text-slate-200 uppercase">
                                        {stripHtml(exam.title)}
                                      </h4>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() =>
                                          onDuplicateExam(exam)
                                        }
                                        className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase hover:bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-sm flex items-center gap-1"
                                      >
                                        <Copy className="w-3.5 h-3.5" />{" "}
                                        Duplicar
                                      </button>
                                      <button
                                        onClick={() =>
                                          startLaunchingGrades(exam)
                                        }
                                        className="bg-green-600 text-white px-3 py-1.5 rounded-md text-[10px] font-black uppercase hover:bg-green-700 shadow-sm flex items-center gap-1"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" /> Lançar
                                        Notas
                                      </button>
                                      {((isAuthorized(
                                        exam.classYear,
                                        exam.subject,
                                      ) &&
                                        !userProfile?.role?.includes(
                                          "secretaria",
                                        )) ||
                                        userProfile?.role?.includes("admin") ||
                                        userProfile?.role?.includes(
                                          "vice_diretor",
                                        )) && (
                                        <button
                                          onClick={() =>
                                            handleDeleteExamLocal(exam)
                                          }
                                          className="text-slate-700 dark:text-slate-300 hover:text-red-500 p-2 transition-colors ml-2"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      )}
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
                <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-2 border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
                  <div className="p-6 border-b-2 border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-6 bg-accent rounded-full" />
                      <h3 className="font-black text-slate-800 dark:text-slate-200 text-base tracking-tight uppercase">
                        QUADRO CONSOLIDADO (BOLETIM PRÉVIA)
                      </h3>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setShowOnlyBelowAvgMain(!showOnlyBelowAvgMain)
                        }
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${showOnlyBelowAvgMain ? "bg-red-600 text-white shadow-lg ring-2 ring-red-100" : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 hover:border-red-400 hover:text-red-600"}`}
                      >
                        <Filter className="w-3.5 h-3.5" />
                        {showOnlyBelowAvgMain
                          ? "Vendo Recuperação"
                          : "Filtro Recuperação"}
                      </button>
                      {isBulkEditing ? (
                        <>
                          <button
                            onClick={() => setIsBulkEditing(false)}
                            className="bg-slate-200 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-slate-300 transition-all"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={handleSaveBulkGrades}
                            disabled={savingBulk}
                            className="bg-accent text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest shadow-md hover:bg-opacity-90 flex items-center gap-2 transition-all disabled:opacity-50"
                          >
                            {savingBulk ? (
                              <RotateCcw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                            Salvar Tudo
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              const initial = {};
                              results.forEach((r) => {
                                initial[`${r.studentName}|${r.examId}`] =
                                  r.score;
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
                      <thead className="bg-[#800020] text-white text-white">
                <tr className="transition-colors">
                          <th className="p-3 sm:p-5 text-[10px] sm:text-xs font-black text-white text-left uppercase sticky left-0 bg-slate-900 z-10 w-40 sm:w-80 border-r border-white/10 tracking-widest text-white">
                            Aluno
                          </th>
                          {sortedRegularExams.map((exam) => (
                            <th
                              key={exam.id}
                              className="p-3 sm:p-5 text-[10px] sm:text-xs font-black text-white text-center uppercase min-w-[100px] sm:min-w-[130px] border-r border-white/10 tracking-widest leading-tight"
                            >
                              {stripHtml(exam.title)}
                            </th>
                          ))}
                          <th className="p-3 sm:p-5 text-[10px] sm:text-xs font-black  text-center uppercase bg-slate-800 tracking-widest border-r border-white/10 whitespace-nowrap text-white">
                            Média P.
                          </th>
                          {displayRecoveryExams.map((exam) => (
                            <th
                              key={exam.id}
                              className="p-3 sm:p-5 text-[10px] sm:text-xs font-black text-red-400 text-center uppercase min-w-[100px] sm:min-w-[130px] border-r border-white/10 tracking-widest leading-tight"
                            >
                              {stripHtml(exam.title)}
                            </th>
                          ))}
                          <th className="p-3 sm:p-5 text-[10px] sm:text-xs font-black text-accent text-center uppercase bg-slate-800 tracking-widest whitespace-nowrap text-white">
                            Nota Final
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {(() => {
                          const bulkFilteredStudents = students.filter(
                            (student) =>
                              !showOnlyBelowAvgMain ||
                              calculateStudentBaseAvg(student.name) < 6,
                          );
                          return bulkFilteredStudents.map((student, rowIndex) => {
                            const studentResults = results.filter(
                              (r) => r.studentName === student.name,
                            );

                            // Separate Regular Exams from Recovery
                            const regularResults = studentResults.filter(
                              (r) => {
                                const exam = exams.find(
                                  (e) => e.id === r.examId,
                                );
                                const isScoreValid = r.score !== null && r.score !== undefined && r.score !== "" && !isNaN(Number(r.score));
                                return (
                                  exam &&
                                  !exam.examType
                                    ?.toLowerCase()
                                    .includes("recuperação") &&
                                  isScoreValid
                                );
                              },
                            );

                            const recoveryResult = studentResults.find((r) => {
                              const exam = exams.find((e) => e.id === r.examId);
                              const isScoreValid = r.score !== null && r.score !== undefined && r.score !== "" && !isNaN(Number(r.score));
                              return (
                                exam &&
                                exam.examType
                                  ?.toLowerCase()
                                  .includes("recuperação") &&
                                isScoreValid
                              );
                            });

                            // Base Average (Regular Exams)
                            const baseAvg =
                              regularResults.length > 0
                                ? regularResults.reduce(
                                    (acc, r) =>
                                      acc + (Number(r.score) / r.maxScore) * 10,
                                    0,
                                  ) / regularResults.length
                                : 0;

                            const isEligible = baseAvg < 6 && regularResults.length > 0;

                            // Final Bimester Grade with Recovery formula
                            let finalBimesterGrade = baseAvg;
                            if (recoveryResult && isEligible) {
                              const recoveryScore =
                                (Number(recoveryResult.score) /
                                  recoveryResult.maxScore) *
                                10;
                              finalBimesterGrade =
                                (baseAvg + recoveryScore) / 2;
                            }

                            const avgDisplay = regularResults.length > 0 ? baseAvg.toFixed(1) : "-";
                            const finalDisplay = regularResults.length > 0 ? finalBimesterGrade.toFixed(1) : "-";

                            return (
                              <tr
                                key={student.name}
                                className="hover:bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 transition-colors group"
                              >
                                <td className="p-3 sm:p-5 font-black text-slate-800 dark:text-slate-200 text-[11px] sm:text-sm uppercase sticky left-0 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-r-2 border-slate-200 dark:border-slate-800 shadow-[2px_0_10px_rgba(0,0,0,0.1)] flex justify-between items-center min-w-[160px] sm:min-w-[320px]">
                                  <span className="truncate pr-2 sm:pr-4 leading-relaxed tracking-tight">
                                    {student.name}
                                  </span>
                                  {!isBulkEditing && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        showStudentDetails(student.name)
                                      }
                                      className="text-accent hover:scale-125 transition-all opacity-0 group-hover:opacity-100 sm:opacity-100"
                                      title="Ver Histórico"
                                    >
                                      <Search className="w-3.5 h-3.5 sm:w-4 h-4 shadow-sm" />
                                    </button>
                                  )}
                                </td>
                                {sortedRegularExams.map((exam, examIndex) => {
                                  const res = studentResults.find(
                                    (r) => r.examId === exam.id,
                                  );
                                  const normalizedScore = res
                                    ? (res.score / res.maxScore) * 10
                                    : null;
                                  const key = `${student.name}|${exam.id}`;

                                  return (
                                    <td
                                      key={exam.id}
                                      className="p-3 sm:p-5 text-center text-xs sm:text-sm font-black border-r border-slate-200 dark:border-slate-800"
                                    >
                                      {isBulkEditing ? (
                                        <input
                                          type="number"
                                          step="0.1"
                                          min="0"
                                          max="10"
                                          data-grid-item={`bulk-${rowIndex}-${examIndex}`}
                                          onKeyDown={(e) =>
                                            handleBulkKeyDown(
                                              e,
                                              rowIndex,
                                              examIndex,
                                              bulkFilteredStudents.length,
                                              sortedRegularExams.length +
                                                displayRecoveryExams.length,
                                            )
                                          }
                                          value={
                                            bulkGrades[key] !== undefined
                                              ? bulkGrades[key]
                                              : normalizedScore !== null
                                                ? normalizedScore
                                                : ""
                                          }
                                          onChange={(e) =>
                                            setBulkGrades({
                                              ...bulkGrades,
                                              [key]: e.target.value,
                                            })
                                          }
                                          className="w-12 sm:w-16 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-2 border-slate-200 dark:border-slate-800 rounded-lg p-1 text-center font-black focus:border-accent outline-none text-xs sm:text-sm"
                                        />
                                      ) : (
                                        <span
                                          className={
                                            normalizedScore !== null
                                              ? normalizedScore >= 6
                                                ? "text-blue-700"
                                                : "text-red-600"
                                              : "text-slate-700 dark:text-slate-300 font-bold"
                                          }
                                        >
                                          {normalizedScore !== null
                                            ? normalizedScore
                                                .toFixed(1)
                                                .replace(".", ",")
                                            : "-"}
                                        </span>
                                      )}
                                    </td>
                                  );
                                })}
                                <td className={`p-3 sm:p-5 text-center text-xs sm:text-sm font-black bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-x border-slate-200 dark:border-slate-800 ${
                                  Number(avgDisplay) < 6 ? "bg-red-50/80" : ""
                                }`}>
                                  <span
                                    className={`px-2 py-1 rounded-md ${
                                      Number(avgDisplay) >= 6
                                        ? "text-blue-800"
                                        : "text-red-700 bg-red-100/50 border border-red-200 animate-pulse"
                                    }`}
                                  >
                                    {avgDisplay.replace(".", ",")}
                                  </span>
                                </td>
                                {displayRecoveryExams.map((exam, recIndex) => {
                                  const res = studentResults.find(
                                    (r) => r.examId === exam.id,
                                  );
                                  const normalizedScore = res
                                    ? (res.score / res.maxScore) * 10
                                    : null;
                                  const key = `${student.name}|${exam.id}`;

                                  return (
                                    <td
                                      key={exam.id}
                                      className={`p-3 sm:p-5 text-center text-xs sm:text-sm font-black border-r border-slate-200 dark:border-slate-800 bg-red-50/30 ${!isEligible ? "opacity-30" : ""}`}
                                    >
                                      {isBulkEditing ? (
                                        <input
                                          type="number"
                                          step="0.1"
                                          min="0"
                                          max="10"
                                          disabled={!isEligible}
                                          data-grid-item={`bulk-${rowIndex}-${sortedRegularExams.length + recIndex}`}
                                          onKeyDown={(e) =>
                                            handleBulkKeyDown(
                                              e,
                                              rowIndex,
                                              sortedRegularExams.length +
                                                recIndex,
                                              bulkFilteredStudents.length,
                                              sortedRegularExams.length +
                                                displayRecoveryExams.length,
                                            )
                                          }
                                          value={
                                            bulkGrades[key] !== undefined
                                              ? bulkGrades[key]
                                              : normalizedScore !== null
                                                ? normalizedScore
                                                : ""
                                          }
                                          onChange={(e) =>
                                            setBulkGrades({
                                              ...bulkGrades,
                                              [key]: e.target.value,
                                            })
                                          }
                                          placeholder={!isEligible ? "N/A" : ""}
                                          className="w-12 sm:w-16 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-2 border-slate-200 dark:border-slate-800 rounded-lg p-1 text-center font-black focus:border-accent outline-none disabled:bg-slate-200 text-xs sm:text-sm"
                                        />
                                      ) : (
                                        <span
                                          className={
                                            normalizedScore !== null
                                              ? normalizedScore >= 6
                                                ? "text-purple-600"
                                                : "text-red-600"
                                              : "text-slate-700 dark:text-slate-300 font-bold"
                                          }
                                        >
                                          {normalizedScore !== null
                                            ? normalizedScore
                                                .toFixed(1)
                                                .replace(".", ",")
                                            : isEligible
                                              ? "-"
                                              : "- "}
                                        </span>
                                      )}
                                    </td>
                                  );
                                })}
                                <td className={`p-3 sm:p-5 text-center text-sm sm:text-base font-black transition-all ${
                                  Number(finalDisplay) < 6
                                    ? "bg-red-100/50 dark:bg-red-950/40 border-x-4 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                                    : "bg-blue-50/50"
                                }`}>
                                  {Number(finalDisplay) < 6 ? (
                                    <div className="inline-flex items-center gap-1.5 bg-red-600 text-white px-4 py-1.5 rounded-full text-xs font-black sm:text-sm shadow-xl border-2 border-red-400">
                                      <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white shrink-0 animate-bounce" />
                                      <span>{finalDisplay.replace(".", ",")}</span>
                                    </div>
                                  ) : (
                                    <span className="text-blue-900 font-extrabold underline decoration-2 underline-offset-4 decoration-blue-500/30">
                                      {finalDisplay.replace(".", ",")}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}



      {/* Modal Novo Lançamento de Notas (Collective Entry) */}
      <AnimatePresence>
        {launchingGradesFor && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[110] p-4 text-left">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-[2rem] shadow-2xl w-full max-w-3xl overflow-hidden text-left border-4 border-white"
            >
              <div className="p-8 border-b-2 border-slate-200 dark:border-slate-800 bg-[#3b5998] text-white flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-white/ rounded text-[9px] font-black uppercase tracking-widest text-slate-900 dark:text-white">
                      Lançamento de Notas
                    </span>
                    {!isAuthorized(
                      launchingGradesFor.classYear,
                      launchingGradesFor.subject,
                    ) && (
                      <span className="px-2 py-0.5 bg-red-500 rounded text-[9px] font-black uppercase tracking-widest text-white">
                        Somente Leitura
                      </span>
                    )}
                  </div>
                  <h3 className="font-black text-2xl uppercase tracking-tighter leading-tight drop-shadow-sm">
                    {stripHtml(launchingGradesFor.title)}
                  </h3>
                  <p className="text-xs font-bold text-white/70 uppercase tracking-widest mt-2 flex items-center gap-2">
                    <Users className="w-3.5 h-3.5" /> {selectedClass}{" "}
                    <span className="opacity-30">|</span>{" "}
                    <BookOpen className="w-3.5 h-3.5" /> {selectedSubject}
                  </p>
                </div>
                <button
                  onClick={() => setLaunchingGradesFor(null)}
                  className="p-3 hover:bg-white/ rounded-full transition-all active:scale-90"
                >
                  <X className="w-7 h-7" />
                </button>
              </div>
              <div className="max-h-[500px] overflow-y-auto p-4 space-y-2">
                {launchingGradesFor.examType
                  ?.toLowerCase()
                  .includes("recuperação") && (
                  <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-2xl border border-yellow-100 mb-4">
                    <input
                      type="checkbox"
                      id="belowAvgToggle"
                      checked={showOnlyBelowAverage}
                      onChange={(e) =>
                        setShowOnlyBelowAverage(e.target.checked)
                      }
                      className="w-5 h-5 accent-slate-900 cursor-pointer"
                    />
                    <label
                      htmlFor="belowAvgToggle"
                      className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase cursor-pointer"
                    >
                      Ver apenas alunos com média abaixo de 6,0
                    </label>
                  </div>
                )}
                <div className="overflow-x-auto -mx-4 px-4">
                  <table className="w-full border-collapse">
                  <thead className="bg-[#800020] text-white text-white">
                    <tr>
                      <th className="p-3 text-[10px] font-bold  uppercase text-left text-white">
                        Aluno
                      </th>
                      <th className="p-3 text-[10px] font-bold  uppercase text-center w-40 text-white">
                        Média Atual
                      </th>
                      <th className="p-3 text-[10px] font-bold  uppercase text-center w-32 text-white">
                        Nota da Recuperação
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {students
                      .filter((student) => {
                        if (!showOnlyBelowAverage) return true;

                        const studentResults = results.filter(
                          (r) => r.studentName === student.name,
                        );

                        if (
                          launchingGradesFor.examType
                            ?.toLowerCase()
                            .includes("recuperação")
                        ) {
                          const bimesterResults = studentResults.filter(
                            (r) =>
                              r.bimester === launchingGradesFor.bimester &&
                              r.examId !== launchingGradesFor.id,
                          );

                          const regularResults = bimesterResults.filter((r) => {
                            const ex = exams.find((e) => e.id === r.examId);
                            const isScoreValid = r.score !== null && r.score !== undefined && r.score !== "" && !isNaN(Number(r.score));
                            return (
                              ex &&
                              !ex.examType
                                ?.toLowerCase()
                                .includes("recuperação") &&
                              isScoreValid
                            );
                          });

                          const baseAvg =
                            regularResults.length > 0
                              ? regularResults.reduce(
                                  (acc, r) =>
                                    acc + (Number(r.score) / r.maxScore) * 10,
                                  0,
                                ) / regularResults.length
                              : 0;
                          return regularResults.length > 0 && baseAvg < 6;
                        }

                        if (
                          launchingGradesFor.examType
                            ?.toLowerCase()
                            .includes("recuperação")
                        ) {
                          // Media Anual
                          const bimesters = [
                            "1º Bimestre",
                            "2º Bimestre",
                            "3º Bimestre",
                            "4º Bimestre",
                          ];
                          const bimesterAverages = bimesters.map((bim) => {
                            const bimResults = studentResults.filter(
                              (r) => r.bimester === bim,
                            );

                            const regular = bimResults.filter((r) => {
                              const ex = exams.find((e) => e.id === r.examId);
                              const isScoreValid = r.score !== null && r.score !== undefined && r.score !== "" && !isNaN(Number(r.score));
                              return (
                                ex &&
                                !ex.examType
                                  ?.toLowerCase()
                                  .includes("recuperação") &&
                                isScoreValid
                              );
                            });
                            const recovery = bimResults.find((r) => {
                              const ex = exams.find((e) => e.id === r.examId);
                              const isScoreValid = r.score !== null && r.score !== undefined && r.score !== "" && !isNaN(Number(r.score));
                              return (
                                ex &&
                                ex.examType
                                  ?.toLowerCase()
                                  .includes("recuperação") &&
                                isScoreValid
                              );
                            });

                            const base =
                              regular.length > 0
                                ? regular.reduce(
                                    (acc, r) =>
                                      acc + (Number(r.score) / r.maxScore) * 10,
                                    0,
                                  ) / regular.length
                                : null;

                            if (base === null) return null;

                            if (recovery && base < 6) {
                              return (
                                (base +
                                  (Number(recovery.score) / recovery.maxScore) * 10) /
                                2
                              );
                            }
                            return base;
                          });

                          const validBims = bimesterAverages.filter((v) => v !== null) as number[];
                          const yearlyAvg =
                            validBims.length > 0
                              ? validBims.reduce((acc, v) => acc + v, 0) / validBims.length
                              : 0;
                          return validBims.length > 0 && yearlyAvg < 6;
                        }

                        return true;
                      })
                      .map((student, rowIndex) => {
                        const studentResults = results.filter(
                          (r) => r.studentName === student.name,
                        );
                        let currentAvg = 0;

                        if (
                          launchingGradesFor.examType
                            ?.toLowerCase()
                            .includes("recuperação")
                        ) {
                          const bimesterResults = studentResults.filter(
                            (r) =>
                              r.bimester === launchingGradesFor.bimester &&
                              r.examId !== launchingGradesFor.id,
                          );
                          const regularResults = bimesterResults.filter((r) => {
                            const ex = exams.find((e) => e.id === r.examId);
                            const isScoreValid = r.score !== null && r.score !== undefined && r.score !== "" && !isNaN(Number(r.score));
                            return (
                              ex &&
                              !ex.examType
                                ?.toLowerCase()
                                .includes("recuperação") &&
                              isScoreValid
                            );
                          });
                          currentAvg =
                            regularResults.length > 0
                              ? regularResults.reduce(
                                  (acc, r) =>
                                    acc + (Number(r.score) / r.maxScore) * 10,
                                  0,
                                ) / regularResults.length
                              : 0;
                        } else if (
                          launchingGradesFor.examType
                            ?.toLowerCase()
                            .includes("recuperação")
                        ) {
                          const bimesters = [
                            "1º Bimestre",
                            "2º Bimestre",
                            "3º Bimestre",
                            "4º Bimestre",
                          ];
                          const bimesterAverages = bimesters.map((bim) => {
                            const bimResults = studentResults.filter(
                              (r) => r.bimester === bim,
                            );
                            const regular = bimResults.filter((r) => {
                              const ex = exams.find((e) => e.id === r.examId);
                              const isScoreValid = r.score !== null && r.score !== undefined && r.score !== "" && !isNaN(Number(r.score));
                              return (
                                ex &&
                                !ex.examType
                                  ?.toLowerCase()
                                  .includes("recuperação") &&
                                isScoreValid
                              );
                            });
                            const recovery = bimResults.find((r) => {
                              const ex = exams.find((e) => e.id === r.examId);
                              const isScoreValid = r.score !== null && r.score !== undefined && r.score !== "" && !isNaN(Number(r.score));
                              return (
                                ex &&
                                ex.examType
                                  ?.toLowerCase()
                                  .includes("recuperação") &&
                                isScoreValid
                              );
                            });
                            const base =
                              regular.length > 0
                                ? regular.reduce(
                                    (acc, r) =>
                                      acc + (Number(r.score) / r.maxScore) * 10,
                                    0,
                                  ) / regular.length
                                : null;
                            if (base === null) return null;
                            return recovery && base < 6
                              ? (base +
                                  (Number(recovery.score) / recovery.maxScore) * 10) /
                                  2
                              : base;
                          });
                          const validBims = bimesterAverages.filter((v) => v !== null) as number[];
                          currentAvg =
                            validBims.length > 0
                              ? validBims.reduce((acc, v) => acc + v, 0) / validBims.length
                              : 0;
                        }

                        const isTransferred =
                          student.status === "Transferido" &&
                          student.transferDate &&
                          launchingGradesFor.examDate &&
                          launchingGradesFor.examDate >= student.transferDate;

                        return (
                          <tr
                            key={student.name}
                            className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 transition-colors"
                          >
                            <td className="p-3 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase">
                              <div>{student.name}</div>
                              {isTransferred && (
                                <div className="text-[9px] text-blue-600 dark:text-blue-400 font-extrabold normal-case">
                                  Transferido em{" "}
                                  {new Date(
                                    student.transferDate,
                                  ).toLocaleDateString("pt-BR")}{" "}
                                  (Bloqueado)
                                </div>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {isTransferred ? (
                                <span className="text-xs text-slate-600 dark:text-slate-400 uppercase font-bold">
                                  Inativo
                                </span>
                              ) : launchingGradesFor.examType
                                  ?.toLowerCase()
                                  .includes("recuperação") ? (
                                <span
                                  className={`text-sm font-black ${currentAvg < 6 ? "text-red-600" : "text-blue-600"}`}
                                >
                                  {currentAvg.toFixed(1).replace(".", ",")}
                                </span>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="10"
                                data-grid-item={`single-${rowIndex}`}
                                onKeyDown={(e) => handleSingleKeyDown(e, rowIndex)}
                                disabled={
                                  isTransferred ||
                                  !isAuthorized(
                                    launchingGradesFor.classYear,
                                    launchingGradesFor.subject,
                                  ) ||
                                  (launchingGradesFor.examType
                                    ?.toLowerCase()
                                    .includes("recuperação") &&
                                    currentAvg >= 6)
                                }
                                value={
                                  isTransferred
                                    ? ""
                                    : gradeInputs[student.name] !== undefined
                                      ? gradeInputs[student.name]
                                      : ""
                                }
                                onChange={(e) =>
                                  setGradeInputs({
                                    ...gradeInputs,
                                    [student.name]: e.target.value,
                                  })
                                }
                                placeholder={
                                  isTransferred
                                    ? "TRANSF"
                                    : launchingGradesFor.examType
                                          ?.toLowerCase()
                                          .includes("recuperação") &&
                                        currentAvg >= 6
                                      ? "N/A"
                                      : "0,0"
                                }
                                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-2 border-transparent focus:border-accent focus:bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-2 text-center text-lg font-black text-slate-800 dark:text-slate-200 outline-none transition-all disabled:opacity-45 disabled:cursor-not-allowed shadow-inner"
                              />
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
                </div>
              </div>
              <div className="p-8 border-t-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex gap-4">
                <button
                  onClick={() => setLaunchingGradesFor(null)}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-200 transition-all active:scale-95 shadow-sm"
                >
                  Fechar Janela
                </button>
                {isAuthorized(
                  launchingGradesFor.classYear,
                  launchingGradesFor.subject,
                ) && (
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
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden text-left"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-primary text-white flex items-center justify-between">
                <h3 className="font-black text-lg uppercase tracking-tight">
                  {editingLesson
                    ? "Editar Registro de Aula"
                    : "Novo Registro de Aula"}
                </h3>
                <button
                  onClick={() => setShowAddLesson(false)}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 space-y-5 text-left text-slate-700 dark:text-slate-200">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                      Data
                    </label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-sm font-bold text-left outline-none focus:border-accent"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                      Qtd. Aulas (Horas)
                    </label>
                    <input
                      type="number"
                      value={newCount}
                      onChange={(e) => setNewCount(parseInt(e.target.value))}
                      disabled={isHoliday}
                      className="w-full bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-sm font-bold text-left outline-none focus:border-accent disabled:opacity-50"
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
                  <label
                    htmlFor="isHolidayToggle"
                    className="text-sm font-bold text-amber-800 cursor-pointer select-none"
                  >
                    Marcar dia como FERIADO / RECESSO
                  </label>
                </div>

                {!isHoliday && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                      Conteúdo Ministrado
                    </label>
                    <textarea
                      rows={4}
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      placeholder="Descreva o que foi trabalhado em aula..."
                      className="w-full bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-accent resize-none text-left"
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
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden text-left"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-primary text-white flex items-center justify-between">
                <div>
                  <h3 className="font-black text-lg uppercase tracking-tight">
                    Gerador de Aula/Cronograma
                  </h3>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Crie os dias letivos no período
                  </p>
                </div>
                <button
                  onClick={() => setShowCronogramaGenerator(false)}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 space-y-6 text-left text-slate-700 dark:text-slate-200">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                      Data Inicial
                    </label>
                    <input
                      type="date"
                      value={generatorStartDate}
                      onChange={(e) => setGeneratorStartDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-sm font-bold text-left outline-none focus:border-accent"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                      Data Final
                    </label>
                    <input
                      type="date"
                      value={generatorEndDate}
                      onChange={(e) => setGeneratorEndDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-sm font-bold text-left outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                    Quantas aulas por dia da semana?
                  </label>
                  <p className="text-xs text-slate-700 dark:text-slate-300 mb-2 leading-relaxed">
                    Em cada dia marcado, o sistema criará o número de aulas
                    (horas/aula) preenchido. Deixe vazio ou 0 para dias em que
                    você não leciona.
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { idx: 1, label: "Segunda-feira" },
                      { idx: 2, label: "Terça-feira" },
                      { idx: 3, label: "Quarta-feira" },
                      { idx: 4, label: "Quinta-feira" },
                      { idx: 5, label: "Sexta-feira" },
                      { idx: 6, label: "Sábado" },
                    ].map((day) => (
                      <div
                        key={day.idx}
                        className="bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded p-2 flex flex-col justify-center items-center gap-1"
                      >
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                          {day.label}
                        </span>
                        <input
                          type="number"
                          min="0"
                          max="10"
                          value={generatorDays[day.idx] || ""}
                          onChange={(e) =>
                            setGeneratorDays((prev) => ({
                              ...prev,
                              [day.idx]: parseInt(e.target.value) || 0,
                            }))
                          }
                          className="w-16 text-center border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-sm font-bold"
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

      {/* Modal Copiar Diário */}
      <AnimatePresence>
        {showCopyDiary && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 text-left">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-indigo-600 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-black text-lg uppercase tracking-tight">
                    Copiar Diário
                  </h3>
                  <p className="text-xs font-bold text-slate-100">
                    Duplicar conteúdos destas aulas para outra Turma
                  </p>
                </div>
                <button
                  onClick={() => setShowCopyDiary(false)}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 space-y-6 text-left text-slate-700 dark:text-slate-200">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                    Disciplina Atual Selecionada
                  </label>
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-base">{selectedSubject}</div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                    Bimestre Atual
                  </label>
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-base">{selectedBimester}</div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                    Turma de Destino (Para Onde Copiar)
                  </label>
                  <select
                    value={targetCopyClass}
                    onChange={(e) => setTargetCopyClass(e.target.value)}
                    className="w-full border rounded-xl px-4 py-3 font-bold transition-all bg-slate-50 dark:bg-slate-900 border-indigo-200 dark:border-indigo-900 text-slate-800 dark:text-slate-100 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-950 outline-none"
                  >
                    <option value="">Selecione a turma...</option>
                    {classes.filter(c => c !== selectedClass).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="text-amber-600 dark:text-amber-400 text-xs font-semibold p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl leading-relaxed">
                  ⚠️ Importante: Serão copiados todos os registros de aula e seus conteúdos associados. <strong className="font-black underline">As notas não serão copiadas.</strong>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleCopyDiary}
                    className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50"
                    disabled={!targetCopyClass}
                  >
                    <Copy className="w-5 h-5" /> Copiar Diário Inteiro
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
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden text-left"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-red-600 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-black text-lg uppercase tracking-tight">
                    Lançamento de Frequência
                  </h3>
                  <p className="text-[10px] font-bold text-white/80 uppercase">
                    Aula do dia{" "}
                    {new Date(viewingAttendance.date).toLocaleDateString(
                      "pt-BR",
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setViewingAttendance(null)}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="max-h-[400px] overflow-y-auto p-4 space-y-2">
                {attendanceRecords.map((record, idx) => {
                  const studentInfo = students.find(
                    (s: any) => s.name === record.student_name,
                  );
                  const justification = absenceJustifications.find(
                    (j: any) =>
                      j.studentName === record.student_name &&
                      viewingAttendance &&
                      viewingAttendance.date >= j.startDate &&
                      viewingAttendance.date <= j.endDate,
                  );
                  const isTransferred =
                    studentInfo?.status === "Transferido" &&
                    studentInfo?.transferDate &&
                    viewingAttendance &&
                    viewingAttendance.date >= studentInfo.transferDate;

                  let displayStatus =
                    record.status === "present" ? "Presente" : "Faltou";
                  let btnStyle =
                    record.status === "present"
                      ? "bg-green-100 text-green-700 border border-green-200 hover:bg-green-200"
                      : "bg-red-100 text-red-700 border border-red-200 hover:bg-red-200";

                  if (justification) {
                    displayStatus = "Justificado";
                    btnStyle =
                      "bg-amber-100 text-amber-700 border border-amber-200 cursor-not-allowed";
                  } else if (isTransferred) {
                    displayStatus = "Inativo (Transf.)";
                    btnStyle =
                      "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 cursor-not-allowed";
                  }

                  return (
                    <div
                      key={record.student_name}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-800 gap-2"
                    >
                      <div className="flex flex-col">
                        <span className="font-black text-slate-700 dark:text-slate-200 text-xs uppercase">
                          {record.student_name}
                        </span>
                        {justification && (
                          <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 w-max uppercase">
                            <span>
                              📝 Atestado/Declaração: {justification.reason}
                            </span>
                            {justification.notes && (
                              <span className="opacity-75">
                                ({justification.notes})
                              </span>
                            )}
                          </div>
                        )}
                        {isTransferred && (
                          <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 mt-1 uppercase">
                            ℹ️ Transferido(a) em:{" "}
                            {new Date(
                              studentInfo.transferDate + "T00:00:00",
                            ).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          if (!justification && !isTransferred) {
                            toggleAttendance(idx);
                          }
                        }}
                        disabled={!!justification || isTransferred}
                        className={cn(
                          "px-4 py-1.5 rounded font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer",
                          btnStyle,
                        )}
                      >
                        {displayStatus}
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="p-6 border-t border-slate-200 dark:border-slate-800 text-left">
                <button
                  onClick={saveAttendance}
                  disabled={savingAttendance}
                  className="w-full bg-red-600 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg hover:shadow-red-500/40 transition-all disabled:opacity-50"
                >
                  {savingAttendance ? "Salvando..." : "Salvar Lista de Chamada"}
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
  onRefresh,
  user,
}: {
  exams: Exam[];
  isAdmin: boolean;
  schoolInfo: any;
  bimesters: string[];
  userProfile: any;
  onRefresh: () => void;
  user?: User | null;
}) {
  const allowedClasses = getFilteredClasses(userProfile, schoolInfo.classes);
  const [selectedClass, setSelectedClass] = useState(() => {
    return allowedClasses[0] || "";
  });
  const [selectedBimester, setSelectedBimester] = useState(bimesters[0] || "");
  const [selectedExamType, setSelectedExamType] = useState("TODAS");
  const [isEditing, setIsEditing] = useState(false);
  const [tempExams, setTempExams] = useState<Record<string, string>>({});
  const [tempDates, setTempDates] = useState<Record<string, string>>({});
  const [tempTypes, setTempTypes] = useState<Record<string, string>>({});
  const [tempSubjects, setTempSubjects] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newContentData, setNewContentData] = useState({
    subject: "",
    examDate: new Date().toISOString().split("T")[0],
    examType: schoolInfo.examCategories?.[0] || "PI",
    content: "",
  });

  const isAuthorized = (cls: string = "", sub: string = "") => {
    if (isAdmin) return true;
    if (!cls || !sub) return false;
    const assignedSubjects = userProfile?.assigned_subjects || [];
    const assignedClasses = userProfile?.assigned_classes || [];
    const examClasses = cls
      .split(",")
      .map((c: string) => c.trim())
      .filter(Boolean);
    const hasClass =
      examClasses.length === 0 ||
      examClasses.some((c: string) => assignedClasses.includes(c));
    return assignedSubjects.includes(sub) && hasClass;
  };

  const normalizeAndParseDate = (dateStr: string) => {
    if (!dateStr || dateStr === "Sem Data") return null;
    try {
      const cleanDate = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
      const parts = cleanDate.split("-");
      if (parts.length === 3) {
        return new Date(
          parseInt(parts[0]),
          parseInt(parts[1]) - 1,
          parseInt(parts[2]),
        );
      }
      const genericDate = new Date(dateStr);
      if (!isNaN(genericDate.getTime())) return genericDate;
      return null;
    } catch {
      return null;
    }
  };

  const getWeekdayName = (dateStr: string) => {
    const dateObj = normalizeAndParseDate(dateStr);
    if (!dateObj) return "";
    try {
      const dayName = dateObj.toLocaleDateString("pt-BR", { weekday: "long" });
      return dayName.charAt(0).toUpperCase() + dayName.slice(1);
    } catch {
      return "";
    }
  };

  const availableExamTypes = useMemo(() => {
    const nonDiary = exams.filter(
      (e) => !e.isDiaryOnly && !e.answerKey?._metadata?.isDiaryOnly && !e.answerKey?._metadata?.isAdapted,
    );
    const types = new Set(nonDiary.map((e) => e.examType));
    return ["TODAS", ...Array.from(types).sort()];
  }, [exams]);

  const filteredExams = useMemo(() => {
    const nonDiary = exams.filter(
      (e) => !e.isDiaryOnly && !e.answerKey?._metadata?.isDiaryOnly && !e.answerKey?._metadata?.isAdapted,
    );
    return nonDiary
      .filter((e) => {
        const classes = (e.classYear || "").split(",").map((s) => s.trim());
        return (
          classes.includes(selectedClass) &&
          e.bimester === selectedBimester &&
          (selectedExamType === "TODAS" || e.examType === selectedExamType)
        );
      })
      .sort((a, b) => {
        if (!a.examDate) return 1;
        if (!b.examDate) return -1;
        return new Date(a.examDate).getTime() - new Date(b.examDate).getTime();
      });
  }, [exams, selectedClass, selectedBimester, selectedExamType]);

  const examsByDate = useMemo(() => {
    const groups: Record<string, Exam[]> = {};
    filteredExams.forEach((e) => {
      const dateKey = e.examDate || "Sem Data";
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(e);
    });
    return groups;
  }, [filteredExams]);

  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const handleExportPDF = async () => {
    setIsExportingPDF(true);
    try {
      const filename = `Cronograma_Estudos_Provas_${selectedClass || "Geral"}_${selectedBimester || "Bimestre"}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "_");
      
      await new Promise((resolve) => setTimeout(resolve, 300));
      await exportToPDF("cronograma-container", filename);
    } catch (err) {
      console.error("Erro ao exportar PDF:", err);
      alert("Houve um erro ao exportar o PDF do cronograma.");
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleContentChange = (examId: string, content: string) => {
    setTempExams((prev) => ({ ...prev, [examId]: content }));
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const allModifiedIds = Array.from(
        new Set([
          ...Object.keys(tempExams),
          ...Object.keys(tempDates),
          ...Object.keys(tempTypes),
          ...Object.keys(tempSubjects),
        ]),
      );

      // Filter only those they have permission to edit
      const authorizedIds = allModifiedIds.filter((id) => {
        const examItem = exams.find((e) => e.id === id);
        if (!examItem) return false;
        const cls = examItem.classYear || selectedClass;
        const sub = tempSubjects[id] || examItem.subject;
        return (
          (isAuthorized(cls, sub) && !userProfile?.role?.includes("secretaria")) ||
          userProfile?.role?.includes("admin") ||
          userProfile?.role?.includes("vice_diretor")
        );
      });

      if (authorizedIds.length === 0 && allModifiedIds.length > 0) {
        alert("Acesso Negado: Você não tem permissão para editar estes conteúdos.");
        setIsSaving(false);
        return;
      }

      const updates = authorizedIds.map(async (id) => {
        const updatePayload: any = {};
        if (tempExams[id] !== undefined) updatePayload.content = tempExams[id];
        if (tempDates[id] !== undefined)
          updatePayload.exam_date = tempDates[id] ? tempDates[id] : null;
        if (tempTypes[id] !== undefined)
          updatePayload.exam_type = tempTypes[id];
        if (tempSubjects[id] !== undefined)
          updatePayload.subject = tempSubjects[id];

        const { error } = await supabase
          .from("exams")
          .update(updatePayload)
          .eq("id", id);
        if (error) {
          throw new Error(`Erro ao atualizar exame ${id}: ${error.message}`);
        }
      });

      await Promise.all(updates);
      alert("Alterações salvas com sucesso!");
      setIsEditing(false);
      setTempExams({});
      setTempDates({});
      setTempTypes({});
      setTempSubjects({});
      onRefresh();
    } catch (error: any) {
      console.error("Error saving content:", error);
      alert("Erro ao salvar conteúdo: " + (error?.message || error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    const examItem = exams.find((e) => e.id === id);
    if (!examItem) return;
    
    const cls = examItem.classYear || selectedClass;
    const sub = examItem.subject;
    const hasPermission = (
      (isAuthorized(cls, sub) && !userProfile?.role?.includes("secretaria")) ||
      userProfile?.role?.includes("admin") ||
      userProfile?.role?.includes("vice_diretor")
    );
    if (!hasPermission) {
      alert("Acesso Negado: Você não tem permissão para excluir este conteúdo.");
      return;
    }

    if (!confirm(`Deseja realmente excluir o conteúdo de "${title}"? Ele será enviado para a lixeira e poderá ser restaurado em até 15 dias.`)) return;

    try {
      const meta = examItem.answerKey?._metadata || {};
      const updatedAnswerKey = {
        ...(examItem.answerKey || {}),
        _metadata: {
          ...meta,
          deletedAt: new Date().toISOString()
        }
      };

      const { error } = await supabase
        .from("exams")
        .update({ answer_key: updatedAnswerKey })
        .eq("id", id);

      if (error) throw error;
      alert("Conteúdo excluído com sucesso!");
      onRefresh();
    } catch (error: any) {
      console.error("Error deleting content:", error);
      alert("Erro ao excluir conteúdo: " + (error?.message || error));
    }
  };

  const handleAddContent = async () => {
    if (!newContentData.subject) return;

    const cls = selectedClass;
    const sub = newContentData.subject;
    const hasPermission = (
      (isAuthorized(cls, sub) && !userProfile?.role?.includes("secretaria")) ||
      userProfile?.role?.includes("admin") ||
      userProfile?.role?.includes("vice_diretor")
    );
    if (!hasPermission) {
      alert("Acesso Negado: Você não tem permissão para adicionar conteúdo para esta disciplina nesta turma.");
      return;
    }

    try {
      const { error } = await supabase.from("exams").insert({
        professor_id: user?.id || userProfile?.uid || userProfile?.id,
        title: `CRONOGRAMA: ${newContentData.subject.toUpperCase()}`,
        class_year: selectedClass,
        subject: newContentData.subject,
        exam_type: newContentData.examType,
        exam_date: newContentData.examDate,
        bimester: selectedBimester,
        content: newContentData.content || "",
        questions: [],
        answer_key: {
          _metadata: {
            isExternal: true,
            subject: newContentData.subject,
            classYear: selectedClass,
            bimester: selectedBimester,
          },
        },
      });
      if (error) {
        alert("Erro ao adicionar conteúdo (Supabase): " + error.message);
        throw error;
      }
      alert("Conteúdo adicionado com sucesso!");
      setIsAdding(false);
      setNewContentData({
        subject: "",
        examDate: new Date().toISOString().split("T")[0],
        examType: schoolInfo.examCategories?.[0] || "PI",
        content: "",
      });
      onRefresh();
    } catch (error: any) {
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
        /* Standardizing content fonts, sizes, weights, and styles exactly as requested */
        .markdown-body, 
        .markdown-body *, 
        .markdown-body p, 
        .markdown-body span, 
        .markdown-body strong, 
        .markdown-body b, 
        .markdown-body em, 
        .markdown-body i, 
        .markdown-body font,
        .markdown-body div {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
          font-size: 11px !important;
          font-weight: normal !important;
          font-style: normal !important;
          color: #1e293b !important; /* slate-800 */
          text-decoration: none !important;
          line-height: 1.5 !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        .markdown-body ul, .markdown-body ol {
          padding-left: 12px !important;
          margin-top: 4px !important;
          margin-bottom: 4px !important;
          list-style-type: disc !important;
        }
        .markdown-body li {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
          font-size: 11px !important;
          font-weight: normal !important;
          font-style: normal !important;
          color: #1e293b !important;
          margin-bottom: 2px !important;
          list-style-type: disc !important;
        }

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
          .markdown-body, 
          .markdown-body *, 
          .markdown-body p, 
          .markdown-body span, 
          .markdown-body strong, 
          .markdown-body b, 
          .markdown-body em, 
          .markdown-body i, 
          .markdown-body font,
          .markdown-body div {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            font-size: 10px !important;
            font-weight: normal !important;
            font-style: normal !important;
            color: black !important;
            text-decoration: none !important;
            line-height: 1.4 !important;
          }
          .markdown-body li {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            font-size: 10px !important;
            font-weight: normal !important;
            font-style: normal !important;
            color: black !important;
          }
        }
      `}</style>

      <ViewHeader
        title="Cronograma de Estudos & Provas"
        subtitle="Organização do cronograma de estudos e conteúdo programático para as avaliações por período."
        icon={<Calendar className="w-5 h-5 text-gold" />}
        badge="Gestão Pedagógica"
      >
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-3 py-2 border rounded-xl font-black uppercase transition-all cursor-pointer bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
          >
            {renderClassOptions(allowedClasses)}
          </select>
          <select
            value={selectedBimester}
            onChange={(e) => setSelectedBimester(e.target.value)}
            className="px-3 py-2 border rounded-xl font-black uppercase transition-all cursor-pointer bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
          >
            {bimesters.map((b: string) => (<option key={b} value={b}>{b}</option>))}
          </select>
          <select
            value={selectedExamType}
            onChange={(e) => setSelectedExamType(e.target.value)}
            className="px-3 py-2 border rounded-xl font-black uppercase transition-all cursor-pointer bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
          >
            {availableExamTypes.map((t) => (<option key={t} value={t}>{t}</option>))}
          </select>

          <button
            onClick={() => {
              setNewContentData({
                subject: "",
                examDate: new Date().toISOString().split("T")[0],
                examType: schoolInfo.examCategories?.[0] || "PI",
                content: "",
              });
              setIsAdding(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-gold rounded-xl font-black text-[10px] uppercase tracking-wider transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Conteúdo</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (isEditing) {
                handleSaveAll();
              } else {
                setIsEditing(true);
              }
            }}
            disabled={isSaving}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-colors border shadow-sm cursor-pointer",
              isEditing
                ? "bg-amber-600 hover:bg-amber-700 text-white border-amber-600"
                : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700",
            )}
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isEditing ? (
              <Save className="w-3.5 h-3.5" />
            ) : (
              <Edit2 className="w-3.5 h-3.5" />
            )}
            <span>
              {isSaving ? "Salvando..." : isEditing ? "Salvar" : "Editar"}
            </span>
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            disabled={isExportingPDF}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500/30 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-md disabled:opacity-50"
          >
            {isExportingPDF ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5" />
            )}
            <span>{isExportingPDF ? "Exportando..." : "Exportar PDF"}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#a88d44] hover:bg-[#8e7432] text-white rounded-xl font-black text-[10px] uppercase tracking-wider transition-all border border-[#d4af37]/40 cursor-pointer shadow-md"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir</span>
          </button>
        </div>
      </ViewHeader>

      <div id="cronograma-container" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-8 md:p-12 print:p-0 print:shadow-none border border-slate-200 dark:border-slate-800/80 rounded-3xl shadow-xl print:border-none print-container">
        {/* Print Header */}
        <div className="flex flex-col items-center mb-6 border-b-4 border-black pb-4">
          <div className="flex items-center gap-4 mb-4">
            <img
              src={LOGO_VINHO}
              alt="Logo"
              className="w-12 h-12 object-contain"
            />
            <div className="text-left">
              <h1 className="text-xl font-black uppercase leading-none print:text-lg">
                Cronograma de Provas
              </h1>
              <p className="text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300 mt-0.5">
                Colégio Progresso Santista
              </p>
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
              {selectedExamType === "TODAS"
                ? "Todas Avaliações"
                : `Tipo: ${selectedExamType}`}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border-2 border-black">
            <thead className="bg-[#800020] text-white text-white">
                <tr className="transition-colors">
                <th className="p-2 text-left font-black uppercase text-[11px] border-r border-black w-[80px] text-white">
                  Data
                </th>
                <th className="p-2 text-left font-black uppercase text-[11px] border-r border-black w-[150px] text-white">
                  Avaliação
                </th>
                <th className="p-2 text-left font-black uppercase text-[11px] border-r border-black text-white">
                  Conteúdo Programático
                </th>
              </tr>
            </thead>
            <tbody className="divide-y border-b border-black divide-black">
              {Object.keys(examsByDate).length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="p-12 text-center text-slate-600 dark:text-slate-400 font-bold uppercase italic border-black"
                  >
                    Nenhum conteúdo cadastrado para esta seleção.
                  </td>
                </tr>
              ) : (
                Object.entries(examsByDate).map(([date, dailyExams]) => (
                  <tr key={date} className="print:break-inside-avoid">
                    <td className="p-2 border-r border-black align-top bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                      <div className="font-black text-sm leading-tight uppercase">
                        {(() => {
                          const dateObj = normalizeAndParseDate(date);
                          return dateObj
                            ? dateObj.toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                              })
                            : "-";
                        })()}
                      </div>
                      <div className="text-[9px] font-black text-rose-600 uppercase tracking-tight mt-1 whitespace-pre-wrap leading-tight">
                        {date !== "Sem Data" ? getWeekdayName(date) : ""}
                      </div>
                    </td>
                    <td className="p-2 border-r border-black align-top space-y-3">
                      {(dailyExams as Exam[]).map((ex) => (
                        <div
                          key={ex.id}
                          className="group relative space-y-1 p-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-sm"
                        >
                          {isEditing && ((isAuthorized(ex.classYear || selectedClass, ex.subject) && !userProfile?.role?.includes("secretaria")) || userProfile?.role?.includes("admin") || userProfile?.role?.includes("vice_diretor")) ? (
                            <div className="space-y-2 print:hidden">
                              <div>
                                <label className="text-[9px] font-bold uppercase text-slate-600 dark:text-slate-400 block mb-0.5">
                                  Disciplina
                                </label>
                                <input
                                  type="text"
                                  className="w-full p-1 border border-slate-200 dark:border-slate-800 rounded font-sans text-xs uppercase font-bold"
                                  value={
                                    tempSubjects[ex.id] ?? stripHtml(ex.subject)
                                  }
                                  onChange={(e) =>
                                    setTempSubjects((prev) => ({
                                      ...prev,
                                      [ex.id]: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-1.5">
                                <div>
                                  <label className="text-[9px] font-bold uppercase text-slate-600 dark:text-slate-400 block mb-0.5">
                                    Tipo
                                  </label>
                                  <select className="w-full p-1 border rounded font-sans uppercase font-bold border bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
                                    value={
                                      tempTypes[ex.id] ?? ex.examType ?? ""
                                    }
                                    onChange={(e) =>
                                      setTempTypes((prev) => ({
                                        ...prev,
                                        [ex.id]: e.target.value,
                                      }))
                                    }
                                  >
                                    {schoolInfo.examCategories?.map(
                                      (cat: string) => (
                                        <option key={cat} value={cat}>
                                          {cat}
                                        </option>
                                      ),
                                    )}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold uppercase text-slate-600 dark:text-slate-400 block mb-0.5">
                                    Data
                                  </label>
                                  <input
                                    type="date"
                                    className="w-full p-1 border border-slate-200 dark:border-slate-800 rounded font-sans text-xs font-bold"
                                    value={
                                      tempDates[ex.id] ??
                                      (ex.examDate
                                        ? ex.examDate.includes("T")
                                          ? ex.examDate.split("T")[0]
                                          : ex.examDate
                                        : "")
                                    }
                                    onChange={(e) =>
                                      setTempDates((prev) => ({
                                        ...prev,
                                        [ex.id]: e.target.value,
                                      }))
                                    }
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="inline-block px-1 py-px bg-black text-white text-[8px] font-black uppercase rounded-[2px]">
                                {ex.examType}
                              </div>
                              <div className="font-black text-primary text-[11px] uppercase leading-tight pr-6">
                                {stripHtml(ex.subject)}
                              </div>
                            </>
                          )}
                          {((isAuthorized(
                            ex.classYear || selectedClass,
                            ex.subject,
                          ) &&
                            !userProfile?.role?.includes("secretaria")) ||
                            userProfile?.role?.includes("admin") ||
                            userProfile?.role?.includes("vice_diretor")) && (
                            <button
                              onClick={() =>
                                handleDelete(ex.id, stripHtml(ex.subject))
                              }
                              className="absolute right-1 top-2 p-1 text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100 print:hidden"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </td>
                    <td className="p-2 border-r border-black align-top">
                      <div className="space-y-4">
                        {(dailyExams as Exam[]).map((ex: Exam) => (
                          <div key={ex.id} className="space-y-1">
                            {(dailyExams as Exam[]).length > 1 && (
                              <div className="text-[9px] font-black uppercase text-slate-600 dark:text-slate-400 border-b border-slate-50 pb-0.5">
                                {stripHtml(ex.subject)}:
                              </div>
                            )}
                            <div className="text-[11px] font-medium text-slate-700 dark:text-slate-200 leading-relaxed max-w-none">
                              {isEditing && ((isAuthorized(ex.classYear || selectedClass, ex.subject) && !userProfile?.role?.includes("secretaria")) || userProfile?.role?.includes("admin") || userProfile?.role?.includes("vice_diretor")) ? (
                                <textarea
                                  className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded font-sans text-xs min-h-[60px]"
                                  value={
                                    tempExams[ex.id] ??
                                    (ex.content ? stripHtml(ex.content) : "")
                                  }
                                  onChange={(e) =>
                                    handleContentChange(ex.id, e.target.value)
                                  }
                                  placeholder="Digite o conteúdo aqui..."
                                />
                              ) : (
                                <div className="markdown-body">
                                  {tempExams[ex.id] ? (
                                    <div className="whitespace-pre-wrap">
                                      {tempExams[ex.id]}
                                    </div>
                                  ) : ex.content ? (
                                    <div
                                      dangerouslySetInnerHTML={{
                                        __html: ex.content,
                                      }}
                                    />
                                  ) : (
                                    <span className="italic text-slate-600 dark:text-slate-400">
                                      Conteúdo não informado.
                                    </span>
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
              className="bg-white dark:bg-slate-900 border-4 border-black p-8 rounded-sm max-w-xl w-full shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]"
            >
              <h3 className="text-xl font-black uppercase mb-6 flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Adicionar Conteúdo
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 mb-1 block">
                    Disciplina
                  </label>
                  <select
                    value={newContentData.subject}
                    onChange={(e) =>
                      setNewContentData({
                        ...newContentData,
                        subject: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 rounded-lg font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
                  >
                    <option value="">Selecione a Disciplina...</option>
                    {(schoolInfo.subjects || [])
                      .filter((s: string) => {
                        if (isAdmin || userProfile?.role?.includes("admin") || userProfile?.role?.includes("vice_diretor")) return true;
                        return (userProfile?.assigned_subjects || []).includes(s);
                      })
                      .map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 mb-1 block">
                      Data
                    </label>
                    <input
                      type="date"
                      value={newContentData.examDate}
                      onChange={(e) =>
                        setNewContentData({
                          ...newContentData,
                          examDate: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border-2 border-black rounded-lg font-bold outline-none dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 mb-1 block">
                      Tipo
                    </label>
                    <select
                      value={newContentData.examType}
                      onChange={(e) =>
                        setNewContentData({
                          ...newContentData,
                          examType: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 rounded-lg font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
                    >
                      {(
                        schoolInfo.examCategories ||
                        DEFAULT_SCHOOL_INFO.examCategories
                      ).map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                      {!(
                        schoolInfo.examCategories ||
                        DEFAULT_SCHOOL_INFO.examCategories
                      ).includes("Cronograma") && (
                        <option value="Cronograma">Cronograma</option>
                      )}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 mb-1 block">
                    Conteúdo Programático
                  </label>
                  <textarea
                    rows={6}
                    placeholder="Cole ou digite aqui o conteúdo do cronograma..."
                    value={newContentData.content}
                    onChange={(e) =>
                      setNewContentData({
                        ...newContentData,
                        content: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border-2 border-black rounded-lg font-bold outline-none dark:bg-slate-800 dark:text-white font-sans text-sm focus:border-accent"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => setIsAdding(false)}
                    className="flex-1 py-3 px-4 border-2 border-black font-black uppercase text-xs hover:bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 transition-colors dark:text-slate-900 dark:text-white dark:hover:bg-slate-800"
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
          <p className="text-[9px] font-bold uppercase text-slate-700 dark:text-slate-300 italic">
            "A educação é a base para o desenvolvimento de um futuro
            extraordinário."
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
  bimesters,
  mode = "anual",
  selectedBimester = "1º Bimestre",
  lessons = [],
  attendanceRecords = [],
}: {
  key?: string | number;
  studentName: string;
  isLast?: boolean;
  results: Result[];
  exams: Exam[];
  isAdmin: boolean;
  userProfile: any;
  allPossibleStudents: any[];
  schoolInfo: any;
  bimesters: string[];
  mode?: "anual" | "bimestral";
  selectedBimester?: string;
  lessons?: Lesson[];
  attendanceRecords?: Attendance[];
}) {
  const studentResults = results.filter((r) => r.studentName === studentName);
  const studentInfo = allPossibleStudents.find((s) => s.name === studentName);
  const studentClass = studentInfo?.classId || "N/A";

  // Subjects specifically for this class according to schoolInfo mapping
  const subjects = useMemo(() => {
    const defined = schoolInfo.class_subjects[studentClass];
    if (defined && defined.length > 0) return defined;
    // Fallback to all school subjects if no mapping is defined
    return schoolInfo.subjects;
  }, [studentClass, schoolInfo]);

  const filteredSubjects = useMemo(() => {
    let list = subjects;
    if (!isAdmin && userProfile?.assigned_subjects) {
      list = list.filter((s) => userProfile.assigned_subjects.includes(s));
    }
    return list;
  }, [subjects, isAdmin, userProfile]);

  const getSubjectBimesterAbsences = (subject: string, bimester: string) => {
    const subjectLessons = lessons.filter(
      (l) =>
        l.bimester === bimester &&
        stripHtml(l.subject).trim().toLowerCase() ===
          stripHtml(subject).trim().toLowerCase(),
    );

    let totalAbsences = 0;
    subjectLessons.forEach((lesson) => {
      const isAbsent = attendanceRecords.some(
        (r) =>
          r.lesson_id === lesson.id &&
          r.student_name?.trim().toLowerCase() ===
            studentName.trim().toLowerCase() &&
          r.status === "absent",
      );
      if (isAbsent) {
        totalAbsences += Number(lesson.lesson_count || 0);
      }
    });

    return totalAbsences;
  };

  return (
    <div
      key={studentName}
      className={cn(
        "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-black p-4 md:p-12 print:p-8 w-full max-w-5xl mx-auto mb-8 print:mb-0 print:min-h-[297mm] print:break-inside-avoid print-avoid-break flex flex-col",
        isLast ? "" : "print:break-after-page",
      )}
    >
      {/* HEADER BOLETIM MEK */}
      <div className="flex flex-col sm:flex-row items-center justify-between border-b-4 border-black pb-4 mb-8 gap-4">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded px-1 flex flex-col items-center justify-center font-black text-[10px] text-slate-600 dark:text-slate-400 overflow-hidden border-2 border-black">
            <img
              src={LOGO_VINHO}
              alt="Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-black uppercase tracking-tighter leading-none">
              Boletim Escolar
            </h1>
            <p className="text-[10px] md:text-[12px] font-black uppercase text-black mt-1">
              Educação Infantil ⬢ Ensino Fundamental I e II
            </p>
          </div>
        </div>
        <div className="text-center sm:text-right">
          <p className="text-sm md:text-lg font-black uppercase">
            Ano Letivo: 2026
          </p>
          <p className="text-[10px] md:text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
            Emissão: {new Date().toLocaleDateString("pt-BR")}
          </p>
        </div>
      </div>

      {/* INFO ALUNO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="flex items-stretch border-2 border-black rounded-sm overflow-hidden">
          <div className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-r-2 border-black px-4 py-2 min-w-[100px] flex items-center justify-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-center">
              Aluno(a)
            </span>
          </div>
          <div className="px-4 py-2 flex-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex items-center">
            <span className="text-base font-black uppercase tracking-tight">
              {studentName}
            </span>
          </div>
        </div>
        <div className="flex items-stretch border-2 border-black rounded-sm overflow-hidden">
          <div className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-r-2 border-black px-4 py-2 min-w-[100px] flex items-center justify-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-center">
              Turma
            </span>
          </div>
          <div className="px-4 py-2 flex-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex items-center">
            <span className="text-base font-black uppercase tracking-tight">
              {studentClass}
            </span>
          </div>
        </div>
      </div>

      {/* QUADRO DE NOTAS */}
      <div className="border-2 border-black rounded-sm overflow-x-auto md:overflow-hidden flex-1 select-text scrollbar-thin">
        {mode === "bimestral" ? (
          <table className="w-full border-collapse">
            <thead className="bg-[#800020] text-white text-white">
                <tr className="transition-colors">
                <th className="border-r-2 border-black p-3 text-left text-[12px] font-black uppercase w-1/3 bg-slate-800 border border-slate-700 / text-white">
                  Componentes Curriculares
                </th>
                <th className="border-r-2 border-black p-3 text-left text-[11px] font-black uppercase w-[35%] text-white">
                  Avaliações ({selectedBimester})
                </th>
                <th className="border-r-2 border-black p-3 text-center text-[11px] font-black uppercase text-white">
                  Média Parcial
                </th>
                <th className="border-r-2 border-black p-3 text-center text-[11px] font-black uppercase text-white">
                  Recuperação
                </th>
                <th className="border-r-2 border-black p-3 text-center text-[11px] font-black uppercase text-white">
                  Faltas
                </th>
                <th className="p-3 text-center text-[12px] font-black uppercase bg-slate-800 border border-slate-700  text-white">
                  Nota Bimestral
                </th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-black">
              {filteredSubjects.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="p-8 text-center text-sm font-black uppercase text-slate-600 dark:text-slate-400"
                  >
                    Nenhum componente avaliado no sistema.
                  </td>
                </tr>
              )}
              {filteredSubjects.map((subject) => {
                const subjectBimResults = studentResults.filter((r) => {
                  const ex = exams.find((e) => e.id === r.examId);
                  const bimesterVal = r.bimester || ex?.bimester;
                  return (
                    bimesterVal === selectedBimester &&
                    ex &&
                    stripHtml(ex.subject) === subject
                  );
                });

                // Separate Regular from Recovery
                const regular = subjectBimResults.filter((r) => {
                  const ex = exams.find((e) => e.id === r.examId);
                  const isScoreValid = r.score !== null && r.score !== undefined && !isNaN(Number(r.score));
                  return (
                    ex && !ex.examType?.toLowerCase().includes("recuperação") && isScoreValid
                  );
                });
                const recovery = subjectBimResults.find((r) => {
                  const ex = exams.find((e) => e.id === r.examId);
                  const isScoreValid = r.score !== null && r.score !== undefined && !isNaN(Number(r.score));
                  return (
                    ex && ex.examType?.toLowerCase().includes("recuperação") && isScoreValid
                  );
                });

                const baseAvg =
                  regular.length > 0
                    ? regular.reduce(
                        (acc, r) => acc + (Number(r.score) / r.maxScore) * 10,
                        0,
                      ) / regular.length
                    : 0;

                let finalBimGrade = baseAvg;
                let hasRecOption = baseAvg < 6 && regular.length > 0;
                if (recovery && hasRecOption) {
                  const recScore = (Number(recovery.score) / recovery.maxScore) * 10;
                  finalBimGrade = (baseAvg + recScore) / 2;
                }

                const bimAbs = getSubjectBimesterAbsences(
                  subject,
                  selectedBimester,
                );

                return (
                  <tr key={subject}>
                    <td className="border-r-2 border-black p-3 pl-4 text-[12px] font-black uppercase">
                      {stripHtml(subject)}
                    </td>
                    <td className="border-r-2 border-black p-3 text-[11px] font-bold text-slate-700 dark:text-slate-300 leading-relaxed uppercase">
                      {regular.length === 0 ? (
                        <span className="text-slate-600 dark:text-slate-400 text-xs font-medium italic lowercase">
                          nenhuma avaliação lançada
                        </span>
                      ) : (
                        <div className="space-y-1">
                          {regular.map((r) => {
                            const ex = exams.find((e) => e.id === r.examId);
                            const val = (Number(r.score) / r.maxScore) * 10;
                            return (
                              <div
                                key={r.id}
                                className="flex justify-between border-b border-black/5 pb-0.5 last:border-0 pr-2"
                              >
                                <span className="font-bold text-slate-700 dark:text-slate-300 text-[10px]">
                                  {stripHtml(ex?.title || "Avaliação")}
                                </span>
                                <span
                                  className={
                                    val >= 6
                                      ? "font-black text-blue-800 text-[11px]"
                                      : "font-black text-red-700 text-[11px]"
                                  }
                                >
                                  {val.toFixed(1).replace(".", ",")}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td className="border-r-2 border-black p-3 text-center text-[15px] font-black">
                      {regular.length > 0 ? (
                        <span
                          className={
                            baseAvg < 6 ? "text-red-700" : "text-blue-800"
                          }
                        >
                          {baseAvg.toFixed(1).replace(".", ",")}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="border-r-2 border-black p-3 text-center text-[15px] font-black">
                      {recovery ? (
                        <span className="text-purple-700">
                          {((recovery.score / recovery.maxScore) * 10)
                            .toFixed(1)
                            .replace(".", ",")}
                        </span>
                      ) : hasRecOption && regular.length > 0 ? (
                        <span className="text-slate-700 dark:text-slate-300 font-bold">-</span>
                      ) : (
                        <span className="text-slate-700 dark:text-slate-200">-</span>
                      )}
                    </td>
                    <td className="border-r-2 border-black p-3 text-center text-[15px] font-black">
                      {bimAbs > 0 ? (
                        <span className="text-red-700 font-extrabold">
                          {bimAbs}
                        </span>
                      ) : (
                        <span className="text-slate-700 dark:text-slate-300 font-bold">0</span>
                      )}
                    </td>
                    <td className="p-3 text-center text-[16px] font-black bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                      {regular.length > 0 ? (
                        <span
                          className={
                            finalBimGrade < 6
                              ? "text-red-800"
                              : "text-blue-900 font-extrabold"
                          }
                        >
                          {finalBimGrade.toFixed(1).replace(".", ",")}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <table className="w-full border-collapse">
            <thead className="bg-[#800020] text-white text-white">
                <tr className="transition-colors">
                <th
                  rowSpan={2}
                  className="border-r-2 border-black p-3 text-left text-[12px] font-black uppercase w-1/4 align-middle"
                >
                  Componentes Curriculares
                </th>
                <th
                  colSpan={2}
                  className="border-r-2 border-black p-2 text-center text-[11px] font-black uppercase"
                >
                  1º Bim
                </th>
                <th
                  colSpan={2}
                  className="border-r-2 border-black p-2 text-center text-[11px] font-black uppercase"
                >
                  2º Bim
                </th>
                <th
                  colSpan={2}
                  className="border-r-2 border-black p-2 text-center text-[11px] font-black uppercase"
                >
                  3º Bim
                </th>
                <th
                  colSpan={2}
                  className="border-r-2 border-black p-2 text-center text-[11px] font-black uppercase"
                >
                  4º Bim
                </th>
                <th
                  colSpan={2}
                  className="p-2 text-center text-[12px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-l border-black"
                >
                  Resultado Final
                </th>
              </tr>
              <tr className="border-b-2 border-black bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-[9px] font-black uppercase">
                <th className="border-r border-black p-1 text-center w-[8%] text-white">
                  Nota
                </th>
                <th className="border-r-2 border-black p-1 text-center w-[6%]  text-white">
                  Faltas
                </th>
                <th className="border-r border-black p-1 text-center w-[8%] text-white">
                  Nota
                </th>
                <th className="border-r-2 border-black p-1 text-center w-[6%]  text-white">
                  Faltas
                </th>
                <th className="border-r border-black p-1 text-center w-[8%] text-white">
                  Nota
                </th>
                <th className="border-r-2 border-black p-1 text-center w-[6%]  text-white">
                  Faltas
                </th>
                <th className="border-r border-black p-1 text-center w-[8%] text-white">
                  Nota
                </th>
                <th className="border-r-2 border-black p-1 text-center w-[6%]  text-white">
                  Faltas
                </th>
                <th className="border-r border-black p-1 text-center bg-slate-800 border border-slate-700  text-blue-900 w-[10%] text-white">
                  Média
                </th>
                <th className="p-1 text-center bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 w-[8%] text-slate-900 dark:text-white">
                  Faltas T.
                </th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-black">
              {filteredSubjects.length === 0 && (
                <tr>
                  <td
                    colSpan={11}
                    className="p-8 text-center text-sm font-black uppercase text-slate-600 dark:text-slate-400"
                  >
                    Nenhuma disciplina avaliada neste período.
                  </td>
                </tr>
              )}
              {filteredSubjects.map((subject) => {
                const rowBimFinals: (number | null)[] = bimesters.map((bim) => {
                  const subjectBimResults = studentResults.filter((r) => {
                    const ex = exams.find((e) => e.id === r.examId);
                    const bimesterVal = r.bimester || ex?.bimester;
                    return (
                      bimesterVal === bim &&
                      ex &&
                      stripHtml(ex.subject) === subject
                    );
                  });

                  // Separate Regular from Recovery
                  const regular = subjectBimResults.filter((r) => {
                    const ex = exams.find((e) => e.id === r.examId);
                    const isScoreValid = r.score !== null && r.score !== undefined && !isNaN(Number(r.score));
                    return (
                      ex && !ex.examType?.toLowerCase().includes("recuperação") && isScoreValid
                    );
                  });
                  const recovery = subjectBimResults.find((r) => {
                    const ex = exams.find((e) => e.id === r.examId);
                    const isScoreValid = r.score !== null && r.score !== undefined && !isNaN(Number(r.score));
                    return (
                      ex && ex.examType?.toLowerCase().includes("recuperação") && isScoreValid
                    );
                  });

                  if (regular.length === 0) return null;

                  const baseAvg =
                    regular.reduce(
                      (acc, r) => acc + (Number(r.score) / r.maxScore) * 10,
                      0,
                    ) / regular.length;

                  if (recovery && baseAvg < 6) {
                    const recScore = (Number(recovery.score) / recovery.maxScore) * 10;
                    return (baseAvg + recScore) / 2;
                  }

                  return baseAvg;
                });

                // Recuperação Final
                const yearRecovery = studentResults.find((r) => {
                  const ex = exams.find((e) => e.id === r.examId);
                  const isScoreValid = r.score !== null && r.score !== undefined && !isNaN(Number(r.score));
                  return (
                    ex &&
                    stripHtml(ex.subject) === subject &&
                    ex.examType === "Recuperação Final" &&
                    isScoreValid
                  );
                });

                const validBims = rowBimFinals.filter((v) => v !== null) as number[];
                const mediaAnualBase = validBims.length > 0
                  ? validBims.reduce((acc, curr) => acc + curr, 0) / validBims.length
                  : 0;

                let mediaFinalTotal = mediaAnualBase;
                let needsRecuperacaoFinal = mediaAnualBase < 6 && validBims.length > 0;
                if (yearRecovery && needsRecuperacaoFinal) {
                  const recFinalScore =
                    (Number(yearRecovery.score) / yearRecovery.maxScore) * 10;
                  mediaFinalTotal = (mediaAnualBase + recFinalScore) / 2;
                }

                // Compute absences for each bimester
                const bimAbsences = bimesters.map((bim) =>
                  getSubjectBimesterAbsences(subject, bim),
                );
                const totalYearAbs = bimAbsences.reduce(
                  (acc, curr) => acc + curr,
                  0,
                );

                const hasScores = rowBimFinals.some((b) => b !== null);

                return (
                  <tr key={subject}>
                    <td className="border-r-2 border-black p-2 pl-4 text-[12px] font-black uppercase">
                      {stripHtml(subject)}
                    </td>
                    {rowBimFinals.map((avg, i) => (
                      <React.Fragment key={i}>
                        {/* Nota sub-column */}
                        <td className="border-r border-black p-2 text-center text-[14px] font-black">
                          {avg !== null ? (
                            <span
                              className={
                                avg < 6 ? "text-red-700" : "text-blue-800"
                              }
                            >
                              {avg.toFixed(1).replace(".", ",")}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        {/* Faltas sub-column */}
                        <td className="border-r-2 border-black p-2 text-center text-[12px] font-extrabold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                          {bimAbsences[i] > 0 ? (
                            <span className="text-red-700 bg-red-50 px-1 py-0.5 rounded font-black text-[10px]">
                              {bimAbsences[i]}
                            </span>
                          ) : (
                            <span className="text-slate-700 dark:text-slate-300 font-normal">
                              0
                            </span>
                          )}
                        </td>
                      </React.Fragment>
                    ))}
                    {/* Media Final sub-column */}
                    <td className="border-r border-black p-2 text-center text-[16px] font-black bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                      {hasScores ? (
                        <span
                          className={
                            mediaFinalTotal >= 6
                              ? "text-blue-900 underline decoration-2 underline-offset-4"
                              : "text-red-800 underline decoration-2 underline-offset-4"
                          }
                        >
                          {mediaFinalTotal.toFixed(1).replace(".", ",")}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    {/* Total Faltas sub-column */}
                    <td className="p-2 text-center text-[13px] font-extrabold bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                      {totalYearAbs > 0 ? (
                        <span className="text-red-900 bg-red-100/70 px-1.5 py-0.5 rounded font-black text-[10px] uppercase">
                          {totalYearAbs}f
                        </span>
                      ) : (
                        <span className="text-slate-700 dark:text-slate-300 font-normal">0</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* INFO EXTRA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <div className="border-2 border-black p-4 text-[11px] uppercase font-black text-black rounded-sm leading-relaxed">
          <h4 className="border-b border-black pb-1 mb-2">
            Legenda / Critérios
          </h4>
          <p>⬢ Média para Aprovação: 6,0</p>
          <p>⬢ Recuperação Bimestral: (Média + Recuperação) / 2</p>
          <p>⬢ Média Final Anual: (Soma Bimestres + Rec. Final) / 2</p>
        </div>
        <div className="border-2 border-black p-4 text-[11px] uppercase font-black text-black rounded-sm flex flex-col justify-center">
          <p className="text-center italic opacity-70">
            "A educação é o passaporte para o futuro."
          </p>
        </div>
      </div>

      {/* FOOTER ASSINATURAS */}
      <div className="grid grid-cols-2 gap-16 mt-32 px-12 pb-12">
        <div className="border-t-2 border-black pt-4 text-center">
          <p className="text-[12px] font-black uppercase">
            Direção / Coordenação
          </p>
        </div>
        <div className="border-t-2 border-black pt-4 text-center">
          <p className="text-[12px] font-black uppercase">
            Assinatura do Responsável
          </p>
        </div>
      </div>
    </div>
  );
}

function BoletimView({
  results,
  exams,
  user,
  isAdmin,
  userProfile,
  onRefresh,
}: {
  results: Result[];
  exams: Exam[];
  isAdmin: boolean;
  user: User;
  userProfile: any;
  onRefresh: () => void;
}) {
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [boletimMode, setBoletimMode] = useState<"anual" | "bimestral">(
    "bimestral",
  );
  const [selectedBoletimBimester, setSelectedBoletimBimester] =
    useState("1º Bimestre");

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  useEffect(() => {
    if (!selectedClass) {
      setLessons([]);
      setAttendanceRecords([]);
      return;
    }
    let isMounted = true;
    const fetchAttendanceData = async () => {
      setLoadingAttendance(true);
      try {
        const { data: lessonData } = await supabase
          .from("lessons")
          .select("*")
          .eq("class_id", selectedClass);

        if (!isMounted) return;

        const fetchedLessons = lessonData || [];
        setLessons(fetchedLessons);

        if (fetchedLessons.length > 0) {
          const lessonIds = fetchedLessons.map((l) => l.id);
          const { data: attData } = await supabase
            .from("attendance")
            .select("*")
            .in("lesson_id", lessonIds);

          if (!isMounted) return;
          setAttendanceRecords(attData || []);
        } else {
          setAttendanceRecords([]);
        }
      } catch (err) {
        console.error("Erro ao carregar faltas para o boletim:", err);
      } finally {
        if (isMounted) {
          setLoadingAttendance(false);
        }
      }
    };

    fetchAttendanceData();
    return () => {
      isMounted = false;
    };
  }, [selectedClass]);

  const schoolInfo = getSchoolInfo();
  const classes = getFilteredClasses(userProfile, schoolInfo.classes);
  const bimesters = [
    "1º Bimestre",
    "2º Bimestre",
    "3º Bimestre",
    "4º Bimestre",
  ];

  const allPossibleStudents = useMemo(() => {
    const rawList = Object.values(schoolInfo.studentsDB).flat() as any[];
    return rawList.filter((s: any) => classes.includes(s.classId));
  }, [schoolInfo.studentsDB, classes]);

  const studentsFiltered = useMemo(() => {
    let list = allPossibleStudents;

    if (selectedClass) {
      list = list.filter((s: any) => s.classId === selectedClass);
    }
    if (searchTerm) {
      list = list.filter((s: any) =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }
    return list.map((s) => s.name).sort();
  }, [allPossibleStudents, selectedClass, searchTerm]);

  const handlePrint = () => {
    window.print();
  };

  const handlePrintAll = () => {
    if (studentsFiltered.length === 0) return;
    if (
      studentsFiltered.length > 50 &&
      !window.confirm(
        `Você está prestes a gerar ${studentsFiltered.length} boletins. Isso pode deixar o sistema lento. Deseja continuar?`,
      )
    )
      return;
    setSelectedStudent("TODOS");
    setTimeout(() => window.print(), 800);
  };

  // State and Handlers for formatted pdf exports
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfProgress, setPdfProgress] = useState("");
  const [pdfStudentsToRender, setPdfStudentsToRender] = useState<string[]>([]);

  const handleExportSinglePDF = async (studentName: string) => {
    if (!studentName) return;
    try {
      setIsGeneratingPDF(true);
      setPdfProgress("Iniciando geração de PDF estruturado...");
      setPdfStudentsToRender([studentName]);

      // Delay to let React render and paint the offscreen container
      await new Promise((resolve) => setTimeout(resolve, 600));

      setPdfProgress("Capturando boletim acadêmico...");
      const filename = `Boletim_${studentName.replace(/\s+/g, "_")}_${selectedClass || "Geral"}`;
      await exportToPDF("pdf-single-student", filename);
    } catch (err) {
      console.error("Erro ao exportar PDF:", err);
      alert(
        "Houve um erro ao exportar o PDF do aluno. Por favor, tente novamente.",
      );
    } finally {
      setIsGeneratingPDF(false);
      setPdfProgress("");
      setPdfStudentsToRender([]);
    }
  };

  const handleExportAllPDF = async () => {
    if (studentsFiltered.length === 0) return;
    if (
      studentsFiltered.length > 50 &&
      !window.confirm(
        `Você está prestes a gerar ${studentsFiltered.length} boletins em PDF. Isso pode demorar bastante tempo. Deseja continuar?`,
      )
    )
      return;

    try {
      setIsGeneratingPDF(true);
      setPdfProgress("Preparando relatórios acadêmicos...");
      setPdfStudentsToRender(studentsFiltered);

      // Delay to let React render all student elements completely
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const filename = `Boletins_Lote_Turma_${selectedClass || "Geral"}`;
      await exportMultipleToPDF("boletim-pdf-page", filename, (msg) => {
        setPdfProgress(msg);
      });
    } catch (err) {
      console.error("Erro ao exportar lote PDF:", err);
      alert(
        "Houve um erro ao emitir os PDFs em lote. Se o problema persistir, reduza a lista de alunos e tente novamente.",
      );
    } finally {
      setIsGeneratingPDF(false);
      setPdfProgress("");
      setPdfStudentsToRender([]);
    }
  };

  // Se nenhum aluno selecionado, mostra a lista para escolher
  if (!selectedStudent) {
    // If no class selected, show the Grid of Classes
    if (!selectedClass) {
      const availableClasses = getFilteredClasses(
        userProfile,
        schoolInfo.classes,
      );
      const infantilClasses = availableClasses.filter(
        (c) =>
          schoolInfo.classModalities?.[c] === "infantil" ||
          (!schoolInfo.classModalities?.[c] && (
            c.toLowerCase().includes("maternal") ||
            c.toLowerCase().includes("jardim") ||
            c.toLowerCase().includes("pré") ||
            c.toLowerCase().includes("infantil")
          )),
      );
      const fund1Classes = availableClasses.filter(
        (c) =>
          schoolInfo.classModalities?.[c] === "fund1" ||
          (!schoolInfo.classModalities?.[c] && (
            !infantilClasses.includes(c) &&
            (/^[1-5]/.test(c) ||
              c.toLowerCase().includes("1º") ||
              c.toLowerCase().includes("2º") ||
              c.toLowerCase().includes("3º") ||
              c.toLowerCase().includes("4º") ||
              c.toLowerCase().includes("5º"))
          )),
      );
      const fund2Classes = availableClasses.filter(
        (c) =>
          schoolInfo.classModalities?.[c] === "fund2" ||
          (!schoolInfo.classModalities?.[c] && (
            !infantilClasses.includes(c) &&
            (/^[6-9]/.test(c) ||
              c.toLowerCase().includes("6º") ||
              c.toLowerCase().includes("7º") ||
              c.toLowerCase().includes("8º") ||
              c.toLowerCase().includes("9º"))
          )),
      );
      const otherClasses = availableClasses.filter(
        (c) =>
          !infantilClasses.includes(c) &&
          !fund1Classes.includes(c) &&
          !fund2Classes.includes(c),
      );

      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 max-w-7xl mx-auto print:hidden"
        >
          <ViewHeader
            title="Boletins Escolares"
            subtitle="Geração consolidada de relatórios, notas e boletins acadêmicos do corpo discente por turma."
            icon={<FileSpreadsheet className="w-5 h-5 text-gold" />}
            badge="Painel Pedagógico"
          />
          <div className="bg-white/ backdrop-blur-md p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800/60">
            {infantilClasses.length === 0 &&
              fund1Classes.length === 0 &&
              fund2Classes.length === 0 &&
              otherClasses.length === 0 && (
                <div className="text-center py-20 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  <School className="w-12 h-12 text-slate-700 dark:text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-700 dark:text-slate-300 text-sm font-black uppercase tracking-wider">
                    Nenhuma turma atribuída ao seu perfil
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 text-xs mt-1">
                    Entre em contato com o administrador para vincular suas
                    turmas.
                  </p>
                </div>
              )}

            {infantilClasses.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-emerald-100">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <h3 className="text-xs font-black text-emerald-600 uppercase tracking-widest">
                    Ensino Infantil
                  </h3>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2 sm:gap-3">
                  {infantilClasses.map((c, i) => {
                    const studentCount = allPossibleStudents.filter(
                      (s: any) => s.classId === c,
                    ).length;
                    return (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20, delay: i * 0.03 }}
                        key={c}
                        onClick={() => setSelectedClass(c)}
                        className="p-2 sm:p-3 text-left bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-500/5 transition-all active:scale-[0.98] group relative overflow-hidden flex flex-col justify-between min-h-[80px]"
                      >
                        <div className="absolute top-0 left-0 w-1 sm:w-1.5 h-full bg-emerald-500"></div>
                        <div className="pl-1 sm:pl-2">
                          <span className="text-[9px] sm:text-[10px] font-black text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase">
                            Infantil
                          </span>
                          <h4 className="text-base font-black text-slate-700 dark:text-slate-100 mt-1 tracking-tight group-hover:text-emerald-600 transition-colors">
                            {c}
                          </h4>
                          <p className="text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-400 mt-1 uppercase tracking-wider flex items-center gap-1">
                            <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" />{" "}
                            {studentCount}
                          </p>
                          <div className="mt-2 text-[9px] sm:text-[10px] font-black text-emerald-600 uppercase tracking-wider flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                            Acessar{" "}
                            <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}

            {fund1Classes.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-rose-100">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  <h3 className="text-xs font-black text-rose-600 uppercase tracking-widest">
                    Ensino Fundamental I (1º ao 5º ano)
                  </h3>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2 sm:gap-3">
                  {fund1Classes.map((c, i) => {
                    const studentCount = allPossibleStudents.filter(
                      (s: any) => s.classId === c,
                    ).length;
                    return (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20, delay: i * 0.03 }}
                        key={c}
                        onClick={() => setSelectedClass(c)}
                        className="p-2 sm:p-3 text-left bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl hover:border-rose-500 hover:shadow-xl hover:shadow-rose-500/5 transition-all active:scale-[0.98] group relative overflow-hidden flex flex-col justify-between min-h-[80px]"
                      >
                        <div className="absolute top-0 left-0 w-1 sm:w-1.5 h-full bg-rose-500"></div>
                        <div className="pl-1 sm:pl-2">
                          <span className="text-[9px] sm:text-[10px] font-black text-rose-500 bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded-full uppercase">
                            Fund 1
                          </span>
                          <h4 className="text-base font-black text-slate-700 dark:text-slate-100 mt-1 tracking-tight group-hover:text-rose-600 transition-colors">
                            {c}
                          </h4>
                          <p className="text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-400 mt-1 uppercase tracking-wider flex items-center gap-1">
                            <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" />{" "}
                            {studentCount}
                          </p>
                          <div className="mt-2 text-[9px] sm:text-[10px] font-black text-rose-600 uppercase tracking-wider flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                            Acessar{" "}
                            <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}

            {fund2Classes.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-blue-100">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest">
                    Ensino Fundamental II (6º ao 9º ano)
                  </h3>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2 sm:gap-3">
                  {fund2Classes.map((c, i) => {
                    const studentCount = allPossibleStudents.filter(
                      (s: any) => s.classId === c,
                    ).length;
                    return (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20, delay: i * 0.03 }}
                        key={c}
                        onClick={() => setSelectedClass(c)}
                        className="p-2 sm:p-3 text-left bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/5 transition-all active:scale-[0.98] group relative overflow-hidden flex flex-col justify-between min-h-[80px]"
                      >
                        <div className="absolute top-0 left-0 w-1 sm:w-1.5 h-full bg-blue-500"></div>
                        <div className="pl-1 sm:pl-2">
                          <span className="text-[9px] sm:text-[10px] font-black text-blue-500 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-full uppercase">
                            Fund 2
                          </span>
                          <h4 className="text-base font-black text-slate-700 dark:text-slate-100 mt-1 tracking-tight group-hover:text-blue-600 transition-colors">
                            {c}
                          </h4>
                          <p className="text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-400 mt-1 uppercase tracking-wider flex items-center gap-1">
                            <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" />{" "}
                            {studentCount}
                          </p>
                          <div className="mt-2 text-[9px] sm:text-[10px] font-black text-blue-600 uppercase tracking-wider flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                            Acessar{" "}
                            <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          </div>
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
                  <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                    Outros Segmentos
                  </h3>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2 sm:gap-3">
                  {otherClasses.map((c, i) => {
                    const studentCount = allPossibleStudents.filter(
                      (s: any) => s.classId === c,
                    ).length;
                    return (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20, delay: i * 0.03 }}
                        key={c}
                        onClick={() => setSelectedClass(c)}
                        className="p-2 sm:p-3 text-left bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl hover:border-slate-500 hover:shadow-xl hover:shadow-slate-500/5 transition-all active:scale-[0.98] group relative overflow-hidden flex flex-col justify-between min-h-[80px]"
                      >
                        <div className="absolute top-0 left-0 w-1 sm:w-1.5 h-full bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-2000"></div>
                        <div className="pl-1 sm:pl-2">
                          <span className="text-[9px] sm:text-[10px] font-black text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full uppercase">
                            Outros
                          </span>
                          <h4 className="text-base font-black text-slate-700 dark:text-slate-100 mt-1 tracking-tight group-hover:text-slate-700 dark:text-slate-300 transition-colors">
                            {c}
                          </h4>
                          <p className="text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-400 mt-1 uppercase tracking-wider flex items-center gap-1">
                            <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" />{" "}
                            {studentCount}
                          </p>
                          <div className="mt-2 text-[9px] sm:text-[10px] font-black text-slate-605 uppercase tracking-wider flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                            Acessar{" "}
                            <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      );
    }

    // A specific class is selected: show students in that class
    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 max-w-7xl mx-auto print:hidden"
        >
          <ViewHeader
            title={`Boletins da Turma ${selectedClass}`}
            subtitle="Geração consolidada de relatórios, notas e históricos acadêmicos por aluno da turma."
            icon={<FileSpreadsheet className="w-5 h-5 text-gold" />}
            badge={`${selectedClass}`}
          >
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedClass("")}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-md"
              >
                ← Voltar para Turmas
              </button>
              {studentsFiltered.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrintAll}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#a88d44] hover:bg-[#8e7432] text-white rounded-xl font-black text-[10px] uppercase tracking-wider transition-all shadow-md cursor-pointer border border-[#d4af37]/45"
                  >
                    <Printer className="w-3.5 h-3.5 text-white" />
                    <span>Impressão em Lote ({studentsFiltered.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportAllPDF}
                    disabled={isGeneratingPDF}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[10px] uppercase tracking-wider transition-all shadow-md cursor-pointer border border-emerald-500/30 disabled:opacity-50"
                  >
                    <FileText className="w-3.5 h-3.5 text-white" />
                    <span>Exportar Lote PDF ({studentsFiltered.length})</span>
                  </button>
                </>
              )}
            </div>
          </ViewHeader>

          <div className="bg-white/ backdrop-blur-md p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800/60">
            <div className="mb-6">
              <label className="block text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase mb-2 tracking-widest ml-1">
                Pesquisar Aluno na Turma
              </label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3b5998]" />
                <input
                  type="text"
                  placeholder="DIGITE O NOME DO ALUNO..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-2 border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-[#3b5998] focus:bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-black text-xs text-slate-800 dark:text-slate-200 transition-all uppercase"
                />
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-inner">
              {studentsFiltered.length > 0 ? (
                <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 p-2 sm:p-4 gap-2 sm:gap-3">
                    {studentsFiltered.map((studentName, i) => {
                      const studentClass =
                        allPossibleStudents.find((s) => s.name === studentName)
                          ?.classId || "N/A";
                      return (
                        <motion.button
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.2, delay: i * 0.02 }}
                          key={studentName}
                          onClick={() => setSelectedStudent(studentName)}
                          className="flex items-center gap-3 p-2 sm:p-3 text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-[#3b5998] dark:hover:border-blue-500 hover:shadow-md transition-all group active:scale-[0.98] relative overflow-hidden"
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-[#3b5998] dark:group-hover:bg-blue-500 transition-colors"></div>
                          <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-[#3b5998] dark:text-blue-400 group-hover:bg-[#3b5998] dark:group-hover:bg-blue-500 group-hover:text-white transition-all shrink-0">
                            <UserIcon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] sm:text-xs font-black text-slate-700 dark:text-slate-100 uppercase truncate group-hover:text-[#3b5998] dark:group-hover:text-blue-400 transition-colors">
                              {studentName}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                               <span className="text-[8px] font-black text-[#3b5998] dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-1.5 py-0.5 rounded uppercase border border-blue-100/50 dark:border-blue-900/50">
                                  {studentClass}
                               </span>
                               <span className="text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase truncate">
                                  <FileText className="w-2.5 h-2.5 inline mr-0.5" /> Boletim
                               </span>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0 text-[#3b5998] dark:text-blue-400 shrink-0" />
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-20">
                  <Users className="w-12 h-12 text-slate-700 dark:text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-600 dark:text-slate-400 text-sm font-black uppercase tracking-widest">
                    Nenhum aluno encontrado
                  </p>
                  <p className="text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase mt-2">
                    Tente ajustar seus filtros de busca
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* LOADING OVERLAY INSTITUCIONAL COLEGIO PROGRESSO */}
        {isGeneratingPDF && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[99999] flex flex-col items-center justify-center p-6 text-center select-none font-sans">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl p-8 max-w-sm w-full border-4 border-slate-950 shadow-2xl space-y-6 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-850 via-amber-500 to-red-850"></div>

              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-2xl mx-auto flex items-center justify-center border border-slate-200 dark:border-slate-800 shadow-sm">
                <img
                  src={LOGO_VINHO}
                  alt="Colégio Progresso"
                  className="w-12 h-12 object-contain"
                />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-black uppercase text-slate-800 dark:text-slate-100 tracking-tight leading-none">
                  Colégio Progresso
                </h3>
                <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 font-mono">
                  Emissão de Boletins Oficiais
                </p>
              </div>

              <div className="py-2 flex flex-col items-center justify-center gap-2">
                <div className="w-9 h-9 border-4 border-slate-200 dark:border-slate-800 border-t-red-850 rounded-full animate-spin"></div>
                <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mt-2 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
                  {pdfProgress || "Processando boletins escolares..."}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <p className="text-[8px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider">
                  Por favor, aguarde. Não recarregue a página até terminar.
                </p>
              </div>
            </motion.div>
          </div>
        )}

        {/* OFF-SCREEN RENDER CONTAINER FOR CANVAS CAPTURE */}
        {isGeneratingPDF && (
          <div
            id="pdf-offscreen-render"
            style={{
              position: "fixed",
              left: "-9999px",
              top: "-9999px",
              width: "1024px",
              zIndex: -99999,
              backgroundColor: "#ffffff",
            }}
          >
            {pdfStudentsToRender.map((student, idx) => (
              <div
                key={student}
                id={idx === 0 ? "pdf-single-student" : undefined}
                className="boletim-pdf-page bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-12 text-black w-[1024px]"
                style={{ backgroundColor: "#ffffff", color: "#000000" }}
              >
                <BoletimItem
                  studentName={student}
                  isLast={idx === pdfStudentsToRender.length - 1}
                  results={results}
                  exams={exams}
                  isAdmin={isAdmin}
                  userProfile={userProfile}
                  allPossibleStudents={allPossibleStudents}
                  schoolInfo={schoolInfo}
                  bimesters={bimesters}
                  mode={boletimMode}
                  selectedBimester={selectedBoletimBimester}
                  lessons={lessons}
                  attendanceRecords={attendanceRecords}
                />
              </div>
            ))}
          </div>
        )}
      </>
    );
  }

  // Visualização do Boletim Múltiplo ou Individual
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 pb-20 print:space-y-0 print:pb-0 print-container"
      >
        <div className="print:hidden no-print flex flex-col sm:flex-row items-center justify-between gap-4 max-w-5xl mx-auto mb-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm col-span-1">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => setSelectedStudent(null)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-black uppercase hover:bg-slate-200 transition-all shadow-sm active:scale-95"
            >
              <ChevronLeft className="w-4 h-4" /> Voltar à lista
            </button>

            <div className="hidden sm:block h-5 w-px bg-slate-300" />

            {/* Boletim Display Mode Toggles */}
            <div className="flex bg-slate-300 p-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-black uppercase">
              <button
                onClick={() => setBoletimMode("bimestral")}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-all",
                  boletimMode === "bimestral"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-blue-700 shadow-sm border border-slate-200 dark:border-slate-800"
                    : "text-slate-700 dark:text-slate-300 hover:text-slate-700 dark:text-slate-200",
                )}
              >
                Bimestral
              </button>
              <button
                onClick={() => setBoletimMode("anual")}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-all",
                  boletimMode === "anual"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-blue-700 shadow-sm border border-slate-200 dark:border-slate-800"
                    : "text-slate-700 dark:text-slate-300 hover:text-slate-700 dark:text-slate-200",
                )}
              >
                Anual
              </button>
            </div>

            {/* Bimester Dropdown if in bimonthly view */}
            {boletimMode === "bimestral" && (
              <select
                value={selectedBoletimBimester}
                onChange={(e) => setSelectedBoletimBimester(e.target.value)}
                className="rounded-xl px-2.5 py-1.5 font-black transition-all uppercase bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
              >
                {bimesters.map((bim) => (
                  <option key={bim} value={bim}>
                    {bim}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handlePrint}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-[#3b5998] text-white rounded-xl text-xs font-black uppercase hover:bg-opacity-95 transition-all shadow-md active:scale-95"
            >
              <Printer className="w-4 h-4" /> Imprimir{" "}
              {selectedStudent === "TODOS"
                ? `Lote (${studentsFiltered.length})`
                : "Boletim"}
            </button>

            <button
              type="button"
              onClick={() => {
                if (selectedStudent === "TODOS") {
                  handleExportAllPDF();
                } else {
                  handleExportSinglePDF(selectedStudent || "");
                }
              }}
              disabled={isGeneratingPDF}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="w-4 h-4" />{" "}
              {isGeneratingPDF
                ? "Gerando PDF..."
                : selectedStudent === "TODOS"
                  ? `Exportar Lote PDF`
                  : "Exportar PDF"}
            </button>
          </div>
        </div>

        {selectedStudent === "TODOS" ? (
          <div className="w-full h-full flex flex-col">
            {studentsFiltered.map((student, idx) => (
              <React.Fragment key={student}>
                <div
                  className={cn(
                    idx === studentsFiltered.length - 1
                      ? ""
                      : "break-after-page print:break-after-page",
                  )}
                >
                  <BoletimItem
                    studentName={student}
                    isLast={idx === studentsFiltered.length - 1}
                    results={results}
                    exams={exams}
                    isAdmin={isAdmin}
                    userProfile={userProfile}
                    allPossibleStudents={allPossibleStudents}
                    schoolInfo={schoolInfo}
                    bimesters={bimesters}
                    mode={boletimMode}
                    selectedBimester={selectedBoletimBimester}
                    lessons={lessons}
                    attendanceRecords={attendanceRecords}
                  />
                </div>
                {idx < studentsFiltered.length - 1 && (
                  <PageBreakSeparator pageNumber={idx + 1} />
                )}
              </React.Fragment>
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
            mode={boletimMode}
            selectedBimester={selectedBoletimBimester}
            lessons={lessons}
            attendanceRecords={attendanceRecords}
          />
        )}
      </motion.div>

      {/* LOADING OVERLAY INSTITUCIONAL COLEGIO PROGRESSO */}
      {isGeneratingPDF && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[99999] flex flex-col items-center justify-center p-6 text-center select-none font-sans">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl p-8 max-w-sm w-full border-4 border-slate-950 shadow-2xl space-y-6 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-850 via-amber-500 to-red-850"></div>

            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-2xl mx-auto flex items-center justify-center border border-slate-200 dark:border-slate-800 shadow-sm">
              <img
                src={LOGO_VINHO}
                alt="Colégio Progresso"
                className="w-12 h-12 object-contain"
              />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black uppercase text-slate-800 dark:text-slate-100 tracking-tight leading-none">
                Colégio Progresso
              </h3>
              <p className="text-[9px] font-black uppercase tracking-widest text-[#a88d44] font-mono">
                Emissão de Boletins Oficiais
              </p>
            </div>

            <div className="py-2 flex flex-col items-center justify-center gap-2">
              <div className="w-9 h-9 border-4 border-slate-200 dark:border-slate-800 border-t-red-850 rounded-full animate-spin"></div>
              <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mt-2 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
                {pdfProgress || "Processando boletins escolares..."}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <p className="text-[8px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider">
                Por favor, aguarde. Não recarregue a página até terminar.
              </p>
            </div>
          </motion.div>
        </div>
      )}

      {/* OFF-SCREEN RENDER CONTAINER FOR CANVAS CAPTURE */}
      {isGeneratingPDF && (
        <div
          id="pdf-offscreen-render"
          style={{
            position: "fixed",
            left: "-9999px",
            top: "-9999px",
            width: "1024px",
            zIndex: -99999,
            backgroundColor: "#ffffff",
          }}
        >
          {pdfStudentsToRender.map((student, idx) => (
            <div
              key={student}
              id={idx === 0 ? "pdf-single-student" : undefined}
              className="boletim-pdf-page bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-12 text-black w-[1024px]"
              style={{ backgroundColor: "#ffffff", color: "#000000" }}
            >
              <BoletimItem
                studentName={student}
                isLast={idx === pdfStudentsToRender.length - 1}
                results={results}
                exams={exams}
                isAdmin={isAdmin}
                userProfile={userProfile}
                allPossibleStudents={allPossibleStudents}
                schoolInfo={schoolInfo}
                bimesters={bimesters}
                mode={boletimMode}
                selectedBimester={selectedBoletimBimester}
                lessons={lessons}
                attendanceRecords={attendanceRecords}
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// Helper to get representative image and icon for each school subject
const getSubjectImageAndIcon = (subjectName: string): { url: string; icon: React.ReactNode; bg: string } => {
  const norm = (subjectName || "").toLowerCase().trim();
  
  if (norm.includes("artes")) {
    return {
      url: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=280&auto=format&fit=crop&q=60",
      icon: <Palette className="w-3.5 h-3.5 text-rose-500" />,
      bg: "bg-rose-50 dark:bg-rose-950/40 border-rose-100 dark:border-rose-900/30"
    };
  }
  if (norm.includes("robótica") || norm.includes("robotica")) {
    return {
      url: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=280&auto=format&fit=crop&q=60",
      icon: <Cpu className="w-3.5 h-3.5 text-cyan-500" />,
      bg: "bg-cyan-50 dark:bg-cyan-950/40 border-cyan-100 dark:border-cyan-900/30"
    };
  }
  if (norm.includes("matemática") || norm.includes("matematica")) {
    return {
      url: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=280&auto=format&fit=crop&q=60",
      icon: <Calculator className="w-3.5 h-3.5 text-blue-500" />,
      bg: "bg-blue-50 dark:bg-blue-950/40 border-blue-100 dark:border-blue-900/30"
    };
  }
  if (norm.includes("portuguesa") || norm.includes("português") || norm.includes("portugues") || norm.includes("redação") || norm.includes("literatura")) {
    return {
      url: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=280&auto=format&fit=crop&q=60",
      icon: <BookOpen className="w-3.5 h-3.5 text-emerald-500" />,
      bg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900/30"
    };
  }
  if (norm.includes("inglês") || norm.includes("ingles") || norm.includes("english") || norm.includes("inglesa")) {
    return {
      url: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=280&auto=format&fit=crop&q=60",
      icon: <Languages className="w-3.5 h-3.5 text-indigo-500" />,
      bg: "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-100 dark:border-indigo-900/30"
    };
  }
  if (norm.includes("espanhol") || norm.includes("spanish")) {
    return {
      url: "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=280&auto=format&fit=crop&q=60",
      icon: <Compass className="w-3.5 h-3.5 text-red-500" />,
      bg: "bg-red-50 dark:bg-red-950/40 border-red-100 dark:border-red-900/30"
    };
  }
  if (norm.includes("natureza")) {
    return {
      url: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=280&auto=format&fit=crop&q=60",
      icon: <Leaf className="w-3.5 h-3.5 text-green-500" />,
      bg: "bg-green-50 dark:bg-green-950/40 border-green-100 dark:border-green-900/30"
    };
  }
  if (norm.includes("biologia") || norm.includes("química") || norm.includes("quimica") || norm.includes("física") || norm.includes("fisica") || norm.includes("ciência") || norm.includes("ciencias")) {
    return {
      url: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=280&auto=format&fit=crop&q=60",
      icon: <Beaker className="w-3.5 h-3.5 text-teal-500" />,
      bg: "bg-teal-50 dark:bg-teal-950/40 border-teal-100 dark:border-teal-900/30"
    };
  }
  if (norm.includes("geografia")) {
    return {
      url: "https://images.unsplash.com/photo-1524661135-423995f22d0b?w=280&auto=format&fit=crop&q=60",
      icon: <Globe className="w-3.5 h-3.5 text-sky-500" />,
      bg: "bg-sky-50 dark:bg-sky-950/40 border-sky-100 dark:border-sky-900/30"
    };
  }
  if (norm.includes("história") || norm.includes("historia")) {
    return {
      url: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=280&auto=format&fit=crop&q=60",
      icon: <Hourglass className="w-3.5 h-3.5 text-amber-500" />,
      bg: "bg-amber-50 dark:bg-amber-950/40 border-amber-100 dark:border-amber-900/30"
    };
  }
  if (norm.includes("educação física") || norm.includes("educacao fisica") || norm.includes("esporte")) {
    return {
      url: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=280&auto=format&fit=crop&q=60",
      icon: <Activity className="w-3.5 h-3.5 text-orange-500" />,
      bg: "bg-orange-50 dark:bg-orange-950/40 border-orange-100 dark:border-orange-900/30"
    };
  }
  if (norm.includes("coordenação") || norm.includes("coordenacao")) {
    return {
      url: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=280&auto=format&fit=crop&q=60",
      icon: <Users className="w-3.5 h-3.5 text-purple-500" />,
      bg: "bg-purple-50 dark:bg-purple-950/40 border-purple-100 dark:border-purple-900/30"
    };
  }
  if (norm.includes("sociais") || norm.includes("social")) {
    return {
      url: "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=280&auto=format&fit=crop&q=60",
      icon: <GitMerge className="w-3.5 h-3.5 text-violet-500" />,
      bg: "bg-violet-50 dark:bg-violet-950/40 border-violet-100 dark:border-violet-900/30"
    };
  }
  
  return {
    url: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=280&auto=format&fit=crop&q=60",
    icon: <Bookmark className="w-3.5 h-3.5 text-[#a88d44]" />,
    bg: "bg-amber-50 dark:bg-amber-955/20 border-amber-100 dark:border-amber-900/30"
  };
};

// Banco de Provas database view
function BancoProvasView({
  viewMode = "provas",
  user,
  isAdmin,
  exams,
  setView,
  onSelectPrintExam,
  onEditExam,
  onDeleteExam,
  onRestoreExam,
  onDeletePermanentExam,
  onDuplicateExam,
  userProfile,
  setBackToView,
  professors = [],
  initialTab = "Provas",
}: {
  viewMode?: "provas" | "atividades";
  user: User;
  isAdmin: boolean;
  exams: Exam[];
  setView: (v: any) => void;
  onSelectPrintExam: (e: Exam) => void;
  onEditExam: (exam: Exam) => void;
  onDeleteExam: (id: string) => void;
  onRestoreExam: (id: string) => void;
  onDeletePermanentExam: (id: string) => void;
  onDuplicateExam: (exam: Exam) => void;
  userProfile: any;
  setBackToView: (v: any) => void;
  professors?: any[];
  initialTab?: "Provas" | "Atividades";
}) {
  const schoolInfo = getSchoolInfo();
  const [bimesterFilter, setBimesterFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [professorFilter, setProfessorFilter] = useState("");
  const [documentTypeTab, setDocumentTypeTab] = useState(initialTab);

  // Sync state when initialTab changes (e.g. from Dashboard click)
  useEffect(() => {
    setDocumentTypeTab(initialTab);
  }, [initialTab]);

  const roles = (userProfile?.role || "")
    .split(",")
    .map((r: string) => r.trim().toLowerCase());
  const isCoordinator = roles.some(
    (r) => r.includes("coordenador") || r.includes("coordenadora")
  );

  const responsibleClasses = getFilteredClasses(userProfile, schoolInfo.classes);

  // Build lookup and list of professors
  const professorMap = useMemo(() => {
    const map = new Map<string, string>();
    // Pre-populate with passed professors
    (professors || []).forEach((p) => {
      if (p.uid) {
        map.set(p.uid, p.professional_name || p.username || p.email);
      }
    });
    // Fallback/enrich with any unique professors from exams
    exams.forEach((e) => {
      if (e.professorId && !map.has(e.professorId)) {
        const creatorName = e.answerKey?._metadata?.professorName || `UID: ${e.professorId.substring(0, 8)}`;
        map.set(e.professorId, creatorName);
      }
    });
    return map;
  }, [professors, exams]);

  const uniqueProfessorsWithExams = useMemo(() => {
    return Array.from(professorMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [professorMap]);

  const [activeTab, setActiveTab] = useState<"ativas" | "lixeira">("ativas");

  const accessibleExams = useMemo(() => {
    return exams.filter((e) => {
      if (
        e.isDiaryOnly ||
        e.answerKey?._metadata?.isDiaryOnly ||
        e.isAnnouncement ||
        e.examType === "Recado"
      )
        return false;

      // Filter by viewMode (provas vs atividades)
      const isAtividade = e.examType === "Atividade" || e.answerKey?._metadata?.examType === "Atividade";
      if (viewMode === "provas" && isAtividade) return false;
      if (viewMode === "atividades" && !isAtividade) return false;

      if (!isAdmin) {
        const isCreator = (user && e.professorId === user.id) || (userProfile && e.professorId === userProfile?.uid);
        if (!isCreator) return false;
      }
      return true;
    });
  }, [exams, isAdmin, user, userProfile, viewMode]);

  const activeExams = useMemo(() => {
    return accessibleExams.filter(e => !e.deletedAt);
  }, [accessibleExams]);

  const trashedExams = useMemo(() => {
    return accessibleExams.filter(e => !!e.deletedAt);
  }, [accessibleExams]);

  const currentExams = activeTab === "ativas" ? activeExams : trashedExams;

  const filteredExams = useMemo(() => {
    return currentExams
      .filter((e) => {
        const examBimester = getBimesterForExam(e, schoolInfo.bimesterDates);
        const matchBimester =
          bimesterFilter === "" || examBimester === bimesterFilter;
        const matchClass =
          classFilter === "" || (e.classYear || "").toLowerCase().includes(classFilter.toLowerCase());
        const matchCategory =
          categoryFilter === "" || e.examType === categoryFilter;
        const matchProfessor =
          !isAdmin ||
          professorFilter === "" ||
          e.professorId === professorFilter;
        return matchBimester && matchClass && matchCategory && matchProfessor;
      })
      .sort((a, b) => {
        // Primary sort: Subject (alphabetical/Portuguese order)
        const subjectComp = (a.subject || "").localeCompare(
          b.subject || "",
          "pt",
          { sensitivity: "base" }
        );
        if (subjectComp !== 0) return subjectComp;

        // Secondary sort: Class (natural alphanumeric order)
        const classComp = (a.classYear || "").localeCompare(
          b.classYear || "",
          undefined,
          { numeric: true, sensitivity: "base" },
        );
        if (classComp !== 0) return classComp;

        // Tertiary sort: Date (newest first)
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
  }, [currentExams, bimesterFilter, classFilter, categoryFilter, professorFilter, isAdmin, schoolInfo.bimesterDates]);

  const anyFilterActive =
    bimesterFilter !== "" ||
    classFilter !== "" ||
    categoryFilter !== "" ||
    professorFilter !== "";
  const displayExams = filteredExams;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <ViewHeader
        title={viewMode === "atividades" ? "Banco de Atividades" : "Banco de Provas & Avaliações"}
        subtitle={viewMode === "atividades" 
          ? "Repositório completo de atividades, exercícios e tarefas salvos no sistema." 
          : "Repositório completo de provas, simulados, gabaritos e avaliações institucionais do Colégio Progresso Santista."}
        icon={viewMode === "atividades" 
          ? <ClipboardList className="w-5 h-5 text-gold" /> 
          : <FileSpreadsheet className="w-5 h-5 text-gold" />}
        badge={viewMode === "atividades" ? "Banco de Exercícios" : "Biblioteca de Recursos"}
      >
        {true && (
          <button
            type="button"
            onClick={() => {
              if (viewMode === "atividades") {
                onEditExam({ examType: "Atividade", questions: [] } as any);
              } else {
                onEditExam(null as any);
              }
              setView("create");
            }}
            className="px-4 py-2 bg-[#a88d44] hover:bg-[#8e7432] text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md hover:shadow-[#a88d44]/25 active:scale-[0.98] flex items-center gap-1.5 cursor-pointer border border-[#d4af37]/45"
          >
            <Plus className="w-3.5 h-3.5 text-white" />
            <span>{viewMode === "atividades" ? "Nova Atividade" : "Nova Avaliação"}</span>
          </button>
        )}
      </ViewHeader>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="px-5 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-55/50 dark:bg-slate-900/40 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-black text-slate-700 dark:text-slate-100 uppercase tracking-widest">
                  {viewMode === "atividades" ? "Base de Dados de Atividades" : "Base de Dados de Avaliações"}
                </h3>
                <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase mt-1">
                  Navegação pelas turmas e bimestres salvos no sistema
                </p>
              </div>

              {/* TABS SWITCHER: ATIVAS vs LIXEIRA */}
              <div className="flex bg-slate-100 dark:bg-slate-850 p-1 rounded-xl w-fit border border-slate-200 dark:border-slate-800 select-none animate-fadeIn">
                <button
                  type="button"
                  onClick={() => setActiveTab("ativas")}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5",
                    activeTab === "ativas"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  )}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Ativas ({activeExams.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("lixeira")}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5",
                    activeTab === "lixeira"
                      ? "bg-rose-500 text-white shadow-xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  )}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Lixeira ({trashedExams.length})</span>
                </button>
              </div>
            </div>

            {/* COMPONENTE INTERATIVO DE ICONES/CHIPS PARA SELEÇÃO */}
            <div className="space-y-4 pt-1">
              {/* FILTRAR POR BIMESTRE (ICONES/CHIPS) */}
              <div className="space-y-2">
                <span className="text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase tracking-widest block font-sans">
                  Selecione o Bimestre:
                </span>
                <div className="flex flex-wrap gap-2 select-none">
                  {[
                    { value: "", label: "Ver Todos" },
                    { value: "1º Bimestre", label: "1º Bimestre" },
                    { value: "2º Bimestre", label: "2º Bimestre" },
                    { value: "3º Bimestre", label: "3º Bimestre" },
                    { value: "4º Bimestre", label: "4º Bimestre" },
                  ].map((b) => {
                    const active = bimesterFilter === b.value;
                    return (
                      <button
                        key={b.value}
                        type="button"
                        onClick={() => setBimesterFilter(b.value)}
                        className={cn(
                          "px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 border",
                          active
                            ? "bg-[#35495e] text-white border-[#35495e] shadow-sm font-black"
                            : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200",
                        )}
                      >
                        <Calendar
                          className={cn(
                            "w-3.5 h-3.5",
                            active ? "text-white" : "text-[#35495e]",
                          )}
                        />
                        <span>{b.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* FILTRAR POR TURMA (ICONES/CHIPS) */}
              <div className="space-y-2">
                <span className="text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase tracking-widest block font-sans">
                  Selecione a Turma / Componente:
                </span>
                <div className="flex flex-wrap gap-1.5 select-none">
                  <button
                    type="button"
                    onClick={() => setClassFilter("")}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border",
                      classFilter === ""
                        ? "bg-[#35495e] text-white border-[#35495e] shadow-sm font-black"
                        : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200",
                    )}
                  >
                    Filtrar Todas
                  </button>
                  {getFilteredClasses(userProfile, schoolInfo.classes).map(
                    (c) => {
                      const active = classFilter === c;
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setClassFilter(c)}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 border",
                            active
                              ? "bg-[#35495e] text-white border-[#35495e] shadow-sm font-black"
                              : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200",
                          )}
                        >
                          <School
                            className={cn(
                              "w-3.5 h-3.5",
                              active ? "text-white" : "text-[#35495e]",
                            )}
                          />
                          <span>{c}</span>
                        </button>
                      );
                    },
                  )}
                </div>
              </div>

              {/* FILTRAR POR CATEGORIA E PROFESSOR */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase tracking-widest font-sans">
                    Tipo de Teste:
                  </span>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="font-black border rounded-lg px-2.5 py-1 uppercase tracking-wider transition-all bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 "
                  >
                    <option value="">Todos</option>
                    {(
                      schoolInfo.examCategories ||
                      DEFAULT_SCHOOL_INFO.examCategories
                    ).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase tracking-widest font-sans">
                      Professor:
                    </span>
                    <select
                      value={professorFilter}
                      onChange={(e) => setProfessorFilter(e.target.value)}
                      className="font-black border rounded-lg px-2.5 py-1 uppercase tracking-wider transition-all bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 max-w-[200px]"
                    >
                      <option value="">Todos os Professores</option>
                      {uniqueProfessorsWithExams.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {anyFilterActive && (
                  <button
                    onClick={() => {
                      setBimesterFilter("");
                      setClassFilter("");
                      setCategoryFilter("");
                      setProfessorFilter("");
                    }}
                    className="ml-auto px-2.5 py-1 border border-rose-500/20 text-rose-600 dark:text-rose-455 text-[9px] font-black uppercase tracking-widest rounded bg-rose-50/50 hover:bg-rose-50 dark:bg-rose-950/10 cursor-pointer font-sans"
                  >
                    Limpar Filtros Ativos
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Lista de Cards Unificada, Tensa e Responsiva (Visualização AI Studio Otimizada para Caber Mais) */}
          <div className="w-full space-y-4">
            {displayExams.length > 0 ? (
              Array.from(
                new Set(displayExams.map((e) => getBimesterForExam(e, schoolInfo.bimesterDates))),
              ).map((bim) => (
                <div key={bim} className="space-y-2">
                  <div className="text-[9px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 dark:bg-slate-800/30 py-1 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800/40 w-fit">
                    {bim}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                    {displayExams
                      .filter((e) => getBimesterForExam(e, schoolInfo.bimesterDates) === bim)
                      .map((exam) => (
                        <div
                          key={exam.id}
                          className="group relative bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800/80 hover:border-amber-500/30 hover:shadow-md transition-all duration-300 flex flex-col p-3.5 h-full"
                        >
                          <div className="flex-1 flex flex-col justify-between gap-3">
                            <div>
                              {/* Top row with icon ornament and title */}
                              <div className="flex gap-2.5 items-start">
                                {(() => {
                                  const subjectInfo = getSubjectImageAndIcon(exam.subject);
                                  // Inject classes to make icon slightly larger and styled like an ornament
                                  const styledIcon = React.cloneElement(subjectInfo.icon as React.ReactElement, {
                                    className: "w-4.5 h-4.5"
                                  });
                                  return (
                                    <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 shadow-xs transition-transform duration-350 group-hover:scale-105", subjectInfo.bg)}>
                                      {styledIcon}
                                    </div>
                                  );
                                })()}
                                <div className="min-w-0 flex-1">
                                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-snug line-clamp-1" title={stripHtml(exam.subject)}>
                                    {stripHtml(exam.subject)}
                                  </h4>
                                  <div className="text-[9px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                                    Criado em {new Date(exam.createdAt).toLocaleDateString()}
                                    <span className="block text-[8px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5 truncate" title={professorMap.get(exam.professorId) || "---"}>
                                      Prof: {professorMap.get(exam.professorId) || "---"}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Tags underneath */}
                              <div className="flex flex-wrap gap-1 mt-2.5">
                                <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-350 text-[8px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700/60">
                                  {exam.classYear || "--"}
                                </span>
                                <span className="inline-block px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[8px] font-black uppercase tracking-wider border border-amber-500/20">
                                  {stripHtml(exam.examType)}
                                </span>
                              </div>
                            </div>

                            {/* Botões de Comando */}
                            {activeTab === "lixeira" ? (
                              <div className="flex items-center justify-between gap-1 pt-2 border-t border-slate-200/60 dark:border-slate-800/50 mt-auto w-full">
                                <button
                                  type="button"
                                  onClick={() => onRestoreExam(exam.id)}
                                  className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-md transition-colors cursor-pointer border border-emerald-200/30"
                                  title="Restaurar Prova"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Restaurar</span>
                                </button>

                                {(isAdmin ||
                                  exam.professorId === user.id ||
                                  (userProfile &&
                                    (exam.professorId === userProfile.id ||
                                      exam.professorId === userProfile.uid))) && (
                                  <button
                                    type="button"
                                    onClick={() => onDeletePermanentExam(exam.id)}
                                    className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 text-[9px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-455 hover:bg-rose-50 dark:hover:bg-rose-955/20 rounded-md transition-colors cursor-pointer border border-rose-200/30"
                                    title="Excluir Permanentemente"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>Excluir Definitivo</span>
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-1 pt-2 border-t border-slate-200/60 dark:border-slate-800/50 mt-auto">
                                <div className="flex items-center gap-1 flex-1">
                                  <a
                                    href={`/view?examId=${exam.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      onSelectPrintExam(exam);
                                      setBackToView("banco_provas");
                                      setView("print");
                                    }}
                                    className="flex-1 flex items-center justify-center gap-1 py-1 px-1.5 text-[8px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer border border-slate-250 dark:border-slate-750"
                                    title="Visualizar Prova"
                                  >
                                    <Eye className="w-2.5 h-2.5" />
                                    <span>Ver</span>
                                  </a>
                                  <button
                                    onClick={() => {
                                      onSelectPrintExam(exam);
                                      setBackToView("banco_provas");
                                      setView("print");
                                    }}
                                    className="flex-1 flex items-center justify-center gap-1 py-1 px-1.5 text-[8px] font-black uppercase tracking-widest text-[#a88d44] hover:bg-amber-50 dark:hover:bg-amber-955/20 rounded-md transition-colors cursor-pointer border border-amber-200/20"
                                    title="Imprimir"
                                  >
                                    <Printer className="w-2.5 h-2.5" />
                                    <span>Imp</span>
                                  </button>
                                </div>

                                {(isAdmin ||
                                  exam.professorId === user.id ||
                                  (userProfile &&
                                    (exam.professorId === userProfile.id ||
                                      exam.professorId === userProfile.uid))) && (
                                  <div className="flex items-center gap-1 justify-end ml-1">
                                    <button
                                      onClick={() => onDuplicateExam(exam)}
                                      className="flex items-center justify-center p-1 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-all active:scale-95 cursor-pointer border border-slate-200/45 dark:border-slate-800/10"
                                      title="Duplicar"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => onEditExam(exam)}
                                      className="flex items-center justify-center p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-md transition-all active:scale-95 cursor-pointer border border-blue-200/45 dark:border-blue-900/10"
                                      title="Editar"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                    {!userProfile?.role?.includes("secretaria") &&
                                      (isAdmin ||
                                        exam.professorId === user.id ||
                                        (userProfile &&
                                          (exam.professorId === userProfile.id ||
                                            exam.professorId === userProfile.uid))) && (
                                        <button
                                          onClick={() => onDeleteExam(exam.id)}
                                          className="flex items-center justify-center p-1 text-red-600 hover:bg-red-105 dark:hover:bg-red-900/40 rounded-md transition-all active:scale-95 cursor-pointer border border-red-200/45 dark:border-red-900/10"
                                          title="Excluir"
                                        >
                                          <Trash2 className="w-3" />
                                        </button>
                                      )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="px-5 py-14 text-center font-sans border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/10">
                <div className="flex flex-col items-center gap-2">
                  <Search className="w-7 h-7 text-slate-400 dark:text-slate-600 animate-pulse" />
                  <p className="text-slate-600 dark:text-slate-400 text-xs font-semibold">
                    {activeTab === "lixeira"
                      ? "A lixeira está vazia."
                      : "Nenhuma prova encontrada."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1 flex flex-col gap-5">
          <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 text-[11px] leading-relaxed space-y-2">
            <h4 className="font-extrabold text-[#35495e] dark:text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-amber-500" />
              <span>Dicas de Organização</span>
            </h4>
            <p className="text-slate-700 dark:text-slate-400 font-medium font-sans">
              Utilize o filtro por bimestre e turma para localizar rapidamente
              as avaliações desejadas. Mantenha as datas e os tipos organizados
              no cabeçalho institucional para garantir uniformidade didática.
            </p>
          </div>
        </div>
      </div>

    </motion.div>
  );
}
