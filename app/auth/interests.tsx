import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check } from 'lucide-react-native';
import { auth, db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Alert } from 'react-native';

// List of available interests for users to choose from
const interests = [
  { id: 'sports', label: 'Sports', emoji: '⚽' },
  { id: 'love', label: 'Love & Relationships', emoji: '❤️' },
  { id: 'current-events', label: 'Current Events', emoji: '📰' },
  { id: 'video-games', label: 'Video Games', emoji: '🎮' },
  { id: 'technology', label: 'Technology', emoji: '💻' },
  { id: 'politics', label: 'Politics', emoji: '🏛️' },
  { id: 'science', label: 'Science', emoji: '🔬' },
  { id: 'entertainment', label: 'Entertainment', emoji: '🎬' },
  { id: 'education', label: 'Education', emoji: '📚' },
  { id: 'health', label: 'Health & Fitness', emoji: '💪' },
  { id: 'business', label: 'Business', emoji: '💼' },
  { id: 'environment', label: 'Environment', emoji: '🌱' },
];

// Calculate card dimensions based on screen size for responsive layout
const { width } = Dimensions.get('window');
const CARD_GAP = 16;
const CARD_WIDTH = (width - 48 - CARD_GAP) / 2; // 48 = horizontal padding (24*2)

export default function Interests() {
  const router = useRouter();
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]); // Track which interests user selected
  const orb1Anim = useRef(new Animated.Value(0)).current; // Animation value for first floating orb
  const orb2Anim = useRef(new Animated.Value(0)).current; // Animation value for second floating orb
  const [isSaving, setIsSaving] = useState(false); // Track if we're currently saving to database

  // Save selected interests to user's profile and navigate to main app
  const handleFinish = async () => {
    // Don't proceed if user hasn't selected at least 3 interests
    if (selectedInterests.length < 3) return;

    setIsSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("User not authenticated");
        return;
      }
      // Update user document in Firestore with their selected interests
      await updateDoc(doc(db, 'users', user.uid), { 
        interests: selectedInterests,
      });
      router.push('/(tabs)'); // Navigate to home after saving
    } 

    catch (error:any) {
        Alert.alert("Error", "Failed to save interests");
    }
    finally {
      setIsSaving(false);
    }
  }

  // Create floating orb animations in the background
  useEffect(() => {
    // First orb: moves up/down and side to side over 8 seconds
    const orb1Animation = Animated.loop(
      Animated.sequence([
        Animated.timing(orb1Anim, {
          toValue: 1,
          duration: 8000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(orb1Anim, {
          toValue: 0,
          duration: 8000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    
    // Second orb: different timing for variety (7 seconds)
    const orb2Animation = Animated.loop(
      Animated.sequence([
        Animated.timing(orb2Anim, {
          toValue: 1,
          duration: 7000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(orb2Anim, {
          toValue: 0,
          duration: 7000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Start both animations
    orb1Animation.start();
    orb2Animation.start();

    // Clean up animations when component unmounts
    return () => {
      orb1Animation.stop();
      orb2Animation.stop();
    };
  }, []);

  // Add or remove an interest from the selected list
  const toggleInterest = (interestId: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interestId)
        ? prev.filter((id) => id !== interestId)  // Remove if already selected
        : [...prev, interestId]                   // Add if not selected
    );
  };

  // Calculate progress percentage for the progress bar
  const progressPercent = Math.min(100, (selectedInterests.length / 3) * 100);
  
  return (
    <LinearGradient
      colors={['#0a0e17', '#13182a', '#1a223d']}  // Dark blue gradient background
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Animated background elements */}
        <View style={styles.backgroundElements}>
          {/* First floating orb with multiple animated properties */}
          <Animated.View 
            style={[
              styles.floatingOrb, 
              styles.orb1,
              {
                transform: [
                  {
                    translateY: orb1Anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -40]  // Move up and down
                    })
                  },
                  {
                    translateX: orb1Anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 30]   // Move side to side
                    })
                  },
                  {
                    scale: orb1Anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.1]  // Slight scale change
                    })
                  }
                ]
              }
            ]} 
          />
          {/* Second floating orb with different animation values */}
          <Animated.View 
            style={[
              styles.floatingOrb, 
              styles.orb2,
              {
                transform: [
                  {
                    translateY: orb2Anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 50]   // Different movement pattern
                    })
                  },
                  {
                    translateX: orb2Anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -20]  // Different direction
                    })
                  },
                  {
                    scale: orb2Anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.05] // Different scale change
                    })
                  }
                ]
              }
            ]} 
          />
        </View>

        {/* Header section with back button and instructions */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#1a223d', '#13182a']}
              style={styles.backButtonGradient}
            >
              <ArrowLeft size={24} color="#00ccff" strokeWidth={2} />
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <Text style={styles.title}>SELECT YOUR INTERESTS</Text>
            <Text style={styles.subtitle}>
              Choose topics you'd like to debate about (select at least 3)
            </Text>
            
            {/* Progress bar showing selection progress */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <Animated.View 
                  style={[
                    styles.progressFill,
                    {
                      width: `${progressPercent}%`,  // Animated width based on progress
                      backgroundColor: progressPercent === 100 
                        ? '#00ffaa'  // Green when complete
                        : '#00ccff', // Blue while in progress
                    }
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {selectedInterests.length} of 3 selected
              </Text>
            </View>
          </View>
        </View>

        {/* Scrollable grid of interest cards */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.interestsGrid}>
            {interests.map((interest) => {
              const isSelected = selectedInterests.includes(interest.id);
              return (
                <TouchableOpacity
                  key={interest.id}
                  style={[
                    styles.interestCard,
                    isSelected && styles.interestCardSelected, // Different style when selected
                    { width: CARD_WIDTH } // Responsive width
                  ]}
                  onPress={() => toggleInterest(interest.id)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={
                      isSelected
                        ? ['rgba(0, 150, 255, 0.4)', 'rgba(0, 100, 200, 0.6)'] // Blue when selected
                        : ['rgba(20, 35, 60, 0.6)', 'rgba(15, 25, 45, 0.7)']   // Dark when not selected
                    }
                    style={styles.interestGradient}
                  >
                    <Text style={styles.interestEmoji}>{interest.emoji}</Text>
                    <Text
                      style={[
                        styles.interestLabel,
                        isSelected && styles.interestLabelSelected, // Brighter text when selected
                      ]}
                    >
                      {interest.label}
                    </Text>
                    {/* Checkmark shown only when interest is selected */}
                    {isSelected && (
                      <LinearGradient
                        colors={['#00ccff', '#0077b6']}
                        style={styles.checkmark}
                      >
                        <Check size={16} color="#ffffff" strokeWidth={3} />
                      </LinearGradient>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Footer with finish button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.finishButton,
              (selectedInterests.length < 3 || isSaving) && styles.finishButtonDisabled, // Disable if not enough selections
            ]}
            onPress={handleFinish}
            disabled={selectedInterests.length < 3 || isSaving}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={
                selectedInterests.length < 3
                  ? ['#3a3f5c', '#2a304a']           // Gray when disabled
                  : ['#00ccff', '#0077b6', '#0066cc'] // Blue gradient when enabled
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.finishButtonGradient}
            >
              <Text
                style={[
                  styles.finishButtonText,
                  selectedInterests.length < 3 &&
                    styles.finishButtonTextDisabled, // Dim text when disabled
                ]}
              >
                {/* Dynamic button text based on selection count */}
                {selectedInterests.length >= 3 
                  ? 'COMPLETE REGISTRATION' 
                  : `SELECT ${3 - selectedInterests.length} MORE`}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

// All visual styling for the component
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  backgroundElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  floatingOrb: {
    position: 'absolute',
    borderRadius: 100,
    opacity: 0.1, // Very transparent for subtle background effect
  },
  orb1: {
    width: 300,
    height: 300,
    backgroundColor: '#00ccff',
    top: -100,
    right: -100,
  },
  orb2: {
    width: 200,
    height: 200,
    backgroundColor: '#8a2be2',
    bottom: -50,
    left: -50,
  },
  header: {
    padding: 24,
    paddingBottom: 16,
    marginTop: 20,
  },
  backButton: {
    marginBottom: 20,
    zIndex: 10,
  },
  backButtonGradient: {
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 150, 255, 0.3)',
    shadowColor: '#00ccff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0, 200, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#a0f0ff',
    opacity: 0.9,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  // Progress bar styles
  progressContainer: {
    width: '100%',
    marginTop: 10,
    alignItems: 'center',
  },
  progressBar: {
    height: 6,
    width: '100%',
    backgroundColor: 'rgba(100, 130, 200, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00ccff',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: CARD_GAP, // Consistent spacing between cards
  },
  interestCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#00aaff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(0, 150, 255, 0.1)',
  },
  interestCardSelected: {
    shadowColor: '#00ccff',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 10,
    borderColor: 'rgba(0, 200, 255, 0.3)',
    borderWidth: 2,
  },
  interestGradient: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  interestEmoji: {
    fontSize: 36,
    marginBottom: 10,
  },
  interestLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a0d0ff',
    textAlign: 'center',
  },
  interestLabelSelected: {
    color: '#ffffff',
    fontWeight: '700',
    textShadowColor: 'rgba(0, 200, 255, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  checkmark: {
    position: 'absolute',
    top: 12,
    right: 12,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  footer: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(10, 15, 30, 0.7)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 100, 200, 0.3)',
  },
  finishButton: {
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
    shadowColor: '#00aaff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  finishButtonDisabled: {
    shadowColor: '#3a3f5c',
  },
  finishButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  finishButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 1,
  },
  finishButtonTextDisabled: {
    color: '#a0d0ff',
  },
});