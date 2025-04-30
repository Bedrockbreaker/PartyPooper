---
aliases:
 - Decompilation
tags:
  - TODO
---
# Decompilation

This document outlines the decompilation process of the `data.js` file contained within the `package.nw` archive.

The core design here is to treat `data.js` as a semi-structured binary blob, even though it's JSON. Tooling should be:

- Schema-aware: driven by hand-annotated mappings.
- Version-tolerant: capable of detecting structural shifts.
- Diff-oriented: able to track and compare changes across game updates.
- Annotatable: support for human- or tool-generated metadata and notes.

This breaks down into the following steps and processes:

1. [Data Loading](#data-loading)
2. [Schema Generation](#schema-generation)
3. [Schema Merging](#schema-merging)
4. [Annotation](#annotation)
5. [Exporting](#exporting)
6. [Splitting](#splitting)
7. [Packing](#packing)

## Data Loading

1. Loads a raw `data.js` file fully into memory.
2. Deserializes the blob into an object.
3. Computes basic metadata like file hash.

## Schema Generation

Extensively uses memoization and path-based caching to speed up the traversal and decrease memory costs.

1. Recursively inspect the data object, producing a structure tree.
2. Identify types (`number`, `string`, `array`, `object`, `null`) as well as:
	- Array lengths
	- Object keys
	- Field names using heuristics
3. Does not interpret meaning but builds a candidate schema from raw data.

## Schema Merging

1. Compare the generated schema to a known mapping (hand-authored or previously saved).
2. Identify the matching structures.
3. Flag unknown or changed parts.
4. Output a patchable delta that can be reviewed or saved.

This is intended to support:

- Version control schema mappings over time.
- Display regressions if a game update breaks compatibility.

## Annotation

1. Traverse the schema and associated data.
2. Render it in a developer-usable format (CLI tree or editable JSON).
3. Let a human annotate names, descriptions, and types for unknown fields.
4. Annotations will be saved with the schema.

Long term, loading semantic metadata from a separate file (e.g. YAML or markdown) should allow users to create alternate annotations without rewriting the base schema.

## Exporting

The IO/transformer layer. 

1. Displays annotated data.
2. Supports exporting to a human-readable format (Markdown, JSON).
3. Includes hooks/code transformers (e.g. to decompile or recompile events).
4. Enables integration into tooling pipelines or build systems.

## Splitting

1. Take a raw `data.js` and explode it into many editable files (e.g. one file per map, one for each object type, etc.).
2. Uses a provided annotated schema to extract and label everything.

This is intentionally designed to improve Git-based diffing, user editing, and modular tooling.

## Packing

1. Stitch all the separate edited files back into a single valid `data.js`.
2. Validate structure against schema.
3. Run compatibility hooks to patch saved games.

Long term:

1. Path `index.html` and/or `c2runtime.js` to monkeypatch the runtime and create a mod loader.
2. Keep mode code and assets separated from the original game's `data.js`.
3. Support hot-reloading of mods from loose files.
4. Load-order system with mod priorities, compatibility checks, and auto-merge strategies.