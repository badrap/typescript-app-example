import { createHash } from "node:crypto";
import { resolve4 } from "node:dns";
import { setTimeout as sleep } from "node:timers/promises";
import { type API, type Asset, HTTPError } from "@badrap/libapp/api";
import type { State } from "./types.ts";

// Update the assets for all installations continuously,
// rechecking them every 15 seconds.
export async function poll(api: API<State>): Promise<void> {
  for (;;) {
    try {
      await pollOnce(api);
    } catch (err) {
      if (err instanceof HTTPError) {
        // eslint-disable-next-line no-console
        console.log(err.stack);
      } else {
        throw err;
      }
    }
    await sleep(15_000);
  }
}

// Go through the installation list once.
// Update the assets for each installation.
async function pollOnce(api: API<State>): Promise<void> {
  for await (const { id, removed } of api.listInstallations()) {
    // Clean up removed installations.
    if (removed) {
      await api.removeInstallation(id);
      continue;
    }

    // Use the installation's current state to create an updated list of assets.
    await api.updateInstallation(id, async (installation) => {
      const { domains } = installation.state;

      const assets: Asset[] = [];
      for (const domain of domains) {
        const ips = await new Promise<string[]>((resolve) => {
          resolve4(domain, (err, ips) => {
            if (err) {
              if (err.code !== "ENOTFOUND") {
                // eslint-disable-next-line no-console
                console.error(err.stack);
              }
              resolve([]);
            } else {
              resolve(ips);
            }
          });
        });

        for (const ip of ips) {
          assets.push({
            type: "ip",
            value: ip,
            key: createHash("sha256").update(domain).digest("base64"),
            props: {
              title: domain,
            },
          });
        }
      }

      // Send the new list of assets for this installation.
      // At this point we could also update the state like this:
      // return { assets, state: { ...new state here... } };
      return { assets };
    });
  }
}
