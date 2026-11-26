# Starlit Holiday theme for Claude

A cozy holiday look for the Claude desktop app (Code tab): a night sky with twinkling and glowing stars, slow falling snow, sparkles on the snow, and snowy pine trees with soft lights and a gold star on top.

The fun part: the snow on the ground gets deeper as your chat fills up, and a snowfall meter above the message box shows how full the chat is (blue, then yellow at 60%, then red at 80%). Deep snow means it is time to start a fresh chat.

A frosted ice-glass card in the top left shows two rings: how full the chat is (with the token count, like "177K / 1M tokens") and how much of your 5-hour usage window is used, with the time until it resets. The 5-hour ring shows on a Claude subscription only. The numbers update each time Claude finishes a reply.

Made by Sondra Verva for the AI Builders Beehive.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install starlit-holiday --marketplace digitalbeachgirl/starlit-holiday-theme
```

Answer `y` to add the marketplace, then pick a scope (Enter takes the first).

From a shell:

```
claude plugin install starlit-holiday --marketplace digitalbeachgirl/starlit-holiday-theme
```

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins, Add marketplace with `digitalbeachgirl/starlit-holiday-theme`, then Add plugin.

The theme shows in the desktop and mobile apps. The terminal shows the snowfall meter only.
