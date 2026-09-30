---
id: viewmodel
title: ViewModel & UI State
part: 4
minutes: 40
summary: Move state and logic out of composables into a ViewModel that survives rotation. Model screen state with a single UiState, expose it as StateFlow, and collect it safely in Compose.
---

:::goals
- What a ViewModel is and why every screen should have one
- Exposing state with `StateFlow` and updating it safely
- Modelling screen state with a single `UiState` data class or sealed interface
- Collecting state in Compose with `collectAsStateWithLifecycle`
- Handling events and loading data in `viewModelScope`
- Using `SavedStateHandle`
:::

## Why a ViewModel?

So far, state lived in composables with `remember`/`rememberSaveable`. That's fine for simple UI state, but not for **screen data and business logic**:

- Composables should only *display* things. Logic (validation, loading data, calculations) in composables is hard to test and reuse.
- `remember` is lost on rotation; `rememberSaveable` can only hold small, simple values.
- Loading data from a composable would restart on every rotation.

A **`ViewModel`** is a class that holds a screen's state and logic. It **survives configuration changes**: when the Activity is recreated on rotation, the same ViewModel instance is handed back. It's cleared only when the screen is gone for good (the user navigated away, or the Activity finished).

<div class="diagram"><div class="flow">
<div class="hl">ViewModel<small>state + logic, survives rotation</small></div>
<div class="arrow">⇄</div>
<div>Composable screen<small>displays state, sends events</small></div>
</div><div class="diagram-caption">The same unidirectional data flow as Lesson 14. The ViewModel is now the state holder.</div></div>

## Setup

The template already includes `lifecycle-runtime-ktx`. Add the ViewModel-Compose and lifecycle-Compose artifacts:

```toml title="gradle/libs.versions.toml"
[libraries]
androidx-lifecycle-viewmodel-compose = { group = "androidx.lifecycle", name = "lifecycle-viewmodel-compose", version.ref = "lifecycleRuntimeKtx" }
androidx-lifecycle-runtime-compose = { group = "androidx.lifecycle", name = "lifecycle-runtime-compose", version.ref = "lifecycleRuntimeKtx" }
```

```kts title="app/build.gradle.kts"
implementation(libs.androidx.lifecycle.viewmodel.compose)
implementation(libs.androidx.lifecycle.runtime.compose)
```

(`lifecycleRuntimeKtx` is the version entry the template already created, and all lifecycle libraries share one version.)

## Your first ViewModel

Let's move the dice-rolling logic of a small game into a ViewModel.

```kotlin title="DiceViewModel.kt"
data class DiceUiState(
    val value: Int = 1,
    val rolls: Int = 0,
    val history: List<Int> = emptyList()
) {
    val average: Double get() = if (history.isEmpty()) 0.0 else history.average()   // derived
}

class DiceViewModel : ViewModel() {

    // Private, mutable. Only the ViewModel can change it
    private val _uiState = MutableStateFlow(DiceUiState())
    // Public, read-only. The UI observes it
    val uiState: StateFlow<DiceUiState> = _uiState.asStateFlow()

    fun roll() {
        val result = (1..6).random()
        _uiState.update { current ->
            current.copy(
                value = result,
                rolls = current.rolls + 1,
                history = (current.history + result).takeLast(10)
            )
        }
    }

    fun reset() {
        _uiState.value = DiceUiState()
    }
}
```

Key points:

- **One `UiState` class** describes *everything* the screen shows. The UI is a pure function of it.
- `MutableStateFlow` is private; the public property is a read-only `StateFlow`. The UI **cannot** modify state directly; it must call a function (an *event*).
- `update { }` atomically replaces the state with a modified `copy`. It's thread-safe, unlike `_uiState.value = _uiState.value.copy(...)`, which can lose updates under concurrency.

## Using it from Compose

```kotlin title="DiceScreen.kt"
@Composable
fun DiceRoute(viewModel: DiceViewModel = viewModel()) {       // 1. get the ViewModel
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()  // 2. observe state
    DiceScreen(
        uiState = uiState,
        onRoll = viewModel::roll,                              // 3. pass events up
        onReset = viewModel::reset
    )
}

@Composable
fun DiceScreen(                                                 // stateless & previewable
    uiState: DiceUiState,
    onRoll: () -> Unit,
    onReset: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.fillMaxSize().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text("🎲 ${uiState.value}", style = MaterialTheme.typography.displayLarge)
        Text("Rolls: ${uiState.rolls} · Average: ${"%.1f".format(uiState.average)}")
        Text("Last rolls: ${uiState.history.joinToString()}")
        Spacer(Modifier.height(24.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Button(onClick = onRoll) { Text("Roll") }
            OutlinedButton(onClick = onReset) { Text("Reset") }
        }
    }
}

@Preview(showBackground = true)
@Composable
fun DiceScreenPreview() {
    DiceScreen(uiState = DiceUiState(value = 4, rolls = 3, history = listOf(2, 6, 4)), onRoll = {}, onReset = {})
}
```

