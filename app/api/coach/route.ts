import { validateBatchRequest } from "@/lib/coach/validate";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/coach/prompt";
import { generateCoachComment } from "@/lib/coach/generate";
import { parseLLMResponse } from "@/lib/coach/parse-response";
import type { BatchRequest, BatchResponse } from "@/lib/coach/types";

export async function POST(request: Request): Promise<Response> {
  // 1. Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  const validation = validateBatchRequest(body);
  if (!validation.ok) {
    return Response.json({ error: validation.error }, { status: 400 });
  }
  const batchRequest: BatchRequest = validation.data;

  // 2. Handle zero notable moves edge case
  if (batchRequest.notableMoves.length === 0) {
    const response: BatchResponse = {
      summary:
        "A clean game with no major turning points \u2014 steady play throughout.",
      moveComments: [],
    };
    return Response.json(response);
  }

  // 3. Build prompts
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(batchRequest);

  // 4. Call LLM (exactly one call)
  let rawResponse: string;
  try {
    rawResponse = await generateCoachComment(systemPrompt, userPrompt);
  } catch (err) {
    return Response.json(
      {
        error: `LLM service error: ${err instanceof Error ? err.message : "unknown"}`,
      },
      { status: 502 }
    );
  }

  // 5. Parse LLM response as JSON
  let parsed: BatchResponse;
  try {
    parsed = parseLLMResponse(rawResponse, batchRequest.notableMoves.length);
  } catch (err) {
    return Response.json(
      {
        error: `Failed to parse LLM response: ${err instanceof Error ? err.message : "unknown"}`,
      },
      { status: 502 }
    );
  }

  return Response.json(parsed);
}
