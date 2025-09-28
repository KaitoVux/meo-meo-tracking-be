# Expense Import Service

This service handles importing expenses from CSV and Excel files.

## Import File Format

### Required Columns

The import file must contain the following columns in this exact order:

| Column              | Description                | Required | Valid Values                                    |
| ------------------- | -------------------------- | -------- | ----------------------------------------------- |
| Parent ID           | Main expense identifier    | No       | Any string                                      |
| Sub-ID              | Sub-expense identifier     | No       | Any string                                      |
| Vendor              | Vendor name                | Yes      | Must exist in system                            |
| Description         | Expense description        | Yes      | Any text                                        |
| Type (In/Out)       | Expense type               | Yes      | "In" or "Out"                                   |
| Amount (Before VAT) | Amount before VAT          | Yes      | Numeric value                                   |
| VAT Amount          | VAT amount                 | Yes      | Numeric value                                   |
| Amount (After VAT)  | Total amount including VAT | Yes      | Numeric value                                   |
| Currency            | Currency code              | Yes      | "VND" or "USD"                                  |
| Transaction Date    | Date of transaction        | Yes      | Date format (YYYY-MM-DD)                        |
| Category            | Expense category           | Yes      | Must exist in system                            |
| Payment Method      | Payment method used        | Yes      | "BANK_TRANSFER", "PETTY_CASH", or "CREDIT_CARD" |
| Invoice Link        | Link to invoice            | No       | URL                                             |

### Sample CSV Format

```csv
Parent ID,Sub-ID,Vendor,Description,Type (In/Out),Amount (Before VAT),VAT Amount,Amount (After VAT),Currency,Transaction Date,Category,Payment Method,Invoice Link
EXP-001,,ABC Company,Office supplies purchase,Out,100.00,20.00,120.00,USD,2024-01-15,Office Supplies,BANK_TRANSFER,https://example.com/invoice1
EXP-002,SUB-001,XYZ Corp,Software license,Out,500.00,100.00,600.00,USD,2024-01-16,Software,CREDIT_CARD,
```

### Payment Methods

The following payment methods are supported:

- **BANK_TRANSFER**: Bank transfer payments
- **PETTY_CASH**: Petty cash payments
- **CREDIT_CARD**: Credit card payments

### Validation Rules

1. **Vendor**: Must exist in the system's vendor database
2. **Category**: Must exist in the system's category database
3. **Amount fields**: Must be valid numeric values
4. **Date**: Must be a valid date format
5. **Payment Method**: Must be one of the supported values (case-insensitive)
6. **Type**: Must be either "In" or "Out"
7. **Currency**: Must be "VND" or "USD"

### Error Handling

The import process validates all data before processing. If validation errors are found:

- The preview will show all validation errors with row numbers
- No data will be imported until all errors are resolved
- Common errors include missing required fields, invalid formats, and non-existent vendors/categories

### Usage

1. **Preview**: Upload file to get validation results and preview data
2. **Import**: After resolving any validation errors, proceed with the import
3. **Status**: Check import status and history

### Template

A sample template file is available at: `backend/src/import/templates/expense-import-template.csv`
