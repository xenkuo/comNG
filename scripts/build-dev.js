const fs = require('fs');
const path = require('path');

// Ensure scripts directory exists
const scriptsDir = path.join(__dirname, 'scripts');
if (!fs.existsSync(scriptsDir)) {
  fs.mkdirSync(scriptsDir, { recursive: true });
}

async function buildDev() {
  console.log('Building development bundle...');
  
  try {
    // Read files and concatenate them
    const baseContent = fs.readFileSync('./src/base.js', 'utf8');
    const editorContent = fs.readFileSync('./src/editor.js', 'utf8');
    
    const concatenatedContent = `
// Generated bundle - do not edit directly
// Base.js
${baseContent}

// Editor.js
${editorContent}

`;
    
    // Write concatenated file
    fs.writeFileSync('./src/index.js', concatenatedContent, 'utf8');
    
    // Generate source map (simple version)
    const sourceMap = {
      version: 3,
      file: 'index.js',
      sources: ['base.js', 'editor.js'],
      sourcesContent: [baseContent, editorContent],
      mappings: ''
    };
    
    fs.writeFileSync('./src/index.js.map', JSON.stringify(sourceMap), 'utf8');
    
    console.log('✅ Development bundle created successfully!');
    console.log('📁 Output: src/index.js');
    console.log('🗺️  Source map: src/index.js.map');
    
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Watch mode
async function watchDev() {
  console.log('Starting watch mode...');
  
  // Initial build
  await buildDev();
  
  // Watch for file changes
  const chokidar = require('chokidar');
  
  const watcher = chokidar.watch(['./src/base.js', './src/editor.js'], {
    ignoreInitial: true
  });
  
  watcher.on('change', async (filePath) => {
    console.log(`🔄 File changed: ${path.basename(filePath)}`);
    try {
      await buildDev();
      console.log('✅ Rebuild complete');
    } catch (error) {
      console.error('❌ Rebuild failed:', error.message);
    }
  });
  
  console.log('👀 Watching for changes... Press Ctrl+C to stop');
}

// Check if running directly
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--watch') || args.includes('-w')) {
    watchDev().catch(console.error);
  } else {
    buildDev().catch(console.error);
  }
}

module.exports = { buildDev, watchDev };
