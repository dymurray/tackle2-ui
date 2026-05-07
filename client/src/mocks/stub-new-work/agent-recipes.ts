import { rest } from "msw";

import { AgentRecipe } from "@app/api/models";

let nextId = 1;
const recipes: AgentRecipe[] = [];

const handlers = [
  rest.get("/hub/agent-recipes", (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json(recipes));
  }),

  rest.get("/hub/agent-recipes/:id", (req, res, ctx) => {
    const id = Number(req.params.id);
    const recipe = recipes.find((r) => r.id === id);
    if (!recipe) return res(ctx.status(404));
    return res(ctx.status(200), ctx.json(recipe));
  }),

  rest.post("/hub/agent-recipes", async (req, res, ctx) => {
    const body = await req.json();
    const created: AgentRecipe = { ...body, id: nextId++ };
    recipes.push(created);
    return res(ctx.status(201), ctx.json(created));
  }),

  rest.put("/hub/agent-recipes/:id", async (req, res, ctx) => {
    const id = Number(req.params.id);
    const body = await req.json();
    const idx = recipes.findIndex((r) => r.id === id);
    if (idx === -1) return res(ctx.status(404));
    recipes[idx] = { ...body, id };
    return res(ctx.status(204));
  }),

  rest.delete("/hub/agent-recipes/:id", (req, res, ctx) => {
    const id = Number(req.params.id);
    const idx = recipes.findIndex((r) => r.id === id);
    if (idx === -1) return res(ctx.status(404));
    recipes.splice(idx, 1);
    return res(ctx.status(204));
  }),
];

export default handlers;
