# Exception Filters Documentation

## Overview

This module provides comprehensive error handling through global exception filters that ensure all errors follow the standardized API response format.

## Exception Filters

### 1. ValidationExceptionFilter

**Priority: Highest**

- Catches: `BadRequestException` (specifically validation errors)
- Purpose: Handles class-validator validation errors and custom validation errors
- Response Format:

```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": {
      "errors": [
        {
          "field": "email",
          "value": "invalid-email",
          "constraints": {
            "isEmail": "email must be an email"
          },
          "message": "email must be an email"
        }
      ]
    },
    "timestamp": "2024-01-01T00:00:00.000Z",
    "path": "/api/users"
  }
}
```

### 2. HttpExceptionFilter

**Priority: Medium**

- Catches: All `HttpException` instances
- Purpose: Handles standard HTTP exceptions (404, 401, 403, etc.)
- Response Format:

```json
{
  "success": false,
  "message": "Resource not found",
  "error": {
    "code": "NOT_FOUND",
    "details": {},
    "timestamp": "2024-01-01T00:00:00.000Z",
    "path": "/api/users/123"
  }
}
```

### 3. GlobalExceptionFilter

**Priority: Lowest (Catch-all)**

- Catches: All other exceptions
- Purpose: Handles database errors, JWT errors, and unexpected exceptions
- Response Format:

```json
{
  "success": false,
  "message": "Internal server error occurred",
  "error": {
    "code": "INTERNAL_ERROR",
    "details": {
      "name": "DatabaseError",
      "message": "Connection failed"
    },
    "timestamp": "2024-01-01T00:00:00.000Z",
    "path": "/api/users"
  }
}
```

## Error Codes

### HTTP Error Codes

- `BAD_REQUEST` - 400 Bad Request
- `UNAUTHORIZED` - 401 Unauthorized
- `FORBIDDEN` - 403 Forbidden
- `NOT_FOUND` - 404 Not Found
- `CONFLICT` - 409 Conflict
- `VALIDATION_ERROR` - 422 Unprocessable Entity
- `INTERNAL_ERROR` - 500 Internal Server Error

### Database Error Codes

- `DUPLICATE_RESOURCE` - Unique constraint violation
- `INVALID_REFERENCE` - Foreign key constraint violation
- `MISSING_REQUIRED_FIELD` - Not null constraint violation
- `DATABASE_ERROR` - General database error

### Authentication Error Codes

- `AUTHENTICATION_ERROR` - JWT/Token related errors

## Handled Exception Types

### Database Errors

- **Unique Constraint Violations**: Returns 409 Conflict
- **Foreign Key Violations**: Returns 400 Bad Request
- **Not Null Violations**: Returns 400 Bad Request
- **General Database Errors**: Returns 500 Internal Server Error

### Validation Errors

- **Class-validator errors**: Formatted with field-level details
- **Custom validation errors**: Preserves custom error structure
- **Simple validation messages**: Wrapped in standard format

### JWT Errors

- **JsonWebTokenError**: Invalid token
- **TokenExpiredError**: Token has expired
- **NotBeforeError**: Token not active yet

## Usage Examples

### Custom Business Logic Errors

```typescript
// In your service
throw new BadRequestException({
  message: 'Cannot process expense',
  errors: [
    { field: 'amount', message: 'Amount cannot be negative' },
    { field: 'category', message: 'Category is required' },
  ],
});
```

### Standard HTTP Exceptions

```typescript
// These are automatically handled
throw new NotFoundException('User not found');
throw new UnauthorizedException('Invalid credentials');
throw new ForbiddenException('Insufficient permissions');
```

### Database Constraint Violations

```typescript
// These are automatically detected and formatted
// Unique constraint violation becomes:
{
  "success": false,
  "message": "Resource already exists",
  "error": {
    "code": "DUPLICATE_RESOURCE",
    "details": { "constraint": "unique_email" }
  }
}
```

## Development vs Production

### Development Mode

- Includes detailed error information (stack traces, internal details)
- Logs full exception details
- Shows database constraint names and details

### Production Mode

- Hides sensitive internal details
- Generic error messages for security
- Minimal error details in response

## Logging

All exceptions are automatically logged with appropriate levels:

- **Validation Errors**: `WARN` level
- **HTTP Exceptions**: `ERROR` level
- **Global Exceptions**: `ERROR` level with full stack trace

Log entries include:

- Request path and method
- Error details and stack trace
- Timestamp
- User context (when available)

## Best Practices

1. **Use Appropriate HTTP Exceptions**:

   ```typescript
   // Good
   throw new NotFoundException('User not found');

   // Avoid
   throw new Error('User not found');
   ```

2. **Provide Structured Validation Errors**:

   ```typescript
   // Good
   throw new BadRequestException({
     message: 'Validation failed',
     errors: [{ field: 'email', message: 'Invalid email format' }],
   });
   ```

3. **Let Database Errors Bubble Up**:

   ```typescript
   // Good - let the filter handle it
   await this.userRepository.save(user);

   // Avoid - manual error handling
   try {
     await this.userRepository.save(user);
   } catch (error) {
     throw new BadRequestException('User creation failed');
   }
   ```

4. **Use Meaningful Error Messages**:

   ```typescript
   // Good
   throw new BadRequestException('Cannot delete expense in approved status');

   // Avoid
   throw new BadRequestException('Operation failed');
   ```

## Testing Error Responses

All error responses follow the same format, making frontend error handling consistent:

```typescript
// Frontend error handling
try {
  const response = await api.createUser(userData);
} catch (error) {
  if (error.response?.data?.error?.code === 'VALIDATION_ERROR') {
    // Handle validation errors
    const validationErrors = error.response.data.error.details.errors;
    // Display field-specific errors
  } else if (error.response?.data?.error?.code === 'DUPLICATE_RESOURCE') {
    // Handle duplicate resource
    showError('User already exists');
  }
}
```
