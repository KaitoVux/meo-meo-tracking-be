import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { BadRequestException, Injectable } from '@nestjs/common';
import csv from 'csv-parser';
import * as ExcelJS from 'exceljs';
import { Readable } from 'stream';

import { Category } from '../../entities/category.entity';
import {
  Currency,
  Expense,
  ExpenseStatus,
  ExpenseType,
  PaymentMethod,
} from '../../entities/expense.entity';
import { ImportRecord } from '../../entities/import-record.entity';
import { User } from '../../entities/user.entity';
import { Vendor } from '../../entities/vendor.entity';
import { ImportError, ImportPreviewDto, ImportStatus } from '../dto';

interface ParsedExpenseData {
  parentId?: string;
  subId?: string;
  vendor: string;
  description: string;
  type: 'In' | 'Out';
  amountBeforeVat: string;
  vatAmount: string;
  amountAfterVat: string;
  currency: string;
  transactionDate: string;
  category: string;
  paymentMethod: string;
  invoiceLink?: string;
}

@Injectable()
export class ImportService {
  constructor(
    @InjectRepository(ImportRecord)
    private readonly importRepository: EntityRepository<ImportRecord>,
    @InjectRepository(Expense)
    private readonly expenseRepository: EntityRepository<Expense>,
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
    @InjectRepository(Vendor)
    private readonly vendorRepository: EntityRepository<Vendor>,
    @InjectRepository(Category)
    private readonly categoryRepository: EntityRepository<Category>,
    private readonly em: EntityManager,
  ) {}

