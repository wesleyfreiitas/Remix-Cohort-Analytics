import { useState, useRef, useEffect } from "react";
import { Bot, Send, User, MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { chatWithData, ChatMessage } from "@/services/aiInsightsService";
import { CohortContext } from "@/utils/prepareAIContext";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

interface ChatInterfaceProps {
  cohortContext: CohortContext;
}

const suggestions = [
  "Qual canal retém melhor?",
  "Compare os planos",
  "Qual o pior cohort?",
  "Previsão de churn",
];

export function ChatInterface({ cohortContext }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollContainerRef.current) {
      const viewport = scrollContainerRef.current.querySelector(
        '[data-radix-scroll-area-viewport]'
      );
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages]);

  const handleSend = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    let assistantContent = "";

    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantContent } : m
          );
        }
        return [...prev, { role: "assistant", content: assistantContent }];
      });
    };

    try {
      await chatWithData(
        [...messages, userMessage],
        cohortContext,
        updateAssistant,
        () => setIsLoading(false)
      );
    } catch (error) {
      setIsLoading(false);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      if (errorMessage === "RATE_LIMIT") {
        toast({
          title: "Limite atingido",
          description: "Limite de requisições atingido. Tente novamente em alguns minutos.",
          variant: "destructive",
        });
      } else if (errorMessage === "PAYMENT_REQUIRED") {
        toast({
          title: "Créditos esgotados",
          description: "Créditos de IA esgotados. Adicione créditos em Configurações.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: "Erro ao processar mensagem. Tente novamente.",
          variant: "destructive",
        });
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape") {
      setInput("");
    }
  };

  const clearMessages = () => {
    setMessages([]);
  };

  return (
    <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-700/50">
      {/* Histórico de mensagens - aparece quando há mensagens */}
      {messages.length > 0 && (
        <div className="border-b border-gray-700/50" ref={scrollContainerRef}>
          <ScrollArea className="h-[400px]">
            <div className="p-5 space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-cyan-400" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${
                      message.role === "user"
                        ? "bg-cyan-500/20 text-white"
                        : "bg-gray-800/50 text-gray-200"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <div className="prose prose-sm prose-invert max-w-none">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p>{message.content}</p>
                    )}
                  </div>
                  {message.role === "user" && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                      <User className="h-4 w-4 text-gray-300" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div className="bg-gray-800/50 rounded-xl px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          
          {/* Botão para limpar conversa */}
          <div className="px-4 py-2 flex justify-end border-t border-gray-700/30">
            <button
              onClick={clearMessages}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <X className="h-3 w-3" />
              Limpar conversa
            </button>
          </div>
        </div>
      )}

      {/* Barra de input compacta - sempre visível */}
      <div className="p-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-cyan-400 flex-shrink-0">
          <MessageSquare className="h-5 w-5" />
          <span className="text-sm font-medium hidden sm:inline">Chat</span>
        </div>

        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pergunte sobre seus dados..."
          className="flex-1 min-w-[200px] h-9 bg-gray-800/50 border-gray-700 focus:border-cyan-500"
          disabled={isLoading}
        />

        {/* Sugestões - scroll horizontal em mobile, inline em desktop */}
        <div className="flex gap-2 overflow-x-auto order-last w-full sm:order-none sm:w-auto pb-1 sm:pb-0 scrollbar-thin scrollbar-thumb-gray-700">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => handleSend(suggestion)}
              disabled={isLoading}
              className="flex-shrink-0 px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-full transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {suggestion}
            </button>
          ))}
        </div>

        <Button
          onClick={() => handleSend()}
          disabled={!input.trim() || isLoading}
          size="sm"
          className="bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-500 hover:to-teal-500 text-gray-900 font-medium rounded-lg px-3 flex-shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
