---
id: legacy-views
title: The View System (XML) & Interop
part: 6
minutes: 30
summary: Millions of lines of existing Android code use XML layouts and Views. Learn enough to read and maintain them, use View Binding and RecyclerView, and mix Views with Compose.
---

:::goals
- How XML layouts and Views work
- Common layouts: `LinearLayout`, `ConstraintLayout`, `FrameLayout`
- Accessing views safely with **View Binding**
- The idea behind `RecyclerView`
- Fragments, briefly
- Mixing the two worlds: `ComposeView` and `AndroidView`
:::

## Why learn the old way?

Compose is the future, and all new code in this course uses it. But if you join a company or open an older project, you **will** meet XML layouts, Activities full of `findViewById`, Fragments and `RecyclerView`s. Many apps are migrating gradually, so screens of both kinds live side by side. This lesson gives you enough to read, maintain and migrate that code.

## XML layouts

In the View system, UI is defined in XML files under `res/layout/` and "inflated" into objects at runtime:

```xml title="res/layout/activity_main.xml"
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:padding="16dp">

    <TextView
        android:id="@+id/countText"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="@string/clicked_zero"
        android:textSize="24sp" />

    <Button
        android:id="@+id/clickButton"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Click me" />
</LinearLayout>
```

| XML concept | Compose equivalent |
|---|---|
| `LinearLayout` vertical / horizontal | `Column` / `Row` |
| `FrameLayout` | `Box` |
| `ConstraintLayout` | `Row`/`Column`/`Box` combinations (or ConstraintLayout for Compose) |
| `TextView`, `Button`, `ImageView`, `EditText` | `Text`, `Button`, `Image`, `TextField` |
| `RecyclerView` | `LazyColumn` / `LazyRow` / `LazyVerticalGrid` |
| `match_parent` / `wrap_content` | `fillMaxWidth()` / default wrapping |
| `android:id="@+id/name"` | Not needed, since you pass state directly |

`ConstraintLayout` is the most common layout in modern XML. It positions views relative to each other and to the parent with constraints, keeping the hierarchy flat:

```xml
<androidx.constraintlayout.widget.ConstraintLayout
    android:layout_width="match_parent"
    android:layout_height="wrap_content">

    <ImageView
        android:id="@+id/avatar"
        android:layout_width="48dp"
        android:layout_height="48dp"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintTop_toTopOf="parent" />

    <TextView
        android:id="@+id/name"
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        app:layout_constraintStart_toEndOf="@id/avatar"
        app:layout_constraintEnd_toEndOf="parent"
        app:layout_constraintTop_toTopOf="@id/avatar" />
</androidx.constraintlayout.widget.ConstraintLayout>
```

## Imperative updates and View Binding

The Activity inflates the layout and then updates views **imperatively**. The old way used `findViewById`, which is verbose and crash-prone when IDs are wrong. The modern way is **View Binding**, which generates a type-safe class per layout:

```kts title="app/build.gradle.kts"
android {
    buildFeatures { viewBinding = true }
}
```

```kotlin title="MainActivity.kt (View system)"
class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding   // generated from activity_main.xml
    private var count = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.clickButton.setOnClickListener {
            count++
            binding.countText.text = getString(R.string.clicked_n, count)   // update manually
        }
    }
}
```

Compare this with the Compose counter from Lesson 11: here *you* must remember to update `countText` every time `count` changes. That's the imperative approach.

## RecyclerView in one minute

`RecyclerView` shows long lists efficiently by **recycling** row views as they scroll. It needs:

1. An XML layout for one row.
2. A **ViewHolder**: holds references to the row's views.
3. An **Adapter** that creates ViewHolders and binds data to them. `ListAdapter` + `DiffUtil` compute changes automatically.

```kotlin
class NoteAdapter(private val onClick: (Note) -> Unit) :
    ListAdapter<Note, NoteAdapter.ViewHolder>(Diff) {

    class ViewHolder(val binding: ItemNoteBinding) : RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) = ViewHolder(
        ItemNoteBinding.inflate(LayoutInflater.from(parent.context), parent, false)
    )

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val note = getItem(position)
        holder.binding.title.text = note.title
        holder.binding.root.setOnClickListener { onClick(note) }
    }

    object Diff : DiffUtil.ItemCallback<Note>() {
        override fun areItemsTheSame(old: Note, new: Note) = old.id == new.id
        override fun areContentsTheSame(old: Note, new: Note) = old == new
    }
}
```

In Compose, all of this is `LazyColumn { items(notes, key = { it.id }) { NoteRow(it) } }`. 😄

## Fragments, briefly

A **Fragment** is a reusable portion of UI with its own lifecycle, hosted inside an Activity. Before Compose, multi-screen apps usually used one Activity with many Fragments, navigated with the Navigation component's XML nav graphs. When you meet them, remember:

- Fragments have their own lifecycle (`onCreateView`, `onViewCreated`, `onDestroyView`…) *and* a separate view lifecycle.
- Use `viewLifecycleOwner` when observing data in a Fragment.
- In Compose apps, composable destinations replace Fragments entirely.

## Interop: mixing Views and Compose

Migration happens screen by screen, or even component by component. Both directions are supported.

### Compose inside Views: `ComposeView`

```xml
<androidx.compose.ui.platform.ComposeView
    android:id="@+id/composeView"
    android:layout_width="match_parent"
    android:layout_height="wrap_content" />
```

```kotlin
binding.composeView.setContent {
    MaterialTheme {
        Text("Hello from Compose inside an XML layout!")
    }
}
```

### Views inside Compose: `AndroidView`

Useful for Views with no Compose equivalent yet (some map, ad or video SDKs):

```kotlin
@Composable
fun LegacyCalendar(onDateSelected: (Long) -> Unit) {
    AndroidView(
        factory = { context ->
            CalendarView(context).apply {
                setOnDateChangeListener { _, y, m, d ->
                    onDateSelected(LocalDate.of(y, m + 1, d).toEpochDay())
                }
            }
        },
        update = { view -> /* update the view when Compose state changes */ },
        modifier = Modifier.fillMaxWidth()
    )
}
```

## Recap

:::recap
- The View system = XML layouts + imperative updates. Compose = Kotlin + declarative state.
- Use **View Binding** instead of `findViewById`.
- `RecyclerView` + `ListAdapter` + `DiffUtil` = the View-system `LazyColumn`.
- `ComposeView` puts Compose in Views; `AndroidView` puts Views in Compose.
:::

:::exercise
Create a new project with the **Empty Views Activity** template, enable View Binding, and build the click counter with XML. Then add a `ComposeView` below the button that shows the count in a Compose `Text`. (Hint: keep `count` in a `mutableIntStateOf` so Compose observes it.)
:::

## Check your understanding

```quiz
Q: What's the Compose equivalent of RecyclerView?
- [ ] Column
- [x] LazyColumn
- [ ] Box
- [ ] ScrollView
> Lazy layouts compose only visible items, just as RecyclerView recycles views.

Q: Why is View Binding preferred over findViewById?
- [ ] It's required by Google Play
- [x] It's type-safe and null-safe: views are generated properties, so wrong IDs are compile errors
- [ ] It makes layouts render faster
- [ ] It converts XML to Compose
> Binding classes are generated per layout with a property for each view with an id.

Q: How do you use a View-based SDK component inside a composable?
- [ ] ComposeView
- [x] AndroidView
- [ ] ViewBinding
- [ ] It's not possible
> AndroidView hosts a classic View inside Compose; ComposeView does the reverse.
```
