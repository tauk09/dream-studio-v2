import { loadLocalDotEnv } from "./dotenv.js";
import { buildServer } from "./server.js";

loadLocalDotEnv();

const port = Number(process.env["PORT"] ?? 4000);
const host =
  process.env["HOST"] ?? (process.env["NODE_ENV"] === "production" ? "0.0.0.0" : "127.0.0.1");
const app = buildServer(true);

app
  .listen({ port, host })
  .then(() => {
    app.log.info(`Dream Studio 2.0 listening on http://${host}:${port}`);
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
