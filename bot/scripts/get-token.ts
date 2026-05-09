/**
 * Run this ONCE to get your refresh token.
 * Steps:
 *   1. Set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET in bot/.env
 *   2. cd bot && npm install
 *   3. node --loader ts-node/esm scripts/get-token.ts
 *   4. Open the printed URL, authorize the app, paste the code back
 *   5. Copy the printed refresh_token into bot/.env as YOUTUBE_REFRESH_TOKEN
 */
import "dotenv/config";
import { google } from "googleapis";
import * as readline from "readline";

const auth = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  "urn:ietf:wg:oauth:2.0:oob"
);

const url = auth.generateAuthUrl({
  access_type: "offline",
  scope: ["https://www.googleapis.com/auth/youtube.force-ssl"],
});

console.log("\nOpen this URL in your browser and authorize the app:\n");
console.log(url);
console.log();

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question("Paste the authorization code here: ", async (code) => {
  rl.close();
  const { tokens } = await auth.getToken(code.trim());
  console.log("\nYour refresh token (add to bot/.env):\n");
  console.log(`YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}`);
});
