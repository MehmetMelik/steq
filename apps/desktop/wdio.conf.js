import { spawn } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { homedir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cargoHome = process.env.CARGO_HOME || join(homedir(), '.cargo');
const tauriDriverPath = join(cargoHome, 'bin', 'tauri-driver');

let tauriDriver;

export const config = {
  hostname: '127.0.0.1',
  port: 4444,

  specs: ['./e2e/**/*.e2e.js'],

  maxInstances: 1,

  capabilities: [
    {
      'tauri:options': {
        application: resolve(
          __dirname,
          'src-tauri/target/debug/steq-desktop',
        ),
      },
    },
  ],

  framework: 'mocha',

  reporters: ['spec'],

  mochaOpts: {
    ui: 'bdd',
    timeout: 60_000,
  },

  async onPrepare() {
    console.log('Building Tauri app in debug mode...');
    execSync('pnpm tauri build --debug --no-bundle', {
      cwd: __dirname,
      stdio: 'inherit',
    });
  },

  async beforeSession() {
    return new Promise((resolve, reject) => {
      tauriDriver = spawn(tauriDriverPath, [], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      tauriDriver.stderr.on('data', (data) => {
        const msg = data.toString();
        if (msg.includes('error') || msg.includes('Error')) {
          console.error('tauri-driver stderr:', msg);
        }
      });

      // Give tauri-driver time to start listening
      setTimeout(resolve, 2000);

      tauriDriver.on('error', reject);
    });
  },

  afterSession() {
    if (tauriDriver) {
      tauriDriver.kill();
      tauriDriver = null;
    }
  },

  onShutdown() {
    if (tauriDriver) {
      tauriDriver.kill();
      tauriDriver = null;
    }
  },
};
