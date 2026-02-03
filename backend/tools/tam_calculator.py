"""
TAM Calculator Tool - Validates market sizing claims in pitch decks.
"""
import logging
from typing import Dict, Any, Optional
from utils.observability import observe

logger = logging.getLogger(__name__)


@observe()
def calculate_tam(
    market_size_claimed: float,
    target_customers: int,
    average_revenue_per_customer: float,
    market_growth_rate: float = 0.0
) -> Dict[str, Any]:
    """
    Calculate and validate Total Addressable Market.
    
    Args:
        market_size_claimed: The TAM claimed in the pitch deck (in USD)
        target_customers: Estimated number of potential customers
        average_revenue_per_customer: ARPU or average deal size
        market_growth_rate: Annual market growth rate (e.g., 0.15 for 15%)
    
    Returns:
        Dict with calculated TAM, validation status, and analysis
    """
    # Calculate TAM from bottom-up
    calculated_tam = target_customers * average_revenue_per_customer
    
    # Determine if claimed TAM is reasonable
    tam_ratio = market_size_claimed / calculated_tam if calculated_tam > 0 else 0
    
    if tam_ratio < 0.5:
        validation = "UNDERSTATED"
        confidence = "low"
        note = "Claimed TAM is significantly lower than bottom-up calculation. May be conservative."
    elif tam_ratio > 2.0:
        validation = "OVERSTATED"
        confidence = "low"
        note = "Claimed TAM appears inflated. Request supporting data sources."
    elif tam_ratio > 1.5:
        validation = "AGGRESSIVE"
        confidence = "medium"
        note = "TAM is on the higher end. Verify assumptions."
    else:
        validation = "REASONABLE"
        confidence = "high"
        note = "Claimed TAM aligns with bottom-up calculation."
    
    # Project 5-year TAM with growth
    projected_5y = calculated_tam * ((1 + market_growth_rate) ** 5) if market_growth_rate > 0 else calculated_tam
    
    return {
        "claimed_tam": market_size_claimed,
        "calculated_tam": calculated_tam,
        "tam_ratio": round(tam_ratio, 2),
        "validation_status": validation,
        "confidence": confidence,
        "note": note,
        "projected_5y_tam": round(projected_5y, 0),
        "inputs": {
            "target_customers": target_customers,
            "arpu": average_revenue_per_customer,
            "growth_rate": market_growth_rate
        }
    }


def estimate_sam_som(
    tam: float,
    geographic_focus_pct: float = 1.0,
    segment_focus_pct: float = 1.0,
    realistic_capture_pct: float = 0.01
) -> Dict[str, Any]:
    """
    Estimate SAM (Serviceable Addressable Market) and SOM (Serviceable Obtainable Market).
    
    Args:
        tam: Total Addressable Market
        geographic_focus_pct: Percentage of TAM in target geography (0-1)
        segment_focus_pct: Percentage of TAM in target segment (0-1)
        realistic_capture_pct: Realistic market share capture (typically 1-5%)
    """
    sam = tam * geographic_focus_pct * segment_focus_pct
    som = sam * realistic_capture_pct
    
    return {
        "tam": tam,
        "sam": round(sam, 0),
        "som": round(som, 0),
        "sam_to_tam_ratio": round(geographic_focus_pct * segment_focus_pct, 2),
        "realistic_capture_rate": realistic_capture_pct,
        "analysis": {
            "sam_assessment": "Reasonable" if 0.1 <= (sam/tam) <= 0.5 else "Review needed",
            "som_assessment": "Achievable" if som < sam * 0.1 else "Ambitious"
        }
    }


# Tool schema for LLM function calling
TAM_TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "calculate_tam",
        "description": "Calculate and validate Total Addressable Market (TAM) based on bottom-up analysis. Use this to verify market sizing claims in pitch decks.",
        "parameters": {
            "type": "object",
            "properties": {
                "market_size_claimed": {
                    "type": "number",
                    "description": "The TAM claimed in the pitch deck in USD"
                },
                "target_customers": {
                    "type": "integer",
                    "description": "Estimated number of potential customers in the market"
                },
                "average_revenue_per_customer": {
                    "type": "number",
                    "description": "Average revenue per user (ARPU) or average deal size in USD"
                },
                "market_growth_rate": {
                    "type": "number",
                    "description": "Annual market growth rate as decimal (e.g., 0.15 for 15%)"
                }
            },
            "required": ["market_size_claimed", "target_customers", "average_revenue_per_customer"]
        }
    }
}
