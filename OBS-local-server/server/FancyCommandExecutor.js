"use strict";
/** @format */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FancyCommandExecutor = exports.UserTypes = void 0;
const acebase_1 = require("acebase");
var UserTypes;
(function (UserTypes) {
    UserTypes[UserTypes["STREAMER"] = 0] = "STREAMER";
    UserTypes[UserTypes["MODERATOR"] = 1] = "MODERATOR";
    UserTypes[UserTypes["VIEWER"] = 2] = "VIEWER";
    UserTypes[UserTypes["BOT"] = 3] = "BOT";
})(UserTypes = exports.UserTypes || (exports.UserTypes = {}));
class FancyCommandExecutor {
    constructor(testing = false) {
        this.db = new acebase_1.AceBase("commandDB", {
            sponsor: testing,
            logLevel: "error",
            info: "",
        }); // Sponsors can turn off the logo. I am not a sponsor and have no intention of using the software without it without the creator's consent; but when testing it's incredibly annoying and hides my test results... So this is a compromise :)
        this.Ready = new Promise((res, rej) => {
            this.db.ready(() => {
                res(true);
            });
        });
    }
    flushCommands() {
        return this.Ready.then(() => {
            return this.db.ref("commands").query().remove();
        });
    }
    // Save a new command to the local database
    // At the same time, add the command to local execution memory
    addCommand(ncmd) {
        return this.Ready.then(() => {
            return this.db.ref("commands").push(ncmd);
        });
    }
    removeCommand(key) {
        return this.Ready.then(() => {
            return this.db.ref(`commands/${key}`).remove();
        });
    }
    // Pull all commands currently saved to the database
    getAllCommands() {
        return this.Ready.then(() => {
            return this.db.query("commands").take(1000).get();
        });
    }
    updateCommand(key, cmd) {
        return __awaiter(this, void 0, void 0, function* () {
            const item = this.db.ref(`commands/${key}`);
            yield item.set(cmd);
            return cmd;
        });
    }
    // Get a specific command saved to the database
    // After thinking about it more I realized this is probably unecissary since I'll in all likelyhood already be storing all of the commands in-memory
    // But... It's here if needed I guess
    getCommand(key) {
        return __awaiter(this, void 0, void 0, function* () {
            const content = this.db.ref(`commands/${key}`).get();
            return new Promise((res, rej) => {
                content.then((snapshot) => {
                    res(snapshot.val());
                });
            });
        });
    }
}
exports.FancyCommandExecutor = FancyCommandExecutor;
