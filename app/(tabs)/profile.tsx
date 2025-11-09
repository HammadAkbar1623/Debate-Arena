import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Animated, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, MessageCircle, Settings, Users, TrendingUp, Flame, Target, ChevronRight } from 'lucide-react-native';
import { GitMerge } from 'react-native-feather';
import { getAuth } from 'firebase/auth';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase.js';
import type { DocumentData } from 'firebase/firestore';

const { width } = Dimensions.get('window');

// Level calculation system - these numbers control how much XP is needed for each level
const baseXP = 100;  // Base amount of XP needed
const power = 1.5;   // Controls how quickly XP requirements grow with each level

// Calculate what level a user should be based on their total XP
const calculateLevel = (xp: number): number => {
  let level = 1;
  // Keep increasing level until user doesn't have enough XP for next level
  while (xp >= xpForLevel(level + 1)) {
    level++;
  }
  return level;
};

// Calculate how much XP is needed to reach a specific level
const xpForLevel = (level: number): number => {
  if (level <= 1) return 0;  // Level 1 requires 0 XP
  return baseXP * Math.pow(level - 1, power);  // XP needed grows exponentially
};

// Sample achievement badges (in real app, these would come from database)
const badges = [
  { id: 1, name: 'First Victory', icon: '🏆', color: '#FFD700' },
  { id: 2, name: 'Streak Master', icon: '🔥', color: '#FF6B6B' },
];

// Sample recent debates data (in real app, these would come from database)
const recentDebates = [
  {
    id: 1,
    topic: 'AI Ethics',
    result: 'won',
    xp: '+150',
    opponent: 'DebateMaster99',
  },
];

