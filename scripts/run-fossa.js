#!/usr/bin/env node
/*
 * Copyright 2020 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// FOSSA CLI v3 discovers Yarn workspaces natively. Keep the scan bounded to
// the repository's root Yarn project so nested npm fixture projects are not
// reported as production dependency targets.
const { resolve: resolvePath } = require('node:path');
const { promises: fs } = require('node:fs');
const { execFile: execFileCb } = require('node:child_process');
const { promisify } = require('node:util');

const execFile = promisify(execFileCb);

const FOSSA_CONFIG = `
version: 3
server: https://app.fossa.com
project:
  id: backstage
  name: backstage
targets:
  only:
    - type: yarn
      path: ./
`;

// Runs `fossa analyze`, with 502 errors being retried up to 3 times.
async function runAnalyze(githubRef) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    console.error(`Running fossa analyze, attempt ${attempt}`);
    try {
      const { stdout, stderr } = await execFile(
        'fossa',
        ['analyze', '--branch', githubRef],
        { shell: true },
      );
      console.error(stderr);
      console.log(stdout);

      return;
    } catch (error) {
      if (!error.code) {
        throw error;
      }
      if (error.stderr) {
        process.stderr.write(error.stderr);
      }
      if (error.stdout) {
        process.stdout.write(error.stdout);
      }
      if (error.stderr && error.stderr.includes('502 Bad Gateway')) {
        console.error('Encountered 502 during fossa analysis upload, retrying');
        continue;
      }
      throw new Error(`Fossa analyze failed with code ${error.code}`);
    }
  }

  console.error('Maximum number of retries reached, skipping fossa analysis');
}

async function main() {
  const githubRef = process.env.GITHUB_REF;
  if (!githubRef) {
    throw new Error('GITHUB_REF is not set');
  }
  if (!process.env.FOSSA_API_KEY) {
    throw new Error('FOSSA_API_KEY is not set');
  }

  process.cwd(resolvePath(__dirname, '..'));

  await fs.writeFile('.fossa.yml', FOSSA_CONFIG, 'utf8');

  console.error(`Generated fossa config:\n${FOSSA_CONFIG}`);

  await runAnalyze(githubRef);
}

main().catch(error => {
  console.error(error.stack);
  process.exit(1);
});
