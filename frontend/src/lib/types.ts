// VentureSight AI Types

// ============ Thesis Types ============
export interface VCThesis {
    id: string;
    user_id: string;
    thesis_text: string;
    target_sectors: string[];
    geography: string;
    check_size_min: number;
    check_size_max: number;
    preferred_stage: string;
    anti_thesis: string[];
    created_at?: string;
    updated_at?: string;
}

export interface ThesisCreate {
    thesis_text: string;
    target_sectors: string[];
    geography: string;
    check_size_min: number;
    check_size_max: number;
    preferred_stage: string;
    anti_thesis: string[];
}

// ============ Pitch Deck Types ============
export interface PitchDeck {
    id: string;
    filename: string;
    startup_name: string | null;
    match_score: number;
    status: "pending" | "analyzing" | "analyzed" | "archived";
    uploaded_at: string;
    country?: string;
    industry?: string;
    model?: string;
    series?: string;
    email?: string;
    tam?: number;
    sam?: number;
    som?: number;
    team_size?: number;
    tagline?: string;
}

export interface PitchDeckDetail extends PitchDeck {
    raw_text: string;
    notes?: string;
}

// ============ Council Analysis Types ============
export interface AgentAnalysis {
    [key: string]: any;
}

export interface ScoreItem {
    score: number;
    reason: string;
}

export interface ConsensusResult {
    consensus_summary: string;
    startup_name?: string;
    tagline?: string;
    key_strengths?: string[];
    key_weaknesses?: string[];
    key_concerns?: string[];
    strengths?: string[];
    weaknesses?: string[];
    recommendation?: string;
    investment_memo?: string | {
        defensibility?: string[];
        team?: string[];
        traction?: string[];
        technology?: string[];
        timing?: string[];
    };
    match_score?: number;
    final_score?: number;
    scores?: {
        feasibility?: ScoreItem;
        originality?: ScoreItem;
        valuation?: ScoreItem;
        vc_scope_fit?: ScoreItem;
    };
    category_scores?: {
        category: string;
        score: number;
        reason: string;
    }[];
    crm_data?: {
        country?: string;
        industry?: string;
        stage?: string;
        business_model?: string;
        email?: string;
        team_size?: string;
        tam?: number | string;
        sam?: number | string;
        som?: number | string;
        // New Research Fields
        tam_analysis?: {
            tam_value: number;
            sam_value: number;
            som_value: number;
            market_metrics: {
                market_cagr: string;
                entry_barrier: string;
                competition_level: string;
                growth_stage: string;
            };
            market_analysis: string;
            deck_comparison: string;
        };
        competitors_analysis?: {
            name: string;
            website: string;
            similarity: number;
            funding: string;
            team_size: string;
            description: string;
        }[];
        [key: string]: any;
    };
}


export interface CouncilAnalysis {
    deck_id: string;
    status: string;
    optimist?: AgentAnalysis;
    skeptic?: AgentAnalysis;
    quant?: AgentAnalysis;
    consensus?: ConsensusResult;
}

// ============ Chat / Associate Types ============
export interface Conversation {
    id: string;
    title: string;
    deck_id?: string;
    updated_at: string;
}

export interface ChatMessage {
    role: "user" | "assistant" | "system";
    content: string;
}

export interface ChatRequest {
    query: string;
    conversation_id?: string;
    deck_id?: string;
    deck_ids?: string[];
    document_context?: string;
    // Legacy fields for backward compatibility
    portfolio?: string[];
    news_context?: NewsItem[];
}

// ============ Legacy Types (for migration) ============
export interface CompanyProfile {
    name: string;
    sector?: string;
    industry?: string;
    summary?: string;
    currency?: string;
    website?: string;
}

export interface Portfolio {
    tickers: string[];
    profiles?: Record<string, CompanyProfile>;
}

export interface NewsItem {
    id: string;
    headline: string;
    summary: string;
    sentiment_score: number;
    category: string;
    affected_tickers: string[];
    impact: "positive" | "neutral" | "negative";
    impact_reason: string;
    risk_level: "low" | "medium" | "high";
    link: string;
    published?: string;
    source?: string;
    related_sources?: string[];
}

export interface DocumentUploadResponse {
    filename: string;
    text: string;
    message: string;
}
