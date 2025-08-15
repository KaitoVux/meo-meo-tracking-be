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

  it('should allow setting parent category', () => {
    const parentCategory = new Category();
    parentCategory.name = 'Parent';
    parentCategory.code = 'PARENT';

    category.parent = parentCategory;
    expect(category.parent).toBe(parentCategory);
  });

  it('should have children and expenses collections initialized', () => {
    expect(category.children).toBeDefined();
    expect(category.children.length).toBe(0);
    expect(category.expenses).toBeDefined();
    expect(category.expenses.length).toBe(0);
  });

  it('should allow deactivating category', () => {
    category.isActive = false;
    expect(category.isActive).toBe(false);
  });
});
