-- CreateEnum
CREATE TYPE "RecordSource" AS ENUM ('contemporaneous_note', 'document', 'recollection', 'third_party');

-- CreateEnum
CREATE TYPE "RecordConfidence" AS ENUM ('confirmed', 'probable', 'unconfirmed');

-- CreateEnum
CREATE TYPE "SymptomStatus" AS ENUM ('active', 'intermittent', 'resolved');

-- CreateEnum
CREATE TYPE "Laterality" AS ENUM ('left', 'right', 'bilateral', 'not_applicable');

-- CreateEnum
CREATE TYPE "TimelineEventType" AS ENUM ('appointment', 'test', 'medication_change', 'travel', 'injury', 'significant_life_event', 'other');

-- CreateEnum
CREATE TYPE "StandingFactCategory" AS ENUM ('allergy', 'current_medication', 'past_condition', 'lifestyle', 'relevant_negative');

-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('live', 'ruled_down', 'excluded');

-- CreateEnum
CREATE TYPE "MatrixFit" AS ENUM ('supports', 'partial', 'against', 'neutral', 'not_yet_tested');

-- CreateEnum
CREATE TYPE "UrgentFlagTier" AS ENUM ('emergency', 'same_day');

-- AlterTable
ALTER TABLE "UserSymptom" ADD COLUMN     "bodySite" TEXT,
ADD COLUMN     "firstOnset" TIMESTAMP(3),
ADD COLUMN     "firstOnsetConfidence" "RecordConfidence" NOT NULL DEFAULT 'unconfirmed',
ADD COLUMN     "laterality" "Laterality",
ADD COLUMN     "resolvedDate" TIMESTAMP(3),
ADD COLUMN     "status" "SymptomStatus" NOT NULL DEFAULT 'active';

-- CreateTable
CREATE TABLE "Observation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userSymptomId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "severity" INTEGER,
    "character" TEXT,
    "duration" TEXT,
    "triggers" TEXT,
    "relievingFactors" TEXT,
    "source" "RecordSource" NOT NULL,
    "confidence" "RecordConfidence" NOT NULL DEFAULT 'confirmed',
    "supersededAt" TIMESTAMP(3),
    "supersededById" TEXT,
    "supersededReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Observation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimelineEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "TimelineEventType" NOT NULL,
    "description" TEXT NOT NULL,
    "provider" TEXT,
    "outcome" TEXT,
    "documentRef" TEXT,
    "source" "RecordSource" NOT NULL,
    "confidence" "RecordConfidence" NOT NULL DEFAULT 'confirmed',
    "flaggedTier" "UrgentFlagTier",
    "supersededAt" TIMESTAMP(3),
    "supersededById" TEXT,
    "supersededReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StandingFact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "StandingFactCategory" NOT NULL,
    "value" TEXT NOT NULL,
    "dateEstablished" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StandingFact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "discriminatingFeatures" TEXT NOT NULL,
    "testsThatWouldSettleIt" TEXT NOT NULL,
    "status" "CandidateStatus" NOT NULL DEFAULT 'live',
    "excludedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateAssessment" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "userSymptomId" TEXT NOT NULL,
    "fit" "MatrixFit" NOT NULL DEFAULT 'not_yet_tested',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Observation_supersededById_key" ON "Observation"("supersededById");

-- CreateIndex
CREATE INDEX "Observation_userId_occurredAt_idx" ON "Observation"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "Observation_userSymptomId_occurredAt_idx" ON "Observation"("userSymptomId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "TimelineEvent_supersededById_key" ON "TimelineEvent"("supersededById");

-- CreateIndex
CREATE INDEX "TimelineEvent_userId_occurredAt_idx" ON "TimelineEvent"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "StandingFact_userId_category_idx" ON "StandingFact"("userId", "category");

-- CreateIndex
CREATE INDEX "Candidate_userId_status_idx" ON "Candidate"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateAssessment_candidateId_userSymptomId_key" ON "CandidateAssessment"("candidateId", "userSymptomId");

-- AddForeignKey
ALTER TABLE "Observation" ADD CONSTRAINT "Observation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Observation" ADD CONSTRAINT "Observation_userSymptomId_fkey" FOREIGN KEY ("userSymptomId") REFERENCES "UserSymptom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Observation" ADD CONSTRAINT "Observation_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "Observation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "TimelineEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandingFact" ADD CONSTRAINT "StandingFact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateAssessment" ADD CONSTRAINT "CandidateAssessment_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateAssessment" ADD CONSTRAINT "CandidateAssessment_userSymptomId_fkey" FOREIGN KEY ("userSymptomId") REFERENCES "UserSymptom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

