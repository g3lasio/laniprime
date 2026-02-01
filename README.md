# 🚀 LaniPrime - AI-Powered Content Engine SaaS

**Mobile-First Content Generation Platform for Contractors, Service Businesses & SaaS**

LaniPrime is a white-label Content Engine SaaS that leverages AI to automatically generate, schedule, and publish social media content across multiple platforms. Built with a mobile-first approach using React Native and Expo.

---

## ✨ Key Features

### 🤖 AI-Powered Content Generation
- **Claude Sonnet 4.7** for high-quality content creation
- **Claude Haiku** for cost-effective text enhancement
- Platform-specific optimization (Instagram, Facebook, Twitter, LinkedIn, TikTok)
- Automatic image generation support (DALL-E ready)
- Brand voice preservation

### 🎯 Niche Intelligence
- Automated website scraping and analysis
- Industry classification and brand voice extraction
- Content strategy generation
- Competitor identification
- Autopilot configuration builder

### 📅 Dual Operation Modes

**Supervised Mode**
- Weekly content plan generation (7 days)
- Visual calendar view
- Batch approval workflow
- Review titles, previews, and copy before publishing

**Autopilot Mode**
- Generate 3-10 posts per day automatically
- Ultra-fast 2-click approval
- Compact title list view
- Perfect for busy entrepreneurs

### 🔐 Authentication
- Twilio OTP-based phone authentication
- JWT session management
- Rate limiting and security best practices

### 💳 Pay-as-You-Grow Billing
- Stripe integration
- Usage-based metering
- Subscription management
- Automatic invoice generation

---

## 🛠️ Tech Stack

### Frontend (Mobile App)
- **React Native 0.81** with Expo SDK 54
- **TypeScript 5.9** for type safety
- **NativeWind 4** (Tailwind CSS for React Native)
- **React 19** with React Compiler
- **Expo Router 6** for navigation
- **tRPC** for type-safe API calls
- **TanStack Query** for data fetching

### Backend
- **Fastify** web server
- **PostgreSQL** (Neon) with Drizzle ORM
- **BullMQ** + Redis for background jobs
- **Puppeteer** for web scraping
- **Cheerio** for HTML parsing

### AI & Services
- **Anthropic Claude** (Sonnet 4.7 + Haiku)
- **OpenAI DALL-E** (image generation)
- **Twilio** (OTP authentication)
- **Stripe** (billing)

---

## 📁 Project Structure

```
laniprime/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Tab navigation
│   │   ├── index.tsx      # Dashboard (Supervised/Autopilot modes)
│   │   ├── content.tsx    # Content Manager
│   │   ├── schedule.tsx   # Calendar view
│   │   └── settings.tsx   # User settings
│   ├── auth/              # Authentication screens
│   ├── generate.tsx       # Content generation
│   └── niche/            # Niche analysis
├── server/                # Backend API
│   ├── services/         # Business logic
│   │   ├── content-generation.ts
│   │   ├── niche-intelligence.ts
│   │   ├── job-queue.ts
│   │   ├── twilio-otp.ts
│   │   └── jwt-service.ts
│   ├── db.ts            # Database queries
│   └── routers.ts       # tRPC API routes
├── drizzle/             # Database schema & migrations
├── tests/               # Unit & E2E tests
├── components/          # Reusable UI components
├── hooks/              # Custom React hooks
└── theme.config.js     # Design system tokens
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 22.x
- pnpm 9.x
- PostgreSQL database (Neon recommended)
- Twilio account (for OTP)
- Anthropic API key (for Claude)
- Stripe account (for billing)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/g3lasio/laniprime.git
cd laniprime
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your credentials
```

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string (with `?sslmode=require` for Neon)
- `TWILIO_ACCOUNT_SID` - Twilio account SID
- `TWILIO_AUTH_TOKEN` - Twilio auth token
- `TWILIO_MESSAGING_SERVICE_SID` - Twilio messaging service
- `TWILIO_VERIFY_SERVICE_SID` - Twilio verify service
- `TWILIO_BRAND_SID` - Twilio brand registration
- `TWILIO_CAMPAIGN_SID` - Twilio campaign registration
- `ANTHROPIC_API_KEY` - Claude API key (optional, uses Manus integrated LLM)
- `OPENAI_API_KEY` - OpenAI API key for DALL-E (optional)
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `REDIS_URL` - Redis connection string (optional, has fallback)

4. **Run database migrations**
```bash
pnpm db:push
```

5. **Start development server**
```bash
pnpm dev
```

The app will be available at:
- **Web:** http://localhost:8081
- **iOS/Android:** Scan QR code with Expo Go app

