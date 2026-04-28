import { GoogleGenAI, Type } from "@google/genai";

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
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "undefined" || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error("A chave da API Gemini não está configurada corretamente. Adicione sua GEMINI_API_KEY nos segredos/configurações do projeto.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // Mapping for the AI - using indices for easier matching
  const aiQuestions = questions.map((q: any, index: number) => ({
    index: index + 1,
    type: q.type || 'multiple',
    options: q.options || [],
    points: parseFloat(q.points || 1)
  }));
  
  const maxTotalScore = questions.reduce((sum: number, q: any) => sum + parseFloat(q.points || 1), 0);

  const prompt = `
    Você é um assistente de correção de provas experiente. 
    Analise a imagem da prova/gabarito de título "${examTitle}".
    
    A prova possui ${questions.length} questões.
    Extraia as respostas do estudante para cada questão.
    
    Instruções estritas:
    1. Identifique e extraia o NOME DO ESTUDANTE e a TURMA (class) da imagem. Se não encontrar, retorne strings vazias.
    2. Liste o que o estudante marcou em cada questão (A, B, C, D, E ou texto para dissertativas).
    3. Retorne o objeto \`answers\` onde a chave é o NÚMERO da questão (começando em 1) e o valor é a resposta extraída.
    4. Não tente calcular a nota, eu farei isso.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          { text: prompt },
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
            description: "Mapeamento do número da questão para a resposta (ex: {\"1\": \"A\", \"2\": \"texto...\"})"
          },
          feedback: { type: Type.STRING }
        },
        required: ["studentName", "answers", "feedback"]
      }
    }
  });

  if (!response.text) {
    throw new Error("A Inteligência Artificial não retornou uma resposta válida.");
  }

  try {
    const rawResult = JSON.parse(response.text.replace(/```json|```/g, "").trim());
    
    // Local Score Calculation (Robust)
    let calculatedScore = 0;
    const finalAnswers: Record<string, string> = {};

    questions.forEach((q, idx) => {
      const qNum = String(idx + 1);
      const studentAnswer = (rawResult.answers[qNum] || "").toString().trim().toUpperCase();
      finalAnswers[idx] = studentAnswer; // Keep 0-based internal mapping

      if (q.type !== 'essay' && studentAnswer === q.correctAnswer.toUpperCase()) {
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
  } catch (e) {
    console.error("Parse or Logic error:", e);
    throw new Error("Falha ao processar o resultado da correção.");
  }
}

export async function generateStudyGuide(content: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "undefined" || apiKey === "MY_GEMINI_API_KEY") {
    return "Guia manual: " + content;
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    Com base nos seguintes conteúdos: "${content}", crie um guia de estudos estruturado para os alunos.
    Inclua tópicos principais, explicações breves e dicas de estudo.
    Formate em Markdown.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt
    });
    return response.text || "Sem guia de estudos gerado.";
  } catch (error) {
    console.warn("AI generation failed", error);
    return "Guia manual: " + content;
  }
}
