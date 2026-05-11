// Re-exports the mock client under the same name the real client uses,
// so that Vite's alias can swap @/lib/api-client → this file in mock mode.
export { mockApiClient as apiClient } from "./mock-api-client";
