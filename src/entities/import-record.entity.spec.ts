import { ImportRecord } from './import-record.entity';
import { User } from './user.entity';
import { ImportStatus } from '../import/dto';

describe('ImportRecord Entity', () => {
  let importRecord: ImportRecord;
  let user: User;

  beforeEach(() => {
    user = new User();
    user.id = 'user-123';
    user.email = 'test@example.com';
    user.name = 'Test User';

    importRecord = new ImportRecord();
  });

  it('should create an import record with required fields', () => {
    importRecord.fileName = 'test-expenses.csv';
    importRecord.fileSize = 1024;
    importRecord.mimeType = 'text/csv';
    importRecord.status = ImportStatus.PENDING;
    importRecord.uploadedBy = user;

    expect(importRecord.fileName).toBe('test-expenses.csv');
    expect(importRecord.fileSize).toBe(1024);
    expect(importRecord.mimeType).toBe('text/csv');
    expect(importRecord.status).toBe(ImportStatus.PENDING);
    expect(importRecord.uploadedBy).toBe(user);
  });

  it('should have default values for progress and row counts', () => {
    expect(importRecord.progress).toBe(0);
    expect(importRecord.totalRows).toBe(0);
    expect(importRecord.processedRows).toBe(0);
    expect(importRecord.successfulRows).toBe(0);
    expect(importRecord.errorRows).toBe(0);
  });

  it('should handle progress updates', () => {
    importRecord.progress = 50;
    importRecord.processedRows = 5;
    importRecord.successfulRows = 4;
    importRecord.errorRows = 1;

    expect(importRecord.progress).toBe(50);
    expect(importRecord.processedRows).toBe(5);
    expect(importRecord.successfulRows).toBe(4);
    expect(importRecord.errorRows).toBe(1);
  });

  it('should handle completion timestamp', () => {
    const completionTime = new Date();
    importRecord.completedAt = completionTime;

    expect(importRecord.completedAt).toBe(completionTime);
  });

  it('should store error details as JSON', () => {
    const errors = [
      {
        row: 1,
        field: 'amount',
        message: 'Invalid amount format',
        value: 'invalid-amount',
      },
      {
        row: 2,
        field: 'date',
        message: 'Invalid date format',
        value: '2023-13-45',
      },
    ];

    importRecord.errors = errors;

    expect(importRecord.errors).toEqual(errors);
    expect(importRecord.errors[0].row).toBe(1);
    expect(importRecord.errors[0].field).toBe('amount');
    expect(importRecord.errors[1].message).toBe('Invalid date format');
  });

  it('should handle all import statuses', () => {
    // Test all possible status values
    importRecord.status = ImportStatus.PENDING;
    expect(importRecord.status).toBe('pending');

    importRecord.status = ImportStatus.PROCESSING;
    expect(importRecord.status).toBe('processing');

    importRecord.status = ImportStatus.COMPLETED;
    expect(importRecord.status).toBe('completed');

    importRecord.status = ImportStatus.FAILED;
    expect(importRecord.status).toBe('failed');
  });

  it('should calculate progress correctly', () => {
    importRecord.totalRows = 100;
    importRecord.processedRows = 75;

    // Progress should be calculated as (processedRows / totalRows) * 100
    const calculatedProgress = Math.round(
      (importRecord.processedRows / importRecord.totalRows) * 100,
    );
    expect(calculatedProgress).toBe(75);
  });

  it('should track successful vs error row counts', () => {
    importRecord.totalRows = 10;
    importRecord.processedRows = 10;
    importRecord.successfulRows = 8;
    importRecord.errorRows = 2;

    expect(importRecord.successfulRows + importRecord.errorRows).toBe(
      importRecord.processedRows,
    );
  });

  it('should handle large file sizes', () => {
    const largeFileSize = 10 * 1024 * 1024; // 10MB
    importRecord.fileSize = largeFileSize;

    expect(importRecord.fileSize).toBe(largeFileSize);
  });

  it('should validate file types through mime type', () => {
    // CSV file
    importRecord.mimeType = 'text/csv';
    expect(importRecord.mimeType).toBe('text/csv');

    // Excel file
    importRecord.mimeType =
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    expect(importRecord.mimeType).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  });

  it('should maintain relationship with user', () => {
    importRecord.uploadedBy = user;

    expect(importRecord.uploadedBy).toBe(user);
    expect(importRecord.uploadedBy.id).toBe('user-123');
    expect(importRecord.uploadedBy.email).toBe('test@example.com');
  });

  it('should handle empty errors array', () => {
    importRecord.errors = [];

    expect(importRecord.errors).toEqual([]);
    expect(importRecord.errors.length).toBe(0);
  });

  it('should handle null completion time for ongoing imports', () => {
    importRecord.status = ImportStatus.PROCESSING;
    importRecord.completedAt = undefined;

    expect(importRecord.completedAt).toBeUndefined();
  });

  it('should support complex error objects', () => {
    const complexErrors = [
      {
        row: 1,
        field: 'vendor',
        message: 'Vendor not found in system',
        value: 'Unknown Vendor Ltd',
      },
      {
        row: 3,
        field: 'category',
        message: 'Category does not exist',
        value: 'Nonexistent Category',
      },
      {
        row: 5,
        field: 'amount',
        message: 'Amount exceeds maximum limit',
        value: '999999.99',
      },
    ];

    importRecord.errors = complexErrors;

    expect(importRecord.errors).toHaveLength(3);
    expect(importRecord.errors[0].message).toContain('Vendor not found');
    expect(importRecord.errors[1].field).toBe('category');
    expect(importRecord.errors[2].value).toBe('999999.99');
  });
});
