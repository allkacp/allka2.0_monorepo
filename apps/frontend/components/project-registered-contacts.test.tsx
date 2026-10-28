import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
const { api } = vi.hoisted(() => ({ api: { getProjectContactOptions: vi.fn(), createAgencyUser: vi.fn(), createCompanyUser: vi.fn(), createClientRecord: vi.fn() } }));
vi.mock("@/lib/api-client", () => ({ apiClient: api }));
vi.mock("@/hooks/useAppFrameMetrics", () => ({ useAppFrameMetrics: () => ({ sidebarWidth: 200 }) }));
import { ProjectRegisteredContacts, type RegisteredContactFields } from "./project-registered-contacts";
function Harness() {
  const [value, setValue] = useState<RegisteredContactFields>({ consultorId: "", clientRecordId: "", consultor: "", emailConsultor: "", cliente: "", clienteEmail: "", clienteCnpj: "" });
  return <><ProjectRegisteredContacts ownerId="agency-1" ownerType="agency" ownerName="Empresa cadastrada" value={value} onChange={fields => setValue(prev => ({ ...prev, ...fields }))} /><output data-testid="contact-ids">{value.consultorId}/{value.clientRecordId}</output></>;
}
beforeEach(() => {
  vi.resetAllMocks();
  api.getProjectContactOptions.mockResolvedValue({ data: [] });
  api.createAgencyUser.mockResolvedValue({ id: "u-new", name: "Novo consultor", email: "new@example.test" });
  api.createClientRecord.mockResolvedValue({ id: "c-new", name: "Novo cliente", email: "client@example.test" });
});
afterEach(cleanup);
describe("Consultor e cliente são cadastros vinculados reais", () => {
  it("mostra e oculta cada senha separadamente, sem enviar o cadastro", async () => {
    const user = userEvent.setup(); render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Cadastrar consultor" }));
    const dialog = within(screen.getByTestId("project-contact-create"));
    const password = dialog.getByLabelText("Senha de acesso *"), confirmation = dialog.getByLabelText("Confirmar senha *");
    expect(password).toHaveAttribute("type", "password");
    expect(confirmation).toHaveAttribute("type", "password");
    await user.click(dialog.getByRole("button", { name: "Mostrar senha de acesso" }));
    expect(password).toHaveAttribute("type", "text");
    expect(confirmation).toHaveAttribute("type", "password");
    await user.click(dialog.getByRole("button", { name: "Mostrar confirmação de senha" }));
    expect(confirmation).toHaveAttribute("type", "text");
    await user.click(dialog.getByRole("button", { name: "Ocultar senha de acesso" }));
    await user.click(dialog.getByRole("button", { name: "Ocultar confirmação de senha" }));
    expect(password).toHaveAttribute("type", "password");
    expect(confirmation).toHaveAttribute("type", "password");
    expect(api.createAgencyUser).not.toHaveBeenCalled();
    await user.click(dialog.getByRole("button", { name: "Cancelar cadastro" }));
    await user.click(screen.getByRole("button", { name: "Cadastrar consultor" }));
    expect(screen.getByLabelText("Confirmar senha *")).toHaveValue("");
    expect(screen.getByLabelText("Senha de acesso *")).toHaveAttribute("type", "password");
  });
  it("exige confirmação e impede envio quando as senhas são diferentes; corrigir permite salvar", async () => {
    const user = userEvent.setup(); render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Cadastrar consultor" }));
    const dialog = within(screen.getByTestId("project-contact-create"));
    await user.type(dialog.getByRole("textbox", { name: /Nome/ }), "Novo consultor");
    await user.type(dialog.getByRole("textbox", { name: /E-mail/ }), "new@example.test");
    await user.type(dialog.getByLabelText("Senha de acesso *"), "TestOnly123!");
    const confirmation = dialog.getByLabelText("Confirmar senha *");
    expect(confirmation).toBeRequired();
    await user.click(dialog.getByRole("button", { name: "Salvar cadastro" }));
    expect(api.createAgencyUser).not.toHaveBeenCalled();
    await user.type(confirmation, "Different123!");
    await user.click(dialog.getByRole("button", { name: "Salvar cadastro" }));
    expect(await dialog.findByRole("alert")).toHaveTextContent("As senhas não coincidem");
    expect(api.createAgencyUser).not.toHaveBeenCalled();
    await user.clear(confirmation);
    await user.type(confirmation, "TestOnly123!");
    await user.click(dialog.getByRole("button", { name: "Salvar cadastro" }));
    await waitFor(() => expect(api.createAgencyUser).toHaveBeenCalledOnce());
    expect(api.createAgencyUser).toHaveBeenCalledWith({ name: "Novo consultor", email: "new@example.test", password: "TestOnly123!", role: "agency_consultant" });
  });
  it("sem cadastros exige cadastrar e não oferece campos de nome livre", async () => {
    render(<Harness />);
    expect(await screen.findByText(/É obrigatório cadastrar um usuário/)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Nome do consultor")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Nome do cliente")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "E-mail do consultor" })).toHaveAttribute("readOnly");
  });
  it("seleção usa IDs e preenche e-mail automaticamente", async () => {
    api.getProjectContactOptions.mockImplementation(async ({ kind }: any) => ({ data: kind === "consultant" ? [{ id: "u1", name: "Consultor da empresa", email: "consultor@example.test" }] : [{ id: "c1", name: "Cliente da empresa" }] }));
    const user = userEvent.setup(); render(<Harness />);
    await waitFor(() => expect(api.getProjectContactOptions).toHaveBeenCalled());
    await user.click(screen.getByRole("combobox", { name: "Consultor responsável" }));
    await user.click(await screen.findByRole("option", { name: /Consultor da empresa/ }));
    expect(screen.getByRole("textbox", { name: "E-mail do consultor" })).toHaveValue("consultor@example.test");
    await user.click(screen.getByRole("combobox", { name: "Cliente vinculado" }));
    await user.click(await screen.findByRole("option", { name: /Cliente da empresa/ }));
    expect(screen.getByTestId("contact-ids")).toHaveTextContent("u1/c1");
  });
  it("pesquisa por tecla consulta o servidor mantendo a organização", async () => {
    const user = userEvent.setup(); render(<Harness />);
    await user.click(screen.getByRole("combobox", { name: "Cliente vinculado" }));
    await user.type(screen.getByPlaceholderText("Digite nome ou e-mail do cliente..."), "VG");
    await waitFor(() => expect(api.getProjectContactOptions).toHaveBeenCalledWith(expect.objectContaining({ kind: "client", search: "VG", agency_id: "agency-1" })));
  });
  it("novo consultor é usuário real com função fixa, e volta selecionado", async () => {
    const user = userEvent.setup(); render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Cadastrar consultor" }));
    const dialog = screen.getByTestId("project-contact-create");
    expect(dialog.className).toContain("!z-[1251]");
    await user.type(within(dialog).getByRole("textbox", { name: /Nome/ }), "Novo consultor");
    await user.type(within(dialog).getByRole("textbox", { name: /E-mail/ }), "new@example.test");
    await user.type(within(dialog).getByLabelText("Senha de acesso *"), "TestOnly123!");
    await user.type(within(dialog).getByLabelText("Confirmar senha *"), "TestOnly123!");
    await user.click(within(dialog).getByRole("button", { name: "Salvar cadastro" }));
    await waitFor(() => expect(screen.queryByTestId("project-contact-create")).not.toBeInTheDocument());
    expect(api.createAgencyUser).toHaveBeenCalledWith(expect.objectContaining({ role: "agency_consultant", name: "Novo consultor" }));
    expect(api.createCompanyUser).not.toHaveBeenCalled();
    expect(screen.getByTestId("contact-ids")).toHaveTextContent("u-new/");
    expect(screen.getByRole("textbox", { name: "E-mail do consultor" })).toHaveValue("new@example.test");
  });
  it("novo cliente grava no cadastro e no vínculo, não apenas na lista local", async () => {
    const user = userEvent.setup(); render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Cadastrar cliente" }));
    const dialog = screen.getByTestId("project-contact-create");
    await user.type(within(dialog).getByRole("textbox", { name: /Nome/ }), "Novo cliente");
    await user.click(within(dialog).getByRole("button", { name: "Salvar cadastro" }));
    await waitFor(() => expect(api.createClientRecord).toHaveBeenCalledWith(expect.objectContaining({ name: "Novo cliente", agency_id: "agency-1" })));
    expect(screen.getByTestId("contact-ids")).toHaveTextContent("/c-new");
  });
  it("cancelar cadastro não cria opção falsa", async () => {
    api.createAgencyUser.mockRejectedValue(new Error("Cadastro recusado"));
    const user = userEvent.setup(); render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Cadastrar cliente" }));
    await user.click(screen.getByRole("button", { name: "Cancelar cadastro" }));
    expect(api.createClientRecord).not.toHaveBeenCalled();
    expect(screen.getByTestId("contact-ids")).toHaveTextContent("/");
  });
  it("falha ao cadastrar preserva o formulário e não seleciona um registro fictício", async () => {
    api.createAgencyUser.mockRejectedValue(new Error("Cadastro recusado"));
    const user = userEvent.setup(); render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Cadastrar consultor" }));
    const dialog = screen.getByTestId("project-contact-create");
    await user.type(within(dialog).getByRole("textbox", { name: /Nome/ }), "Novo consultor");
    await user.type(within(dialog).getByRole("textbox", { name: /E-mail/ }), "new@example.test");
    await user.type(within(dialog).getByLabelText("Senha de acesso *"), "TestOnly123!");
    await user.type(within(dialog).getByLabelText("Confirmar senha *"), "TestOnly123!");
    await user.click(within(dialog).getByRole("button", { name: "Salvar cadastro" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Cadastro recusado");
    expect(screen.getByTestId("project-contact-create")).toBeInTheDocument();
    expect(screen.getByTestId("contact-ids")).toHaveTextContent("/");
  });
});
