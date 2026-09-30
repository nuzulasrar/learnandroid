---
id: datastore
title: Saving Settings with DataStore
part: 5
minutes: 20
summary: Store small key-value data like user preferences and flags with Jetpack DataStore, and build a working dark-mode setting that updates the whole app instantly.
---

:::goals
- When to use DataStore vs. Room
- Setting up Preferences DataStore
- Reading preferences as a `Flow` and writing them with `edit`
- Wrapping DataStore in a repository
- Building an in-app theme setting (System / Light / Dark)
:::

## DataStore vs. Room

| | **DataStore** | **Room** |
|---|---|---|
| Best for | Small key-value data: settings, flags, tokens, "has seen onboarding" | Structured, relational or large data: notes, messages, caches |
| Queries | None, you read the whole thing | Full SQL |
| API | `Flow` + `suspend` | `Flow` + `suspend` |

DataStore replaces the old `SharedPreferences`, which had synchronous APIs that could freeze the UI and weak error handling. It's asynchronous and consistent.

## Setup

```toml title="gradle/libs.versions.toml"
[versions]
datastore = "1.2.1"

[libraries]
androidx-datastore-preferences = { group = "androidx.datastore", name = "datastore-preferences", version.ref = "datastore" }
```

```kts title="app/build.gradle.kts"
implementation(libs.androidx.datastore.preferences)
```

## Create the DataStore

Declare it **once** as a top-level extension property on `Context`. The delegate guarantees a single instance per file, which matters because two instances for the same file would corrupt it.

```kotlin title="data/local/SettingsDataStore.kt"
val Context.settingsDataStore: DataStore<Preferences> by preferencesDataStore(name = "settings")
```

## Keys, reading and writing

Each preference has a typed key:

```kotlin
object PrefKeys {
    val THEME = stringPreferencesKey("theme")
    val DYNAMIC_COLOR = booleanPreferencesKey("dynamic_color")
    val LAUNCH_COUNT = intPreferencesKey("launch_count")
}
```

**Reading** gives a `Flow` that emits whenever the preferences change:

```kotlin
val dynamicColor: Flow<Boolean> = context.settingsDataStore.data
    .map { prefs -> prefs[PrefKeys.DYNAMIC_COLOR] ?: true }    // default when unset
```

**Writing** uses `edit`, a suspend function that updates values atomically:

```kotlin
suspend fun setDynamicColor(enabled: Boolean) {
    context.settingsDataStore.edit { prefs ->
        prefs[PrefKeys.DYNAMIC_COLOR] = enabled
    }
}

suspend fun incrementLaunchCount() {
    context.settingsDataStore.edit { prefs ->
        prefs[PrefKeys.LAUNCH_COUNT] = (prefs[PrefKeys.LAUNCH_COUNT] ?: 0) + 1
    }
}
```

## A settings repository

As always, hide the storage details behind a repository:

```kotlin title="data/SettingsRepository.kt"
enum class ThemeMode { SYSTEM, LIGHT, DARK }

data class UserSettings(
    val themeMode: ThemeMode = ThemeMode.SYSTEM,
    val dynamicColor: Boolean = true
)

@Singleton
class SettingsRepository @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val dataStore = context.settingsDataStore

    val settings: Flow<UserSettings> = dataStore.data
        .catch { e ->
            // A corrupted or unreadable file shouldn't crash the app
            if (e is IOException) emit(emptyPreferences()) else throw e
        }
        .map { prefs ->
            UserSettings(
                themeMode = prefs[PrefKeys.THEME]
                    ?.let { runCatching { ThemeMode.valueOf(it) }.getOrNull() }
                    ?: ThemeMode.SYSTEM,
                dynamicColor = prefs[PrefKeys.DYNAMIC_COLOR] ?: true
            )
        }

    suspend fun setThemeMode(mode: ThemeMode) {
        dataStore.edit { it[PrefKeys.THEME] = mode.name }
    }

    suspend fun setDynamicColor(enabled: Boolean) {
        dataStore.edit { it[PrefKeys.DYNAMIC_COLOR] = enabled }
    }
}
```

## Dark-mode setting, end to end

### 1. A ViewModel for the app's theme

