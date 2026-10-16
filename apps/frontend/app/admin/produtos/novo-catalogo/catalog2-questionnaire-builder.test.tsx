import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";

const api = {
  searchCatalog2QuestionLibrary: vi.fn(async () => ({ data: [{ id: "qq-1234567890", key: "site", label: "Qual o site da empresa?", question_type: "url", is_required: true, options: [], validation: {}, settings: { placeholder: "https://" }, from: "Briefing A · ID abc12345", questionnaire_id: "qa" }] })),
  getCatalog2Questionnaires: vi.fn(async () => ({ data: [{ id: "qn-aaaaaaaa11", name: "Briefing de tráfego", question_count: 4, task_count: 2, revision: 3, is_global_model: true, products: ["#1 Gestão de Tráfego"] }] })),
  setCatalog2TaskQuestionnaire: vi.fn(async () => ({ ok: true })),
  updateCatalog2TaskQuestionnaireContent: vi.fn(async () => ({ ok: true, forked: false, questionnaire: { id: "qn-aaaaaaaa11", is_global_model: false } })),
  setCatalog2QuestionnaireGlobal: vi.fn(async () => ({ ok: true })),
  suggestCatalog2TaskQuestionnaire: vi.fn(async () => ({ name: "IA", description: null, questions: [] })),
  addCatalog2Questionnaire: vi.fn(async () => ({ id: "novo" })),
  addCatalog2QuestionnaireQuestion: vi.fn(async () => ({})),
};
vi.mock("@/lib/api-client", () => ({ apiClient: new Proxy({}, { get: (_t, k: string) => (api as any)[k] }) }));
import { QuestionnaireEditor, QuestionnairePreview, questionnaireBody, type QuestionnaireState } from "./catalog2-questionnaire-builder";
import { QuestionnaireSection } from "./product-editor";
import { QUESTION_TYPES, emptyQuestion, draftFromServer, payloadFromDraft, cloneDraft, type QuestionDraft } from "./catalog2-questions-ui";

const d = (over: Partial<QuestionDraft> & { key: string; label: string }): QuestionDraft => ({ is_required: true, ...emptyQuestion(), ...over });
const state = (qs: QuestionDraft[], extra: Partial<QuestionnaireState> = {}): QuestionnaireState => ({ name: "Briefing", description: "", sections: [], questions: qs, is_global_model: false, ...extra });
const ctx = { steps: [{ key: "s1", name: "Configurar a conta" }], variations: [{ key: "v", name: "Porte", options: [{ key: "plus", label: "Plus" }] }], addons: [{ key: "rel", name: "Relatório" }] };
const act = vi.fn(async (fn: () => Promise<any>) => { try { return await fn(); } catch { return undefined; } });
beforeEach(() => { Object.values(api).forEach((f) => f.mockClear()); act.mockClear(); });

