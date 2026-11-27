'use strict';

const upstream = require('./google-updater');
const { UpdateState } = require('./types');

// Installing a Google update would target a different product. Report the
// host's supported disabled state to every consumer of its updater interface.
function reportDisabled() {
  upstream.broadcastState({ type: UpdateState.Disabled });
}
module.exports = {
  ...upstream,
  updateActions: {},
  initAutoUpdater: reportDisabled,
  setAutoUpdateChecking: reportDisabled,
  checkForUpdates: reportDisabled,
  async quitAndInstall() { return false; },
  applyHostUpdate() { return false; },
};
