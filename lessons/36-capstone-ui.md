---
id: capstone-ui
title: "Capstone 3: Screens, Navigation & Theme"
part: 8
minutes: 60
summary: Bring RecipeBox to life. Build reusable components, the Home, Detail, Favourites and Settings screens with their ViewModels, a bottom navigation bar, and a theme driven by user settings.
---

:::goals
- Reusable components: `RecipeCard`, `RecipeGrid`, `EmptyState`
- Four screens, each with a Route (ViewModel wiring) and a stateless Screen
- Search with `flatMapLatest` and `SavedStateHandle`
- Bottom navigation plus a detail destination with arguments
- Applying the user's theme settings at the top of the app
:::

:::note About imports
To keep the code readable, import lists are omitted in this lesson. Android Studio adds almost all of them with [[Alt]]/[[Option]] + [[Enter]]. The ones it sometimes can't guess:
- `androidx.compose.runtime.getValue` / `setValue` (for `by` delegates)
- `androidx.lifecycle.compose.collectAsStateWithLifecycle`
- `androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel`
- `androidx.navigation.toRoute`
- `coil3.compose.AsyncImage` and `coil3.request.ImageRequest` / `coil3.request.crossfade`
:::

## 1. Routes & a share helper

```kotlin title="ui/navigation/Routes.kt"
package com.example.recipebox.ui.navigation

import kotlinx.serialization.Serializable

@Serializable object Home
@Serializable object Favorites
@Serializable object Settings
@Serializable data class RecipeDetail(val recipeId: Int)
```

```kotlin title="util/Intents.kt"
package com.example.recipebox.util

fun Context.shareText(text: String) {
    val send = Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_TEXT, text)
    }
    startActivity(Intent.createChooser(send, null))
}
```

## 2. Shared components

```kotlin title="ui/components/RecipeCard.kt"
@Composable
fun RecipeCard(
    recipe: Recipe,
    isFavorite: Boolean,
    onClick: () -> Unit,
    onFavoriteClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(onClick = onClick, modifier = modifier.fillMaxWidth()) {
        Box {
            AsyncImage(
                model = ImageRequest.Builder(LocalContext.current)
                    .data(recipe.imageUrl)
                    .crossfade(true)
                    .build(),
                contentDescription = null,          // the name is shown right below
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(16f / 10f)
                    .background(MaterialTheme.colorScheme.surfaceVariant)
            )
            FilledTonalIconButton(
                onClick = onFavoriteClick,
                modifier = Modifier.align(Alignment.TopEnd).padding(8.dp)
            ) {
                Icon(
                    imageVector = if (isFavorite) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,
                    contentDescription = if (isFavorite) "Remove ${recipe.name} from favourites"
                                         else "Add ${recipe.name} to favourites",
                    tint = if (isFavorite) MaterialTheme.colorScheme.primary else LocalContentColor.current
                )
            }
        }
        Column(Modifier.padding(16.dp)) {
            Text(
                text = recipe.name,
                style = MaterialTheme.typography.titleMedium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(Modifier.height(6.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                MetaItem(Icons.Outlined.Timer, "${recipe.totalMinutes} min")
                MetaItem(Icons.Outlined.Star, "%.1f".format(recipe.rating))
                MetaItem(Icons.Outlined.Public, recipe.cuisine)
            }
        }
    }
}

@Composable
fun MetaItem(icon: ImageVector, text: String, modifier: Modifier = Modifier) {
    Row(modifier, verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, contentDescription = null, modifier = Modifier.size(16.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.width(4.dp))
        Text(text, style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
    }
}

@Composable
fun RecipeGrid(
    recipes: List<Recipe>,
    favoriteIds: Set<Int>,
    onRecipeClick: (Int) -> Unit,
    onFavoriteClick: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    LazyVerticalGrid(
        columns = GridCells.Adaptive(minSize = 280.dp),   // 1 column on phones, more on tablets
        contentPadding = PaddingValues(16.dp),
        horizontalArrangement = Arrangement.spacedBy(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        modifier = modifier.fillMaxSize()
    ) {
        items(recipes, key = { it.id }) { recipe ->
            RecipeCard(
                recipe = recipe,
                isFavorite = recipe.id in favoriteIds,
                onClick = { onRecipeClick(recipe.id) },
                onFavoriteClick = { onFavoriteClick(recipe.id) },
                modifier = Modifier.animateItem()
            )
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun RecipeCardPreview() {
    RecipeBoxTheme(dynamicColor = false) {
        RecipeCard(PreviewData.recipe, isFavorite = true, onClick = {}, onFavoriteClick = {},
            modifier = Modifier.padding(16.dp))
    }
}
```

