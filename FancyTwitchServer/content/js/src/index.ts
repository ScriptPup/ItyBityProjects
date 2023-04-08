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
  const updateLink = (): void => {
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

  $(".field input").on("change", updateLink);
  updateLink();
};

document.addEventListener("DOMContentLoaded", function () {
  setupPage();
});
