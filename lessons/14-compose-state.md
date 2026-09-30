---
id: compose-state
title: State & State Hoisting
part: 3
minutes: 35
summary: State is what makes a UI interactive. Learn remember, mutableStateOf and rememberSaveable, and master state hoisting and unidirectional data flow, the most important patterns in Compose.
---

:::goals
- What "state" means in Compose and how Compose observes it
- `remember`, `mutableStateOf` and the `by` delegate
- `rememberSaveable` for surviving rotation
- **Stateless vs. stateful** composables
- **State hoisting** and **unidirectional data flow (UDF)**
- Common state mistakes and how to avoid them
:::

## What is state?

**State** is any value that can change over time and affects what's on screen: the text in a search box, whether a checkbox is ticked, the list of recipes, whether data is loading.

Compose only redraws when **state it can observe** changes. A normal variable won't work:

```kotlin
@Composable
fun BrokenCounter() {
    var count = 0                           // ❌ plain variable
    Button(onClick = { count++ }) {         // count changes...
        Text("Count: $count")               // ...but Compose doesn't know, so no update
    }
}
```

Two problems: (1) Compose doesn't *observe* a plain variable, so changing it doesn't trigger recomposition; (2) even if it did, `count = 0` would run again on every recomposition and reset it.

## `mutableStateOf` + `remember`

```kotlin
@Composable
fun Counter() {
    val count = remember { mutableStateOf(0) }
    Button(onClick = { count.value++ }) {
        Text("Count: ${count.value}")
    }
}
```

- **`mutableStateOf(0)`** creates an *observable* holder. When `.value` changes, Compose recomposes every composable that read it. This fixes problem 1.
- **`remember { }`** stores the object across recompositions. The first time, it runs the lambda; afterwards it returns the stored value. This fixes problem 2.

### The `by` delegate

Writing `.value` everywhere gets noisy. Kotlin's **property delegate** syntax hides it:

```kotlin
@Composable
fun Counter() {
    var count by remember { mutableStateOf(0) }   // needs getValue/setValue imports
    Button(onClick = { count++ }) {
        Text("Count: $count")
    }
}
```

Three equivalent styles exist; `by` is the most common:

```kotlin
val state = remember { mutableStateOf("") }          // state.value
var text by remember { mutableStateOf("") }          // text
val (value, setValue) = remember { mutableStateOf("") } // value, setValue("new")
```

:::tip Primitive state holders
For numbers, prefer the specialised versions: `mutableIntStateOf(0)`, `mutableFloatStateOf(0f)`, `mutableLongStateOf(0L)`. They avoid boxing and Android Studio suggests them automatically.
:::

## Surviving configuration changes: `rememberSaveable`

Rotate the phone with the counter showing and the count resets to 0! Rotation (and other *configuration changes* like switching dark mode or language) **recreates the Activity**, and `remember` is lost with it. (Lesson 18 explains this properly.)

`rememberSaveable` saves the value in a `Bundle` so it survives recreation, and even process death:

```kotlin
var count by rememberSaveable { mutableIntStateOf(0) }   // survives rotation ✅
```

`rememberSaveable` works automatically for primitives, Strings and other `Bundle`-compatible types. For your own classes, mark them `@Parcelize` (with the `kotlin-parcelize` plugin) or provide a custom `Saver`.

| API | Survives recomposition | Survives rotation | Use for |
|---|---|---|---|
| plain variable | ❌ | ❌ | never for UI state |
| `remember` | ✅ | ❌ | UI-only state that's fine to reset (e.g. an animation's progress) |
| `rememberSaveable` | ✅ | ✅ | user input: text fields, selected tab, scroll-independent choices |
| ViewModel (Part 4) | ✅ | ✅ | screen data and business logic |

## Stateful vs. stateless composables

- A **stateful** composable *owns* its state (it calls `remember` inside).
- A **stateless** composable *receives* its state as parameters and reports changes through lambdas.

