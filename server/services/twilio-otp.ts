import { createHash, randomInt } from "crypto";
import { eq, and, gt } from "drizzle-orm";
import { getDb } from "../db";
import { otpVerifications, users } from "../../drizzle/schema";

// Rate limiting configuration
const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 3;
const MIN_RESEND_INTERVAL_SECONDS = 60;
const MAX_OTP_REQUESTS_PER_HOUR = 5;

// Twilio configuration (from environment)
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

/**
 * Hash OTP code for secure storage
 */
function hashOtp(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/**
 * Generate a 6-digit OTP code
 */
function generateOtpCode(): string {
  return randomInt(100000, 999999).toString();
}

/**
 * Validate phone number format (E.164)
 */
export function validatePhoneNumber(phone: string): { valid: boolean; formatted: string | null; error?: string } {
  // Remove all non-digit characters except leading +
  const cleaned = phone.replace(/[^\d+]/g, "");
  
  // Check if it starts with + and has 10-15 digits
  const e164Regex = /^\+[1-9]\d{9,14}$/;
  
  if (e164Regex.test(cleaned)) {
    return { valid: true, formatted: cleaned };
  }
  
  // Try to format US numbers without country code
  if (/^\d{10}$/.test(cleaned)) {
    return { valid: true, formatted: `+1${cleaned}` };
  }
  
  return { valid: false, formatted: null, error: "Invalid phone number format. Use E.164 format (e.g., +1234567890)" };
}

/**
 * Send OTP via Twilio SMS
 */
async function sendSms(to: string, body: string): Promise<{ success: boolean; error?: string }> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.error("[Twilio] Missing credentials");
    return { success: false, error: "SMS service not configured" };
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: to,
        From: TWILIO_PHONE_NUMBER,
        Body: body,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("[Twilio] SMS failed:", error);
      return { success: false, error: error.message || "Failed to send SMS" };
    }

    return { success: true };
  } catch (error) {
    console.error("[Twilio] SMS error:", error);
    return { success: false, error: "Failed to send SMS" };
  }
}

/**
 * Request OTP for phone number
 */
export async function requestOtp(phoneNumber: string): Promise<{
  success: boolean;
  error?: string;
  retryAfter?: number;
}> {
  const db = await getDb();
  if (!db) {
    return { success: false, error: "Database not available" };
  }

  // Validate phone number
  const validation = validatePhoneNumber(phoneNumber);
  if (!validation.valid || !validation.formatted) {
    return { success: false, error: validation.error };
  }
  const formattedPhone = validation.formatted;

  // Check rate limiting - recent OTP requests
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentRequests = await db
    .select()
    .from(otpVerifications)
    .where(
      and(
        eq(otpVerifications.phoneNumber, formattedPhone),
        gt(otpVerifications.createdAt, oneHourAgo)
      )
    );

  if (recentRequests.length >= MAX_OTP_REQUESTS_PER_HOUR) {
    return { success: false, error: "Too many OTP requests. Please try again later.", retryAfter: 3600 };
  }

  // Check minimum resend interval
  const lastRequest = recentRequests[recentRequests.length - 1];
  if (lastRequest) {
    const secondsSinceLastRequest = (Date.now() - lastRequest.createdAt.getTime()) / 1000;
    if (secondsSinceLastRequest < MIN_RESEND_INTERVAL_SECONDS) {
      const retryAfter = Math.ceil(MIN_RESEND_INTERVAL_SECONDS - secondsSinceLastRequest);
      return { success: false, error: `Please wait ${retryAfter} seconds before requesting another code`, retryAfter };
    }
  }

  // Generate OTP
  const code = generateOtpCode();
  const codeHash = hashOtp(code);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // Store OTP
  await db.insert(otpVerifications).values({
    phoneNumber: formattedPhone,
    codeHash,
    expiresAt,
    attempts: 0,
    verified: false,
  });

  // Send SMS
  const smsResult = await sendSms(
    formattedPhone,
    `Your LaniPrime verification code is: ${code}. Valid for ${OTP_EXPIRY_MINUTES} minutes.`
  );

  if (!smsResult.success) {
    return { success: false, error: smsResult.error };
  }

  // Update user's lastOtpSentAt if they exist
  await db
    .update(users)
    .set({ lastOtpSentAt: new Date() })
    .where(eq(users.phoneNumber, formattedPhone));

  return { success: true };
}

/**
 * Verify OTP code
 */
export async function verifyOtp(phoneNumber: string, code: string): Promise<{
  success: boolean;
  error?: string;
  userId?: number;
  isNewUser?: boolean;
}> {
  const db = await getDb();
  if (!db) {
    return { success: false, error: "Database not available" };
  }

  // Validate phone number
  const validation = validatePhoneNumber(phoneNumber);
  if (!validation.valid || !validation.formatted) {
    return { success: false, error: validation.error };
  }
  const formattedPhone = validation.formatted;

  // Find the latest unverified OTP for this phone
  const now = new Date();
  const otpRecords = await db
    .select()
    .from(otpVerifications)
    .where(
      and(
        eq(otpVerifications.phoneNumber, formattedPhone),
        eq(otpVerifications.verified, false),
        gt(otpVerifications.expiresAt, now)
      )
    )
    .orderBy(otpVerifications.createdAt);

  const latestOtp = otpRecords[otpRecords.length - 1];

  if (!latestOtp) {
    return { success: false, error: "No valid OTP found. Please request a new code." };
  }

  // Check attempts
  if (latestOtp.attempts >= MAX_OTP_ATTEMPTS) {
    return { success: false, error: "Too many failed attempts. Please request a new code." };
  }

  // Verify code
  const codeHash = hashOtp(code);
  if (codeHash !== latestOtp.codeHash) {
    // Increment attempts
    await db
      .update(otpVerifications)
      .set({ attempts: latestOtp.attempts + 1 })
      .where(eq(otpVerifications.id, latestOtp.id));

    const remainingAttempts = MAX_OTP_ATTEMPTS - latestOtp.attempts - 1;
    return { 
      success: false, 
      error: `Invalid code. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.` 
    };
  }

  // Mark OTP as verified
  await db
    .update(otpVerifications)
    .set({ verified: true })
    .where(eq(otpVerifications.id, latestOtp.id));

  // Find or create user
  const existingUsers = await db
    .select()
    .from(users)
    .where(eq(users.phoneNumber, formattedPhone));

  let userId: number;
  let isNewUser = false;

  if (existingUsers.length > 0) {
    // Update existing user
    userId = existingUsers[0].id;
    await db
      .update(users)
      .set({ 
        phoneVerified: true,
        lastSignedIn: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  } else {
    // Create new user
    isNewUser = true;
    const openId = `phone_${formattedPhone.replace(/\+/g, '')}`;
    const result = await db.insert(users).values({
      openId,
      phoneNumber: formattedPhone,
      phoneVerified: true,
      loginMethod: "phone",
      role: "user",
    }).returning({ id: users.id });
    userId = result[0].id;
  }

  return { success: true, userId, isNewUser };
}

/**
 * Get user by ID
 */
export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(users).where(eq(users.id, userId));
  return result[0] || null;
}