describe("Construtor · lista compacta e recolhível", () => {
  const three = [d({ key: "a", label: "Qual o site?", question_type: "url", id: "id-a-111111" }), d({ key: "b", label: "Quantos colaboradores?", question_type: "numero", is_required: false }), d({ key: "c", label: "Envie o logotipo", question_type: "imagem" })];

  it("cada pergunta aparece recolhida em UMA linha resumida (tipo, obrigatória, anexo) e expande para editar", () => {
    render(<QuestionnaireEditor initial={state(three)} ctx={ctx} saveLabel="Salvar" onSave={() => {}} />);
    const rows = screen.getAllByTestId("question-summary");
    expect(rows).toHaveLength(3);
    expect(screen.queryByTestId("question-body")).not.toBeInTheDocument();
    expect(within(rows[0]).getByText("URL (link)")).toBeInTheDocument();
    expect(within(rows[1]).getByText("opcional")).toBeInTheDocument();
    expect(within(rows[2]).getByText("anexo")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Expandir pergunta 1"));
    expect(screen.getAllByTestId("question-body")).toHaveLength(1);
    expect(screen.getByTestId("question-id").textContent).toBe("ID id-a-111");
    fireEvent.click(screen.getByText("Recolher todas")); expect(screen.queryByTestId("question-body")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Expandir todas")); expect(screen.getAllByTestId("question-body")).toHaveLength(3);
  });

  it("reordenar, duplicar (ID novo gerado ao salvar), ativar/desativar sem apagar e excluir", () => {
    const onSave = vi.fn();
    render(<QuestionnaireEditor initial={state(three)} ctx={ctx} saveLabel="Salvar" onSave={onSave} />);
    fireEvent.click(screen.getByLabelText("Descer pergunta 1"));
    expect(screen.getAllByTestId("question-summary")[0].textContent).toMatch(/1\. Quantos colaboradores/);
    fireEvent.click(screen.getByLabelText("Duplicar pergunta 2"));
    const labels = screen.getAllByTestId("question-summary").map((r) => r.textContent ?? "");
    expect(labels).toHaveLength(4);
    expect(labels[2]).toMatch(/Qual o site\? \(cópia\)/);
    // a cópia não leva o ID da original
    fireEvent.click(screen.getByLabelText("Expandir pergunta 3"));
    expect(screen.getByTestId("question-id").textContent).toBe("ID gerado ao salvar");
    fireEvent.click(screen.getByLabelText("Pergunta ativa")); // desativa a cópia
    expect(screen.getAllByTestId("question-item")[2].getAttribute("data-inactive")).toBe("true");
    fireEvent.click(screen.getByLabelText("Excluir pergunta 4"));
    expect(screen.getAllByTestId("question-item")).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    const body = questionnaireBody(onSave.mock.calls[0][0]);
    expect(body.questions.map((q: any) => q.key)).toEqual(["b", "a", "a-copia-2"]);
    expect(body.questions[1].id).toBe("id-a-111111");
    expect(body.questions[2].id).toBeUndefined();
    expect(body.questions[2].settings).toMatchObject({ is_active: false });
  });

  it("adicionar pergunta nova gera chave única; texto vazio não adiciona; salvar exige nome e perguntas", () => {
    const onSave = vi.fn();
    render(<QuestionnaireEditor initial={state([], { name: "" })} ctx={ctx} saveLabel="Criar e vincular" onSave={onSave} />);
    expect((screen.getByRole("button", { name: "Criar e vincular" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: /Adicionar pergunta/ }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("nova pergunta"), { target: { value: "Qual o objetivo?" } });
    fireEvent.click(screen.getByRole("button", { name: /Adicionar pergunta/ }));
    fireEvent.change(screen.getByLabelText("nova pergunta"), { target: { value: "Qual o objetivo?" } });
    fireEvent.click(screen.getByRole("button", { name: /Adicionar pergunta/ }));
    fireEvent.change(screen.getByLabelText("Nome do questionário"), { target: { value: "Novo" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar e vincular" }));
    const keys = onSave.mock.calls[0][0].questions.map((q: QuestionDraft) => q.key);
    expect(keys).toHaveLength(2); expect(new Set(keys).size).toBe(2);
  });

  it("seções: criar, nomear, descrever, ordenar e vincular perguntas a elas", () => {
    const onSave = vi.fn();
    render(<QuestionnaireEditor initial={state([d({ key: "a", label: "A" })])} ctx={ctx} saveLabel="Salvar" onSave={onSave} />);
    fireEvent.click(screen.getByText(/Seções \(0\)/));
    fireEvent.click(screen.getByRole("button", { name: /Nova seção/ })); fireEvent.click(screen.getByRole("button", { name: /Nova seção/ }));
    fireEvent.change(screen.getByLabelText("Nome da seção 1"), { target: { value: "Dados da empresa" } });
    fireEvent.change(screen.getByLabelText("Descrição da seção 1"), { target: { value: "Quem é o cliente" } });
    fireEvent.change(screen.getByLabelText("Nome da seção 2"), { target: { value: "Objetivos" } });
    fireEvent.click(screen.getByLabelText("Subir seção 2"));
    expect((screen.getByLabelText("Nome da seção 1") as HTMLInputElement).value).toBe("Objetivos");
    fireEvent.click(screen.getByLabelText("Expandir pergunta 1"));
    const sec = screen.getByLabelText("Seção da pergunta") as HTMLSelectElement;
    expect(Array.from(sec.options).map((o) => o.text)).toEqual(["Sem seção", "Objetivos", "Dados da empresa"]);
    fireEvent.change(sec, { target: { value: sec.options[2].value } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    const body = questionnaireBody(onSave.mock.calls[0][0]);
    expect(body.sections.map((s) => s.name)).toEqual(["Objetivos", "Dados da empresa"]);
    expect(body.sections[1].description).toBe("Quem é o cliente");
    expect((body.questions[0].settings as any).section_key).toBe(body.sections[1].key);
  });

  it("modelo global e IA: marcar como modelo global vai no estado; “sugerir mais” acrescenta perguntas sem repetir chave", async () => {
    const onSave = vi.fn();
    const suggest = vi.fn(async () => [d({ key: "a", label: "Sugestão da IA", question_type: "selecao_unica", opts: [{ label: "Sim", is_default: false }, { label: "Não", is_default: false }] })]);
    render(<QuestionnaireEditor initial={state([d({ key: "a", label: "A" })])} ctx={ctx} saveLabel="Salvar" onSave={onSave} onSuggest={suggest} />);
    fireEvent.click(screen.getByLabelText("Salvar como modelo global"));
    fireEvent.click(screen.getByTestId("ai-questionnaire-more"));
    expect(await screen.findByText(/1 pergunta\(s\) sugerida\(s\)/)).toBeInTheDocument();
    expect(suggest).toHaveBeenCalledWith(["A"]);
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    const saved = onSave.mock.calls[0][0] as QuestionnaireState;
    expect(saved.is_global_model).toBe(true);
    expect(new Set(saved.questions.map((q) => q.key)).size).toBe(2);
    expect(saved.questions[1].question_type).toBe("selecao_unica");
  });

  it("reutilizar pergunta existente (busca por nome ou ID) cria uma cópia com ID novo", async () => {
    render(<QuestionnaireEditor initial={state([d({ key: "a", label: "A" })])} ctx={ctx} saveLabel="Salvar" onSave={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Reutilizar pergunta existente/ }));
    fireEvent.change(screen.getByLabelText("Buscar pergunta existente"), { target: { value: "site" } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
    expect(await screen.findByText(/Briefing A · ID abc12345 · ID qq-12345|Briefing A/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Reutilizar$/ }));
    const rows = screen.getAllByTestId("question-summary");
    expect(rows).toHaveLength(2);
    expect(rows[1].textContent).toMatch(/Qual o site da empresa\?/);
    expect(screen.getByTestId("question-id").textContent).toBe("ID gerado ao salvar");
  });
});

describe("Construtor · tipos, opções, anexos e condições sem código", () => {
  it("oferece os 22 tipos de resposta pedidos", () => {
    const wanted = ["Texto curto", "Texto longo", "Número", "Moeda (valor em reais)", "Data", "Hora", "Data e hora", "Sim ou não", "Seleção única", "Seleção múltipla", "Lista suspensa", "Escala ou nota", "Telefone", "E-mail", "URL (link)", "Endereço", "Anexo de arquivo", "Imagem", "Vídeo", "Áudio", "Documento", "Aceite ou confirmação"];
    const labels = QUESTION_TYPES.map(([, l]) => l);
    for (const w of wanted) expect(labels, w).toContain(w);
    render(<QuestionnaireEditor initial={state([d({ key: "a", label: "A" })])} ctx={ctx} saveLabel="Salvar" onSave={() => {}} />);
    fireEvent.click(screen.getByLabelText("Expandir pergunta 1"));
    const select = screen.getByLabelText("Tipo da pergunta") as HTMLSelectElement;
    for (const w of wanted) expect(Array.from(select.options).map((o) => o.text), w).toContain(w);
  });

  it("opções: cadastrar, editar, excluir, ordenar, marcar padrão (única = só uma), “Outro” e mín./máx. de escolhas", () => {
    const onSave = vi.fn();
    render(<QuestionnaireEditor initial={state([d({ key: "a", label: "Escolha", question_type: "selecao_multipla", opts: [{ label: "Meta", is_default: false }, { label: "Google", is_default: false }] })])} ctx={ctx} saveLabel="Salvar" onSave={onSave} />);
    fireEvent.click(screen.getByLabelText("Expandir pergunta 1"));
    fireEvent.click(screen.getByRole("button", { name: /Adicionar opção/ }));
    fireEvent.change(screen.getByLabelText("Opção 3"), { target: { value: "TikTok" } });
    fireEvent.change(screen.getByLabelText("Opção 1"), { target: { value: "Meta Ads" } });
    fireEvent.click(screen.getByLabelText("Descer opção 1"));
    expect((screen.getByLabelText("Opção 1") as HTMLInputElement).value).toBe("Google");
    fireEvent.click(screen.getByLabelText("Excluir opção 1"));
    expect(screen.getAllByTestId("option-row")).toHaveLength(2);
    fireEvent.click(screen.getByLabelText("Opção 1 padrão"));
    fireEvent.click(screen.getByLabelText("Permitir a opção Outro"));
    fireEvent.change(screen.getByLabelText("Mínimo de escolhas"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Máximo de escolhas"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    const p: any = payloadFromDraft(onSave.mock.calls[0][0].questions[0]);
    expect(p.options).toEqual([{ value: "Meta Ads", label: "Meta Ads", is_default: true }, { value: "TikTok", label: "TikTok" }]);
    expect(p.settings).toMatchObject({ allow_other: true, min_choices: 1, max_choices: 2 });
  });

  it("seleção única aceita só UMA opção padrão", () => {
    render(<QuestionnaireEditor initial={state([d({ key: "a", label: "Escolha", question_type: "selecao_unica", opts: [{ label: "A", is_default: true }, { label: "B", is_default: false }] })])} ctx={ctx} saveLabel="Salvar" onSave={() => {}} />);
    fireEvent.click(screen.getByLabelText("Expandir pergunta 1"));
    fireEvent.click(screen.getByLabelText("Opção 2 padrão"));
    expect((screen.getByLabelText("Opção 1 padrão") as HTMLInputElement).checked).toBe(false);
    expect((screen.getByLabelText("Opção 2 padrão") as HTMLInputElement).checked).toBe(true);
  });

  it("anexos: permitir junto da resposta, tipos, quantidade, tamanho, descrição e obrigatoriedade viram a configuração salva", () => {
    const onSave = vi.fn();
    render(<QuestionnaireEditor initial={state([d({ key: "a", label: "Observações", question_type: "texto_longo" })])} ctx={ctx} saveLabel="Salvar" onSave={onSave} />);
    fireEvent.click(screen.getByLabelText("Expandir pergunta 1"));
    expect(screen.queryByTestId("attachment-config")).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Permitir anexos junto da resposta"));
    fireEvent.change(screen.getByLabelText("Tipos de arquivo permitidos"), { target: { value: ".pdf, .png" } });
    fireEvent.change(screen.getByLabelText("Quantidade máxima de anexos"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Tamanho máximo por arquivo em MB"), { target: { value: "10" } });
    fireEvent.click(screen.getByLabelText("Anexo obrigatório"));
    fireEvent.click(screen.getByLabelText("Exigir descrição do arquivo"));
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect((payloadFromDraft(onSave.mock.calls[0][0].questions[0]) as any).settings.attachments).toEqual({ allowed: true, required: true, require_description: true, accept: [".pdf", ".png"], max_files: 3, max_size_mb: 10 });
  });

  it("tipos de arquivo (imagem, vídeo…) já mostram as regras de anexo como resposta principal", () => {
    render(<QuestionnaireEditor initial={state([d({ key: "a", label: "Logo", question_type: "imagem" })])} ctx={ctx} saveLabel="Salvar" onSave={() => {}} />);
    fireEvent.click(screen.getByLabelText("Expandir pergunta 1"));
    expect(screen.getByTestId("attachment-config").textContent).toMatch(/Arquivo da resposta/);
    expect(screen.getByLabelText("Tipos de arquivo permitidos").parentElement!.textContent).toMatch(/\.jpg, \.png/);
  });

  it("condições sem código: escolher a pergunta, o operador e o valor — todos os 9 operadores disponíveis", () => {
    const onSave = vi.fn();
    render(<QuestionnaireEditor initial={state([d({ key: "a", label: "Usa Meta?", question_type: "sim_nao" }), d({ key: "b", label: "Qual a verba?", question_type: "numero" })])} ctx={ctx} saveLabel="Salvar" onSave={onSave} />);
    fireEvent.click(screen.getByLabelText("Expandir pergunta 2"));
    fireEvent.change(screen.getByLabelText("Quando a pergunta aparece"), { target: { value: "answer" } });
    const op = screen.getByLabelText("Operador da condição") as HTMLSelectElement;
    expect(Array.from(op.options).map((o) => o.value)).toEqual(["eq", "neq", "contains", "selected", "not_selected", "gt", "lt", "attached", "not_attached"]);
    fireEvent.change(screen.getByLabelText("Pergunta da condição"), { target: { value: "a" } });
    fireEvent.change(op, { target: { value: "contains" } });
    fireEvent.change(screen.getByLabelText("Valor da condição"), { target: { value: "sim" } });
    fireEvent.change(op, { target: { value: "attached" } });
    expect(screen.queryByLabelText("Valor da condição")).not.toBeInTheDocument();
    fireEvent.change(op, { target: { value: "gt" } });
    fireEvent.change(screen.getByLabelText("Valor da condição"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect((payloadFromDraft(onSave.mock.calls[0][0].questions[1]) as any).condition).toEqual({ source: "answer", ref: "a", operator: "gt", value: "3" });
  });

  it("escala, placeholder, validação e visibilidade (cliente, equipe, ambos) entram no corpo salvo", () => {
    const onSave = vi.fn();
    render(<QuestionnaireEditor initial={state([d({ key: "a", label: "Nota", question_type: "escala" }), d({ key: "b", label: "Nome", question_type: "texto_curto" })])} ctx={ctx} saveLabel="Salvar" onSave={onSave} />);
    fireEvent.click(screen.getByLabelText("Expandir pergunta 1"));
    fireEvent.change(screen.getByLabelText("Escala: início"), { target: { value: "0" } }); fireEvent.change(screen.getByLabelText("Escala: fim"), { target: { value: "10" } });
    fireEvent.click(screen.getByLabelText("Expandir pergunta 2"));
    const [, second] = screen.getAllByLabelText("Visibilidade da pergunta") as HTMLSelectElement[];
    expect(Array.from(second.options).map((o) => o.text)).toEqual(["Cliente", "Equipe interna", "Cliente e equipe", "Só interno"]);
    fireEvent.change(second, { target: { value: "both" } });
    fireEvent.change(screen.getByLabelText("Texto de exemplo"), { target: { value: "Ex.: Maria Silva" } });
    fireEvent.change(screen.getByLabelText("Mínimo de caracteres"), { target: { value: "3" } }); fireEvent.change(screen.getByLabelText("Máximo de caracteres"), { target: { value: "60" } });
    fireEvent.change(screen.getAllByLabelText("Valor padrão").pop()!, { target: { value: "Cliente" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    const [n, t] = onSave.mock.calls[0][0].questions.map((q: QuestionDraft) => payloadFromDraft(q) as any);
    expect(n.settings.scale).toEqual({ min: 0, max: 10 });
    expect(t).toMatchObject({ visibility: "both", default_value: "Cliente", validation: { min_length: 3, max_length: 60 } });
    expect(t.settings.placeholder).toBe("Ex.: Maria Silva");
  });

  it("ida e volta: a pergunta salva (com ID e configuração) reabre idêntica no formulário", () => {
    const server = { id: "id-1", key: "k", label: "Anexos", is_required: false, question_type: "texto_longo", help_text: "ajuda", options: [], default_value: null, validation: { max_length: 100 }, visibility: "both", answer_usage: "human", target_step_key: "s1", condition: { source: "answer", ref: "x", operator: "contains", value: "a" }, settings: { placeholder: "ex", is_active: false, section_key: "s1", attachments: { allowed: true, accept: [".pdf"], max_files: 2, max_size_mb: 5, require_description: true } } };
    const draft = draftFromServer(server);
    expect(draft).toMatchObject({ id: "id-1", is_active: false, att_allowed: true, att_accept: ".pdf", visibility: "both" });
    const p: any = payloadFromDraft(draft);
    expect(p).toMatchObject({ id: "id-1", visibility: "both", target_step_key: "s1", condition: { operator: "contains", value: "a" }, validation: { max_length: 100 } });
    expect(p.settings).toMatchObject({ placeholder: "ex", is_active: false, section_key: "s1", attachments: { allowed: true, accept: [".pdf"], max_files: 2, max_size_mb: 5, require_description: true } });
    expect(cloneDraft(draft, ["k"]).id).toBeUndefined();
  });
});

describe("Construtor · visualizar como o cliente", () => {
  it("mostra o questionário como o cliente vê (seções, obrigatórias, condição ao vivo e pendências) sem salvar nada", () => {
    const st = state([
      d({ key: "a", label: "Usa Meta Ads?", question_type: "sim_nao", section_key: "s1" }),
      d({ key: "b", label: "Qual a verba mensal?", question_type: "moeda", section_key: "s1", cond_source: "answer", cond_ref: "a", cond_operator: "eq", cond_value: "sim" }),
      d({ key: "c", label: "Pergunta desativada", is_active: false }),
    ], { sections: [{ key: "s1", name: "Mídia paga", description: "Sobre anúncios" }] });
    render(<QuestionnairePreview state={st} />);
    expect(screen.getByTestId("preview-section").textContent).toMatch(/Mídia paga.*Sobre anúncios/);
    expect(screen.getAllByTestId("preview-question")).toHaveLength(1);
    expect(screen.queryByText(/desativada/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Conferir pendências" }));
    expect(screen.getByTestId("preview-pending").textContent).toMatch(/1 pendência/);
    fireEvent.click(screen.getByLabelText("Sim"));
    expect(screen.getAllByTestId("preview-question")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Conferir pendências" }));
    expect(screen.getByTestId("preview-pending").textContent).toMatch(/1 pendência.*verba/);
    fireEvent.change(screen.getByPlaceholderText("0,00"), { target: { value: "1500" } });
    fireEvent.click(screen.getByRole("button", { name: "Conferir pendências" }));
    expect(screen.getByTestId("preview-ok")).toBeInTheDocument();
  });
});

describe("Questionário na tarefa · reutilização e proteção de modelo compartilhado", () => {
  const task = (q: any) => ({ id: "t1", steps: [{ key: "s1", name: "Etapa" }], questionnaire: q });
  const q = { id: "qn-aaaaaaaa11", name: "Briefing de tráfego", description: "d", revision: 3, is_global_model: true, sections: [], questions: [{ id: "x1", key: "a", label: "Pergunta A", is_required: true, question_type: "texto_curto", options: [], validation: {}, settings: {}, visibility: "client", answer_usage: "both" }] };
  const refs = (count: number) => ({ questionnaires: [{ id: "qn-aaaaaaaa11", task_count: count }] });

  it("sem questionário: oferece as 3 opções (selecionar existente, criar novo, gerar com IA)", () => {
    render(<QuestionnaireSection task={task(null)} refs={{ questionnaires: [] }} act={act} version={{}} readOnly={false} />);
    expect(screen.getByRole("button", { name: /Selecionar questionário existente/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Criar novo questionário/ })).toBeInTheDocument();
    expect(screen.getByTestId("ai-questionnaire").textContent).toMatch(/Gerar questionário com IA/);
  });

  it("selecionar existente: busca por ID/nome/produto/categoria/especialidade e vincula sincronizado OU como cópia independente", async () => {
    render(<QuestionnaireSection task={task(null)} refs={{ questionnaires: [] }} act={act} version={{}} readOnly={false} />);
    fireEvent.click(screen.getByRole("button", { name: /Selecionar questionário existente/ }));
    expect(await screen.findByText(/Briefing de tráfego/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Filtrar por produto"), { target: { value: "Gestão" } });
    fireEvent.change(screen.getByLabelText("Filtrar por categoria"), { target: { value: "Tráfego" } });
    fireEvent.change(screen.getByLabelText("Filtrar por especialidade"), { target: { value: "Gestor" } });
    fireEvent.change(screen.getByLabelText("Buscar questionário por nome ou ID"), { target: { value: "aaaaaaaa11" } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
    await waitFor(() => expect(api.getCatalog2Questionnaires).toHaveBeenLastCalledWith({ q: "aaaaaaaa11", product: "Gestão", category: "Tráfego", specialty: "Gestor", global: false }));
    fireEvent.click(screen.getByLabelText(/Briefing de tráfego/));
    expect((screen.getByLabelText("Vincular mantendo sincronizado") as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Vincular" }));
    await waitFor(() => expect(api.setCatalog2TaskQuestionnaire).toHaveBeenCalledWith("t1", "qn-aaaaaaaa11", "sync"));
    fireEvent.click(screen.getByLabelText("Criar uma cópia independente"));
    fireEvent.click(screen.getByRole("button", { name: "Vincular" }));
    await waitFor(() => expect(api.setCatalog2TaskQuestionnaire).toHaveBeenLastCalledWith("t1", "qn-aaaaaaaa11", "copy"));
  });

  it("modelo usado por 2+ tarefas: avisa e, ao salvar, pede a escolha entre editar o modelo (com confirmação) ou criar cópia", async () => {
    render(<QuestionnaireSection task={task(q)} refs={refs(3)} act={act} version={{}} readOnly={false} />);
    expect(screen.getByText(/usado por 3 tarefas/)).toBeInTheDocument();
    expect(screen.getByTestId("questionnaire-id").textContent).toBe("ID qn-aaaaa");
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    fireEvent.click(screen.getByLabelText("Expandir pergunta 1"));
    fireEvent.change(screen.getByLabelText("Texto da pergunta 1"), { target: { value: "Pergunta A alterada" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(api.updateCatalog2TaskQuestionnaireContent).not.toHaveBeenCalled(); // nada é gravado antes da escolha
    const choice = await screen.findByTestId("shared-choice");
    expect(choice.textContent).toMatch(/usado por 3 tarefas/);
    const editModel = screen.getByRole("button", { name: "Editar o modelo global" }) as HTMLButtonElement;
    expect(editModel.disabled).toBe(true);
    fireEvent.click(screen.getByLabelText(/Entendo que isto altera o modelo/));
    fireEvent.click(editModel);
    await waitFor(() => expect(api.updateCatalog2TaskQuestionnaireContent).toHaveBeenCalledTimes(1));
    const [, body] = api.updateCatalog2TaskQuestionnaireContent.mock.calls[0] as any[];
    expect(body).toMatchObject({ shared_mode: "edit_shared", confirm_shared: true });
    expect(body.questions[0]).toMatchObject({ id: "x1", label: "Pergunta A alterada" });
  });

  it("criar cópia independente: manda shared_mode=copy e o modelo/outros produtos não são tocados", async () => {
    render(<QuestionnaireSection task={task(q)} refs={refs(2)} act={act} version={{}} readOnly={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    fireEvent.click(await screen.findByRole("button", { name: /Criar uma cópia independente/ }));
    await waitFor(() => expect(api.updateCatalog2TaskQuestionnaireContent).toHaveBeenCalledTimes(1));
    expect((api.updateCatalog2TaskQuestionnaireContent.mock.calls[0] as any[])[1]).toMatchObject({ shared_mode: "copy" });
  });

  it("questionário de uso único salva direto (sem pergunta); duplicar e visualizar estão disponíveis", async () => {
    render(<QuestionnaireSection task={task(q)} refs={refs(1)} act={act} version={{}} readOnly={false} />);
    fireEvent.click(screen.getByRole("button", { name: /Duplicar/ }));
    await waitFor(() => expect(api.setCatalog2TaskQuestionnaire).toHaveBeenCalledWith("t1", "qn-aaaaaaaa11", "copy"));
    fireEvent.click(screen.getByRole("button", { name: /Visualizar como cliente/ }));
    expect(screen.getByTestId("questionnaire-preview")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(api.updateCatalog2TaskQuestionnaireContent).toHaveBeenCalledTimes(1));
    expect((api.updateCatalog2TaskQuestionnaireContent.mock.calls[0] as any[])[1].shared_mode).toBeUndefined();
    expect(api.setCatalog2QuestionnaireGlobal).toHaveBeenCalledWith("qn-aaaaaaaa11", true);
  });
});

describe("Layout · questionário e entregáveis em largura total e responsivo", () => {
  const src = readFileSync(path.join(__dirname, "product-editor.tsx"), "utf8");
  const builder = readFileSync(path.join(__dirname, "catalog2-questionnaire-builder.tsx"), "utf8");
  const fields = readFileSync(path.join(__dirname, "catalog2-questions-ui.tsx"), "utf8");
  it("os dois blocos ficam um ABAIXO do outro (coluna única, 100% da largura), não lado a lado", () => {
    const i = src.indexOf('data-testid="task-cards-stack"');
    expect(i).toBeGreaterThan(0);
    const block = src.slice(i - 120, i + 2600);
    expect(block).toMatch(/flex w-full min-w-0 flex-col/);
    expect(block.indexOf("Questionário de contratação")).toBeGreaterThan(0);
    expect(block.indexOf("Entregáveis")).toBeGreaterThan(block.indexOf("Questionário de contratação"));
    expect(block).not.toMatch(/lg:grid-cols-2/);
  });
  it("o construtor usa largura total e quebra em telas pequenas (min-w-0, flex-wrap, grid responsivo)", () => {
    expect(builder).toMatch(/w-full min-w-0 space-y-2/);
    expect(builder).toMatch(/flex flex-wrap items-center/);
    expect(fields).toMatch(/grid gap-2 sm:grid-cols-2 lg:grid-cols-4/);
    expect(fields).toMatch(/min-w-0/);
    expect(src).toMatch(/w-full min-w-0 space-y-2/);
  });
});
