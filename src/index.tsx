/*
 * Inspired by Equicord's BetterInvites plugin
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from "react";
import { Alert } from "react-native";
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

function openProfile(userId: string) {
    try {
        findByProps("showUserProfileActionSheet").showUserProfileActionSheet({ userId });
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

function showInfo(code: string) {
    fetch(`https://discord.com/api/v9/invites/${code}?with_counts=true&with_expiration=true`)
        .then(res => {
            if (!res.ok) throw new Error("not found");
            return res.json();
        })
        .then((invite: Invite) => {
            const { guild, inviter } = invite;
            const expiry = invite.expires_at
                ? `${moment(invite.expires_at).fromNow()} (${moment(invite.expires_at).format("lll")})`
                : "never";

            const lines = [
                `Server: ${guild?.name ?? "unknown"}`,
                `Invited by: ${inviter ? inviter.global_name || inviter.username : "unknown"}`,
                `Expires: ${expiry}`
            ];
            if (invite.approximate_member_count != null) {
                lines.push(`Members: ${invite.approximate_member_count} (${invite.approximate_presence_count ?? 0} online)`);
            }

            const buttons: Array<{ text: string; onPress?: () => void; }> = [];
            if (guild?.features?.includes("DISCOVERABLE")) buttons.push({ text: "Preview server", onPress: () => preview(guild.id) });
            if (inviter) buttons.push({ text: "Inviter profile", onPress: () => openProfile(inviter.id) });
            buttons.push({ text: "Close" });

            Alert.alert("Invite info", lines.join("\n"), buttons);
        })
        .catch(() => toast("That invite is invalid or expired."));
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

const seenKeys = new Set<string>();

function debug(key: unknown, props: any) {
    if (seenKeys.size >= 4 || seenKeys.has(String(key))) return;
    seenKeys.add(String(key));
    const message = props?.message;
    const text = [
        `key=${String(key)}`,
        `props=${Object.keys(props ?? {}).slice(0, 12).join(",")}`,
        `message=${message ? Object.keys(message).slice(0, 12).join(",") : "none"}`,
        `content=${typeof message?.content}`
    ].join("\n");
    setTimeout(() => Alert.alert("BI debug", text), 800);
}

let unpatches: Array<() => unknown> = [];

export default {
    onLoad() {
        toast("BetterInvites v5 loaded");
        const sheet = findByProps("openLazy", "hideActionSheet");

        unpatches.push(before("openLazy", sheet, ([component, key, props]: any[]) => {
            debug(key, props);
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
