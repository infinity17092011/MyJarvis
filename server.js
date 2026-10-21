// server.js — keeps your Groq key on the backend and returns structured JSON
require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b"; // check Groq's model list
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// Allow the frontend to call this backend from another origin
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: "200kb" }));
app.use(express.static(path.join(__dirname, "public")));

const SYSTEM_PROMPT = `You summarise a student's notes. Reply with ONLY a JSON object, no prose, in this exact shape:
{
  "summary": "3-5 sentences in plain language",
  "keywords": ["5-10 important terms"],
  "definitions": [{"term": "...", "definition": "one clear sentence"}],
  "flashcards": [{"q": "...", "a": "..."}]
}
Rules: use only information from the notes, define 3-8 terms, write 3-6 flashcards, never ask questions back, never add commentary.`;

app.post("/api/summarise", async (req, res) => {
  const notes = (req.body.notes || "").trim();
  if (notes.length < 20) {
    return res.status(400).json({ error: "Add a bit more text (at least 20 characters)." });
  }
  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: "Server is missing GROQ_API_KEY." });
  }

  try {
    const r = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: notes },
        ],
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      console.error("Groq error:", r.status, detail);
      return res.status(502).json({ error: "The AI service returned an error. Try again." });
    }

    const data = await r.json();
    const raw = data.choices?.[0]?.message?.content || "";
    const result = JSON.parse(raw.replace(/```json|```/g, "").trim());
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't read the AI response. Try again." });
  }
});

app.listen(PORT, () => console.log(`Running on http://localhost:${PORT}`));
