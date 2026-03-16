-- CreateTable
CREATE TABLE "EventType" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "thumbnail" TEXT NOT NULL,

    CONSTRAINT "EventType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_EventToEventType" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_EventToEventType_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_EventToEventType_B_index" ON "_EventToEventType"("B");

-- AddForeignKey
ALTER TABLE "_EventToEventType" ADD CONSTRAINT "_EventToEventType_A_fkey" FOREIGN KEY ("A") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventToEventType" ADD CONSTRAINT "_EventToEventType_B_fkey" FOREIGN KEY ("B") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
