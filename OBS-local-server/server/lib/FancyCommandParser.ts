/** @format */

import { AceBase, DataSnapshot } from "acebase";

/**
* Simple typing to explain the expected structure of a next() function
*
*/
type Next = () => void;
/**
* Simple typing to explain the expected structure of a FancyMiddleware function or lambda
*
*/
type FancyMiddleware = (context: VarBlock, next: Next) => void;

/**
* Invoker function for the VarBlockMiddleware which accepts any callable following the FancyMiddleware type
*
*
* @param context - The VarBlock in its most up-to-date state
* @param middlewares - An array of middlewares to run
* @returns void
*
*/
function invokeFancyMiddlewares(context: VarBlock, middlewares: FancyMiddleware[]): void {
  if (!middlewares.length) return;
  const mw = middlewares[0];
  return mw(context, () => {
      invokeFancyMiddlewares(context, middlewares.slice(1));
  });
}

/**
* Class used to add and then run middlewars for FancyCommandParser
*
*
* @class
*/
class VarBlockMiddleware {
  private middlewares: FancyMiddleware[];
  constructor(){
    this.middlewares = new Array<FancyMiddleware>;
  }
  
  /**
  * Add a middleware which will be run when dispatch is called
  *
  * @remarks
  * Usage is like
  * const vbm = new VarBlockMiddleware();
  * vbm.use((context,next)=>{
  *   // Do stuff
  *   return next();
  * });
  * 
  * FCP: FancyCommandParser = new FancyCommandParser(myCommdand,aceDB,vbm);
  * FCP.Ready.then((parsedCMD)=>{
  *   // Do stuff with the parsed command
  * });
  * 
  * @param middleware - One or more middlewares
  * @returns void
  *
  */
  public use(...middleware: FancyMiddleware[]): void {
    this.middlewares.push(...middleware);
  };

  /**
  * Runs the added middlewares in order
  *
  * @remarks
  * additional details
  *
  * @param context - The starting variable block to run in-context
  * @returns void
  *
  */
  public dispatch(context: VarBlock): void {
    if(this.middlewares.length > 0)
    return invokeFancyMiddlewares(context, this.middlewares);
  }

}


export class FancyCommandParser {
  /**
  * Ready is a promise which will evaluate to the new string after all variable blocks have been processed
  */
  public Ready: Promise<string>;
  /**
  * cmdDB is the AceBase DB which all variables will be saved/retried to and from.
  */
  private cmdDB: AceBase;
  /**
  * middlewars is a list of middlewars to run anytime parse() is run
  */
  private middlewares: VarBlockMiddleware;
  /**
  * This is the command parser which takes a command string and extracts data from the command text and converts the variable blocks into the variable value
  *
  *
  * @param cmd - The command string to be converted
  * @param varRef - The acebase database reference where variables will be stored and retrieved
  * @param middlewares - An optional middleware which can be used to alter the parsed variable block BEFORE database lookups occur (current use-case is to replace twitch variables ahead of time)
  * @returns this: FancyCommandParser
  *
  * @class
  */
  constructor(cmd: string, varRef: AceBase, middlewares?: VarBlockMiddleware|undefined) {
    this.cmdDB = varRef;
    this.middlewares = middlewares || new VarBlockMiddleware();
    this.Ready = new Promise((res, rej) => {
      return this.parse(cmd);
    });
  }

