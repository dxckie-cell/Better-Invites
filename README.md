# BetterInvites for Revenge (classic)

See invites expiration date, view inviter profile and preview servers before joining by clicking the name.

A port of Equicord's [BetterInvites](https://github.com/Equicord/Equicord/tree/main/src/equicordplugins/betterInvites) (by iamme and thororen) to the classic Revenge bundle.

## What it does

Adds a header above invite embeds in chat:

- Who invited you, with their avatar. Tap it to open their profile.
- When the invite expires (or that it never does).
- A "Preview server" link for discoverable servers, which lurks the server without joining.

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

The Discord mobile client is minified differently to desktop, so instead of patching a named component the plugin watches for any component that is given an invite object (with a server and inviter or expiry) and adds the header above it.

## License

GPL-3.0-or-later, same as the original plugin.
