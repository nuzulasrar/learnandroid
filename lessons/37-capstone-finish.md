---
id: capstone-finish
title: "Capstone 4: Test, Polish, Ship & What's Next"
part: 8
minutes: 45
summary: Finish RecipeBox like a professional. Write tests for the ViewModel and mappers, polish accessibility and details, produce a signed release build, then plan your next steps as an Android developer.
---

:::goals
- Unit tests for `HomeViewModel` with a fake repository
- A mapper test and a Compose UI test
- A polish checklist: icon, strings, accessibility, edge cases
- Building a signed, shrunk release App Bundle
- Where to go next
:::

## 1. A fake repository

In `src/test/java/com/example/recipebox/`, create a fake that implements the same interface as the real repository. It's fully in memory, and you control success and failure:

```kotlin title="src/test/.../FakeRecipeRepository.kt"
class FakeRecipeRepository : RecipeRepository {

    private val recipes = MutableStateFlow<List<Recipe>>(emptyList())
    private val favoriteIds = MutableStateFlow<Set<Int>>(emptySet())

    /** What the "server" returns on refresh */
    var remoteRecipes: List<Recipe> = emptyList()
    var refreshShouldFail = false

    override fun observeRecipes(query: String): Flow<List<Recipe>> =
        recipes.map { list -> list.filter { it.name.contains(query.trim(), ignoreCase = true) } }

    override fun observeRecipe(id: Int): Flow<Recipe?> =
        recipes.map { list -> list.find { it.id == id } }

    override fun observeFavorites(): Flow<List<Recipe>> =
        combine(recipes, favoriteIds) { list, ids -> list.filter { it.id in ids } }

    override fun observeFavoriteIds(): Flow<Set<Int>> = favoriteIds

    override suspend fun refresh(): Result<Unit> =
        if (refreshShouldFail) {
            Result.failure(IOException("offline"))
        } else {
            recipes.value = remoteRecipes
            Result.success(Unit)
        }

    override suspend fun toggleFavorite(recipeId: Int) {
        favoriteIds.update { if (recipeId in it) it - recipeId else it + recipeId }
    }
}

fun testRecipe(id: Int, name: String) = Recipe(
    id = id, name = name, imageUrl = "", cuisine = "Test", difficulty = "Easy",
    prepMinutes = 10, cookMinutes = 20, servings = 2, caloriesPerServing = 300, rating = 4.5,
    tags = emptyList(), ingredients = emptyList(), instructions = emptyList()
)
```

Also copy `MainDispatcherRule` from Lesson 31 into the test folder.

## 2. HomeViewModel tests

`uiState` uses `stateIn(WhileSubscribed)`, so it only updates while someone collects it. In tests we start a collector in `backgroundScope`, which `runTest` cancels automatically at the end:

```kotlin title="src/test/.../HomeViewModelTest.kt"
class HomeViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private val pancakes = testRecipe(1, "Fluffy Pancakes")
    private val ramen = testRecipe(2, "Spicy Ramen")
    private val repository = FakeRecipeRepository().apply {
        remoteRecipes = listOf(pancakes, ramen)
    }

    private fun TestScope.createViewModel(): HomeViewModel {
        val viewModel = HomeViewModel(repository, SavedStateHandle())
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) {
            viewModel.uiState.collect {}
        }
        return viewModel
    }

    @Test
    fun `refresh on start loads recipes`() = runTest {
        val viewModel = createViewModel()

        val state = viewModel.uiState.value
        assertEquals(listOf(pancakes, ramen), state.recipes)
        assertFalse(state.isRefreshing)
        assertNull(state.errorMessage)
    }

    @Test
    fun `search filters recipes`() = runTest {
        val viewModel = createViewModel()

        viewModel.onQueryChange("ramen")

        assertEquals("ramen", viewModel.uiState.value.query)
        assertEquals(listOf(ramen), viewModel.uiState.value.recipes)
    }

    @Test
    fun `toggling a favourite updates favoriteIds`() = runTest {
        val viewModel = createViewModel()

        viewModel.onFavoriteClick(1)
        assertEquals(setOf(1), viewModel.uiState.value.favoriteIds)

        viewModel.onFavoriteClick(1)
        assertEquals(emptySet<Int>(), viewModel.uiState.value.favoriteIds)
    }

    @Test
    fun `failed refresh shows an error, and clearing it works`() = runTest {
        repository.refreshShouldFail = true
        val viewModel = createViewModel()

        assertNotNull(viewModel.uiState.value.errorMessage)

        viewModel.onErrorShown()
        assertNull(viewModel.uiState.value.errorMessage)
    }
}
```