  /**
   * Root method which begins the parsing process of a command
   *
   * @remarks
   * Currently parsing doesn't work dynamically (meaning one variable can't impact another).
   * If a good use-case is found I will probably make this parse with the deepend children first and work backwards.
   * I couldn't think of a reason to do that though.
   *
   * @param cmd - The command to parse through
   * @returns returned value explanation
   *
   */
  private async parse(cmd: string): Promise<string> {
    const toParse: RegExp = new RegExp("({.+?})", "igm");
    const toRepl: IterableIterator<RegExpMatchArray> | null =
      cmd.matchAll(toParse);
    // Run through all replacements
    const repReady = [];
    for (const rawMatch of toRepl) {
      const varBlock: VarBlock = new VarBlock(rawMatch[0]);
      this.middlewares.dispatch(varBlock); // Do whatever extra stuff we need to do BEFORE making variable replacements from the DB
      await this.getVarFromBlock(varBlock);
      
      repReady.unshift({
        start: rawMatch.index || 0,
        end: rawMatch.index || 0 + rawMatch[0].length,
        block: varBlock,
      });
    }

    let ncmd = cmd;
    for (const repItm of repReady) {
      ncmd =
        ncmd.substring(0, Math.max(repItm.start, 0)) +
        repItm.block.final +
        ncmd.substring(repItm.end, repItm.end);
    }
    return ncmd;
  }

  /**
   * Given a variable block, return the appropriate DB value item
   *
   *
   * @param varBlock - The variable block which is going to be replaced
   * @returns The value of the variable after any operations run
   *
   */
  private async getVarFromBlock(varBlock: VarBlock): Promise<void> {
    const dataSnapshot: DataSnapshot = await this.cmdDB.ref(`variables/${varBlock.name}`).get();
    const val = dataSnapshot.val();
    if(null == val) { 
      // TODO; Maybe have a debug log for when a variable isn't found and needs an initial set?
      await this.handleNewVar(varBlock, dataSnapshot);
      return;
    }
    const valDataType: AcceptedVarTypes = getAcceptedType(dataSnapshot.val());
    if(valDataType !== varBlock.datatype){
      // TODO: Add some logging to show when datatypes don't match and we fail
      this.handleEvalFail(varBlock, "Failed to parse datatype", Error(`Unsupported datatyepe detected: ${valDataType}`));
      return;
    }

    // If the datatype is numeric, then parse as a float
    if (varBlock.datatype === VarBlockType.NUMBER) {        
      await this.handleNumericVar(varBlock, dataSnapshot);
      return;
    }

    // If the datatype is an array, then parse as an Array
    else if(varBlock.datatype === VarBlockType.ARRAY)
    {
      await this.handleArrayVar(varBlock, dataSnapshot);
      return;
    }

    // If the datatype is a string, then parse as a string
    else if(varBlock.datatype === VarBlockType.STRING)
    {
      await this.handleStringVar(varBlock, dataSnapshot);
      return;
    }

    // If the datatype is a set, then parse as a Set
    else if(varBlock.datatype === VarBlockType.SET)
    {
      await this.handleSetVar(varBlock, dataSnapshot);
      return;
    }
  }


  /**
  * Given a variable, perform evaluation and DB read/writes on AceDB for specific varBlock and set the "final" value of the varBlcok to the `result` property
  *
  *
  * @param varBlock - The variable block being passed to update the DB
  * @param dataSnap - The AceBase DB datasnap retrieved for the requested variable
  * @returns void
  *
  */
  private async handleNewVar(varBlock: VarBlock, dataSnap: DataSnapshot): Promise<void> {
    await dataSnap.ref.set(varBlock.value);
  }
  /**
  * Given a numerically typed variable, perform evaluation and DB read/writes on AceDB for specific varBlock and set the "final" value of the varBlcok to the `result` property
  *
  *
  * @param varBlock - The variable block being passed to update the DB
  * @param dataSnap - The AceBase DB datasnap retrieved for the requested variable
  * @returns void
  *
  */
  private async handleNumericVar(varBlock: VarBlock, dataSnap: DataSnapshot): Promise<void> {
    const curVal: number = dataSnap.val();
    // If shorthand increment/decriment operators are used, convert them to normal ones with 1 as the value
    if(['--','++'].includes(varBlock.opr)){
      varBlock.opr = varBlock.opr[0];
      varBlock.value = 1;
    }
    try {
      const res = eval(`${curVal.toString}${varBlock.opr}${varBlock.value}`);
      await dataSnap.ref.set(Number.parseFloat(res));
      varBlock.final = res;
    }
    catch (e) {
      this.handleEvalFail(varBlock, `Failed to evaluate numeric operation (${curVal.toString}${varBlock.opr}${varBlock.value}) failed`, e);
    }
  }

