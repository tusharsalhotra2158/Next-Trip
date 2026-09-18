// Generate unique IDs
export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Format date to YYYY-MM-DD
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Calculate days between two dates
export function daysBetween(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Mock API response wrapper
export function apiResponse<T>(
  success: boolean,
  data?: T,
  message?: string,
  error?: string,
) {
  return {
    success,
    data,
    message,
    error,
    timestamp: new Date().toISOString(),
  };
}
