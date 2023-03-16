/** @format */

import { expect } from "chai";
import { io as SocketClient, Socket } from "socket.io-client";
import { Server as SocketServer } from "socket.io";
import "mocha";
import { AceBase } from "acebase";
import { TestLogger } from "../logging";

import {
  FancyClientItemBase,
  FancyRedemption,
  UserTypes,
} from "../../js/shared/obj/FancyCommandTypes";
import { FancyRedemptionListener } from "../../server/lib/FancyCommandExecutor/FancyRedemptionListener";
import { FancyRedemptionStorage } from "../../server/lib/FancyCommandExecutor/FancyRedemptionStorage";

const logger = TestLogger.child({ File: "FancyRedemptionListener.test" });

const end_point = "http://localhost:8081";
const opts = { forceNew: true, reconnect: true };

function success(done: Function, io: SocketServer, ...clients: Socket[]) {
  io.close();
  clients.forEach((client) => client.disconnect());
  done();
}

describe("FancyRedemptionListener listener", () => {
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
    let FCL: FancyRedemptionListener;
    let client_io: Socket;
    afterEach(() => {
      try {
        client_io.close();
        IO.close();
      } catch {}
    });
    beforeEach((done) => {
      const FCS: FancyRedemptionStorage = new FancyRedemptionStorage();
      IO = new SocketServer();
      FCL = new FancyRedemptionListener(IO, FCS, true);
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

    it("Should be able to recieve and reply to redemption-add events", (done) => {
      const add_command: FancyRedemption = {
        name: "test_redemption1",
        prompt: "This is a redemption test",
        command: "Some redemption",
        cost: 1,
      };
      const server_command: FancyRedemption = add_command;
      logger.debug(
        {
          test: "Should be able to recieve and reply to redemption-add events",
        },
        "Start"
      );
      client_io.on("connect", () => {
        joinSetupComdRoom().then(() => {
          logger.debug(
            {
              test: "Should be able to recieve and reply to redemption-add events",
            },
            "Connection recieved, emitting redemption-add"
          );
          client_io.on("redemption-add", (res) => {
            expect(res).to.eql(server_command);
            success(done, IO, client_io);
            logger.debug(
              {
                test: "Should be able to recieve and reply to redemption-add events",
              },
              "Done"
            );
          });
          client_io.emit("redemption-add", add_command);
        });

        IO.on("connection", (srv_socket) => {
          logger.debug(
            {
              test: "Should be able to recieve and reply to redemption-add events",
            },
            "Server connection established"
          );
          srv_socket.on("redemption-add", (res) => {
            logger.debug(
              {
                test: "Should be able to recieve and reply to redemption-add events",
              },
              "add-command recieved from client on server"
            );
            expect(res).to.eql(add_command);
          });
        });
        client_io.connect();
      });
    });

    it("Should be able to recieve and reply to redemption-remove events", (done) => {
      const add_command: { [key: string]: string } = {
        name: "redemption_test2",
      };
      logger.debug(
        {
          test: "Should be able to recieve and reply to redemption-remove events",
        },
        "Start"
      );
      client_io.on("connect", () => {
        joinSetupComdRoom().then(() => {
          logger.debug(
            {
              test: "Should be able to recieve and reply to redemption-remove events",
            },
            "Connection recieved, emitting redemption-remove"
          );
          client_io.on("redemption-remove", (res) => {
            expect(res).to.eql(add_command);
            success(done, IO, client_io);
            logger.debug(
              {
                test: "Should be able to recieve and reply to redemption-remove events",
              },
              "Done"
            );
          });
          client_io.emit("redemption-remove", add_command);
        });

        IO.on("connection", (srv_socket) => {
          logger.debug(
            {
              test: "Should be able to recieve and reply to redemption-remove events",
            },
            "Server connection established"
          );
          srv_socket.on("redemption-remove", (res) => {
            logger.debug(
              {
                test: "Should be able to recieve and reply to redemption-remove events",
              },
              "redemption-remove recieved from client on server"
            );
            expect(res).to.eql(add_command);
          });
        });
      });
      client_io.connect();
    });
  });

  describe("Database & server cache changes", () => {
    let IO: SocketServer;
    let FCL: FancyRedemptionListener;
    let client_io: Socket;
    let db: AceBase;
    before((done) => {
      (async () => {
        logger.debug(
          { test: "Database changes setup (before)" },
          "Starting setup"
        );
        const FCS: FancyRedemptionStorage = new FancyRedemptionStorage();
        // Setup socket server
        IO = new SocketServer();
        FCL = new FancyRedemptionListener(IO, FCS, true);
        await FCL.FS.Ready;
        logger.debug(
          { test: "Database changes setup (before)" },
          "FCE database ready"
        );
        db = FCS.db;

        // Prep database entries to change
        const add_command2: FancyRedemption = {
          name: "redemption_test3",
          command: "Some command",
          prompt: "Some test command",
          cost: 1,
        };
        await db.ref(`redemptions/${add_command2.name}`).set(add_command2);
        logger.debug(
          { test: "Database changes setup (before)" },
          "Added command2"
        );
        const add_command3: FancyRedemption = {
          name: "redemption_test4",
          command: "Some command",
          prompt: "Some test command",
          cost: 1,
        };
        await db.ref(`redemptions/${add_command3.name}`).set(add_command3);
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
        await db.ref(`redemptions/redemption_test1`).remove();
        await db.ref(`redemptions/redemption_test2`).remove();
        await db.ref(`redemptions/redemption_test3`).remove();
        await db.ref(`redemptions/redemption_test4`).remove();
      } catch {}
    });

    it("Should add the command to the DB & server cache", (done) => {
      const add_command: FancyRedemption = {
        name: "redemption_test1",
        command: "Some command",
        prompt: "Some test command",
        cost: 1,
      };
      const expected_return_command: FancyRedemption = add_command;

      logger.debug(
        { test: "Should add the command to the DB" },
        "Setting up listener"
      );
      client_io.once("redemption-add", (res) => {
        logger.debug(
          { test: "Should add the command to the DB", result_from_add: res },
          "Recieved reply from server regarding add"
        );
        db.ref(`redemptions/${add_command.name}`).get((ss) => {
          const val = ss.val();
          logger.debug(
            {
              test: "Should add the command to the DB",
              searched_for: `redemptions/${add_command.name}`,
              data: val,
            },
            "Recieved acknowledgement from server"
          );
          try {
            expect(val).to.eql(expected_return_command);
            expect(
              [...FCL.commands].find((x) => x.name === add_command.name)
            ).to.eql(expected_return_command);
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
      client_io.emit("redemption-add", add_command);
    }).timeout(3000);

    it("Should update the command in the DB & server cache", (done) => {
      const add_command: FancyRedemption = {
        name: "redemption_test2",
        command: "Some new command",
        prompt: "Some test command",
        cost: 1,
      };
      const expected_return_command: FancyRedemption = add_command;

      logger.debug(
        { test: "Should update the command in the DB" },
        "Setting up listener"
      );
      client_io.once("redemption-add", (res) => {
        logger.debug(
          { test: "Should update the command in the DB" },
          "Recieved acknowledgement from server"
        );
        db.ref(`redemptions/${add_command.name}`).get((ss) => {
          try {
            expect(ss.val()).to.eql(expected_return_command);
            const updatedCacheCmd = [...FCL.commands].find(
              (x) => x.name === add_command.name
            );
            expect(updatedCacheCmd).to.eql(expected_return_command);
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
      client_io.emit("redemption-add", add_command);
    });

    it("Should remove the command from the DB & local cache", (done) => {
      const remove_command: FancyClientItemBase = { name: "redemption_test2" };
      logger.debug(
        { test: "Should remove the command from the DB" },
        "Setting up listener"
      );
      client_io.on("redemption-remove", (res) => {
        logger.debug(
          { test: "Should remove the command from the DB" },
          "Recieved acknowledgement from server"
        );
        db.ref(`redemptions/${remove_command.name}`).get((ss) => {
          try {
            expect(ss.val()).to.be.null;
            expect(
              [...FCL.commands].find((x) => x.name === remove_command.name)
            ).to.be.undefined;
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
      client_io.emit("redemption-remove", remove_command);
    });

    it("Should list all commands from the DB", (done) => {
      logger.debug(
        { test: "Should list all commands from the DB" },
        "Setting up listener"
      );
      client_io.once("redemption-list", (cmdList: FancyRedemption[]) => {
        logger.debug(
          { test: "Should list all commands from the DB", cmdList },
          "Recieved acknowledgement from server"
        );
        try {
          cmdList.forEach((cmd: FancyRedemption) => {
            expect(cmd)
              .to.be.an("object")
              .that.contains.keys("name", "command", "prompt", "cost");
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
      client_io.emit("redemption-list");
    });
  }).timeout(4000);
});
