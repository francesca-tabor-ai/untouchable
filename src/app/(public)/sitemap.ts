import type { MetadataRoute } from "next";

import { publicMedicinePaths } from "@/lib/medicines/queries";
import { publishedStoryPaths } from "@/lib/stories/queries";

/**
 * The sitemap.
 *
 * Built from the same published-only queries as every other public surface, and never
 * cached, so a retracted story is out of it on the next request — brief 5.2 says retraction
 * removes a story from sitemaps as well as pages, and a stale sitemap would keep inviting
 * search engines back to a 404.
 */
export const dynamic = "force-dynamic";

const BASE_URL = process.env.AUTH_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [storyPaths, medicinePaths] = await Promise.all([
    publishedStoryPaths(),
    publicMedicinePaths(),
  ]);
  const paths = [...storyPaths, ...medicinePaths];

  const fixed = ["/", "/stories", "/conditions", "/medicines", "/corrections"].map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
  }));

  return [
    ...fixed,
    ...paths.map((entry) => ({
      url: `${BASE_URL}${entry.path}`,
      lastModified: entry.lastModified,
    })),
  ];
}
