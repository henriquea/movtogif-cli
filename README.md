
![gif](https://cldup.com/ES217cShEW.gif)

I'm using [ffmpeg](https://ffmpeg.org/) and [imagemagick](http://www.imagemagick.org/) manually to generate animated gifs from QuickTime mov/mp4. I created this simple cli to make my life easier. I use this tool to take snapshots of interactive UIs and attach to pull requests.

The default options are optimised for quality and file size. The only options exposed are `--resize` and `--delay`.

> Protip: Do not record your whole screen and try to generate a gif. This probably won't end well.

### Dependencies

```
brew update
brew install ffmpeg
brew install imagemagick
```

### Install

`npm install -g movtogif-cli`

### Usage

For more options check out the help `movtogif -h`.

`movtogif video.mov video.gif`

### Optimise GIF

If you're not happy with the file size you can use [gifsicle](https://www.lcdf.org/gifsicle/) to reduce it. However it may compromise the image quality.

```
brew install gifsicle
gifsicle -O3 video.gif -o video-optimized.gif
```