Previews need sample data, so keep it in one place:

```kotlin title="ui/components/PreviewData.kt"
object PreviewData {
    val recipe = Recipe(
        id = 1, name = "Classic Margherita Pizza", imageUrl = "",
        cuisine = "Italian", difficulty = "Easy", prepMinutes = 20, cookMinutes = 15,
        servings = 4, caloriesPerServing = 300, rating = 4.6,
        tags = listOf("Pizza", "Italian"),
        ingredients = listOf("Pizza dough", "Tomato sauce", "Fresh mozzarella", "Basil"),
        instructions = listOf("Preheat the oven to 245°C.", "Spread sauce on the dough.", "Add cheese and bake 12–15 min.")
    )
    val recipes = List(4) { recipe.copy(id = it + 1, name = "Recipe #${it + 1}") }
}
```

```kotlin title="ui/components/EmptyState.kt"
@Composable
fun EmptyState(
    title: String,
    message: String,
    modifier: Modifier = Modifier,
    icon: ImageVector = Icons.Outlined.Restaurant,
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null
) {
    Column(
        modifier = modifier.fillMaxSize().padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(icon, contentDescription = null, modifier = Modifier.size(64.dp),
            tint = MaterialTheme.colorScheme.primary)
        Spacer(Modifier.height(16.dp))
        Text(title, style = MaterialTheme.typography.titleLarge, textAlign = TextAlign.Center)
        Spacer(Modifier.height(8.dp))
        Text(message, style = MaterialTheme.typography.bodyMedium, textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onSurfaceVariant)
        if (actionLabel != null && onAction != null) {
            Spacer(Modifier.height(20.dp))
            Button(onClick = onAction) { Text(actionLabel) }
        }
    }
}
```

## 3. Home: ViewModel

```kotlin title="ui/home/HomeViewModel.kt"
data class HomeUiState(
    val query: String = "",
    val recipes: List<Recipe> = emptyList(),
    val favoriteIds: Set<Int> = emptySet(),
    val isRefreshing: Boolean = false,
    val errorMessage: String? = null
)

private const val QUERY_KEY = "query"

@OptIn(ExperimentalCoroutinesApi::class)
@HiltViewModel
class HomeViewModel @Inject constructor(
    private val repository: RecipeRepository,
    private val savedStateHandle: SavedStateHandle
) : ViewModel() {

    // Survives rotation AND process death
    private val query: StateFlow<String> = savedStateHandle.getStateFlow(QUERY_KEY, "")
    private val isRefreshing = MutableStateFlow(false)
    private val errorMessage = MutableStateFlow<String?>(null)

    // Whenever the query changes, switch to a new database search
    private val recipes: Flow<List<Recipe>> = query.flatMapLatest { repository.observeRecipes(it) }

    val uiState: StateFlow<HomeUiState> = combine(
        query, recipes, repository.observeFavoriteIds(), isRefreshing, errorMessage
    ) { currentQuery, results, favoriteIds, refreshing, error ->
        HomeUiState(currentQuery, results, favoriteIds, refreshing, error)
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = HomeUiState(isRefreshing = true)
    )

    init {
        refresh()
    }

    fun onQueryChange(newQuery: String) {
        savedStateHandle[QUERY_KEY] = newQuery
    }

    fun refresh() {
        viewModelScope.launch {
            isRefreshing.value = true
            repository.refresh().onFailure {
                errorMessage.value = "Couldn't refresh recipes. Check your connection."
            }
            isRefreshing.value = false
        }
    }

    fun onFavoriteClick(recipeId: Int) {
        viewModelScope.launch { repository.toggleFavorite(recipeId) }
    }

    fun onErrorShown() {
        errorMessage.value = null
    }
}
```

