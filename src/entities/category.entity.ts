import {
  Entity,
  PrimaryKey,
  Property,
  ManyToOne,
  OneToMany,
  Collection,
  Filter,
} from '@mikro-orm/core';
import { v4 } from 'uuid';
import { Expense } from './expense.entity';

@Entity()
@Filter({ name: 'softDelete', cond: { deletedAt: null }, default: true })
export class Category {
  @PrimaryKey({ type: 'uuid' })
  id: string = v4();

  @Property()
  name!: string;

  @Property({ unique: true })
  code!: string;

  @Property({ nullable: true })
  description?: string;

  @Property({ default: true })
  isActive: boolean = true;

  @Property()
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  @Property({ nullable: true })
  deletedAt?: Date;

  @ManyToOne(() => Category, { nullable: true })
  parent?: Category;

  @OneToMany(() => Category, (category) => category.parent)
  children = new Collection<Category>(this);

  @OneToMany(() => Expense, (expense) => expense.categoryEntity)
  expenses = new Collection<Expense>(this);
}
