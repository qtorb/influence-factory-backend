-- CreateEnum
CREATE TYPE "Public"."SubscriptionTier" AS ENUM ('free', 'starter', 'pro', 'enterprise');

-- CreateTable Tenant
CREATE TABLE "Tenant" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "subscriptionTier" TEXT NOT NULL DEFAULT 'free',
  "status" TEXT NOT NULL DEFAULT 'active',
  "apiQuotaMonthly" INTEGER NOT NULL DEFAULT 10000,
  "apiUsageThisMonth" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable User
CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "role" TEXT NOT NULL DEFAULT 'member',
  "lastLoginAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable Project
CREATE TABLE "Project" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "authorityStrategy" TEXT NOT NULL DEFAULT 'data-driven',
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable WordPressSite
CREATE TABLE "WordPressSite" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "appPassword" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "lastCheckAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WordPressSite_pkey" PRIMARY KEY ("id")
);

-- CreateTable Post
CREATE TABLE "Post" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "wordPressSiteId" TEXT,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "excerpt" TEXT NOT NULL,
  "intro" TEXT,
  "body" TEXT,
  "conclusion" TEXT,
  "featuredImageUrl" TEXT,
  "geoScore" DOUBLE PRECISION,
  "authoritySignals" JSONB,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "wordPressPostId" INTEGER,
  "wordPressUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable PostEmbedding
CREATE TABLE "PostEmbedding" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "embedding" vector,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PostEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable Source
CREATE TABLE "Source" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "domain" TEXT NOT NULL,
  "title" TEXT,
  "authority" DOUBLE PRECISION,
  "relevance" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable Job
CREATE TABLE "Job" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "postId" TEXT,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "result" JSONB,
  "error" TEXT,
  "bullJobId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable PersonalPattern
CREATE TABLE "PersonalPattern" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "patternType" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "frequency" INTEGER NOT NULL DEFAULT 1,
  "affectedDecisions" INTEGER NOT NULL DEFAULT 0,
  "recommendation" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PersonalPattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable SystemMetric
CREATE TABLE "SystemMetric" (
  "id" TEXT NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "memoryUsageMb" DOUBLE PRECISION NOT NULL,
  "cpuUsagePercent" DOUBLE PRECISION NOT NULL,
  "activeJobsCount" INTEGER NOT NULL,
  "totalJobsDone" INTEGER NOT NULL,
  "averageJobTime" DOUBLE PRECISION NOT NULL,
  CONSTRAINT "SystemMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_email_key" ON "Tenant"("email");
CREATE INDEX "Tenant_status_idx" ON "Tenant"("status");
CREATE INDEX "Tenant_email_idx" ON "Tenant"("email");

-- CreateIndex User
CREATE UNIQUE INDEX "User_tenantId_email_key" ON "User"("tenantId", "email");
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex Project
CREATE INDEX "Project_tenantId_idx" ON "Project"("tenantId");

-- CreateIndex WordPressSite
CREATE UNIQUE INDEX "WordPressSite_tenantId_projectId_url_key" ON "WordPressSite"("tenantId", "projectId", "url");
CREATE INDEX "WordPressSite_tenantId_idx" ON "WordPressSite"("tenantId");
CREATE INDEX "WordPressSite_projectId_idx" ON "WordPressSite"("projectId");

-- CreateIndex Post
CREATE INDEX "Post_tenantId_idx" ON "Post"("tenantId");
CREATE INDEX "Post_projectId_idx" ON "Post"("projectId");
CREATE INDEX "Post_status_idx" ON "Post"("status");
CREATE INDEX "Post_wordPressSiteId_idx" ON "Post"("wordPressSiteId");

-- CreateIndex PostEmbedding
CREATE UNIQUE INDEX "PostEmbedding_postId_key" ON "PostEmbedding"("postId");
CREATE INDEX "PostEmbedding_postId_idx" ON "PostEmbedding"("postId");

-- CreateIndex Source
CREATE INDEX "Source_postId_idx" ON "Source"("postId");
CREATE INDEX "Source_domain_idx" ON "Source"("domain");

-- CreateIndex Job
CREATE INDEX "Job_tenantId_idx" ON "Job"("tenantId");
CREATE INDEX "Job_postId_idx" ON "Job"("postId");
CREATE INDEX "Job_status_idx" ON "Job"("status");
CREATE INDEX "Job_type_idx" ON "Job"("type");

-- CreateIndex PersonalPattern
CREATE INDEX "PersonalPattern_tenantId_idx" ON "PersonalPattern"("tenantId");
CREATE INDEX "PersonalPattern_patternType_idx" ON "PersonalPattern"("patternType");

-- CreateIndex SystemMetric
CREATE INDEX "SystemMetric_timestamp_idx" ON "SystemMetric"("timestamp");

-- AddForeignKey User
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey Project
ALTER TABLE "Project" ADD CONSTRAINT "Project_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey WordPressSite
ALTER TABLE "WordPressSite" ADD CONSTRAINT "WordPressSite_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WordPressSite" ADD CONSTRAINT "WordPressSite_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey Post
ALTER TABLE "Post" ADD CONSTRAINT "Post_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Post" ADD CONSTRAINT "Post_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Post" ADD CONSTRAINT "Post_wordPressSiteId_fkey" FOREIGN KEY ("wordPressSiteId") REFERENCES "WordPressSite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey PostEmbedding
ALTER TABLE "PostEmbedding" ADD CONSTRAINT "PostEmbedding_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey Source
ALTER TABLE "Source" ADD CONSTRAINT "Source_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey Job
ALTER TABLE "Job" ADD CONSTRAINT "Job_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Job" ADD CONSTRAINT "Job_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;
