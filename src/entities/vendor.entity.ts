import { Entity, Property, OneToMany, Collection, Enum } from '@mikro-orm/core';
import { Expense } from './expense.entity';
import { BaseEntity } from './base.entity';

export enum VendorStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@Entity()
export class Vendor extends BaseEntity {
  @Property()
  name!: string;

  @Property({ nullable: true })
  contactInfo?: string;

  @Property({ type: 'text', nullable: true })
  address?: string;

  @Property({ nullable: true })
  taxId?: string;

  @Property({ nullable: true })
  email?: string;

  @Property({ nullable: true })
  phone?: string;

  @Enum(() => VendorStatus)
  status: VendorStatus = VendorStatus.ACTIVE;

  // Relations
  @OneToMany(() => Expense, (expense) => expense.vendor)
  expenses = new Collection<Expense>(this);
}
