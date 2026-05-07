import { rest } from "msw";

import { AgentPlan } from "@app/api/models";

let nextId = 1;
const plans: AgentPlan[] = [];

const handlers = [
  rest.get("/hub/agent-plans", (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json(plans));
  }),

  rest.get("/hub/agent-plans/:id", (req, res, ctx) => {
    const id = Number(req.params.id);
    const plan = plans.find((p) => p.id === id);
    if (!plan) return res(ctx.status(404));
    return res(ctx.status(200), ctx.json(plan));
  }),

  rest.post("/hub/agent-plans", async (req, res, ctx) => {
    const body = await req.json();
    const created: AgentPlan = { ...body, id: nextId++ };
    plans.push(created);
    return res(ctx.status(201), ctx.json(created));
  }),

  rest.put("/hub/agent-plans/:id", async (req, res, ctx) => {
    const id = Number(req.params.id);
    const body = await req.json();
    const idx = plans.findIndex((p) => p.id === id);
    if (idx === -1) return res(ctx.status(404));
    plans[idx] = { ...body, id };
    return res(ctx.status(204));
  }),

  rest.delete("/hub/agent-plans/:id", (req, res, ctx) => {
    const id = Number(req.params.id);
    const idx = plans.findIndex((p) => p.id === id);
    if (idx === -1) return res(ctx.status(404));
    plans.splice(idx, 1);
    return res(ctx.status(204));
  }),
];

export default handlers;