:::tip `flatMapLatest`
`query.flatMapLatest { observeRecipes(it) }` means: *for each new query, start observing that search, and cancel the previous one.* Type "pas" and the "pa" search is cancelled automatically. Because it's a Room `Flow`, results also update live if the cache refreshes while you're searching.
:::

## 4. Home: Screen

```kotlin title="ui/home/HomeScreen.kt"
@Composable
fun HomeRoute(
    onRecipeClick: (Int) -> Unit,
    viewModel: HomeViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    HomeScreen(
        uiState = uiState,
        onQueryChange = viewModel::onQueryChange,
        onRefresh = viewModel::refresh,
        onRecipeClick = onRecipeClick,
        onFavoriteClick = viewModel::onFavoriteClick,
        onErrorShown = viewModel::onErrorShown
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    uiState: HomeUiState,
    onQueryChange: (String) -> Unit,
    onRefresh: () -> Unit,
    onRecipeClick: (Int) -> Unit,
    onFavoriteClick: (Int) -> Unit,
    onErrorShown: () -> Unit
) {
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(uiState.errorMessage) {
        uiState.errorMessage?.let {
            snackbarHostState.showSnackbar(it)
            onErrorShown()
        }
    }

    Scaffold(
        topBar = { TopAppBar(title = { Text("RecipeBox") }) },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { padding ->
        Column(Modifier.padding(padding).fillMaxSize()) {
            SearchField(
                query = uiState.query,
                onQueryChange = onQueryChange,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
            )
            PullToRefreshBox(
                isRefreshing = uiState.isRefreshing,
                onRefresh = onRefresh,
                modifier = Modifier.fillMaxSize()
            ) {
                when {
                    uiState.recipes.isNotEmpty() -> RecipeGrid(
                        recipes = uiState.recipes,
                        favoriteIds = uiState.favoriteIds,
                        onRecipeClick = onRecipeClick,
                        onFavoriteClick = onFavoriteClick
                    )
                    uiState.isRefreshing -> Unit            // the refresh indicator is showing
                    uiState.query.isNotBlank() -> EmptyState(
                        title = "No matches",
                        message = "No recipes match “${uiState.query}”. Try another word."
                    )
                    else -> EmptyState(
                        title = "No recipes yet",
                        message = "We couldn't load recipes. Check your internet connection.",
                        actionLabel = "Try again",
                        onAction = onRefresh
                    )
                }
            }
        }
    }
}

@Composable
private fun SearchField(query: String, onQueryChange: (String) -> Unit, modifier: Modifier = Modifier) {
    val focusManager = LocalFocusManager.current
    OutlinedTextField(
        value = query,
        onValueChange = onQueryChange,
        placeholder = { Text("Search recipes, cuisines, tags…") },
        leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
        trailingIcon = {
            if (query.isNotEmpty()) {
                IconButton(onClick = { onQueryChange("") }) {
                    Icon(Icons.Default.Clear, contentDescription = "Clear search")
                }
            }
        },
        singleLine = true,
        shape = RoundedCornerShape(28.dp),
        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
        keyboardActions = KeyboardActions(onSearch = { focusManager.clearFocus() }),
        modifier = modifier.fillMaxWidth()
    )
}

@Preview(showBackground = true)
@Composable
private fun HomeScreenPreview() {
    RecipeBoxTheme(dynamicColor = false) {
        HomeScreen(
            uiState = HomeUiState(recipes = PreviewData.recipes, favoriteIds = setOf(2)),
            onQueryChange = {}, onRefresh = {}, onRecipeClick = {}, onFavoriteClick = {}, onErrorShown = {}
        )
    }
}
```

