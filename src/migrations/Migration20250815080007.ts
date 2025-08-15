import { Migration } from '@mikro-orm/migrations';

export class Migration20250815080007 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "category" ("id" uuid not null, "name" varchar(255) not null, "code" varchar(255) not null, "description" varchar(255) null, "is_active" boolean not null default true, "created_at" timestamptz not null, "updated_at" timestamptz not null, "parent_id" uuid null, constraint "category_pkey" primary key ("id"));`,
    );
    this.addSql(
      `alter table "category" add constraint "category_code_unique" unique ("code");`,
    );

    this.addSql(
      `create table "user" ("id" uuid not null, "email" varchar(255) not null, "name" varchar(255) not null, "role" text check ("role" in ('ACCOUNTANT', 'USER')) not null default 'USER', "is_active" boolean not null default true, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "user_pkey" primary key ("id"));`,
    );
    this.addSql(
      `alter table "user" add constraint "user_email_unique" unique ("email");`,
    );

    this.addSql(
      `create table "file" ("id" uuid not null, "filename" varchar(255) not null, "original_name" varchar(255) not null, "mime_type" varchar(255) not null, "size" bigint not null, "google_drive_id" varchar(255) not null, "google_drive_url" varchar(255) not null, "created_at" timestamptz not null, "uploaded_by_id" uuid not null, constraint "file_pkey" primary key ("id"));`,
    );

    this.addSql(
      `create table "expense" ("id" uuid not null, "payment_id" varchar(255) not null, "sub_id" varchar(255) null, "date" date not null, "vendor" varchar(255) not null, "category" varchar(255) not null, "amount" numeric(15,2) not null, "currency" text check ("currency" in ('VND', 'USD')) not null default 'VND', "exchange_rate" numeric(10,4) null, "description" text not null, "project_cost_center" varchar(255) null, "payment_method" text check ("payment_method" in ('CASH', 'BANK_TRANSFER')) not null, "status" text check ("status" in ('DRAFT', 'SUBMITTED', 'APPROVED', 'PAID', 'CLOSED')) not null default 'DRAFT', "created_at" timestamptz not null, "updated_at" timestamptz not null, "submitter_id" uuid not null, "invoice_file_id" uuid null, "category_entity_id" uuid null, constraint "expense_pkey" primary key ("id"));`,
    );

    this.addSql(
      `create table "expense_status_history" ("id" uuid not null, "from_status" text check ("from_status" in ('DRAFT', 'SUBMITTED', 'APPROVED', 'PAID', 'CLOSED')) not null, "to_status" text check ("to_status" in ('DRAFT', 'SUBMITTED', 'APPROVED', 'PAID', 'CLOSED')) not null, "notes" text null, "created_at" timestamptz not null, "expense_id" uuid not null, "changed_by_id" uuid not null, constraint "expense_status_history_pkey" primary key ("id"));`,
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
      `alter table "expense" add constraint "expense_invoice_file_id_foreign" foreign key ("invoice_file_id") references "file" ("id") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "expense" add constraint "expense_category_entity_id_foreign" foreign key ("category_entity_id") references "category" ("id") on update cascade on delete set null;`,
    );

    this.addSql(
      `alter table "expense_status_history" add constraint "expense_status_history_expense_id_foreign" foreign key ("expense_id") references "expense" ("id") on update cascade;`,
    );
    this.addSql(
      `alter table "expense_status_history" add constraint "expense_status_history_changed_by_id_foreign" foreign key ("changed_by_id") references "user" ("id") on update cascade;`,
    );
  }
}
