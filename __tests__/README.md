# ShortcutsLike Test Suite

This comprehensive test suite covers all critical aspects of the ShortcutsLike mobile automation platform, ensuring high quality, performance, and accessibility across all platforms.

## 🏗️ Test Architecture

### Test Categories

#### 1. **Unit Tests** (`/components/`, `/hooks/`, `/services/`)
- **Components**: Dashboard widgets, atoms, molecules, organisms
- **Hooks**: Custom React hooks like `useHaptic`, `useAuth`  
- **Services**: API services, authentication, offline functionality
- **Utilities**: Helper functions, data transformers, validators

#### 2. **Integration Tests** (`/integration/`)
- **Navigation Flows**: Screen-to-screen navigation testing
- **Authentication**: Complete auth flow including persistence
- **API Integration**: Real API calls with proper error handling
- **Offline Sync**: Data synchronization when connectivity returns

#### 3. **Visual/Snapshot Tests** (`/snapshots/`)
- **Component Snapshots**: Visual regression testing
- **Platform Variations**: iOS, Android, Web-specific renderings
- **Theme Variations**: Light/dark theme compatibility
- **Animation States**: Different animation phases
- **Responsive Layouts**: Mobile, tablet, desktop breakpoints

#### 4. **Performance Tests** (`/performance/`)
- **Render Performance**: 60fps rendering requirements
- **Animation Performance**: Smooth 60fps animations
- **Memory Management**: Memory leak detection
- **Bundle Size**: Component size optimization
- **Load Time**: Initial render and navigation performance

#### 5. **Accessibility Tests** (`/accessibility/`)
- **Screen Reader Support**: VoiceOver, TalkBack compatibility
- **Keyboard Navigation**: Tab order and focus management
- **Color Contrast**: WCAG AA compliance
- **Hit Area Size**: Minimum 44x44pt interactive elements
- **Platform Accessibility**: iOS, Android, Web standards

### Test Utilities

#### Core Utilities (`/utils/`)

1. **`testHelpers.ts`** - General testing utilities
   - Mock data factories
   - Network simulation
   - Platform mocking
   - Error testing helpers

2. **`renderWithProviders.tsx`** - React testing utilities
   - Redux store wrapper
   - Navigation container wrapper
   - Theme provider wrapper
   - Combined provider wrapper

3. **`performanceHelpers.ts`** - Performance testing utilities
   - Render time measurement
   - Animation performance testing
   - Memory usage tracking
   - Bundle size analysis

4. **`accessibilityHelpers.ts`** - Accessibility testing utilities
   - Screen reader testing
   - Keyboard navigation testing
   - Color contrast validation
   - WCAG compliance checking

5. **`testConfig.ts`** - Centralized test configuration
   - Performance thresholds
   - Accessibility requirements
   - Platform-specific settings
   - Mock data configurations

## 🚀 Running Tests

### Basic Test Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific test categories
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:snapshot      # Snapshot tests only
```

### Advanced Test Commands

```bash
# Performance testing
npm run test:performance

# Accessibility testing  
npm run test:accessibility

# Platform-specific testing
npm run test:ios
npm run test:android
npm run test:web

# Update snapshots
npm run test:snapshot -- --updateSnapshot

# Run tests with detailed output
npm run test:verbose

# Run tests for specific component
npm test -- --testNamePattern="QuickStatsWidget"

