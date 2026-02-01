import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { requestOtp, verifyOtp, getUserById, validatePhoneNumber } from "./services/twilio-otp";
import { generateTokenPair, verifyToken } from "./services/jwt-service";
import * as db from "./db";

// ============================================================================
// AUTH ROUTER - Phone-based OTP Authentication
// ============================================================================
const authRouter = router({
  // Get current user
  me: publicProcedure.query((opts) => opts.ctx.user),

  // Request OTP code
  requestOtp: publicProcedure
    .input(z.object({
      phoneNumber: z.string().min(10).max(20),
    }))
    .mutation(async ({ input }) => {
      const result = await requestOtp(input.phoneNumber);
      return result;
    }),

  // Verify OTP and get tokens
  verifyOtp: publicProcedure
    .input(z.object({
      phoneNumber: z.string().min(10).max(20),
      code: z.string().length(6),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await verifyOtp(input.phoneNumber, input.code);
      
      if (!result.success || !result.userId) {
        return { success: false, error: result.error };
      }

      // Get user details
      const user = await getUserById(result.userId);
      if (!user) {
        return { success: false, error: "User not found" };
      }

      // Generate tokens
      const tokens = await generateTokenPair({
        userId: user.id,
        phoneNumber: user.phoneNumber || "",
        role: user.role,
      });

      // Set cookie for web
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, tokens.accessToken, {
        ...cookieOptions,
        maxAge: tokens.expiresIn * 1000,
      });

      return {
        success: true,
        isNewUser: result.isNewUser,
        user: {
          id: user.id,
          phoneNumber: user.phoneNumber,
          name: user.name,
          avatarUrl: user.avatarUrl,
          role: user.role,
        },
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
        },
      };
    }),

  // Refresh access token
  refreshToken: publicProcedure
    .input(z.object({
      refreshToken: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const verification = await verifyToken(input.refreshToken);
      
      if (!verification.valid || !verification.payload?.userId) {
        return { success: false, error: verification.error || "Invalid refresh token" };
      }

      if (verification.payload.type !== "refresh") {
        return { success: false, error: "Invalid token type" };
      }

      const user = await getUserById(verification.payload.userId);
      if (!user) {
        return { success: false, error: "User not found" };
      }

      const tokens = await generateTokenPair({
        userId: user.id,
        phoneNumber: user.phoneNumber || "",
        role: user.role,
      });

      // Set cookie for web
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, tokens.accessToken, {
        ...cookieOptions,
        maxAge: tokens.expiresIn * 1000,
      });

      return {
        success: true,
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
        },
      };
    }),

  // Validate phone number format
  validatePhone: publicProcedure
    .input(z.object({
      phoneNumber: z.string(),
    }))
    .query(({ input }) => {
      return validatePhoneNumber(input.phoneNumber);
    }),

  // Logout
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),

  // Update user profile
  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100).optional(),
      avatarUrl: z.string().url().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.updateUserProfile(ctx.user.id, input);
      return { success: true };
    }),
});

// ============================================================================
// CONTENT ROUTER - Content Generation and Management
// ============================================================================
const contentRouter = router({
  // List content items
  list: protectedProcedure
    .input(z.object({
      status: z.enum(["draft", "pending", "approved", "scheduled", "publishing", "published", "failed"]).optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      return db.getContentItems(ctx.user.id, input);
    }),

  // Get single content item
  get: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      return db.getContentItem(ctx.user.id, input.id);
    }),

  // Create content item (manual)
  create: protectedProcedure
    .input(z.object({
      type: z.enum(["post", "image", "video", "story", "reel"]).default("post"),
      content: z.string().optional(),
      caption: z.string().optional(),
      hashtags: z.array(z.string()).optional(),
      platforms: z.array(z.enum(["facebook", "instagram", "twitter", "linkedin", "tiktok"])),
    }))
    .mutation(async ({ ctx, input }) => {
      return db.createContentItem(ctx.user.id, input);
    }),

  // Update content item
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      content: z.string().optional(),
      caption: z.string().optional(),
      hashtags: z.array(z.string()).optional(),
      platforms: z.array(z.enum(["facebook", "instagram", "twitter", "linkedin", "tiktok"])).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return db.updateContentItem(ctx.user.id, input.id, input);
    }),

  // Approve content item
  approve: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      return db.approveContentItem(ctx.user.id, input.id);
    }),

  // Batch approve content items
  batchApprove: protectedProcedure
    .input(z.object({
      ids: z.array(z.number()),
    }))
    .mutation(async ({ ctx, input }) => {
      return db.batchApproveContentItems(ctx.user.id, input.ids);
    }),

  // Reject content item
  reject: protectedProcedure
    .input(z.object({
      id: z.number(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return db.rejectContentItem(ctx.user.id, input.id, input.reason);
    }),

  // Delete content item
  delete: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      return db.deleteContentItem(ctx.user.id, input.id);
    }),

  // Generate content with AI (async with job queue)
  generate: protectedProcedure
    .input(z.object({
      topic: z.string().min(1).max(500),
      platform: z.enum(["facebook", "instagram", "twitter", "linkedin", "tiktok"]),
      tone: z.enum(["professional", "casual", "friendly", "humorous", "inspirational"]).default("professional"),
      includeImage: z.boolean().default(false),
      imageStyle: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { generateContentAsync } = await import("./db-content");
      return generateContentAsync(ctx.user.id, input);
    }),

  // Get job status
  jobStatus: protectedProcedure
    .input(z.object({
      jobId: z.string(),
      queueName: z.enum(["content-generation", "niche-analysis", "post-publishing"]),
    }))
    .query(async ({ input }) => {
      const { getJobStatus } = await import("./services/job-queue");
      return getJobStatus(input.queueName, input.jobId);
    }),
});