  /**
  * Given a Array typed variable, perform evaluation and DB read/writes on AceDB for specific varBlock and set the "final" value of the varBlcok to the `result` property
  *
  *
  * @param varBlock - The variable block being passed to update the DB
  * @param dataSnap - The AceBase DB datasnap retrieved for the requested variable
  * @returns void
  *
  */
  private async handleArrayVar(varBlock: VarBlock, dataSnap: DataSnapshot): Promise<void> {    
    let curVal: Array<string|number> = dataSnap.val();
    try {
      const varArry: Array<string|number> = varBlock.value as Array<string|number>;
      switch(varBlock.opr){
        case '+': 
          curVal.push(...varArry);
          dataSnap.ref.set(curVal);          
        break;

        case '-':
          for (const ix in varArry)
          {
            curVal.splice(Number.parseInt(ix));
          }
          await dataSnap.ref.set(curVal);
        break;

        case '=':
          curVal = varArry;
        break;

        default:
          throw new Error("Operator not supported");
      }
      varBlock.final = curVal;
    }
    catch (e: unknown) {
      this.handleEvalFail(varBlock, `Failed to evaluate array operation (${curVal.toString}${varBlock.opr}${varBlock.value}) failed`, e);
    }
  }

  /**
  * Given a Set typed variable, perform evaluation and DB read/writes on AceDB for specific varBlock and set the "final" value of the varBlcok to the `result` property
  *
  *
  * @param varBlock - The variable block being passed to update the DB
  * @param dataSnap - The AceBase DB datasnap retrieved for the requested variable
  * @returns void
  *
  */
  private async handleSetVar(varBlock: VarBlock, dataSnap: DataSnapshot): Promise<void> {
    let curVal: Set<string|number> = dataSnap.val();
    try {
      const varSet: Set<string|number> = varBlock.value as Set<string|number>;
      switch(varBlock.opr){
        case '+':
          for(const itm in varSet){
            curVal.add(itm);
          }          
          dataSnap.ref.set(curVal);          
        break;

        case '-':
          for(const itm in varSet){
            curVal.delete(itm);
          } 
          await dataSnap.ref.set(curVal);
        break;

        case '=':
          curVal = varSet;
        break;

        default:
          throw new Error("Operator not supported");
      }
      varBlock.final = curVal;
    }
    catch (e: unknown) {
      this.handleEvalFail(varBlock, `Failed to evaluate set operation (something??) failed`, e);
    }
  }

  /**
  * Given a string typed variable, perform evaluation and DB read/writes on AceDB for specific varBlock and set the "final" value of the varBlcok to the `result` property
  *
  *
  * @param varBlock - The variable block being passed to update the DB
  * @param dataSnap - The AceBase DB datasnap retrieved for the requested variable
  * @returns void
  *
  */
  private async handleStringVar(varBlock: VarBlock, dataSnap: DataSnapshot): Promise<void> {
    let curVal: string = dataSnap.val();
    switch(varBlock.opr){
      case '+':         
        curVal = curVal + varBlock.value.toString();
      break;

      case '=':
        curVal = varBlock.value.toString();
      break;

      default:
        throw new Error("Operator not supported");
    }
    await dataSnap.ref.set(curVal);
  }

  /**
  * Given a numerically typed variable, perform evaluation and DB read/writes on AceDB for specific varBlock and set the "final" value of the varBlcok to the `result` property
  *
  *
  * @param varBlock - The variable block being passed to update the DB
  * @param dataSnap - The AceBase DB datasnap retrieved for the requested variable
  * @returns void
  *
  */
  private handleEvalFail(varBlock: VarBlock, msg: string, e?: unknown)
  {
    varBlock.doFallback();
    // TODO: Add some logging to say when things failed and fell back
  }

}

