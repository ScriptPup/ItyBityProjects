/** @format */

let converter;
let command_template = null;

const setInformationContents = (html) => {
  const info = document.getElementById("information-contents");
  info.innerHTML = html;
};

addCommand = async (name, command, usableBy) => {
  if (null === command_template) {
    await getTemplateContents();
  }
  let contents = command_template;
  contents = contents
    .replaceAll("{name}", name)
    .replaceAll("{command}", command)
    .replaceAll("{usableBy}", usableBy);
  domContent = $.parseHTML(contents);
  $(domContent)
    .find(`.select-usableby option[value="${usableBy}"]`)
    .prop("selected", true);
  $("#command-list").append(domContent);
};

const getInformationContents = async () => {
  return fetch("/markdown/information.md", {
    headers: {
      "Content-Type": "text/plain",
    },
  }).then((res) => {
    return res.text().then((txt) => {
      return txt;
    });
  });
};

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

const setupPage = async () => {
  converter = new showdown.Converter();
  let html = converter.makeHtml(await getInformationContents());
  setInformationContents(html);

  // For debugging/dev, intented to be removed shortly
  addCommand("!command", "Hello world from planet {planet++}", "everyone");
};

document.addEventListener("DOMContentLoaded", function () {
  setupPage();
});
