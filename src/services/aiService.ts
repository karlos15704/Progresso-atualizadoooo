import { GoogleGenAI, Type } from "@google/genai";

export interface CorrectionResult {
  studentName: string;
  studentClass?: string;
  answers: Record<string, string>;
  score: number;
  maxScore: number;
  feedback: string;
}

// AI Initialization - Skill requirement: Use process.env.GEMINI_API_KEY
const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

export async function correctExamFromImage(
  imageBase64: string,
  mimeType: string,
  examTitle: string,
  questions: any[]
): Promise<CorrectionResult> {
  const maxTotalScore = questions.reduce((sum: number, q: any) => sum + parseFloat(q.points || 1), 0);

  if (!apiKey || apiKey === "") {
    throw new Error("Chave da API Gemini não encontrada. Por favor, adicione GEMINI_API_KEY nos Segredos (Settings > Secrets).");
  }

  try {
    console.log(`[AI Service] Starting Frontend Gemini correction for: ${examTitle}`);
    
    // Using gemini-1.5-flash for better stability/speed in this context
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: `Analise a imagem da prova: "${examTitle}". Estão presentes ${questions.length} questões. Extraia: studentName, studentClass, e um objeto answers onde a chave é o número da questão (ex: "1") e o valor é a resposta (A, B, C, D, E ou texto). Retorne também um campo 'feedback' curto.` },
            {
              inlineData: {
                mimeType: mimeType || "image/jpeg",
                data: imageBase64,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            studentName: { type: Type.STRING },
            studentClass: { type: Type.STRING },
            answers: { 
              type: Type.OBJECT,
              description: "Map of question number to student's answer"
            },
            feedback: { type: Type.STRING }
          },
          required: ["studentName", "answers", "feedback"]
        }
      }
    });

    const rawResult = JSON.parse(response.text || "{}");
    console.log(`[AI Service] Gemini Success result for: ${examTitle}`);
    
    // Local Score Calculation (Robust)
    let calculatedScore = 0;
    const finalAnswers: Record<string, string> = {};

    questions.forEach((q, idx) => {
      const qNum = String(idx + 1);
      const studentRaw = (rawResult.answers?.[qNum] || "").toString().trim().toUpperCase();
      
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

      console.log(`[AI Match] Q${qNum}: Student="${studentAnswer}" (Raw: "${studentRaw}"), Correct="${correctAnswer}"`);

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
    console.error("Gemini correction error:", e);
    throw new Error(e.message || "Falha ao processar o resultado da correção com Gemini.");
  }
}

export async function generateStudyGuide(content: string): Promise<string> {
  if (!apiKey || apiKey === "") {
    return "Guia manual (Chave API não configurada): " + content;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: `Crie um guia de estudos em Markdown para alunos com base em: "${content}".`,
    });
    return response.text || "Sem guia de estudos gerado.";
  } catch (error) {
    console.warn("Gemini generation failed", error);
    return "Guia manual: " + content;
  }
}
