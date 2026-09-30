---
id: background-work
title: Background Work & Notifications
part: 6
minutes: 35
summary: Run reliable work even when your app is closed with WorkManager, and keep users informed with notifications, including channels and the Android 13+ permission.
---

:::goals
- Android's rules for background execution, in brief
- WorkManager: one-time and periodic work, constraints and retries
- Injecting dependencies into workers with Hilt
- Notification channels and building a notification
- Requesting `POST_NOTIFICATIONS` on Android 13+
- Opening your app when a notification is tapped
:::

## Background work on Android

To protect battery life, modern Android strictly limits what apps can do in the background. Choose the right tool:

| Need | Tool |
|---|---|
| Work while a screen is visible (loading data) | Coroutines in `viewModelScope` |
| Work that must finish even if the user leaves or the phone restarts: sync, uploads, periodic refresh | **WorkManager** |
| Long work the user is actively aware of: music playback, navigation, an ongoing call | A **foreground service** with a visible notification |
| Something at an exact time (alarm clock, reminder) | `AlarmManager` exact alarms (special permission) |

Most apps only need the first two.

## WorkManager

WorkManager runs **deferrable, guaranteed** work. It survives app restarts and reboots, respects constraints like "only on Wi-Fi" and "only while charging", and retries failed work with back-off.

```toml title="gradle/libs.versions.toml"
[versions]
work = "2.12.0"
hiltWork = "1.4.0"

[libraries]
androidx-work-runtime-ktx = { group = "androidx.work", name = "work-runtime-ktx", version.ref = "work" }
androidx-hilt-work = { group = "androidx.hilt", name = "hilt-work", version.ref = "hiltWork" }
androidx-hilt-compiler = { group = "androidx.hilt", name = "hilt-compiler", version.ref = "hiltWork" }
```

```kts title="app/build.gradle.kts"
implementation(libs.androidx.work.runtime.ktx)
implementation(libs.androidx.hilt.work)
ksp(libs.androidx.hilt.compiler)
```

### A worker

```kotlin title="work/SyncQuotesWorker.kt"
@HiltWorker
class SyncQuotesWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val repository: QuoteRepository           // injected by Hilt
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        return repository.refresh().fold(
            onSuccess = { Result.success() },
            onFailure = { if (runAttemptCount < 3) Result.retry() else Result.failure() }
        )
    }
}
```

`doWork` is a suspend function that runs in the background. Return `Result.success()`, `Result.retry()` (try again later with back-off) or `Result.failure()`.

### Hilt + WorkManager setup

WorkManager creates workers itself, so tell it to use Hilt's factory. Update your Application class:

```kotlin title="RecipeApp.kt"
@HiltAndroidApp
class RecipeApp : Application(), Configuration.Provider {

    @Inject lateinit var workerFactory: HiltWorkerFactory

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder().setWorkerFactory(workerFactory).build()
}
```

And disable WorkManager's default initializer in the manifest:

```xml title="AndroidManifest.xml"
<application ...>
    <provider
        android:name="androidx.startup.InitializationProvider"
        android:authorities="${applicationId}.androidx-startup"
        android:exported="false"
        tools:node="merge">
        <meta-data
            android:name="androidx.work.WorkManagerInitializer"
            android:value="androidx.startup"
            tools:node="remove" />
    </provider>
</application>
```

