import {
  Entity,
  Property,
  ManyToOne,
  OneToMany,
  Collection,
  Enum,
} from '@mikro-orm/core';
import { User } from './user.entity';
import { File } from './file.entity';
import { Category } from './category.entity';
import { Vendor } from './vendor.entity';
import { ExpenseStatusHistory } from './expense-status-history.entity';
import { BaseEntity } from './base.entity';

export enum Currency {
  VND = 'VND',
  USD = 'USD',
}

export enum PaymentMethod {
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
}

export enum ExpenseType {
  IN = 'IN',
  OUT = 'OUT',
}

export enum ExpenseStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  PAID = 'PAID',
  CLOSED = 'CLOSED',
}

@Entity()
export class Expense extends BaseEntity {
  @Property()
  paymentId!: string;

  @Property({ nullable: true })
  subId?: string;

  @Property({ type: 'date', fieldName: 'transaction_date' })
  transactionDate!: Date;

  @Property({ fieldName: 'expense_month' })
  expenseMonth!: string; // Format: "September" or "YYYY-MM"

  @Property()
  category!: string;

  @Enum(() => ExpenseType)
  type: ExpenseType = ExpenseType.OUT;

  @Property({
    type: 'decimal',
    precision: 15,
    scale: 2,
    fieldName: 'amount_before_vat',
  })
  amountBeforeVAT!: number;

  @Property({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    fieldName: 'vat_percentage',
  })
  vatPercentage?: number;

  @Property({
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
    fieldName: 'vat_amount',
  })
  vatAmount?: number;

  @Property({ type: 'decimal', precision: 15, scale: 2 })
  amount!: number; // This becomes "Amount (After VAT)"

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

  // Relations
  @ManyToOne(() => User)
  submitter!: User;

  @ManyToOne(() => Vendor)
  vendor!: Vendor;

  @ManyToOne(() => File, { nullable: true })
  invoiceFile?: File;

  @ManyToOne(() => Category, { nullable: true })
  categoryEntity?: Category;

  @OneToMany(() => ExpenseStatusHistory, (history) => history.expense)
  statusHistory = new Collection<ExpenseStatusHistory>(this);
}
