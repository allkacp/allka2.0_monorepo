// @ts-nocheck
import React, { useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, AlertTriangle, Clock, Eye, BarChart2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Shared: brand strip at top of state-screen cards ────────────────────────
function BrandStrip() {
  return (
    <div
      className="h-1 w-full rounded-t-xl"
      style={{
        background:
          "linear-gradient(90deg, #000000 0%, #1a2a6f 50%, #c81a7f 100%)",
      }}
    />
  );
}

// ─── Full-page centering wrapper ──────────────────────────────────────────────
function StateFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 overflow-y-auto"
      style={{
        background:
          "radial-gradient(ellipse at top, rgba(26,42,111,0.08) 0%, transparent 60%), linear-gradient(180deg, #f0f2f8 0%, #f8f9fc 100%)",
      }}
    >
      <div className="min-h-full flex flex-col items-center justify-center p-4">
        {/* Mini brand identifier */}
        <div className="flex items-center gap-1.5 mb-6 opacity-60">
          <div
            className="w-5 h-5 rounded-md flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, #000 0%, #1a2a6f 50%, #c81a7f 100%)",
            }}
          >
            <BarChart2 className="h-3 w-3 text-white" />
          </div>
          <span className="text-xs font-semibold text-slate-500">Allka</span>
        </div>

        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}

// ─── Loading ──────────────────────────────────────────────────────────────────
export function SharedLoadingScreen() {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center gap-4"
      style={{
        background:
          "radial-gradient(ellipse at top, rgba(26,42,111,0.08) 0%, transparent 60%), #f0f2f8",
      }}
    >
      {/* Animated brand logo */}
      <div className="relative">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
          style={{
            background:
              "linear-gradient(135deg, #000 0%, #1a2a6f 50%, #c81a7f 100%)",
          }}
        >
          <BarChart2 className="h-6 w-6 text-white" />
        </div>
        <div
          className="absolute -inset-1 rounded-2xl opacity-30 animate-ping"
          style={{
            background:
              "linear-gradient(135deg, #1a2a6f 0%, #c81a7f 100%)",
          }}
        />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Carregando relatório…
        </p>
        <p className="text-xs text-slate-400">Verificando permissões</p>
      </div>
    </div>
  );
}

// ─── Invalid ──────────────────────────────────────────────────────────────────
export function SharedInvalidScreen({ message }: { message?: string }) {
  return (
    <StateFrame>
      <Card className="shadow-xl border-0 overflow-hidden">
        <BrandStrip />
        <CardContent className="pt-8 pb-8 space-y-4 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center shadow-inner">
            <AlertTriangle className="h-7 w-7 text-red-500" />
          </div>
          <div>
            <h2 className="font-semibold text-lg text-slate-800 dark:text-slate-100">
              {message ?? "Link inválido"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Este link é inválido ou foi corrompido.
              <br />
              Solicite um novo link ao remetente.
            </p>
          </div>
        </CardContent>
      </Card>
    </StateFrame>
  );
}

// ─── Expired ──────────────────────────────────────────────────────────────────
export function SharedExpiredScreen({ issuedAt }: { issuedAt?: string }) {
  return (
    <StateFrame>
      <Card className="shadow-xl border-0 overflow-hidden">
        <BrandStrip />
        <CardContent className="pt-8 pb-8 space-y-4 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center shadow-inner">
            <Clock className="h-7 w-7 text-amber-500" />
          </div>
          <div>
            <h2 className="font-semibold text-lg text-slate-800 dark:text-slate-100">
              Link expirado
            </h2>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Este link de compartilhamento não está mais disponível.
            </p>
            {issuedAt && (
              <p className="text-xs text-muted-foreground mt-3 bg-muted/50 rounded-lg px-3 py-2 inline-block">
                Gerado em:{" "}
                <strong>
                  {format(new Date(issuedAt), "dd/MM/yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </strong>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </StateFrame>
  );
}

// ─── PIN ──────────────────────────────────────────────────────────────────────
export function SharedPinScreen({
  value,
  onChange,
  onSubmit,
  error,
  targetTitle,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  error: boolean;
  targetTitle: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && value.length === 4) onSubmit();
  };

  return (
    <StateFrame>
      <Card className="shadow-xl border-0 overflow-hidden">
        <BrandStrip />
        <CardHeader className="text-center pb-2 pt-7">
          <div
            className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-lg"
            style={{
              background:
                "linear-gradient(135deg, #1a2a6f 0%, #3a4a9f 100%)",
            }}
          >
            <Lock className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-lg text-slate-800 dark:text-slate-100">
            Acesso protegido
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Este relatório requer um PIN para ser acessado.
          </p>
          {targetTitle && (
            <p className="text-xs font-medium mt-1.5 truncate px-4 text-slate-600 dark:text-slate-300">
              {targetTitle}
            </p>
          )}
        </CardHeader>
        <CardContent className="px-6 pb-7 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="share-pin-input" className="text-sm font-medium">
              PIN de 4 dígitos
            </Label>
            <Input
              id="share-pin-input"
              ref={inputRef}
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={value}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                onChange(v);
              }}
              onKeyDown={handleKeyDown}
              className={`text-center tracking-widest text-lg h-11 ${
                error ? "border-red-400 focus-visible:ring-red-400" : ""
              }`}
              placeholder="• • • •"
            />
            {error && (
              <p className="text-xs text-red-500 text-center font-medium">
                PIN incorreto. Tente novamente.
              </p>
            )}
          </div>
          <Button
            className="w-full h-10 btn-brand text-sm"
            onClick={onSubmit}
            disabled={value.length !== 4}
          >
            <Eye className="h-4 w-4 mr-2" />
            Acessar relatório
          </Button>
        </CardContent>
      </Card>
    </StateFrame>
  );
}
