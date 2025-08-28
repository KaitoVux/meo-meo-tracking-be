import { Injectable } from '@nestjs/common';
import { ReportData } from './report-generation.service';
import { ExportFormat } from '../dto/export-query.dto';

export interface ExportResult {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

@Injectable()
export class ExportService {
  /**
   * Export report data in specified format
   * Requirements: 3.4 - Excel, CSV, and PDF export
   */
  exportReport(
    reportData: ReportData,
    format: ExportFormat,
    reportType: 'summary' | 'detailed' = 'detailed',
  ): ExportResult {
    const timestamp = new Date().toISOString().split('T')[0];

    switch (format) {
      case ExportFormat.CSV:
        return this.exportToCSV(reportData, reportType, timestamp);
      case ExportFormat.EXCEL:
        return this.exportToExcel(reportData, reportType, timestamp);
      case ExportFormat.PDF:
        return this.exportToPDF(reportData, reportType, timestamp);
      default:
        throw new Error(`Unsupported export format: ${String(format)}`);
    }
  }

  /**
   * Export expenses to CSV format
   */
  private exportToCSV(
    reportData: ReportData,
    reportType: 'summary' | 'detailed',
    timestamp: string,
  ): ExportResult {
    let csvContent = '';

    if (reportType === 'summary') {
      csvContent = this.generateSummaryCSV(reportData);
    } else {
      csvContent = this.generateDetailedCSV(reportData);
    }

    const buffer = Buffer.from(csvContent, 'utf-8');
    const filename = `expense-report-${reportType}-${timestamp}.csv`;

    return {
      buffer,
      filename,
      mimeType: 'text/csv',
    };
  }
  /**
   * Export expenses to Excel format
   * TODO: For production, install 'exceljs' package for proper Excel export
   * npm install exceljs @types/exceljs
   */
  private exportToExcel(
    reportData: ReportData,
    reportType: 'summary' | 'detailed',
    timestamp: string,
  ): ExportResult {
    // For now, we'll create a simple Excel-compatible CSV
    // In a full implementation, you would use a library like 'exceljs'
    const csvContent =
      reportType === 'summary'
        ? this.generateSummaryCSV(reportData)
        : this.generateDetailedCSV(reportData);

    const buffer = Buffer.from(csvContent, 'utf-8');
    const filename = `expense-report-${reportType}-${timestamp}.xlsx`;

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
    timestamp: string,
  ): ExportResult {
    // For now, we'll create a simple text-based PDF content
    // In a full implementation, you would use a library like 'pdfkit' or 'puppeteer'
    const textContent =
      reportType === 'summary'
        ? this.generateSummaryText(reportData)
        : this.generateDetailedText(reportData);

    const buffer = Buffer.from(textContent, 'utf-8');
    const filename = `expense-report-${reportType}-${timestamp}.pdf`;

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
}
