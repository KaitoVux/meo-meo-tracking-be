import {
  Entity,
  PrimaryKey,
  Property,
  ManyToOne,
  Filter,
} from '@mikro-orm/core';
import { v4 } from 'uuid';

@Entity({ abstract: true })
@Filter({ name: 'softDelete', cond: { deletedAt: null }, default: true })
export abstract class BaseEntity {
  @PrimaryKey({ type: 'uuid' })
  id: string = v4();

  @Property()
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  @Property({ nullable: true })
  deletedAt?: Date;

  // Audit fields - proper User entity relationships
  @ManyToOne(() => 'User', { nullable: true, fieldName: 'created_by_id' })
  createdBy?: any; // Using 'any' to avoid circular dependency

  @ManyToOne(() => 'User', { nullable: true, fieldName: 'updated_by_id' })
  updatedBy?: any;

  @ManyToOne(() => 'User', { nullable: true, fieldName: 'deleted_by_id' })
  deletedBy?: any;

  // Helper method for soft delete
  softDelete(deletedByUser?: any): void {
    this.deletedAt = new Date();
    if (deletedByUser) {
      this.deletedBy = deletedByUser;
    }
    // Note: When called without a user, the deletedBy will be set by
    // the AuditSubscriber based on the current request context
  }

  // Helper method to check if entity is deleted
  isDeleted(): boolean {
    return this.deletedAt !== null && this.deletedAt !== undefined;
  }

  // Helper method to restore soft deleted entity
  restore(): void {
    this.deletedAt = undefined;
    this.deletedBy = undefined;
  }
}
