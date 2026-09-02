"use client";

// Oferta contextual por módulo (sprint de onboarding, bloco 2/3) — mesma
// mecânica da janela de boas-vindas do bloco 1, texto diferente: aqui é
// sobre UM recurso específico, oferecido quando a pessoa entra na rota dele
// pela primeira vez (nunca a cada navegação — ver onboarding-context.tsx).
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { TourDefinition } from "@/lib/tours/types";

export function ContextualOfferModal({
  tour,
  onStart,
  onPostpone,
  onDismiss,
}: {
  tour: TourDefinition;
  onStart: () => void;
  onPostpone: () => void;
  onDismiss: () => void;
}) {
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onPostpone(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Quer conhecer este recurso?</DialogTitle>
          <DialogDescription>{tour.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          <Button className="w-full btn-brand border-0" onClick={onStart}>
            Iniciar tour
          </Button>
          <div className="flex w-full gap-2">
            <Button variant="outline" className="flex-1" onClick={onPostpone}>
              Agora não
            </Button>
            <Button variant="ghost" className="flex-1 text-slate-500" onClick={onDismiss}>
              Não mostrar novamente
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
