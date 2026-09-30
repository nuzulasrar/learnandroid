---
id: kotlin-basics
title: "Kotlin Basics: Variables, Types & Functions"
part: 2
minutes: 30
summary: Start writing Kotlin, the language of modern Android. Variables, basic types, strings, and functions, with examples you can run right here in the browser.
---

:::goals
- The difference between `val` and `var` (and why you should prefer `val`)
- Kotlin's basic types and type inference
- String templates and multi-line strings
- How to write functions with parameters, default values and named arguments
- Single-expression functions
:::

## Why learn Kotlin before Android?

Every Android API you'll use is called from Kotlin. If you're fighting the *language* at the same time as learning Android, everything feels twice as hard. Spending a few lessons on pure Kotlin first will make Parts 3–8 far smoother.

:::tip Run the examples
Code blocks marked **▶ Try it** open in an interactive Kotlin Playground. You can edit the code and run it right in your browser. You can also use [play.kotlinlang.org](https://play.kotlinlang.org), or create a Kotlin file with a `main` function in Android Studio or IntelliJ IDEA.
:::

## Your first Kotlin program

```kotlin runnable
fun main() {
    println("Hello, Kotlin!")
}
```

- `fun` declares a function. `main` is where a plain Kotlin program starts. (Android apps don't have a `main`; Android calls your Activity instead.)
- `println` prints a line of text.
- No semicolons needed!

## Variables: `val` and `var`

Kotlin has two keywords for declaring variables:

```kotlin runnable
fun main() {
    val name = "Ada"        // val = read-only (cannot be reassigned)
    var score = 10          // var = mutable (can be reassigned)

    score = score + 5       // ✅ fine
    score += 1              // ✅ shorthand for score = score + 1
    // name = "Grace"       // ❌ error: val cannot be reassigned

    println(name)
    println(score)
}
```

:::tip Prefer `val`
Use `val` by default and switch to `var` only when you actually need to change the value. Code where values don't change unexpectedly is much easier to reason about, and Android Studio will even suggest turning an unchanged `var` into `val`.
:::

## Basic types

Kotlin is **statically typed**: every variable has a type known at compile time. But you rarely have to write it, because the compiler **infers** it from the value:

```kotlin runnable
fun main() {
    val age = 30               // Int
    val price = 19.99          // Double
    val isMember = true        // Boolean
    val initial = 'K'          // Char (single quotes)
    val city = "Lagos"         // String (double quotes)
    val population = 15_000_000L  // Long (underscores for readability)

    // You can also write the type explicitly:
    val temperature: Double = 21.5
    val count: Int = 3

    println("$age $price $isMember $initial $city $population $temperature $count")
}
```

| Type | What it holds | Example |
|---|---|---|
| `Int` | Whole numbers (±2.1 billion) | `42` |
| `Long` | Big whole numbers | `42L` |
| `Double` | Decimal numbers | `3.14` |
| `Float` | Less precise decimals (common in graphics) | `3.14f` |
| `Boolean` | `true` or `false` | `true` |
| `Char` | A single character | `'A'` |
| `String` | Text | `"Hello"` |

When you declare a variable without a value, you must give the type:

```kotlin
val message: String
message = "Assigned later"   // allowed once for val
```

### Converting between types

Kotlin never converts numbers silently. You call conversion functions explicitly:

```kotlin runnable
fun main() {
    val whole: Int = 7
    val decimal: Double = whole.toDouble()   // 7.0
    val text: String = whole.toString()      // "7"
    val parsed: Int = "123".toInt()          // 123
    val safeParse: Int? = "abc".toIntOrNull() // null (no crash)

    println(decimal)
    println(text + "!")
    println(parsed + 1)
    println(safeParse)
    println(7 / 2)      // 3   (integer division!)
    println(7 / 2.0)    // 3.5
    println(7 % 2)      // 1   (remainder)
}
```

:::danger Integer division
`7 / 2` is `3`, not `3.5`, because both numbers are `Int`. If you need decimals, make at least one side a `Double`: `7 / 2.0` or `7.toDouble() / 2`.
:::

## Strings

### String templates

Insert values into strings with `$name`, or `${expression}` for anything more complex:

```kotlin runnable
fun main() {
    val name = "Sam"
    val items = 3
    val price = 4.5

    println("Hi $name!")
    println("You have $items items")
    println("Total: ${items * price}")
    println("Name has ${name.length} letters")
    println("Shouting: ${name.uppercase()}")
}
```

### Useful string functions

```kotlin runnable
fun main() {
    val text = "  Android Development  "
    println(text.trim())                     // "Android Development"
    println(text.trim().lowercase())         // "android development"
    println(text.contains("Dev"))            // true
    println(text.trim().startsWith("And"))   // true
    println(text.trim().replace(" ", "_"))   // "Android_Development"
    println("a,b,c".split(","))              // [a, b, c]
    println("Kotlin"[0])                     // 'K'
    println("".isEmpty())                    // true
    println("   ".isBlank())                 // true
}
```

### Multi-line strings

Triple quotes create *raw strings* that can span lines. `trimIndent()` removes the common indentation:

```kotlin runnable
fun main() {
    val poem = """
        Roses are red,
        Kotlin is neat,
        Null safety makes
        my code complete.
    """.trimIndent()
    println(poem)
}
```

## Functions

Functions group code into reusable, named blocks.

```kotlin runnable
// name(parameter: Type, ...): ReturnType
fun add(a: Int, b: Int): Int {
    return a + b
}

// A function that returns nothing (Unit, like "void") can omit the return type
fun greet(name: String) {
    println("Hello, $name!")
}

fun main() {
    val sum = add(2, 3)
    println(sum)
    greet("Ada")
}
```

### Single-expression functions

If the body is a single expression, you can drop the braces and `return`:

```kotlin runnable
fun square(x: Int): Int = x * x
fun isAdult(age: Int) = age >= 18   // return type inferred as Boolean

fun main() {
    println(square(9))
    println(isAdult(16))
}
```

### Default and named arguments

Parameters can have **default values**, and callers can pass arguments **by name**. This is used *everywhere* in Jetpack Compose, so get comfortable with it now:

```kotlin runnable
fun orderCoffee(
    size: String = "Medium",
    sugar: Int = 0,
    milk: Boolean = true
): String {
    return "$size coffee, $sugar sugar, milk: $milk"
}

fun main() {
    println(orderCoffee())                            // all defaults
    println(orderCoffee("Large"))                     // first by position
    println(orderCoffee(sugar = 2))                   // skip to a named one
    println(orderCoffee(milk = false, size = "Small")) // any order when named
}
```

:::note Why this matters for Android
A Compose `Text` has over 15 parameters, all with defaults. You'll write `Text(text = "Hi", fontSize = 20.sp)` and ignore the rest. That's named and default arguments in action.
:::

### Variable number of arguments: `vararg`

```kotlin runnable
fun average(vararg numbers: Double): Double {
    if (numbers.isEmpty()) return 0.0
    return numbers.sum() / numbers.size
}

fun main() {
    println(average(4.0, 8.0, 6.0))
}
```

## Comments

```kotlin
// Single-line comment

/*
   Multi-line
   comment
*/

/**
 * KDoc: documentation comment. Android Studio shows this
 * when you hover over the function.
 * @param name the person to greet
 */
fun greet(name: String) = println("Hi $name")
```

## Recap

:::recap
- `val` = read-only, `var` = mutable. Prefer `val`.
- Types are inferred, but always static. Convert explicitly with `toInt()`, `toDouble()`, `toString()`…
- Use `$name` and `${expr}` for string templates.
- Functions: `fun name(param: Type = default): ReturnType`. Call them with named arguments for clarity.
:::

## Practice

:::exercise
1. Write a function `celsiusToFahrenheit(c: Double): Double` (formula: `c * 9 / 5 + 32`) and print the result for 0, 37 and 100.
2. Write a function `describe(name: String, age: Int, city: String = "Unknown")` that returns a sentence like *"Ada is 36 years old and lives in London."* Call it once with and once without `city`.
3. Write a single-expression function `initials(first: String, last: String)` that returns e.g. `"A.L."`.
:::

:::solution Show solutions
```kotlin runnable
fun celsiusToFahrenheit(c: Double): Double = c * 9 / 5 + 32

fun describe(name: String, age: Int, city: String = "Unknown"): String =
    "$name is $age years old and lives in $city."

fun initials(first: String, last: String) = "${first[0]}.${last[0]}."

fun main() {
    println(celsiusToFahrenheit(0.0))
    println(celsiusToFahrenheit(37.0))
    println(celsiusToFahrenheit(100.0))

    println(describe("Ada", 36, "London"))
    println(describe(name = "Alan", age = 41))

    println(initials("Ada", "Lovelace"))
}
```
:::

## Check your understanding

```quiz
Q: What happens with `val x = 5` followed by `x = 6`?
- [ ] x becomes 6
- [x] Compile error: a val cannot be reassigned
- [ ] Runtime crash
- [ ] x becomes 11
> `val` is read-only after it's assigned. Use `var` if you need to change it.

Q: What does `println(10 / 4)` print?
- [ ] 2.5
- [x] 2
- [ ] 3
- [ ] 2.0
> Both operands are Int, so this is integer division and the fractional part is discarded.

Q: Which is the correct way to show a calculation inside a string?
- [ ] `"Total: $price * qty"`
- [ ] `"Total: " + price * qty + ""` is the only way
- [x] `"Total: ${price * qty}"`
- [ ] `"Total: {price * qty}"`
> Use `${...}` for expressions. `$price * qty` would print the price followed by the literal text " * qty".

Q: Given `fun f(a: Int = 1, b: Int = 2)`, which call sets only `b` to 5?
- [ ] `f(5)`
- [x] `f(b = 5)`
- [ ] `f(, 5)`
- [ ] `f(b: 5)`
> Named arguments let you skip parameters with defaults. `f(5)` would set `a`.
```
