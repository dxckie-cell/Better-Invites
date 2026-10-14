/*
 * Inspired by Equicord's BetterInvites plugin
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from "react";
import moment from "moment";

const { before, after } = bunny.api.patcher;
const { findByProps } = bunny.metro;
const { findInReactTree } = bunny.utils;
const { findAssetId } = bunny.api.assets;

const INVITE_LINK = /(?:discord\.gg|discord(?:app)?\.com\/invite)\/([a-zA-Z0-9-]{2,})/gi;

interface Invite {
    expires_at?: string | null;
    approximate_member_count?: number;
    approximate_presence_count?: number;
    inviter?: { id: string; username: string; global_name?: string | null; };
    guild?: { id: string; name: string; features?: string[]; };
}

const toast = (text: string) => bunny.ui.toasts.showToast(text, findAssetId("LinkIcon"));

interface Action { text: string; run: () => void; }

function showAlert(title: string, content: string, actions: Action[] = []) {
    const [primary, secondary] = actions;
    vendetta.ui.alerts.showConfirmationAlert({
        title,
        content,
        confirmText: primary?.text ?? "Close",
        onConfirm: primary?.run ?? (() => {}),
        secondaryConfirmText: secondary?.text,
        onConfirmSecondary: secondary?.run,
        cancelText: primary ? "Close" : undefined
    });
}

function openProfile(userId: string) {
    try {
        const show = bunny.metro.findByName("showUserProfileActionSheet");
        const users = findByProps("getUser", "fetchProfile");
        Promise.resolve(users?.getUser?.(userId))
            .catch(() => { })
            .then(() => show({ userId }))
            .catch(() => toast("Couldn't open that profile."));
    } catch {
        toast("Couldn't open that profile.");
    }
}

function preview(guildId: string) {
    try {
        findByProps("joinGuild").joinGuild(guildId, { lurker: true })
            .then(() => findByProps("transitionToGuild").transitionToGuild(guildId))
            .catch(() => toast("This server can't be previewed."));
    } catch {
        toast("This server can't be previewed.");
    }
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
        promise.then(
            value => { clearTimeout(timer); resolve(value); },
            error => { clearTimeout(timer); reject(error); }
        );
    });
}

function lookup(code: string): Promise<Invite> {
    const viaClient = () => {
        const { invites } = bunny.metro.common;
        if (typeof invites?.resolveInvite !== "function") throw new Error("client lookup unavailable");
        return withTimeout(Promise.resolve(invites.resolveInvite(code, "Invite Info")).then((res: any) => {
            const invite = res?.invite ?? res;
            if (!invite?.guild) throw new Error(`client lookup returned no server (${Object.keys(res ?? {}).slice(0, 8).join(",")})`);
            return invite as Invite;
        }), 4000, "client lookup");
    };

    const viaWeb = () => withTimeout(fetch(`https://discord.com/api/v9/invites/${code}?with_counts=true&with_expiration=true`)
        .then(res => {
            if (!res.ok) throw new Error(`web lookup status ${res.status}`);
            return res.json() as Promise<Invite>;
        }), 6000, "web lookup");

    return Promise.resolve().then(viaClient).catch((e1: unknown) =>
        viaWeb().catch((e2: unknown) => {
            throw new Error(`${String(e1)}\n${String(e2)}`);
        })
    );
}

function describeExpiry(expiresAt?: string | null) {
    if (!expiresAt) return "never";
    try {
        return `${moment(expiresAt).fromNow()} (${moment(expiresAt).format("lll")})`;
    } catch {
        return expiresAt;
    }
}

function showInfo(code: string) {
    toast("Loading invite info...");
    lookup(code).then((invite: Invite) => {
        const { guild, inviter } = invite;

        const lines = [
            `Server: ${guild?.name ?? "unknown"}`,
            `Invited by: ${inviter ? inviter.global_name || inviter.username : "unknown"}`,
            `Expires: ${describeExpiry(invite.expires_at)}`
        ];
        if (invite.approximate_member_count != null) {
            lines.push(`Members: ${invite.approximate_member_count} (${invite.approximate_presence_count ?? 0} online)`);
        }

        const actions: Action[] = [];
        if (guild?.features?.includes("DISCOVERABLE")) actions.push({ text: "Preview server", run: () => preview(guild.id) });
        if (inviter) actions.push({ text: "Inviter profile", run: () => openProfile(inviter.id) });

        showAlert("Invite info", lines.join("\n"), actions);
    }).catch((e: unknown) => {
        toast("Invite lookup failed");
        showAlert("Invite info", `Couldn't load this invite.\n\n${String(e)}`);
    });
}

const isRow = (c: any) => c?.props && typeof c.props.onPress === "function"
    && (typeof c.props.label === "string" || typeof c.props.message === "string");

function addButtons(tree: any, codes: string[]) {
    const rows = findInReactTree(tree, (x: any) => Array.isArray(x) && x.some(isRow));
    if (!rows) return toast("BetterInvites couldn't find the message menu.");
    if (rows.some((r: any) => String(r?.key).startsWith("better-invites-"))) return;

    const { ActionSheetRow, TableRow } = bunny.metro.common.components;
    const sheet = findByProps("openLazy", "hideActionSheet");

    rows.splice(Math.min(1, rows.length), 0, ...codes.map(code => (
        <ActionSheetRow
            key={`better-invites-${code}`}
            label={codes.length > 1 ? `Invite info (${code})` : "Invite info"}
            icon={<TableRow.Icon source={findAssetId("LinkIcon")} />}
            onPress={() => {
                sheet.hideActionSheet("MessageLongPressActionSheet");
                showInfo(code);
            }}
        />
    )));
}

let unpatches: Array<() => unknown> = [];

export default {
    onLoad() {
        const sheet = findByProps("openLazy", "hideActionSheet");

        unpatches.push(before("openLazy", sheet, ([component, key, props]: any[]) => {
            const content: unknown = props?.message?.content;
            if (key !== "MessageLongPressActionSheet" || typeof content !== "string") return;

            const codes = [...new Set([...content.matchAll(INVITE_LINK)].map(m => m[1]))].slice(0, 3);
            if (!codes.length) return;

            component.then((instance: any) => {
                const unpatch = after("default", instance, (_: unknown, tree: any) => {
                    React.useEffect(() => () => unpatch(), []);
                    addButtons(tree, codes);
                });
            });
        }));
    },
    onUnload() {
        unpatches.forEach(unpatch => unpatch());
        unpatches = [];
    }
};
