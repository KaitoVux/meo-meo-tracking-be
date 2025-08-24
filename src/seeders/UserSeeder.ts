import type { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../entities/user.entity';

export class UserSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    // Check if users already exist to avoid duplicates
    const existingUsers = await em.count(User);
    if (existingUsers > 0) {
      console.log('Users already exist, skipping user seeding...');
      return;
    }

    const users = [
      {
        email: 'user@example.com',
        password: 'password123',
        name: 'Regular User',
        role: UserRole.USER,
      },
      {
        email: 'accountant@example.com',
        password: 'password123',
        name: 'Accountant User',
        role: UserRole.ACCOUNTANT,
      },
    ];

    for (const userData of users) {
      // Hash the password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      const user = em.create(User, {
        email: userData.email,
        password: hashedPassword,
        name: userData.name,
        role: userData.role,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      em.persist(user);
    }

    await em.flush();

    console.log('Successfully seeded users:');
    console.log('- Regular User (user@example.com) with role USER');
    console.log(
      '- Accountant User (accountant@example.com) with role ACCOUNTANT',
    );
    console.log('Default password for both users: password123');
  }
}
