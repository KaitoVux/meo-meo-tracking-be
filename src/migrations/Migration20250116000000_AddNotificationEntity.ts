import { Migration } from '@mikro-orm/migrations';

export class Migration20250116000000_AddNotificationEntity extends Migration {
  async up(): Promise<void> {
    this.addSql(
      'create table "notification" ("id" varchar(255) not null, "title" varchar(255) not null, "message" text not null, "type" text check ("type" in (\'missing_fields\', \'invoice_reminder\', \'status_change\', \'validation_error\')) not null, "priority" text check ("priority" in (\'low\', \'medium\', \'high\', \'urgent\')) not null default \'medium\', "status" text check ("status" in (\'unread\', \'read\', \'dismissed\')) not null default \'unread\', "recipient_id" varchar(255) not null, "related_expense_id" varchar(255) null, "metadata" jsonb null, "created_at" timestamptz(0) not null, "updated_at" timestamptz(0) not null, "read_at" timestamptz(0) null, "dismissed_at" timestamptz(0) null, "is_deleted" boolean not null default false, constraint "notification_pkey" primary key ("id"));',
    );
    this.addSql(
      'create index "notification_recipient_id_status_index" on "notification" ("recipient_id", "status");',
    );
    this.addSql(
      'create index "notification_type_created_at_index" on "notification" ("type", "created_at");',
    );

    this.addSql(
      'alter table "notification" add constraint "notification_recipient_id_foreign" foreign key ("recipient_id") references "user" ("id") on update cascade;',
    );
    this.addSql(
      'alter table "notification" add constraint "notification_related_expense_id_foreign" foreign key ("related_expense_id") references "expense" ("id") on update cascade on delete set null;',
    );
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists "notification" cascade;');
  }
}
