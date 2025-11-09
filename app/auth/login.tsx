import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowLeft, Mail, Lock, ChevronRight, MessageSquare } from 'lucide-react-native';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../firebase';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');        // Store user's email input
  const [password, setPassword] = useState('');  // Store user's password input
  const [isLoading, setIsLoading] = useState(false); // Track when login is in progress

  // Handle the login process when user presses sign in button
  const handleLogin = async () => {
    // Check if both email and password are provided
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    
    try {
      // Attempt to sign in with Firebase authentication
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Check if user has verified their email address
      if (!user.emailVerified) {
        Alert.alert(
          "Email Not Verified",
          "Please verify your email before logging in.",
          [
            { 
              text: "Resend Verification", 
              onPress: () => resendVerification(user) 
            },
            { text: "OK" }
          ]
        );
        setIsLoading(false);
        return;
      }

      // If everything is successful, navigate to events tab
      router.replace('/(tabs)/events');
    }
    catch (error: any) {
      setIsLoading(false);
      let errorMessage = "Login failed. Please try again.";
      
      // Provide specific error messages based on Firebase error codes
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = "No account found with this email.";
          break;
        case 'auth/wrong-password':
          errorMessage = "Incorrect password. Please try again.";
          break;
        case 'auth/invalid-credential':
          errorMessage = "Invalid email or password.";
          break;
        case 'auth/too-many-requests':
          errorMessage = "Too many attempts. Please try again later.";
          break;
        case 'auth/user-disabled':
          errorMessage = "This account has been disabled.";
          break;
      }
      
      Alert.alert("Error", errorMessage);
    }
  };

  // Resend email verification if user hasn't verified their account
  const resendVerification = async (user: any) => {
    try {
      await resendVerification(user);
      Alert.alert("Verification Sent", "A new verification email has been sent to your inbox.");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  // Handle password reset when user clicks "Forgot Password"
  const handleForgotPassword = async () => {
    // Require email to be entered first
    if (!email) {
      Alert.alert('Error', 'Please enter your email address first');
      return;
    }

    setIsLoading(true);
    
    try {
      // Send password reset email via Firebase
      await sendPasswordResetEmail(auth, email);
      Alert.alert(
        "Password Reset Sent",
        `A password reset link has been sent to ${email}. Please check your inbox.`
      );
    } catch (error: any) {
      let errorMessage = "Failed to send reset email. Please try again.";
      
      // Handle specific Firebase error for non-existent user
      if (error.code === 'auth/user-not-found') {
        errorMessage = "No account found with this email.";
      }
      
      Alert.alert("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#0a0e17', '#13182a', '#1a223d']}  // Dark blue gradient background
      style={styles.container}
    >
      {/* Handle keyboard properly on iOS and Android */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Background decorative elements */}
          <View style={styles.backgroundElements}>
            <View style={[styles.floatingOrb, styles.orb1]} />
            <View style={[styles.floatingOrb, styles.orb2]} />
            <View style={[styles.floatingOrb, styles.orb3]} />
          </View>

          {/* Back button to return to previous screen */}
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

          {/* Main content area */}
          <View style={styles.content}>
            <View style={styles.header}>
              {/* App logo with gradient background */}
              <View style={styles.logoContainer}>
                <LinearGradient
                  colors={['#00ccff', '#0077b6']}
                  style={styles.logoGradient}
                >
                  <View style={styles.logoInner}>
                    <MessageSquare
                      size={48}
                      color="#ffffff"
                      strokeWidth={1.5}
                    />
                  </View>
                </LinearGradient>
              </View>
              <Text style={styles.title}>WELCOME BACK</Text>
              <Text style={styles.subtitle}>
                Sign in to continue your debate journey
              </Text>
            </View>

            {/* Login form */}
            <View style={styles.form}>
              {/* Email input field */}
              <View style={styles.inputContainer}>
                <LinearGradient
                  colors={['rgba(20, 35, 60, 0.8)', 'rgba(15, 25, 45, 0.9)']}
                  style={styles.inputGradient}
                >
                  <Mail size={20} color="#00eeff" strokeWidth={2} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#a0d0ff"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"  // Important for email fields
                    autoCorrect={false}    // Don't correct email addresses
                  />
                </LinearGradient>
              </View>

              {/* Password input field */}
              <View style={styles.inputContainer}>
                <LinearGradient
                  colors={['rgba(20, 35, 60, 0.8)', 'rgba(15, 25, 45, 0.9)']}
                  style={styles.inputGradient}
                >
                  <Lock size={20} color="#00eeff" strokeWidth={2} />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#a0d0ff"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry  // Hide password characters
                  />
                </LinearGradient>
              </View>

              {/* Forgot password link */}
              <TouchableOpacity 
                style={styles.forgotButton} 
                onPress={handleForgotPassword}
                activeOpacity={0.7}
                disabled={isLoading}  // Disable while loading
              >
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>

              {/* Main login button */}
              <TouchableOpacity
                style={styles.loginButton}
                onPress={handleLogin}
                disabled={isLoading}  // Disable while loading
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#00ccff', '#0077b6', '#0066cc']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.loginButtonGradient}
                >
                  {isLoading ? (
                    // Show loading spinner when authentication is in progress
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    // Show normal button content when not loading
                    <>
                      <Text style={styles.loginButtonText}>SIGN IN</Text>
                      <ChevronRight size={24} color="#ffffff" strokeWidth={2} />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Sign up redirect for new users */}
              <View style={styles.signupContainer}>
                <Text style={styles.signupText}>Don't have an account? </Text>
                <TouchableOpacity
                  onPress={() => router.push('/auth/register')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.signupLink}>SIGN UP</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

// All visual styling for the login screen
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,  // Allow scroll view to grow and be scrollable
    padding: 24,
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
    opacity: 0.15,  // Very transparent for subtle background effect
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
  orb3: {
    width: 150,
    height: 150,
    backgroundColor: '#0077b6',
    top: '40%',
    left: '20%',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 24,
    zIndex: 10,  // Ensure button appears above other elements
    shadowColor: '#00ccff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  backButtonGradient: {
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 150, 255, 0.3)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    marginTop: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    marginBottom: 24,
    shadowColor: '#00ccff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  logoGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0, 200, 255, 0.5)',
  },
  logoInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 50, 100, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 200, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#a0f0ff',
    textAlign: 'center',
    opacity: 0.9,
  },
  form: {
    gap: 20,  // Consistent spacing between form elements
    marginTop: 20,
  },
  inputContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#00aaff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  inputGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 150, 255, 0.3)',
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
    marginLeft: 12,
    paddingVertical: 4,
  },
  forgotButton: {
    alignSelf: 'flex-end',  // Position to the right side
    padding: 8,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00ccff',
  },
  loginButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 20,
    shadowColor: '#00aaff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  loginButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 1,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  signupText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#a0d0ff',
    opacity: 0.9,
  },
  signupLink: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00ccff',
    letterSpacing: 1,
  },
});