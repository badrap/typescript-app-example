import { AddressInfo } from "node:net";
import express from "express";
import morgan from "morgan";
import { API } from "@badrap/libapp/api";
import { createRouter } from "./routes";
import { poll } from "./poller";

const { API_URL, API_TOKEN, NODE_ENV } = process.env;
if (!API_URL || !API_TOKEN) {
  throw new Error("env variables API_URL and API_TOKEN are required");
}

const api = new API({
  url: API_URL,
  token: API_TOKEN,
});
poll(api).then(() => {
  throw new Error("quit unexpectedly");
});

const app = express();
app.use(morgan(NODE_ENV === "production" ? "combined" : "dev"));
app.use("/app", createRouter(api));
const server = app.listen(process.env.PORT || 4005, () => {
  const addr = server.address() as AddressInfo;
  console.log(`Listening on port ${addr.port}...`);
});
