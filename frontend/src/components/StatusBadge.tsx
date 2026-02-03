import { cn } from "@/lib/utils";

export type DealStatus = "inbox" | "watchlist" | "diligence" | "term_sheet" | "invested" | "passed" | "lost";

interface StatusBadgeProps {
    status: DealStatus;
    className?: string;
}

const statusConfig: Record<DealStatus, { label: string; className: string; dot: string }> = {
    inbox: {
        label: "Inbox",
        className: "bg-slate-500/20 text-slate-400 border-slate-500/30",
        dot: "bg-slate-400"
    },
    watchlist: {
        label: "Watchlist",
        className: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
        dot: "bg-yellow-500"
    },
    diligence: {
        label: "Due Diligence",
        className: "bg-purple-500/20 text-purple-500 border-purple-500/30",
        dot: "bg-purple-500"
    },
    term_sheet: {
        label: "Term Sheet",
        className: "bg-pink-500/20 text-pink-500 border-pink-500/30",
        dot: "bg-pink-500"
    },
    invested: {
        label: "Invested",
        className: "bg-green-500/20 text-green-500 border-green-500/30",
        dot: "bg-green-500"
    },
    passed: {
        label: "Passed",
        className: "bg-red-500/20 text-red-500 border-red-500/30",
        dot: "bg-red-500"
    },
    lost: {
        label: "Lost",
        className: "bg-gray-500/20 text-gray-500 border-gray-500/30",
        dot: "bg-gray-500"
    }
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const config = statusConfig[status];

    return (
        <span className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
            config.className,
            className
        )}>
            <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
            {config.label}
        </span>
    );
}
