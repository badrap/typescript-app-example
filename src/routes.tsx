import express from "express";
import Router from "express-promise-router";
import { API } from "@badrap/libapp/api";

export function createRouter(api: API<any>): express.Router {
  const router = Router();

  router.use(async (req, res) => {
    const auth = req.headers.authorization || "";
    const match = auth.match(/^Bearer\s+([a-z0-9-._~+/]+=*)$/i);
    if (!match) {
      return res.sendStatus(401);
    }
    res.locals.token = await api.checkAuthToken(match[1]);
    return "next";
  });

  router.post("/ui", express.json(), async (req, res) => {
    const { action = {}, client_state: clientState = {} } = req.body;
    const { installationId } = res.locals.token;

    const { state } = await api.updateInstallation(
      installationId,
      ({ state }) => {
        if (action.type === "add") {
          const domain = clientState.domain;
          if (!domain) {
            return;
          }
          state.domains = state.domains || [];
          if (!state.domains.includes(domain)) {
            state.domains.push(domain);
            return { state };
          }
        } else if (action.type === "delete") {
          if (!state.domains) {
            return;
          }
          const index = state.domains.indexOf(action.domain);
          if (index < 0) {
            return;
          }
          state.domains.splice(index, 1);
          return { state };
        }
      }
    );

    const { domains = [] } = state;
    res.json([
      domains.length === 0 ? (
        // Render the list of domains that have already been added.
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
      ),
      // Show a form for adding domains.
      <ui-form>
        <ui-text-field required name="domain" />
        <ui-button submit variant="primary" action={{ type: "add" }}>
          Add a domain
        </ui-button>
      </ui-form>,
    ]);
  });

  return router;
}
