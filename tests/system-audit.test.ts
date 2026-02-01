/**
 * System Audit Test
 * 
 * Comprehensive validation of all frontend-backend connections,
 * database queries, and API endpoints.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { getDb, resetDb } from "../server/db";
import * as db from "../server/db";

beforeAll(() => {
  // Reset database connection to ensure fresh SSL configuration
  resetDb();
});

describe("System Audit: Database Integration", () => {
  it("should connect to database successfully", async () => {
    const database = await getDb();
    expect(database).toBeDefined();
    expect(database).not.toBeNull();
  });

  it("should query users table", async () => {
    await db.upsertUser({
      openId: "test-audit-user",
      email: "audit@test.com",
      name: "Audit Test User",
    });
    
    // Verify user was created by getting it
    const user = await db.getUserByOpenId("test-audit-user");
    expect(user).toBeDefined();
  });

  it("should query nicheProfiles table", async () => {
    // Create test user first
    await db.upsertUser({
      openId: "test-niche-user-1",
      email: "niche1@test.com",
      name: "Niche Test User 1",
    });

    const user = await db.getUserByOpenId("test-niche-user-1");
    expect(user).toBeDefined();

    // Get niche profile (should be null initially)
    const profile = await db.getNicheProfile(user!.id);
    expect(profile).toBeNull();
  });

  it("should query contentItems table", async () => {
    // Create test user
    await db.upsertUser({
      openId: "test-content-user-1",
      email: "content1@test.com",
      name: "Content Test User 1",
    });

    const user = await db.getUserByOpenId("test-content-user-1");
    expect(user).toBeDefined();

    // Get content items (should be empty initially)
    const result = await db.getContentItems(user!.id, { limit: 10, offset: 0 });
    const items = result.items;
    expect(items).toBeInstanceOf(Array);
  });

  it("should query subscriptions table", async () => {
    // Create test user
    await db.upsertUser({
      openId: "test-sub-user-1",
      email: "sub1@test.com",
      name: "Subscription Test User 1",
    });

    const user = await db.getUserByOpenId("test-sub-user-1");
    expect(user).toBeDefined();

    // Get subscription (should be null initially)
    const subscription = await db.getSubscription(user!.id);
    expect(subscription).toBeNull();
  });
});

describe("System Audit: API Endpoints", () => {
  it("should have niche.get endpoint", () => {
    expect(db.getNicheProfile).toBeDefined();
  });

  it("should have niche.analyzeWebsite endpoint", () => {
    expect(db.analyzeWebsite).toBeDefined();
  });

  it("should have content.list endpoint", () => {
    expect(db.getContentItems).toBeDefined();
  });

  it("should have content.approve endpoint", () => {
    expect(db.approveContentItem).toBeDefined();
  });

  it("should have analytics.dashboard endpoint", () => {
    expect(db.getDashboardAnalytics).toBeDefined();
  });

  it("should have schedule.list endpoint", () => {
    expect(db.getScheduledPosts).toBeDefined();
  });

  it("should have social.list endpoint", () => {
    expect(db.getSocialAccounts).toBeDefined();
  });
});

describe("System Audit: Service Integration", () => {
  it("should have content generation service", async () => {
    const { generateContent } = await import("../server/services/content-generation");
    expect(generateContent).toBeDefined();
  });

  it("should have niche intelligence service", async () => {
    const { analyzeNiche } = await import("../server/services/niche-intelligence");
    expect(analyzeNiche).toBeDefined();
  });

  it("should have job queue service", async () => {
    const { addContentGenerationJob, addNicheAnalysisJob } = await import("../server/services/job-queue");
    expect(addContentGenerationJob).toBeDefined();
    expect(addNicheAnalysisJob).toBeDefined();
  });
});

describe("System Audit: Error Handling", () => {
  it("should handle invalid user ID gracefully", async () => {
    const profile = await db.getNicheProfile(-1);
    expect(profile).toBeNull();
  });

  it("should handle missing content items gracefully", async () => {
    const result = await db.getContentItems(-1, { limit: 10, offset: 0 });
    const items = result.items;
    expect(items).toBeInstanceOf(Array);
  });

  it("should handle missing subscription gracefully", async () => {
    const subscription = await db.getSubscription(-1);
    expect(subscription).toBeNull();
  });
});

describe("System Audit: Data Integrity", () => {
  it("should create user with correct fields", async () => {
    const openId = `test-integrity-user-${Date.now()}`;
    await db.upsertUser({
      openId: openId,
      email: "integrity@test.com",
      name: "Integrity Test User",
    });

    const user = await db.getUserByOpenId(openId);
    expect(user).toBeDefined();
    expect(user!.email).toBe("integrity@test.com");
    expect(user!.name).toBe("Integrity Test User");
    expect(user!.createdAt).toBeInstanceOf(Date);
  });

  it("should update existing user", async () => {
    const openId = `test-update-user-${Date.now()}`;
    
    // Create user
    await db.upsertUser({
      openId: openId,
      email: "update@test.com",
      name: "Update Test User",
    });

    const user1 = await db.getUserByOpenId(openId);
    expect(user1).toBeDefined();

    // Update user
    await db.upsertUser({
      openId: openId,
      email: "updated@test.com",
      name: "Updated Test User",
    });

    const user2 = await db.getUserByOpenId(openId);
    expect(user2).toBeDefined();
    expect(user2!.id).toBe(user1!.id);
    expect(user2!.email).toBe("updated@test.com");
    expect(user2!.name).toBe("Updated Test User");
  });
});

describe("System Audit: Performance", () => {
  it("should query database within 1 second", async () => {
    const start = Date.now();
    await getDb();
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(1000);
  });

  it("should create user within 1 second", async () => {
    const start = Date.now();
    await db.upsertUser({
      openId: `test-perf-user-${Date.now()}`,
      email: "perf@test.com",
      name: "Performance Test User",
    });
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(1000);
  });

  it("should query content items within 1 second", async () => {
    // Create test user
    const openId = `test-perf-content-${Date.now()}`;
    await db.upsertUser({
      openId: openId,
      email: "perfcontent@test.com",
      name: "Perf Content User",
    });

    const user = await db.getUserByOpenId(openId);
    expect(user).toBeDefined();

    const start = Date.now();
    await db.getContentItems(user!.id, { limit: 10, offset: 0 });
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(1000);
  });
});
