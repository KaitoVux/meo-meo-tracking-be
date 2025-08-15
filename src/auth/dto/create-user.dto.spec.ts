import { validate } from 'class-validator';
import { CreateUserDto } from './create-user.dto';
import { UserRole } from '../../entities/user.entity';

describe('CreateUserDto', () => {
  let dto: CreateUserDto;

  beforeEach(() => {
    dto = new CreateUserDto();
  });

  describe('email validation', () => {
    it('should pass with valid email', async () => {
      dto.email = 'test@example.com';
      dto.password = 'password123';
      dto.name = 'Test User';

      const errors = await validate(dto);
      const emailErrors = errors.filter((error) => error.property === 'email');

      expect(emailErrors).toHaveLength(0);
    });

    it('should fail with invalid email format', async () => {
      dto.email = 'invalid-email';
      dto.password = 'password123';
      dto.name = 'Test User';

      const errors = await validate(dto);
      const emailErrors = errors.filter((error) => error.property === 'email');

      expect(emailErrors).toHaveLength(1);
      expect(emailErrors[0].constraints).toHaveProperty('isEmail');
    });

    it('should fail when email is missing', async () => {
      dto.password = 'password123';
      dto.name = 'Test User';

      const errors = await validate(dto);
      const emailErrors = errors.filter((error) => error.property === 'email');

      expect(emailErrors).toHaveLength(1);
    });
  });

  describe('password validation', () => {
    it('should pass with valid password', async () => {
      dto.email = 'test@example.com';
      dto.password = 'password123';
      dto.name = 'Test User';

      const errors = await validate(dto);
      const passwordErrors = errors.filter(
        (error) => error.property === 'password',
      );

      expect(passwordErrors).toHaveLength(0);
    });

    it('should fail with password shorter than 6 characters', async () => {
      dto.email = 'test@example.com';
      dto.password = '12345';
      dto.name = 'Test User';

      const errors = await validate(dto);
      const passwordErrors = errors.filter(
        (error) => error.property === 'password',
      );

      expect(passwordErrors).toHaveLength(1);
      expect(passwordErrors[0].constraints).toHaveProperty('minLength');
    });

    it('should fail when password is missing', async () => {
      dto.email = 'test@example.com';
      dto.name = 'Test User';

      const errors = await validate(dto);
      const passwordErrors = errors.filter(
        (error) => error.property === 'password',
      );

      expect(passwordErrors).toHaveLength(1);
    });
  });

  describe('name validation', () => {
    it('should pass with valid name', async () => {
      dto.email = 'test@example.com';
      dto.password = 'password123';
      dto.name = 'Test User';

      const errors = await validate(dto);
      const nameErrors = errors.filter((error) => error.property === 'name');

      expect(nameErrors).toHaveLength(0);
    });

    it('should fail when name is missing', async () => {
      dto.email = 'test@example.com';
      dto.password = 'password123';

      const errors = await validate(dto);
      const nameErrors = errors.filter((error) => error.property === 'name');

      expect(nameErrors).toHaveLength(1);
    });
  });

  describe('role validation', () => {
    it('should pass with valid role', async () => {
      dto.email = 'test@example.com';
      dto.password = 'password123';
      dto.name = 'Test User';
      dto.role = UserRole.ACCOUNTANT;

      const errors = await validate(dto);
      const roleErrors = errors.filter((error) => error.property === 'role');

      expect(roleErrors).toHaveLength(0);
    });

    it('should pass when role is not provided (optional)', async () => {
      dto.email = 'test@example.com';
      dto.password = 'password123';
      dto.name = 'Test User';

      const errors = await validate(dto);
      const roleErrors = errors.filter((error) => error.property === 'role');

      expect(roleErrors).toHaveLength(0);
    });

    it('should fail with invalid role', async () => {
      dto.email = 'test@example.com';
      dto.password = 'password123';
      dto.name = 'Test User';
      dto.role = 'INVALID_ROLE' as any;

      const errors = await validate(dto);
      const roleErrors = errors.filter((error) => error.property === 'role');

      expect(roleErrors).toHaveLength(1);
      expect(roleErrors[0].constraints).toHaveProperty('isEnum');
    });
  });
});