1. `viewModel()` returns the ViewModel scoped to the current screen, creating it the first time and returning the *same instance* after rotation.
2. `collectAsStateWithLifecycle()` turns the `StateFlow` into Compose `State`, and **pauses collection when the app is in the background**.
3. `viewModel::roll` is a *function reference*, a neat way to pass a function as a lambda.

:::tip The Route/Screen split
Splitting into `DiceRoute` (wires up the ViewModel) and `DiceScreen` (pure UI) is a widely used convention. The Screen composable has no ViewModel dependency, so it's trivial to preview and test with any state you like.
:::

Rotate the phone: the dice and history stay. 🎉

## Loading data: the `Loading / Success / Error` pattern

Real screens load data. Model the possibilities with a sealed interface:

```kotlin title="QuoteViewModel.kt"
sealed interface QuoteUiState {
    data object Loading : QuoteUiState
    data class Success(val quote: String, val author: String) : QuoteUiState
    data class Error(val message: String) : QuoteUiState
}

class QuoteViewModel : ViewModel() {
    private val _uiState = MutableStateFlow<QuoteUiState>(QuoteUiState.Loading)
    val uiState: StateFlow<QuoteUiState> = _uiState.asStateFlow()

    init {
        loadQuote()           // load once when the ViewModel is created, not on every rotation
    }

    fun loadQuote() {
        _uiState.value = QuoteUiState.Loading
        viewModelScope.launch {                       // cancelled automatically when cleared
            try {
                delay(1500)                           // pretend network call
                if ((1..4).random() == 1) throw IOException("Network error")
                _uiState.value = QuoteUiState.Success(
                    quote = "Simplicity is prerequisite for reliability.",
                    author = "Edsger Dijkstra"
                )
            } catch (e: IOException) {
                _uiState.value = QuoteUiState.Error("Couldn't load a quote. Check your connection.")
            }
        }
    }
}
```

```kotlin title="QuoteScreen.kt"
@Composable
fun QuoteRoute(viewModel: QuoteViewModel = viewModel()) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    QuoteScreen(uiState, onRetry = viewModel::loadQuote)
}

@Composable
fun QuoteScreen(uiState: QuoteUiState, onRetry: () -> Unit) {
    Box(Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
        when (uiState) {
            QuoteUiState.Loading -> CircularProgressIndicator()
            is QuoteUiState.Success -> Column {
                Text("“${uiState.quote}”", style = MaterialTheme.typography.headlineSmall)
                Text("— ${uiState.author}", style = MaterialTheme.typography.titleMedium)
                TextButton(onClick = onRetry) { Text("Another one") }
            }
            is QuoteUiState.Error -> Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(uiState.message)
                Button(onClick = onRetry) { Text("Retry") }
            }
        }
    }
}
```

This exact pattern powers most data screens in Android apps, and you'll use it with a real API in Part 5.

:::note Sealed interface or data class?
Use a **sealed interface** when states are mutually exclusive (loading *or* content *or* error). Use a **data class** with fields like `isLoading`, `items`, `errorMessage` when they can combine (e.g. showing old content *while* refreshing). Both are fine; pick what matches your screen.
:::

## Handling user input in a ViewModel

For text fields, keep the text in the ViewModel's state and update it on every change:

```kotlin
data class SearchUiState(val query: String = "", val results: List<String> = emptyList())

class SearchViewModel : ViewModel() {
    private val all = listOf("Pancakes", "Pad Thai", "Paella", "Ramen", "Risotto", "Tacos")
    private val _uiState = MutableStateFlow(SearchUiState(results = all))
    val uiState = _uiState.asStateFlow()

    fun onQueryChange(query: String) {
        _uiState.update {
            it.copy(query = query, results = all.filter { r -> r.contains(query, ignoreCase = true) })
        }
    }
}
```

## `SavedStateHandle`: surviving process death

ViewModels survive rotation but **not** process death (Lesson 18). For small, important values (a search query, a form draft, navigation arguments), use `SavedStateHandle`, which is automatically available to ViewModels:

```kotlin
class SearchViewModel(private val savedStateHandle: SavedStateHandle) : ViewModel() {

    // A StateFlow backed by saved state: survives process death
    val query: StateFlow<String> = savedStateHandle.getStateFlow("query", "")

    fun onQueryChange(newQuery: String) {
        savedStateHandle["query"] = newQuery
    }
}
```

`viewModel()` provides the `SavedStateHandle` for you automatically when it's the only constructor parameter. (For ViewModels with other dependencies you'll use Hilt in Lesson 22.)

## ViewModel rules

:::danger Never hold a reference to a Context, Activity, View or composable in a ViewModel
The ViewModel outlives the Activity. Holding a reference to it **leaks** the whole destroyed screen in memory. If you need resources or system services, get them from the data layer or use `AndroidViewModel` sparingly.
:::

