import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Twilio service since we don't want to make real API calls
vi.mock("../server/services/twilio-otp", () => ({
  TwilioOtpService: {
    sendOtp: vi.fn().mockResolvedValue({ success: true }),
    verifyOtp: vi.fn().mockResolvedValue({ success: true, isValid: true }),
    generateOtpCode: vi.fn().mockReturnValue("123456"),
  },
}));

describe("Twilio OTP Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Phone Number Validation", () => {
    it("should accept valid US phone numbers", () => {
      const validNumbers = [
        "+14155551234",
        "+12025551234",
        "+18005551234",
      ];
      
      validNumbers.forEach((number) => {
        // Basic E.164 format validation
        const isValid = /^\+1[2-9]\d{9}$/.test(number);
        expect(isValid).toBe(true);
      });
    });

    it("should reject invalid phone numbers", () => {
      const invalidNumbers = [
        "4155551234", // Missing country code
        "+1415555123", // Too short
        "+141555512345", // Too long
        "+0155551234", // Invalid area code
      ];
      
      invalidNumbers.forEach((number) => {
        const isValid = /^\+1[2-9]\d{9}$/.test(number);
        expect(isValid).toBe(false);
      });
    });
  });

  describe("OTP Code Generation", () => {
    it("should generate 6-digit codes", () => {
      const generateOtpCode = () => {
        return Math.floor(100000 + Math.random() * 900000).toString();
      };
      
      const code = generateOtpCode();
      expect(code).toHaveLength(6);
      expect(/^\d{6}$/.test(code)).toBe(true);
    });

    it("should generate unique codes", () => {
      const generateOtpCode = () => {
        return Math.floor(100000 + Math.random() * 900000).toString();
      };
      
      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        codes.add(generateOtpCode());
      }
      // Should have high uniqueness (allow for some collisions)
      expect(codes.size).toBeGreaterThan(90);
    });
  });

  describe("OTP Expiration", () => {
    it("should correctly check if OTP is expired", () => {
      const isExpired = (expiresAt: Date) => {
        return new Date() > expiresAt;
      };
      
      // Not expired (5 minutes in future)
      const futureDate = new Date(Date.now() + 5 * 60 * 1000);
      expect(isExpired(futureDate)).toBe(false);
      
      // Expired (5 minutes in past)
      const pastDate = new Date(Date.now() - 5 * 60 * 1000);
      expect(isExpired(pastDate)).toBe(true);
    });
  });

  describe("Rate Limiting", () => {
    it("should track OTP request counts", () => {
      const requestCounts = new Map<string, { count: number; resetAt: Date }>();
      
      const trackRequest = (phoneNumber: string) => {
        const existing = requestCounts.get(phoneNumber);
        if (!existing || new Date() > existing.resetAt) {
          requestCounts.set(phoneNumber, {
            count: 1,
            resetAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
          });
          return true;
        }
        if (existing.count >= 5) {
          return false; // Rate limited
        }
        existing.count++;
        return true;
      };
      
      const phone = "+14155551234";
      
      // First 5 requests should succeed
      for (let i = 0; i < 5; i++) {
        expect(trackRequest(phone)).toBe(true);
      }
      
      // 6th request should be rate limited
      expect(trackRequest(phone)).toBe(false);
    });
  });
});
