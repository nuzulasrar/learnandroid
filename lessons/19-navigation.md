---
id: navigation
title: Navigation Between Screens
part: 4
minutes: 40
summary: Real apps have many screens. Use Navigation Compose with type-safe routes to move between screens, pass arguments, manage the back stack and add a bottom navigation bar.
---

:::goals
- The single-Activity architecture
- Setting up Navigation Compose: `NavController`, `NavHost`, routes
- **Type-safe routes** with `@Serializable`
- Passing arguments between screens
- The back stack: popping, `popUpTo`, `launchSingleTop`
- A bottom `NavigationBar` with multiple tabs
:::

## One Activity, many screens

Modern Compose apps typically use a **single Activity**. Each "screen" is just a composable, and a **navigation library** swaps which composable is shown and keeps a **back stack**, so the system Back gesture returns to the previous screen.

<div class="diagram"><div class="flow">
<div>Home</div><div class="arrow">→</div><div>Recipe list</div><div class="arrow">→</div><div class="hl">Recipe detail<small>top of the back stack</small></div>
</div><div class="diagram-caption">Pressing Back pops the top screen off the stack.</div></div>

## Setup

Navigation Compose's type-safe API uses **kotlinx.serialization** to define routes, so you add two things: the navigation library and the serialization plugin.

```toml title="gradle/libs.versions.toml"
[versions]
navigationCompose = "2.10.2"
kotlinxSerialization = "1.11.0"

[libraries]
androidx-navigation-compose = { group = "androidx.navigation", name = "navigation-compose", version.ref = "navigationCompose" }
kotlinx-serialization-json = { group = "org.jetbrains.kotlinx", name = "kotlinx-serialization-json", version.ref = "kotlinxSerialization" }

[plugins]
kotlin-serialization = { id = "org.jetbrains.kotlin.plugin.serialization", version.ref = "kotlin" }
```

```kts title="app/build.gradle.kts"
plugins {
    // ...existing plugins
    alias(libs.plugins.kotlin.serialization)
}

dependencies {
    implementation(libs.androidx.navigation.compose)
    implementation(libs.kotlinx.serialization.json)
}
```

Also add the plugin to the **project-level** `build.gradle.kts` with `apply false`:

```kts title="build.gradle.kts (project)"
plugins {
    // ...existing
    alias(libs.plugins.kotlin.serialization) apply false
}
```

Sync, and you're ready.

:::note Navigation 3
Google has also released **Navigation 3**, a newer library where *you* own the back stack as a plain list of keys. It's a great fit for adaptive layouts. The concepts in this lesson (routes, arguments, back stack) transfer directly. We use Navigation Compose here because it's the most widely used in existing apps and tutorials.
:::

## Define your routes

A **route** identifies a destination. With type-safe navigation, routes are Kotlin types:

```kotlin title="navigation/Routes.kt"
import kotlinx.serialization.Serializable

@Serializable
object Home                               // a screen with no arguments

@Serializable
data class RecipeDetail(val recipeId: Int)   // a screen that needs an argument

@Serializable
object Settings
```

## Build the NavHost

The `NavHost` maps each route to a composable. The `NavController` performs navigation.

```kotlin title="navigation/AppNavHost.kt"
@Composable
fun AppNavHost(modifier: Modifier = Modifier) {
    val navController = rememberNavController()

    NavHost(
        navController = navController,
        startDestination = Home,
        modifier = modifier
    ) {
        composable<Home> {
            HomeScreen(
                onRecipeClick = { id -> navController.navigate(RecipeDetail(recipeId = id)) },
                onSettingsClick = { navController.navigate(Settings) }
            )
        }
        composable<RecipeDetail> { backStackEntry ->
            val route: RecipeDetail = backStackEntry.toRoute()
            RecipeDetailScreen(
                recipeId = route.recipeId,
                onBack = { navController.popBackStack() }
            )
        }
        composable<Settings> {
            SettingsScreen(onBack = { navController.navigateUp() })
        }
    }
}
```

And call it from `MainActivity`:

```kotlin
setContent {
    RecipeTheme {
        AppNavHost()
    }
}
```

