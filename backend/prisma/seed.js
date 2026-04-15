import { disconnectDb } from "../src/config/db.js";

async function main() {
  console.log("No default seed configured. Use app registration or your own scripts.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectDb();
  });
