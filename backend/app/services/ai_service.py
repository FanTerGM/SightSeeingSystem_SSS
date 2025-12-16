# app/services/ai_service.py

import os
import google.generativeai as genai
import re
import json
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)

# ===============================
#  AI PROMPT TEMPLATE
# ===============================

SYSTEM_PROMPT = """
You are an intent extraction engine.

You MUST output only valid JSON.
No explanation.
No prose.
No markdown.
No text outside JSON.
preferences contains any extra details the user mentioned.
Only extract necessary information.


JSON structure:
{
  "intent": "",       // fast, budget, unknown,...
  "start": "",
  "end": "",
  "destinations": [], //only middle points, not start/end
  "poi_type": "",
  "preferences": {},  // { "key": "preference" }
  "raw_text": ""
}
If data is missing, use empty string or empty array.
Return ONLY JSON.
"""


# ===============================
#  AI Service Class
# ===============================


class AIService:
    def __init__(self):
        self.model = genai.GenerativeModel("gemini-2.5-flash")

    async def parse_user_message(self, message: str):
        """Convert user natural text → Structured JSON (Async) with cleaning."""
        prompt = f"""
        {SYSTEM_PROMPT}

        User message:
        \"\"\"{message}\"\"\"

        Return JSON:
        """

        try:
            # Gọi Google Gemini
            response = await self.model.generate_content_async(prompt)
            raw_text = response.text
            
            # Tìm nội dung nằm giữa ```json và ``` (nếu có)
            clean_text = raw_text.strip()
            
            # Nếu AI trả về dạng markdown block ```json ... ```
            match = re.search(r"```(?:json)?(.*?)```", clean_text, re.DOTALL)
            if match:
                clean_text = match.group(1).strip()
            
            return clean_text
            
        except Exception as e:
            print(f"AI Parse Error: {e}")
            # Trả về chuỗi JSON lỗi mặc định để Router không bị crash
            return '{"error": "AI parsing failed", "intent": "general_question"}'

    async def generate_short_answer(self, message: str):
        prompt = f"""
        You are a helpful, concise Vietnamese tourism assistant.
        Answer SHORT and on-point, no rambling.

        User: {message}
        """
        response = await self.model.generate_content_async(prompt)
        return response.text

    async def classify_mode(self, message: str) -> dict:
        """
        Decide whether to run recommendation pipeline or normal chat.
        Returns: {"mode": "recommend"|"chat", "confidence": float}
        """
        prompt = f"""
You are a strict classifier.
Return ONLY valid JSON. No prose.

Choose mode:
- "recommend" if the user is asking for itinerary, places to go, suggestions, route planning, nearby food/coffee/attractions, schedule, plan trip.
- "chat" otherwise.

User message:
\"\"\"{message}\"\"\"

Return JSON:
{{"mode":"chat|recommend","confidence":0.0}}
"""
        try:
            response = await self.model.generate_content_async(prompt)
            text = response.text.strip()

            # strip ```json blocks if Gemini wraps it
            match = re.search(r"```(?:json)?(.*?)```", text, re.DOTALL)
            if match:
                text = match.group(1).strip()

            data = json.loads(text)
            mode = data.get("mode", "chat")
            conf = float(data.get("confidence", 0.5))

            if mode not in ("chat", "recommend"):
                mode = "chat"

            return {"mode": mode, "confidence": conf}

        except Exception as e:
            print(f"AI classify_mode Error: {e}")
            return {"mode": "chat", "confidence": 0.0}