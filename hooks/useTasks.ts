import { useState, useEffect, useCallback } from "react"
import { apiClient } from "@/lib/api-client"

export function useTasks(filters?: Record<string, any>) {
  const [tasks, setTasks] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response: any = await apiClient.getTasks(filters)
      setTasks(response.data || [])
      setTotal(response.total || 0)
    } catch (err: any) {
      console.error("[useTasks] API error:", err.message)
      setError(err.message)
      setTasks([])
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(filters)])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const createTask = useCallback(async (data: any) => {
    const result: any = await apiClient.createTask(data)
    await fetchTasks()
    return result
  }, [fetchTasks])

  const updateTask = useCallback(async (id: string, data: any) => {
    const result: any = await apiClient.updateTask(id, data)
    await fetchTasks()
    return result
  }, [fetchTasks])

  const updateTaskStatus = useCallback(async (id: string, status: string, feedback?: string) => {
    const result: any = await apiClient.updateTaskStatus(id, status, feedback)
    await fetchTasks()
    return result
  }, [fetchTasks])

  const deleteTask = useCallback(async (id: string) => {
    await apiClient.deleteTask(id)
    await fetchTasks()
  }, [fetchTasks])

  return { tasks, total, loading, error, refetch: fetchTasks, createTask, updateTask, updateTaskStatus, deleteTask }
}
