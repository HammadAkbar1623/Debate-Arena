import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Dimensions, Alert, TextInput, Modal, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Users, Zap, Clock, Flame, Shield, Calendar, Plus, X, Mic, Info } from 'lucide-react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import DateTimePicker from '@react-native-community/datetimepicker';
import { addDoc, serverTimestamp, collection, query, orderBy, updateDoc, doc, increment, onSnapshot, runTransaction, arrayUnion } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../../firebase';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState, useEffect, useMemo, useRef } from 'react';
import { router } from 'expo-router';
  
const { width: screenWidth } = Dimensions.get('window');

// Define the structure of a debate card
type DebateCardType = {
  id: string;
  topic: string;
  description: string;
  xp: number;
  participants: number;
  scheduledDate?: any;
  badges: string[];
  isLive: boolean;
  supportingSide?: string;
  opposingSide?: string;
};

// Available badges users can earn from debates
const availableBadges = [
  "Tech Expert", "Innovation", "Business Guru", "Critical Thinker",
  "Eloquent Speaker", "Research Master", "Quick Thinker", "Debate Champion"
];

export default function Home() {
  // State for tracking current card in swipe deck
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [debates, setDebates] = useState<Debate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  
  // Animation values for card gestures and effects
  const translateX = useSharedValue(0); // Horizontal swipe position
  const opacity = useSharedValue(1); // Card opacity during swipe
  const scale = useSharedValue(1); // Card scale during swipe
  const rotation = useSharedValue(0); // Card rotation during swipe
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [now, setNow] = useState(new Date());
  const pulseAnim = useSharedValue(1); // Pulsing animation for live debates
  const glowAnim = useSharedValue(0); // Glow effect for live debates
  const joinButtonScale = useSharedValue(1); // Button press animation
  const cardHoverScale = useSharedValue(1); // Subtle hover effect
  const unsubscribeRef = useRef<() => void>(undefined); // Firebase listener cleanup
  
  // Join debate modal state
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedDebateId, setSelectedDebateId] = useState('');
  const auth = getAuth();
  const uid = auth.currentUser?.uid;

  // Complete debate data structure from Firebase
  type Debate = {
    id: string;
    topic?: string;
    description?: string;
    supportingSide?: string;
    opposingSide?: string;
    xpReward?: number;
    scheduledDate?: any;
    badges?: string[];
    createdAt?: any;
    status?: string;
    participants?: number;
    forUserId?: string | null;
    againstUserId?: string | null;
    spectators?: string[];
    arguments?: { userId: string; audioUrl: string; timestamp: any }[];
    votesFor?: number;
    votesAgainst?: number;
    votedUsers?: string[];
    startTime?: any;
  };

  // Structure for creating new debates
  type NewDebate = {
    topic: string;
    description: string;
    supportingSide: string;
    opposingSide: string;
    xpReward: number;
    scheduledDate: Date;
    selectedBadges: string[];
  };

  // State for new debate form
  const [newDebate, setNewDebate] = useState<NewDebate>({
    topic: '',
    description: '',
    supportingSide: 'For',
    opposingSide: 'Against',
    xpReward: 50,
    scheduledDate: new Date(),
    selectedBadges: [],
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Format date to readable string (e.g., "Jan 15, 2:30 PM")
  const formatDate = (date: Date) => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Calculate time until debate starts (e.g., "2h 30m" or "LIVE")
  const formatTimeUntil = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    
    if (diff <= 0) return 'LIVE';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // Convert Firebase timestamp to JavaScript Date object
  const toDate = (date: any): Date | null => {
    if (date && typeof date.toDate === 'function') {
      return date.toDate();
    } else if (date) {
      return new Date(date);
    }
    return null;
  };

  // Check if debate is currently live (within 1 hour of scheduled time)
  const isDebateLive = (date: any): boolean => {
    const debateDate = toDate(date);
    if (!debateDate) return false;
    const now = new Date();
    const diff = now.getTime() - debateDate.getTime();
    return diff >= 0 && diff <= 3600000; // 1 hour window
  };

  // Subscribe to real-time debates updates from Firebase
  useEffect(() => {
    setLoading(true);
    
    // Query debates ordered by creation date (newest first)
    const q = query(collection(db, 'debates'), orderBy('createdAt', 'desc'));
    
    // Listen for real-time updates
    unsubscribeRef.current = onSnapshot(q, (snapshot) => {
      const data: Debate[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setDebates(data);
      setLoading(false);
    });

    // Update current time every minute for live status checks
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000);
    
    // Cleanup: remove listeners when component unmounts
    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
      clearInterval(interval);
    };
  }, []);

  // Transform raw debate data for display in cards
  const displayCards = useMemo(() => {
    return debates
      .map(debate => ({
        id: debate.id,
        topic: debate.topic || 'Untitled',
        description: debate.description || 'No description',
        xp: debate.xpReward || 0,
        participants: debate.participants || 0,
        badges: debate.badges || [],
        scheduledDate: debate.scheduledDate,
        isLive: debate.scheduledDate ? isDebateLive(debate.scheduledDate) : false,
        supportingSide: debate.supportingSide || 'For',
        opposingSide: debate.opposingSide || 'Against',
      }));
  }, [debates]);

  // Get current card for display
  const currentCard = displayCards.length > 0 && currentCardIndex < displayCards.length
    ? displayCards[currentCardIndex]
    : null;

  // Add pulsing animation for debates that are about to go live
  useEffect(() => {
    if (currentCard?.scheduledDate) {
      const debateDate = toDate(currentCard.scheduledDate);
      if (debateDate) {
        const timeDiff = debateDate.getTime() - new Date().getTime();
        // If debate starts within 1 hour, start pulsing animation
        if (timeDiff < 3600000 && timeDiff >= -3600000) {
          pulseAnim.value = withRepeat(
            withSequence(
              withTiming(1.03, { duration: 800 }),
              withTiming(1, { duration: 800 })
            ),
            -1, // Infinite repeats
            true // Reverse animation
          );
          glowAnim.value = withRepeat(
            withSequence(
              withTiming(0.5, { duration: 800 }),
              withTiming(0, { duration: 800 })
            ),
            -1,
            true
          );
        } else {
          pulseAnim.value = 1;
          glowAnim.value = 0;
        }
      }
    } else {
      pulseAnim.value = 1;
      glowAnim.value = 0;
    }
  }, [currentCard]);

  // Subtle hover animation for cards
  useEffect(() => {
    cardHoverScale.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1, // Infinite loop
      true // Reverse animation
    );
  }, []);

  // Swipe left to skip debate (move to next card)
  const swipeLeft = () => {
    setCurrentCardIndex((prev) => displayCards.length > 0 ? (prev + 1) % displayCards.length : 0);
    // Reset animation values
    translateX.value = 0;
    opacity.value = 1;
    scale.value = 1;
    rotation.value = 0;
  };

  // Swipe right to join debate
  const swipeRight = () => {
    if (currentCard) {
      setSelectedDebateId(currentCard.id);
      setShowJoinModal(true); // Show role selection modal
    }
  };

  // Join a debate with specific role (for, against, or spectator)
  const joinWithRole = async (role: 'for' | 'against' | 'spectator') => {
    if (!uid) {
      Alert.alert('Error', 'You must be logged in to join.');
      return;
    }
    const debateRef = doc(db, 'debates', selectedDebateId);
    try {
      // Use transaction to ensure data consistency
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(debateRef);
        if (!snap.exists()) throw new Error('Debate not found');
        const data = snap.data();
        let newFor = data.forUserId;
        let newAgainst = data.againstUserId;
        let newSpectators = data.spectators || [];
        
        // Assign user to selected role
        if (role === 'for') {
          if (data.forUserId) throw new Error('For side is already taken');
          newFor = uid;
          transaction.update(debateRef, { forUserId: uid });
        } else if (role === 'against') {
          if (data.againstUserId) throw new Error('Against side is already taken');
          newAgainst = uid;
          transaction.update(debateRef, { againstUserId: uid });
        } else {
          // Spectator role
          if (newSpectators.includes(uid)) throw new Error('Already joined as spectator');
          newSpectators = [...newSpectators, uid];
          transaction.update(debateRef, { spectators: arrayUnion(uid) });
        }
        
        // Update participant count
        transaction.update(debateRef, { participants: (data.participants || 0) + 1 });
        
        // If both sides are filled, start the debate
        if (newFor && newAgainst && data.status === 'waiting') {
          transaction.update(debateRef, { status: 'ongoing', startTime: serverTimestamp() });
        }
      });
      setShowJoinModal(false);
      // Navigate to debate screen
      router.push({ pathname: "/debateScreen/[id]", params: { id: selectedDebateId } });
    } catch (error: any) {
      console.error('Error joining debate:', error);
      Alert.alert('Error', error.message || 'Failed to join. Please try again.');
    }
  };

  // Gesture handler for card swiping
  const gesture = Gesture.Pan()
    .minDistance(10) // Minimum movement to start gesture
    .onUpdate((event) => {
      // Update animation values based on swipe position
      translateX.value = event.translationX;
      opacity.value = 1 - Math.abs(event.translationX) / (screenWidth * 0.6);
      scale.value = 1 - Math.abs(event.translationX) / (screenWidth * 2);
      rotation.value = (event.translationX / screenWidth) * 15;
    })
    .onEnd((event) => {
      // Check if swipe passed threshold
      if (event.translationX > screenWidth * 0.3) {
        // Swipe right - join debate
        translateX.value = withSpring(screenWidth);
        opacity.value = withSpring(0, undefined, () => {
          runOnJS(swipeRight)(); // Run on JS thread
        });
      } else if (event.translationX < -screenWidth * 0.3) {
        // Swipe left - skip debate
        translateX.value = withSpring(-screenWidth);
        opacity.value = withSpring(0, undefined, () => {
          runOnJS(swipeLeft)();
        });
      } else {
        // Return to center if not enough swipe
        translateX.value = withSpring(0);
        opacity.value = withSpring(1);
        scale.value = withSpring(1);
        rotation.value = withSpring(0);
      }
    });

  // Animation styles for card during swipe
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { scale: scale.value * cardHoverScale.value },
      { rotateZ: rotation.value + 'deg' },
    ],
    opacity: opacity.value,
    shadowColor: '#00ccff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: glowAnim.value, // Glow effect for live debates
    shadowRadius: 12,
  }));

  // Pulsing animation style for live debates
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  // Join button animation style
  const joinButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: joinButtonScale.value }],
  }));

  // Open create debate modal
  const handleCreateDebate = () => {
    setShowCreateModal(true);
  };

  // Submit new debate to Firebase
  const handleSubmitDebate = async () => {
    if (!newDebate.topic || !newDebate.description) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      await addDoc(collection(db, "debates"), {
        topic: newDebate.topic,
        description: newDebate.description,
        supportingSide: newDebate.supportingSide,
        opposingSide: newDebate.opposingSide,
        xpReward: newDebate.xpReward,
        scheduledDate: newDebate.scheduledDate,
        badges: newDebate.selectedBadges,
        createdAt: serverTimestamp(),
        status: 'waiting',
        participants: 0,
        forUserId: null,
        againstUserId: null,
        spectators: [],
        arguments: [],
        votesFor: 0,
        votesAgainst: 0,
        votedUsers: [],
        startTime: null,
      });

      Alert.alert('Success', 'Debate created successfully!');
      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      console.error("Error adding document: ", error);
      Alert.alert('Error', 'Failed to create debate. Please try again.');
    }
  };

  // Reset form after submission
  const resetForm = () => {
    setNewDebate({
      topic: '',
      description: '',
      supportingSide: 'For',
      opposingSide: 'Against',
      xpReward: 50,
      scheduledDate: new Date(),
      selectedBadges: [],
    });
  };

  // Toggle badge selection in create form
  const toggleBadge = (badge: string) => {
    setNewDebate(prev => {
      const selectedBadges = [...prev.selectedBadges];
      if (selectedBadges.includes(badge)) {
        return { ...prev, selectedBadges: selectedBadges.filter(b => b !== badge) };
      } else {
        return { ...prev, selectedBadges: [...selectedBadges, badge] };
      }
    });
  };

  // Handle date selection from picker
  const onDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date | undefined
  ) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setNewDebate({ ...newDebate, scheduledDate: selectedDate });
    }
  };

  // Show debate details in alert
  const handleViewDetails = (card: DebateCardType) => {
    Alert.alert(
      card.topic,
      `Description: ${card.description}\n\nSides:\n- ${card.supportingSide}\n- ${card.opposingSide}\n\nXP: ${card.xp}\nParticipants: ${card.participants}/20\nScheduled: ${card.scheduledDate ? formatDate(toDate(card.scheduledDate)!) : 'N/A'}`,
      [{ text: 'OK' }]
    );
  };

  // Hide swipe hint after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowSwipeHint(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  // Loading screen while fetching debates
  if (loading) {
    return (
      <LinearGradient
        colors={['#1a2746', '#2a3a8c', '#3a4f8f']}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5a7cff" />
          <Text style={styles.loadingText}>Loading debates...</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Main app interface
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1a2746', '#2a3a8c', '#3a4f8f']}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Header with greeting and streak */}
        <View style={styles.header}>
          <LinearGradient
            colors={['#1c2a4d', '#3a4f8f']}
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.headerContent}>
              <View style={styles.headerTop}>
                <Text style={styles.greeting}>Ready to Debate?</Text>
                <View style={styles.streakContainer}>
                  <Flame size={20} color="#ff7e5f" strokeWidth={2.5} />
                  <Text style={styles.streakText}>7</Text>
                </View>
              </View>
              <Text style={styles.subtitle}>
                Swipe right to join or left to skip
              </Text>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.mainContent}>
          {displayCards.length > 0 && currentCard ? (
            <View style={styles.cardContainer}>
              <Animated.View style={pulseStyle}>
                {/* Swipeable debate card */}
                <GestureDetector gesture={gesture}>
                  <Animated.View style={[styles.card, animatedStyle]}>
                    <LinearGradient
                      colors={['#1a2746', '#2a3a8c']}
                      style={styles.cardGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <View style={styles.cardOverlay}>
                        {/* Debate topic and info button */}
                        <View style={styles.topicContainer}>
                          <Mic size={24} color="#00ccff" strokeWidth={2.5} />
                          <Text style={styles.cardTitle}>
                            {currentCard.topic}
                          </Text>
                          <TouchableOpacity
                            style={styles.detailsIcon}
                            onPress={() => handleViewDetails(currentCard)}
                          >
                            <Info size={20} color="#00ccff" strokeWidth={2.5} />
                          </TouchableOpacity>
                        </View>

                        <Text style={styles.cardDescription} numberOfLines={3} ellipsizeMode="tail">
                          {currentCard.description}
                        </Text>

                        {/* Debate sides (For/Against) */}
                        <View style={styles.sidesContainer}>
                          <View style={styles.sideItem}>
                            <Text style={styles.sideLabel}>For</Text>
                            <Text style={styles.sideText}>{currentCard.supportingSide}</Text>
                          </View>
                          <View style={styles.sideItem}>
                            <Text style={styles.sideLabel}>Against</Text>
                            <Text style={styles.sideText}>{currentCard.opposingSide}</Text>
                          </View>
                        </View>

                        {/* Debate stats (XP, Participants, Time) */}
                        <View style={styles.cardStats}>
                          <View style={styles.statItem}>
                            <Zap size={18} color="#00ccff" strokeWidth={2.5} />
                            <Text style={styles.statText}>
                              {currentCard.xp} XP
                            </Text>
                          </View>

                          <View style={styles.statItem}>
                            <Users size={18} color="#00ccff" strokeWidth={2.5} />
                            <Text style={styles.statText}>
                              {currentCard.participants}/20
                            </Text>
                          </View>

                          {currentCard.scheduledDate && (
                            <View style={styles.statItem}>
                              <Clock size={18} color="#00ccff" strokeWidth={2.5} />
                              <Text style={[styles.statText, currentCard.isLive && styles.liveText]}>
                                {formatTimeUntil(toDate(currentCard.scheduledDate)!)}
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Scheduled date and live indicator */}
                        {currentCard.scheduledDate && (
                          <View style={styles.dateContainer}>
                            <Calendar size={16} color="#00ccff" />
                            <Text style={styles.dateText}>
                              {formatDate(toDate(currentCard.scheduledDate)!)}
                            </Text>
                            {currentCard.isLive && (
                              <View style={styles.liveBadge}>
                                <Text style={styles.liveBadgeText}>LIVE</Text>
                              </View>
                            )}
                          </View>
                        )}

                        {/* Badges available for this debate */}
                        <View style={styles.badgesContainer}>
                          <View style={styles.badges}>
                            {currentCard.badges?.slice(0, 3).map((badge, index) => (
                              <LinearGradient
                                key={index}
                                colors={['#5a7cff', '#3a4f8f']}
                                style={styles.badge}
                              >
                                <Shield size={14} color="#e0e0ff" strokeWidth={2.5} />
                                <Text style={styles.badgeText}>{badge}</Text>
                              </LinearGradient>
                            ))}
                          </View>
                        </View>

                        {/* Hidden join button (activated by swipe) */}
                        <Animated.View style={[styles.joinButton, joinButtonStyle]}>
                          <TouchableOpacity
                            onPress={() => {
                              joinButtonScale.value = withSequence(
                                withTiming(0.92, { duration: 150 }),
                                withTiming(1, { duration: 150 })
                              );
                              swipeRight();
                            }}
                          >
                          </TouchableOpacity>
                        </Animated.View>
                      </View>
                    </LinearGradient>
                  </Animated.View>
                </GestureDetector>
              </Animated.View>

              {/* Swipe instructions hint */}
              {showSwipeHint && (
                <View style={styles.swipeHint}>
                  <LinearGradient
                    colors={['#3a4f8f', '#5a7cff']}
                    style={styles.swipeHintGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.swipeHintText}>
                      Swipe right to join or left to skip
                    </Text>
                  </LinearGradient>
                </View>
              )}

              {/* Card position indicators */}
              <View style={styles.cardIndicators}>
                {displayCards.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.indicator,
                      index === currentCardIndex && styles.activeIndicator
                    ]}
                  />
                ))}
              </View>
            </View>
          ) : (
            // Empty state when no debates available
            <View style={styles.noDebatesContainer}>
              <Text style={styles.noDebatesText}>No debates available</Text>
              <Text style={styles.noDebatesSubtext}>Create one to get started!</Text>
            </View>
          )}

          {/* Create new debate button */}
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateDebate}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#3a4f8f', '#5a7cff']}
              style={styles.createButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Plus size={24} color="#e0e0ff" strokeWidth={2.5} />
              <Text style={styles.createButtonText}>Create Debate</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Create Debate Modal */}
          <Modal
            visible={showCreateModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowCreateModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowCreateModal(false)}
                >
                  <X size={28} color="#e0e0ff" strokeWidth={2.5} />
                </TouchableOpacity>

                <ScrollView contentContainerStyle={styles.modalScrollContent}>
                  <Text style={styles.modalTitle}>Create New Debate</Text>

                  {/* Debate topic input */}
                  <Text style={styles.inputLabel}>Debate Topic*</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter debate topic"
                    placeholderTextColor="#a0c0ff"
                    value={newDebate.topic}
                    onChangeText={text => setNewDebate({ ...newDebate, topic: text })}
                  />

                  {/* Debate description input */}
                  <Text style={styles.inputLabel}>Description*</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Enter debate description"
                    placeholderTextColor="#a0c0ff"
                    multiline={true}
                    numberOfLines={4}
                    value={newDebate.description}
                    onChangeText={text => setNewDebate({ ...newDebate, description: text })}
                  />

                  {/* Debate sides configuration */}
                  <View style={styles.sidesContainer}>
                    <View style={styles.sideInputContainer}>
                      <Text style={styles.inputLabel}>Supporting Side</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="For"
                        placeholderTextColor="#a0c0ff"
                        value={newDebate.supportingSide}
                        onChangeText={text => setNewDebate({ ...newDebate, supportingSide: text })}
                      />
                    </View>

                    <View style={styles.sideInputContainer}>
                      <Text style={styles.inputLabel}>Opposing Side</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Against"
                        placeholderTextColor="#a0c0ff"
                        value={newDebate.opposingSide}
                        onChangeText={text => setNewDebate({ ...newDebate, opposingSide: text })}
                      />
                    </View>
                  </View>

                  {/* XP reward input */}
                  <Text style={styles.inputLabel}>XP Reward*</Text>
                  <View style={styles.xpContainer}>
                    <TextInput
                      style={[styles.input, styles.xpInput]}
                      placeholder="50"
                      placeholderTextColor="#a0c0ff"
                      keyboardType="numeric"
                      value={String(newDebate.xpReward)}
                      onChangeText={text => {
                        const num = parseInt(text) || 0;
                        if (num >= 0 && num <= 1000) {
                          setNewDebate({ ...newDebate, xpReward: num });
                        }
                      }}
                    />
                    <View style={styles.xpInfo}>
                      <Zap size={18} color="#00ccff" strokeWidth={2.5} />
                      <Text style={styles.xpInfoText}>Winner receives this XP</Text>
                    </View>
                  </View>

                  {/* Schedule date picker */}
                  <Text style={styles.inputLabel}>Schedule Debate</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Calendar size={18} color="#00ccff" strokeWidth={2.5} />
                    <Text style={styles.dateText}>
                      {formatDate(newDebate.scheduledDate)}
                    </Text>
                  </TouchableOpacity>

                  {showDatePicker && (
                    <DateTimePicker
                      value={newDebate.scheduledDate}
                      mode="datetime"
                      display="default"
                      onChange={onDateChange}
                    />
                  )}

                  {/* Badge selection */}
                  <Text style={styles.inputLabel}>Badges for Winner</Text>
                  <Text style={styles.badgeSubtitle}>Select badges the winner will earn</Text>
                  <View style={styles.badgesGrid}>
                    {availableBadges.map((badge, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.badgeOption,
                          newDebate.selectedBadges.includes(badge) && styles.selectedBadge
                        ]}
                        onPress={() => toggleBadge(badge)}
                      >
                        <Shield size={16} color="#00ccff" strokeWidth={2.5} />
                        <Text style={styles.badgeOptionText}>{badge}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Submit button */}
                  <TouchableOpacity
                    style={styles.submitButton}
                    onPress={handleSubmitDebate}
                  >
                    <LinearGradient
                      colors={['#3a4f8f', '#5a7cff']}
                      style={styles.submitButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={styles.submitButtonText}>Create Debate</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* Join Debate Role Selection Modal */}
          <Modal
            visible={showJoinModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowJoinModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { maxHeight: 300 }]}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowJoinModal(false)}
                >
                  <X size={28} color="#e0e0ff" strokeWidth={2.5} />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Join As</Text>
                {/* Role selection buttons */}
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={() => joinWithRole('for')}
                >
                  <LinearGradient
                    colors={['#3a4f8f', '#5a7cff']}
                    style={styles.submitButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.submitButtonText}>For Side</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={() => joinWithRole('against')}
                >
                  <LinearGradient
                    colors={['#3a4f8f', '#5a7cff']}
                    style={styles.submitButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.submitButtonText}>Against Side</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={() => joinWithRole('spectator')}
                >
                  <LinearGradient
                    colors={['#3a4f8f', '#5a7cff']}
                    style={styles.submitButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.submitButtonText}>Spectator</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 20,
    color: '#e0e0ff',
    fontWeight: '600',
    marginTop: 20,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  mainContent: {
    flex: 1,
    paddingTop: 16,
  },
  header: {
    padding: 20,
    paddingTop: 12,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  headerGradient: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(58, 79, 143, 0.5)',
  },
  headerContent: {
    gap: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 24,
    fontWeight: '800',
    color: '#e0e0ff',
    letterSpacing: 0.5,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 110, 80, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 110, 80, 0.4)',
  },
  streakText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ff7e5f',
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#a0c0ff',
    opacity: 0.9,
    letterSpacing: 0.2,
  },
  cardContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    height: 460,
  },
  card: {
    height: '100%',
    borderRadius: 24,
    shadowColor: '#3a4f8f',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(58, 79, 143, 0.5)',
  },
  cardGradient: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
  },
  cardOverlay: {
    flex: 1,
    padding: 24,
    borderRadius: 24,
    backgroundColor: 'rgba(10, 15, 40, 0.2)',
  },
  topicContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#e0e0ff',
    marginLeft: 10,
    lineHeight: 28,
    flex: 1,
    letterSpacing: 0.3,
  },
  detailsIcon: {
    padding: 8,
  },
  cardDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#d0e0ff',
    opacity: 0.9,
    lineHeight: 22,
    marginBottom: 16,
  },
  sideItem: {
    flex: 1,
    alignItems: 'center',
  },
  sideLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#a0c0ff',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  sideText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e0e0ff',
  },
  cardStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(0, 10, 30, 0.3)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(58, 79, 143, 0.5)',
  },
  statItem: {
    alignItems: 'center',
    gap: 6,
    minWidth: 70,
  },
  statText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e0e0ff',
    letterSpacing: 0.2,
  },
  liveText: {
    color: '#ff4d4d',
    fontWeight: '800',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(58, 79, 143, 0.2)',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(58, 79, 143, 0.5)',
    marginBottom: 16,
    justifyContent: 'center',
  },
  dateText: {
    color: '#e0e0ff',
    fontSize: 15,
    marginLeft: 8,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  liveBadge: {
    backgroundColor: '#ff4d4d',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  liveBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  badgesContainer: {
    marginBottom: 16,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(58, 79, 143, 0.5)',
    shadowColor: '#3a4f8f',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e0e0ff',
    letterSpacing: 0.2,
  },
  joinButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#3a4f8f',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  joinButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  joinButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#e0e0ff',
    letterSpacing: 0.3,
  },
  swipeHint: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    borderRadius: 14,
    overflow: 'hidden',
  },
  swipeHintGradient: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  swipeHintText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e0e0ff',
    letterSpacing: 0.2,
  },
  cardIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    gap: 6,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(224, 224, 255, 0.3)',
  },
  activeIndicator: {
    backgroundColor: '#5a7cff',
    width: 20,
  },
  noDebatesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  noDebatesText: {
    fontSize: 20,
    color: '#e0e0ff',
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  noDebatesSubtext: {
    fontSize: 16,
    color: '#a0c0ff',
    textAlign: 'center',
    fontWeight: '600',
  },
  createButton: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    borderRadius: 24,
    shadowColor: '#3a4f8f',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e0e0ff',
    marginLeft: 8,
    letterSpacing: 0.2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 10, 25, 0.9)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a2746',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingTop: 36,
    maxHeight: Dimensions.get('window').height * 0.9,
    borderWidth: 1,
    borderColor: 'rgba(58, 79, 143, 0.5)',
  },
  modalScrollContent: {
    paddingBottom: 24,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 20,
    backgroundColor: 'rgba(224, 224, 255, 0.15)',
    borderRadius: 20,
    padding: 6,
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'rgba(224, 224, 255, 0.2)',
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#e0e0ff',
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 0.5,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e0e0ff',
    marginBottom: 8,
    marginTop: 16,
    letterSpacing: 0.2,
  },
  badgeSubtitle: {
    fontSize: 13,
    color: '#a0c0ff',
    marginBottom: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  input: {
    backgroundColor: '#2a3a8c',
    borderRadius: 14,
    padding: 14,
    color: '#e0e0ff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(58, 79, 143, 0.5)',
    fontWeight: '600',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  sidesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sideInputContainer: {
    width: '48%',
  },
  xpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  xpInput: {
    flex: 1,
  },
  xpInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(58, 79, 143, 0.2)',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(58, 79, 143, 0.5)',
    flex: 2,
  },
  xpInfoText: {
    fontSize: 13,
    color: '#e0e0ff',
    marginLeft: 6,
    fontWeight: '600',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(58, 79, 143, 0.2)',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(58, 79, 143, 0.5)',
    marginBottom: 12,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  badgeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(224, 224, 255, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(58, 79, 143, 0.5)',
    marginBottom: 10,
    width: '48%',
  },
  selectedBadge: {
    backgroundColor: 'rgba(58, 79, 143, 0.3)',
    borderColor: 'rgba(58, 79, 143, 0.7)',
  },
  badgeOptionText: {
    color: '#e0e0ff',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  submitButton: {
    marginTop: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#3a4f8f',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  submitButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#e0e0ff',
    letterSpacing: 0.3,
  },
});
