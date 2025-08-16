import {
  Collection,
  Entity,
  Enum,
  OneToMany,
  PrimaryKey,
  Property,
  Filter,
} from '@mikro-orm/core';
import { v4 } from 'uuid';
import { Expense } from './expense.entity';

export enum UserRole {
  ACCOUNTANT = 'ACCOUNTANT',
  USER = 'USER',
}

@Entity()
@Filter({ name: 'softDelete', cond: { deletedAt: null }, default: true })
export class User {
  @PrimaryKey({ type: 'uuid' })
  id: string = v4();

  @Property({ unique: true })
  email!: string;

  @Property()
  password!: string;

  @Property()
  name!: string;

  @Enum(() => UserRole)
  role: UserRole = UserRole.USER;

  @Property({ default: true })
  isActive: boolean = true;

  @Property()
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  @Property({ nullable: true })
  deletedAt?: Date;

  @OneToMany(() => Expense, (expense) => expense.submitter)
  expenses = new Collection<Expense>(this);
}
