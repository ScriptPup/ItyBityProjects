/** @format */

import { ShowcaseItem } from "../../../../shared/obj/ShowcaseTypes";
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
    console.log("Art availability item template set");
    return res.text().then((txt) => {
      availableArtItemTemplate = txt;
      return;
    });
  });
  const redeemedItm: Promise<void | Response> = fetch(
    "/html_templates/redeemed-showcase-item.html",
    {
      headers: {
        "Content-Type": "text/plain",
      },
    }
  ).then((res) => {
    console.log("Redemption item template set");
    return res.text().then((txt) => {
      redeemedItemTemplate = txt;
      return;
    });
  });
  return Promise.all([artAvailItm, redeemedItm]);
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
      .replaceAll("{ART_NAME}", availShowcase.split(".")[0])
      .replaceAll("{ART_FILE}", availShowcase);
    const domContent: JQuery.Node[] = $.parseHTML(newItemRAW);
    $(domContent)
      .find("button.redeem-art")
      .on("click", () => {
        handleRedeemNow(domContent);
      });
    $("#available-redemptions").append(domContent);
  }
};

const handleRedeemNow = async (itemElem: JQuery.Node[]) => {
  const redeem_thanks: string | undefined =
    $(itemElem).find("input[name='thanks-msg']").val()?.toString() || undefined;
  const redeem_name: string = $(itemElem).find(".art-name").text() + ".png";
  showcase.addRedemption(redeem_name, redeem_thanks);
};

const getRedemptionItems = async () => {
  if (!redeemedItemTemplate) {
    console.log("Redemption Item Template", redeemedItemTemplate);
    throw new Error(
      "Cannot create new available art items list, because the template is missing!"
    );
  }
  const localredeemedItemTemplate: string = redeemedItemTemplate;

  const handleRedemptionItemIncoming = (items: ShowcaseItem[]): void => {
    console.log("Recieved redemption items", items);
    for (const item of items) {
      const redeemed_timestamp: Date = new Date(item.redemption_time);
      const redemptionTime: string = `${redeemed_timestamp.getFullYear()}-${redeemed_timestamp.getMonth()}-${redeemed_timestamp.getDate()} ${redeemed_timestamp.getHours()}:${redeemed_timestamp.getMinutes()}`;
      const newItemRAW: string = localredeemedItemTemplate
        .replaceAll("{ART_NAME}", item.redemption_name.split(".")[0])
        .replaceAll("{ART_FILE}", item.redemption_name)
        .replaceAll("{REDEEMED_AT}", redemptionTime)
        .replaceAll("{REDEEMED_BY}", item.redeemed_by);
      const domContent: JQuery.Node[] = $.parseHTML(newItemRAW);
      $("#recent-redemption-items").prepend(domContent);
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