Stateless composables are easier to reuse, test and preview, because they just display what they're given. Material's `TextField`, `Checkbox` and `Switch` are all stateless: they take `value`/`checked` and `onValueChange`/`onCheckedChange`.

## State hoisting

**State hoisting** means moving state *up* from a composable to its caller, making the composable stateless. The recipe is simple. Replace the state variable with two parameters:

- `value: T`: the current value to display
- `onValueChange: (T) -> Unit`: an event to request a change

```kotlin
// ❌ Stateful: hard to reuse, the parent can't read or reset the count
@Composable
fun StatefulCounter() {
    var count by rememberSaveable { mutableIntStateOf(0) }
    CounterRow(count, onIncrement = { count++ })
}

// ✅ Stateless: displays whatever it's given, reports clicks upward
@Composable
fun CounterRow(
    count: Int,
    onIncrement: () -> Unit,
    modifier: Modifier = Modifier
) {
    Row(modifier, verticalAlignment = Alignment.CenterVertically) {
        Text("Glasses of water: $count", Modifier.weight(1f))
        Button(onClick = onIncrement, enabled = count < 10) { Text("+1") }
    }
}
```

Now a parent can **share** that state with other composables:

```kotlin
@Composable
fun WaterTracker() {
    var count by rememberSaveable { mutableIntStateOf(0) }   // state lives here

    Column(Modifier.padding(16.dp)) {
        CounterRow(count = count, onIncrement = { count++ })
        LinearProgressIndicator(progress = { count / 10f }, Modifier.fillMaxWidth())
        if (count >= 8) Text("🎉 Daily goal reached!")
        TextButton(onClick = { count = 0 }) { Text("Reset") }
    }
}
```

### Unidirectional data flow (UDF)

State hoisting creates a clean loop in which **state flows down** and **events flow up**:

<div class="diagram"><div class="flow">
<div class="hl">State holder<small>WaterTracker (later: a ViewModel)</small></div>
<div class="arrow">⇄</div>
<div>UI<small>CounterRow displays state, sends events</small></div>
</div><div class="diagram-caption">State flows down as parameters ↓ · Events flow up as lambdas ↑</div></div>

1. The state holder passes state **down** to the UI.
2. The user does something; the UI sends an **event up** (calls a lambda).
3. The state holder updates the state.
4. Compose recomposes the UI with the new state.

The UI never changes state itself. There's a **single source of truth**, which makes bugs much easier to find. In Part 4 the state holder becomes a ViewModel, but the pattern is identical.

:::tip Where should state live?
Hoist state to the **lowest common parent** of all composables that read or write it. If only one composable needs it, keep it there. If two siblings need it, move it to their parent.
:::

## State with collections and objects

Compose detects a change when the state's value is **replaced** with a different value. Mutating an object *inside* the state does not trigger recomposition:

```kotlin
// ❌ Bug: mutating the list doesn't notify Compose
var items by remember { mutableStateOf(mutableListOf("A")) }
items.add("B")                         // UI doesn't update!

// ✅ Replace it with a new list
var items by remember { mutableStateOf(listOf("A")) }
items = items + "B"                    // new list → recomposition

// ✅ Or use an observable list
val items = remember { mutableStateListOf("A") }
items.add("B")                         // observed ✅

// ✅ Data classes: replace with copy()
var form by remember { mutableStateOf(Form(name = "", age = 0)) }
form = form.copy(name = "Ada")
```

## Derived values

Don't store what you can compute. If a value can be calculated from other state, just calculate it:

```kotlin
var password by remember { mutableStateOf("") }
val isStrong = password.length >= 8 && password.any { it.isDigit() }   // derived, no extra state
```

## Recap

:::recap
- UI state must be **observable** (`mutableStateOf`) and **remembered** (`remember`).
- `rememberSaveable` survives rotation; use it for user input.
- **Hoist** state by replacing it with `value` + `onValueChange` parameters.
- **UDF**: state flows down, events flow up, with one source of truth.
- Replace state (new list, `copy()`), don't mutate it.
:::

## Practice

:::exercise
Build a **tip calculator**:

