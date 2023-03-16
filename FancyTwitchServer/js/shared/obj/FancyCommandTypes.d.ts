/** @format */
export declare enum UserTypes {
    OWNER = 0,
    MODERATOR = 1,
    VIP = 2,
    SUBSCRIBER = 3,
    REGULAR = 4,
    FOLLOWER = 5,
    EVERYONE = 6
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
    linked?: boolean;
    color?: string;
};
export interface FancyClientItemBase {
    name: string;
    usableBy?: UserTypes | string;
}
export declare const getUserType: (userType: string) => UserTypes;
