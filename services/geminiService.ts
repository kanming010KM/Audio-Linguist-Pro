
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { TextSegment, WordInfo, AppSettings } from "../types";
import { PROMPTS } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const segmentText = async (text: string): Promise<TextSegment[]> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: text,
    config: {
      systemInstruction: PROMPTS.SEGMENTATION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content: { type: Type.STRING },
          },
          required: ["title", "content"],
        },
      },
    },
  });

  const rawSegments = JSON.parse(response.text || "[]");
  return rawSegments.map((s: any, index: number) => ({
    id: `seg-${index}`,
    title: s.title,
    content: s.content,
    words: s.content.split(/\s+/).filter((w: string) => w.length > 0),
  }));
};

export const lookupWord = async (word: string, context: string): Promise<WordInfo> => {
  const prompt = PROMPTS.DICTIONARY_LOOKUP.replace('{word}', word).replace('{context}', context);
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING },
          pronunciation: { type: Type.STRING },
          chineseMeaning: { type: Type.STRING },
          exampleSentence: {
            type: Type.OBJECT,
            properties: {
              en: { type: Type.STRING },
              zh: { type: Type.STRING },
            },
            required: ["en", "zh"],
          },
        },
        required: ["word", "pronunciation", "chineseMeaning", "exampleSentence"],
      },
    },
  });

  return JSON.parse(response.text || "{}") as WordInfo;
};

export const generateTTS = async (text: string, settings: AppSettings, audioContext: AudioContext): Promise<{ buffer: AudioBuffer; duration: number }> => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Say this at speed ${settings.speed}: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: settings.voice },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("No audio data received");

  const audioData = decodeBase64(base64Audio);
  const buffer = await decodeAudioData(audioData, audioContext, 24000, 1);
  return { buffer, duration: buffer.duration };
};

// Helpers for audio processing
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
