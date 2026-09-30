---
id: intents-permissions
title: Intents & Runtime Permissions
part: 6
minutes: 35
summary: Talk to other apps and the system. Open web pages, share content, dial numbers, handle deep links, and ask for dangerous permissions the right way.
---

:::goals
- Explicit vs. implicit intents
- Common intents: open a URL, share text, send email, dial, open maps
- Getting results back with Activity Result APIs
- Receiving intents: intent filters and deep links
- Normal vs. dangerous permissions, and the runtime permission flow in Compose
:::

## What is an Intent?

An **Intent** is a message asking the system to do something: *"start this screen"*, *"open this web page"*, *"share this text"*. It's how Android components, and whole apps, cooperate.

- **Explicit intent**: names the exact component to start (usually inside your own app).
- **Implicit intent**: describes an *action* and lets the system find an app that can handle it (browser, email, maps…).

To launch intents from Compose you need a `Context`:

```kotlin
val context = LocalContext.current
```

## Common implicit intents

```kotlin title="util/Intents.kt"
fun Context.openUrl(url: String) {
    startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
}

fun Context.shareText(text: String, subject: String? = null) {
    val send = Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_TEXT, text)
        subject?.let { putExtra(Intent.EXTRA_SUBJECT, it) }
    }
    startActivity(Intent.createChooser(send, "Share via"))   // shows the share sheet
}

fun Context.dial(phone: String) {
    startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone")))   // no permission needed
}

fun Context.sendEmail(to: String, subject: String) {
    val intent = Intent(Intent.ACTION_SENDTO).apply {
        data = Uri.parse("mailto:")              // only email apps should handle this
        putExtra(Intent.EXTRA_EMAIL, arrayOf(to))
        putExtra(Intent.EXTRA_SUBJECT, subject)
    }
    startActivity(intent)
}

fun Context.openMap(query: String) {
    startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("geo:0,0?q=${Uri.encode(query)}")))
}
```

Usage in a composable:

```kotlin
@Composable
fun RecipeActions(recipeName: String, sourceUrl: String) {
    val context = LocalContext.current
    Row {
        TextButton(onClick = { context.shareText("Try this recipe: $recipeName $sourceUrl") }) {
            Text("Share")
        }
        TextButton(onClick = { context.openUrl(sourceUrl) }) { Text("Open website") }
    }
}
```

:::warning No app to handle it?
If no installed app can handle an implicit intent, `startActivity` throws `ActivityNotFoundException`. Wrap uncommon intents in `try { … } catch (e: ActivityNotFoundException) { /* show a message */ }`. (Browsers and the share sheet are virtually always available.)
:::

:::tip Opening links in-app
For opening web pages *inside* your app with your theme colours, use **Custom Tabs** (`androidx.browser:browser`): `CustomTabsIntent.Builder().build().launchUrl(context, uri)`. It's faster and nicer than a WebView.
:::

## Getting results: Activity Result APIs

Some intents return a result: pick a photo, take a picture, pick a contact. In Compose use `rememberLauncherForActivityResult` with a **contract**:

```kotlin
@Composable
fun PickDocumentButton(onPicked: (Uri) -> Unit) {
    val launcher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocument()
    ) { uri: Uri? ->
        uri?.let(onPicked)            // null if the user cancelled
    }

    Button(onClick = { launcher.launch(arrayOf("application/pdf")) }) {
        Text("Choose a PDF")
    }
}
```

Built-in contracts include `PickVisualMedia` (photo picker, Lesson 29), `TakePicture`, `OpenDocument`, `CreateDocument`, `PickContact` and `RequestPermission`.

## Receiving intents & deep links

Your app can *handle* intents too. An **intent filter** in the manifest declares what your Activity accepts. A common case is a **deep link**, a URL that opens a specific screen of your app:

```xml title="AndroidManifest.xml"
<activity android:name=".MainActivity" android:exported="true">
    <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
    </intent-filter>

    <!-- recipebox://recipe/42 opens the app -->
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="recipebox" android:host="recipe" />
    </intent-filter>
</activity>
```

Navigation Compose can map deep links straight to a destination:

```kotlin
composable<RecipeDetail>(
    deepLinks = listOf(navDeepLink<RecipeDetail>(basePath = "recipebox://recipe"))
) { /* … */ }
```

Test it from the terminal:

```bash
adb shell am start -W -a android.intent.action.VIEW -d "recipebox://recipe/42"
```

(`https://` links that open your app directly, called **App Links**, additionally require verifying your domain with a `assetlinks.json` file on your website.)

