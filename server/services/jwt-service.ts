import * as jose from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "laniprime-dev-secret-change-in-production";
const JWT_ISSUER = "laniprime";
const JWT_AUDIENCE = "laniprime-app";
const ACCESS_TOKEN_EXPIRY = "7d"; // 7 days
const REFRESH_TOKEN_EXPIRY = "30d"; // 30 days

interface TokenPayload {
  userId: number;
  phoneNumber: string;
  role: string;
}

/**
 * Generate access token
 */
export async function generateAccessToken(payload: TokenPayload): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET);
  
  const token = await new jose.SignJWT({
    userId: payload.userId,
    phoneNumber: payload.phoneNumber,
    role: payload.role,
    type: "access",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(secret);

  return token;
}

/**
 * Generate refresh token
 */
export async function generateRefreshToken(payload: TokenPayload): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET);
  
  const token = await new jose.SignJWT({
    userId: payload.userId,
    type: "refresh",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(secret);

  return token;
}

/**
 * Verify and decode token
 */
export async function verifyToken(token: string): Promise<{
  valid: boolean;
  payload?: jose.JWTPayload & { userId?: number; phoneNumber?: string; role?: string; type?: string };
  error?: string;
}> {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    
    const { payload } = await jose.jwtVerify(token, secret, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    return { valid: true, payload: payload as jose.JWTPayload & { userId?: number; phoneNumber?: string; role?: string; type?: string } };
  } catch (error) {
    if (error instanceof jose.errors.JWTExpired) {
      return { valid: false, error: "Token expired" };
    }
    if (error instanceof jose.errors.JWTInvalid) {
      return { valid: false, error: "Invalid token" };
    }
    return { valid: false, error: "Token verification failed" };
  }
}

/**
 * Generate both access and refresh tokens
 */
export async function generateTokenPair(payload: TokenPayload): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken(payload),
    generateRefreshToken(payload),
  ]);

  return {
    accessToken,
    refreshToken,
    expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
  };
}

/**
 * Decode token without verification (for debugging)
 */
export function decodeToken(token: string): jose.JWTPayload | null {
  try {
    return jose.decodeJwt(token);
  } catch {
    return null;
  }
}
