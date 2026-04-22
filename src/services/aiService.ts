import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiInstance;
}

export interface CorrectionResult {
  studentName: string;
  answers: Record<string, string>;
  score: number;
  maxScore: number;
  feedback: string;
}

export async function correctExamFromImage(
  imageBase64: string,
  examTitle: string,
  questions: any[]
): Promise<CorrectionResult> {
  const ai = getAI();
  
  // Create a simplified mapping for the AI to understand the expected answers and their weights
  const expectedAnswers = questions.map(q => ({
    questionId: q.id,
    correctOption: q.correctAnswer,
    points: parseFloat(q.points || 1) // Default to 1 point if not specified
  }));

  const maxTotalScore = expectedAnswers.reduce((sum, q) => sum + q.points, 0);

  const prompt = `
    Você é um assistente de correção de provas e avaliações. 
    Analise a imagem da prova/gabarito de título "${examTitle}".
    
    Abaixo está a lista oficial de respostas esperadas ("correctOption") e o valor (peso) de cada questão ("points"):
    ${JSON.stringify(expectedAnswers, null, 2)}
    
    Instruções estritas:
    1. Identifique e extraia o nome do estudante da imagem.
    2. Leia quais alternativas o estudante marcou para cada questão.
    3. Construa o \`answers\` object onde a chave é o número da questão e o valor é a letra marcada pelo estudante (ex: "1": "A"). Se estiver rasurado ou em branco, coloque "".
    4. Calcule a nota final (\`score\`) somando o valor (\`points\`) SOMENTE das questões em que o estudante acertou. O \`maxScore\` total desta prova é ${maxTotalScore}.
    5. Crie um \`feedback\` curto para o aluno (ex: "Excelente!", "Estude mais o tópico X").
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
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
          answers: { 
            type: Type.OBJECT,
            description: "Mapeamento de número da questão para resposta extraída"
          },
          score: { type: Type.NUMBER },
          maxScore: { type: Type.NUMBER },
          feedback: { type: Type.STRING }
        },
        required: ["studentName", "answers", "score", "maxScore", "feedback"]
      }
    }
  });

  if (!response.text) {
    throw new Error("Falha ao processar a imagem da prova.");
  }

  return JSON.parse(response.text);
}

export async function generateStudyGuide(content: string): Promise<string> {
  try {
    const ai = getAI();
    const prompt = `
      Com base nos seguintes conteúdos: "${content}", crie um guia de estudos estruturado para os alunos.
      Inclua tópicos principais, explicações breves e dicas de estudo.
      Formate em Markdown.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt
    });

    return response.text || "Sem guia de estudos gerado.";
  } catch (error) {
    console.warn("AI generation failed, returning fallback content.", error);
    return "Guia manual: " + content;
  }
}
