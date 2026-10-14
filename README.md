# BetterInvites for Revenge (classic)

Long-press a message that contains a Discord server invite link and tap **Invite info** to see the server, who invited you, when the invite expires, and how many members it has. From there you can open the inviter's profile or preview the server before joining.

Inspired by Equicord's [BetterInvites](https://github.com/Equicord/Equicord/tree/main/src/equicordplugins/betterInvites) (by iamme and thororen). Revenge's mobile client draws invite embeds differently, so this version uses the message menu instead of changing the embed.

## Install

In Revenge, go to Plugins, tap +, and paste:

```
https://dxckie-cell.github.io/Better-Invites/
```

The GitHub Actions workflow builds and publishes it on every push (repo Settings > Pages > Source: GitHub Actions).

## Build locally

```
npm install
npm run build
```

Output goes to `dist/` as `manifest.json` and `index.js`.

## Notes

Invite details are looked up through the Discord client first, with Discord's public invite lookup as a fallback. If both fail, the popup shows why.

**Preview server** only appears for servers that have Discord's discoverable setting on. It joins the server as a lurker (a preview, without becoming a member) and opens it.

## License

GPL-3.0-or-later, same as the original plugin.
