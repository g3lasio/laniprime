/**
 * Content Generation Service
 * 
 * Handles AI-powered content generation using Claude Sonnet 4.7 (primary)
 * and Claude Haiku (cost-sensitive features like text enhancement).
 * 
 * Features:
 * - Multi-platform content generation (Instagram, Facebook, Twitter, LinkedIn, TikTok)
 * - Image generation integration (DALL-E/Stable Diffusion)
 * - Prompt engineering templates
 * - Content quality validation
 * - Usage tracking for billing
 */

import { invokeLLM } from "../_core/llm";
import OpenAI from "openai";

// Initialize OpenAI client (for DALL-E image generation)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export interface ContentGenerationRequest {
  topic: string;
  platform: "instagram" | "facebook" | "twitter" | "linkedin" | "tiktok";
  tone?: "professional" | "casual" | "friendly" | "humorous" | "inspirational";
  includeImage?: boolean;
  imageStyle?: string;
  nicheContext?: {
    industry?: string;
    brandVoice?: any;
    keywords?: string[];
    targetAudience?: any;
  };
}

export interface GeneratedContent {
  body: string;
  hashtags?: string[];
  imageUrl?: string | null;
  imagePrompt?: string;
  platform: string;
  characterCount: number;
  estimatedReadTime?: number;
}

/**
 * Platform-specific content constraints and best practices
 */
const PLATFORM_SPECS = {
  instagram: {
    maxLength: 2200,
    optimalLength: 150,
    hashtagLimit: 30,
    bestPractices: "Use engaging captions, include call-to-action, leverage hashtags strategically",
  },
  facebook: {
    maxLength: 63206,
    optimalLength: 250,
    hashtagLimit: 10,
    bestPractices: "Focus on storytelling, ask questions to drive engagement, use emojis sparingly",
  },
  twitter: {
    maxLength: 280,
    optimalLength: 240,
    hashtagLimit: 3,
    bestPractices: "Be concise, use threads for longer content, include relevant hashtags",
  },
  linkedin: {
    maxLength: 3000,
    optimalLength: 150,
    hashtagLimit: 5,
    bestPractices: "Professional tone, provide value, share insights, use line breaks for readability",
  },
  tiktok: {
    maxLength: 2200,
    optimalLength: 100,
    hashtagLimit: 10,
    bestPractices: "Short, catchy, trend-aware, use popular sounds and challenges",
  },
};

/**
 * Generate content using Claude Sonnet 4.7
 */
