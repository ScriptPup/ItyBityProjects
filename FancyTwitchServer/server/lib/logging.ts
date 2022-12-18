/** @format */

import { pino } from "pino";

export const MainLogger = pino(
  {
    level: "debug",
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
