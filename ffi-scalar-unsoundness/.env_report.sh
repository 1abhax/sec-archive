#!/bin/bash

echo "===== RUST ====="
rustc -vV
echo

echo "===== TOOLCHAIN ====="
rustup show
echo

echo "===== GCC ====="
gcc -v 2>&1 | tail -5
echo

echo "===== CLANG ====="
clang -v 2>&1 | tail -5
echo

echo "===== CPU ====="
lscpu
echo

echo "===== CPU FLAGS ====="
cat /proc/cpuinfo | grep flags | head -1
echo

echo "===== MEMORY ====="
free -h
echo

echo "===== KERNEL ====="
uname -a
echo

echo "===== GLIBC ====="
ldd --version | head -1
echo

echo "===== LINKER ====="
ld --version | head -1