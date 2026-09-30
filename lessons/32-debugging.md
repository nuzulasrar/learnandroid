---
id: debugging
title: Debugging & Performance
part: 7
minutes: 30
summary: Find and fix bugs like a professional. Read stack traces, use Logcat and the debugger, inspect layouts and databases, and diagnose slow or janky screens.
---

:::goals
- Reading a crash stack trace
- Logging effectively with Logcat
- Breakpoints, stepping and evaluating expressions in the debugger
- Layout Inspector and recomposition counts
- App Inspection: Database, Network and Background Task inspectors
- Common crashes and how to fix them
- Performance basics: jank, ANRs, release builds, baseline profiles
:::

## Reading a crash

When your app crashes, the **Logcat** panel shows a red **stack trace**. It looks scary, but the key info is at the top:

```text
FATAL EXCEPTION: main
Process: com.example.recipebox, PID: 12345
java.lang.IllegalStateException: Recipe 42 not found
    at com.example.recipebox.ui.detail.DetailViewModel.load(DetailViewModel.kt:37)
    at com.example.recipebox.ui.detail.DetailViewModel$1.invokeSuspend(DetailViewModel.kt:24)
    at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(...)
    ...
Caused by: ...
```

1. **Exception type and message**: `IllegalStateException: Recipe 42 not found`. What went wrong.
2. **The first line in your own package**: `DetailViewModel.kt:37`. Where it went wrong. Click the blue link to jump there.
3. **"Caused by"** (if present, scroll down): the root cause, often the most useful part.

:::tip Search smartly
Copy the exception type and message (without your app-specific values) into a search engine. Someone has almost always hit it before.
:::

## Logging

```kotlin
private const val TAG = "RecipeRepo"

Log.d(TAG, "Fetching recipes, page=$page")          // debug
Log.i(TAG, "Loaded ${recipes.size} recipes")        // info
Log.w(TAG, "Cache is stale, refreshing")            // warning
Log.e(TAG, "Failed to load recipes", exception)     // error (+ stack trace)
```

In Logcat, filter with queries like `tag:RecipeRepo`, `level:error`, `package:mine`, or combine them: `package:mine level:warn`.

:::warning Don't log secrets or personal data
Logs can be read by developers and during debugging sessions, and sometimes end up in bug reports. Never log passwords, tokens or personal information, and remove noisy debug logs before release (or use a library like Timber that you only plant in debug builds).
:::

## The debugger

Logs are great, but the **debugger** lets you pause the app and look inside it.

1. Click in the gutter next to a line to set a **breakpoint** (a red dot).
2. Run with **Debug** (the bug icon 🐞) instead of Run, or attach to a running app with **Attach Debugger to Android Process**.
3. When execution hits the breakpoint, the app pauses and the **Debug** panel shows all variables.

| Action | Mac | Windows/Linux | Does |
|---|---|---|---|
| Step over | [[F8]] | [[F8]] | Run the current line, go to the next |
| Step into | [[F7]] | [[F7]] | Go inside the function being called |
| Step out | [[Shift]] + [[F8]] | [[Shift]] + [[F8]] | Finish the current function |
| Resume | [[Cmd]] + [[Option]] + [[R]] | [[F9]] | Continue until the next breakpoint |
| Evaluate expression | [[Option]] + [[F8]] | [[Alt]] + [[F8]] | Run any code with current values |

Right-click a breakpoint to make it **conditional** (e.g. only pause when `recipe.id == 42`) or turn it into a **logging breakpoint** that prints without pausing and without changing code.

## Layout Inspector

**Tools → Layout Inspector** shows the live composable tree of your running app, with every composable's parameters, size and position, plus a 3D view of layers. Use it for "why is this element invisible / in the wrong place / the wrong size?"

It also shows **recomposition counts**: how many times each composable recomposed. A composable recomposing hundreds of times while you scroll is a performance smell. Common causes are reading a frequently-changing state too high up, or passing unstable parameters.

## App Inspection

**View → Tool Windows → App Inspection** has three inspectors you've met in earlier lessons:

- **Database Inspector**: browse and query Room tables live.
- **Network Inspector**: every HTTP request, response body and timing.
- **Background Task Inspector**: WorkManager jobs and their status.

