import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface ScoreCardProps {
    title: string;
    score: number;
    maxScore?: number;
    reason: string;
    className?: string;
}

export function ScoreCard({ title, score, maxScore = 5, reason, className }: ScoreCardProps) {
    const percentage = (score / maxScore) * 100;

    const getScoreColor = () => {
        if (percentage >= 80) return "text-green-500";
        if (percentage >= 60) return "text-yellow-500";
        if (percentage >= 40) return "text-orange-500";
        return "text-red-500";
    };

    return (
        <Card className={cn("p-4 border-border/50", className)}>
            <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-sm">{title}</h4>
                <span className={cn("text-lg font-bold", getScoreColor())}>
                    {score}/{maxScore}
                </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
                {reason}
            </p>
        </Card>
    );
}

interface StrengthsWeaknessesProps {
    strengths?: string[];
    weaknesses?: string[];
}

export function StrengthsWeaknesses({ strengths = [], weaknesses = [] }: StrengthsWeaknessesProps) {
    return (
        <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-4 border-border/50 bg-green-500/5">
                <h4 className="font-semibold text-sm text-green-500 mb-3">Strengths</h4>
                <ul className="space-y-2">
                    {strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="text-green-500 mt-0.5">+</span>
                            <span className="text-muted-foreground">{s}</span>
                        </li>
                    ))}
                    {strengths.length === 0 && (
                        <li className="text-sm text-muted-foreground">No strengths identified</li>
                    )}
                </ul>
            </Card>
            <Card className="p-4 border-border/50 bg-red-500/5">
                <h4 className="font-semibold text-sm text-red-500 mb-3">Weaknesses</h4>
                <ul className="space-y-2">
                    {weaknesses.map((w, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="text-red-500 mt-0.5">-</span>
                            <span className="text-muted-foreground">{w}</span>
                        </li>
                    ))}
                    {weaknesses.length === 0 && (
                        <li className="text-sm text-muted-foreground">No weaknesses identified</li>
                    )}
                </ul>
            </Card>
        </div>
    );
}

interface OverallScoreProps {
    score: number;
    recommendation?: string;
}

export function OverallScore({ score, recommendation }: OverallScoreProps) {
    const getScoreColor = () => {
        if (score >= 70) return "text-green-500";
        if (score >= 40) return "text-yellow-500";
        return "text-red-500";
    };

    const getBadgeStyle = () => {
        if (score >= 70) return "bg-green-500 text-white";
        if (score >= 40) return "bg-yellow-500 text-black";
        return "bg-red-500 text-white";
    };

    return (
        <Card className="p-6 border-border/50">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-muted-foreground mb-1">Overall Score</p>
                    <p className={cn("text-4xl font-bold", getScoreColor())}>
                        {score}/100
                    </p>
                </div>
                {recommendation && (
                    <span className={cn("px-4 py-2 rounded-lg text-sm font-semibold", getBadgeStyle())}>
                        {recommendation}
                    </span>
                )}
            </div>
        </Card>
    );
}
