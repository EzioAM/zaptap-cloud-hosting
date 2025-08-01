import React from 'react';
import {
  View,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import {
  TextInput,
  Text,
  Chip,
  Surface,
  useTheme,
  HelperText,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface ModernTextInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: any;
  multiline?: boolean;
  numberOfLines?: number;
  helper?: string;
  error?: string;
  icon?: string;
}

export const ModernTextInput: React.FC<ModernTextInputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  numberOfLines,
  helper,
  error,
  icon,
}) => {
  const theme = useTheme();
  
  return (
    <View style={styles.inputContainer}>
      <TextInput
        label={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={numberOfLines}
        mode="outlined"
        outlineColor={theme.colors.outline}
        activeOutlineColor={theme.colors.primary}
        style={[styles.input, multiline && styles.multilineInput]}
        left={icon ? <TextInput.Icon icon={icon} /> : undefined}
        error={!!error}
      />
      {(helper || error) && (
        <HelperText type={error ? "error" : "info"} visible={true}>
          {error || helper}
        </HelperText>
      )}
    </View>
  );
};

interface ModernSegmentedButtonsProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  buttons: Array<{ value: string; label: string; icon?: string }>;
  helper?: string;
}

export const ModernSegmentedButtons: React.FC<ModernSegmentedButtonsProps> = ({
  label,
  value,
  onValueChange,
  buttons,
  helper,
}) => {
  const theme = useTheme();
  
  return (
    <View style={styles.segmentContainer}>
      <Text style={styles.segmentLabel}>{label}</Text>
      <Surface style={styles.segmentSurface} elevation={0}>
        <View style={styles.segmentButtons}>
          {buttons.map((button, index) => {
            const isSelected = value === button.value;
            const isFirst = index === 0;
            const isLast = index === buttons.length - 1;
            
            return (
              <TouchableOpacity
                key={button.value}
                style={[
                  styles.segmentButton,
                  isFirst && styles.segmentButtonFirst,
                  isLast && styles.segmentButtonLast,
                  isSelected && styles.segmentButtonSelected,
                  { borderColor: theme.colors.outline },
                  isSelected && { backgroundColor: theme.colors.primaryContainer },
                ]}
                onPress={() => onValueChange(button.value)}
                activeOpacity={0.7}
              >
                {button.icon && (
                  <Icon 
                    name={button.icon} 
                    size={18} 
                    color={isSelected ? theme.colors.primary : theme.colors.onSurface}
                    style={styles.segmentIcon}
                  />
                )}
                <Text 
                  style={[
                    styles.segmentButtonText,
                    isSelected && styles.segmentButtonTextSelected,
                    { color: isSelected ? theme.colors.primary : theme.colors.onSurface }
                  ]}
                >
                  {button.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Surface>
      {helper && (
        <HelperText type="info" visible={true}>
          {helper}
        </HelperText>
      )}
    </View>
  );
};

interface InfoCardProps {
  icon: string;
  title: string;
  description: string;
  color?: string;
}

export const InfoCard: React.FC<InfoCardProps> = ({
  icon,
  title,
  description,
  color,
}) => {
  const theme = useTheme();
  const bgColor = color || theme.colors.primaryContainer;
  const iconColor = color ? '#fff' : theme.colors.primary;
  
  return (
    <Surface style={styles.infoCard} elevation={1}>
      <View style={[styles.infoIconContainer, { backgroundColor: bgColor }]}>
        <Icon name={icon} size={24} color={iconColor} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoDescription}>{description}</Text>
      </View>
    </Surface>
  );
};

interface FormSectionProps {
  title?: string;
  children: React.ReactNode;
}

export const FormSection: React.FC<FormSectionProps> = ({ title, children }) => {
  return (
    <View style={styles.formSection}>
      {title && <Text style={styles.sectionTitle}>{title}</Text>}
      {children}
    </View>
  );
};

interface ChipGroupProps {
  label: string;
  chips: Array<{ label: string; value: string; icon?: string }>;
  selected: string[];
  onSelectionChange: (selected: string[]) => void;
  multiSelect?: boolean;
}

export const ChipGroup: React.FC<ChipGroupProps> = ({
  label,
  chips,
  selected,
  onSelectionChange,
  multiSelect = false,
}) => {
  const handleChipPress = (value: string) => {
    if (multiSelect) {
      if (selected.includes(value)) {
        onSelectionChange(selected.filter(v => v !== value));
      } else {
        onSelectionChange([...selected, value]);
      }
    } else {
      onSelectionChange([value]);
    }
  };
  
  return (
    <View style={styles.chipGroupContainer}>
      <Text style={styles.chipGroupLabel}>{label}</Text>
      <View style={styles.chipGroup}>
        {chips.map((chip) => (
          <Chip
            key={chip.value}
            icon={chip.icon}
            selected={selected.includes(chip.value)}
            onPress={() => handleChipPress(chip.value)}
            style={styles.chip}
            mode="outlined"
          >
            {chip.label}
          </Chip>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Input styles
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: 'white',
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  
  // Segmented buttons styles
  segmentContainer: {
    marginBottom: 16,
  },
  segmentLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  segmentSurface: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  segmentButtons: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    backgroundColor: 'white',
  },
  segmentButtonFirst: {
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    borderRightWidth: 0,
  },
  segmentButtonLast: {
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  segmentButtonSelected: {
    borderWidth: 2,
  },
  segmentIcon: {
    marginRight: 6,
  },
  segmentButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  segmentButtonTextSelected: {
    fontWeight: '600',
  },
  
  // Info card styles
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: 'white',
  },
  infoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#1a1a1a',
  },
  infoDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  
  // Form section styles
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1a1a1a',
  },
  
  // Chip group styles
  chipGroupContainer: {
    marginBottom: 16,
  },
  chipGroupLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginBottom: 8,
  },
});

export default {
  ModernTextInput,
  ModernSegmentedButtons,
  InfoCard,
  FormSection,
  ChipGroup,
};