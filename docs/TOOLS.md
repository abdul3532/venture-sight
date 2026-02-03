# AI Tools Documentation

This document references all the tools available to the VentureSight AI Associate and Council agents. These tools extend the LLM's capabilities to perform real-world actions, retrieve data, and execute complex analysis.

---

## **1. Pipeline Management Tools**

### `list_decks`
**Purpose:** Retrieves a list of pitch decks currently in the user's deal flow.  
**Use Case:** "Show me my recent deals" or "What fintech startups are in my pipeline?"  
**Parameters:**
- `limit` (int, default=10): The maximum number of decks to return.
**Returns:** JSON list of deck summaries (ID, Name, Date, Status, Score).

### `get_deal_details`
**Purpose:** Fetches comprehensive structured data for a specific startup.  
**Use Case:** "Tell me more about Validly" or "Who are the founders of DeNoise?"  
**Parameters:**
- `startup_name` (string): The name of the startup to retrieve.
**Returns:** JSON object with all CRM data (Team, Funding, Founders, Metrics, Analysis).

### `get_pipeline_summary`
**Purpose:** Generates high-level statistics about the entire deal flow.  
**Use Case:** "How is my pipeline looking?" or "What's our breakdown by industry?"  
**Parameters:** None.  
**Returns:** JSON object with counts by Stage, Industry, and Status.

### `delete_deal`
**Purpose:** Permanently removes a startup and its analysis from the CRM.  
**Use Case:** "Delete the CryptoScam deck" or "Remove generic-startup from the list."  
**Parameters:**
- `startup_name` (string): The name of the startup to delete.
**Returns:** Success/Failure message string.

### `add_deal`
**Purpose:** Promotes a file or text currently in the chat context into the CRM system.  
**Use Case:** "Add this deck to my dashboard" (when viewing a file in chat).  
**Parameters:**
- `startup_name` (string): The name to assign to the new deal.
- `filename` (string, optional): Original filename if available.
**Returns:** Confirmation message string initiated by a background analysis job.

---

## **2. Research & Analysis Tools**

### `search_web`
**Purpose:** Performs a live internet search using DuckDuckGo.  
**Use Case:** "Find recent news on AI regulation" or "Verify this market size claim."  
**Parameters:**
- `query` (string): The search string.
**Returns:** Text summary of top search results with source URLs.

### `analyze_competitors`
**Purpose:** Identifies and analyzes competitors for a specific startup concept.  
**Use Case:** "Who competes with a 'Uber for Dog Walking' app?"  
**Parameters:**
- `startup_name` (string): Name of the subject startup.
- `industry` (string): The market sector.
- `keywords` (string, optional): Specific terms to refine the search.
**Returns:** JSON list of competitors with Funding, Similarity Score, and differentiating factors.

### `calculate_tam`
**Purpose:** Validates market size using bottom-up logic.  
**Use Case:** "Is a $50B TAM realistic for this niche?"  
**Parameters:**
- `market_size_claimed` (int): The TAM claimed in the deck.
- `target_customers` (int): Estimated number of potential customers.
- `average_revenue_per_customer` (int): ARPU or ACV.
- `market_growth_rate` (float): YoY growth percentage.
**Returns:** JSON analysis comparing the claimed TAM vs. calculated TAM with a verdict.

### `benchmark_funding`
**Purpose:** Compares a startup's funding ask against market norms.  
**Use Case:** "Are they asking for too much seed money?"  
**Parameters:**
- `funding_ask` (int): Amount being raised.
- `stage` (string): Round details (Pre-Seed, Seed, Series A).
- `sector` (string): Industry vertical.
**Returns:** JSON benchmarking data (Low/Med/High percentile) for that stage/sector.

---

## **3. Thesis & Focus Tools**

### `update_thesis`
**Purpose:** Updates the user's investment criteria/thesis.  
**Use Case:** "I want to focus on B2B SaaS in Europe now" or "Stop showing me crypto deals."  
**Parameters:**
- `target_sectors` (list[str]): New list of focus industries.
- `geography` (string): Target region.
- `stage` (string): Preferred investment stage.
- `check_size_min` (int): Minimum investment.
- `check_size_max` (int): Maximum investment.
**Returns:** JSON object confirming the updated Thesis settings.

---

## **4. Deep Retrieval Tools**

### `search_decks`
**Purpose:** Semantically searches across the *content* of all analyzed pitch decks using RAG (Vector Search).  
**Use Case:** "Have we seen any startups doing generative video?" or "Find decks that mention 'network effects'."  
**Parameters:**
- `query` (string): The semantic concept or keyword to find.
**Returns:** relevant text excerpts from past decks with source attribution.
