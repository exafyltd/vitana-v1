
## Investigation Result: Language Toggle on Intro Screen

### What I found
I tested the language toggle on the Maxina intro screen and **it works correctly in my testing** — clicking the flag switches between German and English, and all text updates properly.

### However, there are two issues that could cause problems on the user's device:

**1. Flag shows CURRENT language instead of TARGET language**
The button shows the German flag when German is active, and the GB flag when English is active. This is counterintuitive — most language toggles show the flag you'll switch TO. After clicking, the flag changes but the visual feedback is confusing (you see DE→GB instead of GB→DE). This could make it seem like "nothing happened" since the flag appears to stay the same momentarily.

**Fix**: Swap the flag logic so the button shows the language you'll switch TO:
```
// Current (wrong): shows current language flag
const flagToShow = isGerman ? deFlag : gbFlag;
// Fixed: shows target language flag  
const flagToShow = isGerman ? gbFlag : deFlag;
```

**2. Mobile orb may overlap the language button**
The VITANA orb on mobile is positioned at `z-40` (fixed, centered bottom), while the language toggle button is inside content at `z-10`. On smaller screens or with safe-area insets, the orb could physically sit on top of the flag button, intercepting touch events and making it untappable.

**Fix**: Raise the content area's z-index for the button row, or add explicit spacing to prevent overlap.

### Plan
1. **Fix the flag display logic** — swap `deFlag`/`gbFlag` so the button shows the target language (what you'll switch to)
2. **Ensure the language button isn't blocked by the orb** — add `relative z-50` to the button row containing Play Welcome + Language Toggle so it sits above the orb on mobile
