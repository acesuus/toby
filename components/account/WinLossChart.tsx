"use client";

import { PieChart, Pie, Cell } from "recharts";

interface WinLossChartProps {
  wins: number;
  losses: number;
  draws: number;
}

const COLORS = ["#81b64c", "#ca3431", "#888888"];

export function WinLossChart({ wins, losses, draws }: WinLossChartProps) {
  const data = [
    { name: "Wins", value: wins },
    { name: "Losses", value: losses },
    { name: "Draws", value: draws },
  ].filter(d => d.value > 0); // Don't render empty segments

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-2 text-xs font-medium">
        <span className="text-[#81b64c]">{wins}W</span>
        <span className="text-[#ca3431]">{losses}L</span>
        <span className="text-[#888]">{draws}D</span>
      </div>
      <PieChart width={28} height={28}>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={8}
          outerRadius={14}
          paddingAngle={2}
          dataKey="value"
          stroke="none"
          isAnimationActive={false}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={
              entry.name === "Wins" ? COLORS[0] : 
              entry.name === "Losses" ? COLORS[1] : 
              COLORS[2]
            } />
          ))}
        </Pie>
      </PieChart>
    </div>
  );
}
