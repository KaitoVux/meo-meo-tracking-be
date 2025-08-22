import { Collection, Entity, Enum, OneToMany, Property } from '@mikro-orm/core';
import { Expense } from './expense.entity';
import { BaseEntity } from './base.entity';

export enum UserRole {
  ACCOUNTANT = 'ACCOUNTANT',
  USER = 'USER',
}

@Entity()
export class User extends BaseEntity {
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

  @OneToMany(() => Expense, (expense) => expense.submitter)
  expenses = new Collection<Expense>(this);
}
