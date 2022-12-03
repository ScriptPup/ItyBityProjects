# TwitchHelpers

Some small projects to solve very specific things I wanted to be able to stream to Twitch.

Currently I only have the one utility, but I anticipate in the future I'll have some more things I want to add that may not be node... So I'm just leaving this repo as is for now. I might restructure later.

# OBS-local-server

Provides a quick and easy way to server up data to my local OBS. Created this as a result of OBS not supporting any method of webpage customization more complex than CSS. This PR https://github.com/obsproject/obs-browser/pull/354 would actually solve for what I need by itself; but I guess the OBS owners aren't interested in including the feature for some reason.

So instead I ended up making my own thing... 

Later on, the PR creator and a maintainer both replied and there is now an available binary for the browser plugin with javascript injection available. That's probably better, but this was already done.

I was HEAVILY inspired by a lot of the kapchat style decisions.

After that, I had some ideas about more advanced actions I wanted to be able to enable using twitch commands (via `!command` style chats). While I found plenty of providers, none of them really provided EVERYTHING I was looking for... And in particular they didn't provide a way to create custom bits/channel point reward actions or anything like that AND good command support. Lastly, none of the ones that were close were fully local, which drastically decreased the options available.

## Requires

This is just a lightweight webserver. I set it up using node.js, so you'll need to install that before anything below will work.

## Usage

Run from INSIDE the `OBS-local-server` directory.
- To Install: `npm install`
- To Launch: `npm run`

All of the .html pages within the /OBS-local-server/content folder will be served. The localhost serving URL will be displayed in console. You can click there to get to the index page, and from there go to the page you're interested in.


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