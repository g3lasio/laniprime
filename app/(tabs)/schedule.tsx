import { useState, useMemo } from "react";
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

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function ScheduleScreen() {
  const colors = useColors();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Get scheduled posts for current month
  const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

  const { data: scheduledPosts, refetch, isLoading } = trpc.schedule.list.useQuery(
    {
      startDate: startOfMonth.toISOString(),
      endDate: endOfMonth.toISOString(),
      limit: 100,
    },
    { enabled: isAuthenticated }
  );

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const days: (Date | null)[] = [];
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    // Add empty days for padding
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }
    
    // Add actual days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i));
    }
    
    return days;
  }, [currentMonth]);

  // Get posts for a specific date
  const getPostsForDate = (date: Date) => {
    if (!scheduledPosts) return [];
    return scheduledPosts.filter((post) => {
      const postDate = new Date(post.scheduledFor);
      return (
        postDate.getFullYear() === date.getFullYear() &&
        postDate.getMonth() === date.getMonth() &&
        postDate.getDate() === date.getDate()
      );
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const navigateMonth = (direction: number) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + direction, 1));
    setSelectedDate(null);
  };

  const selectDate = (date: Date) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedDate(date);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  const isSelected = (date: Date) => {
    if (!selectedDate) return false;
    return (
      date.getFullYear() === selectedDate.getFullYear() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getDate() === selectedDate.getDate()
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return colors.success;
      case "scheduled":
        return colors.primary;
      case "publishing":
        return colors.warning;
      case "failed":
        return colors.error;
      case "cancelled":
        return colors.muted;
      default:
        return colors.muted;
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
          Please sign in to view schedule
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

  const selectedDatePosts = selectedDate ? getPostsForDate(selectedDate) : [];

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
          <Text className="text-2xl font-bold text-foreground">Schedule</Text>
        </View>

        {/* Month Navigation */}
        <View className="flex-row items-center justify-between px-6 py-4">
          <TouchableOpacity
            onPress={() => navigateMonth(-1)}
            className="p-2 rounded-lg bg-surface border border-border"
          >
            <IconSymbol name="chevron.left" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-foreground">
            {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </Text>
          <TouchableOpacity
            onPress={() => navigateMonth(1)}
            className="p-2 rounded-lg bg-surface border border-border"
          >
            <IconSymbol name="chevron.right" size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Calendar Grid */}
        <View className="px-4">
          {/* Day Headers */}
          <View className="flex-row mb-2">
            {DAYS.map((day) => (
              <View key={day} className="flex-1 items-center py-2">
                <Text className="text-muted text-xs font-medium">{day}</Text>
              </View>
            ))}
          </View>

          {/* Calendar Days */}
          <View className="flex-row flex-wrap">
            {calendarDays.map((date, index) => {
              if (!date) {
                return <View key={`empty-${index}`} className="w-[14.28%] aspect-square" />;
              }

              const postsForDay = getPostsForDate(date);
              const hasPost = postsForDay.length > 0;

              return (
                <TouchableOpacity
                  key={date.toISOString()}
                  onPress={() => selectDate(date)}
                  className="w-[14.28%] aspect-square p-1"
                >
                  <View
                    className={`flex-1 rounded-xl items-center justify-center ${
                      isSelected(date)
                        ? "bg-primary"
                        : isToday(date)
                        ? "bg-primary/20"
                        : ""
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        isSelected(date)
                          ? "text-background"
                          : isToday(date)
                          ? "text-primary"
                          : "text-foreground"
                      }`}
                    >
                      {date.getDate()}
                    </Text>
                    {hasPost && !isSelected(date) && (
                      <View className="flex-row gap-0.5 mt-1">
                        {postsForDay.slice(0, 3).map((_, i) => (
                          <View
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-primary"
                          />
                        ))}
                      </View>
                    )}
                    {hasPost && isSelected(date) && (
                      <View className="flex-row gap-0.5 mt-1">
                        {postsForDay.slice(0, 3).map((_, i) => (
                          <View
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-background"
                          />
                        ))}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Selected Date Posts */}
        {selectedDate && (
          <View className="px-6 mt-6">
            <Text className="text-lg font-semibold text-foreground mb-3">
              {selectedDate.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </Text>

            {selectedDatePosts.length > 0 ? (
              <View className="gap-3">
                {selectedDatePosts.map((post) => (
                  <View
                    key={post.id}
                    className="bg-surface rounded-xl p-4 border border-border"
                  >
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center gap-2">
                        <View
                          className="w-8 h-8 rounded-lg items-center justify-center"
                          style={{ backgroundColor: getStatusColor(post.status) + "20" }}
                        >
                          <IconSymbol
                            name={
                              post.status === "published"
                                ? "checkmark.circle.fill"
                                : post.status === "failed"
                                ? "exclamationmark.circle.fill"
                                : "clock.fill"
                            }
                            size={16}
                            color={getStatusColor(post.status)}
                          />
                        </View>
                        <Text className="text-foreground font-medium capitalize">
                          {post.platform}
                        </Text>
                      </View>
                      <Text className="text-muted text-sm">
                        {new Date(post.scheduledFor).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                    <View
                      className="px-2 py-0.5 rounded self-start"
                      style={{ backgroundColor: getStatusColor(post.status) + "20" }}
                    >
                      <Text
                        className="text-xs font-medium capitalize"
                        style={{ color: getStatusColor(post.status) }}
                      >
                        {post.status}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View className="bg-surface rounded-xl p-6 border border-border items-center">
                <IconSymbol name="calendar" size={32} color={colors.muted} />
                <Text className="text-muted text-center mt-3">
                  No posts scheduled for this day
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/generate" as any)}
                  className="bg-primary px-4 py-2 rounded-lg mt-4"
                  activeOpacity={0.8}
                >
                  <Text className="text-background font-semibold text-sm">
                    Create Content
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Upcoming Posts */}
        {!selectedDate && (
          <View className="px-6 mt-6">
            <Text className="text-lg font-semibold text-foreground mb-3">
              Upcoming Posts
            </Text>

            {isLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : scheduledPosts && scheduledPosts.length > 0 ? (
              <View className="gap-3">
                {scheduledPosts
                  .filter((p) => p.status === "scheduled")
                  .slice(0, 5)
                  .map((post) => (
                    <View
                      key={post.id}
                      className="bg-surface rounded-xl p-4 border border-border flex-row items-center gap-3"
                    >
                      <View
                        className="w-10 h-10 rounded-lg items-center justify-center"
                        style={{ backgroundColor: colors.primary + "20" }}
                      >
                        <IconSymbol name="clock.fill" size={20} color={colors.primary} />
                      </View>
                      <View className="flex-1">
                        <Text className="text-foreground font-medium capitalize">
                          {post.platform}
                        </Text>
                        <Text className="text-muted text-sm">
                          {new Date(post.scheduledFor).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </Text>
                      </View>
                      <IconSymbol name="chevron.right" size={16} color={colors.muted} />
                    </View>
                  ))}
              </View>
            ) : (
              <View className="bg-surface rounded-xl p-6 border border-border items-center">
                <IconSymbol name="calendar" size={32} color={colors.muted} />
                <Text className="text-muted text-center mt-3">
                  No upcoming posts scheduled
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
