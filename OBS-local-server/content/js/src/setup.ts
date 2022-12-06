/** @format */

import type { Converter } from "showdown";
import type { FancyCommand } from "../../../shared/obj/FancyCommandTypes";
import { UserTypes } from "../../../shared/obj/FancyCommandTypes";
import { FancyCommandClient } from "./lib/FancyCommandClient";

let converter: Converter;
let command_template: string | null = null;
let $: JQueryStatic;

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
const addCommand = async (name: string, command: string, usableBy: string) => {
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
  $("#command-list").append(domContent);
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
  $(`#${name}`).remove();
};

const connectServer = (): void => {
  const FCC: FancyCommandClient = new FancyCommandClient();
  FCC.onAdd((cmd: FancyCommand) => {
    addCommand(cmd.name, cmd.command, UserTypes[cmd.allowed]);
  });
  FCC.onRemove(({ name }) => {
    removeCommand(name);
  });
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

  // For debugging/dev, intented to be removed shortly
  addCommand("!command", "Hello world from planet {planet++}", "everyone");
};

/**
 *
 * When the document is loaded, setup the page
 *
 */
document.addEventListener("DOMContentLoaded", function () {
  setupPage();
});
