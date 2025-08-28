import {
  Controller,
  Get,
  Query,
  Post,
  Body,
  UseGuards,
  Res,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { DashboardService } from './services/dashboard.service';
import { ReportGenerationService } from './services/report-generation.service';
import { ExportService } from './services/export.service';
import { PaymentDueService } from './services/payment-due.service';
import { DashboardQueryDto, ReportQueryDto, ExportQueryDto } from './dto';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly reportGenerationService: ReportGenerationService,
    private readonly exportService: ExportService,
    private readonly paymentDueService: PaymentDueService,
  ) {}

  /**
   * Get dashboard statistics
   * Requirements: 3.1, 3.2, 3.5, 3.6
   */
  @Get('dashboard')
  async getDashboardStatistics(
    @Query() query: DashboardQueryDto,
    @CurrentUser('id') _userId: string,
  ) {
    return this.dashboardService.getDashboardStatistics(query);
  }

  /**
   * Get monthly statistics
   * Requirement: 3.1
   */
  @Get('dashboard/monthly')
  async getMonthlyStatistics(
    @Query('year') year: string,
    @Query('month') month?: string,
    @Query() query?: DashboardQueryDto,
  ) {
    const yearNum = parseInt(year);
    const monthNum = month ? parseInt(month) : undefined;
    return this.dashboardService.getMonthlyStatistics(yearNum, monthNum, query);
  }

  /**
   * Get quarterly statistics
   * Requirement: 3.1
   */
  @Get('dashboard/quarterly')
  async getQuarterlyStatistics(
    @Query('year') year: string,
    @Query() query?: DashboardQueryDto,
  ) {
    const yearNum = parseInt(year);
    return this.dashboardService.getQuarterlyStatistics(yearNum, query);
  }

  /**
   * Get yearly statistics
   * Requirement: 3.1
   */
  @Get('dashboard/yearly')
  async getYearlyStatistics(@Query() query?: DashboardQueryDto) {
    return this.dashboardService.getYearlyStatistics(query);
  } /**

   * Generate expense report
   * Requirements: 3.2, 3.3
   */
  @Post('generate')
  async generateReport(
    @Body() query: ReportQueryDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.reportGenerationService.generateReport(query, userId);
  }

  /**
   * Generate paginated expense report
   * Requirement: 3.7 (100 records per page limit)
   */
  @Post('generate/paginated')
  async generatePaginatedReport(
    @Body() query: ReportQueryDto,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '100',
    @CurrentUser('id') userId: string,
  ) {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    return this.reportGenerationService.generatePaginatedReport(
      query,
      pageNum,
      limitNum,
      userId,
    );
  }

  /**
   * Generate category-specific report
   * Requirement: 3.2
   */
  @Post('generate/category')
  async generateCategoryReport(
    @Body()
    body: { categories: string[]; query: Omit<ReportQueryDto, 'categories'> },
    @CurrentUser('id') userId: string,
  ) {
    return this.reportGenerationService.generateCategoryReport(
      body.categories,
      body.query,
      userId,
    );
  }

  /**
   * Generate vendor-specific report
   * Requirement: 3.2
   */
  @Post('generate/vendor')
  async generateVendorReport(
    @Body() body: { vendors: string[]; query: Omit<ReportQueryDto, 'vendors'> },
    @CurrentUser('id') userId: string,
  ) {
    return this.reportGenerationService.generateVendorReport(
      body.vendors,
      body.query,
      userId,
    );
  }

  /**
   * Export report in specified format
   * Requirement: 3.4 - Excel, CSV, and PDF export
   */
  @Post('export')
  async exportReport(
    @Body() query: ExportQueryDto,
    @CurrentUser('id') userId: string,
    @Res() res: Response,
  ) {
    // Generate report data
    const reportData = await this.reportGenerationService.generateReport(
      query,
      userId,
    );

    // Export in requested format
    const exportResult = this.exportService.exportReport(
      reportData,
      query.format,
      query.reportType,
    );

    // Set response headers
    res.setHeader('Content-Type', exportResult.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${exportResult.filename}"`,
    );
    res.setHeader('Content-Length', exportResult.buffer.length);

    // Send file
    res.status(HttpStatus.OK).send(exportResult.buffer);
  } /**

   * Get payment due report
   * Requirements: 3.3, 3.4
   */
  @Get('payments-due')
  async getPaymentDueReport(@CurrentUser('id') userId: string) {
    return this.paymentDueService.getPaymentDueReport(userId);
  }

  /**
   * Get weekly payments due
   * Requirement: 3.3
   */
  @Get('payments-due/weekly')
  async getWeeklyPaymentsDue(@CurrentUser('id') userId: string) {
    return this.paymentDueService.getWeeklyPaymentsDue(userId);
  }

  /**
   * Get monthly payments due
   * Requirement: 3.3
   */
  @Get('payments-due/monthly')
  async getMonthlyPaymentsDue(@CurrentUser('id') userId: string) {
    return this.paymentDueService.getMonthlyPaymentsDue(userId);
  }

  /**
   * Get overdue payments
   */
  @Get('payments-due/overdue')
  async getOverduePayments(@CurrentUser('id') userId: string) {
    return this.paymentDueService.getOverduePayments(userId);
  }

  /**
   * Get payment statistics for a period
   */
  @Get('payments/statistics')
  async getPaymentStatistics(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @CurrentUser('id') userId: string,
  ) {
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    return this.paymentDueService.getPaymentStatistics(
      fromDate,
      toDate,
      userId,
    );
  }
}
