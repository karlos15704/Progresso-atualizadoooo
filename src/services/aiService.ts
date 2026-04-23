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
  
  // Mapping for the AI
  const expectedAnswers = questions.map((q: any) => ({
    questionId: q.id,
    correctOption: q.correctAnswer,
    points: parseFloat(q.points || 1)
  }));
  const maxTotalScore = expectedAnswers.reduce((sum: number, q: any) => sum + q.points, 0);

  const prompt = `
    Você é um assistente de correção de provas e avaliações. 
    Analise a imagem da prova/gabarito de título "${examTitle}".
    
    Abaixo está a lista oficial de respostas esperadas ("correctOption") e o valor (peso) de cada questão ("points"):
    ${JSON.stringify(expectedAnswers, null, 2)}
    
    Instruções estritas:
    1. Identifique e extraia o nome do estudante e também a sua turma (class) da imagem, se houver.
    2. Leia quais alternativas o estudante marcou para cada questão.
    3. Construa o \`answers\` object onde a chave é o número da questão e o valor é a letra marcada pelo estudante (ex: "1": "A"). Se estiver rasurado ou em branco, coloque "".
    4. Calcule a nota final (\`score\`) somando o valor (\`points\`) SOMENTE das questões em que o estudante acertou. O \`maxScore\` total desta prova é ${maxTotalScore}.
    5. Crie um \`feedback\` curto para o aluno (ex: "Excelente!", "Estude mais o tópico X").
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
    throw new Error("A Inteligência Artificial não retornou uma resposta válida. Tente com uma foto mais nítida.");
  }

  let text = response.text.trim();
  if (text.startsWith("```json")) text = text.replace(/```json/g, "").replace(/```/g, "").trim();
  else if (text.startsWith("```")) text = text.replace(/```/g, "").trim();

  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Parse error:", text);
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
