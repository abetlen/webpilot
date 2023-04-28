# WebPilot 🚀

Toronto AI Hackathon project to bring copilot completion to any web app / page.

## LLM-Powered React Hook

`npm install webpilot`

`import webpilot from 'webpilot'`

`webpilot.init()`

`const itemSuggestion = webpilot.useSuggest('item', ['apple', 'banana', 'orange'])`


## Browser Extension

To demo WebPilot there is a web extension which uses the webpilot library to suggest completions for any input field on the page.

- Listen for input focus events
- Use page url, page context and past, per-user input to suggest completions
- Use global page text and nearby dom info
