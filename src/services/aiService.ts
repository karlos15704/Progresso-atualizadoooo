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
      
      // Robust matching for multiple choice: extract first A-E if it exists
      let studentAnswer = studentRaw;
      if (q.type !== 'essay') {
        const match = studentRaw.match(/([A-E])/);
        if (match) studentAnswer = match[1];
      }
      
      finalAnswers[q.id] = studentAnswer;

      const correctAnswerRaw = (q.correctAnswer || "").toString().trim().toUpperCase();
      let correctAnswer = correctAnswerRaw;
      if (q.type !== 'essay') {
        const match = correctAnswerRaw.match(/([A-E])/);
        if (match) correctAnswer = match[1];
      }

      // Exact match for objective questions
      if (q.type !== 'essay') {
        if (studentAnswer === correctAnswer && studentAnswer !== "") {
          calculatedScore += calculatePoints(q.points);
          console.log(`[AI Match] Q${qNum} SUCCESS: Student="${studentAnswer}", Correct="${correctAnswer}" (+${calculatePoints(q.points)} pts)`);
        } else {
          console.log(`[AI Match] Q${qNum} FAIL: Student="${studentAnswer}", Correct="${correctAnswer}"`);
        }
      } else {
        // Essay questions are recorded but not auto-scored here (usually professor reviews them)
        console.log(`[AI Match] Q${qNum} (ESSAY): Recorded answer.`);
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
