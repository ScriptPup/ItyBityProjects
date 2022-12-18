/** @format */
import type { Converter } from "showdown";
import type { FancyCommand } from "../../../shared/obj/FancyCommandTypes";
import { UserTypes } from "../../../shared/obj/FancyCommandTypes";
import { BotAccount } from "../../../shared/obj/TwitchObjects";
import { FancyCommandClient } from "./lib/FancyCommandClient";

let converter: Converter;
let command_template: string | null = null;
let bot_form_template: string | null = null;
let $: JQueryStatic;

let FCC: FancyCommandClient;

/**
 * Sets the information-contents panel to display the HTML provided
 *
 *
 * @param html - The HTML to display in the information-contents panel
 * @returns void
 *
 */
const setInformationContents = (html: string): void => {
  const info: HTMLElement | null = document.getElementById(
    "information-contents"
  );
  if (null === info) {
    throw new Error("Information-contents not found, unable to load data in");
  }
  info.innerHTML = html;
};

/**
 * Add a new command to the page command list, given the FancyCommand pieces
 *
 * @remarks
 * Technically the ClientFancyCommand type pieces are what we're looking for
 *
 * @param name - The name of the command
 * @param command - The command which which will be run when the command is called
 * @param usableBy - Who is able to call the command
 * @returns void
 */
const addCommand = async (
  name: string,
  command: string,
  usableBy: string,
  expand: boolean = false
) => {
  if (null === command_template) {
    await getTemplateContents();
  }

  let contents: string | null = command_template;
  if (null === contents) {
    throw new Error("No content template found, unable to display information");
  }

  contents = contents
    .replaceAll("{name}", name)
    .replaceAll("{command}", command)
    .replaceAll("{usableBy}", usableBy);

  let domContent: JQuery.Node[] = $.parseHTML(contents);
  $(domContent)
    .find(`.select-usableby option[value="${usableBy}"]`)
    .prop("selected", true);
  $(domContent).attr("id", name);
  setupButtons($(domContent));
  $("#command-list").append(domContent);
  if (expand) {
    $(domContent).attr("open", "true");
  }
};

/**
 * Add listeners to the child buttons (save, delete)
 *
 *
 * @param element - the parent command element which we want to subscribe actions to
 * @returns void
 *
 */
const setupButtons = (element: JQuery<JQuery.Node[]>): void => {
  element.find(".save-item").on("click", () => {
    const name: string =
      element.find(".command-name").val()?.toString() || "!unknown";
    const command: string =
      element.find(".command-execute").val()?.toString() || "";
    const usableBy: string =
      element.find(".select-usableby option:selected").val()?.toString() ||
      "everyone";
    console.log(`Saving ${name}`);
    if (!FCC) {
      throw new Error(
        "Fancy command client not initialized, unable to setup buttons!"
      );
    }
    console.log(`Adding command`, { name, command, usableBy });
    FCC.addCommand({ name, command, usableBy });
    element.remove();
  });
  element.find(".remove-item").on("click", () => {
    const name: string =
      element.find(".command-name").val()?.toString() || "!unknown";
    console.log(`Removing ${name}`);
    FCC.removeCommand(name);
  });
};

/**
 * Removes the command DOM element from the list
 *
 *
 * @param name - name of the command to remove
 * @returns void
 *
 */
const removeCommand = (name: string): void => {
  const cmdElem: HTMLElement | null = document.getElementById(name);
  if (!cmdElem) {
    throw new Error(`Cannot find #${name} to remove it from the DOM`);
  }
  $(cmdElem).remove();
};

/**
 * Sets up the FancyCommandClient to listen for changes, and initialize the global object to allow interfacing with the server
 *
 */
const connectServer = (): void => {
  FCC = new FancyCommandClient();
  FCC.onAdd((cmd: FancyCommand) => {
    const [name, command, usableBy] = [
      cmd.name,
      cmd.command,
      UserTypes[cmd.usableBy],
    ];
    console.log("Running addCommand", {
      name,
      command,
      usableBy,
    });
    addCommand(name, command, usableBy.toLowerCase());
  });
  FCC.onRemove(({ name }) => {
    removeCommand(name);
  });
  authorizedApplication();
};

/**
 * Retrieve the information for the information-panel from the .md file
 *
 *
 * @returns a promise with the markdown contents
 *
 */
const getInformationContents = async (): Promise<string> => {
  return fetch("/markdown/information.md", {
    headers: {
      "Content-Type": "text/plain",
    },
  }).then((res: Response) => {
    return res.text().then((txt: string) => {
      return txt;
    });
  });
};

/**
 * Retrieve the html templates which will be used as the new command HTML structure
 *
 * @remarks
 * this function sets the command_template global
 *
 * @returns void
 *
 */
const getTemplateContents = async () => {
  return fetch("/html_templates/command-item.html", {
    headers: {
      "Content-Type": "text/plain",
    },
  }).then((res) => {
    return res.text().then((txt) => {
      command_template = txt;
      return;
    });
  });
};

/**
 * Retrieve the html template which will be used for bot settings
 *
 *
 */
const getBotTemplateContents = async () => {
  return fetch("/html_templates/bot-settings-modal.html", {
    headers: {
      "Content-Type": "text/plain",
    },
  }).then((res) => {
    return res.text().then((txt) => {
      bot_form_template = txt;
    });
  });
};

