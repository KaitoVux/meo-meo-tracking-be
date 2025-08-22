import { Entity, Property, ManyToOne, Enum } from '@mikro-orm/core';
import { Expense, ExpenseStatus } from './expense.entity';
import { User } from './user.entity';
import { BaseEntity } from './base.entity';

@Entity()
export class ExpenseStatusHistory extends BaseEntity {
  @Enum(() => ExpenseStatus)
  fromStatus!: ExpenseStatus;

  @Enum(() => ExpenseStatus)
  toStatus!: ExpenseStatus;

  @Property({ nullable: true, type: 'text' })
  notes?: string;

  @ManyToOne(() => Expense)
  expense!: Expense;

  @ManyToOne(() => User)
  changedBy!: User;
}
