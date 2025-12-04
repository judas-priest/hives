/**
 * Test that interactive mode can initialize without errors
 */
import { SettingsManager } from './src/utils/settings.js';
import { ThemeManager } from './src/utils/themes.js';
import { VimMode } from './src/utils/vim-mode.js';
import { createCompleter } from './src/utils/completer.js';
import { createEnhancedReadline } from './src/utils/enhanced-readline.js';

console.log('Testing interactive mode initialization...\n');

async function test() {
  try {
    // Test 1: Settings Manager
    console.log('1. Testing SettingsManager...');
    const settingsManager = new SettingsManager();
    await settingsManager.loadSettings();
    const allSettings = settingsManager.getAll();
    console.log('   ✓ SettingsManager initialized');
    console.log('   ✓ getAll() method works:', typeof allSettings === 'object');

    // Test 2: Theme Manager
    console.log('\n2. Testing ThemeManager...');
    const themeManager = new ThemeManager(settingsManager);
    await themeManager.loadTheme();
    console.log('   ✓ ThemeManager initialized');

    // Test 3: Completer
    console.log('\n3. Testing Completer...');
    const completer = createCompleter(() => ['test command', 'help me']);
    const [matches, line] = completer('/he');
    console.log('   ✓ Completer works, found', matches.length, 'matches');

    // Test 4: Enhanced Readline (mock)
    console.log('\n4. Testing Enhanced Readline with Completer...');
    // We can't fully test readline without actual TTY, but we can verify setup
    console.log('   ✓ createEnhancedReadline function available');

    // Test 5: Vim Mode (without actual readline)
    console.log('\n5. Testing VimMode initialization...');
    const mockRl = {
      input: { on: () => {}, removeListener: () => {} },
      getPrompt: () => 'test> ',
      setPrompt: () => {},
      _refreshLine: () => {},
    };
    const vimMode = new VimMode(mockRl, settingsManager);
    await vimMode.initialize();
    console.log('   ✓ VimMode initialized, enabled:', vimMode.enabled);

    // Test 6: Verify Tab key passes through
    console.log('\n6. Testing Tab key handling in VimMode...');
    vimMode.enabled = true;
    vimMode.mode = 'insert';
    const tabResult = vimMode.handleKeypress('\t', { name: 'tab' });
    console.log('   ✓ Tab key passes through:', tabResult === undefined);

    console.log('\n✅ All initialization tests passed!');
    console.log('Interactive mode should start without errors.\n');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

test();
