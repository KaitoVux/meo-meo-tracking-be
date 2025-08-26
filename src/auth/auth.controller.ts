import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { CurrentUser } from './decorators/user.decorator';
import { Roles } from './decorators/roles.decorator';
import { User, UserRole } from '../entities/user.entity';
import { ResponseHelper } from '../common/decorators/api-response.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    const user = await this.authService.register(createUserDto);
    return ResponseHelper.created(user, 'User registered successfully');
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @CurrentUser() _user: User) {
    const result = await this.authService.login(loginDto);
    return ResponseHelper.success(result, 'Login successful');
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@CurrentUser() user: User) {
    const { password: _password, ...userWithoutPassword } = user;
    return ResponseHelper.success(userWithoutPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    const updatedUser = await this.authService.updateProfile(
      user.id,
      updateProfileDto,
    );
    return ResponseHelper.updated(updatedUser, 'Profile updated successfully');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ACCOUNTANT)
  @Get('admin-only')
  async adminOnlyEndpoint() {
    return ResponseHelper.success(
      { access: 'granted' },
      'This endpoint is only accessible by accountants',
    );
  }
}
