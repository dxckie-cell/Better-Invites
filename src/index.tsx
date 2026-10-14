/*
 * Ported from Equicord's BetterInvites plugin
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from "react";
import { Image, Pressable, View } from "react-native";
import moment from "moment";

const { findByProps, findByStoreName } = bunny.metro;
const { Text } = bunny.metro.common.components;

interface Inviter {
    id: string;
    avatar?: string | null;
    global_name?: string | null;
    username: string;
}

interface Invite {
    inviter?: Inviter;
    expires_at?: string | null;
    guild?: { id: string; name: string; features?: string[] };
}

function openProfile(userId: string) {
    findByProps("showUserProfileActionSheet").showUserProfileActionSheet({ userId });
}

function preview(guildId: string) {
    const GuildActions = findByProps("joinGuild");
    const Navigation = findByProps("transitionToGuild");
    GuildActions.joinGuild(guildId, { lurker: true })
        .then(() => Navigation.transitionToGuild(guildId))
        .catch(() => bunny.ui.toasts.showToast("This server can't be previewed."));
}

function InviteHeader({ invite }: { invite: Invite; }) {
    const { inviter, guild, expires_at } = invite;
    const canPreview = guild?.features?.includes("DISCOVERABLE");
    const isSelf = inviter?.id === findByStoreName("UserStore").getCurrentUser()?.id;
    const guildName = guild?.name ?? "this server";

    const sentence = isSelf
        ? `You sent an invite to join ${guildName}`
        : `${inviter?.global_name || inviter?.username} invited you to ${guildName}`;

    const expiry = expires_at
        ? `Expires ${moment(expires_at).fromNow()} (${moment(expires_at).format("lll")})`
        : "Never expires";

    return (
        <View style={{ gap: 2, marginBottom: 6 }}>
            {inviter && (
                <Pressable
                    onPress={() => openProfile(inviter.id)}
                    style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                    {inviter.avatar && (
                        <Image
                            source={{ uri: `https://cdn.discordapp.com/avatars/${inviter.id}/${inviter.avatar}.png?size=64` }}
                            style={{ width: 18, height: 18, borderRadius: 9 }}
                        />
                    )}
                    <Text variant="text-sm/medium" color="text-muted" style={{ flexShrink: 1 }}>
                        {sentence}
                    </Text>
                </Pressable>
            )}
            <Text variant="text-xs/medium" color="text-muted">{expiry}</Text>
            {canPreview && (
                <Pressable onPress={() => preview(guild!.id)}>
                    <Text variant="text-xs/semibold" color="text-link">Preview server</Text>
                </Pressable>
            )}
        </View>
    );
}

const isInvite = (v: any): v is Invite =>
    v && typeof v === "object" && v.guild && (v.inviter || v.expires_at !== undefined);

const owners = new WeakMap<object, unknown>();

const seen = new Set<string>();
const lines: string[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;
let shown = 0;

function nameOf(Component: any): string {
    return Component?.displayName || Component?.name || Component?.type?.displayName || Component?.type?.name
        || Component?.render?.displayName || Component?.render?.name || "anonymous";
}

const CODE = /^(nexpy|wvcu5yx37)$/i;

function findCode(v: any, path: string, depth: number): string | undefined {
    if (typeof v === "string") return CODE.test(v) ? path : undefined;
    if (depth === 0 || !v || typeof v !== "object") return;
    for (const k of Object.keys(v).slice(0, 25)) {
        let child: any;
        try { child = v[k]; } catch { continue; }
        if (typeof child === "function") continue;
        const hit = findCode(child, `${path}.${k}`, depth - 1);
        if (hit) return hit;
    }
}

function debug([Component, props]: any[]) {
    if (!Component || !props || shown >= 2 || seen.size >= 8) return;
    if (typeof Component !== "function" && typeof Component !== "object") return;
    const hit = findCode(props, "props", 3);
    if (!hit) return;
    const name = nameOf(Component);
    const id = name + hit;
    if (seen.has(id)) return;
    seen.add(id);
    lines.push(`${name} [${Object.keys(props).slice(0, 12).join(",")}] ${hit}`);
    timer ??= setTimeout(() => {
        shown++;
        bunny.metro.common.ReactNative.Alert.alert("BI debug", lines.splice(0).join("\n\n"));
        timer = undefined;
    }, 6000);
}

function patchEmbed(args: any[], ret: JSX.Element) {
    try { debug(args); } catch { }
    const [Component, props] = args;
    if (typeof Component !== "function" || !props || !ret || typeof ret !== "object") return;

    for (const key of Object.keys(props)) {
        if (!/invite/i.test(key) || !isInvite(props[key])) continue;

        const invite = props[key] as Invite;
        // Only decorate the outermost component that receives this invite, not wrappers inside it.
        if (!owners.has(invite)) owners.set(invite, Component);
        if (owners.get(invite) !== Component) return;

        return (
            <View>
                <InviteHeader invite={invite} />
                {ret}
            </View>
        );
    }
}

let unpatches: Array<() => unknown> = [];

export default {
    onLoad() {
        const runtime = findByProps("jsx", "jsxs");
        unpatches = [
            bunny.api.patcher.after("jsx", runtime, patchEmbed),
            bunny.api.patcher.after("jsxs", runtime, patchEmbed)
        ];
    },
    onUnload() {
        clearTimeout(timer);
        timer = undefined;
        unpatches.forEach(unpatch => unpatch());
        unpatches = [];
    }
};
