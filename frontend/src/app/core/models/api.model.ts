/** Every successful API response uses this envelope. */
export interface ApiResponse<T> {
  success: true;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Field-level messages the API returns on a 400. */
export type FieldErrors = Record<string, string>;

export interface ApiErrorBody {
  success: false;
  message: string;
  details?: FieldErrors;
}
