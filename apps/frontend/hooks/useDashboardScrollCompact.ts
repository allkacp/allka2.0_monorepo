import { useEffect, useRef, useState } from "react";

/**
 * Compartilhado entre os 5 dashboards (admin/agency/company/partner/leader)
 * — antes cada arquivo tinha sua própria cópia deste ref+effect, e uma
 * correção feita num arquivo (rolagem passou a acontecer dentro do painel
 * branco do shell padrão, não mais no <main> da página) precisava ser
 * replicada manualmente nos outros 4. Um deles ficou pra trás (partner) e
 * quebrou em produção com "main is not defined" — exatamente o tipo de bug
 * que essa extração existe pra evitar.
 */
export function useDashboardScrollCompact(threshold = 48) {
  const [isHeaderCompact, setIsHeaderCompact] = useState(false);
  const dashboardScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollEl = dashboardScrollRef.current;
    if (!scrollEl) return;
    const handleScroll = () => setIsHeaderCompact(scrollEl.scrollTop > threshold);
    scrollEl.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollEl.removeEventListener("scroll", handleScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isHeaderCompact, dashboardScrollRef };
}
