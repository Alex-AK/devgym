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

export type SortColumn = 'name' | 'department' | 'salary' | 'startedAt';
export type SortDirection = 'asc' | 'desc';

export interface FetchOptions {
  page?: number;
  limit?: number;
  sort?: SortColumn;
  dir?: SortDirection;
}

export async function fetchEmployees(options: FetchOptions = {}): Promise<ListResponse> {
  const params = new URLSearchParams();
  params.set('page', String(options.page ?? 1));
  params.set('limit', String(options.limit ?? 5));
  params.set('sort', options.sort ?? 'name');
  params.set('dir', options.dir ?? 'asc');

  const response = await fetch(`/api/employees?${params.toString()}`);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return (await response.json()) as ListResponse;
}
