/** @format */

import log from "electron-log";
import path from "path";

log.initialize({ preload: true });
log.transports.file.resolvePathFn = () => path.join("logs/server.log");

class Logger {
  constructor() {}
  public info = log.info;
  public log = log.log;
  public warn = log.warn;
  public debug = log.debug;
  public error = log.error;
  public fatal = log.error;
}

export const MainLogger = {
  child: () => {
    return new Logger();
  },
};
