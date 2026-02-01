import { eq, and, desc, gte, lte, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { 
  InsertUser, 
  users, 
  contentItems,
  nicheProfiles,
  socialAccounts,
  scheduledPosts,
  subscriptions,
  usageRecords,
  postAnalytics,
  invoices,
  generationJobs,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { invokeLLM } from "./_core/llm";
import { generateImage } from "./_core/imageGeneration";
import { addContentGenerationJob, addNicheAnalysisJob, getJobStatus } from "./services/job-queue";
import type { ContentGenerationRequest } from "./services/content-generation";
import type { NicheAnalysisRequest } from "./services/niche-intelligence";

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: Pool | null = null;

// Reset database connection (for testing)
export function resetDb() {
  if (_pool) {
    _pool.end().catch(console.error);
  }
  _db = null;
  _pool = null;
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // Always use SSL for Neon PostgreSQL
      const useSSL = process.env.DATABASE_URL.includes('neon.tech') || 
                     process.env.DATABASE_URL.includes('amazonaws.com') ||
                     process.env.NODE_ENV === 'production';
      
      _pool = new Pool({ 
        connectionString: process.env.DATABASE_URL,
        ssl: useSSL ? { rejectUnauthorized: false } : false
      });
      _db = drizzle(_pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============================================================================
// USER FUNCTIONS
// ============================================================================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserProfile(userId: number, data: { name?: string; avatarUrl?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users).set({
    ...data,
    updatedAt: new Date(),
  }).where(eq(users.id, userId));

  return { success: true };
}

// ============================================================================
// CONTENT FUNCTIONS
// ============================================================================

export async function getContentItems(
  userId: number, 
  options: { status?: string; limit: number; offset: number }
) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user[0]) return { items: [], total: 0 };

  const conditions = [eq(contentItems.userId, userId)];
  if (options.status) {
    conditions.push(eq(contentItems.status, options.status as any));
  }

  const items = await db
    .select()
    .from(contentItems)
    .where(and(...conditions))
    .orderBy(desc(contentItems.createdAt))
    .limit(options.limit)
    .offset(options.offset);

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(contentItems)
    .where(and(...conditions));

  return { items, total: countResult[0]?.count || 0 };
}

export async function getContentItem(userId: number, id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(contentItems)
    .where(and(eq(contentItems.id, id), eq(contentItems.userId, userId)))
    .limit(1);

  return result[0] || null;
}

