
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Plus, 
  Settings, 
  Play, 
  Pause, 
  Square, 
  BookOpen, 
  ChevronRight, 
  Upload, 
  FileText,
  Loader2,
  Volume2,
  X
} from 'lucide-react';
import { TextSegment, WordInfo, AppSettings } from './types';
import { INITIAL_SETTINGS, AVAILABLE_VOICES } from './constants';
import { segmentText, generateTTS, lookupWord } from './services/geminiService';

const App: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [segments, setSegments] = useState<TextSegment[]>([]);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeWordIndex, setActiveWordIndex] = useState<number | null>(null);
  const [wordLookup, setWordLookup] = useState<WordInfo | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef(0);
  const pauseTimeRef = useRef(0);
  const highlightTimerRef = useRef<number | null>(null);

  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
    }
    if (highlightTimerRef.current) {
      window.clearInterval(highlightTimerRef.current);
      highlightTimerRef.current = null;
    }
    setIsPlaying(false);
    setActiveWordIndex(null);
  }, []);

  const handleProcess = async () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);
    try {
      const newSegments = await segmentText(inputText);
      setSegments(newSegments);
      setActiveSegmentIndex(0);
    } catch (error) {
      console.error("Segmentation error:", error);
      alert("Failed to process text. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const playSegment = async (index: number, startFromWord: number = 0) => {
    initAudio();
    stopAudio();
    
    const segment = segments[index];
    if (!segment) return;

    setActiveSegmentIndex(index);
    setIsPlaying(true);

    try {
      let buffer = segment.audioBuffer;
      let duration = segment.duration;

      if (!buffer) {
        const result = await generateTTS(segment.content, settings, audioContextRef.current!);
        buffer = result.buffer;
        duration = result.duration;
        // Update local segment with audio data
        const updated = [...segments];
        updated[index] = { ...segment, audioBuffer: buffer, duration };
        setSegments(updated);
      }

      if (buffer && audioContextRef.current) {
        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);
        
        const startTime = audioContextRef.current.currentTime;
        source.start(0, pauseTimeRef.current);
        sourceNodeRef.current = source;
        
        // Setup highlighting
        const totalWords = segment.words.length;
        const msPerWord = (duration! * 1000) / totalWords;
        let currentWord = startFromWord;
        
        setActiveWordIndex(currentWord);

        highlightTimerRef.current = window.setInterval(() => {
          currentWord++;
          if (currentWord < totalWords) {
            setActiveWordIndex(currentWord);
          } else {
            stopAudio();
          }
        }, msPerWord);

        source.onended = () => {
          if (isPlaying) stopAudio();
        };
      }
    } catch (error) {
      console.error("TTS error:", error);
      stopAudio();
    }
  };

  const togglePlayback = () => {
    if (isPlaying) {
      stopAudio();
      pauseTimeRef.current = 0; // Simplified pause for demo
    } else if (activeSegmentIndex !== null) {
      playSegment(activeSegmentIndex);
    }
  };

  const handleWordClick = async (word: string, segmentIndex: number) => {
    const context = segments[segmentIndex]?.content || "";
    stopAudio();
    setIsLookingUp(true);
    setWordLookup(null);
    try {
      const info = await lookupWord(word, context);
      setWordLookup(info);
    } catch (error) {
      console.error("Lookup error:", error);
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setInputText(text);
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Volume2 className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">Audio-Linguist Pro</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-8 flex flex-col md:flex-row gap-8">
        
        {/* Left Side: Input & Segments */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Input Panel */}
          {segments.length === 0 && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="mb-4 flex justify-between items-end">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">Import Content</h2>
                  <p className="text-sm text-slate-500">Add text to start your learning journey</p>
                </div>
                <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Upload Document
                  <input type="file" className="hidden" accept=".txt,.pdf" onChange={handleFileUpload} />
                </label>
              </div>
              <textarea 
                className="w-full h-48 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none transition-all text-slate-700 leading-relaxed"
                placeholder="Paste your English text here..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
              <button 
                onClick={handleProcess}
                disabled={isProcessing || !inputText.trim()}
                className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-semibold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Segmenting Text...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Process Content
                  </>
                )}
              </button>
            </div>
          )}

          {/* Segments Display */}
          {segments.length > 0 && (
            <div className="space-y-6 pb-32">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-800">Learning Segments</h3>
                <button 
                  onClick={() => {setSegments([]); setInputText(''); stopAudio();}}
                  className="text-sm text-indigo-600 font-medium hover:underline"
                >
                  Clear and Start Over
                </button>
              </div>
              {segments.map((segment, idx) => (
                <div 
                  key={segment.id}
                  className={`bg-white rounded-2xl p-6 border-2 transition-all shadow-sm ${
                    activeSegmentIndex === idx ? 'border-indigo-500 ring-4 ring-indigo-50/50' : 'border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Segment {idx + 1}</span>
                      <h4 className="text-lg font-bold text-slate-800">{segment.title}</h4>
                    </div>
                    <button 
                      onClick={() => activeSegmentIndex === idx && isPlaying ? stopAudio() : playSegment(idx)}
                      className={`p-3 rounded-full transition-all ${
                        activeSegmentIndex === idx && isPlaying 
                        ? 'bg-rose-100 text-rose-600' 
                        : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                      }`}
                    >
                      {activeSegmentIndex === idx && isPlaying ? <Square className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1 leading-relaxed text-lg">
                    {segment.words.map((word, wIdx) => {
                      const isActive = activeSegmentIndex === idx && activeWordIndex === wIdx;
                      return (
                        <span 
                          key={wIdx}
                          onClick={() => handleWordClick(word.replace(/[^a-zA-Z]/g, ''), idx)}
                          className={`cursor-pointer px-1 rounded transition-colors ${
                            isActive 
                            ? 'bg-indigo-500 text-white font-bold' 
                            : 'hover:bg-indigo-50 text-slate-700'
                          }`}
                        >
                          {word}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Sidebar Vocabulary */}
        <div className="w-full md:w-80 shrink-0">
          <div className="sticky top-28 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
            <div className="bg-slate-50 px-6 py-4 border-b flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-800">Quick Dictionary</h3>
            </div>
            
            <div className="flex-1 p-6 flex flex-col justify-center items-center">
              {isLookingUp ? (
                <div className="flex flex-col items-center gap-3 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <p className="text-sm">Fetching definition...</p>
                </div>
              ) : wordLookup ? (
                <div className="w-full space-y-4">
                  <div className="flex justify-between items-start">
                    <h4 className="text-2xl font-bold text-indigo-600">{wordLookup.word}</h4>
                    <button 
                      onClick={() => setWordLookup(null)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-sm font-medium text-slate-500 flex items-center gap-2">
                    <Volume2 className="w-4 h-4 cursor-pointer hover:text-indigo-600" onClick={() => initAudio()} />
                    [{wordLookup.pronunciation}]
                  </div>
                  <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                    <p className="text-indigo-900 font-medium">{wordLookup.chineseMeaning}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Example</p>
                    <p className="text-sm text-slate-700 italic">"{wordLookup.exampleSentence.en}"</p>
                    <p className="text-sm text-slate-500">{wordLookup.exampleSentence.zh}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-2">
                  <div className="bg-slate-100 p-4 rounded-full w-fit mx-auto mb-4">
                    <ChevronRight className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-slate-500 text-sm">Click any word in the text to see its meaning and pronunciation.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800">Learning Settings</h3>
              <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-200 rounded-full">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">Preferred Voice</label>
                <div className="grid grid-cols-1 gap-2">
                  {AVAILABLE_VOICES.map(v => (
                    <button 
                      key={v.name}
                      onClick={() => setSettings({...settings, voice: v.name as any})}
                      className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                        settings.voice === v.name ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 hover:bg-slate-50'
                      }`}
                    >
                      <span className="font-medium text-slate-800">{v.name}</span>
                      <span className="text-xs text-slate-500">{v.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">Playback Speed ({settings.speed}x)</label>
                <input 
                  type="range" 
                  min="0.5" 
                  max="2" 
                  step="0.1" 
                  value={settings.speed}
                  onChange={(e) => setSettings({...settings, speed: parseFloat(e.target.value)})}
                  className="w-full accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-2">
                  <span>Slow</span>
                  <span>Normal</span>
                  <span>Fast</span>
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t">
              <button 
                onClick={() => setShowSettings(false)}
                className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-900 transition-colors"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Player Controls */}
      {segments.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-[0_-8px_30px_rgb(0,0,0,0.12)] z-40">
          <div className="max-w-4xl mx-auto flex items-center gap-6">
            <div className="hidden sm:block shrink-0">
              <div className="bg-slate-100 p-3 rounded-xl">
                <FileText className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold text-slate-800 truncate">
                {activeSegmentIndex !== null ? segments[activeSegmentIndex].title : 'Ready to play'}
              </p>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 relative overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full transition-all duration-300"
                  style={{ width: `${activeWordIndex !== null && activeSegmentIndex !== null ? (activeWordIndex / segments[activeSegmentIndex].words.length) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={togglePlayback}
                className="bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-lg transition-transform active:scale-95"
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </button>
              <button 
                onClick={stopAudio}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-4 rounded-full transition-transform active:scale-95"
              >
                <Square className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
