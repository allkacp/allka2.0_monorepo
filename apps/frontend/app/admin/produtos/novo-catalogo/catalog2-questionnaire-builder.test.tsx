import { useState } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";

const api = {
  searchCatalog2QuestionLibrary: vi.fn(async () => ({ data: [{ id: "qq-1234567890", key: "site", label: "Qual o site da empresa?", question_type: "url", is_required: true, options: [], validation: {}, settings: { placeholder: "https://" }, from: "Briefing A · ID abc12345", questionnaire_id: "qa" }] })),
  getCatalog2Questionnaires: vi.fn(async () => ({ data: [{ id: "qn-aaaaaaaa11", name: "Briefing de tráfego", question_count: 4, task_count: 2, revision: 3, is_global_model: true, products: ["#1 Gestão de Tráfego"] }] })),
  setCatalog2TaskQuestionnaire: vi.fn(async () => ({ ok: true })),
  updateCatalog2TaskQuestionnaireContent: vi.fn(async () => ({ ok: true, forked: false, questionnaire: { id: "qn-aaaaaaaa11", is_global_model: true } })),
  setCatalog2QuestionnaireGlobal: vi.fn(async () => ({ ok: true })),
  suggestCatalog2TaskQuestionnaire: vi.fn(async () => ({ name: "IA", description: null, questions: [] })),
  addCatalog2Questionnaire: vi.fn(async () => ({ id: "novo" })),
  addCatalog2QuestionnaireQuestion: vi.fn(async () => ({})),
};
// A caixa de confirmação real depende do provedor de barra lateral do app: aqui usamos uma versão simples com o mesmo contrato.
vi.mock("@/components/confirmation-dialog", () => ({
  ConfirmationDialog: ({ open, title, message, confirmText, cancelText, onConfirm, onClose }: any) => open ? (<div role="alertdialog" aria-label={title}><h2>{title}</h2><div>{message}</div><button onClick={onClose}>{cancelText ?? "Cancelar"}</button><button onClick={() => void onConfirm()}>{confirmText ?? "Confirmar"}</button></div>) : null,
}));
vi.mock("@/hooks/useAppFrameMetrics", () => ({ useAppFrameMetrics: () => ({ top: 0, left: 0, width: 1000, height: 800, sidebarWidth: 72 }) }));
vi.mock("@/lib/api-client", () => ({ apiClient: new Proxy({}, { get: (_t, k: string) => (api as any)[k] }) }));
import { QuestionList, QuestionnaireEditor, QuestionnairePreview, questionnaireBody, type QuestionnaireState } from "./catalog2-questionnaire-builder";
import { QuestionnaireSection } from "./product-editor";
import { QUESTION_TYPES, emptyQuestion, draftFromServer, payloadFromDraft, cloneDraft, type QuestionDraft } from "./catalog2-questions-ui";

const d = (over: Partial<QuestionDraft> & { key: string; label: string }): QuestionDraft => ({ is_required: true, ...emptyQuestion(), ...over });
const state = (qs: QuestionDraft[], extra: Partial<QuestionnaireState> = {}): QuestionnaireState => ({ name: "Briefing", description: "", sections: [], questions: qs, is_global_model: false, ...extra });
const ctx = { steps: [{ key: "s1", name: "Configurar a conta" }], variations: [{ key: "v", name: "Porte", options: [{ key: "plus", label: "Plus" }] }], addons: [{ key: "rel", name: "Relatório" }] };
const act = vi.fn(async (fn: () => Promise<any>) => { try { return await fn(); } catch { return undefined; } });
beforeEach(() => { Object.values(api).forEach((f) => f.mockClear()); act.mockClear(); });

/** Lista controlada (como na página): guarda o último estado para conferir o que seria salvo. */
function Harness({ initial, sections = [], onSuggest }: { initial: QuestionDraft[]; sections?: QuestionnaireState["sections"]; onSuggest?: any }) {
  const [qs, setQs] = useState(initial);
  return <><QuestionList questions={qs} sections={sections} ctx={ctx} onChange={setQs} onSuggest={onSuggest} /><output data-testid="payload">{JSON.stringify(qs.map((q) => payloadFromDraft(q)))}</output><output data-testid="state">{JSON.stringify(qs.map((q) => ({ key: q.key, label: q.label, id: q.id ?? null, active: q.is_active, req: q.is_required })))}</output></>;
}
const stateOut = () => JSON.parse(screen.getByTestId("state").textContent!) as { key: string; label: string; id: string | null; active: boolean; req: boolean }[];
const ensureOpen = (i: number) => { const b = screen.queryByLabelText(`Expandir pergunta ${i}`); if (b) fireEvent.click(b); };
const openEdit = (i: number) => { ensureOpen(i); fireEvent.click(screen.getByLabelText(`Editar pergunta ${i}`)); };
const modal = () => within(screen.getByTestId("question-modal"));

