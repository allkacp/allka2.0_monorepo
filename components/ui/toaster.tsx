import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, AlertTriangle, Info, XCircle } from "lucide-react";

const VARIANT_CONFIG = {
  default: {
    accent: "#2558FF",
    iconBg: "#eff6ff",
    iconColor: "#2558FF",
    Icon: Info,
  },
  success: {
    accent: "#10b981",
    iconBg: "#ecfdf5",
    iconColor: "#059669",
    Icon: CheckCircle2,
  },
  warning: {
    accent: "#f59e0b",
    iconBg: "#fffbeb",
    iconColor: "#d97706",
    Icon: AlertTriangle,
  },
  info: {
    accent: "#0ea5e9",
    iconBg: "#f0f9ff",
    iconColor: "#0284c7",
    Icon: Info,
  },
  destructive: {
    accent: "#ef4444",
    iconBg: "#fef2f2",
    iconColor: "#dc2626",
    Icon: XCircle,
  },
} as const;

type VariantKey = keyof typeof VARIANT_CONFIG;

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({
        id,
        title,
        description,
        action,
        variant,
        ...props
      }) {
        const key = (variant ?? "default") as VariantKey;
        const config = VARIANT_CONFIG[key] ?? VARIANT_CONFIG.default;
        const { Icon, accent, iconBg, iconColor } = config;

        return (
          <Toast key={id} variant={variant} {...props}>
            {/* Left accent bar */}
            <div
              className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
              style={{ background: accent }}
            />
            {/* Content */}
            <div className="flex items-start gap-3 pl-4 pr-2 py-3.5 flex-1">
              <div
                className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: iconBg }}
              >
                <Icon className="h-4 w-4" style={{ color: iconColor }} />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
