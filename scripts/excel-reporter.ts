import {
  Reporter,
  FullResult,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';

interface TestReportRow {
  'STT': number;
  'Test ID': string;
  'Tên Test': string;
  'Module': string;
  'File': string;
  'Trạng thái': string;
  'Thời gian (ms)': number;
  'Lỗi': string;
  'Chi tiết Lỗi': string;
  'Attempts': number;
  'Attachments': string;
  'Ghi chú': string;
}

class ExcelReporter implements Reporter {
  private tests: TestReportRow[] = [];
  private testIndex = 1;

  onTestEnd(test: TestCase, result: TestResult) {
    // Parse test ID từ tên test (TC_XXX_XX)
    const testIdMatch = test.title.match(/(TC_\w+)/);
    const testId = testIdMatch ? testIdMatch[1] : '';

    // Module từ suite
    let module = '';
    let suite = test.parent;
    while (suite && suite.parent) {
      module = suite.title || module;
      suite = suite.parent;
    }

    const status = result.status === 'passed' ? '✅ PASS' : result.status === 'failed' ? '❌ FAIL' : '⏭️ SKIP';
    const errorMsg = result.error ? result.error.message.substring(0, 100) : '';
    const errorStack = result.error?.stack ? result.error.stack.substring(0, 200) : '';
    const attachmentCount = result.attachments?.length || 0;
    const attachmentInfo = attachmentCount > 0 
      ? `${attachmentCount} (${result.attachments?.map(a => a.contentType).join(', ')})`
      : '-';

    this.tests.push({
      'STT': this.testIndex++,
      'Test ID': testId,
      'Tên Test': test.title.replace(/^TC_\w+\s*-\s*/, ''),
      'Module': module,
      'File': path.basename(test.location?.file || ''),
      'Trạng thái': status,
      'Thời gian (ms)': result.duration,
      'Lỗi': errorMsg,
      'Chi tiết Lỗi': errorStack,
      'Attempts': result.retry + 1,
      'Attachments': attachmentInfo,
      'Ghi chú': '',
    });
  }

  async onEnd(result: FullResult) {
    // Import xlsx
    const XLSX = await import('xlsx');

    // Tạo worksheet
    const ws = XLSX.utils.json_to_sheet(this.tests, {
      header: ['STT', 'Test ID', 'Tên Test', 'Module', 'File', 'Trạng thái', 'Thời gian (ms)', 'Lỗi', 'Chi tiết Lỗi', 'Attempts', 'Attachments', 'Ghi chú'],
    });

    // Điều chỉnh độ rộng cột
    ws['!cols'] = [
      { wch: 5 },
      { wch: 15 },
      { wch: 40 },
      { wch: 15 },
      { wch: 25 },
      { wch: 12 },
      { wch: 15 },
      { wch: 25 },
      { wch: 30 },
      { wch: 10 },
      { wch: 25 },
      { wch: 20 },
    ];

    // Tạo workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Test Results');

    // Thêm sheet thống kê
    const summary = this.generateSummary(result);
    const summaryWs = XLSX.utils.json_to_sheet(summary);
    summaryWs['!cols'] = [{ wch: 30 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

    // Xuất file
    const outputPath = path.join('playwright-report', 'test-results.xlsx');
    if (!fs.existsSync('playwright-report')) {
      fs.mkdirSync('playwright-report', { recursive: true });
    }

    XLSX.writeFile(wb, outputPath);

    // Log thống kê
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS EXPORTED');
    console.log('='.repeat(60));
    console.log(`📁 File: ${outputPath}`);
    console.log(`✅ Passed: ${this.tests.filter(t => t['Trạng thái'].includes('PASS')).length}`);
    console.log(`❌ Failed: ${this.tests.filter(t => t['Trạng thái'].includes('FAIL')).length}`);
    console.log(`⏭️  Skipped: ${this.tests.filter(t => t['Trạng thái'].includes('SKIP')).length}`);
    console.log(`⏱️  Duration: ${result.duration}ms`);
    console.log('='.repeat(60) + '\n');
  }

  private generateSummary(result: FullResult) {
    const totalTests = this.tests.length;
    const passed = this.tests.filter(t => t['Trạng thái'].includes('PASS')).length;
    const failed = this.tests.filter(t => t['Trạng thái'].includes('FAIL')).length;
    const skipped = this.tests.filter(t => t['Trạng thái'].includes('SKIP')).length;
    const passRate = totalTests > 0 ? ((passed / totalTests) * 100).toFixed(2) : '0.00';

    return [
      { 'Chỉ số': 'Tổng Test', 'Giá trị': totalTests },
      { 'Chỉ số': 'Passed', 'Giá trị': passed },
      { 'Chỉ số': 'Failed', 'Giá trị': failed },
      { 'Chỉ số': 'Skipped', 'Giá trị': skipped },
      { 'Chỉ số': 'Pass Rate (%)', 'Giá trị': passRate },
      { 'Chỉ số': 'Execution Time (ms)', 'Giá trị': result.duration },
    ];
  }
}

export default ExcelReporter;
