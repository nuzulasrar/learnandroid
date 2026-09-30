---
id: offline-first
title: Offline-First with a Single Source of Truth
part: 5
minutes: 30
summary: Combine Retrofit and Room so your app shows data instantly, works without internet, and refreshes in the background, the pattern behind the best apps.
---

:::goals
- What "offline-first" means and why users love it
- The database as the **single source of truth**
- Implementing a caching repository: observe local, refresh from network
- Handling refresh errors without losing cached data
- Combining multiple flows with `combine`
:::

## The problem with network-only apps

In the networking lesson, every screen started with a spinner and failed completely without internet. Real users are on trains, in lifts and on flaky mobile data. Compare:

- **Network-only:** open app → spinner → (maybe) data → go offline → error screen.
- **Offline-first:** open app → **cached data instantly** → fresh data quietly replaces it → go offline → still usable, with a small "offline" notice.

## The pattern

<div class="diagram"><div class="flow">
<div>Network<small>Retrofit API</small></div><div class="arrow">→ writes →</div>
<div class="hl">Room database<small>single source of truth</small></div><div class="arrow">→ Flow →</div>
<div>Repository</div><div class="arrow">→</div>
<div class="hl">ViewModel → UI</div>
</div><div class="diagram-caption">The UI never reads from the network directly. The network only updates the database.</div></div>

1. The UI **observes the database** (a Room `Flow`).
2. To refresh, the repository **fetches from the network** and **writes into the database**.
3. Room notices the change and emits the new data, and the UI updates.
4. If the network fails, the UI still has the cached data, plus an error message.

Because there's only one place data comes from (the database), there are no inconsistencies between "what the network said" and "what's saved".

## Implementation

Continuing with quotes from Lesson 23, let's cache them.

### Entity and DAO

```kotlin title="data/local/QuoteEntity.kt"
@Entity(tableName = "quotes")
data class QuoteEntity(
    @PrimaryKey val id: Int,          // use the server's id
    val text: String,
    val author: String,
    val fetchedAt: Long = System.currentTimeMillis()
)

@Dao
interface QuoteDao {
    @Query("SELECT * FROM quotes ORDER BY id")
    fun observeAll(): Flow<List<QuoteEntity>>

    @Upsert
    suspend fun upsertAll(quotes: List<QuoteEntity>)

    @Query("DELETE FROM quotes")
    suspend fun clear()

    @Transaction
    suspend fun replaceAll(quotes: List<QuoteEntity>) {   // clear + insert in one transaction
        clear()
        upsertAll(quotes)
    }
}
```

### Mappers

First add an `id` to the app model from Lesson 23: `data class Quote(val id: Int, val text: String, val author: String)`.

```kotlin
fun QuoteDto.toEntity() = QuoteEntity(id = id, text = quote, author = author)
fun QuoteEntity.toQuote() = Quote(id = id, text = text, author = author)
```

### The offline-first repository

```kotlin title="data/QuoteRepository.kt"
interface QuoteRepository {
    fun observeQuotes(): Flow<List<Quote>>
    suspend fun refresh(): Result<Unit>
}

class OfflineFirstQuoteRepository @Inject constructor(
    private val api: QuoteApi,
    private val dao: QuoteDao
) : QuoteRepository {

    // Reads ALWAYS come from the database
    override fun observeQuotes(): Flow<List<Quote>> =
        dao.observeAll().map { entities -> entities.map { it.toQuote() } }

    // Refresh writes network data INTO the database
    override suspend fun refresh(): Result<Unit> = try {
        val remote = api.getQuotes(limit = 50).quotes
        dao.replaceAll(remote.map { it.toEntity() })
        Result.success(Unit)
    } catch (e: IOException) {
        Result.failure(e)
    } catch (e: HttpException) {
        Result.failure(e)
    }
}
```

### ViewModel: combining data and refresh status

The screen needs *two* things: the quotes (from the database) and the refresh status (loading/error). Combine them into one `UiState` with `combine`:

