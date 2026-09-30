---
id: compose-layouts
title: Layouts & Modifiers
part: 3
minutes: 35
summary: Arrange elements on screen with Column, Row and Box, and control size, spacing, backgrounds and clicks with Modifiers. Modifier order matters, and you'll see why.
---

:::goals
- The three core layouts: `Column`, `Row`, `Box`
- Arrangement and alignment
- Modifiers: `padding`, `size`, `fillMaxWidth`, `background`, `clickable`, `weight`…
- Why **modifier order** changes the result
- `dp` vs `sp` units
- Building a real profile card layout
:::

## The three basic layouts

<div class="diagram"><div class="flow">
<div class="hl">Column<small>stacks children vertically ↓</small></div>
<div class="hl">Row<small>places children horizontally →</small></div>
<div class="hl">Box<small>stacks children on top of each other ⧉</small></div>
</div></div>

```kotlin
@Composable
fun LayoutsDemo() {
    Column {                       // vertical
        Text("First")
        Text("Second")
        Row {                      // horizontal
            Text("Left")
            Text("Right")
        }
        Box {                      // layered
            Image(painter = painterResource(R.drawable.photo), contentDescription = null)
            Text("Caption on top of the image")
        }
    }
}
```

## Arrangement & alignment

Each layout has a **main axis** (the direction children flow) and a **cross axis**:

- **Column**: `verticalArrangement` (main axis) and `horizontalAlignment` (cross axis).
- **Row**: `horizontalArrangement` (main axis) and `verticalAlignment` (cross axis).
- **Box**: `contentAlignment`, plus `Modifier.align()` on individual children.

```kotlin
Column(
    modifier = Modifier.fillMaxSize(),
    verticalArrangement = Arrangement.Center,          // center vertically
    horizontalAlignment = Alignment.CenterHorizontally // center horizontally
) {
    Text("Centered")
    Text("in the screen")
}

Row(
    modifier = Modifier.fillMaxWidth(),
    horizontalArrangement = Arrangement.SpaceBetween,  // push to both ends
    verticalAlignment = Alignment.CenterVertically
) {
    Text("Total")
    Text("$42.00")
}

Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {  // fixed gap between items
    Text("One"); Text("Two"); Text("Three")
}
```

| Arrangement | Effect |
|---|---|
| `Start` / `Top` | Pack at the start |
| `End` / `Bottom` | Pack at the end |
| `Center` | Pack in the middle |
| `SpaceBetween` | First and last at the edges, equal space between |
| `SpaceAround` | Equal space around each child |
| `SpaceEvenly` | Equal space between and at the edges |
| `spacedBy(8.dp)` | A fixed gap between children |

## Modifiers

**Modifiers** decorate or configure a composable: size, padding, background, click handling, and more. You chain them:

```kotlin
Text(
    text = "Hello",
    modifier = Modifier
        .padding(16.dp)
        .background(Color.Yellow)
        .fillMaxWidth()
)
```

### The most common modifiers

| Modifier | Does |
|---|---|
| `padding(16.dp)` / `padding(horizontal = 16.dp, vertical = 8.dp)` | Space around content |
| `size(48.dp)` / `width(…)` / `height(…)` | Exact size |
| `fillMaxWidth()` / `fillMaxHeight()` / `fillMaxSize()` | Take all available space |
| `wrapContentSize()` | Only as big as the content |
| `background(color, shape)` | Background colour/shape |
| `border(1.dp, Color.Gray, RoundedCornerShape(8.dp))` | Border |
| `clip(CircleShape)` | Clip content to a shape |
| `clickable { }` | Handle taps (with a ripple effect) |
| `weight(1f)` | Share leftover space (inside Row/Column only) |
| `align(Alignment.TopEnd)` | Position one child (inside Box/Row/Column) |
| `offset(x, y)` | Nudge position without affecting layout |
| `aspectRatio(16f / 9f)` | Keep proportions |
| `verticalScroll(rememberScrollState())` | Make a Column scrollable |

### ⚠️ Order matters

Modifiers are applied **in order, from outside to inside**. Compare:

```kotlin
// A: padding first → blue fills only the inner area
Text("A", Modifier.padding(16.dp).background(Color.Blue))

// B: background first → blue fills everything, including padding
Text("B", Modifier.background(Color.Blue).padding(16.dp))
```

<div class="diagram">
<div class="flow">
<div>A: <code>.padding().background()</code><small>transparent border, blue box inside</small></div>
<div>B: <code>.background().padding()</code><small>blue box with the text inset inside</small></div>
</div>
</div>

Same with clicks: `Modifier.clickable { }.padding(16.dp)` makes the padding area clickable too, while `Modifier.padding(16.dp).clickable { }` does not. Usually you want the clickable area to be big, so put `clickable` **before** `padding`.

:::analogy
Think of each modifier as wrapping a present. `.padding(16.dp).background(Blue)` first adds 16 dp of empty space, *then* wraps what's inside in blue paper. Swap them and you wrap in blue paper first, then add space inside the paper.
:::

## `weight`: sharing space

Inside a `Row` or `Column`, `Modifier.weight()` splits the *remaining* space proportionally:

```kotlin
Row(Modifier.fillMaxWidth()) {
    Text("Name:", modifier = Modifier.width(80.dp))
    TextField(value = "", onValueChange = {}, modifier = Modifier.weight(1f)) // takes the rest
}

Row(Modifier.fillMaxWidth().height(40.dp)) {
    Box(Modifier.weight(1f).fillMaxHeight().background(Color.Red))    // 1/3
    Box(Modifier.weight(2f).fillMaxHeight().background(Color.Green))  // 2/3
}
```

## Units: `dp` and `sp`