## 5. Recipe detail

```kotlin title="ui/detail/DetailViewModel.kt"
data class DetailUiState(
    val recipe: Recipe? = null,
    val isFavorite: Boolean = false,
    val isLoading: Boolean = true
)

@HiltViewModel
class DetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val repository: RecipeRepository
) : ViewModel() {

    private val recipeId: Int = savedStateHandle.toRoute<RecipeDetail>().recipeId

    val uiState: StateFlow<DetailUiState> = combine(
        repository.observeRecipe(recipeId),
        repository.observeFavoriteIds()
    ) { recipe, favoriteIds ->
        DetailUiState(recipe = recipe, isFavorite = recipeId in favoriteIds, isLoading = false)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), DetailUiState())

    fun onFavoriteClick() {
        viewModelScope.launch { repository.toggleFavorite(recipeId) }
    }
}
```

```kotlin title="ui/detail/DetailScreen.kt"
@Composable
fun DetailRoute(onBack: () -> Unit, viewModel: DetailViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current
    DetailScreen(
        uiState = uiState,
        onBack = onBack,
        onFavoriteClick = viewModel::onFavoriteClick,
        onShare = { recipe ->
            context.shareText(
                "🍳 ${recipe.name}: ${recipe.cuisine}, ready in ${recipe.totalMinutes} min.\n" +
                    "Ingredients: ${recipe.ingredients.joinToString()}"
            )
        }
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DetailScreen(
    uiState: DetailUiState,
    onBack: () -> Unit,
    onFavoriteClick: () -> Unit,
    onShare: (Recipe) -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(uiState.recipe?.name.orEmpty(), maxLines = 1, overflow = TextOverflow.Ellipsis) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    uiState.recipe?.let { recipe ->
                        IconButton(onClick = { onShare(recipe) }) {
                            Icon(Icons.Default.Share, contentDescription = "Share recipe")
                        }
                        IconButton(onClick = onFavoriteClick) {
                            Icon(
                                imageVector = if (uiState.isFavorite) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,
                                contentDescription = if (uiState.isFavorite) "Remove from favourites" else "Add to favourites",
                                tint = if (uiState.isFavorite) MaterialTheme.colorScheme.primary else LocalContentColor.current
                            )
                        }
                    }
                }
            )
        }
    ) { padding ->
        when {
            uiState.isLoading -> Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
            uiState.recipe == null -> EmptyState(
                title = "Recipe not found",
                message = "This recipe isn't available offline yet.",
                modifier = Modifier.padding(padding)
            )
            else -> RecipeDetailContent(uiState.recipe, Modifier.padding(padding))
        }
    }
}

@Composable
private fun RecipeDetailContent(recipe: Recipe, modifier: Modifier = Modifier) {
    LazyColumn(modifier = modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 32.dp)) {
        item {
            AsyncImage(
                model = recipe.imageUrl,
                contentDescription = recipe.name,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 360.dp)
                    .aspectRatio(4f / 3f)
                    .background(MaterialTheme.colorScheme.surfaceVariant)
            )
        }
        item {
            Column(Modifier.padding(16.dp)) {
                Text(recipe.name, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(4.dp))
                Text(
                    "${recipe.cuisine} · ${recipe.difficulty}",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(Modifier.height(16.dp))
                FactsRow(recipe)
            }
        }
        item { SectionTitle("Ingredients (${recipe.ingredients.size})") }
        items(recipe.ingredients) { ingredient ->
            Row(Modifier.padding(horizontal = 16.dp, vertical = 4.dp)) {
                Text("•", color = MaterialTheme.colorScheme.primary, modifier = Modifier.width(20.dp))
                Text(ingredient, style = MaterialTheme.typography.bodyLarge)
            }
        }
        item { SectionTitle("Instructions") }
        itemsIndexed(recipe.instructions) { index, step ->
            Row(Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
                Box(
                    modifier = Modifier
                        .size(28.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.primaryContainer),
                    contentAlignment = Alignment.Center
                ) {
                    Text("${index + 1}", style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.onPrimaryContainer)
                }
                Spacer(Modifier.width(12.dp))
                Text(step, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun SectionTitle(text: String) {
    Text(
        text = text,
        style = MaterialTheme.typography.titleLarge,
        modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 24.dp, bottom = 8.dp)
    )
}

@Composable
private fun FactsRow(recipe: Recipe) {
    Surface(color = MaterialTheme.colorScheme.surfaceContainerHigh, shape = MaterialTheme.shapes.large) {
        Row(Modifier.fillMaxWidth().padding(vertical = 12.dp)) {
            Fact(Icons.Outlined.Timer, "${recipe.totalMinutes}", "minutes", Modifier.weight(1f))
            Fact(Icons.Outlined.People, "${recipe.servings}", "servings", Modifier.weight(1f))
            Fact(Icons.Outlined.LocalFireDepartment, "${recipe.caloriesPerServing}", "kcal", Modifier.weight(1f))
            Fact(Icons.Outlined.Star, "%.1f".format(recipe.rating), "rating", Modifier.weight(1f))
        }
    }
}

@Composable
private fun Fact(icon: ImageVector, value: String, label: String, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.semantics(mergeDescendants = true) {},   // TalkBack reads "20 minutes" as one item
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
        Text(value, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}
```