- One ViewModel per screen (usually).
- Expose **immutable** state (`StateFlow`, not `MutableStateFlow`).
- Expose **functions** for events: `onQueryChange`, `onRetry`, `onFavoriteClick`.
- Launch coroutines in `viewModelScope`.
- No Compose/Android UI types in the ViewModel. It should be testable with plain JUnit.

## Recap

:::recap
- A **ViewModel** holds screen state and logic and survives configuration changes.
- Expose state as `StateFlow<UiState>`; update with `_uiState.update { it.copy(...) }`.
- In Compose: `val state by viewModel.uiState.collectAsStateWithLifecycle()`.
- Split **Route** (ViewModel wiring) from **Screen** (stateless UI).
- Model loading with `Loading / Success / Error`; start loading in `init`.
- `SavedStateHandle` for small state that must survive process death.
:::

## Practice

:::exercise
Refactor the **tip calculator** from Lesson 14 to use a `TipViewModel`:

1. Create a `TipUiState` data class holding `amountInput`, `percent`, `roundUp`, and computed `tip` and `total` properties.
2. Add event functions `onAmountChange`, `onPercentChange`, `onRoundUpChange`.
3. Split into `TipRoute` and a stateless `TipScreen(uiState, ...)`. Add a preview of `TipScreen` with sample state.
:::

:::solution Show solution
```kotlin
data class TipUiState(
    val amountInput: String = "",
    val percent: Int = 15,
    val roundUp: Boolean = false
) {
    private val amount get() = amountInput.toDoubleOrNull() ?: 0.0
    val tip: Double get() = (amount * percent / 100).let { if (roundUp) kotlin.math.ceil(it) else it }
    val total: Double get() = amount + tip
}

class TipViewModel : ViewModel() {
    private val _uiState = MutableStateFlow(TipUiState())
    val uiState = _uiState.asStateFlow()

    fun onAmountChange(v: String) = _uiState.update { it.copy(amountInput = v) }
    fun onPercentChange(p: Int) = _uiState.update { it.copy(percent = p) }
    fun onRoundUpChange(r: Boolean) = _uiState.update { it.copy(roundUp = r) }
}

@Composable
fun TipRoute(viewModel: TipViewModel = viewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    TipScreen(state, viewModel::onAmountChange, viewModel::onPercentChange, viewModel::onRoundUpChange)
}

@Composable
fun TipScreen(
    uiState: TipUiState,
    onAmountChange: (String) -> Unit,
    onPercentChange: (Int) -> Unit,
    onRoundUpChange: (Boolean) -> Unit
) {
    Column(Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        AmountField(uiState.amountInput, onAmountChange)          // from Lesson 14
        PercentSelector(uiState.percent, onPercentChange)
        RoundUpRow(uiState.roundUp, onRoundUpChange)
        Text("Tip: ${"%.2f".format(uiState.tip)}", style = MaterialTheme.typography.titleLarge)
        Text("Total: ${"%.2f".format(uiState.total)}")
    }
}

@Preview(showBackground = true)
@Composable
fun TipScreenPreview() {
    TipScreen(TipUiState(amountInput = "42.50", percent = 20), {}, {}, {})
}
```
:::

## Check your understanding

```quiz
Q: Why expose `StateFlow` publicly but keep `MutableStateFlow` private?
- [ ] MutableStateFlow can't be collected
- [x] So only the ViewModel can change state; the UI can only read it and send events
- [ ] StateFlow is faster
- [ ] Compose requires it
> This enforces unidirectional data flow with a single source of truth.

Q: What does `collectAsStateWithLifecycle()` add over `collectAsState()`?
- [ ] It survives process death
- [x] It stops collecting when the app is in the background, saving resources
- [ ] It makes the flow mutable
- [ ] It works without a ViewModel
> It's lifecycle-aware: collection happens only while the UI is at least STARTED.

Q: Where should a screen start loading its initial data so it doesn't reload on rotation?
- [ ] In the composable body
- [ ] In `LaunchedEffect(Unit)` inside the Screen
- [x] In the ViewModel's `init` block (in viewModelScope)
- [ ] In `onResume`
> The ViewModel survives rotation, so init runs once per screen instance.

Q: Which should never be stored in a ViewModel?
- [ ] A StateFlow
- [ ] A repository
- [x] A reference to the Activity
- [ ] A list of data
> ViewModels outlive Activities; holding one leaks memory.

Q: Why use `_uiState.update { it.copy(...) }` instead of reading `.value` and assigning a copy?
- [ ] It's shorter
- [x] It's atomic and thread-safe, so concurrent updates aren't lost
- [ ] `.value` is deprecated
- [ ] It triggers recomposition twice
> update retries the transformation if another update happened in between.
```
