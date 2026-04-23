
import jsQR from 'jsqr';
import QRCode from 'qrcode';

/**
 * OMR Engine (Optical Mark Recognition)
 * Local image processing to detect marked bubbles on a standard sheet layout.
 * No AI required.
 */

interface OMRResult {
  studentName?: string;
  studentClass?: string;
  answers: Record<number, string>;
  score: number;
  maxScore: number;
  success: boolean;
  error?: string;
}

export async function scanBubbleSheet(
  canvas: HTMLCanvasElement, 
  correctAnswers: any[]
): Promise<OMRResult> {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error("Could not get canvas context");

  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // 0. Detect QR Code for Student Identity
  let decodedIdentity = { name: '', class: '' };
  try {
    const code = jsQR(data, width, height);
    if (code) {
      const parts = code.data.split('|');
      if (parts.length >= 2) {
        decodedIdentity.name = parts[0];
        decodedIdentity.class = parts[1];
      }
    }
  } catch (err) {
    console.warn("QR Detection failed:", err);
  }

  // 1. Simple Thresholding & Greyscale
  const grayscale = new Uint8ClampedArray(width * height);
  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    grayscale[i / 4] = avg;
  }

  // 2. Find Markers (4 black squares in corners)
  // This is a simplified version. We look for the darkest regions in quadrants.
  const findMarker = (startX: number, startY: number, endX: number, endY: number) => {
    let bestX = 0, bestY = 0, minAvg = 255;
    for (let y = startY; y < endY; y += 10) {
      for (let x = startX; x < endX; x += 10) {
        const idx = y * width + x;
        if (grayscale[idx] < minAvg) {
          minAvg = grayscale[idx];
          bestX = x;
          bestY = y;
        }
      }
    }
    return { x: bestX, y: bestY };
  };

  const pad = 50;
  const tl = findMarker(0, 0, pad, pad);
  const tr = findMarker(width - pad, 0, width, pad);
  const bl = findMarker(0, height - pad, pad, height);
  const br = findMarker(width - pad, height - pad, width, height);

  // 3. Grid Calculation
  // We assume the sheet has A-E options for N questions.
  // We map the space between markers to question positions.
  const rowCount = correctAnswers.length;
  const colCount = 5; // A, B, C, D, E
  const results: Record<number, string> = {};
  let scoreValue = 0;
  let maxPossible = 0;

  const options = ['A', 'B', 'C', 'D', 'E'];

  for (let qIdx = 0; qIdx < rowCount; qIdx++) {
    const qPoints = parseFloat(String(correctAnswers[qIdx].points || 1));
    maxPossible += qPoints;

    let bestOption = "";
    let maxDarkness = -1;

    for (let oIdx = 0; oIdx < colCount; oIdx++) {
      // Calculate normalized position (approximate)
      const relY = (qIdx + 1) / (rowCount + 1);
      const relX = (oIdx + 1) / (colCount + 1);

      // Interpolate based on markers
      const px = tl.x + (tr.x - tl.x) * relX;
      const py = tl.y + (bl.y - tl.y) * relY;

      // Sample a small area around the expected bubble
      let darknessSum = 0;
      const sampleSize = 5;
      for (let dy = -sampleSize; dy <= sampleSize; dy++) {
        for (let dx = -sampleSize; dx <= sampleSize; dx++) {
          const sx = Math.floor(px + dx);
          const sy = Math.floor(py + dy);
          if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
            darknessSum += (255 - grayscale[sy * width + sx]);
          }
        }
      }

      if (darknessSum > maxDarkness && darknessSum > 500) { // Threshold for "marked"
        maxDarkness = darknessSum;
        bestOption = options[oIdx];
      }
    }

    results[qIdx] = bestOption;
    if (bestOption === correctAnswers[qIdx].correctAnswer) {
      scoreValue += qPoints;
    }
  }

  return {
    studentName: decodedIdentity.name || "Não identificado",
    studentClass: decodedIdentity.class,
    answers: results,
    score: scoreValue,
    maxScore: maxPossible,
    success: true
  };
}

/**
 * Generates a printable PDF template for the OMR scanner.
 */
export async function generatePrintableAnswerSheet(exam: any, logoBase64?: string, students: string[] = [""]) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  
  const studentList = students.length > 0 ? students : [""];

  for (let i = 0; i < studentList.length; i++) {
    const student = studentList[i];
    if (i > 0) doc.addPage();

    // Draw markers
    const mSize = 10;
    doc.setFillColor(0, 0, 0);
    doc.rect(10, 10, mSize, mSize, 'F'); // TL
    doc.rect(190, 10, mSize, mSize, 'F'); // TR
    doc.rect(10, 280, mSize, mSize, 'F'); // BL
    doc.rect(190, 280, mSize, mSize, 'F'); // BR

    // QR Code for Student Identification
    if (student) {
      const qrData = `${student}|${exam.classYear || ''}`;
      try {
        const qrUrl = await QRCode.toDataURL(qrData);
        doc.addImage(qrUrl, 'PNG', 170, 22, 25, 25);
      } catch (err) {
        console.error("QR Generation failed:", err);
      }
    }

    // Logo
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', 105 - 12, 10, 24, 24);
      } catch (e) {
        console.error("Error adding logo:", e);
      }
    }

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Colégio Progresso Santista", 105, 45, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text("FOLHA DE RESPOSTAS - SCANNER DIGITAL", 105, 52, { align: 'center' });
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(`PROVA: ${exam.title.toUpperCase()}`, 105, 62, { align: 'center' });

    // Header boxes
    doc.setDrawColor(200, 200, 200);
    doc.rect(15, 75, 120, 12); // Student name box
    doc.rect(140, 75, 55, 12); // Class/Date box
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("ALUNO(A):", 17, 79);
    doc.text("TURMA / DATA:", 142, 79);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(student || "______________________________________", 17, 85);
    doc.text(exam.classYear || "____/____/____", 142, 85);

    // Simple Instruction
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 0, 0);
    doc.text("INSTRUÇÕES: Preencha totalmente a bolinha com caneta preta ou azul. Não rasure os quadrados nos cantos.", 105, 95, { align: 'center' });

    const startY = 110;
    const rowHeight = 8;
    const colWidth = 10;
    doc.setTextColor(0, 0, 0);

    exam.questions.forEach((q: any, i: number) => {
      const y = startY + (i * rowHeight);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`${String(i + 1).padStart(2, '0')}.`, 35, y);
      
      const options = ['A', 'B', 'C', 'D', 'E'];
      options.forEach((opt, j) => {
        const x = 60 + (j * colWidth * 2);
        
        // Draw bubble
        doc.setDrawColor(0, 0, 0);
        doc.circle(x, y - 1, 3);
        
        // Option Text
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(opt, x - 1, y);
      });
    });
    
    // Footnote
    doc.setFontSize(7);
    doc.text("EduGrade v3.0 - Processamento Local", 105, 275, { align: 'center' });
  }

  doc.save(`Folhas_Respostas_${exam.title}.pdf`);
}
