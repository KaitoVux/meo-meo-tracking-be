import { Migration } from '@mikro-orm/migrations';

export class Migration20250905061351_AddInvoiceLinkToExpense extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "expense" add column "invoice_link" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "expense" drop column "invoice_link";`);
  }
}
