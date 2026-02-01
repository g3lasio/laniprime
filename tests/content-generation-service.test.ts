/**
 * Content Generation Service Tests
 * 
 * Tests for the AI-powered content generation service
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  generateContent,
  validateContent,
  enhanceText,
  type ContentGenerationRequest,
} from "../server/services/content-generation";

describe("Content Generation Service", () => {
  // Skip tests if API keys are not configured
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;

  beforeAll(() => {
    if (!hasAnthropicKey) {
      console.warn("⚠️  ANTHROPIC_API_KEY not set, skipping live API tests");
    }
  });

  describe("generateContent", () => {
    it("should generate content for Instagram", async () => {
      if (!hasAnthropicKey) {
        console.log("Skipping test: No Anthropic API key");
        return;
      }

      const request: ContentGenerationRequest = {
        topic: "Tips for small business owners",
        platform: "instagram",
        tone: "professional",
        includeImage: false,
      };

      const content = await generateContent(request);

      expect(content).toBeDefined();
      expect(content.body).toBeDefined();
      expect(content.body.length).toBeGreaterThan(0);
      expect(content.platform).toBe("instagram");
      expect(content.characterCount).toBeGreaterThan(0);
      expect(content.hashtags).toBeDefined();
      expect(Array.isArray(content.hashtags)).toBe(true);
    }, 30000); // 30 second timeout for API call

    it("should generate content for Twitter with character limit", async () => {
      if (!hasAnthropicKey) {
        console.log("Skipping test: No Anthropic API key");
        return;
      }

      const request: ContentGenerationRequest = {
        topic: "Quick productivity hack",
        platform: "twitter",
        tone: "casual",
        includeImage: false,
      };

      const content = await generateContent(request);

      expect(content).toBeDefined();
      expect(content.body).toBeDefined();
      expect(content.characterCount).toBeLessThanOrEqual(280);
      expect(content.platform).toBe("twitter");
    }, 30000);

    it("should generate content for LinkedIn with professional tone", async () => {
      if (!hasAnthropicKey) {
        console.log("Skipping test: No Anthropic API key");
        return;
      }

      const request: ContentGenerationRequest = {
        topic: "Leadership lessons from successful CEOs",
        platform: "linkedin",
        tone: "professional",
        includeImage: false,
      };

      const content = await generateContent(request);

      expect(content).toBeDefined();
      expect(content.body).toBeDefined();
      expect(content.platform).toBe("linkedin");
      expect(content.hashtags?.length).toBeLessThanOrEqual(5);
    }, 30000);

    it("should include niche context when provided", async () => {
      if (!hasAnthropicKey) {
        console.log("Skipping test: No Anthropic API key");
        return;
      }

      const request: ContentGenerationRequest = {
        topic: "New service announcement",
        platform: "facebook",
        tone: "friendly",
        includeImage: false,
        nicheContext: {
          industry: "HVAC Services",
          brandVoice: {
            tone: "Friendly and helpful",
            keywords: ["reliable", "professional", "family-owned"],
          },
          keywords: ["HVAC", "air conditioning", "heating"],
          targetAudience: {
            demographics: "Homeowners aged 35-65",
            painPoints: ["High energy bills", "Unreliable contractors"],
          },
        },
      };

      const content = await generateContent(request);

      expect(content).toBeDefined();
      expect(content.body).toBeDefined();
      // Content should reflect the niche context
      expect(content.body.toLowerCase()).toMatch(/hvac|heating|cooling|air/);
    }, 30000);
  });

  describe("validateContent", () => {
    it("should validate content within platform limits", () => {
      const content = {
        body: "This is a test post for Instagram with some engaging content!",
        hashtags: ["test", "instagram", "content"],
        imageUrl: null,
        platform: "instagram",
        characterCount: 100,
      };

      const validation = validateContent(content);

      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it("should detect content exceeding platform limits", () => {
      const content = {
        body: "x".repeat(3000),
        hashtags: [],
        imageUrl: null,
        platform: "twitter",
        characterCount: 3000,
      };

      const validation = validateContent(content);

      expect(validation.isValid).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.issues[0]).toContain("exceeds");
    });

    it("should detect too many hashtags", () => {
      const content = {
        body: "Test post",
        hashtags: Array(50).fill("tag"),
        imageUrl: null,
        platform: "twitter",
        characterCount: 100,
      };

      const validation = validateContent(content);

      expect(validation.isValid).toBe(false);
      expect(validation.issues.some((issue) => issue.includes("hashtags"))).toBe(true);
    });

    it("should detect empty content", () => {
      const content = {
        body: "",
        hashtags: [],
        imageUrl: null,
        platform: "instagram",
        characterCount: 0,
      };

      const validation = validateContent(content);

      expect(validation.isValid).toBe(false);
      expect(validation.issues.some((issue) => issue.includes("empty"))).toBe(true);
    });
  });

  describe("enhanceText", () => {
    it("should enhance text using Claude Haiku", async () => {
      if (!hasAnthropicKey) {
        console.log("Skipping test: No Anthropic API key");
        return;
      }

      const originalText = "We fix air conditioners. Call us.";
      const enhanced = await enhanceText(originalText, "Make it more engaging and professional");

      expect(enhanced).toBeDefined();
      expect(enhanced.length).toBeGreaterThan(originalText.length);
      expect(enhanced).not.toBe(originalText);
    }, 30000);

    it("should fallback to original text on error", async () => {
      // Test with invalid API key scenario
      const originalEnv = process.env.ANTHROPIC_API_KEY;
      process.env.ANTHROPIC_API_KEY = "invalid-key";

      const originalText = "Test text";
      const enhanced = await enhanceText(originalText);

      expect(enhanced).toBe(originalText);

      // Restore original env
      process.env.ANTHROPIC_API_KEY = originalEnv;
    }, 30000);
  });

  describe("Platform-specific content generation", () => {
    const platforms: Array<"instagram" | "facebook" | "twitter" | "linkedin" | "tiktok"> = [
      "instagram",
      "facebook",
      "twitter",
      "linkedin",
      "tiktok",
    ];

    platforms.forEach((platform) => {
      it(`should generate valid content for ${platform}`, async () => {
        if (!hasAnthropicKey) {
          console.log("Skipping test: No Anthropic API key");
          return;
        }

        const request: ContentGenerationRequest = {
          topic: "Business growth strategies",
          platform,
          tone: "professional",
          includeImage: false,
        };

        const content = await generateContent(request);
        const validation = validateContent(content);

        expect(content).toBeDefined();
        expect(content.platform).toBe(platform);
        expect(validation.isValid).toBe(true);
      }, 30000);
    });
  });
});
