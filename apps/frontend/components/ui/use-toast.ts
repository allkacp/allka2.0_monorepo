// Re-export do hook real — este arquivo era uma cópia independente (mesmo
// código, mas com seu próprio estado de módulo isolado). Como o único
// <Toaster/> montado (main.tsx) escuta apenas @/hooks/use-toast, qualquer
// toast() disparado por quem importava daqui nunca aparecia na tela —
// silenciosamente, sem erro nenhum no console.
export { useToast, toast, reducer } from "@/hooks/use-toast";
