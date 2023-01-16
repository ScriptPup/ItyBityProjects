/** @format */

import { ShowcaseClient } from "./lib/showcase/ShowcaseClient";

const startShowcase = () => {
  const showcaseContainer: HTMLElement | null =
    document.getElementById("showcase-container");
  if (!showcaseContainer) {
    throw "Showcase container wasn't found, and therefore the client can't be created.";
  }
  const params: URLSearchParams = new URLSearchParams(window.location.search);
  const pos: Number = Number.parseInt(params.get("pos") || "0");
  const client = new ShowcaseClient(showcaseContainer, pos);
};

if (document.readyState === "complete") {
  startShowcase();
} else {
  document.addEventListener("DOMContentLoaded", function () {
    startShowcase();
  });
}
