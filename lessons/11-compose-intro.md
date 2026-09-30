---
id: compose-intro
title: Thinking in Compose
part: 3
minutes: 30
summary: Jetpack Compose is Android's modern UI toolkit. Learn the declarative mindset, write composable functions, and understand recomposition, the idea everything else builds on.
---

:::goals
- Imperative vs. declarative UI, and why Compose is declarative
- How to write and preview `@Composable` functions
- What **recomposition** is
- The golden rules of composable functions
- Your first interactive UI with `Text` and `Button`
:::

## Imperative vs. declarative UI

The old Android UI system (Views, XML) is **imperative**: you build the UI once, then *manually change* it whenever data changes:

```kotlin
// Imperative (old View system)
val label = findViewById<TextView>(R.id.label)
button.setOnClickListener {
    count++
    label.text = "Clicked $count times"   // YOU must remember to update the UI
    if (count > 5) label.setTextColor(Color.RED)
}
```

As apps grow, keeping every widget in sync with the data becomes a major source of bugs.

**Compose is declarative**: you write a function that *describes* what the UI should look like **for the current data**. When the data changes, Compose calls your function again and updates the screen for you.

```kotlin
// Declarative (Compose)
@Composable
fun ClickCounter(count: Int, onClick: () -> Unit) {
    Button(onClick = onClick) {
        Text(
            text = "Clicked $count times",
            color = if (count > 5) Color.Red else Color.Unspecified
        )
    }
}
```

:::analogy
Imperative UI is giving someone step-by-step directions ("turn left, walk 200 m, turn right…"). Declarative UI is giving them the destination address. You describe **what** you want; Compose figures out **how** to get the screen there.
:::

The core idea of Compose fits in one line:

<div class="diagram"><div class="flow"><div class="hl">State<small>your data</small></div><div class="arrow">→</div><div>Composable functions<small>UI = f(state)</small></div><div class="arrow">→</div><div class="hl">UI on screen</div></div><div class="diagram-caption">UI is a function of state. Change the state and the UI follows.</div></div>

## Composable functions

A composable is a regular Kotlin function annotated with `@Composable`:

```kotlin title="Greeting.kt"
@Composable
fun Greeting(name: String) {
    Text(text = "Hello, $name!")
}
```

Things to notice:

- **Naming**: composables that emit UI are named with a **capital letter** and a noun (`Greeting`, `ProfileCard`), unlike normal functions.
- **They return `Unit`**: they don't return a View object. They *emit* UI into a tree that Compose manages.
- **They take data as parameters**: everything they need to display comes in as arguments.
- They can only be called from other composables (or `setContent`).

Composables are built by **combining other composables**:

```kotlin
@Composable
fun WelcomeScreen() {
    Column {
        Greeting("Ada")
        Greeting("Grace")
        Text("Let's build something great.")
    }
}
```

## Previews

Add `@Preview` to a composable **with no parameters** (or with default values) to see it in Android Studio's Split/Design view:

```kotlin
@Preview(showBackground = true, name = "Welcome – light")
@Composable
fun WelcomeScreenPreview() {
    MyAppTheme {
        WelcomeScreen()
    }
}

@Preview(showBackground = true, uiMode = Configuration.UI_MODE_NIGHT_YES, name = "Welcome – dark")
@Composable
fun WelcomeScreenDarkPreview() {
    MyAppTheme { WelcomeScreen() }
}
```

Useful `@Preview` parameters: `showBackground`, `showSystemUi` (draws a phone frame), `uiMode` (dark mode), `fontScale` (large text), `widthDp`/`heightDp`, `device`, and `locale`.

:::tip Interactive mode
In the preview panel, click the **Start Interactive Mode** icon on a preview to click buttons and type into fields without running the app.
:::

## Recomposition

When data a composable reads changes, Compose re-runs (**recomposes**) that composable to produce updated UI. Compose is smart: it only re-runs the composables whose inputs actually changed and skips the rest.

Here's a complete, interactive counter. Type it into your `MainActivity.kt` and run it:

```kotlin title="MainActivity.kt"
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            HelloAndroidTheme {
                Scaffold(modifier = Modifier.fillMaxSize()) { innerPadding ->
                    Counter(modifier = Modifier.padding(innerPadding))
                }
            }
        }
    }
}

@Composable
fun Counter(modifier: Modifier = Modifier) {
    var count by remember { mutableStateOf(0) }   // state Compose can observe

    Column(modifier = modifier.padding(24.dp)) {
        Text(text = "You clicked $count times", fontSize = 24.sp)
        Button(onClick = { count++ }) {             // changing state → recomposition
            Text("Click me")
        }
    }
}
```

What happens when you tap the button:

1. `count++` changes the state.
2. Compose notices that `Counter` *reads* `count`, so it schedules a recomposition.
3. `Counter` runs again with the new value and the `Text` shows the new number.

