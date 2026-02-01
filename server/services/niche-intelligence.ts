/**
 * Niche Intelligence Service
 * 
 * Analyzes business websites to extract:
 * - Industry/niche classification
 * - Brand voice and tone
 * - Target audience insights
 * - Competitor analysis
 * - Content strategy recommendations
 * - Autopilot configuration
 * 
 * Uses Puppeteer for web scraping and Claude for analysis
 */

import puppeteer from "puppeteer";
import * as cheerio from "cheerio";
import { invokeLLM } from "../_core/llm";

export interface NicheAnalysisRequest {
  websiteUrl: string;
  deepScrape?: boolean; // Scrape multiple pages
}

export interface NicheAnalysisResult {
  industry: string;
  brandVoice: {
    tone: string;
    keywords: string[];
    writingStyle: string;
  };
  targetAudience: {
    demographics: string;
    painPoints: string[];
    interests: string[];
  };
  competitors: string[];
  keywords: string[];
  contentStrategy: {
    topics: string[];
    frequency: number;
    bestTimes: string[];
    platforms: string[];
  };
  autopilotConfig: {
    enabled: boolean;
    contentTypes: string[];
    postingSchedule: string;
  };
}

/**
 * Scrape website content using Puppeteer
 */
export async function scrapeWebsite(url: string): Promise<{
  html: string;
  text: string;
  title: string;
  meta: Record<string, string>;
  links: string[];
}> {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();
    
    // Set user agent to avoid bot detection
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Navigate to URL
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Extract content
    const html = await page.content();
    const title = await page.title();

    // Extract meta tags
    const meta: Record<string, string> = {};
    const metaTags = await page.$$eval("meta", (metas) =>
      metas.map((meta) => ({
        name: meta.getAttribute("name") || meta.getAttribute("property") || "",
        content: meta.getAttribute("content") || "",
      }))
    );

    metaTags.forEach((tag) => {
      if (tag.name && tag.content) {
        meta[tag.name] = tag.content;
      }
    });

    // Extract text content
    const text = await page.evaluate(() => {
      // Remove script and style elements
      const scripts = document.querySelectorAll("script, style, noscript");
      scripts.forEach((el) => el.remove());

      return document.body.innerText || "";
    });

    // Extract links
    const links = await page.$$eval("a", (anchors) =>
      anchors
        .map((a) => a.href)
        .filter((href) => href && href.startsWith("http"))
    );

    await browser.close();

    return {
      html,
      text: text.substring(0, 50000), // Limit to 50k chars
      title,
      meta,
      links: [...new Set(links)].slice(0, 50), // Unique links, max 50
    };
  } catch (error) {
    if (browser) {
      await browser.close();
    }
    console.error("[NicheIntel] Scraping error:", error);
    throw new Error(`Failed to scrape website: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Extract structured content from HTML using Cheerio
 */
export function extractStructuredContent(html: string): {
  headings: string[];
  paragraphs: string[];
  services: string[];
  testimonials: string[];
} {
  const $ = cheerio.load(html);

  // Extract headings
  const headings: string[] = [];
  $("h1, h2, h3").each((_, el) => {
    const text = $(el).text().trim();
    if (text) headings.push(text);
  });

  // Extract paragraphs
  const paragraphs: string[] = [];
  $("p").each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 50) paragraphs.push(text);
  });

  // Look for services/products
  const services: string[] = [];
  $('[class*="service"], [class*="product"], [class*="offer"]').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 20 && text.length < 500) services.push(text);
  });

  // Look for testimonials/reviews
  const testimonials: string[] = [];
  $('[class*="testimonial"], [class*="review"], [class*="feedback"]').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 30) testimonials.push(text);
  });

  return {
    headings: headings.slice(0, 20),
    paragraphs: paragraphs.slice(0, 30),
    services: services.slice(0, 10),
    testimonials: testimonials.slice(0, 5),
  };
}

/**
 * Analyze website content using Claude
 */
export async function analyzeNiche(
  request: NicheAnalysisRequest
): Promise<NicheAnalysisResult> {
  try {
    // Scrape website
    console.log(`[NicheIntel] Scraping ${request.websiteUrl}...`);
    const scrapedData = await scrapeWebsite(request.websiteUrl);
    const structured = extractStructuredContent(scrapedData.html);

    // Prepare analysis prompt
    const prompt = `You are an expert business analyst and social media strategist. Analyze this business website and provide comprehensive insights for social media content strategy.

Website URL: ${request.websiteUrl}
Title: ${scrapedData.title}
Meta Description: ${scrapedData.meta.description || "N/A"}

Content Sample:
${scrapedData.text.substring(0, 10000)}

Headings:
${structured.headings.slice(0, 10).join("\n")}

Services/Products:
${structured.services.slice(0, 5).join("\n")}

Analyze and return ONLY a JSON object with this exact structure:
{
  "industry": "Primary industry/niche (e.g., 'HVAC Services', 'SaaS', 'Real Estate')",
  "brandVoice": {
    "tone": "Overall tone (e.g., 'Professional', 'Friendly', 'Technical', 'Casual')",
    "keywords": ["key", "brand", "terms", "that", "define", "voice"],
    "writingStyle": "Description of writing style (e.g., 'Direct and action-oriented', 'Storytelling-focused')"
  },
  "targetAudience": {
    "demographics": "Primary audience description (e.g., 'Homeowners aged 35-55', 'B2B decision makers')",
    "painPoints": ["problem1", "problem2", "problem3"],
    "interests": ["interest1", "interest2", "interest3"]
  },
  "competitors": ["competitor1.com", "competitor2.com", "competitor3.com"],
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "contentStrategy": {
    "topics": ["topic1", "topic2", "topic3", "topic4", "topic5"],
    "frequency": 3,
    "bestTimes": ["9:00 AM", "12:00 PM", "5:00 PM"],
    "platforms": ["instagram", "facebook", "linkedin"]
  },
  "autopilotConfig": {
    "enabled": true,
    "contentTypes": ["tips", "case_studies", "behind_the_scenes"],
    "postingSchedule": "Monday, Wednesday, Friday at 9 AM"
  }
}

Important:
- Be specific and actionable
- Base recommendations on actual website content
- Return ONLY the JSON object, no markdown or explanations
- Ensure all arrays have at least 3 items
- frequency should be a number (posts per week)
- platforms should use lowercase identifiers`;

    // Call Claude for analysis using Manus integrated LLM
    console.log("[NicheIntel] Analyzing with Claude...");
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are an expert business analyst and social media strategist. Analyze business websites and provide comprehensive insights for social media content strategy. Always respond with valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    // Parse response
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from Claude");
    }

    let analysis;
    try {
      analysis = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));
    } catch (e) {
      // Try to extract JSON from text
      const textContent = typeof content === 'string' ? content : JSON.stringify(content);
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse Claude analysis as JSON");
      }
    }

    console.log("[NicheIntel] Analysis complete");
    return analysis as NicheAnalysisResult;
  } catch (error) {
    console.error("[NicheIntel] Analysis error:", error);
    throw new Error(`Niche analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Generate autopilot configuration based on niche analysis
 */
export function generateAutopilotConfig(
  analysis: NicheAnalysisResult
): {
  enabled: boolean;
  contentTypes: string[];
  postingSchedule: string;
  platforms: string[];
  topics: string[];
} {
  return {
    enabled: analysis.autopilotConfig.enabled,
    contentTypes: analysis.autopilotConfig.contentTypes,
    postingSchedule: analysis.autopilotConfig.postingSchedule,
    platforms: analysis.contentStrategy.platforms,
    topics: analysis.contentStrategy.topics,
  };
}

/**
 * Validate niche analysis result
 */
export function validateAnalysis(analysis: NicheAnalysisResult): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (!analysis.industry || analysis.industry.length < 3) {
    issues.push("Industry classification is missing or too short");
  }

  if (!analysis.brandVoice?.tone) {
    issues.push("Brand voice tone is missing");
  }

  if (!analysis.brandVoice?.keywords || analysis.brandVoice.keywords.length < 3) {
    issues.push("Insufficient brand keywords");
  }

  if (!analysis.targetAudience?.demographics) {
    issues.push("Target audience demographics missing");
  }

  if (!analysis.contentStrategy?.topics || analysis.contentStrategy.topics.length < 3) {
    issues.push("Insufficient content topics");
  }

  if (!analysis.contentStrategy?.platforms || analysis.contentStrategy.platforms.length < 1) {
    issues.push("No platforms recommended");
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}
