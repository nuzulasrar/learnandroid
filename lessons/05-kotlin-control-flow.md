---
id: kotlin-control-flow
title: "Kotlin Control Flow: if, when & Loops"
part: 2
minutes: 25
summary: Make decisions and repeat work. Learn if and when as expressions, ranges, and for/while loops.
---

:::goals
- Using `if` as a statement *and* as an expression
- The powerful `when` expression (Kotlin's supercharged `switch`)
- Ranges like `1..10`, `until`, `downTo` and `step`
- `for`, `while` and `do-while` loops, plus `break` and `continue`
:::

## `if` / `else`

```kotlin runnable
fun main() {
    val temperature = 28

    if (temperature > 30) {
        println("It's hot!")
    } else if (temperature > 20) {
        println("It's warm.")
    } else {
        println("It's cool.")
    }
}
```

Comparison operators: `==`, `!=`, `<`, `>`, `<=`, `>=`. Logical operators: `&&` (and), `||` (or), `!` (not).

### `if` is an expression

In Kotlin, `if` *returns a value*, so you can assign its result directly. (That's why Kotlin has no `? :` ternary operator; it doesn't need one.)

```kotlin runnable
fun main() {
    val age = 17
    val status = if (age >= 18) "adult" else "minor"
    println(status)

    // With blocks, the LAST expression in each block is the value:
    val discount = if (age < 12) {
        println("Child ticket")
        0.5
    } else {
        println("Regular ticket")
        0.0
    }
    println("Discount: $discount")
}
```

## `when`

`when` checks a value against many branches. It replaces long `if-else` chains and is one of Kotlin's best features:

```kotlin runnable
fun describeDay(day: Int): String {
    return when (day) {
        1 -> "Monday"
        2 -> "Tuesday"
        3, 4 -> "Midweek"           // several values
        in 5..7 -> "Almost weekend"  // a range
        else -> "Not a valid day"    // anything else
    }
}

fun main() {
    println(describeDay(1))
    println(describeDay(4))
    println(describeDay(6))
    println(describeDay(99))
}
```

`when` also works **without an argument**, like a clean `if-else if` chain where each branch is a condition:

```kotlin runnable
fun grade(score: Int): String = when {
    score >= 90 -> "A"
    score >= 80 -> "B"
    score >= 70 -> "C"
    score >= 60 -> "D"
    else -> "F"
}

fun main() {
    listOf(95, 83, 71, 40).forEach { println("$it → ${grade(it)}") }
}
```

And it can check **types** with `is` (you'll use this constantly with UI states later):

```kotlin runnable
fun describe(x: Any): String = when (x) {
    is Int -> "An integer: ${x + 1}"        // x is automatically treated as Int here
    is String -> "A string of length ${x.length}"
    is Boolean -> if (x) "Yes" else "No"
    else -> "Something else"
}

fun main() {
    println(describe(41))
    println(describe("Kotlin"))
    println(describe(true))
    println(describe(3.14))
}
```

:::note Smart casts
After `is Int ->`, Kotlin knows `x` is an `Int` inside that branch, so you can call `Int` things on it without casting. This is called a **smart cast**.
:::

## Ranges

```kotlin runnable
fun main() {
    val r1 = 1..5            // 1, 2, 3, 4, 5  (inclusive)
    val r2 = 1 until 5       // 1, 2, 3, 4     (excludes the end)
    val r3 = 1..<5           // same as until
    val r4 = 10 downTo 1     // 10, 9, ... 1
    val r5 = 0..20 step 5    // 0, 5, 10, 15, 20
    val letters = 'a'..'e'

    println(r1.toList())
    println(r2.toList())
    println(r3.toList())
    println(r4.toList())
    println(r5.toList())
    println(letters.toList())
    println(3 in r1)        // true
    println(7 !in r1)       // true
}
```

## `for` loops

`for` iterates over anything that can be iterated: ranges, lists, strings, maps…

```kotlin runnable
fun main() {
    for (i in 1..3) {
        println("Round $i")
    }

    val fruits = listOf("apple", "banana", "cherry")
    for (fruit in fruits) {
        println(fruit)
    }

    // Need the index too?
    for ((index, fruit) in fruits.withIndex()) {
        println("$index: $fruit")
    }

    for (ch in "Hey") print("$ch ")
    println()
}
```

## `while` and `do-while`

```kotlin runnable
fun main() {
    var countdown = 3
    while (countdown > 0) {
        println("$countdown…")
        countdown--
    }
    println("Liftoff! 🚀")

    // do-while runs the body at least once
    var attempts = 0
    do {
        attempts++
        println("Attempt $attempts")
    } while (attempts < 2)
}
```

## `break` and `continue`

```kotlin runnable
fun main() {
    for (n in 1..10) {
        if (n % 2 == 0) continue   // skip even numbers
        if (n > 7) break           // stop the loop entirely
        println(n)
    }
}
```

:::tip You'll write fewer loops than you think
In real Kotlin code, many loops are replaced by collection functions like `filter`, `map` and `sumOf`, which you'll learn next lesson. But understanding loops first makes those functions easy.
:::

## Recap

:::recap
- `if` and `when` are **expressions**: they return values.
- `when` can match values, ranges, types (`is`) or arbitrary conditions.
- Ranges: `a..b` (inclusive), `a until b` / `a..<b` (exclusive), `downTo`, `step`.
- `for (x in collection)` iterates; `while` repeats while a condition is true.
:::

## Practice

:::exercise
1. **FizzBuzz**: for numbers 1 to 20, print "Fizz" if divisible by 3, "Buzz" if divisible by 5, "FizzBuzz" if both, otherwise the number. Use `when`.
2. Write `fun bmiCategory(bmi: Double): String` using `when` without an argument: under 18.5 → "Underweight", under 25 → "Normal", under 30 → "Overweight", otherwise "Obese".
3. Print a multiplication table for 7 (7 × 1 up to 7 × 10) using a `for` loop.
:::

:::solution Show solutions
```kotlin runnable
fun fizzBuzz(n: Int): String = when {
    n % 15 == 0 -> "FizzBuzz"
    n % 3 == 0 -> "Fizz"
    n % 5 == 0 -> "Buzz"
    else -> n.toString()
}

fun bmiCategory(bmi: Double): String = when {
    bmi < 18.5 -> "Underweight"
    bmi < 25 -> "Normal"
    bmi < 30 -> "Overweight"
    else -> "Obese"
}

fun main() {
    for (i in 1..20) println(fizzBuzz(i))

    println(bmiCategory(22.4))

    for (i in 1..10) println("7 × $i = ${7 * i}")
}
```
Notice the FizzBuzz check for 15 comes **first**. `when` takes the first matching branch, so order matters.
:::

## Check your understanding

```quiz
Q: What is the value of `x` after `val x = if (3 > 5) "a" else "b"`?
- [ ] "a"
- [x] "b"
- [ ] true
- [ ] Compile error: if can't be assigned
> `if` is an expression in Kotlin; the else branch runs because 3 > 5 is false.

Q: Which range contains exactly 0, 1, 2, 3, 4?
- [ ] `0..5`
- [x] `0 until 5`
- [ ] `0 downTo 4`
- [ ] `1..4`
> `until` (or `..<`) excludes the end value. `0..5` would include 5.

Q: In `when (x) { is String -> x.length ... }`, why can you call `.length` without casting?
- [ ] Every type has a `length` property
- [x] Kotlin smart-casts `x` to String inside that branch
- [ ] `when` converts everything to strings
- [ ] You can't. It's a compile error
> After an `is` check succeeds, the compiler knows the type and smart-casts the variable.

Q: What does `continue` do inside a loop?
- [ ] Exits the loop completely
- [x] Skips the rest of the current iteration and moves to the next one
- [ ] Restarts the loop from the beginning
- [ ] Pauses the loop
> `break` exits the loop; `continue` jumps to the next iteration.
```
