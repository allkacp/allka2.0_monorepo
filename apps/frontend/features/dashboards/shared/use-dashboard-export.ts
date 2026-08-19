import { useCallback, useRef, useState } from "react";
import {
  EXPORT_IDLE,
  buildExportFilename,
  captureDashboardPng,
  downloadPng,
  generateDashboardPdf,
  type ExportFormat,
  type ExportState,
} from "./dashboard-export";

/**
 * Hook único de exportação — substitui as 6 cópias de `handleExportAs`/
 * `exportPng` que existiam (uma por dashboard). Estado único
 * (`idle|preparing|rendering|generating|success|error`), nunca percentual
 * inventado. `elementId` é o id do container a capturar (mesmo
 * "dashboard-export-area" já usado hoje).
 */
export function useDashboardExport(elementId: string, dashboardTitle: string) {
  const [state, setState] = useState<ExportState>(EXPORT_IDLE);
  // Trava contra duplo clique/exportação simultânea — não depende só do
  // `state` em closure (que pode estar desatualizado dentro do próprio
  // handler assíncrono), usa um ref síncrono.
  const busyRef = useRef(false);

  const reset = useCallback(() => setState(EXPORT_IDLE), []);

  const exportAs = useCallback(
    async (format: ExportFormat) => {
      if (busyRef.current) return;
      const element = document.getElementById(elementId);
      if (!element) {
        setState({ stage: "error", format, error: "Conteúdo do dashboard não encontrado." });
        return;
      }
      busyRef.current = true;
      setState({ stage: "preparing", format, error: null });
      try {
        setState({ stage: "rendering", format, error: null });
        const { dataUrl } = await captureDashboardPng(element);

        setState({ stage: "generating", format, error: null });
        const filename = buildExportFilename(dashboardTitle, format);
        if (format === "png") {
          downloadPng(dataUrl, filename);
        } else {
          await generateDashboardPdf(dataUrl, filename);
        }

        setState({ stage: "success", format, error: null });
      } catch (err) {
        console.error("[dashboard-export] falha ao exportar:", err);
        setState({
          stage: "error",
          format,
          error: err instanceof Error ? err.message : "Erro inesperado ao exportar.",
        });
      } finally {
        busyRef.current = false;
      }
    },
    [elementId, dashboardTitle],
  );

  return { state, exportAs, reset, isExporting: state.stage !== "idle" && state.stage !== "success" && state.stage !== "error" };
}
