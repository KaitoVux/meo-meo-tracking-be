import {
  Entity,
  PrimaryKey,
  Property,
  ManyToOne,
  OneToMany,
  Collection,
  Enum,
} from '@mikro-orm/core';
import { v4 } from 'uuid';
import { User } from './user.entity';
import { File } from './file.entity';
import { Category } from './category.entity';
import { ExpenseStatusHistory } from './expense-status-history.entity';

export enum Currency {
  VND = 'VND',
  USD = 'USD',
}

export enum PaymentMethod {
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
}

export enum ExpenseStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  PAID = 'PAID',
  CLOSED = 'CLOSED',
}

@Entity()
export class Expense {
  @PrimaryKey({ type: 'uuid' })
  id: string = v4();

  @Property()
  paymentId!: string;

  @Property({ nullable: true })
  subId?: string;

  @Property({ type: 'date' })
  date!: Date;

  @Property()
  vendor!: string;

  @Property()
  category!: string;

  @Property({ type: 'decimal', precision: 15, scale: 2 })
  amount!: number;

  @Enum(() => Currency)
  currency: Currency = Currency.VND;

  @Property({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  exchangeRate?: number;

  @Property({ type: 'text' })
  description!: string;

  @Property({ nullable: true })
  projectCostCenter?: string;

  @Enum(() => PaymentMethod)
  paymentMethod!: PaymentMethod;

  @Enum(() => ExpenseStatus)
  status: ExpenseStatus = ExpenseStatus.DRAFT;

  @Property()
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  // Relations
  @ManyToOne(() => User)
  submitter!: User;

  @ManyToOne(() => File, { nullable: true })
  invoiceFile?: File;

  @ManyToOne(() => Category, { nullable: true })
  categoryEntity?: Category;

  @OneToMany(() => ExpenseStatusHistory, (history) => history.expense)
  statusHistory = new Collection<ExpenseStatusHistory>(this);
}
