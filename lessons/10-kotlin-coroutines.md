---
id: kotlin-coroutines
title: Coroutines & Flow
part: 2
minutes: 40
summary: Android apps constantly wait for the network, the database and the disk. Coroutines let you write that waiting code simply, without freezing the screen. Flow handles values that change over time.
---

:::goals
- Why the main thread must never be blocked
- `suspend` functions and how coroutines differ from threads
- Launching coroutines with `launch` and `async`
- Dispatchers: `Main`, `IO`, `Default`, and `withContext`
- Structured concurrency, scopes and cancellation
- The basics of `Flow` and `StateFlow`
:::

## The problem: the main thread

Every Android app has a **main thread** (also called the **UI thread**). It draws the screen and handles taps, about 60–120 times a second. If you make it wait for something slow (a network call, a big database query), the app freezes. After about 5 seconds Android shows the dreaded **"App isn't responding" (ANR)** dialog.

The traditional fix was threads and callbacks, which quickly turn into "callback hell". **Coroutines** let you write asynchronous code that *looks* sequential:

```kotlin
// With coroutines: reads top to bottom, but never blocks the main thread
suspend fun loadProfile() {
    val user = api.getUser()            // suspends while the network works
    val posts = api.getPosts(user.id)   // suspends again
    show(user, posts)                   // runs when both are done
}
```

:::analogy
A thread is like a chef. Blocking is the chef standing still, staring at the oven for 20 minutes. Coroutines let the chef put the dish in, go chop vegetables for other orders, and come back when the timer rings. Thousands of coroutines can share a few threads.
:::

## `suspend` functions

A `suspend` function can **pause** without blocking its thread, and **resume** later. It can only be called from another suspend function or from a coroutine.

```kotlin runnable
import kotlinx.coroutines.*

suspend fun fetchUserName(): String {
    delay(1000)          // suspends for 1 second (doesn't block the thread!)
    return "Ada"
}

fun main() = runBlocking {   // runBlocking bridges normal code and coroutines (only in main/tests)
    println("Fetching…")
    val name = fetchUserName()
    println("Got $name")
}
```

:::warning `runBlocking` is for demos and tests only
It *blocks* the current thread until the coroutine finishes, which is exactly what we want to avoid in an app. On Android you'll launch coroutines from `viewModelScope` or `lifecycleScope` instead (Part 4).
:::

## Launching coroutines: `launch` and `async`

- `launch { }` starts a coroutine that does work and returns a `Job` (fire and forget).
- `async { }` starts a coroutine that *computes a result* and returns a `Deferred<T>`; call `.await()` to get it.

```kotlin runnable
import kotlinx.coroutines.*
import kotlin.system.measureTimeMillis

suspend fun fetchWeather(): String { delay(1000); return "☀️ 24°C" }
suspend fun fetchNews(): String { delay(1000); return "📰 Local team wins the cup" }

fun main() = runBlocking {
    // Sequential: ~2 seconds
    val t1 = measureTimeMillis {
        val w = fetchWeather()
        val n = fetchNews()
        println("$w | $n")
    }
    println("Sequential took ${t1}ms")

    // Parallel with async: ~1 second
    val t2 = measureTimeMillis {
        val w = async { fetchWeather() }
        val n = async { fetchNews() }
        println("${w.await()} | ${n.await()}")
    }
    println("Parallel took ${t2}ms")

    // launch: fire-and-forget
    val job = launch {
        repeat(3) { i ->
            println("Background tick $i")
            delay(200)
        }
    }
    job.join()   // wait for it to finish
    println("Done")
}
```

## Dispatchers: which thread?

A **dispatcher** decides which thread(s) a coroutine runs on:

| Dispatcher | Use it for |
|---|---|
| `Dispatchers.Main` | Updating UI (Android only). The default in `viewModelScope`. |
| `Dispatchers.IO` | Network, disk, database (blocking I/O) |
| `Dispatchers.Default` | CPU-heavy work: sorting big lists, parsing, image processing |

Switch dispatchers inside a coroutine with `withContext`:

```kotlin
suspend fun loadBigFile(path: String): String = withContext(Dispatchers.IO) {
    File(path).readText()     // blocking call, safely off the main thread
}
```

:::tip Main-safety
Good practice: every suspend function should be **main-safe**, meaning it's fine to call from the main thread. If it does blocking work, it switches to `Dispatchers.IO` itself with `withContext`. Libraries like Retrofit and Room already do this for you, so you just call their suspend functions.
:::

## Structured concurrency & cancellation

Coroutines are always started in a **scope**. A scope owns its coroutines: when the scope is cancelled, all its children are cancelled too. On Android:

- `viewModelScope`: cancelled when the ViewModel is cleared (user leaves the screen for good).
- `lifecycleScope`: cancelled when the Activity/Fragment is destroyed.
- `rememberCoroutineScope()`: cancelled when a composable leaves the screen.

This prevents leaks: a network request doesn't keep running (and try to update a dead screen) after the user leaves.

```kotlin runnable
import kotlinx.coroutines.*

fun main() = runBlocking {
    val job = launch {
        try {
            repeat(10) { i ->
                println("Working $i…")
                delay(300)
            }
        } finally {
            println("Cleaning up")
        }
    }
    delay(1000)
    println("User left the screen, cancelling")
    job.cancel()
    job.join()
    println("Cancelled: ${job.isCancelled}")
}
```

