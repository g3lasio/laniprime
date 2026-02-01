# LaniPrime - Mobile App Design Specification

**Design Philosophy:** Futuristic Transformers-inspired aesthetic with clean, professional execution. The design should feel powerful and cutting-edge while maintaining usability and clarity.

---

## Color Palette

### Primary Colors (Transformers-Inspired)
| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `primary` | #0066FF | #00A3FF | Main accent, CTAs, active states |
| `secondary` | #6B4EFF | #8B6FFF | Secondary actions, highlights |
| `accent` | #00D4FF | #00E5FF | Glowing effects, progress indicators |

### Background & Surface
| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `background` | #F8FAFC | #0A0E14 | Main app background |
| `surface` | #FFFFFF | #141B24 | Cards, elevated surfaces |
| `surfaceAlt` | #F1F5F9 | #1A2332 | Secondary surfaces |

### Text & UI
| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `foreground` | #0F172A | #F1F5F9 | Primary text |
| `muted` | #64748B | #94A3B8 | Secondary text |
| `border` | #E2E8F0 | #2D3A4D | Borders, dividers |

### Status Colors
| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `success` | #10B981 | #34D399 | Success states, published |
| `warning` | #F59E0B | #FBBF24 | Warnings, pending |
| `error` | #EF4444 | #F87171 | Errors, failed |

### Gradient Effects (Transformers Signature)
- **Primary Gradient:** `linear-gradient(135deg, #0066FF 0%, #00D4FF 100%)`
- **Accent Gradient:** `linear-gradient(135deg, #6B4EFF 0%, #00D4FF 100%)`
- **Metallic Gradient:** `linear-gradient(180deg, #1A2332 0%, #0A0E14 100%)`

---

## Screen List

### Authentication Flow
1. **Welcome Screen** - App intro with logo animation
2. **Phone Input Screen** - Enter phone number for OTP
3. **OTP Verification Screen** - Enter 6-digit code

### Main App (Tab Navigation)
4. **Dashboard (Home)** - Usage stats, quick actions, recent activity
5. **Content Manager** - Generate, approve, manage content
6. **Schedule** - Calendar view, scheduled posts, publishing queue
7. **Settings** - Profile, niche config, social accounts, billing

### Modal/Detail Screens
8. **Content Generation** - AI content creation interface
9. **Content Preview** - Full preview with edit options
10. **Niche Setup** - Website analysis, brand configuration
11. **Social Account Connection** - OAuth flow per platform
12. **Subscription Management** - Plans, usage, billing

---

## Primary Content and Functionality

### Dashboard Screen
**Content:**
- Welcome header with user name
- Usage statistics cards (posts generated, published, remaining)
- Quick action buttons (Generate Content, Schedule Post)
- Recent activity feed (last 5 posts with status)
- Subscription status badge

**Functionality:**
- Pull-to-refresh for stats update
- Tap quick actions to navigate
- Tap activity items for detail view

### Content Manager Screen
**Content:**
- Filter tabs: All | Drafts | Pending | Approved | Published
- Content cards with thumbnail, text preview, platform icons
- Batch selection mode toggle
- Empty state with "Generate First Content" CTA

**Functionality:**
- Generate new content (AI-powered)
- Approve/reject pending content
- Edit content before publishing
- Delete content
- Batch approve multiple items

### Schedule Screen
**Content:**
- Calendar month view with dots for scheduled posts
- Day detail view with time slots
- Upcoming posts list (next 7 days)
- Platform filter pills

**Functionality:**
- Tap date to see scheduled posts
- Drag to reschedule (future enhancement)
- Cancel scheduled posts
- View publishing status

### Settings Screen
**Content:**
- Profile section (name, phone, avatar)
- Niche Intelligence section (website, industry, brand voice)
- Connected Accounts section (social platforms)
- Subscription section (plan, usage, billing)
- App preferences (notifications, theme)

**Functionality:**
- Edit profile
- Configure niche/autopilot settings
- Connect/disconnect social accounts
- Manage subscription
- Toggle preferences

---

## Key User Flows

### Flow 1: First-Time Setup
1. Welcome Screen → Tap "Get Started"
2. Phone Input → Enter phone number → Tap "Send Code"
3. OTP Verification → Enter 6-digit code → Tap "Verify"
4. Niche Setup (optional) → Enter website URL → Tap "Analyze"
5. Dashboard → View onboarding tips

### Flow 2: Generate Content (Supervised Mode)
1. Dashboard → Tap "Generate Content"
2. Content Generation → Select platform(s) → Enter topic/prompt
3. AI generates content → Preview appears
4. Content Preview → Edit if needed → Tap "Approve"
5. Schedule → Select date/time → Tap "Schedule"
6. Confirmation → Return to Dashboard

### Flow 3: Batch Approval
1. Content Manager → Tap "Select" toggle
2. Select multiple pending items
3. Tap "Approve All" or "Reject All"
4. Confirmation modal → Confirm action
5. Items move to appropriate status

### Flow 4: Connect Social Account
1. Settings → Connected Accounts → Tap "Add Account"
2. Select platform (Facebook, Instagram, etc.)
3. OAuth flow opens in browser
4. Authorize permissions
5. Return to app → Account connected
6. Confirmation with account name/avatar

