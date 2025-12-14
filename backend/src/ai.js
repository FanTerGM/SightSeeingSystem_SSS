import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `
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
`;


app.post("/api/intent", async (req, res) => {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash"
    });

    const result = await model.generateContent({
      contents: [
        { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
        { role: "user", parts: [{ text: req.body.message }] }
      ],
      generationConfig: { responseMimeType: "application/json" }
    });

    const json = JSON.parse(result.response.text());
    return res.json(json);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Parsing failed", detail: err });
  }
});

app.listen(3001, () => console.log("AI intent server running on 3001"));
