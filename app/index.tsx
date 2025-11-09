import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { MessageSquare, Zap, Trophy, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';

const Welcome = () => {
  const { width, height } = useWindowDimensions();
  const router = useRouter();

  // Responsive calculations
  const isSmallScreen = width < 375;
  const isLargeScreen = width > 600;
  
  const RouteToRegister = () => router.push('./auth/register');
  const RouteToLogin = () => router.push('./auth/login');

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Create responsive styles
  const styles = useMemo(() => {
    const iconSize = isSmallScreen ? 100 : isLargeScreen ? 160 : 140;
    const iconCoreSize = iconSize * 0.6;
    const iconInnerSize = iconSize * 0.85;
    
    return StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: '#0a0e17',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: isSmallScreen ? 16 : 24,
      },
      backgroundGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#0a0e17',
        opacity: 0.9,
      },
      content: {
        width: '100%',
        maxWidth: 600,
        alignItems: 'center',
        padding: isSmallScreen ? 16 : 24,
      },
      iconContainer: {
        marginBottom: isSmallScreen ? 20 : 30,
        alignItems: 'center', // Ensure icon is centered
        justifyContent: 'center',
      },
      iconOuterRing: {
        width: iconSize,
        height: iconSize,
        borderRadius: iconSize / 2,
        backgroundColor: 'rgba(20, 30, 50, 0.8)',
        borderWidth: 2,
        borderColor: '#00ccff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#00ccff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 5,
      },
      iconInnerRing: {
        width: iconInnerSize,
        height: iconInnerSize,
        borderRadius: iconInnerSize / 2,
        backgroundColor: 'rgba(10, 20, 40, 0.9)',
        borderWidth: 1,
        borderColor: '#00aaff',
        justifyContent: 'center',
        alignItems: 'center',
      },
      iconCore: {
        width: iconCoreSize,
        height: iconCoreSize,
        borderRadius: iconCoreSize / 2,
        backgroundColor: 'rgba(0, 50, 100, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
      },
      title: {
        fontSize: isSmallScreen ? 26 : isLargeScreen ? 38 : 32,
        fontWeight: '800',
        color: '#ffffff',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        textAlign: 'center',
        textShadowColor: 'rgba(0, 200, 255, 0.5)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 8,
        maxWidth: '100%',
      },
      subtitle: {
        fontSize: isSmallScreen ? 14 : 16,
        color: '#a0f0ff',
        textAlign: 'center',
        marginBottom: 30,
        letterSpacing: 0.5,
        lineHeight: 22,
        maxWidth: '90%',
      },
      features: {
        width: '100%',
        marginBottom: isSmallScreen ? 20 : 30,
      },
      featureCard: {
        backgroundColor: 'rgba(20, 35, 60, 0.6)',
        borderWidth: 1,
        borderColor: 'rgba(0, 150, 255, 0.3)',
        borderRadius: 16,
        padding: isSmallScreen ? 12 : 16,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
      },
      featureIcon: {
        width: isSmallScreen ? 40 : 46,
        height: isSmallScreen ? 40 : 46,
        borderRadius: 23,
        backgroundColor: 'rgba(0, 100, 200, 0.3)',
        borderWidth: 1,
        borderColor: 'rgba(0, 200, 255, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
      },
      featureTextContainer: {
        flex: 1,
      },
      featureTitle: {
        fontSize: isSmallScreen ? 14 : 16,
        fontWeight: '700',
        color: '#00eeff',
        marginBottom: 3,
      },
      featureText: {
        fontSize: isSmallScreen ? 12 : 14,
        color: '#a0d0ff',
      },
      primaryButton: {
        width: '100%',
        height: isSmallScreen ? 50 : 60,
        borderRadius: 16,
        backgroundColor: '#0066cc',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(0, 200, 255, 0.5)',
        shadowColor: '#00aaff',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
      },
      primaryButtonText: {
        fontSize: isSmallScreen ? 16 : 18,
        fontWeight: '700',
        color: '#ffffff',
        letterSpacing: 1,
      },
      secondaryButton: {
        width: '100%',
        minHeight: isSmallScreen ? 45 : 50, // Changed to minHeight
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0, 150, 255, 0.5)',
        borderRadius: 16,
        paddingVertical: 8, // Added vertical padding
      },
      secondaryButtonText: {
        fontSize: isSmallScreen ? 14 : 16,
        fontWeight: '600',
        color: '#00ccff',
        textAlign: 'center',
        paddingHorizontal: 8, // Added horizontal padding
      },
    });
  }, [width, height]);

  // Create a futuristic debate icon
  const DebateIcon = () => {
    const iconSize = isSmallScreen ? 42 : 52;
    return (
      <View style={styles.iconInnerRing}>
        <View style={styles.iconCore}>
          <MessageSquare size={iconSize} color="#00eeff" strokeWidth={1.5} />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.backgroundGradient} />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.iconContainer, 
            { transform: [{ scale: pulseAnim }] }
          ]}
        >
          <View style={styles.iconOuterRing}>
            <DebateIcon />
          </View>
        </Animated.View>

        <Text style={styles.title}>DEBATE ARENA</Text>

        <View style={styles.features}>
          <FeatureCard
            icon={<Zap size={isSmallScreen ? 20 : 24} color="#00eeff" strokeWidth={2} />}
            title="EARN XP & LEVEL UP"
            text="Climb the leaderboards with every debate"
            styles={styles}
          />

          <FeatureCard
            icon={<Trophy size={isSmallScreen ? 20 : 24} color="#00eeff" strokeWidth={2} />}
            title="WIN BADGES"
            text="Collect rare digital trophies"
            styles={styles}
          />

          <FeatureCard
            icon={<MessageSquare size={isSmallScreen ? 20 : 24} color="#00eeff" strokeWidth={2} />}
            title="AI ENHANCED"
            text="Real-time debate analytics"
            styles={styles}
          />
        </View>

        <TouchableOpacity 
          style={styles.primaryButton} 
          activeOpacity={0.8} 
          onPress={RouteToRegister}
        >
          <Text style={styles.primaryButtonText}>JOIN THE ARENA</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.secondaryButton} 
          activeOpacity={0.8} 
          onPress={RouteToLogin}
        >
          <Text style={styles.secondaryButtonText}>EXISTING DEBATER</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

type FeatureCardProps = {
  icon: React.ReactNode;
  title: string;
  text: string;
  styles: any;
};

const FeatureCard = ({ icon, title, text, styles }: FeatureCardProps) => (
  <View style={styles.featureCard}>
    <View style={styles.featureIcon}>{icon}</View>
    <View style={styles.featureTextContainer}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
    <ChevronRight size={20} color="#00aaff" />
  </View>
);

export default Welcome;
