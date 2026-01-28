#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

const MARKETPLACE_NAME = 'monol-rulebook';
const PLUGIN_NAME = 'monol-rulebook';

// Get the installed package location
const packageDir = path.resolve(__dirname, '..');

// Claude settings paths
const claudeDir = path.join(os.homedir(), '.claude');
const settingsPath = path.join(claudeDir, 'settings.json');
const pluginsDir = path.join(claudeDir, 'plugins');
const knownMarketplacesPath = path.join(pluginsDir, 'known_marketplaces.json');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readJSON(filepath) {
  if (fs.existsSync(filepath)) {
    try {
      return JSON.parse(fs.readFileSync(filepath, 'utf8'));
    } catch (e) {
      return null;
    }
  }
  return null;
}

function writeJSON(filepath, data) {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2) + '\n');
}

function install() {
  console.log(`\n📦 Installing ${PLUGIN_NAME} Claude Code plugin...\n`);

  // Ensure directories exist
  ensureDir(claudeDir);
  ensureDir(pluginsDir);

  // Update settings.json
  let settings = readJSON(settingsPath) || {};

  if (!settings.extraKnownMarketplaces) {
    settings.extraKnownMarketplaces = {};
  }

  settings.extraKnownMarketplaces[MARKETPLACE_NAME] = {
    source: {
      source: 'npm',
      package: PLUGIN_NAME
    }
  };

  if (!settings.enabledPlugins) {
    settings.enabledPlugins = {};
  }

  settings.enabledPlugins[`${PLUGIN_NAME}@${MARKETPLACE_NAME}`] = true;

  writeJSON(settingsPath, settings);
  console.log(`✅ Updated ${settingsPath}`);

  // Update known_marketplaces.json
  let knownMarketplaces = readJSON(knownMarketplacesPath) || {};

  knownMarketplaces[MARKETPLACE_NAME] = {
    source: {
      source: 'npm',
      package: PLUGIN_NAME
    },
    installLocation: packageDir,
    lastUpdated: new Date().toISOString()
  };

  writeJSON(knownMarketplacesPath, knownMarketplaces);
  console.log(`✅ Updated ${knownMarketplacesPath}`);

  console.log(`
🎉 ${PLUGIN_NAME} installed successfully!

Available commands:
  /rule             - 규칙 조회 및 목록
  /rule-add         - 새 규칙 추가
  /rule-search      - 규칙 검색
  /rule-sync        - 플랫폼 동기화

Restart Claude Code to activate the plugin.
`);
}

try {
  install();
} catch (error) {
  console.error('❌ Installation failed:', error.message);
  process.exit(1);
}
