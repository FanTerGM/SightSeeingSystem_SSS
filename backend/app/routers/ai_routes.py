from fastapi import APIRouter
from pydantic import BaseModel
from app.services.ai_service import AIService

router = APIRouter(prefix="/api/ai", tags=["AI"])


class AIRequest(BaseModel):
    message: str


ai_service = AIService()


@router.post("/parse")
async def parse_message(req: AIRequest):
    result = await ai_service.parse_user_message(req.message)
    return {"ai_result": result}


@router.post("/chat")
async def chat(req: AIRequest):
    return {"reply": await ai_service.generate_short_answer(req.message)}
