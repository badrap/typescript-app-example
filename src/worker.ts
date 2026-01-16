import { setTimeout as sleep } from "node:timers/promises";
import { type API, HTTPError } from "@badrap/libapp/api";
import { removeInstallation, updateInstallation } from "./actions.ts";

// Update the assets for all installations continuously,
// rechecking them every 15 seconds.
export async function poll(api: API): Promise<void> {
  for (;;) {
    try {
      for await (const { id, removed } of api.listInstallations()) {
        try {
          if (removed) {
            // Clean up removed installations.
            await removeInstallation(api, id);
          } else {
            await updateInstallation(api, id);
          }
        } catch (err) {
          if (err instanceof HTTPError) {
            // eslint-disable-next-line no-console
            console.error(err.stack);
          } else {
            throw err;
          }
        }
      }
    } catch (err) {
      if (err instanceof HTTPError) {
        // eslint-disable-next-line no-console
        console.error(err.stack);
      } else {
        throw err;
      }
    }
    await sleep(15_000);
  }
}