### Flow 5: Autopilot Configuration
1. Settings → Niche Intelligence → Tap "Configure Autopilot"
2. Enter website URL (if not set)
3. AI analyzes website → Shows extracted data
4. Review: Industry, Brand Voice, Target Audience
5. Adjust content frequency (3-5 posts/day)
6. Tap "Enable Autopilot"
7. Confirmation → Autopilot active badge

---

## Component Specifications

### Button Styles
**Primary Button:**
- Background: Primary gradient
- Text: White, 16px, semibold
- Height: 52px
- Border radius: 12px
- Shadow: 0 4px 12px rgba(0, 102, 255, 0.3)
- Press state: Scale 0.97, opacity 0.9

**Secondary Button:**
- Background: Surface
- Border: 1px solid border color
- Text: Foreground, 16px, medium
- Height: 48px
- Border radius: 10px

**Ghost Button:**
- Background: Transparent
- Text: Primary, 16px, medium
- Press state: Opacity 0.7

### Card Styles
**Content Card:**
- Background: Surface
- Border radius: 16px
- Padding: 16px
- Shadow: 0 2px 8px rgba(0, 0, 0, 0.08)
- Border: 1px solid border (subtle)

**Stats Card:**
- Background: Gradient overlay on surface
- Border radius: 20px
- Padding: 20px
- Glow effect on hover/press

### Input Styles
**Text Input:**
- Background: Surface
- Border: 1px solid border
- Border radius: 12px
- Height: 52px
- Padding: 16px
- Focus: Border color primary, subtle glow

**OTP Input:**
- 6 separate boxes
- Size: 52x52px each
- Border radius: 12px
- Auto-advance on input
- Paste support for full code

### Navigation
**Tab Bar:**
- Background: Surface with blur
- Height: 56px + safe area
- Icons: 28px, SF Symbols style
- Active: Primary color
- Inactive: Muted color
- Labels: 10px, medium

**Header:**
- Background: Transparent or surface
- Title: 18px, semibold, center
- Back button: Chevron left, primary
- Action buttons: Right side

---

## Animation Guidelines

### Transitions
- Screen transitions: 300ms ease-out
- Modal present: 350ms spring
- Tab switch: 200ms ease

### Micro-interactions
- Button press: 80ms scale to 0.97
- Card press: 100ms opacity to 0.8
- Toggle switch: 200ms spring
- Success checkmark: 400ms with bounce

### Loading States
- Skeleton loading for content cards
- Spinner for quick actions (primary color)
- Progress bar for content generation (gradient animated)

### Special Effects (Transformers Theme)
- Subtle glow on primary buttons
- Gradient shimmer on loading states
- Particle effect on success (subtle)
- Metallic reflection on cards (dark mode)

---

## Typography

### Font Family
- Primary: System font (SF Pro on iOS, Roboto on Android)
- Monospace: SF Mono / Roboto Mono (for codes)

### Scale
| Style | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| H1 | 32px | Bold | 40px | Screen titles |
| H2 | 24px | Semibold | 32px | Section headers |
| H3 | 20px | Semibold | 28px | Card titles |
| Body | 16px | Regular | 24px | Main text |
| Body Small | 14px | Regular | 20px | Secondary text |
| Caption | 12px | Medium | 16px | Labels, hints |
| Button | 16px | Semibold | 24px | Button text |

---

## Iconography

### Style
- SF Symbols on iOS, Material Icons fallback
- Stroke weight: Medium (2px)
- Size: 24px default, 28px for tab bar

### Key Icons
| Function | SF Symbol | Material Icon |
|----------|-----------|---------------|
| Home | house.fill | home |
| Content | doc.text.fill | description |
| Schedule | calendar | event |
| Settings | gearshape.fill | settings |
| Generate | sparkles | auto_awesome |
| Approve | checkmark.circle.fill | check_circle |
| Reject | xmark.circle.fill | cancel |
| Edit | pencil | edit |
| Delete | trash.fill | delete |
| Add | plus.circle.fill | add_circle |
| Platform | (platform-specific) | (platform-specific) |

---

## Platform-Specific Icons

### Social Platforms
- Facebook: Official F logo
- Instagram: Official gradient camera
- Twitter/X: X logo
- LinkedIn: Official "in" logo
- TikTok: Official note logo

### Status Indicators
- Scheduled: Clock icon, warning color
- Publishing: Spinner, primary color
- Published: Checkmark, success color
- Failed: X mark, error color
- Draft: Pencil, muted color

---

## Responsive Considerations

### Portrait Orientation (Primary)
- All screens optimized for 9:16 ratio
- One-handed usage priority
- Bottom navigation for easy thumb reach
- Important actions in lower 2/3 of screen

### Safe Areas
- Top: Status bar + notch
- Bottom: Home indicator + tab bar
- Sides: Minimum 16px padding

### Accessibility
- Minimum touch target: 44x44px
- Color contrast: WCAG AA minimum
- Support for Dynamic Type (iOS)
- VoiceOver/TalkBack labels

---

## Dark Mode Optimizations

### Surfaces
- Use elevation to indicate hierarchy
- Higher surfaces = slightly lighter
- Subtle borders for definition

### Colors
- Reduce saturation slightly for comfort
- Increase contrast for readability
- Glow effects more prominent

### Images
- Dim user-uploaded images slightly
- Platform icons maintain original colors
- Generated content previews at full brightness
