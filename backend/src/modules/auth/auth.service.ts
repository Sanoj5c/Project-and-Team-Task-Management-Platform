import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Role } from '../../common/enums/role.enum';

interface AuthTokenPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    // Public self-registration is always a Team Member.
    // Admin/PM accounts are provisioned by an existing Admin via /users.
    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      password: dto.password,
      role: Role.TEAM_MEMBER,
    });

    return this.buildAuthResponse(user.id, user.email, user.role);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildAuthResponse(user.id, user.email, user.role);
  }

  async refresh(refreshToken: string) {
    try {
      const refreshSecret = this.configService.get<string>(
        'JWT_REFRESH_SECRET',
      ) as string;
      const payload = this.jwtService.verify<AuthTokenPayload>(refreshToken, {
        secret: refreshSecret,
      });

      const user = await this.usersService.findOne(payload.sub);
      if (!user || !user.isActive) {
        throw new UnauthorizedException();
      }

      return this.buildAuthResponse(user.id, user.email, user.role);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private buildAuthResponse(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const accessSecret = this.configService.get<string>(
      'JWT_ACCESS_SECRET',
    ) as string;
    const refreshSecret = this.configService.get<string>(
      'JWT_REFRESH_SECRET',
    ) as string;
    const accessExpiry =
      this.configService.get<string>('JWT_ACCESS_EXPIRY') || '15m';
    const refreshExpiry =
      this.configService.get<string>('JWT_REFRESH_EXPIRY') || '7d';

    const accessTokenOptions: JwtSignOptions = {
      secret: accessSecret,
      expiresIn: accessExpiry as JwtSignOptions['expiresIn'],
    };
    const refreshTokenOptions: JwtSignOptions = {
      secret: refreshSecret,
      expiresIn: refreshExpiry as JwtSignOptions['expiresIn'],
    };

    const accessToken: string = this.jwtService.sign(
      payload,
      accessTokenOptions,
    );
    const refreshToken: string = this.jwtService.sign(
      payload,
      refreshTokenOptions,
    );

    return {
      accessToken,
      refreshToken,
      user: { id: userId, email, role },
    };
  }
}