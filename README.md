# TwitchHelpers

Some small projects to solve very specific things I wanted to be able to stream to Twitch.

Currently I only have the one utility, but I anticipate in the future I'll have some more things I want to add that may not be node... So I'm just leaving this repo as is for now. I might restructure later.

# FancyTwitchServer

Provides a quick and easy way to server up data to my local OBS. Created this as a result of OBS not supporting any method of webpage customization more complex than CSS. This PR https://github.com/obsproject/obs-browser/pull/354 would actually solve for what I need by itself; but I guess the OBS owners aren't interested in including the feature for some reason.

So instead I ended up making my own thing... 

Later on, the PR creator and a maintainer both replied and there is now an available binary for the browser plugin with javascript injection available. That's probably better, but this was already done.

I was HEAVILY inspired by a lot of the kapchat style decisions. 

After that, I had some ideas about more advanced actions I wanted to be able to enable using twitch commands (via `!command` style chats). While I found plenty of providers, none of them really provided EVERYTHING I was looking for... And in particular they didn't provide a way to create custom bits/channel point reward actions or anything like that AND good command support. Lastly, none of the ones that were close were fully local, which drastically decreased the options available.

## Requires

If you're on windows you can download the electron build and install it as an application. Otherwise, it requires node.js and npm installed.

## Usage

Run from INSIDE the `FancyTwitchServer` directory.
- To Install dependancies: `npm install`
- To Build project: `npm run build-test`
- To Launch: `npm run`

All of the .html pages within the /FancyTwitchServer/content folder will be served. The localhost serving URL will be displayed in console. You can click there to get to the index page, and from there go to the page you're interested in. You can also just open `http://localhost:9000`. I have NOT made this application with the intention that it should be hosted anywhere public. I guarantee absolutely nothing in terms of security.

    > Actually, I guarantee that hosting this publically opens you up to having your system quickly compromised!


## Pages

### /chatrelay

From the index, click on the "Chat Monitor" option and add ?channel=`<YOURCHANNELNAME>`. Feel free to add your own custom CSS in OBS, or you can apply CSS by changing the `styles/chat_relay.css` stylesheet.

#### Usage Paramaters
    
Paramaters are added to the end of the URL following the `?` symbol. As mentioned above, the `channel` should generally be the first, after that each option may be appended with an ampersand `&`.

__?channel__
   
The `channel` paramater is used to identify the twitch channel when you want to monitor.

__&fade__

The `fade` paramater is used to define (in seconds) how long each chat should remain before fading off-screen.

__&swipe__

The `swipe` paramater is used to choose whether or not to include a swipe towards the right effect when fading messages. Requires the `fade` paramater to be defined to make a difference.

> Default: true
>
> Supported values: true/false

__&bot_activity__

~~The `bot_activity` paramater is used to choose whether to filter out bots of now~~

After doing some research it doesn't appear twitch really has a bot marking system. kapchat probably uses an internally maintained list of bots for this functionality, which isn't something I'm interested in. I'm happy to add this functionality later if a method if made known.

__&debug__

The `debug` paramater is used to choose whether or not to log the data recieved from twitch to the browser console or not. 

> Default: false
>
> Supported values: true/false

### /setup

The setup page allows you to configure the built-in chatbot! If you don't want to use it, just don't worry about it.

If you do want to use it, it should be pretty self-explanitory; so have fun!

### /showcase

The `/showcase` page displays either the most recent showcase item redeemed, or the showcase item redeemed at position `N`, where `N` is the distance from the most recent redemption. 0 will be the most recent redemption, 1 will be the previous redemption, 2 is two redemptions ago, and so on.

If a showcase record isn't found, or if the file for the showcase image isn't found in the `/FancyTwitchServer/artshow` folder, then the default `FancyTwitch` logo will be displayed instead.

#### Usage Paramaters
    
Paramaters are added to the end of the URL following the `?` symbol. As mentioned above, the `channel` should generally be the first, after that each option may be appended with an ampersand `&`.

__?pos__
   
The `pos` paramater is used to identify the showcase position which should be displayed


#### Setup

On the `/setup` page, you can configure commands to call `~showart` which is how the showcase arts are cycled.

The showcase page allows you to display image redemptions (and optionally messages) using a web-page.

Setting up a command with `~showart` will tell the FancyTwitchServer to store the user who called the `!command` or `redemption` as the caller of the command & the image to show on the `/showcase` page.

`~showart @1` will tell the FancyTwitchServer to store the first input as the caller and image to show on the `/showcase` page.

#### Bad Documentation

I'm aware this documentation is crap. I really don't feel like writing it right now, so I'm surprised I'm even doing this much - go me!

It needs to be fixed later... I might eventually get to it! 😁


### /showcase/setup

The showcase setup page provides the streamer with a quick and easy way to redeem a showcase directly (without having to use twitch commands or redemptions). They can also configure a custom message here!

A history of all the past redemptions is also stored here, just in case you need to see who has redeemed what.