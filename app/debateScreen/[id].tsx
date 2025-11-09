import { View, Text, StyleSheet, TouchableOpacity, Alert, FlatList, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Mic, Play, Clock, Users } from 'lucide-react-native';
import { doc, onSnapshot, runTransaction, serverTimestamp, arrayUnion, increment, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '../../firebase';
import React, { useState, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';

// Debate timing constants (in seconds)
const DEBATE_DURATION = 120; // 2 minutes for entire debate
const VOTING_DURATION = 60;  // 1 minute for voting period
const MAX_TIME_PER_SIDE = 60; // 1 minute maximum speaking time per side

export default function DebateScreen() {
  // Get debate ID from URL parameters and user authentication
  const { id } = useLocalSearchParams<{ id: string }>();
  const auth = getAuth();
  const uid = auth.currentUser?.uid;
  
  // State variables for managing debate data and UI
  const [debate, setDebate] = useState<Debate | null>(null);
  const [role, setRole] = useState<'for' | 'against' | 'spectator' | null>(null); // User's role in this debate
  const [timeLeft, setTimeLeft] = useState(0); // Time remaining in debate
  const [votingTimeLeft, setVotingTimeLeft] = useState(0); // Time remaining for voting
  const [isRecording, setIsRecording] = useState(false); // Whether user is currently recording
  const [loading, setLoading] = useState(true); // Loading state for data fetching
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null); // Track which audio is playing
  
  // Refs for managing audio recording and playback
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Type definition for debate data structure
  type Debate = {
    id: string;
    topic: string;
    description: string;
    supportingSide: string; // The "for" position text
    opposingSide: string;   // The "against" position text
    xpReward: number;       // XP awarded to winner
    forUserId: string | null;    // User ID for the "for" side debater
    againstUserId: string | null; // User ID for the "against" side debater
    spectators: string[];   // List of spectator user IDs
    arguments: { userId: string; audioUrl: string; timestamp: any; id?: string }[]; // Audio arguments
    status: 'waiting' | 'ongoing' | 'voting' | 'finished'; // Current debate phase
    startTime: any;         // When the debate started
    voteStartTime: any | null; // When voting period started
    votesFor: number;       // Number of votes for the "for" side
    votesAgainst: number;   // Number of votes for the "against" side
    votedUsers: string[];   // Users who have already voted
    forTimeUsed: number;    // Total seconds used by "for" side
    againstTimeUsed: number; // Total seconds used by "against" side
    winner: 'for' | 'against' | 'tie' | null; // Debate outcome
    badges: string[];       // Badges awarded for this debate
  };

  // Listen to real-time updates from Firestore for this debate
  useEffect(() => {
    if (!id) return;

    const unsubscribe = onSnapshot(doc(db, 'debates', id), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Omit<Debate, 'id'>;
        setDebate({ id, ...data });
      } else {
        Alert.alert('Error', 'Debate not found');
      }
      setLoading(false);
    });

    return () => unsubscribe(); // Clean up listener when component unmounts
  }, [id]);

  // Request microphone permissions when component mounts
  useEffect(() => {
    async function requestPermissions() {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Microphone permission is required to record audio.');
      }
    }
    requestPermissions();
  }, []);

  // Determine user's role in this debate (for, against, or spectator)
  useEffect(() => {
    if (!debate || !uid) return;

    if (debate.forUserId === uid) setRole('for');
    else if (debate.againstUserId === uid) setRole('against');
    else if (debate.spectators.includes(uid)) setRole('spectator');
    else setRole(null);
  }, [debate, uid]);

  // Automatically start debate when all participants are ready
  useEffect(() => {
    if (!debate || debate.status !== 'waiting' || !debate.forUserId || !debate.againstUserId || debate.spectators.length < 1) return;

    runTransaction(db, async (transaction) => {
      const snap = await transaction.get(doc(db, 'debates', id));
      if (snap.exists()) {
        const data = snap.data();
        // Start debate if all conditions are met
        if (data.status === 'waiting' && data.forUserId && data.againstUserId && (data.spectators || []).length >= 1) {
          transaction.update(doc(db, 'debates', id), {
            status: 'ongoing',
            startTime: serverTimestamp(),
          });
        }
      }
    }).catch(console.error);
  }, [debate, id]);

  // Countdown timer for ongoing debate
  useEffect(() => {
    if (!debate || debate.status !== 'ongoing') return;

    const updateTimer = () => {
      const start = debate.startTime?.toDate?.() || new Date(debate.startTime);
      const elapsed = (Date.now() - start.getTime()) / 1000;
      const remaining = DEBATE_DURATION - elapsed;
      setTimeLeft(remaining > 0 ? remaining : 0);

      // Transition to voting phase when time runs out
      if (remaining <= 0) {
        runTransaction(db, async (transaction) => {
          const snap = await transaction.get(doc(db, 'debates', id));
          if (snap.exists() && snap.data().status === 'ongoing') {
            transaction.update(doc(db, 'debates', id), {
              status: 'voting',
              voteStartTime: serverTimestamp(),
            });
          }
        }).catch(console.error);
      }
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [debate, id]);

  // Countdown timer for voting period
  useEffect(() => {
    if (!debate || debate.status !== 'voting') return;

    const updateVotingTimer = () => {
      const start = debate.voteStartTime?.toDate?.() || new Date(debate.voteStartTime);
      const elapsed = (Date.now() - start.getTime()) / 1000;
      const remaining = VOTING_DURATION - elapsed;
      setVotingTimeLeft(remaining > 0 ? remaining : 0);

      // End voting and determine winner when time runs out
      if (remaining <= 0) {
        runTransaction(db, async (transaction) => {
          const snap = await transaction.get(doc(db, 'debates', id));
          if (snap.exists() && snap.data().status === 'voting') {
            const data = snap.data();
            let winner: 'for' | 'against' | 'tie' = 'tie';
            if (data.votesFor > data.votesAgainst) winner = 'for';
            else if (data.votesAgainst > data.votesFor) winner = 'against';

            // Update debate status and winner
            transaction.update(doc(db, 'debates', id), {
              status: 'finished',
              winner,
            });

            // Award XP to winner and deduct from loser (if not a tie)
            if (winner !== 'tie') {
              const winnerId = winner === 'for' ? data.forUserId : data.againstUserId;
              const loserId = winner === 'for' ? data.againstUserId : data.forUserId;
              const xpReward = data.xpReward;

              if (winnerId) {
                transaction.update(doc(db, 'users', winnerId), {
                  xp: increment(xpReward),
                  badges: arrayUnion(...(data.badges || [])),
                });
              }

              if (loserId) {
                transaction.update(doc(db, 'users', loserId), {
                  xp: increment(-xpReward),
                });
              }
            }
          }
        }).catch(console.error);
      }
    };

    updateVotingTimer();
    timerRef.current = setInterval(updateVotingTimer, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [debate, id]);

  // Calculate whose turn it is to speak based on time remaining
  const isForTurn = timeLeft > 60;
  const currentTurn = isForTurn ? 'For' : 'Against';
  const isMyTurn = (role === 'for' && isForTurn) || (role === 'against' && !isForTurn);
  const timeUsed = role === 'for' ? (debate?.forTimeUsed || 0) : (debate?.againstTimeUsed || 0);

  // Start recording an audio argument
  const startRecording = async () => {
    if (!isMyTurn || timeUsed >= MAX_TIME_PER_SIDE) return;
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  // Stop recording and process the audio
  const stopRecording = async () => {
    if (!recordingRef.current) return;

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      if (!uri) throw new Error('No URI');

      // Get duration of recorded audio
      const { sound } = await Audio.Sound.createAsync({ uri });
      const status = await sound.getStatusAsync();
      if (!status.isLoaded || !status.durationMillis) throw new Error('Failed to get duration');
      const duration = status.durationMillis / 1000;
      await sound.unloadAsync();

      // Check if user has enough time remaining
      const remaining = MAX_TIME_PER_SIDE - timeUsed;
      if (duration > remaining) {
        Alert.alert('Time exceeded', `You only have ${remaining.toFixed(0)} seconds left.`);
        return;
      }

      // Upload audio to Firebase Storage
      const response = await fetch(uri);
      const blob = await response.blob();
      const storage = getStorage();
      const audioRef = storageRef(storage, `arguments/${id}/${Date.now()}.m4a`);
      await uploadBytes(audioRef, blob);
      const audioUrl = await getDownloadURL(audioRef);

      // Save audio argument to Firestore and update time used
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(doc(db, 'debates', id));
        if (!snap.exists()) throw new Error('Debate not found');
        const data = snap.data();
        const currentTimeUsed = role === 'for' ? data.forTimeUsed || 0 : data.againstTimeUsed || 0;
        if (currentTimeUsed + duration > MAX_TIME_PER_SIDE) throw new Error('Time exceeded');

        transaction.update(doc(db, 'debates', id), {
          arguments: arrayUnion({
            userId: uid,
            audioUrl,
            timestamp: serverTimestamp(),
          }),
          [role === 'for' ? 'forTimeUsed' : 'againstTimeUsed']: currentTimeUsed + duration,
        });
      });

      setIsRecording(false);
      recordingRef.current = null;
    } catch (error: any) {
      console.error('Failed to stop recording', error);
      Alert.alert('Error', error.message || 'Failed to process recording');
      setIsRecording(false);
      recordingRef.current = null;
    }
  };

  // Play an audio argument
  const playAudio = async (audioUrl: string, argId: string) => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
      
      // Stop currently playing audio if any
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        // Toggle off if clicking the same audio
        if (playingAudioId === argId) {
          setPlayingAudioId(null);
          return;
        }
      }

      // Play the selected audio
      const { sound } = await Audio.Sound.createAsync({ uri: audioUrl });
      soundRef.current = sound;
      await sound.playAsync();
      setPlayingAudioId(argId);

      // Reset playing state when audio finishes
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingAudioId(null);
        }
      });
    } catch (error) {
      console.error('Failed to play audio', error);
      Alert.alert('Error', 'Failed to play audio');
    }
  };

  // Handle spectator voting
  const handleVote = async (side: 'for' | 'against') => {
    try {
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(doc(db, 'debates', id));
        if (!snap.exists()) throw new Error('Debate not found');
        const data = snap.data();
        if (data.votedUsers.includes(uid)) throw new Error('Already voted');
        if (data.status !== 'voting') throw new Error('Voting not active');

        // Increment vote count and mark user as voted
        transaction.update(doc(db, 'debates', id), {
          [side === 'for' ? 'votesFor' : 'votesAgainst']: (data[side === 'for' ? 'votesFor' : 'votesAgainst'] || 0) + 1,
          votedUsers: arrayUnion(uid),
        });
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to vote');
    }
  };

  // Determine which side a user is on for an argument
  const getArgumentSide = (userId: string) => {
    if (userId === debate?.forUserId) return 'For';
    if (userId === debate?.againstUserId) return 'Against';
    return 'Unknown';
  };

  // Show loading screen while fetching data
  if (loading || !debate) {
    return (
      <LinearGradient colors={['#1a2746', '#2a3a8c', '#3a4f8f']} style={styles.container}>
        <ActivityIndicator size="large" color="#5a7cff" />
      </LinearGradient>
    );
  }

  // Show error if user is not part of this debate
  if (!role) {
    return (
      <LinearGradient colors={['#1a2746', '#2a3a8c', '#3a4f8f']} style={styles.container}>
        <Text style={styles.errorText}>You are not part of this debate.</Text>
      </LinearGradient>
    );
  }

  // Show waiting screen if debate hasn't started yet
  if (debate.status === 'waiting') {
    let waitingMessage = '';
    if (!debate.forUserId || !debate.againstUserId) {
      waitingMessage = 'Waiting for both sides to join.';
    } else if (debate.spectators.length < 1) {
      waitingMessage = 'Waiting for at least one spectator to join.';
    } else {
      waitingMessage = 'Starting soon...';
    }
    return (
      <LinearGradient
        colors={['#1a2746', '#2a3a8c', '#3a4f8f']}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.card}>
          <Text style={styles.topic}>{debate.topic}</Text>
          <Text style={styles.description}>{debate.description}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.waitingText}>{waitingMessage}</Text>
        </View>
      </LinearGradient>
    );
  }

  // Main debate screen layout
  return (
    <LinearGradient
      colors={['#1a2746', '#2a3a8c', '#3a4f8f']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Debate topic and description */}
      <View style={styles.card}>
        <Text style={styles.topic}>{debate.topic}</Text>
        <Text style={styles.description}>{debate.description}</Text>
      </View>

      {/* Debate sides information */}
      <View style={[styles.card, styles.sidesContainer]}>
        <View style={styles.sideItem}>
          <Text style={styles.sideLabel}>For: {debate.supportingSide}</Text>
          <Text style={styles.sideText}>{debate.forUserId ? 'Taken' : 'Open'}</Text>
        </View>
        <View style={styles.sideItem}>
          <Text style={styles.sideLabel}>Against: {debate.opposingSide}</Text>
          <Text style={styles.sideText}>{debate.againstUserId ? 'Taken' : 'Open'}</Text>
        </View>
      </View>

      {/* Debate statistics and timer */}
      <View style={[styles.card, styles.statsContainer]}>
        <View style={styles.statItem}>
          <Users size={18} color="#00ccff" />
          <Text style={styles.statText}>Spectators: {debate.spectators.length}</Text>
        </View>
        <View style={styles.statItem}>
          <Clock size={18} color="#00ccff" />
          <Text style={styles.statText}>
            {debate.status === 'ongoing' ? `Time left: ${Math.floor(timeLeft)}s (Turn: ${currentTurn})` : debate.status === 'voting' ? `Voting time left: ${Math.floor(votingTimeLeft)}s` : 'Debate finished'}
          </Text>
        </View>
      </View>

      {/* Show winner when debate is finished */}
      {debate.status === 'finished' && debate.winner && (
        <View style={styles.card}>
          <Text style={styles.winnerText}>
            Winner: {debate.winner === 'for' ? 'For side' : debate.winner === 'against' ? 'Against side' : 'Tie'}
          </Text>
        </View>
      )}

      {/* List of audio arguments */}
      <FlatList
        data={debate.arguments.map((arg, index) => ({ ...arg, id: index.toString() }))}
        keyExtractor={(item) => item.id!}
        renderItem={({ item }) => (
          <LinearGradient
            colors={['#2a3a8c', '#1a2746']}
            style={styles.argumentCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.argumentSide}>{getArgumentSide(item.userId)}</Text>
            <TouchableOpacity onPress={() => playAudio(item.audioUrl, item.id!)}>
              <Play size={24} color={playingAudioId === item.id ? '#ff4d4d' : '#00ccff'} />
            </TouchableOpacity>
          </LinearGradient>
        )}
        ListHeaderComponent={
          <Text style={styles.sectionTitle}>Arguments</Text>
        }
        style={styles.argumentsList}
      />

      {/* Recording button for debaters during ongoing debate */}
      {role !== 'spectator' && debate.status === 'ongoing' && timeLeft > 0 && (
        <>
          <TouchableOpacity
            style={[styles.micButton, (isRecording ? styles.recording : (!isMyTurn || timeUsed >= MAX_TIME_PER_SIDE ? styles.disabled : null))]}
            onPress={isRecording ? stopRecording : startRecording}
            disabled={!isMyTurn || timeUsed >= MAX_TIME_PER_SIDE || isRecording}
          >
            <Mic size={32} color="#e0e0ff" />
            <Text style={styles.micText}>{isRecording ? 'Stop' : 'Speak'}</Text>
          </TouchableOpacity>
          {!isMyTurn && <Text style={styles.turnText}>Waiting for your turn...</Text>}
        </>
      )}

      {/* Voting buttons for spectators during voting period */}
      {role === 'spectator' && debate.status === 'voting' && !debate.votedUsers.includes(uid!) && (
        <View style={[styles.card, styles.voteContainer]}>
          <TouchableOpacity style={styles.voteButton} onPress={() => handleVote('for')}>
            <LinearGradient colors={['#3a4f8f', '#5a7cff']} style={styles.voteButtonGradient}>
              <Text style={styles.voteButtonText}>Vote For</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.voteButton} onPress={() => handleVote('against')}>
            <LinearGradient colors={['#3a4f8f', '#5a7cff']} style={styles.voteButtonGradient}>
              <Text style={styles.voteButtonText}>Vote Against</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Current vote counts display */}
      <View style={[styles.card, styles.votesContainer]}>
        <Text style={styles.votesText}>Votes For: {debate.votesFor}</Text>
        <Text style={styles.votesText}>Votes Against: {debate.votesAgainst}</Text>
      </View>
    </LinearGradient>
  );
}

