# Reports Module

This module provides comprehensive reporting and dashboard functionality for the Business Expense Tracking System.

## Features Implemented

### 1. Dashboard Statistics Service (`DashboardService`)

- **Comprehensive dashboard statistics** with filtering capabilities
- **Monthly, quarterly, and yearly statistics** aggregation
- **Category and vendor breakdowns** with percentage calculations
- **Payment method analysis** and submitter breakdowns
- **Real-time filtering** by month, vendor, category, currency, and date ranges

**Requirements Covered:** 3.1, 3.2, 3.5, 3.6

### 2. Report Generation Service (`ReportGenerationService`)

- **Flexible report generation** with comprehensive filtering
- **Paginated reports** with 100 records per page limit (Requirement 3.7)
- **Category and vendor-specific reports** with grouping capabilities
- **Status-based reports** for workflow tracking
- **Time-based reports** (monthly, quarterly, yearly)
- **Sorting and ordering** by various fields

**Requirements Covered:** 3.2, 3.3, 3.7

### 3. Export Service (`ExportService`)

- **Multi-format export** support: CSV, Excel, PDF
- **Summary and detailed report** export options
- **Proper file headers and MIME types** for downloads
- **Structured data formatting** for each export format

**Requirements Covered:** 3.4

### 4. Payment Due Service (`PaymentDueService`)

- **Weekly and monthly payment tracking** with due date calculations
- **Overdue payment identification** with priority levels
- **Payment statistics** and average payment time calculations
- **Comprehensive payment due reports** with categorization

**Requirements Covered:** 3.3, 3.4

## API Endpoints

### Dashboard Endpoints

- `GET /reports/dashboard` - Get comprehensive dashboard statistics
- `GET /reports/dashboard/monthly` - Get monthly statistics
- `GET /reports/dashboard/quarterly` - Get quarterly statistics
- `GET /reports/dashboard/yearly` - Get yearly statistics

### Report Generation Endpoints

- `POST /reports/generate` - Generate comprehensive expense report
- `POST /reports/generate/paginated` - Generate paginated report (100 records max)
- `POST /reports/generate/category` - Generate category-specific report
- `POST /reports/generate/vendor` - Generate vendor-specific report

### Export Endpoints

- `POST /reports/export` - Export report in specified format (CSV, Excel, PDF)

### Payment Due Endpoints

- `GET /reports/payments-due` - Get comprehensive payment due report
- `GET /reports/payments-due/weekly` - Get weekly payments due
- `GET /reports/payments-due/monthly` - Get monthly payments due
- `GET /reports/payments-due/overdue` - Get overdue payments
- `GET /reports/payments/statistics` - Get payment statistics for a period

## Data Transfer Objects (DTOs)

### DashboardQueryDto

Filtering options for dashboard statistics:

- `month` - Filter by month (YYYY-MM format or month name)
- `vendor` - Filter by vendor name
- `category` - Filter by category
- `dateFrom/dateTo` - Date range filtering
- `currency` - Filter by currency (VND/USD)
- `submitterId` - Filter by submitter
- `includeDeleted` - Include soft-deleted records

### ReportQueryDto

Comprehensive filtering for report generation:

- Date range filtering
- Category and vendor arrays
- Status filtering
- Currency and payment method filtering
- Grouping options (month, category, vendor, status, submitter)
- Sorting options (date, amount, category, vendor, status)

### ExportQueryDto

Export configuration extending ReportQueryDto:

- `format` - Export format (CSV, Excel, PDF)
- `reportType` - Summary or detailed report

## Performance Optimizations

1. **Pagination**: All reports enforce 100 records per page limit (Requirement 3.7)
2. **Efficient Queries**: Uses MikroORM with proper population and filtering
3. **Indexed Fields**: Database queries optimized for frequently filtered fields
4. **Memory Management**: Streaming approach for large exports

## Testing

Comprehensive unit tests cover:

- Dashboard statistics calculation
- Report generation with various filters
- Export functionality for all formats
- Payment due calculations and categorization
- Edge cases and error handling

All tests pass and provide good coverage of the business logic.

## Future Enhancements

### Production-Ready Export Libraries

For production deployment, consider installing proper export libraries:

```bash
# For Excel export
npm install exceljs @types/exceljs

# For PDF export
npm install pdfkit @types/pdfkit
# OR
npm install puppeteer @types/puppeteer
```

### Additional Features

- **Email report delivery** integration
- **Scheduled report generation** with cron jobs
- **Advanced charting** data for frontend visualization
- **Report templates** and customization options
- **Audit trail** for report generation activities

## Dependencies

The module uses:

- `@mikro-orm/core` - Database operations
- `@nestjs/common` - NestJS framework
- `class-validator` - DTO validation
- `class-transformer` - Data transformation

No additional external dependencies are required for the current implementation.
