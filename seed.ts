import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";
import { geese, type NewGoose } from "./src/db/schema";

config({ path: ".dev.vars" });

// biome-ignore lint/style/noNonNullAssertion: error from neon client is helpful enough to fix
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

const seedData: NewGoose[] = [
  {
    name: "Nikita Shamgunov",
    description: "Co-founder of SingleStore and Neon",
    isFlockLeader: true,
    programmingLanguage: "C++",
    motivations: { goals: ["Build fastest postgres", "Revolutionize databases"] },
    location: "San Flock-cisco",
    bio: "Database pioneer and flock leader"
  },
  {
    name: "Heikki Linnakangas",
    description: "Core Postgres contributor",
    isFlockLeader: false,
    programmingLanguage: "C",
    motivations: { goals: ["Improve Postgres performance", "Enhance reliability"] },
    location: "Wing-land",
    bio: "Long-time PostgreSQL core goose member"
  },
  {
    name: "Stas Kelvich",
    description: "Postgres expert and Neon contributor",
    isFlockLeader: false,
    programmingLanguage: "Rust",
    motivations: { goals: ["Scale postgres", "Cloud native databases"] },
    location: "Honclino",
    bio: "Database goose focused on distributed systems"
  }
];

async function seed() {
  await db.insert(geese).values(seedData);
}

async function main() {
  try {
    await seed();
    console.log("✅ Database seeded successfully!");
    console.log("🪿 Run `npm run fiberplane` to explore data with your api.");
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}
main();
