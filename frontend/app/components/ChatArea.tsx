import React from "react";
import ReactMarkdown from "react-markdown";

type Message = { from: string; text: string };

type ChatAreaProps = {
  messages: Message[];
  input: string;
  loading: boolean;
  recording: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSend: (e: React.FormEvent) => void;
  onRecord: () => void;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  audioPlayerRef: React.RefObject<HTMLAudioElement | null>;
};

export default function ChatArea({
  messages,
  input,
  loading,
  recording,
  onInputChange,
  onSend,
  onRecord,
  chatEndRef,
  audioPlayerRef
}: ChatAreaProps) {
  return (
    <main className="z-10 flex flex-col items-center gap-6 p-4 sm:p-8 w-full max-w-5xl">
      <h1 className="text-5xl sm:text-6xl font-extrabold text-center bg-gradient-to-r from-pink-500 via-blue-500 to-yellow-500 bg-clip-text text-transparent drop-shadow-lg mb-1">GiftGPT</h1>
      <h2 className="text-xl sm:text-2xl text-center font-semibold bg-gradient-to-r from-pink-400 via-blue-400 to-yellow-400 bg-clip-text text-transparent mb-2 mt-0">Your personal gift-finding assistant</h2>
      <div className="w-full flex flex-col bg-white/10 dark:bg-gray-900/10 rounded-xl shadow-lg p-0 sm:p-2 h-[70vh] max-h-[600px] overflow-y-auto">
        <div className="flex flex-col gap-3 p-4 pb-2">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.from === "user" ? "justify-end" : "justify-center"}`}> 
              <div className={`max-w-[95%] px-4 py-2 rounded-2xl text-base shadow-sm ${msg.from === "user" ? "bg-pink-500 text-white rounded-br-md" : "bg-white/20 dark:bg-gray-800/20 text-gray-800 dark:text-gray-100 rounded-bl-md backdrop-blur-md border border-white/30 dark:border-gray-700/30"}`} style={msg.from === "llm" ? { boxShadow: '0 4px 24px 0 rgba(0,0,0,0.08)' } : {}}>
                {msg.from === "llm" ? (
                  <div className="markdown-body">
                    <ReactMarkdown
                      components={{
                        h1: (props) => <h1 className="text-2xl font-bold mt-4 mb-2" {...props} />, 
                        h2: (props) => <h2 className="text-xl font-bold mt-3 mb-2" {...props} />, 
                        h3: (props) => <h3 className="text-lg font-semibold mt-2 mb-1" {...props} />, 
                        ul: (props) => <ul className="list-disc ml-6 mb-2" {...props} />, 
                        ol: (props) => <ol className="list-decimal ml-6 mb-2" {...props} />, 
                        li: (props) => <li className="mb-1" {...props} />, 
                        strong: (props) => <strong className="font-bold" {...props} />, 
                        code: (props) => <code className="bg-gray-100 text-pink-600 px-1 rounded" {...props} />, 
                        p: (props) => <p className="mb-2" {...props} />, 
                      }}
                    >{msg.text}</ReactMarkdown>
                  </div>
                ) : (
                  msg.text
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-center">
              <div className="max-w-[80%] px-4 py-2 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-sm animate-pulse">
                <span className="text-3xl">🎁✨</span> Thinking of the perfect gift...
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>
      <form onSubmit={onSend} className="w-full flex flex-col sm:flex-row items-center gap-2 mt-2">
        <div className="flex w-full gap-2 mt-2 sm:mt-0">
          <input
            className="flex-1 rounded-full px-4 py-3 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-400 bg-white dark:bg-gray-900 text-base shadow"
            placeholder="Type your message or use the mic"
            value={input}
            onChange={onInputChange}
            disabled={loading || recording}
            autoFocus
          />
          <button
            type="button"
            onClick={onRecord}
            className={`w-14 h-14 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-full transition-colors shadow flex items-center justify-center ${recording ? 'animate-pulse bg-red-500 hover:bg-red-600' : ''}`}
            disabled={loading}
            aria-label={recording ? "Stop recording" : "Start recording"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75v1.5m0 0h3.75m-3.75 0H8.25m7.5-7.5a3.75 3.75 0 11-7.5 0v-3a3.75 3.75 0 117.5 0v3z" />
            </svg>
          </button>
        </div>
      </form>
      <audio ref={audioPlayerRef} hidden />
    </main>
  );
}
