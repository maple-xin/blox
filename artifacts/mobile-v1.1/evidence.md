# BLOCK & BLOOM Mobile v1.1 — verification

## Changes
- Compact live goals expand to the complete checklist. Pause retains sound, speed and the field guide.
- Portrait: enlarged map with a safe optical center; four 52 px crew buttons; tools at least 44 px wide and 64 px tall; 52 px confirmation button. Utility controls hide during confirmation.
- Landscape: 210 px sidebar, separate map/tool area, readable scrollable full objectives and a welcome page with visible actions. Safe-area spacing and dynamic viewport height are supported.
- Drag pans on touch/mobile layouts. Desktop mouse drag still rotates. Pinch zooms around the gesture center. Fit island restores the overview.
- Hold 320 ms for a local magnifier; slide to aim and release to preselect. A job requires the existing separate confirmation. Pinch release, cancellation and focus loss cannot submit an unintended tap.

## Completed checks
- 48 automated checks passed: 42 campaign/rule/save checks and 6 gesture/camera checks. Full report: tests.txt.
- Camera projection checks passed: 32 views and 3,168 tile rays. Four edited JS modules passed syntax checks.
- Modular and embedded editions loaded. The embedded file includes 20 modules plus the local font and license notices; static dist built successfully.
- Actual browser input at 390 × 844 panned without rotating or issuing a job. A 650 ms hold displayed/drew the magnifier and released to selection without a command. A subsequent valid selection and confirmation queued one helper and completed one dig.
- World 12 animal/water/wheel/crew summaries and full goals were inspected. The portrait confirmation has no overlap with Photo/Undo. At 844 × 390 the landscape full-goal card ends above the crew row. At 320 × 700 all six tool controls remain on screen. Desktop 1112 × 720 was also inspected.
- Console warning/error lists were empty in the observed modular and embedded test flows.
- Mutating playtests used port 5191, separate from the player's 5190 save. The player preview was resumed after the update and still showed its 1/2 rescued animals and existing crew positions. The original little-miners project and previous v1 ZIP were not edited.

## Limits
Browser viewport emulation and reducer tests do not establish physical-phone usability, device frame rate or actual multi-touch behavior on iOS/Android. Those need device playtesting. No external platform import or publication was performed.

Screenshots are actual local browser captures, not generated mockups.
