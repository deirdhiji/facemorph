
export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { faceImage, clothingImage, prompt, model } = JSON.parse(event.body || "{}");
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return { 
        statusCode: 500, 
        body: JSON.stringify({ error: "OpenRouter API Key is not configured in Netlify environment variables." }) 
      };
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

    const response = await globalThis.fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.APP_URL || "https://facemorph-ai.netlify.app",
        "X-Title": "FaceMorph AI"
      },
      body: JSON.stringify({
        model: model || "google/gemini-2.0-flash-001",
        messages: messages
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: `OpenRouter Error: ${errorText}` })
      };
    }

    const data = await response.json();
    
    // Note: OpenRouter models usually return text. 
    // If you use a model that supports image generation, the response structure might vary.
    // For this demo, we assume the model returns a description or a base64 if supported.
    
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
