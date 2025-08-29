import type { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { Vendor, VendorStatus } from '../entities/vendor.entity';

export class VendorSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    // Check if vendors already exist to avoid duplicates
    const existingVendors = await em.count(Vendor);
    if (existingVendors > 0) {
      console.log('Vendors already exist, skipping vendor seeding...');
      return;
    }

    const vendors = [
      {
        name: 'Office Supplies Co.',
        contactInfo: 'John Smith - Procurement Manager',
        address: '123 Business Street, City, State 12345',
        taxId: 'TAX123456789',
        email: 'orders@officesupplies.com',
        phone: '+1-555-0123',
      },
      {
        name: 'Tech Solutions Ltd.',
        contactInfo: 'Sarah Johnson - Sales Representative',
        address: '456 Technology Ave, Tech City, TC 67890',
        taxId: 'TAX987654321',
        email: 'sales@techsolutions.com',
        phone: '+1-555-0456',
      },
      {
        name: 'Travel Agency Pro',
        contactInfo: 'Mike Wilson - Corporate Travel',
        address: '789 Travel Blvd, Travel Town, TT 11111',
        taxId: 'TAX555666777',
        email: 'corporate@travelagencypro.com',
        phone: '+1-555-0789',
      },
      {
        name: 'Restaurant & Catering',
        contactInfo: 'Lisa Chen - Event Coordinator',
        address: '321 Food Street, Culinary City, CC 22222',
        taxId: 'TAX111222333',
        email: 'events@restaurantcatering.com',
        phone: '+1-555-0321',
      },
      {
        name: 'Professional Services Inc.',
        contactInfo: 'David Brown - Account Manager',
        address: '654 Professional Plaza, Service City, SC 33333',
        taxId: 'TAX444555666',
        email: 'accounts@professionalservices.com',
        phone: '+1-555-0654',
      },
    ];

    for (const vendorData of vendors) {
      const vendor = em.create(Vendor, {
        ...vendorData,
        status: VendorStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      em.persist(vendor);
    }

    await em.flush();

    console.log('Successfully seeded vendors:');
    vendors.forEach((vendor) => {
      console.log(`- ${vendor.name} (${vendor.email})`);
    });
  }
}
