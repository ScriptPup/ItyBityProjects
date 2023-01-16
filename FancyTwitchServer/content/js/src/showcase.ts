/** @format */

import { ShowcaseClient } from "./lib/showcase/ShowcaseClient";

const startShowcase = async () => {
  const showcaseContainer: HTMLElement | null =
    document.getElementById("showcase-container");
  if (!showcaseContainer) {
    throw "Showcase container wasn't found, and therefore the client can't be created.";
  }
  const params: URLSearchParams = new URLSearchParams(window.location.search);
  const pos: Number = Number.parseInt(params.get("pos") || "0");
  const debug: boolean = !!params.get("debug");
  if (debug) {
    console.log("Creating new ShowCaseClient with debugging enabled");
  }
  const client = new ShowcaseClient(showcaseContainer, pos, debug);
  await client.isReady;
  client.getArtShowCase();
};

if (document.readyState === "complete") {
  startShowcase();
} else {
  document.addEventListener("DOMContentLoaded", function () {
    startShowcase();
  });
}
