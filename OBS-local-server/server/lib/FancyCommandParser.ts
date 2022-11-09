/** @format */

import { AceBase, DataSnapshot } from "acebase";
import { pino } from "pino";

const logger = pino({"level": "debug"},pino.destination({"mkdir": true, "writable": true, "dest": `${__dirname}/../logs/FancyCommandParser.log`}));

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
  logger.debug(`Middleware evoke started with ${middlewares.length} to evaluate`);
  if (!middlewares.length) {
    logger.debug(`No middlewares provides, skipping evaluations`);
    return;
  }
  const mw = middlewares[0];
  logger.debug({"definition": mw.toString(), "name": mw.name},`Middleware exectuion starting...`);
  return mw(context, () => {
      logger.debug({"definition": mw.toString(), "name": mw.name},`Middleware exectuion completed`);
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
    this.Ready = this.parse(cmd);
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
    logger.debug(`Parsing ${cmd}`);
    const toParse: RegExp = new RegExp("({.+?})", "igm");
    const toRepl: IterableIterator<RegExpMatchArray> | null =
      cmd.matchAll(toParse);
    // Run through all replacements
    logger.debug(`Start parsing varblocks`);
    const repReady = [];
    for (const rawMatch of toRepl) {
      logger.debug({"block": rawMatch},`Parse VarBlock`);
      const varBlock: VarBlock = new VarBlock(rawMatch[0]);
      logger.debug({"block": varBlock},`Parsed VarBlock`);
      this.middlewares.dispatch(varBlock); // Do whatever extra stuff we need to do BEFORE making variable replacements from the DB
      logger.debug({"varName": varBlock.name},`Get VarBlock execution result from DB`);
      await this.getVarFromBlock(varBlock);    
      
      repReady.unshift({
        start: rawMatch.index || 0,
        end: rawMatch.index || 0 + rawMatch[0].length,
        block: varBlock,
      });
      logger.debug({"parsed": repReady},`VarBlock execution results resolved, block parsing complete`);
    }
    let ncmd = cmd;
    logger.debug(`Replacing var block strings with parsed results`);
    for (const repItm of repReady) {      
      ncmd =
        ncmd.substring(0, Math.max(repItm.start, 0)) +
        repItm.block.final +
        ncmd.substring(repItm.end, repItm.end);
      logger.debug(`Processed ${cmd} -> ${ncmd}`);
    }
    logger.debug(`Parse complete`);
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
    logger.debug({"varName": varBlock.name},`Starting variable DB lookup and replacement`);
    const dataSnapshot: DataSnapshot = await this.cmdDB.ref(`variables/${varBlock.name}`).get();
    const val = dataSnapshot.val();
    logger.debug({"dbVal": val},`Variable retrieved from DB (or nothing)`);

    // If the variable doesn't exist yet, OR the operator is a simple equals, then set the variable without additional checks
    if(null === val || varBlock.opr === '=') { 
      logger.debug({"dbVal": val},`Variable being set to value without mutation`);
      await this.handleNewVar(varBlock, dataSnapshot);
      return;
    }

    const valDataType: AcceptedVarTypes = getAcceptedType(dataSnapshot.val());
    if(valDataType !== varBlock.datatype){
      // TODO: Add some logging to show when datatypes don't match and we fail
      logger.debug({"dbVal": val, "varBlockType": VarBlockType[varBlock.datatype], "dbVarType": VarBlockType[valDataType]},`DB variable datatype doesn't match varBlock datatype`);
      this.handleEvalFail(varBlock, "Failed to parse datatype", Error(`Incompatable datatyepe detected: ${valDataType}, expected ${varBlock.datatype}`));
      return;
    }

    // If the datatype is numeric, then parse as a float
    if (varBlock.datatype === VarBlockType.NUMBER) {
      logger.debug({"varName": varBlock.name},`Parsing variable as a numeric`);
      await this.handleNumericVar(varBlock, dataSnapshot);
      return;
    }

    // If the datatype is an array, then parse as an Array
    else if(varBlock.datatype === VarBlockType.ARRAY)
    {
      logger.debug({"varName": varBlock.name},`Parsing variable as a numeric`);
      await this.handleArrayVar(varBlock, dataSnapshot);
      return;
    }

    // If the datatype is a string, then parse as a string
    else if(varBlock.datatype === VarBlockType.STRING)
    {
      logger.debug({"varName": varBlock.name},`Parsing variable as a string`);
      await this.handleStringVar(varBlock, dataSnapshot);
      return;
    }

    // If the datatype is a set, then parse as a Set
    else if(varBlock.datatype === VarBlockType.SET)
    {
      logger.debug({"varName": varBlock.name},`Parsing variable as a set`);
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
    varBlock.final = varBlock.value;
    logger.debug({"varName": varBlock.name},`Handling as ${'new' ? varBlock.opr != '=': 'set'} variable`);    
    await dataSnap.ref.set(varBlock.final);
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
    logger.debug({"varName": varBlock.name},`Handling as numeric variable`);
    const curVal: number = dataSnap.val();
    // If shorthand increment/decriment operators are used, convert them to normal ones with 1 as the value
    if(['--','++'].includes(varBlock.opr)){
      logger.debug({"varName": varBlock.name},`Shorthand operator used, converting block options for clean evaluation`);
      varBlock.opr = varBlock.opr[0];
      varBlock.value = 1;
      logger.debug({"varName": varBlock.name, "varBlock": varBlock},`Operator conversion complete`);
    }
    try {      
      const oprToEval = `${curVal.toString}${varBlock.opr}${varBlock.value}`;
      logger.debug({"varName": varBlock.name},`Evaluating numeric operation`);
      const res = eval(oprToEval);
      logger.debug({"varName": varBlock.name, "result": res},`Saving result to DB`);
      await dataSnap.ref.set(Number.parseFloat(res));
      varBlock.final = res;
      logger.debug({"varName": varBlock.name, "varBlock": varBlock},`Result saved to DB and set varBlock final result`);
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
    logger.debug({"varName": varBlock.name},`Handling as array variable`);
    let curVal: Array<string|number> = dataSnap.val();
    try {
      const varArry: Array<string|number> = varBlock.value as Array<string|number>;
      switch(varBlock.opr){
        case '+': 
          logger.debug({"varName": varBlock.name, "dbArray": curVal},`Handling array addition`);
          curVal.push(...varArry);          
          dataSnap.ref.set(curVal);          
          logger.debug({"varName": varBlock.name, "dbArray": curVal},`Handled array addition`);
        break;

        case '-':
          logger.debug({"varName": varBlock.name, "dbArray": curVal},`Handling array subtraction`);
          for (const ix in varArry)
          {            
            curVal.splice(Number.parseInt(ix));
          }
          await dataSnap.ref.set(curVal);
          logger.debug({"varName": varBlock.name, "dbArray": curVal},`Handled array addition`);
        break;

        case '=':
          logger.debug({"varName": varBlock.name, "dbArray": curVal},`Assigning array value`);
          curVal = varArry;
          await dataSnap.ref.set(curVal);
          logger.debug({"varName": varBlock.name, "dbArray": curVal},`Assigned array value`);
        break;

        default:
          throw new Error("Operator not supported");
      }      
      varBlock.final = curVal;
      logger.debug({"varName": varBlock.name, "varBlock": varBlock},`Array operation complete`);
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
    logger.debug({"varName": varBlock.name},`Handling as Set variable`);
    let curVal: Set<string|number> = dataSnap.val();
    try {
      const varSet: Set<string|number> = varBlock.value as Set<string|number>;
      switch(varBlock.opr){
        case '+':
          logger.debug({"varName": varBlock.name, "dbArray": curVal},`Handling Set addition`);
          for(const itm in varSet){
            curVal.add(itm);
          }          
          dataSnap.ref.set(curVal);
          logger.debug({"varName": varBlock.name, "dbArray": curVal},`Handled Set addition`);
        break;

        case '-':
          logger.debug({"varName": varBlock.name, "dbArray": curVal},`Handling Set subtraction`);
          for(const itm in varSet){
            curVal.delete(itm);
          } 
          await dataSnap.ref.set(curVal);
          logger.debug({"varName": varBlock.name, "dbArray": curVal},`Handled Set subtraction`);
        break;

        case '=':
          logger.debug({"varName": varBlock.name, "dbArray": curVal},`Assigning Set value`);
          curVal = varSet;
          await dataSnap.ref.set(curVal);
          logger.debug({"varName": varBlock.name, "dbArray": curVal},`Assigned Set value`);
        break;

        default:
          throw new Error("Operator not supported");
      }
      varBlock.final = curVal;
      logger.debug({"varName": varBlock.name, "varBlock": varBlock},`Set operation complete`);
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
    logger.debug({"varName": varBlock.name},`Handling as string variable`);
    let curVal: string = dataSnap.val();
    switch(varBlock.opr){
      case '+':
        logger.debug({"varName": varBlock.name, "dbArray": curVal},`Handling string addition`);
        curVal = curVal + varBlock.value.toString();
        logger.debug({"varName": varBlock.name, "dbArray": curVal},`Handled string addition`);
      break;

      case '=':
        logger.debug({"varName": varBlock.name, "dbArray": curVal},`Handling string subtraction`);
        curVal = varBlock.value.toString();
        logger.debug({"varName": varBlock.name, "dbArray": curVal},`Handled string subtraction`);
      break;

      default:
        throw new Error("Operator not supported");
    }
    await dataSnap.ref.set(curVal);
    varBlock.final = curVal;
    logger.debug({"varName": varBlock.name, "varBlock": varBlock},`String operation complete`);    
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
    logger.warn({"varName": varBlock.name, "varBlock": varBlock, "stacktrace": e}, msg);
    varBlock.doFallback();
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
  public fallback: AcceptedVarTypes | null;

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
    logger.debug({"cmd": varBlock},`Parse varBlock string into VarBlock object`);
    const reBreakBlock: RegExp = new RegExp(
      /\{(\w+)([[\+|-]=|=|[\+]{1,2}|[\-]{1,2}|\*|\/])(\w+)(\|(.*))*}|{(\w+)([[\+]{1,2}|[\-]{1,2}])\}/,
      "igm"
    );
    const breakout = [...varBlock.matchAll(reBreakBlock)];
    logger.debug({"cmd": varBlock,"matches": breakout},`Broke out matches with regex`);
    this.origin = varBlock;
    this.name = breakout[0][1] || breakout[0][6];
    this.opr = breakout[0][2] || breakout[0][7];        
    // calculate type-correct value (and type) of `value`
    logger.debug(`calculate type-correct value (and type) of value`);
    const [_val,_type] = this.setValueAndType(breakout[0][3] || "1");
      this.value = _val as AcceptedVarTypes;
      this.datatype = _type as VarBlockType;
    // calculate type-correct value (and type) of `fallback`
    logger.debug(`calculate type-correct value (and type) of fallback`);
    const [_fbval,_fbtype] = this.setValueAndType(breakout[0][5] || "1");
      this.fallback = _fbval;

      logger.info({"cmd": varBlock, "varBlock": this},`String parsed into VarBlock`);
    console.log("varBlock parsed", this);
  }

  public doFallback(): void {
    logger.debug({"cmd": this.name},`Setting final value to fallbacks`);
    if(null === this.fallback){
      this.final = this.fallbackDefault();
      logger.debug({"cmd": this.name, "varBlock": this},`Fallbacks null, using defaults instead`);
      return;
    }   
    this.final = this.fallback.toString();
    logger.debug({"cmd": this.name, "varBlock": this},`Final set to fallback`);
  }

  private fallbackDefault()
  {
    if(this.datatype === VarBlockType.ARRAY)
    {
      logger.debug({"fallback": []},`Default array fallback found`);
      return [] as Array<string|number>;
    }
    if(this.datatype === VarBlockType.SET)
    {
      logger.debug({"fallback": new Set()},`Default Set fallback found`);
      return new Set() as Set<string|number>;
    }
    if(this.datatype === VarBlockType.NUMBER) 
    {
      logger.debug({"fallback": 0},`Default number fallback found`);
      return 0;
    }
    logger.debug({"fallback": ""},`Default string fallback found`);
    return "";
    
  }

  private setValueAndType(value: string): Array<AcceptedVarTypes|VarBlockType> {
    // Parse array
    logger.debug({"varVal": value},`Detect VarBlock value type`);
    if (value.toString()[0] == "[" && value.toString()[-1] == "]") {
      const arr: Array<string|number> = value.replace(/\[|\]/g, "").split(",");
      logger.debug({"varVal": value},`Detected array`);
      return [arr, VarBlockType.ARRAY]
    }
    // Parse set
    if (value.toString()[0] == "(" && value.toString()[-1] == ")") {
      const lst = value.replace(/\(|\)/g, "").split(",");
      const nSet: Set<string | number> = new Set(lst);
      logger.debug({"varVal": value},`Detected Set`);
      return [nSet, VarBlockType.SET];
    }
    // Parse number
    if (value.toString().match(/[0-9\.]+/)) {
      logger.debug({"varVal": value},`Detected number`);
      return [Number.parseFloat(value.toString()), VarBlockType.NUMBER];
    }
    // If nothing else matched up, then it's a string
    logger.debug({"varVal": value},`Detected string`);
    return [value.toString(), VarBlockType.STRING];
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
  if (value.toString().match(/[0-9\.]+/)) {
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