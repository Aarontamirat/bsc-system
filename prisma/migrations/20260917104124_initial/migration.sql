-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "UnitOfMeasure" AS ENUM ('PERCENT', 'COUNT', 'NUMBER', 'MINUTE', 'HOUR');

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" VARCHAR(80) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "departmentId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scorecards" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scorecards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perspectives" (
    "id" TEXT NOT NULL,
    "scorecardId" TEXT NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "weight" DECIMAL(7,4) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "perspectives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "objectives" (
    "id" TEXT NOT NULL,
    "perspectiveId" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "weight" DECIMAL(7,4) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "objectives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "objectiveId" TEXT NOT NULL,
    "name" VARCHAR(250) NOT NULL,
    "weight" DECIMAL(7,4) NOT NULL,
    "unitOfMeasure" "UnitOfMeasure" NOT NULL,
    "annualTarget" DECIMAL(18,4) NOT NULL,
    "baseline" DECIMAL(18,4) NOT NULL,
    "remark" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_responsible_units" (
    "activityId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_responsible_units_pkey" PRIMARY KEY ("activityId","departmentId")
);

-- CreateTable
CREATE TABLE "monthly_plans" (
    "id" TEXT NOT NULL,
    "scorecardId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "monthIndex" INTEGER NOT NULL,
    "plannedValue" DECIMAL(18,4) NOT NULL,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_actuals" (
    "id" TEXT NOT NULL,
    "scorecardId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "actualValue" DECIMAL(18,4) NOT NULL,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_actuals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE INDEX "departments_is_active_idx" ON "departments"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_department_id_idx" ON "users"("departmentId");

-- CreateIndex
CREATE INDEX "users_department_active_idx" ON "users"("departmentId", "isActive");

-- CreateIndex
CREATE INDEX "scorecards_department_id_idx" ON "scorecards"("departmentId");

-- CreateIndex
CREATE INDEX "scorecards_year_idx" ON "scorecards"("year");

-- CreateIndex
CREATE UNIQUE INDEX "scorecards_department_year_key" ON "scorecards"("departmentId", "year");

-- CreateIndex
CREATE INDEX "perspectives_scorecard_sort_idx" ON "perspectives"("scorecardId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "perspectives_scorecard_name_key" ON "perspectives"("scorecardId", "name");

-- CreateIndex
CREATE INDEX "objectives_perspective_sort_idx" ON "objectives"("perspectiveId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "objectives_perspective_name_key" ON "objectives"("perspectiveId", "name");

-- CreateIndex
CREATE INDEX "activities_objective_sort_idx" ON "activities"("objectiveId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "activities_objective_name_key" ON "activities"("objectiveId", "name");

-- CreateIndex
CREATE INDEX "activity_responsible_units_department_idx" ON "activity_responsible_units"("departmentId");

-- CreateIndex
CREATE INDEX "monthly_plans_scorecard_year_month_idx" ON "monthly_plans"("scorecardId", "year", "monthIndex");

-- CreateIndex
CREATE INDEX "monthly_plans_activity_year_month_idx" ON "monthly_plans"("activityId", "year", "monthIndex");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_plans_scorecard_activity_year_month_index_key" ON "monthly_plans"("scorecardId", "activityId", "year", "monthIndex");

-- CreateIndex
CREATE INDEX "monthly_actuals_scorecard_year_month_idx" ON "monthly_actuals"("scorecardId", "year", "month");

-- CreateIndex
CREATE INDEX "monthly_actuals_activity_year_month_idx" ON "monthly_actuals"("activityId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_actuals_scorecard_activity_year_month_key" ON "monthly_actuals"("scorecardId", "activityId", "year", "month");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scorecards" ADD CONSTRAINT "scorecards_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perspectives" ADD CONSTRAINT "perspectives_scorecardId_fkey" FOREIGN KEY ("scorecardId") REFERENCES "scorecards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objectives" ADD CONSTRAINT "objectives_perspectiveId_fkey" FOREIGN KEY ("perspectiveId") REFERENCES "perspectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "objectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_responsible_units" ADD CONSTRAINT "activity_responsible_units_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_responsible_units" ADD CONSTRAINT "activity_responsible_units_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_plans" ADD CONSTRAINT "monthly_plans_scorecardId_fkey" FOREIGN KEY ("scorecardId") REFERENCES "scorecards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_plans" ADD CONSTRAINT "monthly_plans_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_plans" ADD CONSTRAINT "monthly_plans_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_plans" ADD CONSTRAINT "monthly_plans_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_actuals" ADD CONSTRAINT "monthly_actuals_scorecardId_fkey" FOREIGN KEY ("scorecardId") REFERENCES "scorecards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_actuals" ADD CONSTRAINT "monthly_actuals_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_actuals" ADD CONSTRAINT "monthly_actuals_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_actuals" ADD CONSTRAINT "monthly_actuals_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "perspectives"
ADD CONSTRAINT "perspectives_weight_range_chk"
CHECK ("weight" >= 0 AND "weight" <= 100);

ALTER TABLE "objectives"
ADD CONSTRAINT "objectives_weight_range_chk"
CHECK ("weight" >= 0 AND "weight" <= 100);

ALTER TABLE "activities"
ADD CONSTRAINT "activities_weight_range_chk"
CHECK ("weight" >= 0 AND "weight" <= 100);

ALTER TABLE "activities"
ADD CONSTRAINT "activities_annual_target_non_negative_chk"
CHECK ("annualTarget" >= 0);

ALTER TABLE "activities"
ADD CONSTRAINT "activities_baseline_non_negative_chk"
CHECK ("baseline" >= 0);

ALTER TABLE "monthly_plans"
ADD CONSTRAINT "monthly_plans_month_index_range_chk"
CHECK ("monthIndex" >= 0 AND "monthIndex" <= 11);

ALTER TABLE "monthly_plans"
ADD CONSTRAINT "monthly_plans_year_range_chk"
CHECK ("year" >= 2000 AND "year" <= 2100);

ALTER TABLE "monthly_plans"
ADD CONSTRAINT "monthly_plans_planned_value_non_negative_chk"
CHECK ("plannedValue" >= 0);

ALTER TABLE "monthly_actuals"
ADD CONSTRAINT "monthly_actuals_month_range_chk"
CHECK ("month" >= 1 AND "month" <= 12);

ALTER TABLE "monthly_actuals"
ADD CONSTRAINT "monthly_actuals_year_range_chk"
CHECK ("year" >= 2000 AND "year" <= 2100);

ALTER TABLE "monthly_actuals"
ADD CONSTRAINT "monthly_actuals_actual_value_non_negative_chk"
CHECK ("actualValue" >= 0);

ALTER TABLE "scorecards"
ADD CONSTRAINT "scorecards_year_range_chk"
CHECK ("year" >= 2000 AND "year" <= 2100);