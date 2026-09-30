---
id: networking
title: Networking with Retrofit
part: 5
minutes: 40
summary: Fetch real data from the internet. HTTP and JSON basics, Retrofit with kotlinx.serialization, error handling, and wiring it all through a repository into your UI.
---

:::goals
- HTTP and REST APIs in a nutshell
- Parsing JSON with kotlinx.serialization
- Defining an API interface with Retrofit
- The `INTERNET` permission
- Handling errors and loading states properly
- Logging network traffic with OkHttp
:::

## HTTP & REST in 60 seconds

Apps talk to servers over **HTTP**. A **REST API** exposes data at URLs (*endpoints*). You send a **request** and get a **response**:

| Method | Meaning | Example |
|---|---|---|
| `GET` | Read data | `GET /quotes/random` |
| `POST` | Create something | `POST /posts` with a JSON body |
| `PUT` / `PATCH` | Update | `PATCH /posts/1` |
| `DELETE` | Delete | `DELETE /posts/1` |

The response has a **status code** (`200` OK, `201` Created, `400` bad request, `401` unauthorised, `404` not found, `500` server error) and usually a **JSON** body.

We'll use **[DummyJSON](https://dummyjson.com)**, a free test API that needs no key. Open this in your browser:

```text
https://dummyjson.com/quotes/random
```

You'll get something like:

```json
{
  "id": 378,
  "quote": "If you tell the truth, you don't have to remember anything.",
  "author": "Mark Twain"
}
```

Let's make the Quote app from Lesson 20 load **real** quotes.

## Setup

```toml title="gradle/libs.versions.toml"
[versions]
retrofit = "3.0.0"
okhttp = "4.12.0"
kotlinxSerialization = "1.11.0"

[libraries]
retrofit = { group = "com.squareup.retrofit2", name = "retrofit", version.ref = "retrofit" }
retrofit-kotlinx-serialization = { group = "com.squareup.retrofit2", name = "converter-kotlinx-serialization", version.ref = "retrofit" }
okhttp-logging = { group = "com.squareup.okhttp3", name = "logging-interceptor", version.ref = "okhttp" }
kotlinx-serialization-json = { group = "org.jetbrains.kotlinx", name = "kotlinx-serialization-json", version.ref = "kotlinxSerialization" }

[plugins]
kotlin-serialization = { id = "org.jetbrains.kotlin.plugin.serialization", version.ref = "kotlin" }
```

```kts title="app/build.gradle.kts"
plugins {
    alias(libs.plugins.kotlin.serialization)   // + `apply false` in the project-level file
}

dependencies {
    implementation(libs.retrofit)
    implementation(libs.retrofit.kotlinx.serialization)
    implementation(libs.okhttp.logging)
    implementation(libs.kotlinx.serialization.json)
}
```

**Retrofit** turns an HTTP API into a Kotlin interface. **OkHttp** is the HTTP client underneath it. **kotlinx.serialization** converts JSON ↔ Kotlin classes.

### The INTERNET permission

Without this line your app can't access the network at all, and you'll get a `SecurityException` or `UnknownHostException`:

```xml title="AndroidManifest.xml"
<manifest ...>
    <uses-permission android:name="android.permission.INTERNET" />
    <application ...>
```

`INTERNET` is a *normal* permission: it's granted automatically at install time, with no user prompt.

## Step 1: model the JSON

Create a class whose properties match the JSON fields:

```kotlin title="data/remote/QuoteDto.kt"
@Serializable
data class QuoteDto(
    val id: Int,
    val quote: String,
    val author: String
)
```

- `@Serializable` makes the compiler plugin generate the JSON parsing code.
- *DTO* = Data Transfer Object: a class that mirrors the network format exactly.
- If a JSON name isn't a nice Kotlin name, rename it: `@SerialName("image_url") val imageUrl: String`.
- Give optional fields default values: `val tags: List<String> = emptyList()`.

For a list response like `{ "quotes": [ … ], "total": 1454 }`, model the wrapper too:

```kotlin
@Serializable
data class QuoteListResponse(
    val quotes: List<QuoteDto>,
    val total: Int
)
```

## Step 2: the API interface

```kotlin title="data/remote/QuoteApi.kt"
interface QuoteApi {

    @GET("quotes/random")
    suspend fun getRandomQuote(): QuoteDto

    @GET("quotes")
    suspend fun getQuotes(
        @Query("limit") limit: Int = 20,     // → /quotes?limit=20&skip=0
        @Query("skip") skip: Int = 0
    ): QuoteListResponse

    @GET("quotes/{id}")
    suspend fun getQuote(@Path("id") id: Int): QuoteDto    // → /quotes/5
}
```

