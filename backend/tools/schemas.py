from tools.competitor_analyzer import COMPETITOR_TOOL_SCHEMA
from tools.tam_calculator import TAM_TOOL_SCHEMA
from tools.funding_benchmarker import FUNDING_TOOL_SCHEMA
from tools.investment_readiness import READINESS_TOOL_SCHEMA

SEARCH_TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "search_web",
        "description": "Search the web for current market research, news, competitor info, or funding data. Use for questions about 'latest', 'recent', 'current trends', or to verify claims.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query (e.g., 'fintech startup funding trends 2024')"
                }
            },
            "required": ["query"]
        }
    }
}

DECK_SEARCH_SCHEMA = {
    "type": "function",
    "function": {
        "name": "search_decks",
        "description": "Search through previously uploaded pitch decks for similar content, companies, or patterns. Use for cross-deal comparisons or specific topics.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "What to search for in past decks (e.g., 'fintech traction', 'AI healthtech')"
                }
            },
            "required": ["query"]
        }
    }
}

LIST_DECKS_SCHEMA = {
    "type": "function",
    "function": {
        "name": "list_decks",
        "description": "List all pitch decks currently in the user's portfolio. Use effectively to answer questions like 'what decks do you have?', 'what came in recently?', or to find specific startups.",
        "parameters": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "description": "Number of decks to return (default 10)",
                    "default": 10
                }
            }
        }
    }
}

GET_DEAL_DETAILS_SCHEMA = {
    "type": "function",
    "function": {
        "name": "get_deal_details",
        "description": "Get detailed structured analysis for a specific startup or deck. This includes FOUNDER NAMES, metrics, and council scores. Use when specific facts about a team or company are requested.",
        "parameters": {
            "type": "object",
            "properties": {
                "startup_name": {
                    "type": "string",
                    "description": "Name of the startup to look up (e.g. 'Validly')"
                }
            },
            "required": ["startup_name"]
        }
    }
}

UPDATE_THESIS_SCHEMA = {
    "type": "function",
    "function": {
        "name": "update_thesis",
        "description": "Update or refine the VC investment thesis settings. Use when the user wants to change their investment focus, sectors, or check sizes.",
        "parameters": {
            "type": "object",
            "properties": {
                "thesis_text": {"type": "string", "description": "The main vision/focus statement"},
                "target_sectors": {"type": "array", "items": {"type": "string"}, "description": "Primary sectors/industries of interest"},
                "geography": {"type": "string", "description": "Target regions (e.g. 'Europe', 'Global')"},
                "check_size_min": {"type": "integer", "description": "Minimum ticket size in USD"},
                "check_size_max": {"type": "integer", "description": "Maximum ticket size in USD"},
                "preferred_stage": {"type": "string", "description": "Target investment stage", "enum": ["Pre-Seed", "Seed", "Series A", "Series B", "Growth", "Any font-bold"]},
                "anti_thesis": {"type": "array", "items": {"type": "string"}, "description": "Sectors or traits to AVOID"}
            }
        }
    }
}

GET_PIPELINE_SUMMARY_SCHEMA = {
    "type": "function",
    "function": {
        "name": "get_pipeline_summary",
        "description": "Get a high-level summary of the entire deal pipeline, including counts and top-rated startups.",
        "parameters": {
            "type": "object",
            "properties": {}
        }
    }
}

ADD_DEAL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "add_deal",
        "description": "Add a new deal/startup to the CRM based on the document currently being discussed in chat. This triggers a full automated analysis (Council & Research).",
        "parameters": {
            "type": "object",
            "properties": {
                "startup_name": {
                    "type": "string",
                    "description": "The name of the startup to add."
                },
                "filename": {
                    "type": "string",
                    "description": "A descriptive filename (e.g. 'Validly_Deck.pdf')."
                }
            },
            "required": ["startup_name"]
        }
    }
}

DELETE_DEAL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "delete_deal",
        "description": "Permanently remove a startup and its analysis from the CRM pipeline. Use for rejected deals or duplicates.",
        "parameters": {
            "type": "object",
            "properties": {
                "startup_name": {
                    "type": "string",
                    "description": "The exact name of the startup to delete."
                }
            },
            "required": ["startup_name"]
        }
    }
}

FETCH_FROM_URL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "fetch_deck_from_url",
        "description": "Download and ingest a pitch deck PDF from a public URL. Use when a user provides a link to a deck.",
        "parameters": {
            "type": "object",
            "properties": {
                "url": {
                    "type": "string",
                    "description": "The public URL to the PDF file."
                },
                "startup_name": {
                    "type": "string",
                    "description": "The name of the startup."
                }
            },
            "required": ["url", "startup_name"]
        }
    }
}

# Combine all tool schemas
ALL_TOOLS = [
    SEARCH_TOOL_SCHEMA,
    COMPETITOR_TOOL_SCHEMA,
    TAM_TOOL_SCHEMA,
    FUNDING_TOOL_SCHEMA,
    READINESS_TOOL_SCHEMA,
    DECK_SEARCH_SCHEMA,
    LIST_DECKS_SCHEMA,
    GET_DEAL_DETAILS_SCHEMA,
    UPDATE_THESIS_SCHEMA,
    GET_PIPELINE_SUMMARY_SCHEMA,
    ADD_DEAL_SCHEMA,
    DELETE_DEAL_SCHEMA,
    FETCH_FROM_URL_SCHEMA
]
