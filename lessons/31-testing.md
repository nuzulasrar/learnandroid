---
id: testing
title: Testing Your App
part: 7
minutes: 40
summary: Ship with confidence. Write fast unit tests for logic and ViewModels (including coroutines and Flow), use fakes, and test Compose UI.
---

:::goals
- The testing pyramid: unit, integration and UI tests
- Local unit tests with JUnit
- Testing ViewModels with fakes, `runTest` and a test dispatcher
- Testing Flows
- Compose UI tests with semantics and `createComposeRule`
- Running tests and reading results
:::

## Why test?

Every time you change code, you might break something that used to work. Automated tests check it for you in seconds, so you can refactor fearlessly and catch bugs before your users do.

<div class="diagram"><div class="stack">
<div>UI / end-to-end tests<small>few · slow · run on a device · test whole flows</small></div>
<div>Integration tests<small>some · e.g. Room DAO + real database</small></div>
<div class="hl">Unit tests<small>many · fast · run on your computer · test one class</small></div>
</div><div class="diagram-caption">The testing pyramid: lots of fast unit tests at the base, fewer slow UI tests at the top.</div></div>

Android projects have two test folders:

| Folder | Runs on | Speed | Use for |
|---|---|---|---|
| `src/test/` | Your computer (JVM) | ⚡ Very fast | Logic, ViewModels, repositories, mappers |
| `src/androidTest/` | Device/emulator | 🐢 Slower | UI tests, Room, anything needing Android |

## Setup

```toml title="gradle/libs.versions.toml"
[versions]
coroutinesTest = "1.11.0"
turbine = "1.2.1"

[libraries]
kotlinx-coroutines-test = { group = "org.jetbrains.kotlinx", name = "kotlinx-coroutines-test", version.ref = "coroutinesTest" }
turbine = { group = "app.cash.turbine", name = "turbine", version.ref = "turbine" }
```

```kts title="app/build.gradle.kts"
testImplementation(libs.junit)                       // already in the template
testImplementation(libs.kotlinx.coroutines.test)
testImplementation(libs.turbine)
androidTestImplementation(platform(libs.androidx.compose.bom))
androidTestImplementation(libs.androidx.ui.test.junit4)  // already in the template
debugImplementation(libs.androidx.ui.test.manifest)
```

## Your first unit test

Say you have a pure function:

```kotlin title="src/main/.../util/Format.kt"
fun formatMinutes(total: Int): String {
    require(total >= 0) { "Minutes can't be negative" }
    val h = total / 60
    val m = total % 60
    return when {
        h == 0 -> "$m min"
        m == 0 -> "$h h"
        else -> "$h h $m min"
    }
}
```

```kotlin title="src/test/.../util/FormatTest.kt"
class FormatTest {

    @Test
    fun `minutes under an hour show only minutes`() {
        assertEquals("45 min", formatMinutes(45))
    }

    @Test
    fun `exact hours show only hours`() {
        assertEquals("2 h", formatMinutes(120))
    }

    @Test
    fun `mixed shows both`() {
        assertEquals("1 h 15 min", formatMinutes(75))
    }

    @Test(expected = IllegalArgumentException::class)
    fun `negative minutes throw`() {
        formatMinutes(-1)
    }
}
```

- `@Test` marks a test function. Backtick names can contain spaces, which makes them readable in reports.
- `assertEquals(expected, actual)`, `assertTrue(...)`, `assertNull(...)` check results.
- Run it with the green ▶ in the gutter next to the class or function. Green = pass, red = fail with a diff.

:::tip Arrange, Act, Assert
Structure every test in three parts: **arrange** the inputs and objects, **act** by calling the thing under test, **assert** the result. One behaviour per test.
:::

## Testing a ViewModel

ViewModels use `viewModelScope`, which runs on `Dispatchers.Main`, and there is no Android main thread in a local test. The fix is a small **JUnit rule** that swaps `Main` for a test dispatcher. Create it once and reuse it:

```kotlin title="src/test/.../MainDispatcherRule.kt"
class MainDispatcherRule(
    private val dispatcher: TestDispatcher = UnconfinedTestDispatcher()
) : TestWatcher() {
    override fun starting(description: Description) = Dispatchers.setMain(dispatcher)
    override fun finished(description: Description) = Dispatchers.resetMain()
}
```

