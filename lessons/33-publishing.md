---
id: publishing
title: Publishing to Google Play
part: 7
minutes: 35
summary: Take your app from Android Studio to the Play Store. Prepare a release build, sign it, shrink it with R8, upload an App Bundle, run testing tracks, and roll out to the world.
---

:::goals
- A pre-release checklist
- Versioning with `versionCode` and `versionName`
- Signing keys, upload keys and Play App Signing
- Building a release App Bundle with R8 shrinking
- Setting up the Play Console listing and policies
- Testing tracks and staged rollouts
:::

## Pre-release checklist

Before you publish, go through this list:

- [ ] **Application ID** is final (`com.yourname.appname`). It can **never** change after publishing.
- [ ] App **name**, **icon** (adaptive + monochrome) and **theme** are polished.
- [ ] No debug-only code: remove test buttons, verbose logging, hard-coded test accounts.
- [ ] Handles **no internet**, **rotation**, **dark mode**, **large fonts** and **process death**.
- [ ] Tested on at least one small phone and one large screen/tablet emulator.
- [ ] `targetSdk` meets Google Play's current requirement (it rises every year).
- [ ] Only the **permissions** you really need.
- [ ] A **privacy policy** URL if you collect any personal data (required for many apps).
- [ ] Tested a **release build** on a real device (R8 can break things debug builds don't).

## Versioning

```kts title="app/build.gradle.kts"
defaultConfig {
    versionCode = 3          // integer, MUST increase for every upload to Play
    versionName = "1.1.0"    // shown to users, any string you like
}
```

A common scheme: `versionName` follows *major.minor.patch*, and `versionCode` just goes up by one each release.

## App signing

Every Android app must be **digitally signed**. The signature proves updates come from the same developer. Play uses two keys:

- **Upload key**: *you* sign your App Bundle with it before uploading.
- **App signing key**: Google keeps it securely and uses it to sign the APKs delivered to users (**Play App Signing**, required for new apps).

If you ever lose your upload key, Google can reset it. (Without Play App Signing, losing your key meant you could never update your app again!)

### Create an upload key

**Build → Generate Signed App Bundle or APK → Android App Bundle → Next → Create new…**

- Choose a keystore path **outside your project folder**.
- Use strong passwords and store them in a password manager.
- Validity: 25+ years.

:::danger Never commit your keystore or passwords to Git
Keep the `.jks` file and passwords out of version control. Back up the keystore somewhere safe (e.g. an encrypted cloud drive). For command-line or CI builds, read passwords from environment variables or a git-ignored `keystore.properties` file.
:::

Optional: configure signing in Gradle so `./gradlew bundleRelease` signs automatically:

```kts title="app/build.gradle.kts"
import java.util.Properties

val keystoreProps = Properties().apply {
    val f = rootProject.file("keystore.properties")          // git-ignored!
    if (f.exists()) f.inputStream().use { load(it) }
}

android {
    signingConfigs {
        create("release") {
            storeFile = file(keystoreProps["storeFile"] as String? ?: "missing.jks")
            storePassword = keystoreProps["storePassword"] as String?
            keyAlias = keystoreProps["keyAlias"] as String?
            keyPassword = keystoreProps["keyPassword"] as String?
        }
    }
    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("release")
            // …
        }
    }
}
```

## Shrinking and optimising with R8

**R8** removes unused code and resources, shortens names, and optimises your app. That usually means a smaller download and faster app. Enable it for release builds:

```kts title="app/build.gradle.kts"
buildTypes {
    release {
        isMinifyEnabled = true         // shrink + optimise code
        isShrinkResources = true       // remove unused resources
        proguardFiles(
            getDefaultProguardFile("proguard-android-optimize.txt"),
            "proguard-rules.pro"
        )
    }
}
```

R8 decides what's "unused" by analysing your code. Code used via **reflection** (by some libraries) can be removed wrongly, causing crashes only in release builds. Most modern libraries (Retrofit, kotlinx.serialization, Room, Hilt) ship their own rules, so it usually just works. If a release build crashes with `ClassNotFoundException` or similar, add a **keep rule**:

```pro title="proguard-rules.pro"
# Keep our network DTOs (only if something uses them via reflection)
-keep class com.example.recipebox.data.remote.dto.** { *; }
```

:::tip Test the release build locally
Select the **release** build variant (**Build → Select Build Variant**) or install via **Generate Signed App Bundle/APK → APK**, and click through every screen before uploading.
:::

## Build the App Bundle

**Build → Generate Signed App Bundle or APK → Android App Bundle**, choose your key and the **release** variant. Or from the terminal:

```bash
./gradlew bundleRelease
# → app/build/outputs/bundle/release/app-release.aab
```

The `.aab` contains everything; Play generates optimised APKs per device (only the right screen density, CPU architecture and language), so users download less.

## Google Play Console

1. **Create a developer account** at [play.google.com/console](https://play.google.com/console). There's a one-time registration fee and identity verification.
2. **Create app**: name, default language, app or game, free or paid.
3. Complete the **setup tasks** on the dashboard:
   - **Store listing**: short description (80 chars), full description, app icon (512×512), feature graphic (1024×500), at least 2 phone screenshots.
   - **Content rating** questionnaire.
   - **Target audience** and whether the app appeals to children.
   - **Data safety** form: what data you collect and share, and why. It must match what your app (and its libraries) actually do.
   - **Privacy policy** URL, ads declaration, app access (test credentials if login is required).

:::note New personal developer accounts must run a closed test
Google requires newly created **personal** developer accounts to run a **closed test** with a minimum number of testers (12 at the time of writing) opted in for at least 14 days before applying for production access. Plan for this: recruit friends, classmates or an online community early. Check the Play Console for the current requirements.
:::

## Testing tracks

Play has several tracks, from private to public:

| Track | Who | Use for |
|---|---|---|
| **Internal testing** | Up to 100 testers you invite by email | Quick builds for yourself and your team, available within minutes |
| **Closed testing** | Invited testers or Google Groups | Beta testing with real users |
| **Open testing** | Anyone can join from your Play listing | Public beta |
| **Production** | Everyone | The real release 🎉 |

Upload your `.aab` to **Internal testing** first, install it from the Play Store on your own phone, and check everything works as a real user would get it.

## Releasing to production

1. Create a production release, upload the `.aab` (or promote a tested build), and write **release notes** ("What's new").
2. Use a **staged rollout**: start with e.g. 10% of users, watch for crashes, then increase to 100%.
3. Submit for **review**. It can take from a few hours to several days, especially for a new app.
4. Monitor **Android vitals** in the Play Console: crash rate, ANR rate, startup time. Keep them low; Play uses them in store rankings.

## Updates

For every update: increase `versionCode`, update `versionName`, build a new signed bundle, upload to a track, and roll out. Consider the **In-App Updates** API to prompt users to update and the **In-App Review** API to ask for ratings at a good moment.

## Recap

:::recap
- Finalise the application ID, test the **release** build, bump `versionCode` every upload.
- Sign with an **upload key**; Google holds the app signing key (Play App Signing).
- Enable R8 (`isMinifyEnabled`, `isShrinkResources`) and add keep rules if needed.
- Upload an `.aab`; complete the listing, content rating, data safety and privacy policy.
- Internal → closed → production, with a staged rollout. Watch Android vitals.
:::

:::exercise
1. Generate an upload key and a signed release App Bundle for one of your practice apps.
2. Enable R8 and resource shrinking, install the release variant on a device, and test every screen.
3. Write a draft store listing: an 80-character short description, a full description and a list of the screenshots you'd take.
:::

## Check your understanding

```quiz
Q: What must change for every new version you upload to Google Play?
- [ ] The application ID
- [ ] The package name
- [x] The versionCode (it must increase)
- [ ] The signing key
> Play rejects uploads whose versionCode isn't higher than the previous one.

Q: With Play App Signing, what happens if you lose your upload key?
- [ ] You can never update the app again
- [x] You can ask Google to reset your upload key, since Google holds the app signing key
- [ ] Your app is removed
- [ ] Nothing, keys aren't needed
> Separating the upload key from the app signing key makes key loss recoverable.

Q: Your app works in debug but crashes in release with ClassNotFoundException. What's the likely cause?
- [ ] The emulator is broken
- [x] R8 removed or renamed a class that's accessed via reflection, so add a keep rule
- [ ] versionCode is too low
- [ ] The app isn't signed
> R8 only sees direct references; reflection-based access needs keep rules.

Q: Which file format do you upload to Google Play?
- [ ] .apk
- [x] .aab
- [ ] .jar
- [ ] .zip
> Android App Bundles let Play generate optimised APKs per device.
```
