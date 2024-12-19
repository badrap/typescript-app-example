import { API, HTTPError } from "@badrap/libapp/api";
import * as v from "@badrap/valita";
import { Hono, HonoRequest } from "hono";
import { HTTPException } from "hono/http-exception";
import { State } from "./types.ts";

async function auth(
  req: HonoRequest,
  api: API,
): Promise<{ installationId: string }> {
  const auth = req.header("authorization") ?? "";
  const [, token] = /^Bearer\s+([a-z0-9-._~+/]+=*)$/i.exec(auth) ?? [];
  if (!token) {
    throw new HTTPException(401, { message: "bearer token missing" });
  }
  try {
    return await api.checkAuthToken(token);
  } catch (err) {
    if (err instanceof HTTPError && err.statusCode === 404) {
      throw new HTTPException(403, { message: "invalid token" });
    }
    throw err;
  }
}

const UiRequestBody = v.object({
  action: v
    .union(
      v.object({ type: v.literal("add") }),
      v.object({ type: v.literal("delete"), domain: v.string() }),
    )
    .optional(),
  client_state: v
    .object({
      domain: v.string().optional(),
    })
    .optional(),
});

export function createRouter(api: API<State>): Hono {
  const router = new Hono();

  router.post("/app/ui", async (ctx) => {
    const { installationId } = await auth(ctx.req, api);
    const { action, client_state: clientState } = UiRequestBody.parse(
      await ctx.req.json(),
    );

    switch (action?.type) {
      case undefined:
        break;
      case "add":
        await api.updateInstallation(installationId, ({ state }) => {
          const domain = clientState?.domain;
          if (!domain) {
            return;
          }
          if (!state.domains.includes(domain)) {
            state.domains.push(domain);
            return { state };
          }
        });
        break;
      case "delete":
        await api.updateInstallation(installationId, ({ state }) => {
          const index = state.domains.indexOf(action.domain);
          if (index < 0) {
            return;
          }
          state.domains.splice(index, 1);
          return { state };
        });
        break;
    }

    const {
      state: { domains },
    } = await api.getInstallation(installationId);

    return Response.json(
      <ui-box>
        {/* Render the list of domains that have already been added */}
        {domains.length === 0 ? (
          <ui-box class="flex justify-between items-center py-2">
            No domains yet.
          </ui-box>
        ) : (
          domains.map((domain: string) => (
            <ui-box class="flex justify-between items-center py-2">
              {domain}
              <ui-button variant="danger" action={{ type: "delete", domain }}>
                Delete
              </ui-button>
            </ui-box>
          ))
        )}
        {/* Show a form for adding domains */}
        <ui-form>
          <ui-text-field required name="domain" />
          <ui-button submit variant="primary" action={{ type: "add" }}>
            Add a domain
          </ui-button>
        </ui-form>
      </ui-box>,
    );
  });

  return router;
}
