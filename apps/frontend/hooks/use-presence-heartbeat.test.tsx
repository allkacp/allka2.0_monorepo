import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { render, waitFor } from "@testing-library/react"
import { usePresenceHeartbeat } from "@/hooks/use-presence-heartbeat"

const { api } = vi.hoisted(() => ({ api: { presenceHeartbeat: vi.fn() } }))
vi.mock("@/lib/api-client", () => ({ apiClient: api }))

function Probe({ enabled = true }: { enabled?: boolean }) {
  usePresenceHeartbeat(enabled)
  return null
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  api.presenceHeartbeat.mockResolvedValue({ ok: true, heartbeat_ms: 30000, offline_after_ms: 120000 })
})
afterEach(() => {
  vi.useRealTimers()
})

it("1. bate o heartbeat ao montar e repete no intervalo", async () => {
  render(<Probe />)
  await vi.waitFor(() => expect(api.presenceHeartbeat).toHaveBeenCalledTimes(1))
  await vi.advanceTimersByTimeAsync(30000)
  await vi.waitFor(() => expect(api.presenceHeartbeat).toHaveBeenCalledTimes(2))
})

it("15. para de bater ao desmontar (não continua depois do logout)", async () => {
  const { unmount } = render(<Probe />)
  await vi.waitFor(() => expect(api.presenceHeartbeat).toHaveBeenCalledTimes(1))
  unmount()
  await vi.advanceTimersByTimeAsync(120000)
  expect(api.presenceHeartbeat).toHaveBeenCalledTimes(1)
})

it("para o loop quando o heartbeat falha (ex.: conta inativa → 403)", async () => {
  api.presenceHeartbeat.mockRejectedValue(new Error("403"))
  render(<Probe />)
  await vi.waitFor(() => expect(api.presenceHeartbeat).toHaveBeenCalledTimes(1))
  await vi.advanceTimersByTimeAsync(90000)
  expect(api.presenceHeartbeat).toHaveBeenCalledTimes(1)
})

it("desabilitado → não bate", async () => {
  render(<Probe enabled={false} />)
  await vi.advanceTimersByTimeAsync(60000)
  expect(api.presenceHeartbeat).not.toHaveBeenCalled()
})