// ============================================================================
// NICHE ROUTER - Niche Intelligence and Autopilot
// ============================================================================
const nicheRouter = router({
  // Get niche profile
  get: protectedProcedure.query(async ({ ctx }) => {
    return db.getNicheProfile(ctx.user.id);
  }),

  // Analyze website
  analyzeWebsite: protectedProcedure
    .input(z.object({
      websiteUrl: z.string().url(),
    }))
    .mutation(async ({ ctx, input }) => {
      return db.analyzeWebsite(ctx.user.id, input.websiteUrl);
    }),

  // Update niche profile
  update: protectedProcedure
    .input(z.object({
      industry: z.string().optional(),
      brandVoice: z.object({
        tone: z.string(),
        keywords: z.array(z.string()),
        avoidWords: z.array(z.string()),
      }).optional(),
      targetAudience: z.object({
        demographics: z.string(),
        interests: z.array(z.string()),
        painPoints: z.array(z.string()),
      }).optional(),
      postingFrequency: z.number().min(1).max(10).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return db.updateNicheProfile(ctx.user.id, input);
    }),

  // Enable/disable autopilot
  toggleAutopilot: protectedProcedure
    .input(z.object({
      enabled: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      return db.toggleAutopilot(ctx.user.id, input.enabled);
    }),
});

// ============================================================================
// SOCIAL ROUTER - Social Account Management
// ============================================================================
const socialRouter = router({
  // List connected accounts
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.getSocialAccounts(ctx.user.id);
  }),

  // Get OAuth URL for platform
  getOAuthUrl: protectedProcedure
    .input(z.object({
      platform: z.enum(["facebook", "instagram", "twitter", "linkedin", "tiktok"]),
    }))
    .query(async ({ ctx, input }) => {
      return db.getSocialOAuthUrl(ctx.user.id, input.platform);
    }),

  // Complete OAuth callback
  completeOAuth: protectedProcedure
    .input(z.object({
      platform: z.enum(["facebook", "instagram", "twitter", "linkedin", "tiktok"]),
      code: z.string(),
      state: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return db.completeSocialOAuth(ctx.user.id, input);
    }),

  // Disconnect account
  disconnect: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      return db.disconnectSocialAccount(ctx.user.id, input.id);
    }),

  // Refresh account token
  refreshToken: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      return db.refreshSocialToken(ctx.user.id, input.id);
    }),
});

// ============================================================================
// SCHEDULE ROUTER - Post Scheduling
// ============================================================================
const scheduleRouter = router({
  // List scheduled posts
  list: protectedProcedure
    .input(z.object({
      status: z.enum(["scheduled", "publishing", "published", "failed", "cancelled"]).optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      return db.getScheduledPosts(ctx.user.id, input);
    }),

  // Schedule a post
  create: protectedProcedure
    .input(z.object({
      contentItemId: z.number(),
      socialAccountId: z.number(),
      scheduledFor: z.string().datetime(),
      timezone: z.string().default("UTC"),
    }))
    .mutation(async ({ ctx, input }) => {
      return db.schedulePost(ctx.user.id, input);
    }),

  // Cancel scheduled post
  cancel: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      return db.cancelScheduledPost(ctx.user.id, input.id);
    }),

  // Reschedule post
  reschedule: protectedProcedure
    .input(z.object({
      id: z.number(),
      scheduledFor: z.string().datetime(),
    }))
    .mutation(async ({ ctx, input }) => {
      return db.reschedulePost(ctx.user.id, input.id, input.scheduledFor);
    }),
});

// ============================================================================
// BILLING ROUTER - Subscription and Usage
// ============================================================================
const billingRouter = router({
  // Get subscription status
  subscription: protectedProcedure.query(async ({ ctx }) => {
    return db.getSubscription(ctx.user.id);
  }),

  // Get usage for current period
  usage: protectedProcedure.query(async ({ ctx }) => {
    return db.getUsage(ctx.user.id);
  }),

  // Get Stripe checkout URL
  getCheckoutUrl: protectedProcedure
    .input(z.object({
      tier: z.enum(["pro", "enterprise"]),
    }))
    .mutation(async ({ ctx, input }) => {
      return db.getStripeCheckoutUrl(ctx.user.id, input.tier);
    }),

  // Get Stripe portal URL
  getPortalUrl: protectedProcedure.mutation(async ({ ctx }) => {
    return db.getStripePortalUrl(ctx.user.id);
  }),

  // Get invoices
  invoices: protectedProcedure.query(async ({ ctx }) => {
    return db.getInvoices(ctx.user.id);
  }),
});

// ============================================================================
// ANALYTICS ROUTER - Post Performance
// ============================================================================
const analyticsRouter = router({
  // Get analytics for a post
  getPostAnalytics: protectedProcedure
    .input(z.object({
      scheduledPostId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      return db.getPostAnalytics(ctx.user.id, input.scheduledPostId);
    }),

  // Get aggregated analytics
  dashboard: protectedProcedure
    .input(z.object({
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return db.getDashboardAnalytics(ctx.user.id, input);
    }),
});

// ============================================================================
// MAIN ROUTER
// ============================================================================
export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  content: contentRouter,
  niche: nicheRouter,
  social: socialRouter,
  schedule: scheduleRouter,
  billing: billingRouter,
  analytics: analyticsRouter,
});

export type AppRouter = typeof appRouter;
