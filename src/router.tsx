import { type API, HTTPError } from "@badrap/libapp/api";
import {
  Button,
  Flex,
  Form,
  Text,
  TextField,
} from "@badrap/libapp/ui/experimental";
import * as v from "@badrap/valita";
import { Hono, type HonoRequest } from "hono";
import { HTTPException } from "hono/http-exception";
import { addDomain, getDomains, removeDomain } from "./actions.ts";

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

export function createRouter(api: API): Hono {
  const router = new Hono();

  router.post("/app/ui", async (ctx) => {
    const { installationId } = await auth(ctx.req, api);
    const { action, client_state: clientState } = UiRequestBody.parse(
      await ctx.req.json(),
    );

    switch (action?.type) {
      case undefined: {
        break;
      }
      case "add": {
        const domain = clientState?.domain;
        if (domain) {
          await addDomain(api, installationId, domain);
        }
        break;
      }
      case "delete": {
        await removeDomain(api, installationId, action.domain);
        break;
      }
    }

    const domains = await getDomains(api, installationId);

    return Response.json(
      <Flex direction="column" gapY="2" gapX="4">
        {/* Render the list of domains that have already been added */}
        {domains.length === 0 ? (
          <Flex align="center" justify="center">
            <Text color="gray">No domains yet.</Text>
          </Flex>
        ) : (
          domains.map((domain) => (
            <Flex align="center" justify="space-between" gap="4">
              <Text truncate>{domain}</Text>
              <Button variant="danger" action={{ type: "delete", domain }}>
                Delete
              </Button>
            </Flex>
          ))
        )}
        {/* Show a form for adding domains */}
        <Form>
          <Flex gap="2" pt="4">
            <TextField required name="domain" />
            <Button submit variant="primary" action={{ type: "add" }}>
              Add a domain
            </Button>
          </Flex>
        </Form>
      </Flex>,
    );
  });

  return router;
}