```kotlin title="ui/QuotesViewModel.kt"
data class QuotesUiState(
    val quotes: List<Quote> = emptyList(),
    val isRefreshing: Boolean = false,
    val errorMessage: String? = null
)

@HiltViewModel
class QuotesViewModel @Inject constructor(
    private val repository: QuoteRepository
) : ViewModel() {

    private val isRefreshing = MutableStateFlow(false)
    private val errorMessage = MutableStateFlow<String?>(null)

    val uiState: StateFlow<QuotesUiState> = combine(
        repository.observeQuotes(),
        isRefreshing,
        errorMessage
    ) { quotes, refreshing, error ->
        QuotesUiState(quotes, refreshing, error)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), QuotesUiState(isRefreshing = true))

    init { refresh() }

    fun refresh() {
        viewModelScope.launch {
            isRefreshing.value = true
            errorMessage.value = null
            repository.refresh().onFailure {
                errorMessage.value = "You're offline. Showing saved quotes."
            }
            isRefreshing.value = false
        }
    }

    fun onErrorShown() { errorMessage.value = null }
}
```

### UI

```kotlin title="ui/QuotesScreen.kt"
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QuotesScreen(uiState: QuotesUiState, onRefresh: () -> Unit, onErrorShown: () -> Unit) {
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(uiState.errorMessage) {
        uiState.errorMessage?.let {
            snackbarHostState.showSnackbar(it)
            onErrorShown()
        }
    }

    Scaffold(snackbarHost = { SnackbarHost(snackbarHostState) }) { padding ->
        PullToRefreshBox(
            isRefreshing = uiState.isRefreshing,
            onRefresh = onRefresh,
            modifier = Modifier.padding(padding).fillMaxSize()
        ) {
            if (uiState.quotes.isEmpty() && !uiState.isRefreshing) {
                EmptyState(onRetry = onRefresh)           // your own composable: nothing cached AND offline
            } else {
                LazyColumn(contentPadding = PaddingValues(16.dp)) {
                    items(uiState.quotes, key = { it.id }) { QuoteCard(it) }   // the card from Lesson 23
                }
            }
        }
    }
}
```

Test it: run the app online (quotes load and get cached), then turn on **airplane mode** and restart the app. The quotes appear instantly, and pulling to refresh shows the offline snackbar instead of wiping the screen. 🎉

## Keeping data fresh

When should you refresh?

- **On screen open** (as above). Simple and usually enough.
- **Only if stale**: skip the network if the cache is recent, e.g. `if (System.currentTimeMillis() - lastFetch > 1.hours.inWholeMilliseconds) refresh()`.
- **Periodically in the background** with WorkManager (Lesson 28), so data is fresh even before the user opens the app.

## Writes when offline (a glimpse)

Offline-first *writes* (e.g. liking a post without internet) are more advanced: save the change locally with a "pending sync" flag, show it in the UI immediately, and let a WorkManager job push pending changes when the network returns. The principle stays the same: **the local database is the truth; the network is synchronised in the background.**

## Recap

:::recap
- Offline-first: the UI observes the **local database**, and the network only writes into it.
- The repository exposes `observe…(): Flow` and `refresh(): Result`.
- Refresh failures keep cached data and show a gentle message.
- `combine` merges several flows (data + status) into one `UiState`.
:::

:::exercise
1. Make the quotes repository only refresh when the cached data is older than 10 minutes, or when the user pulls to refresh (add a `force: Boolean` parameter).
2. Add a "Last updated 5 min ago" label under the top bar using the newest `fetchedAt` value.
:::

## Check your understanding

```quiz
Q: In an offline-first app, where does the UI read data from?
- [ ] Directly from the network
- [x] The local database, which the network updates
- [ ] Whichever responds first
- [ ] The ViewModel's cache only
> The database is the single source of truth.

Q: The refresh fails because the phone is offline. What should the user see?
- [ ] A full-screen error that hides everything
- [x] The cached data, plus a non-blocking message that they're offline
- [ ] A crash
- [ ] An empty list
> Keeping cached content visible is the whole point of offline-first.

Q: What does `combine(flowA, flowB) { a, b -> … }` do?
- [ ] Runs flowA then flowB
- [x] Emits a new combined value whenever either flow emits, using the latest value of each
- [ ] Merges both into one list
- [ ] Cancels flowB when flowA emits
> combine is perfect for building one UiState from multiple sources.
```
