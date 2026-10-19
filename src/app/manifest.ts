import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Friendly Restaurant",
    short_name: "Friendly",
    description: "Restaurant reviews only from your friends.",
    start_url: "/",
    display: "standalone",
    background_color: "#fafaf9",
    theme_color: "#f2622e",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
