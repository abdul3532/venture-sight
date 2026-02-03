import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface Competitor {
    name: string;
    website?: string;
    similarity: number;
    funding?: string;
    differentiation_factor?: string;
    description?: string;
}

interface CompetitorsTabProps {
    competitors?: Competitor[];
}

export function CompetitorsTab({ competitors }: CompetitorsTabProps) {
    if (!competitors || competitors.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground bg-muted/20 rounded-lg mt-6 border border-dashed text-center">
                <Users className="w-12 h-12 mb-4 opacity-20" />
                <p>Competitive analysis will appear here once the AI Council completes its deliberation.</p>
            </div>
        );
    }

    const getSimilarityColor = (score: number) => {
        if (score >= 80) return "text-red-500 bg-red-500/10";
        if (score >= 60) return "text-orange-500 bg-orange-500/10";
        if (score >= 40) return "text-yellow-500 bg-yellow-500/10";
        return "text-green-500 bg-green-500/10";
    };

    return (
        <div className="mt-6">
            <Card className="border-border/50 overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-border/50 bg-muted/30">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold">Similar Companies</h3>
                            <p className="text-sm text-muted-foreground">
                                Companies with overlapping market or product focus
                            </p>
                        </div>
                        <Badge variant="secondary">{competitors.length} found</Badge>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-muted/20 border-b border-border/50">
                            <tr>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Company</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Similarity</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Funding</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Differentiation</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Description</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {competitors.map((competitor, index) => (
                                <tr key={index} className="hover:bg-muted/20 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                                                <span className="text-xs font-bold">
                                                    {competitor.name.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="font-medium">{competitor.name}</p>
                                                {competitor.website && (
                                                    <a
                                                        href={`https://${competitor.website}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs text-primary hover:underline flex items-center gap-1"
                                                    >
                                                        {competitor.website}
                                                        <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={cn(
                                            "inline-flex px-2 py-1 rounded-full text-xs font-medium",
                                            getSimilarityColor(competitor.similarity)
                                        )}>
                                            {competitor.similarity}%
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        {competitor.funding || "—"}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-xs">
                                        {competitor.differentiation_factor || "—"}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-xs truncate">
                                        {competitor.description || "—"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border/50 bg-muted/20 text-center">
                    <p className="text-xs text-muted-foreground">
                        Similarity scores based on market overlap, product features, and target customers
                    </p>
                </div>
            </Card>
        </div>
    );
}
