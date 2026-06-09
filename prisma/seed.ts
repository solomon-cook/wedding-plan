import { PrismaClient } from "@prisma/client";
import { seedTimeline } from "../src/data/seedTimeline";

const prisma = new PrismaClient();

function uniqueTrimmed(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

async function main(): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.entryResponsibility.deleteMany();
    await tx.relatedTimelineEntry.deleteMany();
    await tx.timelineEntryItem.deleteMany();
    await tx.timelineEntryPerson.deleteMany();
    await tx.timelineEntry.deleteMany();
    await tx.item.deleteMany();
    await tx.person.deleteMany();

    const people = uniqueTrimmed(seedTimeline.flatMap((entry) => entry.people));
    const items = uniqueTrimmed(seedTimeline.flatMap((entry) => entry.items));

    await Promise.all(
      people.map((name) =>
        tx.person.create({
          data: { name },
        }),
      ),
    );

    await Promise.all(
      items.map((name) =>
        tx.item.create({
          data: { name },
        }),
      ),
    );

    const personRows = await tx.person.findMany();
    const itemRows = await tx.item.findMany();
    const personIdsByName = new Map(personRows.map((person) => [person.name, person.id]));
    const itemIdsByName = new Map(itemRows.map((item) => [item.name, item.id]));
    const entryIds = new Set(seedTimeline.map((entry) => entry.id));

    await Promise.all(
      seedTimeline.map((entry) =>
        tx.timelineEntry.create({
          data: {
            id: entry.id,
            title: entry.title,
            type: entry.type,
            date: entry.date,
            startTime: entry.startTime,
            endTime: entry.endTime,
            durationMinutes: entry.durationMinutes,
            location: entry.location,
            description: entry.description,
            timelineRole: entry.timelineRole,
            status: entry.status,
            color: entry.color,
          },
        }),
      ),
    );

    await Promise.all(
      seedTimeline
        .filter((entry) => entry.parentEntryId && entryIds.has(entry.parentEntryId))
        .map((entry) =>
          tx.timelineEntry.update({
            where: { id: entry.id },
            data: { parentEntryId: entry.parentEntryId },
          }),
        ),
    );

    for (const entry of seedTimeline) {
      const entryPeople = uniqueTrimmed(entry.people);
      const entryItems = uniqueTrimmed(entry.items);
      const relatedEntryIds = uniqueTrimmed(entry.relatedEntryIds).filter((relatedId) =>
        entryIds.has(relatedId),
      );

      await Promise.all([
        ...entryPeople.map((person, order) => {
          const personId = personIdsByName.get(person);

          if (!personId) {
            throw new Error(`Missing person while seeding: ${person}`);
          }

          return tx.timelineEntryPerson.create({
            data: {
              entryId: entry.id,
              personId,
              order,
            },
          });
        }),
        ...entryItems.map((item, order) => {
          const itemId = itemIdsByName.get(item);

          if (!itemId) {
            throw new Error(`Missing item while seeding: ${item}`);
          }

          return tx.timelineEntryItem.create({
            data: {
              entryId: entry.id,
              itemId,
              order,
            },
          });
        }),
        ...relatedEntryIds.map((relatedEntryId, order) =>
          tx.relatedTimelineEntry.create({
            data: {
              fromEntryId: entry.id,
              toEntryId: relatedEntryId,
              order,
            },
          }),
        ),
      ]);

      for (const item of entryItems) {
        const itemId = itemIdsByName.get(item);

        if (!itemId) {
          throw new Error(`Missing item while seeding responsibilities: ${item}`);
        }

        await Promise.all(
          entryPeople.map((person) => {
            const personId = personIdsByName.get(person);

            if (!personId) {
              throw new Error(`Missing person while seeding responsibilities: ${person}`);
            }

            return tx.entryResponsibility.create({
              data: {
                entryId: entry.id,
                itemId,
                personId,
              },
            });
          }),
        );
      }
    }
  });

  const [entryCount, personCount, itemCount] = await Promise.all([
    prisma.timelineEntry.count(),
    prisma.person.count(),
    prisma.item.count(),
  ]);

  console.log(`Seeded ${entryCount} entries, ${personCount} people, and ${itemCount} items.`);
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
