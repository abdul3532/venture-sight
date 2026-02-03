# System Architecture: VentureSight AI

## Overview
VentureSight AI (formerly Senhor Finanças) is a specialized AI platform for Venture Capitalists. It employs a **Multi-Agent System (MAS)** architecture to simulate a professional investment committee ("The Council") and provide an omnipresent analyst ("The Associate").

---

## 1. High-Level Architecture

The system follows a standard **Client-Server-Database** pattern with an advanced **Agentic Layer**.

- **Frontend:** React 18 (Vite, TypeScript, TailwindCSS, Shadcn/UI)
- **Backend:** Python FastAPI (Async)
- **Database:** Supabase (PostgreSQL + pgvector)
- **LLM Orchestration:** OpenAI GPT-4o
- **Observability:** Langfuse (Tracing & Monitoring)

---

## 2. Core Components

### **A. The Council (Analysis Engine)**
*Located in:* `backend/services/council_service.py`

This is the primary analysis pipeline triggered upon deck upload. It simulates a debate between three distinct personas:

1.  **The Optimist:** Focuses on vision, market size, and "Blue Ocean" potential.
2.  **The Skeptic:** Identifies execution risks, competition, and red flags.
3.  **The Quant:** Validates financial assumptions and unit economics.
4.  **Consensus Agent:** Synthesizes the debate into a final **Match Score (0-100)** and structured **Investment Memo**.

**Key Features:**
- **Parallel Execution:** Agents analyze the deck concurrently for speed.
- **Research Integration:** Agents access live market data via the Research Service.
- **Thesis-Aware:** All analysis is grounded in the user's specific investment criteria (Geography, Stage, Sector).

### **B. The Associate (Conversational Agent)**
*Located in:* `backend/services/assistant_service.py`

An "Omniscient Analyst" that provides a chat interface to the user's entire deal flow.

- **Context Awareness:** Knows the User's Thesis, the specific Deck being viewed, and the entire Portfolio history.
- **Tool Use:** Can execute functions (Search Web, Calculate TAM, List Decks, Add/Delete Deals).
- **RAG (Retrieval Augmented Generation):** Uses vector search (`pgvector`) to find relevant excerpts across all analyzed documents.

### **C. Research Service (Fact-Checking)**
*Located in:* `backend/services/research_service.py`

A specialized service for external validation. It automates:
- **Competitor Scanning:** Identifies real-world competitors using live web search.
- **TAM Validation:** Cross-references market size claims with industry reports.

---

## 3. Data Flow

1.  **Ingestion:** User uploads a PDF. Text is extracted via `pdfplumber` and chunked for vector storage.
2.  **Analysis:** The Council runs (Optimist + Skeptic + Quant -> Consensus). Results are stored in `council_analyses`.
3.  **Enrichment:** Metadata (Team Size, Tagline, Industry) is extracted and synced to the `pitch_decks` CRM table.
4.  **Interaction:** User chats with The Associate. The Associate retrieves context from `pitch_decks` (CRM), `council_analyses` (Insights), and `deck_chunks` (Vector Store).

---

## 4. Observability & Monitoring

We use **Langfuse** to trace and monitor all AI interactions.
- **Traces:** Every `council_service.analyze_deck` and `assistant_service.chat_with_associate` call is traced.
- **Generations:** We track token usage, latency, and model parameters for every LLM call.
- **Scores:** We can attach user feedback (thumbs up/down) to specific traces for evaluation.

---

## 5. Security & Deployment

- **Authentication:** Supabase Auth (JWT) secures all API endpoints.
- **RLS (Row Level Security):** Database policies ensure users can only access their own deal flow.
- **Environment:** Configuration (API Keys, Model Names) is centralized in `.env`.

---

## 6. Directory Structure

- `frontend/`: React Application
- `backend/`: FastAPI Application
  - `api/`: REST Endpoints
  - `services/`: Core Business Logic (Council, Assistant, PDF, Research)
  - `tools/`: Function Calling implementations
  - `db/`: Database connection & schema