Run them with the ▶ next to the class. Four green ticks. ✅

## 3. Mapper test

Mappers are pure functions, the easiest thing in the world to test, and they catch field-swapping bugs:

```kotlin title="src/test/.../MappersTest.kt"
class MappersTest {
    @Test
    fun `dto maps to entity and back to recipe`() {
        val dto = RecipeDto(
            id = 7, name = "Tacos", image = "https://img/7.webp",
            prepTimeMinutes = 15, cookTimeMinutes = 10, servings = 3,
            difficulty = "Easy", cuisine = "Mexican", caloriesPerServing = 450,
            rating = 4.8, tags = listOf("Mexican"),
            ingredients = listOf("Tortillas"), instructions = listOf("Warm tortillas")
        )

        val recipe = dto.toEntity().toRecipe()

        assertEquals(7, recipe.id)
        assertEquals("https://img/7.webp", recipe.imageUrl)
        assertEquals(25, recipe.totalMinutes)
        assertEquals("Mexican", recipe.cuisine)
        assertEquals(listOf("Tortillas"), recipe.ingredients)
    }
}
```

## 4. A Compose UI test

Because `HomeScreen` is stateless, we can test it with any state, with no Hilt, network or database:

```kotlin title="src/androidTest/.../HomeScreenTest.kt"
class HomeScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun emptyStateWithError_showsRetry_andCallsRefresh() {
        var refreshed = 0
        composeTestRule.setContent {
            RecipeBoxTheme(dynamicColor = false) {
                HomeScreen(
                    uiState = HomeUiState(recipes = emptyList(), isRefreshing = false),
                    onQueryChange = {}, onRefresh = { refreshed++ },
                    onRecipeClick = {}, onFavoriteClick = {}, onErrorShown = {}
                )
            }
        }

        composeTestRule.onNodeWithText("No recipes yet").assertIsDisplayed()
        composeTestRule.onNodeWithText("Try again").performClick()
        assertEquals(1, refreshed)
    }

    @Test
    fun clickingRecipe_reportsItsId() {
        var clickedId = -1
        composeTestRule.setContent {
            RecipeBoxTheme(dynamicColor = false) {
                HomeScreen(
                    uiState = HomeUiState(recipes = listOf(PreviewData.recipe)),
                    onQueryChange = {}, onRefresh = {},
                    onRecipeClick = { clickedId = it }, onFavoriteClick = {}, onErrorShown = {}
                )
            }
        }

        composeTestRule.onNodeWithText(PreviewData.recipe.name).performClick()
        assertEquals(PreviewData.recipe.id, clickedId)
    }
}
```