### Handling errors

Use normal `try/catch` around suspend calls:

```kotlin
viewModelScope.launch {
    try {
        val recipes = repository.getRecipes()
        _uiState.value = UiState.Success(recipes)
    } catch (e: IOException) {
        _uiState.value = UiState.Error("Check your internet connection")
    }
}
```

## Flow: streams of values

A `suspend` function returns **one** value. A **`Flow`** emits **many values over time**: search results as you type, a database table that changes, a timer.

```kotlin runnable
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*

fun countdown(from: Int): Flow<Int> = flow {
    for (i in from downTo 0) {
        emit(i)          // send a value
        delay(300)
    }
}

fun main() = runBlocking {
    countdown(5)
        .filter { it % 2 == 1 }       // operators like collections!
        .map { "T-minus $it" }
        .collect { println(it) }      // collect receives every value
    println("🚀")
}
```

Flows are **cold**: the code inside `flow { }` doesn't run until someone calls `collect`. Room databases return `Flow`s that emit a new list every time the data changes. You'll love that in Part 5.

### StateFlow: observable state

A **`StateFlow`** always holds a *current value* and emits updates to its collectors. It's how ViewModels expose UI state to Compose:

```kotlin runnable
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*

class CounterViewModel {
    private val _count = MutableStateFlow(0)       // private, mutable
    val count: StateFlow<Int> = _count.asStateFlow()  // public, read-only

    fun increment() { _count.update { it + 1 } }
}

fun main() = runBlocking {
    val vm = CounterViewModel()
    val observer = launch {
        vm.count.collect { println("UI shows: $it") }
    }
    repeat(3) {
        delay(100)
        vm.increment()
    }
    delay(100)
    observer.cancel()
}
```

Notice the `_count` / `count` pattern from Lesson 8: only the ViewModel can change the state; the UI can only read it.

## Recap

:::recap
- Never block the main thread. Slow work happens in coroutines.
- `suspend` functions pause without blocking; call them from coroutines.
- `launch` = do work; `async`/`await` = compute results in parallel.
- `withContext(Dispatchers.IO)` moves blocking work off the main thread.
- Scopes (`viewModelScope`, `lifecycleScope`) cancel their coroutines automatically.
- `Flow` = many values over time; `StateFlow` = observable current state.
:::

## Practice

:::exercise
1. Write `suspend fun fetchPrice(item: String): Double` that delays 500 ms and returns a random price. Fetch prices for three items **in parallel** and print the total. Measure the time to prove it's parallel.
2. Create a `Flow<String>` that emits `"Tick 1"` … `"Tick 5"` every 200 ms. Collect only the first 3 using the `take(3)` operator.
:::

:::solution Show solutions
```kotlin runnable
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import kotlin.random.Random
import kotlin.system.measureTimeMillis

suspend fun fetchPrice(item: String): Double {
    delay(500)
    return Random.nextDouble(1.0, 10.0)
}

fun ticks(): Flow<String> = flow {
    for (i in 1..5) {
        emit("Tick $i")
        delay(200)
    }
}

fun main() = runBlocking {
    val time = measureTimeMillis {
        val prices = listOf("apple", "bread", "cheese")
            .map { item -> async { fetchPrice(item) } }
            .awaitAll()
        println("Total: ${"%.2f".format(prices.sum())}")
    }
    println("Took ${time}ms (≈500, not 1500)")

    ticks().take(3).collect { println(it) }
}
```
:::

## Check your understanding

```quiz
Q: What happens if you do a slow network call directly on the main thread?
- [ ] The call runs faster
- [x] The UI freezes, and after a few seconds Android may show an "App isn't responding" dialog
- [ ] Android automatically moves it to a background thread
- [ ] Nothing, since networking is always asynchronous
> The main thread draws the UI, so blocking it freezes the app. (Android actually throws NetworkOnMainThreadException for network calls on the main thread.)

Q: What's the difference between `launch` and `async`?
- [ ] `launch` is faster
- [x] `async` returns a Deferred whose result you get with `await()`; `launch` returns a Job with no result
- [ ] `async` runs on a background thread, `launch` on the main thread
- [ ] There is no difference
> Use async when you need a value back, typically to run several operations in parallel.

Q: Which dispatcher should you use for reading a large file?
- [ ] Dispatchers.Main
- [x] Dispatchers.IO
- [ ] Dispatchers.Default
- [ ] Dispatchers.Unconfined
> IO is designed for blocking input/output operations like files, network and databases.

Q: A user leaves a screen while its ViewModel is loading data in `viewModelScope`. What happens to that coroutine when the ViewModel is cleared?
- [ ] It keeps running forever
- [x] It's automatically cancelled
- [ ] The app crashes
- [ ] It restarts
> Structured concurrency: when the scope is cancelled, all its coroutines are cancelled too.

Q: What's special about a StateFlow compared to a regular Flow?
- [ ] It can only emit strings
- [x] It always has a current value, and new collectors immediately receive it
- [ ] It runs on the main thread only
- [ ] It can't be collected
> StateFlow is a "hot" holder of state. Perfect for exposing UI state from ViewModels.
```
