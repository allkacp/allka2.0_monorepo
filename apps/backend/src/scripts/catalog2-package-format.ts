// Versão do formato do pacote catalog2 (Item 16.1, reunião 2026-09-14) —
// compartilhada entre catalog2-export-prepared-state.ts e
// catalog2-import-prepared-state.ts. Módulo separado de propósito: os dois
// scripts têm `main()` executável no import (efeito colateral no
// top-level) — importar um script do outro rodaria o `main()` errado
// junto.
export const PACKAGE_FORMAT_VERSION = "catalog2-transfer-package/1";
