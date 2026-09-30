---
id: theming
title: Theming, Dark Mode & Resources
part: 3
minutes: 30
summary: Make your app look like *your* app. Customise Material 3 colours, typography and shapes, support dark mode and dynamic colour, and use custom fonts.
---

:::goals
- How `MaterialTheme` provides colours, typography and shapes to every composable
- Creating a custom colour scheme (and generating one from a brand colour)
- Supporting dark mode and Android 12+ dynamic colour
- Custom fonts and a typography scale
- Using theme values correctly in your composables
:::

## How theming works

When you created your project, Android Studio generated three files in `ui/theme/`:

- `Color.kt`: colour constants
- `Type.kt`: the typography (text styles)
- `Theme.kt`: the `YourAppTheme` composable that puts it all together

Wrapping your UI in the theme makes its values available to **every** composable inside, through `MaterialTheme`:

```kotlin
MaterialTheme.colorScheme.primary       // colours
MaterialTheme.typography.titleLarge     // text styles
MaterialTheme.shapes.medium             // corner shapes
```

Material components already use these values. A `Button` is automatically `primary`-coloured, a `Card` uses `surfaceContainer…` colours, and so on. Change the theme once, and the whole app updates.

## The colour scheme

Material 3 defines **colour roles**. Each colour has an "on" partner for text and icons drawn on top of it:

| Role | Used for |
|---|---|
| `primary` / `onPrimary` | Key actions: filled buttons, FAB, active states |
| `primaryContainer` / `onPrimaryContainer` | Less prominent elements, e.g. selected chips |
| `secondary` / `tertiary` (+ containers) | Accents and contrast |
| `background` / `onBackground` | Screen background |
| `surface` / `onSurface` | Cards, sheets, menus |
| `surfaceVariant` / `onSurfaceVariant` | Subtle surfaces & secondary text |
| `surfaceContainer…` (Lowest → Highest) | Layered surfaces at different elevations |
| `error` / `onError` | Errors |
| `outline` / `outlineVariant` | Borders, dividers |

:::tip Generate your palette
Pick one brand colour, then use the **[Material Theme Builder](https://material-foundation.github.io/material-theme-builder/)** to generate a full light *and* dark scheme. It can export `Color.kt` and `Theme.kt` ready for Compose.
:::

### A custom theme

```kotlin title="ui/theme/Color.kt"
val Green40 = Color(0xFF2E6B3F)
val Green80 = Color(0xFF94D6A2)
val Mint40 = Color(0xFF4F6354)
val Mint80 = Color(0xFFB6CCB9)
val Peach40 = Color(0xFF8A5100)
val Peach80 = Color(0xFFFFB86E)
```

```kotlin title="ui/theme/Theme.kt"
private val LightColors = lightColorScheme(
    primary = Green40,
    secondary = Mint40,
    tertiary = Peach40
)

private val DarkColors = darkColorScheme(
    primary = Green80,
    secondary = Mint80,
    tertiary = Peach80
)

@Composable
fun RecipeTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),  // follow the system setting
    dynamicColor: Boolean = true,                // Android 12+ wallpaper colours
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColors
        else -> LightColors
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        shapes = Shapes,
        content = content
    )
}
```

## Dark mode

With the setup above, your app follows the system's dark-mode setting automatically, as long as you **use theme colours instead of hard-coded ones**:

```kotlin
// ❌ Breaks in dark mode: black text on a dark background
Text("Hello", color = Color.Black)

// ✅ Adapts automatically
Text("Hello", color = MaterialTheme.colorScheme.onSurface)

// ✅ Even better: often you don't need to set it at all.
// Inside Surface/Scaffold/Card, content colour is set for you.
Text("Hello")
```

Test both modes with previews:

```kotlin
@Preview(name = "Light")
@Preview(name = "Dark", uiMode = Configuration.UI_MODE_NIGHT_YES)
@Composable
fun RecipeCardPreview() {
    RecipeTheme(dynamicColor = false) {
        Surface { RecipeCard(sampleRecipe) }
    }
}
```

## Dynamic colour (Android 12+)

**Dynamic colour** builds a scheme from the user's wallpaper, so your app feels personal and matches the system. The template enables it by default. If you have strong brand colours, you might set `dynamicColor = false`, or let users choose in settings (you'll build that toggle with DataStore in Lesson 25).

## Typography

Add a custom font:

1. Download a font (e.g. from [Google Fonts](https://fonts.google.com)). You need `.ttf` files.
2. Create the folder `res/font/` and copy the files in. Names must be lowercase: `nunito_regular.ttf`, `nunito_bold.ttf`.
3. Define a `FontFamily` and use it in your `Typography`:

```kotlin title="ui/theme/Type.kt"
val Nunito = FontFamily(
    Font(R.font.nunito_regular, FontWeight.Normal),
    Font(R.font.nunito_bold, FontWeight.Bold)
)

private val default = Typography()

val Typography = Typography(
    displayLarge = default.displayLarge.copy(fontFamily = Nunito),
    headlineMedium = default.headlineMedium.copy(fontFamily = Nunito, fontWeight = FontWeight.Bold),
    titleLarge = default.titleLarge.copy(fontFamily = Nunito, fontWeight = FontWeight.Bold),
    titleMedium = default.titleMedium.copy(fontFamily = Nunito),
    bodyLarge = default.bodyLarge.copy(fontFamily = Nunito),
    bodyMedium = default.bodyMedium.copy(fontFamily = Nunito),
    labelLarge = default.labelLarge.copy(fontFamily = Nunito, fontWeight = FontWeight.Bold)
)
```

## Shapes

```kotlin title="ui/theme/Shape.kt"
val Shapes = Shapes(
    small = RoundedCornerShape(8.dp),     // chips, small components
    medium = RoundedCornerShape(16.dp),   // cards
    large = RoundedCornerShape(24.dp)     // sheets, dialogs
)
```

Use them in your own components: `Modifier.clip(MaterialTheme.shapes.medium)`.

## Surface and content colour

`Surface` is the basic "piece of material". It sets a background colour **and** the default content colour for everything inside it:

```kotlin
Surface(
    color = MaterialTheme.colorScheme.primaryContainer,
    shape = MaterialTheme.shapes.medium
) {
    Text("I'm automatically onPrimaryContainer-coloured", Modifier.padding(16.dp))
}
```

## Edge-to-edge and system bars

Since Android 15, apps draw **edge-to-edge** by default: your content extends behind the status bar and navigation bar. `enableEdgeToEdge()` in `MainActivity` sets this up consistently on older versions too, and makes the bar icons light or dark to match your theme. `Scaffold`'s `innerPadding` keeps your content clear of the bars; outside a Scaffold, use modifiers like `Modifier.safeDrawingPadding()` or `Modifier.statusBarsPadding()`.

## App icon

Right-click `res` → **New → Image Asset** to create an adaptive launcher icon from an image or clip art. It generates all sizes plus the foreground/background layers Android uses for different icon shapes. Also add a **monochrome** layer so your icon supports Android 13+ themed icons.

## Recap

:::recap
- `MaterialTheme` provides `colorScheme`, `typography` and `shapes` to all composables.
- Use colour **roles** (`primary`, `onSurface`…), never hard-coded colours, and dark mode works for free.
- Dynamic colour uses the wallpaper on Android 12+.
- Put fonts in `res/font/` and wire them into `Typography`.
- Preview light and dark variants side by side.
:::

## Practice

:::exercise
1. Go to the Material Theme Builder, pick a brand colour you like, export the Compose theme and replace your project's `Color.kt` and `Theme.kt`. Set `dynamicColor = false` to see your colours.
2. Add a font from Google Fonts and apply it to `headlineMedium`, `titleLarge` and `bodyLarge`.
3. Take the `ProfileCard` from Lesson 12 and add light *and* dark previews. Fix anything that looks wrong in dark mode.
:::

## Check your understanding

```quiz
Q: Why use `MaterialTheme.colorScheme.onSurface` instead of `Color.Black` for text?
- [ ] It's shorter to type
- [x] It adapts to the theme, so text stays readable in dark mode and with dynamic colour
- [ ] Color.Black is deprecated
- [ ] It renders faster
> Theme colour roles change with light/dark/dynamic schemes; hard-coded colours don't.

Q: What does dynamic colour do on Android 12+?
- [ ] Animates colours
- [x] Generates the app's colour scheme from the user's wallpaper
- [ ] Changes colours randomly on launch
- [ ] Switches to dark mode at night
> dynamicLightColorScheme/dynamicDarkColorScheme derive a palette from the wallpaper.

Q: What colour should text on a `primary` coloured button use?
- [ ] primary
- [x] onPrimary
- [ ] background
- [ ] secondary
> Every colour role has an "on" partner designed to contrast with it.

Q: Where do custom font files go?
- [ ] assets/fonts
- [ ] res/drawable
- [x] res/font
- [ ] src/main/fonts
> Font resources live in res/font and are referenced as R.font.name.
```
