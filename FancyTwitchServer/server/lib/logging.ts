/** @format */

import { pino } from "pino";

const LOGGING_LEVEL = process.env.NODE_ENV === "development" ? "debug" : "info";

export const MainLogger = pino(
  {
    level: LOGGING_LEVEL,
    redact: [
      "*.password",
      "twitchClient.opts.identity.password",
      "*.client_secret",
      "*.auth_code",
    ],
  },
  pino.destination({
    mkdir: true,
    writable: true,
    dest: `${__dirname}/../../logs/Server.log`,
    append: false,
  })
);
