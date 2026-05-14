import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

const mockUser = {
  id: 'user-uuid-1',
  email: 'admin@test.com',
  displayName: 'Admin',
  passwordHash: '$2b$12$hashed',
  role: 'admin',
  isActive: true,
};

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<Pick<UsersService, 'findByEmail'>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: { findByEmail: jest.fn() },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('mock-token') },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('returns accessToken and user without passwordHash when credentials valid', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({ email: 'admin@test.com', password: 'pass' });

      expect(result.accessToken).toBe('mock-token');
      expect(result.user.email).toBe('admin@test.com');
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('throws UnauthorizedException when user not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'x@x.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user is inactive', async () => {
      usersService.findByEmail.mockResolvedValue({ ...mockUser, isActive: false } as any);

      await expect(
        service.login({ email: 'admin@test.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when password does not match', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'admin@test.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('calls bcrypt.compare even when user is not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'ghost@x.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(bcrypt.compare).toHaveBeenCalledTimes(1);
    });
  });

  describe('ssoLogin', () => {
    const VALID_SECRET = 'test-sso-secret';

    beforeEach(() => {
      jest.spyOn(service as any, 'getSsoSecret').mockReturnValue(VALID_SECRET);
    });

    it('throws UnauthorizedException when internalSecret does not match', async () => {
      await expect(
        service.ssoLogin({ email: 'admin@test.com', internalSecret: 'wrong-secret' }),
      ).rejects.toThrow(new UnauthorizedException('SSO authentication failed'));
    });

    it('throws UnauthorizedException when user is not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.ssoLogin({ email: 'nobody@test.com', internalSecret: VALID_SECRET }),
      ).rejects.toThrow(new UnauthorizedException('SSO authentication failed'));
    });

    it('throws UnauthorizedException when user is inactive', async () => {
      usersService.findByEmail.mockResolvedValue({ ...mockUser, isActive: false } as any);

      await expect(
        service.ssoLogin({ email: 'admin@test.com', internalSecret: VALID_SECRET }),
      ).rejects.toThrow(new UnauthorizedException('SSO authentication failed'));
    });

    it('throws UnauthorizedException when SSO_INTERNAL_SECRET is not configured', async () => {
      jest.spyOn(service as any, 'getSsoSecret').mockReturnValue('');

      await expect(
        service.ssoLogin({ email: 'admin@test.com', internalSecret: '' }),
      ).rejects.toThrow(new UnauthorizedException('SSO authentication failed'));
    });

    it('returns accessToken and user when secret and email are valid', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as any);

      const result = await service.ssoLogin({ email: 'admin@test.com', internalSecret: VALID_SECRET });

      expect(result.accessToken).toBe('mock-token');
      expect(result.user.email).toBe('admin@test.com');
      expect(result.user).not.toHaveProperty('passwordHash');
    });
  });
});
