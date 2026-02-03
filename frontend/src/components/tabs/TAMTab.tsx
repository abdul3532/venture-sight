import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface TAMTabProps {
    tamData?: {
        tam?: number;
        sam?: number;
        som?: number;
        analysis?: string;
        market_metrics?: {
            market_cagr: string;
            entry_barrier: string;
            competition_level: string;
            growth_stage: string;
        };
    };
}

export function TAMTab({ tamData }: TAMTabProps) {
    const tam = tamData?.tam || 0;
    const sam = tamData?.sam || 0;
    const som = tamData?.som || 0;
    const analysis = tamData?.analysis;

    if (!tamData || (!tam && !analysis)) {
        return (
            <div className="flex items-center justify-center p-12 text-muted-foreground bg-muted/20 rounded-lg mt-6 border border-dashed">
                Market analysis will appear here once the AI Council completes its deliberation.
            </div>
        );
    }

    const formatCurrency = (value: number) => {
        if (value >= 1000000000) {
            return `$${(value / 1000000000).toFixed(1)}B`;
        }
        if (value >= 1000000) {
            return `$${(value / 1000000).toFixed(0)}M`;
        }
        return `$${value.toLocaleString()}`;
    };

    // Calculate percentages for the slider visualization
    const tamWidth = 100;
    const samWidth = tam > 0 ? (sam / tam) * 100 : 0;
    const somWidth = tam > 0 ? (som / tam) * 100 : 0;

    return (
        <div className="grid lg:grid-cols-2 gap-6 mt-6">
            {/* Left: Market Size Visualization */}
            <Card className="p-6 border-border/50">
                <h3 className="font-semibold mb-6">Market Size</h3>

                {/* TAM/SAM/SOM Visualization */}
                <div className="space-y-6">
                    {/* TAM */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">TAM (Total Addressable Market)</span>
                            <span className="text-sm font-bold text-primary">{formatCurrency(tam)}</span>
                        </div>
                        <div className="h-4 bg-primary/20 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary/40 rounded-full transition-all duration-500"
                                style={{ width: `${tamWidth}%` }}
                            />
                        </div>
                    </div>

                    {/* SAM */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">SAM (Serviceable Addressable Market)</span>
                            <span className="text-sm font-bold text-blue-500">{formatCurrency(sam)}</span>
                        </div>
                        <div className="h-4 bg-blue-500/20 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                style={{ width: `${samWidth}%` }}
                            />
                        </div>
                    </div>

                    {/* SOM */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">SOM (Serviceable Obtainable Market)</span>
                            <span className="text-sm font-bold text-green-500">{formatCurrency(som)}</span>
                        </div>
                        <div className="h-4 bg-green-500/20 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-green-500 rounded-full transition-all duration-500"
                                style={{ width: `${somWidth}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Legend */}
                <div className="mt-6 pt-4 border-t border-border/50">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <div className="w-3 h-3 rounded-full bg-primary/40 mx-auto mb-1" />
                            <span className="text-xs text-muted-foreground">TAM</span>
                        </div>
                        <div>
                            <div className="w-3 h-3 rounded-full bg-blue-500 mx-auto mb-1" />
                            <span className="text-xs text-muted-foreground">SAM</span>
                        </div>
                        <div>
                            <div className="w-3 h-3 rounded-full bg-green-500 mx-auto mb-1" />
                            <span className="text-xs text-muted-foreground">SOM</span>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Right: Analysis */}
            <Card className="p-6 border-border/50">
                <h3 className="font-semibold mb-4">Market Analysis</h3>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="text-muted-foreground">{analysis}</p>
                </div>

                {/* Market Metrics */}
                <div className="mt-6 pt-4 border-t border-border/50">
                    <h4 className="text-sm font-medium mb-4">Key Metrics</h4>
                    {tamData?.market_metrics ? (
                        <div className="grid grid-cols-2 gap-4">
                            <MetricCard
                                label="Market CAGR"
                                value={tamData.market_metrics.market_cagr}
                                trend="up"
                            />
                            <MetricCard
                                label="Entry Barrier"
                                value={tamData.market_metrics.entry_barrier}
                                trend="neutral"
                            />
                            <MetricCard
                                label="Competition Level"
                                value={tamData.market_metrics.competition_level}
                                trend="down"
                            />
                            <MetricCard
                                label="Growth Stage"
                                value={tamData.market_metrics.growth_stage}
                                trend="up"
                            />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            {/* Fallback if no metrics yet */}
                            <MetricCard label="Market CAGR" value="Loading..." trend="neutral" />
                            <MetricCard label="Entry Barrier" value="Loading..." trend="neutral" />
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}

function MetricCard({ label, value, trend }: { label: string; value: string; trend: "up" | "down" | "neutral" }) {
    return (
        <div className="p-3 rounded-lg bg-muted/30">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className={cn(
                "font-semibold",
                trend === "up" && "text-green-500",
                trend === "down" && "text-red-500",
                trend === "neutral" && "text-foreground"
            )}>
                {value}
            </p>
        </div>
    );
}
