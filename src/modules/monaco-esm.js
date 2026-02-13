/* eslint-disable no-undef */

// Monaco Editor ESM Loader
// Provides modern ES module loading with better IDE support

// Type definitions for better IDE experience
/** @typedef {import('monaco-editor').editor.IStandaloneCodeEditor} IStandaloneCodeEditor */
/** @typedef {import('monaco-editor').editor.IModel} IModel */
/** @typedef {import('monaco-editor').editor.IRange} IRange */
/** @typedef {import('monaco-editor').languages.IMonarchLanguage} IMonarchLanguage */

/**
 * Initialize Monaco Editor using ESM approach
 * @returns {Promise<import('monaco-editor')>} Monaco editor instance
 */
async function initMonacoESM() {
  try {
    console.log('Loading Monaco editor via ESM...');

    // Dynamically import Monaco ESM module
    const monaco = await import('monaco-editor/esm/vs/editor/editor.api');

    // Configure Monaco environment for web workers
    self.MonacoEnvironment = {
      getWorkerUrl: function (moduleId, label) {
        // Worker paths - adjust based on your build output structure
        if (label === 'json') {
          return './vs/language/json/json.worker.js';
        }
        if (label === 'css' || label === 'scss' || label === 'less') {
          return './vs/language/css/css.worker.js';
        }
        if (label === 'html' || label === 'handlebars' || label === 'razor') {
          return './vs/language/html/html.worker.js';
        }
        if (label === 'typescript' || label === 'javascript') {
          return './vs/language/typescript/ts.worker.js';
        }
        return './vs/editor/editor.worker.js';
      }
    };

    console.log('Monaco ESM loaded successfully');

    // Dispatch custom event for compatibility with existing code
    const event = new CustomEvent('monacoloaded', {
      detail: {
        /** @type {import('monaco-editor')} */
        monaco: monaco,
      },
    });
    window.dispatchEvent(event);

    // Return the monaco instance directly
    return monaco;

  } catch (error) {
    console.error('Failed to load Monaco ESM:', error);
    throw error;
  }
}

/**
 * Alternative synchronous approach for environments that don't support dynamic imports
 * This maintains compatibility with your current AMD approach
 * @returns {Promise<import('monaco-editor')>} Monaco editor instance
 */
function initMonacoESMCompat() {
  return new Promise((resolve, reject) => {
    // Fallback to AMD approach for compatibility
    console.log('Using ESM-compatible AMD approach');

    const path = require('path');
    const amdLoader = require('../../node_modules/monaco-editor/min/vs/loader.js');
    const amdRequire = amdLoader.require;

    function _uriFromPath(_path) {
      let pathName = path.resolve(_path).replace(/\\/g, '/');
      if (pathName.length > 0 && !pathName.startsWith('/')) {
        pathName = '/' + pathName;
      }
      return encodeURI('file://' + pathName);
    }

    amdRequire.config({
      baseUrl: _uriFromPath(path.join(__dirname, '../../node_modules/monaco-editor/min')),
    });

    // Workaround for monaco-css environment issues
    self.module = undefined;

    amdRequire(['vs/editor/editor.main'], function () {
      try {
        // Enhanced type information for IDE
        /** @type {import('monaco-editor')} */
        const monacoInstance = monaco;

        console.log('Monaco editor loaded with ESM-style type definitions');

        const event = new CustomEvent('monacoloaded', {
          detail: {
            /** @type {import('monaco-editor')} */
            monaco: monacoInstance,
          },
        });
        window.dispatchEvent(event);

        // Resolve with the monaco instance
        resolve(monacoInstance);
      } catch (error) {
        reject(error);
      }
    }, function (error) {
      reject(error);
    });
  });
}

// Export both approaches
module.exports = {
  initMonacoESM,
  initMonacoESMCompat
};
