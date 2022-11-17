/** @format */

let converter;

const setInformationContents = (html) => {
  const info = document.getElementById("information-contents");
  info.innerHTML = html;
};

const getInformationContents = () => {
  let result = null;
  let xmlhttp = new XMLHttpRequest();
  xmlhttp.open("GET", "/markdown/information.md", false);
  xmlhttp.send();
  if (xmlhttp.status == 200) {
    result = xmlhttp.responseText;
  }
  return result;
};

const setupPage = () => {
  converter = new showdown.Converter();
  let html = converter.makeHtml(getInformationContents());
  setInformationContents(html);
};

document.addEventListener("DOMContentLoaded", function () {
  setupPage();
});
