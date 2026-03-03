# Formal Analysis of Scalar Domain Narrowing at Rust–C FFI Boundaries Under opt-level=0 

### Complete Experimental Report

---

## I. Executive Summary

This document records comprehensive experimental findings for FFI scalar domain narrowing at **optimization level**: `opt-level=0` (debug mode, default). We demonstrate that boolean invariant enforcement is **optimization-dependent**, with explicit bit masking in debug mode and potential elision in release mode.

**Key Discovery:** The behavior of FFI scalar domain narrowing varies significantly based on compilation optimization level, suggesting that Rust's semantic enforcement is conditional on optimization assumptions.

---

## II. Metadata and Authorship Context

### Project Information

| Field              | Value                                        |
| ------------------ | -------------------------------------------- |
| Project Title      | Rust–C FFI Scalar Domain Narrowing           |
| Research Focus     | Cross-language scalar invariant preservation |
| Study Scope        | opt-level=0 (debug compilation semantics)    |
| Document Version   | v1.0 (opt-0 study)                           |
| Date of Experiment | 2026-03-03                                   |
| Author             | 羅韋翔                                       |
| Environment Type   | Local WSL2 research environment              |

------

## III. Experimental Platform Specification

### Toolchain

| Component     | Value                                 |
| ------------- | ------------------------------------- |
| rustc         | 1.96.0-nightly (ec818fda3 2026-03-02) |
| LLVM          | 22.1.0                                |
| Target Triple | x86_64-unknown-linux-gnu              |
| GCC           | 15.2.0 (Debian 15.2.0-7)              |
| GLIBC         | 2.41                                  |
| Linker        | GNU ld 2.45                           |

-----

## IV. Formal Mathematical Model

### 1. Type Definitions

Let:

```
τ_C  -> uint8_t
τ_R  -> bool
```

------

### 2. Domain Definitions

Define:

```
V_C = { x ∈ ℕ | 0 ≤ x ≤ 255 }
V_R = {0, 1}
```

The domain discrepancy:

```
ΔV = V_C \ V_R = {2,3,...,255}
```

------

### 3. FFI Contract Assumption

Rust declaration:

```
f: V_C → V_R
```

C implementation:

```
f_C(x) = x
```

Thus:

```
∃ x ∈ ΔV  such that  f_C(x) ∉ V_R
```

This violates Rust’s internal invariant:

```
∀ b: bool,  b ∈ {0,1}
```

----

## V. Proposition for opt-level=0

### Proposition P₀

Under debug compilation (`opt-level=0`):

> The compiler inserts an explicit normalization function
>  N : V_C → V_R
>  such that the bool invariant is preserved.

Formally:

```
∀ x ∈ V_C,
  N(x) = x AND 1
  N(x) ∈ V_R
```

---

## VI. Source Code Under Study

#### Rust: main.rs

