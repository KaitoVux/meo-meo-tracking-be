import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User, UserRole } from '../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    password: 'hashedPassword',
    name: 'Test User',
    role: UserRole.USER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    expenses: {} as any,
  };

  const mockUserWithoutPassword = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.USER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    expenses: {} as any,
  };

  beforeEach(async () => {
    const mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
      updateProfile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const createUserDto: CreateUserDto = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
        role: UserRole.USER,
      };

      const expectedResult = {
        user: mockUserWithoutPassword,
        token: 'jwt-token',
      };

      authService.register.mockResolvedValue(expectedResult);

      const result = await controller.register(createUserDto);

      expect(authService.register).toHaveBeenCalledWith(createUserDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('login', () => {
    it('should login a user', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const expectedResult = {
        user: mockUserWithoutPassword,
        token: 'jwt-token',
      };

      authService.login.mockResolvedValue(expectedResult);

      const result = await controller.login(loginDto, mockUser);

      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getProfile', () => {
    it('should return user profile without password', () => {
      const result = controller.getProfile(mockUser);

      expect(result).toEqual(mockUserWithoutPassword);
      expect(result).not.toHaveProperty('password');
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const updateProfileDto: UpdateProfileDto = {
        name: 'Updated Name',
        password: 'newpassword123',
      };

      const expectedResult = {
        ...mockUserWithoutPassword,
        name: 'Updated Name',
      };

      authService.updateProfile.mockResolvedValue(expectedResult);

      const result = await controller.updateProfile(mockUser, updateProfileDto);

      expect(authService.updateProfile).toHaveBeenCalledWith(
        mockUser.id,
        updateProfileDto,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('adminOnlyEndpoint', () => {
    it('should return admin message', () => {
      const result = controller.adminOnlyEndpoint();

      expect(result).toEqual({
        message: 'This endpoint is only accessible by accountants',
      });
    });
  });
});
