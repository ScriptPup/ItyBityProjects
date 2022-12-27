/** @format */

export enum UserTypes {
  OWNER,
  MODERATOR,
  VIP,
  SUBSCRIBER,
  REGULAR,
  FOLLOWER,
  EVERYONE,
}
export type FancyCommand = {
  name: string;
  command: string;
  usableBy: UserTypes;
};

/**
 * Type used when SENDING a new command to server
 *
 * @remarks
 * It was easier to implement like this than to go refactor everything to expect the same structure on client and server side...
 *
 */
export type ClientFancyCommand = {
  name: string;
  command: string;
  usableBy: string;
};
