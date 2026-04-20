// @ts-nocheck
import type React from "react";
import { useState, useEffect, useRef } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api-client";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  User,
  AlertCircle,
  Check,
  Camera,
  ZoomIn,
  Trash2,
  Crosshair,
  ImagePlus,
  Pencil,
  Building,
  Users,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/contexts/sidebar-context";
import { ModalBrandHeader } from "@/components/ui/modal-brand-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AddressMapPicker } from "@/components/address/address-map-picker";
import { CompanyStatusSelector } from "@/components/company-status-selector";
import {
  CompanySocialLinksManager,
  type SocialLink,
} from "@/components/company-social-links-manager";

type CompanyStatus = "active" | "inactive" | "pending";

interface CompanyCreateSlidePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (company: any) => void;
}

interface FormData {
  // Dados Cadastrais
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  inscricaoEstadual: string;
  status: CompanyStatus;

  // Contato
  emailPrincipal: string;
  telefone: string;

  // Redes Sociais
  socialLinks: SocialLink[];

  // Endereço
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  cidade: string;
  estado: string;
  latitude?: number;
  longitude?: number;
  place_id?: string;
  formatted_address?: string;

  // Tipo de Conta
  tipoContato: "dependent" | "independent" | "agency" | "partner";

  // Plano de Créditos
  planoCreditoId: string;
  limite: string;
  creditosIniciais: string;

  // Métodos de Pagamento
  metodoPagamento: string;

  // Usuário Administrador
  nomeAdmin: string;
  emailAdmin: string;
}

interface FormErrors {
  [key: string]: string;
}

