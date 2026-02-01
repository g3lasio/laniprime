import { useState } from "react";
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
} from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

type ContentMode = "supervised" | "autopilot";

export default function DashboardScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const [mode, setMode] = useState<ContentMode>("supervised");
  const [refreshing, setRefreshing] = useState(false);

  // Fetch niche profile
  const { data: nicheProfile, refetch: refetchNiche } = trpc.niche.get.useQuery();

  // Fetch pending content
  const { data: contentData, refetch: refetchContent } = trpc.content.list.useQuery({
    status: "pending",
    limit: 50,
  });
  
  const pendingContent = contentData?.items || [];

  // Approve content mutation
  const approveMutation = trpc.content.approve.useMutation();
  const batchApproveMutation = trpc.content.batchApprove.useMutation();

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchNiche(), refetchContent()]);
    setRefreshing(false);
  };

  const handleModeSwitch = (newMode: ContentMode) => {
    if (newMode !== mode) {
      setMode(newMode);
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }
  };

  const handleApproveAll = async () => {
    if (pendingContent.length === 0) {
      Alert.alert("No Content", "There's no pending content to approve");
      return;
    }

    Alert.alert(
      "Approve All Content?",
      `This will approve ${pendingContent.length} posts for publishing.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve All",
          style: "default",
          onPress: async () => {
            try {
              const contentIds = pendingContent.map((c: any) => c.id);
              await batchApproveMutation.mutateAsync({ ids: contentIds });
              
              if (Platform.OS !== "web") {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              
              Alert.alert("Success!", `${contentIds.length} posts approved and scheduled`);
              await refetchContent();
            } catch (error) {
              Alert.alert("Error", "Failed to approve content. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleApproveOne = async (contentId: number) => {
    try {
      await approveMutation.mutateAsync({ id: contentId });
      
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      await refetchContent();
    } catch (error) {
      Alert.alert("Error", "Failed to approve content");
    }
  };

  const handleGenerateWeekly = () => {
    if (!nicheProfile) {
      Alert.alert(
        "Setup Required",
        "Please analyze your niche first to generate content.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Analyze Now", onPress: () => router.push("/niche/analyze" as any) },
        ]
      );
      return;
    }

    router.push("/generate" as any);
  };

  const pendingCount = pendingContent?.length || 0;
  const hasNiche = !!nicheProfile;

  return (
    <ScreenContainer className="flex-1">
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View className="p-6 pb-4">
          <Text className="text-muted text-sm">Welcome back,</Text>
          <Text className="text-foreground text-3xl font-bold mt-1">
            {user?.name || "Test User"}
          </Text>
        </View>

        {/* Niche Setup Card */}
        {!hasNiche && (
          <View className="mx-6 mb-4 bg-warning/10 border border-warning/30 rounded-2xl p-4">
            <View className="flex-row items-center gap-3">
              <View className="bg-warning/20 p-2 rounded-full">
                <IconSymbol name="exclamationmark.triangle.fill" size={20} color={colors.warning} />
              </View>
              <View className="flex-1">
                <Text className="text-foreground font-semibold">Setup Required</Text>
                <Text className="text-muted text-sm mt-1">
                  Analyze your niche to start generating content
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/niche/analyze" as any)}
              className="bg-warning mt-3 py-2 rounded-xl"
              activeOpacity={0.8}
            >
              <Text className="text-background text-center font-semibold">Analyze Niche</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Mode Selector */}
        <View className="mx-6 mb-4">
          <Text className="text-foreground font-semibold text-lg mb-3">Content Mode</Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => handleModeSwitch("supervised")}
              className={`flex-1 p-4 rounded-2xl border-2 ${
                mode === "supervised"
                  ? "bg-primary/10 border-primary"
                  : "bg-surface border-border"
              }`}
              activeOpacity={0.7}
            >
              <View className="flex-row items-center gap-2 mb-2">
                <IconSymbol
                  name="checkmark.circle.fill"
                  size={24}
                  color={mode === "supervised" ? colors.primary : colors.muted}
                />
                <Text
                  className={`font-bold ${
                    mode === "supervised" ? "text-primary" : "text-foreground"
                  }`}
                >
                  Supervised
                </Text>
              </View>
              <Text className="text-muted text-xs">
                Review weekly plan, approve batch
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleModeSwitch("autopilot")}
              className={`flex-1 p-4 rounded-2xl border-2 ${
                mode === "autopilot"
                  ? "bg-primary/10 border-primary"
                  : "bg-surface border-border"
              }`}
              activeOpacity={0.7}
            >
              <View className="flex-row items-center gap-2 mb-2">
                <IconSymbol
                  name="bolt.fill"
                  size={24}
                  color={mode === "autopilot" ? colors.primary : colors.muted}
                />
                <Text
                  className={`font-bold ${
                    mode === "autopilot" ? "text-primary" : "text-foreground"
                  }`}
                >
                  Autopilot
                </Text>
              </View>
              <Text className="text-muted text-xs">
                Quick approve, auto-publish
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Supervised Mode */}
        {mode === "supervised" && (
          <View className="mx-6 mb-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-foreground font-semibold text-lg">Weekly Plan</Text>
              <TouchableOpacity
                onPress={handleGenerateWeekly}
                className="bg-primary px-4 py-2 rounded-xl"
                activeOpacity={0.8}
              >
                <Text className="text-background font-semibold text-sm">Generate Week</Text>
              </TouchableOpacity>
            </View>

            {pendingCount === 0 ? (
              <View className="bg-surface rounded-2xl p-8 items-center">
                <IconSymbol name="calendar" size={48} color={colors.muted} />
                <Text className="text-muted text-center mt-4">
                  No weekly plan yet. Generate content to get started!
                </Text>
              </View>
            ) : (
              <>
                {/* Weekly Calendar View */}
                <View className="bg-surface rounded-2xl p-4 mb-4">
                  {pendingContent.slice(0, 7).map((content: any, index: number) => {
                    const date = new Date();
                    date.setDate(date.getDate() + index);
                    const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
                    const dayNum = date.getDate();

                    return (
                      <View
                        key={content.id}
                        className="flex-row items-center gap-3 py-3 border-b border-border last:border-b-0"
                      >
                        <View className="items-center w-12">
                          <Text className="text-muted text-xs">{dayName}</Text>
                          <Text className="text-foreground font-bold text-lg">{dayNum}</Text>
                        </View>
                        <View className="flex-1">
                          <Text className="text-foreground font-medium" numberOfLines={2}>
                            {content.title}
                          </Text>
                          <Text className="text-muted text-xs mt-1">
                            {content.platform} • {content.contentType}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleApproveOne(content.id)}
                          className="bg-success/10 px-3 py-2 rounded-lg"
                          activeOpacity={0.7}
                        >
                          <IconSymbol name="checkmark" size={16} color={colors.success} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>

                {/* Approve All Button */}
                <TouchableOpacity
                  onPress={handleApproveAll}
                  className="bg-primary py-4 rounded-2xl"
                  activeOpacity={0.8}
                >
                  <Text className="text-background text-center font-bold text-lg">
                    Approve Entire Week ({pendingCount} posts)
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* Autopilot Mode */}
        {mode === "autopilot" && (
          <View className="mx-6 mb-6">
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text className="text-foreground font-semibold text-lg">Quick Approval</Text>
                <Text className="text-muted text-sm">Review and approve in 2 clicks</Text>
              </View>
              <View className="bg-primary/10 px-3 py-2 rounded-full">
                <Text className="text-primary font-bold">{pendingCount} pending</Text>
              </View>
            </View>

            {pendingCount === 0 ? (
              <View className="bg-surface rounded-2xl p-8 items-center">
                <IconSymbol name="bolt.fill" size={48} color={colors.muted} />
                <Text className="text-muted text-center mt-4">
                  No content pending. System will auto-generate soon!
                </Text>
                <TouchableOpacity
                  onPress={handleGenerateWeekly}
                  className="bg-primary px-6 py-3 rounded-xl mt-4"
                  activeOpacity={0.8}
                >
                  <Text className="text-background font-semibold">Generate Now</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Compact List */}
                <View className="bg-surface rounded-2xl p-4 mb-4">
                  <ScrollView className="max-h-96">
                    {pendingContent.map((content: any, index: number) => (
                      <View
                        key={content.id}
                        className="flex-row items-center gap-3 py-2 border-b border-border last:border-b-0"
                      >
                        <Text className="text-muted text-xs w-6">{index + 1}</Text>
                        <View className="flex-1">
                          <Text className="text-foreground font-medium" numberOfLines={1}>
                            {content.title}
                          </Text>
                        </View>
                        <View className="bg-primary/10 px-2 py-1 rounded">
                          <Text className="text-primary text-xs font-medium">
                            {content.platform}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                </View>

                {/* Ultra-Fast Approve Button */}
                <LinearGradient
                  colors={[colors.primary, colors.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  className="rounded-2xl"
                >
                  <TouchableOpacity
                    onPress={handleApproveAll}
                    className="py-5 px-6"
                    activeOpacity={0.8}
                  >
                    <View className="flex-row items-center justify-center gap-3">
                      <IconSymbol name="bolt.fill" size={24} color={colors.background} />
                      <Text className="text-background text-center font-bold text-xl">
                        Approve All {pendingCount} Posts
                      </Text>
                    </View>
                    <Text className="text-background/80 text-center text-sm mt-2">
                      Auto-schedule and publish this week
                    </Text>
                  </TouchableOpacity>
                </LinearGradient>
              </>
            )}
          </View>
        )}

        {/* Quick Stats */}
        <View className="mx-6 mb-6">
          <Text className="text-foreground font-semibold text-lg mb-3">This Month</Text>
          <View className="flex-row gap-3">
            <View className="flex-1 bg-surface rounded-2xl p-4">
              <IconSymbol name="sparkles" size={20} color={colors.primary} />
              <Text className="text-foreground text-2xl font-bold mt-2">0</Text>
              <Text className="text-muted text-xs">Generated</Text>
            </View>
            <View className="flex-1 bg-surface rounded-2xl p-4">
              <IconSymbol name="checkmark.circle.fill" size={20} color={colors.success} />
              <Text className="text-foreground text-2xl font-bold mt-2">0</Text>
              <Text className="text-muted text-xs">Published</Text>
            </View>
            <View className="flex-1 bg-surface rounded-2xl p-4">
              <IconSymbol name="eye.fill" size={20} color={colors.accent} />
              <Text className="text-foreground text-2xl font-bold mt-2">0</Text>
              <Text className="text-muted text-xs">Views</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
