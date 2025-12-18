
import { AppSettings } from './types';

export const INITIAL_SETTINGS: AppSettings = {
  voice: 'Kore',
  speed: 1.0,
};

export const AVAILABLE_VOICES = [
  { name: 'Kore', label: 'Cheerful & Clear' },
  { name: 'Puck', label: 'Soft & Gentle' },
  { name: 'Charon', label: 'Deep & Authoritative' },
  { name: 'Fenrir', label: 'Expressive & Bold' },
  { name: 'Zephyr', label: 'Fast & Informative' },
];

export const PROMPTS = {
  SEGMENTATION: `You are an expert editor. Split the provided text into logical, coherent segments (chapters or paragraphs). Each segment should focus on one main idea. Provide the output as a JSON array of objects, where each object has a 'title' (short summary) and 'content' (the actual text).`,
  DICTIONARY_LOOKUP: `You are a professional linguist and translator. Provide the following for the English word "{word}" in the context of the sentence "{context}":
  1. Phonetic transcription (IPA).
  2. The most appropriate Chinese (Simplified) meaning for this specific context.
  3. A classic English example sentence and its Chinese translation.
  Return as JSON.`,
};
