import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { getRepositoryToken } from '@mikro-orm/nestjs';
import { EntityRepository, EntityManager, Collection } from '@mikro-orm/core';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User, UserRole } from '../entities/user.entity';
import { Expense } from '../entities/expense.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<EntityRepository<User>>;
  let entityManager: jest.Mocked<EntityManager>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    password: 'hashedPassword',
    name: 'Test User',
    role: UserRole.USER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    expenses: {} as Collection<Expense>,
  };

  beforeEach(async () => {
    const mockUserRepository = {
      findOne: jest.fn(),
    };

    const mockEntityManager = {
      create: jest.fn(),
      persistAndFlush: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: EntityManager,
          useValue: mockEntityManager,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(User));
    entityManager = module.get(EntityManager);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const createUserDto: CreateUserDto = {
      email: 'newuser@example.com',
      password: 'password123',
      name: 'New User',
      role: UserRole.USER,
    };

    it('should successfully register a new user', async () => {
      userRepository.findOne.mockResolvedValue(null);
      entityManager.create.mockReturnValue(mockUser);
      mockBcrypt.hash.mockResolvedValue('hashedPassword' as never);
      jwtService.sign.mockReturnValue('jwt-token');

      const result = await service.register(createUserDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        email: createUserDto.email,
      });
      expect(mockBcrypt.hash).toHaveBeenCalledWith(createUserDto.password, 10);
      expect(entityManager.create).toHaveBeenCalledWith(User, {
        email: createUserDto.email,
        password: 'hashedPassword',
        name: createUserDto.name,
        role: createUserDto.role,
        isActive: true,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      expect(entityManager.persistAndFlush).toHaveBeenCalledWith(mockUser);
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
      expect(result).toEqual({
        user: expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          role: mockUser.role,
        }),
        token: 'jwt-token',
      });
      expect(result.user).not.toHaveProperty('password');
    });

    it('should throw ConflictException if user already exists', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.register(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      expect(userRepository.findOne).toHaveBeenCalledWith({
        email: createUserDto.email,
      });
      expect(entityManager.create).not.toHaveBeenCalled();
    });

    it('should default to USER role if not specified', async () => {
      const createUserDtoWithoutRole = { ...createUserDto };
      delete createUserDtoWithoutRole.role;

      userRepository.findOne.mockResolvedValue(null);
      entityManager.create.mockReturnValue(mockUser);
      mockBcrypt.hash.mockResolvedValue('hashedPassword' as never);
      jwtService.sign.mockReturnValue('jwt-token');

      await service.register(createUserDtoWithoutRole);

      expect(entityManager.create).toHaveBeenCalledWith(User, {
        email: createUserDtoWithoutRole.email,
        password: 'hashedPassword',
        name: createUserDtoWithoutRole.name,
        role: UserRole.USER,
        isActive: true,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should successfully login with valid credentials', async () => {
      jest.spyOn(service, 'validateUser').mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('jwt-token');

      const result = await service.login(loginDto);

      expect(service.validateUser).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password,
      );
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
      expect(result).toEqual({
        user: expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          role: mockUser.role,
        }),
        token: 'jwt-token',
      });
      expect(result.user).not.toHaveProperty('password');
    });

    it('should throw UnauthorizedException with invalid credentials', async () => {
      jest.spyOn(service, 'validateUser').mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(service.validateUser).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password,
      );
      expect(jwtService.sign).not.toHaveBeenCalled();
    });
  });

  describe('validateUser', () => {
    it('should return user if credentials are valid', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true as never);

      const result = await service.validateUser(
        'test@example.com',
        'password123',
      );

      expect(userRepository.findOne).toHaveBeenCalledWith({
        email: 'test@example.com',
        isActive: true,
      });
      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        'password123',
        mockUser.password,
      );
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.validateUser(
        'test@example.com',
        'password123',
      );

      expect(result).toBeNull();
      expect(mockBcrypt.compare).not.toHaveBeenCalled();
    });

    it('should return null if password is invalid', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false as never);

      const result = await service.validateUser(
        'test@example.com',
        'wrongpassword',
      );

      expect(userRepository.findOne).toHaveBeenCalledWith({
        email: 'test@example.com',
        isActive: true,
      });
      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        'wrongpassword',
        mockUser.password,
      );
      expect(result).toBeNull();
    });

    it('should only find active users', async () => {
      await service.validateUser('test@example.com', 'password123');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        email: 'test@example.com',
        isActive: true,
      });
    });
  });

  describe('findById', () => {
    it('should return user if found and active', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById(
        '123e4567-e89b-12d3-a456-426614174000',
      );

      expect(userRepository.findOne).toHaveBeenCalledWith({
        id: '123e4567-e89b-12d3-a456-426614174000',
        isActive: true,
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.findById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('updateProfile', () => {
    const updateProfileDto: UpdateProfileDto = {
      name: 'Updated Name',
      password: 'newpassword123',
    };

    it('should successfully update user profile', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      mockBcrypt.hash.mockResolvedValue('newHashedPassword' as never);

      const result = await service.updateProfile(mockUser.id, updateProfileDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({ id: mockUser.id });
      expect(mockBcrypt.hash).toHaveBeenCalledWith('newpassword123', 10);
      expect(mockUser.name).toBe('Updated Name');
      expect(mockUser.password).toBe('newHashedPassword');
      expect(entityManager.persistAndFlush).toHaveBeenCalledWith(mockUser);
      expect(result).not.toHaveProperty('password');
    });

    it('should update only name if password not provided', async () => {
      const updateDto = { name: 'Updated Name' };
      userRepository.findOne.mockResolvedValue(mockUser);

      await service.updateProfile(mockUser.id, updateDto);

      expect(mockUser.name).toBe('Updated Name');
      expect(mockBcrypt.hash).not.toHaveBeenCalled();
      expect(entityManager.persistAndFlush).toHaveBeenCalledWith(mockUser);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateProfile('nonexistent-id', updateProfileDto),
      ).rejects.toThrow(UnauthorizedException);
      expect(entityManager.persistAndFlush).not.toHaveBeenCalled();
    });
  });
});
