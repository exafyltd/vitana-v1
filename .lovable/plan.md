

## Restore "Foto / Video" label on the upload button

The plan mistakenly changed the label to just "Foto". Simple one-line fix:

### `src/components/profile/mobile/MobileCreatePostSheet.tsx`

- **Line 178**: Change `Foto` back to `Foto / Video`

