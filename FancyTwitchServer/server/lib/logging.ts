/** @format */

export const MainLogger =
  process.env.NODE_ENV === "development"
    ? require("./Logging/dev_logging").MainLogger
    : require("./Logging/prod_logging").MainLogger;