// All visual styling for the debate screen
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: 'rgba(26, 39, 70, 0.8)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(90, 124, 255, 0.2)',
  },
  topic: {
    fontSize: 24,
    fontWeight: '800',
    color: '#e0e0ff',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#d0e0ff',
  },
  sidesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sideItem: {
    alignItems: 'center',
    flex: 1,
  },
  sideLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#a0c0ff',
  },
  sideText: {
    fontSize: 14,
    color: '#e0e0ff',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    color: '#e0e0ff',
    fontSize: 14,
  },
  winnerText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ff7e5f',
    textAlign: 'center',
  },
  waitingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#a0c0ff',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e0e0ff',
    marginBottom: 12,
  },
  argumentsList: {
    flex: 1,
  },
  argumentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  argumentSide: {
    fontSize: 16,
    color: '#e0e0ff',
    flex: 1,
  },
  micButton: {
    alignSelf: 'center',
    backgroundColor: '#3a4f8f',
    padding: 16,
    borderRadius: 50,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  recording: {
    backgroundColor: '#ff4d4d', // Red when recording
  },
  disabled: {
    opacity: 0.5, // Dim when disabled
  },
  micText: {
    color: '#e0e0ff',
    fontSize: 18,
    fontWeight: '700',
  },
  turnText: {
    color: '#a0c0ff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  voteContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  voteButton: {
    flex: 1,
    marginHorizontal: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  voteButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  voteButtonText: {
    color: '#e0e0ff',
    fontSize: 16,
    fontWeight: '800',
  },
  votesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  votesText: {
    color: '#e0e0ff',
    fontSize: 14,
  },
  errorText: {
    color: '#e0e0ff',
    fontSize: 18,
    textAlign: 'center',
    flex: 1,
    justifyContent: 'center',
  },
});