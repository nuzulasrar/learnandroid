---
id: capstone-setup
title: "Capstone 1: Plan & Set Up RecipeBox"
part: 8
minutes: 35
summary: Time to build a complete app on your own. Meet RecipeBox, plan its features and architecture, create the project and add every dependency you'll need.
---

:::goals
- The features and screens of **RecipeBox**
- How the architecture maps to packages and classes
- Creating the project and configuring Gradle with all the libraries from this course
- Setting up the Application class, manifest and Hilt
:::

## Meet RecipeBox 🍳

Over the next four lessons you'll build **RecipeBox**, a complete, production-style app that uses almost everything you've learned. It loads recipes from the free [DummyJSON recipes API](https://dummyjson.com/docs/recipes), works offline, and saves favourites.

### Features

1. **Home**: a grid of recipe cards (photo, name, time, rating, cuisine) with **search** and **pull-to-refresh**.
2. **Recipe detail**: large photo, key facts, ingredients and step-by-step instructions, plus **favourite** and **share** buttons.
3. **Favourites**: recipes you've hearted, stored locally.
4. **Settings**: theme (System / Light / Dark) and dynamic colour.
5. **Offline-first**: recipes are cached in Room, so the app works without internet after the first load.
6. **Adaptive layout**: more grid columns on tablets and in landscape.

<div class="diagram"><div class="flow">
<div class="hl">Home<small>search · grid · refresh</small></div><div class="arrow">→</div>
<div>Detail<small>ingredients · steps · ♥ · share</small></div>
</div>
<div class="flow" style="margin-top:8px">
<div class="hl">Favourites<small>saved recipes</small></div>
<div class="hl">Settings<small>theme · dynamic colour</small></div>
</div>
<div class="diagram-caption">Home, Favourites and Settings are tabs in a bottom navigation bar. Detail opens on top.</div></div>

### Architecture

<div class="diagram">
<div class="layers">
<div class="layer ui"><h5>UI layer</h5><div class="boxes"><span>HomeScreen + HomeViewModel</span><span>DetailScreen + DetailViewModel</span><span>FavoritesScreen + FavoritesViewModel</span><span>SettingsScreen + SettingsViewModel</span></div></div>
<div class="dir">↓ ↑</div>
<div class="layer data"><h5>Data layer</h5><div class="boxes"><span>RecipeRepository → OfflineFirstRecipeRepository</span><span>RecipeApi (Retrofit)</span><span>RecipeDao (Room)</span><span>SettingsRepository (DataStore)</span></div></div>
</div>
<div class="diagram-caption">Hilt wires everything together. The Room database is the single source of truth for recipes.</div>
</div>

### Final package structure

<div class="tree">com.example.recipebox/
├── RecipeBoxApplication.kt
├── MainActivity.kt
├── MainViewModel.kt
├── data/
│   ├── model/Recipe.kt
│   ├── remote/RecipeApi.kt · RecipeDto.kt
│   ├── local/RecipeEntity.kt · RecipeDao.kt · Converters.kt · RecipeDatabase.kt
│   ├── repository/RecipeRepository.kt · OfflineFirstRecipeRepository.kt
│   └── settings/SettingsRepository.kt
├── di/NetworkModule.kt · DatabaseModule.kt · RepositoryModule.kt
├── util/Intents.kt
└── ui/
    ├── theme/          (generated)
    ├── RecipeBoxApp.kt (scaffold + bottom bar)
    ├── navigation/Routes.kt · RecipeBoxNavHost.kt
    ├── components/RecipeCard.kt · EmptyState.kt
    ├── home/ · detail/ · favorites/ · settings/</div>

:::tip How to approach the capstone
Try to write each file yourself **before** looking at the code in the lesson. Reuse your notes and earlier lessons. The provided code is a reference, not something to paste. If you get stuck for more than 15 minutes, peek, understand, then close it and type it yourself.
:::

## Step 1: create the project

1. **New Project → Empty Activity**.
2. Name: `RecipeBox`, package: `com.example.recipebox` (or use your own domain, e.g. `com.yourname.recipebox`), minimum SDK: **API 26**, Kotlin DSL.
3. Wait for the Gradle sync, run the template once to make sure everything works.

## Step 2: the version catalog

Open `gradle/libs.versions.toml`. **Keep** everything the template generated and **add** the following. (Remember: newer versions are fine; Android Studio will suggest them.)

```toml title="gradle/libs.versions.toml (additions)"
[versions]
# keep the template's entries (agp, kotlin, coreKtx, lifecycleRuntimeKtx, activityCompose, composeBom, …)
ksp = "2.3.12"                      # see Lesson 22
hilt = "2.60.1"
androidxHilt = "1.4.0"
navigationCompose = "2.10.2"
retrofit = "3.0.0"
okhttp = "4.12.0"
kotlinxSerialization = "1.11.0"
room = "2.8.5"
datastore = "1.2.1"
coil = "3.6.3"
coroutinesTest = "1.11.0"

[libraries]
# Compose extras
androidx-material-icons-extended = { group = "androidx.compose.material", name = "material-icons-extended" }
androidx-lifecycle-viewmodel-compose = { group = "androidx.lifecycle", name = "lifecycle-viewmodel-compose", version.ref = "lifecycleRuntimeKtx" }
androidx-lifecycle-runtime-compose = { group = "androidx.lifecycle", name = "lifecycle-runtime-compose", version.ref = "lifecycleRuntimeKtx" }
androidx-navigation-compose = { group = "androidx.navigation", name = "navigation-compose", version.ref = "navigationCompose" }
# Hilt
hilt-android = { group = "com.google.dagger", name = "hilt-android", version.ref = "hilt" }
hilt-compiler = { group = "com.google.dagger", name = "hilt-android-compiler", version.ref = "hilt" }
androidx-hilt-lifecycle-viewmodel-compose = { group = "androidx.hilt", name = "hilt-lifecycle-viewmodel-compose", version.ref = "androidxHilt" }
# Networking
retrofit = { group = "com.squareup.retrofit2", name = "retrofit", version.ref = "retrofit" }
retrofit-kotlinx-serialization = { group = "com.squareup.retrofit2", name = "converter-kotlinx-serialization", version.ref = "retrofit" }
okhttp-logging = { group = "com.squareup.okhttp3", name = "logging-interceptor", version.ref = "okhttp" }
kotlinx-serialization-json = { group = "org.jetbrains.kotlinx", name = "kotlinx-serialization-json", version.ref = "kotlinxSerialization" }
# Local data
androidx-room-runtime = { group = "androidx.room", name = "room-runtime", version.ref = "room" }
androidx-room-ktx = { group = "androidx.room", name = "room-ktx", version.ref = "room" }
androidx-room-compiler = { group = "androidx.room", name = "room-compiler", version.ref = "room" }
androidx-datastore-preferences = { group = "androidx.datastore", name = "datastore-preferences", version.ref = "datastore" }
# Images
coil-compose = { group = "io.coil-kt.coil3", name = "coil-compose", version.ref = "coil" }
coil-network-okhttp = { group = "io.coil-kt.coil3", name = "coil-network-okhttp", version.ref = "coil" }
# Testing
kotlinx-coroutines-test = { group = "org.jetbrains.kotlinx", name = "kotlinx-coroutines-test", version.ref = "coroutinesTest" }

[plugins]
kotlin-serialization = { id = "org.jetbrains.kotlin.plugin.serialization", version.ref = "kotlin" }
ksp = { id = "com.google.devtools.ksp", version.ref = "ksp" }
hilt = { id = "com.google.dagger.hilt.android", version.ref = "hilt" }
```

## Step 3: Gradle build files

```kts title="build.gradle.kts (project)"
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.kotlin.serialization) apply false
    alias(libs.plugins.ksp) apply false
    alias(libs.plugins.hilt) apply false
}
```

```kts title="app/build.gradle.kts"
plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.ksp)
    alias(libs.plugins.hilt)
}

android {
    namespace = "com.example.recipebox"
    compileSdk = 37

    defaultConfig {
        applicationId = "com.example.recipebox"
        minSdk = 26
        targetSdk = 37
        versionCode = 1
        versionName = "1.0.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    buildFeatures {
        compose = true
        buildConfig = true      // so we can use BuildConfig.DEBUG
    }
}

dependencies {
    // From the template
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)

    // Compose extras
    implementation(libs.androidx.material.icons.extended)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.navigation.compose)

    // Hilt
    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)
    implementation(libs.androidx.hilt.lifecycle.viewmodel.compose)

    // Networking
    implementation(libs.retrofit)
    implementation(libs.retrofit.kotlinx.serialization)
    implementation(libs.okhttp.logging)
    implementation(libs.kotlinx.serialization.json)

    // Local data
    implementation(libs.androidx.room.runtime)
    implementation(libs.androidx.room.ktx)
    ksp(libs.androidx.room.compiler)
    implementation(libs.androidx.datastore.preferences)

    // Images
    implementation(libs.coil.compose)
    implementation(libs.coil.network.okhttp)

    // Tests
    testImplementation(libs.junit)
    testImplementation(libs.kotlinx.coroutines.test)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.ui.test.junit4)
    debugImplementation(libs.androidx.ui.tooling)
    debugImplementation(libs.androidx.ui.test.manifest)
}
```

Click **Sync Now**. If the sync fails, the usual suspects are: an incompatible KSP version, a typo in a catalog alias, or a missing `apply false` in the project file. Read the error message; it usually names the problem.

:::note If your template differs
These files assume AGP 9 or newer, where Kotlin support is built in. If your project was created with an older Android Studio and has `alias(libs.plugins.kotlin.android)` lines, keep them. Also keep any other lines the template generated that aren't shown here (for example `kotlin { compilerOptions { … } }`). Everything else stays the same.
:::

## Step 4: the Application class

```kotlin title="RecipeBoxApplication.kt"
package com.example.recipebox

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class RecipeBoxApplication : Application()
```

## Step 5: the manifest

```xml title="app/src/main/AndroidManifest.xml"
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />

    <application
        android:name=".RecipeBoxApplication"
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.RecipeBox">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:theme="@style/Theme.RecipeBox">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

## Step 6: mark the Activity and create packages

Add `@AndroidEntryPoint` to `MainActivity` (leave the template's content for now). Then create the empty packages: right-click `com.example.recipebox` → **New → Package** for `data.model`, `data.remote`, `data.local`, `data.repository`, `data.settings`, `di`, `util`, `ui.navigation`, `ui.components`, `ui.home`, `ui.detail`, `ui.favorites`, `ui.settings`.

```kotlin title="MainActivity.kt (for now)"
@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            RecipeBoxTheme {
                Scaffold { padding -> Text("RecipeBox is set up! 🎉", Modifier.padding(padding)) }
            }
        }
    }
}
```

Run the app. If you see the message, Hilt, KSP and all your dependencies are configured correctly. That's often the hardest part of a new project!

## Step 7: commit to Git

Now is the perfect time to start version control, if you haven't already: **VCS → Enable Version Control Integration → Git** (or run `git init`), then commit: *"Project setup with dependencies"*. Commit after each lesson of the capstone so you can always go back.

:::recap
- RecipeBox: Home (search, grid, refresh), Detail, Favourites, Settings; offline-first.
- The architecture: Compose screens + ViewModels → repositories → Retrofit / Room / DataStore, wired with Hilt.
- All dependencies are added and the project builds and runs with Hilt.
:::

## Check your understanding

```quiz
Q: In RecipeBox, where does the Home screen read its list of recipes from?
- [ ] Directly from the Retrofit API
- [x] From the Room database, via the repository (single source of truth)
- [ ] From DataStore
- [ ] From a hard-coded list
> The network only refreshes the database; the UI observes the database.

Q: Why do both Room and Hilt need the KSP plugin?
- [ ] KSP makes the app smaller
- [x] They generate code at compile time from your annotations
- [ ] KSP is required for Compose
- [ ] It's needed for networking
> Annotation processing via KSP generates DAO implementations and Hilt's DI code.

Q: What does `buildConfig = true` enable?
- [ ] Release builds
- [x] Generation of the BuildConfig class, including BuildConfig.DEBUG
- [ ] Dark mode
- [ ] View Binding
> We'll use BuildConfig.DEBUG to enable network logging only in debug builds.
```
