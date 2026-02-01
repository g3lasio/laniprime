import { useState, useRef } from "react";
import {
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

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

type Step = "phone" | "otp";

export default function PhoneAuthScreen() {
  const colors = useColors();
  const [step, setStep] = useState<Step>("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const otpInputRefs = useRef<(TextInput | null)[]>([]);

  const requestOtpMutation = trpc.auth.requestOtp.useMutation();
  const verifyOtpMutation = trpc.auth.verifyOtp.useMutation();

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, "");
    
    // Format as (XXX) XXX-XXXX
    if (digits.length <= 3) {
      return digits;
    } else if (digits.length <= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (value: string) => {
    setPhoneNumber(formatPhoneNumber(value));
  };

  const getRawPhoneNumber = () => {
    return "+1" + phoneNumber.replace(/\D/g, "");
  };

  const handleRequestOtp = async () => {
    const rawPhone = getRawPhoneNumber();
    if (rawPhone.length < 12) {
      Alert.alert("Invalid Phone", "Please enter a valid 10-digit phone number");
      return;
    }

    setIsLoading(true);
    try {
      const result = await requestOtpMutation.mutateAsync({ phoneNumber: rawPhone });
      if (result.success) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setStep("otp");
      } else {
        Alert.alert("Error", result.error || "Failed to send verification code");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to send verification code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, "").slice(0, 6);
      const newOtp = [...otpCode];
      for (let i = 0; i < digits.length; i++) {
        if (index + i < 6) {
          newOtp[index + i] = digits[i];
        }
      }
      setOtpCode(newOtp);
      const nextIndex = Math.min(index + digits.length, 5);
      otpInputRefs.current[nextIndex]?.focus();
    } else {
      const newOtp = [...otpCode];
      newOtp[index] = value;
      setOtpCode(newOtp);
      
      if (value && index < 5) {
        otpInputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleOtpKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && !otpCode[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const code = otpCode.join("");
    if (code.length !== 6) {
      Alert.alert("Invalid Code", "Please enter the 6-digit verification code");
      return;
    }

    setIsLoading(true);
    try {
      const result = await verifyOtpMutation.mutateAsync({
        phoneNumber: getRawPhoneNumber(),
        code,
      });

      if (result.success) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        router.replace("/" as any);
      } else {
        Alert.alert("Error", result.error || "Invalid verification code");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to verify code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    try {
      await requestOtpMutation.mutateAsync({ phoneNumber: getRawPhoneNumber() });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert("Code Sent", "A new verification code has been sent");
    } catch (error) {
      Alert.alert("Error", "Failed to resend code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 px-6 pt-4">
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => (step === "otp" ? setStep("phone") : router.back())}
            className="w-10 h-10 rounded-full bg-surface border border-border items-center justify-center mb-8"
          >
            <IconSymbol name="chevron.left" size={20} color={colors.foreground} />
          </TouchableOpacity>

          {/* Header */}
          <View className="mb-8">
            <Text className="text-3xl font-bold text-foreground mb-2">
              {step === "phone" ? "Enter your phone" : "Verify your phone"}
            </Text>
            <Text className="text-muted text-base">
              {step === "phone"
                ? "We'll send you a verification code"
                : `Enter the code sent to ${phoneNumber}`}
            </Text>
          </View>

          {step === "phone" ? (
            /* Phone Input */
            <View className="mb-6">
              <View className="flex-row items-center bg-surface rounded-xl border border-border px-4 py-3">
                <Text className="text-foreground text-lg mr-2">🇺🇸 +1</Text>
                <TextInput
                  value={phoneNumber}
                  onChangeText={handlePhoneChange}
                  placeholder="(555) 123-4567"
                  placeholderTextColor={colors.muted}
                  keyboardType="phone-pad"
                  maxLength={14}
                  className="flex-1 text-foreground text-lg"
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleRequestOtp}
                />
              </View>
            </View>
          ) : (
            /* OTP Input */
            <View className="mb-6">
              <View className="flex-row justify-between gap-2">
                {otpCode.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => { otpInputRefs.current[index] = ref; }}
                    value={digit}
                    onChangeText={(value) => handleOtpChange(value, index)}
                    onKeyPress={({ nativeEvent }) =>
                      handleOtpKeyPress(nativeEvent.key, index)
                    }
                    keyboardType="number-pad"
                    maxLength={6}
                    className="flex-1 aspect-square bg-surface rounded-xl border border-border text-foreground text-2xl font-bold text-center"
                    autoFocus={index === 0}
                  />
                ))}
              </View>

              <TouchableOpacity
                onPress={handleResendOtp}
                disabled={isLoading}
                className="mt-4"
              >
                <Text className="text-primary text-center">
                  Didn't receive the code? Resend
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            onPress={step === "phone" ? handleRequestOtp : handleVerifyOtp}
            disabled={isLoading}
            className="bg-primary rounded-xl py-4 items-center"
            style={{ opacity: isLoading ? 0.7 : 1 }}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-background font-semibold text-lg">
                {step === "phone" ? "Send Code" : "Verify"}
              </Text>
            )}
          </TouchableOpacity>

          {/* Terms */}
          <Text className="text-muted text-xs text-center mt-6">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