## Permissions

Android protects sensitive data and features with **permissions**. There are two main kinds:

| Type | Examples | How it's granted |
|---|---|---|
| **Normal** | `INTERNET`, `VIBRATE`, `ACCESS_NETWORK_STATE` | Automatically at install; just declare it in the manifest |
| **Dangerous (runtime)** | `CAMERA`, `ACCESS_FINE_LOCATION`, `RECORD_AUDIO`, `POST_NOTIFICATIONS`, `READ_CONTACTS` | The user must approve in a system dialog **while the app runs** |

For dangerous permissions you must (1) declare them in the manifest **and** (2) request them at runtime.

```xml title="AndroidManifest.xml"
<uses-permission android:name="android.permission.CAMERA" />
```

### The runtime permission flow

<div class="diagram"><div class="flow">
<div>Already granted?<small>checkSelfPermission</small></div><div class="arrow">→ no →</div>
<div>Explain why (if needed)<small>shouldShowRequestPermissionRationale</small></div><div class="arrow">→</div>
<div class="hl">Request<small>system dialog</small></div><div class="arrow">→</div>
<div>Granted → use feature<small>Denied → degrade gracefully</small></div>
</div></div>

```kotlin title="CameraPermission.kt"
@Composable
fun CameraFeature() {
    val context = LocalContext.current
    var hasPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) ==
                PackageManager.PERMISSION_GRANTED
        )
    }

    val launcher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted -> hasPermission = granted }

    if (hasPermission) {
        Text("📷 Camera ready!")      // show the real feature here
    } else {
        Column(Modifier.padding(24.dp)) {
            Text("To scan recipe cards we need access to your camera.")
            Spacer(Modifier.height(12.dp))
            Button(onClick = { launcher.launch(Manifest.permission.CAMERA) }) {
                Text("Allow camera")
            }
        }
    }
}
```

### Best practices

- **Ask in context**: request right when the user taps the feature that needs it, never all at once on launch.
- **Explain first** if the user denied before (`shouldShowRequestPermissionRationale` returns true).
- **Degrade gracefully**: if denied, the rest of the app must still work.
- After two denials Android stops showing the dialog. Offer a button that opens your app's system settings:

```kotlin
context.startActivity(
    Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", context.packageName, null))
)
```

- **Avoid permissions when you can.** The photo picker needs no storage permission; `ACTION_DIAL` needs no phone permission; coarse location is often enough instead of fine.

:::note Notification permission (Android 13+)
Since Android 13 (API 33), apps must request `POST_NOTIFICATIONS` at runtime before showing notifications. You'll handle this in the next lesson.
:::

## Recap

:::recap
- Implicit intents ask the system to find an app (`ACTION_VIEW`, `ACTION_SEND`, `ACTION_DIAL`…).
- Use `rememberLauncherForActivityResult` + a contract to get results.
- Intent filters and deep links let other apps and URLs open your screens.
- Normal permissions: manifest only. Dangerous permissions: manifest + runtime request.
- Ask in context, explain, and degrade gracefully.
:::

:::exercise
1. Add a **Share** button and an **Open in browser** button to a detail screen of one of your apps.
2. Add a "Call support" button that opens the dialer with a number.
3. Implement the camera-permission screen above, and test: allow, deny, deny twice (then use the "open settings" button).
:::

## Check your understanding

```quiz
Q: What's the difference between an explicit and an implicit intent?
- [ ] Explicit intents need permissions
- [x] Explicit names the exact component; implicit describes an action and lets the system choose an app
- [ ] Implicit intents only work inside your app
- [ ] There's no difference
> e.g. ACTION_VIEW with a URL is implicit, and the system picks a browser.

Q: Which permission requires a runtime request?
- [ ] INTERNET
- [ ] ACCESS_NETWORK_STATE
- [x] CAMERA
- [ ] VIBRATE
> Camera is a dangerous permission; the others are normal and granted at install.

Q: When is the best time to request the location permission?
- [ ] On the very first app launch, together with all other permissions
- [x] When the user taps a feature that needs location, ideally with an explanation
- [ ] Never. Use a fixed city instead
- [ ] In onDestroy
> Contextual requests have much higher acceptance and are required by good practice.

Q: How do you let users pick a photo without any storage permission?
- [ ] Request READ_EXTERNAL_STORAGE
- [x] Use the Photo Picker (`PickVisualMedia` contract)
- [ ] Read the Downloads folder directly
- [ ] It's impossible
> The system photo picker grants access only to the photos the user chooses.
```
