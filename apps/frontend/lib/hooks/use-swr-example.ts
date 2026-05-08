// This file has been simplified to avoid build issues
// You can re-implement SWR functionality later when needed

// Placeholder hooks for future implementation
export function useProjects() {
  return {
    projects: [],
    isLoading: false,
    isError: false,
    mutate: () => {},
  }
}

export function useProject(id: number) {
  return {
    project: null,
    isLoading: false,
    isError: false,
    mutate: () => {},
  }
}

export function useDashboardStats() {
  return {
    stats: null,
    isLoading: false,
    isError: false,
    mutate: () => {},
  }
}
