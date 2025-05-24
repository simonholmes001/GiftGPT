"use client";
import { useState, useEffect, useRef } from "react";

// TypeScript SpeechRecognition type declarations for browser compatibility
// These are not included by default in TypeScript DOM lib

declare interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onaudioend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onaudiostart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onend: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  abort(): void;
  start(): void;
  stop(): void;
}

declare const SpeechRecognition: {
  prototype: SpeechRecognition;
  new (): SpeechRecognition;
};

declare interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

declare interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

declare interface SpeechRecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

declare interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

declare interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

const GIFT_ICONS = ["🎁", "🎈", "🎉", "🛍️", "🎂", "🧸", "💐", "🍫"];

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function FloatingGifts() {
  const GIFT_COUNT = 14;
  const [giftData, setGiftData] = useState<Array<{
    left: string;
    top: string;
    delay: string;
    icon: string;
    duration: string;
    key: string;
    anim: string;
  }>>([]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const animate = () => {
      const data = Array.from({ length: GIFT_COUNT }).map((_, i) => {
        const left = `${randomBetween(5, 85)}%`;
        const top = `${randomBetween(5, 85)}%`;
        const delay = `${randomBetween(0, 4)}s`;
        const icon = GIFT_ICONS[Math.floor(Math.random() * GIFT_ICONS.length)];
        const duration = `${randomBetween(6, 12)}s`;
        const anims = [
          'gift-float-curve1',
          'gift-float-curve2',
          'gift-float-curve3',
          'gift-float-curve4',
        ];
        const anim = anims[Math.floor(Math.random() * anims.length)];
        return {
          left,
          top,
          delay,
          icon,
          duration,
          key: `${i}-${Date.now()}`,
          anim,
        };
      });
      setGiftData(data);
      // Find the max duration for this batch
      const maxDuration = Math.max(...data.map(d => parseFloat(d.duration))) * 1000 + 4000;
      timeout = setTimeout(animate, maxDuration);
    };
    animate();
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      {giftData.map((pos) => (
        <span
          key={pos.key}
          className={`gift-emoji absolute text-3xl select-none animate-${pos.anim}`}
          style={{
            left: pos.left,
            top: pos.top,
            animationDelay: pos.delay,
            animationDuration: pos.duration,
            opacity: 0,
          }}
        >
          {pos.icon}
        </span>
      ))}
    </div>
  );
}

