type Leader = { id: string; name: string; kind: string };
export function StepLeaderSelect({ mode, userId, leaders, loading, failed, className, onChange }: {
  mode: string; userId: string; leaders: Leader[]; loading: boolean; failed: boolean; className?: string;
  onChange: (mode: "auto" | "specific", userId: string) => void;
}) {
  const specific = mode === "specific";
  const eligible = leaders.filter(u => u.kind === "lider");
  const missing = specific && !!userId && !loading && !failed && !eligible.some(u => u.id === userId);
  return <div className="space-y-1">
    <select className={className} aria-label="Qual líder" value={specific ? userId : "__auto"} onChange={e => onChange(e.target.value === "__auto" ? "auto" : "specific", e.target.value === "__auto" ? "" : e.target.value)}>
      <option value="__auto">Qualquer líder da área (o com menos tarefas abertas)</option>
      {specific && !userId && <option value="" disabled>Selecione um responsável específico</option>}
      {specific && userId && !eligible.some(u => u.id === userId) && <option value={userId} disabled>{loading ? "Consultando responsável selecionado..." : failed ? "Não foi possível conferir este responsável" : "Líder específico indisponível — escolha outro líder"}</option>}
      {eligible.map(u => <option key={u.id} value={u.id}>Sempre {u.name}</option>)}
    </select>
    {missing && <p role="alert" className="text-[11px] text-amber-800">O responsável escolhido não está disponível. Escolha outra pessoa ou “Qualquer líder da área”.</p>}
    {failed && <p role="status" className="text-[11px] text-amber-800">Não foi possível consultar os responsáveis. Isso não significa que o cadastro foi excluído; tente reabrir a etapa.</p>}
    {!loading && !failed && eligible.length === 0 && !specific && <p className="text-[11px] text-slate-500">Não há usuários ativos com perfil de Líder cadastrados. A opção automática não exige um nome; a disponibilidade será verificada no lançamento.</p>}
  </div>;
}
