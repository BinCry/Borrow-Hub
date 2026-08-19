import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { FolderOpen } from 'lucide-react-native';

interface EmptyStateProps {
  title?: string;
  description?: string;
  buttonText?: string;
  onPress?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Không có dữ liệu',
  description = 'Hiện tại chưa có thông tin nào để hiển thị.',
  buttonText,
  onPress,
  icon,
}) => {
  return (
    <View className="flex-1 items-center justify-center p-6 mt-10">
      <View className="w-20 h-20 rounded-full bg-surface-secondary items-center justify-center mb-4">
        {icon || <FolderOpen size={40} color="#9CA3AF" />}
      </View>
      <Text className="text-lg font-bold text-text-primary text-center mb-2">{title}</Text>
      <Text className="text-sm text-text-secondary text-center mb-6 leading-5">{description}</Text>
      
      {buttonText && onPress && (
        <TouchableOpacity
          className="bg-primary px-6 py-3 rounded-full"
          onPress={onPress}
        >
          <Text className="text-white font-semibold text-center">{buttonText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
