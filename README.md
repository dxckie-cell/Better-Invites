# BetterInvites for Revenge (classic)

See an invite's expiration date, view the inviter's profile and preview a server before joining, all from the message menu.

Long-press any message that contains a Discord invite link and tap **Invite info**. A popup shows:

- **Server** name
- **Invited by**, who created the invite
- **Expires**, when the invite runs out (or "never")
- **Members**, total and online counts

The popup also has two buttons:

- **Inviter profile** opens the inviter's profile.
- **Preview server** opens the server without joining it. It only appears for servers with Discord's Discoverable setting on.

If a message has several invite links (up to 3), each gets its own button.

## Install

In Revenge, go to **Plugins**, tap **+**, and paste:

```
https://dxckie-cell.github.io/Better-Invites/
```

To update later, tap the info icon on the plugin, choose **Refetch**, then restart Discord.

## How it works

- Details are looked up through the Discord client, with Discord's public invite API as a fallback.
- Preview joins the server as a lurker (viewing only, no membership) and opens it. Use the back arrow to leave.
- Invite embeds look different on mobile, so this port adds a button to the message menu instead of changing the embed like the desktop version does.

## Build

```
npm install
npm run build
```

Output goes to `dist/`. Pushing to `main` builds and publishes it with GitHub Actions (Settings > Pages > Source: GitHub Actions).

## Credits and license

Based on Equicord's [BetterInvites](https://github.com/Equicord/Equicord/tree/main/src/equicordplugins/betterInvites) by iamme and thororen. GPL-3.0-or-later.
