import {
  Entity,
  Property,
  ManyToOne,
  OneToMany,
  Collection,
} from '@mikro-orm/core';
import { Expense } from './expense.entity';
import { BaseEntity } from './base.entity';

@Entity()
export class Category extends BaseEntity {
  @Property()
  name!: string;

  @Property({ unique: true })
  code!: string;

  @Property({ nullable: true })
  description?: string;

  @Property({ default: true })
  isActive: boolean = true;

  @ManyToOne(() => Category, { nullable: true })
  parent?: Category;

  @OneToMany(() => Category, (category) => category.parent)
  children = new Collection<Category>(this);

  @OneToMany(() => Expense, (expense) => expense.categoryEntity)
  expenses = new Collection<Expense>(this);
}