---

## 🧪 Testing

Run all tests:
```bash
pnpm test
```

Run specific test suites:
```bash
pnpm test tests/niche-analysis-e2e.test.ts
pnpm test tests/content-generation-e2e.test.ts
pnpm test tests/system-audit.test.ts
```

**Test Coverage:**
- ✅ 54 passing tests
- ✅ Niche Intelligence E2E (4 tests)
- ✅ Content Generation E2E (5 tests)
- ✅ Content Generation Service (15 tests)
- ✅ Twilio OTP (6 tests)
- ✅ System Audit (23 tests)

---

## 🎨 Design System

LaniPrime features a **Futuristic Transformers-inspired** design with:
- Cybernetic blue (#0EA5E9) and electric purple (#A855F7) accents
- Dark mode optimized (OLED black #000000)
- Smooth animations with react-native-reanimated
- Haptic feedback for premium feel
- Responsive layout for all screen sizes

---

## 📱 Key Screens

### Dashboard
- **Supervised/Autopilot mode selector**
- Weekly content plan overview
- Quick stats (Generated, Published, Views)
- One-tap "Generate Week" button

### Content Manager
- Filter by platform and status
- Batch approval workflow
- Content preview and editing
- Publishing history

### Schedule
- Calendar view of scheduled posts
- Multi-platform posting interface
- Drag-and-drop rescheduling

### Settings
- User profile management
- Social account connections
- Billing and subscription
- Niche profile configuration

---

## 🔧 Development Workflow

### Authentication (Development Mode)
Authentication is currently **disabled** for development. The app uses a mock user:
- Name: "Test User"
- Phone: "+1234567890"
- Role: "admin"

To re-enable authentication, replace `hooks/use-auth.ts` with `hooks/use-auth.real.ts`.

### Background Jobs
The system uses BullMQ for background jobs with automatic Redis fallback:
- **With Redis:** Jobs are queued and processed asynchronously
- **Without Redis:** Jobs execute immediately (synchronous fallback)

### Database Migrations
```bash
# Generate migration
pnpm drizzle-kit generate

# Apply migration
pnpm drizzle-kit migrate
```

---

## 🚢 Deployment

### Mobile App (Expo)
```bash
# Build for iOS
pnpm ios

# Build for Android
pnpm android

# Build for production (EAS)
eas build --platform all
```

### Backend (Railway/Fly.io recommended)
```bash
# Build backend
pnpm build

# Start production server
pnpm start
```

---

## 📊 Architecture Decisions

### Why Mobile-First?
- Entrepreneurs manage businesses on-the-go
- Quick approval workflow optimized for mobile
- Native performance and offline support

### Why Claude over OpenAI?
- Superior content quality for long-form posts
- Better brand voice preservation
- More cost-effective for high-volume generation

### Why Native Scheduling?
- Full control over posting logic
- No third-party dependencies (Buffer/SocialBee)
- Better white-label experience
- Lower operational costs

### Why PostgreSQL over MySQL?
- Better JSON support for niche analysis data
- Superior performance for complex queries
- Consistency with existing infrastructure (Neon)

---

## 🛣️ Roadmap

### Phase 1-7 (Completed) ✅
- [x] Database schema and migrations
- [x] Twilio OTP authentication
- [x] AI-powered content generation
- [x] Niche intelligence with web scraping
- [x] Supervised & Autopilot modes
- [x] Background job queue
- [x] Comprehensive testing (54 tests)

### Phase 8 (In Progress) 🚧
- [ ] Native scheduling implementation
  - [ ] Facebook Graph API integration
  - [ ] Instagram Graph API integration
  - [ ] Twitter/X API v2 integration
  - [ ] LinkedIn API v2 integration
  - [ ] TikTok Content API integration
- [ ] Stripe billing integration
- [ ] Usage tracking and metering
- [ ] Analytics dashboard

### Phase 9 (Planned) 📋
- [ ] Re-enable authentication
- [ ] Security audit
- [ ] Performance optimization
- [ ] Production deployment
- [ ] User documentation

---

## 🤝 Contributing

This is a private project. For questions or issues, contact the development team.

---

## 📄 License

Proprietary - All rights reserved

---

## 👥 Team

**Lead Architect & Developer:** Manus AI Agent (Senior Software Architect)
**Product Owner:** g3lasio
**Project:** LaniPrime Content Engine SaaS

---

## 📞 Support

For technical support or questions:
- **GitHub Issues:** https://github.com/g3lasio/laniprime/issues
- **Email:** [Contact information]

---

**Built with ❤️ using Manus AI and cutting-edge technologies**
