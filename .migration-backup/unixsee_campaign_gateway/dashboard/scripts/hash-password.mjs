#!/usr/bin/env node
import bcrypt from "bcryptjs";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const passwordArg = process.argv[2];
let password = passwordArg;
if (!password) {
  const rl = createInterface({ input, output });
  password = await rl.question("Password to hash: ");
  rl.close();
}
if (!password || password.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}
const hash = await bcrypt.hash(password, 12);
console.log(hash);
