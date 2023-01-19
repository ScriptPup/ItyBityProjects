/** @format */

import { ShowcaseItem } from "../../../shared/obj/ShowcaseTypes";
import { ShowcaseClient } from "./lib/showcase/ShowcaseClient";

const showcase: ShowcaseClient = new ShowcaseClient();
let availableArtItemTemplate: string | null = null;
let redeemedItemTemplate: string | null = null;
let $: JQueryStatic;

const start = async () => {
  $ = (await import("jquery")).default;
  await getTemplateContents();
  await getArtAvailItems();
  await getRedemptionItems();
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
  const redeemedItemTemplate: Promise<void | Response> = fetch(
    "/html_templates/redeemed-showcase-item.html",
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
  return Promise.all([artAvailItm, redeemedItemTemplate]);
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

const getRedemptionItems = async () => {
  if (!redeemedItemTemplate) {
    throw new Error(
      "Cannot create new available art items list, because the template is missing!"
    );
  }
  const localredeemedItemTemplate: string = redeemedItemTemplate;

  const handleRedemptionItemIncoming = (items: ShowcaseItem[]): void => {
    for (const item of items) {
      const redemptionTime: string = `${item.redemption_time.getFullYear()}-${
        item.redemption_time.getMonth
      }-${item.redemption_time.getDate} ${item.redemption_time.getHours}:${
        item.redemption_time.getMinutes
      }`;
      const newItemRAW: string = localredeemedItemTemplate
        .replace("{ART_NAME}", item.redemption_name)
        .replace("{ART_FILE}", item.redemption_name + ".png")
        .replace("{REDEEMED_AT}", redemptionTime)
        .replace("{REDEEMED_BY}", item.redeemed_by);
      const domContent: JQuery.Node[] = $.parseHTML(newItemRAW);
      $("#recent-redemptions").prepend(domContent);
    }
  };
  showcase.subscribeRedemptionItems(handleRedemptionItemIncoming);
};

if (document.readyState === "complete") {
  start();
} else {
  document.addEventListener("DOMContentLoaded", function () {
    start();
  });
}
