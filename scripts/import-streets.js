const fs = require('node:fs');
const path = require('node:path');
const { importRecords } = require('./db');

function run({ databaseName, extension } = {}) {
	const workspaceRoot = path.resolve(__dirname, '..');
	const sourceDir = path.join(workspaceRoot, 'clmystery', 'mystery', 'streets');

	const streetFiles = fs
		.readdirSync(sourceDir, { withFileTypes: true })
		.filter((entry) => entry.isFile())
		.map((entry) => entry.name)
		.sort((a, b) => a.localeCompare(b));

	const records = [];

	for (const fileName of streetFiles) {
		const filePath = path.join(sourceDir, fileName);
		const lines = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n').split('\n');

		for (const [index, rawLine] of lines.entries()) {
			const match = rawLine.trim().match(/^SEE INTERVIEW #(\d+)$/);
			if (!match) {
				continue;
			}

			const interviewNo = Number(match[1]);
			const streetName = fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
			const address = `${index + 1}, ${streetName}`;

			records.push([interviewNo, address]);
		}
	}

	if (records.length === 0) {
		throw new Error(`No interview references found in ${sourceDir}`);
	}

	return importRecords({
		tableName: 'interview_catalogue',
		columns: [
			{ name: 'interview_no', type: 'INTEGER' },
			{ name: 'address', type: 'TEXT' },
		],
		records,
		databaseName,
		extension,
	});
}

if (require.main === module) {
	run().catch((error) => {
		console.error(error);
		process.exitCode = 1;
	});
}

module.exports = { run };
