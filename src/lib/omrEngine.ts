
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

  // 2. Local Adaptive Binarization
  const binary = new Uint8Array(width * height);
  const gridSize = Math.floor(width / 8); 
  
  for (let gy = 0; gy < height; gy += gridSize) {
    for (let gx = 0; gx < width; gx += gridSize) {
      // Calculate local average in this grid
      let localSum = 0;
      let count = 0;
      const endY = Math.min(gy + gridSize, height);
      const endX = Math.min(gx + gridSize, width);
      
      for (let y = gy; y < endY; y++) {
        for (let x = gx; x < endX; x++) {
          localSum += grayscale[y * width + x];
          count++;
        }
      }
      
      const localAvg = localSum / count;
      const localThreshold = localAvg * 0.85; 

      for (let y = gy; y < endY; y++) {
        for (let x = gx; x < endX; x++) {
          binary[y * width + x] = grayscale[y * width + x] < localThreshold ? 1 : 0;
        }
      }
    }
  }

  // 3. Find Markers (4 black squares)
  // We search in the corners (30% margin) for the most solid black squares
  const findMarker = (quad: 'tl' | 'tr' | 'bl' | 'br') => {
    const marginW = width * 0.35;
    const marginH = height * 0.35;
    let startX = 0, startY = 0, endX = marginW, endY = marginH;

    if (quad === 'tr') { startX = width - marginW; endX = width; }
    if (quad === 'bl') { startY = height - marginH; endY = height; }
    if (quad === 'br') { startX = width - marginW; endX = width; startY = height - marginH; endY = height; }

    let bestMarker = { x: 0, y: 0, area: 0 };
    const step = Math.max(1, Math.floor(width / 800)); 
    const winSize = Math.floor(width * 0.04); 

    for (let y = Math.floor(startY); y < Math.floor(endY); y += step * 3) {
      for (let x = Math.floor(startX); x < Math.floor(endX); x += step * 3) {
        if (binary[y * width + x] === 1) {
          let density = 0;
          const s = Math.floor(winSize / 2);
          for (let dy = -s; dy <= s; dy += step * 2) {
            for (let dx = -s; dx <= s; dx += step * 2) {
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

  if (tl.area < 3 || tr.area < 3 || bl.area < 3 || br.area < 3) {
    throw new Error("Marcadores não encontrados. Verifique se os 4 quadrados pretos nos cantos estão visíveis e a iluminação está uniforme.");
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

  let bubbleIdx = 0; // The actual row index in the printed sheet
  for (let qIdx = 0; qIdx < rowCount; qIdx++) {
    const qPoints = parseFloat(String(correctAnswers[qIdx].points || 1));
    maxPossible += qPoints;

    const isEssay = correctAnswers[qIdx].correctAnswer === '__ESSAY__';

    if (isEssay) {
      results[qIdx] = ''; // No bubble for essay
      // Score will be 0 initially for essay questions, to be corrected manually
      continue;
    }

    let bestOption = "";
    let maxBlack = -1;

    for (let oIdx = 0; oIdx < 5; oIdx++) {
      // PDF Template coordinates (More precise mapping)
      // Marker centers at 15mm and 195mm (width 180mm)
      // Bubble centers at 60mm + j*20mm
      const normX = (45 + (oIdx * 20)) / 180; 
      
      // Marker centers at 15mm and 285mm (height 270mm)
      // Bubble centers at 109mm + bubbleIdx*8mm
      const normY = (94 + (bubbleIdx * 8)) / 270; 
      
      // Bilinear interpolation
      const topX = tl.x + (tr.x - tl.x) * normX;
      const botX = bl.x + (br.x - bl.x) * normX;
      const topY = tl.y + (tr.y - tl.y) * normX;
      const botY = bl.y + (br.y - bl.y) * normX;

      const px = topX + (botX - topX) * normY;
      const py = topY + (botY - topY) * normY;

      let blackCount = 0;
      // Search radius - slightly larger than the bubble (3mm in 180mm = ~1.6% of width)
      const r = Math.floor(width * 0.012); 
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const sx = Math.floor(px + dx), sy = Math.floor(py + dy);
          if (sx >= 0 && sx < width && sy >= 0 && sy < height && binary[sy * width + sx] === 1) blackCount++;
        }
      }

      // Density threshold: A marked circle is ~80% of its bounding box area
      // We check if the density is significant enough compared to the search area
      const totalArea = (2 * r + 1) * (2 * r + 1);
      if (blackCount > maxBlack && blackCount > (totalArea * 0.25)) { 
        maxBlack = blackCount;
        bestOption = options[oIdx];
      }
    }
    results[qIdx] = bestOption;
    if (bestOption === correctAnswers[qIdx].correctAnswer) scoreValue += qPoints;
    bubbleIdx++;
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

    let printedIdx = 0;
    exam.questions.forEach((q: any, i: number) => {
      if (q.type === 'essay' || q.correctAnswer === '__ESSAY__') return;

      const y = startY + (printedIdx * rowHeight);
      
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
      printedIdx++;
    });
    
    // Footnote
    doc.setFontSize(7);
    doc.text("EduGrade v3.0 - Processamento Local", 105, 275, { align: 'center' });
  }

  doc.save(`Folhas_Respostas_${exam.title}.pdf`);
}
