import { prisma, disconnectDb } from "../src/config/db.js";

const TITLES = [
  "The Matrix",
  "Inception",
  "The Dark Knight",
  "Pulp Fiction",
  "Interstellar",
  "The Shawshank Redemption",
  "Fight Club",
  "Forrest Gump",
  "The Godfather",
  "Goodfellas",
];

const GENRE_POOL = [
  "Action",
  "Sci-Fi",
  "Thriller",
  "Drama",
  "Crime",
  "Adventure",
  "Romance",
  "Biography",
];

function pickRandomGenres() {
  const shuffled = [...GENRE_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 2 + Math.floor(Math.random() * 2));
}

function buildRandomMovies(userId) {
  return TITLES.map((title, index) => ({
    title: `${title} ${Math.floor(Math.random() * 1000)}`,
    overview: `Random generated movie seeded from ${title}.`,
    releaseYear: 1980 + Math.floor(Math.random() * 45),
    genres: pickRandomGenres(),
    runtime: 90 + Math.floor(Math.random() * 90),
    posterUrl: `https://example.com/poster-${index + 1}.jpg`,
    createdBy: userId,
  }));
}

async function main() {
  const existingUser = await prisma.user.findFirst();
  if (!existingUser) {
    console.log("No user found. Create a user first, then run seed.");
    return;
  }

  const movies = buildRandomMovies(existingUser.id);

  await prisma.movie.createMany({
    data: movies,
  });

  console.log(`${movies.length} random movies seeded successfully.`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectDb();
  });
