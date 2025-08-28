import { Category } from './category.entity';

describe('Category Entity', () => {
  let category: Category;

  beforeEach(() => {
    category = new Category();
  });

  it('should create a category with default values', () => {
    category.name = 'Travel';
    category.code = 'TRAVEL';
    category.description = 'Travel expenses';

    expect(category.id).toBeDefined();
    expect(category.name).toBe('Travel');
    expect(category.code).toBe('TRAVEL');
    expect(category.description).toBe('Travel expenses');
    expect(category.isActive).toBe(true);
    expect(category.createdAt).toBeInstanceOf(Date);
    expect(category.updatedAt).toBeInstanceOf(Date);
  });

  it('should have expenses collection initialized', () => {
    expect(category.expenses).toBeDefined();
    expect(category.expenses.length).toBe(0);
  });

  it('should allow deactivating category', () => {
    category.isActive = false;
    expect(category.isActive).toBe(false);
  });
});