export default function Profile() {
  // State to manage various aspects of the profile screen
  const [showChat, setShowChat] = useState(false);        // Control chat visibility
  const [userData, setUserData] = useState<DocumentData | null>(null);  // Store user data from Firestore
  const [loading, setLoading] = useState(true);           // Track if data is still loading
  const [progressAnim] = useState(new Animated.Value(0)); // Animation for XP progress bar
  const [currentLevel, setCurrentLevel] = useState(1);    // Track user's current level
  const auth = getAuth();  // Get Firebase authentication instance

  // Load user data when component mounts
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'No user is currently logged in');
      setLoading(false);
      return;
    }

    // Reference to user's document in Firestore
    const userRef = doc(db, 'users', user.uid);
    
    // Set up real-time listener for user data changes
    const unsubscribe = onSnapshot(userRef, async (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const xp = data.XP || 0;        // Get XP, default to 0 if not set
        const dbLevel = data.level;     // Get level stored in database
        const newLevel = calculateLevel(xp);  // Calculate what level user should be

        setUserData(data);
        setCurrentLevel(newLevel);

        // Update database if calculated level is different from stored level
        if (dbLevel !== newLevel) {
          try {
            await updateDoc(userRef, { level: newLevel });
          } catch (error) {
            console.error('Error updating level:', error);
          }
        }

        // Calculate progress towards next level for the progress bar
        const xpForCurrentLevel = xpForLevel(newLevel);
        const xpForNextLevel = xpForLevel(newLevel + 1);
        const progress = (xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel) * 100;

        // Animate the progress bar to show current progress
        Animated.timing(progressAnim, {
          toValue: Math.min(100, Math.max(0, progress)),  // Keep between 0-100%
          duration: 1000,  // Animate over 1 second
          useNativeDriver: false,  // Cannot use native driver for width animations
        }).start();
      } else {
        Alert.alert('Error', 'User data not found');
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching user data:', error);
      setLoading(false);
    });

    // Clean up the real-time listener when component unmounts
    return () => unsubscribe();
  }, [auth.currentUser]);

  // Calculate XP needed for next level
  const currentXP = userData?.XP || 0;
  const xpForNextLevel = xpForLevel(currentLevel + 1);
  const xpNeeded = Math.ceil(xpForNextLevel - currentXP);

  // Show loading spinner while data is being fetched
  if (loading) return <ActivityIndicator size="large" color="#00ccff" />;

  // Create animated version of LinearGradient for the XP progress bar
  const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);
  
  // Get first letter of user's name for avatar, or '?' if no name
  const firstLetter = userData?.firstName ? userData.firstName.charAt(0).toUpperCase() : '?';

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#0a0e17', '#13182a', '#1a223d']}  // Dark blue gradient background
        style={styles.container}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header Section with User Profile */}
          <LinearGradient
            colors={['rgba(20, 35, 60, 0.8)', 'rgba(15, 25, 45, 0.9)']}
            style={styles.header}
          >
            {/* Settings button in top right */}
            <TouchableOpacity style={styles.settingsButton}>
              <Settings size={24} color="#00ccff" strokeWidth={2} />
            </TouchableOpacity>

            {/* User profile information */}
            <View style={styles.profileSection}>
              {/* Circular avatar with gradient background */}
              <LinearGradient
                colors={['#00ccff', '#0077b6']}
                style={styles.avatarGradient}
              >
                <Text style={styles.avatarInitials}>{firstLetter}</Text>
              </LinearGradient>
              
              {/* User's display name */}
              <Text style={styles.name}>{userData?.firstName}</Text>
              
              {/* Username/nickname */}
              <Text style={styles.nickname}>@{userData?.nickname || 'debater'}</Text>

              {/* Level and XP information */}
              <View style={styles.levelContainer}>
                {/* Current level badge */}
                <View style={styles.levelBadge}>
                  <Text style={styles.levelText}>Level {currentLevel}</Text>
                </View>
                
                {/* XP progress section */}
                <View style={styles.xpContainer}>
                  <Text style={styles.xpText}>{currentXP} XP</Text>
                  
                  {/* XP progress bar */}
                  <View style={styles.xpBar}>
                    <AnimatedGradient
                      colors={['#FFD700', '#FFA500']}  // Gold gradient for progress
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[
                        styles.xpProgress,
                        {
                          // Animate width based on progress towards next level
                          width: progressAnim.interpolate({
                            inputRange: [0, 100],
                            outputRange: ['0%', '100%']
                          })
                        }
                      ]}
                    />
                  </View>
                  
                  {/* Text showing XP needed for next level */}
                  <Text style={styles.xpNext}>
                    {xpNeeded > 0 ? `${xpNeeded} XP to Level ${currentLevel + 1}` : 'Ready for Level Up!'}
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>

          {/* Main Content Area */}
          <View style={styles.content}>
            {/* Statistics Section - Horizontal Scroll */}
            <View style={styles.statsSection}>
              <Text style={styles.sectionTitle}>DEBATE STATS</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.statsScrollContainer}
              >
                {/* Wins Stat Card */}
                <LinearGradient
                  colors={['rgba(20, 35, 60, 0.8)', 'rgba(15, 25, 45, 0.9)']}
                  style={styles.statCard}
                >
                  <Trophy size={24} color="#FFD700" strokeWidth={2} />
                  <Text style={styles.statValue}>{userData?.Wins}</Text>
                  <Text style={styles.statLabel}>WINS</Text>
                </LinearGradient>

                {/* Losses Stat Card */}
                <LinearGradient
                  colors={['rgba(20, 35, 60, 0.8)', 'rgba(15, 25, 45, 0.9)']}
                  style={styles.statCard}
                >
                  <Target size={24} color="#FF6B6B" strokeWidth={2} />
                  <Text style={styles.statValue}>{userData?.Losses}</Text>
                  <Text style={styles.statLabel}>LOSSES</Text>
                </LinearGradient>

                {/* Ties Stat Card */}
                <LinearGradient
                  colors={['rgba(20, 35, 60, 0.8)', 'rgba(15, 25, 45, 0.9)']}
                  style={styles.statCard}
                >
                  <GitMerge width={24} height={24} color="#9CA3AF" strokeWidth={2} />
                  <Text style={styles.statValue}>{userData?.Ties}</Text>
                  <Text style={styles.statLabel}>TIES</Text>
                </LinearGradient>

                {/* Streak Stat Card */}
                <LinearGradient
                  colors={['rgba(20, 35, 60, 0.8)', 'rgba(15, 25, 45, 0.9)']}
                  style={styles.statCard}
                >
                  <Flame size={24} color="#FF4500" strokeWidth={2} />
                  <Text style={styles.statValue}>{userData?.Streaks}</Text>
                  <Text style={styles.statLabel}>STREAK</Text>
                </LinearGradient>

                {/* Win Rate Stat Card */}
                <LinearGradient
                  colors={['rgba(20, 35, 60, 0.8)', 'rgba(15, 25, 45, 0.9)']}
                  style={styles.statCard}
                >
                  <TrendingUp size={24} color="#10B981" strokeWidth={2} />
                  <Text style={styles.statValue}>
                    {/* Calculate win percentage, show 0% if no debates */}
                    {userData?.Losses || userData?.Wins
                      ? `${Math.round((userData.Wins / (userData.Wins + userData.Losses)) * 100)}%`
                      : '0%'}
                  </Text>
                  <Text style={styles.statLabel}>WIN RATE</Text>
                </LinearGradient>
              </ScrollView>
            </View>

            {/* Achievements Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>ACHIEVEMENTS</Text>
                <TouchableOpacity style={styles.viewAllButton}>
                  <Text style={styles.viewAllText}>View All</Text>
                  <ChevronRight size={16} color="#00ccff" />
                </TouchableOpacity>
              </View>
              
              {/* Horizontal scroll for badges/achievements */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.badgesContainer}
              >
                {badges.map((badge) => (
                  <LinearGradient
                    key={badge.id}
                    colors={['rgba(20, 35, 60, 0.8)', 'rgba(15, 25, 45, 0.9)']}
                    style={[styles.badgeCard, { borderColor: badge.color }]}  // Color-coded border
                  >
                    <Text style={styles.badgeIcon}>{badge.icon}</Text>
                    <Text style={styles.badgeName}>{badge.name}</Text>
                  </LinearGradient>
                ))}
              </ScrollView>
            </View>

            {/* Recent Debates Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>RECENT DEBATES</Text>
                <TouchableOpacity style={styles.viewAllButton}>
                  <Text style={styles.viewAllText}>View All</Text>
                  <ChevronRight size={16} color="#00ccff" />
                </TouchableOpacity>
              </View>

              {/* List of recent debates */}
              {recentDebates.map((debate) => (
                <LinearGradient
                  key={debate.id}
                  colors={['rgba(20, 35, 60, 0.8)', 'rgba(15, 25, 45, 0.9)']}
                  style={styles.debateCard}
                >
                  <View style={styles.debateContent}>
                    <Text style={styles.debateTopic}>{debate.topic}</Text>
                    <Text style={styles.debateOpponent}>
                      vs {debate.opponent}
                    </Text>
                  </View>
                  <View style={styles.debateResult}>
                    {/* Result badge with color based on win/loss */}
                    <View
                      style={[
                        styles.resultBadge,
                        {
                          backgroundColor:
                            debate.result === 'won' ? '#10B981' : '#FF6B6B',  // Green for win, red for loss
                        },
                      ]}
                    >
                      <Text style={styles.resultText}>
                        {debate.result.toUpperCase()}
                      </Text>
                    </View>
                    {/* XP gained/lost with color coding */}
                    <Text
                      style={[
                        styles.xpChange,
                        {
                          color:
                            debate.result === 'won' ? '#10B981' : '#FF6B6B',
                        },
                      ]}
                    >
                      {debate.xp} XP
                    </Text>
                  </View>
                </LinearGradient>
              ))}
            </View>

            {/* Friends Section - Coming Soon */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>FRIENDS</Text>
                <TouchableOpacity>
                  <Users size={22} color="#00ccff" strokeWidth={2} />
                </TouchableOpacity>
              </View>

              {/* Metallic blue "Coming Soon" placeholder */}
              <LinearGradient
                colors={['#2a4d7a', '#1a3257', '#0d1f3d']}  // Metallic blue gradient
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.metallicContainer}
              >
                {/* Shine effect overlay */}
                <View style={styles.shineOverlay} />

                {/* Diagonal shine lines for metallic effect */}
                <View style={styles.diagonalShine} />
                <View style={[styles.diagonalShine, {
                  top: 30,
                  left: 30,
                  transform: [{ rotate: '45deg' }]
                }]} />

                <Text style={styles.metallicText}>COMING SOON</Text>
              </LinearGradient>
            </View>
          </View>
        </ScrollView>

        {/* Floating Support/Chat Button */}
        <TouchableOpacity
          style={styles.supportButton}
          onPress={() => setShowChat(true)}
        >
          <LinearGradient
            colors={['#00ccff', '#0077b6']}
            style={styles.supportButtonGradient}
          >
            <MessageCircle size={24} color="#ffffff" strokeWidth={2} />
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </SafeAreaView>
  );
}

