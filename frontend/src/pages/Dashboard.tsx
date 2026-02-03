import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDecks, useThesis } from "@/lib/api";
import {
    FileStack, CheckCircle, Clock,
    BarChart3, Target, ArrowUpRight, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

export default function Dashboard() {
    const { data: decks = [], isLoading: decksLoading } = useDecks();
    const { data: thesis } = useThesis();

    // Calculate stats
    const totalDeals = decks.length;
    const analyzedDeals = decks.filter(d => d.status === "analyzed").length;
    const pendingDeals = decks.filter(d => d.status === "pending" || d.status === "analyzing").length;

    // Calculate score distribution
    const highScoreDeals = decks.filter(d => (d.match_score || 0) >= 75).length;
    const mediumScoreDeals = decks.filter(d => (d.match_score || 0) >= 50 && (d.match_score || 0) < 75).length;
    const lowScoreDeals = decks.filter(d => (d.match_score || 0) > 0 && (d.match_score || 0) < 50).length;

    // Recent activity
    const recentDeals = [...decks]
        .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())
        .slice(0, 5);

    // Average match score
    const avgScore = decks.length > 0
        ? Math.round(decks.reduce((sum, d) => sum + (d.match_score || 0), 0) / decks.length)
        : 0;

    if (decksLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Stats Cards */}
            <div className="grid md:grid-cols-4 gap-4">
                <StatCard
                    title="Total Deals"
                    value={totalDeals}
                    icon={FileStack}
                    trend={totalDeals > 0 ? `${totalDeals} in pipeline` : "No deals yet"}
                    color="primary"
                />
                <StatCard
                    title="Analyzed"
                    value={analyzedDeals}
                    icon={CheckCircle}
                    trend={`${Math.round((analyzedDeals / Math.max(totalDeals, 1)) * 100)}% complete`}
                    color="green"
                />
                <StatCard
                    title="Pending"
                    value={pendingDeals}
                    icon={Clock}
                    trend="Awaiting analysis"
                    color="yellow"
                />
                <StatCard
                    title="Avg. Score"
                    value={`${avgScore}%`}
                    icon={Target}
                    trend="Match rate"
                    color="blue"
                />
            </div>

            {/* Main Content */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Score Distribution */}
                <Card className="lg:col-span-2 p-6 border-border/50">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-semibold flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-primary" />
                            Match Score Distribution
                        </h3>
                    </div>

                    <div className="space-y-4">
                        <ScoreBar label="Strong Match (75%+)" count={highScoreDeals} total={Math.max(totalDeals, 1)} color="bg-green-500" />
                        <ScoreBar label="Partial Match (50-74%)" count={mediumScoreDeals} total={Math.max(totalDeals, 1)} color="bg-yellow-500" />
                        <ScoreBar label="Low Match (<50%)" count={lowScoreDeals} total={Math.max(totalDeals, 1)} color="bg-red-500" />
                    </div>

                    {/* Quick Stats */}
                    <div className="mt-6 pt-6 border-t border-border/50 grid grid-cols-3 gap-4">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-green-500">{highScoreDeals}</p>
                            <p className="text-xs text-muted-foreground">Strong Matches</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-yellow-500">{mediumScoreDeals}</p>
                            <p className="text-xs text-muted-foreground">Worth Review</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-red-500">{lowScoreDeals}</p>
                            <p className="text-xs text-muted-foreground">Pass</p>
                        </div>
                    </div>
                </Card>

                {/* Recent Activity */}
                <Card className="p-6 border-border/50">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">Recent Activity</h3>
                        <Link to="/dealflow" className="text-xs text-primary hover:underline flex items-center gap-1">
                            View All <ArrowUpRight className="w-3 h-3" />
                        </Link>
                    </div>

                    <div className="space-y-3">
                        {recentDeals.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">
                                No deals uploaded yet
                            </p>
                        ) : (
                            recentDeals.map(deck => (
                                <Link
                                    key={deck.id}
                                    to={`/deck/${deck.id}`}
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <span className="text-xs font-bold text-primary">
                                            {(deck.startup_name || deck.filename).charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">
                                            {deck.startup_name || deck.filename}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(deck.uploaded_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <Badge variant={deck.status === "analyzed" ? "default" : "secondary"} className="text-xs">
                                        {deck.match_score ? `${Math.round(deck.match_score)}%` : deck.status}
                                    </Badge>
                                </Link>
                            ))
                        )}
                    </div>
                </Card>
            </div>

            {/* Thesis Section */}
            {thesis && (
                <Card className="p-6 border-border/50">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold flex items-center gap-2">
                            <Target className="w-5 h-5 text-primary" />
                            Your Investment Thesis
                        </h3>
                        <Link to="/onboarding" className="text-xs text-primary hover:underline">
                            Edit Thesis Settings
                        </Link>
                    </div>
                    <div className="grid md:grid-cols-5 gap-6 text-sm">
                        <div className="space-y-2">
                            <p className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Preferred Stage</p>
                            <p className="font-medium text-foreground">{thesis.preferred_stage || "—"}</p>
                        </div>
                        <div className="space-y-2 md:col-span-1">
                            <p className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Target Sectors</p>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                                {thesis.target_sectors?.length > 0 ? thesis.target_sectors.map((s: string) => (
                                    <Badge key={s} variant="secondary" className="text-[10px] px-1.5 py-0">{s}</Badge>
                                )) : <span className="text-muted-foreground">—</span>}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <p className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Geography</p>
                            <p className="font-medium text-foreground">{thesis.geography || "Global"}</p>
                        </div>
                        <div className="space-y-2">
                            <p className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Check Size</p>
                            <p className="font-medium text-foreground">
                                ${(thesis.check_size_min?.toLocaleString() || "0")} - ${(thesis.check_size_max?.toLocaleString() || "0")}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <p className="text-red-500 text-xs uppercase tracking-wider font-semibold">Avoid / Anti-Thesis</p>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                                {thesis.anti_thesis?.length > 0 ? thesis.anti_thesis.map((s: string) => (
                                    <Badge key={s} variant="outline" className="text-[10px] px-1.5 py-0 text-red-500 border-red-500/30 bg-red-500/5">{s}</Badge>
                                )) : <span className="text-muted-foreground">—</span>}
                            </div>
                        </div>
                    </div>
                    {thesis.thesis_text && (
                        <div className="mt-6 pt-6 border-t border-border/50">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Strategy Summary</p>
                            <p className="text-sm italic text-muted-foreground leading-relaxed leading-snug">
                                "{thesis.thesis_text.slice(0, 300)}{thesis.thesis_text.length > 300 ? "..." : ""}"
                            </p>
                        </div>
                    )}
                </Card>
            )}
        </div>
    );
}

// Stat Card Component
function StatCard({
    title,
    value,
    icon: Icon,
    trend,
    color
}: {
    title: string;
    value: string | number;
    icon: React.ElementType;
    trend: string;
    color: "primary" | "green" | "yellow" | "blue";
}) {
    const colorClasses = {
        primary: "text-primary bg-primary/10",
        green: "text-green-500 bg-green-500/10",
        yellow: "text-yellow-500 bg-yellow-500/10",
        blue: "text-blue-500 bg-blue-500/10",
    };

    return (
        <Card className="p-5 border-border/50">
            <div className="flex items-start justify-between mb-3">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", colorClasses[color])}>
                    <Icon className="w-5 h-5" />
                </div>
            </div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-xs text-muted-foreground mt-1">{trend}</p>
        </Card>
    );
}

// Score Bar Component
function ScoreBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
    const percentage = (count / total) * 100;

    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <span className="text-sm">{label}</span>
                <span className="text-sm font-medium">{count}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                    className={cn("h-full rounded-full transition-all duration-500", color)}
                    style={{ width: `${Math.max(percentage, 2)}%` }}
                />
            </div>
        </div>
    );
}
