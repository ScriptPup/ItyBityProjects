/** @format */

import { app, BrowserWindow } from "electron";
import { startServer, killServer } from "./preload";

import type { ChildProcessWithoutNullStreams } from "child_process";

const createWindow = (): BrowserWindow => {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
  });
  win.loadURL("http://localhost:9000");
  console.log("Window loaded");
  return win;
};

const terminateAndClose = async (
  app: Electron.App,
  serverProc: ChildProcessWithoutNullStreams
) => {
  await killServer(serverProc);
  app.quit();
};

const startSelf = async () => {
  const serverProc: ChildProcessWithoutNullStreams = await startServer();
  console.log("Server process called");
  const win: BrowserWindow = createWindow();

  app.on("window-all-closed", () => {
    terminateAndClose(app, serverProc);
  });
  app.on("ready", () => {
    console.log("App ready");
  });
};

if (app != undefined) {
  app.whenReady().then(() => {
    startSelf();
  });
}
