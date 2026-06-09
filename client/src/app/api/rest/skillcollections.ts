import type { SkillCollection } from "../k8s-models";
import {
  listResource,
  getResource,
  createResource,
  updateResource,
  deleteResource,
} from "../k8s";

const PLURAL = "skillcollections";

export const getSkillCollections = (): Promise<SkillCollection[]> =>
  listResource<SkillCollection>(PLURAL);

export const getSkillCollection = (name: string): Promise<SkillCollection> =>
  getResource<SkillCollection>(PLURAL, name);

export const createSkillCollection = (
  resource: Omit<SkillCollection, "status">
): Promise<SkillCollection> =>
  createResource<SkillCollection>(PLURAL, resource);

export const updateSkillCollection = (
  resource: SkillCollection
): Promise<SkillCollection> =>
  updateResource<SkillCollection>(PLURAL, resource);

export const deleteSkillCollection = (name: string): Promise<void> =>
  deleteResource(PLURAL, name);
