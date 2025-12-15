# app/routers/ai_recommend_routes.py

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.services.ai_service import AIService
from app.services.recommend_vietmap import generate_recommendations_vietmap
from app.database import get_db
from app.services.user_service import UserService
from app.services.location_service import LocationService
from app.services.vietmap_service import VietMapService
import json

router = APIRouter(prefix="/api/ai", tags=["AI Recommend Chat"])


class ChatRequest(BaseModel):
    message: str
    user_id: str  # FE gửi userId để AI biết người này là ai


ai = AIService()


@router.post("/recommend-chat")
async def recommend_chat(req: ChatRequest, db=Depends(get_db)):
    # ---------------------------------------
    # 1. AI PARSE
    # ---------------------------------------

    parsed_raw = await ai.parse_user_message(req.message)
    try:
        parsed = json.loads(parsed_raw)
    except:
        return {"reply": "Xin lỗi, hệ thống không hiểu yêu cầu này."}

    # ---------------------------------------
    # 2. XỬ LÝ DỮ LIỆU TỪ KẾT QUẢ PARSED
    # ---------------------------------------

    start_location_name = parsed.get("start")

    start_point = None

    if start_location_name:
        try:
            geo_res = await VietMapService.geocode(start_location_name)

            found_location = False
            if isinstance(geo_res, dict) and geo_res.get("code") == "OK":
                features = geo_res.get("data", {}).get("features", [])
                if features and len(features) > 0:
                    coords = features[0].get("geometry", {}).get("coordinates", [])
                    if len(coords) >= 2:
                        start_point = {"lat": coords[1], "lng": coords[0]}
                        found_location = True

            elif isinstance(geo_res, list) and len(geo_res) > 0:
                first = geo_res[0]
                if "lat" in first and "lng" in first:
                    start_point = {"lat": first["lat"], "lng": first["lng"]}
                    found_location = True

            if not found_location:
                # Nếu không tìm thấy tọa độ, nhưng có tên, ta không thể tính khoảng cách
                print(f"Không tìm thấy tọa độ cho: {start_location_name}")

        except Exception as e:
            print(f"Geocode error: {e}")

    if not start_point:
        return {
            "reply": "Tôi cần biết vị trí xuất phát của bạn để gợi ý (ví dụ: 'Tôi đang ở Chợ Bến Thành')."
        }

    user = UserService(db).get_user_with_history(req.user_id)
    locations = LocationService(db).get_all()

    raw_prefs = parsed.get("preferences", {})

    # Cố gắng lấy budget/pace từ preferences dict hoặc suy luận từ intent
    budget = raw_prefs.get("budget") or raw_prefs.get("budget_level")
    # Nếu intent chứa chữ "budget" thì gán low/medium
    if not budget and "budget" in parsed.get("intent", "").lower():
        budget = "low"

    prefs = {
        "budget_level": budget,
        "travel_pace": raw_prefs.get("pace") or raw_prefs.get("travel_pace"),
        # Map "poi_type" vào preferred_categories (dạng list)
        "preferred_categories": (
            [parsed.get("poi_type")] if parsed.get("poi_type") else []
        ),
    }

    # ---------------------------------------
    # 3. GỌI SERVICE (Đã có await)
    # ---------------------------------------
    payload_dict = {"start_point": start_point}

    results = await generate_recommendations_vietmap(
        user=user,
        locations=locations,
        payload=payload_dict,
        user_prefs=prefs,
        max_stops=3,  # Mặc định hoặc lấy từ parsed
    )

    # ---------------------------------------
    # 4. TẠO CÂU TRẢ LỜI CONVERSATIONAL
    # ---------------------------------------
    if not results:
        return {
            "reply": "Tôi chưa tìm được địa điểm phù hợp, bạn thử mô tả rõ hơn nhé!"
        }

    # Build danh sách location cho AI
    summary = "\n".join(
        [
            f"- {r['name_vi']} (score: {round(r['score'],2)})"
            for r in results
        ]
    )

    prompt_answer = f"""
    Viết câu trả lời ngắn gọn, thân thiện kiểu hướng dẫn viên du lịch.

    Dựa trên các địa điểm đã được hệ thống chọn:

    {summary}

    Người dùng đã hỏi:
    "{req.message}"

    Hãy trả lời bằng 2–3 câu, không lan man.
    """

    reply = await ai.generate_short_answer(prompt_answer)

    return {
        "reply": reply,
        "selected_locations": [
            {
                "id": r["location_id"],
                "name": r["name_vi"],
                "district": r["district"],
                "score": r["score"],
            }
            for r in results
        ],
    }
