/** @format */

import { pino } from "pino";

const LOGGING_LEVEL = process.env.NODE_ENV === "development" ? "debug" : "info";

export const TestLogger = pino(
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
    dest: `${__dirname}/../logs/tests.log`,
    append: false,
  })
);
