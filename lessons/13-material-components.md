---
id: material-components
title: Material 3 Components & Scaffold
part: 3
minutes: 35
summary: A tour of the ready-made Material 3 building blocks (text, buttons, text fields, images, icons, cards, dialogs) and Scaffold, the frame that holds a whole screen together.
---

:::goals
- Styling `Text` with Material typography
- The five Material button styles and icon buttons
- Text input with `TextField` and `OutlinedTextField`
- Showing images and icons (and writing good `contentDescription`s)
- Cards, checkboxes, switches, sliders, progress indicators and dialogs
- Building a full screen with `Scaffold`, `TopAppBar`, FAB and Snackbar
:::

## Material Design 3

**Material Design** is Google's design system. **Material 3** (also called *Material You*) is its latest version, and the `androidx.compose.material3` library gives you ready-made components that follow it. They look good, support dark mode and dynamic colour, and are accessible out of the box.

:::tip Explore visually
Browse [m3.material.io/components](https://m3.material.io/components) to see every component and when to use it. The Compose names match closely.
:::

## Text

```kotlin
Text(
    text = "Recipes",
    style = MaterialTheme.typography.headlineMedium,   // use the theme's type scale
    color = MaterialTheme.colorScheme.primary,
    fontWeight = FontWeight.Bold,
    maxLines = 1,
    overflow = TextOverflow.Ellipsis,                   // "Very long te…"
    textAlign = TextAlign.Center
)
```

Material's type scale has 15 styles: `display`, `headline`, `title`, `body` and `label`, each in `Large`/`Medium`/`Small`. Use them instead of hard-coding `fontSize` so your app looks consistent:

| Style | Typical use |
|---|---|
| `displayLarge…Small` | Huge numbers or hero text |
| `headlineLarge…Small` | Screen titles |
| `titleLarge…Small` | Section titles, card titles, app bars |
| `bodyLarge…Small` | Paragraph text |
| `labelLarge…Small` | Buttons, chips, captions |

## Buttons

Material 3 has five button types, from most to least emphasis:

```kotlin
Button(onClick = { }) { Text("Filled") }                 // primary action
FilledTonalButton(onClick = { }) { Text("Tonal") }      // secondary, still important
ElevatedButton(onClick = { }) { Text("Elevated") }      // needs separation from a patterned bg
OutlinedButton(onClick = { }) { Text("Outlined") }      // medium emphasis
TextButton(onClick = { }) { Text("Text") }              // lowest emphasis, e.g. dialogs

// With an icon:
Button(onClick = { }) {
    Icon(Icons.Default.Add, contentDescription = null)
    Spacer(Modifier.width(8.dp))
    Text("Add recipe")
}

// Icon-only buttons:
IconButton(onClick = { }) {
    Icon(Icons.Default.Favorite, contentDescription = "Add to favourites")
}

// Disabled:
Button(onClick = { }, enabled = false) { Text("Can't click") }
```

:::note The content lambda
Notice a `Button`'s content is a **trailing lambda**, so you can put *any* composables inside: text, icons, even a progress spinner. Many Material components work this way (they're called *slot-based APIs*).
:::

## Text input

```kotlin
@Composable
fun NameInput() {
    var name by remember { mutableStateOf("") }

    OutlinedTextField(
        value = name,                         // what to show
        onValueChange = { name = it },        // called on every keystroke
        label = { Text("Your name") },
        placeholder = { Text("e.g. Ada") },
        leadingIcon = { Icon(Icons.Default.Person, contentDescription = null) },
        singleLine = true,
        isError = name.length > 20,
        supportingText = { Text("${name.length}/20") },
        keyboardOptions = KeyboardOptions(
            keyboardType = KeyboardType.Text,
            imeAction = ImeAction.Done,
            capitalization = KeyboardCapitalization.Words
        ),
        modifier = Modifier.fillMaxWidth()
    )
}
```

A `TextField` does **not** store its own text. You hold the text in state and pass it in via `value`, and the field tells you about edits via `onValueChange`. If you forget to update the state, typing does nothing! This pattern is explained properly in the next lesson.

Use `keyboardType = KeyboardType.Email`, `Number`, `Phone` or `Password` to get the right keyboard, and `visualTransformation = PasswordVisualTransformation()` to hide passwords.

## Images and icons

