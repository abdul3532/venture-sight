import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useDeck, useCouncilAnalysis, useSaveNotes } from "@/lib/api";
import {
    ArrowLeft, FileText, Sparkles, AlertTriangle,
    TrendingUp, Loader2, ExternalLink,
    Share2, ChevronDown, Users, BarChart3, Building2, StickyNote,
    MessageSquare
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { VerdictBadge, getVerdictFromScore } from "@/components/VerdictBadge";
import { StatusBadge } from "@/components/StatusBadge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidekickChat } from "@/components/SidekickChat";
import { TAMTab } from "@/components/tabs/TAMTab";
import { CompetitorsTab } from "@/components/tabs/CompetitorsTab";
import type { AgentAnalysis } from "@/lib/types";

// Helper component to format agent output properly
// Helper to safely parse numbers
const parseNumber = (val: string | number | undefined) => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') return parseFloat(val.replace(/,/g, '').replace(/\$/g, ''));
    return 0;
};

// Helper component to format agent output properly
function AgentContent({ data }: { data?: AgentAnalysis }): React.JSX.Element {
    if (!data) {
        return <p className="text-muted-foreground">No analysis available</p>;
    }

    // Attempt to parse string as JSON first
    if (typeof data === 'string') {
        try {
            const parsed = JSON.parse(data);
            if (typeof parsed === 'object' && parsed !== null) {
                return <AgentContent data={parsed} />;
            }
        } catch (e) {
            // Not JSON, continue to Markdown
        }

        return (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground/80 prose-li:text-foreground/80 prose-strong:text-foreground">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{data}</ReactMarkdown>
            </div>
        );
    }

    // If it's an object, format it nicely
    const formatValue = (value: unknown): string => {
        if (typeof value === 'string') return value;
        if (typeof value === 'number') return String(value);
        if (Array.isArray(value)) return value.join(', ');
        if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value, null, 2);
        }
        return String(value);
    };

    const formatKey = (key: string): string => {
        return key
            .replace(/_/g, ' ')
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    };

    return (
        <div className="space-y-4">
            {Object.entries(data).map(([key, value]) => (
                <div key={key} className="border-b border-border/50 pb-3 last:border-0">
                    <h4 className="font-medium text-sm text-primary mb-2">{formatKey(key)}</h4>
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:text-foreground/80">
                        {typeof value === 'string' ? (
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
                        ) : Array.isArray(value) ? (
                            <ul className="list-disc pl-4 space-y-1">
                                {value.map((item, i) => (
                                    <li key={i} className="text-foreground/80">{formatValue(item)}</li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-foreground/80">{formatValue(value)}</p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function DeckAnalysis() {
    const { deckId } = useParams<{ deckId: string }>();
    const navigate = useNavigate();

    const { data: deck, isLoading: deckLoading } = useDeck(deckId || null);
    const { data: analysis } = useCouncilAnalysis(deckId || null);


    const [activeTab, setActiveTab] = React.useState("overview");
    const [chatOpen, setChatOpen] = React.useState(false);
    const [notes, setNotes] = React.useState("");
    const saveNotesMutation = useSaveNotes();

    // Sync notes from deck
    React.useEffect(() => {
        if (deck?.notes) {
            setNotes(deck.notes);
        }
    }, [deck?.notes]);



    const handleSaveNotes = () => {
        if (deckId) {
            saveNotesMutation.mutate({ deckId, notes });
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 75) return "text-green-500";
        if (score >= 50) return "text-yellow-500";
        if (score >= 25) return "text-orange-500";
        return "text-red-500";
    };

    if (deckLoading || !deck) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const isAnalyzing = deck.status === "analyzing" || deck.status === "pending" || deck.status === "processing";
    const hasAnalysis = analysis?.status === "analyzed" && analysis.consensus;

    // Handle both old match_score and new final_score (0-10 scale)
    let matchScore = analysis?.consensus?.match_score || analysis?.consensus?.final_score || deck?.match_score;
    if (matchScore && matchScore <= 10) {
        matchScore = matchScore * 10;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header - Deckmatch Style */}
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/dealflow")}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">{deck.startup_name || "Untitled Startup"}</h1>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                            <span>Est. 2024</span>
                            <a
                                href="#"
                                className="flex items-center gap-1 text-primary hover:underline"
                                onClick={(e: React.MouseEvent) => e.preventDefault()}
                            >
                                {deck.filename.replace('.pdf', '.com')}
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Chat Actions */}
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => setChatOpen(true)}>
                        <MessageSquare className="w-4 h-4" />
                        Chat About This Deck
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate(`/associate?deck=${deckId}`)}>
                        <ExternalLink className="w-4 h-4" />
                        Open in Chat
                    </Button>

                    {/* Status Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-1.5">
                                <StatusBadge status="inbox" />
                                <ChevronDown className="w-3 h-3" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem>Inbox</DropdownMenuItem>
                            <DropdownMenuItem>Watchlist</DropdownMenuItem>
                            <DropdownMenuItem>Due Diligence</DropdownMenuItem>
                            <DropdownMenuItem>Term Sheet</DropdownMenuItem>
                            <DropdownMenuItem>Invested</DropdownMenuItem>
                            <DropdownMenuItem>Passed</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Share Button */}
                    <Button variant="default" size="sm" className="gap-1.5">
                        <Share2 className="w-4 h-4" />
                        Share Deal
                    </Button>
                </div>
            </div>

            {/* Tabs - Deckmatch Style */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-transparent border-b border-border rounded-none p-0 h-auto w-full justify-start space-x-1">
                    {[
                        { value: "overview", label: "Investment Memo" },
                        { value: "council", label: "Council" },
                        { value: "tam", label: "TAM", icon: BarChart3 },
                        { value: "competitors", label: "Competitors", icon: Building2 },
                        { value: "files", label: "Files", count: 1 },
                        { value: "notes", label: "Notes", icon: StickyNote },
                    ].map(tab => (
                        <TabsTrigger
                            key={tab.value}
                            value={tab.value}
                            className={cn(
                                "rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                                "hover:text-foreground"
                            )}
                        >
                            {(() => {
                                const Icon = tab.icon;
                                return Icon && <Icon className="w-4 h-4 mr-1.5" />;
                            })()}
                            {tab.label}
                            {tab.count && (
                                <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-xs">
                                    {tab.count}
                                </Badge>
                            )}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="mt-6">
                    <div className="space-y-6">
                        {/* Overall Score Banner */}
                        <Card className="p-6 border-border/50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">Overall Score</p>
                                    <p className={cn("text-4xl font-bold", getScoreColor(matchScore || 0))}>
                                        {matchScore || 0}/100
                                    </p>
                                </div>
                                {hasAnalysis && analysis.consensus && (
                                    <div className="mt-4">
                                        <VerdictBadge verdict={analysis.consensus.recommendation || getVerdictFromScore(matchScore || 0)} />
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Scoring Grid */}
                        {hasAnalysis && (analysis.consensus?.category_scores || analysis.consensus?.scores) && (
                            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {(analysis.consensus.category_scores || []).map((scoreItem: any, idx: number) => (
                                    <Card key={idx} className="p-4 border-border/50">
                                        <div className="flex items-start justify-between mb-2">
                                            <h4 className="font-semibold text-sm">{scoreItem.category}</h4>
                                            <span className={cn("text-lg font-bold",
                                                (scoreItem.score) >= 8 ? "text-green-500" :
                                                    (scoreItem.score) >= 6 ? "text-yellow-500" : "text-red-500"
                                            )}>
                                                {scoreItem.score}/10
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            {scoreItem.reason}
                                        </p>
                                    </Card>
                                ))}
                                {/* Fallback for old scores if category_scores missing */}
                                {!analysis.consensus.category_scores && analysis.consensus.scores && (
                                    Object.entries(analysis.consensus.scores).map(([key, item]: [string, any]) => (
                                        <Card key={key} className="p-4 border-border/50">
                                            <div className="flex items-start justify-between mb-2">
                                                <h4 className="font-semibold text-sm capitalize">{key.replace(/_/g, " ")}</h4>
                                                <span className={cn("text-lg font-bold",
                                                    (item.score) >= 4 ? "text-green-500" :
                                                        (item.score) >= 3 ? "text-yellow-500" : "text-red-500"
                                                )}>
                                                    {item.score}/5
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                {item.reason}
                                            </p>
                                        </Card>
                                    ))
                                )}
                            </div>
                        )}

                        {/* Full Investment Memo (Markdown) */}
                        {hasAnalysis && analysis.consensus?.investment_memo && (
                            <Card className="p-6 border-border/50">
                                <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground/80 prose-li:text-foreground/80">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {typeof analysis.consensus.investment_memo === 'string'
                                            ? analysis.consensus.investment_memo
                                            : JSON.stringify(analysis.consensus.investment_memo)
                                        }
                                    </ReactMarkdown>
                                </div>
                            </Card>
                        )}

                        {/* Strengths & Weaknesses */}
                        {hasAnalysis && (
                            <div className="grid md:grid-cols-2 gap-4">
                                <Card className="p-5 border-border/50 bg-green-500/5">
                                    <h4 className="font-semibold text-base text-green-500 mb-4 flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4" /> Key Strengths
                                    </h4>
                                    <ul className="space-y-3">
                                        {(analysis.consensus?.strengths || analysis.consensus?.key_strengths || []).map((s: string, i: number) => (
                                            <li key={i} className="flex items-start gap-3 text-sm group">
                                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center text-xs font-bold mt-0.5">
                                                    {i + 1}
                                                </span>
                                                <span className="text-foreground/90 group-hover:text-foreground transition-colors">{s}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </Card>
                                <Card className="p-5 border-border/50 bg-red-500/5">
                                    <h4 className="font-semibold text-base text-red-500 mb-4 flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4" /> Key Risks
                                    </h4>
                                    <ul className="space-y-3">
                                        {(analysis.consensus?.weaknesses || analysis.consensus?.key_concerns || analysis.consensus?.key_weaknesses || []).map((w: string, i: number) => (
                                            <li key={i} className="flex items-start gap-3 text-sm group">
                                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center text-xs font-bold mt-0.5">
                                                    {i + 1}
                                                </span>
                                                <span className="text-foreground/90 group-hover:text-foreground transition-colors">{w}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </Card>
                            </div>
                        )}

                        {/* Thesis Alignment - Green Checkmarks */}
                        {hasAnalysis && (
                            <Card className="p-4 border-border/50">
                                <h4 className="font-semibold text-sm mb-3">Thesis Alignment</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                        <p className="text-muted-foreground text-xs mb-1">Type</p>
                                        <p className="font-medium text-green-500">Software ✓</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-xs mb-1">Model</p>
                                        <p className="font-medium text-green-500">{analysis.consensus?.crm_data?.business_model || "B2B"} ✓</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-xs mb-1">Stage</p>
                                        <p className="font-medium text-green-500">{analysis.consensus?.crm_data?.stage || "Seed"} ✓</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-xs mb-1">Location</p>
                                        <p className="font-medium text-green-500">{analysis.consensus?.crm_data?.country || "N/A"} ✓</p>
                                    </div>
                                </div>
                            </Card>
                        )}

                        {/* Run Analysis CTA Removed: Automated by background pipeline */}


                        {isAnalyzing && (
                            <Card className="p-8 border-border/50 text-center">
                                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                                <p className="text-sm text-muted-foreground">Generating investment memo...</p>
                            </Card>
                        )}

                        {/* Model Info Footer */}
                        <p className="text-xs text-muted-foreground">
                            Model: gpt-4o &nbsp;•&nbsp; Evaluated: {new Date().toLocaleDateString()}
                        </p>
                    </div>
                </TabsContent>

                {/* Council Tab - Keep the Unique Feature */}
                <TabsContent value="council" className="mt-6">
                    <Card className="p-5 border-border/50">
                        <h3 className="font-semibold mb-4">AI Council Debate</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Three AI perspectives analyze this opportunity
                        </p>

                        {hasAnalysis ? (
                            <Tabs defaultValue="optimist" className="w-full">
                                <TabsList className="grid grid-cols-3 mb-4">
                                    <TabsTrigger value="optimist" className="gap-1.5 text-xs">
                                        <Sparkles className="w-3 h-3" />
                                        Optimist
                                    </TabsTrigger>
                                    <TabsTrigger value="skeptic" className="gap-1.5 text-xs">
                                        <AlertTriangle className="w-3 h-3" />
                                        Skeptic
                                    </TabsTrigger>
                                    <TabsTrigger value="quant" className="gap-1.5 text-xs">
                                        <TrendingUp className="w-3 h-3" />
                                        Quant
                                    </TabsTrigger>
                                </TabsList>

                                <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                                    <TabsContent value="optimist" className="mt-0">
                                        <AgentContent data={analysis.optimist} />
                                    </TabsContent>
                                    <TabsContent value="skeptic" className="mt-0">
                                        <AgentContent data={analysis.skeptic} />
                                    </TabsContent>
                                    <TabsContent value="quant" className="mt-0">
                                        <AgentContent data={analysis.quant} />
                                    </TabsContent>
                                </div>
                            </Tabs>
                        ) : isAnalyzing ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                                <p className="text-sm text-muted-foreground">Council is deliberating...</p>
                            </div>
                        ) : (
                            <div className="text-center py-12 text-muted-foreground">
                                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>Analysis is in progress or not yet triggered.</p>
                            </div>
                        )}
                    </Card>
                </TabsContent>

                {/* TAM Tab */}
                <TabsContent value="tam" className="mt-0">
                    <TAMTab tamData={analysis?.consensus?.crm_data ? {
                        tam: parseNumber(analysis.consensus.crm_data.tam),
                        sam: parseNumber(analysis.consensus.crm_data.sam),
                        som: parseNumber(analysis.consensus.crm_data.som),
                        analysis: analysis.consensus.crm_data.tam_analysis?.market_analysis || analysis.consensus.consensus_summary,
                        market_metrics: analysis.consensus.crm_data.tam_analysis?.market_metrics
                    } : undefined} />
                </TabsContent>

                {/* Competitors Tab */}
                <TabsContent value="competitors" className="mt-0">
                    <CompetitorsTab competitors={analysis?.consensus?.crm_data?.competitors} />
                </TabsContent>



                {/* Files Tab */}
                <TabsContent value="files" className="mt-6">
                    <Card className="p-5 border-border/50">
                        <h3 className="font-semibold mb-4">Files</h3>
                        <div className="border border-border rounded-lg p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-muted-foreground" />
                                <span>{deck.filename}</span>
                            </div>
                            <Button variant="outline" size="sm">Download</Button>
                        </div>
                    </Card>
                </TabsContent>

                {/* Notes Tab */}
                <TabsContent value="notes" className="mt-6">
                    <Card className="p-5 border-border/50">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">Notes</h3>
                            <Button size="sm" onClick={handleSaveNotes} disabled={saveNotesMutation.isPending}>
                                {saveNotesMutation.isPending ? "Saving..." : "Save Notes"}
                            </Button>
                        </div>
                        <textarea
                            className="w-full h-48 p-3 rounded-lg border border-border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Add your notes about this deal..."
                            value={notes}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                        />
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Floating Sidekick Chat Toggle */}
            <SidekickChat
                isOpen={chatOpen}
                onToggle={() => setChatOpen(!chatOpen)}
                deckId={deckId || ""}
                deckContext={deck?.raw_text}
            />
        </div>
    );
}
