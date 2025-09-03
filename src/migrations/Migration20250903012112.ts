import { Migration } from '@mikro-orm/migrations';

export class Migration20250903012112 extends Migration {
  override async up(): Promise<void> {
    // Drop the payment method constraint for easier use
    this.addSql(
      `alter table "expense" drop constraint if exists "expense_payment_method_check";`,
    );

    // Update existing CASH records to PETTY_CASH for consistency
    this.addSql(
      `update "expense" set "payment_method" = 'PETTY_CASH' where "payment_method" = 'CASH';`,
    );
  }

  override async down(): Promise<void> {
    // Restore old payment method values
    this.addSql(
      `update "expense" set "payment_method" = 'CASH' where "payment_method" = 'PETTY_CASH';`,
    );

    // Restore the original constraint
    this.addSql(
      `alter table "expense" add constraint "expense_payment_method_check" check("payment_method" in ('CASH', 'BANK_TRANSFER'));`,
    );
  }
}
