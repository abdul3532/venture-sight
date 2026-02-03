import { cn } from "@/lib/utils";

export type VerdictType = "strong_interest" | "promising" | "consider" | "pass" | "strong_pass";

interface VerdictBadgeProps {
    verdict: string; // Accepts string from backend or calculated VerdictType
    className?: string;
}

const verdictConfig: Record<VerdictType, { label: string; className: string; icon: string }> = {
    strong_interest: {
        label: "Strong Interest",
        className: "bg-emerald-500/20 text-emerald-500 border-emerald-500/30",
        icon: "★"
    },
    promising: {
        label: "Promising",
        className: "bg-blue-500/20 text-blue-500 border-blue-500/30",
        icon: "↑"
    },
    consider: {
        label: "Consider",
        className: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
        icon: "~"
    },
    pass: {
        label: "Pass",
        className: "bg-orange-500/20 text-orange-500 border-orange-500/30",
        icon: "!"
    },
    strong_pass: {
        label: "Strong Pass",
        className: "bg-red-500/20 text-red-500 border-red-500/30",
        icon: "✗"
    }
};

export function getVerdictFromScore(score: number): VerdictType {
    if (score >= 80) return "strong_interest";
    if (score >= 60) return "promising";
    if (score >= 45) return "consider";
    if (score >= 25) return "pass";
    return "strong_pass";
}

export function VerdictBadge({ verdict, className }: VerdictBadgeProps) {
    // Normalize backend strings to config keys
    let type: VerdictType = "pass";
    const v = (verdict || "").toLowerCase();

    // Fix: Check for both backend strings (spaces) and internal keys (underscores)
    if (v.includes("strong interest") || v.includes("strong_interest") || (v.includes("invest") && v.includes("strong"))) type = "strong_interest";
    else if (v.includes("promising") || v.includes("invest")) type = "promising";
    else if (v === "invest") type = "promising";
    else if (v.includes("consider") || v.includes("partial")) type = "consider";
    else if (v.includes("strong pass") || v.includes("strong_pass")) type = "strong_pass";
    else type = "pass";

    // Override by score if the string is generic? No, rely on string if provided.

    const config = verdictConfig[type] || verdictConfig["pass"];

    return (
        <span className={cn(
            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border",
            config.className,
            className
        )}>
            <span>{config.icon}</span>
            {config.label}
        </span>
    );
}

export function ScoreBadge({ score, className }: { score: number; className?: string }) {
    const getColor = (s: number) => {
        if (s >= 80) return "text-emerald-500";
        if (s >= 60) return "text-blue-500";
        if (s >= 45) return "text-yellow-500";
        if (s >= 25) return "text-orange-500";
        return "text-red-500";
    };

    return (
        <span className={cn("font-medium", getColor(score), className)}>
            {score.toFixed(0)}/100
        </span>
    );
}
