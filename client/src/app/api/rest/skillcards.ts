import type { SkillCard } from "../k8s-models";
import {
  listResource,
  getResource,
  createResource,
  updateResource,
  deleteResource,
} from "../k8s";

const PLURAL = "skillcards";

export const getSkillCards = (): Promise<SkillCard[]> =>
  listResource<SkillCard>(PLURAL);

export const getSkillCard = (name: string): Promise<SkillCard> =>
  getResource<SkillCard>(PLURAL, name);

export const createSkillCard = (
  resource: Omit<SkillCard, "status">
): Promise<SkillCard> => createResource<SkillCard>(PLURAL, resource);

export const updateSkillCard = (resource: SkillCard): Promise<SkillCard> =>
  updateResource<SkillCard>(PLURAL, resource);

export const deleteSkillCard = (name: string): Promise<void> =>
  deleteResource(PLURAL, name);