```kotlin title="MainViewModel.kt"
@HiltViewModel
class MainViewModel @Inject constructor(
    private val settingsRepository: SettingsRepository
) : ViewModel() {

    val settings: StateFlow<UserSettings?> = settingsRepository.settings
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), null) // null = not loaded yet

    fun setThemeMode(mode: ThemeMode) {
        viewModelScope.launch { settingsRepository.setThemeMode(mode) }
    }

    fun setDynamicColor(enabled: Boolean) {
        viewModelScope.launch { settingsRepository.setDynamicColor(enabled) }
    }
}
```

### 2. Apply it at the top of the app

```kotlin title="MainActivity.kt"
@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    private val viewModel: MainViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val settings by viewModel.settings.collectAsStateWithLifecycle()
            val current = settings ?: return@setContent     // wait until loaded (avoids a flash)

            val darkTheme = when (current.themeMode) {
                ThemeMode.SYSTEM -> isSystemInDarkTheme()
                ThemeMode.LIGHT -> false
                ThemeMode.DARK -> true
            }

            RecipeTheme(darkTheme = darkTheme, dynamicColor = current.dynamicColor) {
                AppNavHost(
                    settings = current,
                    onThemeModeChange = viewModel::setThemeMode,
                    onDynamicColorChange = viewModel::setDynamicColor
                )
            }
        }
    }
}
```

`by viewModels()` is the Activity equivalent of `hiltViewModel()` in Compose.

### 3. A settings screen

```kotlin title="ui/settings/SettingsScreen.kt"
@Composable
fun SettingsScreen(
    settings: UserSettings,
    onThemeModeChange: (ThemeMode) -> Unit,
    onDynamicColorChange: (Boolean) -> Unit
) {
    Column(Modifier.padding(16.dp)) {
        Text("Theme", style = MaterialTheme.typography.titleMedium)
        ThemeMode.entries.forEach { mode ->
            Row(
                Modifier
                    .fillMaxWidth()
                    .selectable(selected = settings.themeMode == mode, onClick = { onThemeModeChange(mode) })
                    .padding(vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                RadioButton(selected = settings.themeMode == mode, onClick = null)
                Spacer(Modifier.width(12.dp))
                Text(mode.name.lowercase().replaceFirstChar { it.uppercase() })
            }
        }
        HorizontalDivider(Modifier.padding(vertical = 8.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Dynamic colour", Modifier.weight(1f))
            Switch(checked = settings.dynamicColor, onCheckedChange = onDynamicColorChange)
        }
    }
}
```

Pick "Dark" and the entire app switches instantly. Kill the app and reopen it, and it remembers. 🌙

:::note Proto DataStore
There's a second flavour, **Proto DataStore**, that stores a typed object defined with Protocol Buffers (or kotlinx.serialization). It's handy when your settings get complex. Preferences DataStore is plenty for most apps.
:::

## Recap

:::recap
- DataStore = small key-value data; Room = structured data.
- One `preferencesDataStore` per file, declared at top level.
- Read with `dataStore.data.map { }` (a Flow), write with `dataStore.edit { }` (suspend).
- Catch `IOException` on read; wrap everything in a repository.
- Collect settings at the top of the app to drive the theme.
:::

:::exercise
1. Add the theme setting to one of your earlier projects (e.g. the Notes app) with a Settings screen reachable from the top bar.
2. Add a `hasSeenOnboarding` boolean. On first launch show a one-page welcome screen with a "Get started" button that sets the flag, and skip it on later launches.
:::

## Check your understanding

```quiz
Q: Which is the better fit for storing "the user prefers dark mode"?
- [x] Preferences DataStore
- [ ] A Room table
- [ ] A ViewModel property
- [ ] rememberSaveable
> Simple persistent key-value settings are exactly what DataStore is for.

Q: How do you write a value to Preferences DataStore?
- [ ] `dataStore.put(key, value)`
- [x] `dataStore.edit { prefs -> prefs[key] = value }` inside a coroutine
- [ ] `dataStore.data.value = value`
- [ ] `SharedPreferences.apply()`
> edit is a suspend function that applies changes atomically.

Q: Why must you create only one DataStore instance per file?
- [ ] To save memory
- [x] Multiple instances for the same file can conflict and corrupt data (DataStore throws if it detects this)
- [ ] It's a Kotlin limitation
- [ ] Hilt requires it
> The preferencesDataStore delegate at top level guarantees a single instance.

Q: What does `dataStore.data` return?
- [ ] The current Preferences synchronously
- [x] A Flow<Preferences> that emits whenever the data changes
- [ ] A LiveData
- [ ] A suspend function
> Reading is reactive: collectors get updates automatically.
```