```kotlin
// An image from res/drawable
Image(
    painter = painterResource(id = R.drawable.pancakes),
    contentDescription = "A stack of pancakes with berries",
    contentScale = ContentScale.Crop,               // fill & crop like a photo
    modifier = Modifier
        .fillMaxWidth()
        .height(200.dp)
        .clip(RoundedCornerShape(12.dp))
)

// A Material icon
Icon(
    imageVector = Icons.Default.Star,
    contentDescription = "Rating",
    tint = MaterialTheme.colorScheme.primary
)
```

To add an image, drag a PNG/JPG/WebP into `res/drawable` (names must be lowercase with underscores, e.g. `pancakes.jpg`). For icons, use **File → New → Vector Asset** to import Material icons or SVGs as vector drawables. They're sharp at any size. Loading images **from the internet** needs a library called Coil (Lesson 29).

:::warning contentDescription and accessibility
Screen readers like TalkBack read `contentDescription` aloud to blind and low-vision users. Describe **meaningful** images and icon buttons ("Add to favourites"). For purely decorative images, or icons next to text that already says the same thing, pass `contentDescription = null` so they're skipped.
:::

`Icons.Default` contains a small core set. For many more icons, add the `material-icons-extended` library (Lesson 3 showed how), or import vector assets from [Material Symbols](https://fonts.google.com/icons).

## Cards

A `Card` groups related content on a raised or outlined surface:

```kotlin
Card(
    onClick = { /* open details */ },          // optional: makes the whole card clickable
    modifier = Modifier.fillMaxWidth(),
    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
) {
    Column(Modifier.padding(16.dp)) {
        Text("Classic Margherita Pizza", style = MaterialTheme.typography.titleMedium)
        Text("Italian · 35 min", style = MaterialTheme.typography.bodyMedium)
    }
}
// Variants: ElevatedCard, OutlinedCard
```

## Selection controls

```kotlin
var checked by remember { mutableStateOf(false) }
var enabled by remember { mutableStateOf(true) }
var volume by remember { mutableFloatStateOf(0.5f) }

Row(verticalAlignment = Alignment.CenterVertically) {
    Checkbox(checked = checked, onCheckedChange = { checked = it })
    Text("I agree to the terms")
}
Switch(checked = enabled, onCheckedChange = { enabled = it })
Slider(value = volume, onValueChange = { volume = it })

// Chips for filters/tags:
FilterChip(
    selected = checked,
    onClick = { checked = !checked },
    label = { Text("Vegetarian") }
)
```

## Progress indicators

```kotlin
CircularProgressIndicator()                  // indeterminate spinner
LinearProgressIndicator(progress = { 0.7f }) // 70% determinate bar
```

## Dialogs

```kotlin
@Composable
fun DeleteButton(onConfirmDelete: () -> Unit) {
    var showDialog by remember { mutableStateOf(false) }

    TextButton(onClick = { showDialog = true }) { Text("Delete") }

    if (showDialog) {                            // the dialog is shown while this is true
        AlertDialog(
            onDismissRequest = { showDialog = false },
            title = { Text("Delete recipe?") },
            text = { Text("This can't be undone.") },
            confirmButton = {
                TextButton(onClick = { showDialog = false; onConfirmDelete() }) { Text("Delete") }
            },
            dismissButton = {
                TextButton(onClick = { showDialog = false }) { Text("Cancel") }
            }
        )
    }
}
```

Notice how declarative this is: you don't "show" a dialog, you describe that *when `showDialog` is true, there is a dialog*.

## Scaffold: the skeleton of a screen

`Scaffold` provides slots for the standard parts of a screen and lays them out correctly, including avoiding the status and navigation bars:

<div class="diagram"><div class="stack">
<div class="hl">topBar<small>TopAppBar: title, navigation icon, actions</small></div>
<div>content (receives innerPadding)<small>your screen's main content</small></div>
<div>floatingActionButton · snackbarHost<small>the main action button and temporary messages</small></div>
<div class="hl">bottomBar<small>NavigationBar or BottomAppBar</small></div>
</div></div>

```kotlin title="NotesScreen.kt"
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotesScreen() {
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    var notes by remember { mutableStateOf(listOf("Buy milk", "Call mum")) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("My Notes") },
                actions = {
                    IconButton(onClick = { }) {
                        Icon(Icons.Default.Search, contentDescription = "Search")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = {
                notes = notes + "New note ${notes.size + 1}"
                scope.launch { snackbarHostState.showSnackbar("Note added") }
            }) {
                Icon(Icons.Default.Add, contentDescription = "Add note")
            }
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .padding(innerPadding)        // ⚠️ always apply innerPadding!
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            notes.forEach { note ->
                Card(Modifier.fillMaxWidth()) {
                    Text(note, Modifier.padding(16.dp))
                }
            }
        }
    }
}
```

:::danger Forgetting `innerPadding`
The content lambda receives `innerPadding`: the space taken by the top bar, bottom bar and system bars. If you don't apply it, your content will be hidden **behind** the app bar. Android Studio even warns you when it's unused.
:::

:::note `@OptIn(ExperimentalMaterial3Api::class)`
Some Material 3 APIs (like `TopAppBar` in some versions) are marked *experimental*, meaning they might change. Adding `@OptIn` acknowledges that. It's common and safe for learning; Android Studio adds it for you via [[Alt]]/[[Option]] + [[Enter]].
:::

`showSnackbar` is a *suspend* function (it waits until the snackbar is dismissed), so we launch it in a coroutine scope that's tied to the composable, `rememberCoroutineScope()`. More on that in Lesson 17.

## Recap

:::recap
- Use `MaterialTheme.typography` and `MaterialTheme.colorScheme` rather than hard-coded styles.
- Pick button types by emphasis: Filled > Tonal > Elevated > Outlined > Text.
- Text fields are *controlled*: you own the text in state and update it in `onValueChange`.
- Write good `contentDescription`s; use `null` for decorative images.
- `Scaffold` builds a screen from slots. Always apply its `innerPadding`.
:::

## Practice

:::exercise
Build a **Sign-up screen** inside a `Scaffold` with a `TopAppBar` titled "Create account":

1. `OutlinedTextField`s for name, email (email keyboard) and password (hidden text).
2. A `Checkbox` row: "I accept the terms".
3. A full-width **Sign up** `Button` that's only enabled when all fields are non-empty and the box is checked.
4. When clicked, show a Snackbar saying `"Welcome, <name>!"`.
:::

:::solution Show solution
```kotlin
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SignUpScreen() {
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var accepted by remember { mutableStateOf(false) }
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    val canSubmit = name.isNotBlank() && email.isNotBlank() && password.isNotBlank() && accepted

    Scaffold(
        topBar = { TopAppBar(title = { Text("Create account") }) },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { innerPadding ->
        Column(
            modifier = Modifier.padding(innerPadding).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            OutlinedTextField(
                value = name, onValueChange = { name = it },
                label = { Text("Name") }, singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
            OutlinedTextField(
                value = email, onValueChange = { email = it },
                label = { Text("Email") }, singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                modifier = Modifier.fillMaxWidth()
            )
            OutlinedTextField(
                value = password, onValueChange = { password = it },
                label = { Text("Password") }, singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                modifier = Modifier.fillMaxWidth()
            )
            Row(verticalAlignment = Alignment.CenterVertically) {
                Checkbox(checked = accepted, onCheckedChange = { accepted = it })
                Text("I accept the terms")
            }
            Button(
                onClick = { scope.launch { snackbarHostState.showSnackbar("Welcome, $name!") } },
                enabled = canSubmit,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Sign up")
            }
        }
    }
}
```
:::

## Check your understanding

```quiz
Q: You type into an OutlinedTextField but nothing appears. What's the most likely bug?
- [ ] The keyboard type is wrong
- [x] `onValueChange` doesn't update the state that's passed to `value`
- [ ] You need a label
- [ ] TextFields only work inside a Scaffold
> Text fields display exactly what you pass in `value`. You must update your state in `onValueChange`.

Q: What should `contentDescription` be for a purely decorative background image?
- [ ] "Image"
- [ ] The file name
- [x] null
- [ ] An empty string is required
> Passing null tells accessibility services to skip the element.

Q: Your list is hidden behind the TopAppBar in a Scaffold. Why?
- [ ] TopAppBar is always drawn on top
- [x] You didn't apply the `innerPadding` that Scaffold passes to its content
- [ ] You need to use a Box
- [ ] The list needs elevation
> Scaffold tells you how much space its bars take via innerPadding. Apply it to your content.

Q: Which is the most emphasised Material 3 button?
- [ ] TextButton
- [ ] OutlinedButton
- [x] Button (filled)
- [ ] IconButton
> The filled Button is for the primary action on a screen.
```
