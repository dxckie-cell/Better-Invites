/*
 * Ported from Equicord's BetterInvites plugin
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from "react";
import { Image, Pressable, View } from "react-native";
import moment from "moment";

const { onJsxCreate, deleteJsxCreate } = bunny.api.react.jsx;
const { findByProps, findByStoreName } = bunny.metro;
const { Text } = bunny.metro.common.components;

// Names Discord has used for the invite embed component. The first one that renders wins.
const EMBED_NAMES = ["GuildInviteEmbed", "InviteEmbed", "GuildInvite"];

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

function patchEmbed(props: any, ret: JSX.Element) {
    const invite: Invite | undefined = props?.invite ?? props?.resolvedInvite;
    if (!invite || (!invite.inviter && !invite.expires_at)) return;

    return (
        <View>
            <InviteHeader invite={invite} />
            {ret}
        </View>
    );
}

const callback = (Component: any, ret: JSX.Element) => patchEmbed(ret.props, ret);

export default {
    onLoad() {
        EMBED_NAMES.forEach(name => onJsxCreate(name, callback));
    },
    onUnload() {
        EMBED_NAMES.forEach(name => deleteJsxCreate(name, callback));
    }
};
