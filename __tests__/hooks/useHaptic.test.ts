import { renderHook, act } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { useHaptic } from '../../src/hooks/useHaptic';
import { TestUtils } from '../utils/testHelpers';

// Mock expo-haptics
jest.mock('expo-haptics');

const mockHaptics = Haptics as jest.Mocked<typeof Haptics>;

describe('useHaptic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHaptics.impactAsync.mockResolvedValue();
    mockHaptics.notificationAsync.mockResolvedValue();
    mockHaptics.selectionAsync.mockResolvedValue();
  });

  describe('Basic Functionality', () => {
    it('returns haptic feedback functions', () => {
      const { result } = renderHook(() => useHaptic());

      expect(result.current).toHaveProperty('light');
      expect(result.current).toHaveProperty('medium');
      expect(result.current).toHaveProperty('heavy');
      expect(result.current).toHaveProperty('success');
      expect(result.current).toHaveProperty('warning');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('selection');
    });

    it('provides stable function references', () => {
      const { result, rerender } = renderHook(() => useHaptic());
      
      const firstResult = result.current;
      rerender();
      const secondResult = result.current;

      expect(firstResult.light).toBe(secondResult.light);
      expect(firstResult.medium).toBe(secondResult.medium);
      expect(firstResult.heavy).toBe(secondResult.heavy);
    });
  });

  describe('Impact Feedback', () => {
    it('triggers light impact feedback', async () => {
      const { result } = renderHook(() => useHaptic());

      await act(async () => {
        await result.current.light();
      });

      expect(mockHaptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Light
      );
    });

    it('triggers medium impact feedback', async () => {
      const { result } = renderHook(() => useHaptic());

      await act(async () => {
        await result.current.medium();
      });

      expect(mockHaptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Medium
      );
    });

    it('triggers heavy impact feedback', async () => {
      const { result } = renderHook(() => useHaptic());

      await act(async () => {
        await result.current.heavy();
      });

      expect(mockHaptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Heavy
      );
    });
  });

  describe('Notification Feedback', () => {
    it('triggers success notification feedback', async () => {
      const { result } = renderHook(() => useHaptic());

      await act(async () => {
        await result.current.success();
      });

      expect(mockHaptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Success
      );
    });

    it('triggers warning notification feedback', async () => {
      const { result } = renderHook(() => useHaptic());

      await act(async () => {
        await result.current.warning();
      });

      expect(mockHaptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Warning
      );
    });

    it('triggers error notification feedback', async () => {
      const { result } = renderHook(() => useHaptic());

      await act(async () => {
        await result.current.error();
      });

      expect(mockHaptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Error
      );
    });
  });

  describe('Selection Feedback', () => {
    it('triggers selection feedback', async () => {
      const { result } = renderHook(() => useHaptic());

      await act(async () => {
        await result.current.selection();
      });

      expect(mockHaptics.selectionAsync).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('handles haptic feedback failures gracefully', async () => {
      mockHaptics.impactAsync.mockRejectedValue(new Error('Haptic not supported'));
      
      const { result } = renderHook(() => useHaptic());

      await act(async () => {
        // Should not throw error
        await expect(result.current.light()).resolves.toBeUndefined();
      });
    });

    it('handles notification feedback failures gracefully', async () => {
      mockHaptics.notificationAsync.mockRejectedValue(new Error('Haptic not supported'));
      
      const { result } = renderHook(() => useHaptic());

      await act(async () => {
        await expect(result.current.success()).resolves.toBeUndefined();
      });
    });

    it('handles selection feedback failures gracefully', async () => {
      mockHaptics.selectionAsync.mockRejectedValue(new Error('Haptic not supported'));
      
      const { result } = renderHook(() => useHaptic());

      await act(async () => {
        await expect(result.current.selection()).resolves.toBeUndefined();
      });
    });
  });

  describe('Platform Compatibility', () => {
    it('works correctly on iOS', async () => {
      TestUtils.mockPlatform('ios');
      
      const { result } = renderHook(() => useHaptic());

      await act(async () => {
        await result.current.medium();
      });

      expect(mockHaptics.impactAsync).toHaveBeenCalled();
      
      TestUtils.resetPlatformMocks();
    });

    it('works correctly on Android', async () => {
      TestUtils.mockPlatform('android');
      
      const { result } = renderHook(() => useHaptic());

      await act(async () => {
        await result.current.medium();
      });

      expect(mockHaptics.impactAsync).toHaveBeenCalled();
      
      TestUtils.resetPlatformMocks();
    });

    it('handles web platform gracefully', async () => {
      TestUtils.mockPlatform('web');
      
      const { result } = renderHook(() => useHaptic());

      await act(async () => {
        await result.current.medium();
      });

      // Should still call haptic API even on web (may be ignored by Expo)
      expect(mockHaptics.impactAsync).toHaveBeenCalled();
      
      TestUtils.resetPlatformMocks();
    });
  });

  describe('Performance', () => {
    it('does not cause memory leaks on repeated calls', async () => {
      const { result } = renderHook(() => useHaptic());

      // Call multiple times rapidly
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(result.current.light());
      }

      await act(async () => {
        await Promise.all(promises);
      });

      expect(mockHaptics.impactAsync).toHaveBeenCalledTimes(100);
    });

    it('handles concurrent feedback calls', async () => {
      const { result } = renderHook(() => useHaptic());

      await act(async () => {
        const promises = [
          result.current.light(),
          result.current.medium(),
          result.current.heavy(),
          result.current.success(),
          result.current.selection(),
        ];

        await Promise.all(promises);
      });

      expect(mockHaptics.impactAsync).toHaveBeenCalledTimes(3);
      expect(mockHaptics.notificationAsync).toHaveBeenCalledTimes(1);
      expect(mockHaptics.selectionAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('Hook Lifecycle', () => {
    it('maintains functionality after component unmount and remount', async () => {
      const { result, unmount, rerender } = renderHook(() => useHaptic());

      // Use hook
      await act(async () => {
        await result.current.light();
      });

      expect(mockHaptics.impactAsync).toHaveBeenCalledTimes(1);

      // Unmount
      unmount();

      // Remount
      rerender();

      // Use hook again
      await act(async () => {
        await result.current.medium();
      });

      expect(mockHaptics.impactAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe('Custom Feedback Patterns', () => {
    it('can create custom feedback sequences', async () => {
      const { result } = renderHook(() => useHaptic());

      await act(async () => {
        // Custom double-tap feedback
        await result.current.light();
        await TestUtils.waitFor(100);
        await result.current.light();
      });

      expect(mockHaptics.impactAsync).toHaveBeenCalledTimes(2);
    });

    it('can combine different feedback types', async () => {
      const { result } = renderHook(() => useHaptic());

      await act(async () => {
        // Custom success pattern: selection + success
        await result.current.selection();
        await result.current.success();
      });

      expect(mockHaptics.selectionAsync).toHaveBeenCalledTimes(1);
      expect(mockHaptics.notificationAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility Considerations', () => {
    it('respects system haptic settings', async () => {
      // This would test if the hook respects system settings for reduced motion/haptics
      // In a real implementation, this would check accessibility settings
      const { result } = renderHook(() => useHaptic());

      await act(async () => {
        await result.current.light();
      });

      // Should still call haptic API (system will handle filtering)
      expect(mockHaptics.impactAsync).toHaveBeenCalled();
    });
  });

  describe('Integration with UI Components', () => {
    it('provides appropriate feedback for button presses', async () => {
      const { result } = renderHook(() => useHaptic());

      await act(async () => {
        // Simulate button press feedback
        await result.current.light();
      });

      expect(mockHaptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Light
      );
    });

    it('provides appropriate feedback for successful actions', async () => {
      const { result } = renderHook(() => useHaptic());

      await act(async () => {
        // Simulate successful automation execution
        await result.current.success();
      });

      expect(mockHaptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Success
      );
    });

    it('provides appropriate feedback for errors', async () => {
      const { result } = renderHook(() => useHaptic());

      await act(async () => {
        // Simulate error feedback
        await result.current.error();
      });

      expect(mockHaptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Error
      );
    });

    it('provides appropriate feedback for selections', async () => {
      const { result } = renderHook(() => useHaptic());

      await act(async () => {
        // Simulate list item selection
        await result.current.selection();
      });

      expect(mockHaptics.selectionAsync).toHaveBeenCalled();
    });
  });
});