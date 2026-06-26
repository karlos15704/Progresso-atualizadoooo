export interface Question {
  id: number;
  type?: 'objective' | 'essay' | 'true-false';
  text: string;
  image?: string;
  imageSize?: number;
  imageHeight?: number;
  imageAlign?: 'left' | 'center' | 'right';
  imageWrap?: 'inline' | 'wrap-left' | 'wrap-right' | 'behind' | 'front';
  imageOpacity?: number;
  imageCaption?: string;
  options: string[];
  correctAnswer: string;
  points?: number | string;
  align?: 'left' | 'center';
  lineCount?: number;
  pageBreakAfter?: boolean;
  showConfig?: boolean;
  drawingShape?: 'none' | 'circle' | 'square' | 'rectangle' | 'triangle' | 'right-triangle' | 'line' | 'arrow';
  drawingShapeSize?: number;
  drawingShapeAlign?: 'left' | 'center' | 'right';
  drawingShapeHeight?: number;
  drawingShapeFill?: string;
  drawingShapeBorderColor?: string;
  drawingShapeBorderWidth?: number;
  drawingShapeBorderStyle?: 'solid' | 'dashed' | 'dotted';
  drawingShapeText?: string;
  drawingShapeTextColor?: string;
  imageLeft?: number;
  imageTop?: number;
  drawingShapeLeft?: number;
  drawingShapeTop?: number;
  
  // Intelligent split fields
  isContinuation?: boolean;
  optionsOffset?: number;
  hideBaseContent?: boolean;
}

export interface Exam {
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
  isDiaryOnly?: boolean;
  isAnnouncement?: boolean;
  deletedAt?: string | null;
}

export interface Result {
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

export interface Lesson {
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

export interface Attendance {
  id: string;
  lesson_id: string;
  student_name: string;
  status: 'present' | 'absent';
}

export interface StudentReport {
  id: string;
  studentName: string;
  studentClass: string;
  subject: string;
  content: string;
  professorId: string;
  professorName?: string;
  bimester: string;
  familyPortalStatus?: 'Nao_Enviado' | 'Pendente' | 'Aprovado';
  familyPortalSentAt?: string;
  parentSignature?: string;
  parentSignatureAt?: string;
  createdAt: any;
  updatedAt: any;
}

export interface Student {
  name: string;
  classId: string;
  registrationNumber?: string;
  status?: 'Ativo' | 'Inativo' | 'Transferido' | 'Cancelado';
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
    student?: { username: string, passwordHash?: string, pin?: string },
    guardian1?: { username: string, passwordHash?: string, pin?: string },
    guardian2?: { username: string, passwordHash?: string, pin?: string },
    financial?: { username: string, passwordHash?: string, pin?: string }
  };
}
