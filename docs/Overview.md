---
aliases:
 - Overview
tags:
  - TODO
---
# Overview

This document outlines the internal design and development goals of Party Pooper, a CLI tools for modding the [Construct 2 / NWJS](https://www.construct.net/en/construct-2/nwjs) game [Party Project](https://char64.itch.io/partyproject).

## Table of Contents

1. [Application Scope](#application-scope)
	1. [Use of Game Code / Data](#use-of-game-code--data)
	2. [Features](#features)
	3. [Supported Platforms](#supported-platforms)
2. [User Experience](#user-experience)
	1. [Target Users](#target-users)
	2. [UI](#ui)
	3. [Automation Scripting](#automation-scripting)
3. [Core Systems](#core-systems)
	1. [Mod Packaging](#mod-packaging)
	2. [Asset Management](#asset-management)
	3. [Game Decompilation](#game-decompilation)
	4. [Media Conversion](#media-conversion)
	5. [Build System](#build-system)

## Application Scope

### Use of Game Code / Data

Party Pooper does not ship with or distribute any game data from Party Project, adhering to the assumption that the game's assets are All Rights Reserved (ARR). Modders must supply their own copy of the `package.nw` file -- an NW.js archive that contains all the game's assets and logic.

### Features

Party Pooper's primary goals include:

- Decompilation and structured inspection of the game's code and data.
- Asset extraction and repackaging.
- Light asset editing tools, including automatic media conversion using FFmpeg.
- Bug patching and asset compatibility improvements.
- Experimental hooks for editing game logic.
- Long-term goal: seamless mod separation via a lightweight runtime mod loader.

Non-goals include implementing content or features that belong in user-authored mods. The tool will support extensive modification of the game's original codebase, but will stay out of game design beyond facilitating changes.

### Supported Platforms

Part Pooper currently supports both Windows and Linux, matching the platform support of Party Project.

**Additional Requirements**:

- Node.js >= 20.6.0
- Optionally bundles (but development does not depend on) FFmpeg based on build flag.
- No additional runtime dependencies beyond those in `package.json`.

The tool is game-version agnostic, with built-in schema comparison for assets and `data.js` that aims to detect changes in game structure and flag mod compatibility concerns early.

## User Experience

### Target Users

Party Pooper is designed for technical modders first and foremost, with future accessibility improvements planned for beginners/non-technical users. While asset replacement workflows requires only basic CLI literacy, deeper functionality (e.g. game logic editing) expects familiarity with TypeScript or JavaScript. A GUI is planned post feature-stability, but for now, all interactions are via the command line.

### UI

Currently, there is no GUI. Workflows are defined entirely through the CLI, with some complex operations invoking structured interactive prompts or purpose-built long-form views (akin to setup wizards). These are use primarily for documenting and annotating unknown schema elements in the game's structure.

### Automation Scripting

Party Pooper is designed to integrate cleanly into external automation pipelines. It exposes a CLI-first architecture where all major operations are controlled via flags and arguments. There is no embedded scripting language; modders are expected to use shell scripts, task runners, or build systems as needed.

## Core Systems

### Mod Packaging

Party Pooper treats the game's `package.nw` as a modifiable zip archive. It decompresses the archive, allows edits, and then repackages it. Multiple mod support is primitive for the moment -- conflicts must be manually resolved by the user. Incremental rebuilds are currently unsupported but are part of the future roadmap.

### Asset Management

As of now, asset management for mods is untracked. There is no validation of final builds or change detection. Planned improvements include:

- SHA-based hashing to detect modified files.
- A lightweight diff system for change tracking.
- Dependency graph resolution for future modular support.

Currently, the system operates on full file replacement without granular dependency.

### Game Decompilation

> See [Decompilation](Decompilation.md).

Party Pooper uses the game's `data.js`, a JSON blob that encodes the game's logic and textual data. It:

- Deserializes and traverses the JSON structure as a custom AST.
- Auto-generates a schema from the current game build.
- Compares this schema to a human-annotated reference version.
- Outputs a merged schema with inline documentation.

Planned features include externalizing annotations into YAML/Markdown, "exploding" the game into modular editable files, and supporting bidirectional transformations between exploded and bundled forms.

### Media Conversion

Media conversion uses a bundled or shared FFmpeg library to simplify asset swap mods.

- Preset-based conversion for images and audio.
- Abstracted CLI commands to reduce friction.
- Long-term support for slicing sprite sheets using scheme data.
- Planning patching of the game runtime to allow flexible image dimensions (e.g. auto-scaling in-game).

These features target uses with limited asset conversion experience, helping them conform to Party Project's required asset formatting.

### Build System

> See [Build System](BuildSystem.md) for details.

Internally, Party Pooper's own build system is quite complex. Basically, it:

- Downloads and caches Node.js and FFmpeg binaries.
- Performs code stripping based on a custom compiler directive system.
- Bundles core logic and FFmpeg into a Single Executable App using Rollup.