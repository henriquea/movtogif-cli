
const exec = require('child_process').exec;
const path = require('path');
const argv = require('minimist')(process.argv.slice(2));
const tmp = require('tmp');
const videoStats = require('get-video-dimensions');

const which = (commandName, callback) => {
  return new Promise((resolve, reject) => {
    exec(`which ${commandName} 2>/dev/null && { echo >&1 ${commandName} found; exit 0; }`,
      (error, stdout, stderr) => {
        if (stdout.length === 0) {
          reject();
        } else {
          resolve(!!stdout);
        }
      }
    );
  })
};

const ffmpeg = (input, tempPath) => {
  const r = 10;
  const inputArr = input.split('/');
  const filename = inputArr[inputArr.length-1];
  videoStats(input).then(stats => {
    return new Promise((resolve, reject) => {
      exec(`ffmpeg -i ${input} -vf scale=${stats.width}:-1 -r ${r} ${tempPath}gif%3d.png`,
        (error, stdout, stderr) => {
          if (stderr.indexOf('video:')) {
            resolve();
          } else {
            reject();
          }
        }
      );
    })
  });
};

const convert = (path) => {
  // convert \
  //   -resize 75% \
  //   -delay 8 \
  //   -dither none \
  //   -coalesce \
  //   -layers optimize \
  //   -depth 8 \
  //   -colors 128 \
  //   -loop 0 \
  //   output/gif*.png \
  //   out.gif
}

const help = `
Usage: movtogif [video] [outputPath]
  CLI to convert mov to animated gif
Example:
  $ movtogif video.mov ~/Desktop
Options:
  -v --version              Display current software version
  -h --help                 Display help and usage details
`;

const missingDependencies = `
Make sure ffmpeg and imagemagick are installed.

  $ brew install ffmpeg
  $ brew install imagemagick
`;

Promise.all([
  which('ffmpeg'),
  which('convert')
])
  .then(() => {
    console.log('Starting the magic 🎩');
    if (argv._.length < 2) {
      console.log(help);
      return;
    }
    const input = argv._[0];
    const output = argv._[1];
    tmp.dir((err, path, clean) => {
      if (err) throw err;
      ffmpeg(input, path);
      // convert(path);
      //clean();
    });
  })
  .catch(() => console.log(missingDependencies));
