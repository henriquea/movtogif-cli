#!/usr/bin/env node

const path = require('path');
const exec = require('child_process').exec;
const argv = require('minimist')(process.argv.slice(2));
const async = require('async');
const osTmpdir = require('os-tmpdir');
const tmp = osTmpdir();

const help = `
Usage: movtogif [videoFile] [outputFile]
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

  $ brew update
  $ brew install ffmpeg
  $ brew install imagemagick
`;

const input = argv._[0];
const output = argv._[1];
const temp = `${tmp}/movtogif`;
const options = {
  resize: argv.resize || argv.r,
  delay: argv.delay || argv.d
};

if (!input || !output) {
  console.log(help);
  process.exit(0);
}

const which = (cmd, callback) => {
  exec(`which ${cmd} 2>/dev/null && { echo >&1 ${cmd} found; exit 0; }`,
    (error, stdout, stderr) => {
      if (stdout.length === 0) {
        console.error(missingDependencies);
      }
      callback();
    }
  );
};

const mkdirTemp = callback => {
  exec(`mkdir -p ${temp}`, (error, stdout, stderr) => callback());
}

const cleanup = callback => {
  exec(`rm -rf ${temp}`, (error, stdout, stderr) => callback());
}

const metadata = () => {
  const cmd = [
    'ffprobe',
    '-v error',
    '-of flat=s=_',
    '-select_streams v:0',
    '-show_entries',
    'stream=height,width',
    `${input}`
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
        reject();
      }
    });
  });
};

const ffmpeg = callback => {
  const r = 10;
  console.log('Preparing recipe 📕');
  metadata()
    .then(dimensions => {
      const cmd = [
        'ffmpeg',
        `-i ${input}`,
        '-vf',
        `scale=${dimensions.width}:-1`,
        `-r ${r}`,
        `${temp}/gif%3d.png`
      ].join(' ');
      exec(cmd, null, () => callback());
    }
  );
};

const convert = callback => {
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
    `${temp}/gif*.png ${output}`
  ].join(' ');
  console.log('Cooking 🍳');
  exec(cmd, (error, stdout, stderr) => {
    console.log('Done 🍔');
    console.log(`📺  ~> ${output}`);
    callback();
  });
}

async.series([
  callback => which('ffmpeg', () => callback()),
  callback => which('convert', () => callback()),
  callback => mkdirTemp(() => callback()),
  callback => ffmpeg(() => callback()),
  callback => convert(() => callback()),
  callback => cleanup(() => callback())
], (err, results) => {
  if (err) {
    console.log(err)
    return;
  }
  //console.log(tmp);
  //console.log(results);
});
