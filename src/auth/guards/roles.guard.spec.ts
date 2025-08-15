import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../../entities/user.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(async () => {
    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockExecutionContext = (user: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  };

  describe('canActivate', () => {
    it('should return true if no roles are required', () => {
      const context = createMockExecutionContext({ role: UserRole.USER });
      reflector.getAllAndOverride.mockReturnValue(null);

      const result = guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      expect(result).toBe(true);
    });

    it('should return true if user has required role', () => {
      const context = createMockExecutionContext({ role: UserRole.ACCOUNTANT });
      reflector.getAllAndOverride.mockReturnValue([UserRole.ACCOUNTANT]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true if user has one of multiple required roles', () => {
      const context = createMockExecutionContext({ role: UserRole.USER });
      reflector.getAllAndOverride.mockReturnValue([
        UserRole.ACCOUNTANT,
        UserRole.USER,
      ]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return false if user does not have required role', () => {
      const context = createMockExecutionContext({ role: UserRole.USER });
      reflector.getAllAndOverride.mockReturnValue([UserRole.ACCOUNTANT]);

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should return false if user role is undefined', () => {
      const context = createMockExecutionContext({ role: undefined });
      reflector.getAllAndOverride.mockReturnValue([UserRole.ACCOUNTANT]);

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should return false if user is undefined', () => {
      const context = createMockExecutionContext(undefined);
      reflector.getAllAndOverride.mockReturnValue([UserRole.ACCOUNTANT]);

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });
  });
});
