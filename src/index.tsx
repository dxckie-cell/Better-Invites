/*
 * Inspired by Equicord's BetterInvites plugin
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from "react";
import moment from "moment";

const { before, after } = bunny.api.patcher;
const { findByProps, findByName } = bunny.metro;
const { findAssetId } = bunny.api.assets;

const INVITE_LINK = /(?:discord\.gg|discord(?:app)?\.com\/invite)\/([a-zA-Z0-9-]{2,})/gi;
const MENU = "MessageLongPressActionSheet";

const toast = (text: string) => bunny.ui.toasts.showToast(text, findAssetId("LinkIcon"));

function alert(content: string, actions: Array<[string, () => void]> = []) {
    const [primary, secondary] = actions;
    vendetta.ui.alerts.showConfirmationAlert({
        title: "Invite info",
        content,
        confirmText: primary?.[0] ?? "Close",
        onConfirm: primary?.[1] ?? (() => { }),
        secondaryConfirmText: secondary?.[0],
        onConfirmSecondary: secondary?.[1],
        cancelText: primary ? "Close" : undefined
    });
}

function openProfile(userId: string) {
    const fail = () => toast("Couldn't open that profile.");
    try {
        Promise.resolve(findByProps("getUser", "fetchProfile")?.getUser?.(userId))
            .catch(() => { })
            .then(() => findByName("showUserProfileActionSheet")({ userId }))
            .catch(fail);
    } catch {
        fail();
    }
}

// Joins as a lurker (preview only, not a member), then opens the server.
function preview(guildId: string) {
    const fail = (e: unknown) => toast(`Couldn't preview: ${String(e).slice(0, 80)}`);
    try {
        Promise.resolve(findByProps("joinGuild").joinGuild(guildId, { lurker: true }))
            .then(() => findByProps("transitionToGuildSync").transitionToGuildSync(guildId))
            .catch(fail);
    } catch (e) {
        fail(e);
    }
}

const timeout = <T,>(promise: Promise<T>, ms: number) => Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timed out")), ms))
]);

// Discord client first, public invite API as a fallback.
function lookup(code: string): Promise<any> {
    const viaClient = () => timeout(
        Promise.resolve(bunny.metro.common.invites.resolveInvite(code, "Invite Info")).then((res: any) => {
            const invite = res?.invite ?? res;
            if (!invite?.guild) throw new Error("no server in response");
            return invite;
        }), 4000);

    const viaWeb = () => timeout(
        fetch(`https://discord.com/api/v9/invites/${code}?with_counts=true&with_expiration=true`)
            .then(res => {
                if (!res.ok) throw new Error(`status ${res.status}`);
                return res.json();
            }), 6000);

    return Promise.resolve().then(viaClient).catch(() => viaWeb());
}

function showInfo(code: string) {
    toast("Loading invite info...");
    lookup(code).then(({ guild, inviter, expires_at, approximate_member_count, approximate_presence_count }) => {
        const lines = [
            `Server: ${guild?.name ?? "unknown"}`,
            `Invited by: ${inviter ? inviter.global_name || inviter.username : "unknown"}`,
            `Expires: ${expires_at ? `${moment(expires_at).fromNow()} (${moment(expires_at).format("lll")})` : "never"}`
        ];
        if (approximate_member_count != null) {
            lines.push(`Members: ${approximate_member_count} (${approximate_presence_count ?? 0} online)`);
        }

        const actions: Array<[string, () => void]> = [];
        if (guild?.features?.includes("DISCOVERABLE")) actions.push(["Preview server", () => preview(guild.id)]);
        if (inviter) actions.push(["Inviter profile", () => openProfile(inviter.id)]);

        alert(lines.join("\n"), actions);
    }).catch((e: unknown) => alert(`Couldn't load this invite.\n\n${String(e)}`));
}

const isRow = (c: any) => typeof c?.props?.onPress === "function"
    && (typeof c.props.label === "string" || typeof c.props.message === "string");

function addButtons(tree: any, codes: string[]) {
    const rows = bunny.utils.findInReactTree(tree, (x: any) => Array.isArray(x) && x.some(isRow));
    if (!rows || rows.some((r: any) => String(r?.key).startsWith("better-invites-"))) return;

    const { ActionSheetRow, TableRow } = bunny.metro.common.components;
    const sheet = findByProps("openLazy", "hideActionSheet");

    rows.splice(Math.min(1, rows.length), 0, ...codes.map(code => (
        <ActionSheetRow
            key={`better-invites-${code}`}
            label={codes.length > 1 ? `Invite info (${code})` : "Invite info"}
            icon={<TableRow.Icon source={findAssetId("LinkIcon")} />}
            onPress={() => {
                sheet.hideActionSheet(MENU);
                showInfo(code);
            }}
        />
    )));
}

let unpatch: (() => unknown) | undefined;

export default {
    onLoad() {
        unpatch = before("openLazy", findByProps("openLazy", "hideActionSheet"), ([component, key, props]: any[]) => {
            const content = props?.message?.content;
            if (key !== MENU || typeof content !== "string") return;

            const codes = [...new Set([...content.matchAll(INVITE_LINK)].map(m => m[1]))].slice(0, 3);
            if (!codes.length) return;

            component.then((instance: any) => {
                const undo = after("default", instance, (_: unknown, tree: any) => {
                    React.useEffect(() => () => undo(), []);
                    addButtons(tree, codes);
                });
            });
        });
    },
    onUnload() {
        unpatch?.();
    }
};
