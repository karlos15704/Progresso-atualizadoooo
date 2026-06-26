export const config = {
  runtime: "edge",
};

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido. Utilize POST." }), {
      status: 405,
      headers: { "content-type": "application/json" }
    });
  }

  let apiKey = (process.env.KarlosAPI || "").trim();
  if (!apiKey || apiKey === "" || apiKey === "undefined") {
    apiKey = (process.env.GEMINI_API_KEY || "").trim();
  }

  if (!apiKey || apiKey === "" || apiKey === "undefined" || apiKey.includes("YOUR_API_KEY")) {
    return new Response(JSON.stringify({ error: "Chave da API do Gemini não configurada no servidor." }), {
      status: 401,
      headers: { "content-type": "application/json" }
    });
  }

  try {
    const body = await req.json();
    const { fileBase64, mimeType, fileName, customInstructions, rawText } = body;

    let isWord = false;
    let isText = false;
    let extractedText = "";

    const lowerMime = (mimeType || "").toLowerCase();
    const lowerName = (fileName || "").toLowerCase();

    if (rawText) {
      extractedText = rawText;
      isText = true;
    } else if (
      lowerMime.includes("word") ||
      lowerMime.includes("officedocument.wordprocessingml") ||
      lowerMime.includes("msword") ||
      lowerName.endsWith(".docx") ||
      lowerName.endsWith(".doc")
    ) {
      isWord = true;
    } else if (lowerMime.startsWith("text/") || lowerName.endsWith(".txt")) {
      isText = true;
    }

    // If it's a Word or Text file and we don't have rawText, extract text using the Node.js backend route
    if (!rawText && (isWord || isText)) {
      if (!fileBase64) {
        return new Response(JSON.stringify({ error: "Nenhum arquivo enviado para extração de texto." }), {
          status: 400,
          headers: { "content-type": "application/json" }
        });
      }
      try {
        const host = req.headers.get("host") || "localhost:3000";
        // Determine protocol: secure for non-localhost/non-127.0.0.1
        const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
        const extractUrl = `${protocol}://${host}/api/admin/extract-text`;

        const extractRes = await fetch(extractUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ fileBase64, mimeType, fileName })
        });

        if (!extractRes.ok) {
          const errData = await extractRes.json().catch(() => ({}));
          return new Response(JSON.stringify({ error: errData.error || "Erro na extração de texto do arquivo DOCX/TXT." }), {
            status: extractRes.status,
            headers: { "content-type": "application/json" }
          });
        }

        const extractData = await extractRes.json();
        extractedText = extractData.text;
      } catch (err: any) {
        console.error("Failed to connect to extraction endpoint:", err);
        return new Response(JSON.stringify({ error: "Falha ao conectar com o serviço de extração de texto: " + err.message }), {
          status: 500,
          headers: { "content-type": "application/json" }
        });
      }
    }

    const prompt = `Analise o arquivo de prova fornecido e converta-o para o nosso formato estruturado.
      
Diretrizes:
1. Mapeie todas as questões encontradas na prova.
2. Identifique quais questões são objetivas (múltipla escolha) e quais são dissertativas (essay).
3. Para questões objetivas, extraia as alternativas como um array de strings ("options") contendo os textos das alternativas. Identifique a alternativa correta ("correctAnswer") como a letra correspondente ("A", "B", "C", "D", etc.). Se nenhuma alternativa correta for especificada no arquivo, adote "A" ou gere a resposta correta se possível.
4. Para questões dissertativas, defina "type" como "essay", "options" como um array vazio e "correctAnswer" como "". Defina também "lineCount" como um número de linhas em branco adequado para o aluno escrever a resposta (padrão: 5).
5. IDENTIFICAÇÃO DE FORMAS GEOMÉTRICAS: Se a questão contiver ou fizer referência clara a uma forma geométrica (por exemplo, um círculo, quadrado, retângulo, triângulo, triângulo retângulo, linha ou seta), configure os seguintes campos da questão correspondente:
   - "drawingShape": uma das opções: "none", "circle", "square", "rectangle", "triangle", "right-triangle", "line", "arrow".
   - "drawingShapeSize": tamanho da forma geométrica (número, padrão: 150).
   - "drawingShapeHeight": altura da forma geométrica (necessária para retângulos, triângulos ou triângulos retângulos, número, padrão: 100).
   - "drawingShapeFill": cor de preenchimento (padrão: "transparent").
   - "drawingShapeBorderColor": cor da borda (padrão: "black").
   - "drawingShapeBorderWidth": largura da borda (número, padrão: 2).
   - "drawingShapeBorderStyle": estilo da borda ("solid", "dashed" ou "dotted", padrão: "solid").
   - "drawingShapeText": qualquer legenda, rótulo ou valor numérico que deva aparecer escrito dentro/sobre a forma geométrica (ex: valores de lados, raio, etc.).
6. IDENTIFICAÇÃO DE GRÁFICOS E IMAGENS: Se a questão referir-se a uma imagem, foto ou gráfico complexo que não possa ser desenhado como forma geométrica simples:
   - Se o próprio arquivo enviado for uma imagem contendo apenas uma única questão com figura, podemos associar a imagem inteira à questão definindo "image" com a string base64 original.
   - Caso contrário, gere uma descrição textual rica da imagem dentro do texto da questão ou insira um marcador indicando a necessidade de imagem.
7. O campo "points" de cada questão deve ser preenchido (número, padrão: 1).
8. Extraia ou sugira um título representativo para a prova no campo "title".
9. Instruções extras fornecidas pelo usuário: ${customInstructions || "Nenhuma"}.`;

    let contents: any;
    if (rawText || isWord || isText) {
      contents = [
        {
          role: "user",
          parts: [
            {
              text: `${prompt}\n\n--- INÍCIO DO TEXTO EXTRAÍDO DO ARQUIVO ---\n${extractedText}\n--- FIM DO TEXTO EXTRAÍDO DO ARQUIVO ---`
            }
          ]
        }
      ];
    } else {
      if (!fileBase64) {
        return new Response(JSON.stringify({ error: "Nenhum arquivo ou texto fornecido para análise." }), {
          status: 400,
          headers: { "content-type": "application/json" }
        });
      }
      contents = [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType || "application/pdf",
                data: fileBase64
              }
            }
          ]
        }
      ];
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const geminiPayload = {
      contents,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING" },
            questions: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  id: { type: "INTEGER" },
                  type: { 
                    type: "STRING",
                    enum: ["objective", "essay"]
                  },
                  text: { type: "STRING" },
                  options: {
                    type: "ARRAY",
                    items: { type: "STRING" }
                  },
                  correctAnswer: { type: "STRING" },
                  points: { type: "NUMBER" },
                  lineCount: { type: "INTEGER" },
                  drawingShape: { type: "STRING" },
                  drawingShapeSize: { type: "INTEGER" },
                  drawingShapeHeight: { type: "INTEGER" },
                  drawingShapeFill: { type: "STRING" },
                  drawingShapeBorderColor: { type: "STRING" },
                  drawingShapeBorderWidth: { type: "INTEGER" },
                  drawingShapeBorderStyle: { type: "STRING" },
                  drawingShapeText: { type: "STRING" }
                },
                required: ["id", "type", "text"]
              }
            }
          },
          required: ["title", "questions"]
        }
      }
    };

    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(geminiPayload)
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API Error details:", errText);
      return new Response(JSON.stringify({ error: `Erro retornado pela API do Gemini: ${errText}` }), {
        status: geminiRes.status,
        headers: { "content-type": "application/json" }
      });
    }

    const geminiData = await geminiRes.json();
    let responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      console.error("Empty Gemini response data structure:", JSON.stringify(geminiData));
      return new Response(JSON.stringify({ error: "Resposta vazia ou incompleta da API do Gemini." }), {
        status: 502,
        headers: { "content-type": "application/json" }
      });
    }

    responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
      const parsed = JSON.parse(responseText);
      return new Response(JSON.stringify(parsed), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    } catch (jsonErr: any) {
      console.error("JSON parsing error on Gemini response text:", responseText);
      return new Response(JSON.stringify({ error: "Erro de formatação JSON no retorno da inteligência artificial: " + jsonErr.message }), {
        status: 500,
        headers: { "content-type": "application/json" }
      });
    }

  } catch (err: any) {
    console.error("Edge parse-exam-file error:", err);
    return new Response(JSON.stringify({ error: err.message || "Erro interno no processador Edge de provas." }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}
