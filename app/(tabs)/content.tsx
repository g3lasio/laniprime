import { useState } from "react";
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

type ContentStatus = "draft" | "pending" | "approved" | "scheduled" | "publishing" | "published" | "failed";

const STATUS_TABS: { key: ContentStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Drafts" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "published", label: "Published" },
];

export default function ContentScreen() {
  const colors = useColors();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<ContentStatus | "all">("all");
  const [refreshing, setRefreshing] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const { data, refetch, isLoading } = trpc.content.list.useQuery(
    {
      status: activeTab === "all" ? undefined : activeTab,
      limit: 50,
      offset: 0,
    },
    { enabled: isAuthenticated }
  );

  const batchApproveMutation = trpc.content.batchApprove.useMutation({
    onSuccess: () => {
      refetch();
      setSelectMode(false);
      setSelectedIds([]);
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const toggleSelect = (id: number) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBatchApprove = () => {
    if (selectedIds.length === 0) return;
    batchApproveMutation.mutate({ ids: selectedIds });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return colors.success;
      case "scheduled":
      case "publishing":
        return colors.warning;
      case "pending":
        return colors.primary;
      case "approved":
        return colors.accent;
      case "failed":
        return colors.error;
      default:
        return colors.muted;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "published":
        return "checkmark.circle.fill";
      case "scheduled":
      case "publishing":
        return "clock.fill";
      case "pending":
        return "sparkles";
      case "approved":
        return "checkmark";
      case "failed":
        return "exclamationmark.circle.fill";
      default:
        return "pencil";
    }
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
          Please sign in to manage content
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
      {/* Header */}
      <View className="px-6 pt-4 pb-2">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-2xl font-bold text-foreground">Content</Text>
          <View className="flex-row gap-2">
            {selectMode ? (
              <>
                <TouchableOpacity
                  onPress={() => {
                    setSelectMode(false);
                    setSelectedIds([]);
                  }}
                  className="px-4 py-2 rounded-lg bg-surface border border-border"
                >
                  <Text className="text-foreground">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleBatchApprove}
                  className="px-4 py-2 rounded-lg bg-primary"
                  disabled={selectedIds.length === 0}
                  style={{ opacity: selectedIds.length === 0 ? 0.5 : 1 }}
                >
                  <Text className="text-background font-semibold">
                    Approve ({selectedIds.length})
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  onPress={() => setSelectMode(true)}
                  className="p-2 rounded-lg bg-surface border border-border"
                >
                  <IconSymbol
                    name="checkmark.circle.fill"
                    size={20}
                    color={colors.muted}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push("/generate" as any)}
                  className="p-2 rounded-lg bg-primary"
                >
                  <IconSymbol name="plus" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Status Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {STATUS_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-full ${
                activeTab === tab.key ? "bg-primary" : "bg-surface border border-border"
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  activeTab === tab.key ? "text-background" : "text-foreground"
                }`}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : data?.items && data.items.length > 0 ? (
        <FlatList
          data={data.items}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 24, paddingTop: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() =>
                selectMode ? toggleSelect(item.id) : router.push(`/content/${item.id}` as any)
              }
              onLongPress={() => {
                if (!selectMode) {
                  setSelectMode(true);
                  setSelectedIds([item.id]);
                }
              }}
              className={`bg-surface rounded-xl p-4 mb-3 border ${
                selectedIds.includes(item.id) ? "border-primary" : "border-border"
              }`}
              activeOpacity={0.7}
            >
              <View className="flex-row items-start gap-3">
                {selectMode && (
                  <View
                    className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                      selectedIds.includes(item.id)
                        ? "bg-primary border-primary"
                        : "border-border"
                    }`}
                  >
                    {selectedIds.includes(item.id) && (
                      <IconSymbol name="checkmark" size={14} color="#FFFFFF" />
                    )}
                  </View>
                )}

                {item.imageUrl ? (
                  <View className="w-16 h-16 rounded-lg bg-muted/20" />
                ) : (
                  <View
                    className="w-16 h-16 rounded-lg items-center justify-center"
                    style={{ backgroundColor: getStatusColor(item.status) + "20" }}
                  >
                    <IconSymbol
                      name={getStatusIcon(item.status) as any}
                      size={24}
                      color={getStatusColor(item.status)}
                    />
                  </View>
                )}

                <View className="flex-1">
                  <Text className="text-foreground font-medium" numberOfLines={2}>
                    {item.body || item.body || "Untitled content"}
                  </Text>
                  <View className="flex-row items-center gap-2 mt-2">
                    <View
                      className="px-2 py-0.5 rounded"
                      style={{ backgroundColor: getStatusColor(item.status) + "20" }}
                    >
                      <Text
                        className="text-xs font-medium capitalize"
                        style={{ color: getStatusColor(item.status) }}
                      >
                        {item.status}
                      </Text>
                    </View>
                    <Text className="text-muted text-xs capitalize">{item.contentType}</Text>
                    {Array.isArray(item.platform) && (
                      <Text className="text-muted text-xs">
                        • {item.platform.length} platforms
                      </Text>
                    )}
                  </View>
                </View>

                {!selectMode && (
                  <IconSymbol name="chevron.right" size={16} color={colors.muted} />
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      ) : (
        <View className="flex-1 items-center justify-center p-6">
          <View className="w-20 h-20 rounded-full bg-surface items-center justify-center mb-4">
            <IconSymbol name="doc.fill" size={32} color={colors.muted} />
          </View>
          <Text className="text-foreground text-lg font-medium text-center mb-2">
            No content yet
          </Text>
          <Text className="text-muted text-center mb-6">
            Generate your first AI-powered content
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/generate" as any)}
            className="bg-primary px-6 py-3 rounded-xl"
            activeOpacity={0.8}
          >
            <Text className="text-background font-semibold">Generate Content</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScreenContainer>
  );
}
