# Sakura Widget for Scriptable

A generative sakura widget for **Scriptable on iOS**.
![sakuraTree](https://github.com/user-attachments/assets/e0e76d55-d338-420d-b4eb-b8a256588c8c)

This widget draws a stylized Japanese cherry tree directly inside Scriptable. The rendering is based on a generative growth model with:

- space colonization
- an initial skeleton for trunk and main branches
- local thickening of older segments
- multiple growth stages
- shoot stages
- buds, blossoms, falling petals, and a bare phase

Each time the widget is redrawn by iOS, it advances to the next stage automatically, making the tree feel like it is evolving over time.

## Features

- Generative cherry tree rendered directly in Scriptable
- Multiple growth stages
- Strong trunk with natural tapering
- Extra shoot stages before blooming
- Buds, max bloom, falling petals, and bare phase
- Multiple style profiles:
  - Natural
  - Minimal
  - Ornamental
- Configurable colors
- Optional sun on/off
- Seed-based tree variations
- Persistent state via `Keychain`
- Automatic stage progression on each widget refresh
- Live preview inside Scriptable

## Requirements

- iPhone or iPad running iOS
- **Scriptable** installed
- Basic familiarity with creating and running scripts in Scriptable
- A Scriptable widget added to your Home Screen

## Installation

1. Install Scriptable from the App Store
2. Create a new script in Scriptable
3. Paste the full JavaScript source into the script
4. Save it, for example as `Sakura Widget`
5. Run the script once manually to initialize settings and persistence
6. Add widget to your home screen

## Adding the widget

1. Enter Home Screen edit mode
2. Add a new **Scriptable widget**
3. Choose the size you want:
   - Small
   - Medium
   - Large
4. Select your Sakura script as the widget source

From then on, each widget redraw will advance the tree to the next growth stage.

## How it works

This widget does **not** use an internal timer animation.

Instead:

- iOS requests a widget redraw from time to time
- on each widget run, the current stage is loaded
- the stage is incremented by 1
- that stage is rendered
- after the final stage, the cycle starts over

This behavior is intentional and fits the native iOS widget model much better than trying to simulate continuous animation.

## Stage model

The current version includes multiple states, for example:

1. Early trunk growth
2. Trunk and main branch development
3. Crown maturation
4. Additional shoot stages
5. Dot, small bud, large bud
6. Open blossoms on shoot tips
7. Maximum bloom
8. Falling petals
9. Bare tree phase

## Settings inside Scriptable

When you open the script directly in Scriptable, you can access preview and settings actions.

The current version lets you adjust:

- style profile
- preview size
- colors:
  - background
  - trunk and branches
  - blossoms
  - sun
  - ground
- sun on/off
- seed for new tree variations
- reset stage

## Seed and persistence

The script stores state and settings using `Keychain`.

This includes:

- current seed
- colors
- style
- preview size
- sun visibility
- current stage

That means the tree can continue evolving consistently across widget refreshes.

## Technical approach

The rendering is built around a generative tree model:

### 1. Initial skeleton
A first trunk and main branch structure is created.

### 2. Space colonization
Attraction points define the overall crown shape. New segments grow toward those points.

### 3. Radius calculation
Older and more structural segments receive more visual weight. The trunk and major branches remain stronger than new outer twigs.

### 4. Local thickening
Not all segments mature at the same pace. Older inner parts become visually thicker, while newly visible growth remains finer at first.

### 5. Shoot system
After the main tree structure is established, additional short shoots appear, which later develop buds and blossoms at their tips.

## Why there is no real animation

Scriptable widgets are not redrawn continuously by iOS. Because of that, this project intentionally uses discrete growth stages instead of fluid animation.

This has two major advantages:

- it matches the actual iOS widget lifecycle
- it produces a calmer, more natural visual result

## Current focus

The current release is mainly focused on:

- strong Small widget appearance
- sharper lines for small widget sizes
- more natural trunk structure
- an organic, poetic sakura look

## Notes

- The actual widget refresh timing is controlled by iOS
- `refreshAfterDate` is only a requested refresh hint, not a guarantee
- Small widgets are visually demanding, because very fine twigs can easily look soft
- The Small widget version is therefore intentionally tuned for clarity and readability

## Use cases

- Seasonal Home Screen widget
- Meditative generative visual
- Foundation for a future ESP32 or E-Paper port
- Organic growth study

## License

MIT
