---
id: welcome
title: Welcome & What Is Android?
part: 1
minutes: 15
summary: How to get the most out of this course, what Android actually is under the hood, and the modern toolkit you're about to learn.
---

:::goals
- How to use this course so you actually *learn*, not just read
- What Android is and how an app runs on a phone
- The four building blocks every Android app is made of
- Why we use Kotlin and Jetpack Compose
- What API levels are and why they matter
:::

## Welcome!

By the end of this course you will be able to design, build, test and publish a complete native Android app. You don't need any previous Android experience. It helps if you've done a little programming before (any language), but Part 2 teaches Kotlin from scratch, so a complete beginner can follow along too.

The course has **8 parts**. The first seven teach one topic at a time. The eighth is a **capstone project**: you build *RecipeBox*, a real app that loads recipes from the internet, saves favourites to a local database, supports dark mode, and is ready for Google Play.

### How to learn effectively

:::tip The golden rule: type the code yourself
Don't copy and paste. Typing code forces your brain to process every line, and the mistakes you make (and fix) are where most of the learning happens.
:::

1. **Read the lesson once** to get the big picture.
2. **Code along** in Android Studio (from Lesson 2 onwards). For pure-Kotlin examples you can press **▶ Try it** on the code block to run and edit it right in your browser.
3. **Do the practice tasks.** Try each one before you open the solution. Being stuck for 10 minutes is normal and useful.
4. **Take the quiz** at the end of each lesson, then click **Mark as complete**. Your progress is saved in this browser.
5. **Experiment.** Change numbers, break things, read the error messages. That's how professionals learn too.

## What is Android?

Android is an **operating system** (OS), the software that runs a device and lets apps use its hardware. Google develops it on top of the open-source Android Open Source Project (AOSP). It runs on billions of phones, and also on tablets, watches (Wear OS), TVs (Google TV), cars (Android Auto) and foldables.

An operating system is built in layers. Your app sits at the very top and talks to the layers below through well-defined APIs:

<div class="diagram">
<div class="stack">
<div class="hl">Your app<small>Kotlin code + resources (layouts, images, strings)</small></div>
<div>Android Framework (Java/Kotlin APIs)<small>Activities, Notifications, Location, Camera, Permissions, …</small></div>
<div>Android Runtime (ART) + Native libraries<small>Runs your compiled code; OpenGL, SQLite, media codecs</small></div>
<div>Hardware Abstraction Layer (HAL)<small>Standard interfaces for the camera, sensors, Bluetooth…</small></div>
<div>Linux Kernel<small>Memory, processes, drivers, security, power management</small></div>
</div>
<div class="diagram-caption">The Android platform stack. You work almost entirely in the top two layers.</div>
</div>

As an app developer you mostly work with the **Android Framework**: a huge library of classes that lets you draw screens, show notifications, get the user's location, store files and much more. You'll also use **Jetpack**, a large set of libraries from Google that sit on top of the framework and make common tasks easier and consistent across Android versions.

## How an app gets onto a phone

When you press **Run** in Android Studio, a lot happens automatically:

<div class="diagram">
<div class="flow">
<div>Kotlin source<small>.kt files</small></div>
<div class="arrow">→</div>
<div>Compiler<small>Kotlin → JVM bytecode</small></div>
<div class="arrow">→</div>
<div>D8 / R8<small>bytecode → DEX</small></div>
<div class="arrow">→</div>
<div>Packager<small>DEX + resources + manifest</small></div>
<div class="arrow">→</div>
<div class="hl">APK / AAB<small>installable app</small></div>
</div>
<div class="diagram-caption">The build pipeline, orchestrated by Gradle.</div>
</div>

- **Gradle** is the build tool that runs this whole pipeline. You configure it in `build.gradle.kts` files (Lesson 3).
- **DEX** (Dalvik Executable) is the bytecode format Android's runtime understands.
- An **APK** (Android Package) is a zip file containing your code, images, layouts and the app's *manifest*. You install APKs on devices while developing.
- An **AAB** (Android App Bundle) is what you upload to Google Play. Play then generates optimised APKs for each device.

On the device, the **Android Runtime (ART)** runs your app. Each app runs in its own **sandbox**: it gets its own Linux user ID, its own process and its own private storage. One app cannot read another app's files or memory unless it's explicitly shared. That's why apps must ask for **permissions** to access things like the camera or location.

## The four app components

Android apps are built from four kinds of *components*. The system can start any of them independently, which is what makes Android different from a normal desktop program with a single `main()` function.

| Component | What it does | Example |
|---|---|---|
| **Activity** | A single screen/window the user interacts with. The entry point for UI. | The main screen of your app |
| **Service** | Does work in the background with no UI. | Playing music while you use another app |
| **Broadcast receiver** | Responds to system-wide events. | Reacting when the device finishes booting |
| **Content provider** | Shares structured data with other apps. | The Contacts app sharing contacts |

Components talk to each other (and to other apps) using **Intents**, messages that say "I want to do this", such as "open this web page" or "share this text". You'll use them in Part 6.

