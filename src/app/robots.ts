import type { MetadataRoute } from "next";

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://main.d18ktaplzyr50v.amplifyapp.com";
}

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/auth/",
        "/dashboard/",
        "/estate-admin/",
        "/guard/",
        "/resident/",
        "/resident-app/",
        "/security-app/",
        "/super-admin/",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
