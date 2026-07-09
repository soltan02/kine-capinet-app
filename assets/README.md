Place the provided cabinet logo image in this folder with the following filenames:

- cabinet-logo.png            (recommended 1024x1024 PNG)
- cabinet-logo-foreground.png (for Android adaptive foreground)
- cabinet-logo-background.png (for Android adaptive background)
- cabinet-logo-monochrome.png (optional monochrome)
- cabinet-favicon.png         (recommended 64x64 PNG)

You can generate these using ImageMagick or the `expo optimize` / `expo prebuild` tooling.

Example ImageMagick commands:

```bash
# Resize original to 1024x1024
magick convert original.png -resize 1024x1024^ -gravity center -extent 1024x1024 assets/cabinet-logo.png
# Favicon
magick convert original.png -resize 64x64 assets/cabinet-favicon.png
# Android foreground (transparent background)
magick convert original.png -resize 432x432 assets/cabinet-logo-foreground.png
# Android background (solid color)
magick convert -size 432x432 canvas:#E6F4FE -gravity center assets/cabinet-logo-background.png
# Monochrome
magick convert original.png -colorspace Gray -resize 432x432 assets/cabinet-logo-monochrome.png
```
