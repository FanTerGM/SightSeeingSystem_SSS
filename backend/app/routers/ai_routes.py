from fastapi import APIRouter
from pydantic import BaseModel
from app.services.ai_service import AIService
from app.routers.ai_recommend_routes import recommend_chat

router = APIRouter(prefix="/api/ai", tags=["AI"])


class AIRequest(BaseModel):
    message: str
    
class ChatRouterRequest(BaseModel):
    message: str
    user_id: int | None = None


ai_service = AIService()


@router.post("/parse")
async def parse_message(req: AIRequest):
    result = await ai_service.parse_user_message(req.message)
    return {"ai_result": result}


@router.post("/chat")
async def chat(req: AIRequest):
    return {"reply": await ai_service.generate_short_answer(req.message)}


@router.post("/chat-router")
async def chat_router(req: ChatRouterRequest):
    decision = await ai_service.classify_mode(req.message)

    # If recommend was chosen, we need user_id for your recommend-chat logic
    if decision["mode"] == "recommend":
        if req.user_id is None:
            return {
                "mode": "recommend",
                "reply": "Bạn muốn mình gợi ý lịch trình/địa điểm. Cho mình user_id (để cá nhân hoá) hoặc nói rõ điểm xuất phát nhé.",
                "selected_locations": []
            }

        # Call existing recommend-chat endpoint logic
        resp = await recommend_chat({"message": req.message, "user_id": req.user_id})
        # Ensure unified shape
        return {
            "mode": "recommend",
            "reply": resp.get("reply", ""),
            "selected_locations": resp.get("selected_locations", [])
        }

    # Normal chat
    reply = await ai_service.generate_short_answer(req.message)
    return {"mode": "chat", "reply": reply, "selected_locations": []}