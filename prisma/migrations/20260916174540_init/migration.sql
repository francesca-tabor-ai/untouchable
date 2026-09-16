-- CreateEnum
CREATE TYPE "Role" AS ENUM ('patient', 'editor', 'admin');

-- CreateEnum
CREATE TYPE "ConsentPurpose" AS ENUM ('core_tracking', 'research_anonymised', 'commercial_research', 'contact_for_studies', 'marketing_email');

-- CreateEnum
CREATE TYPE "StoryType" AS ENUM ('public_figure', 'community');

-- CreateEnum
CREATE TYPE "DisclosureType" AS ENUM ('own', 'loved_one');

-- CreateEnum
CREATE TYPE "StoryStatus" AS ENUM ('draft', 'in_review', 'published', 'retracted');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('interview', 'own_social', 'book', 'podcast', 'statement', 'article');

-- CreateEnum
CREATE TYPE "TakedownType" AS ENUM ('correction', 'removal');

-- CreateEnum
CREATE TYPE "TakedownStatus" AS ENUM ('open', 'actioned', 'declined');

-- CreateEnum
CREATE TYPE "Regulator" AS ENUM ('CCEW', 'OSCR', 'CCNI');

-- CreateEnum
CREATE TYPE "InterventionType" AS ENUM ('rx', 'otc', 'supplement', 'device', 'non_drug');

-- CreateEnum
CREATE TYPE "StopReason" AS ENUM ('not_working', 'side_effects', 'cost', 'clinician_advice', 'other');

-- CreateEnum
CREATE TYPE "CheckInStatus" AS ENUM ('pending', 'completed', 'missed');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'patient',
    "ageConfirmedAt" TIMESTAMP(3),
    "emailVerified" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT,
    "yearOfBirth" INTEGER,
    "sex" TEXT,
    "region" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" "ConsentPurpose" NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "consentTextVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Condition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "snomedCode" TEXT,
    "summary" TEXT NOT NULL,
    "isSensitiveTopic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Condition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicFigure" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shortBio" TEXT NOT NULL,
    "imageUrl" TEXT,
    "imageLicence" TEXT,
    "isDeceased" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicFigure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Story" (
    "id" TEXT NOT NULL,
    "type" "StoryType" NOT NULL,
    "publicFigureId" TEXT,
    "disclosureType" "DisclosureType" NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "keyMomentsJson" JSONB NOT NULL DEFAULT '[]',
    "quote" TEXT,
    "quoteSourceId" TEXT,
    "contentNote" TEXT,
    "communityPermissionConfirmed" BOOLEAN,
    "status" "StoryStatus" NOT NULL DEFAULT 'draft',
    "draftedById" TEXT NOT NULL,
    "verifiedById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "lastReviewedAt" TIMESTAMP(3),
    "retractedAt" TIMESTAMP(3),
    "retractionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryCondition" (
    "storyId" TEXT NOT NULL,
    "conditionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryCondition_pkey" PRIMARY KEY ("storyId","conditionId")
);

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "publisher" TEXT NOT NULL,
    "publishedDate" TIMESTAMP(3),
    "sourceType" "SourceType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedStory" (
    "userId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedStory_pkey" PRIMARY KEY ("userId","storyId")
);

-- CreateTable
CREATE TABLE "TakedownRequest" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "type" "TakedownType" NOT NULL DEFAULT 'removal',
    "requesterName" TEXT NOT NULL,
    "requesterEmail" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "TakedownStatus" NOT NULL DEFAULT 'open',
    "resolutionNote" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TakedownRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Charity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "registeredNumber" TEXT NOT NULL,
    "regulator" "Regulator" NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "donationUrl" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "logoUrl" TEXT,
    "logoPermission" BOOLEAN NOT NULL DEFAULT false,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Charity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharityCondition" (
    "charityId" TEXT NOT NULL,
    "conditionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CharityCondition_pkey" PRIMARY KEY ("charityId","conditionId")
);

-- CreateTable
CREATE TABLE "StoryCharity" (
    "storyId" TEXT NOT NULL,
    "charityId" TEXT NOT NULL,
    "sourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryCharity_pkey" PRIMARY KEY ("storyId","charityId")
);

-- CreateTable
CREATE TABLE "CharityFollow" (
    "userId" TEXT NOT NULL,
    "charityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CharityFollow_pkey" PRIMARY KEY ("userId","charityId")
);

