---
id: project-tour
title: Tour of an Android Project
part: 1
minutes: 25
summary: Understand every folder and file in a new project, including the manifest, resources, Gradle build files and the version catalog, so nothing feels like magic.
---

:::goals
- What each folder in an Android project is for
- What the `AndroidManifest.xml` declares
- How resources (`res/`) work and why strings don't belong in code
- How Gradle build files, plugins and dependencies fit together
- How to add a library using the version catalog
:::

## Two ways to view your project

The **Project** tool window (left side) has a dropdown at the top. The two views you'll use:

- **Android** (default): a simplified, *logical* view that groups files by type. Great for day-to-day work.
- **Project**: the *real* folder structure on disk.

Here's the real structure of the project you created, with the important bits labelled:

<div class="tree">HelloAndroid/
├── app/                          ← your app "module"
│   ├── build.gradle.kts          ← build config for the app module
│   ├── proguard-rules.pro        ← code shrinker rules (release builds)
│   └── src/
│       ├── main/
│       │   ├── AndroidManifest.xml
│       │   ├── java/com/example/helloandroid/
│       │   │   ├── MainActivity.kt
│       │   │   └── ui/theme/     ← Color.kt, Theme.kt, Type.kt
│       │   └── res/              ← resources: images, strings, icons…
│       ├── test/                 ← unit tests (run on your computer)
│       └── androidTest/          ← instrumented tests (run on a device)
├── gradle/
│   ├── libs.versions.toml        ← version catalog: all library versions
│   └── wrapper/                  ← pins the Gradle version
├── build.gradle.kts              ← project-level build config
├── settings.gradle.kts           ← lists modules & where to download libraries
├── gradle.properties             ← build settings (memory, flags)
└── gradlew / gradlew.bat         ← Gradle wrapper scripts</div>

:::note Kotlin code in a folder called "java"?
Yes. For historical reasons Kotlin files live in `src/main/java/` by default. You *can* use `src/main/kotlin/`, but most projects keep the default. It makes no difference to the compiler.
:::

## Modules

A **module** is a self-contained unit of code with its own build file. A new project has one module, `app`. Large apps split code into many modules (e.g. `:feature:search`, `:core:network`) for faster builds and clearer boundaries. For this course, a single `app` module is perfect.

## The manifest

Every app has an `AndroidManifest.xml`. It's the app's "ID card" that tells Android what's inside the app *before* running any code:

```xml title="app/src/main/AndroidManifest.xml"
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Permissions go here, e.g.: -->
    <!-- <uses-permission android:name="android.permission.INTERNET" /> -->

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.HelloAndroid">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:theme="@style/Theme.HelloAndroid">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

Key parts:

- `<uses-permission>`: permissions the app needs (internet, camera, notifications…).
- `<application>`: app-wide settings: icon, name (`label`), theme.
- `<activity>`: every Activity **must** be declared here or the app crashes when it's opened.
- The `intent-filter` with `MAIN` + `LAUNCHER` says: *"put an icon for this Activity in the app launcher, and open it when tapped."*
- `android:exported="true"` means other apps (like the launcher) are allowed to start this Activity.

## Resources (`res/`)

Resources are all the non-code parts of your app. Each type lives in a specific folder:

| Folder | Contains | Example |
|---|---|---|
| `drawable/` | Images & vector graphics | `ic_logo.xml`, `photo.png` |
| `mipmap-*/` | App launcher icons at different densities | `ic_launcher.webp` |
| `values/` | Strings, colours, dimensions, themes | `strings.xml`, `colors.xml`, `themes.xml` |
| `xml/` | Misc config files | backup rules, file paths |
| `font/` | Custom fonts | `inter_bold.ttf` |
| `raw/` | Any file you want as-is | `sound.mp3` |

Android generates a class called **`R`** that gives every resource an ID, so you can refer to it from code: `R.string.app_name`, `R.drawable.ic_logo`. In XML you refer to resources with `@`, like `@string/app_name`.

```xml title="res/values/strings.xml"
<resources>
    <string name="app_name">HelloAndroid</string>
    <string name="greeting">Hello %1$s!</string>
