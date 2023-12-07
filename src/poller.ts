import { createHash } from "node:crypto";
import { resolve4 } from "node:dns/promises";
import { setTimeout as sleep } from "node:timers/promises";
import { API, Asset, HTTPError } from "@badrap/libapp/api";

function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error;
}

// Update the assets for all installations continuously,
// rechecking them every 15 seconds.
export async function poll(api: API): Promise<void> {
  for (;;) {
    try {
      await pollOnce(api);
    } catch (err) {
      if (err instanceof HTTPError) {
        console.log(err);
      } else {
        throw err;
      }
    }
    await sleep(15_000);
  }
}

// Go through the installation list once.
// Update the assets for each installation.
async function pollOnce(api: API<any>): Promise<void> {
  // Get the list of installation list.
  const installations = await api.getInstallations();

  for (const { id, removed } of installations) {
    // Clean up installations of removed users (etc.)
    if (removed) {
      await api.removeInstallation(id);
      continue;
    }

    // Use the installation's current state to create an updated list of assets.
    await api.updateInstallation(id, async (installation) => {
      const domains: string[] = installation.state.domains || [];

      const assets: Asset[] = [];
      for (const domain of domains) {
        let ips: string[] = [];
        try {
          ips = await resolve4(domain);
        } catch (err) {
          if (!isNodeError(err) || err.code !== "ENOTFOUND") {
            console.error(err);
          }
        }
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