### Screens don't know about the NavController

Notice that `HomeScreen` receives `onRecipeClick: (Int) -> Unit`, not the `navController`. This is **state hoisting for navigation**: screens only report *what happened*, and the NavHost decides *where to go*. The result: screens are reusable, previewable and testable without a navigation setup.

```kotlin
@Composable
fun HomeScreen(onRecipeClick: (Int) -> Unit, onSettingsClick: () -> Unit) {
    Column(Modifier.padding(16.dp)) {
        Text("Home", style = MaterialTheme.typography.headlineMedium)
        listOf(1 to "Pancakes", 2 to "Ramen", 3 to "Tacos").forEach { (id, name) ->
            TextButton(onClick = { onRecipeClick(id) }) { Text(name) }
        }
        Button(onClick = onSettingsClick) { Text("Settings") }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RecipeDetailScreen(recipeId: Int, onBack: () -> Unit) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Recipe #$recipeId") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        Text("Details for recipe $recipeId", Modifier.padding(padding).padding(16.dp))
    }
}
```

## Passing arguments: keep them small

Pass **IDs**, not whole objects. The destination then loads the full data (usually in its ViewModel, from a repository). Why?

- Arguments are saved in the back stack for process death, and large objects bloat it.
- The data might change; the ID stays valid.
- Deep links (opening a screen from a URL or notification) can only provide simple values.

In a ViewModel you can read route arguments from `SavedStateHandle`, which you'll use in the next lessons:

```kotlin
class RecipeDetailViewModel(savedStateHandle: SavedStateHandle) : ViewModel() {
    private val recipeId = savedStateHandle.toRoute<RecipeDetail>().recipeId
}
```

## Managing the back stack

```kotlin
navController.navigate(RecipeDetail(5))     // push a destination
navController.popBackStack()                 // go back one screen
navController.navigateUp()                   // "up" arrow, usually same as back

// After login, go to Home and remove Login from the stack
// so Back doesn't return to the login screen:
navController.navigate(Home) {
    popUpTo<Login> { inclusive = true }
}

// Avoid stacking multiple copies of the same destination
navController.navigate(Settings) {
    launchSingleTop = true
}
```

## Bottom navigation bar

For apps with top-level sections (e.g. *Home*, *Favourites*, *Profile*), use a Material `NavigationBar`:

```kotlin title="MainScreen.kt"
@Serializable object HomeTab
@Serializable object FavoritesTab
@Serializable object ProfileTab

data class TopLevelRoute<T : Any>(val label: String, val route: T, val icon: ImageVector)

val topLevelRoutes = listOf(
    TopLevelRoute("Home", HomeTab, Icons.Default.Home),
    TopLevelRoute("Favourites", FavoritesTab, Icons.Default.Favorite),
    TopLevelRoute("Profile", ProfileTab, Icons.Default.Person)
)

@Composable
fun MainScreen() {
    val navController = rememberNavController()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = backStackEntry?.destination

    Scaffold(
        bottomBar = {
            NavigationBar {
                topLevelRoutes.forEach { item ->
                    val selected = currentDestination?.hierarchy?.any {
                        it.hasRoute(item.route::class)
                    } == true
                    NavigationBarItem(
                        selected = selected,
                        onClick = {
                            navController.navigate(item.route) {
                                // Pop up to the start destination to avoid building a huge stack
                                popUpTo(navController.graph.findStartDestination().id) {
                                    saveState = true
                                }
                                launchSingleTop = true   // don't create duplicate copies
                                restoreState = true      // restore tab state when reselected
                            }
                        },
                        icon = { Icon(item.icon, contentDescription = null) },
                        label = { Text(item.label) }
                    )
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = HomeTab,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable<HomeTab> { Text("Home", Modifier.padding(16.dp)) }
            composable<FavoritesTab> { Text("Favourites", Modifier.padding(16.dp)) }
            composable<ProfileTab> { Text("Profile", Modifier.padding(16.dp)) }
        }
    }
}
```

