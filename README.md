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