/**
 * No celular (< 640px) todo popup vira uma "folha" que sobe da base da tela,
 * do jeito dos aplicativos: largura inteira, cantos de cima arredondados,
 * altura limitada à tela com rolagem própria e respiro para a barra do
 * iPhone. Vem DEPOIS do className de quem chama, para que larguras/posições
 * pensadas para o desktop (max-w-md, top-[10%]…) não deixem o popup cortado
 * ou encostado na borda no celular. No desktop nada muda.
 */
export const DIALOG_MOBILE_SHEET_CLASS =
  'max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:translate-x-0 max-sm:translate-y-0 max-sm:w-full max-sm:max-w-full max-sm:max-h-[92dvh] max-sm:overflow-y-auto max-sm:overflow-x-hidden max-sm:overscroll-contain max-sm:rounded-t-[1.25rem] max-sm:rounded-b-none max-sm:border-x-0 max-sm:border-b-[length:env(safe-area-inset-bottom)] max-sm:border-b-transparent max-sm:data-[state=open]:zoom-in-100 max-sm:data-[state=closed]:zoom-out-100 max-sm:data-[state=open]:slide-in-from-bottom max-sm:data-[state=closed]:slide-out-to-bottom'