export default function Home() {
  const [messages, setMessages] = useState<Array<{ from: string; text: string }>>([
    {
      from: "llm",
      text: `👋 Hi! I'm GiftGPT, your personal gift-finding assistant. Tell me a bit about who you're shopping for and the occasion, and I'll help you find the perfect present!`
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Audio recording state
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Start/stop audio recording
  const handleRecord = async () => {
    if (recording) {
      // Stop recording
      mediaRecorderRef.current?.stop();
      setRecording(false);
    } else {
      // Start recording
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        audioChunksRef.current = [];
        mediaRecorder.ondataavailable = (e: BlobEvent) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          await sendAudio(audioBlob);
        };
        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start();
        setRecording(true);
      }
    }
  };

  // Send audio to backend and play streamed audio response
  const sendAudio = async (audioBlob: Blob) => {
    setLoading(true);
    setMessages(msgs => [...msgs, { from: "user", text: "[Sent audio message]" }, { from: "llm", text: "" }]);
    const formData = new FormData();
    formData.append("audio", audioBlob, "audio.webm");
    formData.append("apiKey", "YOUR_OPENAI_API_KEY"); // Replace with your actual key or prompt user securely if needed
    try {
      const res = await fetch("/api/chat/audio-stream", {
        method: "POST",
        body: formData
      });
      if (!res.body) throw new Error("No response body");
      // Stream and play audio
      const audioStream = res.body;
      const reader = audioStream.getReader();
      const chunks: Uint8Array[] = [];
      let done = false;
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) chunks.push(value);
      }
      const audioBlob = new Blob(chunks, { type: res.headers.get('content-type') || 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      if (audioPlayerRef.current) {
        audioPlayerRef.current.src = audioUrl;
        audioPlayerRef.current.play();
      }
      setMessages(msgs => {
        const updated = [...msgs];
        updated[updated.length - 1] = { from: "llm", text: "[Audio response]" };
        return updated;
      });
    } catch {
      setMessages(msgs => [
        ...msgs,
        { from: "llm", text: "[Error contacting backend]" }
      ]);
    }
    setLoading(false);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setMessages(msgs => [...msgs, { from: "user", text: input }]);
    setInput("");
    setLoading(true);
    const newMsg = { from: "llm", text: "" };
    setMessages(msgs => [...msgs, newMsg]);
    try {
      const res = await fetch("/api/chat/text-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          apiKey: "YOUR_OPENAI_API_KEY" // Replace with your actual key or prompt user securely if needed
        })
      });
      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accText = "";
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value);
          accText += chunk;
          setMessages(msgs => {
            const updated = [...msgs];
            updated[updated.length - 1] = { from: "llm", text: accText };
            return updated;
          });
        }
      }
    } catch {
      setMessages(msgs => [
        ...msgs,
        { from: "llm", text: "[Error contacting backend]" }
      ]);
    }
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-pink-200 via-blue-100 to-yellow-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden transition-all duration-700">
      <FloatingGifts />
      <main className="z-10 flex flex-col items-center gap-6 p-4 sm:p-8 w-full max-w-5xl">
        <h1 className="text-5xl sm:text-6xl font-extrabold text-center bg-gradient-to-r from-pink-500 via-blue-500 to-yellow-500 bg-clip-text text-transparent drop-shadow-lg mb-1">GiftGPT</h1>
        <h2 className="text-xl sm:text-2xl text-center font-semibold bg-gradient-to-r from-pink-400 via-blue-400 to-yellow-400 bg-clip-text text-transparent mb-2 mt-0">Your personal gift-finding assistant</h2>
        <div className="w-full flex flex-col bg-white/40 dark:bg-gray-900/40 rounded-xl shadow-lg p-0 sm:p-2 h-[70vh] max-h-[600px] overflow-y-auto">
          <div className="flex flex-col gap-3 p-4 pb-2">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}> 
                <div className={`max-w-[95%] px-4 py-2 rounded-2xl text-base shadow-sm ${msg.from === "user" ? "bg-pink-500 text-white rounded-br-md" : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-md"}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] px-4 py-2 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-sm animate-pulse">
                  <span className="text-3xl">🎁✨</span> Thinking of the perfect gift...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>
        <form onSubmit={handleSend} className="w-full flex flex-col sm:flex-row items-center gap-2 mt-2">
          <div className="flex w-full gap-2 mt-2 sm:mt-0">
            <input
              className="flex-1 rounded-full px-4 py-3 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-400 bg-white dark:bg-gray-900 text-base shadow"
              placeholder="Type your message or use the mic"
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading || recording}
              autoFocus
            />
            <button
              type="button"
              onClick={handleRecord}
              className={`bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-3 rounded-full transition-colors shadow flex items-center ${recording ? 'animate-pulse bg-red-500 hover:bg-red-600' : ''}`}
              disabled={loading}
              aria-label={recording ? "Stop recording" : "Start recording"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75v1.5m0 0h3.75m-3.75 0H8.25m7.5-7.5a3.75 3.75 0 11-7.5 0v-3a3.75 3.75 0 117.5 0v3z" />
              </svg>
            </button>
            <button
              type="submit"
              className="bg-pink-500 hover:bg-pink-600 text-white font-semibold px-5 py-3 rounded-full transition-colors disabled:opacity-50 shadow"
              disabled={loading || !input.trim()}
            >
              Send
            </button>
          </div>
        </form>
        <audio ref={audioPlayerRef} hidden />
      </main>
      <footer className="z-10 mt-10 text-gray-400 text-xs text-center">
        &copy; {new Date().getFullYear()} GiftGPT. All rights reserved.
      </footer>
    </div>
  );
}