Run it on an emulator (it's in `androidTest`).

## 5. Polish checklist

The difference between "it works" and "it feels great" is in the details:

- [ ] **App icon**: right-click `res` → New → Image Asset. Use a simple foreground on a coloured background, and add a monochrome layer for themed icons.
- [ ] **Strings**: move user-visible text into `strings.xml` (select a string → [[Alt]]/[[Option]] + [[Enter]] → *Extract string resource*). Then translating the app is just adding `values-xx/strings.xml`.
- [ ] **Accessibility**: turn on **TalkBack** and navigate the whole app by swiping. Every button should announce something meaningful. Try the largest font size and **Display size** too.
- [ ] **Touch targets**: interactive elements should be at least 48 dp. Material components handle this for you.
- [ ] **Dark mode**: check every screen in both themes and with dynamic colour on and off.
- [ ] **Edge cases**: no internet on first launch, an empty search, rotation on every screen, process death (Lesson 18's `adb shell am kill` trick).
- [ ] **Splash screen**: use the `androidx.core:core-splashscreen` library for a branded launch screen on all API levels.
- [ ] **Predictive back**: add `android:enableOnBackInvokedCallback="true"` to `<application>` so users see a preview animation when swiping back.
- [ ] **Performance**: test a release build on a real, mid-range device. Scroll the grid fast; it should be smooth.

## 6. Release build

Follow Lesson 33 end to end:

1. Set `versionCode = 1` and `versionName = "1.0.0"`.
2. R8 is already enabled in our `release` build type. Build a signed release: **Build → Generate Signed App Bundle or APK**, create an upload key, choose *release*.
3. Also generate a signed **APK** and install it on your phone (`adb install app-release.apk`) to test the release build. Retrofit, kotlinx.serialization, Room and Hilt ship their own R8 rules, so it should just work. If it crashes, check Logcat and add keep rules for the class it names.
4. If you want to publish: create the Play Console listing, upload the `.aab` to **Internal testing**, install from the Play Store, then move to closed testing and production.

:::tip Put it on GitHub
Even if you don't publish to Play, push RecipeBox to a public GitHub repository with a good README: screenshots, a features list, the architecture diagram and the tech stack. It's the perfect portfolio piece for Android job applications.
:::

## 🎓 Congratulations!

You started with "What is Android?" and you've now built a real, offline-first app with:

<div class="diagram"><div class="flow">
<div class="hl">Kotlin<small>coroutines · Flow · sealed types</small></div>
<div class="hl">Compose<small>Material 3 · state · lists · theming</small></div>
<div class="hl">Architecture<small>MVVM · UDF · repositories · Hilt</small></div>
<div class="hl">Data<small>Retrofit · Room · DataStore</small></div>
<div class="hl">Quality<small>tests · debugging · release</small></div>
</div></div>

That's the modern Android toolkit professionals use every day. Seriously, well done. 🎉

## Where to go next

### Build more apps

The only way to truly get good is to build things *without* a tutorial. Some ideas, in rough order of difficulty:

1. **Habit tracker**: Room, notifications, WorkManager reminders, a calendar grid, charts.
2. **Expense tracker**: forms and validation, Room relations, charts, CSV export via `CreateDocument`.
3. **Weather app**: location permission, a real API with a key (keep it out of Git with `local.properties` + `BuildConfig`), widgets.
4. **Chat app**: authentication (e.g. Firebase Auth), real-time data (Firestore), push notifications (FCM), image upload.

### Topics to learn next

| Topic | Why |
|---|---|
| **Adaptive layouts** (window size classes, list-detail, foldables) | Tablets, foldables and ChromeOS matter more every year |
| **Kotlin Multiplatform** & **Compose Multiplatform** | Share your Kotlin code (and even UI) with iOS, desktop and web |
| **Paging 3** | Infinite scrolling for large datasets |
| **Firebase** (Auth, Firestore, Crashlytics, FCM) | A backend without writing a server, plus crash reporting and push |
| **Glance widgets** | Home-screen widgets written with Compose-like code |
| **CameraX & ML Kit** | Camera features, barcode scanning, text recognition |
| **Multi-module architecture** & convention plugins | How large teams structure apps |
| **CI/CD** with GitHub Actions | Automatically build, test and deploy on every push |
| **Security** | Encrypted storage, certificate pinning, the Play Integrity API |
| **On-device and cloud AI** | Integrate LLM features into your apps via APIs or on-device models |

### Resources

- [developer.android.com](https://developer.android.com): official docs, guides and codelabs.
- [Now in Android](https://github.com/android/nowinandroid): Google's reference app showing the architecture at scale.
- [Android samples on GitHub](https://github.com/android): official sample projects for almost every API.
- [Kotlin docs](https://kotlinlang.org/docs/home.html) and [Kotlin Koans](https://play.kotlinlang.org/koans): deepen your Kotlin.
- [Android Developers YouTube](https://www.youtube.com/@AndroidDevelopers) and the Android Developers blog for what's new each year.
- Communities: r/androiddev, the Kotlin Slack, and local Google Developer Groups (GDGs).

:::analogy One last piece of advice
Every experienced Android developer still searches for things, reads docs and gets confused by Gradle errors. That's normal! What makes a professional is not knowing everything but knowing how to find out. You now have the foundation to learn anything else in Android. Go build something you care about. 🚀
:::

## Final check

```quiz
Q: Why does the HomeViewModel test start a collector in `backgroundScope`?
- [ ] To make the test run on the main thread
- [x] Because `stateIn(WhileSubscribed)` only runs the upstream flows while there is at least one subscriber
- [ ] Because StateFlow can't be read without collecting
- [ ] To slow the test down
> Without a subscriber, uiState would stay at its initial value.

Q: What's the best way to check your app's accessibility?
- [ ] Only look at it in dark mode
- [x] Navigate the entire app with TalkBack and at the largest font size
- [ ] Add contentDescription to every Text
- [ ] Run the unit tests
> Experiencing the app the way assistive-technology users do reveals real problems quickly.

Q: You're ready to share your app with a few friends through Google Play before launching publicly. Which track do you use?
- [ ] Production
- [x] Internal or closed testing
- [ ] Open testing only
- [ ] You must email them the APK
> Testing tracks let invited users install the app from Play before it's public.
```
