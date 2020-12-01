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
    const { action = {}, clientState = {} } = req.body.payload;

    const { state } = await api.updateInstallation(
      res.locals.token.installationId,
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
            type: "Box",
            props: { class: "flex justify-between items-center py-2" },
            children: ["No domains yet."],
          }
        : domains.map((domain: string) => ({
            type: "Box",
            props: { class: "flex justify-between items-center py-2" },
            children: [
              domain,
              {
                type: "Button",
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
        type: "Form",
        children: [
          { type: "TextField", props: { required: true, name: "domain" } },
          {
            type: "Button",
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
