import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiClient } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  AlertTriangle,
  XCircle,
  Building2,
  FolderKanban,
  ShoppingBag,
  CreditCard,
  Smartphone,
  FileText,
  Wallet,
  Coins,
  Copy,
  Users,
  Percent,
  FlaskConical,
  Loader2,
  PartyPopper,
  Download,
} from "lucide-react";
import type {
  Client,
  Project,
  CreateClientRequest,
  CreateProjectRequest,
} from "@/types/api";
import type { CartItem } from "@/contexts/cart-context";

interface CheckoutFlowProps {
  items: CartItem[];
  onBack: () => void;
  onComplete: (data: CheckoutData) => void;
  preselectedClient?: Client | CreateClientRequest;
  preselectedProject?: Project | CreateProjectRequest;
  payerType?: "agency" | "company" | "nomad";
  savedCards?: Array<{
    id: string;
    lastDigits: string;
    holder: string;
    expiry: string;
    brand: string;
  }>;
  presetCommissionRate?: number;
  /** ID do projeto já criado � usado para registrar pagamento sandbox */
  projectId?: string;
  /** Modo do checkout: "agency" = agência paga preço base; "client" = cliente paga preço final */
  checkoutMode?: "agency" | "client";
  /** Total que o cliente paga (referência para exibição no checkout da agência) */
  clientTotalRef?: number;
}

export interface CheckoutData {
  client: Client | CreateClientRequest;
  project: Project | CreateProjectRequest;
  isNewClient: boolean;
  isNewProject: boolean;
  payment: PaymentData;
  payerMode: "self" | "client";
  commissionRate: number;
  clientTotal: number;
  checkoutLinks: { self: string; client: string };
  projectId?: string;
  paymentId?: string;
  checkoutId?: string;
  paymentStatus?: string;
  /** If set, the parent should open the project on this tab */
  openTab?: string;
}

interface PaymentData {
  methods: PaymentMethod[];
  totalAmount: number;
}

interface PaymentMethod {
  type: "credit_card" | "pix" | "boleto" | "credits" | "allkoins";
  amount: number;
  details?: CreditCardDetails;
}

interface CreditCardDetails {
  cardNumber: string;
  cardName: string;
  expiryDate: string;
  cvv: string;
}

// Clients and projects loaded from API
let mockClients: Client[] = [];
let mockProjects: Project[] = [];

// ���� Cartão de teste sandbox ����������������������������������������������������������������������������������������������������
const SANDBOX_CARD = {
  id: "sandbox-card-vinicius-4242",
  lastDigits: "4242",
  holder: "VINICIUS GUARDIA",
  expiry: "12/30",
  brand: "Visa",
};

const TEST_CARD = {
  id: "test-card-1111",
  lastDigits: "1111",
  holder: "TESTE ALLKA",
  expiry: "12/28",
  brand: "Visa",
};