export async function generateContent(
  request: ContentGenerationRequest
): Promise<GeneratedContent> {
  const { topic, platform, tone = "professional", nicheContext } = request;
  const specs = PLATFORM_SPECS[platform];

  // Build context from niche intelligence
  const nicheContextStr = nicheContext
    ? `
Brand Context:
- Industry: ${nicheContext.industry || "General"}
- Brand Voice: ${JSON.stringify(nicheContext.brandVoice || {})}
- Target Audience: ${JSON.stringify(nicheContext.targetAudience || {})}
- Keywords: ${nicheContext.keywords?.join(", ") || "None"}
`
    : "";

  // Construct prompt for Claude
  const prompt = `You are an expert social media content creator. Generate engaging ${platform} content about the following topic.

Topic: ${topic}

${nicheContextStr}

Platform: ${platform.toUpperCase()}
Tone: ${tone}
Character Limit: ${specs.maxLength} (optimal: ${specs.optimalLength})
Hashtag Limit: ${specs.hashtagLimit}
Best Practices: ${specs.bestPractices}

Requirements:
1. Create compelling, ${tone} content that resonates with the target audience
2. Stay within the optimal character count (${specs.optimalLength} characters)
3. Include ${specs.hashtagLimit} relevant hashtags at the end
4. Follow ${platform} best practices
5. Make it engaging and actionable
${nicheContext?.brandVoice ? `6. Match the brand voice: ${JSON.stringify(nicheContext.brandVoice)}` : ""}

Return ONLY a JSON object with this exact structure:
{
  "body": "The main content text without hashtags",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3"]
}

Do not include any markdown formatting, code blocks, or explanatory text. Just the raw JSON object.`;

  try {
    // Call Claude using Manus integrated LLM
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are an expert social media content creator. Generate engaging content that resonates with target audiences. Always respond with valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    // Extract and parse response
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from Claude");
    }

    let parsedContent;
    try {
      // Try to parse as JSON
      parsedContent = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));
    } catch (e) {
      // If not valid JSON, try to extract JSON from text
      const textContent = typeof content === 'string' ? content : JSON.stringify(content);
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedContent = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse Claude response as JSON");
      }
    }

    const body = parsedContent.body || "";
    const hashtags = parsedContent.hashtags || [];

    // Validate content length
    const totalLength = body.length + hashtags.join(" ").length;
    if (totalLength > specs.maxLength) {
      console.warn(
        `[ContentGen] Generated content exceeds ${platform} limit: ${totalLength}/${specs.maxLength}`
      );
    }

    return {
      body,
      hashtags,
      imageUrl: null, // Will be populated by image generation if requested
      platform,
      characterCount: totalLength,
      estimatedReadTime: Math.ceil(body.split(" ").length / 200), // ~200 words per minute
    };
  } catch (error) {
    console.error("[ContentGen] Claude API error:", error);
    throw new Error(`Content generation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Generate image using DALL-E
 * Falls back gracefully if OpenAI API key is not configured
 */
export async function generateImage(
  prompt: string,
  style: string = "natural"
): Promise<string | null> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("[ContentGen] OpenAI API key not configured, skipping image generation");
    return null;
  }

  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: `${prompt}. Style: ${style}. High quality, professional, suitable for social media.`,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    return response.data?.[0]?.url || null;
  } catch (error) {
    console.error("[ContentGen] DALL-E API error:", error);
    // Don't throw - image generation is optional
    return null;
  }
}

/**
 * Enhance existing text using Claude Haiku (cost-effective)
 */
export async function enhanceText(
  text: string,
  instructions: string = "Improve clarity and engagement"
): Promise<string> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a text enhancement assistant. Improve text clarity and engagement while maintaining the original meaning and tone.",
        },
        {
          role: "user",
          content: `${instructions}

Original text:
${text}

Return only the enhanced text, no explanations or formatting.`,
        },
      ],
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from Claude");
    }

    return (typeof content === 'string' ? content : JSON.stringify(content)).trim();
  } catch (error) {
    console.error("[ContentGen] Text enhancement failed:", error);
    // Fall back to original text
    return text;
  }
}

/**
 * Validate generated content quality
 */
export function validateContent(content: GeneratedContent): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const specs = PLATFORM_SPECS[content.platform as keyof typeof PLATFORM_SPECS];

  if (!specs) {
    issues.push(`Unknown platform: ${content.platform}`);
    return { isValid: false, issues };
  }

  // Check length
  if (content.characterCount > specs.maxLength) {
    issues.push(
      `Content exceeds ${content.platform} limit: ${content.characterCount}/${specs.maxLength} characters`
    );
  }

  // Check hashtags
  if (content.hashtags && content.hashtags.length > specs.hashtagLimit) {
    issues.push(
      `Too many hashtags: ${content.hashtags.length}/${specs.hashtagLimit}`
    );
  }

  // Check for empty content
  if (!content.body || content.body.trim().length === 0) {
    issues.push("Content body is empty");
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Generate content with image (full pipeline)
 */
export async function generateContentWithImage(
  request: ContentGenerationRequest
): Promise<GeneratedContent> {
  // Generate text content
  const content = await generateContent(request);

  // Generate image if requested
  if (request.includeImage) {
    const imagePrompt = request.imageStyle
      ? `${request.topic}. ${request.imageStyle}`
      : request.topic;

    const imageUrl = await generateImage(imagePrompt, request.imageStyle);
    content.imageUrl = imageUrl;
    content.imagePrompt = imagePrompt;
  }

  return content;
}