## Common crashes and fixes

| Crash | Usual cause | Fix |
|---|---|---|
| `NullPointerException` | `!!` on a null, or a Java API returned null | Remove `!!`; handle nulls with `?.`/`?:` |
| `NetworkOnMainThreadException` | Blocking network call on the main thread | Use suspend functions / `Dispatchers.IO` |
| `ActivityNotFoundException` | Implicit intent with no app to handle it, or undeclared Activity | Catch it; declare activities in the manifest |
| `SecurityException: Permission denied` | Missing permission (e.g. INTERNET) | Add to manifest / request at runtime |
| `SerializationException` / `MissingFieldException` | JSON doesn't match your DTO | `ignoreUnknownKeys`, default values, check the JSON |
| `IllegalStateException: Room cannot verify the data integrity` | Changed schema without bumping the version | Increase version + add a migration |
| `IndexOutOfBoundsException` | `list[i]` with a bad index | Use `getOrNull(i)` |
| ANR (App Not Responding) | Main thread blocked for ~5 s | Move work off the main thread |

## Performance basics

### Jank

The screen redraws every ~16 ms (at 60 Hz) or less on high-refresh displays. If a frame takes longer, it's dropped and the app stutters ("jank"). Common causes in Compose:

- Doing heavy work (sorting, parsing, formatting big lists) **inside composables**. Do it in the ViewModel instead, or at least wrap it in `remember(key) { }`.
- Missing `key`s in lazy lists.
- Reading rapidly changing state (like scroll position) high in the tree. Use `derivedStateOf` or read it in a lambda-based modifier (`Modifier.offset { … }`).

### Always judge performance in a release build

Debug builds are **much slower**: code isn't optimised, and Compose runs extra debugging checks. Before worrying about performance, test a **release** build (next lesson), ideally on a mid-range real device.

### Tools

- **Profiler** (View → Tool Windows → Profiler): CPU, memory and energy usage; find what's slow or leaking.
- **Baseline Profiles**: a file describing your app's critical code paths so it's precompiled at install. They often improve startup and scrolling speed by 20–30%. Generate them with the *Baseline Profile Generator* module template.
- **LeakCanary** (debug-only library): automatically detects memory leaks, like an Activity held by a ViewModel.
- **StrictMode**: flags accidental disk/network access on the main thread during development.

## A debugging mindset

1. **Reproduce** the bug reliably. Write down the exact steps.
2. **Read** the error carefully, all of it.
3. **Form a hypothesis** ("the list is empty because the DAO query filters wrongly").
4. **Test it** with a breakpoint, a log, or the Database Inspector.
5. **Fix**, then add a **test** so it never comes back.

:::exercise
1. Put a breakpoint inside a ViewModel's event function, trigger it from the UI, and inspect `_uiState.value` in the debugger. Use *Evaluate Expression* to compute something with it.
2. Deliberately crash the app (`val x: String? = null; x!!.length` on a button click), find the line from the stack trace, and fix it properly.
3. Open Layout Inspector on one of your screens and find a composable's padding and size.
:::

## Check your understanding

```quiz
Q: In a stack trace, which line usually tells you where to look in your code?
- [ ] The last line
- [ ] Any line mentioning kotlin.coroutines
- [x] The first line that references a class in your own package
- [ ] The PID line
> Framework lines show how execution reached your code; the first line in your package is usually the culprit.

Q: Why should you measure performance with a release build?
- [ ] Debug builds can't run on devices
- [x] Debug builds are unoptimised and include extra checks, so they're much slower than what users run
- [ ] Release builds show more logs
- [ ] Profiler only works on release builds
> Compose in particular is much faster with R8 optimisation and without debug checks.

Q: What causes an ANR?
- [ ] A NullPointerException
- [x] Blocking the main thread for too long (about 5 seconds for input events)
- [ ] Too many recompositions
- [ ] A missing permission
> Long work on the main thread prevents the app from responding to input.

Q: What's a logging breakpoint?
- [ ] A breakpoint that crashes the app
- [x] A breakpoint that prints a message or expression without pausing, so no code changes are needed
- [ ] A Log.d call
- [ ] A breakpoint in Logcat
> Great for quick investigation without modifying and redeploying code.
```
