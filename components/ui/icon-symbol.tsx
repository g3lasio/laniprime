// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * LaniPrime Icon Mappings
 * SF Symbols to Material Icons mappings for cross-platform consistency
 */
const MAPPING = {
  // Tab bar icons
  "house.fill": "home",
  "doc.text.fill": "description",
  "calendar": "event",
  "gearshape.fill": "settings",
  
  // Navigation
  "chevron.left": "chevron-left",
  "chevron.right": "chevron-right",
  "chevron.down": "expand-more",
  "chevron.up": "expand-less",
  "xmark": "close",
  "xmark.circle.fill": "cancel",
  
  // Actions
  "plus": "add",
  "plus.circle.fill": "add-circle",
  "pencil": "edit",
  "trash.fill": "delete",
  "checkmark": "check",
  "checkmark.circle.fill": "check-circle",
  "arrow.clockwise": "refresh",
  "square.and.arrow.up": "share",
  
  // Content
  "sparkles": "auto-awesome",
  "wand.and.stars": "auto-fix-high",
  "photo.fill": "image",
  "video.fill": "videocam",
  "doc.fill": "article",
  "link": "link",
  
  // Status
  "clock.fill": "schedule",
  "exclamationmark.triangle.fill": "warning",
  "exclamationmark.circle.fill": "error",
  "info.circle.fill": "info",
  "bell.fill": "notifications",
  
  // Social platforms
  "globe": "public",
  "person.fill": "person",
  "person.2.fill": "people",
  "building.2.fill": "business",
  
  // Misc
  "magnifyingglass": "search",
  "line.3.horizontal.decrease": "filter-list",
  "slider.horizontal.3": "tune",
  "chart.bar.fill": "bar-chart",
  "creditcard.fill": "credit-card",
  "dollarsign.circle.fill": "attach-money",
  "bolt.fill": "bolt",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "eye.fill": "visibility",
  "eye.slash.fill": "visibility-off",
  "lock.fill": "lock",
  "phone.fill": "phone",
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}

export type { IconSymbolName };
