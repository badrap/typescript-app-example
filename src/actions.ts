import { createHash } from "node:crypto";
import { resolve4 } from "node:dns";
import type { API, Asset } from "@badrap/libapp/api";
import * as v from "@badrap/valita";

export const InstallationState = v
  .object({
    domains: v.array(v.string()),
  })
  .nullable(() => ({
    domains: [],
  }));

export async function getDomains(
  api: API,
  installationId: string,
): Promise<string[]> {
  const entry = await api.kv.get(["installations", installationId]);
  const { domains } = InstallationState.parse(entry.value);
  return domains;
}

export async function addDomain(
  api: API,
  installationId: string,
  domain: string,
): Promise<void> {
  for (;;) {
    const entry = await api.kv.get(["installations", installationId]);
    const { domains } = InstallationState.parse(entry.value);

    if (domains.includes(domain)) {
      return;
    }
    domains.push(domain);

    const commit = await api.kv
      .atomic()
      .check({
        key: ["tombstones", installationId],
        versionstamp: null,
      })
      .check(entry)
      .set(["installations", installationId], {
        domains,
      })
      .commit();
    if (commit.ok) {
      return;
    }
  }
}

export async function removeDomain(
  api: API,
  installationId: string,
  domain: string,
): Promise<void> {
  for (;;) {
    const entry = await api.kv.get(["installations", installationId]);
    const { domains } = InstallationState.parse(entry.value);

    const index = domains.indexOf(domain);
    if (index < 0) {
      return;
    }
    domains.splice(index, 1);

    const commit = await api.kv
      .atomic()
      .check({
        key: ["tombstones", installationId],
        versionstamp: null,
      })
      .check(entry)
      .set(["installations", installationId], {
        domains,
      })
      .commit();
    if (commit.ok) {
      return;
    }
  }
}

export async function updateInstallation(
  api: API,
  installationId: string,
): Promise<void> {
  await api.updateInstallation(installationId, async () => {
    const entry = await api.kv.get(["installations", installationId]);
    const { domains } = InstallationState.parse(entry.value);

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

export async function removeInstallation(
  api: API,
  installationId: string,
): Promise<void> {
  await api.kv.atomic().set(["tombstones", installationId], true).commit();

  for await (const { key } of api.kv.list({
    prefix: ["installations", installationId],
  })) {
    await api.kv.atomic().delete(key).commit();
  }

  await api.removeInstallation(installationId);
}
