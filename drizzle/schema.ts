import { 
  serial,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
  boolean,
  json,
  numeric,
  bigint,
  integer,
} from "drizzle-orm/pg-core";

// ============================================================================
// ENUMS
// ============================================================================

export const roleEnum = pgEnum("role", ["user", "admin", "partner"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "canceled", "past_due", "trialing"]);
export const contentStatusEnum = pgEnum("content_status", ["draft", "pending_approval", "approved", "scheduled", "published", "failed"]);
export const jobStatusEnum = pgEnum("job_status", ["pending", "processing", "completed", "failed"]);
export const postStatusEnum = pgEnum("post_status", ["scheduled", "published", "failed", "canceled"]);

// ============================================================================
// USER & AUTHENTICATION
// ============================================================================

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("open_id", { length: 64 }).notNull().unique(),
  phoneNumber: varchar("phone_number", { length: 20 }).unique(),
  phoneVerified: boolean("phone_verified").default(false).notNull(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  avatarUrl: text("avatar_url"),
  loginMethod: varchar("login_method", { length: 64 }),
  lastOtpSentAt: timestamp("last_otp_sent_at"),
  tenantId: integer("tenant_id"),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const otpVerifications = pgTable("otp_verifications", {
  id: serial("id").primaryKey(),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
  codeHash: varchar("code_hash", { length: 128 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  verified: boolean("verified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type OtpVerification = typeof otpVerifications.$inferSelect;
export type InsertOtpVerification = typeof otpVerifications.$inferInsert;

// ============================================================================
// MULTI-TENANCY
// ============================================================================

export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  whiteLabel: boolean("white_label").default(false).notNull(),
  brandName: varchar("brand_name", { length: 255 }),
  brandLogo: text("brand_logo"),
  primaryColor: varchar("primary_color", { length: 7 }),
  customDomain: varchar("custom_domain", { length: 255 }),
  settings: json("settings"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;

// ============================================================================
// NICHE INTELLIGENCE
// ============================================================================

export const nicheProfiles = pgTable("niche_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  websiteUrl: text("website_url"),
  industry: varchar("industry", { length: 255 }),
  brandVoice: json("brand_voice"),
  targetAudience: json("target_audience"),
  contentThemes: json("content_themes"),
  keywords: json("keywords"),
  competitors: json("competitors"),
  postingFrequency: integer("posting_frequency").default(3),
  bestPostingTimes: json("best_posting_times"),
  autopilotEnabled: boolean("autopilot_enabled").default(false).notNull(),
  autopilotConfig: json("autopilot_config"),
  lastAnalyzedAt: timestamp("last_analyzed_at"),
  analysisData: json("analysis_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type NicheProfile = typeof nicheProfiles.$inferSelect;
export type InsertNicheProfile = typeof nicheProfiles.$inferInsert;

// ============================================================================
// CONTENT GENERATION
// ============================================================================

export const contentItems = pgTable("content_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  tenantId: integer("tenant_id"),
  title: varchar("title", { length: 500 }),
  body: text("body").notNull(),
  platform: varchar("platform", { length: 50 }).notNull(),
  contentType: varchar("content_type", { length: 50 }).default("text").notNull(),
  imageUrl: text("image_url"),
  imagePrompt: text("image_prompt"),
  videoUrl: text("video_url"),
  hashtags: json("hashtags"),
  mentions: json("mentions"),
  status: contentStatusEnum("status").default("draft").notNull(),
  generatedBy: varchar("generated_by", { length: 50 }).default("ai").notNull(),
  aiModel: varchar("ai_model", { length: 100 }),
  prompt: text("prompt"),
  tone: varchar("tone", { length: 50 }),
  targetAudience: varchar("target_audience", { length: 255 }),
  scheduledFor: timestamp("scheduled_for"),
  publishedAt: timestamp("published_at"),
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ContentItem = typeof contentItems.$inferSelect;
export type InsertContentItem = typeof contentItems.$inferInsert;

export const generationJobs = pgTable("generation_jobs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  contentItemId: integer("content_item_id"),
  jobType: varchar("job_type", { length: 50 }).notNull(),
  status: jobStatusEnum("status").default("pending").notNull(),
  priority: integer("priority").default(5).notNull(),
  prompt: text("prompt"),
  parameters: json("parameters"),
  result: json("result"),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0).notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type GenerationJob = typeof generationJobs.$inferSelect;
export type InsertGenerationJob = typeof generationJobs.$inferInsert;

// ============================================================================
// SOCIAL MEDIA SCHEDULING
// ============================================================================

export const socialAccounts = pgTable("social_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  platform: varchar("platform", { length: 50 }).notNull(),
  accountName: varchar("account_name", { length: 255 }).notNull(),
  accountId: varchar("account_id", { length: 255 }).notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  accountMetadata: json("account_metadata"),
  isActive: boolean("is_active").default(true).notNull(),
  lastSyncedAt: timestamp("last_synced_at"),
  syncError: text("sync_error"),
  permissions: json("permissions"),
  rateLimitRemaining: integer("rate_limit_remaining"),
  rateLimitResetAt: timestamp("rate_limit_reset_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type SocialAccount = typeof socialAccounts.$inferSelect;
export type InsertSocialAccount = typeof socialAccounts.$inferInsert;

export const scheduledPosts = pgTable("scheduled_posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  contentItemId: integer("content_item_id").notNull(),
  socialAccountId: integer("social_account_id").notNull(),
  platform: varchar("platform", { length: 50 }).notNull(),
  scheduledFor: timestamp("scheduled_for").notNull(),
  status: postStatusEnum("status").default("scheduled").notNull(),
  platformPostId: varchar("platform_post_id", { length: 255 }),
  platformPostUrl: text("platform_post_url"),
  publishedAt: timestamp("published_at"),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0).notNull(),
  lastRetryAt: timestamp("last_retry_at"),
  metadata: json("metadata"),
  analytics: json("analytics"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ScheduledPost = typeof scheduledPosts.$inferSelect;
export type InsertScheduledPost = typeof scheduledPosts.$inferInsert;

export const postAnalytics = pgTable("post_analytics", {
  id: serial("id").primaryKey(),
  scheduledPostId: integer("scheduled_post_id").notNull(),
  platform: varchar("platform", { length: 50 }).notNull(),
  impressions: bigint("impressions", { mode: "number" }).default(0).notNull(),
  reach: bigint("reach", { mode: "number" }).default(0).notNull(),
  likes: integer("likes").default(0).notNull(),
  comments: integer("comments").default(0).notNull(),
  shares: integer("shares").default(0).notNull(),
  clicks: integer("clicks").default(0).notNull(),
  saves: integer("saves").default(0).notNull(),
  engagementRate: numeric("engagement_rate", { precision: 5, scale: 2 }),
  rawData: json("raw_data"),
  lastFetchedAt: timestamp("last_fetched_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type PostAnalytics = typeof postAnalytics.$inferSelect;
export type InsertPostAnalytics = typeof postAnalytics.$inferInsert;

export const platformRateLimits = pgTable("platform_rate_limits", {
  id: serial("id").primaryKey(),
  platform: varchar("platform", { length: 50 }).notNull(),
  userId: integer("user_id").notNull(),
  endpoint: varchar("endpoint", { length: 255 }).notNull(),
  requestCount: integer("request_count").default(0).notNull(),
  resetAt: timestamp("reset_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type PlatformRateLimit = typeof platformRateLimits.$inferSelect;
export type InsertPlatformRateLimit = typeof platformRateLimits.$inferInsert;

// ============================================================================
// BILLING & SUBSCRIPTIONS
// ============================================================================

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }).notNull(),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }).notNull(),
  stripePriceId: varchar("stripe_price_id", { length: 255 }).notNull(),
  status: subscriptionStatusEnum("status").default("active").notNull(),
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
  canceledAt: timestamp("canceled_at"),
  trialStart: timestamp("trial_start"),
  trialEnd: timestamp("trial_end"),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

export const usageRecords = pgTable("usage_records", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  subscriptionId: integer("subscription_id"),
  usageType: varchar("usage_type", { length: 50 }).notNull(),
  quantity: integer("quantity").default(1).notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 4 }),
  totalCost: numeric("total_cost", { precision: 10, scale: 4 }),
  metadata: json("metadata"),
  billingPeriodStart: timestamp("billing_period_start").notNull(),
  billingPeriodEnd: timestamp("billing_period_end").notNull(),
  invoiceId: integer("invoice_id"),
  stripeUsageRecordId: varchar("stripe_usage_record_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type UsageRecord = typeof usageRecords.$inferSelect;
export type InsertUsageRecord = typeof usageRecords.$inferInsert;

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  subscriptionId: integer("subscription_id"),
  stripeInvoiceId: varchar("stripe_invoice_id", { length: 255 }).notNull(),
  stripeInvoiceUrl: text("stripe_invoice_url"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("usd").notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  dueDate: timestamp("due_date"),
  paidAt: timestamp("paid_at"),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }),
  tax: numeric("tax", { precision: 10, scale: 2 }),
  discount: numeric("discount", { precision: 10, scale: 2 }),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  lineItems: json("line_items"),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

// ============================================================================
// AUDIT & LOGGING
// ============================================================================

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  action: varchar("action", { length: 255 }).notNull(),
  entityType: varchar("entity_type", { length: 100 }),
  entityId: integer("entity_id"),
  changes: json("changes"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