## 6. Favourites

```kotlin title="ui/favorites/FavoritesViewModel.kt"
@HiltViewModel
class FavoritesViewModel @Inject constructor(
    private val repository: RecipeRepository
) : ViewModel() {

    /** null = still loading */
    val favorites: StateFlow<List<Recipe>?> = repository.observeFavorites()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), null)

    fun onFavoriteClick(recipeId: Int) {
        viewModelScope.launch { repository.toggleFavorite(recipeId) }
    }
}
```

```kotlin title="ui/favorites/FavoritesScreen.kt"
@Composable
fun FavoritesRoute(onRecipeClick: (Int) -> Unit, viewModel: FavoritesViewModel = hiltViewModel()) {
    val favorites by viewModel.favorites.collectAsStateWithLifecycle()
    FavoritesScreen(favorites, onRecipeClick, viewModel::onFavoriteClick)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FavoritesScreen(
    favorites: List<Recipe>?,
    onRecipeClick: (Int) -> Unit,
    onFavoriteClick: (Int) -> Unit
) {
    Scaffold(topBar = { TopAppBar(title = { Text("Favourites") }) }) { padding ->
        when {
            favorites == null -> Unit
            favorites.isEmpty() -> EmptyState(
                icon = Icons.Outlined.FavoriteBorder,
                title = "No favourites yet",
                message = "Tap the heart on any recipe to save it here.",
                modifier = Modifier.padding(padding)
            )
            else -> RecipeGrid(
                recipes = favorites,
                favoriteIds = favorites.map { it.id }.toSet(),
                onRecipeClick = onRecipeClick,
                onFavoriteClick = onFavoriteClick,
                modifier = Modifier.padding(padding)
            )
        }
    }
}
```

## 7. Settings

```kotlin title="ui/settings/SettingsViewModel.kt"
@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val repository: SettingsRepository
) : ViewModel() {

    val settings: StateFlow<UserSettings> = repository.settings
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), UserSettings())

    fun setThemeMode(mode: ThemeMode) {
        viewModelScope.launch { repository.setThemeMode(mode) }
    }

    fun setDynamicColor(enabled: Boolean) {
        viewModelScope.launch { repository.setDynamicColor(enabled) }
    }
}
```

