import { Migration } from '@mikro-orm/migrations';

export class Migration20250822084635_RemoveDateColumn extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "expense" drop column "date";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "expense" add column "date" date not null;`);
  }
}
