import { API } from "@badrap/libapp/api";
import * as v from "@badrap/valita";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { poll } from "./poller.ts";
import { createRouter } from "./router.tsx";
import { State } from "./types.ts";

const env = v
  .object({
    NODE_ENV: v.string().optional(() => "production"),
    PORT: v
      .string()
      .chain((s) => {
        const n = Number(s);
        if (s.trim() && Number.isInteger(n) && n >= 0 && n < 65536) {
          return v.ok(n);
        }
        return v.err("not a valid port");
      })
      .optional(() => 4005),
    API_URL: v.string(),
    API_TOKEN: v.string(),
  })
  .parse(process.env, { mode: "strip" });

const api = new API({
  url: env.API_URL,
  token: env.API_TOKEN,
  stateType: State,
});

async function run(): Promise<void> {
  const app = new Hono();

  if (env.NODE_ENV === "development") {
    app.use(logger());
  }

  app.route("/", createRouter(api));

  serve({ fetch: app.fetch, port: env.PORT }, (addr) => {
    // eslint-disable-next-line no-console
    console.log(`Listening on port ${addr.port}...`);
  });

  await poll(api).then(() => {
    throw new Error("quit unexpectedly");
  });
}

void run();
