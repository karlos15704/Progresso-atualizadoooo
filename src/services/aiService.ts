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
  const maxTotalScore = questions.reduce((sum: number, q: any) => sum + parseFloat(q.points || 1), 0);

  try {
    const response = await fetch("/api/ai/correct", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64, mimeType, examTitle, questions })
    });

    if (!response.ok) {
      const text = await response.text();
      let errorMsg = "Falha na comunicação com o servidor de IA.";
      try {
        const err = JSON.parse(text);
        errorMsg = err.error || errorMsg;
      } catch (e) {
        errorMsg = `Erro do servidor (${response.status}): ${text.substring(0, 100)}...`;
      }
      throw new Error(errorMsg);
    }

    const rawResult = await response.json();
    
    // Local Score Calculation (Robust)
    let calculatedScore = 0;
    const finalAnswers: Record<string, string> = {};

    questions.forEach((q, idx) => {
      const qNum = String(idx + 1);
      const studentAnswer = (rawResult.answers[qNum] || "").toString().trim().toUpperCase();
      finalAnswers[q.id] = studentAnswer; // Keep ID-based internal mapping

      const correctAnswer = (q.correctAnswer || "").toString().trim().toUpperCase();
      if (q.type !== 'essay' && studentAnswer === correctAnswer && studentAnswer !== "") {
        calculatedScore += parseFloat(q.points || 1);
      }
    });

    return {
      studentName: rawResult.studentName || "Não identificado",
      studentClass: rawResult.studentClass || "",
      answers: finalAnswers,
      score: calculatedScore,
      maxScore: maxTotalScore,
      feedback: rawResult.feedback || ""
    };
  } catch (e: any) {
    console.error("AI correction error:", e);
    throw new Error(e.message || "Falha ao processar o resultado da correção.");
  }
}

export async function generateStudyGuide(content: string): Promise<string> {
  try {
    const response = await fetch("/api/ai/study-guide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content })
    });
    const data = await response.json();
    return data.guide || "Sem guia de estudos gerado.";
  } catch (error) {
    console.warn("AI generation failed", error);
    return "Guia manual: " + content;
  }
}
