export interface CorrectionResult {
  studentName: string;
  studentClass?: string;
  answers: Record<string, string>;
  score: number;
  maxScore: number;
  feedback: string;
}

export async function correctExamFromImage(
  imageBase64: string,
  mimeType: string,
  examTitle: string,
  questions: any[]
): Promise<CorrectionResult> {
  const calculatePoints = (p: any) => {
    const val = parseFloat(p);
    return isNaN(val) ? 1 : val;
  };

  const maxTotalScore = questions.reduce((sum: number, q: any) => sum + calculatePoints(q.points), 0);

  try {
    console.log(`[AI Service] Requesting correction from server for: ${examTitle}`);
    
    const response = await fetch("/api/ai/correct", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64, mimeType, examTitle, questions })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro do servidor (${response.status}): ${errorText}`);
    }

    const rawResult = await response.json();
    console.log(`[AI Service] Correction received successfully`);
    
    // Local Score Calculation (Robust)
    let calculatedScore = 0;
    const finalAnswers: Record<string, string> = {};

    questions.forEach((q, idx) => {
      const qNum = String(idx + 1);
      
      // Try multiple ways to find the answer (case insensitive match of the key)
      let studentRaw = "";
      if (rawResult.answers) {
        // Direct match
        studentRaw = rawResult.answers[qNum] || "";
        // If not found, try common labels like "Q1", "Q 1", "Questão 1"
        if (!studentRaw) {
          const possibleKeys = [
            `Q${qNum}`, `Q ${qNum}`, `QUESTÃO ${qNum}`, `QUESTAO ${qNum}`, `QUESTION ${qNum}`,
            `Q${qNum}:`, `Q ${qNum}:`
          ];
          for (const key of Object.keys(rawResult.answers)) {
            if (possibleKeys.includes(key.toUpperCase())) {
              studentRaw = rawResult.answers[key];
              break;
            }
          }
        }
      }

      studentRaw = (studentRaw || "").toString().trim().toUpperCase();
      
      // Helper to extract choice (A-E)
      const extractChoice = (text: string) => {
        const cleaned = text.trim().toUpperCase();
        // Look for single letter A-E at start or surrounded by boundaries
        const match = cleaned.match(/\b([A-E])\b/) || cleaned.match(/^([A-E])/);
        return match ? match[1] : (cleaned.length === 1 ? cleaned : "");
      };

      let studentAnswer = extractChoice(studentRaw);
      let correctAnswer = extractChoice(q.correctAnswer || "");

      if (q.type !== 'essay') {
        if (studentAnswer === correctAnswer && studentAnswer !== "") {
          calculatedScore += calculatePoints(q.points);
          console.log(`[AI Match] Q${qNum} SUCCESS: Student="${studentAnswer}", Correct="${correctAnswer}" (+${calculatePoints(q.points)} pts)`);
        } else {
          console.log(`[AI Match] Q${qNum} FAIL: Student="${studentAnswer}" (Raw: "${studentRaw}"), Correct="${correctAnswer}" (Raw: "${q.correctAnswer}")`);
        }
        finalAnswers[q.id] = studentAnswer || studentRaw;
      } else {
        console.log(`[AI Match] Q${qNum} (ESSAY): Recorded answer.`);
        finalAnswers[q.id] = studentRaw;
      }
    });

    return {
      studentName: rawResult.studentName || "Não identificado",
      studentClass: rawResult.studentClass || "",
      answers: finalAnswers,
      score: Number(calculatedScore.toFixed(2)),
      maxScore: Number(maxTotalScore.toFixed(2)),
      feedback: rawResult.feedback || ""
    };
  } catch (e: any) {
    console.error("AI correction error:", e);
    throw new Error(e.message || "Falha ao processar a correção.");
  }
}

export async function generateStudyGuide(content: string): Promise<string> {
  try {
    const response = await fetch("/api/ai/study-guide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content })
    });
    
    if (!response.ok) return "Guia manual: " + content;
    
    const data = await response.json();
    return data.guide || "Sem guia de estudos gerado.";
  } catch (error) {
    console.warn("AI guide generation failed", error);
    return "Guia manual: " + content;
  }
}
