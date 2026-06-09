CREATE TABLE "TimelineEntry" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "date" TEXT,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT,
  "durationMinutes" INTEGER,
  "location" TEXT,
  "description" TEXT,
  "timelineRole" TEXT,
  "parentEntryId" TEXT,
  "status" TEXT,
  "color" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TimelineEntry_parentEntryId_fkey"
    FOREIGN KEY ("parentEntryId") REFERENCES "TimelineEntry" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "Person" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL
);

CREATE TABLE "Item" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL
);

CREATE TABLE "TimelineEntryPerson" (
  "entryId" TEXT NOT NULL,
  "personId" INTEGER NOT NULL,
  "order" INTEGER NOT NULL,
  PRIMARY KEY ("entryId", "personId"),
  CONSTRAINT "TimelineEntryPerson_entryId_fkey"
    FOREIGN KEY ("entryId") REFERENCES "TimelineEntry" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TimelineEntryPerson_personId_fkey"
    FOREIGN KEY ("personId") REFERENCES "Person" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "TimelineEntryItem" (
  "entryId" TEXT NOT NULL,
  "itemId" INTEGER NOT NULL,
  "order" INTEGER NOT NULL,
  PRIMARY KEY ("entryId", "itemId"),
  CONSTRAINT "TimelineEntryItem_entryId_fkey"
    FOREIGN KEY ("entryId") REFERENCES "TimelineEntry" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TimelineEntryItem_itemId_fkey"
    FOREIGN KEY ("itemId") REFERENCES "Item" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "RelatedTimelineEntry" (
  "fromEntryId" TEXT NOT NULL,
  "toEntryId" TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  PRIMARY KEY ("fromEntryId", "toEntryId"),
  CONSTRAINT "RelatedTimelineEntry_fromEntryId_fkey"
    FOREIGN KEY ("fromEntryId") REFERENCES "TimelineEntry" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RelatedTimelineEntry_toEntryId_fkey"
    FOREIGN KEY ("toEntryId") REFERENCES "TimelineEntry" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "EntryResponsibility" (
  "entryId" TEXT NOT NULL,
  "itemId" INTEGER NOT NULL,
  "personId" INTEGER NOT NULL,
  PRIMARY KEY ("entryId", "itemId", "personId"),
  CONSTRAINT "EntryResponsibility_entryId_fkey"
    FOREIGN KEY ("entryId") REFERENCES "TimelineEntry" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EntryResponsibility_itemId_fkey"
    FOREIGN KEY ("itemId") REFERENCES "Item" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EntryResponsibility_personId_fkey"
    FOREIGN KEY ("personId") REFERENCES "Person" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Person_name_key" ON "Person" ("name");
CREATE UNIQUE INDEX "Item_name_key" ON "Item" ("name");
CREATE INDEX "TimelineEntry_date_startTime_idx" ON "TimelineEntry" ("date", "startTime");
CREATE INDEX "TimelineEntry_type_idx" ON "TimelineEntry" ("type");
CREATE INDEX "TimelineEntry_timelineRole_idx" ON "TimelineEntry" ("timelineRole");
CREATE INDEX "TimelineEntry_parentEntryId_idx" ON "TimelineEntry" ("parentEntryId");
CREATE INDEX "TimelineEntryPerson_personId_idx" ON "TimelineEntryPerson" ("personId");
CREATE INDEX "TimelineEntryItem_itemId_idx" ON "TimelineEntryItem" ("itemId");
CREATE INDEX "RelatedTimelineEntry_toEntryId_idx" ON "RelatedTimelineEntry" ("toEntryId");
CREATE INDEX "EntryResponsibility_itemId_idx" ON "EntryResponsibility" ("itemId");
CREATE INDEX "EntryResponsibility_personId_idx" ON "EntryResponsibility" ("personId");