The `popUpTo` + `saveState` + `restoreState` combination gives the behaviour users expect: each tab remembers its own scroll position and sub-screens, and pressing Back from any tab returns to Home and then exits.

:::tip Adaptive navigation
On tablets and foldables, a bottom bar wastes space. The `NavigationSuiteScaffold` from the `material3-adaptive-navigation-suite` library automatically shows a bottom bar, navigation rail or drawer depending on window size.
:::

## Recap

:::recap
- Single Activity + a `NavHost` of composable destinations.
- Routes are `@Serializable` objects/data classes; read arguments with `toRoute()`.
- Screens receive navigation **callbacks**, not the `NavController`.
- Pass IDs, not objects.
- `popUpTo`, `launchSingleTop` and `saveState/restoreState` control the back stack.
:::

## Practice

:::exercise
Build a three-screen app:

1. **ListScreen** shows 10 items ("Item 1" … "Item 10").
2. Tapping an item opens **DetailScreen(itemId)** showing the ID, with a back arrow in a `TopAppBar`.
3. DetailScreen has an "Edit" button that opens **EditScreen(itemId)**. EditScreen has a "Save" button that returns **straight to the list**, skipping the detail screen. (Hint: `popBackStack<ListRoute>(inclusive = false)`.)
:::

:::solution Show solution
```kotlin
@Serializable object ListRoute
@Serializable data class DetailRoute(val itemId: Int)
@Serializable data class EditRoute(val itemId: Int)

@Composable
fun ExerciseNavHost() {
    val nav = rememberNavController()
    NavHost(nav, startDestination = ListRoute) {
        composable<ListRoute> {
            LazyColumn {
                items((1..10).toList()) { id ->
                    ListItem(
                        headlineContent = { Text("Item $id") },
                        modifier = Modifier.clickable { nav.navigate(DetailRoute(id)) }
                    )
                }
            }
        }
        composable<DetailRoute> { entry ->
            val id = entry.toRoute<DetailRoute>().itemId
            SimpleScreen(title = "Item $id", onBack = { nav.popBackStack() }) {
                Button(onClick = { nav.navigate(EditRoute(id)) }) { Text("Edit") }
            }
        }
        composable<EditRoute> { entry ->
            val id = entry.toRoute<EditRoute>().itemId
            SimpleScreen(title = "Edit item $id", onBack = { nav.popBackStack() }) {
                Button(onClick = { nav.popBackStack<ListRoute>(inclusive = false) }) { Text("Save") }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SimpleScreen(title: String, onBack: () -> Unit, content: @Composable () -> Unit) {
    Scaffold(topBar = {
        TopAppBar(
            title = { Text(title) },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                }
            }
        )
    }) { padding ->
        Box(Modifier.padding(padding).padding(16.dp)) { content() }
    }
}
```
:::

## Check your understanding

```quiz
Q: How do you define a destination that needs a `userId` argument with type-safe navigation?
- [ ] `composable("user/{userId}")`
- [x] `@Serializable data class UserRoute(val userId: String)`
- [ ] `object UserRoute(userId: String)`
- [ ] `navController.addArgument("userId")`
> Routes are serializable types; arguments are constructor properties.

Q: Why pass `onRecipeClick: (Int) -> Unit` to a screen instead of the NavController?
- [ ] NavController can't be passed as a parameter
- [x] It decouples the screen from navigation, making it reusable, previewable and testable
- [ ] Lambdas are faster
- [ ] It's required by Compose
> Screens report events; the NavHost decides where to navigate.

Q: After a successful login you navigate to Home. How do you stop Back from returning to Login?
- [ ] Call finish()
- [x] `navigate(Home) { popUpTo<Login> { inclusive = true } }`
- [ ] Disable the Back button
- [ ] `navigate(Home) { launchSingleTop = true }`
> popUpTo removes destinations from the back stack; inclusive also removes Login itself.

Q: Should you pass a full `Recipe` object as a navigation argument?
- [ ] Yes, always
- [x] No. Pass its ID and load the data at the destination
- [ ] Only if it's a data class
- [ ] Only on Android 14+
> IDs keep the back stack small, stay valid if data changes, and work with deep links.
```
