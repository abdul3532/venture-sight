import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDecks, useChat, useUploadDocument, useChatHistory, useChatMessages, useDeleteConversation, useClearHistory } from "@/lib/api";
import { Send, FileText, Bot, User, Sparkles, Paperclip, X, History, Plus, Trash2, Globe, TrendingUp, BarChart3, Target } from "lucide-react";
import type { ChatMessage, Conversation, PitchDeck } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

export default function Chat() {
    const queryClient = useQueryClient();

    // State
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [documentContext, setDocumentContext] = useState<string>("");
    const [uploadedFiles, setUploadedFiles] = useState<{ name: string, text: string }[]>([]);
    const [sidebarView, setSidebarView] = useState<"history" | "context">("history");
    const [selectedDeckIds, setSelectedDeckIds] = useState<string[]>([]);

    // Refs
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Queries
    const { data: history = [] } = useChatHistory();
    const { data: serverMessages } = useChatMessages(conversationId);
    const { data: decks = [] } = useDecks();

    // Mutations
    const chat = useChat();
    const uploadDocument = useUploadDocument();
    const deleteConv = useDeleteConversation();
    const clearHistory = useClearHistory();

    // Effects
    useEffect(() => {
        if (serverMessages) {
            setMessages(serverMessages);
        }
    }, [serverMessages]);

    const [searchParams] = useSearchParams();

    // Effect: Auto-select deck from URL
    useEffect(() => {
        const deckParam = searchParams.get("deck");
        if (deckParam && decks.length > 0) {
            // Verify deck exists before selecting
            if (decks.some(d => d.id === deckParam)) {
                if (!selectedDeckIds.includes(deckParam)) {
                    setSelectedDeckIds([deckParam]);
                }
            }
        }
    }, [searchParams, decks]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Handlers
    const handleDeleteConv = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm("Delete this conversation?")) {
            deleteConv.mutate(id, {
                onSuccess: () => {
                    if (conversationId === id) setConversationId(null);
                }
            });
        }
    };

    const handleClearHistory = () => {
        if (confirm("Clear all chat history?")) {
            clearHistory.mutate(undefined, {
                onSuccess: () => {
                    setConversationId(null);
                    setMessages([]);
                }
            });
        }
    };

    const handleNewChat = () => {
        setConversationId(null);
        setMessages([]);
        setInput("");
        setSidebarView("context");
    };

    const handleLoadChat = (id: string) => {
        setConversationId(id);
    };

    const toggleDeckSelection = (deckId: string) => {
        setSelectedDeckIds(prev =>
            prev.includes(deckId)
                ? prev.filter(id => id !== deckId)
                : [...prev, deckId]
        );
    };
    const handleSendMessage = (overrideInput?: string) => {
        const textToSend = overrideInput || input;
        if (!textToSend.trim()) return;

        const userMessage: ChatMessage = {
            role: "user",
            content: textToSend
        };

        // Optimistic update
        setMessages(prev => [...prev, userMessage]);
        setInput(""); // Always clear input even if using override

        chat.mutate({
            query: textToSend,
            conversation_id: conversationId ?? undefined,
            document_context: documentContext,
            deck_ids: selectedDeckIds.length > 0 ? selectedDeckIds : undefined
        }, {
            onSuccess: (response: any) => {
                // Determine Conversation ID from response if it was new
                if (!conversationId && response.conversation_id) {
                    setConversationId(response.conversation_id);
                    queryClient.invalidateQueries({ queryKey: ['chatHistory'] });
                }

                // Append assistant message - API returns 'content', not 'response'
                setMessages(prev => [...prev, { role: "assistant", content: response.content }]);
            }
        });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        uploadDocument.mutate(file, {
            onSuccess: (response) => {
                setUploadedFiles(prev => [...prev, { name: response.filename, text: response.text }]);
                setDocumentContext(prev => prev + "\n\n=== DOCUMENT: " + response.filename + " ===\n" + response.text);
            }
        });
        // Reset input
        e.target.value = '';
    };

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-6 animate-fade-in text-foreground">
            {/* Sidebar */}
            <div className="md:w-80 flex flex-col gap-4">
                <Card className="glass-card p-0 border-border/50 flex-1 flex flex-col overflow-hidden">
                    {/* Sidebar Toggle */}
                    <div className="grid grid-cols-2 border-b border-border/50">
                        <button
                            onClick={() => setSidebarView("history")}
                            className={cn(
                                "flex items-center justify-center gap-2 p-3 text-sm font-medium transition-colors",
                                sidebarView === "history"
                                    ? "bg-accent/50 text-foreground border-b-2 border-primary"
                                    : "hover:bg-accent/20 text-muted-foreground"
                            )}
                        >
                            <History className="w-4 h-4" />
                            History
                        </button>
                        <button
                            onClick={() => setSidebarView("context")}
                            className={cn(
                                "flex items-center justify-center gap-2 p-3 text-sm font-medium transition-colors",
                                sidebarView === "context"
                                    ? "bg-accent/50 text-foreground border-b-2 border-primary"
                                    : "hover:bg-accent/20 text-muted-foreground"
                            )}
                        >
                            <Sparkles className="w-4 h-4" />
                            Context
                        </button>
                    </div>

                    {/* Sidebar Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                        {sidebarView === "history" ? (
                            <div className="space-y-3">
                                <div className="flex gap-2 mb-4">
                                    <Button
                                        onClick={handleNewChat}
                                        className="flex-1 justify-start gap-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20"
                                    >
                                        <Plus className="w-4 h-4" />
                                        New Chat
                                    </Button>
                                    <Button
                                        onClick={handleClearHistory}
                                        variant="outline"
                                        size="icon"
                                        className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                        disabled={history.length === 0}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>

                                {history.length === 0 ? (
                                    <p className="text-center text-xs text-muted-foreground py-4">No recent chats</p>
                                ) : (
                                    <div className="space-y-1">
                                        {history.map((conv: Conversation) => (
                                            <div
                                                key={conv.id}
                                                onClick={() => handleLoadChat(conv.id)}
                                                className={cn(
                                                    "group flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm transition-all cursor-pointer",
                                                    conversationId === conv.id
                                                        ? "bg-accent text-primary font-medium"
                                                        : "text-muted-foreground hover:text-foreground hover:bg-accent/20"
                                                )}
                                            >
                                                <span className="truncate flex-1">{conv.title || "Untitled Chat"}</span>
                                                <button
                                                    onClick={(e) => handleDeleteConv(e, conv.id)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-opacity"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Decks Context */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Analyzed Decks</h3>
                                        <Badge variant="outline" className="text-[10px] h-5">{decks.length}</Badge>
                                    </div>

                                    {decks.length === 0 ? (
                                        <p className="text-xs text-muted-foreground italic">No decks available</p>
                                    ) : (
                                        <div className="space-y-1 max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
                                            {decks.map((deck: PitchDeck) => (
                                                <div
                                                    key={deck.id}
                                                    className={cn(
                                                        "flex items-start gap-2 p-2 rounded-lg border border-transparent transition-colors cursor-pointer",
                                                        selectedDeckIds.includes(deck.id)
                                                            ? "bg-primary/10 border-primary/20"
                                                            : "hover:bg-accent/30 border-border/30"
                                                    )}
                                                    onClick={() => toggleDeckSelection(deck.id)}
                                                >
                                                    <Checkbox
                                                        checked={selectedDeckIds.includes(deck.id)}
                                                        onCheckedChange={() => toggleDeckSelection(deck.id)}
                                                        className="mt-1"
                                                    />
                                                    <div className="flex-1 overflow-hidden">
                                                        <p className={cn(
                                                            "text-sm font-medium truncate leading-tight",
                                                            selectedDeckIds.includes(deck.id) && "text-primary"
                                                        )}>
                                                            {deck.startup_name || deck.filename}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            {deck.match_score !== undefined && (
                                                                <span className={cn(
                                                                    "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                                                                    deck.match_score >= 75 ? "bg-green-500/10 text-green-500" :
                                                                        deck.match_score >= 45 ? "bg-yellow-500/10 text-yellow-500" :
                                                                            "bg-red-500/10 text-red-500"
                                                                )}>
                                                                    {Math.round(deck.match_score)}%
                                                                </span>
                                                            )}
                                                            <span className="text-[10px] text-muted-foreground truncate">
                                                                {new Date(deck.uploaded_at).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Documents */}
                                <div className="space-y-2 pt-4 border-t border-border/50">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Other Context</h3>
                                        <span className="text-[10px] text-muted-foreground">{uploadedFiles.length} files</span>
                                    </div>
                                    <input ref={fileInputRef} type="file" accept=".pdf,.txt,.md,.csv" onChange={handleFileUpload} className="hidden" />

                                    <Button
                                        onClick={() => fileInputRef.current?.click()}
                                        variant="outline"
                                        className="w-full border-dashed border-border/50 bg-card/50 hover:bg-accent/50 text-muted-foreground hover:text-foreground h-16 flex flex-col gap-1"
                                        disabled={uploadDocument.isPending}
                                    >
                                        <Plus className="h-4 w-4" />
                                        <span className="text-xs">Add Document</span>
                                    </Button>

                                    {/* File List */}
                                    <div className="space-y-2 mt-2 max-h-40 overflow-y-auto custom-scrollbar">
                                        {uploadedFiles.map((file, idx) => (
                                            <div key={idx} className="bg-primary/10 border border-primary/20 rounded-lg p-2 flex items-center justify-between group">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <FileText className="h-3 w-3 text-primary shrink-0" />
                                                    <span className="text-xs text-foreground truncate max-w-[150px]">{file.name}</span>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const newFiles = uploadedFiles.filter((_, i) => i !== idx);
                                                        setUploadedFiles(newFiles);
                                                        const newContext = newFiles.map(f => "\n\n=== DOCUMENT: " + f.name + " ===\n" + f.text).join("");
                                                        setDocumentContext(newContext);
                                                    }}
                                                    className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-h-0">
                <Card className="glass-card border-border/50 flex-1 flex flex-col overflow-hidden shadow-2xl">
                    {/* Header */}
                    <div className="p-4 border-b border-border/50 flex items-center justify-between bg-accent/20">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shadow-lg">
                                <Bot className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-foreground">AI VC Associate</h2>
                                <p className="text-xs text-green-500 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                    Active Pipeline Intel
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                        {messages.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-80 py-10">
                                <Sparkles className="w-16 h-16 text-primary/40 mb-4" />
                                <h3 className="text-2xl font-bold text-foreground mb-2">Deal Pipeline Assistant</h3>
                                <p className="text-sm text-muted-foreground max-w-sm mb-10 leading-relaxed">
                                    I analyze your active deals, market trends, and investment thesis to help you make data-driven decisions.
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl px-4">
                                    <QuickActionButton
                                        icon={BarChart3}
                                        label="Pipeline Summary"
                                        desc="Briefing on all active dealflow"
                                        onClick={() => handleSendMessage("Give me a high-level summary of my current pipeline.")}
                                    />
                                    <QuickActionButton
                                        icon={Globe}
                                        label="Market Trends"
                                        desc="Identify latest industry shifts"
                                        onClick={() => handleSendMessage("What are the core trends in the tech markets today?")}
                                    />
                                    <QuickActionButton
                                        icon={Target}
                                        label="Thesis Check"
                                        desc="Audit pipeline against thesis"
                                        onClick={() => handleSendMessage("Which current deals in my pipeline align best with my investment thesis?")}
                                    />
                                    <QuickActionButton
                                        icon={TrendingUp}
                                        label="Compare Deals"
                                        desc="Cross-evaluate top startups"
                                        onClick={() => handleSendMessage("Compare my top 3 startups in terms of metrics and team.")}
                                    />
                                </div>
                            </div>
                        )}

                        {messages.map((message, index) => (
                            <div key={index} className={cn("flex gap-4 max-w-[90%]", message.role === "user" ? "ml-auto flex-row-reverse" : "")}>
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm",
                                    message.role === "user" ? "bg-primary text-primary-foreground" : "bg-accent text-primary"
                                )}>
                                    {message.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                </div>
                                <div className={cn(
                                    "p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
                                    message.role === "user"
                                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                                        : "bg-muted/30 border border-border/50 text-foreground rounded-tl-sm"
                                )}>
                                    <div className={cn(
                                        "prose prose-sm dark:prose-invert max-w-none break-words",
                                        message.role === "user"
                                            ? "prose-p:text-primary-foreground prose-headings:text-primary-foreground prose-strong:text-primary-foreground font-medium"
                                            : "prose-p:text-foreground/90 prose-headings:text-foreground prose-strong:text-foreground"
                                    )}>
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {message.content}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {chat.isPending && (
                            <div className="flex gap-4 max-w-[85%]">
                                <div className="w-8 h-8 rounded-full bg-accent text-primary flex items-center justify-center flex-shrink-0 mt-1 animate-pulse"><Bot className="w-4 h-4" /></div>
                                <div className="bg-muted/30 border border-border/50 p-4 rounded-2xl rounded-tl-sm flex items-center gap-2 shadow-sm">
                                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></span>
                                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce delay-150"></span>
                                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce delay-300"></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-accent/10 border-t border-border/50 space-y-3">
                        {/* Context Pills */}
                        {selectedDeckIds.length > 0 && (
                            <div className="flex flex-wrap gap-2 px-1">
                                {selectedDeckIds.map(id => {
                                    const deck = decks.find(d => d.id === id);
                                    return (
                                        <Badge key={id} variant="secondary" className="flex items-center gap-1.5 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 pr-1">
                                            <span className="max-w-[120px] truncate">{deck?.startup_name || deck?.filename}</span>
                                            <button onClick={() => toggleDeckSelection(id)} className="p-0.5 rounded-full hover:bg-primary/20">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </Badge>
                                    );
                                })}
                                <button onClick={() => setSelectedDeckIds([])} className="text-[10px] text-muted-foreground hover:text-primary underline px-1">Clear all context</button>
                            </div>
                        )}

                        <div className="relative flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSidebarView("context")}
                                className={cn("text-muted-foreground hover:text-primary rounded-full transition-colors", sidebarView === "context" && "text-primary bg-primary/10")}
                            >
                                <Paperclip className="w-5 h-5" />
                            </Button>
                            <Input
                                placeholder={selectedDeckIds.length > 0 ? "Ask about selected deals..." : "Ask a pipeline query or market question..."}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                disabled={chat.isPending}
                                className="bg-background/80 border-border/50 focus:border-primary/50 focus:ring-primary/10 text-foreground placeholder:text-muted-foreground rounded-xl py-6 pl-4 pr-12 shadow-inner"
                            />
                            <Button
                                onClick={() => handleSendMessage()}
                                disabled={!input.trim() || chat.isPending}
                                size="icon"
                                className="absolute right-1.5 top-1.5 bottom-1.5 w-9 h-9 rounded-lg bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}

// Helper Components
function QuickActionButton({ icon: Icon, label, desc, onClick }: { icon: any, label: string, desc: string, onClick: () => void }) {
    return (
        <Button
            variant="outline"
            className="flex flex-col items-start gap-1 h-auto py-5 px-5 bg-card border-border/50 hover:border-primary/50 hover:bg-primary/5 group text-left transition-all hover:shadow-md"
            onClick={onClick}
        >
            <div className="flex items-center gap-3 w-full">
                <div className="p-2 rounded-lg bg-accent group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                    <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                    <p className="font-semibold text-foreground leading-none">{label}</p>
                    <p className="text-[11px] text-muted-foreground mt-1 group-hover:text-muted-foreground/80">{desc}</p>
                </div>
            </div>
        </Button>
    );
}
