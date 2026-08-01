export interface Employee {
  id: number;
  name: string;
  department: string;
  salary: number;
  startedAt: string | null;
}

export interface ListResponse {
  items: Employee[];
  total: number;
  page: number;
  limit: number;
}

export interface FetchOptions {
  page?: number;
  limit?: number;
  // TODO: the table needs to ask for a sort column and direction.
}

/**
 * Calls the employees endpoint. The tests stub `globalThis.fetch`, so what
 * matters is the URL you build, including the query string.
 */
export async function fetchEmployees(options: FetchOptions = {}): Promise<ListResponse> {
  const params = new URLSearchParams();
  params.set('page', String(options.page ?? 1));
  params.set('limit', String(options.limit ?? 5));

  const response = await fetch(`/api/employees?${params.toString()}`);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return (await response.json()) as ListResponse;
}
