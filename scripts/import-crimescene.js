const fs = require('node:fs');
const path = require('node:path');
const { importRecords } = require('./db');

function run({ databaseName } = {}) {
	const workspaceRoot = path.resolve(__dirname, '..');
	const sourcePath = path.join(workspaceRoot, 'clmystery', 'mystery', 'crimescene');

	const lines = fs.readFileSync(sourcePath, 'utf8').replace(/\r\n/g, '\n').split('\n');
	const records = [];
	let currentReportNo = null;
	let currentBodyLines = [];

	const flushCurrentRecord = () => {
		if (currentReportNo === null) {
			return;
		}

		const reportBody = currentBodyLines.join('\n').trim();

		if (!reportBody) {
			throw new Error(`Missing body for report ${currentReportNo}`);
		}

		records.push([currentReportNo, reportBody.replace(/CLUE: /g, 'DECRYPTED: ')]);
		currentReportNo = null;
		currentBodyLines = [];
	};

	for (const line of lines) {
		const reportMatch = line.match(/^Crime Scene Report #(\d+)$/);

		if (reportMatch) {
			flushCurrentRecord();
			currentReportNo = reportMatch[1];
			continue;
		}

		if (currentReportNo === null) {
			continue;
		}

		if (line.trim() === '*******' || line.trim() === '********') {
			continue;
		}

		currentBodyLines.push(line);
	}

	flushCurrentRecord();

	if (records.length === 0) {
		throw new Error(`No crime scene report records found in ${sourcePath}`);
	}

	return importRecords({
		tableName: 'crimescene',
		columns: [
			{ name: 'report_no', type: 'TEXT' },
			{ name: 'report_body', type: 'TEXT' },
		],
		records,
		databaseName,
	});
}

if (require.main === module) {
	run().catch((error) => {
		console.error(error);
		process.exitCode = 1;
	});
}

module.exports = { run };
