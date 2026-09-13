"use client";

import { cn } from "@/lib/utils";

/** Aura oficial: o material aprovado tem oito expressões em uma grade 4 × 2. */
export type AuraExpression = "primary" | "neutral" | "smile" | "thinking" | "attentive" | "surprised";

const POSITIONS: Record<AuraExpression, string> = {
  primary: "0% 0%",
  neutral: "0% 0%",
  smile: "33.333% 0%",
  thinking: "66.667% 0%",
  attentive: "100% 0%",
  surprised: "66.667% 100%",
};

export function IallkaAuraAvatar({ expression = "primary", className }: { expression?: AuraExpression; className?: string }) {
  const primary = expression === "primary";
  return (
    <span
      aria-hidden="true"
      className={cn("block shrink-0 rounded-full bg-[#0a1736] bg-no-repeat", className)}
      style={primary
        ? { backgroundImage: "url('/iallka-aura.png')", backgroundSize: "cover", backgroundPosition: "center" }
        : { backgroundImage: "url('/iallka-aura-expressions.png')", backgroundSize: "400% 200%", backgroundPosition: POSITIONS[expression] }}
    />
  );
}
