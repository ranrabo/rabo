import { config } from "dotenv";
import bcrypt from "bcryptjs";
import { appUser, person, weeklyBlock } from "./schema";

config({ path: ".env.local" });

const required = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required to seed users`);
  return value;
};

const userOneEmail = required("SEED_USER_ONE_EMAIL");
const userOnePassword = required("SEED_USER_ONE_PASSWORD");
const userTwoEmail = required("SEED_USER_TWO_EMAIL");
const userTwoPassword = required("SEED_USER_TWO_PASSWORD");

const seed = async () => {
  const { db } = await import("./index");
  const existingPeople = await db.select().from(person);
  const peopleForBlocks = existingPeople.length ? existingPeople : await db
    .insert(person)
    .values([
      { fullName: "Person One", color: "#EE7E61", researchArea: "Computational fluid dynamics", sortOrder: 1 },
      { fullName: "Person Two", color: "#459379", researchArea: "Environmental sensing", sortOrder: 2 },
      { fullName: "Person Three", color: "#5F70B3", researchArea: "Materials characterization", sortOrder: 3 },
    ])
    .returning();

  const existingBlocks = await db.select({ id: weeklyBlock.id }).from(weeklyBlock).limit(1);
  if (!existingBlocks.length) {
    await db.insert(weeklyBlock).values(peopleForBlocks.flatMap((member, index) => [
      { personId: member.id, weekday: 1, startTime: index === 1 ? "10:00" : "09:00", endTime: "12:00", effectiveFrom: "2026-01-01" },
      { personId: member.id, weekday: 3, startTime: "13:00", endTime: "16:30", effectiveFrom: "2026-01-01" },
      { personId: member.id, weekday: 5, startTime: "09:30", endTime: "12:30", effectiveFrom: "2026-01-01" },
    ]));
  }

  await db
    .insert(appUser)
    .values([
      { email: userOneEmail.toLowerCase(), passwordHash: await bcrypt.hash(userOnePassword, 12), displayName: "Person One" },
      { email: userTwoEmail.toLowerCase(), passwordHash: await bcrypt.hash(userTwoPassword, 12), displayName: "Person Two" },
    ])
    .onConflictDoNothing();

  console.log("Seed complete with placeholder people and two configured users.");
};

seed().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
