import { API } from "@badrap/libapp/api";
import * as v from "@badrap/valita";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { poll } from "./poller";
import { createRouter } from "./router";
import { State } from "./types";

const env = v
  .object({
    NODE_ENV: v.string().default("production"),
    PORT: v
      .string()
      .default("4005")
      .chain((s) => {
        const n = Number(s);
        if (s.trim() && !isNaN(n)) {
          return v.ok(n);
        }
        return v.err("not a valid port");
      }),
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
    console.log(`Listening on port ${addr.port}...`);
  });

  poll(api).then(() => {
    throw new Error("quit unexpectedly");
  });
}

void run();
