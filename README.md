# BetterInvites for Revenge (classic)

See invites expiration date, view inviter profile and preview servers before joining by clicking the name.

A port of Equicord's [BetterInvites](https://github.com/Equicord/Equicord/tree/main/src/equicordplugins/betterInvites) (by iamme and thororen) to the classic Revenge bundle.

## What it does

Adds a header above invite embeds in chat:

- Who invited you, with their avatar. Tap it to open their profile.
- When the invite expires (or that it never does).
- A "Preview server" link for discoverable servers, which lurks the server without joining.

## Build

```
npm install
npm run build
```

Output goes to `dist/`: `repo.json` plus `builds/better-invites/{manifest.json,index.js}`. Host `dist/` (GitHub Pages works) and add the URL of `repo.json` in Revenge under Plugins.

## Notes

The Discord mobile client is minified differently to desktop, so the invite embed component is located by name (`GuildInviteEmbed`, `InviteEmbed`, `GuildInvite`). If Discord renames it, edit `EMBED_NAMES` in `src/index.tsx`.

## License

GPL-3.0-or-later, same as the original plugin.
