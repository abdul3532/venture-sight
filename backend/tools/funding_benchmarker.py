"""
Funding Benchmarker Tool - Compares funding asks against industry benchmarks.
"""
import logging
from typing import Dict, Any, Optional
from utils.observability import observe

logger = logging.getLogger(__name__)

# Industry benchmark data (simplified - in production would use real data API)
FUNDING_BENCHMARKS = {
    "Pre-Seed": {
        "typical_range": (100000, 500000),
        "median": 250000,
        "expected_metrics": {
            "revenue": "Pre-revenue or < $10K MRR",
            "team": "1-3 founders",
            "product": "MVP or prototype"
        }
    },
    "Seed": {
        "typical_range": (500000, 3000000),
        "median": 1500000,
        "expected_metrics": {
            "revenue": "$10K-$50K MRR or strong engagement",
            "team": "3-10 people",
            "product": "Launched product with early users"
        }
    },
    "Series A": {
        "typical_range": (5000000, 15000000),
        "median": 10000000,
        "expected_metrics": {
            "revenue": "$100K+ MRR or $1M+ ARR",
            "team": "15-30 people",
            "product": "Product-market fit demonstrated"
        }
    },
    "Series B": {
        "typical_range": (15000000, 50000000),
        "median": 30000000,
        "expected_metrics": {
            "revenue": "$3M+ ARR with growth",
            "team": "50+ people",
            "product": "Scalable go-to-market"
        }
    }
}


@observe()
def benchmark_funding(
    funding_ask: float,
    stage: str,
    mrr: Optional[float] = None,
    team_size: Optional[int] = None,
    sector: str = "General"
) -> Dict[str, Any]:
    """
    Compare a startup's funding ask against industry benchmarks.
    
    Args:
        funding_ask: Amount being raised in USD
        stage: Funding stage (Pre-Seed, Seed, Series A, Series B)
        mrr: Monthly Recurring Revenue if available
        team_size: Current team size
        sector: Industry sector for context
    
    Returns:
        Dict with benchmark comparison and assessment
    """
    # Normalize stage name
    stage_normalized = stage.replace("-", " ").title().replace(" ", "-")
    if stage_normalized not in FUNDING_BENCHMARKS:
        # Try to match
        for key in FUNDING_BENCHMARKS:
            if key.lower() in stage.lower():
                stage_normalized = key
                break
        else:
            stage_normalized = "Seed"  # Default
    
    benchmark = FUNDING_BENCHMARKS[stage_normalized]
    min_range, max_range = benchmark["typical_range"]
    median = benchmark["median"]
    
    # Determine if ask is within range
    if funding_ask < min_range:
        ask_assessment = "BELOW_RANGE"
        ask_note = "Funding ask is below typical range. May indicate conservative approach or early stage."
    elif funding_ask > max_range:
        ask_assessment = "ABOVE_RANGE"
        ask_note = "Funding ask exceeds typical range. Requires strong metrics justification."
    elif funding_ask > median * 1.3:
        ask_assessment = "HIGH_END"
        ask_note = "Ask is on the higher end of range. Verify metrics support valuation."
    else:
        ask_assessment = "WITHIN_RANGE"
        ask_note = "Funding ask aligns with stage benchmarks."
    
    # Calculate implied valuation (assuming 15-25% dilution)
    implied_valuation_low = funding_ask / 0.25
    implied_valuation_high = funding_ask / 0.15
    
    # MRR multiple analysis if provided
    revenue_analysis = None
    if mrr and mrr > 0:
        arr = mrr * 12
        implied_multiple = implied_valuation_low / arr
        if implied_multiple < 10:
            revenue_analysis = f"Implied {implied_multiple:.1f}x ARR multiple - reasonable"
        elif implied_multiple < 30:
            revenue_analysis = f"Implied {implied_multiple:.1f}x ARR multiple - growth-stage pricing"
        else:
            revenue_analysis = f"Implied {implied_multiple:.1f}x ARR multiple - requires strong growth justification"
    
    # Team size check
    team_analysis = None
    expected_team = benchmark["expected_metrics"]["team"]
    if team_size:
        team_analysis = f"Team of {team_size} vs expected '{expected_team}' for {stage_normalized}"
    
    return {
        "funding_ask": funding_ask,
        "stage": stage_normalized,
        "benchmark": {
            "typical_range": benchmark["typical_range"],
            "median": median,
            "expected_metrics": benchmark["expected_metrics"]
        },
        "assessment": {
            "status": ask_assessment,
            "note": ask_note,
            "implied_valuation_range": [implied_valuation_low, implied_valuation_high]
        },
        "revenue_analysis": revenue_analysis,
        "team_analysis": team_analysis,
        "recommendation": _generate_funding_recommendation(ask_assessment, mrr, stage_normalized)
    }


def _generate_funding_recommendation(assessment: str, mrr: Optional[float], stage: str) -> str:
    """Generate funding recommendation."""
    if assessment == "ABOVE_RANGE":
        return f"Request detailed breakdown of use of funds and milestone plan for {stage} round."
    elif assessment == "BELOW_RANGE":
        return "Understand if conservative ask is strategic or indicates limited ambition."
    elif mrr and mrr > 0:
        return "Funding ask appears reasonable for stage. Validate unit economics and growth trajectory."
    else:
        return "Evaluate pre-revenue metrics: engagement, waitlist, or pilot contracts."


# Tool schema for LLM function calling
FUNDING_TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "benchmark_funding",
        "description": "Compare a startup's funding ask against industry benchmarks for their stage. Provides valuation implications and assessment.",
        "parameters": {
            "type": "object",
            "properties": {
                "funding_ask": {
                    "type": "number",
                    "description": "Amount being raised in USD"
                },
                "stage": {
                    "type": "string",
                    "description": "Funding stage (Pre-Seed, Seed, Series A, Series B)"
                },
                "mrr": {
                    "type": "number",
                    "description": "Monthly Recurring Revenue in USD if available"
                },
                "team_size": {
                    "type": "integer",
                    "description": "Current team size"
                },
                "sector": {
                    "type": "string",
                    "description": "Industry sector for context"
                }
            },
            "required": ["funding_ask", "stage"]
        }
    }
}
