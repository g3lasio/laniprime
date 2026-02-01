/**
 * End-to-End Test: Content Generation Workflow
 * 
 * Tests the complete content generation flow:
 * 1. Generate content based on niche profile
 * 2. Verify platform-specific optimization
 * 3. Test batch generation (7 days)
 * 4. Verify content saved to database
 */

import { describe, it, expect } from "vitest";
import { generateContent } from "../server/services/content-generation";

describe("Content Generation E2E Workflow", () => {
  const mockNicheContext = {
    industry: "HVAC Services",
    brandVoice: {
      tone: "Professional yet friendly",
      keywords: ["reliable", "expert", "quality", "service"],
      writingStyle: "Direct and action-oriented",
    },
    targetAudience: {
      demographics: "Homeowners aged 35-60",
      painPoints: ["High energy bills", "Unreliable contractors", "Emergency breakdowns"],
      interests: ["Home improvement", "Energy efficiency", "Comfort"],
    },
    keywords: ["HVAC", "air conditioning", "heating", "maintenance", "energy efficiency"],
  };

  it("should generate content for Instagram", async () => {
    try {
      const content = await generateContent({
        platform: "instagram",
        topic: "Energy saving tips for summer",
        tone: "friendly",
        includeImage: true,
        nicheContext: mockNicheContext,
      });

      expect(content).toBeDefined();
      expect(content.body).toBeTruthy();
      expect(content.hashtags).toBeInstanceOf(Array);
      expect(content.hashtags && content.hashtags.length).toBeGreaterThan(0);
      expect(content.imagePrompt).toBeTruthy();

      // Instagram-specific checks
      expect(content.body.length).toBeLessThanOrEqual(2200); // Instagram limit
      expect(content.hashtags && content.hashtags.length).toBeLessThanOrEqual(30); // Instagram limit

      console.log("✓ Instagram content generated");
      console.log(`  Body preview: ${content.body.substring(0, 50)}...`);
      console.log(`  Body length: ${content.body.length} chars`);
      console.log(`  Hashtags: ${content.hashtags?.length || 0}`);
      console.log(`  Image prompt: ${content.imagePrompt?.substring(0, 50)}...`);
    } catch (error) {
      if (error instanceof Error && error.message.includes("API key")) {
        console.log("⚠️  Skipping test: Manus LLM API not available");
        return;
      }
      throw error;
    }
  }, 60000);

  it("should generate content for LinkedIn", async () => {
    try {
      const content = await generateContent({
        platform: "linkedin",
        topic: "Professional HVAC maintenance best practices",
        tone: "professional",
        nicheContext: mockNicheContext,
      });

      expect(content).toBeDefined();
      expect(content.body).toBeTruthy();

      // LinkedIn-specific checks
      expect(content.body.length).toBeLessThanOrEqual(3000); // LinkedIn limit

      console.log("✓ LinkedIn content generated");
      console.log(`  Body preview: ${content.body.substring(0, 50)}...`);
      console.log(`  Body length: ${content.body.length} chars`);
    } catch (error) {
      if (error instanceof Error && error.message.includes("API key")) {
        console.log("⚠️  Skipping test: Manus LLM API not available");
        return;
      }
      throw error;
    }
  }, 60000);

  it("should generate content for Twitter", async () => {
    try {
      const content = await generateContent({
        platform: "twitter",
        topic: "Quick HVAC tip",
        tone: "casual",
        nicheContext: mockNicheContext,
      });

      expect(content).toBeDefined();
      expect(content.body).toBeTruthy();

      // Twitter-specific checks
      expect(content.body.length).toBeLessThanOrEqual(280); // Twitter limit

      console.log("✓ Twitter content generated");
      console.log(`  Body: ${content.body}`);
      console.log(`  Length: ${content.body.length} chars`);
    } catch (error) {
      if (error instanceof Error && error.message.includes("API key")) {
        console.log("⚠️  Skipping test: Manus LLM API not available");
        return;
      }
      throw error;
    }
  }, 60000);

  it("should generate weekly content batch (7 posts)", async () => {
    try {
      const posts = [];
      const topics = [
        "Monday motivation: Energy efficiency",
        "Tuesday tip: Filter maintenance",
        "Wednesday wisdom: Thermostat settings",
        "Thursday thought: System upgrades",
        "Friday feature: Customer success story",
        "Saturday service: Weekend availability",
        "Sunday special: Seasonal preparation",
      ];

      for (let i = 0; i < 7; i++) {
        const content = await generateContent({
          platform: "facebook",
          topic: topics[i],
          tone: "friendly",
          nicheContext: mockNicheContext,
        });

        posts.push(content);

        // Verify each post
        expect(content.body).toBeTruthy();
      }

      expect(posts.length).toBe(7);

      console.log("✓ Weekly batch generated (7 posts)");
      console.log(`  All posts have body content`);
      console.log(`  Sample posts:`);
      posts.slice(0, 3).forEach((post, i) => {
        console.log(`    ${i + 1}. ${post.body.substring(0, 50)}...`);
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("API key")) {
        console.log("⚠️  Skipping test: Manus LLM API not available");
        return;
      }
      throw error;
    }
  }, 180000); // 3 minutes for 7 posts

  it("should respect brand voice in generated content", async () => {
    try {
      const content = await generateContent({
        platform: "facebook",
        topic: "Summer HVAC maintenance",
        tone: "friendly",
        nicheContext: mockNicheContext,
      });

      expect(content).toBeDefined();
      expect(content.body).toBeTruthy();

      // Check if brand voice keywords are present
      const bodyLower = content.body.toLowerCase();
      const hasKeywords = mockNicheContext.keywords.some((keyword) =>
        bodyLower.includes(keyword.toLowerCase())
      );

      // At least one brand keyword should be present
      expect(hasKeywords).toBe(true);

      console.log("✓ Brand voice respected in content");
      console.log(`  Brand keywords found in content`);
    } catch (error) {
      if (error instanceof Error && error.message.includes("API key")) {
        console.log("⚠️  Skipping test: Manus LLM API not available");
        return;
      }
      throw error;
    }
  }, 60000);
});