</resources>
```

In Compose you read them with `stringResource`:

```kotlin
Text(text = stringResource(R.string.greeting, "Sam"))   // "Hello Sam!"
```

### Why not just write text in code?

Because of **qualifiers**. Android automatically picks the right resource for the device:

- `values/strings.xml` → default (English)
- `values-es/strings.xml` → used when the phone is set to Spanish
- `values-night/` → used in dark mode
- `drawable-xxhdpi/` → used on high-density screens

Your code keeps saying `R.string.greeting`, and Android chooses the right file. Translating your app becomes adding one file instead of changing code.

:::tip Practical advice
While learning, hard-coded strings in code are fine. For apps you publish, put user-visible text in `strings.xml`. Android Studio can do it for you: put the cursor on a string and press [[Alt]]/[[Option]] + [[Enter]] → *Extract string resource*.
:::

## Gradle: the build system

**Gradle** compiles your code, downloads libraries, merges resources and produces the APK. You configure it using Kotlin scripts (`.gradle.kts` files). There are three that matter.

### `settings.gradle.kts`: where to find things

```kts title="settings.gradle.kts"
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()        // Google's libraries (Jetpack, Compose…)
        mavenCentral()  // Most other open-source libraries
    }
}

rootProject.name = "HelloAndroid"
include(":app")        // the modules in this project
```

### `app/build.gradle.kts`: how to build the app

This is the file you'll edit most often.

```kts title="app/build.gradle.kts"
plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
}

android {
    namespace = "com.example.helloandroid"   // package for the generated R class
    compileSdk = 37

    defaultConfig {
        applicationId = "com.example.helloandroid"  // unique ID on the Play Store
        minSdk = 24
        targetSdk = 37
        versionCode = 1        // integer; must increase with every Play release
        versionName = "1.0"    // what users see
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
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
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)
    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.ui.test.junit4)
    debugImplementation(libs.androidx.ui.tooling)
    debugImplementation(libs.androidx.ui.test.manifest)
}
```

:::note Your file may look slightly different
Android Studio templates change a little between releases: SDK numbers go up and some syntax changes. Since **AGP 9** (the Android Gradle Plugin), Kotlin support is built in, so there's no separate `kotlin.android` plugin. Projects created with older versions have an extra `alias(libs.plugins.kotlin.android)` line. The concepts are identical.
:::

**Plugins** add capabilities: `android.application` knows how to build an Android app; `kotlin.compose` enables the Compose compiler.

**Dependencies** are libraries your app uses. The keyword says *when* the library is needed:

| Configuration | Meaning |
|---|---|
| `implementation` | Needed to compile and run the app |
| `testImplementation` | Only for local unit tests (`src/test`) |
| `androidTestImplementation` | Only for instrumented tests (`src/androidTest`) |
| `debugImplementation` | Only in debug builds (e.g. preview tooling) |
| `ksp` | An annotation processor that generates code (Room, Hilt), which you'll use later |

### The version catalog: `gradle/libs.versions.toml`

Instead of writing library coordinates and versions directly in build files, modern projects keep them in one **version catalog** file:

```toml title="gradle/libs.versions.toml"
[versions]
agp = "9.4.1"
kotlin = "2.4.20"
coreKtx = "1.19.1"
composeBom = "2026.09.00"

