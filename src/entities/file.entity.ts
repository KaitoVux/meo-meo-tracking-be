import {
  Entity,
  Property,
  ManyToOne,
  OneToMany,
  Collection,
} from '@mikro-orm/core';
import { User } from './user.entity';
import { Expense } from './expense.entity';
import { BaseEntity } from './base.entity';

@Entity()
export class File extends BaseEntity {
  @Property()
  filename!: string;

  @Property()
  originalName!: string;

  @Property()
  mimeType!: string;

  @Property({ type: 'number' })
  size!: number;

  @Property()
  googleDriveId!: string;

  @Property()
  googleDriveUrl!: string;

  @ManyToOne(() => User)
  uploadedBy!: User;

  @OneToMany(() => Expense, (expense) => expense.invoiceFile)
  expenses = new Collection<Expense>(this);
}
