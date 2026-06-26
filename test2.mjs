import { GoogleGenAI, Type } from '@google/genai';
const client = new GoogleGenAI({ apiKey: 'invalid_key' });
const generationConfig = {
  responseMimeType: 'application/json',
  responseSchema: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      questions: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ['title', 'questions']
  }
};
try {
  let contentsList = [
    { text: 'prompt' },
    { text: 'text2' }
  ];
  await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: contentsList,
    config: generationConfig
  });
  console.log('Success');
} catch (err) {
  console.error('Error:', err);
}
