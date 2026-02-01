import { useState } from "react";
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Switch,
  Alert,
} from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

const PLATFORMS = [
  { key: "facebook", name: "Facebook", color: "#1877F2" },
  { key: "instagram", name: "Instagram", color: "#E4405F" },
  { key: "twitter", name: "Twitter/X", color: "#000000" },
  { key: "linkedin", name: "LinkedIn", color: "#0A66C2" },
  { key: "tiktok", name: "TikTok", color: "#000000" },
] as const;

export default function SettingsScreen() {
  const colors = useColors();
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch data
  const { data: nicheProfile, refetch: refetchNiche } = trpc.niche.get.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: socialAccounts, refetch: refetchSocial } = trpc.social.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: subscription, refetch: refetchSubscription } = trpc.billing.subscription.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: usage } = trpc.billing.usage.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const toggleAutopilotMutation = trpc.niche.toggleAutopilot.useMutation({
    onSuccess: () => refetchNiche(),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchNiche(), refetchSocial(), refetchSubscription()]);
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/" as any);
          },
        },
      ]
    );
  };

  const handleToggleAutopilot = (enabled: boolean) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    toggleAutopilotMutation.mutate({ enabled });
  };

  const handleConnectPlatform = (platform: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/social/connect/${platform}` as any);
  };

  if (authLoading) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  if (!isAuthenticated) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center p-6">
        <Text className="text-foreground text-lg text-center">
          Please sign in to access settings
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/auth/phone" as any)}
          className="bg-primary px-6 py-3 rounded-xl mt-4"
          activeOpacity={0.8}
        >
          <Text className="text-background font-semibold">Sign In</Text>
        </TouchableOpacity>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View className="px-6 pt-4 pb-2">
          <Text className="text-2xl font-bold text-foreground">Settings</Text>
        </View>

        {/* Profile Section */}
        <View className="px-6 mt-4">
          <Text className="text-muted text-xs font-semibold uppercase mb-3">
            Profile
          </Text>
          <View className="bg-surface rounded-xl border border-border overflow-hidden">
            <TouchableOpacity
              className="flex-row items-center p-4 border-b border-border"
              activeOpacity={0.7}
            >
              <View className="w-12 h-12 rounded-full bg-primary/20 items-center justify-center">
                <Text className="text-primary text-lg font-bold">
                  {user?.name?.charAt(0) || (user as any)?.phoneNumber?.slice(-2) || "?"}
                </Text>
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-foreground font-medium">
                  {user?.name || "Set your name"}
                </Text>
                <Text className="text-muted text-sm">
                  {(user as any)?.phoneNumber || "No phone"}
                </Text>
              </View>
              <IconSymbol name="chevron.right" size={16} color={colors.muted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Niche Intelligence Section */}
        <View className="px-6 mt-6">
          <Text className="text-muted text-xs font-semibold uppercase mb-3">
            Niche Intelligence
          </Text>
          <View className="bg-surface rounded-xl border border-border overflow-hidden">
            {/* Website Analysis */}
            <TouchableOpacity
              onPress={() => router.push("/niche/analyze" as any)}
              className="flex-row items-center p-4 border-b border-border"
              activeOpacity={0.7}
            >
              <View className="w-10 h-10 rounded-lg bg-primary/20 items-center justify-center">
                <IconSymbol name="globe" size={20} color={colors.primary} />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-foreground font-medium">Website Analysis</Text>
                <Text className="text-muted text-sm" numberOfLines={1}>
                  {nicheProfile?.websiteUrl || "Not configured"}
                </Text>
              </View>
              <IconSymbol name="chevron.right" size={16} color={colors.muted} />
            </TouchableOpacity>

            {/* Industry */}
            <View className="flex-row items-center p-4 border-b border-border">
              <View className="w-10 h-10 rounded-lg bg-secondary/20 items-center justify-center">
                <IconSymbol name="building.2.fill" size={20} color={colors.secondary} />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-foreground font-medium">Industry</Text>
                <Text className="text-muted text-sm">
                  {nicheProfile?.industry || "Not detected"}
                </Text>
              </View>
            </View>

            {/* Autopilot */}
            <View className="flex-row items-center p-4">
              <View className="w-10 h-10 rounded-lg bg-accent/20 items-center justify-center">
                <IconSymbol name="bolt.fill" size={20} color={colors.accent} />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-foreground font-medium">Autopilot Mode</Text>
                <Text className="text-muted text-sm">
                  Auto-generate and publish content
                </Text>
              </View>
              <Switch
                value={nicheProfile?.autopilotEnabled || false}
                onValueChange={handleToggleAutopilot}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* Connected Accounts Section */}
        <View className="px-6 mt-6">
          <Text className="text-muted text-xs font-semibold uppercase mb-3">
            Connected Accounts
          </Text>
          <View className="bg-surface rounded-xl border border-border overflow-hidden">
            {PLATFORMS.map((platform, index) => {
              const connected = socialAccounts?.find(
                (a) => a.platform === platform.key
              );

              return (
                <TouchableOpacity
                  key={platform.key}
                  onPress={() =>
                    connected
                      ? router.push(`/social/${connected.id}` as any)
                      : handleConnectPlatform(platform.key)
                  }
                  className={`flex-row items-center p-4 ${
                    index < PLATFORMS.length - 1 ? "border-b border-border" : ""
                  }`}
                  activeOpacity={0.7}
                >
                  <View
                    className="w-10 h-10 rounded-lg items-center justify-center"
                    style={{ backgroundColor: platform.color + "20" }}
                  >
                    <IconSymbol name="globe" size={20} color={platform.color} />
                  </View>
                  <View className="flex-1 ml-3">
                    <Text className="text-foreground font-medium">
                      {platform.name}
                    </Text>
                    <Text className="text-muted text-sm">
                      {connected ? connected.accountName || "Connected" : "Not connected"}
                    </Text>
                  </View>
                  {connected ? (
                    <View className="px-2 py-1 rounded bg-success/20">
                      <Text className="text-success text-xs font-medium">
                        Connected
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => handleConnectPlatform(platform.key)}
                      className="px-3 py-1.5 rounded-lg bg-primary"
                    >
                      <Text className="text-background text-xs font-semibold">
                        Connect
                      </Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Subscription Section */}
        <View className="px-6 mt-6">
          <Text className="text-muted text-xs font-semibold uppercase mb-3">
            Subscription & Billing
          </Text>
          <View className="bg-surface rounded-xl border border-border overflow-hidden">
            {/* Current Plan */}
            <TouchableOpacity
              onPress={() => router.push("/billing" as any)}
              className="flex-row items-center p-4 border-b border-border"
              activeOpacity={0.7}
            >
              <View className="w-10 h-10 rounded-lg bg-primary/20 items-center justify-center">
                <IconSymbol name="creditcard.fill" size={20} color={colors.primary} />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-foreground font-medium">Current Plan</Text>
                <Text className="text-muted text-sm capitalize">
                  Free Plan
                </Text>
              </View>
              <IconSymbol name="chevron.right" size={16} color={colors.muted} />
            </TouchableOpacity>

            {/* Usage */}
            <View className="p-4">
              <Text className="text-foreground font-medium mb-3">
                This Month's Usage
              </Text>
              <View className="flex-row gap-4">
                <View className="flex-1">
                  <Text className="text-2xl font-bold text-foreground">
                    {usage?.postsGenerated || 0}
                  </Text>
                  <Text className="text-muted text-xs">Posts Generated</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-2xl font-bold text-foreground">
                    {usage?.postsPublished || 0}
                  </Text>
                  <Text className="text-muted text-xs">Posts Published</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-2xl font-bold text-foreground">
                    {usage?.imagesGenerated || 0}
                  </Text>
                  <Text className="text-muted text-xs">Images</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* App Section */}
        <View className="px-6 mt-6">
          <Text className="text-muted text-xs font-semibold uppercase mb-3">
            App
          </Text>
          <View className="bg-surface rounded-xl border border-border overflow-hidden">
            <View className="flex-row items-center p-4 border-b border-border">
              <View className="w-10 h-10 rounded-lg bg-muted/20 items-center justify-center">
                <IconSymbol name="info.circle.fill" size={20} color={colors.muted} />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-foreground font-medium">Version</Text>
                <Text className="text-muted text-sm">1.0.0</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleLogout}
              className="flex-row items-center p-4"
              activeOpacity={0.7}
            >
              <View className="w-10 h-10 rounded-lg bg-error/20 items-center justify-center">
                <IconSymbol name="arrow.clockwise" size={20} color={colors.error} />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-error font-medium">Sign Out</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View className="px-6 mt-8 mb-4">
          <Text className="text-muted text-xs text-center">
            LaniPrime • AI-Powered Content Engine
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
