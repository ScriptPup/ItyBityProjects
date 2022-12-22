/** @format */

import {
  FancyCommandParser,
  AcceptedVarTypes,
  getAcceptedType,
  VarBlockType,
  VarBlock,
  Next,
} from "../../server/lib/FancyCommandParser/FancyCommandParser";
import { DataReference } from "acebase";
import { expect } from "chai";
import "mocha";
import { AceBase } from "acebase";

describe("FancyParser Evaluation", () => {
  let contextDB: AceBase = new AceBase("test_variables", {
    sponsor: true,
    logLevel: "error",
  });
  before(async () => {
    return contextDB.ready;
  });

  // **********************************
  // * TEST TYPE PARSING
  // * Parse both string into a type and already typed data
  // **********************************
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

  // **********************************
  // * TEST VARIABLE ASSIGNMENT
  // * Able to make assignment via an equals operator {var=$something}
  // **********************************
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
        await parsedBlock.Ready;
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
        expect(replacedCmd).is.equal("This is a 5");
      });
      it("Should have added database variable numeric entry", async () => {
        await parsedBlock.Ready;
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
        stringVarBlockTxt = `I like: {${varName}=(fruit,dogs,women,money,dogs)}`;
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
        await parsedBlock.Ready;
        const variableVal: AcceptedVarTypes = (
          await contextDB.ref(`variables/${varName}`).get()
        ).val();
        expect(variableVal).to.be.an("array");
        // Because AceBase doesn't support Sets, what we're doing is passing the set to an array
        // and saving that array. So it *should* be unique, which is really what we're concerned with. The typing isn't very important.
        expect(variableVal).deep.equal([
          ...new Set(["fruit", "dogs", "women", "money", "dogs"]),
        ]);
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
        stringVarBlockTxt = `I like: {${varName}=[fruit,dogs,women,money,dogs]}`;
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
        await parsedBlock.Ready;
        const variableVal: AcceptedVarTypes = (
          await contextDB.ref(`variables/${varName}`).get()
        ).val();
        expect(variableVal).to.be.an("array");
        expect(variableVal).deep.equal([
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
  // * TEST VARIABLE ADDITION
  // * Able to make assignment via + operator {var+$something}
  // **********************************
  describe("Addition Assigments", async () => {
    // **********************************
    // * TEST STRING ASSIGNMENT
    // **********************************
    describe("String addition", async () => {
      let stringVarBlockTxt: string;
      let parsedBlock: FancyCommandParser;
      before(async () => {
        stringVarBlockTxt = "This is a {stringVAR+test}";
        parsedBlock = new FancyCommandParser(stringVarBlockTxt, contextDB);
        await parsedBlock.Ready; // Wait for the parser to finish before running tests
      });
      it("Should return command with variable blocks replaced", async () => {
        const replacedCmd: string = await parsedBlock.Ready;
        expect(replacedCmd).is.equal("This is a test");
      });
      it("Should have added database variable string entry", async () => {
        await parsedBlock.Ready;
        const variableVal: AcceptedVarTypes = (
          await contextDB.ref("variables/stringVAR").get()
        ).val();
        expect(variableVal).to.be.string;
        expect(variableVal).is.equal("test");
      });
      it("Should be able to append to the message", async () => {
        await parsedBlock.Ready;
        const newParsedBlock: string = await new FancyCommandParser(
          "This is a {stringVAR+ string}",
          contextDB
        ).Ready;
        expect(newParsedBlock).is.equal("This is a test string");
        const variableVal: AcceptedVarTypes = (
          await contextDB.ref("variables/stringVAR").get()
        ).val();
        expect(variableVal).to.be.string;
        expect(variableVal).is.equal("test string");
      });
      after(async () => {
        await contextDB.ref("variables/stringVAR").remove();
      });
    });

    // **********************************
    // * TEST NUMERIC ASSIGNMENT
    // **********************************
    describe("Numeric addition", async () => {
      let varName: string = "numberVAR";
      let stringVarBlockTxt: string;
      let parsedBlock: FancyCommandParser;
      before(async () => {
        stringVarBlockTxt = `This is a {${varName}+5}`;
        parsedBlock = new FancyCommandParser(stringVarBlockTxt, contextDB);
        await parsedBlock.Ready; // Wait for the parser to finish before running tests
      });
      after(async () => {
        await contextDB.ref(`variables/${varName}`).remove();
      });
      it("Should return command with variable blocks replaced", async () => {
        const replacedCmd: string = await parsedBlock.Ready;
        expect(replacedCmd).is.equal("This is a 5");
      });
      it("Should have added database variable numeric entry", async () => {
        await parsedBlock.Ready;
        const variableVal: AcceptedVarTypes = (
          await contextDB.ref(`variables/${varName}`).get()
        ).val();
        expect(variableVal).to.be.a("number");
        expect(variableVal).is.equal(5);
      });
      it("Should be able to add to increment the number", async () => {
        await parsedBlock.Ready;
        const newParsedBlock: string = await new FancyCommandParser(
          `This is a {${varName}+1}`,
          contextDB
        ).Ready;
        expect(newParsedBlock).is.equal("This is a 6");
        const variableVal: AcceptedVarTypes = (
          await contextDB.ref(`variables/${varName}`).get()
        ).val();
        expect(variableVal).to.be.a("number");
        expect(variableVal).is.equal(6);
      });
    });

    // **********************************
    // * TEST SET ASSIGNMENT
    // **********************************
    describe("Set addition", async () => {
      let varName: string = "setVAR";
      let stringVarBlockTxt: string;
      let parsedBlock: FancyCommandParser;
      before(async () => {
        stringVarBlockTxt = `I like: {${varName}+(fruit,dogs,women,money,dogs)}`;
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
        await parsedBlock.Ready;
        const variableVal: AcceptedVarTypes = (
          await contextDB.ref(`variables/${varName}`).get()
        ).val();
        expect(variableVal).to.be.an("array");
        // Because AceBase doesn't support Sets, what we're doing is passing the set to an array
        // and saving that array. So it *should* be unique, which is really what we're concerned with. The typing isn't very important.
        expect(variableVal).deep.equal([
          ...new Set(["fruit", "dogs", "women", "money", "dogs"]),
        ]);
      });
      it("Should be able to add to the set", async () => {
        await parsedBlock.Ready;
        const newParsedBlock: string = await new FancyCommandParser(
          `I like: {${varName}+(cats)}`,
          contextDB
        ).Ready;
        expect(newParsedBlock).is.equal("I like: fruit,dogs,women,money,cats");
        const variableVal: AcceptedVarTypes = (
          await contextDB.ref(`variables/${varName}`).get()
        ).val();
        expect(variableVal).to.be.an("array");
        expect(variableVal).deep.equal([
          ...new Set(["fruit", "dogs", "women", "money", "dogs", "cats"]),
        ]);
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
        stringVarBlockTxt = `I like: {${varName}=[fruit,dogs,women,money,dogs]}`;
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
      it("Should have added database variable array entry", async () => {
        await parsedBlock.Ready;
        const variableVal: AcceptedVarTypes = (
          await contextDB.ref(`variables/${varName}`).get()
        ).val();
        expect(variableVal).to.be.an("array");
        expect(variableVal).deep.equal([
          "fruit",
          "dogs",
          "women",
          "money",
          "dogs",
        ]);
      });
      it("Should be able to add to the array", async () => {
        await parsedBlock.Ready;
        const newParsedBlock: string = await new FancyCommandParser(
          `I like: {${varName}+[cats]}`,
          contextDB
        ).Ready;
        expect(newParsedBlock).is.equal(
          "I like: fruit,dogs,women,money,dogs,cats"
        );
        const variableVal: AcceptedVarTypes = (
          await contextDB.ref(`variables/${varName}`).get()
        ).val();
        expect(variableVal).to.be.an("array");
        expect(variableVal).deep.equal([
          "fruit",
          "dogs",
          "women",
          "money",
          "dogs",
          "cats",
        ]);
      });
    });
  }); // End testing addition assignments {var+$something}

  // **********************************
  // * TEST VARIABLE SUBTRACTION
  // * Able to make assignment via - operator {var-$something}
  // **********************************
  describe("Subtraction Assigments", async () => {
    // **********************************
    // * TEST NUMERIC SUBTRACTION
    // **********************************
    describe("Numeric addition", async () => {
      let varName: string = "numberVAR";
      let stringVarBlockTxt: string;
      let parsedBlock: FancyCommandParser;
      before(async () => {
        stringVarBlockTxt = `This is a {${varName}-5}`;
        parsedBlock = new FancyCommandParser(stringVarBlockTxt, contextDB);
        await parsedBlock.Ready; // Wait for the parser to finish before running tests
      });
      after(async () => {
        await contextDB.ref(`variables/${varName}`).remove();
      });
      it("Should return command with variable blocks replaced", async () => {
        const replacedCmd: string = await parsedBlock.Ready;
        expect(replacedCmd).is.equal("This is a -5");
      });
      it("Should have added database variable numeric entry", async () => {
        await parsedBlock.Ready;
        const variableVal: AcceptedVarTypes = (
          await contextDB.ref(`variables/${varName}`).get()
        ).val();
        expect(variableVal).to.be.a("number");
        expect(variableVal).is.equal(-5);
      });
      it("Should be able to decrement the number", async () => {
        await parsedBlock.Ready;
        const newParsedBlock: string = await new FancyCommandParser(
          `This is a {${varName}-2}`,
          contextDB
        ).Ready;
        expect(newParsedBlock).is.equal("This is a -7");
        const variableVal: AcceptedVarTypes = (
          await contextDB.ref(`variables/${varName}`).get()
        ).val();
        expect(variableVal).to.be.a("number");
        expect(variableVal).is.equal(-7);
      });
    });

    // **********************************
    // * TEST SET SUBTRACTION
    // **********************************
    describe("Set addition", async () => {
      let varName: string = "setVAR";
      let stringVarBlockTxt: string;
      let parsedBlock: FancyCommandParser;
      before(async () => {
        stringVarBlockTxt = `I like: {${varName}=(fruit,dogs,women,money,dogs)}`;
        parsedBlock = new FancyCommandParser(stringVarBlockTxt, contextDB);
        await parsedBlock.Ready; // Wait for the parser to finish before running tests
      });
      after(async () => {
        await contextDB.ref(`variables/${varName}`).remove();
      });
      it("Should be able to remove from the set", async () => {
        await parsedBlock.Ready;
        const newParsedBlock: string = await new FancyCommandParser(
          `I like: {${varName}-(money,fruit,dogs)}`,
          contextDB
        ).Ready;
        expect(newParsedBlock).is.equal("I like: women");
        const variableVal: AcceptedVarTypes = (
          await contextDB.ref(`variables/${varName}`).get()
        ).val();
        expect(variableVal).to.be.an("array");
        expect(variableVal).deep.equal([...new Set(["women"])]);
      });
    });

    // **********************************
    // * TEST ARRAY SUBTRACTION
    // **********************************
    describe("Array assignment", async () => {
      let varName: string = "arrayVAR";
      let stringVarBlockTxt: string;
      let parsedBlock: FancyCommandParser;
      before(async () => {
        stringVarBlockTxt = `I like: {${varName}=[fruit,dogs,women,money,dogs]}`;
        parsedBlock = new FancyCommandParser(stringVarBlockTxt, contextDB);
        await parsedBlock.Ready; // Wait for the parser to finish before running tests
      });
      after(async () => {
        await contextDB.ref(`variables/${varName}`).remove();
      });
      it("Should be able to remove from the array", async () => {
        await parsedBlock.Ready;
        const newParsedBlock: string = await new FancyCommandParser(
          `I like: {${varName}-[0,1,3,4]}`,
          contextDB
        ).Ready;
        expect(newParsedBlock).is.equal("I like: women");
        const variableVal: AcceptedVarTypes = (
          await contextDB.ref(`variables/${varName}`).get()
        ).val();
        expect(variableVal).to.be.an("array");
        expect(variableVal).deep.equal(["women"]);
      });
    });
  }); // End testing addition assignments {var-$something}

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

      await new FancyCommandParser(`{${varName}=null}`, contextDB).Ready;
      variableVal = (await contextDB.ref(`variables/${varName}`).get()).val();
      expect(variableVal).to.be.null;
    });

    it("Should delete a number", async () => {
      const varName = numberVar;
      let variableVal: AcceptedVarTypes = (
        await contextDB.ref(`variables/${varName}`).get()
      ).val();
      expect(variableVal).to.not.be.null;

      await new FancyCommandParser(`{${varName}=null}`, contextDB).Ready;
      variableVal = (await contextDB.ref(`variables/${varName}`).get()).val();
      expect(variableVal).to.be.null;
    });

    it("Should delete a set", async () => {
      const varName = setVar;
      let variableVal: AcceptedVarTypes = (
        await contextDB.ref(`variables/${varName}`).get()
      ).val();
      expect(variableVal).to.not.be.null;

      await new FancyCommandParser(`{${varName}=null}`, contextDB).Ready;
      variableVal = (await contextDB.ref(`variables/${varName}`).get()).val();
      expect(variableVal).to.be.null;
    });

    it("Should delete an array", async () => {
      const varName = arrayVar;
      let variableVal: AcceptedVarTypes = (
        await contextDB.ref(`variables/${varName}`).get()
      ).val();
      expect(variableVal).to.not.be.empty;

      await new FancyCommandParser(`{${varName}=null}`, contextDB).Ready;
      variableVal = (await contextDB.ref(`variables/${varName}`).get()).val();
      expect(variableVal).to.be.null;
    });
  });

  describe("Array reference", async () => {
    const stringVar = "stringVar";
    before(async () => {
      await contextDB.ref(`variables/${stringVar}`).set("Test");
    });
    after(async () => {
      await contextDB.ref(`variables/${stringVar}`).remove();
    });
    it("Should be able to reference an array", async () => {
      const val = await new FancyCommandParser(
        `Retrieving a variable: {${stringVar}}`,
        contextDB
      ).Ready;
      expect(val).is.a("string");
      expect(val).to.equal("Retrieving a variable: Test");
    });
  });
});

