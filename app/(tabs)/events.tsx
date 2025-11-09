import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, Users, Zap, Trophy, Clock, ArrowRight, Flame } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, query, orderBy, where, Timestamp, limit } from 'firebase/firestore';

// Define what an Event object looks like in app
type Event = {
  id: string;
  topic: string;
  description: string;
  winnerXP: number;        // XP points the winner gets
  spectatorXP: number;     // XP points spectators get
  participants: number;    // How many people are participating
  scheduledTime: Timestamp;// When the event is scheduled
  badges: string[];        // Achievement badges for this event
  status?: 'live' | 'upcoming' | 'ended';  // Current state of the event
  timeLeft?: string;       // Human-readable time until event starts/ends
};

// Define what a Debate object looks like
type Debate = {
  id: string;
  topic: string;
  scheduledDate: Timestamp;
  participants: number;
  xpReward: number;        // XP points awarded for participating
};

export default function Events() {
  // State to store our events data
  const [featuredEvents, setFeaturedEvents] = useState<Event[]>([]);
  const [quickDebates, setQuickDebates] = useState<Debate[]>([]);
  const [loading, setLoading] = useState(true);  // Track if data is still loading

  // Returns different colors based on event status for visual indicators
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live':      // Red for live events
        return '#FF6B6B';
      case 'upcoming':  // Teal for upcoming events
        return '#4ECDC4';
      case 'ended':     // Gray for ended events
        return '#95A5A6';
      default:
        return '#8B5CF6';
    }
  };

  // Returns different icons based on event status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'live':
        return <Flame size={16} color="#ffffff" strokeWidth={2} />;      // Fire icon for live
      case 'upcoming':
        return <Clock size={16} color="#ffffff" strokeWidth={2} />;      // Clock for upcoming
      case 'ended':
        return <Trophy size={16} color="#ffffff" strokeWidth={2} />;     // Trophy for ended
      default:
        return <Calendar size={16} color="#ffffff" strokeWidth={2} />;   // Calendar as default
    }
  };

  // Convert Firestore timestamp to readable time format (e.g., "2:30 PM")
  const formatTime = (timestamp: Timestamp) => {
    const date = timestamp.toDate();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Determine if an event is live, upcoming, or ended based on current time
  const calculateEventStatus = (event: Event) => {
    const now = new Date();
    const eventTime = event.scheduledTime.toDate();
    const diff = eventTime.getTime() - now.getTime();  // Time difference in milliseconds
    
    // Event is live if it started within the last 2 hours
    if (diff < 0 && diff > -7200000) {
      return 'live';
    }
    
    // Event is upcoming if it starts in the future
    if (diff > 0) {
      return 'upcoming';
    }
    
    // Otherwise it's ended
    return 'ended';
  };

  // Calculate how much time is left until event starts/ends
  const formatTimeLeft = (timestamp: Timestamp) => {
    const now = new Date();
    const eventTime = timestamp.toDate();
    const diff = eventTime.getTime() - now.getTime();
    
    // If event time has passed
    if (diff < 0) {
      return 'Ended';
    }
    
    // Convert milliseconds to days, hours, minutes
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    // Return formatted time string based on how much time is left
    if (days > 0) {
      return `${days}d ${hours}h`;      // Show days and hours
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;   // Show hours and minutes
    } else {
      return `${minutes}m`;             // Show only minutes
    }
  };

  // Get featured events from Firestore database
  const fetchFeaturedEvents = async () => {
    try {
      // Create query to get events ordered by scheduled time
      const eventsQuery = query(
        collection(db, 'events'),
        orderBy('scheduledTime', 'asc')  // Show earliest events first
      );
      const snapshot = await getDocs(eventsQuery);
      
      // Convert Firestore documents to Event objects
      const eventsData: Event[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          topic: data.topic,
          description: data.description,
          winnerXP: data.winnerXP,
          spectatorXP: data.spectatorXP,
          participants: data.participants || 0,
          scheduledTime: data.scheduledTime,
          badges: data.badges || [],
        };
      });
      
      // Calculate current status and time left for each event
      const processedEvents = eventsData.map(event => {
        const status = calculateEventStatus(event) as 'live' | 'upcoming' | 'ended';
        return {
          ...event,
          status,
          timeLeft: formatTimeLeft(event.scheduledTime)
        };
      });
      
      setFeaturedEvents(processedEvents);
    } catch (error) {
      console.error("Error fetching events: ", error);
      Alert.alert('Error', 'Failed to load events. Please try again.');
    }
  };

  // Get quick join debates from Firestore database
  const fetchQuickDebates = async () => {
    try {
      const now = new Date();
      // Query for debates that are scheduled in the future, limited to 3 results
      const debatesQuery = query(
        collection(db, 'debates'),
        where('scheduledDate', '>', Timestamp.fromDate(now)),  // Only future debates
        orderBy('scheduledDate', 'asc'),                       // Earliest first
        limit(3)                                               // Only get 3 debates
      );
      
      const snapshot = await getDocs(debatesQuery);
      const debatesData: Debate[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          topic: data.topic,
          scheduledDate: data.scheduledDate,
          participants: data.participants || 0,
          xpReward: data.xpReward || 50,  // Default to 50 XP if not specified
        };
      });
      
      setQuickDebates(debatesData);
    } catch (error) {
      console.error("Error fetching debates: ", error);
      Alert.alert('Error', 'Failed to load debates. Please try again.');
    }
  };

  // Load data when component first appears on screen
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      // Fetch both events and debates at the same time
      await Promise.all([fetchFeaturedEvents(), fetchQuickDebates()]);
      setLoading(false);
    };
    
    loadData();
    
    // Set up automatic refresh every minute to update event statuses
    const interval = setInterval(() => {
      fetchFeaturedEvents();
    }, 60000);
    
    // Clean up interval when component is removed from screen
    return () => clearInterval(interval);
  }, []);

  // Show loading screen while data is being fetched
  if (loading) {
    return (
      <LinearGradient
        colors={['#0a0e17', '#13182a', '#1a223d']}  // Blue gradient background
        style={styles.container}
      >
        <SafeAreaView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00ccff" />
          <Text style={styles.loadingText}>Loading Events...</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Main screen layout
  return (
    <LinearGradient
      colors={['#0a0e17', '#13182a', '#1a223d']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header section with title and subtitle */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>EVENTS ARENA</Text>
          <Text style={styles.headerSubtitle}>
            Join competitions and win XP rewards
          </Text>
        </View>

        {/* Scrollable content area */}
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Featured Events Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Featured Events</Text>
              {/* Button to view all events (future feature) */}
              <TouchableOpacity style={styles.viewAllButton}>
                <Text style={styles.viewAllText}>View All</Text>
                <ArrowRight size={18} color="#00ccff" strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {/* Show message if no events available */}
            {featuredEvents.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No featured events available</Text>
              </View>
            ) : (
              // Display list of featured events
              featuredEvents.map((event) => (
                <TouchableOpacity key={event.id} style={styles.eventCard}>
                  <LinearGradient
                    colors={['rgba(20, 35, 60, 0.8)', 'rgba(15, 25, 45, 0.9)']}
                    style={styles.eventGradient}
                  >
                    {/* Event header with status and XP info */}
                    <View style={styles.eventHeader}>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(event.status || 'upcoming') },
                        ]}
                      >
                        {getStatusIcon(event.status || 'upcoming')}
                        <Text style={styles.statusText}>
                          {(event.status || 'upcoming').toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.xpBadge}>
                        <Zap size={14} color="#FFD700" strokeWidth={2} />
                        <Text style={styles.xpText}>
                          {event.winnerXP} XP Winner
                        </Text>
                      </View>
                    </View>

                    {/* Event content */}
                    <Text style={styles.eventTitle}>{event.topic}</Text>
                    <Text style={styles.eventDescription}>
                      {event.description}
                    </Text>

                    {/* Event statistics */}
                    <View style={styles.eventStats}>
                      <View style={styles.eventStat}>
                        <Users size={16} color="#00ccff" strokeWidth={2} />
                        <Text style={styles.eventStatText}>
                          {event.participants}
                        </Text>
                      </View>
                      <View style={styles.eventStat}>
                        <Zap size={16} color="#FFD700" strokeWidth={2} />
                        <Text style={styles.eventStatText}>
                          +{event.spectatorXP} XP for spectators
                        </Text>
                      </View>
                      <View style={styles.eventStat}>
                        <Clock size={16} color="#00ccff" strokeWidth={2} />
                        <Text style={styles.eventStatText}>
                          {event.timeLeft}
                        </Text>
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* Quick Join Debates Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Quick Join Debates</Text>
              <Text style={styles.sectionSubtitle}>
                Jump into these starting soon
              </Text>
            </View>

            {/* Show message if no debates available */}
            {quickDebates.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No upcoming debates</Text>
              </View>
            ) : (
              // Display list of quick join debates
              quickDebates.map((debate) => (
                <TouchableOpacity key={debate.id} style={styles.quickDebateCard}>
                  <LinearGradient
                    colors={['rgba(20, 35, 60, 0.6)', 'rgba(15, 25, 45, 0.7)']}
                    style={styles.quickDebateGradient}
                  >
                    <View style={styles.quickDebateContent}>
                      {/* Debate information */}
                      <View style={styles.quickDebateInfo}>
                        <Text style={styles.quickDebateTitle}>
                          {debate.topic}
                        </Text>
                        <View style={styles.quickDebateStats}>
                          <View style={styles.quickDebateStat}>
                            <Clock size={14} color="#00ccff" strokeWidth={2} />
                            <Text style={styles.quickDebateStatText}>
                              {formatTime(debate.scheduledDate)}
                            </Text>
                          </View>
                          <View style={styles.quickDebateStat}>
                            <Users size={14} color="#00ccff" strokeWidth={2} />
                            <Text style={styles.quickDebateStatText}>
                              {debate.participants}
                            </Text>
                          </View>
                          <View style={styles.quickDebateStat}>
                            <Zap size={14} color="#FFD700" strokeWidth={2} />
                            <Text style={styles.quickDebateStatText}>
                              {debate.xpReward} XP
                            </Text>
                          </View>
                        </View>
                      </View>
                      {/* Join button for quick access */}
                      <TouchableOpacity style={styles.joinButton}>
                        <Text style={styles.joinButtonText}>Join</Text>
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

// All the visual styling for the component
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    backgroundColor: 'rgba(10, 15, 30, 0.7)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 100, 200, 0.3)',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 200, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#a0f0ff',
    opacity: 0.9,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  section: {
    padding: 24,
    paddingBottom: 0,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
    letterSpacing: 1,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#a0d0ff',
    opacity: 0.9,
  },
  viewAllButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00ccff',
  },
  eventCard: {
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#00aaff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 150, 255, 0.2)',
  },
  eventGradient: {
    padding: 20,
    borderRadius: 20,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  xpText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFD700',
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  eventDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#a0d0ff',
    opacity: 0.9,
    marginBottom: 16,
    lineHeight: 20,
  },
  eventStats: {
    flexDirection: 'row',
    gap: 20,
  },
  eventStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventStatText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00ccff',
  },
  quickDebateCard: {
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#00aaff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(0, 150, 255, 0.2)',
  },
  quickDebateGradient: {
    padding: 16,
    borderRadius: 16,
  },
  quickDebateContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickDebateInfo: {
    flex: 1,
  },
  quickDebateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  quickDebateStats: {
    flexDirection: 'row',
    gap: 16,
  },
  quickDebateStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quickDebateStatText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00ccff',
  },
  joinButton: {
    backgroundColor: 'rgba(0, 150, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 200, 255, 0.3)',
  },
  joinButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00ccff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 14, 23, 0.8)',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  emptyContainer: {
    backgroundColor: 'rgba(30, 40, 70, 0.3)',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 150, 255, 0.1)',
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#a0d0ff',
    fontWeight: '500',
  },
});