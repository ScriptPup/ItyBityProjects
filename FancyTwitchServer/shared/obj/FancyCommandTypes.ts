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

export type FancyRedemption = {
  name: string;
  prompt: string;
  command: string;
  cost: number;
  max_per_stream?: number;
  max_per_user_per_stream?: number;
  global_cooldown?: number;
  user_input?: boolean;
  enabled?: boolean;
  color?: string;
};

export interface FancyClientItemBase {
  name: string;
}

export const getUserType = (userType: string): UserTypes => {
  let userTypeParsed: string = userType;
  if (Number.isInteger(userType)) {
    userTypeParsed = UserTypes[Number.parseInt(userType)];
  }
  switch (userTypeParsed) {
    case "owner":
      return UserTypes.OWNER;
    case "moderator":
      return UserTypes.MODERATOR;
    case "vip":
      return UserTypes.VIP;
    case "regular":
      return UserTypes.REGULAR;
    case "subscriber":
      return UserTypes.SUBSCRIBER;
    case "follower":
      return UserTypes.FOLLOWER;
    case "everyone":
      return UserTypes.EVERYONE;
    default:
      return UserTypes.EVERYONE;
  }
};
