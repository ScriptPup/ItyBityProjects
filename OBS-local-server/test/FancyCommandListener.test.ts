/** @format */

import { FancyCommandListener } from "../server/lib/FancyCommandExecutor/FancyCommandListener";
import { FancyCommand } from "../server/lib/FancyCommandExecutor/FancyCommandExecutor";
import { expect } from "chai";
import { io, io as SocketClient, Socket } from "socket.io-client";
import { Server as SocketServer } from "socket.io";
import "mocha";
import { pino } from "pino";
import { client } from "tmi.js";
const logger = pino({"level": "debug"},pino.destination({"mkdir": true, "writable": true, "dest": `${__dirname}/logs/FancyCommandParser.test.log`}));


const end_point = "http://localhost:8081";
const opts = { forceNew: true, reconnect: true };

function success(
  done: Function,
  io: SocketServer,
  ...clients: Socket[]
) {
  io.close();
  clients.forEach((client) => client.disconnect());
  done();
}

describe("FancyCommandListener listener", () => {
  let IO: SocketServer;
  let FCE: FancyCommandListener;
  let client_io: Socket;
  after(()=>{
    try {
      client_io.close();
      IO.close();
    } catch {}
  });
  // Generally can be ready
  it("Should be able to connect", (done) => {
    logger.debug({"test": "Should be able to connect"},"Start");
    IO = new SocketServer();
    FCE = new FancyCommandListener(IO, true);
    IO.listen(8081);
    client_io = SocketClient(end_point, opts);    
    client_io.on("connect", () => {
      logger.debug({"test": "Should be able to connect"},"Client connection detected");
      expect(client_io.connected).to.be.true;
      logger.debug({"test": "Should be able to connect"},`IO connected status ${client_io.connected}`);      
      success(done, IO, client_io);
      logger.debug({"test": "Should be able to connect"},"Done");
    });
    client_io.connect();
  });

  it("Should be able to recieve and reply to add-command events", (done) => {
    const add_command: object = {
      name: "!test",
      command: "Some command",
      usableBy: "everyone",
    };
    logger.debug({"test": "Should be able to recieve and reply to add-command events"},"Start");
    IO = new SocketServer();
    FCE = new FancyCommandListener(IO, true);
    IO.listen(8081);
    client_io = SocketClient(end_point, opts);    
    
    client_io.on("connect", () => {
      logger.debug({"test": "Should be able to recieve and reply to add-command events"},"Connection recieved, emitting add-command");
      client_io.emit("add-command", add_command);      
    });

    IO.on("connection", (srv_socket) => {
      logger.debug({"test": "Should be able to recieve and reply to add-command events"},"Server connection established");
      srv_socket.on("add-command", (res) => {
        logger.debug({"test": "Should be able to recieve and reply to add-command events"},"add-command recieved from client");
        expect(res).to.eql(add_command);        
        success(done, IO, client_io);
        logger.debug({"test": "Should be able to recieve and reply to add-command events"},"Done");
      });
    });

    client_io = client_io.connect();    
  });
  // it("Should be able respond to add-command events", () => {
  //   expect(add_command_responded).to.be.true;
  // });
});
