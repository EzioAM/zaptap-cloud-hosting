# Developer Guide - Zaptap Mobile Automation App

## 📱 Accessing the Developer Menu

### Starting the App
```bash
npm start
```

### Opening on Device/Simulator
- **iOS**: `npm run ios` or scan QR code
- **Android**: `npm run android` or scan QR code

### Finding the Developer Button
- Located on the **Home Screen**
- Only visible to authorized developers (`marcminott@gmail.com`)
- Tap to access the Developer Menu

### Developer Menu Features
- **Research Tools**: AI-powered research integration
- **Analytics**: App performance metrics
- **Database Tools**: Supabase management
- **Testing Tools**: API testing and debugging

## 💻 Terminal-Based Development

### File Operations
```bash
# Create new components
mkdir src/components/newFeature
touch src/components/newFeature/NewComponent.tsx

# Edit files with preferred editor
code src/components/home/HomeScreen.tsx
vim src/services/auth/AuthService.ts
```

### Development Commands
```bash
# Start development server
npm start

# Platform-specific runs
npm run ios
npm run android
npm run web

# Build commands
npm run build:ios
npm run build:android
```

### AI Research Integration
```bash
# General research
npm run research "topic to research"

# Specific research areas
npm run research:performance
npm run research:nfc
npm run research:ux

# Automated weekly reports
npm run research:weekly
```

### Database Management
```bash
# Setup Supabase roles
npm run supabase:setup
npm run supabase:verify
npm run supabase:grant user@email.com
npm run supabase:list
```

## 🤖 AI Research Workflow

### Step 1: Research Generation
```bash
npm run research "new feature ideas"
```
**Output**: Generates both Claude and ChatGPT insights in:
- JSON: `/docs/research/research-results/new-feature-ideas-[timestamp].json`
- Markdown: `/docs/research/research-results/new-feature-ideas-[timestamp].md`

### Step 2: Research Analysis & Comparison
To analyze research results and get actionable recommendations:

```bash
# Analyze specific research file
node scripts/analyze-research.js docs/research/research-results/new-feature-ideas-1754147618066.json

# Compare multiple research sessions
node scripts/compare-research.js docs/research/research-results/topic1.json docs/research/research-results/topic2.json

# Get implementation recommendations
node scripts/implementation-recommendations.js docs/research/research-results/new-feature-ideas-1754147618066.json
```

### Step 3: Implementation Planning
The analysis tools will output:
- **Priority Rankings**: High/Medium/Low priority features
- **Implementation Complexity**: Technical difficulty assessment
- **Resource Requirements**: Time and skill estimates
- **Step-by-Step Plans**: Actionable development tasks
- **Code Templates**: Starter code for recommended features

### Step 4: Automated Implementation
```bash
# Generate component scaffolding from research
node scripts/auto-implement.js docs/research/research-results/new-feature-ideas-1754147618066.json --priority="high"

# Analyze research results first
node scripts/analyze-research.js docs/research/research-results/new-feature-ideas-1754147618066.json

# Implement from analysis
node scripts/auto-implement.js analysis-results/analysis-new-feature-ideas-[timestamp].json --priority="high"
```

### Step 5: UI/UX Redesign (NEW!)
```bash
# Generate complete UI redesign with mockups
npm run redesign HomeScreen "current basic design" modern accessible

# Quick redesigns for common screens
npm run redesign:home
npm run redesign:profile  
npm run redesign:settings

# Implement the redesigned components
npm run implement:redesign ui-redesign-results/homescreen-redesign-[timestamp]
```

## 📊 Research Analysis Tools

### Research Analyzer (`scripts/analyze-research.js`)
- Compares Claude vs ChatGPT recommendations
- Identifies consensus vs unique insights
- Ranks suggestions by feasibility and impact
- Generates implementation roadmap

### Implementation Planner (`scripts/implementation-recommendations.js`)
- Creates detailed development tasks
- Estimates development time
- Identifies required dependencies
- Generates code scaffolding

### Auto-Implementation (`scripts/auto-implement.js`)
- Automatically creates files and components
- Generates boilerplate code
- Updates navigation and routing
- Adds necessary imports and dependencies

## 🛠️ Development Workflow

### 1. Research Phase
```bash
npm run research "mobile automation trends 2025"
```