```kotlin title="ui/settings/SettingsScreen.kt"
@Composable
fun SettingsRoute(viewModel: SettingsViewModel = hiltViewModel()) {
    val settings by viewModel.settings.collectAsStateWithLifecycle()
    SettingsScreen(settings, viewModel::setThemeMode, viewModel::setDynamicColor)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    settings: UserSettings,
    onThemeModeChange: (ThemeMode) -> Unit,
    onDynamicColorChange: (Boolean) -> Unit
) {
    val supportsDynamic = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S

    Scaffold(topBar = { TopAppBar(title = { Text("Settings") }) }) { padding ->
        Column(Modifier.padding(padding).verticalScroll(rememberScrollState())) {
            Text("Appearance", style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.padding(start = 16.dp, top = 16.dp, bottom = 8.dp))

            Column(Modifier.selectableGroup()) {
                ThemeMode.entries.forEach { mode ->
                    ListItem(
                        headlineContent = {
                            Text(when (mode) {
                                ThemeMode.SYSTEM -> "Follow system"
                                ThemeMode.LIGHT -> "Light"
                                ThemeMode.DARK -> "Dark"
                            })
                        },
                        leadingContent = { RadioButton(selected = settings.themeMode == mode, onClick = null) },
                        modifier = Modifier.selectable(
                            selected = settings.themeMode == mode,
                            onClick = { onThemeModeChange(mode) },
                            role = Role.RadioButton
                        )
                    )
                }
            }

            ListItem(
                headlineContent = { Text("Dynamic colour") },
                supportingContent = {
                    Text(if (supportsDynamic) "Use colours from your wallpaper" else "Requires Android 12 or newer")
                },
                trailingContent = {
                    Switch(
                        checked = settings.dynamicColor && supportsDynamic,
                        onCheckedChange = onDynamicColorChange,
                        enabled = supportsDynamic
                    )
                }
            )

            HorizontalDivider(Modifier.padding(vertical = 8.dp))

            ListItem(
                headlineContent = { Text("About RecipeBox") },
                supportingContent = { Text("Version ${BuildConfig.VERSION_NAME} · Recipes from dummyjson.com") }
            )
        }
    }
}
```

## 8. Navigation & the app shell

```kotlin title="ui/navigation/RecipeBoxNavHost.kt"
@Composable
fun RecipeBoxNavHost(navController: NavHostController, modifier: Modifier = Modifier) {
    NavHost(navController = navController, startDestination = Home, modifier = modifier) {
        composable<Home> {
            HomeRoute(onRecipeClick = { id -> navController.navigate(RecipeDetail(id)) })
        }
        composable<Favorites> {
            FavoritesRoute(onRecipeClick = { id -> navController.navigate(RecipeDetail(id)) })
        }
        composable<Settings> {
            SettingsRoute()
        }
        composable<RecipeDetail> {
            DetailRoute(onBack = { navController.popBackStack() })
        }
    }
}
```

```kotlin title="ui/RecipeBoxApp.kt"
private data class TopLevelDestination<T : Any>(
    val route: T,
    val label: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector
)

private val topLevelDestinations = listOf(
    TopLevelDestination(Home, "Home", Icons.Filled.Home, Icons.Outlined.Home),
    TopLevelDestination(Favorites, "Favourites", Icons.Filled.Favorite, Icons.Outlined.FavoriteBorder),
    TopLevelDestination(Settings, "Settings", Icons.Filled.Settings, Icons.Outlined.Settings)
)

@Composable
fun RecipeBoxApp() {
    val navController = rememberNavController()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = backStackEntry?.destination

    fun isSelected(destination: TopLevelDestination<*>) =
        currentDestination?.hierarchy?.any { it.hasRoute(destination.route::class) } == true

    val showBottomBar = topLevelDestinations.any { isSelected(it) }

    Scaffold(
        contentWindowInsets = WindowInsets(0, 0, 0, 0),   // each screen handles its own insets
        bottomBar = {
            if (showBottomBar) {
                NavigationBar {
                    topLevelDestinations.forEach { destination ->
                        val selected = isSelected(destination)
                        NavigationBarItem(
                            selected = selected,
                            onClick = {
                                navController.navigate(destination.route) {
                                    popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = {
                                Icon(if (selected) destination.selectedIcon else destination.unselectedIcon,
                                    contentDescription = null)
                            },
                            label = { Text(destination.label) }
                        )
                    }
                }
            }
        }
    ) { innerPadding ->
        RecipeBoxNavHost(
            navController = navController,
            modifier = Modifier
                .padding(innerPadding)
                .consumeWindowInsets(innerPadding)   // don't double-pad under the bottom bar
        )
    }
}
```

