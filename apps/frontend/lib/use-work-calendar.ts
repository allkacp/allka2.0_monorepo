"use client"

// Calendário de trabalho da plataforma para as telas (B1): quantas horas úteis tem 1 dia útil. Lido uma vez e reaproveitado.
import { useEffect, useState } from "react"
import { apiClient } from "@/lib/api-client"

export interface WorkCalendarInfo { business_hours_per_day: number; work_days: number[]; start_time: string; end_time: string }
const DEFAULT_INFO: WorkCalendarInfo = { business_hours_per_day: 8, work_days: [1, 2, 3, 4, 5], start_time: "09:00", end_time: "17:00" }
let cached: WorkCalendarInfo | null = null
let pending: Promise<WorkCalendarInfo> | null = null

export function loadWorkCalendar(force = false): Promise<WorkCalendarInfo> {
  if (cached && !force) return Promise.resolve(cached)
  if (!pending || force) {
    pending = apiClient.getWorkCalendar().then((c: any) => { cached = { business_hours_per_day: Number(c.business_hours_per_day) || 8, work_days: c.work_days, start_time: c.start_time, end_time: c.end_time }; return cached }).catch(() => (cached = DEFAULT_INFO)).finally(() => { pending = null })
  }
  return pending
}
export function useWorkCalendar(): WorkCalendarInfo {
  const [info, setInfo] = useState<WorkCalendarInfo>(cached ?? DEFAULT_INFO)
  useEffect(() => { let live = true; void loadWorkCalendar().then((c) => { if (live) setInfo(c) }); return () => { live = false } }, [])
  return info
}

/** "2 h 30 min úteis" */
export const fmtBusinessMinutes = (m: number): string => { const h = Math.floor(m / 60), r = Math.round(m % 60); return h && r ? `${h} h ${r} min` : h ? `${h} h` : `${r} min` }
/** Minutos úteis → dias úteis (1 casa), usando as horas por dia do calendário. */
export const businessDaysOf = (minutes: number, hoursPerDay: number): number => Math.round((minutes / 60 / Math.max(1, hoursPerDay)) * 10) / 10
