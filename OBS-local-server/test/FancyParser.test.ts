/** @format */

import {
  FancyCommandParser,
  AcceptedVarTypes,
  getAcceptedType,
  VarBlockType,
} from "../server/lib/FancyCommandParser";

import { expect } from "chai";
import "mocha";
import { AceBase } from "acebase";
import { parse } from "path";

describe("FancyParser Evaluation", () => {
  let contextDB: AceBase = new AceBase("test_variables", { sponsor: true });
  before(async () => {
    return contextDB.ready;
  });
  describe("Accepted Type Parsing", () => {
    const someString: AcceptedVarTypes = "Some string";
    const someNumber: AcceptedVarTypes = 1;
    const someArray: AcceptedVarTypes = ["Some", "Array"];
    const someSet: AcceptedVarTypes = new Set();
    someSet.add("Some");
    someSet.add("Set");

    const someArrayString: AcceptedVarTypes = '["Some", "Array"]';
    const someSetString: AcceptedVarTypes = '("Some","Set")';

    it("Should detect strings", () => {
      expect(getAcceptedType(someString)).to.equal(VarBlockType.STRING);
    });
    it("Should detect numbers", () => {
      expect(getAcceptedType(someNumber)).to.equal(VarBlockType.NUMBER);
    });
    it("Should detect arrays", () => {
      expect(getAcceptedType(someArray)).to.equal(VarBlockType.ARRAY);
    });
    it("Should detect sets", () => {
      expect(getAcceptedType(someSet)).to.equal(VarBlockType.SET);
    });

    it("Should detect arrays from strings", () => {
      expect(getAcceptedType(someArrayString)).to.equal(VarBlockType.ARRAY);
    });
    it("Should detect sets from strings", () => {
      expect(getAcceptedType(someSetString)).to.equal(VarBlockType.SET);
    });
  });
  describe("String assignment", async () => {
    let stringVarBlockTxt: string;
    let parsedBlock: FancyCommandParser;
    before(async () => {
      stringVarBlockTxt = "This is a {stringVAR=test}";
      parsedBlock = new FancyCommandParser(stringVarBlockTxt, contextDB);
      await parsedBlock.Ready; // Wait for the parser to finish before running tests
    });
    it("Should return command with variable blocks replaced", async () => {
      const replacedCmd: string = await parsedBlock.Ready;
      expect(replacedCmd).is.equal("This is a test");
    });
    it("Should have added database variable string entry", async () => {
      const variableVal: AcceptedVarTypes = (
        await contextDB.ref("variables/stringVAR").get()
      ).val();
      expect(variableVal).to.be.string;
      expect(variableVal).is.equal("test");
    });
  });
});
