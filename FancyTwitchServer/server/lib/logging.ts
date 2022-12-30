/** @format */

import { pino } from "pino";

const LOGGING_LEVEL = process.env.NODE_ENV === "development" ? "debug" : "info";

const transport = pino.transport({
  targets: [
    { target: "pino-pretty", level: "debug", options: { destination: 1 } },
    {
      target: "pino/file",
      level: "trace",
      options: {
        destination: `${__dirname}/../../logs/Server.log`,
        mkdir: true,
        append: false,
        writable: true,
      },
    },
  ],
});
const destination = pino.destination({
  mkdir: true,
  writable: true,
  dest: `${__dirname}/../../logs/Server.log`,
  append: false,
});
const logDestination =
  process.env.NODE_INFO === "stream" ? transport : destination;

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
  logDestination
);

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
    dest: `${__dirname}/../../test/logs/tests.log`,
    append: false,
  })
);
