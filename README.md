# ItyBityProjects

Some small projects to solve very specific (but ultimately trivial) problems

# OBS-local-server

Provides a quick and easy way to server up data to my local OBS. Created this as a result of OBS not supporting any method of webpage customization more complex than CSS. This PR https://github.com/obsproject/obs-browser/pull/354 would actually solve for what I need by itself; but I guess the OBS owners aren't interested in including the feature for some reason.

So instead I ended up making my own thing... 

Later on, the PR creator and a maintainer both replied and there is now an available binary for the browser plugin with javascript injection available. That's probably better, but this was already done.

I was HEAVILY inspired by a lot of the kapchat style decisions.

## Requires

This is just a lightweight webserver. I set it up using node.js, so you'll need to install that before anything below will work.

## Usage

Setup a pass-through page with the content you need, or just use the index.html provided.

Run from INSIDE the `OBS-local-server` directory.
- To Install: `npm install`
- To Launch: `npm run`

All of the .html pages within the /OBS-local-server/content folder will be served, and the localhost serving URL will be displayed in console. Just copy-paste that into your OBS browser source and add ?channel=`<YOURCHANNELNAME>`. Feel free to add your own custom CSS in OBS, or you can apply CSS by changing the `styles/chat_relay.css` stylesheet.

### Usage Paramaters
    
Paramaters are added to the end of the URL following the `?` symbol. As mentioned above, the channel should generally be the first, after that each option may be appended with an ampersand `&`.

__?channel__
   
The channel paramater is used to identify the twitch channel when you want to monitor.

__&fade__

The fade paramater is used to define (in seconds) how long each chat should remain before fading off-screen.

__&bot_activity__

~~The bot_activity paramater is used to choose whether to filter out bots of now~~

After doing some research it doesn't appear twitch really has a bot marking system. kapchat probably uses an internally maintained list of bots for this functionality, which isn't something I'm interested in. I'm happy to add this functionality later if a method if made known.

__&debug__

The debug paramater is used to choose whether or not to log the data recieved from twitch to the browser console or not. 

> Default: false
>
> Supported values: true/false