/** @format */

import { FancyCommandListener } from "../../server/lib/FancyCommandExecutor/FancyCommandListener";
import { expect } from "chai";
import { io as SocketClient, Socket } from "socket.io-client";
import { Server as SocketServer } from "socket.io";
import "mocha";
import { pino } from "pino";
import { AceBase } from "acebase";
import { FancyCommand } from "../../shared/obj/FancyCommandTypes";

const logger = pino(
  { level: "debug" },
  pino.destination({
    mkdir: true,
    writable: true,
    dest: `${__dirname}/logs/FancyCommandListener.test.log`,
    append: false,
  })
);

const end_point = "http://localhost:8081";
const opts = { forceNew: true, reconnect: true };

function success(done: Function, io: SocketServer, ...clients: Socket[]) {
  io.close();
  clients.forEach((client) => client.disconnect());
  done();
}

describe("FancyCommandListener listener", () => {
  describe("Events Fire", () => {
    const setupCon = (): Promise<boolean> => {
      return new Promise<boolean>((resolve) => {
        client_io.on("connect", () => {
          joinSetupComdRoom().then(() => {
            resolve(true);
          });
        });
        client_io.connect();
      });
    };

    const joinSetupComdRoom = (): Promise<boolean> => {
      return new Promise<boolean>((resolve) => {
        client_io.on("joined-setup-commands", () => {
          resolve(true);
        });
        client_io.emit("join-setup-commands");
      });
    };

    let IO: SocketServer;
    let FCL: FancyCommandListener;
    let client_io: Socket;
    afterEach(() => {
      try {
        client_io.close();
        IO.close();
      } catch {}
    });
    beforeEach((done) => {
      IO = new SocketServer();
      FCL = new FancyCommandListener(IO, true);
      IO.listen(8081);
      client_io = SocketClient(end_point, opts);
      done();
    });
    // Generally can be ready
    it("Should be able to connect", () => {
      setupCon().then(() => {
        expect(client_io.connected).to.be.true;
      });
    });

    it("Should be able to recieve and reply to command-add events", (done) => {
      const add_command: { [key: string]: string } = {
        name: "!evt_test",
        command: "Some command",
        usableBy: "everyone",
      };
      logger.debug(
        { test: "Should be able to recieve and reply to command-add events" },
        "Start"
      );
      client_io.on("connect", () => {
        joinSetupComdRoom().then(() => {
          logger.debug(
            {
              test: "Should be able to recieve and reply to command-add events",
            },
            "Connection recieved, emitting add-command"
          );
          client_io.on("command-add", (res) => {
            expect(res).to.eql(add_command);
            success(done, IO, client_io);
            logger.debug(
              {
                test: "Should be able to recieve and reply to command-add events",
              },
              "Done"
            );
          });
          client_io.emit("command-add", add_command);
        });

        IO.on("connection", (srv_socket) => {
          logger.debug(
            {
              test: "Should be able to recieve and reply to command-add events",
            },
            "Server connection established"
          );
          srv_socket.on("command-add", (res) => {
            logger.debug(
              {
                test: "Should be able to recieve and reply to command-add events",
              },
              "add-command recieved from client on server"
            );
            expect(res).to.eql(add_command);
          });
        });
        client_io.connect();
      });
    });

    it("Should be able to recieve and reply to command-remove events", (done) => {
      const add_command: { [key: string]: string } = { name: "!evt_test" };
      logger.debug(
        {
          test: "Should be able to recieve and reply to command-remove events",
        },
        "Start"
      );
      client_io.on("connect", () => {
        joinSetupComdRoom().then(() => {
          logger.debug(
            {
              test: "Should be able to recieve and reply to command-remove events",
            },
            "Connection recieved, emitting add-command"
          );
          client_io.on("command-remove", (res) => {
            expect(res).to.eql(add_command);
            success(done, IO, client_io);
            logger.debug(
              {
                test: "Should be able to recieve and reply to command-remove events",
              },
              "Done"
            );
          });
          client_io.emit("command-remove", add_command);
        });

        IO.on("connection", (srv_socket) => {
          logger.debug(
            {
              test: "Should be able to recieve and reply to command-remove events",
            },
            "Server connection established"
          );
          srv_socket.on("command-remove", (res) => {
            logger.debug(
              {
                test: "Should be able to recieve and reply to command-remove events",
              },
              "add-command recieved from client on server"
            );
            expect(res).to.eql(add_command);
          });
        });
      });
      client_io.connect();
    });
  });

  describe("Database changes", () => {
    let IO: SocketServer;
    let FCL: FancyCommandListener;
    let client_io: Socket;
    let db: AceBase;
    before((done) => {
      (async () => {
        logger.debug(
          { test: "Database changes setup (before)" },
          "Starting setup"
        );
        // Setup socket server
        IO = new SocketServer();
        FCL = new FancyCommandListener(IO, true);
        await FCL.FCE.Ready;
        logger.debug(
          { test: "Database changes setup (before)" },
          "FCE database ready"
        );
        db = FCL.FCE.db;

        // Prep database entries to change
        const add_command2: { [key: string]: string | number } = {
          name: "!test2",
          command: "Some command",
          allowed: 6,
        };
        await db.ref(`commands/${add_command2.name}`).set(add_command2);
        logger.debug(
          { test: "Database changes setup (before)" },
          "Added command2"
        );
        const add_command3: { [key: string]: string | number } = {
          name: "!test3",
          command: "Some command",
          allowed: 6,
        };
        await db.ref(`commands/${add_command3.name}`).set(add_command3);
        logger.debug(
          { test: "Database changes setup (before)" },
          "Added command 3"
        );
        // Connect client and server
        IO.listen(8081);
        client_io = SocketClient(end_point, opts);
        client_io.on("connect", () => {
          logger.debug(
            { test: "Database changes setup (before)" },
            "Connected"
          );
          client_io.emit("join-setup-commands");
        });
        client_io.on("joined-setup-commands", () => {
          logger.debug(
            { test: "Database changes setup (before)" },
            "Joined room. Setup complete"
          );
          done();
        });
        client_io.connect();
      })();
    });
    after(async () => {
      try {
        client_io.close();
        IO.close();
        await db.ref(`commands/!test1`).remove();
        await db.ref(`commands/!test2`).remove();
        await db.ref(`commands/!test3`).remove();
      } catch {}
    });

    it("Should add the command to the DB", (done) => {
      const add_command: { [key: string]: string } = {
        name: "!test1",
        command: "Some command",
        usableBy: "everyone",
      };
      const expected_return_command: { [key: string]: string | number } = {
        name: "!test1",
        command: "Some command",
        allowed: 6,
      };
      logger.debug(
        { test: "Should add the command to the DB" },
        "Setting up listener"
      );
      client_io.once("command-add", (res) => {
        logger.debug(
          { test: "Should add the command to the DB" },
          "Recieved reply from server regarding add"
        );
        db.ref(`commands/${add_command.name}`).get((ss) => {
          logger.debug(
            { test: "Should add the command to the DB" },
            "Recieved acknowledgement from server"
          );
          try {
            expect(ss.val()).to.eql(expected_return_command);
            done();
          } catch (e) {
            done(e);
          }
        });
      });
      logger.debug(
        { test: "Should add the command to the DB" },
        "Sending request to server"
      );
      client_io.emit("command-add", add_command);
    }).timeout(3000);

    it("Should update the command in the DB", (done) => {
      const add_command: { [key: string]: string | number } = {
        name: "!test2",
        command: "Some new command",
        allowed: "everyone",
      };
      const expected_return_command: { [key: string]: string | number } = {
        name: "!test2",
        command: "Some new command",
        allowed: 6,
      };
      logger.debug(
        { test: "Should update the command in the DB" },
        "Setting up listener"
      );
      client_io.once("command-add", (res) => {
        logger.debug(
          { test: "Should update the command in the DB" },
          "Recieved acknowledgement from server"
        );
        db.ref(`commands/${add_command.name}`).get((ss) => {
          try {
            expect(ss.val()).to.eql(expected_return_command);
            done();
          } catch (e) {
            done(e);
          }
        });
      });
      logger.debug(
        { test: "Should update the command in the DB" },
        "Sending request to server"
      );
      client_io.emit("command-add", add_command);
    });

    it("Should remove the command from the DB", (done) => {
      const remove_command: { [key: string]: string } = { name: "!test3" };
      logger.debug(
        { test: "Should remove the command from the DB" },
        "Setting up listener"
      );
      client_io.on("command-remove", (res) => {
        logger.debug(
          { test: "Should remove the command from the DB" },
          "Recieved acknowledgement from server"
        );
        db.ref(`commands/${remove_command.name}`).get((ss) => {
          try {
            expect(ss.val()).to.be.null;
            done();
          } catch (e) {
            done(e);
          }
        });
      });
      logger.debug(
        { test: "Should remove the command from the DB" },
        "Sending request to server"
      );
      client_io.emit("command-remove", remove_command);
    });

    it("Should list all commands from the DB", (done) => {
      logger.debug(
        { test: "Should list all commands from the DB" },
        "Setting up listener"
      );
      client_io.once("command-list", (cmdList: FancyCommand[]) => {
        logger.debug(
          { test: "Should list all commands from the DB" },
          "Recieved acknowledgement from server"
        );
        try {
          cmdList.forEach((cmd: FancyCommand) => {
            expect(cmd).to.have.all.keys("name", "command", "allowed");
          });
          done();
        } catch (e) {
          done(e);
        }
      });
      logger.debug(
        { test: "Should list all commands from the DB" },
        "Sending request to server"
      );
      client_io.emit("command-list");
    });
  }).timeout(4000);
});
