
import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from services.pdf_service import pdf_service
from db.client import supabase

async def test_background_processing():
    print("Testing PDF processing directly...")
    
    # Real UUID from the logs
    user_id = "2a702949-8a24-450a-a481-d26ac5d97b89"
    
    filename = "test_deck.pdf"
    # Minimal valid-ish PDF header
    with open(filename, "wb") as f:
        f.write(b"%PDF-1.4\n1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n2 0 obj\n<</Type/Pages/Kids[3 0 R]/Count 1>>\nendobj\n3 0 obj\n<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Resources <<>>>>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000059 00000 n\n0000000116 00000 n\ntrailer\n<</Size 4/Root 1 0 R>>\nstartxref\n221\n%%EOF")
            
    with open(filename, "rb") as f:
        file_bytes = f.read()
        
    print("Creating dummy deck...")
    deck = await pdf_service.save_upload(user_id, filename, file_bytes)
    if not deck:
        print("Failed to save dummy deck. check supabase.")
        return
        
    deck_id = deck["id"]
    print(f"Deck created with ID: {deck_id}")
    
    print("Starting background process...")
    try:
        await pdf_service.process_deck_background(deck_id, file_bytes, user_id)
        print("Background process finished successfully!")
    except Exception as e:
        print(f"Background process CRASHED: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_background_processing())