:::note Nested Scaffolds and insets
The outer Scaffold only provides the bottom bar; each screen has its own Scaffold and TopAppBar. Setting `contentWindowInsets = WindowInsets(0, 0, 0, 0)` on the outer one and calling `consumeWindowInsets(innerPadding)` stops the system bar insets from being applied twice, a very common edge-to-edge bug.
:::

## 9. Theme from settings: MainActivity

```kotlin title="MainViewModel.kt"
@HiltViewModel
class MainViewModel @Inject constructor(
    settingsRepository: SettingsRepository
) : ViewModel() {
    /** null until the settings are loaded from disk */
    val settings: StateFlow<UserSettings?> = settingsRepository.settings
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
}
```

```kotlin title="MainActivity.kt"
@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    private val viewModel: MainViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val settings by viewModel.settings.collectAsStateWithLifecycle()
            val current = settings ?: return@setContent      // avoid flashing the wrong theme

            val darkTheme = when (current.themeMode) {
                ThemeMode.SYSTEM -> isSystemInDarkTheme()
                ThemeMode.LIGHT -> false
                ThemeMode.DARK -> true
            }

            RecipeBoxTheme(darkTheme = darkTheme, dynamicColor = current.dynamicColor) {
                RecipeBoxApp()
            }
        }
    }
}
```

## 10. Run it! 🎉

Run the app and try everything:

- [ ] Recipes load in a grid with photos. Pull down to refresh.
- [ ] Search "pasta", "Italian" or "dessert". Results filter as you type; clear with ✕.
- [ ] Tap a recipe: detail with facts, ingredients and numbered steps. Share it.
- [ ] Heart a few recipes (from the grid and from detail), then open **Favourites**.
- [ ] Switch tabs: each tab keeps its scroll position.
- [ ] Settings: switch to Dark, then Light, then System. The whole app updates instantly and remembers after restart.
- [ ] Rotate the phone, and try a tablet emulator: the grid shows more columns.
- [ ] Enable **airplane mode** and restart: recipes and favourites still work, and pull-to-refresh shows a snackbar.

If something doesn't work, use the debugging techniques from Lesson 32: Logcat, breakpoints in the ViewModels, and the Database Inspector to check the `recipes` and `favorites` tables.

:::exercise Stretch goals
1. Add **filter chips** under the search bar for meal types or cuisines (you'll need to store `mealType` from the API in the entity).
2. Add an animated heart: scale up with a spring when favourited (Lesson 17).
3. Add a **"Surprise me"** FAB on Home that opens a random recipe.
4. Show a **shimmer placeholder** grid during the very first load instead of just the pull-to-refresh spinner.
:::

## Check your understanding

```quiz
Q: Why does `HomeViewModel` keep the search query in `SavedStateHandle` instead of a MutableStateFlow?
- [ ] SavedStateHandle is faster
- [x] So the query also survives process death, not just rotation
- [ ] Hilt requires it
- [ ] MutableStateFlow can't hold strings
> SavedStateHandle persists small UI state through process death.

Q: What does `flatMapLatest` do with the query flow?
- [ ] Combines all queries into one list
- [x] Starts a new database search for each query and cancels the previous search
- [ ] Delays the search by 300 ms
- [ ] Runs every search in parallel
> Only the latest query's results are observed.

Q: Why do both HomeScreen and FavoritesScreen use `RecipeGrid`?
- [ ] Compose requires shared components
- [x] Reusing a stateless component keeps the UI consistent and avoids duplicate code
- [ ] It's faster to compile
- [ ] Grids can only be declared once per app
> Stateless components with data-in/events-out are easy to reuse across screens.
```
