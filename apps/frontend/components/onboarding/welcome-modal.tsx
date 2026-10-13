"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { TourDefinition } from "@/lib/tours/types";

export function WelcomeModal({
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
          <DialogTitle>Conheça a plataforma Allka</DialogTitle>
          <DialogDescription>
            Podemos mostrar rapidamente onde ficam os principais recursos disponíveis para o seu perfil.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          <Button className="w-full btn-brand border-0" onClick={onStart}>
            Começar tutorial
          </Button>
          {/* Em telas estreitas o texto longo do segundo botão não cabe ao
              lado do primeiro (botão não quebra linha) e empurrava os dois
              para fora do popup — então empilham no celular. */}
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="sm:flex-1" onClick={onPostpone}>
              Agora não
            </Button>
            <Button variant="ghost" className="h-auto min-h-9 whitespace-normal text-slate-500 sm:flex-1" onClick={onDismiss}>
              Não quero ver mais este tutorial
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
