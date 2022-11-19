# Command Components

<hr />

## Name

The name of the command is what the server will "listen" for, thios


# Contextual Variables

The variable structure which can be used to store variable information and replace the block with the results.

For example:

```
You've gained {evil++} points of evil total!
```

Will result in `You've gained 1 point of evil total!`the first time you run it. 

The second time it will say `You've gained 2 points of evil total!` and so on and so forth.

## Supported variable syntax

### General interfacing
- Delete variable: `{varName=null}`
- Reference variable: `{varName}`

> Note: When deleting a variable, the operator MUST NOT have a space before or after `null`.

### NUMERIC interfacing

- Set variable to one: `{varName=1}`
- Increment by one: `{varName++}`
- Increment by two: `{varName+2}`
- Increment by multiplitive: `{varName*2|1}`
- Decrement by one: `{varName--|0}`
- Decrement by two: `{varName-1|0}`
- Decrement by dividend: `{varName/2|0}`

> Note: I thought about implementing like square roots and powers and such, but honestly I can't think of a use-case so it seems like a waste of time. Proove me wrong with a use-case and I'll think about it.

### TEXT interfacing

- Set text value: `{varName=whatever}`
- Add to text value: `{varName+ happens|something}`
   > Note the space before. EVERYTHING to the right of the operator will be included (with the exception of numbers, which will always trim out space around them)

### LIST (array) interfacing

- Set list value: `{varName=[whatever]}`
- Add item to list: `{varName+[happens,will]}`
- Remove item from list: `{varName-[0]}`
   > List are index-based. This means to remove an item, you pass the position of the item you want to remove (starting at 0), NOT the value of the item. You may pass multiple indexies to remove.

### SET interfacing

Set values are essentially unique lists. If you want a list to not repeat, use this.

- Set the set value: `{varName=(whatever)}`
- Add item to set: `{varName+(happens,happens)}`
   > Note: In the above example, happens will only actually be added once.
- Remove item from set: `{varName-(whatever)}`

> Note: Sets are often represented as a list within `{}`, however `{}` is being used for the variable block boundary and I don't want to deal with trying to detect which is which, so we're going to use `()` instead.

### Fallbacks

All variable assignemnts support a fallback.

Fallbacks are what a variable will default to if something goes wrong. For example, if a variable that you're trying to multiply doesn't exist yet, or trying to divide by 0. 

By default, the fallback value is 1.
