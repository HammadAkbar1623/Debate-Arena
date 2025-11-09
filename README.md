# 🎙️ Debate Arena — Real-Time Debating App (MVP)

> **An interactive, voice-based debating platform where users can host, join, and spectate live 2-minute debates — powered by React Native (Expo) and Firebase.**

---

## 🚀 Overview

**Debate Arena** is a mobile MVP designed to make online debates **structured, time-bound, and gamified**.  
Users can host or join debates on trending topics, argue live through voice for one minute each, and spectators vote on who made the stronger argument.

The app introduces an engaging **XP reward system**, **levels**, and **streaks**, turning intellectual discussions into a competitive, fun, and rewarding experience.

---

## 🧩 Problem

Most online debates on platforms like Reddit or X (Twitter) devolve into chaos — long, toxic comment chains with no structure or conclusion.  
**Debate Arena** solves this by providing a platform for short, civil, real-time **voice-based debates** that spectators can easily join, vote on, and enjoy.

---

## 💡 Solution

A fast, swipe-based debating app that validates whether structured, gamified voice debates can increase engagement and retention.

**Core user flow:**
1. Browse upcoming debates.
2. **Swipe right** to join or **swipe left** to skip.
3. Choose your role — *For*, *Against*, or *Spectator*.
4. Debate live (1 minute per side).
5. Spectators vote → XP transfers from loser to winner.
6. Users level up, earn badges, and build streaks.

---

## ⚙️ Features

| Feature | Description |
|----------|-------------|
| 🎤 **Live Voice Debates** | Real-time audio conversations between two debaters, each with 1 minute. |
| 🧭 **Swipe-Based Navigation** | Users can quickly swipe right to join or left to skip debates — like “Tinder for debates.” |
| ⚖️ **Voting System & XP Rewards** | Spectators vote after each debate; winner earns XP automatically via Firebase. |
| 🔥 **Events Tab** | Moderators post trending “Hot Topic” or **team debates** where even spectators earn XP. |
| 🧑‍🎓 **Profile Tab** | Displays XP, awards, win rate, streaks, and levels. |
| 🔐 **Firebase Authentication** | Secure Google sign-in and user management. |
| ⚡ **Real-Time Updates** | Powered by Firestore for live votes, XP transfers, and debate state changes. |
| 🪶 **Modern UI/UX** | Built with Expo + React Native, featuring clean design and smooth transitions. |

---

## 🛠️ Tech Stack

| Layer | Technology |
|--------|-------------|
| **Frontend** | React Native (Expo) |
| **Backend** | Firebase Firestore, Firebase Auth, Firebase Storage |
| **Voice Communication** | Expo Audio APIs |
| **Design** | Figma |
| **Deployment** | Expo Go / EAS Build |

---

## 🧠 Architecture

React Native (Expo)
├── Screens (Home, Debate, Events, Profile)
├── Components (SwipeCard, Timer, MicButton)
├── Firebase Services
│ ├── Auth (Google Sign-in)
│ ├── Firestore (Real-time DB)
│ ├── Storage (Profile/Audio assets)
└── Context Providers (AuthContext, XPContext)