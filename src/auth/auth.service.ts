import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, EntityManager } from '@mikro-orm/core';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

// Type for user without password but with all other methods intact
type UserWithoutPassword = Omit<User, 'password'>;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
    private readonly em: EntityManager,
    private readonly jwtService: JwtService,
  ) {}

  async register(
    createUserDto: CreateUserDto,
  ): Promise<{ user: UserWithoutPassword; token: string }> {
    const existingUser = await this.userRepository.findOne({
      email: createUserDto.email,
    });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = this.em.create(User, {
      email: createUserDto.email,
      password: hashedPassword,
      name: createUserDto.name,
      role: createUserDto.role || UserRole.USER,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      // Audit fields will be populated automatically by AuditSubscriber
    });

    await this.em.persistAndFlush(user);

    const token = this.generateToken(user);
    // Create a copy of user without password field
    const userWithoutPassword = Object.assign(
      Object.create(Object.getPrototypeOf(user)),
      user,
    ) as UserWithoutPassword;
    delete (userWithoutPassword as any).password;

    return { user: userWithoutPassword, token };
  }

  async login(
    loginDto: LoginDto,
  ): Promise<{ user: UserWithoutPassword; access_token: string }> {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.generateToken(user);
    // Create a copy of user without password field
    const userWithoutPassword = Object.assign(
      Object.create(Object.getPrototypeOf(user)),
      user,
    ) as UserWithoutPassword;
    delete (userWithoutPassword as any).password;

    return { user: userWithoutPassword, access_token: token };
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({ email, isActive: true });
    if (user && (await bcrypt.compare(password, user.password))) {
      return user;
    }
    return null;
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ id, isActive: true });
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<UserWithoutPassword> {
    const user = await this.userRepository.findOne({ id: userId });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (updateProfileDto.name) {
      user.name = updateProfileDto.name;
    }

    if (updateProfileDto.password) {
      user.password = await bcrypt.hash(updateProfileDto.password, 10);
    }

    // updatedBy will be populated automatically by AuditSubscriber

    await this.em.persistAndFlush(user);

    // Create a copy of user without password field
    const userWithoutPassword = Object.assign(
      Object.create(Object.getPrototypeOf(user)),
      user,
    ) as UserWithoutPassword;
    delete (userWithoutPassword as any).password;
    return userWithoutPassword;
  }

  async softDeleteUser(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ id: userId });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Use the BaseEntity's soft delete method
    // The deletedBy will be set automatically by the method using current user context
    user.softDelete();

    await this.em.persistAndFlush(user);
  }

  private generateToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return this.jwtService.sign(payload);
  }
}
