import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API route for morphing (OpenRouter)
  app.post("/api/morph", async (req, res) => {
    try {
      const { faceImage, clothingImage, prompt, model } = req.body;
      const apiKey = process.env.OPENROUTER_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "OPENROUTER_API_KEY is not configured." });
      }

      const messages = [
        {
          role: "user",
          content: [
            { type: "text", text: `Task: Face Morphing. Prompt: ${prompt}. Instruction: Maintain the facial features from the first image. If a second image is provided, use its clothing/style.` },
            { type: "image_url", image_url: { url: faceImage } }
          ]
        }
      ];

      if (clothingImage) {
        messages[0].content.push({ type: "image_url", image_url: { url: clothingImage } });
      }

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
          "X-Title": "FaceMorph AI"
        },
        body: JSON.stringify({
          model: model || "google/gemini-2.0-flash-001",
          messages: messages
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({ error: `OpenRouter Error: ${errorText}` });
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Server Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