- **`dp`** (density-independent pixels): for sizes and spacing. `16.dp` looks the same physical size on any screen density.
- **`sp`** (scale-independent pixels): for **text sizes only**. Like `dp`, but also scales with the user's font-size setting, which matters a lot for accessibility.

:::danger Never use `dp` for text or `sp` for layout
Text in `dp` ignores users who need larger fonts. Spacing in `sp` makes your layout break when they increase it.
:::

## `Spacer`

An empty composable that takes up space:

```kotlin
Column {
    Text("Title")
    Spacer(modifier = Modifier.height(16.dp))
    Text("Body")
}
Row {
    Text("Left")
    Spacer(modifier = Modifier.weight(1f))   // pushes the next item to the far end
    Text("Right")
}
```

## Scrolling

A `Column` doesn't scroll by default. Add `verticalScroll` for small amounts of content (for long lists, use `LazyColumn`, covered in Lesson 15):

```kotlin
Column(
    modifier = Modifier
        .fillMaxSize()
        .verticalScroll(rememberScrollState())
) { /* lots of content */ }
```

## Putting it together: a profile card

```kotlin title="ProfileCard.kt"
@Composable
fun ProfileCard(
    name: String,
    role: String,
    followers: Int,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .clickable { /* open profile */ }
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Avatar: a coloured circle with an initial
        Box(
            modifier = Modifier
                .size(56.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primary),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = name.take(1),
                color = MaterialTheme.colorScheme.onPrimary,
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold
            )
        }

        Spacer(Modifier.width(16.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(text = name, fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
            Text(text = role, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }

        Column(horizontalAlignment = Alignment.End) {
            Text(text = "$followers", fontWeight = FontWeight.Bold)
            Text(text = "followers", fontSize = 12.sp)
        }
    }
}

@Preview(showBackground = true)
@Composable
fun ProfileCardPreview() {
    MaterialTheme {
        ProfileCard(name = "Ada Lovelace", role = "Android Engineer", followers = 1815,
            modifier = Modifier.padding(16.dp))
    }
}
```

Notice how the modifiers on the root `Row` are ordered: clip → background → clickable → padding. The ripple from `clickable` gets the rounded shape, and the whole card (including the padding) is tappable.

## Recap

:::recap
- `Column` = vertical, `Row` = horizontal, `Box` = layered.
- Use arrangement for the main axis and alignment for the cross axis.
- Modifiers are chained and applied **in order**, and order changes the result.
- `weight` shares leftover space; `Spacer` adds gaps.
- `dp` for sizes, `sp` for text.
:::

## Practice

:::exercise
1. Build a **"Compose quadrant"** screen: the screen split into 4 equal colored quarters, each with a centered title and description. (Hint: a `Column` with two `Row`s, each with `Modifier.weight(1f)`, and each quarter also `weight(1f)`.)
2. Build a **settings row**: an icon on the left (`Icon(Icons.Default.Notifications, contentDescription = null)`), a title and subtitle stacked in the middle taking all remaining space, and a `Switch(checked = true, onCheckedChange = {})` on the right.
:::

:::solution Show solution for task 1
```kotlin
@Composable
fun ComposeQuadrant() {
    Column(Modifier.fillMaxSize()) {
        Row(Modifier.weight(1f)) {
            Quadrant("Text", "Displays text.", Color(0xFFEADDFF), Modifier.weight(1f))
            Quadrant("Image", "Displays an image.", Color(0xFFD0BCFF), Modifier.weight(1f))
        }
        Row(Modifier.weight(1f)) {
            Quadrant("Row", "Places items horizontally.", Color(0xFFB69DF8), Modifier.weight(1f))
            Quadrant("Column", "Places items vertically.", Color(0xFFF6EDFF), Modifier.weight(1f))
        }
    }
}

@Composable
fun Quadrant(title: String, description: String, color: Color, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(color)
            .padding(16.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(title, fontWeight = FontWeight.Bold, modifier = Modifier.padding(bottom = 16.dp))
        Text(description, textAlign = TextAlign.Justify)
    }
}
```
:::

:::solution Show solution for task 2
```kotlin
@Composable
fun SettingsRow(modifier: Modifier = Modifier) {
    Row(
        modifier = modifier.fillMaxWidth().padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(Icons.Default.Notifications, contentDescription = null)
        Spacer(Modifier.width(16.dp))
        Column(Modifier.weight(1f)) {
            Text("Notifications", fontWeight = FontWeight.SemiBold)
            Text("Daily recipe ideas", fontSize = 13.sp)
        }
        Switch(checked = true, onCheckedChange = {})
    }
}
```
:::

## Check your understanding

```quiz
Q: You want three buttons spread across a Row with equal space between them and at the edges. What do you use?
- [ ] `verticalAlignment = Alignment.CenterVertically`
- [x] `horizontalArrangement = Arrangement.SpaceEvenly`
- [ ] `Modifier.padding(16.dp)`
- [ ] `contentAlignment = Alignment.Center`
> Arrangement controls spacing along the main axis, which is horizontal for a Row.

Q: What's the visual difference between `Modifier.padding(8.dp).background(Red)` and `Modifier.background(Red).padding(8.dp)`?
- [ ] None
- [x] In the first, the red area excludes the padding; in the second, the red area includes it
- [ ] The first one crashes
- [ ] The second one has no background
> Modifiers apply in order, outside to inside.

Q: Which unit should you use for font sizes?
- [ ] dp
- [x] sp
- [ ] px
- [ ] em
> sp scales with the user's font-size preference; dp does not.

Q: In a Row, a TextField has `Modifier.weight(1f)` and a Button has no weight. What happens?
- [ ] They each take half the width
- [x] The Button takes the width it needs and the TextField fills the remaining space
- [ ] The TextField disappears
- [ ] weight only works in Column
> Unweighted children are measured first; weighted children share what's left.
```
