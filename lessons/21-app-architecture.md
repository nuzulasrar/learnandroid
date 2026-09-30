---
id: app-architecture
title: App Architecture & the Repository Pattern
part: 4
minutes: 30
summary: How professional Android apps are structured. The UI, domain and data layers, repositories as the single source of truth, and a package structure that scales.
---

:::goals
- Why architecture matters as apps grow
- Google's recommended layers: **UI**, **domain** (optional), **data**
- The **repository** pattern and single source of truth
- Depending on interfaces, and why that makes testing easy
- A practical package structure
:::

## Why bother with architecture?

A small app can live in one file. But as it grows, code without structure becomes a tangle: UI code calls the network directly, the same data is loaded in five places, and changing one thing breaks another. **Architecture** is a set of rules for where code goes, so that:

- each class has **one clear responsibility**,
- parts can be **tested** in isolation,
- you can **change** one part (e.g. swap the API) without rewriting everything,
- a team can work in parallel.

## Google's recommended architecture

<div class="diagram">
<div class="layers">
<div class="layer ui"><h5>UI layer</h5><div class="boxes"><span>Composable screens</span><span>ViewModels (state holders)</span></div></div>
<div class="dir">↓ calls functions · ↑ exposes data as Flow / suspend results</div>
<div class="layer domain"><h5>Domain layer (optional)</h5><div class="boxes"><span>Use cases, e.g. GetFavoriteRecipesUseCase</span></div></div>
<div class="dir">↓ ↑</div>
<div class="layer data"><h5>Data layer</h5><div class="boxes"><span>Repositories</span><span>Remote data source (Retrofit API)</span><span>Local data source (Room, DataStore)</span></div></div>
</div>
<div class="diagram-caption">Dependencies point downwards. Lower layers never know about the layers above them.</div>
</div>

### UI layer

Displays data and handles user interaction. **Composables** render `UiState`; **ViewModels** hold state, handle events and call into the data (or domain) layer. You've built this already.

### Data layer

Owns the app's data and business rules about it. It's made of:

- **Data sources**: each works with exactly one source of data: a REST API, a Room database, DataStore, a file.
- **Repositories**: the public entry point to the data layer. They combine data sources, decide where data comes from (cache or network?), and expose it to the rest of the app.

### Domain layer (optional)

**Use cases** hold reusable business logic that combines several repositories, for example "get recipes the user can cook with what's in their pantry". Small apps skip this layer; add it when ViewModels start duplicating logic.

## The repository pattern

A **repository** hides *where data comes from*. The ViewModel just asks for recipes; it doesn't know or care whether they came from the network, a database, or both.

```kotlin title="data/RecipeRepository.kt"
interface RecipeRepository {
    fun observeFavorites(): Flow<List<Recipe>>        // continuous updates
    suspend fun getRecipes(): List<Recipe>            // one-shot fetch
    suspend fun getRecipe(id: Int): Recipe?
    suspend fun toggleFavorite(recipe: Recipe)
}
```

```kotlin title="data/DefaultRecipeRepository.kt"
class DefaultRecipeRepository(
    private val api: RecipeApi,           // remote data source
    private val dao: FavoriteDao          // local data source
) : RecipeRepository {

    override fun observeFavorites() = dao.observeAll().map { list -> list.map { it.toRecipe() } }

    override suspend fun getRecipes() = api.getRecipes().recipes.map { it.toRecipe() }

    override suspend fun getRecipe(id: Int) = api.getRecipe(id).toRecipe()

    override suspend fun toggleFavorite(recipe: Recipe) {
        if (dao.exists(recipe.id)) dao.delete(recipe.id) else dao.insert(recipe.toEntity())
    }
}
```

(Don't worry about `RecipeApi` and `FavoriteDao` yet. You'll build them in Part 5. Focus on the *shape*.)

### Single source of truth

When data exists in several places (network + database), pick **one** as the **source of truth** that the UI reads from. In offline-first apps this is the local database: the network only *updates* the database, and the UI observes the database. You'll build this in Lesson 26.

### Models per layer

Each layer often has its own model type, with small mapping functions between them:

| Model | Layer | Example |
|---|---|---|
| `RecipeDto` | Network: matches the JSON exactly | `@Serializable data class RecipeDto(...)` |
| `RecipeEntity` | Database: matches the table | `@Entity data class RecipeEntity(...)` |
| `Recipe` | Domain/UI: what the app actually uses | `data class Recipe(...)` |

```kotlin
fun RecipeDto.toRecipe() = Recipe(id = id, name = name, imageUrl = image, minutes = prepTimeMinutes + cookTimeMinutes)
```

This keeps API changes from leaking into your UI. If the server renames a field, you fix one mapping function.

## Depend on interfaces

Look at the ViewModel's constructor:

```kotlin
class FavoritesViewModel(
    private val repository: RecipeRepository     // the INTERFACE, not DefaultRecipeRepository
) : ViewModel() {

    val uiState: StateFlow<FavoritesUiState> = repository.observeFavorites()
        .map { FavoritesUiState(recipes = it) }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = FavoritesUiState()
        )
}
```

Because it depends on the interface, a test can pass in a **fake**:

```kotlin
class FakeRecipeRepository : RecipeRepository {
    private val favorites = MutableStateFlow(listOf(Recipe(1, "Test pancakes", "", 10)))
    override fun observeFavorites() = favorites
    override suspend fun getRecipes() = favorites.value
    override suspend fun getRecipe(id: Int) = favorites.value.find { it.id == id }
    override suspend fun toggleFavorite(recipe: Recipe) { favorites.update { it - recipe } }
}

val viewModel = FavoritesViewModel(FakeRecipeRepository())   // no network, no database
```

This is called **dependency inversion**, and it's what makes the testing in Lesson 31 painless.

:::note `stateIn` explained
`stateIn` converts a cold `Flow` (like a database query) into a `StateFlow` the UI can collect. `WhileSubscribed(5_000)` keeps the upstream flow active for 5 seconds after the UI stops collecting, so a quick rotation doesn't restart the database query, but leaving the app does stop it.
:::

## Creating dependencies: the problem

Who creates `DefaultRecipeRepository`, the API and the DAO, and passes them into the ViewModel? You could do it by hand:

```kotlin
val api = Retrofit.Builder()/* … */.build().create(RecipeApi::class.java)
val db = Room.databaseBuilder(context, AppDatabase::class.java, "app.db").build()
val repository = DefaultRecipeRepository(api, db.favoriteDao())
val viewModel = FavoritesViewModel(repository)   // …and a ViewModelProvider.Factory to create it
```

This works (it's called *manual dependency injection*), but it gets repetitive and error-prone as the app grows. The next lesson introduces **Hilt**, which does this wiring for you.

## A package structure that scales

Organise by **feature** at the top level, with layers inside. It keeps related code together:

<div class="tree">com.example.recipebox/
├── RecipeApp.kt                 ← Application class
├── MainActivity.kt
├── data/
│   ├── model/                   ← Recipe (app-wide model)
│   ├── remote/                  ← RecipeApi, DTOs
│   ├── local/                   ← AppDatabase, DAOs, entities, DataStore
│   └── repository/              ← RecipeRepository + implementation
├── di/                          ← Hilt modules
├── ui/
│   ├── theme/
│   ├── navigation/              ← routes, NavHost
│   ├── components/              ← shared composables (RecipeCard, ErrorView…)
│   ├── home/                    ← HomeScreen.kt, HomeViewModel.kt
│   ├── detail/                  ← DetailScreen.kt, DetailViewModel.kt
│   └── favorites/
└── util/</div>

For very large apps, teams go further and split features into separate Gradle **modules**. For this course, packages are plenty.

## Recap

:::recap
- **UI layer** (composables + ViewModels) → **domain** (optional use cases) → **data layer** (repositories + data sources).
- Repositories hide data sources and provide a **single source of truth**.
- Each layer can have its own model; map between them.
- Depend on **interfaces** so you can swap implementations and use fakes in tests.
- Organise packages by feature.
:::

:::exercise
1. Sketch the layers for a **weather app** that shows the current weather (from an API) and a list of saved cities (stored locally). Name the ViewModels, the repository interface and its functions, and the two data sources.
2. Take the `QuoteViewModel` from the previous lesson and extract the "fake network call" into a `QuoteRepository` interface with a `suspend fun getRandomQuote(): Quote` function, plus a `FakeQuoteRepository` implementation. Pass the repository into the ViewModel's constructor.
:::

:::solution Show a possible answer for task 1
- **UI layer:** `WeatherScreen` + `WeatherViewModel`; `CitiesScreen` + `CitiesViewModel`.
- **Data layer:**
  - `WeatherRepository` with `suspend fun getCurrentWeather(city: String): Weather` and `fun observeSavedCities(): Flow<List<City>>`, `suspend fun saveCity(city: City)`, `suspend fun removeCity(city: City)`.
  - `WeatherApi` (Retrofit): the remote data source.
  - `CityDao` (Room): the local data source.
- The ViewModels only know about `WeatherRepository`, never about Retrofit or Room.
:::

## Check your understanding

```quiz
Q: Which layer should contain Retrofit and Room code?
- [ ] UI layer
- [ ] Domain layer
- [x] Data layer (in data sources)
- [ ] In the ViewModel
> Data sources wrap specific technologies; repositories expose them to the rest of the app.

Q: What's the main job of a repository?
- [ ] Drawing lists
- [x] Providing a clean API for data while hiding where it comes from and coordinating data sources
- [ ] Storing UI state across rotation
- [ ] Navigating between screens
> Repositories are the entry point to the data layer.

Q: Why should a ViewModel depend on `RecipeRepository` (an interface) instead of `DefaultRecipeRepository`?
- [ ] Interfaces are faster
- [x] So a different implementation, such as a fake in tests, can be provided without changing the ViewModel
- [ ] Kotlin requires it
- [ ] Classes can't be constructor parameters
> Depending on abstractions makes code flexible and testable.

Q: Which direction do dependencies point in this architecture?
- [x] UI → domain → data (lower layers don't know about upper ones)
- [ ] Data → UI
- [ ] Both directions equally
- [ ] There are no dependencies
> The data layer never references ViewModels or composables.
```
