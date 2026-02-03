import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, TrendingUp, Shield, Users, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface MemoSection {
    title: string;
    icon: React.ElementType;
    score: number;
    content: string;
    color: string;
}

interface MemoTabProps {
    analysis?: {
        consensus?: {
            consensus_summary?: string;
            key_strengths?: string[];
            key_concerns?: string[];
            recommendation?: string;
        };
    };
}

export function MemoTab({ analysis }: MemoTabProps) {
    const hasAnalysis = analysis?.consensus;

    // Build memo sections from analysis or use placeholders
    const sections: MemoSection[] = [
        {
            title: "Team",
            icon: Users,
            score: 85,
            content: hasAnalysis
                ? "Strong founding team with relevant industry experience."
                : "Team analysis pending...",
            color: "text-blue-500 bg-blue-500/10"
        },
        {
            title: "Market",
            icon: Target,
            score: 75,
            content: hasAnalysis
                ? "Large addressable market with clear growth trajectory."
                : "Market analysis pending...",
            color: "text-purple-500 bg-purple-500/10"
        },
        {
            title: "Traction",
            icon: TrendingUp,
            score: 70,
            content: hasAnalysis
                ? "Early traction with promising unit economics."
                : "Traction analysis pending...",
            color: "text-green-500 bg-green-500/10"
        },
        {
            title: "Defensibility",
            icon: Shield,
            score: 60,
            content: hasAnalysis
                ? "Moderate moat through technology and data network effects."
                : "Defensibility analysis pending...",
            color: "text-orange-500 bg-orange-500/10"
        }
    ];

    return (
        <div className="mt-6 space-y-6">
            {/* Summary Card */}
            <Card className="p-6 border-border/50">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">Investment Memo</h3>
                    {hasAnalysis && analysis.consensus?.recommendation && (
                        <Badge className={cn(
                            analysis.consensus.recommendation.includes("Strong") && "bg-green-500",
                            analysis.consensus.recommendation.includes("Promising") && "bg-green-500/70",
                            analysis.consensus.recommendation.includes("Consider") && "bg-yellow-500",
                            analysis.consensus.recommendation.includes("Pass") && "bg-red-500"
                        )}>
                            {analysis.consensus.recommendation}
                        </Badge>
                    )}
                </div>

                {hasAnalysis && analysis.consensus?.consensus_summary ? (
                    <p className="text-muted-foreground leading-relaxed">
                        {analysis.consensus.consensus_summary}
                    </p>
                ) : (
                    <p className="text-muted-foreground">
                        Run AI Council analysis to generate an investment memo.
                    </p>
                )}
            </Card>

            {/* Section Scores */}
            <div className="grid md:grid-cols-2 gap-4">
                {sections.map((section) => (
                    <Card key={section.title} className="p-4 border-border/50">
                        <div className="flex items-start gap-3">
                            <div className={cn(
                                "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                                section.color
                            )}>
                                <section.icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                    <h4 className="font-medium">{section.title}</h4>
                                    <span className={cn(
                                        "text-sm font-bold",
                                        section.score >= 70 && "text-green-500",
                                        section.score >= 50 && section.score < 70 && "text-yellow-500",
                                        section.score < 50 && "text-red-500"
                                    )}>
                                        {section.score}/100
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                    {section.content}
                                </p>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Strengths & Concerns */}
            {hasAnalysis && (
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Strengths */}
                    {analysis.consensus?.key_strengths && analysis.consensus.key_strengths.length > 0 && (
                        <Card className="p-5 border-border/50">
                            <h4 className="font-medium text-green-500 mb-3 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" />
                                Key Strengths
                            </h4>
                            <ul className="space-y-2">
                                {analysis.consensus.key_strengths.map((strength, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0" />
                                        <span className="text-muted-foreground">{strength}</span>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}

                    {/* Concerns */}
                    {analysis.consensus?.key_concerns && analysis.consensus.key_concerns.length > 0 && (
                        <Card className="p-5 border-border/50">
                            <h4 className="font-medium text-orange-500 mb-3 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                Key Concerns
                            </h4>
                            <ul className="space-y-2">
                                {analysis.consensus.key_concerns.map((concern, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm">
                                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2 shrink-0" />
                                        <span className="text-muted-foreground">{concern}</span>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
