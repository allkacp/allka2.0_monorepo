// Exportação de dashboard (PDF/PNG) — ponto único reutilizado pelas 6
// telas (antes cada uma tinha sua PRÓPRIA cópia de `handleExportAs`, todas
// com o mesmo bug: `pixelRatio: 2` fixo aplicado ao elemento inteiro do
// dashboard, sem limite. Num dashboard longo (muitos widgets empilhados),
// isso gera um canvas de largura×altura×2 que facilmente ultrapassa o
// limite de canvas do navegador (~16384px por lado / ~268 milhões de
// pixels totais na maioria dos motores) — o navegador trava/congela a
// aba tentando alocar memória pra um canvas impossível. Essa é a causa
// raiz do travamento relatado, não a biblioteca em si (html-to-image e
// jsPDF continuam adequados).
import { toPng } from "html-to-image";

// ─── Limites seguros de canvas ──────────────────────────────────────────────
// Valores conservadores compatíveis com a maioria dos navegadores (Chrome
// permite até 16384px por lado e ~268M px totais; Safari é mais restrito,
// ~16384px por lado também mas менos memória de fato disponível). Ficamos
// bem abaixo disso de propósito.
const MAX_CANVAS_DIMENSION = 8192;
const MAX_CANVAS_PIXELS = 40_000_000; // ~40 milhões de pixels no total

/**
 * Calcula um pixelRatio seguro pro tamanho REAL do elemento medido em tela
 * — nunca um valor fixo. Um dashboard curto ainda sai em alta resolução
 * (pixelRatio até 2); um dashboard muito longo é automaticamente reduzido
 * o suficiente pra nunca estourar os limites acima, em vez de travar.
 */
export function computeSafePixelRatio(widthPx: number, heightPx: number): number {
  if (widthPx <= 0 || heightPx <= 0) return 1;
  const byDimension = Math.min(
    MAX_CANVAS_DIMENSION / widthPx,
    MAX_CANVAS_DIMENSION / heightPx,
  );
  const byArea = Math.sqrt(MAX_CANVAS_PIXELS / (widthPx * heightPx));
  const safe = Math.min(2, byDimension, byArea);
  // Nunca menor que 1 (pelo menos a resolução nativa) nem negativo/NaN.
  return Math.max(0.5, Number.isFinite(safe) ? safe : 1);
}

export type ExportFormat = "pdf" | "png";
export type ExportStage = "idle" | "preparing" | "rendering" | "generating" | "success" | "error";

export type ExportState = {
  stage: ExportStage;
  format: ExportFormat | null;
  error: string | null;
};

export const EXPORT_IDLE: ExportState = { stage: "idle", format: null, error: null };

/** Rótulo de cada etapa — sempre texto real, nunca percentual inventado. */
export const EXPORT_STAGE_LABEL: Record<ExportStage, string> = {
  idle: "",
  preparing: "Preparando dashboard…",
  rendering: "Renderizando gráficos e widgets…",
  generating: "Gerando arquivo…",
  success: "Concluído!",
  error: "Não foi possível exportar.",
};

/** Nome de arquivo amigável e seguro — remove tudo que não seja alfanumérico/hífen. */
export function buildExportFilename(title: string, format: ExportFormat): string {
  const safeTitle = title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const date = new Date().toISOString().slice(0, 10);
  return `allka-dashboard-${safeTitle || "export"}-${date}.${format}`;
}

/**
 * Espera 2 frames de animação — dá tempo de gráficos recém-montados
 * (SVG/canvas) terminarem o primeiro paint antes da captura, evitando
 * exportar um estado de transição/skeleton. Mais barato e mais confiável
 * que um `setTimeout` arbitrário.
 */
function waitTwoFrames(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

/**
 * Espera as fontes web (ex.: fontes customizadas da marca) terminarem de
 * carregar antes de capturar — sem isso, a captura podia rodar durante a
 * janela em que o texto ainda está no fallback do sistema (FOUT), gerando
 * PDF/PNG com tipografia errada mesmo com o resto do dashboard já pronto.
 * `document.fonts` não existe em todo motor/ambiente de teste, por isso a
 * checagem + fallback silencioso.
 */
async function waitForFonts(): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  try {
    await (document as Document & { fonts: FontFaceSet }).fonts.ready;
  } catch {
    // Nunca deixar uma falha aqui travar a exportação inteira.
  }
}