[libraries]
androidx-core-ktx = { group = "androidx.core", name = "core-ktx", version.ref = "coreKtx" }
androidx-compose-bom = { group = "androidx.compose", name = "compose-bom", version.ref = "composeBom" }
androidx-material3 = { group = "androidx.compose.material3", name = "material3" }

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
kotlin-compose = { id = "org.jetbrains.kotlin.plugin.compose", version.ref = "kotlin" }
```

- `[versions]`: version numbers, defined once.
- `[libraries]`: each library gets an alias. Dashes become dots in code: `androidx-core-ktx` → `libs.androidx.core.ktx`.
- `[plugins]`: Gradle plugins, used with `alias(libs.plugins.…)`.

:::tip What's a BOM?
The **Compose BOM** (Bill of Materials) is a single version that picks compatible versions of *all* Compose libraries for you. That's why `androidx-material3` above has no version: the BOM supplies it.
:::

:::warning About version numbers in this course
Library versions shown in lessons were recent when written, but they move fast. Your project's template will already have newer ones. When Android Studio highlights a version in yellow and offers a newer one, it's generally safe to accept it.
:::

### Adding a library: step by step

Let's say you want the `material-icons-extended` library (a large set of extra icons):

1. Add it to the catalog:

   ```toml
   [libraries]
   androidx-material-icons-extended = { group = "androidx.compose.material", name = "material-icons-extended" }
   ```

2. Use it in `app/build.gradle.kts`:

   ```kts
   dependencies {
       implementation(libs.androidx.material.icons.extended)
   }
   ```

3. Click **Sync Now** in the yellow bar at the top of the editor. Done!

## Building from the command line

The `gradlew` script (the **Gradle wrapper**) downloads the right Gradle version automatically, so the project builds the same on every machine. From the project folder:

```bash
./gradlew assembleDebug     # build a debug APK → app/build/outputs/apk/debug/
./gradlew installDebug      # build and install on a connected device
./gradlew test              # run unit tests
./gradlew clean             # delete build outputs
```

On Windows use `gradlew.bat assembleDebug`. Android Studio runs these same tasks when you click buttons.

## Recap

:::recap
- `app/src/main` holds code (`java/`), resources (`res/`) and the **manifest**.
- The **manifest** declares components (activities), permissions and app metadata.
- **Resources** are referenced via the generated `R` class and automatically adapt to language, theme and screen.
- **Gradle** builds the app. `app/build.gradle.kts` holds SDK levels and dependencies; `libs.versions.toml` holds versions.
- After changing any Gradle file, **sync**.
:::

:::exercise
1. Switch the Project tool window between the **Android** and **Project** views and find `strings.xml` in both.
2. Change `app_name` in `strings.xml` to `"My First App"`, run the app, and check the name under the icon in the launcher.
3. Add a string resource `welcome_message` with the value `"Welcome to Android!"` and display it in `Greeting` using `stringResource(R.string.welcome_message)`.
4. Run `./gradlew assembleDebug` in Android Studio's **Terminal** tab and find the generated APK.
:::

:::solution Show solution for task 3
```xml title="res/values/strings.xml"
<resources>
    <string name="app_name">My First App</string>
    <string name="welcome_message">Welcome to Android!</string>
</resources>
```

```kotlin title="MainActivity.kt"
import androidx.compose.ui.res.stringResource

@Composable
fun Greeting(name: String, modifier: Modifier = Modifier) {
    Text(
        text = stringResource(R.string.welcome_message),
        modifier = modifier
    )
}
```
If `R` shows in red, press [[Alt]]/[[Option]] + [[Enter]] to import `com.example.helloandroid.R`.
:::

## Check your understanding

```quiz
Q: You created a new Activity class but the app crashes when you try to open it. What's the most likely cause?
- [ ] You forgot to add it to `libs.versions.toml`
- [x] It isn't declared in `AndroidManifest.xml`
- [ ] Activities can't be created manually
- [ ] You need to run `./gradlew clean`
> Every Activity must be declared in the manifest with an `<activity>` element.

Q: How does Android show Spanish text to users whose phone is set to Spanish?
- [ ] You write `if (language == "es")` checks in code
- [x] It automatically picks `res/values-es/strings.xml` when it exists
- [ ] Google Play translates the app for you
- [ ] It uses the `translate` Gradle plugin
> Resource qualifiers such as `-es`, `-night` and `-xxhdpi` let Android choose the right resource for the device configuration.

Q: In `libs.versions.toml` you have `androidx-lifecycle-runtime-ktx = {...}`. How do you reference it in `build.gradle.kts`?
- [ ] `libs["androidx-lifecycle-runtime-ktx"]`
- [x] `libs.androidx.lifecycle.runtime.ktx`
- [ ] `androidx.lifecycle.runtime.ktx`
- [ ] `catalog.androidx_lifecycle_runtime_ktx`
> Dashes in catalog aliases become dots in the generated accessor.

Q: What's the difference between `implementation` and `testImplementation`?
- [ ] There's no difference
- [ ] `testImplementation` libraries are included in the release APK
- [x] `testImplementation` libraries are only available to unit tests, not the app itself
- [ ] `implementation` is only for Google libraries
> Test-only libraries (like JUnit) don't need to be shipped in your app, so they use `testImplementation`.
```
