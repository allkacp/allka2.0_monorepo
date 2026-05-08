// @ts-nocheck
/**
 * useDeepLink — generic hook for URL-param-based drawer/modal opening.
 *
 * Usage:
 *   const { deepLinkId, openWithId, closeDeepLink } = useDeepLink("projectId", "/admin/projetos");
 *
 * - deepLinkId: the current param value (or null)
 * - openWithId(id): navigate to basePath/id (updates URL)
 * - closeDeepLink(): navigate back to basePath (removes id from URL)
 * - buildTabUrl(id, tab): returns basePath/id?tab=tab
 */

import { useParams, useNavigate, useSearchParams } from "react-router-dom";

export function useDeepLink(paramKey: string, basePath: string) {
  const params = useParams<Record<string, string>>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const deepLinkId: string | null = params[paramKey] ?? null;
  const deepLinkTab: string | null = searchParams.get("tab");

  const openWithId = (id: string, tab?: string) => {
    const url = tab ? `${basePath}/${id}?tab=${tab}` : `${basePath}/${id}`;
    navigate(url, { replace: false });
  };

  const openWithIdAndTab = (id: string, tab: string) => {
    navigate(`${basePath}/${id}?tab=${tab}`, { replace: false });
  };

  const closeDeepLink = () => {
    navigate(basePath, { replace: false });
  };

  const buildTabUrl = (id: string, tab: string) =>
    `${window.location.origin}${basePath}/${id}?tab=${tab}`;

  const buildUrl = (id: string) => `${window.location.origin}${basePath}/${id}`;

  return {
    deepLinkId,
    deepLinkTab,
    openWithId,
    openWithIdAndTab,
    closeDeepLink,
    buildTabUrl,
    buildUrl,
  };
}