/**
 * Captura o elemento em PNG com pixelRatio calculado dinamicamente pro
 * tamanho real dele — nunca fixo. Ignora qualquer elemento marcado com
 * `data-export-ignore` (botões de Editar/Compartilhar/menus de contexto
 * etc.) além dos já marcados `data-customize-control`.
 */
export async function captureDashboardPng(element: HTMLElement): Promise<{ dataUrl: string; width: number; height: number }> {
  await waitForFonts();
  await waitTwoFrames();
  const rect = element.getBoundingClientRect();
  const pixelRatio = computeSafePixelRatio(rect.width, rect.height);
  const dataUrl = await toPng(element, {
    quality: 1,
    pixelRatio,
    backgroundColor: "#f1f5f9",
    cacheBust: true,
    skipAutoScale: true,
    filter: (node: HTMLElement) => {
      if (node?.dataset?.customizeControl) return false;
      if (node?.dataset?.exportIgnore !== undefined) return false;
      return true;
    },
  });
  return { dataUrl, width: Math.round(rect.width * pixelRatio), height: Math.round(rect.height * pixelRatio) };
}

/**
 * Baixa o PNG direto (sem gerar PDF).
 */
export function downloadPng(dataUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ─── PDF ─────────────────────────────────────────────────────────────────────
// A11 mm; A4 = 210×297mm. Paginação real: fatia a imagem capturada em
// sub-canvases por página (cada um vira um addImage independente), em vez
// da técnica antiga de reembutir a MESMA imagem gigante várias vezes com
// offset Y negativo — aquilo inflava o PDF (a imagem inteira ia pro
// arquivo uma vez por página) e dependia do visualizador de PDF cortar o
// que passa da borda da página. Fatiar de verdade é mais previsível e
// gera um arquivo bem menor pra dashboards longos.
const PDF_PAGE_WIDTH_MM = 210;
const PDF_PAGE_HEIGHT_MM = 297;
const PDF_MARGIN_MM = 10;

function sliceCanvasToDataUrl(
  source: HTMLImageElement,
  sliceYPx: number,
  sliceHeightPx: number,
): string {
  const canvas = document.createElement("canvas");
  canvas.width = source.naturalWidth;
  canvas.height = Math.max(1, Math.round(sliceHeightPx));
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#f1f5f9";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(
    source,
    0,
    sliceYPx,
    source.naturalWidth,
    sliceHeightPx,
    0,
    0,
    source.naturalWidth,
    sliceHeightPx,
  );
  const out = canvas.toDataURL("image/png");
  // Libera a referência do canvas temporário explicitamente (item 21 —
  // limpeza de recursos) — o canvas não é mais usado após esta linha, só
  // sai de escopo, mas zerar width/height força o navegador a soltar o
  // buffer de pixels imediatamente em vez de esperar o GC.
  canvas.width = 0;
  canvas.height = 0;
  return out;
}

export async function generateDashboardPdf(dataUrl: string, filename: string): Promise<void> {
  const img = new Image();
  img.src = dataUrl;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Falha ao carregar a imagem capturada do dashboard."));
  });

  const { default: jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const usableWidthMm = PDF_PAGE_WIDTH_MM - PDF_MARGIN_MM * 2;
  const usableHeightMm = PDF_PAGE_HEIGHT_MM - PDF_MARGIN_MM * 2;
  // Proporção mm↔px fixa pela largura (a imagem inteira ocupa a largura útil).
  const pxPerMm = img.naturalWidth / usableWidthMm;
  const pageHeightPx = usableHeightMm * pxPerMm;
  const totalHeightPx = img.naturalHeight;
  const pageCount = Math.max(1, Math.ceil(totalHeightPx / pageHeightPx));

  for (let page = 0; page < pageCount; page++) {
    if (page > 0) pdf.addPage();
    const sliceY = page * pageHeightPx;
    const sliceHeight = Math.min(pageHeightPx, totalHeightPx - sliceY);
    const sliceDataUrl = sliceCanvasToDataUrl(img, sliceY, sliceHeight);
    const sliceHeightMm = sliceHeight / pxPerMm;
    pdf.addImage(sliceDataUrl, "PNG", PDF_MARGIN_MM, PDF_MARGIN_MM, usableWidthMm, sliceHeightMm);
  }

  pdf.save(filename);
  // `img`/dataUrl grandes não ficam retidos em nenhum state do React —
  // esta função é standalone, a referência morre ao retornar.
}
