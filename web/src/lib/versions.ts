import versionsData from "@/data/versions.json";

export type VersionType = "next" | "static" | "zone";

export interface Version {
  id: string;
  label: string;
  year: number;
  type: VersionType;
  path: string;
  isLatest: boolean;
}

export const versions: Version[] = versionsData as Version[];

export function getLatest(): Version {
  return versions.find((v) => v.isLatest) ?? versions[0];
}

/** Resolve which version a pathname belongs to. Archived versions live
 *  under /v/<id>; everything else is the latest (served at root). */
export function currentVersionId(pathname: string): string {
  const m = pathname.match(/^\/v\/([^/]+)/);
  return m ? m[1] : getLatest().id;
}
