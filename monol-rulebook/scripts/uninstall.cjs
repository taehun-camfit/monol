#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

const MARKETPLACE_NAME = 'monol-rulebook';
const PLUGIN_NAME = 'monol-rulebook';

// Claude settings paths
const claudeDir = path.join(os.homedir(), '.claude');
const settingsPath = path.join(claudeDir, 'settings.json');

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

function uninstall() {
  console.log(`\n🗑️  Uninstalling ${PLUGIN_NAME} Claude Code plugin...\n`);

  // Update settings.json
  let settings = readJSON(settingsPath);
  if (settings) {
    if (settings.extraKnownMarketplaces && settings.extraKnownMarketplaces[MARKETPLACE_NAME]) {
      delete settings.extraKnownMarketplaces[MARKETPLACE_NAME];
    }
    if (settings.enabledPlugins && settings.enabledPlugins[`${PLUGIN_NAME}@${MARKETPLACE_NAME}`]) {
      delete settings.enabledPlugins[`${PLUGIN_NAME}@${MARKETPLACE_NAME}`];
    }
    writeJSON(settingsPath, settings);
    console.log(`✅ Removed from ${settingsPath}`);
  }

  // Update known_marketplaces.json
  const pluginsDir = path.join(claudeDir, 'plugins');
  const knownMarketplacesPath = path.join(pluginsDir, 'known_marketplaces.json');
  let knownMarketplaces = readJSON(knownMarketplacesPath);
  if (knownMarketplaces && knownMarketplaces[MARKETPLACE_NAME]) {
    delete knownMarketplaces[MARKETPLACE_NAME];
    writeJSON(knownMarketplacesPath, knownMarketplaces);
    console.log(`✅ Removed from ${knownMarketplacesPath}`);
  }

  console.log(`\n✅ ${PLUGIN_NAME} uninstalled successfully!\n`);
}

try {
  uninstall();
} catch (error) {
  console.error('❌ Uninstallation failed:', error.message);
  process.exit(1);
}
