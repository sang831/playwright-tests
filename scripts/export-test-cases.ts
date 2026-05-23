import * as fs from 'fs';
import * as path from 'path';

/**
 * Script parse tất cả test cases từ .spec.ts files
 * và xuất ra Excel file
 *
 * Chạy: npx ts-node scripts/export-test-cases.ts
 */

interface TestCase {
  id: string;
  name: string;
  description: string;
  module: string;
  file: string;
}

// Parse test case từ file
function parseTestCases(filePath: string): TestCase[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const testCases: TestCase[] = [];

  // Regex để match test('TC_XXX_XX - Mô tả...', ...)
  const testRegex = /test\(['"`](TC_\w+)\s*-\s*(.+?)['"`]/g;
  let match;

  const module = path.basename(path.dirname(filePath));

  while ((match = testRegex.exec(content)) !== null) {
    const [, testId, testName] = match;
    testCases.push({
      id: testId,
      name: testName.trim(),
      description: testName.trim(),
      module,
      file: path.basename(filePath),
    });
  }

  return testCases;
}

// Lấy tất cả test cases từ tất cả files
function getAllTestCases(): TestCase[] {
  const testsDir = path.join(__dirname, '../tests');
  const allTests: TestCase[] = [];

  function walkDir(dir: string) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else if (file.endsWith('.spec.ts')) {
        const tests = parseTestCases(fullPath);
        allTests.push(...tests);
      }
    });
  }

  walkDir(testsDir);
  return allTests;
}

// Xuất ra Excel sử dụng JSON → CSV → XLSX
async function exportToExcel() {
  const testCases = getAllTestCases();

  if (testCases.length === 0) {
    console.log('❌ Không tìm thấy test cases');
    return;
  }

  // Import xlsx động
  const XLSX = await import('xlsx');

  // Chuẩn bị dữ liệu với các cột
  const data = testCases.map((tc, index) => ({
    'STT': index + 1,
    'Test ID': tc.id,
    'Tên Test': tc.name,
    'Module': tc.module,
    'File': tc.file,
    'Trạng thái': '',
    'Kết quả': '',
    'Ghi chú': '',
  }));

  // Tạo workbook
  const ws = XLSX.utils.json_to_sheet(data, {
    header: ['STT', 'Test ID', 'Tên Test', 'Module', 'File', 'Trạng thái', 'Kết quả', 'Ghi chú'],
  });

  // Điều chỉnh độ rộng cột
  ws['!cols'] = [
    { wch: 5 },   // STT
    { wch: 15 },  // Test ID
    { wch: 45 },  // Tên Test
    { wch: 15 },  // Module
    { wch: 25 },  // File
    { wch: 12 },  // Trạng thái
    { wch: 12 },  // Kết quả
    { wch: 20 },  // Ghi chú
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Test Cases');

  // Xuất file
  const outputPath = path.join(__dirname, '../test-cases-export.xlsx');
  XLSX.writeFile(wb, outputPath);

  console.log(`✅ Xuất thành công: ${outputPath}`);
  console.log(`📊 Tổng: ${testCases.length} test cases`);

  // Thống kê theo module
  const byModule: Record<string, number> = {};
  testCases.forEach(tc => {
    byModule[tc.module] = (byModule[tc.module] || 0) + 1;
  });

  console.log('\n📈 Thống kê theo module:');
  Object.entries(byModule).forEach(([module, count]) => {
    console.log(`   ${module}: ${count}`);
  });
}

exportToExcel().catch(console.error);
