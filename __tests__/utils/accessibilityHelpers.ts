import { ReactTestInstance } from 'react-test-renderer';
import { ReactTestRenderer } from 'react-test-renderer';

/**
 * Accessibility testing utilities for React Native components
 */
export class AccessibilityTestUtils {
  /**
   * Check if component has proper accessibility labels
   */
  static hasAccessibilityLabel(element: ReactTestInstance): boolean {
    return !!(element.props.accessibilityLabel || element.props.accessibilityHint);
  }

  /**
   * Check if interactive component has proper accessibility role
   */
  static hasProperAccessibilityRole(element: ReactTestInstance): boolean {
    if (element.props.onPress || element.props.onLongPress) {
      return !!(element.props.accessibilityRole || element.props.accessible);
    }
    return true; // Non-interactive elements don't need roles
  }

  /**
   * Check if component supports screen readers
   */
  static isScreenReaderAccessible(element: ReactTestInstance): boolean {
    return this.hasAccessibilityLabel(element) && this.hasProperAccessibilityRole(element);
  }

  /**
   * Find all interactive elements in component tree
   */
  static findInteractiveElements(testRenderer: ReactTestRenderer): ReactTestInstance[] {
    const interactiveElements: ReactTestInstance[] = [];

    const traverse = (instance: ReactTestInstance) => {
      if (instance.props && (instance.props.onPress || instance.props.onLongPress)) {
        interactiveElements.push(instance);
      }

      if (instance.children) {
        instance.children.forEach(child => {
          if (typeof child === 'object' && child.props) {
            traverse(child);
          }
        });
      }
    };

    traverse(testRenderer.root);
    return interactiveElements;
  }