# Run tests for specific file
npm test -- __tests__/components/organisms/QuickStatsWidget.test.tsx
```

## 📊 Coverage Requirements

### Global Coverage Thresholds
- **Statements**: 80%
- **Branches**: 75%
- **Functions**: 80%
- **Lines**: 80%

### Critical Component Coverage
- **Statements**: 95%
- **Branches**: 90%
- **Functions**: 95%
- **Lines**: 95%

### Coverage Reports

Coverage reports are generated in multiple formats:
- **HTML Report**: `coverage/lcov-report/index.html`
- **JSON Report**: `coverage/coverage-final.json`
- **LCOV Report**: `coverage/lcov.info`

## ⚡ Performance Standards

### Render Performance
- **Fast**: < 8ms (ideal)
- **Good**: < 16ms (60fps)
- **Acceptable**: < 32ms (30fps)
- **Slow**: > 100ms (needs optimization)

### Animation Performance
- **Target Frame Rate**: 60fps (16.67ms per frame)
- **Max Dropped Frames**: 3 per animation
- **Smoothness Threshold**: 85%

### Memory Usage
- **Max Component Usage**: 10MB
- **Max Memory Leak**: 1MB per component lifecycle

### Bundle Size
- **Max Component Size**: 50KB
- **Max Total Bundle**: 5MB

## ♿ Accessibility Standards

### Minimum Requirements
- **Accessibility Score**: 85% (90% for web)
- **Screen Reader Coverage**: 80%
- **Critical Issues**: 0 allowed
- **Warning Issues**: Max 3 per component

### WCAG Compliance
- **Color Contrast**: 4.5:1 normal text, 3.0:1 large text
- **Hit Area Size**: Minimum 44x44 points
- **Text Size**: Minimum 12px, preferred 14px
- **Keyboard Navigation**: Logical tab order required

## 🔧 Configuration

### Jest Configuration
The Jest configuration is in `package.json` with:
- **Preset**: `jest-expo`
- **Setup Files**: `setupTests.ts`
- **Transform Ignore Patterns**: React Native and Expo modules
- **Coverage Collection**: All source files except test files
- **Test Environment**: Node.js with React Native testing library

### Mock Configuration
Comprehensive mocking includes:
- **React Native APIs**: Platform, Alert, Share, etc.
- **Expo Modules**: Haptics, LinearGradient, BlurView
- **Third-party Libraries**: NFC Manager, Supabase, Navigation
- **Platform Services**: AsyncStorage, NetInfo, Reanimated

## 📱 Platform Testing

### iOS Testing
- **Native Animations**: Full Reanimated support
- **Haptic Feedback**: All impact and notification types
- **Visual Effects**: BlurView and shadow support
- **Accessibility**: VoiceOver compliance

### Android Testing  
- **Material Design**: Elevation instead of shadows
- **Haptic Feedback**: System haptics support
- **Accessibility**: TalkBack compliance
- **Performance**: Optimized for lower-end devices

### Web Testing
- **DOM Compatibility**: Proper semantic HTML
- **Accessibility**: ARIA attributes and WCAG compliance
- **Performance**: CSR optimization
- **Responsive Design**: Mobile-first approach

## 🎯 Test Strategy

### 1. **Test Pyramid Approach**
- **70% Unit Tests**: Fast, isolated component testing
- **20% Integration Tests**: Critical user flows
- **10% E2E Tests**: Complete user journeys

### 2. **Behavior-Driven Testing**
- Test user-facing behavior, not implementation
- Focus on component contracts and APIs
- Validate user experience and accessibility

### 3. **Performance-First Testing**
- Every component tested for render performance
- Animation smoothness validation
- Memory leak prevention
- Bundle size optimization

### 4. **Accessibility-First Testing**
- Screen reader compatibility from day one
- Keyboard navigation support
- Color contrast validation
- Platform accessibility standards

## 🚨 Continuous Integration

### Pre-commit Hooks
- Run unit tests on changed files
- Validate code coverage thresholds
- Check accessibility requirements
- Performance regression detection

### CI Pipeline
1. **Unit Test Stage**: All unit tests must pass
2. **Integration Stage**: Critical user flows validation
3. **Performance Stage**: Performance regression detection
4. **Accessibility Stage**: A11y compliance verification
5. **Visual Stage**: Snapshot regression detection

### Quality Gates
- **Test Coverage**: Must meet minimum thresholds
- **Performance**: No regressions beyond thresholds
- **Accessibility**: Zero critical accessibility issues
- **Visual**: No unintended visual regressions

## 📚 Best Practices

### Writing Tests
1. **Descriptive Names**: Tests should read like specifications
2. **Single Responsibility**: One behavior per test
3. **Arrange-Act-Assert**: Clear test structure
4. **Mock Minimally**: Only mock external dependencies
5. **Test Edge Cases**: Error states, empty data, large datasets

### Performance Testing
1. **Measure First**: Baseline before optimization
2. **Real Conditions**: Test with realistic data sizes
3. **Platform Aware**: Different standards per platform
4. **Regression Prevention**: Automated performance monitoring

### Accessibility Testing
1. **Early Testing**: A11y from design phase
2. **Real Users**: Test with actual assistive technology
3. **Multiple Methods**: Automated + manual testing
4. **Platform Standards**: iOS, Android, Web guidelines

## 🔍 Debugging Tests

### Common Issues
1. **Async Operations**: Use proper `waitFor` and `act`
2. **Animation Timing**: Use fake timers for predictable testing
3. **Platform Mocking**: Reset platform mocks between tests
4. **Memory Leaks**: Proper cleanup in `afterEach`

### Debug Tools
- **Jest Debug**: `--verbose` flag for detailed output
- **React Dev Tools**: Component inspection
- **Performance Profiler**: Chrome DevTools integration
- **Accessibility Inspector**: Platform-specific tools

## 📈 Metrics and Reporting

### Test Metrics
- **Test Execution Time**: Track test suite performance
- **Flaky Test Detection**: Identify unstable tests
- **Coverage Trends**: Monitor coverage over time
- **Performance Baselines**: Track performance regressions

### Custom Matchers
- **`toBePerformant()`**: Validate render performance
- **`toBeAccessible()`**: Check accessibility compliance
- **`toHaveSmoothAnimation()`**: Validate animation performance
- **`toHaveGoodColorContrast()`**: Check color accessibility

## 🎉 Success Criteria

A component is considered "test complete" when it has:
- ✅ **95%+ unit test coverage**
- ✅ **Integration test for critical paths**
- ✅ **Snapshot tests for all states**
- ✅ **Performance tests meeting thresholds**
- ✅ **Accessibility score > 85%**
- ✅ **Cross-platform compatibility**
- ✅ **Error boundary testing**
- ✅ **Loading state testing**

This comprehensive test suite ensures the ShortcutsLike app maintains high quality, exceptional performance, and universal accessibility across all supported platforms.