```rust
// Link to C static library "bool_u8"
// C side: uint8_t get_u8(uint8_t v)
// We declare it as returning `bool` in Rust.
// ABI size matches (1 byte), but semantics differ:
//   C: 0..255
//   Rust bool: {0,1} only
#[link(name="bool_u8", kind="static")]
extern "C" {
    fn get_u8(v: u8) -> bool;
}

// Test 1: Branch behavior
// Goal: Observe how non-{0,1} values behave as bool
fn mode_branch(v: u8) {
    let b = unsafe { get_u8(v) };   // FFI call

    if b {
        println!("branch=T");
    } else {
        println!("branch=F");
    }

    // Inspect normalized boolean value
    println!("b as u8={}", b as u8);
}

// Test 2: Checked indexing
// Goal: See whether optimizer removes bounds check
fn mode_index_checked(v: u8) {
    let b = unsafe { get_u8(v) };
    let idx = b as usize;

    let arr = [10u8, 20u8];

    // Safe indexing (has bounds check)
    println!("idx={}, val={}", idx, arr[idx]);
}

// Test 3: Unchecked indexing
// Goal: Force raw memory access (no bounds check)
fn mode_index_unchecked(v: u8) {
    let b = unsafe { get_u8(v) };
    let idx = b as usize;

    let arr = [10u8, 20u8];

    // No bounds check
    let val = unsafe { *arr.get_unchecked(idx) };
    println!("idx={}, val={}", idx, val);
}

fn main() {
    let args: Vec<String> = std::env::args().collect();

    // If user provides no arguments, print usage hint
    if args.len() < 3 {
        println!("Usage:");
        println!("  ./main <value:0-255> <mode>");
        println!("Modes:");
        println!("  branch     - test boolean branch behavior");
        println!("  checked    - safe indexing (with bounds check)");
        println!("  unchecked  - unsafe indexing (no bounds check)");
        println!();
        println!("Example:");
        println!("  ./main 5 branch");
        println!();
    }
    let v: u8 = args.get(1)
        .and_then(|s| s.parse().ok())
        .unwrap_or(5);

    // Second argument: test mode
    // Options: branch | checked | unchecked
    // Default = "branch"
    let m = args.get(2)
        .map(|s| s.as_str())
        .unwrap_or("branch");

    match m {
        "branch" => mode_branch(v),
        "checked" => mode_index_checked(v),
        "unchecked" => mode_index_unchecked(v),
        _ => panic!("mode: branch | checked | unchecked"),
    }
}
```

---

#### C: lib.c

```c
#include <stdint.h>
uint8_t get_u8(uint8_t v) {
    return v;
}
```

---

### Compilation Procedure

```bash
# Compile C source file 'lib.c' into an object file 'lib.o'.
gcc -c lib.c -o lib.o

# Create a static library 'libbool_u8.a' from the object file 'lib.o'.
ar rcs libbool_u8.a lib.o

# Compile the Rust program 'main.rs' and link it with the static C library.
rustc main.rs -L . -C opt-level=0 -l static=bool_u8 -o main_rust
```

---

## ¿ not completed VII. Machine Code Analysis

| Feature (Machine Code Evidence)              | `mode_index_checked`                                         | `mode_index_unchecked`                                       |
| :------------------------------------------- | :----------------------------------------------------------- | :----------------------------------------------------------- |
| **FFI Return Boolean Masking**               | `179b3: 24 01 and $0x1,%al`                                  | `17a83: 24 01 and $0x1,%al`                                  |
| **Inline Index Bounds Check Logic**          | `179c7: cmpq $0x2,0x8(%rsp)` `179cd: jae 17a4e`<br /><br />(Action: Compares index with 2; jumps if index >= 2) | **Absent** in this function's inline code.                   |
| **Direct Panic Path (Visible)**              |                                                              | **Absent** as a direct internal jump.                        |
| **get_unchecked Function Call**              | **Absent**                                                   | `17aad: call 174c0 <_ZN4core5slice...get_unchecked...>`      |
| **Memory Address Calculation & Dereference** | `179cf: lea 0x16(%rsp),%rax` (array base)<br /> `179d4: add 0x8(%rsp),%rax` (add index) (Pointer in %rax used for subsequent operations) | `17ab2: mov (%rax),%al`<br/>(Dereferences pointer returned by `get_unchecked` to get value) |

The key instruction is:

```
and $0x1, %al
```

This operation performs:

```
b = x & 1
```

which is equivalent to:

```
b = x mod 2
```

------

## VIII. Mathematical Interpretation

For all:

```
x ∈ V_C
```

the compiler enforces:

```
π: V_C → V_R
π(x) = LSB(x)
```

Since:

```
x mod 2 ∈ {0,1}
```

we obtain:

```
∀ x ∈ V_C, N(x) ∈ V_R
```

Thus:

> The boolean invariant is preserved by projection, ensuring that the Rust `bool` type always holds a canonical `0` or `1`.

------

## IX. Empirical Confirmation