You never told the `Text` to update. You changed the **state**, and the UI followed. We'll dig into `remember` and `mutableStateOf` in Lesson 14; for now, just enjoy the magic. ✨

:::note Imports
If names like `remember`, `mutableStateOf`, `dp` or `sp` show in red, press [[Alt]]/[[Option]] + [[Enter]] on each one to import it. For `var count by remember { … }` you need both `androidx.compose.runtime.getValue` and `androidx.compose.runtime.setValue`. Android Studio usually offers them together.
:::

## The rules of composable functions

Because Compose may call your composables **often, in any order, and even skip them**, they must follow a few rules:

1. **Fast**: they may run every frame during an animation. Never do slow work (network, database, heavy computation) directly in a composable.
2. **Free of side effects**: don't modify variables outside the function, write to files, or start network calls while composing. (Lesson 17 shows the proper tools for side effects.)
3. **Idempotent**: same inputs → same UI. The output should depend only on parameters and state.
4. **Order-independent**: don't assume sibling composables run in a certain order.

```kotlin
// ❌ Don't do this
var clicks = 0
@Composable
fun BadCounter() {
    clicks++                         // side effect: runs on every recomposition!
    val data = api.fetchUsers()      // slow work inside a composable!
    Text("Rendered $clicks times")
}
```

## Anatomy of a typical composable

```kotlin
@Composable
fun ProfileCard(
    name: String,                     // 1. data it displays
    isFollowing: Boolean,
    onFollowClick: () -> Unit,        // 2. events it reports (lambdas)
    modifier: Modifier = Modifier     // 3. a Modifier, always last-with-default
) {
    Row(modifier = modifier) {        // 4. the modifier goes on the root element
        Text(name)
        Button(onClick = onFollowClick) {
            Text(if (isFollowing) "Following" else "Follow")
        }
    }
}
```

This shape (**data in, events out, optional modifier**) is the convention for every reusable composable. You'll write hundreds of them.

## Recap

:::recap
- Compose is **declarative**: describe the UI for the current state; Compose keeps the screen in sync.
- `@Composable` functions emit UI, take data as parameters, and are named like nouns.
- `@Preview` renders composables in Android Studio.
- **Recomposition** re-runs composables whose state changed.
- Composables must be fast, side-effect free and idempotent.
:::

## Practice

:::exercise
1. Create a composable `BusinessCard(name: String, title: String)` that shows two `Text`s in a `Column`. Add a preview.
2. Modify `Counter` so it has a second button, **Reset**, that sets the count back to 0.
3. Make the counter text turn red (`color = Color.Red`) when the count is above 10.
:::

:::solution Show solution
```kotlin
@Composable
fun BusinessCard(name: String, title: String, modifier: Modifier = Modifier) {
    Column(modifier = modifier) {
        Text(text = name, fontSize = 28.sp)
        Text(text = title)
    }
}

@Preview(showBackground = true)
@Composable
fun BusinessCardPreview() {
    BusinessCard(name = "Ada Lovelace", title = "Android Developer")
}

@Composable
fun Counter(modifier: Modifier = Modifier) {
    var count by remember { mutableStateOf(0) }

    Column(modifier = modifier.padding(24.dp)) {
        Text(
            text = "You clicked $count times",
            fontSize = 24.sp,
            color = if (count > 10) Color.Red else Color.Unspecified
        )
        Button(onClick = { count++ }) { Text("Click me") }
        Button(onClick = { count = 0 }) { Text("Reset") }
    }
}
```
:::

## Check your understanding

```quiz
Q: What does "declarative UI" mean?
- [ ] You write UI in XML files
- [x] You describe what the UI should look like for the current state, and the framework updates the screen when state changes
- [ ] You manually update each widget when data changes
- [ ] UI is generated by AI
> In Compose, UI = f(state). You don't mutate widgets; you change state.

Q: What is recomposition?
- [ ] Rebuilding the whole app from scratch
- [ ] Compiling Kotlin code again
- [x] Compose re-running composables whose inputs changed to update the UI
- [ ] Restarting the Activity
> Compose re-invokes only the composables affected by a state change.

Q: Why must you never make a network call directly inside a composable function body?
- [ ] Composables can't access the internet
- [x] Composables can run very often (even every frame), so slow work or side effects would run repeatedly and freeze or break the UI
- [ ] Network calls only work in Activities
- [ ] It's allowed, just not recommended for style reasons
> Composables must be fast and side-effect free. Use ViewModels and effect APIs for that kind of work.

Q: By convention, where does the `modifier` parameter go in a reusable composable?
- [ ] First, with no default
- [x] After the required parameters, with a default of `Modifier`, applied to the root element
- [ ] It's never a parameter
- [ ] Inside the lambda
> `modifier: Modifier = Modifier` lets callers customise size, padding and so on without the composable needing to know.
```