describe("Questionário · estilo da plataforma antiga (lista pronta + modal)", () => {
  const three = [d({ key: "a", label: "Tema das postagens:", question_type: "texto_longo", help_text: "qual o tema que deverá ser desenvolvido pelo nômade?", id: "id-a-111111" }), d({ key: "b", label: "Quantos colaboradores?", question_type: "numero", is_required: false }), d({ key: "c", label: "Envie o logotipo", question_type: "imagem" })];

  it("na página só aparece o questionário PRONTO: linhas numeradas recolhidas, sem nenhum campo de formulário", () => {
    render(<Harness initial={three} />);
    const rows = screen.getAllByTestId("question-summary");
    expect(rows).toHaveLength(3);
    expect(rows[0].textContent).toMatch(/1ª Tema das postagens:/);
    expect(rows[2].textContent).toMatch(/3ª Envie o logotipo/);
    expect(screen.queryByTestId("question-body")).not.toBeInTheDocument();
    expect(document.querySelectorAll("input[type=text], textarea, select").length).toBe(0);
    expect(screen.getByRole("button", { name: /Adicionar/ })).toBeInTheDocument();
  });

  it("sem abrir/fechar: o ícone de info mostra tipo, anexo?, obrigatória? e instruções; editar/excluir/duplicar/setas ficam na própria linha", () => {
    render(<Harness initial={three} />);
    expect(screen.queryByLabelText("Expandir pergunta 1")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Editar pergunta 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Excluir pergunta 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Duplicar pergunta 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Descer pergunta 1")).toBeInTheDocument();
    fireEvent.focus(screen.getByLabelText("Informações da pergunta 1"));
    const info = within(screen.getAllByTestId("question-info")[0]);
    expect(info.getAllByText("Tipo da resposta").length).toBeGreaterThan(0);
    expect(info.getAllByText("Texto longo").length).toBeGreaterThan(0);
    expect(info.getAllByText(/Anexo na pergunta?/).length).toBeGreaterThan(0);
    expect(info.getAllByText("NÃO").length).toBeGreaterThan(0);
    expect(info.getAllByText(/Pergunta obrigatória?/).length).toBeGreaterThan(0);
    expect(info.getAllByText("SIM").length).toBeGreaterThan(0);
    expect(info.getAllByText(/qual o tema que deverá ser desenvolvido/).length).toBeGreaterThan(0);
  });

  it("excluir e duplicar pedem confirmação antes de agir", () => {
    render(<Harness initial={three} />);
    fireEvent.click(screen.getByLabelText("Duplicar pergunta 1"));
    expect(screen.getByText("Duplicar pergunta?")).toBeInTheDocument();
    expect(stateOut()).toHaveLength(3); // nada mudou ainda
    fireEvent.click(screen.getByRole("button", { name: "Duplicar pergunta" }));
    expect(stateOut()).toHaveLength(4);
  });

  it("“+ Adicionar” abre o modal “Nova Pergunta”; salvar acrescenta a pergunta na lista (chave única); cancelar não muda nada", () => {
    render(<Harness initial={three} />);
    fireEvent.click(screen.getByRole("button", { name: /Adicionar/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Nova Pergunta")).toBeInTheDocument();
    expect((screen.getByRole("button", { name: "Salvar" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Texto da pergunta"), { target: { value: "Qual o objetivo?" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(stateOut().map((x) => x.label)).toEqual(["Tema das postagens:", "Quantos colaboradores?", "Envie o logotipo", "Qual o objetivo?"]);
    expect(new Set(stateOut().map((x) => x.key)).size).toBe(4);
    fireEvent.click(screen.getByRole("button", { name: /Adicionar/ }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(stateOut()).toHaveLength(4);
  });

  it("o lápis abre “Editar Pergunta” com o ID permanente; editar mantém o ID; cancelar descarta", () => {
    render(<Harness initial={three} />);
    openEdit(1);
    expect(screen.getByText("Editar Pergunta")).toBeInTheDocument();
    expect(screen.getByTestId("question-id").textContent).toBe("ID id-a-111");
    expect((screen.getByLabelText("Texto da pergunta") as HTMLInputElement).value).toBe("Tema das postagens:");
    expect((screen.getByLabelText("Instrução de resposta") as HTMLTextAreaElement).value).toMatch(/qual o tema/);
    fireEvent.change(screen.getByLabelText("Texto da pergunta"), { target: { value: "Tema (editado)" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(stateOut()[0].label).toBe("Tema das postagens:");
    openEdit(1);
    fireEvent.change(screen.getByLabelText("Texto da pergunta"), { target: { value: "Tema (editado)" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(stateOut()[0]).toMatchObject({ label: "Tema (editado)", id: "id-a-111111" });
  });

  it("reordenar (setas), duplicar (ID novo gerado ao salvar), excluir com confirmação e ativar/desativar sem apagar", async () => {
    render(<Harness initial={three} />);
    fireEvent.click(screen.getByLabelText("Descer pergunta 1"));
    expect(stateOut().map((x) => x.key)).toEqual(["b", "a", "c"]);
    // a pergunta "a" agora é a 2ª (continua aberta): duplica
    fireEvent.click(screen.getByLabelText("Duplicar pergunta 2"));
    fireEvent.click(screen.getByRole("button", { name: "Duplicar pergunta" }));
    const dup = stateOut();
    expect(dup).toHaveLength(4);
    expect(dup[2].label).toMatch(/(cópia)/);
    expect(dup[2].id).toBeNull();
    // desativar pelo modal (não apaga)
    openEdit(2);
    fireEvent.click(modal().getByLabelText("Pergunta ativa"));
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(stateOut()[1].active).toBe(false);
    expect(screen.getAllByTestId("question-item")[1].getAttribute("data-inactive")).toBe("true");
    // excluir pede confirmação
    ensureOpen(4);
    fireEvent.click(screen.getByLabelText("Excluir pergunta 4"));
    expect(await screen.findByText("Excluir pergunta?")).toBeInTheDocument();
    expect(stateOut()).toHaveLength(4);
    fireEvent.click(screen.getByRole("button", { name: "Excluir pergunta" }));
    await waitFor(() => expect(stateOut()).toHaveLength(3));
  });

  it("arrastar pela alça reordena; as linhas são arrastáveis", () => {
    render(<Harness initial={three} />);
    const items = screen.getAllByTestId("question-item");
    expect(items[0].getAttribute("draggable")).toBe("true");
    fireEvent.dragStart(items[0]); fireEvent.dragOver(items[2]); fireEvent.drop(items[2]);
    expect(stateOut().map((x) => x.key)).toEqual(["b", "c", "a"]);
  });

  it("reutilizar pergunta existente (busca por nome ou ID) abre o modal já preenchido; salvar cria cópia com ID novo", async () => {
    render(<Harness initial={[d({ key: "a", label: "A" })]} />);
    fireEvent.click(screen.getByRole("button", { name: /Reutilizar pergunta existente/ }));
    fireEvent.change(screen.getByLabelText("Buscar pergunta existente"), { target: { value: "site" } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
    expect(await screen.findByText(/Briefing A/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Reutilizar$/ }));
    expect((screen.getByLabelText("Texto da pergunta") as HTMLInputElement).value).toBe("Qual o site da empresa?");
    expect(screen.getByTestId("question-id").textContent).toBe("ID gerado ao salvar");
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(stateOut()).toHaveLength(2);
    expect(stateOut()[1].id).toBeNull();
  });

  it("IA: “sugerir mais perguntas” acrescenta sem repetir chave", async () => {
    const suggest = vi.fn(async () => [d({ key: "a", label: "Sugestão da IA", question_type: "selecao_unica", opts: [{ label: "Sim", is_default: false }, { label: "Não", is_default: false }] })]);
    render(<Harness initial={[d({ key: "a", label: "A" })]} onSuggest={suggest} />);
    fireEvent.click(screen.getByTestId("ai-questionnaire-more"));
    expect(await screen.findByText(/1 pergunta\(s\) sugerida\(s\)/)).toBeInTheDocument();
    expect(suggest).toHaveBeenCalledWith(["A"]);
    expect(new Set(stateOut().map((x) => x.key)).size).toBe(2);
  });
});

describe("Modal da pergunta · tipos, opções, anexos e condições sem código", () => {
  const edit = (q: QuestionDraft, others: QuestionDraft[] = []) => {
    render(<Harness initial={[q, ...others]} />);
    openEdit(1);
  };
  /** Salva o modal da pergunta 1 e devolve o corpo (payload) que iria para a API. */
  const questionnaireBodyFromModal = (): any => { fireEvent.click(screen.getByRole("button", { name: "Salvar" })); const p = JSON.parse(screen.getByTestId("payload").textContent!)[0]; fireEvent.click(screen.getByLabelText("Editar pergunta 1")); return p; };

  it("oferece os 22 tipos de resposta pedidos", () => {
    const wanted = ["Texto curto", "Texto longo", "Número", "Moeda (valor em reais)", "Data", "Hora", "Data e hora", "Sim ou não", "Seleção única", "Seleção múltipla", "Lista suspensa", "Escala ou nota", "Telefone", "E-mail", "URL (link)", "Endereço", "Anexo de arquivo", "Imagem", "Vídeo", "Áudio", "Documento", "Aceite ou confirmação"];
    const labels = QUESTION_TYPES.map(([, l]) => l);
    for (const w of wanted) expect(labels, w).toContain(w);
    edit(d({ key: "a", label: "A" }));
    const select = screen.getByLabelText("Tipo da pergunta") as HTMLSelectElement;
    for (const w of wanted) expect(Array.from(select.options).map((o) => o.text), w).toContain(w);
  });

  it("opções: cadastrar, editar, excluir, ordenar, marcar padrão, “Outro” e mín./máx. de escolhas", () => {
    edit(d({ key: "a", label: "Escolha", question_type: "selecao_multipla", opts: [{ label: "Meta", is_default: false }, { label: "Google", is_default: false }] }));
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
    // lê o que seria salvo pelo corpo do modal
    const body = questionnaireBodyFromModal();
    expect(body.options).toEqual([{ value: "Meta Ads", label: "Meta Ads", is_default: true }, { value: "TikTok", label: "TikTok" }]);
    expect(body.settings).toMatchObject({ allow_other: true, min_choices: 1, max_choices: 2 });
  });

  it("seleção única aceita só UMA opção padrão", () => {
    edit(d({ key: "a", label: "Escolha", question_type: "selecao_unica", opts: [{ label: "A", is_default: true }, { label: "B", is_default: false }] }));
    fireEvent.click(screen.getByLabelText("Opção 2 padrão"));
    expect((screen.getByLabelText("Opção 1 padrão") as HTMLInputElement).checked).toBe(false);
    expect((screen.getByLabelText("Opção 2 padrão") as HTMLInputElement).checked).toBe(true);
  });

  it("anexos: permitir junto da resposta, tipos, quantidade, tamanho, descrição e obrigatoriedade", () => {
    edit(d({ key: "a", label: "Observações", question_type: "texto_longo" }));
    expect(screen.queryByTestId("attachment-config")).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Permitir anexos junto da resposta"));
    fireEvent.change(screen.getByLabelText("Tipos de arquivo permitidos"), { target: { value: ".pdf, .png" } });
    fireEvent.change(screen.getByLabelText("Quantidade máxima de anexos"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Tamanho máximo por arquivo em MB"), { target: { value: "10" } });
    fireEvent.click(screen.getByLabelText("Anexo obrigatório"));
    fireEvent.click(screen.getByLabelText("Exigir descrição do arquivo"));
    expect(questionnaireBodyFromModal().settings.attachments).toEqual({ allowed: true, required: true, require_description: true, accept: [".pdf", ".png"], max_files: 3, max_size_mb: 10 });
  });

  it("tipos de arquivo (imagem, vídeo…) mostram as regras de anexo como resposta principal", () => {
    edit(d({ key: "a", label: "Logo", question_type: "imagem" }));
    expect(screen.getByTestId("attachment-config").textContent).toMatch(/Arquivo da resposta/);
    expect(screen.getByLabelText("Tipos de arquivo permitidos").parentElement!.textContent).toMatch(/\.jpg, \.png/);
  });

  it("condição por resposta anterior vai no corpo salvo (igual, contém, maior que, anexado…)", () => {
    render(<Harness initial={[d({ key: "a", label: "Usa Meta?", question_type: "sim_nao" }), d({ key: "b", label: "Qual a verba?", question_type: "numero" })]} />);
    fireEvent.click(screen.getByLabelText("Editar pergunta 2"));
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
    expect(screen.getAllByTestId("question-item")[1].textContent).toMatch(/condicional/);
  });

  it("escala, placeholder, validação e visibilidade (cliente, equipe, ambos)", () => {
    edit(d({ key: "a", label: "Nome", question_type: "texto_curto" }));
    // R21-13 (reunião 21/10): "Quem vê" virou caixas de marcar com atalho Todos; guarda nos mesmos valores (client, team, both, internal).
    fireEvent.click(screen.getByTestId("question-audience"));
    fireEvent.click(screen.getByLabelText("Todos")); // cliente + equipe = both
    fireEvent.change(screen.getByLabelText("Texto de exemplo"), { target: { value: "Ex.: Maria Silva" } });
    fireEvent.change(screen.getByLabelText("Mínimo de caracteres"), { target: { value: "3" } }); fireEvent.change(screen.getByLabelText("Máximo de caracteres"), { target: { value: "60" } });
    fireEvent.change(screen.getByLabelText("Valor padrão"), { target: { value: "Cliente" } });
    const t = questionnaireBodyFromModal();
    expect(t).toMatchObject({ visibility: "both", default_value: "Cliente", validation: { min_length: 3, max_length: 60 } });
    expect(t.settings.placeholder).toBe("Ex.: Maria Silva");
    fireEvent.change(screen.getByLabelText("Tipo da pergunta"), { target: { value: "escala" } });
    fireEvent.change(screen.getByLabelText("Escala: início"), { target: { value: "0" } }); fireEvent.change(screen.getByLabelText("Escala: fim"), { target: { value: "10" } });
    expect(questionnaireBodyFromModal().settings.scale).toEqual({ min: 0, max: 10 });
  });

  it("ida e volta: a pergunta salva (com ID e configuração) reabre idêntica", () => {
    const server = { id: "id-1", key: "k", label: "Anexos", is_required: false, question_type: "texto_longo", help_text: "ajuda", options: [], default_value: null, validation: { max_length: 100 }, visibility: "both", answer_usage: "human", target_step_key: "s1", condition: { source: "answer", ref: "x", operator: "contains", value: "a" }, settings: { placeholder: "ex", is_active: false, section_key: "s1", attachments: { allowed: true, accept: [".pdf"], max_files: 2, max_size_mb: 5, require_description: true } } };
    const draft = draftFromServer(server);
    expect(draft).toMatchObject({ id: "id-1", is_active: false, att_allowed: true, att_accept: ".pdf", visibility: "both" });
    const p: any = payloadFromDraft(draft);
    expect(p).toMatchObject({ id: "id-1", visibility: "both", target_step_key: "s1", condition: { operator: "contains", value: "a" }, validation: { max_length: 100 } });
    expect(p.settings).toMatchObject({ placeholder: "ex", is_active: false, section_key: "s1", attachments: { allowed: true, accept: [".pdf"], max_files: 2, max_size_mb: 5, require_description: true } });
    expect(cloneDraft(draft, ["k"]).id).toBeUndefined();
  });
});

describe("Criar questionário novo (modal) e dados do questionário", () => {
  it("“Criar novo questionário” abre um modal com Dados do questionário + Perguntas; salva com seções, modelo global e perguntas", () => {
    const onSave = vi.fn();
    render(<QuestionnaireEditor initial={state([], { name: "" })} ctx={ctx} saveLabel="Criar e vincular" onSave={onSave} />);
    expect(screen.getByText("Dados do questionário")).toBeInTheDocument();
    expect((screen.getByRole("button", { name: "Criar e vincular" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Nome do questionário"), { target: { value: "5 Postagens" } });
    fireEvent.click(screen.getByRole("button", { name: /Editar dados e seções/ }));
    expect(screen.getByTestId("questionnaire-data-modal")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Nova seção/ })); fireEvent.click(screen.getByRole("button", { name: /Nova seção/ }));
    fireEvent.change(screen.getByLabelText("Nome da seção 1"), { target: { value: "Dados da empresa" } });
    fireEvent.change(screen.getByLabelText("Descrição da seção 1"), { target: { value: "Quem é o cliente" } });
    fireEvent.change(screen.getByLabelText("Nome da seção 2"), { target: { value: "Objetivos" } });
    fireEvent.click(screen.getByLabelText("Subir seção 2"));
    expect((screen.getByLabelText("Nome da seção 1") as HTMLInputElement).value).toBe("Objetivos");
    fireEvent.click(screen.getByLabelText("Salvar como modelo global"));
    fireEvent.click(within(screen.getByTestId("questionnaire-data-modal")).getByRole("button", { name: "Salvar" }));
    fireEvent.click(screen.getByRole("button", { name: /Adicionar/ }));
    fireEvent.change(screen.getByLabelText("Texto da pergunta"), { target: { value: "Qual o objetivo?" } });
    fireEvent.change(screen.getByLabelText("Seção da pergunta"), { target: { value: (screen.getByLabelText("Seção da pergunta") as HTMLSelectElement).options[2].value } });
    fireEvent.click(within(screen.getByTestId("question-modal")).getByRole("button", { name: "Salvar" }));
    fireEvent.click(screen.getByRole("button", { name: "Criar e vincular" }));
    const saved = onSave.mock.calls[0][0] as QuestionnaireState;
    const body = questionnaireBody(saved);
    expect(saved.is_global_model).toBe(true);
    expect(body.sections.map((s) => s.name)).toEqual(["Objetivos", "Dados da empresa"]);
    expect(body.sections[1].description).toBe("Quem é o cliente");
    expect(body.questions).toHaveLength(1);
    expect((body.questions[0].settings as any).section_key).toBe(body.sections[1].key);
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

  it("criar novo questionário abre um MODAL (nada de formulário aberto na página)", () => {
    render(<QuestionnaireSection task={task(null)} refs={{ questionnaires: [] }} act={act} version={{}} readOnly={false} />);
    expect(screen.queryByTestId("questionnaire-editor")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Criar novo questionário/ }));
    expect(within(screen.getByRole("dialog")).getByTestId("questionnaire-editor")).toBeInTheDocument();
    expect(screen.getByText("Novo questionário")).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("button", { name: "Vincular" }));
    await waitFor(() => expect(api.setCatalog2TaskQuestionnaire).toHaveBeenCalledWith("t1", "qn-aaaaaaaa11", "sync"));
    fireEvent.click(screen.getByLabelText("Criar uma cópia independente"));
    fireEvent.click(screen.getByRole("button", { name: "Vincular" }));
    await waitFor(() => expect(api.setCatalog2TaskQuestionnaire).toHaveBeenLastCalledWith("t1", "qn-aaaaaaaa11", "copy"));
  });

  it("com questionário vinculado a página mostra só a lista pronta; editar uma pergunta no modal grava na hora (uso único)", async () => {
    render(<QuestionnaireSection task={task(q)} refs={refs(1)} act={act} version={{}} readOnly={false} />);
    expect(screen.getByTestId("questionnaire-id").textContent).toBe("ID qn-aaaaa");
    expect(screen.getByTestId("question-list")).toBeInTheDocument();
    expect(document.querySelectorAll("input[type=text], textarea, select").length).toBe(0);
    fireEvent.click(screen.getByLabelText("Editar pergunta 1"));
    fireEvent.change(screen.getByLabelText("Texto da pergunta"), { target: { value: "Pergunta A alterada" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(api.updateCatalog2TaskQuestionnaireContent).toHaveBeenCalledTimes(1));
    const [, body] = api.updateCatalog2TaskQuestionnaireContent.mock.calls[0] as any[];
    expect(body.shared_mode).toBeUndefined();
    expect(body.questions[0]).toMatchObject({ id: "x1", label: "Pergunta A alterada" });
  });

  it("modelo usado por 2+ tarefas: avisa e, ao salvar uma pergunta, pede a escolha (cópia ou editar o modelo com confirmação)", async () => {
    render(<QuestionnaireSection task={task(q)} refs={refs(3)} act={act} version={{}} readOnly={false} />);
    expect(screen.getByText(/usado por 3 tarefas/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Editar pergunta 1"));
    fireEvent.change(screen.getByLabelText("Texto da pergunta"), { target: { value: "Pergunta A alterada" } });
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

  it("criar cópia independente: manda shared_mode=copy", async () => {
    render(<QuestionnaireSection task={task(q)} refs={refs(2)} act={act} version={{}} readOnly={false} />);
    fireEvent.click(screen.getByLabelText("Editar pergunta 1"));
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    fireEvent.click(await screen.findByRole("button", { name: /Criar uma cópia independente/ }));
    await waitFor(() => expect(api.updateCatalog2TaskQuestionnaireContent).toHaveBeenCalledTimes(1));
    expect((api.updateCatalog2TaskQuestionnaireContent.mock.calls[0] as any[])[1]).toMatchObject({ shared_mode: "copy" });
  });

  it("duplicar, visualizar como cliente e “Dados e seções” (modal) estão disponíveis", async () => {
    render(<QuestionnaireSection task={task(q)} refs={refs(1)} act={act} version={{}} readOnly={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Duplicar" }));
    await waitFor(() => expect(api.setCatalog2TaskQuestionnaire).toHaveBeenCalledWith("t1", "qn-aaaaaaaa11", "copy"));
    fireEvent.click(screen.getByRole("button", { name: /Visualizar como cliente/ }));
    expect(screen.getByTestId("questionnaire-preview")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Dados e seções/ }));
    fireEvent.click(screen.getByLabelText("Salvar como modelo global")); // desmarca
    fireEvent.click(within(screen.getByTestId("questionnaire-data-modal")).getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(api.updateCatalog2TaskQuestionnaireContent).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(api.setCatalog2QuestionnaireGlobal).toHaveBeenCalledWith("qn-aaaaaaaa11", false));
  });

  it("somente leitura: lista pronta sem botões de editar/adicionar", () => {
    render(<QuestionnaireSection task={task(q)} refs={refs(1)} act={act} version={{}} readOnly />);
    expect(screen.queryByRole("button", { name: /Adicionar/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Editar pergunta 1")).not.toBeInTheDocument();
  });
});

describe("Layout e modais · questionário e etapas", () => {
  const src = readFileSync(path.join(__dirname, "product-editor.tsx"), "utf8");
  it("Questionário fica em coluna única (100% da largura) e os Entregáveis/Fluxo abrem em Painel Moldura", () => {
    const i = src.indexOf('data-testid="task-cards-stack"');
    expect(i).toBeGreaterThan(0);
    const block = src.slice(i - 120, i + 2600);
    expect(block).toMatch(/flex w-full min-w-0 flex-col/);
    expect(block).not.toMatch(/lg:grid-cols-2/);
    // 20/10: entregáveis viram um botão (Painel Moldura) no resumo da tarefa; o fluxo das etapas abre por um botão no cartão das etapas
    expect(src).toMatch(/<PanelCard number={nb\(i\)\.d} icon={UploadCloud} title="Entregáveis da tarefa"/);
    expect(src).toMatch(/data-testid="open-step-flow"/);
    expect(src.slice(i, i + 1200)).not.toMatch(/title="Fluxo das etapas"/);
  });
  it("etapas: a ficha pronta fica na página e “Editar”/“Nova etapa” abrem MODAL", () => {
    const edit = src.indexOf('data-testid="step-edit-form"');
    expect(src.slice(edit - 600, edit)).toMatch(/<FramedPanel open onOpenChange/);
    expect(src).toMatch(/<DialogTitle>Nova etapa<\/DialogTitle>/);
    expect(src).toMatch(/data-testid="step-create-modal"/);
  });
  it("etapas: sem acordeão — o cabeçalho tem Ver e Editar lado a lado e o Ver abre a Janela Moldura da etapa", () => {
    const header = src.indexOf('data-testid="step-header"');
    const viewBtn = src.indexOf('data-testid="step-view-btn"');
    const editBtn = src.indexOf('data-testid="step-edit-btn"');
    const modal = src.indexOf('testId="step-view-modal"', header);
    expect(header).toBeGreaterThan(0);
    expect(viewBtn).toBeGreaterThan(header);
    expect(editBtn).toBeGreaterThan(viewBtn);
    expect(modal).toBeGreaterThan(editBtn);
    expect(src.slice(modal - 200, modal)).toMatch(/<FramedModal open onOpenChange=\{setOpen\}/);
    expect(src).toMatch(/section-number-badge[^"]*"[^>]*data-testid="step-number"|data-testid="step-number"/);
  });
  it("modal da etapa: os 5 blocos são acordeões (StepBlock) e o rodapé tem Cancelar, Salvar rascunho da etapa e Concluir e salvar etapa", () => {
    const edit = src.indexOf('data-testid="step-edit-form"');
    const form = src.slice(edit, edit + 60000);
    for (const t of ["O que é esta etapa", "Quem faz e quanto tempo leva", "Quando a etapa termina", "Checklist, orientações e evidência", "Conexões e acessos desta etapa"]) expect(form).toContain(t);
    for (const n of [1, 2, 3, 4, 5]) expect(form).toContain("<StepBlock n={" + n + "}");
    expect(form).toContain("Salvar rascunho da etapa");
    expect(form).toContain("Concluir e salvar etapa");
  });
});

// R21-17: sessões do questionário em ACORDEÃO (abrir/fechar a sessão), com as perguntas agrupadas.
describe("Questionário em sessões (acordeão)", () => {
  const qs = [
    d({ key: "a", label: "Qual o objetivo?", section_key: "s1" }),
    d({ key: "b", label: "Qual o orçamento?", section_key: "s1" }),
    d({ key: "c", label: "Nome da empresa", section_key: "s2" }),
    d({ key: "x", label: "Observações gerais" }),
  ];
  const secs = [{ key: "s1", name: "Objetivos", description: "" }, { key: "s2", name: "Dados da empresa", description: "" }];

  it("arrastar uma pergunta para outra sessão muda a sessão dela e a numeração recomeça em cada sessão", () => {
    render(<Harness initial={qs} sections={secs} />);
    const itens = () => screen.getAllByTestId("question-item");
    // "Qual o objetivo?" (1ª da sessão Objetivos) vai para a sessão "Dados da empresa", sobre "Nome da empresa".
    fireEvent.dragStart(itens()[0]);
    fireEvent.dragOver(itens()[2]);
    fireEvent.drop(itens()[2]);
    const heads = screen.getAllByTestId("question-section");
    expect(heads.map((h) => h.textContent)).toEqual(["Objetivos1 pergunta(s)", "Dados da empresa2 pergunta(s)", "Sem sessão1 pergunta(s)"]);
    const lista = within(screen.getByTestId("question-list"));
    expect(lista.getByText(/1ª Qual o orçamento/)).toBeInTheDocument();
    expect(lista.getByText(/1ª Nome da empresa/)).toBeInTheDocument();
    expect(lista.getByText(/2ª Qual o objetivo/)).toBeInTheDocument();
    expect(lista.getByText(/1ª Observações gerais/)).toBeInTheDocument();
  });

  it("soltar uma pergunta sobre o título de uma sessão vazia a coloca nela", () => {
    render(<Harness initial={[d({ key: "a", label: "Primeira", section_key: "s1" })]} sections={secs} />);
    fireEvent.dragStart(screen.getAllByTestId("question-item")[0]);
    const heads = screen.getAllByTestId("question-section");
    fireEvent.dragOver(heads[1]);
    fireEvent.drop(heads[1]);
    expect(screen.getAllByTestId("question-section").map((h) => h.textContent)).toEqual(["Objetivos0 pergunta(s)", "Dados da empresa1 pergunta(s)"]);
  });

  it("agrupa por sessão, numera dentro de cada sessão e fecha/abre a sessão", () => {
    render(<Harness initial={qs} sections={secs} />);
    const heads = screen.getAllByTestId("question-section");
    expect(heads.map((h) => h.textContent)).toEqual(["Objetivos2 pergunta(s)", "Dados da empresa1 pergunta(s)", "Sem sessão1 pergunta(s)"]);
    expect(screen.getAllByTestId("question-summary")).toHaveLength(4);
    fireEvent.click(screen.getByLabelText("Fechar sessão Objetivos"));
    expect(screen.getAllByTestId("question-summary")).toHaveLength(2);
    const lista = within(screen.getByTestId("question-list"));
    expect(lista.queryByText(/Qual o objetivo/)).toBeNull();
    expect(lista.getByText(/1ª Nome da empresa/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Abrir sessão Objetivos"));
    expect(screen.getAllByTestId("question-summary")).toHaveLength(4);
  });

  it("sem sessões cadastradas a lista continua simples, sem cabeçalhos", () => {
    render(<Harness initial={qs} />);
    expect(screen.queryAllByTestId("question-section")).toHaveLength(0);
    expect(screen.getAllByTestId("question-summary")).toHaveLength(4);
  });
});
