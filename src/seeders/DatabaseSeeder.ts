import type { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { CategorySeeder } from './CategorySeeder';
import { UserSeeder } from './UserSeeder';
import { VendorSeeder } from './VendorSeeder';

export class DatabaseSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    return this.call(em, [UserSeeder, CategorySeeder, VendorSeeder]);
  }
}
