---
id: hilt
title: Dependency Injection with Hilt
part: 4
minutes: 35
summary: Stop wiring objects together by hand. Hilt creates and provides your repositories, APIs and databases automatically, with the right lifetimes, and injects them into ViewModels.
---

:::goals
- What dependency injection (DI) is, in plain terms
- Setting up Hilt with KSP
- `@HiltAndroidApp`, `@AndroidEntryPoint`, `@HiltViewModel`
- `@Inject` constructors, `@Module`, `@Provides` and `@Binds`
- Scopes like `@Singleton`
- Getting a Hilt ViewModel in Compose with `hiltViewModel()`
:::

## What is dependency injection?

A **dependency** is an object another object needs to do its job: a ViewModel needs a repository, a repository needs an API and a DAO.

**Dependency injection** simply means: *a class receives its dependencies from outside instead of creating them itself.*

```kotlin
// ❌ Creates its own dependency: hard to test, tightly coupled
class RecipeViewModel : ViewModel() {
    private val repository = DefaultRecipeRepository(RetrofitApi(), RoomDao())
}

// ✅ Receives it (constructor injection): easy to swap and test
class RecipeViewModel(private val repository: RecipeRepository) : ViewModel()
```

You already did this in the last lesson. The remaining question is *who builds the graph of objects*. **Hilt** is Google's DI library for Android (built on Dagger). You annotate your classes, and Hilt generates all the wiring code at compile time.

:::analogy
Without DI, every class goes shopping for its own ingredients. With Hilt, there's a central kitchen: each class just lists what it needs in its constructor, and the kitchen delivers it, sharing one instance of expensive things like the database.
:::

## Setup

Hilt uses **KSP** (Kotlin Symbol Processing) to generate code.

```toml title="gradle/libs.versions.toml"
[versions]
hilt = "2.60.1"
androidxHilt = "1.4.0"
ksp = "2.3.12"           # see the note below

[libraries]
hilt-android = { group = "com.google.dagger", name = "hilt-android", version.ref = "hilt" }
hilt-compiler = { group = "com.google.dagger", name = "hilt-android-compiler", version.ref = "hilt" }
androidx-hilt-lifecycle-viewmodel-compose = { group = "androidx.hilt", name = "hilt-lifecycle-viewmodel-compose", version.ref = "androidxHilt" }

[plugins]
hilt = { id = "com.google.dagger.hilt.android", version.ref = "hilt" }
ksp = { id = "com.google.devtools.ksp", version.ref = "ksp" }
```

```kts title="build.gradle.kts (project)"
plugins {
    // ...existing
    alias(libs.plugins.hilt) apply false
    alias(libs.plugins.ksp) apply false
}
```

```kts title="app/build.gradle.kts"
plugins {
    // ...existing
    alias(libs.plugins.ksp)
    alias(libs.plugins.hilt)
}

dependencies {
    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)
    implementation(libs.androidx.hilt.lifecycle.viewmodel.compose)
}
```

