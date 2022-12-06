/** @format */

export enum UserTypes {
  OWNER,
  MODERATOR,
  VIP,
  REGULAR,
  SUBSCRIBER,
  FOLLOWER,
  EVERYONE,
}
export type FancyCommand = {
  name: string;
  command: string;
  allowed: UserTypes;
};
