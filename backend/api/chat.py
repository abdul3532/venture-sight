from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from models import ChatRequest, ChatMessage
from services import chat_service
from services.assistant_service import chat_with_associate
from dependencies import get_current_user
from PyPDF2 import PdfReader
from io import BytesIO
from typing import List
import uuid

router = APIRouter(prefix="/api/chat", tags=["chat"])

@router.get("/history", response_model=List[dict])
async def get_history(user_id: str = Depends(get_current_user)):
    """Get all conversation history"""
    return chat_service.chat_service.get_conversations(user_id)

@router.get("/{conversation_id}/messages", response_model=List[ChatMessage])
async def get_messages(conversation_id: str, user_id: str = Depends(get_current_user)):
    """Get messages for a conversation"""
    messages = chat_service.chat_service.get_messages(conversation_id)
    return messages

@router.post("", response_model=ChatMessage)
async def chat(request: ChatRequest, user_id: str = Depends(get_current_user)):
    """Chat with the AI VC Associate"""
    try:
        # 1. Manage Conversation ID
        conversation_id = request.conversation_id
        history = []
        
        if not conversation_id:
            # Generate title from query (first 30 chars for now)
            title = request.query[:30] + "..."
            conversation_id = chat_service.chat_service.create_conversation(user_id, title)
        else:
            # Fetch history before adding the new message
            history = chat_service.chat_service.get_messages(conversation_id)

        # 2. Save User Message
        chat_service.chat_service.add_message(conversation_id, "user", request.query)

        # 3. Get AI Associate Response (with tools)
        response_text = await chat_with_associate(
            query=request.query,
            user_id=user_id,
            document_context=request.document_context,
            deck_id=request.deck_id,
            deck_ids=request.deck_ids,
            history=history
        )
        
        # 4. Save Assistant Message
        chat_service.chat_service.add_message(conversation_id, "assistant", response_text)
        
        return ChatMessage(
            id=str(uuid.uuid4()), 
            conversation_id=conversation_id,
            role="assistant",
            content=response_text
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")

@router.post("/upload-document")
async def upload_document(file: UploadFile = File(...), user_id: str = Depends(get_current_user)):
    """Upload and extract text from a PDF document"""
    try:
        # Validate file type
        filename = file.filename.lower()
        if not (filename.endswith('.pdf') or filename.endswith('.txt') or filename.endswith('.md') or filename.endswith('.csv')):
            raise HTTPException(status_code=400, detail="Supported formats: PDF, TXT, MD, CSV")
        
        contents = await file.read()
        text = ""

        if filename.endswith('.pdf'):
            # Read PDF
            pdf_reader = PdfReader(BytesIO(contents))
            for page in pdf_reader.pages:
                text += page.extract_text() or ""
        else:
            # Read Text/MD/CSV
            try:
                text = contents.decode('utf-8')
            except UnicodeDecodeError:
                # Try fallback encoding
                text = contents.decode('latin-1')
        
        # Limit context size
        limited_text = text[:15000] # Increased limit slightly
        
        return {
            "filename": file.filename,
            "text": limited_text,
            "message": f"Successfully extracted {len(text)} characters from {file.filename}"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")
@router.delete("/{conversation_id}")
async def delete_conversation(conversation_id: str, user_id: str = Depends(get_current_user)):
    """Delete a specific conversation"""
    success = chat_service.chat_service.delete_conversation(conversation_id, user_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete conversation")
    return {"message": "Conversation deleted"}

@router.delete("")
async def delete_all_conversations(user_id: str = Depends(get_current_user)):
    """Delete all conversations for the user"""
    success = chat_service.chat_service.delete_all_conversations(user_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete all conversations")
    return {"message": "All conversations deleted"}
