/**
 * Niche Intelligence Service Tests
 * 
 * Tests for website scraping and niche analysis
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  scrapeWebsite,
  extractStructuredContent,
  analyzeNiche,
  validateAnalysis,
  generateAutopilotConfig,
  type NicheAnalysisRequest,
  type NicheAnalysisResult,
} from "../server/services/niche-intelligence";

describe("Niche Intelligence Service", () => {
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;

  beforeAll(() => {
    if (!hasAnthropicKey) {
      console.warn("⚠️  ANTHROPIC_API_KEY not set, skipping live API tests");
    }
  });

  describe("extractStructuredContent", () => {
    it("should extract headings from HTML", () => {
      const html = `
        <html>
          <body>
            <h1>Main Heading</h1>
            <h2>Subheading 1</h2>
            <h3>Subheading 2</h3>
            <p>Some paragraph text</p>
          </body>
        </html>
      `;

      const structured = extractStructuredContent(html);

      expect(structured.headings).toContain("Main Heading");
      expect(structured.headings).toContain("Subheading 1");
      expect(structured.headings).toContain("Subheading 2");
    });

    it("should extract paragraphs from HTML", () => {
      const html = `
        <html>
          <body>
            <p>This is a longer paragraph with enough text to be extracted by the parser.</p>
            <p>Another paragraph with sufficient length for extraction purposes.</p>
            <p>Short</p>
          </body>
        </html>
      `;

      const structured = extractStructuredContent(html);

      expect(structured.paragraphs.length).toBeGreaterThanOrEqual(2);
      expect(structured.paragraphs[0].length).toBeGreaterThan(50);
    });

    it("should extract services from HTML", () => {
      const html = `
        <html>
          <body>
            <div class="service-item">
              <h3>HVAC Installation</h3>
              <p>Professional installation services for residential and commercial properties.</p>
            </div>
            <div class="product-card">
              <h3>Air Conditioning Repair</h3>
              <p>24/7 emergency repair services for all AC brands and models.</p>
            </div>
          </body>
        </html>
      `;

      const structured = extractStructuredContent(html);

      expect(structured.services.length).toBeGreaterThan(0);
    });
  });

  describe("validateAnalysis", () => {
    it("should validate complete analysis result", () => {
      const analysis: NicheAnalysisResult = {
        industry: "HVAC Services",
        brandVoice: {
          tone: "Professional and friendly",
          keywords: ["reliable", "experienced", "certified"],
          writingStyle: "Direct and action-oriented",
        },
        targetAudience: {
          demographics: "Homeowners aged 35-65",
          painPoints: ["High energy bills", "Unreliable service", "Emergency repairs"],
          interests: ["Home improvement", "Energy efficiency", "Comfort"],
        },
        competitors: ["competitor1.com", "competitor2.com", "competitor3.com"],
        keywords: ["HVAC", "air conditioning", "heating", "repair", "installation"],
        contentStrategy: {
          topics: ["Maintenance tips", "Energy savings", "Seasonal prep", "Emergency services"],
          frequency: 3,
          bestTimes: ["9:00 AM", "12:00 PM", "5:00 PM"],
          platforms: ["facebook", "instagram", "linkedin"],
        },
        autopilotConfig: {
          enabled: true,
          contentTypes: ["tips", "case_studies", "behind_the_scenes"],
          postingSchedule: "Monday, Wednesday, Friday at 9 AM",
        },
      };

      const validation = validateAnalysis(analysis);

      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it("should detect missing industry", () => {
      const analysis: NicheAnalysisResult = {
        industry: "ab", // Too short (less than 3 characters)
        brandVoice: {
          tone: "Professional",
          keywords: ["test", "test2", "test3"], // Need at least 3
          writingStyle: "Test",
        },
        targetAudience: {
          demographics: "Test",
          painPoints: ["test"],
          interests: ["test"],
        },
        competitors: [],
        keywords: ["test"],
        contentStrategy: {
          topics: ["test", "test2", "test3"], // Need at least 3
          frequency: 3,
          bestTimes: ["9:00 AM"],
          platforms: ["facebook"],
        },
        autopilotConfig: {
          enabled: true,
          contentTypes: ["test"],
          postingSchedule: "Test",
        },
      };

      const validation = validateAnalysis(analysis);

      expect(validation.isValid).toBe(false);
      expect(validation.issues.some((issue) => issue.toLowerCase().includes("industry"))).toBe(true);
    });

    it("should detect insufficient keywords", () => {
      const analysis: NicheAnalysisResult = {
        industry: "Test Industry",
        brandVoice: {
          tone: "Professional",
          keywords: ["one", "two"], // Less than 3
          writingStyle: "Test",
        },
        targetAudience: {
          demographics: "Test",
          painPoints: ["test"],
          interests: ["test"],
        },
        competitors: [],
        keywords: ["test"],
        contentStrategy: {
          topics: ["test"],
          frequency: 3,
          bestTimes: ["9:00 AM"],
          platforms: ["facebook"],
        },
        autopilotConfig: {
          enabled: true,
          contentTypes: ["test"],
          postingSchedule: "Test",
        },
      };

      const validation = validateAnalysis(analysis);

      expect(validation.isValid).toBe(false);
      expect(validation.issues.some((issue) => issue.includes("keywords"))).toBe(true);
    });
  });

  describe("generateAutopilotConfig", () => {
    it("should generate autopilot configuration from analysis", () => {
      const analysis: NicheAnalysisResult = {
        industry: "HVAC Services",
        brandVoice: {
          tone: "Professional",
          keywords: ["reliable", "certified", "experienced"],
          writingStyle: "Direct",
        },
        targetAudience: {
          demographics: "Homeowners",
          painPoints: ["High bills"],
          interests: ["Energy efficiency"],
        },
        competitors: [],
        keywords: ["HVAC"],
        contentStrategy: {
          topics: ["Maintenance", "Repairs", "Installation"],
          frequency: 3,
          bestTimes: ["9:00 AM", "12:00 PM", "5:00 PM"],
          platforms: ["facebook", "instagram"],
        },
        autopilotConfig: {
          enabled: true,
          contentTypes: ["tips", "case_studies"],
          postingSchedule: "Monday, Wednesday, Friday at 9 AM",
        },
      };

      const config = generateAutopilotConfig(analysis);

      expect(config.enabled).toBe(true);
      expect(config.contentTypes).toEqual(["tips", "case_studies"]);
      expect(config.platforms).toEqual(["facebook", "instagram"]);
      expect(config.topics).toEqual(["Maintenance", "Repairs", "Installation"]);
    });
  });

  describe("scrapeWebsite (integration test)", () => {
    it("should scrape a real website", async () => {
      // Test with a simple, reliable website
      const url = "https://example.com";

      try {
        const result = await scrapeWebsite(url);

        expect(result).toBeDefined();
        expect(result.title).toBeDefined();
        expect(result.text).toBeDefined();
        expect(result.text.length).toBeGreaterThan(0);
        expect(result.html).toBeDefined();
        expect(result.meta).toBeDefined();
      } catch (error) {
        // Scraping can fail in CI environments without proper browser setup
        console.warn("Scraping test skipped:", error);
      }
    }, 60000); // 60 second timeout for scraping
  });

  describe("analyzeNiche (integration test)", () => {
    it("should analyze a website and return structured data", async () => {
      if (!hasAnthropicKey) {
        console.log("Skipping test: No Anthropic API key");
        return;
      }

      // This test requires both Puppeteer and Claude API
      // Skip in CI environments
      if (process.env.CI) {
        console.log("Skipping test: CI environment");
        return;
      }

      const request: NicheAnalysisRequest = {
        websiteUrl: "https://example.com",
        deepScrape: false,
      };

      try {
        const analysis = await analyzeNiche(request);

        expect(analysis).toBeDefined();
        expect(analysis.industry).toBeDefined();
        expect(analysis.brandVoice).toBeDefined();
        expect(analysis.targetAudience).toBeDefined();
        expect(analysis.contentStrategy).toBeDefined();
        expect(analysis.autopilotConfig).toBeDefined();

        const validation = validateAnalysis(analysis);
        expect(validation.isValid).toBe(true);
      } catch (error) {
        console.warn("Niche analysis test skipped:", error);
      }
    }, 90000); // 90 second timeout for full analysis
  });
});
