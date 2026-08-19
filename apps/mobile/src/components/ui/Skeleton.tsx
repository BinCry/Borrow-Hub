import React, { useEffect, useState } from 'react';
import { Animated, ViewStyle } from 'react-native';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number | `${number}%`;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  borderRadius = 4,
  style,
}) => {
  const [animatedValue] = useState(() => new Animated.Value(0.3));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 0.7,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#E5E7EB',
          opacity: animatedValue,
        },
        style,
      ]}
    />
  );
};
