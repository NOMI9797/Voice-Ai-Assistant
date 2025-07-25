const fs = require('fs');
const path = require('path');

// Ensure the test directory exists for pdf-parse library
const testDir = path.join(__dirname, '..', 'test', 'data');
const testFile = path.join(testDir, '05-versions-space.pdf');

try {
  // Create directory if it doesn't exist
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
    console.log('✅ Created test directory for pdf-parse library');
  }

  // Create test file if it doesn't exist
  if (!fs.existsSync(testFile)) {
    fs.writeFileSync(testFile, 'This is a test PDF file for pdf-parse library initialization.');
    console.log('✅ Created test file for pdf-parse library');
  }

  console.log('✅ PDF library setup completed successfully');
} catch (error) {
  console.error('❌ Error setting up PDF library:', error);
} 