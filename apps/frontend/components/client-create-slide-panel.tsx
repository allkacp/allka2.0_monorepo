// @ts-nocheck
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Building2,
  User,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSidebar } from "@/contexts/sidebar-context";
import { ModalBrandHeader } from "@/components/ui/modal-brand-header";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api-client";

interface ClientCreateSlidePanelProps {
  open: boolean;
  onClose: () => void;
  onClientCreated?: (client: any) => void;
}

export function ClientCreateSlidePanel({
  open,
  onClose,
  onClientCreated,
}: ClientCreateSlidePanelProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => setIsMounted(true));
      return () => cancelAnimationFrame(id);
    }
    if (!isClosing) setIsMounted(false);
  }, [open, isClosing]);
  const [currentStep, setCurrentStep] = useState(1);
  const { sidebarWidth } = useSidebar();
  const { toast } = useToast();

  const [availableCompanies, setAvailableCompanies] = useState<
    { id: string; name: string }[]
  >([]);
  const [companySearch, setCompanySearch] = useState("");
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);

  const emptyForm = {
    name: "",
    type: "pj" as "pj" | "pf",
    cnpj: "",
    cpf: "",
    email: "",
    phone: "",
    status: "active",
    company_id: "",
    company_name: "",
    address: "",
    city: "",
    state: "",
    notes: "",
  };
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [panelStyle, setPanelStyle] = useState<{ left: string; width: string }>(
    {
      left: "240px",
      width: "calc(100vw - 240px)",
    },
  );

  useEffect(() => {
    const calc = () => {
      const w =
        typeof sidebarWidth === "number"
          ? sidebarWidth
          : parseInt(sidebarWidth as string) || 240;
      setPanelStyle({ left: `${w}px`, width: `calc(100vw - ${w}px)` });
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, [sidebarWidth]);

  useEffect(() => {
    if (open) {
      apiClient
        .getCompanies({ limit: "1000" })
        .then((res: any) => {
          setAvailableCompanies(
            (res.data || []).map((c: any) => ({
              id: String(c.id),
              name: c.name,
            })),
          );
        })
        .catch(() => {});
    } else {
      setIsClosing(false);
    }
  }, [open]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setCurrentStep(1);
      setForm(emptyForm);
      setErrors({});
      setCompanySearch("");
    }, 320);
  };

  const validate1 = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Nome é obrigatório";
    if (form.type === "pj" && !form.cnpj.trim())
      e.cnpj = "CNPJ é obrigatório para Pessoa Jurídica";
    if (form.type === "pf" && !form.cpf.trim())
      e.cpf = "CPF é obrigatório para Pessoa Física";
    if (!form.email.trim()) e.email = "E-mail é obrigatório";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "E-mail inválido";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 1 && !validate1()) return;
    setCurrentStep(2);
  };

  const handleCreate = async () => {
    try {
      const payload = {
        ...form,
        cnpj: form.type === "pj" ? form.cnpj : null,
        cpf: form.type === "pf" ? form.cpf : null,
        company_id: form.company_id || null,
        company_name: form.company_name || null,
      };
      const created = await (apiClient as any).createProjectClient(payload);
      toast({ title: "Cliente criado com sucesso!" });
      onClientCreated?.(created);
      handleClose();
    } catch (err: any) {
      toast({
        title: "Erro ao criar cliente",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  if (!open && !isClosing) return null;

  return (
    <div
      className={cn(
        "fixed top-0 z-50 h-[calc(100vh-24px)]",
        "bg-background flex flex-col",
        "shadow-2xl border-l border-border overflow-hidden",
        "transition-[transform,opacity]",
        isClosing
          ? "translate-x-full opacity-0 duration-300 ease-in"
          : isMounted
            ? "translate-x-0 opacity-100 duration-[400ms] ease-[cubic-bezier(0.2,0,0,1)]"
            : "translate-x-full opacity-0 duration-[400ms] ease-[cubic-bezier(0.2,0,0,1)] pointer-events-none",
      )}
      style={{
        left: panelStyle.left,
        width: panelStyle.width,
      }}
    >
      <ModalBrandHeader
        title="Cadastrar Novo Cliente"
        left={
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              {form.type === "pf" ? (
                <User className="h-5 w-5 text-white" />
              ) : (
                <Building2 className="h-5 w-5 text-white" />
              )}
            </div>
            <p className="text-xs text-blue-200">Etapa {currentStep} de 2</p>
          </div>
        }
        onClose={handleClose}
      />

      <ScrollArea className="flex-1 min-h-0 overflow-hidden">
        <div className="p-6 space-y-5">
          {/* ── ETAPA 1: DADOS PRINCIPAIS ─────────────────────────── */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome / Razão Social *</Label>
                <Input
                  placeholder="Ex: Empresa XYZ Ltda ou João Silva"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={errors.name ? "border-red-500" : ""}
                />
                {errors.name && (
                  <p className="text-xs text-red-500">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Tipo de Pessoa *</Label>
                <Select
                  value={form.type}
                  onValueChange={(v: "pj" | "pf") =>
                    setForm({ ...form, type: v, cnpj: "", cpf: "" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pj">Pessoa Jurídica (PJ)</SelectItem>
                    <SelectItem value="pf">Pessoa Física (PF)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.type === "pj" ? (
                <div className="space-y-2">
                  <Label>CNPJ *</Label>
                  <Input
                    placeholder="00.000.000/0001-00"
                    value={form.cnpj}
                    onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                    className={errors.cnpj ? "border-red-500" : ""}
                  />
                  {errors.cnpj && (
                    <p className="text-xs text-red-500">{errors.cnpj}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>CPF *</Label>
                  <Input
                    placeholder="000.000.000-00"
                    value={form.cpf}
                    onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                    className={errors.cpf ? "border-red-500" : ""}
                  />
                  {errors.cpf && (
                    <p className="text-xs text-red-500">{errors.cpf}</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>E-mail *</Label>
                <Input
                  type="email"
                  placeholder="contato@empresa.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && (
                  <p className="text-xs text-red-500">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  placeholder="(11) 98765-4321"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* ── ETAPA 2: VÍNCULO E COMPLEMENTO ────────────────────── */}
          {currentStep === 2 && (
            <div className="space-y-4">
              {/* Empresa vinculada */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-slate-500" />
                  Empresa vinculada (opcional)
                </Label>
                <p className="text-xs text-slate-500">
                  Selecione a empresa Allka que gerencia este cliente nos
                  projetos.
                </p>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder={form.company_name || "Buscar empresa..."}
                    value={companySearch}
                    onChange={(e) => {
                      setCompanySearch(e.target.value);
                      setCompanyDropdownOpen(true);
                    }}
                    onFocus={() => setCompanyDropdownOpen(true)}
                    className="w-full pl-8 pr-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                {companyDropdownOpen && (
                  <div className="border border-border rounded-md bg-popover max-h-44 overflow-y-auto shadow-sm">
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:bg-accent border-b border-border"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setForm({ ...form, company_id: "", company_name: "" });
                        setCompanySearch("");
                        setCompanyDropdownOpen(false);
                      }}
                    >
                      Sem vínculo
                    </button>
                    {availableCompanies
                      .filter((c) =>
                        c.name
                          .toLowerCase()
                          .includes(companySearch.toLowerCase()),
                      )
                      .map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setForm({
                              ...form,
                              company_id: c.id,
                              company_name: c.name,
                            });
                            setCompanySearch("");
                            setCompanyDropdownOpen(false);
                          }}
                        >
                          {c.name}
                        </button>
                      ))}
                  </div>
                )}
                {form.company_name && (
                  <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-0.5 text-xs">
                    <Building2 className="h-3 w-3" />
                    {form.company_name}
                  </span>
                )}
              </div>

              {/* Endereço */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <h3 className="text-sm font-semibold text-slate-700">
                  Endereço
                </h3>
                <Input
                  placeholder="Rua / Avenida"
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Cidade"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                  />
                  <Input
                    placeholder="Estado (UF)"
                    maxLength={2}
                    value={form.state}
                    onChange={(e) =>
                      setForm({ ...form, state: e.target.value.toUpperCase() })
                    }
                  />
                </div>
              </div>

              {/* Observações */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <Label>Observações</Label>
                <Textarea
                  placeholder="Notas sobre este cliente..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="h-24"
                />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-slate-200 bg-slate-50 p-4 flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(1)}
          className={currentStep === 1 ? "invisible" : ""}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>
        {currentStep < 2 ? (
          <Button onClick={handleNext} className="btn-brand">
            Próximo
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={handleCreate}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
          >
            <Check className="h-4 w-4 mr-1" />
            Cadastrar Cliente
          </Button>
        )}
      </div>
    </div>
  );
}
