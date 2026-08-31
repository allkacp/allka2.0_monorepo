/**
 * Hook compartilhado — busca uma imagem de alerta autenticada (Bearer
 * token, via apiClient.fetchAlertImageBlobUrl) e devolve um Object URL,
 * revogando o anterior sempre que `src` muda e ao desmontar.
 *
 * Extraído de alert-image-lightbox.tsx (ata 2026-08, 5º lote/correção de
 * UX) pra ser reaproveitado tanto pela miniatura compacta
 * (AlertImageThumbnail) quanto pelo novo banner completo (AlertBannerImage)
 * — mesmo bug já resolvido uma vez (Object URL vazando/reaproveitado entre
 * contas), sem repetir a lógica em dois lugares.
 */
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";

interface UseAuthenticatedImageBlobResult {
  objectUrl: string | null;
  broken: boolean;
  setBroken: (broken: boolean) => void;
}

export function useAuthenticatedImageBlob(src: string | null | undefined): UseAuthenticatedImageBlobResult {
  const [broken, setBroken] = useState(false);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    setBroken(false);
    setObjectUrl(null);
    if (!src) return;
    let cancelled = false;
    let created: string | null = null;
    apiClient
      .fetchAlertImageBlobUrl(src)
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        created = url;
        setObjectUrl(url);
      })
      .catch(() => {
        if (!cancelled) setBroken(true);
      });
    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [src]);

  return { objectUrl, broken, setBroken };
}