/**
 * Saves the data from the bot form to the server
 *
 *
 */
const saveBotData = async (data: BotAccount) => {
  if (!FCC.socket) {
    throw new Error("Socket not connected, cannot send data to server");
  }
  if (
    data["username"] === "" &&
    data["client_id"] === "" &&
    data["client_secret"] === ""
  ) {
    FCC.socket.emit("update-bot-acct", null);
    return;
  }
  FCC.socket.emit("update-bot-acct", data);
};

/**
 * Displays the bot template modal
 *
 */
const showBotTemplate = async () => {
  if (null === bot_form_template) {
    await getBotTemplateContents();
  }
  // The if is unecissary because of the above, but typescript insists on wasting cycles
  if (bot_form_template) {
    const newModalHTML = $.parseHTML(bot_form_template);
    const newModal = $(newModalHTML);
    $("body").append(newModalHTML);
    newModal.find("#modal-submit").on("click", (e: Event) => {
      e.preventDefault();
      const formserializeArray = newModal.find("form").serializeArray();
      const jsonObj: { [key: string]: string } = {};
      $.map(formserializeArray, function (n, i) {
        jsonObj[n.name] = n.value;
      });
      const botAccount: BotAccount = {
        channel: jsonObj["channel"],
        client_id: jsonObj["client_id"],
        client_secret: jsonObj["client_secret"],
        username: jsonObj["username"],
        // auth_code?: string
      };
      const state = Math.random().toString(16).substr(2, 8);
      localStorage.setItem("auth-verify-code", state);
      localStorage.setItem("auth-verify-cache", JSON.stringify(botAccount));

      // TODO: it would be wise to change this from a straight localhost redirect to get the information from the server somehow... But that sounds like a PITA RN
      const twitchAuthURI = `https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=${botAccount.client_id}&redirect_uri=http://localhost:9000%2Fsetup&scope=chat%3Aedit%20whispers%3Aedit&state=${state}`;
      $(window).attr("location", twitchAuthURI);
    });
    newModal.find("#modal-cancel").on("click", () => {
      newModal.remove();
    });
    if (!FCC.socket) {
      throw new Error("Socket not connected, cannot send data to server");
    }
    FCC.socket.once("get-bot-acct", (res) => {
      console.log("Recieved get-bot-acct", res);
      if (null === res) {
        newModal.find("input").val("");
        return;
      }
      const { channel, client_id, username }: BotAccount = res;
      newModal.find("input[name='channel']").val(channel);
      newModal.find("input[name='username']").val(username);
      newModal.find("input[name='client_id']").val(client_id);
      newModal.find("input[name='client_secret']").val("*****");
    });
    FCC.socket.emit("get-bot-acct", true);
  }
};

const authorizedApplication = async () => {
  if (FCC.isReady) {
    await FCC.isReady;
  } else {
    setTimeout(authorizedApplication, 200);
    return;
  }
  if (!window.location.search) {
    return;
  }
  const state = localStorage.getItem("auth-verify-code");
  const rawBotData = localStorage.getItem("auth-verify-cache");
  if (!rawBotData) {
    console.error(
      "Bot data not stored locally, cannot retrieve to send data to server."
    );
    return;
  }
  const botAccount = JSON.parse(rawBotData);

  try {
    const parsedURLParams = new URLSearchParams(window.location.search);
    const stateVerify = parsedURLParams.get("state");
    if (state !== stateVerify) {
      throw new Error(
        "State returned isn't the same as state sent, something malicious is likely going on. Verify your network connection is private and trusted!"
      );
    }

    // If we've verified everything satisfactorially, then send the botAccount data to the server
    botAccount["auth_code"] = parsedURLParams.get("code");
    if (!botAccount.auth_code) {
      throw new Error("Somehow the authorization code doesn't exist!");
    }

    console.log("Bot account authorized and linked!");
    saveBotData(botAccount);
  } finally {
    // Remove query string from navigation, we don't want the user to refresh the page and end up invalidating their token
    window.history.replaceState(
      null,
      document.title,
      window.location.toString().split("?")[0]
    );

    // Clear the temporary data storage used
    localStorage.removeItem("auth-verify-code");
    localStorage.removeItem("auth-verify-cache");
  }
};

/**
 * Setup the page to work as designed! It's gonna do some things and some stuff, awesome!
 *   just, like, look at the other functions for more information... I can't be bothered to explain everything here
 *
 *
 * @returns void
 *
 */
const setupPage = async () => {
  $ = (await import("jquery")).default;

  converter = new (await import("showdown")).Converter();
  let html = converter.makeHtml(await getInformationContents());
  setInformationContents(html);

  // Setup actions to do when the server says we got new commands, or existing ones have been removed.
  connectServer();

  // Setup button click actions
  setupButtonListeners();
};

/**
 * Sets up the listeners for buttons
 *
 */
const setupButtonListeners = async () => {
  $("#btn-new-cmd").on("click", () => {
    addCommand("!", "", "everyone", true);
  });
  $("#btn-bot-settings").on("click", () => {
    console.log("Opening bot template modal");
    showBotTemplate();
  });
};

/**
 *
 * When the document is loaded, setup the page
 *
 */
document.addEventListener("DOMContentLoaded", function () {
  setupPage();
});