export async function createContentItem(userId: number, data: {
  type: "post" | "image" | "video" | "story" | "reel";
  content?: string;
  caption?: string;
  hashtags?: string[];
  platforms: string[];
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const tenantId = user[0]?.tenantId || 1;

  const result = await db.insert(contentItems).values({
    
    userId,
    contentType: data.type || "text",
    platform: data.platforms?.[0] || "instagram",
    status: "draft",
    body: data.content || data.caption || "",
    hashtags: data.hashtags,
  }).returning({ id: contentItems.id });

  return { id: result[0].id, success: true };
}

export async function updateContentItem(userId: number, id: number, data: {
  content?: string;
  caption?: string;
  hashtags?: string[];
  platforms?: string[];
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(contentItems).set({
    ...data,
    updatedAt: new Date(),
  }).where(and(eq(contentItems.id, id), eq(contentItems.userId, userId)));

  return { success: true };
}

export async function approveContentItem(userId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(contentItems).set({
    status: "approved",
    approvedBy: userId,
    approvedAt: new Date(),
    updatedAt: new Date(),
  }).where(and(eq(contentItems.id, id), eq(contentItems.userId, userId)));

  return { success: true };
}

export async function batchApproveContentItems(userId: number, ids: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(contentItems).set({
    status: "approved",
    approvedBy: userId,
    approvedAt: new Date(),
    updatedAt: new Date(),
  }).where(and(inArray(contentItems.id, ids), eq(contentItems.userId, userId)));

  return { success: true, count: ids.length };
}

export async function rejectContentItem(userId: number, id: number, reason?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(contentItems).set({
    status: "draft",
    updatedAt: new Date(),
  }).where(and(eq(contentItems.id, id), eq(contentItems.userId, userId)));

  return { success: true };
}

export async function deleteContentItem(userId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(contentItems).where(and(eq(contentItems.id, id), eq(contentItems.userId, userId)));

  return { success: true };
}

export async function generateContent(userId: number, data: {
  topic: string;
  platforms: string[];
  tone: string;
  includeImage: boolean;
  imageStyle?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const tenantId = user[0]?.tenantId || 1;

  // Get niche profile for context
  const nicheProfile = await db
    .select()
    .from(nicheProfiles)
    .where(eq(nicheProfiles.userId, userId))
    .limit(1);

  const brandContext = nicheProfile[0] ? `
    Industry: ${nicheProfile[0].industry || "General"}
    Brand Voice: ${JSON.stringify(nicheProfile[0].brandVoice || {})}
    Target Audience: ${JSON.stringify(nicheProfile[0].targetAudience || {})}
  ` : "";

  // Generate content with Claude
  const platformInstructions = data.platforms.map(p => {
    switch (p) {
      case "twitter": return "Twitter/X: Max 280 characters, engaging, use 1-2 hashtags";
      case "instagram": return "Instagram: Visual-focused caption, 5-10 relevant hashtags";
      case "facebook": return "Facebook: Conversational, can be longer, 1-3 hashtags";
      case "linkedin": return "LinkedIn: Professional tone, industry insights, 3-5 hashtags";
      case "tiktok": return "TikTok: Trendy, casual, use trending hashtags";
      default: return "";
    }
  }).join("\n");

  const prompt = `Generate social media content for the following topic: "${data.topic}"

Tone: ${data.tone}
${brandContext}

Platform requirements:
${platformInstructions}

Return a JSON object with the following structure:
{
  "content": "Main post content (universal version)",
  "caption": "Caption/description",
  "hashtags": ["hashtag1", "hashtag2", ...],
  "platformVariants": {
    "twitter": "Twitter-optimized version",
    "instagram": "Instagram-optimized version",
    "facebook": "Facebook-optimized version",
    "linkedin": "LinkedIn-optimized version",
    "tiktok": "TikTok-optimized version"
  }
}`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are a professional social media content creator. Generate engaging, platform-optimized content." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
  });

  const messageContent = response.choices[0].message.content;
  const generatedContent = JSON.parse(typeof messageContent === 'string' ? messageContent : "{}");

  // Generate image if requested
  let imageUrl: string | undefined;
  if (data.includeImage) {
    const imagePrompt = data.imageStyle 
      ? `${data.topic}, ${data.imageStyle}`
      : `Professional image for social media post about: ${data.topic}`;
    
    try {
      const imageResult = await generateImage({ prompt: imagePrompt });
      imageUrl = imageResult.url;
    } catch (error) {
      console.error("[Content] Image generation failed:", error);
    }
  }

  // Save content item
  const result = await db.insert(contentItems).values({
    userId,
    contentType: "text",
    platform: data.platforms?.[0] || "instagram",
    status: "pending_approval",
    body: generatedContent.content || generatedContent.caption || "",
    hashtags: generatedContent.hashtags,
    imageUrl: imageUrl || null,
    aiModel: "claude-sonnet",
    prompt: prompt,
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

  return {
    id: result[0].id,
    content: generatedContent,
    imageUrl,
    success: true,
  };
}

// ============================================================================
// NICHE PROFILE FUNCTIONS
// ============================================================================

export async function getNicheProfile(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(nicheProfiles)
    .where(eq(nicheProfiles.userId, userId))
    .limit(1);

  return result[0] || null;
}

export async function analyzeWebsite(userId: number, websiteUrl: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const tenantId = user[0]?.tenantId || 1;

  // Create or update niche profile with pending status
  const existing = await db
    .select()
    .from(nicheProfiles)
    .where(eq(nicheProfiles.userId, userId))
    .limit(1);

  let profileId: number;
  if (existing[0]) {
    profileId = existing[0].id;
    await db.update(nicheProfiles).set({
      websiteUrl,
      updatedAt: new Date(),
    }).where(eq(nicheProfiles.id, profileId));
  } else {
    const result = await db.insert(nicheProfiles).values({
      userId,
      websiteUrl,
    }).returning({ id: nicheProfiles.id });
    profileId = result[0].id;
  }

  // Use Niche Intelligence service for comprehensive analysis
  const { analyzeNiche } = await import("./services/niche-intelligence");
  
  try {
    const analysis = await analyzeNiche({ websiteUrl, deepScrape: false });

    // Update profile with analysis results
    await db.update(nicheProfiles).set({
      industry: analysis.industry,
      brandVoice: analysis.brandVoice,
      targetAudience: analysis.targetAudience,
      competitors: analysis.competitors,
      keywords: analysis.keywords,
      postingFrequency: analysis.contentStrategy?.frequency || 3,
      // analysisStatus: "completed",
      lastAnalyzedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(nicheProfiles.id, profileId));

    // Record usage
    const billingPeriodStart = new Date();
    billingPeriodStart.setDate(1);
    const billingPeriodEnd = new Date(billingPeriodStart);
    billingPeriodEnd.setMonth(billingPeriodEnd.getMonth() + 1);
    
    await db.insert(usageRecords).values({
      userId,
      usageType: "analysis_run",
      quantity: 1,
      billingPeriodStart,
      billingPeriodEnd,
    });

    return { success: true, analysis };
  } catch (error) {
    await db.update(nicheProfiles).set({
      // analysisStatus: "failed",
      updatedAt: new Date(),
    }).where(eq(nicheProfiles.id, profileId));

    throw error;
  }
}

export async function updateNicheProfile(userId: number, data: {
  industry?: string;
  brandVoice?: object;
  targetAudience?: object;
  postingFrequency?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(nicheProfiles).set({
    ...data,
    updatedAt: new Date(),
  }).where(eq(nicheProfiles.userId, userId));

  return { success: true };
}

export async function toggleAutopilot(userId: number, enabled: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(nicheProfiles).set({
    autopilotEnabled: enabled,
    updatedAt: new Date(),
  }).where(eq(nicheProfiles.userId, userId));

  return { success: true, autopilotEnabled: enabled };
}

// ============================================================================
// SOCIAL ACCOUNT FUNCTIONS
// ============================================================================

export async function getSocialAccounts(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      id: socialAccounts.id,
      platform: socialAccounts.platform,
      accountName: socialAccounts.accountName,
      isActive: socialAccounts.isActive,
      lastSyncedAt: socialAccounts.lastSyncedAt,
    })
    .from(socialAccounts)
    .where(eq(socialAccounts.userId, userId));
}

export async function getSocialOAuthUrl(userId: number, platform: string) {
  // OAuth URLs for each platform
  const oauthConfigs: Record<string, { authUrl: string; scopes: string[] }> = {
    facebook: {
      authUrl: "https://www.facebook.com/v18.0/dialog/oauth",
      scopes: ["pages_manage_posts", "pages_read_engagement", "instagram_basic", "instagram_content_publish"],
    },
    instagram: {
      authUrl: "https://api.instagram.com/oauth/authorize",
      scopes: ["user_profile", "user_media"],
    },
    twitter: {
      authUrl: "https://twitter.com/i/oauth2/authorize",
      scopes: ["tweet.read", "tweet.write", "users.read", "offline.access"],
    },
    linkedin: {
      authUrl: "https://www.linkedin.com/oauth/v2/authorization",
      scopes: ["r_liteprofile", "w_member_social"],
    },
    tiktok: {
      authUrl: "https://www.tiktok.com/auth/authorize/",
      scopes: ["user.info.basic", "video.publish"],
    },
  };

  const config = oauthConfigs[platform];
  if (!config) {
    return { error: "Unsupported platform" };
  }

  // In production, these would come from environment variables
  const clientId = process.env[`${platform.toUpperCase()}_CLIENT_ID`] || "";
  const redirectUri = `${process.env.EXPO_PUBLIC_API_BASE_URL}/oauth/${platform}/callback`;
  const state = `${userId}_${Date.now()}`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: config.scopes.join(" "),
    response_type: "code",
    state,
  });

  return { url: `${config.authUrl}?${params.toString()}`, state };
}

export async function completeSocialOAuth(userId: number, data: {
  platform: string;
  code: string;
  state?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const tenantId = user[0]?.tenantId || 1;

  // In production, exchange code for tokens using platform-specific OAuth flow
  // For now, create a placeholder account
  const result = await db.insert(socialAccounts).values({
    userId,
    platform: data.platform as any,
    accountName: `${data.platform} Account`,
    accountId: `${data.platform}_${userId}`,
    accessToken: "placeholder_token",
    isActive: true,
  }).returning({ id: socialAccounts.id });

  return { success: true, accountId: result[0].id };
}

export async function disconnectSocialAccount(userId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(socialAccounts).where(
    and(eq(socialAccounts.id, id), eq(socialAccounts.userId, userId))
  );

  return { success: true };
}

export async function refreshSocialToken(userId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // In production, refresh the OAuth token using the refresh token
  await db.update(socialAccounts).set({
    lastSyncedAt: new Date(),
    updatedAt: new Date(),
  }).where(and(eq(socialAccounts.id, id), eq(socialAccounts.userId, userId)));

  return { success: true };
}

// ============================================================================
// SCHEDULING FUNCTIONS
// ============================================================================

export async function getScheduledPosts(userId: number, options: {
  status?: string;
  startDate?: string;
  endDate?: string;
  limit: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(scheduledPosts.userId, userId)];
  
  if (options.status) {
    conditions.push(eq(scheduledPosts.status, options.status as any));
  }
  if (options.startDate) {
    conditions.push(gte(scheduledPosts.scheduledFor, new Date(options.startDate)));
  }
  if (options.endDate) {
    conditions.push(lte(scheduledPosts.scheduledFor, new Date(options.endDate)));
  }

  return db
    .select()
    .from(scheduledPosts)
    .where(and(...conditions))
    .orderBy(scheduledPosts.scheduledFor)
    .limit(options.limit);
}

export async function schedulePost(userId: number, data: {
  contentItemId: number;
  socialAccountId: number;
  scheduledFor: string;
  timezone: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const tenantId = user[0]?.tenantId || 1;

  // Get content item to determine platform
  const content = await db
    .select()
    .from(contentItems)
    .where(eq(contentItems.id, data.contentItemId))
    .limit(1);

  if (!content[0]) {
    throw new Error("Content item not found");
  }

  // Get social account to determine platform
  const account = await db
    .select()
    .from(socialAccounts)
    .where(eq(socialAccounts.id, data.socialAccountId))
    .limit(1);

  if (!account[0]) {
    throw new Error("Social account not found");
  }

  const result = await db.insert(scheduledPosts).values({
    contentItemId: data.contentItemId,
    userId,
    platform: account[0].platform,
    socialAccountId: data.socialAccountId,
    scheduledFor: new Date(data.scheduledFor),
    status: "scheduled",
  }).returning({ id: scheduledPosts.id });

  // Update content item status
  await db.update(contentItems).set({
    status: "scheduled",
    scheduledFor: new Date(data.scheduledFor),
    updatedAt: new Date(),
  }).where(eq(contentItems.id, data.contentItemId));

  return { success: true, id: result[0].id };
}

export async function cancelScheduledPost(userId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const post = await db
    .select()
    .from(scheduledPosts)
    .where(and(eq(scheduledPosts.id, id), eq(scheduledPosts.userId, userId)))
    .limit(1);

  if (!post[0]) {
    throw new Error("Scheduled post not found");
  }

  await db.update(scheduledPosts).set({
    status: "canceled",
    updatedAt: new Date(),
  }).where(eq(scheduledPosts.id, id));

  // Update content item status back to approved
  await db.update(contentItems).set({
    status: "approved",
    scheduledFor: null,
    updatedAt: new Date(),
  }).where(eq(contentItems.id, post[0].contentItemId));

  return { success: true };
}

export async function reschedulePost(userId: number, id: number, scheduledFor: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(scheduledPosts).set({
    scheduledFor: new Date(scheduledFor),
    updatedAt: new Date(),
  }).where(and(eq(scheduledPosts.id, id), eq(scheduledPosts.userId, userId)));

  return { success: true };
}

// ============================================================================
// BILLING FUNCTIONS
// ============================================================================

export async function getSubscription(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  return result[0] || { tier: "free", status: "active" };
}

export async function getUsage(userId: number) {
  const db = await getDb();
  if (!db) return { postsGenerated: 0, postsPublished: 0, imagesGenerated: 0 };

  const currentPeriod = new Date().toISOString().slice(0, 7);

  const usage = await db
    .select({
      type: usageRecords.usageType,
      total: sql<number>`sum(${usageRecords.quantity})`,
    })
    .from(usageRecords)
    .where(and(
      eq(usageRecords.userId, userId),
      gte(usageRecords.billingPeriodStart, new Date(currentPeriod))
    ))
    .groupBy(usageRecords.usageType);

  const usageMap = usage.reduce((acc, u) => {
    acc[u.type] = u.total;
    return acc;
  }, {} as Record<string, number>);

  return {
    postsGenerated: usageMap.post_generated || 0,
    postsPublished: usageMap.post_published || 0,
    imagesGenerated: usageMap.image_generated || 0,
    analysisRuns: usageMap.analysis_run || 0,
  };
}

export async function getStripeCheckoutUrl(userId: number, tier: string) {
  // In production, create a Stripe checkout session
  const stripeCheckoutUrl = process.env.STRIPE_CHECKOUT_URL || "https://checkout.stripe.com";
  return { url: `${stripeCheckoutUrl}?tier=${tier}&user=${userId}` };
}

export async function getStripePortalUrl(userId: number) {
  // In production, create a Stripe billing portal session
  const stripePortalUrl = process.env.STRIPE_PORTAL_URL || "https://billing.stripe.com";
  return { url: `${stripePortalUrl}?user=${userId}` };
}

export async function getInvoices(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(invoices)
    .where(eq(invoices.userId, userId))
    .orderBy(desc(invoices.createdAt))
    .limit(20);
}

// ============================================================================
// ANALYTICS FUNCTIONS
// ============================================================================

export async function getPostAnalytics(userId: number, scheduledPostId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(postAnalytics)
    .where(eq(postAnalytics.scheduledPostId, scheduledPostId))
    .orderBy(desc(postAnalytics.lastFetchedAt))
    .limit(1);

  return result[0] || null;
}

export async function getDashboardAnalytics(userId: number, options: {
  startDate?: string;
  endDate?: string;
}) {
  const db = await getDb();
  if (!db) return {
    totalPosts: 0,
    totalEngagement: 0,
    averageEngagementRate: 0,
    platformBreakdown: {},
  };

  const conditions: any[] = []; // Filter by user's posts via scheduledPostId join if needed

  if (options.startDate) {
    conditions.push(gte(postAnalytics.lastFetchedAt, new Date(options.startDate)));
  }
  if (options.endDate) {
    conditions.push(lte(postAnalytics.lastFetchedAt, new Date(options.endDate)));
  }

  const analytics = await db
    .select({
      platform: postAnalytics.platform,
      totalLikes: sql<number>`sum(${postAnalytics.likes})`,
      totalComments: sql<number>`sum(${postAnalytics.comments})`,
      totalShares: sql<number>`sum(${postAnalytics.shares})`,
      totalImpressions: sql<number>`sum(${postAnalytics.impressions})`,
      postCount: sql<number>`count(*)`,
    })
    .from(postAnalytics)
    .where(and(...conditions))
    .groupBy(postAnalytics.platform);

  const platformBreakdown = analytics.reduce((acc, a) => {
    acc[a.platform] = {
      likes: a.totalLikes || 0,
      comments: a.totalComments || 0,
      shares: a.totalShares || 0,
      impressions: a.totalImpressions || 0,
      posts: a.postCount || 0,
    };
    return acc;
  }, {} as Record<string, any>);

  const totals = analytics.reduce((acc, a) => {
    acc.likes += a.totalLikes || 0;
    acc.comments += a.totalComments || 0;
    acc.shares += a.totalShares || 0;
    acc.posts += a.postCount || 0;
    return acc;
  }, { likes: 0, comments: 0, shares: 0, posts: 0 });

  return {
    totalPosts: totals.posts,
    totalEngagement: totals.likes + totals.comments + totals.shares,
    averageEngagementRate: totals.posts > 0 
      ? (totals.likes + totals.comments + totals.shares) / totals.posts 
      : 0,
    platformBreakdown,
  };
}
