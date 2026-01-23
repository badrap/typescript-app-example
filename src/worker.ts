import { setTimeout as sleep } from "node:timers/promises";
import { type API, HTTPError } from "@badrap/libapp/api";
import { removeInstallation, updateInstallation } from "./actions.ts";

// Update the assets for all installations continuously,
// rechecking them every 15 seconds.
export async function poll(api: API): Promise<void> {
  for (;;) {
    try {
      for await (const { id, status } of api.listInstallations()) {
        try {
          switch (status) {
            case "active":
              // Update assets for active installations.
              await updateInstallation(api, id);
              break;
            case "paused":
              // No need to process paused installations, just skip.
              break;
            case "uninstalled":
              // Clean up resources of uninstalled installations.
              await removeInstallation(api, id);
              break;
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
