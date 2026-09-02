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
          <div className="flex w-full gap-2">
            <Button variant="outline" className="flex-1" onClick={onPostpone}>
              Agora não
            </Button>
            <Button variant="ghost" className="flex-1 text-slate-500" onClick={onDismiss}>
              Não quero ver este tutorial
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
