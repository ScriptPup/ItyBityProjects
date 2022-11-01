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
const FancyCommandExecutor_1 = require("../server/FancyCommandExecutor");
const chai_1 = require("chai");
require("mocha");
describe("FancyCommandExector storage operations", () => {
    let addedCMDKey;
    let keyCount;
    it("Should be able to instantiate and wait until ready", () => __awaiter(void 0, void 0, void 0, function* () {
        const FCE = new FancyCommandExecutor_1.FancyCommandExecutor();
        (0, chai_1.expect)(yield FCE.Ready).to.be.true;
    }));
    it('Should be able to add a "test" command', () => __awaiter(void 0, void 0, void 0, function* () {
        const FCE = new FancyCommandExecutor_1.FancyCommandExecutor();
        yield FCE.Ready;
        const new_fancy_command = {
            name: "!test",
            command: 'console.log("Test command run successfully!")',
            allowed: FancyCommandExecutor_1.UserTypes.VIEWER,
        };
        const nCmd = yield FCE.addCommand(new_fancy_command);
        addedCMDKey = nCmd.key;
        (0, chai_1.expect)(nCmd).to.not.be.null;
        (0, chai_1.expect)(nCmd).to.not.be.undefined;
    }));
    it("Should be able to list all contents", () => __awaiter(void 0, void 0, void 0, function* () {
        const contents = yield new FancyCommandExecutor_1.FancyCommandExecutor().getAllCommands();
        keyCount = contents.length;
        (0, chai_1.expect)(contents.length).to.greaterThan(0);
    }));
    it("Should be able to lookup added key", () => __awaiter(void 0, void 0, void 0, function* () {
        const cmd = yield new FancyCommandExecutor_1.FancyCommandExecutor().getCommand(addedCMDKey);
        (0, chai_1.expect)(cmd.name).to.equal("!test");
        (0, chai_1.expect)(cmd.command).to.equal('console.log("Test command run successfully!")');
    }));
    it("Should be able to update item by ID", () => __awaiter(void 0, void 0, void 0, function* () {
        const FCE = new FancyCommandExecutor_1.FancyCommandExecutor();
        const new_fancy_command = {
            name: "!test",
            command: 'console.log("Test command run successfully AGAIN!")',
            allowed: FancyCommandExecutor_1.UserTypes.VIEWER,
        };
        yield FCE.updateCommand(addedCMDKey, new_fancy_command);
        const ncmd = yield FCE.getCommand(addedCMDKey);
        (0, chai_1.expect)(ncmd.command).to.equal("Test command run successfully AGAIN!");
    }));
    it("Should be able to remove key by ID", () => __awaiter(void 0, void 0, void 0, function* () {
        const FCE = new FancyCommandExecutor_1.FancyCommandExecutor();
        FCE.removeCommand(addedCMDKey);
        const contents = yield FCE.getAllCommands();
        (0, chai_1.expect)(contents.length).to.equal(keyCount - 1);
    }));
});
