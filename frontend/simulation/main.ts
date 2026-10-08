import * as readline from "readline";
import { seedStudents, indianStudents } from "./seed_students";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question(`How many accounts to create? (max ${indianStudents.length}): `, async (answer) => {
  const count = parseInt(answer.trim(), 10);
  
  if (!isNaN(count) && count > 0) {
    await seedStudents(count);
  } else {
    console.log("Invalid number or operation cancelled.");
  }
  rl.close();
});
