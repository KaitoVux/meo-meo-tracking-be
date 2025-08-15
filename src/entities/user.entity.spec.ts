import { User, UserRole } from './user.entity';

describe('User Entity', () => {
  let user: User;

  beforeEach(() => {
    user = new User();
  });

  it('should create a user with default values', () => {
    user.email = 'test@example.com';
    user.name = 'Test User';

    expect(user.id).toBeDefined();
    expect(user.email).toBe('test@example.com');
    expect(user.name).toBe('Test User');
    expect(user.role).toBe(UserRole.USER);
    expect(user.isActive).toBe(true);
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
  });

  it('should allow setting accountant role', () => {
    user.role = UserRole.ACCOUNTANT;
    expect(user.role).toBe(UserRole.ACCOUNTANT);
  });

  it('should allow deactivating user', () => {
    user.isActive = false;
    expect(user.isActive).toBe(false);
  });

  it('should have expenses collection initialized', () => {
    expect(user.expenses).toBeDefined();
    expect(user.expenses.length).toBe(0);
  });
});
