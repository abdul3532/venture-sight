import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), '..', 'finmate-nextjs', 'backend'))

from services.research_service import research_service

async def test_validly_search():
    startup_name = "Validly"
    industry = "Technology"
    tagline = "AI Pitch Practice"
    
    # The specific description the user provided
    description = "Validly is an AI-driven SaaS platform designed to help startup founders practice their pitches by simulating investor feedback. The platform addresses a significant gap in the market by providing a realistic and effective environment for pitch refinement."

    print(f"\n--- Testing Search for {startup_name} ---")
    print(f"Description: {description}")
    
    # 1. Test query generation (mocking logic by calling private method or just running full analysis)
    # We'll run the full analysis function which includes the LLM "Thinking" step
    print("\n[Running analyze_competitors]...")
    competitors = await research_service.analyze_competitors(startup_name, tagline, industry, description)
    
    print("\n--- Results ---")
    if not competitors:
        print("No competitors found!")
    
    for comp in competitors:
        print(f"Name: {comp.get('name')}")
        print(f"Desc: {comp.get('description')}")
        print(f"Url:  {comp.get('website')}")
        print("-" * 30)

if __name__ == "__main__":
    asyncio.run(test_validly_search())
