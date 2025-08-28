export class ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  pagination?: PaginationMeta;
  error?: ErrorDetails;

  constructor(
    success: boolean,
    data?: T,
    message?: string,
    pagination?: PaginationMeta,
    error?: ErrorDetails,
  ) {
    this.success = success;
    this.data = data;
    this.message = message;
    this.pagination = pagination;
    this.error = error;
  }

  static success<T>(
    data?: T,
    message?: string,
    pagination?: PaginationMeta,
  ): ApiResponse<T> {
    return new ApiResponse(true, data, message, pagination);
  }

  static error(
    message: string,
    error?: ErrorDetails,
    data?: any,
  ): ApiResponse<any> {
    return new ApiResponse(false, data, message, undefined, error);
  }
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ErrorDetails {
  code?: string;
  details?: any;
  timestamp?: string;
  path?: string;
}
