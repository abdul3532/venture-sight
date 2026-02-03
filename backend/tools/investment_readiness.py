"""
Investment Readiness Tool - Grades pitch decks against VC-grade criteria.
"""
import logging
from typing import Dict, Any, List, Optional
from utils.observability import observe

logger = logging.getLogger(__name__)

# VC-grade criteria for pitch deck evaluation
INVESTMENT_CRITERIA = [
    {
        "id": "team",
        "name": "Founding Team",
        "weight": 0.15,
        "description": "Relevant experience, complementary skills, founder-market fit"
    },
    {
        "id": "problem",
        "name": "Problem Definition",
        "weight": 0.10,
        "description": "Clear, significant pain point with evidence of market need"
    },
    {
        "id": "solution",
        "name": "Solution & Product",
        "weight": 0.10,
        "description": "Innovative approach, clear value proposition, product demo/evidence"
    },
    {
        "id": "market",
        "name": "Market Opportunity",
        "weight": 0.12,
        "description": "Large TAM, growing market, timing is right"
    },
    {
        "id": "traction",
        "name": "Traction & Metrics",
        "weight": 0.15,
        "description": "Revenue, users, engagement, growth rate, key milestones"
    },
    {
        "id": "business_model",
        "name": "Business Model",
        "weight": 0.08,
        "description": "Clear monetization, unit economics, path to profitability"
    },
    {
        "id": "competition",
        "name": "Competitive Landscape",
        "weight": 0.08,
        "description": "Awareness of competition, differentiation, defensible moat"
    },
    {
        "id": "go_to_market",
        "name": "Go-to-Market Strategy",
        "weight": 0.07,
        "description": "Customer acquisition strategy, channels, early wins"
    },
    {
        "id": "financials",
        "name": "Financial Projections",
        "weight": 0.05,
        "description": "Realistic projections, key assumptions, use of funds"
    },
    {
        "id": "ask",
        "name": "The Ask",
        "weight": 0.05,
        "description": "Clear funding request, reasonable valuation, milestone plan"
    },
    {
        "id": "storytelling",
        "name": "Pitch Quality",
        "weight": 0.05,
        "description": "Compelling narrative, clear structure, professional design"
    }
]


@observe()
def grade_investment_readiness(
    criteria_scores: Dict[str, int],
    stage: str = "Seed"
) -> Dict[str, Any]:
    """
    Grade a pitch deck based on VC investment criteria.
    
    Args:
        criteria_scores: Dict mapping criterion ID to score (1-10)
        stage: Expected funding stage for context
    
    Returns:
        Dict with overall grade, breakdown, and recommendations
    """
    scores_breakdown = []
    weighted_total = 0
    max_possible = 0
    missing_criteria = []
    weak_areas = []
    strong_areas = []
    
    for criterion in INVESTMENT_CRITERIA:
        cid = criterion["id"]
        weight = criterion["weight"]
        score = criteria_scores.get(cid, 0)
        
        if score == 0:
            missing_criteria.append(criterion["name"])
            continue
        
        weighted_score = score * weight
        weighted_total += weighted_score
        max_possible += 10 * weight
        
        scores_breakdown.append({
            "criterion": criterion["name"],
            "score": score,
            "weight": weight,
            "weighted_score": round(weighted_score, 2),
            "assessment": _assess_score(score)
        })
        
        if score <= 4:
            weak_areas.append({
                "area": criterion["name"],
                "score": score,
                "improvement": criterion["description"]
            })
        elif score >= 8:
            strong_areas.append({
                "area": criterion["name"],
                "score": score
            })
    
    # Calculate overall score
    overall_score = (weighted_total / max_possible * 100) if max_possible > 0 else 0
    
    # Determine grade
    if overall_score >= 85:
        grade = "A"
        recommendation = "Strong Interest"
        summary = "Exceptional deck. Meets or exceeds most VC criteria."
    elif overall_score >= 70:
        grade = "B"
        recommendation = "Promising"
        summary = "Solid deck with some areas for improvement."
    elif overall_score >= 55:
        grade = "C"
        recommendation = "Consider"
        summary = "Decent potential but significant gaps to address."
    elif overall_score >= 40:
        grade = "D"
        recommendation = "Pass"
        summary = "Multiple weak areas. Not investment-ready."
    else:
        grade = "F"
        recommendation = "Strong Pass"
        summary = "Fundamental issues across multiple criteria."
    
    return {
        "overall_score": round(overall_score, 1),
        "grade": grade,
        "recommendation": recommendation,
        "summary": summary,
        "stage": stage,
        "criteria_evaluated": len(scores_breakdown),
        "missing_criteria": missing_criteria,
        "scores_breakdown": scores_breakdown,
        "strong_areas": strong_areas,
        "weak_areas": weak_areas,
        "top_priorities": _generate_priorities(weak_areas, missing_criteria)
    }


def _assess_score(score: int) -> str:
    """Convert numeric score to assessment."""
    if score >= 9:
        return "Exceptional"
    elif score >= 7:
        return "Strong"
    elif score >= 5:
        return "Adequate"
    elif score >= 3:
        return "Weak"
    else:
        return "Critical Gap"


def _generate_priorities(weak_areas: List, missing: List) -> List[str]:
    """Generate top improvement priorities."""
    priorities = []
    
    # Missing criteria are highest priority
    for area in missing[:2]:
        priorities.append(f"Add {area} section to deck")
    
    # Then weakest scored areas
    sorted_weak = sorted(weak_areas, key=lambda x: x["score"])
    for area in sorted_weak[:3 - len(priorities)]:
        priorities.append(f"Strengthen {area['area']}: {area['improvement']}")
    
    return priorities


def get_criteria_list() -> List[Dict[str, Any]]:
    """Return the list of investment criteria for reference."""
    return [
        {"id": c["id"], "name": c["name"], "description": c["description"]}
        for c in INVESTMENT_CRITERIA
    ]


# Tool schema for LLM function calling
READINESS_TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "grade_investment_readiness",
        "description": "Grade a pitch deck against 11 VC-grade investment criteria. Returns overall score, grade, and specific recommendations.",
        "parameters": {
            "type": "object",
            "properties": {
                "criteria_scores": {
                    "type": "object",
                    "description": "Dict mapping criterion ID to score (1-10). IDs: team, problem, solution, market, traction, business_model, competition, go_to_market, financials, ask, storytelling"
                },
                "stage": {
                    "type": "string",
                    "description": "Expected funding stage (Pre-Seed, Seed, Series A)"
                }
            },
            "required": ["criteria_scores"]
        }
    }
}
