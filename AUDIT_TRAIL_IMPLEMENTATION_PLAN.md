# Audit Trail System Implementation Plan

## Overview
Implement a comprehensive audit trail system using a BaseEntity that all entities will extend from. This will provide consistent audit metadata across all database tables.

## Current State Analysis

### Entities to Update (7 total):
1. **User** - Has basic timestamps + deletedAt
2. **Expense** - Has basic timestamps + deletedAt  
3. **Vendor** - Has basic timestamps + deletedAt
4. **Category** - Has basic timestamps + deletedAt
5. **File** - Has basic timestamps + deletedAt
6. **Notification** - Has basic timestamps + deletedAt
7. **ExpenseStatusHistory** - Has basic timestamps + deletedAt

### Current Audit Fields:
- ✅ `id` (UUID)
- ✅ `createdAt` (Date)
- ✅ `updatedAt` (Date) 
- ✅ `deletedAt` (Date, nullable)
- ❌ `createdBy` (User reference) - **MISSING**
- ❌ `updatedBy` (User reference) - **MISSING**
- ❌ `deletedBy` (User reference) - **MISSING**

## Implementation Steps

### Phase 1: BaseEntity Creation ✅
- [x] Create `BaseEntity` with all audit fields
- [x] Include soft delete filter and helper methods
- [x] Add audit field relationships to User entity

### Phase 2: Entity Migration
- [x] Update all 7 entities to extend BaseEntity
- [x] Remove duplicate fields (id, timestamps, deletedAt)
- [x] Ensure all relationships are preserved

### Phase 3: Database Migration
- [x] Create migration to add audit columns to all tables:
  ```sql
  ALTER TABLE "user" ADD COLUMN "created_by_id" uuid REFERENCES "user"("id");
  ALTER TABLE "user" ADD COLUMN "updated_by_id" uuid REFERENCES "user"("id");
  ALTER TABLE "user" ADD COLUMN "deleted_by_id" uuid REFERENCES "user"("id");
  -- Repeat for all tables
  ```

### Phase 4: Service Layer Updates
- [ ] Update all services to populate audit fields
- [ ] Modify create operations to set `createdBy`
- [ ] Modify update operations to set `updatedBy`
- [ ] Modify delete operations to set `deletedBy`

### Phase 5: Audit Interceptor
- [ ] Create `AuditInterceptor` to automatically capture current user
- [ ] Apply interceptor globally or per controller
- [ ] Handle cases where no user context exists (system operations)

### Phase 6: Testing
- [ ] Update all existing unit tests
- [ ] Add audit-specific test cases
- [ ] Test soft delete functionality with audit trail

## Affected Services

### Services to Update:
1. **UserService** - User CRUD operations
2. **ExpenseService** - Expense CRUD operations
3. **VendorService** - Vendor CRUD operations
4. **CategoryService** - Category CRUD operations
5. **FileService** - File CRUD operations
6. **NotificationService** - Notification CRUD operations

### Example Service Update Pattern:
```typescript
// Before
async create(dto: CreateDto): Promise<Entity> {
  const entity = this.em.create(Entity, dto);
  await this.em.persistAndFlush(entity);
  return entity;
}

// After
async create(dto: CreateDto, currentUser: User): Promise<Entity> {
  const entity = this.em.create(Entity, {
    ...dto,
    createdBy: currentUser,
    updatedBy: currentUser,
  });
  await this.em.persistAndFlush(entity);
  return entity;
}
```

## Database Schema Changes

### New Columns for Each Table:
```sql
-- Add to all entity tables
created_by_id uuid REFERENCES "user"("id"),
updated_by_id uuid REFERENCES "user"("id"), 
deleted_by_id uuid REFERENCES "user"("id")
```

### Tables to Modify:
- `user` (self-referencing for audit)
- `expense`
- `vendor`
- `category`
- `file`
- `notification`
- `expense_status_history`

## Benefits

### Data Governance:
- ✅ Complete audit trail for all data changes
- ✅ User accountability for all operations
- ✅ Compliance with audit requirements

### Debugging & Support:
- ✅ Track who created/modified/deleted records
- ✅ Investigate data issues more effectively
- ✅ User activity monitoring

### Security:
- ✅ Detect unauthorized changes
- ✅ User behavior analysis
- ✅ Compliance reporting

## Risk Mitigation

### Potential Issues:
1. **Circular Dependencies** - User entity referencing itself
2. **Migration Complexity** - Large schema changes
3. **Performance Impact** - Additional joins for audit data
4. **Backward Compatibility** - Existing code expecting old structure

### Mitigation Strategies:
1. **Careful Entity Design** - Use nullable audit fields initially
2. **Phased Migration** - Apply changes incrementally
3. **Selective Loading** - Only load audit data when needed
4. **Comprehensive Testing** - Ensure all functionality works

## Timeline Estimate

- **Phase 1**: ✅ Complete (BaseEntity created)
- **Phase 2**: 2-3 hours (Entity updates)
- **Phase 3**: 2-3 hours (Database migration)
- **Phase 4**: 4-5 hours (Service updates)
- **Phase 5**: 2-3 hours (Audit interceptor)
- **Phase 6**: 3-4 hours (Testing)

**Total Estimated Time: 13-18 hours**

## Next Steps

1. **Start Phase 2** - Update entities to extend BaseEntity
2. **Create migration** for audit columns
3. **Update services** to handle audit fields
4. **Implement interceptor** for automatic audit capture
5. **Test thoroughly** to ensure no regressions