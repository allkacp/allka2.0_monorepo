import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";

export function useCourses(filters?: Record<string, any>) {
  const [courses, setCourses] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response: any = await apiClient.getCourses(filters);
      setCourses(response.data || []);
      setTotal(response.total || 0);
    } catch (err: any) {
      console.error("[useCourses] API error:", err.message);
      setError(err.message);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const createCourse = useCallback(
    async (data: any) => {
      const result: any = await apiClient.createCourse(data);
      await fetchCourses();
      return result;
    },
    [fetchCourses],
  );

  const updateCourse = useCallback(
    async (id: string, data: any) => {
      const result: any = await apiClient.updateCourse(id, data);
      await fetchCourses();
      return result;
    },
    [fetchCourses],
  );

  const deleteCourse = useCallback(
    async (id: string) => {
      await apiClient.deleteCourse(id);
      await fetchCourses();
    },
    [fetchCourses],
  );

  return {
    courses,
    total,
    loading,
    error,
    refetch: fetchCourses,
    createCourse,
    updateCourse,
    deleteCourse,
  };
}

export function useEnrollments() {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEnrollments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response: any = await apiClient.getMyEnrollments();
      setEnrollments(Array.isArray(response) ? response : response.data || []);
    } catch (err: any) {
      console.error("[useEnrollments] API error:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  const enrollCourse = useCallback(
    async (courseId: string) => {
      await apiClient.enrollCourse(courseId);
      await fetchEnrollments();
    },
    [fetchEnrollments],
  );

  return {
    enrollments,
    loading,
    error,
    refetch: fetchEnrollments,
    enrollCourse,
  };
}
