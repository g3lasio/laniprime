/**
 * End-to-End Test: Niche Analysis Workflow
 * 
 * Tests the complete niche analysis flow:
 * 1. Scrape website with Puppeteer
 * 2. Analyze content with Claude (Manus integrated LLM)
 * 3. Save niche profile to database
 * 4. Verify data structure and quality
 */

import { describe, it, expect, beforeAll } from "vitest";
import { analyzeNiche, scrapeWebsite } from "../server/services/niche-intelligence";

describe("Niche Analysis E2E Workflow", () => {
  it("should scrape a real website successfully", async () => {
    const url = "https://example.com";
    const result = await scrapeWebsite(url);

    expect(result).toBeDefined();
    expect(result.html).toBeTruthy();
    expect(result.text).toBeTruthy();
    expect(result.title).toBeTruthy();
    expect(result.meta).toBeDefined();
    expect(result.links).toBeInstanceOf(Array);

    console.log("✓ Website scraped successfully");
    console.log(`  Title: ${result.title}`);
    console.log(`  Text length: ${result.text.length} chars`);
    console.log(`  Links found: ${result.links.length}`);
  }, 60000); // 60s timeout for scraping

  it("should analyze website and return structured niche profile", async () => {
    // Note: This test requires Manus integrated LLM to be available
    // It will use the invokeLLM function from server/_core/llm.ts
    
    const url = "https://example.com";
    
    try {
      const analysis = await analyzeNiche({ websiteUrl: url, deepScrape: false });

      // Verify structure
      expect(analysis).toBeDefined();
      expect(analysis.industry).toBeTruthy();
      expect(analysis.brandVoice).toBeDefined();
      expect(analysis.brandVoice.tone).toBeTruthy();
      expect(analysis.brandVoice.keywords).toBeInstanceOf(Array);
      expect(analysis.brandVoice.keywords.length).toBeGreaterThan(0);

      expect(analysis.targetAudience).toBeDefined();
      expect(analysis.targetAudience.demographics).toBeTruthy();
      expect(analysis.targetAudience.painPoints).toBeInstanceOf(Array);
      expect(analysis.targetAudience.interests).toBeInstanceOf(Array);

      expect(analysis.competitors).toBeInstanceOf(Array);
      expect(analysis.keywords).toBeInstanceOf(Array);

      expect(analysis.contentStrategy).toBeDefined();
      expect(analysis.contentStrategy.topics).toBeInstanceOf(Array);
      expect(analysis.contentStrategy.frequency).toBeGreaterThan(0);
      expect(analysis.contentStrategy.bestTimes).toBeInstanceOf(Array);
      expect(analysis.contentStrategy.platforms).toBeInstanceOf(Array);

      expect(analysis.autopilotConfig).toBeDefined();
      expect(analysis.autopilotConfig.contentTypes).toBeInstanceOf(Array);

      console.log("✓ Niche analysis completed successfully");
      console.log(`  Industry: ${analysis.industry}`);
      console.log(`  Brand Voice: ${analysis.brandVoice.tone}`);
      console.log(`  Target Audience: ${analysis.targetAudience.demographics}`);
      console.log(`  Content Topics: ${analysis.contentStrategy.topics.slice(0, 3).join(", ")}`);
      console.log(`  Posting Frequency: ${analysis.contentStrategy.frequency} posts/week`);
      console.log(`  Platforms: ${analysis.contentStrategy.platforms.join(", ")}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes("API key")) {
        console.log("⚠️  Skipping test: Manus LLM API not available");
        return; // Skip test if API not available
      }
      throw error;
    }
  }, 120000); // 120s timeout for full analysis

  it("should handle invalid URLs gracefully", async () => {
    const invalidUrl = "https://this-domain-definitely-does-not-exist-12345.com";
    
    await expect(async () => {
      await scrapeWebsite(invalidUrl);
    }).rejects.toThrow();

    console.log("✓ Invalid URL handled correctly");
  }, 30000);

  it("should extract structured content from HTML", async () => {
    const url = "https://example.com";
    const scraped = await scrapeWebsite(url);

    // The scraping should extract meaningful content
    expect(scraped.text.length).toBeGreaterThan(100);
    expect(scraped.title).toBeTruthy();

    console.log("✓ Structured content extracted");
  }, 60000);
});