class VarBlock {
  /**
   * name is the variable name and how it will be saved to the DB
   */
  public name: string;
  /**
   * opr is the kind of operation to perform
   */
  public opr: string;
  /**
   * value is the amount to increment by, or the value to set
   */
  public value: AcceptedVarTypes = 1;
  /**
   * fallback is the default value to set the variable as in the case of an error
   */
  public fallback: AcceptedVarTypes;
  /**
   * datatype is the datatype detected from the block text expression
   */
  public datatype: VarBlockType = VarBlockType.STRING;
  /**
   * origin is the original variable block text
   */
  public origin: string;

  /**
  * final is the end-state of the text which will be returned back to the client
  */
  public final: AcceptedVarTypes = "";

  constructor(varBlock: string) {
    const reBreakBlock: RegExp = new RegExp(
      /\{(\w+)([[\+|-]=|=|[\+]{1,2}|[\-]{1,2}|\*|\/])(\w+)(\|(.*))*}|{(\w+)([[\+]{1,2}|[\-]{1,2}])\}/,
      "igm"
    );
    const breakout = [...varBlock.matchAll(reBreakBlock)];
    this.origin = varBlock;
    this.name = breakout[0][1] ? breakout[0][1] : breakout[0][6];
    this.opr = breakout[0][2] ? breakout[0][2] : breakout[0][7];
    this.setValueAndType(breakout[0][3] ? breakout[0][3] : "1");
    this.fallback = breakout[0][5] ? breakout[0][5] : 1;
  }

  public doFallback(): void {
    this.final = this.fallback.toString();
  }

  private setValueAndType(value: string): void {
    // Parse array
    if (this.value.toString()[0] == "[" && this.value.toString()[-1] == "]") {
      this.value = value.replace(/\[|\]/g, "").split(",");
      this.datatype = VarBlockType.ARRAY;
      return;
    }
    // Parse set
    if (this.value.toString()[0] == "(" && this.value.toString()[-1] == ")") {
      const lst = value.replace(/\(|\)/g, "").split(",");
      const nSet: Set<string | number> = new Set(lst);
      this.value = nSet;
      this.datatype = VarBlockType.SET;
      return;
    }
    // Parse number
    if (Number.isInteger(this.value)) {
      this.value = Number.parseFloat(this.value.toString());
      this.datatype = VarBlockType.NUMBER;
      return;
    }
    // If nothing else matched up, then it's a string
    this.value = this.value.toString();
    this.datatype = VarBlockType.STRING;
  }
}

export function getAcceptedType(value: string|AcceptedVarTypes): VarBlockType {
  if(null === value){
    throw Error(`Cannot parse NULL value type. Value provided ${value}`);
  }
  const valType = typeof(value);
  if(valType != "string"){
    if (value instanceof Array)
    { return VarBlockType.ARRAY; }
    else if (value instanceof Set){
      return VarBlockType.SET;
    }
  }
  
  // Parse array
  if (value.toString()[0] == "[" && value.toString()[value.toString().length - 1] == "]") {
    return VarBlockType.ARRAY;
  }

  // Parse set
  if (value.toString()[0] == "(" && value.toString()[value.toString().length - 1] == ")") {
    return VarBlockType.SET;
  }

  // Parse number
  if (Number.isInteger(value)) {
    return VarBlockType.NUMBER;
  }

  return VarBlockType.STRING;
}

export type AcceptedVarTypes =
  | string
  | number
  | Set<string | number>
  | string[]
  | number[]
  | (string | number)[];

export enum VarBlockType {
  NUMBER,
  STRING,
  ARRAY,
  SET,
}