describe("Execute evaluations via $()", () => {
  let contextDB: AceBase = new AceBase("test_variables", {
    sponsor: true,
    logLevel: "error",
  });
  before(async () => {
    return contextDB.ready;
  });

  it("Should evaluate code and return result", async () => {
    const testCmdString = "$(var cba='abc'; `I know my ${cba}'s`)";
    const parsedBlock = new FancyCommandParser(testCmdString, contextDB);
    const replacedCmd: string = await parsedBlock.Ready; // Wait for the parser to finish before running tests

    expect(replacedCmd).to.equal("I know my abc's");
  });

  it("Should be able to evaluate using data from variables", async () => {
    const testCmdString = "One time I $(var action='{testFlew=flew}'; action)";
    const parsedBlock = new FancyCommandParser(testCmdString, contextDB);
    const replacedCmd: string = await parsedBlock.Ready; // Wait for the parser to finish before running tests

    expect(replacedCmd).to.equal("One time I flew");
  });

  it("Should be able to use arrays", async () => {
    const testCmdString =
      "This variable type is an array: $(var arr='{testFlewArr=[flew,ran,jumped]}'.split(','); Array.isArray(arr); )";
    const parsedBlock = new FancyCommandParser(testCmdString, contextDB);
    const replacedCmd: string = await parsedBlock.Ready; // Wait for the parser to finish before running tests

    expect(replacedCmd).to.equal("This variable type is an array: true");
  });
});

