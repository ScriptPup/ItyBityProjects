# Command Components

<hr />

## Command Name

The name of the command is what the server will "listen" for, thios

## May Call

The access level a twitch user is required to have in order to trigger the command.

> Note: Every LOWER option, includes all of the HIGHER ones. So the owner can ALWAYS execute a command.

## Command to Exec

The command which will be executed upon the name being called by a twitch user with the prerequisite (or higher) access level.

Allong with supporting normal text replies, commands support several avanced functions.
- Variables (Server)
- Substitutions
- Expressions

You can learn more about each from their specific tabs! Just for fun though, there are some example commands below that will give an idea of some potentially neat uses!

<details> 

<summary>Example Commands</summary>

__Command__: `!hearmeout`

__Description__: Store previous "heard me out" statements, and randomly replay one of them when the command is used again.

__Used Like__: `!hearmeout People assume streamers are paid way more than they are`

__Results in__: `We've hear you out about "People assume streamers are paid way more than they are".` and IF that twitch user has used !hearmeout before, it will continue ` But remember when you said "some other thing you said before"`

```
We've heard you out about "@message". $(
let msgs = "{@user_heard+(@message)}".split(",");
let fmsgs = msgs.filter(x=>x !== "@message");
msgs.length > 0 ? `But remember when you said "${msgs.sort(() =>0.5-Math.random())[0]}"?` : "";;
)$
```

----

__Command__: `!swearjar`

__Description__: Store a global count of how many times the swear-jar has been paid to, and how many times it's been called on a particular person.

__Used Like__: `!swearjar some_twitch_user`

__Results in__: `some_twitch_user has had to pay the swear jar 1 time, the swear jar has been paid 1 times`

```
@1 has had to pay the swear jar {swearjar_users/@1++} time, the swear jar has been paid {swearjar++} times.
```

----

__Command__: `!reminder`

__Description__: Stores a reminder for the particular user which will be displayed next time they request a reminder.

__Used Like__: `!reminder I think other_twitch_user is pretty neat`

__Results in__: `Last reminder you set was "I'm pretty tired today", we'll remind you about "I think other_twitch_user is pretty neat" next time.`

```
Last reminder you set was "{@user_reminder}", we'll remind you about "{@user_reminder=@message}" next time.
```

Of course these are all just examples, but they provide some ideas for how flexible the command framework is!

</details>

<details> 
<summary>Disclaimers</summary>


FIRST and foremost - This software is provided as-is without any warranty, guarantee, or promised support. If you do find a problem, please [raise an issue](https://github.com/ScriptPup/TwitchHelpers/issues); but I do NOT promise I'll ever have a chance to resolve it. Same thing with feature requests, put in an issue and tag as a feature request; i may or may not get to it.

SECOND - This is an open-source project. This means that it's intentionally left for others to use and do what they want with it. If you want to enhance the project, please feel free to make the enhancements and make a PR (pull request) on github. The software is provided under the `GNU GENERAL PUBLIC LICENSE`. If you aren't sure what that means, checkout the `LICENSE` file at the root directory of this project.

THIRD - While I do my best to take security into consideration, there ARE some areas for potential abuse. While as far as I've been able to determine these are relativley small - and I won't be listing them here so no one gets any additional ideas 😉 - I am warning you now that, as with any user-interfacable product, there is always a risk of some particularly mallicious and motivated agent figuring out how to use the features provided outside of its intended purposes. If this happens I AM very sorry and would request you [raise an issue](https://github.com/ScriptPup/TwitchHelpers/issues), but I am in no way responsible or obliged to act upon the report in any particular way.

</details>