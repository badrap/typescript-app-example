import express from "express";
import Router from "express-promise-router";
import { API } from "./lib/api";

export function createRouter(api: API): express.Router {
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
    const { installation_id: installationId } = res.locals.token;

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
      // Render the list of domains that have already been added.
      domains.length === 0
        ? {
            type: "ui-box",
            props: { class: "flex justify-between items-center py-2" },
            children: ["No domains yet."],
          }
        : domains.map((domain: string) => ({
            type: "ui-box",
            props: { class: "flex justify-between items-center py-2" },
            children: [
              domain,
              {
                type: "ui-button",
                props: {
                  action: { type: "delete", domain },
                  variant: "danger",
                },
                children: ["Delete"],
              },
            ],
          })),
      // Show a form for adding domains.
      {
        type: "ui-form",
        children: [
          { type: "ui-text-field", props: { required: true, name: "domain" } },
          {
            type: "ui-button",
            props: {
              submit: true,
              variant: "primary",
              action: { type: "add" },
            },
            children: ["Add a domain"],
          },
        ],
      },
    ]);
  });

  return router;
}