  async previewFile(
    file: Express.Multer.File,
    userId: string,
  ): Promise<ImportPreviewDto> {
    const user = await this.userRepository.findOne(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
    let parsedData: ParsedExpenseData[] = [];

    try {
      if (fileExtension === 'csv') {
        parsedData = await this.parseCsvFile(file.buffer);
      } else if (fileExtension === 'xlsx') {
        parsedData = await this.parseExcelFile(file.buffer);
      } else {
        throw new BadRequestException(
          'Unsupported file format. Only CSV and Excel files are allowed.',
        );
      }
    } catch (error) {
      throw new BadRequestException(`Failed to parse file: ${error.message}`);
    }

    // Validate data and collect errors
    const errors: ImportError[] = [];
    const validatedData = await this.validateExpenseData(parsedData, errors);

    // Get sample data (first 5 rows)
    const sampleData = parsedData.slice(0, 5).map((row) => ({
      'Parent ID': row.parentId || '',
      'Sub-ID': row.subId || '',
      Vendor: row.vendor,
      Description: row.description,
      Type: row.type,
      'Amount (Before VAT)': row.amountBeforeVat,
      'VAT Amount': row.vatAmount,
      'Amount (After VAT)': row.amountAfterVat,
      Currency: row.currency,
      'Transaction Date': row.transactionDate,
      Category: row.category,
      'Payment Method': row.paymentMethod,
      'Invoice Link': row.invoiceLink || '',
    }));

    return {
      fileName: file.originalname,
      totalRows: parsedData.length,
      headers: [
        'Parent ID',
        'Sub-ID',
        'Vendor',
        'Description',
        'Type',
        'Amount (Before VAT)',
        'VAT Amount',
        'Amount (After VAT)',
        'Currency',
        'Transaction Date',
        'Category',
        'Payment Method',
        'Invoice Link',
      ],
      sampleData,
      errors,
    };
  }

  async importFile(
    file: Express.Multer.File,
    userId: string,
  ): Promise<ImportRecord> {
    const user = await this.userRepository.findOne(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Create import record
    const importRecord = new ImportRecord();
    importRecord.fileName = file.originalname;
    importRecord.fileSize = file.size;
    importRecord.mimeType = file.mimetype;
    importRecord.status = ImportStatus.PENDING;
    importRecord.uploadedBy = user;

    await this.em.persistAndFlush(importRecord);

    // Process file asynchronously
    void this.processImportAsync(
      importRecord.id,
      file.buffer,
      file.originalname,
    );

    return importRecord;
  }

  private async processImportAsync(
    importId: string,
    fileBuffer: Buffer,
    fileName: string,
  ): Promise<void> {
    const importRecord = await this.importRepository.findOne(importId);
    if (!importRecord) return;

    try {
      importRecord.status = ImportStatus.PROCESSING;
      await this.em.persistAndFlush(importRecord);

      const fileExtension = fileName.split('.').pop()?.toLowerCase();
      let parsedData: ParsedExpenseData[] = [];

      if (fileExtension === 'csv') {
        parsedData = await this.parseCsvFile(fileBuffer);
      } else if (fileExtension === 'xlsx') {
        parsedData = await this.parseExcelFile(fileBuffer);
      }

      importRecord.totalRows = parsedData.length;

      const errors: ImportError[] = [];
      const validatedData = await this.validateExpenseData(parsedData, errors);

      let successCount = 0;
      let processedCount = 0;

      for (const expenseData of validatedData) {
        if (expenseData) {
          try {
            await this.createExpenseFromData(
              expenseData,
              importRecord.uploadedBy,
            );
            successCount++;
          } catch (error) {
            errors.push({
              row: processedCount + 1,
              field: 'general',
              message: `Failed to create expense: ${error.message}`,
            });
          }
        }

        processedCount++;
        importRecord.processedRows = processedCount;
        importRecord.progress = Math.round(
          (processedCount / parsedData.length) * 100,
        );

        // Update progress every 10 records
        if (processedCount % 10 === 0) {
          await this.em.persistAndFlush(importRecord);
        }
      }

      importRecord.status = ImportStatus.COMPLETED;
      importRecord.successfulRows = successCount;
      importRecord.errorRows = errors.length;
      importRecord.errors = errors;
      importRecord.completedAt = new Date();
    } catch (error) {
      importRecord.status = ImportStatus.FAILED;
      importRecord.errors = [
        {
          row: 0,
          field: 'general',
          message: `Import failed: ${error.message}`,
        },
      ];
    }

    await this.em.persistAndFlush(importRecord);
  }

  private async parseCsvFile(buffer: Buffer): Promise<ParsedExpenseData[]> {
    return new Promise((resolve, reject) => {
      const results: ParsedExpenseData[] = [];
      const stream = Readable.from(buffer.toString());

      stream
        .pipe(csv())
        .on('data', (row) => {
          results.push({
            parentId: row['Parent ID'],
            subId: row['Sub-ID'],
            vendor: row['Vendor'],
            description: row['Description'],
            type: row['Type (In/Out)'],
            amountBeforeVat: row['Amount (Before VAT)'],
            vatAmount: row['VAT Amount'],
            amountAfterVat: row['Amount (After VAT)'],
            currency: row['Currency'],
            transactionDate: row['Transaction Date'],
            category: row['Category'],
            paymentMethod: row['Payment Method'],
            invoiceLink: row['Invoice Link'],
          });
        })
        .on('end', () => resolve(results))
        .on('error', reject);
    });
  }

  private getCellValue(cellValue: unknown): string | undefined {
    if (cellValue === null || cellValue === undefined) {
      return undefined;
    }

    // Handle Date objects
    if (cellValue instanceof Date) {
      return cellValue.toISOString().split('T')[0]; // Return YYYY-MM-DD format
    }

    // Handle numbers
    if (typeof cellValue === 'number') {
      return cellValue.toString();
    }

    // Handle strings
    if (typeof cellValue === 'string') {
      return cellValue.trim();
    }

    // Handle boolean values
    if (typeof cellValue === 'boolean') {
      return cellValue.toString();
    }

    // Handle objects with a text property (Excel rich text)
    if (
      typeof cellValue === 'object' &&
      cellValue !== null &&
      'text' in cellValue
    ) {
      return String((cellValue as { text: unknown }).text).trim();
    }

    // Handle objects with a value property (Excel formula results)
    if (
      typeof cellValue === 'object' &&
      cellValue !== null &&
      'value' in cellValue
    ) {
      return this.getCellValue((cellValue as { value: unknown }).value);
    }

    // Handle objects with toString method
    if (
      typeof cellValue === 'object' &&
      cellValue !== null &&
      typeof (cellValue as any).toString === 'function'
    ) {
      const stringValue = (cellValue as { toString(): string }).toString();
      // Only use toString if it doesn't return the default object string
      if (stringValue !== '[object Object]') {
        return stringValue.trim();
      }
    }

    // For complex objects, try to extract meaningful data or return undefined
    if (typeof cellValue === 'object' && cellValue !== null) {
      // Log warning for debugging purposes
      console.warn('Unhandled cell value type:', typeof cellValue, cellValue);
      return undefined;
    }

    // Safe fallback for primitive types only
    return String(cellValue as unknown).trim();
  }

  private async parseExcelFile(buffer: Buffer): Promise<ParsedExpenseData[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      throw new Error('No worksheet found in Excel file');
    }

    const results: ParsedExpenseData[] = [];
    const headerRow = worksheet.getRow(1);

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const values = row.values as unknown[];
      if (values.length > 1 && values[1]) {
        // Skip empty rows
        results.push({
          parentId: this.getCellValue(values[1]),
          subId: this.getCellValue(values[2]),
          vendor: this.getCellValue(values[3]) || '',
          description: this.getCellValue(values[4]) || '',
          type: this.getCellValue(values[5]) as 'In' | 'Out',
          amountBeforeVat: this.getCellValue(values[6]) || '',
          vatAmount: this.getCellValue(values[7]) || '',
          amountAfterVat: this.getCellValue(values[8]) || '',
          currency: this.getCellValue(values[9]) || '',
          transactionDate: this.getCellValue(values[10]) || '',
          category: this.getCellValue(values[11]) || '',
          paymentMethod: this.getCellValue(values[12]) || '',
          invoiceLink: this.getCellValue(values[13]),
        });
      }
    });

