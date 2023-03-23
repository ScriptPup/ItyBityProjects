/** @format */

// This is the script to launch the server components in electron

import { spawn, ChildProcessWithoutNullStreams } from "child_process";

export const startServer = (
  log: any
): Promise<ChildProcessWithoutNullStreams> => {
  log.info("Start server called");
  return new Promise((resolve) => {
    log.info("Trying to start server!");
    log.info(`Process execution path: ${process.cwd()}`);
    let scriptOutput: string;
    const child: ChildProcessWithoutNullStreams = spawn(
      //   "npm",
      //   ["run", "server-start"],
      "node",
      ["./server.js"],
      {
        shell: true,
      }
    );
    child.unref();
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (data) => {
      if (data.toString().startsWith("Server listening on port 9000")) {
        resolve(child);
      }
      log.info(`SERVER LOG: ${data}`);
      data = data.toString();
      scriptOutput += data;
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (data) => {
      console.error(`${data}`);
      data = data.toString();
      scriptOutput += data;
    });
    child.on("close", (code) => {
      //Here you can get the exit code of the script
      log.info("closing code: " + code);
      log.info("Full output of script: ", scriptOutput);
    });
    log.info(`Started server on PID ${child.pid}!`);
  });
};

export const killServer = async (
  server: ChildProcessWithoutNullStreams,
  log: any
): Promise<void> => {
  if (process.platform !== "win32") {
    server.kill();
    if (!server.exitCode) {
      server.kill(0);
    }
    if (!server.exitCode) {
      log.info("Failed to kill the server process, sorry");
    }
  }
  return new Promise((resolve, reject) => {
    log.info("Killing server");
    if (!server.pid) {
      console.error(
        `Server is already stopped? Looks like it probably crashed or something. SMH, what a crap program.`
      );
      return;
    }
    const kill_cmd = spawn(`taskkill`, [
      "/pid",
      server.pid.toString(),
      "/T",
      "/F",
    ]);

    kill_cmd.stdout.on("data", (data: string) => {
      log.info(`Taskkill: ${data}`);
    });

    kill_cmd.on("close", () => {
      log.info("Kill command completed");
      log.info(`Server stopped with exit code ${server.exitCode}`);
      resolve();
    });
    return;
  });
};
