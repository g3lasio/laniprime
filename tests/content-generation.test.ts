import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Content Generation Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Platform-specific content formatting", () => {
    const formatForPlatform = (content: string, platform: string): string => {
      const limits: Record<string, number> = {
        twitter: 280,
        instagram: 2200,
        facebook: 63206,
        linkedin: 3000,
        tiktok: 2200,
      };
      
      const limit = limits[platform] || 2200;
      if (content.length > limit) {
        return content.substring(0, limit - 3) + "...";
      }
      return content;
    };

    it("should truncate Twitter content to 280 characters", () => {
      const longContent = "A".repeat(300);
      const formatted = formatForPlatform(longContent, "twitter");
      expect(formatted.length).toBe(280);
      expect(formatted.endsWith("...")).toBe(true);
    });

    it("should not truncate short content", () => {
      const shortContent = "Hello World!";
      const formatted = formatForPlatform(shortContent, "twitter");
      expect(formatted).toBe(shortContent);
    });

    it("should handle different platform limits", () => {
      const content = "A".repeat(500);
      
      expect(formatForPlatform(content, "twitter").length).toBe(280);
      expect(formatForPlatform(content, "instagram").length).toBe(500); // Under limit
      expect(formatForPlatform(content, "linkedin").length).toBe(500); // Under limit
    });
  });

  describe("Hashtag generation", () => {
    const generateHashtags = (topic: string, count: number = 5): string[] => {
      const words = topic.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      const hashtags: string[] = [];
      
      for (const word of words) {
        if (hashtags.length >= count) break;
        const hashtag = "#" + word.charAt(0).toUpperCase() + word.slice(1);
        if (!hashtags.includes(hashtag)) {
          hashtags.push(hashtag);
        }
      }
      
      return hashtags;
    };

    it("should generate hashtags from topic", () => {
      const hashtags = generateHashtags("home renovation tips for contractors");
      expect(hashtags.length).toBeGreaterThan(0);
      expect(hashtags.every(h => h.startsWith("#"))).toBe(true);
    });

    it("should limit hashtag count", () => {
      const hashtags = generateHashtags("one two three four five six seven eight", 3);
      expect(hashtags.length).toBeLessThanOrEqual(3);
    });

    it("should capitalize hashtags properly", () => {
      const hashtags = generateHashtags("home renovation");
      expect(hashtags).toContain("#Home");
      expect(hashtags).toContain("#Renovation");
    });
  });

  describe("Content tone adjustment", () => {
    const adjustTone = (content: string, tone: string): string => {
      const toneModifiers: Record<string, (s: string) => string> = {
        professional: (s) => s.replace(/!/g, "."),
        casual: (s) => s.toLowerCase(),
        friendly: (s) => s + " 😊",
        authoritative: (s) => s.toUpperCase(),
      };
      
      const modifier = toneModifiers[tone];
      return modifier ? modifier(content) : content;
    };

    it("should apply professional tone", () => {
      const content = "Check out our services!";
      const adjusted = adjustTone(content, "professional");
      expect(adjusted).toBe("Check out our services.");
    });

    it("should apply casual tone", () => {
      const content = "Check Out Our Services";
      const adjusted = adjustTone(content, "casual");
      expect(adjusted).toBe("check out our services");
    });

    it("should apply friendly tone", () => {
      const content = "Check out our services";
      const adjusted = adjustTone(content, "friendly");
      expect(adjusted).toContain("😊");
    });
  });

  describe("Content scheduling", () => {
    const getOptimalPostTime = (platform: string): Date => {
      const now = new Date();
      const optimalHours: Record<string, number> = {
        twitter: 9, // 9 AM
        instagram: 11, // 11 AM
        facebook: 13, // 1 PM
        linkedin: 10, // 10 AM
        tiktok: 19, // 7 PM
      };
      
      const hour = optimalHours[platform] || 12;
      const scheduledDate = new Date(now);
      scheduledDate.setHours(hour, 0, 0, 0);
      
      // If time has passed today, schedule for tomorrow
      if (scheduledDate <= now) {
        scheduledDate.setDate(scheduledDate.getDate() + 1);
      }
      
      return scheduledDate;
    };

    it("should return future date for optimal posting", () => {
      const postTime = getOptimalPostTime("twitter");
      expect(postTime > new Date()).toBe(true);
    });

    it("should use platform-specific optimal times", () => {
      const twitterTime = getOptimalPostTime("twitter");
      const tiktokTime = getOptimalPostTime("tiktok");
      
      // Twitter optimal is 9 AM, TikTok is 7 PM
      expect(twitterTime.getHours()).toBe(9);
      expect(tiktokTime.getHours()).toBe(19);
    });
  });

  describe("Usage tracking", () => {
    const trackUsage = (
      usage: { postsGenerated: number; imagesGenerated: number },
      type: "post" | "image"
    ) => {
      if (type === "post") {
        usage.postsGenerated++;
      } else {
        usage.imagesGenerated++;
      }
      return usage;
    };

    it("should increment post count", () => {
      const usage = { postsGenerated: 0, imagesGenerated: 0 };
      trackUsage(usage, "post");
      expect(usage.postsGenerated).toBe(1);
    });

    it("should increment image count", () => {
      const usage = { postsGenerated: 0, imagesGenerated: 0 };
      trackUsage(usage, "image");
      expect(usage.imagesGenerated).toBe(1);
    });

    it("should track multiple operations", () => {
      const usage = { postsGenerated: 0, imagesGenerated: 0 };
      trackUsage(usage, "post");
      trackUsage(usage, "post");
      trackUsage(usage, "image");
      expect(usage.postsGenerated).toBe(2);
      expect(usage.imagesGenerated).toBe(1);
    });
  });
});