Now test the `QuoteViewModel` from Lesson 23 with a **fake repository**: a simple in-memory implementation of the interface you control completely.

```kotlin title="src/test/.../FakeQuoteRepository.kt"
class FakeQuoteRepository : QuoteRepository {
    var shouldFail = false
    var quote = Quote(text = "Test quote", author = "Tester")

    override suspend fun getRandomQuote(): Result<Quote> =
        if (shouldFail) Result.failure(IOException("offline")) else Result.success(quote)
}
```

```kotlin title="src/test/.../QuoteViewModelTest.kt"
class QuoteViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private val repository = FakeQuoteRepository()

    @Test
    fun `loads quote successfully on init`() = runTest {
        val viewModel = QuoteViewModel(repository)

        val state = viewModel.uiState.value
        assertEquals(QuoteUiState.Success("Test quote", "Tester"), state)
    }

    @Test
    fun `shows error when repository fails`() = runTest {
        repository.shouldFail = true

        val viewModel = QuoteViewModel(repository)

        assertTrue(viewModel.uiState.value is QuoteUiState.Error)
    }

    @Test
    fun `retry after failure recovers`() = runTest {
        repository.shouldFail = true
        val viewModel = QuoteViewModel(repository)

        repository.shouldFail = false
        viewModel.loadQuote()

        assertTrue(viewModel.uiState.value is QuoteUiState.Success)
    }
}
```

- `runTest { }` runs coroutine test code and skips `delay`s instantly.
- `UnconfinedTestDispatcher` runs launched coroutines eagerly, so the state is ready right after calling functions.
- No network, no Android, no flakiness: these tests run in milliseconds.

:::note Fakes vs mocks
A **fake** is a working, simplified implementation (like an in-memory repository). A **mock** (with libraries like MockK or Mockito) is an object whose responses you script and whose calls you verify. Google recommends fakes where possible because they're simpler and test behaviour rather than implementation details.
:::

## Testing Flows with Turbine

For `StateFlow`s built with `stateIn(WhileSubscribed)` or flows that emit several values, collect them in the test. **Turbine** makes this easy:

```kotlin
@Test
fun `favorites update when repository emits`() = runTest {
    val repository = FakeRecipeRepository()           // exposes a MutableStateFlow internally
    val viewModel = FavoritesViewModel(repository)

    viewModel.uiState.test {                          // Turbine
        assertEquals(emptyList<Recipe>(), awaitItem().recipes)   // initial value

        repository.emitFavorites(listOf(sampleRecipe))
        assertEquals(listOf(sampleRecipe), awaitItem().recipes)

        cancelAndIgnoreRemainingEvents()
    }
}
```

## Compose UI tests

UI tests find elements through the **semantics tree**, the same information accessibility services use (text, content descriptions, roles). They live in `src/androidTest/` and run on a device or emulator.

```kotlin title="src/androidTest/.../CounterTest.kt"
class CounterTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun clickingButton_incrementsCount() {
        composeTestRule.setContent {
            MaterialTheme { Counter() }                 // the composable from Lesson 11
        }

        composeTestRule.onNodeWithText("You clicked 0 times").assertIsDisplayed()

        composeTestRule.onNodeWithText("Click me").performClick()
        composeTestRule.onNodeWithText("Click me").performClick()

        composeTestRule.onNodeWithText("You clicked 2 times").assertIsDisplayed()
    }
}
```

Test **stateless screens** by passing in whatever state you want. No ViewModel or network needed:

```kotlin
@Test
fun errorState_showsRetry_andCallsCallback() {
    var retried = false
    composeTestRule.setContent {
        QuoteScreen(uiState = QuoteUiState.Error("No internet"), onRetry = { retried = true })
    }

    composeTestRule.onNodeWithText("No internet").assertIsDisplayed()
    composeTestRule.onNodeWithText("Retry").performClick()
    assertTrue(retried)
}
```

Useful finders and actions:

| Finders | Actions | Assertions |
|---|---|---|
| `onNodeWithText("…")` | `performClick()` | `assertIsDisplayed()` |
| `onNodeWithContentDescription("…")` | `performTextInput("…")` | `assertTextEquals("…")` |
| `onNodeWithTag("…")` | `performScrollToIndex(20)` | `assertIsEnabled()` / `assertIsNotEnabled()` |
| `onAllNodesWithText("…")` | `performTouchInput { swipeLeft() }` | `assertCountEquals(3)` |

