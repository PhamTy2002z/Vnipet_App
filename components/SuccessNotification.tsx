import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import Animated, {
    Easing,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSequence,
    withTiming,
} from 'react-native-reanimated';

interface SuccessNotificationProps {
  visible: boolean;
  title: string;
  message?: string;
  onClose: () => void;
  autoClose?: boolean;
  closeDuration?: number;
}

export default function SuccessNotification({
  visible,
  title,
  message,
  onClose,
  autoClose = true,
  closeDuration = 1500,
}: SuccessNotificationProps) {
  // Animation values
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const checkmarkScale = useSharedValue(0);
  const checkmarkOpacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    if (visible) {
      // Trigger haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Animate modal in
      opacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) });
      scale.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) });
      translateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) });
      
      // Animate checkmark with delay
      checkmarkScale.value = withDelay(
        100,
        withSequence(
          withTiming(1.3, { duration: 200, easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: 150, easing: Easing.inOut(Easing.quad) })
        )
      );
      checkmarkOpacity.value = withDelay(100, withTiming(1, { duration: 200 }));

      // Auto close after specified duration
      if (autoClose) {
        const timer = setTimeout(() => {
          handleClose();
        }, closeDuration);
        return () => clearTimeout(timer);
      }
    }
  }, [visible]);

  // Function to handle closing animation
  const handleClose = () => {
    opacity.value = withTiming(0, { duration: 300, easing: Easing.in(Easing.quad) });
    scale.value = withTiming(0.9, { duration: 250, easing: Easing.in(Easing.quad) });
    translateY.value = withTiming(-20, { duration: 300, easing: Easing.in(Easing.quad) }, () => {
      runOnJS(onClose)();
    });
  };

  // Animated styles
  const containerStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { scale: scale.value },
        { translateY: translateY.value }
      ],
    };
  });

  const checkmarkStyle = useAnimatedStyle(() => {
    return {
      opacity: checkmarkOpacity.value,
      transform: [{ scale: checkmarkScale.value }],
    };
  });

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.container, containerStyle]}>
          <View style={styles.iconContainer}>
            <Animated.View style={checkmarkStyle}>
              <Ionicons name="checkmark" size={35} color="white" />
            </Animated.View>
          </View>
          <Text style={styles.title}>{title}</Text>
          {message && <Text style={styles.message}>{message}</Text>}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '75%',
    maxWidth: 320,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  iconContainer: {
    width: 65,
    height: 65,
    borderRadius: 35,
    backgroundColor: '#2567E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
    color: '#333',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
  },
}); 