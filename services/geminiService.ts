
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { UserPreferences } from "../types";

const API_KEY = process.env.API_KEY || '';

export const getGeminiResponse = async (
  prompt: string,
  history: { role: 'user' | 'model', parts: { text: string }[] }[],
  preferences: UserPreferences,
  location?: { latitude: number, longitude: number }
) => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  // Use Gemini 2.5 Flash for its Maps/Search capabilities and grounding
  const config: any = {
    systemInstruction: `You are a world-class AI Tour Guide. 
    Your tone is friendly, knowledgeable, and enthusiastic.
    Current User Preferences:
    - Budget: ${preferences.budget}
    - Interests: ${preferences.interests.join(', ')}
    - Preferred Duration: ${preferences.duration}
    - Language: ${preferences.language}

    Guidelines:
    1. Provide specific, actionable advice.
    2. Use Google Maps grounding for restaurants, hotels, and attractions.
    3. Use Google Search grounding for events, current weather, and tickets.
    4. If the user asks for a local phrase, provide the translation and phonetic pronunciation.
    5. Always suggest logical itineraries.
    6. Include emojis to make it engaging.`,
    tools: [
      { googleSearch: {} },
      { googleMaps: {} }
    ],
  };

  if (location) {
    config.toolConfig = {
      retrievalConfig: {
        latLng: {
          latitude: location.latitude,
          longitude: location.longitude
        }
      }
    };
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      ...history,
      { role: 'user', parts: [{ text: prompt }] }
    ],
    config
  });

  const text = response.text || "I'm sorry, I couldn't process that request.";
  
  // Extract grounding links
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const links = groundingChunks.map((chunk: any) => {
    if (chunk.web) return { title: chunk.web.title, uri: chunk.web.uri };
    if (chunk.maps) return { title: chunk.maps.title, uri: chunk.maps.uri };
    return null;
  }).filter(Boolean);

  return { text, links };
};

export const generateTTS = async (text: string) => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Read this description in an engaging tour guide voice: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
};

// PCM Decoding Helpers
export const decodeBase64 = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const decodeAudioData = async (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> => {
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
};
