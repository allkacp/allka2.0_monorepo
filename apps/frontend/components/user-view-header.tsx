// @ts-nocheck
import React, { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Download,
  Save,
  XCircle,
  Eye,
  EyeOff,
  Star,
  Upload,
  Camera,
} from "lucide-react";
import { useSidebar } from "@/contexts/sidebar-context";
import { ModalBrandHeader } from "@/components/ui/modal-brand-header";
import { QuickContactActions } from "@/components/quick-contact-actions";
import { CopyLinkButton } from "@/components/copy-link-button";

interface UserViewHeaderProps {
  user: UserType;
  isEditMode: boolean;
  isSaving: boolean;
  onSave: () => void;
  onCancel: () => void;
  onClose: () => void;
  onExport: () => void;
  userLevel: number; // 1-5
  levelProgress: number; // 0-100
  userAccountStatus: "ativo" | "inativo" | "pausado" | "suspenso";
  userAccountType?: string; // Company, Nomad, Agency
  userPlan: "free" | "premium" | "vip";
  showBalance: boolean;
  onToggleBalance: () => void;
}

const getInitials = (name: string): string => {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const statusConfig = {
  ativo: {
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  inativo: { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-500" },
  pausado: { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
  suspenso: { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
};

const planConfig = {
  free: { bg: "bg-slate-100", text: "text-slate-700", label: "Free" },
  premium: { bg: "bg-blue-100", text: "text-blue-700", label: "Premium" },
  vip: { bg: "bg-amber-100", text: "text-amber-700", label: "VIP" },
};

const accountTypeConfig = {
  company: { bg: "bg-purple-100", text: "text-purple-700", label: "Company" },
  nomad: { bg: "bg-blue-100", text: "text-blue-700", label: "Nomad" },
  agency: { bg: "bg-orange-100", text: "text-orange-700", label: "Agency" },
};

export function UserViewHeader({
  user,
  isEditMode,
  isSaving,
  onSave,
  onCancel,
  onClose,
  onExport,
  userLevel,
  levelProgress,
  userAccountStatus,
  userAccountType,
  userPlan,
  showBalance,
  onToggleBalance,
}: UserViewHeaderProps) {
  const [avatar, setAvatar] = useState<string | null>(user.avatar || null);
  const [showAvatarUpload, setShowAvatarUpload] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [tempAvatar, setTempAvatar] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const statusConfig_ = statusConfig[userAccountStatus];
  const planConfig_ = planConfig[userPlan];

  useEffect(() => {
    setAvatar(user.avatar || null);
  }, [user.avatar]);

  const openAvatarModal = () => {
    setTempAvatar(user.avatar || null);
    setIsAvatarModalOpen(true);
  };

  const closeAvatarModal = () => {
    setTempAvatar(null);
    setSelectedFile(null);
    setIsAvatarModalOpen(false);
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    const preview = URL.createObjectURL(file);
    setTempAvatar(preview);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleSaveAvatar = async () => {
    if (!selectedFile || !user?.id) return;

    try {
      const formData = new FormData();
      formData.append("avatar", selectedFile);
      formData.append("userId", user.id);

      const response = await fetch(`/api/users/${user.id}/avatar`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Erro ao salvar avatar");
      }

      const data = await response.json();

      // Atualiza avatar com a URL retornada pelo backend
      setAvatar(data.avatarUrl);
      setTempAvatar(null);
      setSelectedFile(null);
      setIsAvatarModalOpen(false);
    } catch (error) {
      console.error("Avatar upload error:", error);
      alert("Erro ao salvar imagem de perfil");
    }
  };

  const accountTypePtLabel: Record<string, string> = {
    company: "Company",
    nomad: "Nomad",
    agency: "Agency",
  };

  // Formata o role do usuário para exibição (ex: "company_admin" → "Company Admin")
  const formatRole = (role?: string) => {
    if (!role) return undefined;
    return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <ModalBrandHeader
      title={user.name}
      subtitle={formatRole(user.role as string)}
      left={
        <div className="flex-shrink-0 relative">
          <div className="relative">
            <Avatar className="h-16 w-16 border-2 border-white/20">
              <AvatarFallback className="bg-gradient-to-br from-blue-600 to-cyan-500 text-white font-bold text-lg">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>

            <button
              onClick={openAvatarModal}
              className="absolute -bottom-1 -right-1 bg-blue-600 hover:bg-blue-700 p-1.5 rounded-full border border-white shadow transition"
            >
              <Camera className="h-3 w-3 text-white" />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>
      }
      right={
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Status and Plan Badges */}
          <div className="flex items-center gap-2">
            <Badge
              className={`${statusConfig[userAccountStatus].bg} ${statusConfig[userAccountStatus].text} border-0 font-semibold text-xs py-1 px-2`}
            >
              <span
                className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${statusConfig[userAccountStatus].dot}`}
              />
              {userAccountStatus.charAt(0).toUpperCase() +
                userAccountStatus.slice(1)}
            </Badge>
            {userAccountType && (
              <Badge
                className={`${
                  accountTypeConfig[
                    userAccountType.toLowerCase() as keyof typeof accountTypeConfig
                  ]?.bg || "bg-slate-100"
                } ${
                  accountTypeConfig[
                    userAccountType.toLowerCase() as keyof typeof accountTypeConfig
                  ]?.text || "text-slate-700"
                } border-0 font-semibold text-xs py-1 px-2`}
              >
                {accountTypeConfig[
                  userAccountType.toLowerCase() as keyof typeof accountTypeConfig
                ]?.label || userAccountType}
              </Badge>
            )}
          </div>

          {/* Quick Contact Actions */}
          <QuickContactActions
            user={{
              id: user.id,
              name: user.name,
              email: user.email,
              phone: user.phone,
              account_type: user.account_type,
              online_status: user.online_status,
            }}
            variant="dark"
          />

          {/* Wallet Balance Card */}
          <div className="flex items-center gap-2 bg-gradient-to-r from-blue-900/40 to-cyan-900/40 px-4 py-2 rounded-lg border border-blue-700/50">
            <div className="flex-1">
              <p className="text-blue-300 text-xs font-semibold uppercase tracking-wide">
                Saldo ALLKOIN
              </p>
              <p className="text-white font-bold text-sm">
                {showBalance
                  ? `R$ ${(user.wallet_balance || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                  : "••••••"}
              </p>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onToggleBalance}
                    className="text-blue-300 hover:text-blue-200 hover:bg-blue-800/50 p-1.5 rounded transition-colors flex-shrink-0"
                  >
                    {showBalance ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="bg-slate-900 text-white text-xs border-slate-700"
                >
                  {showBalance ? "Ocultar saldo" : "Mostrar saldo"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Actions Section */}
          <TooltipProvider>
            <div className="flex items-center gap-1">
              {!isEditMode && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={onExport}
                      className="text-blue-300 hover:text-blue-200 hover:bg-blue-800/50 p-2 rounded-lg transition-colors"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    className="bg-slate-900 text-white text-xs border-slate-700"
                  >
                    Exportar dados
                  </TooltipContent>
                </Tooltip>
              )}
              {isEditMode && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={onSave}
                        disabled={isSaving}
                        className="text-emerald-300 hover:text-emerald-200 hover:bg-emerald-950/50 p-2 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Save className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      className="bg-slate-900 text-white text-xs border-slate-700"
                    >
                      Salvar alterações
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={onCancel}
                        disabled={isSaving}
                        className="text-red-300 hover:text-red-200 hover:bg-red-950/50 p-2 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      className="bg-slate-900 text-white text-xs border-slate-700"
                    >
                      Cancelar edição
                    </TooltipContent>
                  </Tooltip>
                </>
              )}
            </div>
          </TooltipProvider>
          <CopyLinkButton />
        </div>
      }
      onClose={onClose}
    />
  );
}