-- CreateTable
CREATE TABLE "DonationReferral" (
    "id" TEXT NOT NULL,
    "charityId" TEXT NOT NULL,
    "originPage" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DonationReferral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DonationNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "charityId" TEXT NOT NULL,
    "amount" DECIMAL(10,2),
    "donatedOn" DATE NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DonationNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCondition" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conditionId" TEXT NOT NULL,
    "diagnosedYear" INTEGER,
    "selfReported" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Symptom" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Symptom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SymptomCondition" (
    "symptomId" TEXT NOT NULL,
    "conditionId" TEXT NOT NULL,

    CONSTRAINT "SymptomCondition_pkey" PRIMARY KEY ("symptomId","conditionId")
);

-- CreateTable
CREATE TABLE "UserSymptom" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "symptomId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSymptom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Intervention" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "InterventionType" NOT NULL,
    "dmdCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Intervention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreatmentCourse" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "interventionId" TEXT NOT NULL,
    "dose" TEXT,
    "frequency" TEXT,
    "route" TEXT,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "stopReason" "StopReason",
    "stopReasonNote" TEXT,
    "adherenceRating" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreatmentCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Questionnaire" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "licenceNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Questionnaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionnaireVersion" (
    "id" TEXT NOT NULL,
    "questionnaireId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "itemsJson" JSONB NOT NULL,
    "scoringJson" JSONB NOT NULL,
    "redFlagRulesJson" JSONB NOT NULL DEFAULT '[]',
    "scheduleJson" JSONB NOT NULL DEFAULT '{}',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionnaireVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledCheckIn" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionnaireVersionId" TEXT NOT NULL,
    "treatmentCourseId" TEXT,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" "CheckInStatus" NOT NULL DEFAULT 'pending',
    "remindedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Response" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionnaireVersionId" TEXT NOT NULL,
    "checkInId" TEXT,
    "answersJson" JSONB NOT NULL,
    "score" DOUBLE PRECISION,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Response_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "symptomScoresJson" JSONB NOT NULL DEFAULT '{}',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SideEffectReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "treatmentCourseId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" INTEGER NOT NULL,
    "yellowCardShownAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SideEffectReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'on_due_date',
    "dailyLogReminders" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReminderPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "shownAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SafetyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "paramsJson" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchExport" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "queryJson" JSONB NOT NULL,
    "consentPurpose" "ConsentPurpose" NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "suppressedGroups" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchExport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE INDEX "ConsentRecord_userId_purpose_createdAt_idx" ON "ConsentRecord"("userId", "purpose", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Condition_slug_key" ON "Condition"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PublicFigure_slug_key" ON "PublicFigure"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Story_slug_key" ON "Story"("slug");

-- CreateIndex
CREATE INDEX "Story_status_publishedAt_idx" ON "Story"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "Story_publicFigureId_idx" ON "Story"("publicFigureId");

-- CreateIndex
CREATE INDEX "Source_storyId_idx" ON "Source"("storyId");

-- CreateIndex
CREATE INDEX "TakedownRequest_status_createdAt_idx" ON "TakedownRequest"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Charity_slug_key" ON "Charity"("slug");

-- CreateIndex
CREATE INDEX "Charity_verifiedAt_active_idx" ON "Charity"("verifiedAt", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Charity_regulator_registeredNumber_key" ON "Charity"("regulator", "registeredNumber");

-- CreateIndex
CREATE INDEX "DonationReferral_charityId_createdAt_idx" ON "DonationReferral"("charityId", "createdAt");

-- CreateIndex
CREATE INDEX "DonationNote_userId_donatedOn_idx" ON "DonationNote"("userId", "donatedOn");

-- CreateIndex
CREATE UNIQUE INDEX "UserCondition_userId_conditionId_key" ON "UserCondition"("userId", "conditionId");

-- CreateIndex
CREATE UNIQUE INDEX "Symptom_slug_key" ON "Symptom"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "UserSymptom_userId_symptomId_key" ON "UserSymptom"("userId", "symptomId");

-- CreateIndex
CREATE UNIQUE INDEX "Intervention_name_type_key" ON "Intervention"("name", "type");

-- CreateIndex
CREATE INDEX "TreatmentCourse_userId_startDate_idx" ON "TreatmentCourse"("userId", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "Questionnaire_key_key" ON "Questionnaire"("key");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionnaireVersion_questionnaireId_version_key" ON "QuestionnaireVersion"("questionnaireId", "version");

-- CreateIndex
CREATE INDEX "ScheduledCheckIn_userId_status_dueAt_idx" ON "ScheduledCheckIn"("userId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "ScheduledCheckIn_status_dueAt_idx" ON "ScheduledCheckIn"("status", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "Response_checkInId_key" ON "Response"("checkInId");

-- CreateIndex
CREATE INDEX "Response_userId_completedAt_idx" ON "Response"("userId", "completedAt");

-- CreateIndex
CREATE INDEX "DailyLog_userId_date_idx" ON "DailyLog"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyLog_userId_date_key" ON "DailyLog"("userId", "date");

-- CreateIndex
CREATE INDEX "SideEffectReport_userId_createdAt_idx" ON "SideEffectReport"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReminderPreference_userId_key" ON "ReminderPreference"("userId");

-- CreateIndex
CREATE INDEX "SafetyEvent_userId_shownAt_idx" ON "SafetyEvent"("userId", "shownAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "ResearchExport_actorId_createdAt_idx" ON "ResearchExport"("actorId", "createdAt");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_publicFigureId_fkey" FOREIGN KEY ("publicFigureId") REFERENCES "PublicFigure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_draftedById_fkey" FOREIGN KEY ("draftedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryCondition" ADD CONSTRAINT "StoryCondition_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryCondition" ADD CONSTRAINT "StoryCondition_conditionId_fkey" FOREIGN KEY ("conditionId") REFERENCES "Condition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Source" ADD CONSTRAINT "Source_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedStory" ADD CONSTRAINT "SavedStory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedStory" ADD CONSTRAINT "SavedStory_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TakedownRequest" ADD CONSTRAINT "TakedownRequest_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Charity" ADD CONSTRAINT "Charity_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharityCondition" ADD CONSTRAINT "CharityCondition_charityId_fkey" FOREIGN KEY ("charityId") REFERENCES "Charity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharityCondition" ADD CONSTRAINT "CharityCondition_conditionId_fkey" FOREIGN KEY ("conditionId") REFERENCES "Condition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryCharity" ADD CONSTRAINT "StoryCharity_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryCharity" ADD CONSTRAINT "StoryCharity_charityId_fkey" FOREIGN KEY ("charityId") REFERENCES "Charity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryCharity" ADD CONSTRAINT "StoryCharity_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharityFollow" ADD CONSTRAINT "CharityFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharityFollow" ADD CONSTRAINT "CharityFollow_charityId_fkey" FOREIGN KEY ("charityId") REFERENCES "Charity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonationReferral" ADD CONSTRAINT "DonationReferral_charityId_fkey" FOREIGN KEY ("charityId") REFERENCES "Charity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonationNote" ADD CONSTRAINT "DonationNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonationNote" ADD CONSTRAINT "DonationNote_charityId_fkey" FOREIGN KEY ("charityId") REFERENCES "Charity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCondition" ADD CONSTRAINT "UserCondition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCondition" ADD CONSTRAINT "UserCondition_conditionId_fkey" FOREIGN KEY ("conditionId") REFERENCES "Condition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SymptomCondition" ADD CONSTRAINT "SymptomCondition_symptomId_fkey" FOREIGN KEY ("symptomId") REFERENCES "Symptom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SymptomCondition" ADD CONSTRAINT "SymptomCondition_conditionId_fkey" FOREIGN KEY ("conditionId") REFERENCES "Condition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSymptom" ADD CONSTRAINT "UserSymptom_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSymptom" ADD CONSTRAINT "UserSymptom_symptomId_fkey" FOREIGN KEY ("symptomId") REFERENCES "Symptom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentCourse" ADD CONSTRAINT "TreatmentCourse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentCourse" ADD CONSTRAINT "TreatmentCourse_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "Intervention"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionnaireVersion" ADD CONSTRAINT "QuestionnaireVersion_questionnaireId_fkey" FOREIGN KEY ("questionnaireId") REFERENCES "Questionnaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledCheckIn" ADD CONSTRAINT "ScheduledCheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledCheckIn" ADD CONSTRAINT "ScheduledCheckIn_questionnaireVersionId_fkey" FOREIGN KEY ("questionnaireVersionId") REFERENCES "QuestionnaireVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledCheckIn" ADD CONSTRAINT "ScheduledCheckIn_treatmentCourseId_fkey" FOREIGN KEY ("treatmentCourseId") REFERENCES "TreatmentCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_questionnaireVersionId_fkey" FOREIGN KEY ("questionnaireVersionId") REFERENCES "QuestionnaireVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "ScheduledCheckIn"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyLog" ADD CONSTRAINT "DailyLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SideEffectReport" ADD CONSTRAINT "SideEffectReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SideEffectReport" ADD CONSTRAINT "SideEffectReport_treatmentCourseId_fkey" FOREIGN KEY ("treatmentCourseId") REFERENCES "TreatmentCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderPreference" ADD CONSTRAINT "ReminderPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyEvent" ADD CONSTRAINT "SafetyEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
