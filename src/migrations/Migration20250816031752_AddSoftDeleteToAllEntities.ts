import { Migration } from '@mikro-orm/migrations';

export class Migration20250816031752_AddSoftDeleteToAllEntities extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "category" add column "deleted_at" timestamptz null;`,
    );

    this.addSql(`alter table "user" add column "deleted_at" timestamptz null;`);

    this.addSql(`alter table "file" add column "deleted_at" timestamptz null;`);

    this.addSql(
      `alter table "expense" add column "deleted_at" timestamptz null;`,
    );

    this.addSql(
      `alter table "expense_status_history" add column "deleted_at" timestamptz null;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "category" drop column "deleted_at";`);

    this.addSql(`alter table "user" drop column "deleted_at";`);

    this.addSql(`alter table "file" drop column "deleted_at";`);

    this.addSql(`alter table "expense" drop column "deleted_at";`);

    this.addSql(
      `alter table "expense_status_history" drop column "deleted_at";`,
    );
  }
}
