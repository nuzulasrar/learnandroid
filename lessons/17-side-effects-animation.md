---
id: side-effects-animation
title: Side Effects & Animation
part: 3
minutes: 30
summary: Run code safely from composables with LaunchedEffect, rememberCoroutineScope and DisposableEffect, then bring your UI to life with Compose's animation APIs.
---

:::goals
- What a side effect is and why composables need special APIs for them
- `LaunchedEffect` for coroutines tied to composition
- `rememberCoroutineScope` for coroutines started by user events
- `DisposableEffect` for setup/cleanup
- `rememberUpdatedState` and `derivedStateOf` in brief
- Animations: `AnimatedVisibility`, `animate*AsState`, `AnimatedContent`, `Crossfade`, `animateContentSize`
:::

## What's a side effect?

A **side effect** is anything a function does beyond returning its result: starting a network request, showing a snackbar, writing a log, registering a listener. In Lesson 11 we said composables must be free of side effects, because they may run many times, in any order.

But sometimes UI *needs* to trigger an effect: show a snackbar when an error appears, start a timer when a screen opens. Compose provides **effect APIs** that run effects at controlled moments in a composable's lifecycle:

<div class="diagram"><div class="flow">
<div class="hl">Enters composition<small>effects start</small></div><div class="arrow">→</div>
<div>Recomposes 0..n times<small>effects restart only if their keys change</small></div><div class="arrow">→</div>
<div class="hl">Leaves composition<small>effects are cancelled / disposed</small></div>
</div></div>

## `LaunchedEffect`

Runs a **suspend** block when the composable enters the composition, and cancels it when it leaves. If any **key** changes, the old coroutine is cancelled and a new one starts.

```kotlin
@Composable
fun Countdown(from: Int) {
    var remaining by remember(from) { mutableIntStateOf(from) }

    LaunchedEffect(from) {           // restarts if `from` changes
        while (remaining > 0) {
            delay(1000)
            remaining--
        }
    }

    Text(if (remaining > 0) "$remaining" else "Go! 🚀", style = MaterialTheme.typography.displayLarge)
}
```

A very common real use is showing a snackbar when state says there's an error:

```kotlin
@Composable
fun RecipesScreen(errorMessage: String?, onErrorShown: () -> Unit) {
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(errorMessage) {
        if (errorMessage != null) {
            snackbarHostState.showSnackbar(errorMessage)
            onErrorShown()           // tell the state holder it's been handled
        }
    }

    Scaffold(snackbarHost = { SnackbarHost(snackbarHostState) }) { padding -> /* … */ }
}
```

:::tip Choosing keys
Use `LaunchedEffect(Unit)` (or `true`) to run once when the composable appears. Use `LaunchedEffect(someValue)` to re-run whenever that value changes. Wrong keys are the #1 source of effect bugs: missing a key means stale data; too many keys means restarting too often.
:::

## `rememberCoroutineScope`

`LaunchedEffect` is for effects triggered by *composition*. For effects triggered by a **user event**, like a click, you need a scope you can launch from inside a callback:

```kotlin
@Composable
fun SaveButton(snackbarHostState: SnackbarHostState) {
    val scope = rememberCoroutineScope()   // cancelled when this composable leaves

    Button(onClick = {
        scope.launch {                      // ✅ launch from an event handler
            snackbarHostState.showSnackbar("Saved!")
        }
    }) { Text("Save") }
}
```

(You can't call `LaunchedEffect` inside `onClick`: it's a composable, and `onClick` is a plain lambda.)

## `DisposableEffect`

For effects that need **cleanup**, such as registering and unregistering a listener:

```kotlin
@Composable
fun LifecycleLogger() {
    val lifecycleOwner = LocalLifecycleOwner.current

    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            Log.d("Lifecycle", "Event: $event")
        }
        lifecycleOwner.lifecycle.addObserver(observer)

        onDispose {                                   // required: runs when leaving
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }
}
```

## Two helpers worth knowing

- **`rememberUpdatedState(value)`**: lets a long-running effect always see the *latest* value of a parameter without restarting the effect. For example, a splash screen with `LaunchedEffect(Unit) { delay(2000); currentOnTimeout() }`.
- **`derivedStateOf { }`**: creates state computed from other state that only notifies when the *result* changes (you used it for the scroll-to-top button in Lesson 15).

:::note You'll need these less than you think
Most effects in a well-architected app live in the **ViewModel** (Part 4), triggered by events. Composables mostly just display state. Reach for effect APIs when something truly belongs to the UI: snackbars, focus, animations, listeners.
:::

## Animation

Compose makes animation remarkably easy. Here are the APIs you'll use 90% of the time.

### `AnimatedVisibility`: animate appearing/disappearing

```kotlin
@Composable
fun ExpandableTip() {
    var visible by remember { mutableStateOf(false) }

    Column {
        TextButton(onClick = { visible = !visible }) {
            Text(if (visible) "Hide tip" else "Show tip")
        }
        AnimatedVisibility(
            visible = visible,
            enter = fadeIn() + expandVertically(),
            exit = fadeOut() + shrinkVertically()
        ) {
            Text("💡 Salt your pasta water generously.", Modifier.padding(16.dp))
        }
    }
}
```

### `animate*AsState`: animate a single value

When the target changes, the value animates smoothly to it:

```kotlin
@Composable
fun FavoriteButton(isFavorite: Boolean, onToggle: () -> Unit) {
    val scale by animateFloatAsState(
        targetValue = if (isFavorite) 1.2f else 1f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy),
        label = "scale"
    )
    val tint by animateColorAsState(
        targetValue = if (isFavorite) Color(0xFFE53935) else MaterialTheme.colorScheme.onSurfaceVariant,
        label = "tint"
    )

    IconButton(onClick = onToggle) {
        Icon(
            imageVector = if (isFavorite) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,
            contentDescription = if (isFavorite) "Remove from favourites" else "Add to favourites",
            tint = tint,
            modifier = Modifier.scale(scale)
        )
    }
}
```

Variants exist for `Dp`, `Color`, `Float`, `Int`, `Offset`, `Size`… (`animateDpAsState`, `animateColorAsState`, etc.)

### `animateContentSize`: animate size changes

```kotlin
var expanded by remember { mutableStateOf(false) }
Card(
    onClick = { expanded = !expanded },
    modifier = Modifier.animateContentSize()      // smoothly grows/shrinks
) {
    Text(
        text = longDescription,
        maxLines = if (expanded) Int.MAX_VALUE else 2,
        modifier = Modifier.padding(16.dp)
    )
}
```

### `AnimatedContent` and `Crossfade`: animate between content

```kotlin
AnimatedContent(targetState = count, label = "count") { value ->
    Text("$value", style = MaterialTheme.typography.displayMedium)
}

Crossfade(targetState = uiState, label = "screen") { state ->
    when (state) {
        is UiState.Loading -> CircularProgressIndicator()
        is UiState.Success -> RecipeList(state.recipes)
        is UiState.Error -> ErrorMessage(state.message)
    }
}
```

### Infinite animations

```kotlin
val transition = rememberInfiniteTransition(label = "pulse")
val alpha by transition.animateFloat(
    initialValue = 0.3f,
    targetValue = 1f,
    animationSpec = infiniteRepeatable(tween(800), RepeatMode.Reverse),
    label = "alpha"
)
Box(Modifier.size(80.dp).alpha(alpha).background(Color.Gray, RoundedCornerShape(8.dp)))  // a "skeleton" loader
```

:::tip Animation specs
`tween(durationMillis = 300)` moves at a fixed duration with easing. `spring()` is physics-based and feels natural (it's the default for most APIs). `keyframes { }` gives full control. Keep UI animations short: 150–400 ms.
:::

## Recap

:::recap
- Use effect APIs, never raw side effects, in composables.
- `LaunchedEffect(key)`: coroutine tied to composition; restarts when keys change.
- `rememberCoroutineScope()`: launch coroutines from event callbacks.
- `DisposableEffect`: setup + `onDispose` cleanup.
- Animations: `AnimatedVisibility`, `animate*AsState`, `animateContentSize`, `AnimatedContent`/`Crossfade`.
:::

## Practice

:::exercise
1. Build a **stopwatch**: Start/Pause and Reset buttons, displaying elapsed seconds. Use `LaunchedEffect` keyed on an `isRunning` Boolean.
2. Make the stopwatch's text colour animate to red when it passes 10 seconds.
3. Add an `AnimatedVisibility` message "Take a break! ☕" that slides in after 20 seconds.
:::

:::solution Show solution
```kotlin
@Composable
fun Stopwatch() {
    var seconds by rememberSaveable { mutableIntStateOf(0) }
    var isRunning by rememberSaveable { mutableStateOf(false) }

    LaunchedEffect(isRunning) {
        while (isRunning) {
            delay(1000)
            seconds++
        }
    }

    val color by animateColorAsState(
        targetValue = if (seconds > 10) Color.Red else MaterialTheme.colorScheme.onSurface,
        label = "timerColor"
    )

    Column(
        modifier = Modifier.fillMaxWidth().padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("$seconds s", style = MaterialTheme.typography.displayLarge, color = color)
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Button(onClick = { isRunning = !isRunning }) { Text(if (isRunning) "Pause" else "Start") }
            OutlinedButton(onClick = { isRunning = false; seconds = 0 }) { Text("Reset") }
        }
        AnimatedVisibility(
            visible = seconds >= 20,
            enter = slideInVertically { it } + fadeIn()
        ) {
            Text("Take a break! ☕", Modifier.padding(top = 24.dp))
        }
    }
}
```
When `isRunning` becomes false, the `LaunchedEffect` restarts with the new key; the `while` loop condition is false, so it simply ends.
:::

## Check your understanding

```quiz
Q: You want to show a snackbar when a button is clicked. Which API do you use to launch the suspend `showSnackbar` call?
- [ ] LaunchedEffect inside onClick
- [x] A scope from `rememberCoroutineScope()`, launched inside onClick
- [ ] GlobalScope.launch
- [ ] runBlocking
> Event handlers aren't composable, so use a composition-aware scope from rememberCoroutineScope.

Q: What happens to a `LaunchedEffect(userId)` coroutine when `userId` changes?
- [ ] Nothing, it keeps running
- [x] It's cancelled and a new coroutine starts with the new key
- [ ] The app crashes
- [ ] It runs twice at the same time
> Changing a key restarts the effect.

Q: Which API should register a listener and guarantee it's removed later?
- [ ] LaunchedEffect
- [ ] remember
- [x] DisposableEffect with onDispose
- [ ] SideEffect
> DisposableEffect requires an onDispose block for cleanup.

Q: Which is the simplest way to animate a Box's colour when a Boolean changes?
- [ ] Write a loop with delay()
- [x] `animateColorAsState(targetValue = if (flag) A else B)`
- [ ] Use two Boxes and swap them
- [ ] Animations require a separate library
> The animate*AsState family animates to a new target whenever it changes.
```