    return results;
  }

  private async validateExpenseData(
    data: ParsedExpenseData[],
    errors: ImportError[],
  ): Promise<(ParsedExpenseData | null)[]> {
    const vendors = await this.vendorRepository.findAll();
    const categories = await this.categoryRepository.findAll();

    const vendorNames = new Set(vendors.map((v) => v.name.toLowerCase()));
    const categoryNames = new Set(categories.map((c) => c.name.toLowerCase()));

    return data.map((row, index) => {
      const rowNumber = index + 1; // +1 because index starts at 0, but we want to show actual data row numbers

      // Required field validation
      if (!row.vendor?.trim()) {
        errors.push({
          row: rowNumber,
          field: 'vendor',
          message: 'Vendor is required',
          value: row.vendor,
        });
      }

      if (!row.description?.trim()) {
        errors.push({
          row: rowNumber,
          field: 'description',
          message: 'Description is required',
          value: row.description,
        });
      }

      if (!row.type || !['In', 'Out'].includes(row.type)) {
        errors.push({
          row: rowNumber,
          field: 'type',
          message: 'Type must be "In" or "Out"',
          value: row.type,
        });
      }

      if (!row.amountAfterVat) {
        errors.push({
          row: rowNumber,
          field: 'amountAfterVat',
          message: 'Amount is required',
          value: row.amountAfterVat,
        });
      } else {
        // Validate amount format
        const cleanAmount = row.amountAfterVat.replace(/[,\s]/g, '');
        if (isNaN(Number(cleanAmount))) {
          errors.push({
            row: rowNumber,
            field: 'amountAfterVat',
            message: 'Invalid amount format',
            value: row.amountAfterVat,
          });
        }
      }

      if (!row.currency) {
        errors.push({
          row: rowNumber,
          field: 'currency',
          message: 'Currency is required',
          value: row.currency,
        });
      }

      if (!row.transactionDate) {
        errors.push({
          row: rowNumber,
          field: 'transactionDate',
          message: 'Transaction date is required',
          value: row.transactionDate,
        });
      } else {
        // Validate date format
        const date = new Date(row.transactionDate);
        if (isNaN(date.getTime())) {
          errors.push({
            row: rowNumber,
            field: 'transactionDate',
            message: 'Invalid date format',
            value: row.transactionDate,
          });
        }
      }

      if (!row.category?.trim()) {
        errors.push({
          row: rowNumber,
          field: 'category',
          message: 'Category is required',
          value: row.category,
        });
      }

      if (!row.paymentMethod?.trim()) {
        errors.push({
          row: rowNumber,
          field: 'paymentMethod',
          message: 'Payment method is required',
          value: row.paymentMethod,
        });
      } else {
        // Validate payment method values
        const validPaymentMethods = [
          'BANK_TRANSFER',
          'PETTY_CASH',
          'CREDIT_CARD',
        ];
        if (!validPaymentMethods.includes(row.paymentMethod.toUpperCase())) {
          errors.push({
            row: rowNumber,
            field: 'paymentMethod',
            message: `Payment method must be one of: ${validPaymentMethods.join(', ')}`,
            value: row.paymentMethod,
          });
        }
      }

      // Validate vendor existence
      if (row.vendor?.trim() && !vendorNames.has(row.vendor.toLowerCase())) {
        errors.push({
          row: rowNumber,
          field: 'vendor',
          message: 'Vendor does not exist in the system',
          value: row.vendor,
        });
      }

      // Validate category existence
      if (
        row.category?.trim() &&
        !categoryNames.has(row.category.toLowerCase())
      ) {
        errors.push({
          row: rowNumber,
          field: 'category',
          message: 'Category does not exist in the system',
          value: row.category,
        });
      }

      // Return null if row has errors, otherwise return the row
      const rowErrors = errors.filter((e) => e.row === rowNumber);
      return rowErrors.length > 0 ? null : row;
    });
  }

  private async createExpenseFromData(
    data: ParsedExpenseData,
    user: User,
  ): Promise<Expense> {
    // Find or create vendor
    let vendor = await this.vendorRepository.findOne({ name: data.vendor });
    if (!vendor) {
      vendor = new Vendor();
      vendor.name = data.vendor;
      vendor.createdBy = user;
      vendor.updatedBy = user;
      await this.em.persistAndFlush(vendor);
    }

    // Find or create category
    let category = await this.categoryRepository.findOne({
      name: data.category,
    });
    if (!category) {
      category = new Category();
      category.name = data.category;
      category.createdBy = user;
      category.updatedBy = user;
      await this.em.persistAndFlush(category);
    }

    // Create expense
    const expense = new Expense();
    expense.paymentId = data.parentId as string;
    expense.subId = data.subId;
    expense.vendor = vendor;
    expense.category = category.name;
    expense.description = data.description;
    expense.categoryEntity = category;

    // Amount fields
    const amountBeforeVAT = Number(data.amountBeforeVat.replace(/[,\s]/g, ''));
    const vatAmount = Number(data.vatAmount.replace(/[,\s]/g, ''));

    expense.amountBeforeVAT = amountBeforeVAT;
    expense.vatAmount = vatAmount;
    expense.amount = Number(data.amountAfterVat.replace(/[,\s]/g, ''));

    // Calculate VAT percentage if both amounts are available
    if (amountBeforeVAT > 0 && vatAmount > 0) {
      expense.vatPercentage = (vatAmount / amountBeforeVAT) * 100;
    }

    expense.currency = data.currency as Currency;
    expense.transactionDate = new Date(data.transactionDate);

    // Set expense month from transaction date
    const transactionDate = new Date(data.transactionDate);
    expense.expenseMonth = transactionDate.toLocaleDateString('en-US', {
      month: 'long',
    });

    // Map expense type
    expense.type = data.type === 'In' ? ExpenseType.IN : ExpenseType.OUT;

    // Set payment method from import data
    expense.paymentMethod = data.paymentMethod.toUpperCase() as PaymentMethod;

    expense.status = ExpenseStatus.DRAFT;
    expense.submitter = user;
    expense.createdBy = user;
    expense.updatedBy = user;

    if (data.invoiceLink) {
      expense.invoiceLink = data.invoiceLink;
    }

    await this.em.persistAndFlush(expense);
    return expense;
  }

  async getImportHistory(userId: string): Promise<ImportRecord[]> {
    return this.importRepository.find(
      { uploadedBy: userId },
      { orderBy: { createdAt: 'DESC' } },
    );
  }

  async getImportStatus(importId: string): Promise<ImportRecord | null> {
    return this.importRepository.findOne(importId);
  }
}