That's it. No HTTP code! Retrofit generates the implementation. Because the functions are `suspend`, Retrofit runs the request **off the main thread** automatically.

| Annotation | Purpose |
|---|---|
| `@GET("path")`, `@POST`, `@PUT`, `@PATCH`, `@DELETE` | HTTP method + relative path |
| `@Path("id")` | Fills `{id}` in the path |
| `@Query("q")` | Adds `?q=value` |
| `@Body` | Sends an object as the JSON request body |
| `@Header("Authorization")` | Adds a header |

## Step 3: build Retrofit

```kotlin title="data/remote/NetworkModule.kt (manual version)"
object Network {
    private val json = Json {
        ignoreUnknownKeys = true     // ⚠️ important: don't crash on extra fields
        coerceInputValues = true     // use defaults for nulls in non-null fields
    }

    private val client = OkHttpClient.Builder()
        .addInterceptor(HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY   // log requests & responses to Logcat
        })
        .build()

    val quoteApi: QuoteApi = Retrofit.Builder()
        .baseUrl("https://dummyjson.com/")            // must end with "/"
        .client(client)
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()
        .create(QuoteApi::class.java)
}
```

(In a Hilt app you'd put these in `@Provides` functions, exactly as in Lesson 22.)

:::danger `ignoreUnknownKeys = true`
By default kotlinx.serialization **throws** if the JSON contains a field your class doesn't declare. APIs add fields all the time, so without this option your app breaks when the server changes. Always enable it for network JSON.
:::

:::warning Logging in release builds
`Level.BODY` logs everything, including tokens and personal data. Only enable it in debug builds: `level = if (BuildConfig.DEBUG) Level.BODY else Level.NONE` (enable `buildFeatures { buildConfig = true }` to generate `BuildConfig`).
:::

## Step 4: repository with error handling

Network calls fail: no connection, timeouts, server errors. **Never** let those exceptions crash the app. Catch them in the data layer and return something the UI can display:

```kotlin title="data/QuoteRepository.kt"
data class Quote(val text: String, val author: String)

fun QuoteDto.toQuote() = Quote(text = quote, author = author)

interface QuoteRepository {
    suspend fun getRandomQuote(): Result<Quote>
}

class NetworkQuoteRepository(private val api: QuoteApi) : QuoteRepository {
    override suspend fun getRandomQuote(): Result<Quote> = try {
        Result.success(api.getRandomQuote().toQuote())
    } catch (e: IOException) {                  // no internet, timeout
        Result.failure(e)
    } catch (e: HttpException) {                // 4xx / 5xx response
        Result.failure(e)
    } catch (e: SerializationException) {       // JSON didn't match
        Result.failure(e)
    }
}
```

Kotlin's built-in `Result<T>` holds either a value or an exception.

:::note Catching `CancellationException`
Avoid `catch (e: Exception)` around suspend calls: it also catches `CancellationException`, which coroutines use to cancel, and swallowing it breaks structured concurrency. Catch specific exceptions as above, or rethrow `CancellationException` if you must catch broadly.
:::

## Step 5: ViewModel and UI

```kotlin title="ui/QuoteViewModel.kt"
class QuoteViewModel(
    private val repository: QuoteRepository = NetworkQuoteRepository(Network.quoteApi)
) : ViewModel() {

    private val _uiState = MutableStateFlow<QuoteUiState>(QuoteUiState.Loading)
    val uiState = _uiState.asStateFlow()

    init { loadQuote() }

    fun loadQuote() {
        _uiState.value = QuoteUiState.Loading
        viewModelScope.launch {
            repository.getRandomQuote()
                .onSuccess { _uiState.value = QuoteUiState.Success(it.text, it.author) }
                .onFailure { e ->
                    _uiState.value = QuoteUiState.Error(
                        when (e) {
                            is IOException -> "No internet connection. Check your network and retry."
                            is HttpException -> "Server error (${e.code()}). Please try later."
                            else -> "Something went wrong."
                        }
                    )
                }
        }
    }
}
```

The `QuoteScreen` from Lesson 20 works unchanged, because the UI doesn't care where data comes from. That's the payoff of the architecture. Run the app: real quotes! Turn on airplane mode and press Retry to see the error state.

:::tip Use Hilt in real apps
The default parameter `= NetworkQuoteRepository(Network.quoteApi)` is a quick shortcut for learning. With Hilt you'd write `@HiltViewModel class QuoteViewModel @Inject constructor(private val repository: QuoteRepository)` and provide the API in a module. The capstone does exactly that.
:::

## Sending data (POST)

```kotlin
@Serializable
data class NewPost(val title: String, val userId: Int)

@Serializable
data class PostDto(val id: Int, val title: String, val userId: Int)

interface PostApi {
    @POST("posts/add")
    suspend fun addPost(@Body post: NewPost): PostDto
}
```

## Debugging network calls

- **Logcat** (filter by `okhttp`) shows the logging interceptor's output.
- **App Inspection → Network Inspector** in Android Studio shows every request, response and timing visually.
- Test endpoints in your browser or with `curl` first to check the JSON shape.

## Recap

:::recap
- Add `INTERNET` permission to the manifest.
- `@Serializable` DTOs mirror the JSON; use `ignoreUnknownKeys = true`.
- A Retrofit interface with `suspend` functions + annotations describes the API.
- Catch `IOException`, `HttpException` and `SerializationException` in the repository; never crash.
- Map DTOs to app models; the UI shows Loading / Success / Error.
:::

## Practice

:::exercise
1. Add a **list screen** that loads 30 quotes with `getQuotes(limit = 30)` and shows them in a `LazyColumn` of cards (quote + author).
2. Add **pull-to-refresh** by wrapping the list in `PullToRefreshBox(isRefreshing = …, onRefresh = …)` that loads a random page (`skip = (0..1400).random()`).
3. Show a friendly error with a Retry button if loading fails.
:::

:::solution Show solution (ViewModel + Screen)
```kotlin
data class QuotesUiState(
    val quotes: List<Quote> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null
)

class QuotesViewModel(
    private val api: QuoteApi = Network.quoteApi
) : ViewModel() {
    private val _uiState = MutableStateFlow(QuotesUiState())
    val uiState = _uiState.asStateFlow()

    init { refresh() }

    fun refresh() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                val page = api.getQuotes(limit = 30, skip = (0..1400).random())
                _uiState.update { it.copy(quotes = page.quotes.map { q -> q.toQuote() }, isLoading = false) }
            } catch (e: IOException) {
                _uiState.update { it.copy(isLoading = false, error = "No connection") }
            } catch (e: HttpException) {
                _uiState.update { it.copy(isLoading = false, error = "Server error ${e.code()}") }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QuotesScreen(uiState: QuotesUiState, onRefresh: () -> Unit) {
    PullToRefreshBox(isRefreshing = uiState.isLoading, onRefresh = onRefresh, modifier = Modifier.fillMaxSize()) {
        when {
            uiState.error != null && uiState.quotes.isEmpty() -> Column(
                Modifier.fillMaxSize(), verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(uiState.error)
                Button(onClick = onRefresh) { Text("Retry") }
            }
            else -> LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(uiState.quotes, key = { it.text }) { q ->
                    Card(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(16.dp)) {
                            Text("“${q.text}”", style = MaterialTheme.typography.bodyLarge)
                            Text("— ${q.author}", style = MaterialTheme.typography.labelLarge)
                        }
                    }
                }
            }
        }
    }
}
```
:::

## Check your understanding

```quiz
Q: Your app crashes with `UnknownHostException` / `SecurityException` on the first request. What's the most likely missing piece?
- [ ] A Retrofit converter
- [x] The INTERNET permission in AndroidManifest.xml
- [ ] A coroutine scope
- [ ] Hilt
> Without `<uses-permission android:name="android.permission.INTERNET"/>` the app can't open network sockets.

Q: The API adds a new field `"likes": 12` and your app starts crashing. What's the fix?
- [ ] Add every possible field to the DTO
- [x] Configure `Json { ignoreUnknownKeys = true }`
- [ ] Use Gson instead
- [ ] Catch the exception in the composable
> By default unknown keys throw; ignoreUnknownKeys makes parsing tolerant of API additions.

Q: How do you declare `GET /users/42/posts?limit=5` in Retrofit?
- [ ] `@GET("users/42/posts?limit=5") suspend fun posts()`
- [x] `@GET("users/{id}/posts") suspend fun posts(@Path("id") id: Int, @Query("limit") limit: Int)`
- [ ] `@GET suspend fun posts(url: String)`
- [ ] `@POST("users/{id}/posts")`
> @Path fills placeholders in the path; @Query appends query parameters.

Q: Why is `catch (e: Exception)` around suspend calls discouraged?
- [ ] It's slower
- [x] It also catches CancellationException, which can break coroutine cancellation
- [ ] It doesn't catch IOExceptions
- [ ] Kotlin doesn't allow it
> Catch specific exceptions, or rethrow CancellationException.
```