### 2. Analysis Phase
```bash
node scripts/analyze-research.js docs/research/research-results/mobile-automation-trends-2025-[timestamp].json
```

### 3. Planning Phase
```bash
node scripts/implementation-recommendations.js docs/research/research-results/mobile-automation-trends-2025-[timestamp].json
```

### 4. Implementation Phase
```bash
node scripts/auto-implement.js --research-file="docs/research/research-results/.../mobile-automation-trends-2025-[timestamp].json" --priority="high"
```

### 5. Testing Phase
```bash
npm start
# Test new features in developer menu
```

## 📁 File Structure

```
ShortcutsLike/
├── src/
│   ├── components/         # React Native components
│   ├── screens/           # App screens
│   ├── services/          # Business logic services
│   └── navigation/        # Navigation configuration
├── scripts/
│   ├── research-automation.js       # AI research tool
│   ├── analyze-research.js          # Research analysis
│   ├── implementation-recommendations.js
│   └── auto-implement.js            # Automated implementation
├── docs/
│   ├── development/       # Development documentation
│   ├── database/          # Database SQL files
│   └── research/          # Research results and reports
└── scripts/               # Automation scripts
```

## 🔑 Environment Setup

Ensure your `.env` file contains:
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
CLAUDE_API_KEY=sk-ant-api03-...
OPENAI_API_KEY=sk-proj-...
```

## 🚀 Quick Start Workflow

1. **Research**: `npm run research "feature idea"`
2. **Analyze**: `node scripts/analyze-research.js [result-file]`
3. **Implement**: `node scripts/auto-implement.js --research-file=[file] --priority=high`
4. **Test**: `npm start` → Developer Menu → Test new features
5. **Deploy**: `npm run deploy:build` or `npm run deploy:update`

## 📱 Deployment & Preview Access

### EAS Build & Update (Recommended)
```bash
# Test deployment readiness
npm run deploy:test

# Build new preview with all AI features
npm run deploy:build

# Update existing preview build
npm run deploy:update

# Quick update to preview channel
npm run update:preview
```

### Manual EAS Commands
```bash
# Build for different platforms
npm run build:preview:ios      # iOS only
npm run build:preview:android  # Android only  
npm run build:preview          # Both platforms

# Update existing builds
eas update --branch preview --message "New AI features"
eas update --branch development --message "Development update"
```

### Access Your Preview Build
1. **First time**: Run `npm run deploy:build` and install the generated .ipa/.apk
2. **Updates**: Run `npm run deploy:update` - app will auto-update
3. **Check builds**: `eas build:list` to see all your builds

## 🎨 UI/UX Redesign Workflow (NEW!)

### ChatGPT + DALL-E Visual Design
1. **Design Concepts**: ChatGPT generates comprehensive UX/UI specifications
2. **Visual Mockups**: DALL-E creates HD mobile app mockups (1024x1792)
3. **Multiple Variants**: Day/night mode, different states, interactions

### Claude Implementation
1. **Technical Analysis**: Claude analyzes designs and creates implementation plans
2. **Component Generation**: Complete React Native TypeScript components
3. **Production Ready**: Includes styles, types, hooks, error handling

### Example Workflow
```bash
# Step 1: Generate redesign
npm run redesign HomeScreen "current basic design" modern dark-mode accessible

# Step 2: Review generated mockups and plans
open ui-redesign-results/homescreen-redesign-[timestamp]/

# Step 3: Implement the design
npm run implement:redesign ui-redesign-results/homescreen-redesign-[timestamp]

# Step 4: Test in app
npm start  # Developer Menu → HomeScreen (Redesigned)
```

## 📋 Common Commands Reference

| Command | Purpose |
|---------|---------|
| `npm start` | Start development server |
| `npm run research "topic"` | AI research on topic |
| `npm run analyze [file]` | Analyze research results |
| `npm run implement [file]` | Auto-implement features |
| `npm run redesign [screen]` | Generate UI redesign with mockups |
| `npm run implement:redesign [dir]` | Implement redesigned components |
| `npm run deploy:build` | Build preview with AI features |
| `npm run deploy:update` | Update preview build |
| `npm run deploy:test` | Test deployment readiness |
| `npm run supabase:setup` | Setup database roles |
| `npm run ios` | Run on iOS |
| `npm run android` | Run on Android |

---

*This guide provides a complete workflow for AI-powered development of the Zaptap mobile automation platform.*