// All visual styling for the component
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 30,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 150, 255, 0.3)',
    shadowColor: '#00aaff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  settingsButton: {
    position: 'absolute',
    top: 16,
    right: 20,
    zIndex: 10,
  },
  profileSection: {
    alignItems: 'center',
    marginTop: 20,
  },
  avatarGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarInitials: {
    fontSize: 42,
    fontWeight: 'bold',
    color: 'white',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  nickname: {
    fontSize: 16,
    color: '#a0a0a0',
    marginBottom: 20,
  },
  levelContainer: {
    width: '100%',
    alignItems: 'center',
  },
  levelBadge: {
    backgroundColor: 'rgba(0, 204, 255, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#00ccff',
    marginBottom: 16,
  },
  levelText: {
    color: '#00ccff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  xpContainer: {
    width: '100%',
    alignItems: 'center',
  },
  xpText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 6,
  },
  xpBar: {
    width: '90%',
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 6,
  },
  xpProgress: {
    height: '100%',
    borderRadius: 6,
  },
  xpNext: {
    color: '#a0a0a0',
    fontSize: 12,
  },
  content: {
    padding: 20,
    paddingBottom: 50,
  },
  statsSection: {
    marginBottom: 25,
  },
  sectionTitle: {
    color: '#00ccff',
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  statsScrollContainer: {
    paddingHorizontal: 4,
  },
  statCard: {
    width: width * 0.4,  // Each stat card takes 40% of screen width
    height: 120,
    padding: 16,
    borderRadius: 16,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    marginVertical: 6,
  },
  statLabel: {
    color: '#a0a0a0',
    fontSize: 14,
  },
  section: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    color: '#00ccff',
    fontSize: 14,
    marginRight: 2,
  },
  badgesContainer: {
    paddingVertical: 4,
  },
  badgeCard: {
    width: 120,
    height: 120,
    padding: 16,
    borderRadius: 16,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,  // Colored border for each badge
  },
  badgeIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  badgeName: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
  debateCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  debateContent: {
    flex: 1,
  },
  debateTopic: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 6,
  },
  debateOpponent: {
    color: '#a0a0a0',
    fontSize: 14,
  },
  debateResult: {
    alignItems: 'flex-end',
  },
  resultBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 6,
  },
  resultText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  xpChange: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  metallicContainer: {
    height: 150,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 204, 255, 0.3)',
    shadowColor: '#00aaff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  shineOverlay: {
    position: 'absolute',
    top: -30,
    left: -30,
    width: 60,
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 30,
    transform: [{ rotate: '45deg' }],
  },
  diagonalShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    transform: [{ rotate: '45deg' }],
  },
  metallicText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 28,
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  supportButton: {
    position: 'absolute',
    bottom: 25,
    right: 20,
    zIndex: 10,
  },
  supportButtonGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#00ccff',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
});