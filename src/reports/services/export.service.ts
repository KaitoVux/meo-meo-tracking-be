import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { ReportData } from './report-generation.service';
import { ExportFormat } from '../dto/export-query.dto';

export interface ExportResult {
  buffer: ArrayBuffer | Buffer | Uint8Array;
  filename: string;
  mimeType: string;
}

@Injectable()
export class ExportService {
  /**
   * Helper method to safely convert cell values to display strings
   */
  private getCellDisplayValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number') {
      return value.toString();
    }
    if (typeof value === 'boolean') {
      return value.toString();
    }
    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }
    // For objects, try to get a meaningful string representation
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    return String(value);
  }
  /**
   * Export report data in specified format
   * Requirements: 3.4 - Excel, CSV, and PDF export
   */
  async exportReport(
    reportData: ReportData,
    format: ExportFormat,
    reportType: 'summary' | 'detailed' = 'detailed',
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<ExportResult> {
    const filename = this.generateFilename(
      reportType,
      format,
      dateFrom,
      dateTo,
    );

    switch (format) {
      case ExportFormat.CSV:
        return this.exportToCSV(reportData, reportType, filename);
      case ExportFormat.EXCEL:
        return await this.exportToExcel(reportData, reportType, filename);
      case ExportFormat.PDF:
        return this.exportToPDF(reportData, reportType, filename);
      default:
        throw new Error(`Unsupported export format: ${String(format)}`);
    }
  }

  /**
   * Generate meaningful filename with date range
   */
  private generateFilename(
    reportType: 'summary' | 'detailed',
    format: ExportFormat,
    dateFrom?: Date,
    dateTo?: Date,
  ): string {
    console.log('Generating filename with:', {
      reportType,
      format,
      dateFrom,
      dateTo,
    });

    const today = new Date().toISOString().split('T')[0];
    let dateRange = today;

    if (dateFrom && dateTo) {
      const fromStr = dateFrom.toISOString().split('T')[0];
      const toStr = dateTo.toISOString().split('T')[0];
      dateRange = `${fromStr}_to_${toStr}`;
    } else if (dateFrom) {
      const fromStr = dateFrom.toISOString().split('T')[0];
      dateRange = `from_${fromStr}`;
    } else if (dateTo) {
      const toStr = dateTo.toISOString().split('T')[0];
      dateRange = `until_${toStr}`;
    }

    // Map format to proper file extension
    const extensionMap = {
      [ExportFormat.EXCEL]: 'xlsx',
      [ExportFormat.CSV]: 'csv',
      [ExportFormat.PDF]: 'pdf',
    };
    const extension = extensionMap[format] || format.toLowerCase();
    const filename = `expense-report-${reportType}-${dateRange}.${extension}`;
    console.log('Generated filename:', filename);
    return filename;
  }

  /**
   * Export expenses to CSV format
   */
  private exportToCSV(
    reportData: ReportData,
    reportType: 'summary' | 'detailed',
    filename: string,
  ): ExportResult {
    let csvContent = '';

    if (reportType === 'summary') {
      csvContent = this.generateSummaryCSV(reportData);
    } else {
      csvContent = this.generateDetailedCSV(reportData);
    }

    const buffer = Buffer.from(csvContent, 'utf-8');

    return {
      buffer,
      filename,
      mimeType: 'text/csv',
    };
  }
  /**
   * Export expenses to Excel format using ExcelJS
   * Creates a proper Excel workbook with multiple sheets and formatting
   */
  private async exportToExcel(
    reportData: ReportData,
    reportType: 'summary' | 'detailed',
    filename: string,
  ): Promise<ExportResult> {
    const workbook = new ExcelJS.Workbook();

    // Set workbook properties
    workbook.creator = 'Business Expense Tracker';
    workbook.lastModifiedBy = 'Business Expense Tracker';
    workbook.created = new Date();
    workbook.modified = new Date();

    if (reportType === 'summary') {
      this.createSummaryExcelSheet(workbook, reportData);
    } else {
      this.createDetailedExcelSheet(workbook, reportData);
      this.createSummaryExcelSheet(workbook, reportData);
    }

    // Generate buffer - writeBuffer() already returns a Buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return {
      buffer,
      filename,
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  /**
   * Export expenses to PDF format
   * TODO: For production, install 'pdfkit' or 'puppeteer' package for proper PDF export
   * npm install pdfkit @types/pdfkit
   */
  private exportToPDF(
    reportData: ReportData,
    reportType: 'summary' | 'detailed',
    filename: string,
  ): ExportResult {
    // For now, we'll create a simple text-based PDF content
    // In a full implementation, you would use a library like 'pdfkit' or 'puppeteer'
    const textContent =
      reportType === 'summary'
        ? this.generateSummaryText(reportData)
        : this.generateDetailedText(reportData);

    const buffer = Buffer.from(textContent, 'utf-8');

    return {
      buffer,
      filename,
      mimeType: 'application/pdf',
    };
  }

  private generateSummaryCSV(reportData: ReportData): string {
    const { summary, groupedData } = reportData;
    let csv = 'Expense Report Summary\n\n';

    // Summary statistics
    csv += 'Metric,Value\n';
    csv += `Total Expenses,${summary.totalExpenses}\n`;
    csv += `Total Amount,${summary.totalAmount}\n`;
    csv += `Total Amount VND,${summary.totalAmountVND}\n`;
    csv += `Total Amount USD,${summary.totalAmountUSD}\n`;
    csv += `Average Amount,${summary.averageAmount.toFixed(2)}\n`;
    csv += `Date Range,"${summary.dateRange.from.toISOString().split('T')[0]} to ${summary.dateRange.to.toISOString().split('T')[0]}"\n\n`;

    // Status breakdown
    csv += 'Status Breakdown\n';
    csv += 'Status,Count\n';
    Object.entries(summary.statusBreakdown).forEach(([status, count]) => {
      csv += `${status},${count}\n`;
    });

    // Grouped data if available
    if (groupedData && groupedData.length > 0) {
      csv += '\nGrouped Data\n';
      csv += 'Group,Total Amount,Expense Count,Percentage\n';
      groupedData.forEach((group) => {
        csv += `"${group.groupLabel}",${group.totalAmount},${group.expenseCount},${group.percentage.toFixed(2)}%\n`;
      });
    }

    return csv;
  }

  private generateDetailedCSV(reportData: ReportData): string {
    const { expenses } = reportData;

    // CSV headers
    let csv =
      'Payment ID,Sub ID,Transaction Date,Expense Month,Vendor,Category,Type,Amount Before VAT,VAT %,VAT Amount,Total Amount,Currency,Exchange Rate,Description,Submitter,Project/Cost Center,Payment Method,Status,Created At\n';

    // CSV data rows
    expenses.forEach((expense) => {
      const row = [
        expense.paymentId,
        expense.subId || '',
        expense.transactionDate.toISOString().split('T')[0],
        expense.expenseMonth,
        `"${expense.vendor.name}"`,
        `"${expense.category}"`,
        expense.type,
        expense.amountBeforeVAT,
        expense.vatPercentage || '',
        expense.vatAmount || '',
        expense.amount,
        expense.currency,
        expense.exchangeRate || '',
        `"${expense.description}"`,
        `"${expense.submitter.name}"`,
        `"${expense.projectCostCenter || ''}"`,
        expense.paymentMethod,
        expense.status,
        expense.createdAt.toISOString().split('T')[0],
      ].join(',');

      csv += row + '\n';
    });

    return csv;
  }

  private generateSummaryText(reportData: ReportData): string {
    const { summary, groupedData, metadata } = reportData;

    let text = 'EXPENSE REPORT SUMMARY\n';
    text += '='.repeat(50) + '\n\n';
    text += `Generated: ${metadata.generatedAt.toISOString()}\n`;
    text += `Total Records: ${metadata.recordCount}\n\n`;

    text += 'SUMMARY STATISTICS\n';
    text += '-'.repeat(30) + '\n';
    text += `Total Expenses: ${summary.totalExpenses}\n`;
    text += `Total Amount: ${summary.totalAmount.toLocaleString()}\n`;
    text += `Total Amount VND: ${summary.totalAmountVND.toLocaleString()}\n`;
    text += `Total Amount USD: ${summary.totalAmountUSD.toLocaleString()}\n`;
    text += `Average Amount: ${summary.averageAmount.toFixed(2)}\n`;
    text += `Date Range: ${summary.dateRange.from.toISOString().split('T')[0]} to ${summary.dateRange.to.toISOString().split('T')[0]}\n\n`;

    text += 'STATUS BREAKDOWN\n';
    text += '-'.repeat(30) + '\n';
    Object.entries(summary.statusBreakdown).forEach(([status, count]) => {
      text += `${status}: ${count}\n`;
    });

    if (groupedData && groupedData.length > 0) {
      text += '\nGROUPED DATA\n';
      text += '-'.repeat(30) + '\n';
      groupedData.forEach((group) => {
        text += `${group.groupLabel}: ${group.totalAmount.toLocaleString()} (${group.expenseCount} expenses, ${group.percentage.toFixed(2)}%)\n`;
      });
    }

    return text;
  }

  private generateDetailedText(reportData: ReportData): string {
    const { expenses, summary, metadata } = reportData;

    let text = 'DETAILED EXPENSE REPORT\n';
    text += '='.repeat(50) + '\n\n';
    text += `Generated: ${metadata.generatedAt.toISOString()}\n`;
    text += `Total Records: ${metadata.recordCount}\n\n`;

    text += 'SUMMARY\n';
    text += '-'.repeat(30) + '\n';
    text += `Total Expenses: ${summary.totalExpenses}\n`;
    text += `Total Amount: ${summary.totalAmount.toLocaleString()}\n\n`;

    text += 'DETAILED EXPENSES\n';
    text += '-'.repeat(30) + '\n';

    expenses.forEach((expense, index) => {
      text += `${index + 1}. Payment ID: ${expense.paymentId}${expense.subId ? `-${expense.subId}` : ''}\n`;
      text += `   Date: ${expense.transactionDate.toISOString().split('T')[0]}\n`;
      text += `   Vendor: ${expense.vendor.name}\n`;
      text += `   Category: ${expense.category}\n`;
      text += `   Amount: ${expense.amount.toLocaleString()} ${expense.currency}\n`;
      text += `   Description: ${expense.description}\n`;
      text += `   Submitter: ${expense.submitter.name}\n`;
      text += `   Status: ${expense.status}\n`;
      text += '\n';
    });

    return text;
  }

  /**
   * Create a detailed Excel sheet with expense data
   */
  private createDetailedExcelSheet(
    workbook: ExcelJS.Workbook,
    reportData: ReportData,
  ): void {
    const worksheet = workbook.addWorksheet('Detailed Expenses');

    // Set up column headers with formatting
    const headers = [
      'Payment ID',
      'Sub ID',
      'Transaction Date',
      'Expense Month',
      'Vendor',
      'Category',
      'Type',
      'Amount Before VAT',
      'VAT %',
      'VAT Amount',
      'Total Amount',
      'Currency',
      'Exchange Rate',
      'Description',
      'Submitter',
      'Project/Cost Center',
      'Payment Method',
      'Status',
      'Created At',
    ];

    // Add headers
    worksheet.addRow(headers);

    // Style the header row
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '366092' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // Add data rows with proper data type handling
    reportData.expenses.forEach((expense) => {
      const row = [
        expense.paymentId || '',
        expense.subId || '',
        expense.transactionDate,
        expense.expenseMonth || '',
        expense.vendor?.name || '',
        expense.category || '',
        expense.type || '',
        Number(expense.amountBeforeVAT) || 0,
        expense.vatPercentage ? Number(expense.vatPercentage) / 100 : null, // Convert to decimal for percentage format
        Number(expense.vatAmount) || null,
        Number(expense.amount) || 0,
        expense.currency || '',
        expense.exchangeRate ? Number(expense.exchangeRate) : null,
        expense.description || '',
        expense.submitter?.name || '',
        expense.projectCostCenter || '',
        expense.paymentMethod || '',
        expense.status || '',
        expense.createdAt,
      ];
      worksheet.addRow(row);
    });

    // Auto-fit columns with proper width calculation
    if (worksheet.columns) {
      worksheet.columns.forEach((column, index) => {
        if (index < headers.length && column) {
          let maxLength = headers[index].length;

          // Calculate max length for each column
          worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) {
              // Skip header row
              const cell = row.getCell(index + 1);
              const cellValue = this.getCellDisplayValue(cell.value);
              maxLength = Math.max(maxLength, cellValue.length);
            }
          });

          column.width = Math.min(Math.max(maxLength + 2, 10), 50); // Min 10, max 50 characters
        }
      });
    }

    // Format currency columns (1-based indexing for ExcelJS)
    const currencyColumns = [8, 10, 11]; // Amount Before VAT, VAT Amount, Total Amount columns
    currencyColumns.forEach((colIndex) => {
      const column = worksheet.getColumn(colIndex);
      column.numFmt = '#,##0.00';
    });

    // Format percentage column (VAT %)
    const percentageColumn = worksheet.getColumn(9);
    percentageColumn.numFmt = '0.00%';

    // Format date columns
    const dateColumns = [3, 19]; // Transaction Date, Created At
    dateColumns.forEach((colIndex) => {
      const column = worksheet.getColumn(colIndex);
      column.numFmt = 'yyyy-mm-dd';
    });

    // Add borders to all data cells
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        // Skip header row
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
        });
      }
    });
  }

  /**
   * Create a summary Excel sheet with aggregate data
   */
  private createSummaryExcelSheet(
    workbook: ExcelJS.Workbook,
    reportData: ReportData,
  ): void {
    const worksheet = workbook.addWorksheet('Summary');

    // Title
    worksheet.mergeCells('A1:D1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'Expense Report Summary';
    titleCell.font = { size: 16, bold: true, color: { argb: '366092' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Summary statistics
    let row = 3;
    worksheet.getCell(`A${row}`).value = 'Summary Statistics';
    worksheet.getCell(`A${row}`).font = { bold: true, size: 14 };
    row += 2;

    const summaryStats = [
      ['Total Expenses:', reportData.summary.totalExpenses],
      [
        'Total Amount:',
        `${reportData.summary.totalAmount.toLocaleString()} (Mixed)`,
      ],
      [
        'Total Amount VND:',
        `${reportData.summary.totalAmountVND.toLocaleString()} VND`,
      ],
      [
        'Total Amount USD:',
        `$${reportData.summary.totalAmountUSD.toLocaleString()} USD`,
      ],
      ['Average Amount:', reportData.summary.averageAmount.toFixed(2)],
      [
        'Date Range:',
        `${reportData.summary.dateRange.from.toISOString().split('T')[0]} to ${reportData.summary.dateRange.to.toISOString().split('T')[0]}`,
      ],
    ];

    summaryStats.forEach(([label, value]) => {
      worksheet.getCell(`A${row}`).value = label;
      worksheet.getCell(`A${row}`).font = { bold: true };
      worksheet.getCell(`B${row}`).value = value;
      row++;
    });

    // Status breakdown
    row += 2;
    worksheet.getCell(`A${row}`).value = 'Status Breakdown';
    worksheet.getCell(`A${row}`).font = { bold: true, size: 14 };
    row += 2;

    worksheet.getCell(`A${row}`).value = 'Status';
    worksheet.getCell(`B${row}`).value = 'Count';
    worksheet.getRow(row).font = { bold: true };
    row++;

    Object.entries(reportData.summary.statusBreakdown).forEach(
      ([status, count]) => {
        worksheet.getCell(`A${row}`).value = status;
        worksheet.getCell(`B${row}`).value = count;
        row++;
      },
    );

    // Grouped data if available
    if (reportData.groupedData && reportData.groupedData.length > 0) {
      row += 2;
      worksheet.getCell(`A${row}`).value = 'Grouped Analysis';
      worksheet.getCell(`A${row}`).font = { bold: true, size: 14 };
      row += 2;

      // Headers for grouped data
      const groupHeaders = [
        'Group',
        'Total Amount',
        'Expense Count',
        'Percentage',
      ];
      groupHeaders.forEach((header, index) => {
        const cell = worksheet.getCell(row, index + 1);
        cell.value = header;
        cell.font = { bold: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'E6E6E6' },
        };
      });
      row++;

      reportData.groupedData.forEach((group) => {
        worksheet.getCell(`A${row}`).value = group.groupLabel;
        worksheet.getCell(`B${row}`).value = group.totalAmount;
        worksheet.getCell(`C${row}`).value = group.expenseCount;
        worksheet.getCell(`D${row}`).value = `${group.percentage.toFixed(2)}%`;
        row++;
      });
    }

    // Auto-fit columns
    if (worksheet.columns) {
      worksheet.columns.forEach((column) => {
        if (column && column.eachCell) {
          let maxLength = 0;
          column.eachCell({ includeEmpty: false }, (cell) => {
            const cellValue = this.getCellDisplayValue(cell.value);
            maxLength = Math.max(maxLength, cellValue.length);
          });
          column.width = Math.min(maxLength + 2, 50);
        }
      });
    }
  }
}
