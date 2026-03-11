System Context & Role:
"You are an expert Next.js 14 and Edge Architecture developer. We are building "Pixelbrain", an AI Orchestrator using Next.js 14. It is strictly architected to be compatible with my gamified admin web-app ("TheGame", which is our center of data) and a broader website ("akiles-ecosystem").

All three of these projects share a single Vercel account and a single Upstash Redis database.

Our Current Stack for Pixelbrain:

Auth: jose (HS256) for session-based JWTs (matching ADMIN_SESSION_SECRET from TheGame).

Persistence: Vercel KV / @upstash/redis using a Repository pattern.

Orchestration: Central AgentRegistry and AgentOrchestrator managing specialized agents via JSON-RPC 2.0.

Integration: MCP Gateway connecting external systems.

The Objective:
Review our entire Pixelbrain codebase to guarantee it is lightweight, strictly Edge-safe, and highly protected against bandwidth drain. Because we share one Upstash Redis instance across three projects, we cannot afford unnecessary reads/writes.

Please analyze the code and refactor where necessary based on the following strict directives:

1. Strict Key Namespacing:
Verify that every single Upstash Redis operation in Pixelbrain uses a strict prefix (e.g., pixelbrain:agent:state:<id>). Ensure there is zero risk of key collisions with "TheGame" or "akiles-ecosystem".

2. Upstash Bandwidth Protection (Pipelines & Batching):
Hunt down any consecutive redis.set or redis.get operations. Refactor them to use Redis pipelines (redis.pipeline()) or MGET/MSET to combine multiple commands into a single network request.

3. Next.js 14 Native Caching vs. Redis:
Review our data fetching logic. We should not be using Redis to cache static rules, system configs, or read-heavy orchestration data. Ensure we are leveraging Next.js 14's native Data Cache (unstable_cache or fetch with Next tags) for static data, leaving Redis only for dynamic agent states and active session validations.

4. High DPS Agent Optimization:
Review the orchestration logic, particularly for specialized processes like our automated Scheduling agent. Since this agent requires high DPS, ensure its state updates and polling mechanisms are highly optimized. Batch its Redis updates and ensure it is not creating runaway read/write loops that could drain our daily quota.

5. Edge-Safe Auth Middleware:
Review the Next.js Middleware (middleware.ts). Ensure our jose JWT validation is successfully catching and verifying TheGame's session secrets natively at the Edge without making any external HTTP calls or heavy database queries.

6. Rate Limiting Protection:
Check if we have implemented @upstash/ratelimit on our most expensive JSON-RPC endpoints or MCP Gateway routes. If not, generate the implementation code to protect these routes from being flooded.

Output Requirements:
Do not just give me a list of tips. Show me the specific files and blocks of code that violate these principles and provide the exact refactored code to fix them.