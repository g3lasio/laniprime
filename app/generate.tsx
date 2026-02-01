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

const PLATFORMS = [
  { key: "facebook", name: "Facebook", icon: "globe", color: "#1877F2" },
  { key: "instagram", name: "Instagram", icon: "camera.fill", color: "#E4405F" },
  { key: "twitter", name: "Twitter/X", icon: "bubble.left.fill", color: "#000000" },
  { key: "linkedin", name: "LinkedIn", icon: "briefcase.fill", color: "#0A66C2" },
  { key: "tiktok", name: "TikTok", icon: "play.fill", color: "#000000" },
] as const;

const TONES = [
  { key: "professional", name: "Professional", emoji: "💼" },
  { key: "casual", name: "Casual", emoji: "😊" },
  { key: "friendly", name: "Friendly", emoji: "🤝" },
  { key: "authoritative", name: "Authoritative", emoji: "📢" },
  { key: "humorous", name: "Humorous", emoji: "😄" },
] as const;

export default function GenerateScreen() {
  const colors = useColors();
  const { isAuthenticated } = useAuth();
  const [topic, setTopic] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedTone, setSelectedTone] = useState("professional");
  const [includeImage, setIncludeImage] = useState(false);
  const [imageStyle, setImageStyle] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const generateMutation = trpc.content.generate.useMutation();

  const togglePlatform = (platform: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      Alert.alert("Missing Topic", "Please enter a topic for your content");
      return;
    }

    if (selectedPlatforms.length === 0) {
      Alert.alert("No Platforms", "Please select at least one platform");
      return;
    }

    setIsGenerating(true);
    try {
      // Generate content for first selected platform
      const platform = selectedPlatforms[0] as "facebook" | "instagram" | "twitter" | "linkedin" | "tiktok";
      
      const result = await generateMutation.mutateAsync({
        topic: topic.trim(),
        platform,
        tone: selectedTone as any,
        includeImage,
        imageStyle: imageStyle || undefined,
      });

      if (result.jobId) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        Alert.alert(
          "Content Generation Started!",
          `Your content is being generated (Job ID: ${result.jobId}). Check the Content tab to see the result.`,
          [
            { text: "View Content", onPress: () => router.push("/content" as any) },
            { text: "Generate More", style: "cancel" },
          ]
        );
        // Reset form
        setTopic("");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to generate content. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center p-6">
        <Text className="text-foreground text-lg text-center">
          Please sign in to generate content
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
              <Text className="text-2xl font-bold text-foreground">Generate Content</Text>
            </View>
            <Text className="text-muted">
              Create AI-powered content for your social media
            </Text>
          </View>

          {/* Topic Input */}
          <View className="px-6 mt-6">
            <Text className="text-foreground font-semibold mb-2">
              What do you want to post about?
            </Text>
            <TextInput
              value={topic}
              onChangeText={setTopic}
              placeholder="e.g., Tips for home renovation, New service announcement..."
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={3}
              className="bg-surface rounded-xl border border-border p-4 text-foreground min-h-[100px]"
              textAlignVertical="top"
            />
          </View>

          {/* Platform Selection */}
          <View className="px-6 mt-6">
            <Text className="text-foreground font-semibold mb-3">
              Select Platforms
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {PLATFORMS.map((platform) => {
                const isSelected = selectedPlatforms.includes(platform.key);
                return (
                  <TouchableOpacity
                    key={platform.key}
                    onPress={() => togglePlatform(platform.key)}
                    className={`flex-row items-center gap-2 px-4 py-2.5 rounded-full border ${
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border bg-surface"
                    }`}
                    activeOpacity={0.7}
                  >
                    <View
                      className="w-5 h-5 rounded-full items-center justify-center"
                      style={{ backgroundColor: platform.color }}
                    >
                      <IconSymbol
                        name={platform.icon as any}
                        size={12}
                        color="#FFFFFF"
                      />
                    </View>
                    <Text
                      className={`font-medium ${
                        isSelected ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {platform.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Tone Selection */}
          <View className="px-6 mt-6">
            <Text className="text-foreground font-semibold mb-3">
              Content Tone
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {TONES.map((tone) => {
                const isSelected = selectedTone === tone.key;
                return (
                  <TouchableOpacity
                    key={tone.key}
                    onPress={() => {
                      if (Platform.OS !== "web") {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                      setSelectedTone(tone.key);
                    }}
                    className={`px-4 py-2.5 rounded-full border ${
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border bg-surface"
                    }`}
                    activeOpacity={0.7}
                  >
                    <Text
                      className={`font-medium ${
                        isSelected ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {tone.emoji} {tone.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Image Generation Toggle */}
          <View className="px-6 mt-6">
            <TouchableOpacity
              onPress={() => {
                if (Platform.OS !== "web") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                setIncludeImage(!includeImage);
              }}
              className={`flex-row items-center justify-between p-4 rounded-xl border ${
                includeImage ? "border-primary bg-primary/10" : "border-border bg-surface"
              }`}
              activeOpacity={0.7}
            >
              <View className="flex-row items-center gap-3">
                <View
                  className={`w-10 h-10 rounded-lg items-center justify-center ${
                    includeImage ? "bg-primary" : "bg-muted/20"
                  }`}
                >
                  <IconSymbol
                    name="photo.fill"
                    size={20}
                    color={includeImage ? "#FFFFFF" : colors.muted}
                  />
                </View>
                <View>
                  <Text className="text-foreground font-medium">
                    Generate Image
                  </Text>
                  <Text className="text-muted text-sm">
                    Create an AI image for your post
                  </Text>
                </View>
              </View>
              <View
                className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                  includeImage ? "bg-primary border-primary" : "border-border"
                }`}
              >
                {includeImage && (
                  <IconSymbol name="checkmark" size={14} color="#FFFFFF" />
                )}
              </View>
            </TouchableOpacity>

            {/* Image Style Input */}
            {includeImage && (
              <View className="mt-3">
                <TextInput
                  value={imageStyle}
                  onChangeText={setImageStyle}
                  placeholder="Image style (e.g., modern, minimalist, vibrant...)"
                  placeholderTextColor={colors.muted}
                  className="bg-surface rounded-xl border border-border p-4 text-foreground"
                />
              </View>
            )}
          </View>

          {/* Generate Button */}
          <View className="px-6 mt-8">
            <TouchableOpacity
              onPress={handleGenerate}
              disabled={isGenerating || !topic.trim() || selectedPlatforms.length === 0}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={
                  isGenerating || !topic.trim() || selectedPlatforms.length === 0
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
                {isGenerating ? (
                  <>
                    <ActivityIndicator color="#FFFFFF" />
                    <Text className="text-white font-semibold text-lg">
                      Generating...
                    </Text>
                  </>
                ) : (
                  <>
                    <IconSymbol name="sparkles" size={24} color="#FFFFFF" />
                    <Text className="text-white font-semibold text-lg">
                      Generate Content
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Info */}
          <View className="px-6 mt-4">
            <Text className="text-muted text-xs text-center">
              Content will be generated using AI and saved as a draft for your review
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