The observed runtime behavior across all test modes (`branch`, `checked`, `unchecked`) consistently matches the mathematical interpretation derived from the `and $0x1,%al` instruction.

Observed runtime behavior:

| Input `v` | `get_u8(v)` (C return) | Binary `v` (LSB) | `v & 1` (Rust FFI result) | `mode_branch` Output (`b` as `u8`, `T/F`) | `mode_index_checked` Output (`idx`, `val`) | `mode_index_unchecked` Output (`idx`, `val`) |
| :-------- | :--------------------- | :--------------- | :------------------------ | :---------------------------------------- | :----------------------------------------- | :------------------------------------------- |
| 0         | 0                      | `0b...0` (`0`)   | 0                         | `b as u8=0`, `branch=F`                   | `idx=0, val=10`                            | `idx=0, val=10`                              |
| 1         | 1                      | `0b...1` (`1`)   | 1                         | `b as u8=1`, `branch=T`                   | `idx=1, val=20`                            | `idx=1, val=20`                              |
| 2         | 2                      | `0b...0` (`0`)   | 0                         | `b as u8=0`, `branch=F`                   | `idx=0, val=10`                            | `idx=0, val=10`                              |
| 3         | 3                      | `0b...1` (`1`)   | 1                         | `b as u8=1`, `branch=T`                   | `idx=1, val=20`                            | `idx=1, val=20`                              |
| 5         | 5                      | `0b...1` (`1`)   | 1                         | `b as u8=1`, `branch=T`                   | `idx=1, val=20`                            | `idx=1, val=20`                              |
| 255       | 255                    | `0b...1` (`1`)   | 1                         | `b as u8=1`, `branch=T`                   | `idx=1, val=20`                            | `idx=1, val=20`                              |

All behaviors match:

```
index = x & 1
```

Both checked and unchecked indexing operate only on the least significant bit.

No out-of-bounds access occurs in debug mode.

------

## X. Formal Result

## Theorem T₀

Under `opt-level=0`:

The Rust FFI layer transforms the `uint8_t` return value `x` from C to a Rust `bool` value `Rust_bool(x)` such that:

```
Rust_bool(x) = x & 1
```

Therefore:

```
Rust_bool(x) ∈ {0,1}
```

for all:

```
x ∈ {0..255}
```

------

## XI. Security Implications (Debug Mode Only)

At `opt-level=0`:

- The compiler demonstrates a cautious approach to FFI boundaries, not implicitly trusting the C-side `uint8_t` to adhere to Rust's `bool` invariant.
- It explicitly inserts a canonicalization step (`and $0x1,%al`) into the generated assembly code.
- The domain discrepancy `ΔV` (values `2` through `255`) is effectively collapsed into `V_R` (`0` or `1`) by this projection.
- Consequently, memory safety is preserved even when utilizing `unsafe` constructs like `get_unchecked(idx)`, as the `idx` derived from the FFI `bool` is guaranteed to be either `0` or `1`, both of which are valid for the `arr` array.

Formally:

The projection `π: V_C → V_R` defined by `π(x) = x mod 2` acts as an invariant-preserving mechanism, ensuring data integrity at the FFI boundary.

------

## XII. Final Conclusion (opt-level=0)

- In debug compilation (`opt-level=0`):

  > Rust actively enforces its boolean invariants by masking the least significant bit of FFI `uint8_t` return values before they are interpreted as `bool` in Rust.

  All higher-order bits of the C return value are effectively discarded during this conversion. As a result:

  - The domain discrepancy `ΔV` is neutralized.
  - No boolean invariant violation propagates into Rust code.
  - No memory safety compromise is observed, even with `unsafe` operations like `get_unchecked`, because the derived index `idx` is guaranteed to be `0` or `1`.

  This robust behavior in debug mode provides a safety net during development, highlighting potential FFI type mismatches by ensuring that Rust's internal assumptions about `bool` are always met.