:::warning Matching the KSP version
Since KSP 2.3, KSP has its own version numbers and works with current Kotlin versions, so just use the latest from the [KSP releases page](https://github.com/google/ksp/releases). Older KSP versions look like `2.2.10-2.0.2`, and their first part **had to match your Kotlin version** exactly. If you follow an older tutorial, a mismatch there is the most common Hilt setup error.
:::

## Step 1: the Application class

```kotlin title="RecipeApp.kt"
@HiltAndroidApp
class RecipeApp : Application()
```

```xml title="AndroidManifest.xml"
<application
    android:name=".RecipeApp"
    ...>
```

`@HiltAndroidApp` triggers code generation and creates the app-level container that lives as long as the app.

## Step 2: mark your Activity

```kotlin title="MainActivity.kt"
@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    // ...
}
```

`@AndroidEntryPoint` lets Hilt provide dependencies to this Activity and everything inside it, including Hilt ViewModels.

## Step 3: teach Hilt how to create things

### Option A: `@Inject constructor` (for your own classes)

If Hilt can call the constructor itself, just annotate it:

```kotlin
class DefaultRecipeRepository @Inject constructor(
    private val api: RecipeApi,
    private val dao: FavoriteDao
) : RecipeRepository { /* ... */ }
```

Hilt now knows: *"to make a `DefaultRecipeRepository`, get a `RecipeApi` and a `FavoriteDao` and call this constructor."*

### Option B: `@Binds` (interface → implementation)

Hilt can't construct an interface. Tell it which implementation to use with a **module**:

```kotlin title="di/RepositoryModule.kt"
@Module
@InstallIn(SingletonComponent::class)       // available app-wide
abstract class RepositoryModule {

    @Binds
    @Singleton                               // one instance for the whole app
    abstract fun bindRecipeRepository(impl: DefaultRecipeRepository): RecipeRepository
}
```

### Option C: `@Provides` (classes you don't own / need builders)

For objects built with builders from libraries (Retrofit, Room, OkHttp), write a function that creates them:

```kotlin title="di/NetworkModule.kt"
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideJson(): Json = Json { ignoreUnknownKeys = true }

    @Provides
    @Singleton
    fun provideRetrofit(json: Json): Retrofit = Retrofit.Builder()
        .baseUrl("https://dummyjson.com/")
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()

    @Provides
    @Singleton
    fun provideRecipeApi(retrofit: Retrofit): RecipeApi = retrofit.create(RecipeApi::class.java)
}
```

Notice `provideRetrofit(json: Json)`: `@Provides` functions can themselves have dependencies, and Hilt passes them in.

```kotlin title="di/DatabaseModule.kt"
@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): AppDatabase =
        Room.databaseBuilder(context, AppDatabase::class.java, "recipes.db").build()

    @Provides
    fun provideFavoriteDao(db: AppDatabase): FavoriteDao = db.favoriteDao()
}
```

`@ApplicationContext` is a built-in qualifier that gives you the application `Context` safely.

## Step 4: inject into a ViewModel

```kotlin title="ui/favorites/FavoritesViewModel.kt"
@HiltViewModel
class FavoritesViewModel @Inject constructor(
    private val repository: RecipeRepository,
    private val savedStateHandle: SavedStateHandle    // Hilt provides this too
) : ViewModel() {
    // ...
}
```

And in Compose, use `hiltViewModel()` instead of `viewModel()`:

```kotlin
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel

@Composable
fun FavoritesRoute(viewModel: FavoritesViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    FavoritesScreen(uiState)
}
```

Inside a `NavHost` destination, `hiltViewModel()` scopes the ViewModel to that back stack entry, so each screen gets its own ViewModel, cleared when the screen is popped. And route arguments are available via `savedStateHandle.toRoute<…>()`.

:::note Older tutorials
Before androidx.hilt 1.3, `hiltViewModel()` came from the `hilt-navigation-compose` artifact (package `androidx.hilt.navigation.compose`). It now lives in `hilt-lifecycle-viewmodel-compose` so you can use it without depending on Navigation. The function works exactly the same.
:::

## The dependency graph

Here's what Hilt builds for you. You only ever ask for the top:

<div class="diagram"><div class="flow">
<div class="hl">FavoritesViewModel</div><div class="arrow">←</div>
<div>RecipeRepository<small>@Binds → DefaultRecipeRepository</small></div><div class="arrow">←</div>
<div>RecipeApi<small>@Provides ← Retrofit ← Json</small></div>
<div>FavoriteDao<small>@Provides ← AppDatabase ← Context</small></div>
</div></div>

## Scopes

By default Hilt creates a **new instance every time** something is injected. A **scope** annotation makes it reuse one instance within a component's lifetime:

| Scope annotation | Component | Lives as long as |
|---|---|---|
| `@Singleton` | `SingletonComponent` | The whole app |
| `@ActivityRetainedScoped` | `ActivityRetainedComponent` | Activity, surviving rotation |
| `@ViewModelScoped` | `ViewModelComponent` | One ViewModel |
| `@ActivityScoped` | `ActivityComponent` | One Activity instance |

Scope expensive or stateful things (database, Retrofit, OkHttp, repositories with caches) as `@Singleton`. Leave cheap, stateless things unscoped.

## Common errors

- **"… cannot be provided without an @Inject constructor or an @Provides-annotated method"**: Hilt doesn't know how to create something. Add `@Inject constructor`, a `@Binds`, or a `@Provides`.
- **"Hilt Activity must be attached to an @HiltAndroidApp Application"**: you forgot `android:name=".RecipeApp"` in the manifest.
- **"Given component holder class MainActivity does not implement interface dagger.hilt.internal.GeneratedComponent"**: missing `@AndroidEntryPoint`, or you forgot to apply the Hilt Gradle plugin.
- **KSP/Kotlin version mismatch** at sync: see the warning above.

## Recap

:::recap
- DI = classes receive dependencies instead of creating them.
- `@HiltAndroidApp` on Application, `@AndroidEntryPoint` on the Activity.
- `@Inject constructor` for your classes, `@Binds` for interfaces, `@Provides` for library objects.
- `@HiltViewModel` + `@Inject constructor`, then `hiltViewModel()` in Compose.
- `@Singleton` for one shared instance.
:::

:::exercise
Convert the `QuoteRepository` + `QuoteViewModel` from the previous lesson's exercise to Hilt:

1. Add Hilt to the project, with the Application class and `@AndroidEntryPoint`.
2. Give `FakeQuoteRepository` an `@Inject constructor()` and bind it to `QuoteRepository` in a module with `@Singleton`.
3. Annotate `QuoteViewModel` with `@HiltViewModel` and use `hiltViewModel()` in `QuoteRoute`.
4. Run the app and make sure it works.
:::

:::solution Show solution
```kotlin
@HiltAndroidApp
class QuoteApp : Application()   // + android:name=".QuoteApp" in the manifest

interface QuoteRepository {
    suspend fun getRandomQuote(): Quote
}

class FakeQuoteRepository @Inject constructor() : QuoteRepository {
    override suspend fun getRandomQuote(): Quote {
        delay(1000)
        return Quote("Simplicity is prerequisite for reliability.", "Edsger Dijkstra")
    }
}

@Module
@InstallIn(SingletonComponent::class)
abstract class QuoteModule {
    @Binds @Singleton
    abstract fun bindQuoteRepository(impl: FakeQuoteRepository): QuoteRepository
}

@HiltViewModel
class QuoteViewModel @Inject constructor(
    private val repository: QuoteRepository
) : ViewModel() {
    private val _uiState = MutableStateFlow<QuoteUiState>(QuoteUiState.Loading)
    val uiState = _uiState.asStateFlow()

    init { loadQuote() }

    fun loadQuote() {
        _uiState.value = QuoteUiState.Loading
        viewModelScope.launch {
            _uiState.value = try {
                val q = repository.getRandomQuote()
                QuoteUiState.Success(q.text, q.author)
            } catch (e: IOException) {
                QuoteUiState.Error("Couldn't load a quote.")
            }
        }
    }
}

@AndroidEntryPoint
class MainActivity : ComponentActivity() { /* setContent { QuoteRoute() } */ }

@Composable
fun QuoteRoute(viewModel: QuoteViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    QuoteScreen(uiState, onRetry = viewModel::loadQuote)
}
```
:::

## Check your understanding

```quiz
Q: What is dependency injection?
- [ ] Downloading libraries with Gradle
- [x] Giving a class its dependencies from the outside instead of having it create them
- [ ] Injecting code into other apps
- [ ] A way to speed up the build
> DI decouples classes from the concrete implementations they use.

Q: You have `interface Analytics` and `class FirebaseAnalytics @Inject constructor() : Analytics`. How do you tell Hilt to use it when `Analytics` is requested?
- [ ] `@Provides fun analytics() = Analytics()`
- [x] A `@Binds abstract fun bind(impl: FirebaseAnalytics): Analytics` in a module
- [ ] Nothing, Hilt figures it out
- [ ] Annotate the interface with @Singleton
> @Binds maps an interface to an implementation Hilt already knows how to create.

Q: When should you use `@Provides` instead of `@Inject constructor`?
- [ ] Always
- [x] When you can't annotate the constructor, e.g. library classes built with builders like Retrofit or Room
- [ ] Only for ViewModels
- [ ] Only for interfaces
> Use @Provides for types you don't own or that need custom construction.

Q: What does `@Singleton` on a provider do?
- [ ] Makes the class a Kotlin object
- [x] Makes Hilt create one instance and reuse it for the whole app
- [ ] Prevents injection
- [ ] Makes it thread-safe
> Scoped bindings are created once per component lifetime; SingletonComponent lives as long as the app.

Q: Which composable function gets a ViewModel annotated with `@HiltViewModel`?
- [ ] `viewModel()`
- [x] `hiltViewModel()`
- [ ] `remember { MyViewModel() }`
- [ ] `inject<MyViewModel>()`
> hiltViewModel() uses Hilt's factory so constructor dependencies get injected.
```