export function CheckoutFlow({
  items,
  onBack,
  onComplete,
  preselectedClient,
  preselectedProject,
  payerType,
  savedCards,
  presetCommissionRate,
  projectId,
  checkoutMode,
  clientTotalRef,
}: CheckoutFlowProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [clientMode, setClientMode] = useState<"existing" | "new">("existing");
  const [projectMode, setProjectMode] = useState<"existing" | "new">(
    "existing",
  );

  // Sandbox payment state
  const [payingState, setPayingState] = useState<
    "idle" | "processing" | "success" | "error"
  >("idle");
  const [payingError, setPayingError] = useState<string | null>(null);
  const [sandboxResult, setSandboxResult] = useState<any | null>(null);
  const [pendingCheckoutData, setPendingCheckoutData] =
    useState<CheckoutData | null>(null);

  const projectRouteBase = /^\/(agencia|agency)(\/|$)/.test(location.pathname)
    ? "/agency/projetos"
    : "/admin/projetos";

  const resolveProjectIdForNavigation = async () => {
    const directProjectId =
      sandboxResult?.project?.id ||
      sandboxResult?.project?.project_id ||
      sandboxResult?.payment?.project_id ||
      projectId ||
      (pendingCheckoutData?.project as any)?.id;

    if (directProjectId) {
      return String(directProjectId);
    }

    const paymentId = sandboxResult?.payment?.id;
    if (!paymentId) {
      return null;
    }

    try {
      const payment: any = await apiClient.getPayment(paymentId);
      return String(payment?.project?.id || payment?.project_id || "");
    } catch (err) {
      console.warn("[checkout] failed to resolve project from payment:", err);
      return null;
    }
  };

  // Client data
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [newClient, setNewClient] = useState<CreateClientRequest>({
    name: "",
    email: "",
    phone: "",
    company: "",
  });

  // Project data
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [newProject, setNewProject] = useState<CreateProjectRequest>({
    name: "",
    description: "",
    client_id: 0,
    start_date: "",
    end_date: "",
  });

  const [paymentMethod, setPaymentMethod] = useState<"single" | "split">(
    "single",
  );
  const [selectedPaymentType, setSelectedPaymentType] = useState<
    "credit_card" | "pix" | "boleto" | "credits" | "allkoins"
  >("credit_card");

  // Credit card details
  const [creditCard, setCreditCard] = useState<CreditCardDetails>({
    cardNumber: "",
    cardName: "",
    expiryDate: "",
    cvv: "",
  });

  // Split payment amounts
  const [splitPayments, setSplitPayments] = useState({
    credit_card: { enabled: false, amount: 0 },
    pix: { enabled: false, amount: 0 },
    boleto: { enabled: false, amount: 0 },
    credits: { enabled: false, amount: 0 },
    allkoins: { enabled: false, amount: 0 },
  });

  // User balances - loaded from API
  const [userBalances, setUserBalances] = useState({ credits: 0, allkoins: 0 });

  // Payer mode, commission, saved cards
  const [payerMode, setPayerMode] = useState<"self" | "client">(
    checkoutMode === "client" ? "client" : "self",
  );
  const [commissionRate, setCommissionRate] = useState(
    presetCommissionRate ?? 0,
  );
  const [checkoutSlug] = useState(() =>
    Math.random().toString(36).slice(2, 10),
  );
  // Sempre injeta o cartão sandbox como primeira opção
  const allSavedCards = [SANDBOX_CARD, ...(savedCards ?? [])];

  // Auto-seleciona o cartão sandbox na abertura
  const [selectedSavedCardId, setSelectedSavedCardId] = useState<string | null>(
    SANDBOX_CARD.id,
  );

  useEffect(() => {
    apiClient
      .getClients()
      .then((res: any) => {
        mockClients = Array.isArray(res) ? res : (res?.data ?? []);
      })
      .catch(() => {});
    apiClient
      .getProjects()
      .then((res: any) => {
        mockProjects = Array.isArray(res) ? res : (res?.data ?? []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (preselectedClient) {
      if ("id" in preselectedClient) {
        setSelectedClient(preselectedClient as Client);
        setClientMode("existing");
      } else {
        setNewClient(preselectedClient as CreateClientRequest);
        setClientMode("new");
      }
    }
    if (preselectedProject) {
      if ("id" in preselectedProject) {
        setSelectedProject(preselectedProject as Project);
        setProjectMode("existing");
      } else {
        setNewProject(preselectedProject as CreateProjectRequest);
        setProjectMode("new");
      }
    }
  }, [preselectedClient, preselectedProject]);

  // Determine which steps to show based on preselected data
  const skipClient = !!preselectedClient;
  const skipProject = !!preselectedProject;
  const activeSteps = [
    1,
    ...(skipClient ? [] : [2]),
    ...(skipProject ? [] : [3]),
    4,
    5,
    6, // Resultado do pagamento
  ];
  const totalSteps = activeSteps.length;
  const logicalStep = activeSteps[step - 1]; // map display position �  logical step

  // Auto-advance to result step when payment completes (success or error)
  useEffect(() => {
    if (payingState === "success" || payingState === "error") {
      const resultIdx = activeSteps.indexOf(6);
      if (resultIdx >= 0) setStep(resultIdx + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payingState]);

  useEffect(() => {
    if (
      payerMode === "client" &&
      (selectedPaymentType === "credits" || selectedPaymentType === "allkoins")
    ) {
      setSelectedPaymentType("credit_card");
    }
  }, [payerMode]);

  const getClientTotal = () => getTotalPrice() * (1 + commissionRate / 100);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getTotalPrice = () => {
    return items.reduce(
      (total, item) => total + item.product.basePrice * item.quantity,
      0,
    );
  };

  const canProceedFromStep1 = items.length > 0;
  const canProceedFromStep2 =
    clientMode === "existing"
      ? selectedClient !== null
      : newClient.name && newClient.email;
  const canProceedFromStep3 =
    projectMode === "existing" ? selectedProject !== null : newProject.name;
  const canProceedFromStep4 = () => {
    if (payerMode === "client") return true;
    if (paymentMethod === "single") {
      if (selectedPaymentType === "credit_card") {
        if (selectedSavedCardId) return true;
        return (
          creditCard.cardNumber &&
          creditCard.cardName &&
          creditCard.expiryDate &&
          creditCard.cvv
        );
      }
      return true;
    } else {
      const totalSplit = Object.values(splitPayments).reduce(
        (sum, p) => sum + (p.enabled ? p.amount : 0),
        0,
      );
      return Math.abs(totalSplit - getTotalPrice()) < 0.01; // Allow small floating point differences
    }
  };

  const handleDownloadInvoice = () => {
    const projectName = (preselectedProject as any)?.name || "Projeto";
    const agencyName = (preselectedProject as any)?.agency || "";
    const clientName = (preselectedClient as any)?.name || "";
    const amount = sandboxResult?.payment?.amount ?? getTotalPrice();
    const date = new Date().toLocaleDateString("pt-BR");
    const transactionId = sandboxResult?.payment?.id || `FAKE-${Date.now()}`;
    const fmt = (v: number) =>
      new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(v);

    const productRows = items
      .map(
        (item) => `
        <tr>
          <td>${item.product.name}</td>
          <td style="text-align:center">${item.quantity}</td>
          <td style="text-align:right">${fmt(item.product.basePrice)}</td>
          <td style="text-align:right">${fmt(item.product.basePrice * item.quantity)}</td>
        </tr>`,
      )
      .join("");

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Fatura · ${projectName}</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:40px;color:#1a1a2e;font-size:14px}
    .hdr{display:flex;align-items:flex-start;justify-content:space-between;border-bottom:3px solid #2558FF;padding-bottom:20px;margin-bottom:28px}
    .logo{font-size:30px;font-weight:900;letter-spacing:-1px;color:#2558FF}
    .inv-meta{text-align:right;color:#666;font-size:12px;line-height:1.7}
    .inv-num{font-size:18px;font-weight:700;color:#2558FF}
    .badge-paid{display:inline-block;background:#22c55e;color:#fff;padding:3px 12px;border-radius:20px;font-size:12px;font-weight:700}
    .badge-sandbox{display:inline-block;background:#fef3c7;color:#92400e;border:1px solid #fde68a;padding:2px 9px;border-radius:12px;font-size:11px;font-weight:600;margin-left:6px}
    .two-col{display:flex;gap:32px;margin-bottom:28px}
    .section{flex:1}
    .section-title{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#888;border-bottom:1px solid #eee;padding-bottom:5px;margin-bottom:10px}
    .proj-name{font-size:17px;font-weight:700;margin-bottom:4px}
    .meta-line{color:#555;font-size:13px;line-height:1.7}
    table{width:100%;border-collapse:collapse;margin-bottom:28px}
    th{background:#f4f6ff;padding:9px 10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#555}
    td{padding:9px 10px;border-bottom:1px solid #f0f0f0}
    .total-row td{background:#f4f6ff;font-weight:700;font-size:15px}
    .pay-row{display:flex;justify-content:space-between;margin-bottom:7px}
    .pay-label{color:#555}
    .pay-value{font-weight:600}
    .grand-total{display:flex;justify-content:space-between;border-top:2px solid #2558FF;padding-top:10px;margin-top:6px;font-size:17px;font-weight:700}
    .grand-val{color:#2558FF}
    .footer{margin-top:40px;text-align:center;font-size:11px;color:#aaa;border-top:1px solid #eee;padding-top:18px;line-height:1.8}
    @media print{button{display:none}}
  </style>
</head>
<body>
  <div class="hdr">
    <div class="logo">allka</div>
    <div class="inv-meta">
      FATURA DE PAGAMENTO<br>
      <span class="inv-num">#${transactionId}</span><br>
      Data: ${date}
    </div>
  </div>

  <div class="two-col">
    <div class="section">
      <div class="section-title">Projeto</div>
      <div class="proj-name">${projectName}</div>
      ${agencyName ? `<div class="meta-line">Empresa: <strong>${agencyName}</strong></div>` : ""}
      ${clientName ? `<div class="meta-line">Cliente: <strong>${clientName}</strong></div>` : ""}
    </div>
    <div class="section" style="text-align:right">
      <div class="section-title">Status</div>
      <div><span class="badge-paid">&#x2705; PAGO</span><span class="badge-sandbox">FAKE_SANDBOX</span></div>
    </div>
  </div>

  <div class="section-title">Produtos Contratados</div>
  <table>
    <thead><tr><th>Produto</th><th style="text-align:center">Qtd</th><th style="text-align:right">Preço unit.</th><th style="text-align:right">Subtotal</th></tr></thead>
    <tbody>
      ${productRows}
      <tr class="total-row"><td colspan="3">Total</td><td style="text-align:right">${fmt(Number(amount))}</td></tr>
    </tbody>
  </table>

  <div class="section-title">Dados do Pagamento</div>
  <div class="pay-row"><span class="pay-label">Método</span><span class="pay-value">Cartão de Crédito · Visa &bull;&bull;&bull;&bull; 4242</span></div>
  <div class="pay-row"><span class="pay-label">Titular</span><span class="pay-value">VINICIUS GUARDIA</span></div>
  <div class="pay-row"><span class="pay-label">Gateway</span><span class="pay-value">FAKE_SANDBOX (ambiente de teste)</span></div>
  <div class="pay-row"><span class="pay-label">ID da transação</span><span class="pay-value">${transactionId}</span></div>
  <div class="grand-total"><span>Total pago</span><span class="grand-val">${fmt(Number(amount))}</span></div>

  <div class="footer">
    <p>Allka Plataforma · allka.com.vc · Fatura gerada automaticamente em ${date}</p>
    <p>AMBIENTE DE TESTE &mdash; Nenhum pagamento real foi processado nesta transação.</p>
  </div>
  <script>window.onload=function(){window.print()}</script>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  const handleComplete = async () => {
    const invalidItems = items.filter((item: any) => item?.product?.contractable === false);
    if (invalidItems.length > 0) {
      setPayingState("error");
      setPayingError(
        "Há produtos no carrinho que ainda não podem ser contratados. Ative pelo menos 1 modelo de tarefa operacional no produto antes de seguir.",
      );
      return;
    }

    const selfLink = `https://checkout.allka.com.vc/c/${checkoutSlug}`;
    const clientLink = `https://checkout.allka.com.vc/cl/${checkoutSlug}`;
    const paymentData: PaymentData = {
      totalAmount: payerMode === "client" ? getClientTotal() : getTotalPrice(),
      methods: [],
    };

    if (payerMode === "client") {
      paymentData.methods.push({
        type: selectedPaymentType,
        amount: getClientTotal(),
      });
    } else if (paymentMethod === "single") {
      paymentData.methods.push({
        type: selectedPaymentType,
        amount: getTotalPrice(),
        details: selectedPaymentType === "credit_card" ? creditCard : undefined,
      });
    } else {
      Object.entries(splitPayments).forEach(([type, data]) => {
        if (data.enabled && data.amount > 0) {
          paymentData.methods.push({
            type: type as PaymentMethod["type"],
            amount: data.amount,
            details: type === "credit_card" ? creditCard : undefined,
          });
        }
      });
    }

    const checkoutData: CheckoutData = {
      client: clientMode === "existing" ? selectedClient! : newClient,
      project: projectMode === "existing" ? selectedProject! : newProject,
      isNewClient: clientMode === "new",
      isNewProject: projectMode === "new",
      payment: paymentData,
      payerMode,
      commissionRate,
      clientTotal: getClientTotal(),
      checkoutLinks: { self: selfLink, client: clientLink },
    };

    // ���� Sandbox: chama o backend para registrar o pagamento fake ��������������������������
    if (projectId) {
      setPayingState("processing");
      setPayingError(null);
      try {
        const isSandboxCard =
          selectedSavedCardId === SANDBOX_CARD.id ||
          selectedPaymentType === "credit_card";

        const result = await apiClient.fakeSandboxCheckout({
          project_id: projectId,
          amount: paymentData.totalAmount,
          card_last_digits: isSandboxCard ? "4242" : undefined,
          card_holder: isSandboxCard ? "VINICIUS GUARDIA" : undefined,
          notes: "Pagamento de teste via checkout sandbox",
        });

        // Fallback: fetch real task count to ensure UI shows the correct
        // number even if the backend response is missing the new fields.
        try {
          const tasksRes: any = await apiClient.getProjectTasks({
            project_id: projectId,
            limit: 500,
          });
          const taskList: any[] = Array.isArray(tasksRes)
            ? tasksRes
            : tasksRes?.data ?? [];
          const totalTasksReal = taskList.length;
          if (
            (result?.totalTarefasProjeto ?? 0) === 0 &&
            totalTasksReal > 0
          ) {
            result.totalTarefasProjeto = totalTasksReal;
            // If nothing was newly created in this call, mark them as ignored
            if (!result.tarefasCriadasAgora) {
              result.tarefasIgnoradasAgora = totalTasksReal;
            }
          }
        } catch (fetchErr) {
          console.warn("[checkout] fallback task count failed:", fetchErr);
        }

        const resolvedProjectId =
          result?.project?.id || result?.project?.project_id || projectId;
        const resolvedPaymentId = result?.payment?.id || null;

        setSandboxResult({
          ...result,
          projectId: resolvedProjectId,
          paymentId: resolvedPaymentId,
          checkoutId: resolvedPaymentId,
          paymentStatus: result?.payment?.status || "PAGO",
        });
        setPendingCheckoutData({
          ...checkoutData,
          projectId: resolvedProjectId ? String(resolvedProjectId) : undefined,
          paymentId: resolvedPaymentId ? String(resolvedPaymentId) : undefined,
          checkoutId: resolvedPaymentId ? String(resolvedPaymentId) : undefined,
          paymentStatus: result?.payment?.status || "PAGO",
        });
        setPayingState("success");
      } catch (err: any) {
        setPayingState("error");
        setPayingError(err?.message ?? "Erro ao processar pagamento de teste");
      }
      return;
    }

    // Sem projectId (fluxo sem projeto criado ainda) � chama diretamente
    onComplete(checkoutData);
  };

  const stepLabels: Record<number, string> = {
    1: "Itens",
    2: "Cliente",
    3: "Projeto",
    4: "Pagamento",
    5: "Revisão",
    6: "Resultado",
  };

  const renderStepIndicator = () => (
    <div className="flex items-start justify-center gap-0 mb-6">
      {activeSteps.map((logicalS, displayIdx) => {
        const displayNum = displayIdx + 1;
        const isActive = displayNum === step;
        const isDone = displayNum < step;
        return (
          <div key={logicalS} className="flex items-start">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                  isActive
                    ? "text-white"
                    : isDone
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-400"
                }`}
                style={
                  isActive
                    ? {
                        background:
                          "linear-gradient(135deg, #2558FF 0%, #6E2C96 55%, #A61E86 100%)",
                        boxShadow: "0 2px 8px rgba(37,88,255,0.35)",
                      }
                    : {}
                }
                title={stepLabels[logicalS]}
              >
                {isDone ? <Check className="h-4 w-4" /> : displayNum}
              </div>
              <span
                className={`text-[10px] mt-1 font-medium ${
                  isActive
                    ? "text-blue-600 dark:text-blue-400"
                    : isDone
                      ? "text-green-600 dark:text-green-500"
                      : "text-gray-400 dark:text-gray-500"
                }`}
              >
                {stepLabels[logicalS]}
              </span>
            </div>
            {displayIdx < activeSteps.length - 1 && (
              <div
                className={`w-10 h-0.5 mt-4 ${isDone ? "bg-green-500" : "bg-gray-200 dark:bg-slate-700"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  const COMPLEXITY_LABELS: Record<string, { label: string; cls: string }> = {
    basic:        { label: "Básico",        cls: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300" },
    intermediate: { label: "Intermediário", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
    advanced:     { label: "Avançado",      cls: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" },
    premium:      { label: "Premium",       cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  };

  const renderStep1 = () => {
    const subtotal    = getTotalPrice();
    const commission  = subtotal * (commissionRate / 100);
    const clientTotal = subtotal + commission;

    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-3 mb-2">
          <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg">
            <ShoppingBag className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Revisar Itens</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Confirme os produtos e comissão antes de avançar</p>
          </div>
        </div>

        <ScrollArea className="h-[260px]">
          <div className="space-y-3 pr-3">
            {items.map((item) => {
              const addonsTotal    = (item.selectedAddons || []).reduce((s, a) => s + a.price, 0);
              const unitPrice      = item.product.basePrice + addonsTotal;
              const lineTotal      = unitPrice * item.quantity;
              const lineCommission = lineTotal * (commissionRate / 100);
              const cx             = COMPLEXITY_LABELS[item.product.complexity] ?? COMPLEXITY_LABELS.basic;
              return (
                <Card key={item.id ?? item.product.id} className="overflow-hidden">
                  <div className="flex gap-3 p-3">
                    {/* Thumbnail */}
                    <div className="relative w-14 h-14 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-lg flex items-center justify-center flex-shrink-0">
                      {item.product.image ? (
                        <img src={item.product.image} alt={item.product.name}
                          className="absolute inset-0 w-full h-full object-cover rounded-lg" />
                      ) : (
                        <ShoppingBag className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-sm text-gray-900 dark:text-white leading-tight">
                          {item.product.name}
                        </h4>
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                          {formatCurrency(lineTotal)}
                        </span>
                      </div>

                      {/* Badges */}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.product.category && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300 font-medium">
                            {item.product.category}
                          </span>
                        )}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${cx.cls}`}>
                          {cx.label}
                        </span>
                      </div>

                      {/* Short description */}
                      {item.product.shortDescription && (
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-1 leading-tight">
                          {item.product.shortDescription}
                        </p>
                      )}

                      {/* Variation */}
                      {item.selectedVariation && (
                        <p className="text-[11px] text-violet-600 dark:text-violet-400 mt-1">
                          Variação: <span className="font-medium">{item.selectedVariation.name}</span>
                        </p>
                      )}

                      {/* Addons */}
                      {item.selectedAddons && item.selectedAddons.length > 0 && (
                        <div className="mt-0.5 space-y-0.5">
                          {item.selectedAddons.map((addon) => (
                            <p key={addon.id} className="text-[11px] text-emerald-600 dark:text-emerald-400">
                              + {addon.name} ({formatCurrency(addon.price)})
                            </p>
                          ))}
                        </div>
                      )}

                      {/* Unit × qty */}
                      <p className="text-[11px] text-gray-400 mt-1">
                        {formatCurrency(unitPrice)} × {item.quantity} un.
                      </p>
                    </div>
                  </div>

                  {/* Per-item commission row — always visible */}
                  <div className="px-3 pb-2.5 pt-2 flex items-center justify-between text-[11px] border-t border-dashed border-gray-100 dark:border-slate-700">
                    <span className="flex items-center gap-1 text-gray-400">
                      <Percent className="h-3 w-3" />
                      Comissão {commissionRate > 0 ? `${commissionRate}%` : "(sem comissão)"}
                    </span>
                    <span className={commissionRate > 0 ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-gray-300 dark:text-slate-600"}>
                      {commissionRate > 0 ? `+ ${formatCurrency(lineCommission)}` : "—"}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        </ScrollArea>

        {/* Commission input (only when not preset) */}
        {presetCommissionRate == null && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Percent className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Comissão da agência</p>
                  <p className="text-[11px] text-amber-600 dark:text-amber-400">Acréscimo sobre o valor base cobrado ao cliente</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  type="number" min={0} max={100} step={1}
                  value={commissionRate}
                  onChange={e => setCommissionRate(Math.min(100, Math.max(0, Number(e.target.value))))}
                  className="w-16 h-8 text-sm font-bold text-center rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <span className="text-sm font-bold text-amber-700 dark:text-amber-300">%</span>
              </div>
            </div>
          </div>
        )}

        {/* Summary footer */}
        <div className="border-t border-gray-200 dark:border-slate-700 pt-3 space-y-1.5">
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <span>Subtotal ({items.length} {items.length === 1 ? "produto" : "produtos"}) — preço base</span>
            <span className="font-medium text-gray-700 dark:text-gray-200">{formatCurrency(subtotal)}</span>
          </div>

          <div className={`flex items-center justify-between text-sm ${commissionRate > 0 ? "text-amber-600 dark:text-amber-400" : "text-gray-400 dark:text-slate-600"}`}>
            <span className="flex items-center gap-1">
              <Percent className="h-3.5 w-3.5" />
              {commissionRate > 0
                ? `Comissão ${commissionRate}% (margem da agência)`
                : "Comissão — sem acréscimo (0%)"}
            </span>
            <span className={commissionRate > 0 ? "font-semibold" : ""}>
              {commissionRate > 0 ? `+ ${formatCurrency(commission)}` : "—"}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-700">
            <div>
              <p className="text-base font-semibold text-gray-900 dark:text-white">
                {commissionRate > 0 ? "Total cobrado ao cliente" : "Total"}
              </p>
              {commissionRate > 0 && (
                <p className="text-[11px] text-gray-400">Você paga {formatCurrency(subtotal)} · Margem: {formatCurrency(commission)}</p>
              )}
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {formatCurrency(clientTotal)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-3 mb-4">
        <div className="bg-purple-100 dark:bg-purple-900 p-2 rounded-lg">
          <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Cliente
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {preselectedClient
              ? "Cliente já selecionado nesta contratação"
              : "Selecione ou cadastre um cliente"}
          </p>
        </div>
      </div>

      {preselectedClient ? (
        <Card className="p-4 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
          <div className="flex items-start space-x-3">
            <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">
                Cliente Selecionado
              </h4>
              <div className="space-y-1 text-sm">
                <p className="text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Nome:</span>{" "}
                  {preselectedClient.name}
                </p>
                {preselectedClient.email && (
                  <p className="text-gray-700 dark:text-gray-300">
                    <span className="font-medium">E-mail:</span>{" "}
                    {preselectedClient.email}
                  </p>
                )}
                {preselectedClient.phone && (
                  <p className="text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Telefone:</span>{" "}
                    {preselectedClient.phone}
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <RadioGroup
            value={clientMode}
            onValueChange={(v) => setClientMode(v as "existing" | "new")}
          >
            <div className="flex items-center space-x-2 mb-3">
              <RadioGroupItem value="existing" id="existing-client" />
              <Label htmlFor="existing-client" className="cursor-pointer">
                Selecionar cliente existente
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="new" id="new-client" />
              <Label htmlFor="new-client" className="cursor-pointer">
                Cadastrar novo cliente
              </Label>
            </div>
          </RadioGroup>

          {clientMode === "existing" ? (
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select
                value={selectedClient?.id.toString()}
                onValueChange={(v) => {
                  const client = mockClients.find(
                    (c) => c.id === Number.parseInt(v),
                  );
                  setSelectedClient(client || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {mockClients.map((client) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      <div className="flex flex-col">
                        <span className="font-medium">{client.name}</span>
                        <span className="text-xs text-gray-500">
                          {client.email}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-4 pr-4">
                <div className="space-y-2">
                  <Label htmlFor="client-name">Nome / Razão Social *</Label>
                  <Input
                    id="client-name"
                    value={newClient.name}
                    onChange={(e) =>
                      setNewClient({ ...newClient, name: e.target.value })
                    }
                    placeholder="Digite o nome do cliente"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-company">CNPJ / CPF</Label>
                  <Input
                    id="client-company"
                    value={newClient.company}
                    onChange={(e) =>
                      setNewClient({ ...newClient, company: e.target.value })
                    }
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-email">E-mail *</Label>
                  <Input
                    id="client-email"
                    type="email"
                    value={newClient.email}
                    onChange={(e) =>
                      setNewClient({ ...newClient, email: e.target.value })
                    }
                    placeholder="contato@empresa.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-phone">Telefone</Label>
                  <Input
                    id="client-phone"
                    value={newClient.phone}
                    onChange={(e) =>
                      setNewClient({ ...newClient, phone: e.target.value })
                    }
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </ScrollArea>
          )}
        </>
      )}
    </div>
  );

  const renderStep3 = () => {
    const clientId = clientMode === "existing" ? selectedClient?.id : 0;
    const filteredProjects = mockProjects.filter(
      (p) => p.client_id === clientId,
    );

    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-3 mb-4">
          <div className="bg-green-100 dark:bg-green-900 p-2 rounded-lg">
            <FolderKanban className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Projeto
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {preselectedProject
                ? "Projeto já criado nesta contratação"
                : "Selecione ou crie um projeto"}
            </p>
          </div>
        </div>

        {preselectedProject ? (
          <Card className="p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <div className="flex items-start space-x-3">
              <FolderKanban className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">
                  Projeto Selecionado
                </h4>
                <div className="space-y-1 text-sm">
                  <p className="text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Nome:</span>{" "}
                    {preselectedProject.name}
                  </p>
                  {preselectedProject.description && (
                    <p className="text-gray-700 dark:text-gray-300">
                      <span className="font-medium">Descrição:</span>{" "}
                      {preselectedProject.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <>
            <RadioGroup
              value={projectMode}
              onValueChange={(v) => setProjectMode(v as "existing" | "new")}
            >
              <div className="flex items-center space-x-2 mb-3">
                <RadioGroupItem value="existing" id="existing-project" />
                <Label htmlFor="existing-project" className="cursor-pointer">
                  Selecionar projeto existente
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="new" id="new-project" />
                <Label htmlFor="new-project" className="cursor-pointer">
                  Criar novo projeto
                </Label>
              </div>
            </RadioGroup>

            {projectMode === "existing" ? (
              <div className="space-y-2">
                <Label>Projeto</Label>
                {filteredProjects.length > 0 ? (
                  <Select
                    value={selectedProject?.id.toString()}
                    onValueChange={(v) => {
                      const project = mockProjects.find(
                        (p) => p.id === Number.parseInt(v),
                      );
                      setSelectedProject(project || null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um projeto" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredProjects.map((project) => (
                        <SelectItem
                          key={project.id}
                          value={project.id.toString()}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{project.name}</span>
                            <span className="text-xs text-gray-500">
                              {project.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                    Nenhum projeto encontrado para este cliente. Crie um novo
                    projeto.
                  </div>
                )}
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-4 pr-4">
                  <div className="space-y-2">
                    <Label htmlFor="project-name">Nome do Projeto *</Label>
                    <Input
                      id="project-name"
                      value={newProject.name}
                      onChange={(e) =>
                        setNewProject({ ...newProject, name: e.target.value })
                      }
                      placeholder="Digite o nome do projeto"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-description">Descrição</Label>
                    <Textarea
                      id="project-description"
                      value={newProject.description}
                      onChange={(e) =>
                        setNewProject({
                          ...newProject,
                          description: e.target.value,
                        })
                      }
                      placeholder="Descreva o projeto"
                      rows={4}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="project-start">Data de Início</Label>
                      <Input
                        id="project-start"
                        type="date"
                        value={newProject.start_date}
                        onChange={(e) =>
                          setNewProject({
                            ...newProject,
                            start_date: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="project-end">Data de Término</Label>
                      <Input
                        id="project-end"
                        type="date"
                        value={newProject.end_date}
                        onChange={(e) =>
                          setNewProject({
                            ...newProject,
                            end_date: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              </ScrollArea>
            )}
          </>
        )}
      </div>
    );
  };

  const renderStep4 = () => {
    const totalPrice = getTotalPrice();
    const clientTotal = getClientTotal();
    const totalSplit = Object.values(splitPayments).reduce(
      (sum, p) => sum + (p.enabled ? p.amount : 0),
      0,
    );
    const remaining = totalPrice - totalSplit;

    return (
      <div className="space-y-4">
        {/* Banner sandbox */}
        {projectId && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700">
            <FlaskConical className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
              AMBIENTE DE TESTE &mdash; Nenhum pagamento real será processado.
              Use o cartão Visa &bull;&bull;&bull;&bull; 4242.
            </p>
          </div>
        )}
        {/* Checkout mode badge */}
        {checkoutMode && (
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold ${
              checkoutMode === "agency"
                ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300"
                : "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-300"
            }`}
          >
            {checkoutMode === "agency" ? (
              <Building2 className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <Users className="h-3.5 w-3.5 shrink-0" />
            )}
            {checkoutMode === "agency"
              ? "Checkout da Agência — cobrança pelo preço base"
              : "Checkout do Cliente — cobrança pelo preço final"}
          </div>
        )}
        <div className="flex items-center space-x-3 mb-4">
          <div className="bg-emerald-100 dark:bg-emerald-900 p-2 rounded-lg">
            <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Pagamento
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Escolha a forma de pagamento
            </p>
          </div>
        </div>

        {/* Payer mode toggle — hidden when checkoutMode is locked */}
        {!checkoutMode && (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Quem vai pagar?
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPayerMode("self")}
                className={`flex items-center justify-center gap-2 rounded-lg border-2 p-3 text-sm font-medium transition-colors ${
                  payerMode === "self"
                    ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                    : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                }`}
              >
                <Wallet className="h-4 w-4" />
                Eu mesmo (agência)
              </button>
              <button
                type="button"
                onClick={() => setPayerMode("client")}
                className={`flex items-center justify-center gap-2 rounded-lg border-2 p-3 text-sm font-medium transition-colors ${
                  payerMode === "client"
                    ? "border-purple-600 bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400"
                    : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                }`}
              >
                <Users className="h-4 w-4" />
                Cliente paga
              </button>
            </div>
          </div>
        )}

        {/* Commission � hidden when preset from project panel */}
        {presetCommissionRate == null && (
          <div className="space-y-2">
            <Label
              htmlFor="commission"
              className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1"
            >
              <Percent className="h-3.5 w-3.5" />
              Comissão (%)
            </Label>
            <Input
              id="commission"
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={commissionRate}
              onChange={(e) =>
                setCommissionRate(
                  Math.max(0, Math.min(100, Number(e.target.value))),
                )
              }
              placeholder="0"
            />
          </div>
        )}

        {/* Price summary */}
        {checkoutMode === "agency" ? (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-1.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                Preço base (cobrado agora)
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatCurrency(totalPrice)}
              </span>
            </div>
            {clientTotalRef != null && clientTotalRef > 0 && (
              <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 border-t border-blue-200 dark:border-blue-700 pt-1.5 mt-1">
                <span>Ref. preço ao cliente</span>
                <span className="font-semibold">
                  {formatCurrency(clientTotalRef)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-blue-200 dark:border-blue-700 pt-1.5 mt-1">
              <span className="font-bold text-gray-900 dark:text-white">
                Total cobrado agora
              </span>
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(totalPrice)}
              </span>
            </div>
          </div>
        ) : checkoutMode === "client" ? (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-900 dark:text-white">
                Total final ao cliente
              </span>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(totalPrice)}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="space-y-1 text-sm">
              {payerMode === "client" ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Valor base
                    </span>
                    <span className="font-medium">
                      {formatCurrency(totalPrice)}
                    </span>
                  </div>
                  {commissionRate > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        + Comissão ({commissionRate.toFixed(1)}%)
                      </span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(clientTotal - totalPrice)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-blue-200 dark:border-blue-700 pt-1 mt-1">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      Total para o cliente
                    </span>
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(clientTotal)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    Total
                  </span>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(totalPrice)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {payerMode === "self" ? (
          <>
            <RadioGroup
              value={paymentMethod}
              onValueChange={(v) => setPaymentMethod(v as "single" | "split")}
            >
              <div className="flex items-center space-x-2 mb-3">
                <RadioGroupItem value="single" id="single-payment" />
                <Label htmlFor="single-payment" className="cursor-pointer">
                  Pagamento único
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="split" id="split-payment" />
                <Label htmlFor="split-payment" className="cursor-pointer">
                  Dividir pagamento
                </Label>
              </div>
            </RadioGroup>

            <ScrollArea className="h-[320px]">
              <div className="space-y-4 pr-4">
                {paymentMethod === "single" ? (
                  <>
                    <Select
                      value={selectedPaymentType}
                      onValueChange={(v) => {
                        setSelectedPaymentType(v as any);
                        setSelectedSavedCardId(null);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o método de pagamento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="credit_card">
                          <div className="flex items-center space-x-2">
                            <CreditCard className="h-4 w-4" />
                            <span>Cartão de Crédito</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="pix">
                          <div className="flex items-center space-x-2">
                            <Smartphone className="h-4 w-4" />
                            <span>Pix</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="boleto">
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4" />
                            <span>Boleto Bancário</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="credits">
                          <div className="flex items-center space-x-2">
                            <Wallet className="h-4 w-4" />
                            <span>
                              Créditos da Plataforma (
                              {formatCurrency(userBalances.credits)})
                            </span>
                          </div>
                        </SelectItem>
                        <SelectItem value="allkoins">
                          <div className="flex items-center space-x-2">
                            <Coins className="h-4 w-4" />
                            <span>Allkoins ({userBalances.allkoins} AK)</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {selectedPaymentType === "credit_card" && (
                      <div className="space-y-3 mt-4">
                        {allSavedCards.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-xs text-gray-500 dark:text-gray-400">
                              Cartões salvos
                            </Label>
                            <div className="space-y-2">
                              {allSavedCards.map((card) => (
                                <button
                                  key={card.id}
                                  type="button"
                                  onClick={() =>
                                    setSelectedSavedCardId(
                                      selectedSavedCardId === card.id
                                        ? null
                                        : card.id,
                                    )
                                  }
                                  className={`w-full flex items-center gap-3 rounded-lg border-2 p-3 text-left text-sm transition-colors ${
                                    selectedSavedCardId === card.id
                                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                                      : "border-gray-200 dark:border-slate-700 hover:border-gray-300"
                                  }`}
                                >
                                  <CreditCard className="h-4 w-4 shrink-0 text-gray-500" />
                                  <div className="flex-1">
                                    <p className="font-medium text-gray-900 dark:text-white">
                                      {card.brand} ⬢⬢⬢⬢ {card.lastDigits}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {card.holder} · {card.expiry}
                                    </p>
                                  </div>
                                  {selectedSavedCardId === card.id && (
                                    <Check className="h-4 w-4 text-blue-600 shrink-0" />
                                  )}
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => setSelectedSavedCardId(null)}
                                className={`w-full flex items-center gap-3 rounded-lg border-2 p-3 text-left text-sm transition-colors ${
                                  selectedSavedCardId === null
                                    ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                                    : "border-gray-200 dark:border-slate-700 hover:border-gray-300"
                                }`}
                              >
                                <CreditCard className="h-4 w-4 shrink-0 text-gray-500" />
                                <span className="font-medium text-gray-700 dark:text-gray-300">
                                  + Novo cartão
                                </span>
                              </button>
                            </div>
                          </div>
                        )}
                        {selectedSavedCardId === null && (
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <Label htmlFor="card-number">
                                Número do Cartão *
                              </Label>
                              <Input
                                id="card-number"
                                value={creditCard.cardNumber}
                                onChange={(e) =>
                                  setCreditCard({
                                    ...creditCard,
                                    cardNumber: e.target.value,
                                  })
                                }
                                placeholder="0000 0000 0000 0000"
                                maxLength={19}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="card-name">
                                Nome no Cartão *
                              </Label>
                              <Input
                                id="card-name"
                                value={creditCard.cardName}
                                onChange={(e) =>
                                  setCreditCard({
                                    ...creditCard,
                                    cardName: e.target.value,
                                  })
                                }
                                placeholder="Nome como está no cartão"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <Label htmlFor="expiry">Validade *</Label>
                                <Input
                                  id="expiry"
                                  value={creditCard.expiryDate}
                                  onChange={(e) =>
                                    setCreditCard({
                                      ...creditCard,
                                      expiryDate: e.target.value,
                                    })
                                  }
                                  placeholder="MM/AA"
                                  maxLength={5}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="cvv">CVV *</Label>
                                <Input
                                  id="cvv"
                                  value={creditCard.cvv}
                                  onChange={(e) =>
                                    setCreditCard({
                                      ...creditCard,
                                      cvv: e.target.value,
                                    })
                                  }
                                  placeholder="123"
                                  maxLength={4}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {selectedPaymentType === "pix" && (
                      <Card className="p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 mt-4">
                        <div className="flex items-start space-x-3">
                          <Smartphone className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">
                              Pagamento via Pix
                            </h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              Após confirmar, você receberá um QR Code para
                              realizar o pagamento instantaneamente.
                            </p>
                          </div>
                        </div>
                      </Card>
                    )}

                    {selectedPaymentType === "boleto" && (
                      <Card className="p-4 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 mt-4">
                        <div className="flex items-start space-x-3">
                          <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">
                              Boleto Bancário
                            </h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              O boleto será gerado após a confirmação. Prazo de
                              vencimento: 3 dias úteis.
                            </p>
                          </div>
                        </div>
                      </Card>
                    )}

                    {selectedPaymentType === "credits" && (
                      <Card className="p-4 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 mt-4">
                        <div className="flex items-start space-x-3">
                          <Wallet className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5" />
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">
                              Créditos da Plataforma
                            </h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                              Saldo disponível:{" "}
                              {formatCurrency(userBalances.credits)}
                            </p>
                            {totalPrice > userBalances.credits && (
                              <p className="text-xs text-red-600 dark:text-red-400">
                                Saldo insuficiente. Considere dividir o
                                pagamento.
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    )}

                    {selectedPaymentType === "allkoins" && (
                      <Card className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 mt-4">
                        <div className="flex items-start space-x-3">
                          <Coins className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">
                              Allkoins
                            </h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                              Saldo disponível: {userBalances.allkoins} AK (�0�{" "}
                              {formatCurrency(userBalances.allkoins * 1)})
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Taxa de conversão: 1 AK = R$ 1,00
                            </p>
                          </div>
                        </div>
                      </Card>
                    )}
                  </>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Combine diferentes métodos de pagamento para completar o
                      valor total.
                    </p>

                    {/* Credit Card Split */}
                    <Card className="p-3">
                      <div className="flex items-center space-x-3 mb-2">
                        <Checkbox
                          id="split-credit-card"
                          checked={splitPayments.credit_card.enabled}
                          onCheckedChange={(checked) =>
                            setSplitPayments({
                              ...splitPayments,
                              credit_card: {
                                ...splitPayments.credit_card,
                                enabled: !!checked,
                              },
                            })
                          }
                        />
                        <Label
                          htmlFor="split-credit-card"
                          className="flex items-center space-x-2 cursor-pointer flex-1"
                        >
                          <CreditCard className="h-4 w-4" />
                          <span>Cartão de Crédito</span>
                        </Label>
                      </div>
                      {splitPayments.credit_card.enabled && (
                        <Input
                          type="number"
                          value={splitPayments.credit_card.amount || ""}
                          onChange={(e) =>
                            setSplitPayments({
                              ...splitPayments,
                              credit_card: {
                                ...splitPayments.credit_card,
                                amount: Number(e.target.value),
                              },
                            })
                          }
                          placeholder="Valor"
                          className="mt-2"
                        />
                      )}
                    </Card>

                    {/* Pix Split */}
                    <Card className="p-3">
                      <div className="flex items-center space-x-3 mb-2">
                        <Checkbox
                          id="split-pix"
                          checked={splitPayments.pix.enabled}
                          onCheckedChange={(checked) =>
                            setSplitPayments({
                              ...splitPayments,
                              pix: { ...splitPayments.pix, enabled: !!checked },
                            })
                          }
                        />
                        <Label
                          htmlFor="split-pix"
                          className="flex items-center space-x-2 cursor-pointer flex-1"
                        >
                          <Smartphone className="h-4 w-4" />
                          <span>Pix</span>
                        </Label>
                      </div>
                      {splitPayments.pix.enabled && (
                        <Input
                          type="number"
                          value={splitPayments.pix.amount || ""}
                          onChange={(e) =>
                            setSplitPayments({
                              ...splitPayments,
                              pix: {
                                ...splitPayments.pix,
                                amount: Number(e.target.value),
                              },
                            })
                          }
                          placeholder="Valor"
                          className="mt-2"
                        />
                      )}
                    </Card>

                    {/* Credits Split */}
                    <Card className="p-3">
                      <div className="flex items-center space-x-3 mb-2">
                        <Checkbox
                          id="split-credits"
                          checked={splitPayments.credits.enabled}
                          onCheckedChange={(checked) =>
                            setSplitPayments({
                              ...splitPayments,
                              credits: {
                                ...splitPayments.credits,
                                enabled: !!checked,
                              },
                            })
                          }
                        />
                        <Label
                          htmlFor="split-credits"
                          className="flex items-center space-x-2 cursor-pointer flex-1"
                        >
                          <Wallet className="h-4 w-4" />
                          <span>
                            Créditos ({formatCurrency(userBalances.credits)})
                          </span>
                        </Label>
                      </div>
                      {splitPayments.credits.enabled && (
                        <Input
                          type="number"
                          value={splitPayments.credits.amount || ""}
                          onChange={(e) =>
                            setSplitPayments({
                              ...splitPayments,
                              credits: {
                                ...splitPayments.credits,
                                amount: Math.min(
                                  Number(e.target.value),
                                  userBalances.credits,
                                ),
                              },
                            })
                          }
                          placeholder="Valor"
                          max={userBalances.credits}
                          className="mt-2"
                        />
                      )}
                    </Card>

                    {/* Allkoins Split */}
                    <Card className="p-3">
                      <div className="flex items-center space-x-3 mb-2">
                        <Checkbox
                          id="split-allkoins"
                          checked={splitPayments.allkoins.enabled}
                          onCheckedChange={(checked) =>
                            setSplitPayments({
                              ...splitPayments,
                              allkoins: {
                                ...splitPayments.allkoins,
                                enabled: !!checked,
                              },
                            })
                          }
                        />
                        <Label
                          htmlFor="split-allkoins"
                          className="flex items-center space-x-2 cursor-pointer flex-1"
                        >
                          <Coins className="h-4 w-4" />
                          <span>Allkoins ({userBalances.allkoins} AK)</span>
                        </Label>
                      </div>
                      {splitPayments.allkoins.enabled && (
                        <Input
                          type="number"
                          value={splitPayments.allkoins.amount || ""}
                          onChange={(e) =>
                            setSplitPayments({
                              ...splitPayments,
                              allkoins: {
                                ...splitPayments.allkoins,
                                amount: Math.min(
                                  Number(e.target.value),
                                  userBalances.allkoins,
                                ),
                              },
                            })
                          }
                          placeholder="Valor"
                          max={userBalances.allkoins}
                          className="mt-2"
                        />
                      )}
                    </Card>

                    {/* Split Summary */}
                    <Card
                      className={`p-3 ${remaining === 0 ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" : "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"}`}
                    >
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">
                            Total:
                          </span>
                          <span className="font-medium">
                            {formatCurrency(totalPrice)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">
                            Alocado:
                          </span>
                          <span className="font-medium">
                            {formatCurrency(totalSplit)}
                          </span>
                        </div>
                        <div className="flex justify-between border-t pt-1">
                          <span className="font-semibold">Restante:</span>
                          <span
                            className={`font-bold ${remaining === 0 ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"}`}
                          >
                            {formatCurrency(remaining)}
                          </span>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Selecione o método de pagamento disponível para o cliente:
            </p>
            <div className="space-y-2">
              {(["credit_card", "pix", "boleto"] as const).map((type) => {
                const icons = {
                  credit_card: CreditCard,
                  pix: Smartphone,
                  boleto: FileText,
                };
                const labels = {
                  credit_card: "Cartão de Crédito",
                  pix: "Pix",
                  boleto: "Boleto Bancário",
                };
                const Icon = icons[type];
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedPaymentType(type)}
                    className={`w-full flex items-center gap-3 rounded-lg border-2 p-3 text-left text-sm transition-colors ${
                      selectedPaymentType === type
                        ? "border-purple-600 bg-purple-50 dark:bg-purple-900/20"
                        : "border-gray-200 dark:border-slate-700 hover:border-gray-300"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-gray-500" />
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {labels[type]}
                    </span>
                    {selectedPaymentType === type && (
                      <Check className="h-4 w-4 text-purple-600 ml-auto shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              O cliente receberá um link de pagamento seguro com o método
              selecionado.
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderStep5 = () => {
    const project =
      preselectedProject ??
      (projectMode === "existing" ? selectedProject : newProject);
    const client =
      preselectedClient ??
      (clientMode === "existing" ? selectedClient : newClient);
    const totalPrice = getTotalPrice();
    const payTotal = payerMode === "client" ? getClientTotal() : totalPrice;
    const isAgency = checkoutMode === "agency";
    const isClientMode = checkoutMode === "client";

    // Conceptual 4-step stepper
    const conceptualSteps = [
      { label: "Dados do projeto", Icon: FolderKanban },
      { label: "Revisao", Icon: ShoppingBag },
      { label: "Revisar e confirmar", Icon: Check },
      { label: "Resultado", Icon: PartyPopper },
    ];
    const activeConceptual = 2; // 0-indexed: "Revisar e confirmar"

    return (
      <div className="space-y-5">
        {/* Stepper */}
        <div className="flex items-start">
          {conceptualSteps.map((s, i) => {
            const isActive = i === activeConceptual;
            const isDone = i < activeConceptual;
            const { Icon } = s;
            return (
              <div key={i} className="flex items-start flex-1">
                <div className="flex flex-col items-center w-full">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all ${
                      isActive
                        ? "text-white shadow-md"
                        : isDone
                          ? "bg-green-500 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                    }`}
                    style={
                      isActive
                        ? {
                            background:
                              "linear-gradient(135deg, #2558FF 0%, #A61E86 100%)",
                          }
                        : {}
                    }
                  >
                    {isDone ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Icon className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <span
                    className={`text-[9px] font-semibold mt-1 text-center leading-tight px-0.5 ${
                      isActive
                        ? "text-blue-600 dark:text-blue-400"
                        : isDone
                          ? "text-green-600 dark:text-green-500"
                          : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < conceptualSteps.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mt-3.5 mx-1 rounded-full ${
                      i < activeConceptual
                        ? "bg-green-400"
                        : "bg-slate-200 dark:bg-slate-700"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Ambiente de teste */}
        {projectId && (
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
            <FlaskConical className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
              AMBIENTE DE TESTE - Nenhum pagamento real sera processado
            </p>
          </div>
        )}

        {/* Projeto */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-2.5 bg-linear-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                Projeto
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {checkoutMode && (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    isAgency
                      ? "bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300"
                      : "bg-emerald-100 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300"
                  }`}
                >
                  {isAgency ? (
                    <Building2 className="h-2.5 w-2.5" />
                  ) : (
                    <Users className="h-2.5 w-2.5" />
                  )}
                  {isAgency ? "Agencia" : "Cliente"}
                </span>
              )}
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-900/30 border border-cyan-200 dark:border-cyan-700 text-[10px] font-bold text-cyan-700 dark:text-cyan-300">
                Ag. Pagamento
              </span>
            </div>
          </div>
          <div className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-3 bg-white dark:bg-slate-900 text-sm">
            <div className="col-span-2">
              <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-0.5">
                Nome do projeto
              </p>
              <p className="font-semibold text-slate-800 dark:text-white">
                {(project as any)?.name || "?"}
              </p>
            </div>
            {(project as any)?.agency && (
              <div>
                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-0.5">
                  Empresa
                </p>
                <p className="text-slate-700 dark:text-slate-300">
                  {(project as any).agency}
                </p>
              </div>
            )}
            {(client as any)?.name && (
              <div>
                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-0.5">
                  Cliente
                </p>
                <p className="text-slate-700 dark:text-slate-300">
                  {(client as any).name}
                </p>
              </div>
            )}
            {(project as any)?.consultant && (
              <div className="col-span-2">
                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-0.5">
                  Consultor responsavel
                </p>
                <p className="text-slate-700 dark:text-slate-300">
                  {(project as any).consultant}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Produtos */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-2.5 bg-linear-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                Produtos contratados
              </span>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {items.length} {items.length === 1 ? "item" : "itens"}
            </span>
          </div>
          <div className="bg-white dark:bg-slate-900 divide-y divide-slate-50 dark:divide-slate-800">
            {items.map((item) => (
              <div
                key={item.product.id}
                className="flex items-center gap-3 px-4 py-2.5"
              >
                <div className="w-8 h-8 rounded-lg bg-linear-to-br from-blue-100 to-purple-100 dark:from-blue-900/50 dark:to-purple-900/50 flex items-center justify-center shrink-0 overflow-hidden">
                  {item.product.image ? (
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ShoppingBag className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-white truncate">
                    {item.product.name}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Qtd: {item.quantity} &middot;{" "}
                    {formatCurrency(item.product.basePrice)}/un
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">
                    {formatCurrency(item.product.basePrice * item.quantity)}
                  </p>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Subtotal
              </span>
              <span
                className="text-base font-bold bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, #2558FF 0%, #A61E86 100%)",
                }}
              >
                {formatCurrency(totalPrice)}
              </span>
            </div>
            {isAgency && clientTotalRef != null && clientTotalRef > 0 && (
              <div className="flex items-center justify-between px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20">
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  Ref. preco ao cliente (com comissao)
                </span>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  {formatCurrency(clientTotalRef)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Pagamento */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-2.5 bg-linear-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                Pagamento
              </span>
            </div>
            {projectId && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                <FlaskConical className="h-2.5 w-2.5" />
                FAKE_SANDBOX
              </span>
            )}
          </div>
          <div className="px-4 py-3 space-y-3 bg-white dark:bg-slate-900">
            {/* Sandbox card visual */}
            <div
              className="rounded-xl p-3.5 flex items-center gap-4"
              style={{
                background:
                  "linear-gradient(135deg, #1e3a8a 0%, #312e81 60%, #4c1d95 100%)",
              }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-white/50 text-[9px] font-bold uppercase tracking-widest mb-1">
                  Cartao de teste sandbox
                </p>
                <p className="text-white font-bold text-sm tracking-[0.2em] font-mono">
                  &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull;
                  &bull;&bull;&bull;&bull; 4242
                </p>
                <p className="text-white/60 text-xs mt-1">
                  VINICIUS GUARDIA &middot; 12/30
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-white/40 text-[9px] font-bold uppercase tracking-wide mb-0.5">
                  Bandeira
                </p>
                <p className="text-white font-bold text-base italic">Visa</p>
              </div>
            </div>
            {/* Gateway */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">
                Gateway
              </span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                FAKE_SANDBOX
              </span>
            </div>
            {/* Total */}
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700 pt-2.5">
              <span className="font-bold text-slate-800 dark:text-white text-sm">
                {isAgency
                  ? "Total base cobrado agora"
                  : isClientMode
                    ? "Total ao cliente"
                    : payerMode === "client"
                      ? "Total ao cliente"
                      : "Total a pagar"}
              </span>
              <span
                className="text-xl font-black bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, #2558FF 0%, #A61E86 100%)",
                }}
              >
                {formatCurrency(payTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };
  const renderStep6 = () => {
    const tCriadasAgora: number = sandboxResult?.tarefasCriadasAgora ?? 0;
    const tIgnoradas: number = sandboxResult?.tarefasIgnoradasAgora ?? 0;
    const tTotal: number = sandboxResult?.totalTarefasProjeto ?? 0;
    const tProcessados: number =
      sandboxResult?.produtosProcessadosNaCompra ?? 0;
    const semModelo: string[] = sandboxResult?.produtosSemModelo ?? [];
    const amount = sandboxResult?.payment?.amount ?? getTotalPrice();
    const projectName = (preselectedProject as any)?.name || "";

    if (payingState === "success") {
      return (
        <div className="space-y-4">
          {/* Success header */}
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
              }}
            >
              <PartyPopper className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Pagamento aprovado!
              </h3>
              {projectName && (
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">
                  {projectName}
                </p>
              )}
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Projeto marcado como em andamento.
              </p>
            </div>
          </div>

          {/* Payment details card */}
          <div className="rounded-xl border border-gray-100 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 px-3 py-2 bg-linear-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-b border-gray-100 dark:border-slate-800">
              <CreditCard className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                Pagamento
              </span>
              <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-xs font-semibold text-green-700 dark:text-green-400">
                <Check className="h-3 w-3" />
                Aprovado
              </span>
            </div>
            <div className="px-3 py-3 space-y-2 bg-white dark:bg-slate-900 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">Cartão</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  Visa &bull;&bull;&bull;&bull; 4242
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">
                  Gateway
                </span>
                <span className="inline-flex items-center gap-1 font-medium text-amber-700 dark:text-amber-400">
                  <FlaskConical className="h-3 w-3" />
                  FAKE_SANDBOX
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-gray-100 dark:border-slate-700 pt-2 mt-1">
                <span className="font-semibold text-gray-900 dark:text-white">
                  Valor pago
                </span>
                <span
                  className="text-lg font-bold bg-clip-text text-transparent"
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, #2558FF 0%, #A61E86 100%)",
                  }}
                >
                  {formatCurrency(Number(amount))}
                </span>
              </div>
            </div>
          </div>

          {/* Resumo da contratação */}
          <div className="rounded-xl border border-gray-100 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 dark:bg-violet-900/20 border-b border-gray-100 dark:border-slate-800">
              <Check className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                Resumo da Contratação
              </span>
            </div>
            <div className="px-3 py-2.5 bg-white dark:bg-slate-900 space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">
                  Produtos contratados
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {tProcessados > 0 ? tProcessados : items.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">
                  Tarefas abertas para lançamento
                </span>
                <span
                  className={`font-semibold ${(tTotal || tCriadasAgora + tIgnoradas) > 0 ? "text-violet-700 dark:text-violet-300" : "text-gray-500 dark:text-gray-400"}`}
                >
                  {tTotal || tCriadasAgora + tIgnoradas}
                </span>
              </div>
              {tCriadasAgora > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400 text-xs">
                    ↳ criadas agora
                  </span>
                  <span className="text-xs font-semibold text-violet-600 dark:text-violet-400">
                    {tCriadasAgora}
                  </span>
                </div>
              )}
              {tIgnoradas > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400 text-xs">
                    ↳ já existiam (idempotência)
                  </span>
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                    {tIgnoradas}
                  </span>
                </div>
              )}
            </div>
            <div className="px-3 py-2 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
              {tCriadasAgora > 0 ? (
                <p className="text-sm font-medium text-violet-700 dark:text-violet-300">
                  Foram abertas {tCriadasAgora}{" "}
                  {tCriadasAgora === 1 ? "tarefa" : "tarefas"} para lançamento.
                </p>
              ) : tTotal > 0 || tIgnoradas > 0 ? (
                <p className="text-sm text-violet-700 dark:text-violet-300">
                  ✓ Projeto pronto para lançamento — {tTotal || tIgnoradas}{" "}
                  {(tTotal || tIgnoradas) === 1 ? "tarefa disponível" : "tarefas disponíveis"} no projeto.
                </p>
              ) : semModelo.length > 0 ? (
                <p className="text-sm text-red-700 dark:text-red-400">
                  Nenhuma tarefa gerada — produtos sem modelo ativo:{" "}
                  {semModelo.join(", ")}.
                </p>
              ) : (
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Nenhuma tarefa foi criada. Verifique os modelos dos produtos.
                </p>
              )}
            </div>
          </div>

          {/* 30-day expiry warning */}
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3 py-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
              As tarefas abertas têm o prazo de expiração de{" "}
              <strong>30 dias</strong> a partir da data de hoje. Caso o
              lançamento não seja feito, a tarefa será expirada e não poderá ser
              reutilizada.
            </p>
          </div>
        </div>
      );
    }

    // Error state
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
          <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
        </div>
        <div className="w-full max-w-xs space-y-3">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Pagamento recusado
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Não foi possível processar o pagamento neste momento.
          </p>
          {payingError && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3">
              <p className="text-sm text-red-700 dark:text-red-300">
                {payingError}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const isPaymentProcessing = payingState === "processing";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex-shrink-0">
        {renderStepIndicator()}
      </div>

      {/* Processing overlay */}
      {payingState === "processing" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8 text-center">
          {payingState === "processing" && (
            <>
              <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-spin" />
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  Processando pagamento de teste...
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Simulando aprovação via sandbox · aguarde
                </p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700">
                <FlaskConical className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                  FAKE_SANDBOX · nenhum pagamento real
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Content */}
      {payingState !== "processing" && (
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6">
            {logicalStep === 1 && renderStep1()}
            {logicalStep === 2 && renderStep2()}
            {logicalStep === 3 && renderStep3()}
            {logicalStep === 4 && renderStep4()}
            {logicalStep === 5 && renderStep5()}
            {logicalStep === 6 && renderStep6()}
          </div>
        </ScrollArea>
      )}

      {/* Footer */}
      {payingState !== "processing" && (
        <div className="border-t border-gray-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-900 shrink-0">
          {logicalStep === 6 ? (
            payingState === "success" ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const pid = await resolveProjectIdForNavigation();
                      if (pendingCheckoutData) {
                        onComplete({
                          ...pendingCheckoutData,
                          projectId: pid || pendingCheckoutData.projectId,
                          paymentId:
                            sandboxResult?.paymentId ||
                            pendingCheckoutData.paymentId,
                          checkoutId:
                            sandboxResult?.checkoutId ||
                            pendingCheckoutData.checkoutId,
                          paymentStatus:
                            sandboxResult?.paymentStatus ||
                            pendingCheckoutData.paymentStatus,
                        });
                      }
                      if (pid) navigate(`${projectRouteBase}/${pid}`);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold text-white transition-all hover:brightness-110"
                    style={{
                      background:
                        "linear-gradient(135deg, #2558FF 0%, #6E2C96 55%, #A61E86 100%)",
                      boxShadow: "0 4px 14px rgba(37,88,255,0.30)",
                    }}
                  >
                    <FolderKanban className="h-4 w-4" />
                    Abrir projeto
                  </button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const pid = await resolveProjectIdForNavigation();
                      if (pendingCheckoutData)
                        onComplete({
                          ...pendingCheckoutData,
                          projectId: pid || pendingCheckoutData.projectId,
                          paymentId:
                            sandboxResult?.paymentId ||
                            pendingCheckoutData.paymentId,
                          checkoutId:
                            sandboxResult?.checkoutId ||
                            pendingCheckoutData.checkoutId,
                          paymentStatus:
                            sandboxResult?.paymentStatus ||
                            pendingCheckoutData.paymentStatus,
                          openTab: "tarefas",
                        });
                      if (pid) navigate(`${projectRouteBase}/${pid}?tab=tarefas`);
                    }}
                  >
                    Ver tarefas
                  </Button>
                </div>
                <Button
                  variant="outline"
                  onClick={handleDownloadInvoice}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar fatura de pagamento
                </Button>
              </div>
            ) : (
              /* Error state */
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setPayingState("idle");
                    setPayingError(null);
                    const revIdx = activeSteps.indexOf(5);
                    if (revIdx >= 0) setStep(revIdx + 1);
                  }}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar para revisão
                </Button>
                <button
                  type="button"
                  className="flex-1 flex items-center justify-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold text-white transition-all hover:brightness-110"
                  style={{
                    background:
                      "linear-gradient(135deg, #2558FF 0%, #6E2C96 55%, #A61E86 100%)",
                  }}
                  onClick={() => {
                    setPayingState("idle");
                    setPayingError(null);
                    const revIdx = activeSteps.indexOf(5);
                    if (revIdx >= 0) setStep(revIdx + 1);
                  }}
                >
                  Tentar novamente
                </button>
              </div>
            )
          ) : (
            /* Normal navigation */
            <div className="flex gap-2">
              {step > 1 ? (
                <Button
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  className="flex-1"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
              ) : (
                <Button variant="outline" onClick={onBack} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar ao Carrinho
                </Button>
              )}

              {logicalStep === 5 ? (
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={isPaymentProcessing}
                  className="flex-1 flex items-center justify-center gap-2 h-11 px-5 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-lg"
                  style={{
                    background:
                      "linear-gradient(135deg, #2558FF 0%, #6E2C96 55%, #A61E86 100%)",
                    boxShadow: "0 4px 18px rgba(37,88,255,0.40)",
                  }}
                >
                  {isPaymentProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processando pagamento...
                    </>
                  ) : projectId ? (
                    <>
                      <FlaskConical className="h-4 w-4" />
                      Pagar agora — teste
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Finalizar Compra
                    </>
                  )}
                </button>
              ) : (
                <Button
                  onClick={() => setStep(step + 1)}
                  disabled={
                    (logicalStep === 1 && !canProceedFromStep1) ||
                    (logicalStep === 2 && !canProceedFromStep2) ||
                    (logicalStep === 3 && !canProceedFromStep3) ||
                    (logicalStep === 4 && !canProceedFromStep4())
                  }
                  className="flex-1 btn-brand"
                >
                  Próximo
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
