// @ts-nocheck
import React from "react"
import type { ProposalData, BrandConfig } from "@/lib/proposal-export"

interface ProposalPdfRendererProps {
  data: ProposalData
  brandConfig: BrandConfig
}

export const ProposalPdfRenderer = React.forwardRef<HTMLDivElement, ProposalPdfRendererProps>(
  ({ data, brandConfig }, ref) => {
    return (
      <div
        ref={ref}
        style={{
          position: "fixed",
          left: "-9999px",
          top: 0,
          width: "794px",
          backgroundColor: "#ffffff",
          fontFamily: "Arial, Helvetica, sans-serif",
          fontSize: "12px",
          color: "#1e293b",
          zIndex: -1,
        }}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div
          style={{
            background: brandConfig.gradient,
            padding: "32px 40px",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {brandConfig.logoUrl && (
              <img
                src={brandConfig.logoUrl}
                alt="logo"
                crossOrigin="anonymous"
                style={{ height: "44px", width: "auto", objectFit: "contain" }}
              />
            )}
            <div>
              <div style={{ fontSize: "18px", fontWeight: "bold", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Proposta Comercial
              </div>
              <div style={{ fontSize: "12px", opacity: 0.85, marginTop: "2px" }}>
                {brandConfig.agencyName}
              </div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "10px", opacity: 0.75, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Data da Proposta
            </div>
            <div style={{ fontSize: "15px", fontWeight: "bold", marginTop: "2px" }}>
              {data.PROPOSTA_DATA}
            </div>
          </div>
        </div>

        {/* ── Project Name Banner ─────────────────────────────────────────── */}
        <div
          style={{
            background: "#f8fafc",
            borderBottom: "3px solid #e2e8f0",
            padding: "16px 40px",
          }}
        >
          <div
            style={{
              fontSize: "9px",
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: "4px",
              fontWeight: "600",
            }}
          >
            Projeto
          </div>
          <div style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>
            {data.PROJETO_NOME}
          </div>
          <div style={{ marginTop: "6px", display: "flex", gap: "20px", fontSize: "11px", color: "#64748b" }}>
            {data.PROJETO_TIPO && (
              <span>
                Tipo:{" "}
                <strong style={{ color: "#0f172a" }}>{data.PROJETO_TIPO}</strong>
              </span>
            )}
            {data.PROJETO_STATUS && (
              <span>
                Status:{" "}
                <strong style={{ color: "#0f172a" }}>{data.PROJETO_STATUS}</strong>
              </span>
            )}
          </div>
        </div>

        {/* ── Info Grid ───────────────────────────────────────────────────── */}
        <div style={{ padding: "24px 40px 0" }}>
          <div
            style={{
              fontSize: "9px",
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              fontWeight: "700",
              marginBottom: "10px",
            }}
          >
            Informações do Projeto
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <tbody>
              <tr>
                <td style={{ padding: "8px 12px", background: "#f1f5f9", fontWeight: "600", color: "#64748b", width: "22%", borderBottom: "1px solid #e2e8f0" }}>
                  Cliente
                </td>
                <td style={{ padding: "8px 12px", borderBottom: "1px solid #e2e8f0", width: "28%" }}>
                  {data.CLIENTE_NOME}
                </td>
                <td style={{ padding: "8px 12px", background: "#f1f5f9", fontWeight: "600", color: "#64748b", width: "22%", borderBottom: "1px solid #e2e8f0" }}>
                  Empresa
                </td>
                <td style={{ padding: "8px 12px", borderBottom: "1px solid #e2e8f0", width: "28%" }}>
                  {data.EMPRESA_NOME}
                </td>
              </tr>
              <tr>
                <td style={{ padding: "8px 12px", background: "#f1f5f9", fontWeight: "600", color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>
                  Consultor
                </td>
                <td style={{ padding: "8px 12px", borderBottom: "1px solid #e2e8f0" }}>
                  {data.CONSULTOR_NOME}
                </td>
                <td style={{ padding: "8px 12px", background: "#f1f5f9", fontWeight: "600", color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>
                  E-mail
                </td>
                <td style={{ padding: "8px 12px", borderBottom: "1px solid #e2e8f0" }}>
                  {data.CONSULTOR_EMAIL}
                </td>
              </tr>
              <tr>
                <td style={{ padding: "8px 12px", background: "#f1f5f9", fontWeight: "600", color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>
                  Data Criação
                </td>
                <td style={{ padding: "8px 12px", borderBottom: "1px solid #e2e8f0" }}>
                  {data.DATA_CRIACAO}
                </td>
                <td style={{ padding: "8px 12px", background: "#f1f5f9", fontWeight: "600", color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>
                  Prazo Entrega
                </td>
                <td style={{ padding: "8px 12px", borderBottom: "1px solid #e2e8f0" }}>
                  {data.DATA_ENTREGA}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Description ─────────────────────────────────────────────────── */}
        {data.PROJETO_DESCRICAO && (
          <div style={{ padding: "20px 40px 0" }}>
            <div
              style={{
                fontSize: "9px",
                color: "#94a3b8",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                fontWeight: "700",
                marginBottom: "8px",
              }}
            >
              Descrição do Projeto
            </div>
            <div
              style={{
                background: "#f8fafc",
                borderLeft: "3px solid #e2e8f0",
                padding: "12px 16px",
                color: "#475569",
                lineHeight: "1.65",
                fontSize: "12px",
              }}
            >
              {data.PROJETO_DESCRICAO}
            </div>
          </div>
        )}

        {/* ── Products Table ───────────────────────────────────────────────── */}
        <div style={{ padding: "20px 40px 0" }}>
          <div
            style={{
              fontSize: "9px",
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              fontWeight: "700",
              marginBottom: "10px",
            }}
          >
            Produtos &amp; Serviços
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ background: "#0f172a", color: "#ffffff" }}>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: "600" }}>
                  Produto / Serviço
                </th>
                <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: "600", width: "70px" }}>
                  Qtd
                </th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: "600", width: "130px" }}>
                  Valor Unit.
                </th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: "600", width: "130px" }}>
                  Valor Total
                </th>
              </tr>
            </thead>
            <tbody>
              {data.produtos.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    style={{ padding: "20px 12px", textAlign: "center", color: "#94a3b8", fontStyle: "italic" }}
                  >
                    Nenhum produto adicionado a esta proposta
                  </td>
                </tr>
              ) : (
                data.produtos.map((p, i) => (
                  <tr key={i} style={{ backgroundColor: i % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0" }}>
                      {p.PRODUTO_NOME}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "center", borderBottom: "1px solid #e2e8f0" }}>
                      {p.PRODUTO_QTD}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", borderBottom: "1px solid #e2e8f0" }}>
                      {p.PRODUTO_VALOR_UNIT}
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        textAlign: "right",
                        borderBottom: "1px solid #e2e8f0",
                        fontWeight: "600",
                      }}
                    >
                      {p.PRODUTO_VALOR_TOTAL}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr style={{ background: "#0f172a", color: "#ffffff" }}>
                <td
                  colSpan={3}
                  style={{ padding: "12px 12px", textAlign: "right", fontWeight: "700", fontSize: "13px" }}
                >
                  TOTAL GERAL
                </td>
                <td
                  style={{ padding: "12px 12px", textAlign: "right", fontWeight: "800", fontSize: "15px" }}
                >
                  {data.TOTAL_VALOR}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div
          style={{
            margin: "24px 40px",
            paddingTop: "14px",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "10px",
            color: "#94a3b8",
          }}
        >
          <span>
            Proposta gerada em {data.PROPOSTA_DATA} por {brandConfig.agencyName}
          </span>
          <span>Gerado pela plataforma Allka</span>
        </div>

        <div style={{ height: "24px" }} />
      </div>
    )
  }
)

ProposalPdfRenderer.displayName = "ProposalPdfRenderer"
