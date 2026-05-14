import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GatePilot Resident",
    short_name: "GatePilot",
    description: "Resident access codes and estate security for GatePilot.",
    start_url: "/resident-app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8f7ff",
    theme_color: "#6d28d9",
    categories: ["security", "utilities", "productivity"],
    icons: [
      {
        src: "/images/logo.jpg",
        sizes: "192x192",
        type: "image/jpeg",
      },
      {
        src: "/images/logo.jpg",
        sizes: "512x512",
        type: "image/jpeg",
      },
    ],
  };
}
