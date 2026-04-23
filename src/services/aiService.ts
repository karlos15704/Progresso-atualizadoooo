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
  examTitle: string,
  questions: any[]
): Promise<CorrectionResult> {
  const response = await fetch('/api/correctExam', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, examTitle, questions })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Falha ao processar a imagem da prova. Verifique se a foto está nítida.");
  }

  return response.json();
}

export async function generateStudyGuide(content: string): Promise<string> {
  try {
    const response = await fetch('/api/generateGuide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });

    if (!response.ok) {
      throw new Error("Generation failed");
    }

    const data = await response.json();
    return data.text || "Sem guia de estudos gerado.";
  } catch (error) {
    console.warn("AI generation failed, returning fallback content.", error);
    return "Guia manual: " + content;
  }
}
