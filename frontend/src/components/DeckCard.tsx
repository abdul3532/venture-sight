import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Clock, CheckCircle, Archive, Loader2 } from "lucide-react";
import type { PitchDeck } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DeckCardProps {
    deck: PitchDeck;
    onClick: () => void;
    isSelected?: boolean;
}

export function DeckCard({ deck, onClick, isSelected }: DeckCardProps) {
    const getStatusIcon = () => {
        switch (deck.status) {
            case "pending":
                return <Clock className="w-4 h-4 text-yellow-500" />;
            case "analyzing":
                return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
            case "analyzed":
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case "archived":
                return <Archive className="w-4 h-4 text-muted-foreground" />;
            default:
                return <Clock className="w-4 h-4" />;
        }
    };

    const getStatusLabel = () => {
        switch (deck.status) {
            case "pending":
                return "Pending Analysis";
            case "analyzing":
                return "Analyzing...";
            case "analyzed":
                return "Analysis Complete";
            case "archived":
                return "Archived";
            default:
                return deck.status;
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 75) return "bg-green-500/20 text-green-500 border-green-500/30";
        if (score >= 50) return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
        if (score >= 25) return "bg-orange-500/20 text-orange-500 border-orange-500/30";
        return "bg-muted text-muted-foreground";
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    return (
        <Card
            onClick={onClick}
            className={cn(
                "group cursor-pointer p-4 transition-all duration-200 border-border/50 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5",
                isSelected && "border-primary bg-primary/5",
                deck.status === "archived" && "opacity-60"
            )}
        >
            <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-primary" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                {deck.startup_name || "Untitled Startup"}
                            </h3>
                            <p className="text-xs text-muted-foreground truncate">
                                {deck.filename}
                            </p>
                        </div>

                        {/* Match Score Badge */}
                        {deck.status === "analyzed" && (
                            <Badge
                                variant="outline"
                                className={cn("shrink-0 font-bold", getScoreColor(deck.match_score))}
                            >
                                {Math.round(deck.match_score)}%
                            </Badge>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            {getStatusIcon()}
                            <span>{getStatusLabel()}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                            {formatDate(deck.uploaded_at)}
                        </span>
                    </div>
                </div>
            </div>
        </Card>
    );
}
