# Product Requirements Document (PRD)
## VentureSight AI (Senhor Finanças)

**Version:** 1.0  
**Status:** In Development  
**Last Updated:** February 2, 2026

---

## 1. Executive Summary
VentureSight AI is an **AI-powered Investment Analyst Agent** designed for Venture Capitalists (VCs) and Angel Investors. It automates the initial screening and due diligence of pitch decks, transforming a manual, hour-long review process into a 2-minute insight summary.

Unlike generic chat tools, VentureSight employs a **"Council of Agents"** architecture—simulating a debate between an Optimist, a Skeptic, and a Quant—to provide balanced, thesis-aligned investment memos.

### Core Value Proposition
- **10x Faster Screening:** Instant processing of PDF pitch decks into structured investment memos.
- **Debiased Analysis:** Multi-agent debate balances FOMO (Fear Of Missing Out) with risk assessment.
- **Thesis Alignment:** All analyses are grounded in the user's specific investment criteria (Geography, Stage, Sector).
- **Deep Dive Tools:** Automated TAM validation, Competitor Scanning, and Funding Benchmarking.

---

## 2. Target Audience
- **VC Associates:** Needing to filter hundreds of inbound decks weekly.
- **Angel Investors:** Lacking the time/team for deep technical DD.
- **Fund Managers:** Tracking portfolio companies and deal flow metrics.

---

## 3. Product Architecture & User Flow

### 3.1 The "Council" Analysis Engine
The heart of the platform is the Multi-Agent System (MAS) in `backend/services/council_service.py`. It does not just "summarize" decks; it *debates* them.

- **The Optimist (Visionary):** Looks for "Blue Ocean" potential, founder-market fit, and moat defensibility.
- **The Skeptic (Risk Officer):** Identifies execution risks, competitive threats, and unproven assumptions.
- **The Quant (Analyst):** Validates TAM/SAM/SOM, checks unit economics, and benchmarks funding asks.
- **The Consensus (Synthesizer):** Weighs all three perspectives to generate a final **Match Score (0-100)** and a structured **Investment Memo**.

### 3.2 User Journey
1.  **Onboarding/Thesis Setup:** User defines their investment thesis (e.g., "B2B SaaS in LatAm, Seed Stage").
2.  **Deal Ingestion:** User uploads a PDF pitch deck.
3.  **Automated Analysis:** The "Council" runs in parallel processing.
4.  **Review:** User sees a dashboard with Score, Verdict (Pass/Consider/Interested), and the Debate.
5.  **Deep Dive:** User triggers specific tools (TAM Check, Competitor Analysis) or chats with the "Associate" agent.

---

## 4. Functional Requirements

### 4.1 Deal Flow & CRM (`DealFlow.tsx`)
-   **Dashboard:** Tabular view of all uploaded decks with columns for: Name, Score, Verdict, Stage, Industry, TAM.
-   **Filtering/Sorting:** Search by name/content; Sort by Match Score (Desc) to prioritize best deals.
-   **Status Management:** Kanban-like statuses: Inbox -> Watchlist -> Due Diligence -> Term Sheet -> Invested/Passed.
-   **Manual Upload:** Support for PDF, PPTX (future), DOCX.

### 4.2 Deck Analysis Interface (`DeckAnalysis.tsx`)
-   **Overall Score:** 0-100 aggregated score with color-coding (Green > 75, Red < 25).
-   **Detailed Scoring:** Breakdown of Feasibility, Originality, Valuation, and VC Scope Fit (1-5 scale with reasoning).
-   **Investment Memo:** Auto-generated structured memo (team, traction, tech, timing).
-   **The Debate UI:** Tabbed view to switch between Optimist, Skeptic, and Quant raw outputs.
-   **Thesis Alignment:** Visual checklist comparing finding against user's specific Thesis Config.

### 4.3 AI Chat & Research Tools
#### Global Associate (`assistant_service.py`)
-   **Role:** An omniscient assistant with access to the entire portfolio.
-   **RAG (Retrieval Augmented Generation):** Vector search (`deck_chunks` table) to answer "Has anyone pitched us an AI healthcare startup recently?".
-   **Tools:**
    -   `list_decks`: Listing recent uploads.
    -   `search_decks`: Semantic search across all files.
    -   `get_deal_details`: Fetching structured metadata (Founders, Metrics) for a named startup.

#### Local Sidekick (`SidekickChat.tsx`)
-   **Role:** Context-aware chat per specific deck.
-   **Context:** Injects the full text of the *current* PDF being viewed.
-   **Use Case:** "Where is the headquarters?" or "Explain their revenue model in simple terms."

#### Specialized Tools (`backend/tools/`)
-   **Competitor Scanner:** Uses DuckDuckGo (`search.py`) to find live competitors and recent funding news.
-   **TAM Calculator:** Validates market sizing claims against logic standards.
-   **Investment Readiness:** Auto-grades the deck structure (Problem, Solution, Team, Ask) against YC/Sequoia standards.

---

## 5. Technical Stack

### Frontend
-   **Framework:** React 18 + Vite (TypeScript).
-   **Styling:** TailwindCSS + Shadcn/UI (Radix Primitives).
-   **State:** React Query (TanStack Query) for async data and caching.
-   **Navigation:** React Router DOM.

### Backend
-   **API:** Python FastAPI (Async).
-   **LLM Orchestration:** OpenAI API (`gpt-4o` for Council, `gpt-3.5-turbo` for quick tasks).
-   **Tools:** `duckduckgo-search` for live web access.
-   **PDF Processing:** `pdfplumber` for text extraction.

### Data Layer
-   **Database:** Supabase (PostgreSQL).
-   **Vector Store:** `pgvector` extension on Supabase (`deck_chunks` table).
-   **Storage:** Supabase Storage for raw PDF files.

---

## 6. Data Models

### `pitch_decks`
-   `id`: UUID
-   `user_id`: Link to owner
-   `status`: pending | analyzing | analyzed | error
-   `match_score`: 0-100 float
-   `raw_text`: Extracted content for RAG
-   `crm_data`: JSONB (Parsed metadata like Email, Website, Founders)

### `council_analyses`
-   `deck_id`: FK
-   `optimist_analysis`: JSONB
-   `skeptic_analysis`: JSONB
-   `quant_analysis`: JSONB
-   `consensus`: JSONB (The final "Memo")

### `vc_thesis`
-   `target_sectors`: Array[String]
-   `check_size_min/max`: Integers
-   `geography`: String
-   `anti_thesis`: Array[String] (Red flags to filter out)

---

## 7. Future Roadmap
-   **Q2 2026:**
    -   **Email Integration:** Forward emails to `deals@venturesight.ai` for auto-ingestion.
    -   **Multi-Modal Analysis:** Parse graphs and charts in PDFs (using Vision models) for better financial validation.
-   **Q3 2026:**
    -   **Portfolio Chat:** "Chat with your Data" - query structured financial updates from portfolio companies.
    -   **Crunchbase Integration:** Real-time enrichment of startup data.
