import { useState } from "react";
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

export default function NicheAnalyzeScreen() {
  const colors = useColors();
  const { isAuthenticated } = useAuth();
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  interface NicheProfileData {
    id: number;
    industry: string | null;
    brandVoice: Record<string, unknown> | null;
    targetAudience: Record<string, unknown> | null;
    postingFrequency: number | null;
    lastAnalyzedAt: Date | null;
    websiteUrl: string | null;
    autopilotEnabled: boolean | null;
  }

  const { data: nicheProfile, refetch } = trpc.niche.get.useQuery(
    undefined,
    { enabled: isAuthenticated }
  ) as { data: NicheProfileData | null | undefined; refetch: () => Promise<unknown> };

  const analyzeMutation = trpc.niche.analyzeWebsite.useMutation();

  const handleAnalyze = async () => {
    if (!websiteUrl.trim()) {
      Alert.alert("Missing URL", "Please enter your website URL");
      return;
    }

    // Add https if not present
    let url = websiteUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    setIsAnalyzing(true);
    try {
      const result = await analyzeMutation.mutateAsync({ websiteUrl: url });
      if (result.success) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        await refetch();
        Alert.alert(
          "Analysis Complete!",
          "Your niche profile has been updated based on your website.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      Alert.alert("Error", "Failed to analyze website. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center p-6">
        <Text className="text-foreground text-lg text-center">
          Please sign in to analyze your niche
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
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Header */}
          <View className="px-6 pt-4 pb-2">
            <View className="flex-row items-center gap-3 mb-2">
              <TouchableOpacity
                onPress={() => router.back()}
                className="w-10 h-10 rounded-full bg-surface border border-border items-center justify-center"
              >
                <IconSymbol name="chevron.left" size={20} color={colors.foreground} />
              </TouchableOpacity>
              <Text className="text-2xl font-bold text-foreground">
                Niche Intelligence
              </Text>
            </View>
            <Text className="text-muted">
              Analyze your website to configure Autopilot
            </Text>
          </View>

          {/* Website Input */}
          <View className="px-6 mt-6">
            <Text className="text-foreground font-semibold mb-2">
              Your Website URL
            </Text>
            <View className="flex-row items-center bg-surface rounded-xl border border-border px-4">
              <IconSymbol name="globe" size={20} color={colors.muted} />
              <TextInput
                value={websiteUrl}
                onChangeText={setWebsiteUrl}
                placeholder="www.yourwebsite.com"
                placeholderTextColor={colors.muted}
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                className="flex-1 py-4 px-3 text-foreground"
                returnKeyType="done"
                onSubmitEditing={handleAnalyze}
              />
            </View>
          </View>

          {/* Analyze Button */}
          <View className="px-6 mt-6">
            <TouchableOpacity
              onPress={handleAnalyze}
              disabled={isAnalyzing || !websiteUrl.trim()}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={
                  isAnalyzing || !websiteUrl.trim()
                    ? [colors.muted, colors.muted]
                    : [colors.primary, colors.accent]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  borderRadius: 16,
                  padding: 18,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {isAnalyzing ? (
                  <>
                    <ActivityIndicator color="#FFFFFF" />
                    <Text className="text-white font-semibold text-lg">
                      Analyzing...
                    </Text>
                  </>
                ) : (
                  <>
                    <IconSymbol name="sparkles" size={24} color="#FFFFFF" />
                    <Text className="text-white font-semibold text-lg">
                      Analyze Website
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Current Profile */}
          {nicheProfile && (
            <View className="px-6 mt-8">
              <Text className="text-lg font-semibold text-foreground mb-4">
                Current Niche Profile
              </Text>

              <View className="bg-surface rounded-xl border border-border overflow-hidden">
                {/* Industry */}
                <View className="p-4 border-b border-border">
                  <Text className="text-muted text-xs uppercase mb-1">Industry</Text>
                  <Text className="text-foreground font-medium">
                    {String(nicheProfile.industry || "Not detected")}
                  </Text>
                </View>

                {/* Brand Voice */}
                {nicheProfile.brandVoice && (
                  <View className="p-4 border-b border-border">
                    <Text className="text-muted text-xs uppercase mb-1">
                      Brand Voice
                    </Text>
                    <Text className="text-foreground font-medium">
                      {String((nicheProfile.brandVoice as any)?.tone || "Not set")}
                    </Text>
                    {(nicheProfile.brandVoice as any)?.keywords?.length > 0 && (
                      <View className="flex-row flex-wrap gap-1 mt-2">
                        {(((nicheProfile.brandVoice as any).keywords || []) as string[])
                          .slice(0, 5)
                          .map((keyword, i) => (
                            <View
                              key={i}
                              className="px-2 py-0.5 rounded bg-primary/10"
                            >
                              <Text className="text-primary text-xs">{String(keyword)}</Text>
                            </View>
                          ))}
                      </View>
                    )}
                  </View>
                )}

                {/* Target Audience */}
                {nicheProfile.targetAudience && (
                  <View className="p-4 border-b border-border">
                    <Text className="text-muted text-xs uppercase mb-1">
                      Target Audience
                    </Text>
                    <Text className="text-foreground font-medium">
                      {String((nicheProfile.targetAudience as any)?.demographics || "Not set")}
                    </Text>
                  </View>
                )}

                {/* Posting Frequency */}
                <View className="p-4">
                  <Text className="text-muted text-xs uppercase mb-1">
                    Posting Frequency
                  </Text>
                  <Text className="text-foreground font-medium">
                    {String(nicheProfile.postingFrequency || 3)} posts per week
                  </Text>
                </View>
              </View>

              {/* Last Analyzed */}
              {nicheProfile.lastAnalyzedAt && (
                <Text className="text-muted text-xs text-center mt-4">
                  Last analyzed:{" "}
                  {new Date(nicheProfile.lastAnalyzedAt).toLocaleDateString()}
                </Text>
              )}
            </View>
          )}

          {/* How it Works */}
          <View className="px-6 mt-8">
            <Text className="text-lg font-semibold text-foreground mb-4">
              How Niche Intelligence Works
            </Text>

            <View className="gap-4">
              <View className="flex-row gap-3">
                <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center">
                  <Text className="text-primary font-bold">1</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-foreground font-medium">
                    Website Analysis
                  </Text>
                  <Text className="text-muted text-sm">
                    AI scans your website to understand your business
                  </Text>
                </View>
              </View>

              <View className="flex-row gap-3">
                <View className="w-10 h-10 rounded-full bg-secondary/20 items-center justify-center">
                  <Text className="text-secondary font-bold">2</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-foreground font-medium">
                    Brand Voice Detection
                  </Text>
                  <Text className="text-muted text-sm">
                    Extracts tone, keywords, and messaging style
                  </Text>
                </View>
              </View>

              <View className="flex-row gap-3">
                <View className="w-10 h-10 rounded-full bg-accent/20 items-center justify-center">
                  <Text className="text-accent font-bold">3</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-foreground font-medium">
                    Autopilot Configuration
                  </Text>
                  <Text className="text-muted text-sm">
                    Automatically generates relevant content for your niche
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
