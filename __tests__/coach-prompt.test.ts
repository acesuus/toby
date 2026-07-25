import { describe, it, expect } from "vitest";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/coach/prompt";
import type { BatchRequest } from "@/lib/coach/types";

describe("buildSystemPrompt", () => {
  it("includes the Toby persona content", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("Toby is a fox wizard chess coach");
    expect(prompt).toContain("Voice rules");
    expect(prompt).toContain("Patient mentor, never condescending");
  });

  it("includes JSON output format instructions", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("## Output Format Instructions");
    expect(prompt).toContain('"summary"');
    expect(prompt).toContain('"moveComments"');
    expect(prompt).toContain("Respond with ONLY a valid JSON object");
  });

  it("includes rules for the LLM to follow", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("Produce exactly one entry in moveComments for each notable move provided");
    expect(prompt).toContain("Never fabricate analysis not present in the supplied data");
    expect(prompt).toContain("Follow all Toby voice rules");
  });
});

describe("buildUserPrompt", () => {
  const sampleRequest: BatchRequest = {
    notableMoves: [
      { ply: 14, san: "Bxf7+", grade: "brilliant", winPercentLoss: 0.0, bestMove: "f1f7" },
      { ply: 23, san: "Qd4", grade: "mistake", winPercentLoss: 12.5, bestMove: "d1d7" },
      { ply: 31, san: "Rh1", grade: "blunder", winPercentLoss: 28.3, bestMove: "a1d1" },
    ],
    gameSummary: {
      whiteName: "PlayerOne",
      blackName: "PlayerTwo",
      openingName: "Sicilian Defense",
      whiteAccuracy: 87.4,
      blackAccuracy: 72.1,
      result: "1-0",
    },
    playerColor: "white",
  };

  it("includes game summary fields", () => {
    const prompt = buildUserPrompt(sampleRequest);
    expect(prompt).toContain("## Game Summary");
    expect(prompt).toContain("White: PlayerOne (accuracy: 87.4%)");
    expect(prompt).toContain("Black: PlayerTwo (accuracy: 72.1%)");
    expect(prompt).toContain("Opening: Sicilian Defense");
    expect(prompt).toContain("Result: 1-0");
    expect(prompt).toContain("Reviewing player: white");
  });

  it("includes notable moves section with all required fields", () => {
    const prompt = buildUserPrompt(sampleRequest);
    expect(prompt).toContain("## Notable Moves");
    expect(prompt).toContain("- Ply 14: Bxf7+ [brilliant] (win% loss: 0.0, engine best: f1f7)");
    expect(prompt).toContain("- Ply 23: Qd4 [mistake] (win% loss: 12.5, engine best: d1d7)");
    expect(prompt).toContain("- Ply 31: Rh1 [blunder] (win% loss: 28.3, engine best: a1d1)");
  });

  it("handles empty notable moves array", () => {
    const emptyRequest: BatchRequest = {
      notableMoves: [],
      gameSummary: sampleRequest.gameSummary,
      playerColor: "black",
    };
    const prompt = buildUserPrompt(emptyRequest);
    expect(prompt).toContain("## Game Summary");
    expect(prompt).toContain("## Notable Moves");
    expect(prompt).toContain("Reviewing player: black");
    // No move entries
    expect(prompt).not.toContain("- Ply");
  });

  it("formats accuracy with one decimal place", () => {
    const request: BatchRequest = {
      notableMoves: [
        { ply: 5, san: "e4", grade: "inaccuracy", winPercentLoss: 3.0, bestMove: "d2d4" },
      ],
      gameSummary: {
        whiteName: "Alice",
        blackName: "Bob",
        openingName: "Italian Game",
        whiteAccuracy: 90.0,
        blackAccuracy: 65.333,
        result: "0-1",
      },
      playerColor: "white",
    };
    const prompt = buildUserPrompt(request);
    expect(prompt).toContain("accuracy: 90.0%");
    expect(prompt).toContain("accuracy: 65.3%");
    expect(prompt).toContain("win% loss: 3.0");
  });
});