export function CompanyCreateSlidePanel({
  open,
  onOpenChange,
  onCreate,
}: CompanyCreateSlidePanelProps) {
  const { toast } = useToast();
  const { sidebarWidth } = useSidebar();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const CREATE_ALL_ACCORDIONS = [
    "cadastrais",
    "contato",
    "social",
    "endereco",
    "tipoConta",
    "plano",
    "pagamento",
    "admin",
  ];
  const [createOpenAccordions, setCreateOpenAccordions] = useState<string[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Avatar / crop states
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [originalRawSrc, setOriginalRawSrc] = useState<string | null>(null);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isDragOverUpload, setIsDragOverUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropImgRef = useRef<HTMLImageElement>(null);
  const CROP_SIZE = 192;

  const [formData, setFormData] = useState<FormData>({
    razaoSocial: "",
    nomeFantasia: "",
    cnpj: "",
    inscricaoEstadual: "",
    status: "active",
    emailPrincipal: "",
    telefone: "",
    socialLinks: [],
    cep: "",
    rua: "",
    numero: "",
    complemento: "",
    cidade: "",
    estado: "",
    latitude: undefined,
    longitude: undefined,
    place_id: undefined,
    formatted_address: undefined,
    tipoContato: "independent",
    planoCreditoId: "starter",
    limite: "1000",
    creditosIniciais: "100",
    metodoPagamento: "pix",
    nomeAdmin: "",
    emailAdmin: "",
  });

  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => setIsMounted(true));
      return () => cancelAnimationFrame(id);
    }
    if (!isClosing) setIsMounted(false);
  }, [open, isClosing]);

  useEffect(() => {
    if (!open) {
      setFormData({
        razaoSocial: "",
        nomeFantasia: "",
        cnpj: "",
        inscricaoEstadual: "",
        status: "active",
        emailPrincipal: "",
        telefone: "",
        socialLinks: [],
        cep: "",
        rua: "",
        numero: "",
        complemento: "",
        cidade: "",
        estado: "",
        tipoContato: "independent",
        planoCreditoId: "starter",
        limite: "1000",
        creditosIniciais: "100",
        metodoPagamento: "pix",
        nomeAdmin: "",
        emailAdmin: "",
      });
      setErrors({});
      setSubmitAttempted(false);
      setAvatarPreview(null);
      setOriginalRawSrc(null);
      setRawImageSrc(null);
      setCropOpen(false);
      setShowAvatarMenu(false);
      setIsClosing(false);
    }
  }, [open]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onOpenChange(false);
    }, 420);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.razaoSocial.trim())
      newErrors.razaoSocial = "Razão Social é obrigatória";
    if (!formData.nomeFantasia.trim())
      newErrors.nomeFantasia = "Nome Fantasia é obrigatório";
    if (!formData.cnpj.trim()) {
      newErrors.cnpj = "CNPJ é obrigatório";
    } else if (formData.cnpj.replace(/\D/g, "").length !== 14) {
      newErrors.cnpj = "CNPJ inválido — informe os 14 dígitos";
    }
    if (!formData.emailPrincipal.trim()) {
      newErrors.emailPrincipal = "Email é obrigatório";
    } else if (!/\S+@\S+\.\S+/.test(formData.emailPrincipal)) {
      newErrors.emailPrincipal = "Email inválido";
    }
    if (!formData.telefone.trim())
      newErrors.telefone = "Telefone é obrigatório";
    if (!formData.rua.trim()) newErrors.rua = "Rua é obrigatória";
    if (!formData.numero.trim()) newErrors.numero = "Número é obrigatório";
    if (!formData.cidade.trim()) newErrors.cidade = "Cidade é obrigatória";
    if (!formData.estado.trim()) newErrors.estado = "Estado é obrigatório";
    if (!formData.nomeAdmin.trim())
      newErrors.nomeAdmin = "Nome do Admin é obrigatório";
    if (!formData.emailAdmin.trim()) {
      newErrors.emailAdmin = "Email do Admin é obrigatório";
    } else if (!/\S+@\S+\.\S+/.test(formData.emailAdmin)) {
      newErrors.emailAdmin = "Email do Admin inválido";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      setSubmitAttempted(true);
      return;
    }
    setShowConfirmDialog(true);
  };

  const confirmSubmit = async () => {
    setLoading(true);
    setShowConfirmDialog(false);

    try {
      const addressParts = [
        formData.rua,
        formData.numero,
        formData.complemento,
        formData.cidade,
        formData.estado,
        formData.cep,
      ].filter(Boolean);

      const created = await apiClient.createCompany({
        name: formData.nomeFantasia || formData.razaoSocial,
        cnpj: formData.cnpj || undefined,
        email: formData.emailPrincipal || undefined,
        phone: formData.telefone || undefined,
        status:
          formData.status === "ativo" ? "ativo" : formData.status || "ativo",
        address: addressParts.join(", ") || undefined,
        description: formData.razaoSocial || undefined,
      });

      toast({
        title: "Sucesso",
        description: "Empresa criada com sucesso!",
      });

      onCreate(created);
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Falha ao criar empresa",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateField = (
    field: keyof FormData,
    value: string | CompanyStatus,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Avatar handlers
  const processImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      setRawImageSrc(src);
      setOriginalRawSrc(src);
      setCropZoom(1);
      setCropOffset({ x: 0, y: 0 });
      setCropOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarClick = () => {
    if (avatarPreview) {
      setShowAvatarMenu((p) => !p);
    } else {
      fileInputRef.current?.click();
    }
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    processImageFile(file);
  };
  const handleDropUpload = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverUpload(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processImageFile(file);
  };
  const handleCropConfirm = () => {
    const img = cropImgRef.current;
    if (!img) return;
    const canvas = document.createElement("canvas");
    canvas.width = CROP_SIZE;
    canvas.height = CROP_SIZE;
    const ctx = canvas.getContext("2d")!;
    ctx.beginPath();
    ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    // objectFit:contain scales the image to fit within CROP_SIZE — we must account for that
    const fitScale = Math.min(
      CROP_SIZE / img.naturalWidth,
      CROP_SIZE / img.naturalHeight,
    );
    const drawW = img.naturalWidth * fitScale * cropZoom;
    const drawH = img.naturalHeight * fitScale * cropZoom;
    const dx = CROP_SIZE / 2 + cropOffset.x - drawW / 2;
    const dy = CROP_SIZE / 2 + cropOffset.y - drawH / 2;
    ctx.drawImage(img, dx, dy, drawW, drawH);
    setAvatarPreview(canvas.toDataURL("image/jpeg", 0.92));
    setCropOpen(false);
    setRawImageSrc(null);
  };

  const formatCnpj = (value: string): string => {
    const d = value.replace(/\D/g, "").slice(0, 14);
    return d
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  };

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateField("cnpj", formatCnpj(e.target.value));
  };

  // Error counts per accordion section
  const sectionErrors = {
    cadastrais: [errors.razaoSocial, errors.nomeFantasia, errors.cnpj].filter(
      Boolean,
    ).length,
    contato: [errors.emailPrincipal, errors.telefone].filter(Boolean).length,
    endereco: [errors.rua, errors.numero, errors.cidade, errors.estado].filter(
      Boolean,
    ).length,
    admin: [errors.nomeAdmin, errors.emailAdmin].filter(Boolean).length,
  };
  const totalErrors = Object.values(sectionErrors).reduce((a, b) => a + b, 0);

  const panelWidth = `calc(100vw - ${sidebarWidth}px)`;

  if (!open && !isClosing) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed top-0 bottom-0 right-0 z-40 bg-black/20 backdrop-blur-[2px] transition-opacity duration-[420ms]",
          isClosing ? "opacity-0" : "opacity-100",
        )}
        style={{ left: `${sidebarWidth}px` }}
        onClick={() => {
          setIsClosing(true);
          setTimeout(() => {
            setIsClosing(false);
            onOpenChange(false);
          }, 420);
        }}
      />
      <div
        data-slot="sheet-content"
        data-state={isClosing ? "closed" : "open"}
        className="fixed top-0 right-0 h-[calc(100vh-24px)] bg-background flex flex-col border-l border-border z-50 shadow-2xl overflow-hidden data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=closed]:fade-out-0"
        style={{ left: `${sidebarWidth}px`, width: panelWidth }}
      >
        <div className="relative h-full flex flex-col overflow-hidden">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Header with Brand Theme */}
          <ModalBrandHeader
            title={formData.nomeFantasia || "Nova Empresa"}
            subtitle="Configure os dados da empresa"
            left={
              <button
                onClick={handleAvatarClick}
                className="relative h-20 w-20 rounded-full bg-white/15 border-2 border-white/30 flex-shrink-0 group overflow-hidden hover:border-white/60 transition-all"
              >
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-600 to-violet-600">
                  <Camera className="h-7 w-7 text-white/70" />
                </div>
                {avatarPreview && (
                  <img
                    src={avatarPreview}
                    alt="logo"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                  <Camera className="h-5 w-5 text-white" />
                  <span className="text-[9px] text-white/90 font-medium mt-0.5">
                    {avatarPreview ? "Editar" : "Foto"}
                  </span>
                </div>
              </button>
            }
            onClose={() => handleClose()}
          />

          {/* Avatar menu */}
          {showAvatarMenu && avatarPreview && (
            <>
              <div
                className="absolute inset-0 z-40"
                onClick={() => setShowAvatarMenu(false)}
              />
              <div
                className="absolute z-50 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden min-w-[172px]"
                style={{ top: 108, left: 22 }}
              >
                <button
                  onClick={() => {
                    setShowAvatarMenu(false);
                    setTimeout(() => fileInputRef.current?.click(), 10);
                  }}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Camera className="h-3.5 w-3.5 text-gray-400" />
                  Nova foto
                </button>
                {originalRawSrc && (
                  <button
                    onClick={() => {
                      setShowAvatarMenu(false);
                      setRawImageSrc(originalRawSrc);
                      setCropZoom(1);
                      setCropOffset({ x: 0, y: 0 });
                      setCropOpen(true);
                    }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
                  >
                    <ZoomIn className="h-3.5 w-3.5 text-gray-400" />
                    Reposicionar
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowAvatarMenu(false);
                    setAvatarPreview(null);
                    setOriginalRawSrc(null);
                  }}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors border-t border-gray-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remover foto
                </button>
              </div>
            </>
          )}

          {/* Crop overlay */}
          {cropOpen && rawImageSrc && (
            <div className="absolute inset-0 z-50 flex flex-col bg-black/90">
              <div className="flex-shrink-0 px-6 pt-5 pb-2 text-center">
                <p className="text-white text-sm font-semibold">
                  Ajustar logo da empresa
                </p>
                <p className="text-white/50 text-xs mt-0.5">
                  Arraste para reposicionar · use o zoom para ajustar
                </p>
              </div>
              <div className="flex-1 flex items-center justify-center overflow-hidden">
                <div
                  className="relative flex-shrink-0"
                  style={{ width: CROP_SIZE, height: CROP_SIZE }}
                  onMouseDown={(e) => {
                    setIsDragging(true);
                    setDragStart({
                      x: e.clientX - cropOffset.x,
                      y: e.clientY - cropOffset.y,
                    });
                  }}
                  onMouseMove={(e) => {
                    if (!isDragging) return;
                    setCropOffset({
                      x: e.clientX - dragStart.x,
                      y: e.clientY - dragStart.y,
                    });
                  }}
                  onMouseUp={() => setIsDragging(false)}
                  onMouseLeave={() => setIsDragging(false)}
                >
                  {/* Dimmed full image */}
                  <img
                    ref={cropImgRef}
                    src={rawImageSrc}
                    alt="crop"
                    draggable={false}
                    style={{
                      transform: `translate(${cropOffset.x}px,${cropOffset.y}px) scale(${cropZoom})`,
                      transformOrigin: "center",
                      userSelect: "none",
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      opacity: 0.35,
                    }}
                  />
                  {/* Bright circle */}
                  <div
                    className="absolute inset-0 overflow-hidden"
                    style={{
                      clipPath: `circle(${CROP_SIZE / 2}px at 50% 50%)`,
                      pointerEvents: "none",
                    }}
                  >
                    <img
                      src={rawImageSrc}
                      alt="crop-bright"
                      draggable={false}
                      style={{
                        transform: `translate(${cropOffset.x}px,${cropOffset.y}px) scale(${cropZoom})`,
                        transformOrigin: "center",
                        userSelect: "none",
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                      }}
                    />
                  </div>
                  {/* Circle border */}
                  <div
                    className="absolute inset-0 rounded-full border-2 border-white/60 pointer-events-none"
                    style={{ borderRadius: "50%" }}
                  />
                </div>
              </div>
              <div className="flex-shrink-0 px-6 pb-3 space-y-3">
                <div className="flex items-center gap-3">
                  <Camera className="h-4 w-4 text-white/60 flex-shrink-0" />
                  <input
                    type="range"
                    min={0.1}
                    max={3}
                    step={0.01}
                    value={cropZoom}
                    onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                    className="flex-1 accent-white"
                  />
                  <button
                    onClick={() => setCropOffset({ x: 0, y: 0 })}
                    className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex-shrink-0"
                    title="Centralizar"
                  >
                    <Crosshair className="h-4 w-4 text-white" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setCropOpen(false);
                      setRawImageSrc(null);
                    }}
                    className="flex-1 h-9 rounded-lg border border-white/20 text-white/70 text-sm hover:bg-white/10 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCropConfirm}
                    className="flex-1 h-9 rounded-lg btn-brand text-sm font-semibold transition-colors"
                  >
                    Usar esta foto
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Conteúdo com Abas em Accordions */}
          <div className="flex-1 overflow-y-auto px-[50px] py-[50px] bg-slate-200">
            {/* ── Logo upload zone ── */}
            {avatarPreview ? (
              <div className="relative mb-5 rounded-xl border border-slate-200 bg-white shadow-sm p-4 flex items-center gap-4">
                <div className="relative h-16 w-16 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-blue-100 shadow">
                  <img src={avatarPreview} alt="logo" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700">Logo cadastrada</p>
                  <p className="text-xs text-slate-400 mt-0.5">Imagem do perfil da empresa</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {originalRawSrc && (
                    <button
                      type="button"
                      onClick={() => { setRawImageSrc(originalRawSrc); setCropZoom(1); setCropOffset({ x: 0, y: 0 }); setCropOpen(true); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Editar foto
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-xs font-medium text-blue-600 hover:bg-blue-100 transition-colors"
                  >
                    <Camera className="h-3.5 w-3.5" /> Trocar foto
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAvatarPreview(null); setOriginalRawSrc(null); }}
                    className="h-8 w-8 flex items-center justify-center rounded-lg border border-red-100 text-red-400 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                className={cn(
                  "relative mb-5 rounded-xl border-2 border-dashed transition-all duration-200 p-6 flex flex-col items-center justify-center gap-3 cursor-pointer select-none",
                  isDragOverUpload
                    ? "border-blue-400 bg-blue-50 scale-[1.005]"
                    : "border-slate-300 bg-white hover:border-blue-400 hover:bg-blue-50/40",
                )}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragOverUpload(true); }}
                onDragLeave={() => setIsDragOverUpload(false)}
                onDrop={handleDropUpload}
              >
                <div className={cn(
                  "h-14 w-14 rounded-full flex items-center justify-center transition-colors",
                  isDragOverUpload ? "bg-blue-100" : "bg-slate-100",
                )}>
                  <ImagePlus className={cn("h-7 w-7 transition-colors", isDragOverUpload ? "text-blue-500" : "text-slate-400")} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-600">
                    {isDragOverUpload ? "Solte para adicionar!" : "Logo da empresa"}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Arraste aqui ou{" "}
                    <span className="text-blue-500 font-medium underline underline-offset-2">
                      selecione um arquivo
                    </span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1.5">PNG, JPG ou WEBP · Máx. 5MB</p>
                </div>
              </div>
            )}

            {/* ── Status + Expand row ── */}
            <div className="flex items-center justify-between mb-4">
              <div className="px-3 py-2 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg">
                <CompanyStatusSelector
                  value={formData.status}
                  onChange={(status) => updateField("status", status)}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  const allOpen = CREATE_ALL_ACCORDIONS.every((a) =>
                    createOpenAccordions.includes(a),
                  );
                  setCreateOpenAccordions(allOpen ? [] : CREATE_ALL_ACCORDIONS);
                }}
                className="flex items-center gap-2 group"
                title={
                  CREATE_ALL_ACCORDIONS.every((a) =>
                    createOpenAccordions.includes(a),
                  )
                    ? "Fechar todos"
                    : "Abrir todos"
                }
              >
                <span className="text-xs text-slate-500 group-hover:text-slate-700 transition-colors select-none">
                  {CREATE_ALL_ACCORDIONS.every((a) =>
                    createOpenAccordions.includes(a),
                  )
                    ? "Fechar"
                    : "Expandir"}
                </span>
                <div
                  className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
                    CREATE_ALL_ACCORDIONS.every((a) =>
                      createOpenAccordions.includes(a),
                    )
                      ? "bg-blue-600"
                      : "bg-slate-300"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
                      CREATE_ALL_ACCORDIONS.every((a) =>
                        createOpenAccordions.includes(a),
                      )
                        ? "translate-x-4"
                        : "translate-x-0.5"
                    }`}
                  />
                </div>
              </button>
            </div>

            {/* Validation warning banner */}
            {submitAttempted && totalErrors > 0 && (
              <div className="mb-4 flex items-center gap-2.5 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-700 font-medium">
                  {totalErrors === 1
                    ? "Falta 1 campo obrigatório para preencher"
                    : `Faltam ${totalErrors} campos obrigatórios para preencher`}
                </p>
              </div>
            )}
            <Accordion
              type="multiple"
              value={createOpenAccordions}
              onValueChange={setCreateOpenAccordions}
              className="space-y-2"
            >
              {/* SEÇÃO 1: DADOS CADASTRAIS */}
              <AccordionItem
                value="cadastrais"
                className={cn(
                  "border rounded-lg overflow-hidden",
                  sectionErrors.cadastrais > 0
                    ? "border-red-300"
                    : "border-slate-200",
                )}
              >
                <AccordionTrigger
                  className={cn(
                    "px-3 py-2 text-xs font-semibold",
                    sectionErrors.cadastrais > 0
                      ? "bg-red-50 hover:bg-red-100"
                      : "bg-white hover:bg-slate-50",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-700">1</Badge>
                    Dados Cadastrais da Empresa
                    {sectionErrors.cadastrais > 0 && (
                      <span className="ml-1 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                        {sectionErrors.cadastrais}
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="border-t bg-white px-3 py-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs font-medium text-slate-600">
                          Razão Social *
                        </Label>
                        <Input
                          placeholder="Empresa LTDA"
                          value={formData.razaoSocial}
                          onChange={(e) =>
                            updateField("razaoSocial", e.target.value)
                          }
                          className={cn(
                            "h-8 text-xs",
                            errors.razaoSocial && "border-red-400",
                          )}
                        />
                        {errors.razaoSocial && (
                          <p className="text-xs text-red-500">
                            {errors.razaoSocial}
                          </p>
                        )}
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs font-medium text-slate-600">
                          Nome Fantasia *
                        </Label>
                        <Input
                          placeholder="Empresa"
                          value={formData.nomeFantasia}
                          onChange={(e) =>
                            updateField("nomeFantasia", e.target.value)
                          }
                          className={cn(
                            "h-8 text-xs",
                            errors.nomeFantasia && "border-red-400",
                          )}
                        />
                        {errors.nomeFantasia && (
                          <p className="text-xs text-red-500">
                            {errors.nomeFantasia}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-slate-600">
                          CNPJ *
                        </Label>
                        <Input
                          placeholder="12.345.678/0001-90"
                          value={formData.cnpj}
                          onChange={handleCnpjChange}
                          maxLength={18}
                          className={cn(
                            "h-8 text-xs font-mono tracking-wide",
                            errors.cnpj && "border-red-400",
                          )}
                        />
                        {errors.cnpj && (
                          <p className="text-xs text-red-500">{errors.cnpj}</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-slate-600">
                          Inscrição Estadual
                        </Label>
                        <Input
                          placeholder="Opcional"
                          value={formData.inscricaoEstadual}
                          onChange={(e) =>
                            updateField("inscricaoEstadual", e.target.value)
                          }
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* SEÇÃO 2: CONTATO */}
              <AccordionItem
                value="contato"
                className={cn(
                  "border rounded-lg overflow-hidden",
                  sectionErrors.contato > 0
                    ? "border-red-300"
                    : "border-slate-200",
                )}
              >
                <AccordionTrigger
                  className={cn(
                    "px-3 py-2 text-xs font-semibold",
                    sectionErrors.contato > 0
                      ? "bg-red-50 hover:bg-red-100"
                      : "bg-white hover:bg-slate-50",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-700">2</Badge>
                    Contato
                    {sectionErrors.contato > 0 && (
                      <span className="ml-1 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                        {sectionErrors.contato}
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="border-t bg-white px-3 py-3 grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs font-medium text-slate-600">
                        Email Principal *
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                        <Input
                          type="email"
                          placeholder="contact@empresa.com"
                          value={formData.emailPrincipal}
                          onChange={(e) =>
                            updateField("emailPrincipal", e.target.value)
                          }
                          className={cn(
                            "h-8 text-xs pl-8",
                            errors.emailPrincipal && "border-red-400",
                          )}
                        />
                      </div>
                      {errors.emailPrincipal && (
                        <p className="text-xs text-red-500">
                          {errors.emailPrincipal}
                        </p>
                      )}
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs font-medium text-slate-600">
                        Telefone *
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                        <Input
                          placeholder="(11) 98765-4321"
                          value={formData.telefone}
                          onChange={(e) =>
                            updateField("telefone", e.target.value)
                          }
                          className={cn(
                            "h-8 text-xs pl-8",
                            errors.telefone && "border-red-400",
                          )}
                        />
                      </div>
                      {errors.telefone && (
                        <p className="text-xs text-red-500">
                          {errors.telefone}
                        </p>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* SEÇÃO 3: REDES SOCIAIS */}
              <AccordionItem
                value="social"
                className="border border-slate-200 rounded-lg overflow-hidden"
              >
                <AccordionTrigger className="px-3 py-2 bg-white hover:bg-slate-50 text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-700">3</Badge>
                    Redes Sociais
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 py-2">
                  <CompanySocialLinksManager
                    socialLinks={formData.socialLinks}
                    onChange={(links) => updateField("socialLinks", links)}
                  />
                </AccordionContent>
              </AccordionItem>

              {/* SEÇÃO 4: ENDEREÇO */}
              <AccordionItem
                value="endereco"
                className={cn(
                  "border rounded-lg overflow-hidden",
                  sectionErrors.endereco > 0
                    ? "border-red-300"
                    : "border-slate-200",
                )}
              >
                <AccordionTrigger
                  className={cn(
                    "px-3 py-2 text-xs font-semibold",
                    sectionErrors.endereco > 0
                      ? "bg-red-50 hover:bg-red-100"
                      : "bg-white hover:bg-slate-50",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Badge className="bg-purple-100 text-purple-700">4</Badge>
                    Endereço
                    {sectionErrors.endereco > 0 && (
                      <span className="ml-1 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                        {sectionErrors.endereco}
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 py-4 space-y-6">
                  {/* Seletor de Endereço com Mapa */}
                  <div className="col-span-2">
                    <Label className="text-sm font-semibold mb-3 block">
                      Localização (Selecione no Mapa) *
                    </Label>
                    <AddressMapPicker
                      address={{
                        street: formData.rua,
                        number: formData.numero,
                        district: formData.complemento,
                        city: formData.cidade,
                        state: formData.estado,
                        zipcode: formData.cep,
                        lat: formData.latitude,
                        lng: formData.longitude,
                      }}
                      onAddressChange={(address) => {
                        updateField("rua", address.street);
                        updateField("numero", address.number);
                        updateField("complemento", address.district);
                        updateField("cidade", address.city);
                        updateField("estado", address.state);
                        updateField("cep", address.zipcode);
                        updateField("latitude", address.lat);
                        updateField("longitude", address.lng);
                        if (address.placeId)
                          updateField("place_id", address.placeId);
                        if (address.formatted)
                          updateField("formatted_address", address.formatted);
                      }}
                    />
                  </div>

                  {/* Campos Manuais (para correção rápida) */}
                  <div className="border-t pt-4">
                    <p className="text-xs text-gray-600 mb-4">
                      Você também pode editar os campos abaixo manualmente
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <Label className="text-sm font-semibold">CEP</Label>
                        <Input
                          placeholder="01310-100"
                          value={formData.cep}
                          onChange={(e) => updateField("cep", e.target.value)}
                        />
                      </div>

                      <div className="col-span-2">
                        <Label className="text-sm font-semibold">Rua *</Label>
                        <Input
                          placeholder="Avenida Paulista"
                          value={formData.rua}
                          onChange={(e) => updateField("rua", e.target.value)}
                          className={errors.rua ? "border-red-500" : ""}
                        />
                        {errors.rua && (
                          <p className="text-xs text-red-500 mt-1">
                            {errors.rua}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label className="text-sm font-semibold">
                          Número *
                        </Label>
                        <Input
                          placeholder="1000"
                          value={formData.numero}
                          onChange={(e) =>
                            updateField("numero", e.target.value)
                          }
                          className={errors.numero ? "border-red-500" : ""}
                        />
                        {errors.numero && (
                          <p className="text-xs text-red-500 mt-1">
                            {errors.numero}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label className="text-sm font-semibold">
                          Complemento
                        </Label>
                        <Input
                          placeholder="Apto 1000"
                          value={formData.complemento}
                          onChange={(e) =>
                            updateField("complemento", e.target.value)
                          }
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-semibold">
                          Cidade *
                        </Label>
                        <Input
                          placeholder="São Paulo"
                          value={formData.cidade}
                          onChange={(e) =>
                            updateField("cidade", e.target.value)
                          }
                          className={errors.cidade ? "border-red-500" : ""}
                        />
                        {errors.cidade && (
                          <p className="text-xs text-red-500 mt-1">
                            {errors.cidade}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label className="text-sm font-semibold">
                          Estado *
                        </Label>
                        <Select
                          value={formData.estado}
                          onValueChange={(value) =>
                            updateField("estado", value)
                          }
                        >
                          <SelectTrigger
                            className={errors.estado ? "border-red-500" : ""}
                          >
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SP">SP</SelectItem>
                            <SelectItem value="RJ">RJ</SelectItem>
                            <SelectItem value="MG">MG</SelectItem>
                            <SelectItem value="BA">BA</SelectItem>
                            <SelectItem value="SC">SC</SelectItem>
                            <SelectItem value="PR">PR</SelectItem>
                          </SelectContent>
                        </Select>
                        {errors.estado && (
                          <p className="text-xs text-red-500 mt-1">
                            {errors.estado}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* SEÇÃO 5: TIPO DE CONTA */}
              <AccordionItem
                value="tipoConta"
                className="border border-slate-200 rounded-lg overflow-hidden"
              >
                <AccordionTrigger className="px-3 py-2 bg-white hover:bg-slate-50 text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-orange-100 text-orange-700">5</Badge>
                    Tipo de Conta
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="border-t bg-white px-3 py-4">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        {
                          value: "dependent",
                          label: "Dependente",
                          desc: "Gerenciada por outra empresa",
                          Icon: Building,
                          gradient: "from-blue-50",
                          border: "border-blue-200",
                          ring: "ring-blue-400",
                          activeText: "text-blue-700",
                          activeBg: "bg-blue-100",
                        },
                        {
                          value: "independent",
                          label: "Independente",
                          desc: "Autonomia total",
                          Icon: Building2,
                          gradient: "from-green-50",
                          border: "border-green-200",
                          ring: "ring-green-400",
                          activeText: "text-green-700",
                          activeBg: "bg-green-100",
                        },
                        {
                          value: "agency",
                          label: "Agência",
                          desc: "Gestora de projetos",
                          Icon: Layers,
                          gradient: "from-purple-50",
                          border: "border-purple-200",
                          ring: "ring-purple-400",
                          activeText: "text-purple-700",
                          activeBg: "bg-purple-100",
                        },
                        {
                          value: "partner",
                          label: "Partner",
                          desc: "Parceiro de plataforma",
                          Icon: Users,
                          gradient: "from-amber-50",
                          border: "border-amber-200",
                          ring: "ring-amber-400",
                          activeText: "text-amber-700",
                          activeBg: "bg-amber-100",
                        },
                      ].map((opt) => {
                        const isSelected = formData.tipoContato === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => updateField("tipoContato", opt.value)}
                            className={cn(
                              "flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all duration-150 bg-gradient-to-br to-white",
                              opt.gradient,
                              opt.border,
                              isSelected
                                ? `ring-2 ring-offset-1 ${opt.ring} border-transparent shadow-md`
                                : "hover:shadow-sm",
                            )}
                          >
                            <div className={cn(
                              "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors",
                              isSelected ? opt.activeBg : "bg-white/80",
                            )}>
                              <opt.Icon className={cn("h-4 w-4", isSelected ? opt.activeText : "text-slate-400")} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={cn("text-xs font-semibold", isSelected ? opt.activeText : "text-slate-700")}>
                                {opt.label}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{opt.desc}</p>
                            </div>
                            {isSelected && (
                              <Check className={cn("h-4 w-4 flex-shrink-0 mt-0.5", opt.activeText)} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* SEÇÃO 6: PLANO DE CRÉDITOS */}
              <AccordionItem
                value="plano"
                className="border border-slate-200 rounded-lg overflow-hidden"
              >
                <AccordionTrigger className="px-3 py-2 bg-white hover:bg-slate-50 text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-indigo-100 text-indigo-700">6</Badge>
                    Plano de Créditos
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="border-t bg-white px-3 py-4">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: "lite",       label: "Lite",       price: "R$ 300/mês",   desc: "Ativa conta agency",          from: "from-slate-50",  border: "border-slate-200",  ring: "ring-slate-400",  badge: "bg-slate-100 text-slate-600",   check: "text-slate-600" },
                        { id: "start",      label: "Start",      price: "R$ 500/mês",   desc: "5% desconto",                 from: "from-sky-50",    border: "border-sky-200",    ring: "ring-sky-400",    badge: "bg-sky-100 text-sky-700",       check: "text-sky-600" },
                        { id: "standard",   label: "Standard",   price: "R$ 1.000/mês", desc: "10% desconto",                from: "from-blue-50",   border: "border-blue-200",   ring: "ring-blue-400",   badge: "bg-blue-100 text-blue-700",     check: "text-blue-600" },
                        { id: "growth",     label: "Growth",     price: "R$ 1.500/mês", desc: "15% desconto",                from: "from-violet-50", border: "border-violet-200", ring: "ring-violet-400", badge: "bg-violet-100 text-violet-700", check: "text-violet-600" },
                        { id: "scale",      label: "Scale",      price: "R$ 3.000/mês", desc: "20% desconto",                from: "from-purple-50", border: "border-purple-200", ring: "ring-purple-400", badge: "bg-purple-100 text-purple-700", check: "text-purple-600" },
                        { id: "squad",      label: "Squad",      price: "R$ 5.000/mês", desc: "Agências · 20% + pós pago",   from: "from-pink-50",   border: "border-pink-200",   ring: "ring-pink-400",   badge: "bg-pink-100 text-pink-700",     check: "text-pink-600" },
                        { id: "enterprise", label: "Enterprise", price: "R$ 5.000/mês", desc: "Empresas · pós pago",         from: "from-rose-50",   border: "border-rose-200",   ring: "ring-rose-400",   badge: "bg-rose-100 text-rose-700",     check: "text-rose-600" },
                      ].map((plan) => {
                        const isSelected = formData.planoCreditoId === plan.id;
                        return (
                          <button
                            key={plan.id}
                            type="button"
                            onClick={() => updateField("planoCreditoId", plan.id)}
                            className={cn(
                              "flex flex-col items-start gap-1 p-3 rounded-xl border-2 bg-gradient-to-br to-white text-left transition-all duration-150",
                              plan.from,
                              plan.border,
                              isSelected
                                ? `ring-2 ring-offset-1 ${plan.ring} border-transparent shadow-md`
                                : "hover:shadow-sm",
                              plan.id === "enterprise" && "col-span-2",
                            )}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md", plan.badge)}>
                                {plan.label}
                              </span>
                              {isSelected && (
                                <Check className={cn("h-4 w-4 flex-shrink-0", plan.check)} />
                              )}
                            </div>
                            <p className="text-sm font-bold text-slate-800 mt-0.5">{plan.price}</p>
                            <p className="text-[10px] text-slate-500 leading-tight">{plan.desc}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* SEÇÃO 7: MÉTODOS DE PAGAMENTO */}
              <AccordionItem
                value="pagamento"
                className="border border-slate-200 rounded-lg overflow-hidden"
              >
                <AccordionTrigger className="px-3 py-2 bg-white hover:bg-slate-50 text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-cyan-100 text-cyan-700">7</Badge>
                    Métodos de Pagamento
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="border-t bg-white px-3 py-3">
                    <p className="text-xs font-medium text-slate-600 mb-2">
                      Método Padrão
                    </p>
                    <RadioGroup
                      value={formData.metodoPagamento}
                      onValueChange={(value) =>
                        updateField("metodoPagamento", value)
                      }
                      className="grid grid-cols-2 gap-2"
                    >
                      {[
                        { value: "pix", label: "PIX", emoji: "⚡" },
                        { value: "boleto", label: "Boleto", emoji: "📄" },
                        {
                          value: "cartao",
                          label: "Cartão de Crédito",
                          emoji: "💳",
                        },
                        { value: "allkoin", label: "ALLKOIN", emoji: "🪙" },
                      ].map((opt) => (
                        <label
                          key={opt.value}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg border bg-white cursor-pointer transition-all text-xs font-medium text-slate-700 hover:border-cyan-300 hover:bg-cyan-50",
                            formData.metodoPagamento === opt.value &&
                              "border-cyan-400 bg-cyan-50 ring-2 ring-offset-1 ring-cyan-300",
                          )}
                        >
                          <RadioGroupItem
                            value={opt.value}
                            className="flex-shrink-0"
                          />
                          <span>{opt.emoji}</span>
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </RadioGroup>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* SEÇÃO 8: USUÁRIO ADMINISTRADOR */}
              <AccordionItem
                value="admin"
                className={cn(
                  "border rounded-lg overflow-hidden",
                  sectionErrors.admin > 0
                    ? "border-red-300"
                    : "border-slate-200",
                )}
              >
                <AccordionTrigger
                  className={cn(
                    "px-3 py-2 text-xs font-semibold",
                    sectionErrors.admin > 0
                      ? "bg-red-50 hover:bg-red-100"
                      : "bg-white hover:bg-slate-50",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Badge className="bg-rose-100 text-rose-700">8</Badge>
                    Usuário Administrador Inicial
                    {sectionErrors.admin > 0 && (
                      <span className="ml-1 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                        {sectionErrors.admin}
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="border-t bg-white px-3 py-3 space-y-3">
                    <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100">
                      <AlertCircle className="h-3.5 w-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-700">
                        Este será o primeiro usuário com acesso total à empresa
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-slate-600">
                        Nome *
                      </Label>
                      <div className="relative">
                        <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                        <Input
                          placeholder="João Silva"
                          value={formData.nomeAdmin}
                          onChange={(e) =>
                            updateField("nomeAdmin", e.target.value)
                          }
                          className={cn(
                            "h-8 text-xs pl-8",
                            errors.nomeAdmin && "border-red-400",
                          )}
                        />
                      </div>
                      {errors.nomeAdmin && (
                        <p className="text-xs text-red-500">
                          {errors.nomeAdmin}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-slate-600">
                        Email *
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                        <Input
                          type="email"
                          placeholder="joao@empresa.com"
                          value={formData.emailAdmin}
                          onChange={(e) =>
                            updateField("emailAdmin", e.target.value)
                          }
                          className={cn(
                            "h-8 text-xs pl-8",
                            errors.emailAdmin && "border-red-400",
                          )}
                        />
                      </div>
                      {errors.emailAdmin && (
                        <p className="text-xs text-red-500">
                          {errors.emailAdmin}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 border border-slate-200">
                      <Check className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                      <span className="text-xs text-slate-600">
                        Perfil:{" "}
                        <span className="font-semibold text-slate-800">
                          Administrador
                        </span>
                      </span>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800">
                A empresa será criada e o usuário administrador receberá um
                convite por email para configurar sua senha.
              </p>
            </div>
          </div>

          {/* Rodapé Fixo */}
          <div className="flex items-center gap-3 px-[25px] py-[15px] border-t bg-slate-50 flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => handleClose()}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              className="btn-brand"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Criando..." : "Criar Empresa"}
            </Button>
          </div>
        </div>
      </div>

      {/* Diálogo de Confirmação */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Criação de Empresa</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente criar a empresa{" "}
              <strong>{formData.nomeFantasia}</strong> com as configurações
              informadas?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSubmit} className="btn-brand">
              Criar Empresa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
