---
id: kotlin-functional
title: Higher-Order Functions, Extensions & Generics
part: 2
minutes: 30
summary: The Kotlin features that make Android libraries (and Compose in particular) so expressive. Covers function types, higher-order functions, extension functions, scope functions and generics.
---

:::goals
- Function types like `(Int) -> String`
- Writing your own higher-order functions (functions that take or return functions)
- Extension functions: adding functions to existing classes
- Scope functions: `let`, `apply`, `also`, `run`, `with`
- The basics of generics (`List<T>`, `fun <T> …`)
:::

## Function types

Functions are values in Kotlin. They have types, just like `Int` or `String`:

| Type | Meaning |
|---|---|
| `() -> Unit` | takes nothing, returns nothing |
| `(Int) -> Int` | takes an Int, returns an Int |
| `(String, Int) -> Boolean` | takes a String and an Int, returns a Boolean |
| `((Int) -> Unit)?` | a nullable function |

```kotlin runnable
fun main() {
    val add: (Int, Int) -> Int = { a, b -> a + b }
    val onClick: () -> Unit = { println("Clicked!") }

    println(add(2, 3))
    onClick()

    // A reference to an existing function uses ::
    val parse: (String) -> Int = String::toInt
    println(parse("42") + 1)
}
```

## Higher-order functions

A **higher-order function** takes a function as a parameter (or returns one). You've already used them: `filter`, `map` and `forEach` are all higher-order functions. Writing your own is easy:

```kotlin runnable
fun repeatAction(times: Int, action: (Int) -> Unit) {
    for (i in 1..times) action(i)
}

fun calculate(a: Int, b: Int, operation: (Int, Int) -> Int): Int = operation(a, b)

fun main() {
    repeatAction(3) { i -> println("Doing it: $i") }

    println(calculate(6, 3) { x, y -> x * y })
    println(calculate(6, 3) { x, y -> x - y })
}
```

### Why this matters: callbacks in Android

Compose components take lambdas for events. A button doesn't know *what* should happen when it's clicked. You pass that in:

```kotlin
@Composable
fun SaveButton(onSave: () -> Unit) {       // a higher-order composable
    Button(onClick = onSave) {             // passes your lambda through
        Text("Save")
    }
}

// Usage:
SaveButton(onSave = { viewModel.save() })
```

This pattern, **passing events up as lambdas**, is at the heart of Compose architecture (Lesson 14).

## Extension functions

Extension functions let you **add new functions to existing classes**, even ones you don't own like `String` or `Int`, without inheritance:

```kotlin runnable
fun String.isValidEmail(): Boolean =
    contains("@") && substringAfter("@").contains(".")

fun Int.minutesToReadable(): String {
    val h = this / 60          // "this" is the Int the function is called on
    val m = this % 60
    return if (h > 0) "${h}h ${m}min" else "${m}min"
}

fun main() {
    println("ada@example.com".isValidEmail())
    println("not-an-email".isValidEmail())
    println(135.minutesToReadable())
    println(45.minutesToReadable())
}
```

Android libraries use extensions everywhere. For example, `20.dp` and `16.sp` in Compose are extension properties on `Int`, and `Modifier.padding()` is an extension function on `Modifier`.

:::note Extensions don't really modify the class
They're resolved at compile time and can only access *public* members. They're just a nicer way to call a function, `"a@b.c".isValidEmail()` instead of `isValidEmail("a@b.c")`.
:::

## Scope functions

The standard library has five small functions that run a block of code *in the context of an object*. They look similar, so here's how to tell them apart:

| Function | Object is | Returns | Typical use |
|---|---|---|---|
| `let` | `it` | lambda result | Run code on a non-null value: `x?.let { }` |
| `apply` | `this` | the object | Configure an object |
| `also` | `it` | the object | Side effects like logging |
| `run` | `this` | lambda result | Compute a value using the object |
| `with(obj)` | `this` | lambda result | Call several methods on an object |

```kotlin runnable
data class Profile(var name: String = "", var age: Int = 0, var bio: String = "")

fun main() {
    // apply: configure and return the object itself
    val profile = Profile().apply {
        name = "Ada"
        age = 36
        bio = "Mathematician"
    }

    // also: do something extra, return the same object
    val logged = profile.also { println("Created profile for ${it.name}") }

    // let: transform, often after ?.
    val nameLength = profile.name.let { it.length }
    val maybe: String? = "hello"
    maybe?.let { println("Not null: $it") }

    // run: compute a result using the object's members
    val summary = profile.run { "$name ($age): $bio" }

    // with: same as run, but the object is an argument
    val initials = with(profile) { name.take(1).uppercase() }

    println(logged === profile)
    println(nameLength)
    println(summary)
    println(initials)
}
```

