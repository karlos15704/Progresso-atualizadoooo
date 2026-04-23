
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

  // 1. Greyscale
  const grayscale = new Uint8ClampedArray(width * height);
  for (let i = 0; i < data.length; i += 4) {
    grayscale[i / 4] = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
  }

  // 2. Adaptive Binarization (simple local threshold)
  let sumG = 0;
  for (let i = 0; i < grayscale.length; i++) sumG += grayscale[i];
  const avgG = sumG / grayscale.length;
  // Use a more generous threshold for detecting markers in possible shadows
  const threshold = Math.min(180, Math.max(90, avgG * 0.8)); 

  const binary = new Uint8Array(width * height);
  for (let i = 0; i < grayscale.length; i++) {
    binary[i] = grayscale[i] < threshold ? 1 : 0; // 1 = black, 0 = white
  }

  // 3. Find Markers (4 black squares)
  // We search in the corners (30% margin) for the most solid black squares
  const findMarker = (quad: 'tl' | 'tr' | 'bl' | 'br') => {
    const marginW = width * 0.3;
    const marginH = height * 0.3;
    let startX = 0, startY = 0, endX = marginW, endY = marginH;

    if (quad === 'tr') { startX = width - marginW; endX = width; }
    if (quad === 'bl') { startY = height - marginH; endY = height; }
    if (quad === 'br') { startX = width - marginW; endX = width; startY = height - marginH; endY = height; }

    let bestMarker = { x: 0, y: 0, area: 0 };
    const step = Math.max(2, Math.floor(width / 600)); 
    const winSize = Math.floor(width * 0.03); // Approximate marker size search window

    for (let y = Math.floor(startY + winSize); y < Math.floor(endY - winSize); y += step * 2) {
      for (let x = Math.floor(startX + winSize); x < Math.floor(endX - winSize); x += step * 2) {
        if (binary[y * width + x] === 1) {
          // Check density around this point
          let density = 0;
          const s = Math.floor(winSize / 2);
          for (let dy = -s; dy <= s; dy += step) {
            for (let dx = -s; dx <= s; dx += step) {
              const sx = x + dx, sy = y + dy;
              if (sx >= 0 && sx < width && sy >= 0 && sy < height && binary[sy * width + sx] === 1) density++;
            }
          }
          if (density > bestMarker.area) {
            bestMarker = { x, y, area: density };
          }
        }
      }
    }
    return bestMarker;
  };

  const tl = findMarker('tl');
  const tr = findMarker('tr');
  const bl = findMarker('bl');
  const br = findMarker('br');

  if (tl.area < 5 || tr.area < 5 || bl.area < 5 || br.area < 5) {
    throw new Error("Marcadores não encontrados. Tente tirar a foto mais de cima, focando nos 4 quadrados pretos dos cantos.");
  }

  // 4. QR Identity
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
  } catch (err) { console.warn("QR failed"); }

  // 5. Scan Questions
  const rowCount = correctAnswers.length;
  const results: Record<number, string> = {};
  let scoreValue = 0;
  let maxPossible = 0;
  const options = ['A', 'B', 'C', 'D', 'E'];

  for (let qIdx = 0; qIdx < rowCount; qIdx++) {
    const qPoints = parseFloat(String(correctAnswers[qIdx].points || 1));
    maxPossible += qPoints;

    let bestOption = "";
    let maxBlack = -1;

    for (let oIdx = 0; oIdx < 5; oIdx++) {
      // PDF Template coordinates (mm):
      // Markers at 15mm centers (distance 180x270)
      // Bubble centers: X = 60 + oIdx*20, Y = 110 + qIdx*8
      const normX = ((60 + (oIdx * 20)) - 15) / 180;
      const normY = ((110 + (qIdx * 8)) - 15) / 270;

      // Bilinear mapping using found marker positions
      const topX = tl.x + (tr.x - tl.x) * normX;
      const botX = bl.x + (br.x - bl.x) * normX;
      const topY = tl.y + (tr.y - tl.y) * normX;
      const botY = bl.y + (br.y - bl.y) * normX;

      const px = topX + (botX - topX) * normY;
      const py = topY + (botY - topY) * normY;

      let blackCount = 0;
      const r = Math.floor(width * 0.012); // Bubble sampling radius (slightly increased)
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const sx = Math.floor(px + dx), sy = Math.floor(py + dy);
          if (sx >= 0 && sx < width && sy >= 0 && sy < height && binary[sy * width + sx] === 1) blackCount++;
        }
      }

      // If at least 25% of pixels in the search circle are dark, consider it marked
      const minDarkness = (Math.PI * r * r) * 0.25;
      if (blackCount > maxBlack && blackCount > minDarkness) {
        maxBlack = blackCount;
        bestOption = options[oIdx];
      }
    }
    results[qIdx] = bestOption;
    if (bestOption === correctAnswers[qIdx].correctAnswer) scoreValue += qPoints;
  }

  return {
    studentName: decodedIdentity.name || "Não identificado",
    studentClass: decodedIdentity.class || "Geral",
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
