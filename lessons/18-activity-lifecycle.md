---
id: activity-lifecycle
title: The Activity Lifecycle
part: 4
minutes: 25
summary: Android creates, pauses and destroys your screens constantly. Understand the lifecycle, configuration changes and process death so your app never loses the user's data.
---

:::goals
- The Activity lifecycle states and callbacks
- What happens on rotation and other **configuration changes**
- What **process death** is and how to survive it
- How to observe lifecycle in Compose
- Where each kind of state should live
:::

## Apps don't control their own lifetime

On a desktop, a program runs until the user quits it. On Android, **the system is in charge**. The user switches apps, a phone call comes in, the screen rotates, memory runs low and Android kills background apps. Your Activity moves through a series of **lifecycle states**, and Android calls a method on it at each transition.

<div class="diagram">
<div class="flow">
<div class="hl">onCreate()<small>set up UI (setContent)</small></div><div class="arrow">→</div>
<div>onStart()<small>becoming visible</small></div><div class="arrow">→</div>
<div class="hl">onResume()<small>in the foreground, interactive</small></div>
</div>
<div class="flow" style="margin-top:8px">
<div>onDestroy()<small>being destroyed</small></div><div class="arrow">←</div>
<div>onStop()<small>no longer visible</small></div><div class="arrow">←</div>
<div>onPause()<small>losing focus</small></div>
</div>
<div class="diagram-caption">Top row: the Activity comes to the foreground. Bottom row (right to left): it goes away. After onStop, onStart/onResume run again if the user returns.</div>
</div>

| Callback | When | Typical use |
|---|---|---|
| `onCreate` | Activity created | `setContent { }`, one-time setup |
| `onStart` | Becoming visible | Start things that need visibility |
| `onResume` | Interactive, in the foreground | Resume camera preview, sensors |
| `onPause` | Partially hidden / losing focus | Pause things that must stop immediately |
| `onStop` | Fully hidden | Stop heavy work, e.g. location updates |
| `onDestroy` | Being destroyed | Final cleanup |

Try it! Add logging to `MainActivity` and watch **Logcat** (bottom panel in Android Studio) while you rotate the phone, press Home and come back:

```kotlin title="MainActivity.kt"
private const val TAG = "Lifecycle"

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Log.d(TAG, "onCreate")
        enableEdgeToEdge()
        setContent { /* ... */ }
    }
    override fun onStart() { super.onStart(); Log.d(TAG, "onStart") }
    override fun onResume() { super.onResume(); Log.d(TAG, "onResume") }
    override fun onPause() { super.onPause(); Log.d(TAG, "onPause") }
    override fun onStop() { super.onStop(); Log.d(TAG, "onStop") }
    override fun onDestroy() { super.onDestroy(); Log.d(TAG, "onDestroy") }
}
```

Filter Logcat by `tag:Lifecycle`. You'll see:

- **Launch:** onCreate → onStart → onResume
- **Press Home:** onPause → onStop
- **Return:** onStart → onResume
- **Rotate:** onPause → onStop → onDestroy → **onCreate** → onStart → onResume 😮

## Configuration changes

**Rotation destroys and recreates your Activity.** So do other *configuration changes*: switching dark mode, changing language or font size, resizing in multi-window, folding or unfolding a foldable. Android does this so your app can reload resources (layouts, strings, dimensions) for the new configuration.

The consequence: anything stored only in the Activity or in `remember` is **lost**. That's why the counter in Lesson 14 reset on rotation until we used `rememberSaveable`.

:::warning Don't just disable rotation
It's tempting to lock orientation or add `android:configChanges` to the manifest to "fix" this. Don't. Other configuration changes still happen, large screens and foldables need rotation, and it hides bugs rather than fixing them. Store state properly instead.
:::

## Process death

When your app is in the background and the system needs memory, Android may **kill the entire process**. When the user comes back (via Recents), Android recreates the Activity and *pretends nothing happened*. The user expects to be exactly where they left off.

- ViewModels **do not** survive process death (they live in memory).
- `rememberSaveable` and ViewModel `SavedStateHandle` **do** survive. They're written into a Bundle the system keeps.
- Data in a database or DataStore survives everything.

:::tip Test process death
Put your app in the background, then run `adb shell am kill com.your.package` in the terminal (or use Logcat's **Terminate Application** button while the app is in the background). Reopen it from Recents and check that the user's input is still there.
:::

## Where should state live?

| Kind of state | Example | Lives in | Survives rotation | Survives process death |
|---|---|---|---|---|
| Transient UI | Is a dropdown expanded? | `remember` | ❌ | ❌ |
| User input on screen | Search text, selected tab | `rememberSaveable` or `SavedStateHandle` | ✅ | ✅ |
| Screen data | Loaded list of recipes | ViewModel | ✅ | ❌ (reload it) |
| Persistent data | Favourites, settings | Room / DataStore | ✅ | ✅ |

## Observing lifecycle in Compose

Composables can react to lifecycle events. For example, refreshing data when the user returns to the app:

```kotlin
@Composable
fun RefreshOnResume(onResume: () -> Unit) {
    LifecycleResumeEffect(Unit) {
        onResume()
        onPauseOrDispose { /* stop something */ }
    }
}
```

And when collecting flows, `collectAsStateWithLifecycle()` (next lessons) automatically stops collecting when the app goes to the background, saving battery.

## The Application class

Besides Activities, every app has one **`Application`** object, created before anything else and living as long as the process. You can subclass it for app-wide setup (Hilt requires this in Lesson 22):

```kotlin title="RecipeApp.kt"
class RecipeApp : Application() {
    override fun onCreate() {
        super.onCreate()
        // initialise app-wide things: logging, DI, etc.
    }
}
```

```xml title="AndroidManifest.xml"
<application
    android:name=".RecipeApp"
    ... >
```

## Recap

:::recap
- Android drives the lifecycle: onCreate → onStart → onResume → onPause → onStop → onDestroy.
- **Configuration changes** (rotation, dark mode, language) recreate the Activity.
- **Process death** kills the app in the background; restore with saved state.
- Put state where it survives what it needs to: remember → rememberSaveable → ViewModel → database.
:::

:::exercise
1. Add the logging code above, run the app, and record the sequence of callbacks for: launch, Home, return, rotate, Back.
2. Put a `TextField` using plain `remember` on screen. Type something, rotate, and watch it vanish. Switch to `rememberSaveable` and repeat.
3. Try the process-death test from the tip above with `rememberSaveable`. Does your text survive?
:::

## Check your understanding

```quiz
Q: What happens to the Activity by default when the device is rotated?
- [ ] Nothing, it just redraws
- [ ] onPause and onResume are called
- [x] It is destroyed and recreated
- [ ] The app process restarts
> Configuration changes destroy and recreate the Activity so resources can be reloaded.

Q: Which survives process death?
- [ ] A ViewModel property
- [ ] A value in `remember`
- [x] A value in `rememberSaveable`
- [ ] A global variable
> rememberSaveable (and SavedStateHandle) store data in a Bundle the system keeps across process death.

Q: The user presses Home. Which callbacks are called?
- [ ] onDestroy
- [x] onPause then onStop
- [ ] onStop then onPause
- [ ] onCreate
> The Activity loses focus (onPause), then becomes invisible (onStop). It isn't destroyed.

Q: What's the recommended way to handle rotation losing state?
- [ ] Lock the app to portrait
- [ ] Add configChanges to the manifest
- [x] Keep state in rememberSaveable, a ViewModel or persistent storage
- [ ] Save everything to a file in onPause
> Store state in the right place for how long it needs to live.
```
