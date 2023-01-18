/** @format */

import { ShowcaseClient } from "./lib/showcase/ShowcaseClient";

const showcase: ShowcaseClient = new ShowcaseClient();
let availableArtItemTemplate: string | null = null;
let $: JQueryStatic;

const start = async () => {
  $ = (await import("jquery")).default;
  await getTemplateContents();
  await getArtAvailItems();
};

/**
 * Retrieve the html templates which will be used as the new command HTML structure
 *
 * @remarks
 * this function sets the availableArtItemTemplate global
 *
 * @returns void
 *
 */
const getTemplateContents = async () => {
  const artAvailItm: Promise<void | Response> = fetch(
    "/html_templates/avail-art-item.html",
    {
      headers: {
        "Content-Type": "text/plain",
      },
    }
  ).then((res) => {
    return res.text().then((txt) => {
      availableArtItemTemplate = txt;
      return;
    });
  });
  return Promise.all([artAvailItm]);
};

const getArtAvailItems = async () => {
  if (!availableArtItemTemplate) {
    throw new Error(
      "Cannot create new available art items list, because the template is missing!"
    );
  }
  const localAvailArtItemTemplate: string = availableArtItemTemplate;

  const availableShowcases: string[] | [] =
    await showcase.getAvailableArtShowcase();
  for (const availShowcase of availableShowcases) {
    const newItemRAW: string = localAvailArtItemTemplate
      .replace("{ART_NAME}", availShowcase.split(".")[0])
      .replace("{ART_FILE}", availShowcase);
    const domContent: JQuery.Node[] = $.parseHTML(newItemRAW);
    $("#available-redemptions").append(domContent);
  }
};

if (document.readyState === "complete") {
  start();
} else {
  document.addEventListener("DOMContentLoaded", function () {
    start();
  });
}