:::tip Don't overthink it
The two you'll use most are `?.let { }` (for nullables) and `apply { }` (for configuring objects like Intents or builders). Readability beats cleverness, so don't nest scope functions.
:::

## Generics

**Generics** let a class or function work with any type while staying type-safe. You've used them already: `List<String>`, `Map<String, Int>`.

```kotlin runnable
// A generic class: Box can hold any type T
class Box<T>(val value: T) {
    fun describe() = "Box containing $value"
}

// A generic function
fun <T> firstOrDefault(items: List<T>, default: T): T =
    if (items.isEmpty()) default else items[0]

fun main() {
    val intBox = Box(42)            // Box<Int>
    val strBox = Box("Kotlin")      // Box<String>
    println(intBox.describe())
    println(strBox.value.uppercase())   // compiler knows it's a String

    println(firstOrDefault(listOf(3, 4), 0))
    println(firstOrDefault(emptyList<String>(), "nothing"))
}
```

A very common generic type in Android is a **result wrapper**:

```kotlin runnable
sealed interface Result<out T> {
    data class Success<T>(val data: T) : Result<T>
    data class Error(val message: String) : Result<Nothing>
}

fun divide(a: Int, b: Int): Result<Int> =
    if (b == 0) Result.Error("Can't divide by zero") else Result.Success(a / b)

fun main() {
    for (r in listOf(divide(10, 2), divide(1, 0))) {
        when (r) {
            is Result.Success -> println("Answer: ${r.data}")
            is Result.Error -> println("Oops: ${r.message}")
        }
    }
}
```

(`out T` and `Nothing` let `Error` be used as a `Result` of *any* type. You don't need to master variance now. Just recognise the pattern.)

## Recap

:::recap
- Functions are values with types like `(Int) -> String`.
- Higher-order functions take functions as parameters; Compose uses them for events (`onClick: () -> Unit`).
- Extension functions add functions to existing types: `fun String.shout() = uppercase() + "!"`.
- `?.let` for nullables, `apply` for configuration.
- Generics (`<T>`) make code reusable across types while keeping type safety.
:::

## Practice

:::exercise
1. Write an extension function `fun List<Int>.secondLargest(): Int?` that returns the second-largest *distinct* number, or `null` if there isn't one.
2. Write a higher-order function `fun retry(times: Int, block: () -> Boolean): Boolean` that calls `block` until it returns `true` or it has tried `times` times. Test it with a lambda that succeeds on the 3rd try.
3. Write an extension property `val String.wordCount: Int` that counts words separated by whitespace.
:::

:::solution Show solutions
```kotlin runnable
fun List<Int>.secondLargest(): Int? =
    distinct().sortedDescending().getOrNull(1)

fun retry(times: Int, block: () -> Boolean): Boolean {
    repeat(times) { attempt ->
        println("Attempt ${attempt + 1}")
        if (block()) return true
    }
    return false
}

val String.wordCount: Int
    get() = trim().split(Regex("\\s+")).count { it.isNotEmpty() }

fun main() {
    println(listOf(4, 9, 9, 2).secondLargest())   // 4
    println(listOf(5).secondLargest())            // null

    var calls = 0
    println(retry(5) { ++calls == 3 })

    println("  Kotlin makes   Android fun ".wordCount)
}
```
:::

## Check your understanding

```quiz
Q: What is the type of `{ s: String -> s.length }`?
- [ ] `String -> Int`
- [x] `(String) -> Int`
- [ ] `(Int) -> String`
- [ ] `Function<String>`
> Function types list parameter types in parentheses, then an arrow and the return type.

Q: Inside `fun Int.double() = this * 2`, what is `this`?
- [ ] The class containing the function
- [x] The Int the function was called on
- [ ] Always 0
- [ ] A new Int
> In an extension function, `this` is the receiver: the object before the dot.

Q: Which scope function returns the object itself and exposes it as `this`, making it ideal for configuration?
- [ ] let
- [ ] run
- [x] apply
- [ ] also
> `apply` returns the receiver, so `Profile().apply { name = "Ada" }` gives back the configured Profile.

Q: Why might a composable take a parameter `onClick: () -> Unit`?
- [ ] To make the composable faster
- [x] So the caller decides what happens on click, keeping the composable reusable
- [ ] Because composables can't contain logic
- [ ] It's required by Android
> Passing behaviour in as a lambda keeps UI components reusable and moves decisions up to the caller.
```
