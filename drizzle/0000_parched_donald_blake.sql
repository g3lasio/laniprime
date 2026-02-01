CREATE TYPE "public"."content_status" AS ENUM('draft', 'pending_approval', 'approved', 'scheduled', 'published', 'failed');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."post_status" AS ENUM('scheduled', 'published', 'failed', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin', 'partner');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'canceled', 'past_due', 'trialing');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"action" varchar(255) NOT NULL,
	"entity_type" varchar(100),
	"entity_id" integer,
	"changes" json,
	"ip_address" varchar(45),
	"user_agent" text,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"tenant_id" integer,
	"title" varchar(500),
	"body" text NOT NULL,
	"platform" varchar(50) NOT NULL,
	"content_type" varchar(50) DEFAULT 'text' NOT NULL,
	"image_url" text,
	"image_prompt" text,
	"video_url" text,
	"hashtags" json,
	"mentions" json,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"generated_by" varchar(50) DEFAULT 'ai' NOT NULL,
	"ai_model" varchar(100),
	"prompt" text,
	"tone" varchar(50),
	"target_audience" varchar(255),
	"scheduled_for" timestamp,
	"published_at" timestamp,
	"approved_by" integer,
	"approved_at" timestamp,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"content_item_id" integer,
	"job_type" varchar(50) NOT NULL,
	"status" "job_status" DEFAULT 'pending' NOT NULL,
	"priority" integer DEFAULT 5 NOT NULL,
	"prompt" text,
	"parameters" json,
	"result" json,
	"error_message" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"subscription_id" integer,
	"stripe_invoice_id" varchar(255) NOT NULL,
	"stripe_invoice_url" text,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'usd' NOT NULL,
	"status" varchar(50) NOT NULL,
	"due_date" timestamp,
	"paid_at" timestamp,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"subtotal" numeric(10, 2),
	"tax" numeric(10, 2),
	"discount" numeric(10, 2),
	"total" numeric(10, 2) NOT NULL,
	"line_items" json,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "niche_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"website_url" text,
	"industry" varchar(255),
	"brand_voice" json,
	"target_audience" json,
	"content_themes" json,
	"keywords" json,
	"competitors" json,
	"posting_frequency" integer DEFAULT 3,
	"best_posting_times" json,
	"autopilot_enabled" boolean DEFAULT false NOT NULL,
	"autopilot_config" json,
	"last_analyzed_at" timestamp,
	"analysis_data" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otp_verifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone_number" varchar(20) NOT NULL,
	"code_hash" varchar(128) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_rate_limits" (
	"id" serial PRIMARY KEY NOT NULL,
	"platform" varchar(50) NOT NULL,
	"user_id" integer NOT NULL,
	"endpoint" varchar(255) NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"reset_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"scheduled_post_id" integer NOT NULL,
	"platform" varchar(50) NOT NULL,
	"impressions" bigint DEFAULT 0 NOT NULL,
	"reach" bigint DEFAULT 0 NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"comments" integer DEFAULT 0 NOT NULL,
	"shares" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"saves" integer DEFAULT 0 NOT NULL,
	"engagement_rate" numeric(5, 2),
	"raw_data" json,
	"last_fetched_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"content_item_id" integer NOT NULL,
	"social_account_id" integer NOT NULL,
	"platform" varchar(50) NOT NULL,
	"scheduled_for" timestamp NOT NULL,
	"status" "post_status" DEFAULT 'scheduled' NOT NULL,
	"platform_post_id" varchar(255),
	"platform_post_url" text,
	"published_at" timestamp,
	"error_message" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"last_retry_at" timestamp,
	"metadata" json,
	"analytics" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"platform" varchar(50) NOT NULL,
	"account_name" varchar(255) NOT NULL,
	"account_id" varchar(255) NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"token_expires_at" timestamp,
	"account_metadata" json,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_synced_at" timestamp,
	"sync_error" text,
	"permissions" json,
	"rate_limit_remaining" integer,
	"rate_limit_reset_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"stripe_customer_id" varchar(255) NOT NULL,
	"stripe_subscription_id" varchar(255) NOT NULL,
	"stripe_price_id" varchar(255) NOT NULL,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"current_period_start" timestamp NOT NULL,
	"current_period_end" timestamp NOT NULL,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"canceled_at" timestamp,
	"trial_start" timestamp,
	"trial_end" timestamp,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"white_label" boolean DEFAULT false NOT NULL,
	"brand_name" varchar(255),
	"brand_logo" text,
	"primary_color" varchar(7),
	"custom_domain" varchar(255),
	"settings" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"subscription_id" integer,
	"usage_type" varchar(50) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(10, 4),
	"total_cost" numeric(10, 4),
	"metadata" json,
	"billing_period_start" timestamp NOT NULL,
	"billing_period_end" timestamp NOT NULL,
	"invoice_id" integer,
	"stripe_usage_record_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"open_id" varchar(64) NOT NULL,
	"phone_number" varchar(20),
	"phone_verified" boolean DEFAULT false NOT NULL,
	"name" text,
	"email" varchar(320),
	"avatar_url" text,
	"login_method" varchar(64),
	"last_otp_sent_at" timestamp,
	"tenant_id" integer,
	"role" "role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_signed_in" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_open_id_unique" UNIQUE("open_id"),
	CONSTRAINT "users_phone_number_unique" UNIQUE("phone_number")
);