:::note Modern apps usually have just ONE activity
Older apps used one Activity per screen. Modern Compose apps typically have a **single Activity** and switch between *screens* inside it using Navigation (Part 4). You'll still meet the other components, especially Services and Broadcast receivers, through higher-level Jetpack libraries like WorkManager.
:::

## Native vs. cross-platform

"Native" Android development means building with the tools Google designs for Android itself: **Kotlin**, the **Android SDK**, and **Jetpack Compose**. The alternatives are cross-platform frameworks like Flutter, React Native or Kotlin Multiplatform. Here's why learning native first is a great choice:

- You get **full, immediate access** to every Android feature and API on day one.
- **Best performance** and the most "at home" look and feel.
- Almost every Android job requires native knowledge, and it makes you better at cross-platform tools later because you understand what's underneath.
- Kotlin skills carry over directly to **Kotlin Multiplatform** if you later want to share code with iOS.

## The modern Android toolkit

Google calls its recommended set of tools *Modern Android Development*. This is exactly the stack this course teaches:

| Tool | What it's for | Where you'll learn it |
|---|---|---|
| **Kotlin** | The programming language. Concise, safe, and Google's recommended language. | Part 2 |
| **Coroutines & Flow** | Doing slow work (network, database) without freezing the screen. | Lessons 10, 20 |
| **Jetpack Compose** | Building UI with Kotlin code instead of XML. | Part 3 |
| **Material 3** | Google's design system: ready-made buttons, cards, colours and typography. | Part 3 |
| **ViewModel & Navigation** | Holding screen state and moving between screens. | Part 4 |
| **Hilt** | Dependency injection: wiring your classes together cleanly. | Lesson 22 |
| **Retrofit, Room, DataStore** | Networking, local database and settings storage. | Part 5 |
| **WorkManager** | Reliable background tasks. | Lesson 28 |
| **Android Studio & Gradle** | The IDE and the build system. | Lessons 2–3 |

## Android versions & API levels

Every Android release has a marketing name/number (Android 14, 15, 16…) and an **API level**, an integer that identifies the exact set of APIs available. Code refers to API levels, not version names.

| Android version | API level | Released |
|---|---|---|
| Android 17 | 37 | 2026 |
| Android 16 | 36 | 2025 |
| Android 15 | 35 | 2024 |
| Android 14 | 34 | 2023 |
| Android 13 | 33 | 2022 |
| Android 12 | 31–32 | 2021 |
| Android 8.0 | 26 | 2017 |
| Android 7.0 | 24 | 2016 |

A new version arrives every year, so check the [official version list](https://developer.android.com/tools/releases/platforms) for the newest ones. Your app declares three important numbers:

- **`minSdk`**: the oldest Android version your app can be installed on. Lower means more users but fewer modern APIs. API 24 reaches the vast majority of active devices.
- **`targetSdk`**: the version you've tested against. Android enables newer behaviours for your app based on this. Google Play requires it to be recent, and the requirement rises each year.
- **`compileSdk`**: the API level your code is compiled against, which decides which APIs you can *reference*. Usually the latest.

:::analogy
`minSdk` is the oldest phone you promise to support. `targetSdk` is saying "I've tested on this version and I'm ready for its rules." `compileSdk` is which edition of the Android dictionary you're allowed to look words up in.
:::

## Your roadmap

1. **Getting Started**: install Android Studio and run an app (you're here).
2. **Kotlin Essentials**: the language, from variables to coroutines.
3. **UI with Jetpack Compose**: layouts, components, state, lists, theming.
4. **App Architecture**: lifecycle, navigation, ViewModel, layers, Hilt.
5. **Data & Networking**: Retrofit, Room, DataStore, offline-first.
6. **The Android Platform**: intents, permissions, background work, notifications, media.
7. **Quality & Shipping**: testing, debugging, publishing to Google Play.
8. **Capstone: RecipeBox**: build a complete app from scratch.

## Check your understanding

```quiz
Q: What is an Activity?
- [ ] A background task with no user interface
- [x] A single screen the user can interact with
- [ ] A database that shares data between apps
- [ ] The build tool that compiles your code
> An Activity is the component that hosts UI. Background work is a Service; sharing data is a Content provider; the build tool is Gradle.

Q: Which file format do you upload to Google Play?
- [ ] APK
- [ ] DEX
- [x] AAB (Android App Bundle)
- [ ] JAR
> Google Play takes an App Bundle (.aab) and generates optimised APKs for each device configuration.

Q: Your app sets `minSdk = 26`. What does that mean?
- [ ] The app only runs on Android 26 and newer
- [x] The app can only be installed on devices running API level 26 (Android 8.0) or higher
- [ ] The app is tested against API 26
- [ ] The app is compiled with the API 26 SDK
> minSdk is the oldest API level the app can be installed on. API 26 corresponds to Android 8.0.

Q: Why must an app request permission to use the camera?
- [ ] Because Kotlin requires it
- [ ] Because the camera is slow
- [x] Because each app runs in its own sandbox and can't access protected resources without the user's consent
- [ ] Because Gradle blocks camera code by default
> Android isolates apps in sandboxes. Sensitive resources like the camera, location and contacts need the user's explicit permission.
```
