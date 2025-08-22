import { Migration } from '@mikro-orm/migrations';

export class Migration20250820150439_AddAuditFieldsForeignKeys extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "user" add constraint "user_created_by_id_foreign" foreign key ("created_by_id") references "user" ("id") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "user" add constraint "user_updated_by_id_foreign" foreign key ("updated_by_id") references "user" ("id") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "user" add constraint "user_deleted_by_id_foreign" foreign key ("deleted_by_id") references "user" ("id") on update cascade on delete set null;`,
    );

    this.addSql(
      `alter table "file" add constraint "file_created_by_id_foreign" foreign key ("created_by_id") references "user" ("id") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "file" add constraint "file_updated_by_id_foreign" foreign key ("updated_by_id") references "user" ("id") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "file" add constraint "file_deleted_by_id_foreign" foreign key ("deleted_by_id") references "user" ("id") on update cascade on delete set null;`,
    );

    this.addSql(
      `alter table "category" add constraint "category_created_by_id_foreign" foreign key ("created_by_id") references "user" ("id") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "category" add constraint "category_updated_by_id_foreign" foreign key ("updated_by_id") references "user" ("id") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "category" add constraint "category_deleted_by_id_foreign" foreign key ("deleted_by_id") references "user" ("id") on update cascade on delete set null;`,
    );

    this.addSql(
      `alter table "vendor" add constraint "vendor_created_by_id_foreign" foreign key ("created_by_id") references "user" ("id") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "vendor" add constraint "vendor_updated_by_id_foreign" foreign key ("updated_by_id") references "user" ("id") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "vendor" add constraint "vendor_deleted_by_id_foreign" foreign key ("deleted_by_id") references "user" ("id") on update cascade on delete set null;`,
    );

    this.addSql(
      `alter table "expense" add constraint "expense_created_by_id_foreign" foreign key ("created_by_id") references "user" ("id") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "expense" add constraint "expense_updated_by_id_foreign" foreign key ("updated_by_id") references "user" ("id") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "expense" add constraint "expense_deleted_by_id_foreign" foreign key ("deleted_by_id") references "user" ("id") on update cascade on delete set null;`,
    );

    this.addSql(
      `alter table "notification" add constraint "notification_created_by_id_foreign" foreign key ("created_by_id") references "user" ("id") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "notification" add constraint "notification_updated_by_id_foreign" foreign key ("updated_by_id") references "user" ("id") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "notification" add constraint "notification_deleted_by_id_foreign" foreign key ("deleted_by_id") references "user" ("id") on update cascade on delete set null;`,
    );

    this.addSql(
      `alter table "expense_status_history" add constraint "expense_status_history_created_by_id_foreign" foreign key ("created_by_id") references "user" ("id") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "expense_status_history" add constraint "expense_status_history_updated_by_id_foreign" foreign key ("updated_by_id") references "user" ("id") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "expense_status_history" add constraint "expense_status_history_deleted_by_id_foreign" foreign key ("deleted_by_id") references "user" ("id") on update cascade on delete set null;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table "category" drop constraint "category_created_by_id_foreign";`,
    );
    this.addSql(
      `alter table "category" drop constraint "category_updated_by_id_foreign";`,
    );
    this.addSql(
      `alter table "category" drop constraint "category_deleted_by_id_foreign";`,
    );

    this.addSql(
      `alter table "user" drop constraint "user_created_by_id_foreign";`,
    );
    this.addSql(
      `alter table "user" drop constraint "user_updated_by_id_foreign";`,
    );
    this.addSql(
      `alter table "user" drop constraint "user_deleted_by_id_foreign";`,
    );

    this.addSql(
      `alter table "file" drop constraint "file_created_by_id_foreign";`,
    );
    this.addSql(
      `alter table "file" drop constraint "file_updated_by_id_foreign";`,
    );
    this.addSql(
      `alter table "file" drop constraint "file_deleted_by_id_foreign";`,
    );

    this.addSql(
      `alter table "vendor" drop constraint "vendor_created_by_id_foreign";`,
    );
    this.addSql(
      `alter table "vendor" drop constraint "vendor_updated_by_id_foreign";`,
    );
    this.addSql(
      `alter table "vendor" drop constraint "vendor_deleted_by_id_foreign";`,
    );

    this.addSql(
      `alter table "expense" drop constraint "expense_created_by_id_foreign";`,
    );
    this.addSql(
      `alter table "expense" drop constraint "expense_updated_by_id_foreign";`,
    );
    this.addSql(
      `alter table "expense" drop constraint "expense_deleted_by_id_foreign";`,
    );

    this.addSql(
      `alter table "notification" drop constraint "notification_created_by_id_foreign";`,
    );
    this.addSql(
      `alter table "notification" drop constraint "notification_updated_by_id_foreign";`,
    );
    this.addSql(
      `alter table "notification" drop constraint "notification_deleted_by_id_foreign";`,
    );

    this.addSql(
      `alter table "expense_status_history" drop constraint "expense_status_history_created_by_id_foreign";`,
    );
    this.addSql(
      `alter table "expense_status_history" drop constraint "expense_status_history_updated_by_id_foreign";`,
    );
    this.addSql(
      `alter table "expense_status_history" drop constraint "expense_status_history_deleted_by_id_foreign";`,
    );
  }
}
