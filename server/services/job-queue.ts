/**
 * Background Job Queue System
 * 
 * Uses BullMQ + Redis for processing when available,
 * falls back to direct execution when Redis is not available.
 * 
 * Features:
 * - Content generation jobs
 * - Niche analysis jobs
 * - Scheduled post publishing
 * - Job retry with exponential backoff (when Redis available)
 * - Job status tracking
 */

import {
  generateContentWithImage,
  type ContentGenerationRequest,
  type GeneratedContent,
} from "./content-generation";
import {
  analyzeNiche,
  type NicheAnalysisRequest,
  type NicheAnalysisResult,
} from "./niche-intelligence";

// Check if Redis is configured
const REDIS_AVAILABLE = process.env.REDIS_HOST || process.env.REDIS_URL;

// Only import BullMQ if Redis is available
let Queue: any;
let Worker: any;
let QueueEvents: any;
let Redis: any;

if (REDIS_AVAILABLE) {
  try {
    const bullmq = require("bullmq");
    Queue = bullmq.Queue;
    Worker = bullmq.Worker;
    QueueEvents = bullmq.QueueEvents;
    Redis = require("ioredis").default;
  } catch (e) {
    console.warn("[JobQueue] BullMQ not available, using direct execution");
  }
}

// ============================================================================
// DIRECT EXECUTION FALLBACK
// ============================================================================

/**
 * Execute content generation directly (no queue)
 */
async function executeContentGeneration(
  data: ContentGenerationRequest
): Promise<GeneratedContent> {
  console.log("[JobQueue] Executing content generation directly (no Redis)");
  return await generateContentWithImage(data);
}

/**
 * Execute niche analysis directly (no queue)
 */
async function executeNicheAnalysis(
  data: NicheAnalysisRequest
): Promise<NicheAnalysisResult> {
  console.log("[JobQueue] Executing niche analysis directly (no Redis)");
  return await analyzeNiche(data);
}

// ============================================================================
// JOB QUEUE API (works with or without Redis)
// ============================================================================

/**
 * Add content generation job
 */
export async function addContentGenerationJob(
  data: ContentGenerationRequest
): Promise<{ jobId: string; result?: GeneratedContent }> {
  if (!REDIS_AVAILABLE || !Queue) {
    // Direct execution fallback
    const result = await executeContentGeneration(data);
    return {
      jobId: `direct-${Date.now()}`,
      result,
    };
  }

  // Use queue if Redis is available
  try {
    const queue = new Queue("content-generation", {
      connection: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
        password: process.env.REDIS_PASSWORD,
      },
    });

    const job = await queue.add("generate", data, {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
    });

    return { jobId: job.id || `job-${Date.now()}` };
  } catch (error) {
    console.warn("[JobQueue] Queue failed, falling back to direct execution:", error);
    const result = await executeContentGeneration(data);
    return {
      jobId: `direct-${Date.now()}`,
      result,
    };
  }
}

/**
 * Add niche analysis job
 */
export async function addNicheAnalysisJob(
  data: NicheAnalysisRequest
): Promise<{ jobId: string; result?: NicheAnalysisResult }> {
  if (!REDIS_AVAILABLE || !Queue) {
    // Direct execution fallback
    const result = await executeNicheAnalysis(data);
    return {
      jobId: `direct-${Date.now()}`,
      result,
    };
  }

  // Use queue if Redis is available
  try {
    const queue = new Queue("niche-analysis", {
      connection: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
        password: process.env.REDIS_PASSWORD,
      },
    });

    const job = await queue.add("analyze", data, {
      attempts: 2,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
    });

    return { jobId: job.id || `job-${Date.now()}` };
  } catch (error) {
    console.warn("[JobQueue] Queue failed, falling back to direct execution:", error);
    const result = await executeNicheAnalysis(data);
    return {
      jobId: `direct-${Date.now()}`,
      result,
    };
  }
}

/**
 * Get job status
 */
export async function getJobStatus(
  queueName: string,
  jobId: string
): Promise<{
  status: "completed" | "failed" | "active" | "waiting" | "unknown";
  result?: any;
  error?: string;
}> {
  // If jobId starts with "direct-", it was executed directly
  if (jobId.startsWith("direct-")) {
    return {
      status: "completed",
      result: { message: "Job executed directly (no Redis queue)" },
    };
  }

  if (!REDIS_AVAILABLE || !Queue) {
    return {
      status: "unknown",
      error: "Redis not available",
    };
  }

  try {
    const queue = new Queue(queueName, {
      connection: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
        password: process.env.REDIS_PASSWORD,
      },
    });

    const job = await queue.getJob(jobId);
    if (!job) {
      return { status: "unknown", error: "Job not found" };
    }

    const state = await job.getState();
    const result = job.returnvalue;
    const error = job.failedReason;

    return {
      status: state as any,
      result,
      error,
    };
  } catch (error) {
    console.error("[JobQueue] Error getting job status:", error);
    return {
      status: "unknown",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Initialize workers (only if Redis is available)
 */
export function initializeWorkers() {
  if (!REDIS_AVAILABLE || !Worker) {
    console.log("[JobQueue] Workers not initialized (Redis not available)");
    return;
  }

  try {
    // Content Generation Worker
    new Worker(
      "content-generation",
      async (job: any) => {
        console.log(`[Worker] Processing content generation job ${job.id}`);
        return await generateContentWithImage(job.data);
      },
      {
        connection: {
          host: process.env.REDIS_HOST || "localhost",
          port: parseInt(process.env.REDIS_PORT || "6379"),
          password: process.env.REDIS_PASSWORD,
        },
        concurrency: 5,
      }
    );

    // Niche Analysis Worker
    new Worker(
      "niche-analysis",
      async (job: any) => {
        console.log(`[Worker] Processing niche analysis job ${job.id}`);
        return await analyzeNiche(job.data);
      },
      {
        connection: {
          host: process.env.REDIS_HOST || "localhost",
          port: parseInt(process.env.REDIS_PORT || "6379"),
          password: process.env.REDIS_PASSWORD,
        },
        concurrency: 2,
      }
    );

    console.log("[JobQueue] Workers initialized successfully");
  } catch (error) {
    console.warn("[JobQueue] Worker initialization failed:", error);
  }
}

// Initialize workers on module load (if Redis available)
if (REDIS_AVAILABLE) {
  initializeWorkers();
}
