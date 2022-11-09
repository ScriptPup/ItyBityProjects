/** @format */

import {
  FancyCommandParser,
  AcceptedVarTypes,
  getAcceptedType,
  VarBlockType,
} from "../server/lib/FancyCommandParser";
import { DataReference } from "acebase";
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

  // Start testing equal assignments {var=$something}
  describe("Equals Assigments", async () => {
    // **********************************
    // * TEST STRING ASSIGNMENT
    // **********************************
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
      after(async () => {
        await contextDB.ref("variables/stringVAR").remove();
      });
    });

    // **********************************
    // * TEST NUMERIC ASSIGNMENT
    // **********************************
    describe("Numeric assignment", async () => {
      let varName: string = "numberVAR";
      let stringVarBlockTxt: string;
      let parsedBlock: FancyCommandParser;
      before(async () => {
        stringVarBlockTxt = `This is a {${varName}=5}`;
        parsedBlock = new FancyCommandParser(stringVarBlockTxt, contextDB);
        await parsedBlock.Ready; // Wait for the parser to finish before running tests
      });
      after(async () => {
        await contextDB.ref(`variables/${varName}`).remove();
      });
      it("Should return command with variable blocks replaced", async () => {
        const replacedCmd: string = await parsedBlock.Ready;
        expect(replacedCmd).is.equal(5);
      });
      it("Should have added database variable numeric entry", async () => {
        const variableVal: AcceptedVarTypes = (
          await contextDB.ref(`variables/${varName}`).get()
        ).val();
        expect(variableVal).to.be.a("number");
        expect(variableVal).is.equal(5);
      });
    });

    // **********************************
    // * TEST SET ASSIGNMENT
    // **********************************
    describe("Set assignment", async () => {
      let varName: string = "setVAR";
      let stringVarBlockTxt: string;
      let parsedBlock: FancyCommandParser;
      before(async () => {
        stringVarBlockTxt = `I like: {${varName}=("fruit","dogs","women","money","dogs")}`;
        parsedBlock = new FancyCommandParser(stringVarBlockTxt, contextDB);
        await parsedBlock.Ready; // Wait for the parser to finish before running tests
      });
      after(async () => {
        await contextDB.ref(`variables/${varName}`).remove();
      });
      it("Should return command with variable blocks replaced", async () => {
        const replacedCmd: string = await parsedBlock.Ready;
        expect(replacedCmd).is.equal("I like: fruit,dogs,women,money");
      });
      it("Should have added database variable set entry", async () => {
        const variableVal: AcceptedVarTypes = (
          await contextDB.ref(`variables/${varName}`).get()
        ).val();
        expect(variableVal).to.be.a("set");
        expect(variableVal).is.equal(
          new Set(["fruit", "dogs", "women", "money", "dogs"])
        );
      });
    });

    // **********************************
    // * TEST ARRAY ASSIGNMENT
    // **********************************
    describe("Array assignment", async () => {
      let varName: string = "arrayVAR";
      let stringVarBlockTxt: string;
      let parsedBlock: FancyCommandParser;
      before(async () => {
        stringVarBlockTxt = `I like: {${varName}=["fruit","dogs","women","money","dogs"]}`;
        parsedBlock = new FancyCommandParser(stringVarBlockTxt, contextDB);
        await parsedBlock.Ready; // Wait for the parser to finish before running tests
      });
      after(async () => {
        await contextDB.ref(`variables/${varName}`).remove();
      });
      it("Should return command with variable blocks replaced", async () => {
        const replacedCmd: string = await parsedBlock.Ready;
        expect(replacedCmd).is.equal("I like: fruit,dogs,women,money,dogs");
      });
      it("Should have added database variable set entry", async () => {
        const variableVal: AcceptedVarTypes = (
          await contextDB.ref(`variables/${varName}`).get()
        ).val();
        expect(variableVal).to.be.an("array");
        expect(variableVal).is.equal([
          "fruit",
          "dogs",
          "women",
          "money",
          "dogs",
        ]);
      });
    });
  }); // End testing equal assignments {var=$something}

  // **********************************
  // * TEST VARIABLE DELETION
  // **********************************
  describe("Variable deletion", async () => {
    let parsedBlock: FancyCommandParser;
    let [stringVar, numberVar, arrayVar, setVar] = [
      "stringVar",
      "numberVar",
      "arrayVar",
      "setVar",
    ];
    before(async () => {
      const addRefs: Array<Promise<DataReference>> = new Array<
        Promise<DataReference>
      >();
      addRefs.push(contextDB.ref(`variables/${stringVar}`).set("Test"));
      addRefs.push(contextDB.ref(`variables/${numberVar}`).set(100));
      addRefs.push(
        contextDB.ref(`variables/${arrayVar}`).set(["Test", "something"])
      );
      addRefs.push(
        contextDB.ref(`variables/${setVar}`).set(new Set(["Test", "something"]))
      );
      await Promise.all(addRefs);
    });
    after(async () => {
      const addRefs: Array<Promise<DataReference>> = new Array<
        Promise<DataReference>
      >();
      addRefs.push(contextDB.ref(`variables/${stringVar}`).remove());
      addRefs.push(contextDB.ref(`variables/${numberVar}`).remove());
      addRefs.push(contextDB.ref(`variables/${arrayVar}`).remove());
      addRefs.push(contextDB.ref(`variables/${setVar}`).remove());
      await Promise.all(addRefs);
    });

    it("Should delete a string", async () => {
      const varName = stringVar;
      let variableVal: AcceptedVarTypes = (
        await contextDB.ref(`variables/${varName}`).get()
      ).val();
      expect(variableVal).to.not.be.null;

      new FancyCommandParser(`{${varName}=null}`, contextDB);
      await parsedBlock.Ready;
      variableVal = (await contextDB.ref(`variables/${varName}`).get()).val();
      expect(variableVal).to.be.null;
    });

    it("Should delete a number", async () => {
      const varName = numberVar;
      let variableVal: AcceptedVarTypes = (
        await contextDB.ref(`variables/${varName}`).get()
      ).val();
      expect(variableVal).to.not.be.null;

      new FancyCommandParser(`{${varName}=null}`, contextDB);
      await parsedBlock.Ready;
      variableVal = (await contextDB.ref(`variables/${varName}`).get()).val();
      expect(variableVal).to.be.null;
    });

    it("Should delete a set", async () => {
      const varName = setVar;
      let variableVal: AcceptedVarTypes = (
        await contextDB.ref(`variables/${varName}`).get()
      ).val();
      expect(variableVal).to.not.be.null;

      new FancyCommandParser(`{${varName}=null}`, contextDB);
      await parsedBlock.Ready;
      variableVal = (await contextDB.ref(`variables/${varName}`).get()).val();
      expect(variableVal).to.be.null;
    });

    it("Should delete an array", async () => {
      const varName = arrayVar;
      let variableVal: AcceptedVarTypes = (
        await contextDB.ref(`variables/${varName}`).get()
      ).val();
      expect(variableVal).to.not.be.null;

      new FancyCommandParser(`{${varName}=null}`, contextDB);
      await parsedBlock.Ready;
      variableVal = (await contextDB.ref(`variables/${varName}`).get()).val();
      expect(variableVal).to.be.null;
    });
  });
});