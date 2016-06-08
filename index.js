#!/usr/bin/env node

const os = require('os');
const fs = require('fs');
const path = require('path');
const exec = require('child_process').exec;
const argv = require('minimist')(process.argv.slice(2));

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

const metadata = file => {
  const cmd = [
    'ffprobe',
    '-v error',
    '-of flat=s=_',
    '-select_streams v:0',
    '-show_entries',
    'stream=height,width',
    `${file}`
  ].join(' ');
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      const width = /width=(\d+)/.exec(stdout);
      const height = /height=(\d+)/.exec(stdout);
      if (!!height && !!width) {
        resolve({
          width: width[1],
          height: height[1]
        });
      } else {
        reject('Metadata not found!');
      }
    });
  });

}

const ffmpeg = (input, tempPath, options) => {
  const r = options.r || 10;
  const inputArr = input.split('/');
  const filename = inputArr[inputArr.length-1];
  return new Promise((resolve, reject) => {
    metadata(input).then(metadata => {
      const cmd = [
        'ffmpeg',
        `-i ${input}`,
        '-vf',
        `scale=${metadata.width}:-1`,
        `-r ${r}`,
        `${tempPath}/gif%3d.png`
      ].join(' ');
      exec(cmd,
        (error, stdout, stderr) => {
          if (stderr.indexOf('video:')) {
            resolve();
          } else {
            reject();
          }
        }
      );
    });
  });
};

const convert = (input, tempPath, output, options) => {
  const resize = options.resize || '75%';
  const delay = options.delay || 4;
  const cmd = ['convert',
    `-resize ${resize}`,
    `-delay ${delay}`,
    '-dither none',
    '-coalesce',
    '-layers optimize',
    '-depth 8',
    '-colors 128',
    '-loop 0',
    `${tempPath}gif*.png ${output}`
  ].join(' ');
  console.log('Cooking 🍰');
  exec(cmd, (error, stdout, stderr) => {
    console.log('Done 🍺');
    console.log(output);
  });
}

const help = `
Usage: movtogif [video] [outputPath]
  CLI to convert mov to animated gif
Example:
  $ movtogif ~/Desktop/video.mov ~/Desktop/video.gif
Options:
  -v --version           Display current software version
  -h --help              Display help and usage details
  --resize               Resize the gif. The default value is 75%
  --delay                Delay between the frames generated. The default is 4
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
    const options = { resize: argv.resize };
    const dir = path.resolve(os.tmpdir(), 'movtogif');
    ffmpeg(input, dir, {}).then(
      convert(input, dir, output, options)
    );
    exec(`rm -rf ${dir}`);
  })
  .catch(() => console.log(missingDependencies));
