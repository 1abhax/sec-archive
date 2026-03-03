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