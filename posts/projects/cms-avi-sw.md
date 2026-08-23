---
title: "N-Way Set Associative Cache Simulator"
summary: "Java simulator for cache behavior and replacement policies"
coverImage: "/assets/cache-simulator.svg"
order: -1
---

This project implements a vanilla Java cache simulator for experimenting with
n-way set associative cache behavior.

The simulator models cache organization and replacement-policy decisions,
including policies such as LRU, LFU, and FIFO. The goal was to make low-level
memory behavior observable through a compact implementation rather than treating
cache performance as an invisible hardware detail.

The project is useful because replacement policies are simple to describe but
easy to misunderstand in practice. A simulator makes those tradeoffs concrete:
what gets evicted, why it gets evicted, and how the same access pattern can
produce different hit rates under different policies.

The implementation keeps the scope deliberately focused on the core data
structures and policy logic. That made it a good systems-programming exercise in
Java while still connecting directly to computer architecture fundamentals.
