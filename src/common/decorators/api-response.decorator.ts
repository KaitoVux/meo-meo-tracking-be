import { ApiResponse, PaginationMeta } from '../dto/api-response.dto';

export class ResponseHelper {
  static success<T>(
    data?: T,
    message?: string,
    pagination?: PaginationMeta,
  ): ApiResponse<T> {
    return ApiResponse.success(data, message, pagination);
  }

  static created<T>(data: T, message?: string): ApiResponse<T> {
    return ApiResponse.success(
      data,
      message || 'Resource created successfully',
    );
  }

  static updated<T>(data: T, message?: string): ApiResponse<T> {
    return ApiResponse.success(
      data,
      message || 'Resource updated successfully',
    );
  }

  static deleted(message?: string): ApiResponse<null> {
    return ApiResponse.success(
      null,
      message || 'Resource deleted successfully',
    );
  }

  static paginated<T>(
    data: T[],
    pagination: PaginationMeta,
    message?: string,
  ): ApiResponse<T[]> {
    return ApiResponse.success(data, message, pagination);
  }
}
