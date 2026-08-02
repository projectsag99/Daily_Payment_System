import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { SkipThrottle, Throttle } from "@nestjs/throttler";
import { Request } from "express";
import { AuthService } from "./auth.service";
import {
  ChangePasswordDto,
  LoginDto,
  LogoutDto,
  RefreshTokenDto,
  RegisterDto,
} from "./dto/auth.dto";
import { Public, SkipCollectorActiveCheck } from "../../common/decorators/auth.decorators";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtPayload } from "./interfaces/jwt-payload.interface";

@ApiTags("auth")
@Controller("auth")
@SkipCollectorActiveCheck()
@SkipThrottle()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("register")
  @Throttle({ default: { limit: 3, ttl: 3_600_000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Collector self-registration" })
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.authService.register(dto, req.ip);
  }

  @Public()
  @Post("login")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login" })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, req.ip);
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Rotate access and refresh tokens" })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Revoke refresh token" })
  async logout(
    @CurrentUser() user: JwtPayload,
    @Body() dto: LogoutDto,
    @Req() req: Request,
  ) {
    return this.authService.logout(user.sub, dto.refreshToken, req.ip);
  }

  @Get("me")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Current user profile" })
  async me(@CurrentUser() user: JwtPayload) {
    return this.authService.getMe(user.sub);
  }

  @Post("change-password")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Change password" })
  async changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.sub, dto);
  }
}
