import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowLeft, User, Mail, Lock, Calendar, ChevronRight } from 'lucide-react-native';
import { Alert } from 'react-native';
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from 'firebase/auth';
import {auth, db} from '../../firebase.js';
import { doc, setDoc } from 'firebase/firestore';
import { useEffect } from 'react';

export default function Register() {
  const router = useRouter();
  // State variables to store user input from the registration form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');
  const [isRegistered, setIsRegistered] = useState(false); // Track if initial registration is complete
  const [user, setUser] = useState<any>(null); // Store Firebase user object

  // Monitor authentication state to check if user has verified their email
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        setUser(user);
        // Reload user to get latest verification status from Firebase
        user.reload().then(() => {
          if (user.emailVerified) {
            // If email is verified, automatically proceed to interests selection
            router.push('/auth/interests');
          }
        });
      }
    });
    return unsubscribe; // Clean up the listener when component unmounts
  }, []);

  // Handle the initial user registration with Firebase
  const register = async () => {
    // Validate that all required fields are filled
    if(!firstName || !lastName || !nickname || !email || !password || !age) {
      Alert.alert('Please fill in all fields');
      return;
    }
    
    try {
      // Create new user account with Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update the user's display name in Firebase Auth
      await updateProfile(user, {
        displayName: `${firstName} ${lastName}`,
      });

      // Save additional user data to Firestore database
      await setDoc(doc(db, 'users', user.uid), {
        firstName: firstName,
        lastName: lastName,
        nickname: nickname,
        age: age,
        XP: 50, // Initial XP for new users
        level: 1, // Starting level
        Streaks: 0,
        Wins: 0,
        Losses: 0,
        Ties: 0,
        WinRates: 0, 
      })

      // Send email verification to the user
      await sendEmailVerification(user);
      setUser(user);
      setIsRegistered(true);

      Alert.alert("Registration successful!", "A verification email has been sent. Please verify your email.");
      

    } 
    catch (error:any) {
        Alert.alert("Error" , error.message);
    }

  }

  // Handle navigation to interests screen after registration
  const handleNext = async () => {
    if (!user) {
      Alert.alert("Please complete registration first");
      return;
    }
    
    try {
      // Refresh the user's verification status from Firebase
      await user.reload();
      
      if (user.emailVerified) {
        // Only allow proceeding if email is verified
        router.push('/auth/interests');
      } else {
        Alert.alert(
          "Email Not Verified",
          "Please verify your email before proceeding. " +
          "Check your inbox for the verification email.",
          [
            { 
              text: "Resend Verification", 
              onPress: () => resendVerification() 
            },
            { text: "OK" }
          ]
        );
      }
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  }

  // Resend email verification if user didn't receive the first one
  const resendVerification = async () => {
    if (user) {
      try {
        await sendEmailVerification(user);
        Alert.alert("Verification Email Sent", "Please check your inbox");
      } catch (error: any) {
        Alert.alert("Error", error.message);
      }
    }
  }


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
              <Text style={styles.title}>CREATE ACCOUNT</Text>
              <Text style={styles.subtitle}>
                Join the ultimate debate platform
              </Text>
            </View>

            {/* Registration form */}
            <View style={styles.form}>
              {/* First and Last Name in a row */}
              <View style={styles.row}>
                <View style={[styles.inputContainer, styles.halfWidth]}>
                  <LinearGradient
                    colors={['rgba(20, 35, 60, 0.8)', 'rgba(15, 25, 45, 0.9)']}
                    style={styles.inputGradient}
                  >
                    <User size={20} color="#00eeff" strokeWidth={2} />
                    <TextInput
                      style={styles.input}
                      placeholder="First Name"
                      placeholderTextColor="#a0d0ff"
                      value={firstName}
                      onChangeText={setFirstName}
                    />
                  </LinearGradient>
                </View>
                <View style={[styles.inputContainer, styles.halfWidth]}>
                  <LinearGradient
                    colors={['rgba(20, 35, 60, 0.8)', 'rgba(15, 25, 45, 0.9)']}
                    style={styles.inputGradient}
                  >
                    <User size={20} color="#00eeff" strokeWidth={2} />
                    <TextInput
                      style={styles.input}
                      placeholder="Last Name"
                      placeholderTextColor="#a0d0ff"
                      value={lastName}
                      onChangeText={setLastName}
                    />
                  </LinearGradient>
                </View>
              </View>

              {/* Nickname input */}
              <View style={styles.inputContainer}>
                <LinearGradient
                  colors={['rgba(20, 35, 60, 0.8)', 'rgba(15, 25, 45, 0.9)']}
                  style={styles.inputGradient}
                >
                  <User size={20} color="#00eeff" strokeWidth={2} />
                  <TextInput
                    style={styles.input}
                    placeholder="Nickname"
                    placeholderTextColor="#a0d0ff"
                    value={nickname}
                    onChangeText={setNickname}
                  />
                </LinearGradient>
              </View>

              {/* Email input */}
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
                  />
                </LinearGradient>
              </View>

              {/* Password input */}
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

              {/* Age input */}
              <View style={styles.inputContainer}>
                <LinearGradient
                  colors={['rgba(20, 35, 60, 0.8)', 'rgba(15, 25, 45, 0.9)']}
                  style={styles.inputGradient}
                >
                  <Calendar size={20} color="#00eeff" strokeWidth={2} />
                  <TextInput
                    style={styles.input}
                    placeholder="Age"
                    placeholderTextColor="#a0d0ff"
                    value={age}
                    onChangeText={setAge}
                    keyboardType="numeric"  // Show number keyboard
                  />
                </LinearGradient>
              </View>

              {/* Dynamic button that changes function based on registration status */}
              <TouchableOpacity
                style={styles.nextButton}
                onPress={isRegistered ? handleNext : register}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#00ccff', '#0077b6', '#0066cc']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.nextButtonGradient}
                >
                  <Text style={styles.nextButtonText}>
                    {/* Button text changes based on whether user has registered or not */}
                    {isRegistered ? "PROCEED TO INTERESTS" : "NEXT: SELECT INTERESTS"}
                  </Text>
                  <ChevronRight size={24} color="#ffffff" strokeWidth={2} />
                </LinearGradient>
              </TouchableOpacity>

              {/* Link to login screen for existing users */}
              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>Already have an account? </Text>
                <TouchableOpacity
                  onPress={() => router.push('/auth/login')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.loginLink}>SIGN IN</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

// All visual styling for the registration screen
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
  backButton: {
    position: 'absolute',
    top: 30,
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
    marginTop: 60,  // Extra space for the back button
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
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
  row: {
    flexDirection: 'row',
    gap: 16,  // Space between first name and last name fields
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
  halfWidth: {
    flex: 1,  // Each takes half the row width
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
    marginLeft: 12,
    paddingVertical: 4,
  },
  nextButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 20,
    shadowColor: '#00aaff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  nextButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 1,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  loginText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#a0d0ff',
    opacity: 0.9,
  },
  loginLink: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00ccff',
    letterSpacing: 1,
  },
});