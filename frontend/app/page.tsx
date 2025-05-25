"use client";
import { useState, useRef, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import ChatArea from "./components/ChatArea";
import FloatingGifts from "./components/FloatingGifts";

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

export default function Home() {
  const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY || "";
  const initialMessage = {
    from: "llm",
    text: `👋 Hi! I'm GiftGPT, your personal gift-finding assistant. Tell me a bit about who you're shopping for and the occasion, and I'll help you find the perfect present!`
  };
  const [messages, setMessages] = useState([{ ...initialMessage }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null as HTMLDivElement | null);
  const audioPlayerRef = useRef<HTMLAudioElement>(null as HTMLAudioElement | null);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleNewChat = () => {
    setMessages([{ ...initialMessage }]);
    setInput("");
  };

  const handleRecord = async () => {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
    } else {
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

  const sendAudio = async (audioBlob: Blob) => {
    setLoading(true);
    setMessages(msgs => [...msgs, { from: "user", text: "[Sent audio message]" }, { from: "llm", text: "" }]);
    const formData = new FormData();
    formData.append("audio", audioBlob, "audio.webm");
    formData.append("apiKey", OPENAI_API_KEY);
    try {
      const res = await fetch("/api/chat/audio-stream", {
        method: "POST",
        body: formData
      });
      if (!res.body) throw new Error("No response body");
      const audioStream = res.body;
      const reader = audioStream.getReader();
      const chunks = [];
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
          apiKey: OPENAI_API_KEY
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
    <div className="relative min-h-screen flex flex-row items-stretch justify-center bg-gradient-to-br from-pink-200 via-blue-100 to-yellow-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden transition-all duration-700">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        onNewChat={handleNewChat}
      />
      <div className="flex-1 flex flex-col items-center">
        <FloatingGifts />
        <ChatArea
          messages={messages}
          input={input}
          loading={loading}
          recording={recording}
          onInputChange={e => setInput(e.target.value)}
          onSend={handleSend}
          onRecord={handleRecord}
          chatEndRef={chatEndRef}
          audioPlayerRef={audioPlayerRef}
        />
        <footer className="z-10 mt-10 text-gray-400 text-xs text-center">
          &copy; {new Date().getFullYear()} GiftGPT. All rights reserved.
        </footer>
      </div>
    </div>
  );
}