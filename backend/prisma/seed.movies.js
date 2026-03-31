import { prisma } from "../src/config/db.js";

async function main() {
  const existingUser = await prisma.user.findFirst();
  if (!existingUser) {
    console.log("No user found. Create a user first, then run seed.");
    return;
  }

  await prisma.movie.createMany({
    data: [
      {
        title: "Sample Movie 1",
        overview: "Seeded sample movie",
        releaseYear: 2024,
        genres: ["Drama"],
        createdBy: existingUser.id,
      },
      {
        title: "Sample Movie 2",
        overview: "Seeded sample movie",
        releaseYear: 2025,
        genres: ["Action"],
        createdBy: existingUser.id,
      },
    ],
  });

  console.log("Movies seeded successfully.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
