#!/usr/bin/env node

const os = require('os');
const fs = require('fs');
const path = require('path');
const exec = require('child_process').exec;
const pkg = require('./package.json');
const argv = require('minimist')(process.argv.slice(2));

const which = (cmd, callback) => {
  return new Promise((resolve, reject) => {
    exec(`which ${cmd} 2>/dev/null && { echo >&1 ${cmd} found; exit 0; }`,
      (error, stdout, stderr) => {
        !!stdout.length ? resolve(true) : reject();
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
          stderr.indexOf('video:') ? resolve() : reject();
        }
      );
    });
  });
};

const convert = (input, tempPath, output, options) => {
  const resize = options.resize || '75%';
  const delay = options.delay || 8;
  const cmd = ['convert',
    `-resize ${resize}`,
    `-delay ${delay}`,
    '-dither none',
    '-coalesce',
    '-layers optimize',
    '-depth 8',
    '-colors 128',
    '-loop 0',
    `${tempPath}/gif*.png ${output}`
  ].join(' ');
  console.log('Cooking 🍳');
  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.log(error);
      return;
    }
    console.log('Done 🍔');
    console.log(`📺  ~> ${output}`);
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
  -r --resize            Resize the gif. The default value is 75%
  -d --delay             Delay between the frames generated. The default is 8
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

    if (argv.version || argv.v) {
      console.log(pkg.version);
      return;
    }

    const input = argv._[0];
    const output = argv._[1];

    if (!input || !output) {
      console.log(help);
      return;
    }

    const options = {
      resize: argv.resize || argv.r,
      delay: argv.delay || argv.d
    };

    const dir = path.resolve(os.tmpdir(), 'movtogif');
    console.log('Preparing recipe 📕');

    exec(`mkdir -p ${dir}`, () => {
      ffmpeg(input, dir, {}).then(
        convert(input, dir, output, options)
      );
    });
  })
  .catch(() => console.log(missingDependencies));
