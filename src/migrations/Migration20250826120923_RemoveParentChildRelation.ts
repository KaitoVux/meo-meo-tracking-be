import { Migration } from '@mikro-orm/migrations';

export class Migration20250826120923_RemoveParentChildRelation extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "category" drop constraint "category_parent_id_foreign";`,
    );

    this.addSql(`alter table "category" drop column "parent_id";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "category" add column "parent_id" uuid null;`);
    this.addSql(
      `alter table "category" add constraint "category_parent_id_foreign" foreign key ("parent_id") references "category" ("id") on update cascade on delete set null;`,
    );
  }
}
