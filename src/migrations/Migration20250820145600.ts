import { Migration } from '@mikro-orm/migrations';

export class Migration20250820145600 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "category" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "created_by_id" uuid null, "updated_by_id" uuid null, "deleted_by_id" uuid null, "name" varchar(255) not null, "code" varchar(255) not null, "description" varchar(255) null, "is_active" boolean not null default true, "parent_id" uuid null, constraint "category_pkey" primary key ("id"));`,
    );
    this.addSql(
      `alter table "category" add constraint "category_code_unique" unique ("code");`,
    );

    this.addSql(
      `create table "user" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "created_by_id" uuid null, "updated_by_id" uuid null, "deleted_by_id" uuid null, "email" varchar(255) not null, "password" varchar(255) not null, "name" varchar(255) not null, "role" text check ("role" in ('ACCOUNTANT', 'USER')) not null default 'USER', "is_active" boolean not null default true, constraint "user_pkey" primary key ("id"));`,
    );
    this.addSql(
      `alter table "user" add constraint "user_email_unique" unique ("email");`,
    );

    this.addSql(
      `create table "file" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "created_by_id" uuid null, "updated_by_id" uuid null, "deleted_by_id" uuid null, "filename" varchar(255) not null, "original_name" varchar(255) not null, "mime_type" varchar(255) not null, "size" int not null, "google_drive_id" varchar(255) not null, "google_drive_url" varchar(255) not null, "uploaded_by_id" uuid not null, constraint "file_pkey" primary key ("id"));`,
    );

    this.addSql(
      `create table "vendor" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "created_by_id" uuid null, "updated_by_id" uuid null, "deleted_by_id" uuid null, "name" varchar(255) not null, "contact_info" varchar(255) null, "address" text null, "tax_id" varchar(255) null, "email" varchar(255) null, "phone" varchar(255) null, "status" text check ("status" in ('ACTIVE', 'INACTIVE')) not null default 'ACTIVE', constraint "vendor_pkey" primary key ("id"));`,
    );

    this.addSql(
      `create table "expense" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "created_by_id" uuid null, "updated_by_id" uuid null, "deleted_by_id" uuid null, "payment_id" varchar(255) not null, "sub_id" varchar(255) null, "date" date not null, "transaction_date" date not null, "expense_month" varchar(255) not null, "category" varchar(255) not null, "type" text check ("type" in ('IN', 'OUT')) not null default 'OUT', "amount_before_vat" numeric(15,2) not null, "vat_percentage" numeric(5,2) null, "vat_amount" numeric(15,2) null, "amount" numeric(15,2) not null, "currency" text check ("currency" in ('VND', 'USD')) not null default 'VND', "exchange_rate" numeric(10,4) null, "description" text not null, "project_cost_center" varchar(255) null, "payment_method" text check ("payment_method" in ('CASH', 'BANK_TRANSFER')) not null, "status" text check ("status" in ('DRAFT', 'SUBMITTED', 'APPROVED', 'PAID', 'CLOSED')) not null default 'DRAFT', "submitter_id" uuid not null, "vendor_id" uuid not null, "invoice_file_id" uuid null, "category_entity_id" uuid null, constraint "expense_pkey" primary key ("id"));`,
    );

    this.addSql(
      `create table "notification" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "created_by_id" uuid null, "updated_by_id" uuid null, "deleted_by_id" uuid null, "title" varchar(255) not null, "message" text not null, "type" text check ("type" in ('missing_fields', 'invoice_reminder', 'status_change', 'validation_error')) not null, "priority" text check ("priority" in ('low', 'medium', 'high', 'urgent')) not null default 'medium', "status" text check ("status" in ('unread', 'read', 'dismissed')) not null default 'unread', "recipient_id" uuid not null, "related_expense_id" uuid null, "metadata" jsonb null, "read_at" timestamptz null, "dismissed_at" timestamptz null, constraint "notification_pkey" primary key ("id"));`,
    );
    this.addSql(
      `create index "notification_type_created_at_index" on "notification" ("type", "created_at");`,
    );
    this.addSql(
      `create index "notification_recipient_id_status_index" on "notification" ("recipient_id", "status");`,
    );

    this.addSql(
      `create table "expense_status_history" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "created_by_id" uuid null, "updated_by_id" uuid null, "deleted_by_id" uuid null, "from_status" text check ("from_status" in ('DRAFT', 'SUBMITTED', 'APPROVED', 'PAID', 'CLOSED')) not null, "to_status" text check ("to_status" in ('DRAFT', 'SUBMITTED', 'APPROVED', 'PAID', 'CLOSED')) not null, "notes" text null, "expense_id" uuid not null, "changed_by_id" uuid not null, constraint "expense_status_history_pkey" primary key ("id"));`,
    );

    this.addSql(
      `alter table "category" add constraint "category_parent_id_foreign" foreign key ("parent_id") references "category" ("id") on update cascade on delete set null;`,
    );

    this.addSql(
      `alter table "file" add constraint "file_uploaded_by_id_foreign" foreign key ("uploaded_by_id") references "user" ("id") on update cascade;`,
    );

    this.addSql(
      `alter table "expense" add constraint "expense_submitter_id_foreign" foreign key ("submitter_id") references "user" ("id") on update cascade;`,
    );
    this.addSql(
      `alter table "expense" add constraint "expense_vendor_id_foreign" foreign key ("vendor_id") references "vendor" ("id") on update cascade;`,
    );
    this.addSql(
      `alter table "expense" add constraint "expense_invoice_file_id_foreign" foreign key ("invoice_file_id") references "file" ("id") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "expense" add constraint "expense_category_entity_id_foreign" foreign key ("category_entity_id") references "category" ("id") on update cascade on delete set null;`,
    );

    this.addSql(
      `alter table "notification" add constraint "notification_recipient_id_foreign" foreign key ("recipient_id") references "user" ("id") on update cascade;`,
    );
    this.addSql(
      `alter table "notification" add constraint "notification_related_expense_id_foreign" foreign key ("related_expense_id") references "expense" ("id") on update cascade on delete set null;`,
    );

    this.addSql(
      `alter table "expense_status_history" add constraint "expense_status_history_expense_id_foreign" foreign key ("expense_id") references "expense" ("id") on update cascade;`,
    );
    this.addSql(
      `alter table "expense_status_history" add constraint "expense_status_history_changed_by_id_foreign" foreign key ("changed_by_id") references "user" ("id") on update cascade;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table "category" drop constraint "category_parent_id_foreign";`,
    );

    this.addSql(
      `alter table "expense" drop constraint "expense_category_entity_id_foreign";`,
    );

    this.addSql(
      `alter table "file" drop constraint "file_uploaded_by_id_foreign";`,
    );

    this.addSql(
      `alter table "expense" drop constraint "expense_submitter_id_foreign";`,
    );

    this.addSql(
      `alter table "notification" drop constraint "notification_recipient_id_foreign";`,
    );

    this.addSql(
      `alter table "expense_status_history" drop constraint "expense_status_history_changed_by_id_foreign";`,
    );

    this.addSql(
      `alter table "expense" drop constraint "expense_invoice_file_id_foreign";`,
    );

    this.addSql(
      `alter table "expense" drop constraint "expense_vendor_id_foreign";`,
    );

    this.addSql(
      `alter table "notification" drop constraint "notification_related_expense_id_foreign";`,
    );

    this.addSql(
      `alter table "expense_status_history" drop constraint "expense_status_history_expense_id_foreign";`,
    );

    this.addSql(`drop table if exists "category" cascade;`);

    this.addSql(`drop table if exists "user" cascade;`);

    this.addSql(`drop table if exists "file" cascade;`);

    this.addSql(`drop table if exists "vendor" cascade;`);

    this.addSql(`drop table if exists "expense" cascade;`);

    this.addSql(`drop table if exists "notification" cascade;`);

    this.addSql(`drop table if exists "expense_status_history" cascade;`);
  }
}
