import type { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { Category } from '../entities/category.entity';

export class CategorySeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    // Main categories
    const categories = [
      {
        name: 'Travel & Transportation',
        code: 'TRAVEL',
        description: 'Business travel, flights, hotels, transportation',
      },
      {
        name: 'Meals & Entertainment',
        code: 'MEALS',
        description: 'Business meals, client entertainment, team events',
      },
      {
        name: 'Office Supplies',
        code: 'OFFICE_SUPPLIES',
        description: 'Stationery, equipment, office materials',
      },
      {
        name: 'Technology',
        code: 'TECHNOLOGY',
        description: 'Software, hardware, IT equipment',
      },
      {
        name: 'Marketing & Advertising',
        code: 'MARKETING',
        description: 'Promotional materials, advertising, marketing campaigns',
      },
      {
        name: 'Professional Services',
        code: 'PROFESSIONAL',
        description: 'Legal, consulting, accounting services',
      },
      {
        name: 'Training & Development',
        code: 'TRAINING',
        description: 'Employee training, courses, conferences',
      },
      {
        name: 'Utilities',
        code: 'UTILITIES',
        description: 'Internet, phone, electricity, water',
      },
      {
        name: 'Miscellaneous',
        code: 'MISC',
        description: 'Other business expenses',
      },
    ];

    for (const categoryData of categories) {
      const category = em.create(Category, {
        ...categoryData,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      em.persist(category);
    }

    await em.flush();

    // Sub-categories for Travel
    const travelCategory = await em.findOne(Category, { code: 'TRAVEL' });
    if (travelCategory) {
      const travelSubCategories = [
        {
          name: 'Flights',
          code: 'TRAVEL_FLIGHTS',
          description: 'Airline tickets and flight-related expenses',
          parent: travelCategory,
        },
        {
          name: 'Hotels',
          code: 'TRAVEL_HOTELS',
          description: 'Hotel accommodation expenses',
          parent: travelCategory,
        },
        {
          name: 'Ground Transportation',
          code: 'TRAVEL_GROUND',
          description: 'Taxi, uber, rental cars, public transport',
          parent: travelCategory,
        },
      ];

      for (const subCategoryData of travelSubCategories) {
        const subCategory = em.create(Category, {
          ...subCategoryData,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        em.persist(subCategory);
      }
    }

    // Sub-categories for Technology
    const techCategory = await em.findOne(Category, { code: 'TECHNOLOGY' });
    if (techCategory) {
      const techSubCategories = [
        {
          name: 'Software Licenses',
          code: 'TECH_SOFTWARE',
          description: 'Software subscriptions and licenses',
          parent: techCategory,
        },
        {
          name: 'Hardware',
          code: 'TECH_HARDWARE',
          description: 'Computer equipment, peripherals',
          parent: techCategory,
        },
      ];

      for (const subCategoryData of techSubCategories) {
        const subCategory = em.create(Category, {
          ...subCategoryData,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        em.persist(subCategory);
      }
    }

    await em.flush();
  }
}
