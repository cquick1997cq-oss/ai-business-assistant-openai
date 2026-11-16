const ALLOWED_TASKS = new Set(["business-ideas", "marketing", "business-plan", "customer-reply", "general"]);

function corsHeaders(origin, allowedOrigin) {
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

function json(data, status, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers }
  });
}

export default {
  async fetch(request, env) {
    const allowedOrigin = env.ALLOWED_ORIGIN || "https://cquick1997cq-oss.github.io";
    const origin = request.headers.get("Origin");

    if (origin && origin !== allowedOrigin) {
      return json({ error: "This website is not allowed to use this assistant." }, 403);
    }

    const headers = corsHeaders(origin, allowedOrigin);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    const url = new URL(request.url);
    if (url.pathname === "/health" && request.method === "GET") {
      return json({ status: "ok", aiConfigured: Boolean(env.GEMINI_API_KEY) }, 200, headers);
    }

    if (url.pathname !== "/api/assist" || request.method !== "POST") {
      return json({ error: "Not found." }, 404, headers);
    }

    if (!env.GEMINI_API_KEY) {
      return json({ error: "AI is not configured yet. Add the GEMINI_API_KEY secret in Cloudflare." }, 503, headers);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Send a valid JSON request." }, 400, headers);
    }

    const task = typeof body.task === "string" ? body.task : "general";
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!ALLOWED_TASKS.has(task)) {
      return json({ error: "Unsupported assistant task." }, 400, headers);
    }
    if (!prompt || prompt.length > 4000) {
      return json({ error: "Enter a prompt between 1 and 4,000 characters." }, 400, headers);
    }

    const taskGuidance = {
      "business-ideas": "Suggest realistic, low-cost business ideas. State assumptions, first validation steps, and risks. Never promise income.",
      marketing: "Write clear, truthful marketing copy. Do not invent prices, guarantees, credentials, or customer reviews.",
      "business-plan": "Create a concise practical business plan with customer, problem, offer, pricing assumptions, marketing, costs to investigate, and first validation steps.",
      "customer-reply": "Draft a polite, professional customer response. Do not promise refunds, deadlines, or policies that the user has not provided.",
      general: "Help with practical small-business planning. Be specific, cautious, and honest about uncertainty."
    };

    const model = env.GEMINI_MODEL || "gemini-2.5-flash";
    const apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent";

    try {
      const aiResponse = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: "You are BusinessPilot, a practical assistant for small businesses. " + taskGuidance[task] + " Do not provide legal, tax, or financial guarantees. Keep the answer useful and easy for a beginner to understand." }]
          },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 900 }
        })
      });

      const data = await aiResponse.json();
      if (!aiResponse.ok) {
        return json({ error: "The AI provider could not complete the request. Check your provider limits and configuration." }, 502, headers);
      }

      const answer = data?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("\n")
        .trim();

      if (!answer) {
        return json({ error: "The AI provider returned an empty answer. Try again." }, 502, headers);
      }

      return json({ answer }, 200, headers);
    } catch {
      return json({ error: "Could not reach the AI provider. Try again later." }, 502, headers);
    }
  }
};