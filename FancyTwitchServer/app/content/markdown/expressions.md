# Expressions

<hr />

Expressions provide the admin a way to inject fancy logic into their commands. This is the feature which brings the `FancyTwitchHandler` from "meh" to "okay"! 

There are TWO kinds of expressions provided, but they BOTH do the same thing, just at different times during the response workflow. Expressions allow the admin to run a javascript expression within an isolated context. These expressions do NOT run in any web-browser, they run on the server.

## Pre-Variable Expressions

These expressions run BEFORE variable replacement from the server takes place. This means it can be used to create conditional logic to change what server variables are used. For example, if you want to check and see if a message is provided when a user calls the `!reminder` command and only READ the variable without REPLACING it, but if there IS a message provided, then store it, you can!

Enhanced `!reminder`
```
^(
    (()=>{
        if("@message".length > 0){
            return `Last reminder you set was "{@user_reminder}", we'll remind you about "{@user_reminder=@message}" next time.`;
        } else {
            return `Last reminder you set was "{@user_reminder}".`
        }
    })();
)^
```

Because @message and @user_reminder will be replaced BEFORE this code exists, it provides you the opportunity to use the Substitutions within your conditions.

## Post-Variable Expressions

These expressions run AFTER variable replacement from the server takes place. This allows you to take the results from the server and do something with them. An example of this is the `!hearmeout` command example.

```
We've heard you out about "@message". $(
let msgs = "{@user_heard+(@message)}".split(",");
let fmsgs = msgs.filter(x=>x !== "@message");
msgs.length > 0 ? `But remember when you said "${msgs.sort(() =>0.5-Math.random())[0]}"?` : "";;
)$
```

Using the Post-Variable Expressions, we're able to take the results of the @user_heard `SET`, and process it to get a random result.