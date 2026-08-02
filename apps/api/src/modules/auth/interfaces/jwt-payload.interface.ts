export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  collectorStatus: string | null;
  permissions: string[];
  jti: string;
}

export interface AuthUserView {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  collectorStatus: string | null;
  permissions: string[];
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
