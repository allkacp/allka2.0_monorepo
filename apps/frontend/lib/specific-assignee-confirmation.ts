export interface AssigneeImpact {
  token: string;
  action: "delete" | "deactivate";
  user_name: string;
  matrices: { product_id: string; product_number: number; product_name: string; version_number: number; version_state: string; task_name: string; step_name: string | null; label: string }[];
  stages: { id: string; titulo: string; project_task: { title: string; project_id: string } }[];
  executions: { id: string; title: string; project_id: string }[];
}
type Handler = (impact: AssigneeImpact) => Promise<boolean>;
let handler: Handler | undefined;
export function installAssigneeConfirmation(next: Handler) {
  handler = next;
  return () => { if (handler === next) handler = undefined; };
}
export async function withAssigneeConfirmation<T>(operation: (token?: string) => Promise<T>): Promise<T> {
  try { return await operation(); } catch (error: any) {
    if (error?.code !== "specific_assignee_confirmation_required" || !error?.data?.impact || !handler) throw error;
    const impact: AssigneeImpact = error.data.impact;
    if (!await handler(impact)) throw new Error("Operação cancelada. Nenhum usuário foi alterado ou excluído.");
    // Um retry por confirmação; mudança no impacto exige nova ação do admin.
    return operation(impact.token);
  }
}
