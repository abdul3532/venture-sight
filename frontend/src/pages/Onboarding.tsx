import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { useThesis, useUpdateThesis } from "@/lib/api";
import { Sparkles, Target, Globe, DollarSign, TrendingUp, X, ChevronRight } from "lucide-react";

const SECTORS = [
    "SaaS", "Fintech", "Healthtech", "Edtech", "E-commerce",
    "AI/ML", "Cybersecurity", "Climate Tech", "Web3/Crypto",
    "Logistics", "PropTech", "FoodTech", "Gaming", "Developer Tools"
];

const STAGES = ["Pre-Seed", "Seed", "Series A", "Series B", "Growth"];

const GEOGRAPHIES = [
    "Global", "North America", "Europe", "LATAM", "Asia Pacific",
    "MENA", "Africa", "UK & Ireland", "DACH", "Nordic", "Iberia"
];

export default function Onboarding() {
    const navigate = useNavigate();
    const { data: existingThesis, isLoading } = useThesis();
    const updateThesis = useUpdateThesis();

    // Form state
    const [thesisText, setThesisText] = useState(existingThesis?.thesis_text || "");
    const [selectedSectors, setSelectedSectors] = useState<string[]>(existingThesis?.target_sectors || []);
    const [geography, setGeography] = useState(existingThesis?.geography || "Global");
    const [checkSizeMin, setCheckSizeMin] = useState(existingThesis?.check_size_min?.toString() || "100000");
    const [checkSizeMax, setCheckSizeMax] = useState(existingThesis?.check_size_max?.toString() || "500000");
    const [preferredStage, setPreferredStage] = useState(existingThesis?.preferred_stage || "Seed");
    const [antiThesis, setAntiThesis] = useState<string[]>(existingThesis?.anti_thesis || []);

    const [step, setStep] = useState(1);

    const handleSectorToggle = (sector: string) => {
        setSelectedSectors(prev =>
            prev.includes(sector)
                ? prev.filter(s => s !== sector)
                : [...prev, sector]
        );
    };

    const handleAntiThesisToggle = (sector: string) => {
        setAntiThesis(prev =>
            prev.includes(sector)
                ? prev.filter(s => s !== sector)
                : [...prev, sector]
        );
    };

    const handleSubmit = async () => {
        await updateThesis.mutateAsync({
            thesis_text: thesisText,
            target_sectors: selectedSectors,
            geography,
            check_size_min: parseInt(checkSizeMin) || 100000,
            check_size_max: parseInt(checkSizeMax) || 500000,
            preferred_stage: preferredStage,
            anti_thesis: antiThesis
        });
        navigate("/dealflow");
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto py-8 animate-fade-in">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Target className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-3xl font-bold mb-2">Define Your Investment Thesis</h1>
                <p className="text-muted-foreground">
                    Configure your fund's criteria to personalize AI Council evaluations
                </p>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-center gap-2 mb-8">
                {[1, 2, 3].map((s) => (
                    <div
                        key={s}
                        className={`w-3 h-3 rounded-full transition-colors ${s === step ? 'bg-primary' : s < step ? 'bg-primary/50' : 'bg-muted'
                            }`}
                    />
                ))}
            </div>

            <Card className="glass-card p-6 border-border/50">
                {step === 1 && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-primary" />
                                Investment Focus
                            </Label>
                            <Input
                                placeholder="e.g., B2B SaaS companies solving enterprise productivity challenges"
                                value={thesisText}
                                onChange={(e) => setThesisText(e.target.value)}
                                className="bg-background/50"
                            />
                            <p className="text-xs text-muted-foreground">
                                Describe your fund's investment thesis in one sentence
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label>Target Sectors</Label>
                            <div className="flex flex-wrap gap-2">
                                {SECTORS.map((sector) => (
                                    <Badge
                                        key={sector}
                                        variant={selectedSectors.includes(sector) ? "default" : "outline"}
                                        className={`cursor-pointer transition-colors ${selectedSectors.includes(sector)
                                                ? "bg-primary hover:bg-primary/80"
                                                : "hover:bg-accent"
                                            }`}
                                        onClick={() => handleSectorToggle(sector)}
                                    >
                                        {sector}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        <Button
                            onClick={() => setStep(2)}
                            className="w-full"
                            disabled={!thesisText || selectedSectors.length === 0}
                        >
                            Continue <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-primary" />
                                    Geography
                                </Label>
                                <Select value={geography} onValueChange={setGeography}>
                                    <SelectTrigger className="bg-background/50">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {GEOGRAPHIES.map((geo) => (
                                            <SelectItem key={geo} value={geo}>{geo}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-primary" />
                                    Preferred Stage
                                </Label>
                                <Select value={preferredStage} onValueChange={setPreferredStage}>
                                    <SelectTrigger className="bg-background/50">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {STAGES.map((stage) => (
                                            <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-primary" />
                                Check Size Range (USD)
                            </Label>
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    type="number"
                                    placeholder="Min"
                                    value={checkSizeMin}
                                    onChange={(e) => setCheckSizeMin(e.target.value)}
                                    className="bg-background/50"
                                />
                                <Input
                                    type="number"
                                    placeholder="Max"
                                    value={checkSizeMax}
                                    onChange={(e) => setCheckSizeMax(e.target.value)}
                                    className="bg-background/50"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                                Back
                            </Button>
                            <Button onClick={() => setStep(3)} className="flex-1">
                                Continue <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <X className="w-4 h-4 text-destructive" />
                                Anti-Thesis (Sectors to Avoid)
                            </Label>
                            <p className="text-xs text-muted-foreground mb-2">
                                Select sectors your fund explicitly does NOT invest in
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {SECTORS.filter(s => !selectedSectors.includes(s)).map((sector) => (
                                    <Badge
                                        key={sector}
                                        variant={antiThesis.includes(sector) ? "destructive" : "outline"}
                                        className="cursor-pointer transition-colors"
                                        onClick={() => handleAntiThesisToggle(sector)}
                                    >
                                        {sector}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        {/* Summary Card */}
                        <Card className="bg-accent/20 p-4 border-border/50">
                            <h3 className="font-semibold mb-2">Thesis Summary</h3>
                            <p className="text-sm text-muted-foreground mb-2">{thesisText}</p>
                            <div className="flex flex-wrap gap-1">
                                {selectedSectors.map(s => (
                                    <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                                ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                {geography} • {preferredStage} • ${parseInt(checkSizeMin).toLocaleString()} - ${parseInt(checkSizeMax).toLocaleString()}
                            </p>
                        </Card>

                        <div className="flex gap-3">
                            <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                                Back
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                className="flex-1"
                                disabled={updateThesis.isPending}
                            >
                                {updateThesis.isPending ? "Saving..." : "Save & Continue"}
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
