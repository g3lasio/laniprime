/**
 * Content Generation Database Functions
 * 
 * Improved implementation using job queue system
 */

import { eq, and, desc } from "drizzle-orm";
import { getDb } from "./db";
import { contentItems, nicheProfiles, usageRecords } from "../drizzle/schema";
import { addContentGenerationJob } from "./services/job-queue";
import type { ContentGenerationRequest } from "./services/content-generation";

/**
 * Generate content (async with job queue)
 */
export async function generateContentAsync(userId: number, data: {
  topic: string;
  tone?: "professional" | "casual" | "friendly" | "humorous" | "inspirational";
  platform: "instagram" | "facebook" | "twitter" | "linkedin" | "tiktok";
  includeImage?: boolean;
  imageStyle?: string;
}): Promise<{ jobId: string; status: string; contentId?: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  // Get niche profile for context
  const nicheProfile = await db
    .select()
    .from(nicheProfiles)
    .where(eq(nicheProfiles.userId, userId))
    .limit(1);

  // Prepare request
  const request: ContentGenerationRequest = {
    topic: data.topic,
    platform: data.platform,
    tone: data.tone || "professional",
    includeImage: data.includeImage || false,
    imageStyle: data.imageStyle,
    nicheContext: nicheProfile[0] ? {
      industry: nicheProfile[0].industry || undefined,
      brandVoice: nicheProfile[0].brandVoice as any,
      keywords: (nicheProfile[0].keywords as string[]) || [],
      targetAudience: nicheProfile[0].targetAudience as any,
    } : undefined,
  };

  // Queue job
  const job = await addContentGenerationJob(request);

  // If result is available (direct execution), save it immediately
  if (job.result) {
    const contentId = await saveGeneratedContent(userId, {
      body: job.result.body,
      hashtags: job.result.hashtags,
      imageUrl: job.result.imageUrl,
      platform: data.platform,
    });
    return {
      jobId: job.jobId,
      status: "completed",
      contentId,
    };
  }

  return {
    jobId: job.jobId,
    status: "queued",
  };
}

/**
 * Save generated content to database
 */
export async function saveGeneratedContent(
  userId: number,
  content: {
    body: string;
    hashtags?: string[];
    imageUrl?: string | null;
    platform: string;
  }
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  const result = await db.insert(contentItems).values({
    userId,
    contentType: "text",
    platform: content.platform,
    status: "pending_approval",
    body: content.body,
    hashtags: content.hashtags || [],
    imageUrl: content.imageUrl || null,
    aiModel: "claude-sonnet-4",
    prompt: `Generated content for ${content.platform}`,
  }).returning({ id: contentItems.id });

  // Record usage
  const billingPeriodStart = new Date();
  billingPeriodStart.setDate(1);
  const billingPeriodEnd = new Date(billingPeriodStart);
  billingPeriodEnd.setMonth(billingPeriodEnd.getMonth() + 1);
  
  await db.insert(usageRecords).values({
    userId,
    usageType: "post_generated",
    quantity: 1,
    billingPeriodStart,
    billingPeriodEnd,
  });

  return result[0].id;
}

/**
 * Get content items for user
 */
export async function getContentItems(userId: number, filters?: {
  status?: string;
  platform?: string;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  // Build where conditions
  const conditions = [eq(contentItems.userId, userId)];
  
  if (filters?.status) {
    conditions.push(eq(contentItems.status, filters.status as any));
  }
  
  if (filters?.platform) {
    conditions.push(eq(contentItems.platform, filters.platform));
  }

  const baseQuery = db
    .select()
    .from(contentItems)
    .where(and(...conditions))
    .orderBy(desc(contentItems.createdAt));

  if (filters?.limit) {
    return baseQuery.limit(filters.limit);
  }

  return baseQuery;
}

/**
 * Approve content item
 */
export async function approveContent(userId: number, contentItemId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  await db
    .update(contentItems)
    .set({
      status: "approved",
      approvedAt: new Date(),
    })
    .where(and(
      eq(contentItems.id, contentItemId),
      eq(contentItems.userId, userId)
    ));

  return { success: true };
}

/**
 * Reject content item
 */
export async function rejectContent(userId: number, contentItemId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  await db
    .update(contentItems)
    .set({
      status: "draft" as const,
    })
    .where(and(
      eq(contentItems.id, contentItemId),
      eq(contentItems.userId, userId)
    ));

  return { success: true };
}

/**
 * Delete content item
 */
export async function deleteContent(userId: number, contentItemId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  await db
    .delete(contentItems)
    .where(and(
      eq(contentItems.id, contentItemId),
      eq(contentItems.userId, userId)
    ));

  return { success: true };
}
