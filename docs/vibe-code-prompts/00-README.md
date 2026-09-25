# Health Journey — Vibe Coding System Prompts

Three system prompts for building three connected tools. Paste each one into your vibe coding tool (Claude Code, Lovable, Bolt, Cursor, v0, etc.) as the project's system prompt or first message.

## The three builds

1. **01-habit-experiment-lab.md** — An n-of-1 "treat myself as a guinea pig" tracker. Remove things (caffeine, sugar), add things (magnesium, meditation), shift things (gym morning vs evening), and measure what actually changes.
2. **02-symptom-to-course-audio.md** — Takes symptoms, maps them to body systems, and generates a curious, beginner-friendly course written for the ear, then voiced through Higgsfield.
3. **03-research-scout.md** — Finds the latest research on a question (e.g. tinnitus and teeth), shows who wrote it and how to contact them, surfaces clinical trials, and feeds papers into the course generator.

## How they connect

- The **Research Scout (3)** produces paper records. The **Course Generator (2)** can consume them as source material, so every module cites and links the papers it's built from.
- The **Habit Lab (1)** can pull "things worth testing" from Research Scout findings, and its experiment results can become a personal module in a course ("What happened when I tried magnesium").
- Your existing **symptom narrowing tool** can trigger Research Scout queries whenever a new symptom is logged or a condition's probability shifts.

A shared data contract is defined at the bottom of prompts 2 and 3 so the pieces snap together whether you build them as one app or three.

## Build order suggestion

Build 3 first (it's the data source), then 2 (it consumes 3), then 1 (independent, but gains from both).