1. An `OutlinedTextField` for the bill amount (number keyboard), and three `FilterChip`s for 10%, 15% and 20%.
2. A `Switch` "Round up tip".
3. Display the calculated tip and total. They should update as you type.
4. Make the input, chips and switch **stateless** composables, with all state hoisted into one `TipCalculatorScreen`. State must survive rotation.
:::

:::solution Show solution
```kotlin
@Composable
fun TipCalculatorScreen() {
    var amountInput by rememberSaveable { mutableStateOf("") }
    var percent by rememberSaveable { mutableIntStateOf(15) }
    var roundUp by rememberSaveable { mutableStateOf(false) }

    // Derived values: no extra state needed
    val amount = amountInput.toDoubleOrNull() ?: 0.0
    var tip = amount * percent / 100
    if (roundUp) tip = kotlin.math.ceil(tip)
    val total = amount + tip

    Column(Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text("Tip calculator", style = MaterialTheme.typography.headlineSmall)
        AmountField(value = amountInput, onValueChange = { amountInput = it })
        PercentSelector(selected = percent, onSelect = { percent = it })
        RoundUpRow(roundUp = roundUp, onRoundUpChange = { roundUp = it })
        Text("Tip: ${"%.2f".format(tip)}", style = MaterialTheme.typography.titleLarge)
        Text("Total: ${"%.2f".format(total)}", style = MaterialTheme.typography.titleMedium)
    }
}

@Composable
fun AmountField(value: String, onValueChange: (String) -> Unit, modifier: Modifier = Modifier) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text("Bill amount") },
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
        modifier = modifier.fillMaxWidth()
    )
}

@Composable
fun PercentSelector(selected: Int, onSelect: (Int) -> Unit, modifier: Modifier = Modifier) {
    Row(modifier, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        listOf(10, 15, 20).forEach { p ->
            FilterChip(
                selected = p == selected,
                onClick = { onSelect(p) },
                label = { Text("$p%") }
            )
        }
    }
}

@Composable
fun RoundUpRow(roundUp: Boolean, onRoundUpChange: (Boolean) -> Unit, modifier: Modifier = Modifier) {
    Row(modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text("Round up tip", Modifier.weight(1f))
        Switch(checked = roundUp, onCheckedChange = onRoundUpChange)
    }
}
```
:::

## Check your understanding

```quiz
Q: What does `remember` do?
- [ ] Saves a value to disk
- [x] Keeps a value across recompositions of the same composable
- [ ] Makes a value observable
- [ ] Survives app restarts
> `remember` caches the value in the composition. Observability comes from `mutableStateOf`.

Q: Your text field's contents disappear when you rotate the phone. What's the fix?
- [ ] Use `remember` instead of `rememberSaveable`
- [x] Use `rememberSaveable` instead of `remember`
- [ ] Lock the orientation
- [ ] Use a global variable
> Rotation recreates the Activity; `rememberSaveable` persists values through that.

Q: To hoist the state of `@Composable fun Toggle()`, what should its signature become?
- [ ] `fun Toggle(state: MutableState<Boolean>)`
- [x] `fun Toggle(isOn: Boolean, onToggle: (Boolean) -> Unit)`
- [ ] `fun Toggle(): Boolean`
- [ ] `fun Toggle(viewModel: ViewModel)`
> Replace internal state with a value parameter plus an event lambda.

Q: `var items by remember { mutableStateOf(mutableListOf<String>()) }` then `items.add("x")`. Why doesn't the UI update?
- [ ] Lists can't be state
- [x] The list was mutated in place, so the state's value (the same list object) never changed and Compose wasn't notified
- [ ] You must call `recompose()` manually
- [ ] `add` only works on the main thread
> Replace it with a new list (`items = items + "x"`) or use `mutableStateListOf`.

Q: In unidirectional data flow, which direction do events travel?
- [ ] Down from parent to child
- [x] Up from the UI to the state holder
- [ ] Sideways between siblings
- [ ] Events aren't used
> State flows down; events flow up.
```
