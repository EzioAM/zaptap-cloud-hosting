import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  ScrollView,
  Dimensions,
  FlatList,
} from 'react-native';
import { Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

interface TutorialStep {
  icon: string;
  title: string;
  description: string;
  tip: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    icon: 'plus-circle',
    title: 'Create Your First Automation',
    description: 'Tap the "Build Automation" button to start creating your workflow.',
    tip: 'Start with a simple notification automation to get familiar with the builder.',
  },
  {
    icon: 'puzzle',
    title: 'Add Steps to Your Workflow',
    description: 'Choose from various step types like notifications, delays, SMS, and more.',
    tip: 'Each step can be configured with custom settings and variables.',
  },
  {
    icon: 'qrcode',
    title: 'Share Your Automations',
    description: 'Generate QR codes or share links to let others use your automations.',
    tip: 'You can also write automations to NFC tags for instant access!',
  },
  {
    icon: 'view-gallery-outline',
    title: 'Explore the Gallery',
    description: 'Browse community-created automations and templates.',
    tip: 'Import any automation to customize it for your needs.',
  },
];

export function TutorialScreen() {
  const navigation = useNavigation();
  const [currentPage, setCurrentPage] = React.useState(0);
  const flatListRef = React.useRef<FlatList>(null);

  const handleNext = () => {
    if (currentPage < tutorialSteps.length - 1) {
      const nextPage = currentPage + 1;
      flatListRef.current?.scrollToIndex({ index: nextPage, animated: true });
      setCurrentPage(nextPage);
    } else {
      handleFinish();
    }
  };

  const handleFinish = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' as never }],
    });
  };

  const renderTutorialStep = ({ item: step }: { item: TutorialStep }) => (
    <View style={styles.page}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name={step.icon as any}
            size={80}
            color="#6200ee"
          />
        </View>
        <Text style={styles.title}>{step.title}</Text>
        <Text style={styles.description}>{step.description}</Text>
        <View style={styles.tipContainer}>
          <MaterialCommunityIcons
            name="lightbulb-outline"
            size={20}
            color="#f39c12"
          />
          <Text style={styles.tip}>{step.tip}</Text>
        </View>
      </View>
    </View>
  );

  const onViewableItemsChanged = React.useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentPage(viewableItems[0].index || 0);
    }
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Button
          mode="text"
          onPress={handleFinish}
          labelStyle={styles.skipButton}
        >
          Skip Tutorial
        </Button>
      </View>

      <FlatList
        ref={flatListRef}
        data={tutorialSteps}
        renderItem={renderTutorialStep}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        keyExtractor={(_, index) => index.toString()}
        style={styles.pagerView}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {tutorialSteps.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                currentPage === index && styles.activeDot,
              ]}
            />
          ))}
        </View>

        <Button
          mode="contained"
          onPress={handleNext}
          style={styles.nextButton}
          labelStyle={styles.nextButtonText}
        >
          {currentPage === tutorialSteps.length - 1 ? 'Get Started' : 'Next'}
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    alignItems: 'flex-end',
  },
  skipButton: {
    color: '#666',
  },
  pagerView: {
    flex: 1,
  },
  page: {
    flex: 1,
    justifyContent: 'center',
    width: width,
  },
  content: {
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff8e1',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  tip: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 32,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#6200ee',
    width: 24,
  },
  nextButton: {
    backgroundColor: '#6200ee',
    paddingVertical: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});