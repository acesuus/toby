// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GameStatsRow } from "@/components/account/GameStatsRow";

describe("GameStatsRow", () => {
  it("displays time control label and games count", () => {
    render(
      <GameStatsRow
        timeControl="Bullet"
        gamesPlayed={342}
        record={{ wins: 180, losses: 120, draws: 42 }}
      />
    );

    expect(screen.getByText("Bullet · 342 games")).toBeInTheDocument();
  });

  it("displays W/L/D values with text labels", () => {
    render(
      <GameStatsRow
        timeControl="Blitz"
        gamesPlayed={512}
        record={{ wins: 260, losses: 200, draws: 52 }}
      />
    );

    expect(screen.getByText("W 260")).toBeInTheDocument();
    expect(screen.getByText("L 200")).toBeInTheDocument();
    expect(screen.getByText("D 52")).toBeInTheDocument();
  });

  it("applies semantic color classes for W/L/D", () => {
    render(
      <GameStatsRow
        timeControl="Rapid"
        gamesPlayed={89}
        record={{ wins: 50, losses: 30, draws: 9 }}
      />
    );

    const winEl = screen.getByText("W 50");
    const lossEl = screen.getByText("L 30");
    const drawEl = screen.getByText("D 9");

    expect(winEl).toHaveClass("text-[var(--good)]");
    expect(lossEl).toHaveClass("text-[var(--danger)]");
    expect(drawEl).toHaveClass("text-[var(--ink-muted)]");
  });

  it("uses singular 'game' when gamesPlayed is 1", () => {
    render(
      <GameStatsRow
        timeControl="Bullet"
        gamesPlayed={1}
        record={{ wins: 1, losses: 0, draws: 0 }}
      />
    );

    expect(screen.getByText("Bullet · 1 game")).toBeInTheDocument();
  });
});
