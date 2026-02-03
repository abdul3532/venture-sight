import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useDecks, useUploadDeck, useThesis, useTriggerAnalysis, useDeleteDeck } from "@/lib/api";
import {
    Upload, Search, Loader2, Target,
    ChevronUp, ChevronDown, Table2, Columns, Plus, Filter,
    FileText, BarChart3, Presentation, X, Check,
    Trash2, Globe, DollarSign, TrendingUp, ShieldX
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import type { PitchDeck } from "@/lib/types";
import { VerdictBadge, getVerdictFromScore } from "@/components/VerdictBadge";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

type SortField = "startup_name" | "match_score" | "status" | "uploaded_at";
type SortOrder = "asc" | "desc";

interface FileUpload {
    type: "pitch_deck" | "business_plan" | "financials" | "demo";
    file: File | null;
    label: string;
    icon: React.ElementType;
}

const columns = [
    { key: "startup_name", label: "Name", visible: true },
    { key: "score", label: "Score", visible: true },
    { key: "country", label: "Country", visible: true },
    { key: "verdict", label: "Verdict", visible: true },
    { key: "model", label: "Model", visible: true },
    { key: "series", label: "Series/Round", visible: true },
    { key: "industry", label: "Industry", visible: true },
    { key: "team_size", label: "Team", visible: true },
    { key: "email", label: "Email", visible: true },
    { key: "tam", label: "TAM", visible: true },
    { key: "actions", label: "", visible: true },
];

// Smart TAM formatting
const formatTAM = (value: number | string | undefined) => {
    if (!value) return "—";
    const num = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.]/g, '')) : value;
    if (isNaN(num) || num === 0) return "—";
    if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(1)}B`;
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(0)}M`;
    if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
    return `$${num}`;
};

const fileTypes: FileUpload[] = [
    { type: "pitch_deck", file: null, label: "Pitch Deck", icon: Presentation },
    { type: "business_plan", file: null, label: "Business Plan", icon: FileText },
    { type: "financials", file: null, label: "Financials", icon: BarChart3 },
    { type: "demo", file: null, label: "Demo / Video", icon: FileText },
];

