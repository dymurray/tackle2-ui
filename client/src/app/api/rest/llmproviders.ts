import type { LLMProvider } from "../k8s-models";
import {
  listResource,
  getResource,
  createResource,
  updateResource,
  deleteResource,
} from "../k8s";

const PLURAL = "llmproviders";

export const getLLMProviders = (): Promise<LLMProvider[]> =>
  listResource<LLMProvider>(PLURAL);

export const getLLMProvider = (name: string): Promise<LLMProvider> =>
  getResource<LLMProvider>(PLURAL, name);

export const createLLMProvider = (
  resource: Omit<LLMProvider, "status">
): Promise<LLMProvider> => createResource<LLMProvider>(PLURAL, resource);

export const updateLLMProvider = (
  resource: LLMProvider
): Promise<LLMProvider> => updateResource<LLMProvider>(PLURAL, resource);

export const deleteLLMProvider = (name: string): Promise<void> =>
  deleteResource(PLURAL, name);