describe("FancyParser Middleware", () => {
  let contextDB: AceBase = new AceBase("test_variables", {
    sponsor: true,
    logLevel: "error",
  });
  before(async () => {
    return contextDB.ready;
  });
  describe("FancyParser Pre", () => {
    it("Should apply changes before parsing", async () => {
      const FCP: FancyCommandParser = new FancyCommandParser(null, contextDB);
      const testMiddleware = (context: { val: string }, next: Next): void => {
        context.val = context.val.replace("brownies", "salad");
      };
      FCP.preParse(testMiddleware);
      const res: string = await FCP.parse("I really enjoy brownies");
      expect(res).to.equal("I really enjoy salad");
    });
  });
});

describe("Extremely basic usage", () => {
  let contextDB: AceBase = new AceBase("test_variables", {
    sponsor: true,
    logLevel: "error",
  });
  before(async () => {
    return contextDB.ready;
  });

  it("Should be able to echo simple string", async () => {
    const testCmdString = "This is a test";
    const parsedBlock = new FancyCommandParser(testCmdString, contextDB);
    const replacedCmd: string = await parsedBlock.Ready; // Wait for the parser to finish before running tests

    expect(replacedCmd).to.equal(testCmdString);
  });

  it("Should be able to make variable replacements in the middle of the command", async () => {
    const testCmdString =
      "This is a {testType=secret} test whcih has run {testCount=1} times";
    const parsedBlock = new FancyCommandParser(testCmdString, contextDB);
    const replacedCmd: string = await parsedBlock.Ready; // Wait for the parser to finish before running tests

    expect(replacedCmd).to.equal("This is a secret test whcih has run 1 times");
  });

  it("Should be able to make variable replacements with space-separated varnames", async () => {
    const testCmdString = "This is a {test Type=secret} message";
    const parsedBlock = new FancyCommandParser(testCmdString, contextDB);
    const replacedCmd: string = await parsedBlock.Ready; // Wait for the parser to finish before running tests

    expect(replacedCmd).to.equal("This is a secret message");
  });
});

describe("Advanced Usage", () => {
  let contextDB: AceBase = new AceBase("test_variables", {
    sponsor: true,
    logLevel: "error",
  });
  before(async () => {
    return contextDB.ready;
  });

  it("Should ignore $ prefixed brackets", async () => {
    const testCmdString = "This is a ${someVariable} {prefixBracketTest=test}";
    const parsedBlock = new FancyCommandParser(testCmdString, contextDB);
    const replacedCmd: string = await parsedBlock.Ready; // Wait for the parser to finish before running tests

    expect(replacedCmd).to.equal("This is a ${someVariable} test");
  });
});
