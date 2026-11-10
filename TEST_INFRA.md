# Bonnie & Tammy's Trinket Tales — E2E Test Infrastructure & Architecture

**Document Version:** 2.0.0  
**Target Environment:** Node.js v20+ / Windows & Linux  
**Scope:** Video Production Pipeline Overhaul — Requirements R1, R2, R3, R4 (`ORIGINAL_REQUEST.md` entry ## 2026-10-27T04:12:40Z & `PROJECT.md`)  
**Lead Test Architect:** `test_writer_e2e`  

---

## 1. Executive Summary & Purpose

"Bonnie & Tammy's Trinket Tales" is an autonomous 24/7 short-form character animation and video generation studio for Bonnie's Boutique (`https://btboutiqe.com/`). The studio generates 1080x1920 vertical H.264/AAC videos featuring 74-year-old grandmother Bonnie and her witty daughter Tammy reacting to top-screen viral clips, appraising handmade beaded pens and keychains, and sharing cozy boutique stories.

This document establishes the test architecture, 4-tier test methodology, authoritative expected output derivations, feature inventory coverage matrix, and tier pass thresholds for the comprehensive video pipeline overhaul:
- **R1: Hybrid, Non-Repetitive Multi-Format Commentary Engine ($0/Month Friendly)**
- **R2: Minecraft-Style Ambient "Flow Music" Soundtrack Engine + Custom Track Support**
- **R3: Production-Quality Animation, Dynamic Camera Work & Visual Polish**
- **R4: End-to-End Compatibility & Automated Verification**

All tests follow **opaque-box, requirement-driven principles**: assertions test behavioral interface contracts, observable outputs, mathematical invariants, and specification compliance rather than transient implementation trivia.

---

## 2. Test Architecture & Directory Structure

```
wonderful-hertz/
├── TEST_INFRA.md                          # Test Architecture & Methodology Specification (this document)
├── TEST_READY.md                          # E2E Test Suite Verification & Readiness Publication
├── scripts/
│   ├── test-e2e-suite.mjs                 # Master Executable 4-Tier E2E Test Runner (CLI & Automation)
│   ├── verify-studio.mjs                  # Interactive Studio Master Verification Suite (30 unit/integration checks)
│   ├── generate-ai-episode.mjs            # Standalone Headless 30fps Episode Generator & ffmpeg Compositor
│   └── publish-socials.mjs                # 24/7 Autonomous Multi-Platform Social Publisher
├── src/
│   ├── app/
│   │   ├── page.tsx                       # Customer-Facing Storefront (Strict Guardrails: zero "16-bit", zero /admin)
│   │   └── studio/page.tsx                # Frictionless Unauthenticated Studio Route
│   ├── components/
│   │   └── studio/
│   │       └── StudioCanvas.tsx           # Virtual Camera Cinematography, Burnt-In Captions, CRT Glow
│   └── lib/
│       └── studio/
│           ├── commentary/
│           │   ├── types.ts               # Commentary Types, ShowFormatId, Ledger Schema
│           │   ├── antiRepetitionLedger.ts # Trigram Overlap Gatekeeper & LRU Format Rotation
│           │   ├── proceduralWriter.ts    # Combinatorial Slot Dictionaries (>800k trajectories)
│           │   └── llmWriter.ts           # Resilient Gemini Flash Facade with 5s Timeout
│           ├── flowMusicEngine.ts         # Procedural Minecraft Ambient Synthesizer & Ducking Math
│           ├── audioSynth.ts              # Web Audio API Nodes & In-Browser Playback
│           ├── characterRig.ts            # Head/Arm Kinematics, Secondary Motion, Emote Particles
│           └── backdrops.ts               # 5 Cozy Backdrops, Dynamic CRT Glow, Multi-Frequency Flicker
├── public/
│   ├── music/                             # Custom Ambient Background Music Tracks (.mp3, .wav)
│   ├── reaction-clips/                    # Expanded Curated 16:9 H.264 Clips (>= 10 files)
│   └── exports/
│       ├── anti-repetition-ledger.json    # Persistent Rolling 12-Episode Window Ledger
│       └── videos/                        # Compiled Production MP4 Episodes
```

---

## 3. 4-Tier Test Methodology & Coverage Matrix

The E2E test suite (`scripts/test-e2e-suite.mjs`) is structured into four distinct, progressive tiers:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       TIER 4: REAL-WORLD APPLICATION SCENARIOS              │
│   • Full episode generation with custom music track and metadata (4.1)      │
│   • Full episode generation across all 6 formats with <15% overlap (4.2)    │
│   • Complete storefront & studio guardrail integrity audit (4.3)            │
├─────────────────────────────────────────────────────────────────────────────┤
│                    TIER 3: CROSS-FEATURE COMBINATIONS                       │
│   • Flow music synthesis + sidechain ducking + 30fps video compositing (3.1)│
│   • LLM failure + procedural fallback + anti-repetition ledger update (3.2) │
│   • Custom music track + speech intervals ducking + format rotation (3.3)   │
│   • Captions + virtual camera punch-in + character emote particles (3.4)    │
│   • Persistent ledger + social captions + catalog product rotation (3.5)    │
├─────────────────────────────────────────────────────────────────────────────┤
│                    TIER 2: BOUNDARY & CORNER CASES                          │
│   • Empty/zero duration audio handling (2.1)                                │
│   • Extreme durations boundary (5s vs 120s) (2.2)                           │
│   • Simulated LLM API failure (429/503) & <100ms procedural fallback (2.3)  │
│   • Special characters, quotes & unicode emojis in product titles (2.4)     │
│   • Rolling 12 consecutive episodes overlap limit (<15%) (2.5)              │
│   • Unknown show format ID fallback (2.6)                                   │
│   • Empty public/music/ directory handling (2.7)                            │
│   • Corrupted/zero-byte audio file fallback (2.8)                           │
│   • Zero-length and overlapping speech intervals normalization (2.9)        │
│   • Empty dialogue beat text ("") handling (2.10)                           │
│   • Massive dialogue text (500+ words) wrapping (2.11)                      │
│   • LRU format rotation fairness across 18 runs (2.12)                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                    TIER 1: CORE FEATURE COVERAGE                            │
│   • Commentary Formats Engine: 6 formats, >800k states, voices (1.1.1-1.1.5)│
│   • Anti-Repetition Ledger: schema, trigrams, <15% overlap, LRU (1.2.1-1.2.5)│
│   • Flow Music Synthesis: 6 moods, felt piano, pads, marimba (1.3.1-1.3.5)  │
│   • Smooth Ducking: ~70ms attack, ~600ms release, -10.5 dB gain (1.4.1-1.4.5)│
│   • Custom Music Support: public/music/, looping, ducking (1.5.1-1.5.5)     │
│   • Virtual Cinematography: float drift, zoom, impact shake (1.6.1-1.6.5)   │
│   • Character Kinematics: head pitch/tilt, secondary lag, emotes (1.7.1-1.7.5)│
│   • Reaction Clips: >= 10 clips, MP4 validity, topic mapping (1.8.1-1.8.5)  │
│   • Burnt-In Captions: safe zones, karaoke highlight, bounce (1.9.1-1.9.5)  │
│   • 30fps Headless Export: fps=30, 1080x1920, libx264/aac (1.10.1-1.10.5)   │
│   • Storefront Guardrails: zero "16-bit", zero /admin links (1.11.1-1.11.5) │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Feature Inventory Coverage Mapping

| Feature # | Feature Name | Requirement | Primary Test File / Method | Tier Coverage |
|:---:|---|:---:|---|:---:|
| **F1** | 6+ Distinct Show Formats Engine | R1 | `scripts/test-e2e-suite.mjs` (Suite 1.1) | Tier 1, 2, 4 |
| **F2** | Persistent Anti-Repetition Ledger | R1 | `scripts/test-e2e-suite.mjs` (Suite 1.2) | Tier 1, 2, 3, 4 |
| **F3** | $0/Month Deep Procedural Commentary | R1 | `scripts/test-e2e-suite.mjs` (Suite 1.1) | Tier 1, 2, 3 |
| **F4** | Resilient LLM Commentary Facade | R1 | `scripts/test-e2e-suite.mjs` (Suite 1.1) | Tier 1, 2, 3 |
| **F5** | Minecraft/C418 Flow Music Synthesizer | R2 | `scripts/test-e2e-suite.mjs` (Suite 1.3) | Tier 1, 2, 3 |
| **F6** | Evolving Melodic Phrasing (22–30s) | R2 | `scripts/test-e2e-suite.mjs` (Suite 1.3) | Tier 1, 3 |
| **F7** | Smooth Sidechain Volume Ducking | R2 | `scripts/test-e2e-suite.mjs` (Suite 1.4) | Tier 1, 2, 3 |
| **F8** | Custom Music Track Support | R2 | `scripts/test-e2e-suite.mjs` (Suite 1.5) | Tier 1, 2, 3, 4 |
| **F9** | Dynamic Virtual Cinematography | R3 | `scripts/test-e2e-suite.mjs` (Suite 1.6) | Tier 1, 3 |
| **F10** | Character Kinematics & Secondary Motion | R3 | `scripts/test-e2e-suite.mjs` (Suite 1.7) | Tier 1, 3 |
| **F11** | Reaction Emote Particles & CRT Glow | R3 | `scripts/test-e2e-suite.mjs` (Suite 1.7) | Tier 1, 3 |
| **F12** | Curated Reaction Clips Expansion (>= 10) | R3 | `scripts/test-e2e-suite.mjs` (Suite 1.8) | Tier 1, 4 |
| **F13** | High-Impact Burnt-In Captions | R3 | `scripts/test-e2e-suite.mjs` (Suite 1.9) | Tier 1, 3 |
| **F14** | True 30fps Headless Frame Capture | R3, R4 | `scripts/test-e2e-suite.mjs` (Suite 1.10) | Tier 1, 3, 4 |
| **F15** | Storefront Guardrails & Platform Security | R4 | `scripts/test-e2e-suite.mjs` (Suite 1.11) | Tier 1, 4 |
| **F16** | End-to-End Production MP4 Verification | R4 | `scripts/test-e2e-suite.mjs` (Suite 4) | Tier 4 |

---

## 5. Test Tier Thresholds & Acceptance Criteria

| Tier | Minimum Test Cases Required | Strict Passing Threshold | Maximum Allowed Duration | Exit Code Contract |
|---|:---:|:---:|:---:|:---:|
| **Tier 1: Feature Coverage** | >= 55 cases (5 per 11 areas) | **100% Pass** (0 Failures) | < 5.0s | Exits 0 on pass, 1 on fail |
| **Tier 2: Boundary & Corner Cases** | >= 10 cases | **100% Pass** (0 Failures) | < 2.0s | Exits 0 on pass, 1 on fail |
| **Tier 3: Cross-Feature Combinations** | >= 5 complex interactions | **100% Pass** (0 Failures) | < 2.0s | Exits 0 on pass, 1 on fail |
| **Tier 4: Real-World Workload Scenarios** | >= 3 complete workflows | **100% Pass** (0 Failures) | < 5.0s | Exits 0 on pass, 1 on fail |
| **Total Test Suite** | **75 Test Cases** | **100% Pass** | < 10.0s | **Exit Code 0** |

---

## 6. Execution Guide

### Master E2E Test Suite Execution
```bash
# Execute entire 4-tier E2E test suite (all 75 tests)
node scripts/test-e2e-suite.mjs
```

### Targeted Tier Execution
```bash
# Run Tier 1 only (Core Feature Coverage: 55 tests across 11 feature areas)
node scripts/test-e2e-suite.mjs --tier=1

# Run Tier 2 only (Boundary & Corner Cases: 12 tests)
node scripts/test-e2e-suite.mjs --tier=2

# Run Tier 3 only (Cross-Feature Combinations: 5 tests)
node scripts/test-e2e-suite.mjs --tier=3

# Run Tier 4 only (Real-World Workload Scenarios: 3 tests)
node scripts/test-e2e-suite.mjs --tier=4
```

### Verbose Mode
```bash
node scripts/test-e2e-suite.mjs --verbose
```

---

## 7. Authoritative Expected Output Derivation

All assertions are mathematically and empirically derived from authoritative specifications in `ORIGINAL_REQUEST.md` (## 2026-10-27T04:12:40Z) and `PROJECT.md`:

### 7.1 Trigram Overlap Invariant (< 15.0%)
- **Tokenization:** Text is lowercased, punctuation stripped (`/[^a-z0-9\s]/g -> ' '`), and collapsed to whitespace-delimited tokens.
- **Trigrams:** All unique contiguous 3-word windows:
  $$T(E) = \{ (w_i, w_{i+1}, w_{i+2}) \mid 1 \le i \le N - 2 \}$$
- **Directed Overlap Ratio:**
  $$\text{Overlap}(E_{\text{cand}}, E_{\text{rec}}) = \frac{|T(E_{\text{cand}}) \cap T(E_{\text{rec}})|}{|T(E_{\text{cand}})|}$$
- **Invariant:** For all candidate scripts, $\text{Overlap} < 0.15$ ($15.0\%$) against every episode in the rolling 12-episode ledger window.

### 7.2 Sidechain Volume Ducking Math
- **Target Attenuation:** $-10.5\text{ dB}$, yielding linear amplitude multiplier:
  $$G_{\text{ducked}} = 10^{-10.5 / 20} \approx 0.298538$$
- **Attack Envelope:** Linear attenuation ramp over $t_{\text{attack}} = 70\text{ ms}$ ($0.07\text{s}$) upon speech onset.
- **Release Envelope:** Linear recovery ramp over $t_{\text{release}} = 600\text{ ms}$ ($0.60\text{s}$) after speech completion.
- **Sample Rate / Audio Parity:** 44.1 kHz, 16-bit PCM stereo WAV buffer output with matching Web Audio API node scheduling.

### 7.3 Spectral Centroid & Envelope Phrasing Variation (> 15.0%)
- **Spectral Centroid:** Center of gravity of audio frequency spectrum:
  $$f_c = \frac{\sum_{k=1}^{K} f_k \cdot |X(k)|}{\sum_{k=1}^{K} |X(k)|}$$
- **Phrasing Invariant:** From ambient intro (seconds 0–4) to melodic peak (seconds 12–18) to cadence (seconds 24–28), spectral centroid must vary by $> 15\%$, reflecting C418-style evolving orchestration.

### 7.4 30fps Headless Capture & Video Encoding Contract
- **Canvas Resolution:** $1080 \times 1920$ pixels ($9:16$ aspect ratio).
- **Frame Rate:** Strict $30.0\text{ fps}$ ($\Delta t = 33.33\text{ ms}$ per frame).
- **Encoding Pipeline:** Input `-framerate 30 -i frame_%04d.png`, video `-c:v libx264 -pix_fmt yuv420p`, audio `-c:a aac -b:a 192k`.

### 7.5 Storefront Security Guardrails
- **Customer Text Invariant:** Client-rendered text in `src/app/page.tsx` strictly contains zero occurrences of the phrase `"16-bit"` (case-insensitive).
- **Admin Isolation Invariant:** Public storefront components (`Header.tsx`, `ProductCard.tsx`, `CartDrawer.tsx`, `page.tsx`) contain zero navigation links or references to `/admin`.
- **Studio Route Invariant:** `src/app/studio/page.tsx` is unauthenticated to enable automated recording and testing pipelines.
