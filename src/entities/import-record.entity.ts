import { Entity, Property, ManyToOne, Enum } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { ImportStatus } from '../import/dto';

@Entity()
export class ImportRecord extends BaseEntity {
  @Property()
  fileName!: string;

  @Property()
  fileSize!: number;

  @Property()
  mimeType!: string;

  @Enum(() => ImportStatus)
  status!: ImportStatus;

  @Property()
  progress: number = 0;

  @Property()
  totalRows: number = 0;

  @Property()
  processedRows: number = 0;

  @Property()
  successfulRows: number = 0;

  @Property()
  errorRows: number = 0;

  @Property({ type: 'json', nullable: true })
  errors?: Array<{
    row: number;
    field: string;
    message: string;
    value?: string;
  }>;

  @Property({ nullable: true })
  completedAt?: Date;

  @ManyToOne(() => User)
  uploadedBy!: User;
}
