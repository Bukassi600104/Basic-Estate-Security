import type { MetadataRoute } from "next";

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://main.d18ktaplzyr50v.amplifyapp.com";
}

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  return [
    {
      url: siteUrl,
      lastModified: new Date(),
    },
  ];
}
