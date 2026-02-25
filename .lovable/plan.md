

## Two Changes: Translation Fix + Photo Upload in Posts

### 1. German Translation Update

**File: `src/i18n/de.json`** (line 1683)
- Change `"placeholder": "Was bewegt dich?"` to `"placeholder": "Was mich gerade bewegt?"`

### 2. Add Photo Upload to MobileCreatePostSheet

The `useProfilePosts.createPost` mutation already accepts an `imageUrl` parameter and the `ProfilePostsTab` already renders `post.image_url`. The only missing piece is the UI to attach a photo when creating a post.

**File: `src/components/profile/mobile/MobileCreatePostSheet.tsx`**

- Add state for selected image file and preview URL
- Add a photo button in the footer (using `ImagePlus` icon from lucide) that opens a hidden file input
- Show a preview of the selected image between the textarea and footer, with a remove button
- On post: upload the image to `media-uploads` bucket via Supabase Storage, get a signed URL, then pass it as `imageUrl` to `createPost.mutateAsync`
- Clear image state on close/post

The footer will show the photo button on the left and the character count on the right, similar to Facebook's post composer.

### Technical Details

```tsx
// New state
const [imageFile, setImageFile] = useState<File | null>(null);
const [imagePreview, setImagePreview] = useState<string | null>(null);
const fileInputRef = useRef<HTMLInputElement>(null);

// Upload handler
const handlePost = async () => {
  let imageUrl: string | undefined;
  if (imageFile) {
    const user = (await supabase.auth.getUser()).data.user;
    const path = `${user!.id}/posts/${Date.now()}.${imageFile.name.split('.').pop()}`;
    await supabase.storage.from('media-uploads').upload(path, imageFile);
    const { data } = await supabase.storage.from('media-uploads').createSignedUrl(path, 31536000);
    imageUrl = data?.signedUrl;
  }
  await createPost.mutateAsync({ content: content.trim(), imageUrl });
};

// In footer, add photo button
<button onClick={() => fileInputRef.current?.click()}>
  <ImagePlus className="h-5 w-5" />
</button>
```

Two files changed total. No new files or dependencies needed.

