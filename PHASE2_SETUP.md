# Phase 2 — Secure AI backend

This folder contains a Cloudflare Worker that calls the Gemini API from the server. The browser never receives the Gemini API key.

## Before deploying

1. Create a free Cloudflare account and open **Workers & Pages**.
2. Create a Worker named `businesspilot-ai`.
3. Deploy the code in `worker/src/index.js` (or connect this repository and use `worker/wrangler.toml` as the configuration).
4. In the Worker settings, add a secret named `GEMINI_API_KEY`. Create the key in Google AI Studio. Never put it in `index.html`, GitHub, chat messages, or a public file.
5. Set the Worker variable `ALLOWED_ORIGIN` to the exact website origin shown in GitHub Pages. For this repository the expected origin is `https://cquick1997cq-oss.github.io`.
6. Visit the Worker URL plus `/health`. It should return JSON showing `"status":"ok"` and `"aiConfigured":true`.
7. Paste the Worker URL into BusinessPilot's AI Assistant settings in the app.

## Free usage and privacy

- Cloudflare Workers has a free plan with a documented limit of 100,000 requests per day, subject to its other limits.
- Gemini API offers a free tier for selected models, subject to changing model availability and rate limits. Free-tier content may be used by Google to improve its products. Do not submit passwords, payment-card details, private customer records, or other sensitive information.
- Free tiers are limited and can change. Do not enable paid billing unless you deliberately choose to.
- The Worker checks the browser origin, validates the task and input size, and keeps the provider key server-side. Origin checks are not authentication and do not stop non-browser clients. Before sharing the app publicly, add a proper abuse/rate-limit control and review usage.
- This is a starter backend, not a production security certification.

## API

- `GET /health` — reports whether the server secret is configured.
- `POST /api/assist` — JSON body: `{"task":"marketing","prompt":"Write a short post for my lawn care service."}`
- Supported tasks: `business-ideas`, `marketing`, `business-plan`, `customer-reply`, `general`.
