import { Tabs } from 'expo-router';
import { 
  Home as HomeIcon, 
  Calendar as EventsIcon, 
  User as ProfileIcon,
} from 'lucide-react-native';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';

export default function TabLayout() {
  // Create animated values for each tab to handle scale animations
  const homeScale = useRef(new Animated.Value(1)).current;
  const eventsScale = useRef(new Animated.Value(1)).current;
  const profileScale = useRef(new Animated.Value(1)).current;

  // Define the props for our custom tab icon component
  type TabIconProps = {
    focused: boolean;          // Whether this tab is currently active
    icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>; // The icon component to display
    label: string;             // Text label for the tab
    scale: Animated.Value;     // Animation value for scale effects
  };

  // Custom tab icon component with animations and gradient backgrounds
  const TabIcon: React.FC<TabIconProps> = ({ focused, icon: Icon, label, scale }) => {
    // Animation effect that triggers when tab becomes focused
    useEffect(() => {
      if (focused) {
        // Create a bounce animation when tab is selected
        Animated.sequence([
          // Scale up quickly
          Animated.timing(scale, {
            toValue: 1.2,
            duration: 150,
            useNativeDriver: true,
          }),
          // Scale back down to normal
          Animated.timing(scale, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          })
        ]).start();
      }
    }, [focused, scale]);

    return (
      <View style={{ alignItems: 'center' }}>
        {/* Animated container that scales when focused */}
        <Animated.View style={{ transform: [{ scale: focused ? scale : 1 }] }}>
          {/* Gradient background that changes colors based on focus state */}
          <LinearGradient
            colors={focused ? ['#00ccff', '#0077b6'] : ['#2c3e50', '#34495e']}
            style={styles.iconContainer}
          >
            {/* The actual icon with dynamic color and stroke width */}
            <Icon 
              size={24} 
              color={focused ? "#ffffff" : "#a0d0ff"} 
              strokeWidth={focused ? 2.5 : 2} 
            />
          </LinearGradient>
        </Animated.View>
        {/* Tab label with dynamic color and text scaling */}
        <Text style={[
          styles.tabLabel,
          { color: focused ? "#00ccff" : "#a0d0ff" }
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
        >
          {label}
        </Text>
      </View>
    );
  };

  return (
    // Main tabs container with custom styling
    <Tabs
      screenOptions={{
        headerShown: false,     // Hide the default header
        tabBarShowLabel: false, // Hide default labels since we use custom ones
        tabBarStyle: styles.tabBar, // Apply our custom tab bar styles
      }}
    >
      {/* Home tab screen */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabIcon 
              focused={focused} 
              icon={HomeIcon} 
              label="Home" 
              scale={homeScale}
            />
          ),
        }}
      />
      
      {/* Events tab screen */}
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarIcon: ({ focused }) => (
            <TabIcon 
              focused={focused} 
              icon={EventsIcon} 
              label="Events" 
              scale={eventsScale}
            />
          ),
        }}
      />
      
      {/* Profile tab screen */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <TabIcon 
              focused={focused} 
              icon={ProfileIcon} 
              label="Profile" 
              scale={profileScale}
            />
          ),
        }}
      />
    </Tabs>
  );
}

// Styles for the tab bar and its components
const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'rgba(10, 15, 30, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 150, 255, 0.3)',
    height: 80,
    paddingBottom: 0,
    shadowColor: '#00aaff',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 15,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 200, 255, 0.3)',
  },
  tabLabel: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 200, 255, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
});