import { Migration } from '@mikro-orm/migrations';

export class Migration20250927095228 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "import_record" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "created_by_id" uuid null, "updated_by_id" uuid null, "deleted_by_id" uuid null, "file_name" varchar(255) not null, "file_size" int not null, "mime_type" varchar(255) not null, "status" text check ("status" in ('pending', 'processing', 'completed', 'failed')) not null, "progress" int not null default 0, "total_rows" int not null default 0, "processed_rows" int not null default 0, "successful_rows" int not null default 0, "error_rows" int not null default 0, "errors" jsonb null, "completed_at" timestamptz null, "uploaded_by_id" uuid not null, constraint "import_record_pkey" primary key ("id"));`,
    );

    this.addSql(
      `alter table "import_record" add constraint "import_record_created_by_id_foreign" foreign key ("created_by_id") references "user" ("id") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "import_record" add constraint "import_record_updated_by_id_foreign" foreign key ("updated_by_id") references "user" ("id") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "import_record" add constraint "import_record_deleted_by_id_foreign" foreign key ("deleted_by_id") references "user" ("id") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "import_record" add constraint "import_record_uploaded_by_id_foreign" foreign key ("uploaded_by_id") references "user" ("id") on update cascade;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "import_record" cascade;`);
  }
}
