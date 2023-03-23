/** @format */

import { app, BrowserWindow } from "electron";
import { startServer, killServer } from "./server-control";
import unhandled from "electron-unhandled";
import log from "electron-log";
import path from "path";

import type { ChildProcessWithoutNullStreams } from "child_process";

unhandled();
log.initialize({ preload: true });
log.transports.file.resolvePathFn = () => path.join("logs/main.log");

const createWindow = (
  serverProc: Promise<ChildProcessWithoutNullStreams>
): BrowserWindow => {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });
  win.loadFile("electron/preload.html");

  serverProc.then(() => {
    log.info("Server started");
    win.loadURL("http://localhost:9000");
    console.log("Window loaded");
  });
  return win;
};

const terminateAndClose = async (
  app: Electron.App,
  serverProc: ChildProcessWithoutNullStreams
) => {
  await killServer(serverProc, log);
  log.info("Server killed");
  app.quit();
  log.info("App terminated");
};

const startSelf = async () => {
  log.info("Starting server");
  const serverProc: Promise<ChildProcessWithoutNullStreams> = startServer(log);
  console.log("Server process called");
  log.info("Creating window");
  const win: BrowserWindow = createWindow(serverProc);
  log.info("Window created");

  log.info("Setting up close event");
  app.on("window-all-closed", () => {
    log.info("App closed");
    // terminateAndClose(app, serverProc);
    app.quit();
  });

  log.info("Setting up ready event");
  app.on("ready", () => {
    log.info("Ready event fired");
    console.log("App ready");
  });
};

if (app != undefined) {
  log.info("App is defined, waiting for ready state");
  app.whenReady().then(() => {
    log.info("App is ready, launching");
    startSelf();
  });
} else {
  log.info("App is not defined! WTF IS GOING ON?! TIME TO PANIC");
  throw "App undefined, completely unacceptable!";
}
