import { GoogleGenAI, Type } from "@google/genai";

export interface CorrectionResult {
  studentName: string;
  studentClass?: string;
  answers: Record<string, string>;
  score: number;
  maxScore: number;
  feedback: string;
}

// Initialize AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "AIzaSyCsdeVta7u2kw60hgz2xayGWMFbi1x8muo" });

export async function correctExamFromImage(
  imageBase64: string,
  mimeType: string,
  examTitle: string,
  questions: any[]
): Promise<CorrectionResult> {
  const maxTotalScore = questions.reduce((sum: number, q: any) => sum + parseFloat(q.points || 1), 0);

  try {
    console.log(`[AI Service] Starting Gemini correction for: ${examTitle}`);
    
    // Skill requirement: Use ai.models.generateContent directly
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
    
    // Local Score Calculation
    let calculatedScore = 0;
    const finalAnswers: Record<string, string> = {};

    questions.forEach((q, idx) => {
      const qNum = String(idx + 1);
      const studentAnswer = (rawResult.answers?.[qNum] || "").toString().trim().toUpperCase();
      finalAnswers[q.id] = studentAnswer;

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
    console.error("Gemini correction error:", e);
    throw new Error(e.message || "Falha ao processar o resultado da correção com Gemini.");
  }
}

export async function generateStudyGuide(content: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Crie um guia de estudos em Markdown para alunos com base em: "${content}".`,
    });
    return response.text || "Sem guia de estudos gerado.";
  } catch (error) {
    console.warn("Gemini generation failed", error);
    return "Guia manual: " + content;
  }
}
