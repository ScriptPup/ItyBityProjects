/** @format */

/**
 * Setup the page to work as designed! It's gonna do some things and some stuff, awesome!
 *   just, like, look at the other functions for more information... I can't be bothered to explain everything here
 *
 *
 * @returns void
 *
 */
const setupPage = async () => {
  const $: JQueryStatic = (await import("jquery")).default;

  const updateRelayLink = (): void => {
    let linkTo = new URL("chatrelay", window.location.origin);
    let channel: string | undefined = $("#link-channel").val() as
      | string
      | undefined;
    let fade: string | undefined = $("#link-fade").val() as string | undefined;

    if (channel) {
      linkTo.searchParams.append("channel", channel);
    }
    if (fade) {
      linkTo.searchParams.append("fade", fade);
    }
    if ($("#link-swipe").is(":checked")) {
      linkTo.searchParams.append("swipe", "true");
    }
    // $("#relay-link").text(linkTo.toString());
    $("#actual-relay-link").attr("href", linkTo.toString());
    $("#relay-link #open-external").attr(
      "href",
      linkTo.toString() + "#route-external"
    );
    $("#relay-link #link").text(linkTo.toString());
  };

  const updateShowcaseLink = (): void => {
    let linkTo = new URL("showcase", window.location.origin);
    let position: string | undefined = $("#link-showcase-pos").val() as
      | string
      | undefined;

    if (position) {
      linkTo.searchParams.append("pos", position);
    }
    // $("#relay-link").text(linkTo.toString());
    $("#actual-showcase-link").attr("href", linkTo.toString());
    $("#showcase-link #open-external").attr(
      "href",
      linkTo.toString() + "#route-external"
    );
    $("#showcase-link #link").text(linkTo.toString());
  };

  $(".field input.relay-params").on("change", updateRelayLink);
  $(".field input.showcase-params").on("change", updateShowcaseLink);
  updateRelayLink();
  updateShowcaseLink();
};

document.addEventListener("DOMContentLoaded", function () {
  setupPage();
});
