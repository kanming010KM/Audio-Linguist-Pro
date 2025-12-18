
export interface TextSegment {
  id: string;
  title: string;
  content: string;
  words: string[];
  audioBuffer?: AudioBuffer;
  duration?: number;
}

export interface WordInfo {
  word: string;
  pronunciation: string;
  chineseMeaning: string;
  exampleSentence: {
    en: string;
    zh: string;
  };
}

export interface AppSettings {
  voice: 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';
  speed: number;
}