  /**
   * Check color contrast accessibility (simplified)
   */
  static hasGoodColorContrast(
    foregroundColor: string,
    backgroundColor: string,
    isLargeText: boolean = false
  ): boolean {
    // Simplified contrast calculation - in real scenarios, use a proper contrast library
    const minRatio = isLargeText ? 3.0 : 4.5;
    
    // Convert colors to RGB (simplified for common formats)
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 0, g: 0, b: 0 };
    };

    const getLuminance = (rgb: { r: number; g: number; b: number }) => {
      const { r, g, b } = rgb;
      const [rs, gs, bs] = [r, g, b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    };

    const fg = hexToRgb(foregroundColor);
    const bg = hexToRgb(backgroundColor);
    const l1 = getLuminance(fg);
    const l2 = getLuminance(bg);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

    return ratio >= minRatio;
  }

  /**
   * Check if text elements have minimum size for accessibility
   */
  static hasMinimumTextSize(element: ReactTestInstance): boolean {
    const style = element.props.style || {};
    const fontSize = style.fontSize || 16; // Default React Native font size
    return fontSize >= 14; // WCAG recommended minimum
  }

  /**
   * Check if touchable elements have minimum hit area
   */
  static hasMinimumHitArea(element: ReactTestInstance): boolean {
    const style = element.props.style || {};
    const minHitArea = 44; // Apple's recommended minimum hit area
    
    const width = style.width || style.minWidth || 0;
    const height = style.height || style.minHeight || 0;
    
    return width >= minHitArea && height >= minHitArea;
  }

  /**
   * Audit entire component tree for accessibility issues
   */
  static auditAccessibility(testRenderer: ReactTestRenderer): AccessibilityAuditResult {
    const issues: AccessibilityIssue[] = [];
    const recommendations: string[] = [];
    let score = 100;

    const auditElement = (element: ReactTestInstance, path: string) => {
      // Check accessibility label
      if (!this.hasAccessibilityLabel(element) && this.isInteractiveElement(element)) {
        issues.push({
          type: 'missing-label',
          severity: 'error',
          element: path,
          message: 'Interactive element missing accessibility label',
        });
        score -= 10;
      }

      // Check accessibility role
      if (!this.hasProperAccessibilityRole(element)) {
        issues.push({
          type: 'missing-role',
          severity: 'warning',
          element: path,
          message: 'Interactive element missing accessibility role',
        });
        score -= 5;
      }

      // Check minimum text size
      if (element.type === 'Text' && !this.hasMinimumTextSize(element)) {
        issues.push({
          type: 'small-text',
          severity: 'warning',
          element: path,
          message: 'Text size below recommended minimum (14px)',
        });
        score -= 3;
      }

      // Check minimum hit area for interactive elements
      if (this.isInteractiveElement(element) && !this.hasMinimumHitArea(element)) {
        issues.push({
          type: 'small-hit-area',
          severity: 'warning',
          element: path,
          message: 'Interactive element below minimum hit area (44x44)',
        });
        score -= 5;
      }

      // Recursively audit children
      if (element.children) {
        element.children.forEach((child, index) => {
          if (typeof child === 'object' && child.props) {
            auditElement(child, `${path}[${index}]`);
          }
        });
      }
    };

    auditElement(testRenderer.root, 'root');

    // Generate recommendations based on issues
    if (issues.some(issue => issue.type === 'missing-label')) {
      recommendations.push('Add accessibilityLabel props to interactive elements');
    }
    if (issues.some(issue => issue.type === 'missing-role')) {
      recommendations.push('Add accessibilityRole props to define element purpose');
    }
    if (issues.some(issue => issue.type === 'small-text')) {
      recommendations.push('Increase font sizes to at least 14px for better readability');
    }
    if (issues.some(issue => issue.type === 'small-hit-area')) {
      recommendations.push('Ensure interactive elements are at least 44x44 points');
    }

    return {
      score: Math.max(0, score),
      issues,
      recommendations,
      totalElements: this.countElements(testRenderer.root),
      interactiveElements: this.findInteractiveElements(testRenderer).length,
    };
  }

  /**
   * Test keyboard navigation support (for platforms that support it)
   */
  static testKeyboardNavigation(testRenderer: ReactTestRenderer): KeyboardNavigationResult {
    const focusableElements = this.findFocusableElements(testRenderer);
    const tabOrder = this.getTabOrder(focusableElements);
    
    return {
      hasFocusableElements: focusableElements.length > 0,
      hasLogicalTabOrder: this.hasLogicalTabOrder(tabOrder),
      focusableElementsCount: focusableElements.length,
      issues: this.findKeyboardNavigationIssues(focusableElements),
    };
  }

  /**
   * Test voice over / talk back support
   */
  static testScreenReaderSupport(testRenderer: ReactTestRenderer): ScreenReaderResult {
    const elements = this.getAllElements(testRenderer.root);
    const readableElements = elements.filter(el => this.isScreenReaderReadable(el));
    const interactiveElements = elements.filter(el => this.isInteractiveElement(el));
    const accessibleInteractive = interactiveElements.filter(el => this.isScreenReaderAccessible(el));

    return {
      totalElements: elements.length,
      readableElements: readableElements.length,
      interactiveElements: interactiveElements.length,
      accessibleInteractiveElements: accessibleInteractive.length,
      coveragePercentage: interactiveElements.length > 0 
        ? (accessibleInteractive.length / interactiveElements.length) * 100 
        : 100,
    };
  }

  // Helper methods
  private static isInteractiveElement(element: ReactTestInstance): boolean {
    return !!(element.props && (element.props.onPress || element.props.onLongPress));
  }

  private static isScreenReaderReadable(element: ReactTestInstance): boolean {
    return !!(element.props && (
      element.props.accessibilityLabel ||
      element.props.accessibilityHint ||
      (element.children && element.children.some(child => typeof child === 'string'))
    ));
  }

  private static countElements(element: ReactTestInstance): number {
    let count = 1;
    if (element.children) {
      element.children.forEach(child => {
        if (typeof child === 'object' && child.props) {
          count += this.countElements(child);
        }
      });
    }
    return count;
  }

  private static getAllElements(element: ReactTestInstance): ReactTestInstance[] {
    const elements = [element];
    if (element.children) {
      element.children.forEach(child => {
        if (typeof child === 'object' && child.props) {
          elements.push(...this.getAllElements(child));
        }
      });
    }
    return elements;
  }

  private static findFocusableElements(testRenderer: ReactTestRenderer): ReactTestInstance[] {
    const focusableElements: ReactTestInstance[] = [];

    const traverse = (instance: ReactTestInstance) => {
      if (instance.props && (
        instance.props.focusable ||
        instance.props.accessible ||
        this.isInteractiveElement(instance)
      )) {
        focusableElements.push(instance);
      }

      if (instance.children) {
        instance.children.forEach(child => {
          if (typeof child === 'object' && child.props) {
            traverse(child);
          }
        });
      }
    };

    traverse(testRenderer.root);
    return focusableElements;
  }

  private static getTabOrder(elements: ReactTestInstance[]): number[] {
    return elements.map(el => el.props.tabIndex || 0).filter(index => index >= 0);
  }

  private static hasLogicalTabOrder(tabOrder: number[]): boolean {
    if (tabOrder.length <= 1) return true;
    
    for (let i = 1; i < tabOrder.length; i++) {
      if (tabOrder[i] < tabOrder[i - 1]) {
        return false;
      }
    }
    return true;
  }

  private static findKeyboardNavigationIssues(elements: ReactTestInstance[]): KeyboardIssue[] {
    const issues: KeyboardIssue[] = [];
    
    elements.forEach((element, index) => {
      if (!element.props.accessible && this.isInteractiveElement(element)) {
        issues.push({
          type: 'not-focusable',
          element: `element[${index}]`,
          message: 'Interactive element is not focusable',
        });
      }
    });

    return issues;
  }
}

