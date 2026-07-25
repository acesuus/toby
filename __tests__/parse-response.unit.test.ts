import { describe, expect, it } from "vitest";
import { parseLLMResponse } from "@/lib/coach/parse-response";

describe("parseLLMResponse", () => {
  it("parses a valid JSON response", () => {
    const raw = JSON.stringify({
      summary: "A solid game overall.",
      moveComments: [
        { ply: 5, comment: "This was a critical mistake." },
        { ply: 12, comment: "Good recovery here." },
      ],
    });

    const result = parseLLMResponse(raw, 2);
    expect(result.summary).toBe("A solid game overall.");
    expect(result.moveComments).toHaveLength(2);
    expect(result.moveComments[0]).toEqual({ ply: 5, comment: "This was a critical mistake." });
    expect(result.moveComments[1]).toEqual({ ply: 12, comment: "Good recovery here." });
  });

  it("strips markdown code fences wrapping JSON", () => {
    const raw = "```json\n" + JSON.stringify({
      summary: "Nice game.",
      moveComments: [{ ply: 3, comment: "Interesting choice." }],
    }) + "\n```";

    const result = parseLLMResponse(raw, 1);
    expect(result.summary).toBe("Nice game.");
    expect(result.moveComments[0].comment).toBe("Interesting choice.");
  });

  it("strips code fences without json language tag", () => {
    const raw = "```\n" + JSON.stringify({
      summary: "Summary text.",
      moveComments: [{ ply: 0, comment: "Opening remark." }],
    }) + "\n```";

    const result = parseLLMResponse(raw, 1);
    expect(result.summary).toBe("Summary text.");
  });

  it("trims whitespace from summary and comments", () => {
    const raw = JSON.stringify({
      summary: "  Trimmed summary.  ",
      moveComments: [{ ply: 7, comment: "  Trimmed comment.  " }],
    });

    const result = parseLLMResponse(raw, 1);
    expect(result.summary).toBe("Trimmed summary.");
    expect(result.moveComments[0].comment).toBe("Trimmed comment.");
  });

  it("throws on invalid JSON", () => {
    expect(() => parseLLMResponse("not json at all", 0)).toThrow(
      "LLM response is not valid JSON"
    );
  });

  it("throws on missing summary field", () => {
    const raw = JSON.stringify({ moveComments: [] });
    expect(() => parseLLMResponse(raw, 0)).toThrow("Missing or empty 'summary' field");
  });

  it("throws on empty summary", () => {
    const raw = JSON.stringify({ summary: "   ", moveComments: [] });
    expect(() => parseLLMResponse(raw, 0)).toThrow("Missing or empty 'summary' field");
  });

  it("throws on missing moveComments array", () => {
    const raw = JSON.stringify({ summary: "A summary." });
    expect(() => parseLLMResponse(raw, 0)).toThrow("Missing 'moveComments' array");
  });

  it("throws when moveComments count does not match expected", () => {
    const raw = JSON.stringify({
      summary: "Summary.",
      moveComments: [{ ply: 1, comment: "One comment." }],
    });
    expect(() => parseLLMResponse(raw, 3)).toThrow(
      "Expected 3 move comments, got 1"
    );
  });

  it("throws on moveComment with missing ply", () => {
    const raw = JSON.stringify({
      summary: "Summary.",
      moveComments: [{ comment: "No ply here." }],
    });
    expect(() => parseLLMResponse(raw, 1)).toThrow(
      "Invalid moveComment entry: requires ply (number) and comment (non-empty string)"
    );
  });

  it("throws on moveComment with empty comment", () => {
    const raw = JSON.stringify({
      summary: "Summary.",
      moveComments: [{ ply: 4, comment: "   " }],
    });
    expect(() => parseLLMResponse(raw, 1)).toThrow(
      "Invalid moveComment entry: requires ply (number) and comment (non-empty string)"
    );
  });

  it("throws on moveComment with non-number ply", () => {
    const raw = JSON.stringify({
      summary: "Summary.",
      moveComments: [{ ply: "five", comment: "A comment." }],
    });
    expect(() => parseLLMResponse(raw, 1)).toThrow(
      "Invalid moveComment entry: requires ply (number) and comment (non-empty string)"
    );
  });

  it("handles zero expected comments with empty array", () => {
    const raw = JSON.stringify({
      summary: "Clean game, no issues.",
      moveComments: [],
    });

    const result = parseLLMResponse(raw, 0);
    expect(result.summary).toBe("Clean game, no issues.");
    expect(result.moveComments).toHaveLength(0);
  });
});
