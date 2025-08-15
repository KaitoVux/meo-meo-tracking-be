import { Entity, PrimaryKey, Property, ManyToOne, Enum } from '@mikro-orm/core';
import { v4 } from 'uuid';
import { Expense, ExpenseStatus } from './expense.entity';
import { User } from './user.entity';

@Entity()
export class ExpenseStatusHistory {
  @PrimaryKey({ type: 'uuid' })
  id: string = v4();

  @Enum(() => ExpenseStatus)
  fromStatus!: ExpenseStatus;

  @Enum(() => ExpenseStatus)
  toStatus!: ExpenseStatus;

  @Property({ nullable: true, type: 'text' })
  notes?: string;

  @Property()
  createdAt: Date = new Date();

  @ManyToOne(() => Expense)
  expense!: Expense;

  @ManyToOne(() => User)
  changedBy!: User;
}
