import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  json,
  decimal,
  bigint,
} from "drizzle-orm/mysql-core";

// ============================================================================
// USER & AUTHENTICATION
// ============================================================================

/**
 * Users table - Core user entity with phone-based authentication
 * Supports Twilio OTP and multi-tenant architecture
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  // Manus OAuth identifier (kept for compatibility)
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  // Phone-based authentication (Twilio OTP)
  phoneNumber: varchar("phoneNumber", { length: 20 }).unique(),
  phoneVerified: boolean("phoneVerified").default(false).notNull(),
  // User profile
  name: text("name"),
  email: varchar("email", { length: 320 }),
  avatarUrl: text("avatarUrl"),
  // Authentication
  loginMethod: varchar("loginMethod", { length: 64 }),
  lastOtpSentAt: timestamp("lastOtpSentAt"),
  // Multi-tenancy
  tenantId: int("tenantId"),
  // Role-based access control
  role: mysqlEnum("role", ["user", "admin", "partner"]).default("user").notNull(),
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * OTP Verification table - Stores OTP codes for phone verification
 */
export const otpVerifications = mysqlTable("otp_verifications", {
  id: int("id").autoincrement().primaryKey(),
  phoneNumber: varchar("phoneNumber", { length: 20 }).notNull(),
  // OTP code (hashed for security)
  codeHash: varchar("codeHash", { length: 128 }).notNull(),
  // Verification state
  expiresAt: timestamp("expiresAt").notNull(),
  attempts: int("attempts").default(0).notNull(),
  verified: boolean("verified").default(false).notNull(),
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OtpVerification = typeof otpVerifications.$inferSelect;
export type InsertOtpVerification = typeof otpVerifications.$inferInsert;

// ============================================================================
// MULTI-TENANCY
// ============================================================================

/**
 * Tenants table - Multi-tenant support for white-label
 */
export const tenants = mysqlTable("tenants", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  // White-label configuration
  whiteLabel: boolean("whiteLabel").default(false).notNull(),
  brandName: varchar("brandName", { length: 255 }),
  brandLogoUrl: text("brandLogoUrl"),
  brandPrimaryColor: varchar("brandPrimaryColor", { length: 7 }),
  // Subscription
  subscriptionTier: mysqlEnum("subscriptionTier", ["free", "pro", "enterprise"]).default("free").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;

// ============================================================================
// NICHE INTELLIGENCE
// ============================================================================

/**
 * Niche Profiles table - Stores website analysis and content strategy
 */
export const nicheProfiles = mysqlTable("niche_profiles", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  userId: int("userId").notNull(),
  // Website analysis
  websiteUrl: varchar("websiteUrl", { length: 2048 }),
  industry: varchar("industry", { length: 255 }),
  // Extracted data (JSON for flexibility)
  brandVoice: json("brandVoice"),
  targetAudience: json("targetAudience"),
  competitors: json("competitors"),
  keywords: json("keywords"),
  // Content strategy
  contentStrategy: json("contentStrategy"),
  postingFrequency: int("postingFrequency").default(3), // posts per day
  // Autopilot configuration
  autopilotEnabled: boolean("autopilotEnabled").default(false).notNull(),
  autopilotConfig: json("autopilotConfig"),
  // Analysis metadata
  lastAnalyzedAt: timestamp("lastAnalyzedAt"),
  analysisStatus: mysqlEnum("analysisStatus", ["pending", "analyzing", "completed", "failed"]).default("pending"),
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NicheProfile = typeof nicheProfiles.$inferSelect;
export type InsertNicheProfile = typeof nicheProfiles.$inferInsert;

// ============================================================================
// CONTENT MANAGEMENT
// ============================================================================

/**
 * Content Items table - Generated content pieces
 */
export const contentItems = mysqlTable("content_items", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  userId: int("userId").notNull(),
  // Content type and status
  type: mysqlEnum("type", ["post", "image", "video", "story", "reel"]).default("post").notNull(),
  status: mysqlEnum("status", ["draft", "pending", "approved", "scheduled", "publishing", "published", "failed"]).default("draft").notNull(),
  // Content data
  content: text("content"),
  caption: text("caption"),
  hashtags: json("hashtags"),
  // Media
  mediaUrls: json("mediaUrls"),
  thumbnailUrl: text("thumbnailUrl"),
  // Target platforms
  platforms: json("platforms"), // ["facebook", "instagram", "twitter", "linkedin", "tiktok"]
  // AI generation metadata
  aiModel: varchar("aiModel", { length: 64 }),
  aiPrompt: text("aiPrompt"),
  generationCost: decimal("generationCost", { precision: 10, scale: 6 }),
  // Scheduling
  scheduledAt: timestamp("scheduledAt"),
  publishedAt: timestamp("publishedAt"),
  // Approval workflow
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  rejectedBy: int("rejectedBy"),
  rejectedAt: timestamp("rejectedAt"),
  rejectionReason: text("rejectionReason"),
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContentItem = typeof contentItems.$inferSelect;
export type InsertContentItem = typeof contentItems.$inferInsert;

/**
 * Generation Jobs table - Background AI generation tasks
 */
export const generationJobs = mysqlTable("generation_jobs", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  userId: int("userId").notNull(),
  // Job type and status
  type: mysqlEnum("type", ["content", "image", "analysis", "enhancement"]).notNull(),
  status: mysqlEnum("status", ["queued", "processing", "completed", "failed"]).default("queued").notNull(),
  // Job data
  input: json("input"),
  output: json("output"),
  error: text("error"),
  // AI metadata
  aiModel: varchar("aiModel", { length: 64 }),
  cost: decimal("cost", { precision: 10, scale: 6 }),
  // Progress tracking
  progress: int("progress").default(0),
  // Timing
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GenerationJob = typeof generationJobs.$inferSelect;
export type InsertGenerationJob = typeof generationJobs.$inferInsert;

// ============================================================================
// NATIVE SCHEDULING
// ============================================================================

/**
 * Social Accounts table - Connected social media accounts
 */
export const socialAccounts = mysqlTable("social_accounts", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  userId: int("userId").notNull(),
  // Platform info
  platform: mysqlEnum("platform", ["facebook", "instagram", "twitter", "linkedin", "tiktok"]).notNull(),
  accountName: varchar("accountName", { length: 255 }),
  accountId: varchar("accountId", { length: 255 }), // Platform-specific ID
  accountType: mysqlEnum("accountType", ["profile", "page", "business"]).default("profile"),
  avatarUrl: text("avatarUrl"),
  // OAuth tokens (encrypted in application layer)
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  tokenExpiresAt: timestamp("tokenExpiresAt"),
  scope: json("scope"), // OAuth scopes granted
  // Status
  isActive: boolean("isActive").default(true).notNull(),
  lastSyncAt: timestamp("lastSyncAt"),
  lastError: text("lastError"),
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SocialAccount = typeof socialAccounts.$inferSelect;
export type InsertSocialAccount = typeof socialAccounts.$inferInsert;

/**
 * Scheduled Posts table - Posts scheduled for publishing
 */
export const scheduledPosts = mysqlTable("scheduled_posts", {
  id: int("id").autoincrement().primaryKey(),
  contentItemId: int("contentItemId").notNull(),
  tenantId: int("tenantId").notNull(),
  userId: int("userId").notNull(),
  // Platform and account
  platform: mysqlEnum("platform", ["facebook", "instagram", "twitter", "linkedin", "tiktok"]).notNull(),
  socialAccountId: int("socialAccountId").notNull(),
  // Scheduling
  scheduledAt: timestamp("scheduledAt").notNull(),
  timezone: varchar("timezone", { length: 64 }).default("UTC"),
  // Publishing status
  status: mysqlEnum("status", ["scheduled", "publishing", "published", "failed", "cancelled"]).default("scheduled").notNull(),
  publishedAt: timestamp("publishedAt"),
  // External reference
  externalPostId: varchar("externalPostId", { length: 255 }), // Platform-specific post ID
  externalPostUrl: text("externalPostUrl"),
  // Error handling
  error: text("error"),
  retryCount: int("retryCount").default(0),
  lastRetryAt: timestamp("lastRetryAt"),
  maxRetries: int("maxRetries").default(3),
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ScheduledPost = typeof scheduledPosts.$inferSelect;
export type InsertScheduledPost = typeof scheduledPosts.$inferInsert;

/**
 * Platform Rate Limits table - Track API rate limits per platform
 */
export const platformRateLimits = mysqlTable("platform_rate_limits", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  socialAccountId: int("socialAccountId").notNull(),
  platform: mysqlEnum("platform", ["facebook", "instagram", "twitter", "linkedin", "tiktok"]).notNull(),
  // Rate limit tracking
  endpoint: varchar("endpoint", { length: 255 }),
  requestsRemaining: int("requestsRemaining"),
  requestsLimit: int("requestsLimit"),
  resetAt: timestamp("resetAt"),
  // Timestamps
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PlatformRateLimit = typeof platformRateLimits.$inferSelect;
export type InsertPlatformRateLimit = typeof platformRateLimits.$inferInsert;

/**
 * Post Analytics table - Performance metrics for published posts
 */
export const postAnalytics = mysqlTable("post_analytics", {
  id: int("id").autoincrement().primaryKey(),
  scheduledPostId: int("scheduledPostId").notNull(),
  contentItemId: int("contentItemId").notNull(),
  tenantId: int("tenantId").notNull(),
  // Platform
  platform: mysqlEnum("platform", ["facebook", "instagram", "twitter", "linkedin", "tiktok"]).notNull(),
  // Engagement metrics
  likes: int("likes").default(0),
  comments: int("comments").default(0),
  shares: int("shares").default(0),
  saves: int("saves").default(0),
  views: int("views").default(0),
  impressions: int("impressions").default(0),
  reach: int("reach").default(0),
  clicks: int("clicks").default(0),
  // Calculated metrics
  engagementRate: decimal("engagementRate", { precision: 5, scale: 4 }),
  // Fetch metadata
  fetchedAt: timestamp("fetchedAt").defaultNow().notNull(),
  rawData: json("rawData"), // Store full API response
});

export type PostAnalytics = typeof postAnalytics.$inferSelect;
export type InsertPostAnalytics = typeof postAnalytics.$inferInsert;

// ============================================================================
// BILLING & SUBSCRIPTIONS
// ============================================================================

/**
 * Subscriptions table - Stripe subscription management
 */
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  userId: int("userId").notNull(),
  // Stripe references
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }).unique(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripePriceId: varchar("stripePriceId", { length: 255 }),
  // Subscription details
  tier: mysqlEnum("tier", ["free", "pro", "enterprise"]).default("free").notNull(),
  status: mysqlEnum("status", ["active", "canceled", "past_due", "trialing", "paused"]).default("active").notNull(),
  // Billing period
  currentPeriodStart: timestamp("currentPeriodStart"),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  cancelAtPeriodEnd: boolean("cancelAtPeriodEnd").default(false),
  canceledAt: timestamp("canceledAt"),
  // Trial
  trialStart: timestamp("trialStart"),
  trialEnd: timestamp("trialEnd"),
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

/**
 * Usage Records table - Track billable usage
 */
export const usageRecords = mysqlTable("usage_records", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  userId: int("userId").notNull(),
  subscriptionId: int("subscriptionId"),
  // Usage type
  type: mysqlEnum("type", [
    "post_generated",
    "post_published",
    "image_generated",
    "video_uploaded",
    "sms_sent",
    "analysis_run",
    "api_call"
  ]).notNull(),
  // Quantity and cost
  quantity: int("quantity").default(1).notNull(),
  unitCost: decimal("unitCost", { precision: 10, scale: 6 }),
  totalCost: decimal("totalCost", { precision: 10, scale: 6 }),
  // Billing period
  billingPeriod: varchar("billingPeriod", { length: 7 }), // YYYY-MM format
  // Reference
  referenceId: int("referenceId"), // ID of related entity (content_item, generation_job, etc.)
  referenceType: varchar("referenceType", { length: 64 }),
  // Stripe reporting
  stripeUsageRecordId: varchar("stripeUsageRecordId", { length: 255 }),
  reportedToStripe: boolean("reportedToStripe").default(false),
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UsageRecord = typeof usageRecords.$inferSelect;
export type InsertUsageRecord = typeof usageRecords.$inferInsert;

/**
 * Invoices table - Invoice history
 */
export const invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  userId: int("userId").notNull(),
  subscriptionId: int("subscriptionId"),
  // Stripe references
  stripeInvoiceId: varchar("stripeInvoiceId", { length: 255 }).unique(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  // Invoice details
  status: mysqlEnum("status", ["draft", "open", "paid", "void", "uncollectible"]).default("draft").notNull(),
  currency: varchar("currency", { length: 3 }).default("usd"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }),
  tax: decimal("tax", { precision: 10, scale: 2 }),
  total: decimal("total", { precision: 10, scale: 2 }),
  amountPaid: decimal("amountPaid", { precision: 10, scale: 2 }),
  amountDue: decimal("amountDue", { precision: 10, scale: 2 }),
  // Dates
  periodStart: timestamp("periodStart"),
  periodEnd: timestamp("periodEnd"),
  dueDate: timestamp("dueDate"),
  paidAt: timestamp("paidAt"),
  // PDF
  invoicePdfUrl: text("invoicePdfUrl"),
  hostedInvoiceUrl: text("hostedInvoiceUrl"),
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

// ============================================================================
// AUDIT & LOGGING
// ============================================================================

/**
 * Audit Logs table - Track important actions for security
 */
export const auditLogs = mysqlTable("audit_logs", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  tenantId: int("tenantId"),
  userId: int("userId"),
  // Action details
  action: varchar("action", { length: 64 }).notNull(),
  resource: varchar("resource", { length: 64 }),
  resourceId: int("resourceId"),
  // Request context
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  // Data
  oldData: json("oldData"),
  newData: json("newData"),
  metadata: json("metadata"),
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
