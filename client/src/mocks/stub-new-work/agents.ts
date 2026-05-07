import { rest } from "msw";

import { AgentConfig } from "@app/api/models";

let nextId = 1;
const agents: AgentConfig[] = [];

const handlers = [
  rest.get("/hub/agents", (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json(agents));
  }),

  rest.get("/hub/agents/:id", (req, res, ctx) => {
    const id = Number(req.params.id);
    const agent = agents.find((a) => a.id === id);
    if (!agent) return res(ctx.status(404));
    return res(ctx.status(200), ctx.json(agent));
  }),

  rest.post("/hub/agents", async (req, res, ctx) => {
    const body = await req.json();
    const created: AgentConfig = { ...body, id: nextId++ };
    agents.push(created);
    return res(ctx.status(201), ctx.json(created));
  }),

  rest.put("/hub/agents/:id", async (req, res, ctx) => {
    const id = Number(req.params.id);
    const body = await req.json();
    const idx = agents.findIndex((a) => a.id === id);
    if (idx === -1) return res(ctx.status(404));
    agents[idx] = { ...body, id };
    return res(ctx.status(204));
  }),

  rest.delete("/hub/agents/:id", (req, res, ctx) => {
    const id = Number(req.params.id);
    const idx = agents.findIndex((a) => a.id === id);
    if (idx === -1) return res(ctx.status(404));
    agents.splice(idx, 1);
    return res(ctx.status(204));
  }),
];

export default handlers;
