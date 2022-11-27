/** @format */

import { FancyCommandListener } from "../server/lib/FancyCommandExecutor/FancyCommandListener";
import { FancyCommand } from "../server/lib/FancyCommandExecutor/FancyCommandExecutor";
import { expect } from "chai";
import { io, io as SocketClient, Socket } from "socket.io-client";
import { Server as SocketServer } from "socket.io";
import "mocha";
import { pino } from "pino";
import { AceBase } from "acebase";
import exp from "constants";
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
  describe("Events Fire", () => { 
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

    it("Should be able to recieve and reply to command-add events", (done) => {
      const add_command: {[key: string]: string} = {
        name: "!evt_test",
        command: "Some command",
        usableBy: "everyone",
      };
      logger.debug({"test": "Should be able to recieve and reply to command-add events"},"Start");
      IO = new SocketServer();
      FCE = new FancyCommandListener(IO, true);
      IO.listen(8081);
      client_io = SocketClient(end_point, opts);    
      
      client_io.on("connect", () => {
        logger.debug({"test": "Should be able to recieve and reply to command-add events"},"Connection recieved, emitting add-command");
        client_io.on("command-add", (res) => {
          expect(res).to.eql(add_command);      
          success(done, IO, client_io);
          logger.debug({"test": "Should be able to recieve and reply to command-add events"},"Done");
        });
        client_io.emit("command-add", add_command);
      });

      IO.on("connection", (srv_socket) => {
        logger.debug({"test": "Should be able to recieve and reply to command-add events"},"Server connection established");
        srv_socket.on("command-add", (res) => {
          logger.debug({"test": "Should be able to recieve and reply to command-add events"},"add-command recieved from client on server");
          expect(res).to.eql(add_command);     
        });
      });

      client_io = client_io.connect();    
    });

    it("Should be able to recieve and reply to command-remove events", (done) => {
      const add_command: {[key: string]: string} = { name: "!evt_test" };
      logger.debug({"test": "Should be able to recieve and reply to command-remove events"},"Start");
      IO = new SocketServer();
      FCE = new FancyCommandListener(IO, true);
      IO.listen(8081);
      client_io = SocketClient(end_point, opts);    
      
      client_io.on("connect", () => {
        logger.debug({"test": "Should be able to recieve and reply to command-remove events"},"Connection recieved, emitting add-command");
        client_io.on("command-remove", (res) => {
          expect(res).to.eql(add_command);      
          success(done, IO, client_io);
          logger.debug({"test": "Should be able to recieve and reply to command-remove events"},"Done");
        });
        client_io.emit("command-remove", add_command);      
      });

      IO.on("connection", (srv_socket) => {
        logger.debug({"test": "Should be able to recieve and reply to command-remove events"},"Server connection established");
        srv_socket.on("command-remove", (res) => {
          logger.debug({"test": "Should be able to recieve and reply to command-remove events"},"add-command recieved from client on server");
          expect(res).to.eql(add_command);
        });
      });
      client_io = client_io.connect();    
    });
  });

  describe("Database changes", () => {
    let IO: SocketServer;
    let FCE: FancyCommandListener;
    let client_io: Socket;
    let db: AceBase = new AceBase("commandDB", {
      sponsor: true,
      logLevel: "error",
      info: "",
    });
    before(async ()=>{
      return new Promise<boolean>(async (resolve)=>{
        await db.ready();
        // Prep database entries to change
        const add_command2: {[key: string]: string|number} = {
          name: "!test2",
          command: "Some command",
          allowed: 6,
        };
        await db.ref(`commands/${add_command2.name}`).set(add_command2);
        const add_command3: {[key: string]: string|number} = {
          name: "!test3",
          command: "Some command",
          allowed: 6,
        };
        await db.ref(`commands/${add_command3.name}`).set(add_command3);


        // Setup socket server
        IO = new SocketServer();
        FCE = new FancyCommandListener(IO, true);
        IO.listen(8081);
        client_io = SocketClient(end_point, opts);    
        client_io.on("connect", () => {
          resolve(true);
        });
        client_io.connect();
      });
    });
    after(async ()=>{
      try {
        client_io.close();
        IO.close();
        await db.ref(`commands/!test1`).remove();
        await db.ref(`commands/!test2`).remove();
        await db.ref(`commands/!test3`).remove();
      } catch {}
    });

    it("Should add the command to the DB", (done) => {
      const add_command: {[key: string]: string} = {
        name: "!test1",
        command: "Some command",
        usableBy: "everyone",
      };
      const expected_return_command: {[key: string]: string|number}  = { name: '!test1', command: 'Some command', allowed: 6 };
      client_io.once("command-add", (res) => {  
        db.ref(`commands/${add_command.name}`).get((ss)=>{
          try{ 
            expect(ss.val()).to.eql(expected_return_command);
          } finally { done(); }          
        });
      });
      client_io.emit("command-add", add_command);
    });

    it("Should update the command in the DB", (done) => {
      const add_command: {[key: string]: string|number} = {
        name: "!test2",
        command: "Some new command",
        allowed: 6,
      };
      const expected_return_command: {[key: string]: string|number}  = { name: '!test2', command: 'Some new command', allowed: 6 };
      client_io.once("command-add", (res)=>{
        db.ref(`commands/${add_command.name}`).get((ss)=>{
          try { expect(ss.val()).to.eql(expected_return_command);}
          finally { done(); }
        });   
      });          
      client_io.emit("command-add", add_command);    
    });

    it("Should remove the command from the DB", (done) => {
      const remove_command: {[key: string]: string} = {name: "!test3" };
      client_io.on("command-remove", (res) => {  
        db.ref(`commands/${remove_command.name}`).get((ss)=>{
          try {
          expect(ss.val()).to.be.null;
          } finally { done(); }
        });
      });
      client_io.emit("command-remove",remove_command);
    });
  });
});
