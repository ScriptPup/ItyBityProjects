/** @format */

// This is the electron app class
// It's not really REQUIRED, but this does make it easier to split out responsibilities

import { BrowserWindow, ipcMain } from "electron";
import { startServer } from "./preloads";
import path from "path";
import { ChildProcessWithoutNullStreams } from "child_process";

export default class Main {
  static mainWindow: Electron.BrowserWindow;
  static application: Electron.App;
  static BrowserWindow: typeof BrowserWindow;
  static serverProc: ChildProcessWithoutNullStreams;
  private static onWindowAllClosed() {
    if (process.platform !== "darwin") {
      Main.application.quit();
    }
  }

  private static onClose() {
    // Dereference the window object.
    const pid: Number = Main.serverProc.pid || 0;
    console.log(`Trying to stop server process ID ${pid}`);
    Main.serverProc.stdin.write("\x03");
    if (Main.serverProc.kill(0)) {
      console.log("Server stopped successfully!");
    } else {
      console.log(`Server failed to be stopped. PID ${pid} still running.`);
    }

    Main.mainWindow.destroy();
  }

  private static async onReady() {
    Main.serverProc = await startServer();
    Main.mainWindow = new Main.BrowserWindow({
      width: 1080,
      height: 760,
      webPreferences: {
        nodeIntegration: false,
        // preload: path.join(__dirname, "preloads.js"),
      },
    });
    Main.mainWindow.loadURL("http://localhost:9000/");
    // Main.mainWindow.loadFile("client/content/index.html");
  }

  static main(app: Electron.App, browserWindow: typeof BrowserWindow) {
    // we pass the Electron.App object and the
    // Electron.BrowserWindow into this function
    // so this class has no dependencies. This
    // makes the code easier to write tests for
    Main.BrowserWindow = browserWindow;
    Main.application = app;
    Main.application.on("window-all-closed", Main.onWindowAllClosed);
    Main.application.on("ready", Main.onReady);
    Main.application.on("will-quit", Main.onClose);
  }
}
//https://stackoverflow.com/questions/54619111/typescript-electron-exports-is-not-defined ???
