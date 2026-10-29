import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
const api = vi.hoisted(() => ({ login: vi.fn(), identifyAccount: vi.fn(), getCurrentUser: vi.fn() }));
vi.mock("@/lib/api-client", () => ({ apiClient: api }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/hooks/use-post-login-progress", () => ({ usePostLoginProgress: (_task: unknown, opts: { active: boolean }) => ({ progress: opts.active ? 100 : 0, status: opts.active ? "done" : "running", retry: vi.fn() }) }));
vi.mock("@/components/login-loading-overlay", () => ({ LoginLoadingOverlay: () => <p>Entrando…</p> }));
import { LoginPageTemplate } from "./login-page-template";
import { LoginRedirect, LoginAliasRedirect } from "./login-redirect";

function Here() { const l = useLocation(); return <p data-testid="destination">{l.pathname}{l.search}{l.hash}</p>; }
function ProtectedExample() { return localStorage.getItem("allka_token") ? <Here /> : <LoginRedirect />; }
function LoginScreen({ type }: { type: "ADMIN" | "AGENCY" }) { const l = useLocation(); return <><output data-testid="login-url">{l.pathname}{l.search}{l.hash}</output><LoginPageTemplate initialAccessType={type} /></>; }
function mount(entry: string, original = false) {
  return render(<MemoryRouter initialEntries={[entry]}><Routes>
    {original && <Route path="/admin/tarefa-compartilhada/10" element={<ProtectedExample />} />}
    <Route path="/partner/login" element={<LoginAliasRedirect to="/agency/login" />} />
    <Route path="/agency/login" element={<LoginScreen type="AGENCY" />} />
    <Route path="/login" element={<LoginScreen type="ADMIN" />} />
    <Route path="*" element={<Here />} />
  </Routes></MemoryRouter>);
}
async function enter() {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "teste@example.test" } });
  fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "somente-teste" } });
  fireEvent.click(screen.getByRole("button", { name: "ENTRAR" }));
}
beforeEach(() => {
  localStorage.clear(); vi.clearAllMocks();
  api.identifyAccount.mockResolvedValue({ accessType: "ADMIN" });
  api.login.mockResolvedValue({ token: "token-de-teste", user: { role: "admin", account_type: "admin" } });
});
describe("link interno → login → mesmo destino", () => {
  it("depois da autenticação volta ao produto com aba e âncora, não dashboard", async () => {
    const target = "/admin/cadastro-produtos/2?aba=entrega#etapa-1";
    mount(`/login?returnTo=${encodeURIComponent(target)}`);
    await enter();
    expect(await screen.findByTestId("destination")).toHaveTextContent(target);
  });
  it("guarda URL ao pedir login; F5 no endereço de login conserva o retorno", async () => {
    const view = mount("/admin/tarefa-compartilhada/10?aba=etapas#etapa-2", true);
    await screen.findByRole("button", { name: "ENTRAR" });
    // O retorno está na URL do login (sobrevive a recarga, sem localStorage).
    const loginUrl = screen.getByTestId("login-url").textContent!;
    expect(new URLSearchParams(loginUrl.slice(loginUrl.indexOf("?"))).get("returnTo")).toBe("/admin/tarefa-compartilhada/10?aba=etapas#etapa-2");
    view.unmount();
    mount(loginUrl, true);
    await enter();
    expect(await screen.findByTestId("destination")).toHaveTextContent("/admin/tarefa-compartilhada/10?aba=etapas#etapa-2");
  });
  it("erro de senha não perde o destino; a próxima tentativa retorna ao mesmo link", async () => {
    api.login.mockRejectedValueOnce(new Error("Email ou senha incorretos."));
    mount("/login?returnTo=%2Fadmin%2Fprojetos%2F3");
    await enter();
    await waitFor(() => expect(api.login).toHaveBeenCalledTimes(1));
    await screen.findByText("Email ou senha incorretos.");
    await enter();
    expect(await screen.findByTestId("destination")).toHaveTextContent("/admin/projetos/3");
  });
  it("login sem destino mantém dashboard e retorno externo é ignorado", async () => {
    const view = mount("/login?returnTo=https%3A%2F%2Fexample.com");
    await enter(); expect(await screen.findByTestId("destination")).toHaveTextContent("/admin/dashboard");
    view.unmount(); localStorage.clear(); mount("/login");
    await enter(); expect(await screen.findByTestId("destination")).toHaveTextContent("/admin/dashboard");
  });
  it("alias do Partner conserva destino e sessão já aberta vai direto ao link", async () => {
    localStorage.setItem("allka_token", "sessao-existente");
    mount("/partner/login?returnTo=%2Fpartner%2Fprojetos%2F3%3Faba%3Dtarefas");
    expect(await screen.findByTestId("destination")).toHaveTextContent("/partner/projetos/3?aba=tarefas");
    expect(api.login).not.toHaveBeenCalled();
  });
});
