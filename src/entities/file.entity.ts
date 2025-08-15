import {
  Entity,
  PrimaryKey,
  Property,
  ManyToOne,
  OneToMany,
  Collection,
} from '@mikro-orm/core';
import { v4 } from 'uuid';
import { User } from './user.entity';
import { Expense } from './expense.entity';

@Entity()
export class File {
  @PrimaryKey({ type: 'uuid' })
  id: string = v4();

  @Property()
  filename!: string;

  @Property()
  originalName!: string;

  @Property()
  mimeType!: string;

  @Property({ type: 'bigint' })
  size!: number;

  @Property()
  googleDriveId!: string;

  @Property()
  googleDriveUrl!: string;

  @Property()
  createdAt: Date = new Date();

  @ManyToOne(() => User)
  uploadedBy!: User;

  @OneToMany(() => Expense, (expense) => expense.invoiceFile)
  expenses = new Collection<Expense>(this);
}
