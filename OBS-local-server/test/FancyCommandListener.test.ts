/** @format */

import { FancyCommandListener } from "../server/lib/FancyCommandExecutor/FancyCommandListener";
import { FancyCommand } from "../server/lib/FancyCommandExecutor/FancyCommandExecutor";
import { expect } from "chai";
import { io, io as SocketClient, Socket } from "socket.io-client";
import { Server as SocketServer } from "socket.io";
import "mocha";
import { client } from "tmi.js";

const end_point = "http://localhost:8081";
const opts = { forceNew: true, reconnect: true };

describe("FancyCommandListener listener", () => {
  let IO: SocketServer;
  let FCE: FancyCommandListener;
  let client_io: Socket;
  before(async () => {
    IO = new SocketServer();
    FCE = new FancyCommandListener(IO);
    IO.listen(8081);
    client_io = SocketClient(end_point, opts);
    client_io = client_io.connect();
    await new Promise((res) => {
      client_io.on("connect", () => res(true));
    });
  });
  after(async () => {
    IO.close();
    client_io.close();
  });
  describe("General readieness", () => {
    it("Should be able to connect", (done) => {
      client_io.connect();
      expect(client_io.connected).to.be.true;
      done();
    });
  });

  describe("Adding commands", () => {
    const add_command: object = {
      name: "!test",
      command: "Some command",
      usableBy: "everyone",
    };

    it("Should be able to recieve and reply to add-command events", (done) => {
      IO.on("add-command", (res) => {
        expect(res).to.equal(add_command);
        client_io.emit("add-command", add_command);
        done();
      });
    });
    // it("Should be able respond to add-command events", () => {
    //   expect(add_command_responded).to.be.true;
    // });
  });
});
