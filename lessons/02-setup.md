---
id: setup
title: Install Android Studio & Run Your First App
part: 1
minutes: 30
summary: Install the official IDE, create a project, set up an emulator (or your own phone), and see your first app running.
---

:::goals
- How to install Android Studio and the Android SDK
- How to create a new Compose project from a template
- How to run your app on an emulator *and* on a real phone
- How to make a change and see it instantly
- The Android Studio shortcuts you'll use every day
:::

## 1. Install Android Studio

**Android Studio** is the official IDE (Integrated Development Environment) for Android. It's free, built by Google on top of JetBrains' IntelliJ IDEA, and includes everything you need: code editor, Android SDK, emulator, design previews and debugging tools.

1. Go to [developer.android.com/studio](https://developer.android.com/studio) and download the latest **stable** version for your OS.
   - **Mac:** pick *Mac with Apple chip* for M-series Macs or *Mac with Intel chip* for older ones. Open the `.dmg` and drag Android Studio into *Applications*.
   - **Windows:** run the `.exe` installer and accept the defaults.
   - **Linux:** unpack the `.tar.gz` and run `bin/studio.sh`.
2. Launch Android Studio. The **Setup Wizard** appears. Choose **Standard** installation.
3. The wizard downloads the **Android SDK**, platform tools, the **emulator** and a system image. This can take a while, so grab a coffee. ☕

:::note System requirements
Android development is fairly demanding. **16 GB of RAM** is comfortable, 8 GB is the practical minimum. Keep at least **15–20 GB of free disk space** for the SDK, emulator images and Gradle caches. An SSD makes a huge difference.
:::

## 2. Create your first project

1. On the Welcome screen click **New Project**.
2. Choose **Phone and Tablet → Empty Activity**. (This template uses Jetpack Compose. Avoid *Empty Views Activity*, which is the older XML-based template.)
3. Fill in the form:

| Field | Value | What it means |
|---|---|---|
| Name | `HelloAndroid` | The app's display name |
| Package name | `com.example.helloandroid` | A globally unique ID, usually your reversed domain. It can never change after you publish! |
| Save location | anywhere you like | Where the project folder lives |
| Minimum SDK | API 24 | Oldest Android version supported (Lesson 1) |
| Build configuration language | Kotlin DSL (build.gradle.kts) | The recommended option |

4. Click **Finish**. Android Studio creates the project and runs a **Gradle sync**, downloading libraries and configuring the build. Watch the progress bar at the bottom. The first sync can take several minutes.

:::warning Wait for the sync!
Until Gradle sync finishes, code will show red errors and the Run button won't work. That's normal. If sync fails, check your internet connection and use **File → Sync Project with Gradle Files**.
:::

## 3. Create an emulator

An **emulator** is a virtual Android phone running on your computer.

1. Open **Device Manager** (the phone icon in the right sidebar, or **View → Tool Windows → Device Manager**).
2. Click **+** → **Create Virtual Device**.
3. Choose a phone, for example **Pixel 8** or **Medium Phone**, and click **Next**.
4. Choose a **system image**: pick the latest stable release (with *Google Play* if available) and click the download icon next to it. Then **Next → Finish**.

The emulator uses your CPU's virtualization features. On Apple silicon and most modern PCs this just works. On Windows, if it complains about acceleration, enable **virtualization (VT-x / AMD-V / SVM)** in your BIOS and make sure the *Windows Hypervisor Platform* feature is turned on.

## 4. Run the app ▶

Select your emulator in the device dropdown in the toolbar and click the green **Run** button (or press [[Ctrl]] + [[R]] on Mac, [[Shift]] + [[F10]] on Windows/Linux).

Gradle builds the app, installs it on the emulator and launches it. You should see **"Hello Android!"** in the top-left corner. Congratulations, you've just run your first Android app! 🎉

## 5. Run on your real phone (optional but recommended)

Testing on a real device shows true performance and how the app *feels* in your hand.

1. On the phone, open **Settings → About phone** and tap **Build number** seven times. You'll see "You are now a developer!"
2. Go to **Settings → System → Developer options** and enable **USB debugging**.
3. Connect the phone with a USB cable and accept the "Allow USB debugging?" prompt on the phone.
4. Your phone now appears in Android Studio's device dropdown. Select it and press Run.

:::tip Wireless debugging (Android 11+)
No cable? In Developer options enable **Wireless debugging**, then in Android Studio's device dropdown choose **Pair Devices Using Wi-Fi** and scan the QR code. Computer and phone must be on the same network.
:::

## 6. Look at the code

Open `app/src/main/java/com/example/helloandroid/MainActivity.kt`. Don't worry about understanding everything yet. We'll cover every piece over the next lessons. Here's a guided tour:

```kotlin title="MainActivity.kt"
package com.example.helloandroid

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import com.example.helloandroid.ui.theme.HelloAndroidTheme

// 1. The Activity: the entry point of the app's UI
class MainActivity : ComponentActivity() {
    // 2. Called by Android when the screen is created
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()          // draw behind the status & navigation bars
        setContent {                // 3. Everything inside here is Compose UI
            HelloAndroidTheme {     // 4. Applies colours & typography
                Scaffold(modifier = Modifier.fillMaxSize()) { innerPadding ->
                    Greeting(
                        name = "Android",
                        modifier = Modifier.padding(innerPadding)
                    )
                }
            }
        }
    }
}

// 5. A composable function: a reusable piece of UI
@Composable
fun Greeting(name: String, modifier: Modifier = Modifier) {
    Text(
        text = "Hello $name!",
        modifier = modifier
    )
}

// 6. A preview: renders the UI inside Android Studio without running the app
@Preview(showBackground = true)
@Composable
fun GreetingPreview() {
    HelloAndroidTheme {
        Greeting("Android")
    }
}
```

1. `MainActivity` is an **Activity**, the screen Android opens when the user taps your app icon.
2. `onCreate` is a **lifecycle callback**: Android calls it when the Activity is created. (Lesson 18 covers the lifecycle.)
3. `setContent { ... }` says "this Activity's UI is described by the Compose code inside".
4. `HelloAndroidTheme` wraps the UI in your app's Material theme.
5. `Greeting` is a **composable function**, marked with `@Composable`. It describes a piece of UI: here, a `Text`.
6. `@Preview` lets Android Studio draw the composable in the **Design/Split** view, no emulator needed.

## 7. Make it yours

Change `"Android"` to your own name and press Run again. For small changes, Android Studio can often update the running app without a full restart:

- **Live Edit** updates Compose UI on the device as you type (when enabled).
- **Apply Changes** ([[Ctrl]] + [[Cmd]] + [[R]] on Mac) pushes code changes without restarting the app.

Also open the **Split** view (top-right of the editor) to see `GreetingPreview` rendered next to your code. Previews refresh as you edit.

## Shortcuts worth learning now

| Action | Mac | Windows / Linux |
|---|---|---|
| Search everywhere | [[Shift]] [[Shift]] | [[Shift]] [[Shift]] |
| Find any action/menu | [[Cmd]] + [[Shift]] + [[A]] | [[Ctrl]] + [[Shift]] + [[A]] |
| Quick fix / show suggestions | [[Option]] + [[Enter]] | [[Alt]] + [[Enter]] |
| Auto-complete | [[Ctrl]] + [[Space]] | [[Ctrl]] + [[Space]] |
| Go to declaration | [[Cmd]] + [[B]] | [[Ctrl]] + [[B]] |
| Reformat code | [[Cmd]] + [[Option]] + [[L]] | [[Ctrl]] + [[Alt]] + [[L]] |
| Rename symbol | [[Shift]] + [[F6]] | [[Shift]] + [[F6]] |
| Run app | [[Ctrl]] + [[R]] | [[Shift]] + [[F10]] |

:::tip Alt+Enter is magic
Whenever you see red or yellow squiggly code, put the cursor on it and press [[Option]]/[[Alt]] + [[Enter]]. Android Studio suggests fixes like adding a missing import. You'll use this constantly.
:::

## Troubleshooting

- **"SDK location not found"**: open **Settings → Languages & Frameworks → Android SDK** and make sure an SDK path is set, then re-sync.
- **Gradle sync takes forever / fails**: check your internet and any proxy settings. Try **File → Invalidate Caches → Invalidate and Restart**.
- **Emulator is very slow or won't start**: close other heavy apps, give it fewer resources, make sure virtualization is enabled, or use a real phone.
- **Phone not detected**: try another cable (some are charge-only), re-accept the USB debugging prompt, or on Windows install your phone maker's USB driver.

:::exercise
1. Change the greeting to `"Hello, <your name>! Welcome to Android."`
2. Add a second `@Preview` function called `GreetingPreviewLong` that previews `Greeting` with a very long name. Check it renders in the Split view.
3. Run the app on both the emulator and (if you can) your phone.
:::

:::solution Show solution for task 2
```kotlin
@Preview(showBackground = true)
@Composable
fun GreetingPreviewLong() {
    HelloAndroidTheme {
        Greeting("Maximilian Alexander Featherstonehaugh")
    }
}
```
You can have as many `@Preview` functions as you like. Each appears in the preview panel. They're a great way to check edge cases like long text.
:::

## Check your understanding

```quiz
Q: Which project template should you pick for a modern Compose app?
- [x] Empty Activity
- [ ] Empty Views Activity
- [ ] No Activity
- [ ] Native C++
> "Empty Activity" is the Jetpack Compose template. "Empty Views Activity" uses the older XML View system.

Q: What does `setContent { ... }` do in an Activity?
- [ ] It downloads content from the internet
- [x] It sets the Activity's UI to the Compose content described inside the braces
- [ ] It saves the app's state
- [ ] It creates a new Activity
> `setContent` connects Jetpack Compose to the Activity. Everything inside is the UI tree.

Q: Why is the package name important?
- [x] It uniquely identifies your app on devices and on Google Play, and can't change after publishing
- [ ] It sets the app's display name on the home screen
- [ ] It decides which Android versions are supported
- [ ] It's only used by the emulator
> The application ID (initially your package name) is your app's permanent unique identity on the Play Store.

Q: What's the purpose of a `@Preview` function?
- [ ] It runs the app on the emulator automatically
- [ ] It makes a composable load faster
- [x] It lets Android Studio render a composable in the editor without running the app
- [ ] It's required for every composable
> Previews are a development tool. They don't affect the running app at all.
```
