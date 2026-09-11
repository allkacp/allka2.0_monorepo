// Helpers de paginação/lotes compartilhados por TODOS os coletores do
// Legado (produtos, identidade/organizações, projetos/execução,
// financeiro/...) — extraído aqui pra nenhum coletor novo duplicar a mesma
// lógica de fatiar ids/páginas.

/** Fatia um array em blocos de até `size` itens. */
export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Busca entidades-filhas por uma lista de ids GRANDE sem gerar uma única
 * cláusula IN(...) com dezenas de milhares de parâmetros — fatia os ids em
 * blocos (padrão 500) e roda uma consulta por bloco.
 */
export async function findManyChunked<T>(
  ids: string[],
  fetch: (idsChunk: string[]) => Promise<T[]>,
  chunkSize = 500,
): Promise<T[]> {
  if (ids.length === 0) return [];
  const results = await Promise.all(chunk(ids, chunkSize).map(fetch));
  return results.flat();
}

/**
 * Percorre uma tabela em PÁGINAS (skip/take), chamando `onPage` a cada
 * página — nunca um findMany() sem limite sobre a tabela inteira. Para
 * quando uma página vem menor que `pageSize` (última página).
 */
export async function paginate<T>(
  fetchPage: (skip: number, take: number) => Promise<T[]>,
  pageSize: number,
  onPage: (page: T[], pageNumber: number) => Promise<void>,
): Promise<void> {
  let skip = 0;
  let pageNumber = 0;
  for (;;) {
    const page = await fetchPage(skip, pageSize);
    if (page.length === 0) break;
    pageNumber++;
    await onPage(page, pageNumber);
    if (page.length < pageSize) break;
    skip += pageSize;
  }
}
