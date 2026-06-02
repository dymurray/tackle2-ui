import axios from "axios";
import type { K8sResource, K8sResourceList } from "./k8s-models";

const API_GROUP = "konveyor.io";
const API_VERSION = "v1alpha1";
const DEFAULT_NAMESPACE = "konveyor-tackle";

export function k8sResourceUrl(
  plural: string,
  namespace: string = DEFAULT_NAMESPACE
): string {
  return `/k8s/apis/${API_GROUP}/${API_VERSION}/namespaces/${namespace}/${plural}`;
}

export function k8sResourceItemUrl(
  plural: string,
  name: string,
  namespace: string = DEFAULT_NAMESPACE
): string {
  return `${k8sResourceUrl(plural, namespace)}/${name}`;
}

export function listResource<T extends K8sResource>(
  plural: string,
  namespace?: string
): Promise<T[]> {
  return axios
    .get<K8sResourceList<T>>(k8sResourceUrl(plural, namespace))
    .then(({ data }) => data.items);
}

export function getResource<T extends K8sResource>(
  plural: string,
  name: string,
  namespace?: string
): Promise<T> {
  return axios
    .get<T>(k8sResourceItemUrl(plural, name, namespace))
    .then(({ data }) => data);
}

export function createResource<T extends K8sResource>(
  plural: string,
  resource: Omit<T, "status">,
  namespace?: string
): Promise<T> {
  return axios
    .post<T>(k8sResourceUrl(plural, namespace), resource)
    .then(({ data }) => data);
}

export function updateResource<T extends K8sResource>(
  plural: string,
  resource: T,
  namespace?: string
): Promise<T> {
  return axios
    .put<T>(
      k8sResourceItemUrl(plural, resource.metadata.name, namespace),
      resource
    )
    .then(({ data }) => data);
}

export function deleteResource(
  plural: string,
  name: string,
  namespace?: string
): Promise<void> {
  return axios
    .delete(k8sResourceItemUrl(plural, name, namespace))
    .then(() => undefined);
}
