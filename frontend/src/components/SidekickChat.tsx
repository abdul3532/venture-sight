import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChat } from "@/lib/api";
import { MessageSquare, X, Send, Loader2, Bot, User, Minimize2, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface SidekickChatProps {
    isOpen: boolean;
    onToggle: () => void;
    deckId: string;
    deckContext?: string;
}

export function SidekickChat({ isOpen, onToggle, deckId, deckContext }: SidekickChatProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isMinimized, setIsMinimized] = useState(false);
    const [conversationId, setConversationId] = useState<string | undefined>(undefined);
    const chat = useChat();

    const handleSend = () => {
        if (!input.trim()) return;

        const userMessage: ChatMessage = { role: "user", content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput("");

        chat.mutate({
            query: input,
            conversation_id: conversationId,
            deck_id: deckId,
            document_context: deckContext?.slice(0, 10000)
        }, {
            onSuccess: (res) => {
                setMessages(prev => [...prev, { role: "assistant", content: res.content }]);
                if (res.conversation_id) {
                    setConversationId(res.conversation_id);
                }
            }
        });
    };

    // Floating button when closed
    if (!isOpen) {
        return (
            <button
                onClick={onToggle}
                className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary shadow-lg shadow-primary/25 flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-all hover:scale-105 z-50"
            >
                <MessageSquare className="w-6 h-6" />
            </button>
        );
    }

    return (
        <div
            className={cn(
                "fixed bottom-6 right-6 w-96 bg-card border border-border rounded-xl shadow-2xl shadow-black/20 z-50 overflow-hidden transition-all duration-300",
                isMinimized ? "h-14" : "h-[500px]"
            )}
        >
            {/* Header */}
            <div
                className="h-14 px-4 flex items-center justify-between bg-sidebar text-sidebar-foreground cursor-pointer"
                onClick={() => isMinimized && setIsMinimized(false)}
            >
                <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-primary" />
                    <span className="font-medium">Sidekick Chat</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
                        className="p-1.5 hover:bg-sidebar-accent rounded-md transition-colors"
                    >
                        {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggle(); }}
                        className="p-1.5 hover:bg-sidebar-accent rounded-md transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {!isMinimized && (
                <>
                    {/* Messages */}
                    <div className="flex-1 h-[calc(500px-14px-14px-56px)] overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {messages.length === 0 && (
                            <div className="text-center text-muted-foreground py-8">
                                <Bot className="w-10 h-10 mx-auto mb-3 opacity-50" />
                                <p className="text-sm">Ask me anything about this deal</p>
                                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                                    {[
                                        "Summarize the pitch",
                                        "Key risks?",
                                        "Market size?"
                                    ].map(suggestion => (
                                        <button
                                            key={suggestion}
                                            onClick={() => setInput(suggestion)}
                                            className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {messages.map((msg, i) => (
                            <div key={i} className={cn("flex gap-2", msg.role === "user" && "flex-row-reverse")}>
                                <div className={cn(
                                    "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                                    msg.role === "user" ? "bg-primary" : "bg-muted"
                                )}>
                                    {msg.role === "user"
                                        ? <User className="w-4 h-4 text-primary-foreground" />
                                        : <Bot className="w-4 h-4 text-primary" />
                                    }
                                </div>
                                <div className={cn(
                                    "max-w-[80%] p-3 rounded-xl text-sm",
                                    msg.role === "user"
                                        ? "bg-primary text-primary-foreground rounded-tr-none"
                                        : "bg-muted rounded-tl-none border border-border/50 text-foreground"
                                )}>
                                    <div className={cn(
                                        "prose prose-xs dark:prose-invert max-w-none break-words",
                                        msg.role === "user" ? "prose-p:text-primary-foreground prose-headings:text-primary-foreground prose-strong:text-primary-foreground" : "text-foreground"
                                    )}>
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {msg.content}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {chat.isPending && (
                            <div className="flex gap-2">
                                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                                    <Bot className="w-4 h-4 text-primary" />
                                </div>
                                <div className="bg-muted p-3 rounded-xl rounded-tl-none">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <div className="h-14 px-4 py-2 border-t border-border bg-background">
                        <div className="flex gap-2 h-full">
                            <Input
                                placeholder="Ask about this deal..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                                className="bg-muted/50 border-0 focus-visible:ring-1"
                            />
                            <Button
                                size="icon"
                                onClick={handleSend}
                                disabled={!input.trim() || chat.isPending}
                            >
                                <Send className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
