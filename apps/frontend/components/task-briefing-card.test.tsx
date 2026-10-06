import { describe, expect, it } from "vitest";
import { briefingRows } from "./task-briefing-card";

describe("questionário na tela de quem executa (A9)", () => {
  it("cruza perguntas e respostas e mantém resposta sem pergunta", () => {
    const rows = briefingRows({ briefing_questions: [{ question_key: "q1", question_text: "Objetivo?" }, { question_key: "q2", question_text: "Prazo?" }], answers: [{ question_key: "q1", answer: "Vender" }, { question_key: "q9", question_text: "Extra", answer: "x", links: "[\"https://a.com\"]" }] });
    expect(rows.map((r) => [r.key, r.answer])).toEqual([["q1", "Vender"], ["q2", ""], ["q9", "x"]]);
    expect(rows[2].links).toEqual(["https://a.com"]);
  });
});
