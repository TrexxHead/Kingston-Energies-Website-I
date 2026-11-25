-- Energy platform schema (PR #48): new tables only — no existing table,
-- column or row is changed or removed.
--
-- For a database whose schema matches `main` before PR #48 is merged
-- (i.e. production). Paste into Supabase → SQL Editor → New query → Run.
-- It runs as one transaction: if any statement fails (for example because a
-- table already exists), nothing is applied and you can tell us the error.
-- Databases that already have some of these tables (the preview database)
-- should use `npx prisma db push` instead.
--
-- Generated with: prisma migrate diff --from-schema-datamodel <main schema>
--   --to-schema-datamodel prisma/schema.prisma --script
-- Row level security for the new tables is at the end (same as
-- prisma/enable-rls.sql).

BEGIN;

-- CreateEnum
CREATE TYPE "EnergyPropertyKind" AS ENUM ('HOME', 'BUSINESS');

-- CreateTable
CREATE TABLE "EnergyProperty" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT,
    "name" TEXT NOT NULL,
    "kind" "EnergyPropertyKind" NOT NULL DEFAULT 'HOME',
    "parish" TEXT,
    "occupants" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnergyProperty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnergyVehicle" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnergyVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnergyDevice" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "clientId" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "brand" TEXT,
    "model" TEXT,
    "load" JSONB NOT NULL,
    "motorLoad" BOOLEAN NOT NULL DEFAULT false,
    "startupWatts" DOUBLE PRECISION,
    "startupBasis" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnergyDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceMeasurement" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "durationHours" DOUBLE PRECISION,
    "method" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnergyScenario" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "clientId" TEXT,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "targetHours" DOUBLE PRECISION,
    "reserveFraction" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnergyScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScenarioItem" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "quantityOverride" INTEGER,
    "simultaneous" BOOLEAN NOT NULL DEFAULT true,
    "essential" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ScenarioItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalculationRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "propertyId" TEXT,
    "scenarioId" TEXT,
    "kind" TEXT NOT NULL,
    "engineVersion" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "inputSnapshot" JSONB NOT NULL,
    "outputs" JSONB NOT NULL,
    "supersedesId" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalculationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogueSku" (
    "id" TEXT NOT NULL,
    "catalogId" TEXT,
    "kind" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "manufacturer" TEXT,
    "model" TEXT,
    "regionVariant" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogueSku_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecEvidence" (
    "id" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "valueNum" DOUBLE PRECISION,
    "valueText" TEXT,
    "unit" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "documentPath" TEXT,
    "sourceNote" TEXT,
    "reviewState" TEXT NOT NULL DEFAULT 'unverified',
    "createdBy" TEXT,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpecEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvOperator" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "appInfo" TEXT,
    "contact" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvOperator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvStation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "operatorId" TEXT,
    "parish" TEXT NOT NULL,
    "address" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "access" TEXT NOT NULL DEFAULT 'public',
    "accessNotes" TEXT,
    "hours" TEXT,
    "paymentNotes" TEXT,
    "pricingNotes" TEXT,
    "pricingObservedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "googlePlaceId" TEXT,
    "operatorLocationId" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verificationNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvStation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvConnectorGroup" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "connectorType" TEXT NOT NULL,
    "currentType" TEXT NOT NULL,
    "maxPowerKw" DOUBLE PRECISION,
    "count" INTEGER,
    "portsShared" BOOLEAN,
    "notes" TEXT,

    CONSTRAINT "EvConnectorGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvSourceRecord" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "licence" TEXT,
    "permissionScope" TEXT,
    "url" TEXT,
    "contact" TEXT,
    "observedAt" TIMESTAMP(3),
    "retrievedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "reviewState" TEXT NOT NULL DEFAULT 'unverified',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvSourceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvStatusObservation" (
    "id" TEXT NOT NULL,
    "connectorGroupId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3),
    "retrievedAt" TIMESTAMP(3) NOT NULL,
    "availableCount" INTEGER,
    "outOfServiceCount" INTEGER,
    "inUseCount" INTEGER,
    "supportsInUse" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvStatusObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvCommunityReport" (
    "id" TEXT NOT NULL,
    "stationId" TEXT,
    "kind" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "message" TEXT,
    "proposedName" TEXT,
    "proposedLat" DOUBLE PRECISION,
    "proposedLng" DOUBLE PRECISION,
    "parish" TEXT,
    "contactEmail" TEXT,
    "userId" TEXT,
    "moderation" TEXT NOT NULL DEFAULT 'pending',
    "moderatorNote" TEXT,
    "moderatedBy" TEXT,
    "moderatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvCommunityReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MapCoverageReview" (
    "parish" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'unreviewed',
    "sourcesReviewed" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapCoverageReview_pkey" PRIMARY KEY ("parish")
);

-- CreateTable
CREATE TABLE "ServiceBooking" (
    "id" TEXT NOT NULL,
    "bookingNo" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "window" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "parish" TEXT NOT NULL,
    "address" TEXT,
    "notes" TEXT,
    "userId" TEXT,
    "whatsappOptIn" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "depositAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "depositStatus" TEXT NOT NULL DEFAULT 'none',
    "depositPaidAt" TIMESTAMP(3),
    "staffNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Installer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "business" TEXT,
    "parishes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "services" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "licenceType" TEXT,
    "licenceNumber" TEXT,
    "licenceExpires" TIMESTAMP(3),
    "evidenceNote" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdBy" TEXT,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Installer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolarProject" (
    "id" TEXT NOT NULL,
    "projectNo" TEXT NOT NULL,
    "userId" TEXT,
    "customerName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "parish" TEXT,
    "address" TEXT,
    "note" TEXT,
    "exportsToGrid" BOOLEAN NOT NULL DEFAULT false,
    "stage" TEXT NOT NULL DEFAULT 'enquiry',
    "design" JSONB NOT NULL,
    "quote" JSONB,
    "quoteStatus" TEXT NOT NULL DEFAULT 'none',
    "quoteSentAt" TIMESTAMP(3),
    "quoteAcceptedAt" TIMESTAMP(3),
    "bookingNo" TEXT,
    "staffNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SolarProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolarProjectEvent" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "stage" TEXT,
    "note" TEXT,
    "customerVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolarProjectEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolarProjectDocument" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT,
    "url" TEXT,
    "customerVisible" BOOLEAN NOT NULL DEFAULT true,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolarProjectDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EnergyProperty_userId_idx" ON "EnergyProperty"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EnergyProperty_userId_clientId_key" ON "EnergyProperty"("userId", "clientId");

-- CreateIndex
CREATE INDEX "EnergyVehicle_userId_idx" ON "EnergyVehicle"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EnergyVehicle_userId_clientId_key" ON "EnergyVehicle"("userId", "clientId");

-- CreateIndex
CREATE INDEX "EnergyDevice_propertyId_idx" ON "EnergyDevice"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "EnergyDevice_propertyId_clientId_key" ON "EnergyDevice"("propertyId", "clientId");

-- CreateIndex
CREATE INDEX "DeviceMeasurement_deviceId_idx" ON "DeviceMeasurement"("deviceId");

-- CreateIndex
CREATE INDEX "EnergyScenario_propertyId_idx" ON "EnergyScenario"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "EnergyScenario_propertyId_clientId_key" ON "EnergyScenario"("propertyId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ScenarioItem_scenarioId_deviceId_key" ON "ScenarioItem"("scenarioId", "deviceId");

-- CreateIndex
CREATE INDEX "CalculationRun_userId_idx" ON "CalculationRun"("userId");

-- CreateIndex
CREATE INDEX "CalculationRun_propertyId_idx" ON "CalculationRun"("propertyId");

-- CreateIndex
CREATE INDEX "CalculationRun_inputHash_idx" ON "CalculationRun"("inputHash");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogueSku_catalogId_key" ON "CatalogueSku"("catalogId");

-- CreateIndex
CREATE INDEX "CatalogueSku_status_idx" ON "CatalogueSku"("status");

-- CreateIndex
CREATE INDEX "SpecEvidence_skuId_field_idx" ON "SpecEvidence"("skuId", "field");

-- CreateIndex
CREATE UNIQUE INDEX "EvOperator_name_key" ON "EvOperator"("name");

-- CreateIndex
CREATE UNIQUE INDEX "EvStation_googlePlaceId_key" ON "EvStation"("googlePlaceId");

-- CreateIndex
CREATE INDEX "EvStation_parish_status_idx" ON "EvStation"("parish", "status");

-- CreateIndex
CREATE INDEX "EvConnectorGroup_stationId_idx" ON "EvConnectorGroup"("stationId");

-- CreateIndex
CREATE INDEX "EvSourceRecord_stationId_idx" ON "EvSourceRecord"("stationId");

-- CreateIndex
CREATE INDEX "EvStatusObservation_connectorGroupId_observedAt_idx" ON "EvStatusObservation"("connectorGroupId", "observedAt");

-- CreateIndex
CREATE INDEX "EvCommunityReport_moderation_createdAt_idx" ON "EvCommunityReport"("moderation", "createdAt");

-- CreateIndex
CREATE INDEX "EvCommunityReport_stationId_idx" ON "EvCommunityReport"("stationId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceBooking_bookingNo_key" ON "ServiceBooking"("bookingNo");

-- CreateIndex
CREATE INDEX "ServiceBooking_date_window_status_idx" ON "ServiceBooking"("date", "window", "status");

-- CreateIndex
CREATE INDEX "ServiceBooking_status_createdAt_idx" ON "ServiceBooking"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Installer_status_idx" ON "Installer"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SolarProject_projectNo_key" ON "SolarProject"("projectNo");

-- CreateIndex
CREATE INDEX "SolarProject_stage_createdAt_idx" ON "SolarProject"("stage", "createdAt");

-- CreateIndex
CREATE INDEX "SolarProject_userId_idx" ON "SolarProject"("userId");

-- CreateIndex
CREATE INDEX "SolarProject_email_idx" ON "SolarProject"("email");

-- CreateIndex
CREATE INDEX "SolarProjectEvent_projectId_createdAt_idx" ON "SolarProjectEvent"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "SolarProjectDocument_projectId_idx" ON "SolarProjectDocument"("projectId");

-- AddForeignKey
ALTER TABLE "EnergyProperty" ADD CONSTRAINT "EnergyProperty_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnergyVehicle" ADD CONSTRAINT "EnergyVehicle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnergyDevice" ADD CONSTRAINT "EnergyDevice_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "EnergyProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceMeasurement" ADD CONSTRAINT "DeviceMeasurement_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "EnergyDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnergyScenario" ADD CONSTRAINT "EnergyScenario_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "EnergyProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioItem" ADD CONSTRAINT "ScenarioItem_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "EnergyScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioItem" ADD CONSTRAINT "ScenarioItem_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "EnergyDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalculationRun" ADD CONSTRAINT "CalculationRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalculationRun" ADD CONSTRAINT "CalculationRun_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "EnergyProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalculationRun" ADD CONSTRAINT "CalculationRun_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "EnergyScenario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalculationRun" ADD CONSTRAINT "CalculationRun_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "CalculationRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecEvidence" ADD CONSTRAINT "SpecEvidence_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "CatalogueSku"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvStation" ADD CONSTRAINT "EvStation_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "EvOperator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvConnectorGroup" ADD CONSTRAINT "EvConnectorGroup_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "EvStation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvSourceRecord" ADD CONSTRAINT "EvSourceRecord_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "EvStation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvStatusObservation" ADD CONSTRAINT "EvStatusObservation_connectorGroupId_fkey" FOREIGN KEY ("connectorGroupId") REFERENCES "EvConnectorGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvCommunityReport" ADD CONSTRAINT "EvCommunityReport_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "EvStation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolarProject" ADD CONSTRAINT "SolarProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolarProjectEvent" ADD CONSTRAINT "SolarProjectEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "SolarProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolarProjectDocument" ADD CONSTRAINT "SolarProjectDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "SolarProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Row level security (deny-all to Supabase's public API; the app's own connection bypasses it).
ALTER TABLE public."EnergyProperty" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EnergyVehicle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EnergyDevice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."DeviceMeasurement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EnergyScenario" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ScenarioItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CalculationRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CatalogueSku" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SpecEvidence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EvOperator" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EvStation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EvConnectorGroup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EvSourceRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EvStatusObservation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EvCommunityReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MapCoverageReview" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ServiceBooking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Installer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SolarProject" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SolarProjectEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SolarProjectDocument" ENABLE ROW LEVEL SECURITY;

COMMIT;
