const express = require("express");
const cors = require("cors");
const Groq = require("groq-sdk");

const app = express();

app.use(cors());
app.use(express.json());

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

app.get("/", (req, res) => {
  res.json({
    status: "online",
    assistant: "JARVIS"
  });
});

app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        error: "Message is required"
      });
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: `
You are JARVIS.

You are an advanced AI assistant inspired by Tony Stark's JARVIS.

Rules:
- Be intelligent.
- Be concise.
- Be helpful.
- Be professional.
- Occasionally address the user as "Sir".
- Never mention being ChatGPT.
- Act like a futuristic AI assistant.
`
        },
        {
          role: "user",
          content: message
        }
      ]
    });

    const reply = completion.choices[0].message.content;

    res.json({
      success: true,
      reply
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`JARVIS online on port ${PORT}`);
});
