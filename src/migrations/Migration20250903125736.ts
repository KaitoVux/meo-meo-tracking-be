import { Migration } from '@mikro-orm/migrations';

export class Migration20250903125736 extends Migration {
  override async up(): Promise<void> {
    // First, drop the existing constraints
    this.addSql(
      `alter table "expense" drop constraint if exists "expense_status_check";`,
    );
    this.addSql(
      `alter table "expense_status_history" drop constraint if exists "expense_status_history_from_status_check";`,
    );
    this.addSql(
      `alter table "expense_status_history" drop constraint if exists "expense_status_history_to_status_check";`,
    );

    // Then update existing expense statuses to new system
    this.addSql(
      `update "expense" set "status" = 'IN_PROGRESS' where "status" in ('SUBMITTED', 'APPROVED');`,
    );
    this.addSql(
      `update "expense" set "status" = 'PAID' where "status" = 'CLOSED';`,
    );

    // Update existing status history records
    this.addSql(
      `update "expense_status_history" set "from_status" = 'IN_PROGRESS' where "from_status" in ('SUBMITTED', 'APPROVED');`,
    );
    this.addSql(
      `update "expense_status_history" set "to_status" = 'IN_PROGRESS' where "to_status" in ('SUBMITTED', 'APPROVED');`,
    );
    this.addSql(
      `update "expense_status_history" set "from_status" = 'PAID' where "from_status" = 'CLOSED';`,
    );
    this.addSql(
      `update "expense_status_history" set "to_status" = 'PAID' where "to_status" = 'CLOSED';`,
    );

    // Finally, add new constraints with updated status values
    this.addSql(
      `alter table "expense" add constraint "expense_status_check" check("status" in ('DRAFT', 'IN_PROGRESS', 'PAID', 'ON_HOLD'));`,
    );
    this.addSql(
      `alter table "expense_status_history" add constraint "expense_status_history_from_status_check" check("from_status" in ('DRAFT', 'IN_PROGRESS', 'PAID', 'ON_HOLD'));`,
    );
    this.addSql(
      `alter table "expense_status_history" add constraint "expense_status_history_to_status_check" check("to_status" in ('DRAFT', 'IN_PROGRESS', 'PAID', 'ON_HOLD'));`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table "expense" drop constraint if exists "expense_status_check";`,
    );

    this.addSql(
      `alter table "expense_status_history" drop constraint if exists "expense_status_history_from_status_check";`,
    );
    this.addSql(
      `alter table "expense_status_history" drop constraint if exists "expense_status_history_to_status_check";`,
    );

    this.addSql(
      `alter table "expense" add constraint "expense_status_check" check("status" in ('DRAFT', 'SUBMITTED', 'APPROVED', 'PAID', 'CLOSED'));`,
    );

    this.addSql(
      `alter table "expense_status_history" add constraint "expense_status_history_from_status_check" check("from_status" in ('DRAFT', 'SUBMITTED', 'APPROVED', 'PAID', 'CLOSED'));`,
    );
    this.addSql(
      `alter table "expense_status_history" add constraint "expense_status_history_to_status_check" check("to_status" in ('DRAFT', 'SUBMITTED', 'APPROVED', 'PAID', 'CLOSED'));`,
    );
  }
}