export default function DealFlow() {
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortField, setSortField] = useState<SortField>("uploaded_at");
    const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
    const [visibleColumns, setVisibleColumns] = useState<string[]>(columns.map(c => c.key));
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [thesisDialogOpen, setThesisDialogOpen] = useState(false); // Thesis Dialog State
    const [uploadFiles, setUploadFiles] = useState<FileUpload[]>([...fileTypes]);
    const [activeFileType, setActiveFileType] = useState<string | null>(null);
    const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});

    const { data: thesis } = useThesis();
    const { data: decks = [], isLoading } = useDecks();
    const uploadDeck = useUploadDeck();
    const deleteDeck = useDeleteDeck(); // Use Hard Delete Hook
    const triggerAnalysis = useTriggerAnalysis();

    // Filter decks
    const filteredDecks = decks.filter(deck => {
        const query = searchQuery.toLowerCase();

        // 1. Global Search
        const matchesSearch = (
            deck.startup_name?.toLowerCase().includes(query) ||
            deck.filename.toLowerCase().includes(query) ||
            (deck as any).industry?.toLowerCase().includes(query) ||
            (deck as any).tagline?.toLowerCase().includes(query)
        );
        if (!matchesSearch) return false;

        // 2. Column Filters
        for (const [key, selectedValues] of Object.entries(columnFilters)) {
            if (!selectedValues || selectedValues.length === 0) continue;

            const value = (deck as any)[key] || (deck as any).crm_data?.[key] || "N/A";
            const normalizedValue = String(value || "N/A");
            if (!selectedValues.includes(normalizedValue)) {
                return false;
            }
        }

        return true;
    });

    // Sort decks
    const sortedDecks = [...filteredDecks].sort((a, b) => {
        let comparison = 0;
        switch (sortField) {
            case "startup_name":
                comparison = (a.startup_name || a.filename || "").localeCompare(b.startup_name || b.filename || "");
                break;
            case "match_score":
                const scoreA = a.match_score ?? -1;
                const scoreB = b.match_score ?? -1;
                comparison = scoreA - scoreB;
                break;
            case "status":
                comparison = (a.status || "").localeCompare(b.status || "");
                break;
            case "uploaded_at":
                comparison = new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime();
                break;
        }
        return sortOrder === "asc" ? comparison : -comparison;
    });

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(order => order === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortOrder("desc");
        }
    };

    const toggleColumnFilter = (columnKey: string, value: string) => {
        setColumnFilters(prev => {
            const current = prev[columnKey] || [];
            const updated = current.includes(value)
                ? current.filter(v => v !== value)
                : [...current, value];

            return {
                ...prev,
                [columnKey]: updated
            };
        });
    };

    const getUniqueValues = (columnKey: string) => {
        const values = new Set<string>();
        decks.forEach(deck => {
            const val = (deck as any)[columnKey] || (deck as any).crm_data?.[columnKey] || "N/A";
            values.add(String(val || "N/A"));
        });
        return Array.from(values).sort();
    };

    const handleFileSelect = (type: string) => {
        setActiveFileType(type);
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeFileType) return;
        setUploadFiles(prev => prev.map(f =>
            f.type === activeFileType ? { ...f, file } : f
        ));
        setActiveFileType(null);
        e.target.value = "";
    };

    const handleRemoveFile = (type: string) => {
        setUploadFiles(prev => prev.map(f =>
            f.type === type ? { ...f, file: null } : f
        ));
    };

    const handleUploadAndAnalyze = async () => {
        const pitchDeckFile = uploadFiles.find(f => f.type === "pitch_deck")?.file;
        if (!pitchDeckFile) return;

        try {
            const deck = await uploadDeck.mutateAsync(pitchDeckFile);
            if (deck?.id) {
                await triggerAnalysis.mutateAsync(deck.id);
            }
            setUploadFiles([...fileTypes]);
            setUploadModalOpen(false);
            if (deck?.id) {
                navigate(`/deck/${deck.id}`);
            }
        } catch (error) {
            console.error("Upload failed:", error);
        }
    };

    const handleDeckClick = (deck: PitchDeck) => {
        navigate(`/deck/${deck.id}`);
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return null;
        return sortOrder === "asc"
            ? <ChevronUp className="w-3 h-3 ml-1" />
            : <ChevronDown className="w-3 h-3 ml-1" />;
    };

    const hasPitchDeck = uploadFiles.find(f => f.type === "pitch_deck")?.file !== null;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Stats & Search Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <span className="text-lg font-medium">{decks.length} deals</span>
                    {thesis && (
                        <button
                            onClick={() => setThesisDialogOpen(true)}
                            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <Target className="w-4 h-4 text-primary" />
                            <span className="hidden sm:inline">View / Update Investment Thesis</span>
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 w-48 bg-background/50"
                        />
                    </div>

                    {/* Column visibility */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-1.5">
                                <Columns className="w-4 h-4" />
                                Columns
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {columns.map(col => (
                                <DropdownMenuCheckboxItem
                                    key={col.key}
                                    checked={visibleColumns.includes(col.key)}
                                    // Make "actions" column un-toggleable if you wish, or let it work.
                                    onCheckedChange={(checked: boolean) => {
                                        setVisibleColumns(prev =>
                                            checked
                                                ? [...prev, col.key]
                                                : prev.filter(k => k !== col.key)
                                        );
                                    }}
                                >
                                    {col.label || "Actions"}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>


                    <Button onClick={() => setUploadModalOpen(true)} className="gap-2">
                        <Plus className="w-4 h-4" />
                        Add Deal
                    </Button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.pptx,.ppt,.doc,.docx,.mp4,.mov"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                </div>
            </div>

            {/* Data Table */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : sortedDecks.length === 0 ? (
                <Card className="p-12 text-center border-dashed">
                    <Table2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No pitch decks yet</h3>
                    <p className="text-muted-foreground mb-4">
                        Upload your first pitch deck to get started
                    </p>
                    <Button onClick={() => setUploadModalOpen(true)} className="gap-2">
                        <Upload className="w-4 h-4" />
                        Upload Deck
                    </Button>
                </Card>
            ) : (
                <div className="border border-border rounded-lg overflow-x-auto bg-card">
                    <table className="w-full">
                        <thead className="bg-muted/30 border-b border-border">
                            <tr>
                                {visibleColumns.includes("startup_name") && (
                                    <th onClick={() => handleSort("startup_name")} className="text-left px-4 py-3 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground">
                                        <div className="flex items-center">Name <SortIcon field="startup_name" /></div>
                                    </th>
                                )}
                                {visibleColumns.includes("score") && (
                                    <th onClick={() => handleSort("match_score")} className="text-left px-4 py-3 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground">
                                        <div className="flex items-center">Score <SortIcon field="match_score" /></div>
                                    </th>
                                )}
                                {["country", "verdict", "model", "series", "industry"].map(key => (
                                    visibleColumns.includes(key) && (
                                        <th key={key} className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <span>{columns.find(c => c.key === key)?.label}</span>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button className={cn(
                                                            "p-0.5 rounded-sm hover:bg-muted transition-colors",
                                                            (columnFilters[key]?.length || 0) > 0 ? "text-primary" : "text-muted-foreground/50"
                                                        )}>
                                                            <Filter className="w-3 h-3" />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="start" className="w-48">
                                                        <div className="max-h-[300px] overflow-y-auto p-1">
                                                            {getUniqueValues(key).map(val => (
                                                                <DropdownMenuCheckboxItem
                                                                    key={val}
                                                                    checked={columnFilters[key]?.includes(val)}
                                                                    onCheckedChange={() => toggleColumnFilter(key, val)}
                                                                >
                                                                    {val}
                                                                </DropdownMenuCheckboxItem>
                                                            ))}
                                                        </div>
                                                        {columnFilters[key]?.length > 0 && (
                                                            <div className="border-t p-1">
                                                                <button
                                                                    onClick={() => setColumnFilters(prev => ({ ...prev, [key]: [] }))}
                                                                    className="w-full text-left px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                                                                >
                                                                    Clear Filter
                                                                </button>
                                                            </div>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </th>
                                    )
                                ))}
                                {visibleColumns.includes("team_size") && <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Team</th>}
                                {visibleColumns.includes("email") && <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Email</th>}
                                {visibleColumns.includes("tam") && <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">TAM</th>}
                                {visibleColumns.includes("actions") && <th className="w-10 px-2 py-3" />}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {sortedDecks.map(deck => (
                                <tr key={deck.id} onClick={() => handleDeckClick(deck)} className="hover:bg-muted/20 cursor-pointer transition-colors">
                                    {visibleColumns.includes("startup_name") && (
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                                    <span className="text-xs font-bold text-primary">{(deck.startup_name || deck.filename).charAt(0).toUpperCase()}</span>
                                                </div>
                                                <div className="flex flex-col py-1">
                                                    <p className="font-semibold text-foreground leading-tight text-sm sm:text-base">{deck.startup_name || deck.filename}</p>
                                                    <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-2 font-normal opacity-90 max-w-[300px] mt-0.5 italic">
                                                        {deck.tagline || "Innovating in the venture space"}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                    )}
                                    {visibleColumns.includes("score") && (
                                        <td className="px-4 py-3">
                                            <span className={cn(
                                                "font-semibold",
                                                (deck.match_score || 0) >= 80 ? "text-green-500" :
                                                    (deck.match_score || 0) >= 60 ? "text-blue-500" : // Blue for promising
                                                        (deck.match_score || 0) >= 45 ? "text-yellow-500" :
                                                            "text-orange-500" // Orange/Red for pass
                                            )}>
                                                {deck.match_score ? `${(deck.match_score).toFixed(0)}/100` : "—"}
                                            </span>
                                        </td>
                                    )}
                                    {visibleColumns.includes("country") && (
                                        <td className="px-4 py-3 text-sm text-muted-foreground">
                                            {deck.country || (deck as any).crm_data?.country || "N/A"}
                                        </td>
                                    )}
                                    {visibleColumns.includes("verdict") && (
                                        <td className="px-4 py-3">
                                            {deck.match_score ? (
                                                <VerdictBadge verdict={(deck as any).crm_data?.recommendation || getVerdictFromScore(deck.match_score)} />
                                            ) : (
                                                <Badge variant="secondary" className="text-xs">Pending</Badge>
                                            )}
                                        </td>
                                    )}
                                    {visibleColumns.includes("model") && (
                                        <td className="px-4 py-3 text-sm text-muted-foreground">
                                            {deck.model || (deck as any).crm_data?.business_model || "—"}
                                        </td>
                                    )}
                                    {visibleColumns.includes("series") && (
                                        <td className="px-4 py-3 text-sm text-muted-foreground">
                                            {deck.series || (deck as any).crm_data?.stage || "—"}
                                        </td>
                                    )}
                                    {visibleColumns.includes("industry") && (
                                        <td className="px-4 py-3 text-sm text-muted-foreground">
                                            {deck.industry || (deck as any).crm_data?.industry || "—"}
                                        </td>
                                    )}
                                    {visibleColumns.includes("team_size") && <td className="px-4 py-3 text-sm text-muted-foreground">{deck.team_size || (deck as any).crm_data?.team_size || "—"}</td>}
                                    {visibleColumns.includes("email") && <td className="px-4 py-3 text-sm text-muted-foreground">{deck.email || (deck as any).crm_data?.email || "N/A"}</td>}
                                    {visibleColumns.includes("tam") && <td className="px-4 py-3 text-sm text-muted-foreground">{formatTAM(deck.tam || (deck as any).crm_data?.tam)}</td>}
                                    {visibleColumns.includes("actions") && (
                                        <td className="px-2 py-3 text-right">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm(`Permanently delete ${deck.startup_name || deck.filename}? This will remove all associated analysis.`)) {
                                                        deleteDeck.mutate(deck.id);
                                                    }
                                                }}
                                                className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                                title="Delete startup"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Add New Deal</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                        <p className="text-sm text-muted-foreground">Upload files for analysis.</p>
                        <div className="grid grid-cols-2 gap-3">
                            {uploadFiles.map(fileUpload => (
                                <div key={fileUpload.type}
                                    className={cn("border rounded-lg p-4 cursor-pointer transition-all", fileUpload.file ? "border-primary bg-primary/5" : "border-dashed border-border hover:border-primary/50", fileUpload.type === "pitch_deck" && !fileUpload.file && "border-primary/30")}
                                    onClick={() => !fileUpload.file && handleFileSelect(fileUpload.type)}>
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                            <fileUpload.icon className={cn("w-5 h-5", fileUpload.file ? "text-primary" : "text-muted-foreground")} />
                                            <div>
                                                <p className="text-sm font-medium">{fileUpload.label}</p>
                                                {fileUpload.type === "pitch_deck" && <p className="text-xs text-primary">Required</p>}
                                            </div>
                                        </div>
                                        {fileUpload.file && <button onClick={(e) => { e.stopPropagation(); handleRemoveFile(fileUpload.type); }} className="p-1 hover:bg-muted rounded"><X className="w-3 h-3" /></button>}
                                    </div>
                                    {fileUpload.file ? <div className="mt-2 flex items-center gap-1 text-xs text-primary"><Check className="w-3 h-3" />{fileUpload.file.name.slice(0, 20)}...</div> : <p className="mt-2 text-xs text-muted-foreground">Click to upload</p>}
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                            <Button variant="outline" onClick={() => setUploadModalOpen(false)}>Cancel</Button>
                            <Button onClick={handleUploadAndAnalyze} disabled={!hasPitchDeck || uploadDeck.isPending || triggerAnalysis.isPending} className="gap-2">
                                {(uploadDeck.isPending || triggerAnalysis.isPending) ? <><Loader2 className="w-4 h-4 animate-spin" />Analyzing...</> : <><Upload className="w-4 h-4" />Upload & Analyze</>}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Thesis Preview Dialog */}
            {thesis && (
                <Dialog open={thesisDialogOpen} onOpenChange={setThesisDialogOpen}>
                    <DialogContent className="sm:max-w-xl">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Target className="w-5 h-5 text-primary" />
                                Investment Thesis
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-6 mt-2">
                            {thesis.thesis_text && (
                                <div className="bg-muted/30 p-3 rounded-md">
                                    <p className="text-sm italic">{thesis.thesis_text}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Target Sectors</h4>
                                    <div className="flex flex-wrap gap-1.5">
                                        {thesis.target_sectors?.length > 0 ? thesis.target_sectors.map((s: string) => (
                                            <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                                        )) : <span className="text-sm text-muted-foreground">—</span>}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Geography</h4>
                                    <div className="flex items-center gap-1.5 text-sm">
                                        <Globe className="w-3.5 h-3.5" />
                                        {thesis.geography || "Global"}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Check Size</h4>
                                    <div className="flex items-center gap-1.5 text-sm">
                                        <DollarSign className="w-3.5 h-3.5" />
                                        <span>${(thesis.check_size_min || 0).toLocaleString()} – ${(thesis.check_size_max || 0).toLocaleString()}</span>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Preferred Stage</h4>
                                    <div className="flex items-center gap-1.5 text-sm">
                                        <TrendingUp className="w-3.5 h-3.5" />
                                        <span>{thesis.preferred_stage || "Any"}</span>
                                    </div>
                                </div>
                            </div>

                            {thesis.anti_thesis?.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide flex items-center gap-1 text-red-500">
                                        <ShieldX className="w-3 h-3" /> Avoid / Anti-Thesis
                                    </h4>
                                    <div className="flex flex-wrap gap-1.5">
                                        {thesis.anti_thesis.map((s: string) => (
                                            <Badge key={s} variant="outline" className="text-xs text-red-500 border-red-500/30 bg-red-500/5">{s}</Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end pt-4 border-t">
                                <Button onClick={() => navigate("/onboarding")} className="gap-2">
                                    Update Thesis Settings
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
