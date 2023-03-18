/** @format */

// This is the script to launch the server components in electron

import { spawn, ChildProcessWithoutNullStreams } from "child_process";

export const startServer = (): Promise<ChildProcessWithoutNullStreams> => {
  return new Promise((resolve) => {
    console.log("Trying to start server!");
    console.log(`Process execution path: ${process.cwd()}`);
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
      console.log(`SERVER LOG: ${data}`);
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
      console.log("closing code: " + code);
      console.log("Full output of script: ", scriptOutput);
    });
    console.log(`Started server on PID ${child.pid}!`);
  });
};

export const killServer = async (
  server: ChildProcessWithoutNullStreams
): Promise<void> => {
  return new Promise((resolve, reject) => {
    console.log("Killing server");
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
      console.log(`Taskkill: ${data}`);
    });

    kill_cmd.on("close", () => {
      console.log("Kill command completed");
      console.log(`Server stopped with exit code ${server.exitCode}`);
      resolve();
    });
    return;
  });
};
