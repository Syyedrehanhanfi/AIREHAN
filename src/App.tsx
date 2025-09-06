import { useState, useRef, useEffect } from "react";

// Type definitions
interface ChatMessage {
  type: "user" | "ai" | "error";
  content: string;
  timestamp: Date;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

interface GeminiError {
  error?: {
    message?: string;
    code?: number;
  };
}

interface GenerationConfig {
  temperature: number;
  topK: number;
  topP: number;
  maxOutputTokens: number;
}

interface SafetySetting {
  category: string;
  threshold: string;
}

interface GeminiRequestBody {
  contents: Array<{
    parts: Array<{
      text: string;
    }>;
  }>;
  generationConfig?: GenerationConfig;
  safetySettings?: SafetySetting[];
}

const App: React.FC = () => {
  const [prompt, setPrompt] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [darkMode, setDarkMode] = useState<boolean>(false);
 
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to bottom when new messages arrive
  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, loading]);

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  const handleApi = async (): Promise<void> => {
    if (!prompt.trim()) return;

    const currentPrompt: string = prompt;
    setPrompt(""); // Clear input immediately
    setLoading(true);
    setError(null);

    // Add user message to chat history
    setChatHistory((prev) => [
      ...prev,
      {
        type: "user",
        content: currentPrompt,
        timestamp: new Date(),
      },
    ]);

    try {
      const requestBody: GeminiRequestBody = {
        contents: [{ parts: [{ text: currentPrompt }] }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
        ],
      };

      const response = await fetch( "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent", { method: "POST", headers: { "Content-Type": "application/json", "X-goog-api-key": import.meta.env.VITE_GEMINI_API_KEY, }, body: JSON.stringify(requestBody), } )

      if (!response.ok) {
        const errorData: GeminiError = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message ||
            `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const data: GeminiResponse = await response.json();

      if (!data.candidates || data.candidates.length === 0) {
        throw new Error(
          "No response generated. The content might have been filtered."
        );
      }

      let reply: string =
        data.candidates[0]?.content?.parts?.[0]?.text ||
        "No response generated";

      reply = cleanMarkdown(reply);

      // Add AI response to chat history
      setChatHistory((prev) => [
        ...prev,
        { type: "ai", content: reply.trim(), timestamp: new Date() },
      ]);
    } catch (err) {
      console.error("Error fetching:", err);
      let errorMessage: string = "Something went wrong.";

      if (err instanceof Error) {
        if (err.message.includes("API_KEY")) {
          errorMessage = "Invalid API key. Please check your Gemini API key.";
        } else if (err.message.includes("quota")) {
          errorMessage = "API quota exceeded. Please try again later.";
        } else if (err.message.includes("filtered")) {
          errorMessage = "Content was filtered. Please try a different question.";
        } else if (err.name === "TypeError") {
          errorMessage = "Network error. Please check your internet connection.";
        } else if (err.message) {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);

      setChatHistory((prev) => [
        ...prev,
        { type: "error", content: errorMessage, timestamp: new Date() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const cleanMarkdown = (text: string): string => {
    return text
      .replace(
        /```(javascript|js|jsx|typescript|ts|tsx|python|java|cpp|c|html|css|json|xml|yaml|sql)?/gi,
        ""
      )
      .replace(/```/g, "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/#{1,6}\s/g, "")
      .trim();
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === "Enter" && !e.shiftKey && !loading) {
      e.preventDefault();
      handleApi();
    }
  };

  const clearChat = (): void => {
    setChatHistory([]);
    setError(null);
    setPrompt("");
  };

  const formatTimestamp = (timestamp: Date): string => {
    return timestamp.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setPrompt(e.target.value);
  };

  const clearPrompt = (): void => {
    setPrompt("");
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'dark bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-100'}`}>   
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className={`w-full max-w-4xl shadow-xl rounded-2xl flex flex-col h-[90vh] ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          {/* Header */}
          <div className="p-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-2xl flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold">RehanAI🤖</h1>
              <p className="text-sm opacity-90">Powered by syyedrehan</p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Dark Mode Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {darkMode ? "🌙" : "☀️"}
                </span>
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-300 
                  ${darkMode ? "bg-blue-400" : "bg-white bg-opacity-30"}`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300
                    ${darkMode ? "translate-x-6" : "translate-x-0"}`}
                  ></div>
                </button>
              </div>
              
              <button
                onClick={clearChat}
                className="px-3 py-2 border border-white text-white hover:bg-white hover:text-blue-600 rounded-lg text-sm transition-all duration-200"
                type="button"
              >
                Clear Chat
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            {/* Welcome message */}
            {chatHistory.length === 0 && !loading && (
              <div className={`text-center py-8 ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                <div className="text-6xl mb-4">🤖</div>
                <h2 className="text-xl font-semibold mb-2">
                   Welcome to Rehan AI!
                </h2>
                <p>Ask me anything and I'll be happy to help.</p>
              </div>
            )}

            {/* Chat History */}
            {chatHistory.map((msg: ChatMessage, index: number) => (
              <div
                key={index}
                className={`flex ${
                  msg.type === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] ${
                    msg.type === "user"
                      ? "bg-blue-600 text-white rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl"
                      : msg.type === "error"
                      ? "bg-red-100 text-red-700 border border-red-200 rounded-2xl dark:bg-red-900 dark:text-red-200 dark:border-red-800"
                      : `${darkMode ? 'bg-gray-600 text-white border-gray-500' : 'bg-white border-gray-200'} border rounded-tl-2xl rounded-tr-2xl rounded-br-2xl shadow-sm`
                  } p-4 relative group`}
                >
                  <pre className="whitespace-pre-wrap text-sm font-sans break-words">
                    {msg.content}
                  </pre>
                  <div
                    className={`text-xs mt-2 opacity-70 ${
                      msg.type === "user" ? "text-blue-100" : darkMode ? "text-gray-300" : "text-gray-500"
                    }`}
                  >
                    {formatTimestamp(msg.timestamp)}
                  </div>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="flex">
                <div className={`${darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-200'} border p-4 rounded-tl-2xl rounded-tr-2xl rounded-br-2xl shadow-sm max-w-[80%]`}>
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                    <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Error (if any) */}
            {error && !loading && (
              <div className={`${darkMode ? 'bg-red-900 border-red-800 text-red-200' : 'bg-red-50 border-red-200 text-red-700'} border p-4 rounded-lg`}>
                <div className="flex items-start">
                  <span className="text-red-500 mr-2">⚠️</span>
                  <div>
                    <div className="font-medium">Error</div>
                    <div className="text-sm">{error}</div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className={`p-4 border-t ${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white'} rounded-b-2xl`}>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <textarea
                  value={prompt}
                  onChange={handlePromptChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className={`w-full border rounded-xl p-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'border-gray-300 bg-white text-black'
                  }`}
                  rows={1}
                  style={{ minHeight: "44px", maxHeight: "120px" }}
                  disabled={loading}
                />
                {prompt && (
                  <button
                    onClick={clearPrompt}
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 hover:text-gray-600 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}
                    type="button"
                    aria-label="Clear input"
                  >
                    ✕
                  </button>
                )}
              </div>
              <button
                onClick={handleApi}
                disabled={loading || !prompt.trim()}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                  loading || !prompt.trim()
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg"
                }`}
                type="button"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Sending...</span>
                  </div>
                ) : (
                  <span>Send</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;