// Type definitions
export interface AccessibilityIssue {
  type: 'missing-label' | 'missing-role' | 'small-text' | 'small-hit-area' | 'poor-contrast';
  severity: 'error' | 'warning' | 'info';
  element: string;
  message: string;
}

export interface AccessibilityAuditResult {
  score: number;
  issues: AccessibilityIssue[];
  recommendations: string[];
  totalElements: number;
  interactiveElements: number;
}

export interface KeyboardIssue {
  type: 'not-focusable' | 'bad-tab-order' | 'missing-focus-indicator';
  element: string;
  message: string;
}

export interface KeyboardNavigationResult {
  hasFocusableElements: boolean;
  hasLogicalTabOrder: boolean;
  focusableElementsCount: number;
  issues: KeyboardIssue[];
}

export interface ScreenReaderResult {
  totalElements: number;
  readableElements: number;
  interactiveElements: number;
  accessibleInteractiveElements: number;
  coveragePercentage: number;
}

/**
 * Accessibility test matchers
 */
export const accessibilityMatchers = {
  toBeAccessible: (received: ReactTestRenderer) => {
    const audit = AccessibilityTestUtils.auditAccessibility(received);
    const pass = audit.score >= 80; // 80% accessibility score threshold
    
    return {
      pass,
      message: () =>
        pass
          ? `Expected component to have accessibility issues (score: ${audit.score})`
          : `Expected component to be accessible (score: ${audit.score}, issues: ${audit.issues.length})`,
    };
  },

  toHaveAccessibilityLabel: (received: ReactTestInstance) => {
    const pass = AccessibilityTestUtils.hasAccessibilityLabel(received);
    return {
      pass,
      message: () =>
        pass
          ? `Expected element not to have accessibility label`
          : `Expected element to have accessibility label`,
    };
  },

  toSupportScreenReader: (received: ReactTestInstance) => {
    const pass = AccessibilityTestUtils.isScreenReaderAccessible(received);
    return {
      pass,
      message: () =>
        pass
          ? `Expected element not to support screen readers`
          : `Expected element to support screen readers`,
    };
  },

  toHaveGoodColorContrast: (received: { foreground: string; background: string; isLargeText?: boolean }) => {
    const pass = AccessibilityTestUtils.hasGoodColorContrast(
      received.foreground,
      received.background,
      received.isLargeText
    );
    return {
      pass,
      message: () =>
        pass
          ? `Expected colors to have poor contrast`
          : `Expected colors to have good contrast (foreground: ${received.foreground}, background: ${received.background})`,
    };
  },
};

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeAccessible(): R;
      toHaveAccessibilityLabel(): R;
      toSupportScreenReader(): R;
      toHaveGoodColorContrast(): R;
    }
  }
}

// Add accessibility matchers
expect.extend(accessibilityMatchers);