For elements without text, add `Modifier.testTag("recipe_list")` and find them with `onNodeWithTag`.

:::tip The Route/Screen split pays off
Because screens are stateless (`QuoteScreen(uiState, onRetry)`), you can test every state (loading, error, empty, full) in isolation. This is a big reason we split Route and Screen back in Lesson 20.
:::

## Running tests

- Click ▶ next to a test class or function.
- Right-click the `test` folder → **Run 'Tests in …'**.
- From the terminal:

```bash
./gradlew test                    # all local unit tests
./gradlew connectedAndroidTest    # instrumented tests on a connected device
```

Reports are generated in `app/build/reports/tests/`.

## What to test first

1. **ViewModels**: state for each event and error path. Highest value.
2. **Repositories & mappers**: data transformations, caching logic.
3. **Pure utility functions**: formatting, validation.
4. **Key UI flows**: a few UI tests for the most important screens.

## Recap

:::recap
- Local unit tests (`src/test`) are fast; instrumented tests (`src/androidTest`) need a device.
- Swap `Dispatchers.Main` with a `MainDispatcherRule`; use `runTest`.
- Depend on interfaces so you can inject **fakes**.
- Turbine tests Flows; `createComposeRule` tests Compose UI via semantics.
:::

:::exercise
1. Write unit tests for `TipUiState` from Lesson 20: 15% of 100 is 15; rounding up 12.3 gives 13; invalid input gives 0.
2. Write a ViewModel test for `DiceViewModel`: after `roll()`, `rolls == 1` and `value in 1..6`; after `reset()`, state equals `DiceUiState()`.
3. Write a Compose UI test for `DiceScreen` that clicks **Roll** and asserts the text `"Rolls: 1"` appears. (Hint: use `onNodeWithText("Rolls: 1", substring = true)`.)
:::

:::solution Show solutions for tasks 1–2
```kotlin
class TipUiStateTest {
    @Test fun `15 percent of 100`() =
        assertEquals(15.0, TipUiState(amountInput = "100", percent = 15).tip, 0.001)

    @Test fun `round up`() =
        assertEquals(13.0, TipUiState(amountInput = "82", percent = 15, roundUp = true).tip, 0.001) // 12.3 → 13

    @Test fun `invalid input gives zero`() =
        assertEquals(0.0, TipUiState(amountInput = "abc").total, 0.001)
}

class DiceViewModelTest {
    @get:Rule val mainDispatcherRule = MainDispatcherRule()

    @Test fun `roll updates value and count`() {
        val vm = DiceViewModel()
        vm.roll()
        val state = vm.uiState.value
        assertEquals(1, state.rolls)
        assertTrue(state.value in 1..6)
        assertEquals(listOf(state.value), state.history)
    }

    @Test fun `reset restores initial state`() {
        val vm = DiceViewModel()
        repeat(3) { vm.roll() }
        vm.reset()
        assertEquals(DiceUiState(), vm.uiState.value)
    }
}
```
:::

## Check your understanding

```quiz
Q: Where do tests that run on your computer's JVM (no device) live?
- [x] src/test
- [ ] src/androidTest
- [ ] src/main/test
- [ ] tests/
> src/test holds local unit tests; src/androidTest holds instrumented tests.

Q: Your ViewModel test crashes with "Module with the Main dispatcher is missing". What's the fix?
- [ ] Run the test on an emulator
- [x] Replace Dispatchers.Main with a test dispatcher using a rule like MainDispatcherRule
- [ ] Remove viewModelScope
- [ ] Add Thread.sleep()
> Local tests have no Android main looper; Dispatchers.setMain swaps it for a test dispatcher.

Q: Why is a fake repository useful in ViewModel tests?
- [ ] It makes the app faster
- [x] It gives fast, deterministic control over data and errors without network or database
- [ ] It's required by JUnit
- [ ] It tests the real server
> Fakes let you test every scenario, including failures, reliably.

Q: How do Compose UI tests find elements?
- [ ] By XML id
- [ ] By screen coordinates
- [x] Through the semantics tree: text, content descriptions, and test tags
- [ ] By class name
> Semantics is the same information accessibility services use.
```
