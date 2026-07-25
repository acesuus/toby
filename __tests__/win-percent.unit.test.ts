import { describe, test, expect } from "vitest";
import { centipawnToWinPercent, evalToWinPercent } from "@/lib/win-percent";

/**
 * Unit tests for win-percent conversion functions.
 * Validates: Requirements 7.2, 7.4, 7.5, 7.7
 */

describe("centipawnToWinPercent", () => {
  test("cp=0 returns exactly 50", () => {
    expect(centipawnToWinPercent(0)).toBe(50);
  });

  test("NaN returns 50 (treated as equal position)", () => {
    expect(centipawnToWinPercent(NaN)).toBe(50);
  });

  test("+Infinity returns 100", () => {
    expect(centipawnToWinPercent(Infinity)).toBe(100);
  });

  test("-Infinity returns 0", () => {
    expect(centipawnToWinPercent(-Infinity)).toBe(0);
  });

  test("large positive cp (1000) approaches 100 but is less than 100", () => {
    const result = centipawnToWinPercent(1000);
    expect(result).toBeGreaterThan(90);
    expect(result).toBeLessThan(100);
  });

  test("large negative cp (-1000) approaches 0 but is greater than 0", () => {
    const result = centipawnToWinPercent(-1000);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(10);
  });
});

describe("evalToWinPercent", () => {
  test("positive mate score from white perspective returns 100", () => {
    expect(evalToWinPercent({ type: "mate", value: 3 }, "white")).toBe(100);
  });

  test("negative mate score from white perspective returns 0", () => {
    expect(evalToWinPercent({ type: "mate", value: -3 }, "white")).toBe(0);
  });

  test("positive mate score from black perspective returns 0", () => {
    expect(evalToWinPercent({ type: "mate", value: 3 }, "black")).toBe(0);
  });

  test("cp=0 from white perspective returns 50", () => {
    expect(evalToWinPercent({ type: "cp", value: 0 }, "white")).toBe(50);
  });

  test("cp=0 from black perspective returns 50", () => {
    expect(evalToWinPercent({ type: "cp", value: 0 }, "black")).toBe(50);
  });
});