(Add `xmlns:tools="http://schemas.android.com/tools"` to the `<manifest>` tag if it isn't there.)

### Scheduling work

```kotlin
// Run once, as soon as there's a network connection
val oneTime = OneTimeWorkRequestBuilder<SyncQuotesWorker>()
    .setConstraints(Constraints(requiredNetworkType = NetworkType.CONNECTED))
    .build()
WorkManager.getInstance(context).enqueue(oneTime)

// Run roughly every 12 hours, on unmetered (Wi-Fi) network, when the battery isn't low
val periodic = PeriodicWorkRequestBuilder<SyncQuotesWorker>(12, TimeUnit.HOURS)
    .setConstraints(
        Constraints(
            requiredNetworkType = NetworkType.UNMETERED,
            requiresBatteryNotLow = true
        )
    )
    .build()

WorkManager.getInstance(context).enqueueUniquePeriodicWork(
    "sync-quotes",                               // unique name
    ExistingPeriodicWorkPolicy.KEEP,             // don't replace if already scheduled
    periodic
)
```

Call `enqueueUniquePeriodicWork` once, e.g. from `Application.onCreate()`. The unique name ensures you never schedule duplicates. The minimum periodic interval is **15 minutes**, and Android may delay work to save battery, so don't use WorkManager for exact timing.

:::tip Inspect your workers
**App Inspection → Background Task Inspector** in Android Studio shows every scheduled worker, its status, constraints and history.
:::

## Notifications

### 1. Create a channel

Since Android 8, every notification belongs to a **channel**. Users can control each channel separately (sound, importance, on/off) in system settings. Create channels at app start. It's safe to call repeatedly:

```kotlin title="notifications/Notifications.kt"
const val CHANNEL_DAILY = "daily_recipe"

fun createNotificationChannels(context: Context) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val channel = NotificationChannel(
            CHANNEL_DAILY,
            "Daily recipe ideas",                       // visible to users
            NotificationManager.IMPORTANCE_DEFAULT
        ).apply { description = "A recipe suggestion every day" }

        context.getSystemService(NotificationManager::class.java)
            .createNotificationChannel(channel)
    }
}
```

Call it from `RecipeApp.onCreate()`.

### 2. Request permission (Android 13+)

```xml title="AndroidManifest.xml"
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

```kotlin
@Composable
fun NotificationPermissionButton() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return   // not needed before 13

    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        // update UI / settings based on `granted`
    }
    Button(onClick = { launcher.launch(Manifest.permission.POST_NOTIFICATIONS) }) {
        Text("Enable daily recipe notifications")
    }
}
```

As with all permissions, ask when the user turns on a feature that needs notifications, not on first launch.

### 3. Show a notification

```kotlin title="notifications/Notifications.kt"
fun showRecipeNotification(context: Context, recipeId: Int, title: String) {
    // What happens on tap: open the app (at a deep link)
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("recipebox://recipe/$recipeId"), context, MainActivity::class.java)
    val pendingIntent = PendingIntent.getActivity(
        context, recipeId, intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    val notification = NotificationCompat.Builder(context, CHANNEL_DAILY)
        .setSmallIcon(R.drawable.ic_notification)       // a white-on-transparent vector icon
        .setContentTitle("Today's recipe idea 🍳")
        .setContentText(title)
        .setContentIntent(pendingIntent)
        .setAutoCancel(true)                             // dismiss when tapped
        .setPriority(NotificationCompat.PRIORITY_DEFAULT)
        .build()

    if (ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS)
        == PackageManager.PERMISSION_GRANTED || Build.VERSION.SDK_INT < 33
    ) {
        NotificationManagerCompat.from(context).notify(recipeId, notification)
    }
}
```

- A **`PendingIntent`** is an intent that another app (the system notification shade) can fire on your behalf later. `FLAG_IMMUTABLE` is required on modern Android.
- The **small icon** must be a simple monochrome silhouette. Create one via **New → Vector Asset**.
- The `id` passed to `notify` lets you update or cancel that notification later.

### Putting them together: a daily notification worker

```kotlin
@HiltWorker
class DailyRecipeWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val api: RecipeApi
) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result = try {
        val recipe = api.getRecipe((1..50).random())
        showRecipeNotification(applicationContext, recipe.id, recipe.name)
        Result.success()
    } catch (e: IOException) {
        Result.retry()
    }
}
```

Schedule it with a 24-hour `PeriodicWorkRequest` and you have a daily recipe notification, a great extension to add to the capstone app once it's finished.

## Recap

:::recap
- Use coroutines for on-screen work, **WorkManager** for guaranteed/deferrable work.
- Workers extend `CoroutineWorker`; use `@HiltWorker` for injection.
- `enqueueUniquePeriodicWork` avoids duplicates; the minimum interval is 15 min.
- Notifications need a **channel**, a small icon, a `PendingIntent`, and (Android 13+) the `POST_NOTIFICATIONS` permission.
:::

:::exercise
1. Add a "Remind me in 10 seconds" button that enqueues a `OneTimeWorkRequest` with `.setInitialDelay(10, TimeUnit.SECONDS)`. The worker shows a notification.
2. Tapping the notification opens the app.
3. Watch the worker in the Background Task Inspector.
:::

## Check your understanding

```quiz
Q: Which tool should sync data every few hours, even if the app isn't open?
- [ ] viewModelScope
- [ ] A while(true) loop in a Service
- [x] A periodic WorkManager request
- [ ] LaunchedEffect
> WorkManager guarantees execution under constraints and survives reboots.

Q: What happens if you post a notification without creating its channel on Android 8+?
- [ ] It shows with default settings
- [x] It isn't shown
- [ ] The app crashes immediately
- [ ] It's shown twice
> Notifications must belong to an existing channel on API 26+.

Q: What does returning `Result.retry()` from `doWork()` do?
- [ ] Runs the worker again immediately in a loop
- [x] Tells WorkManager to reschedule the work later using back-off
- [ ] Marks the work as failed
- [ ] Restarts the app
> WorkManager retries with (by default exponential) back-off.

Q: Why is `PendingIntent.FLAG_IMMUTABLE` used?
- [ ] It makes notifications silent
- [x] Modern Android requires specifying mutability, and immutable is the secure default
- [ ] It prevents the notification from being dismissed
- [ ] It's needed for WorkManager
> Since Android 12, PendingIntents must declare FLAG_IMMUTABLE or FLAG_MUTABLE.
```
