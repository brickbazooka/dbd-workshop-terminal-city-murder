const fs = require('node:fs');
const path = require('node:path');
const { importRecords } = require('./db');

function run({ databaseName, extension } = {}) {
	const workspaceRoot = path.resolve(__dirname, '..');
	const sourceDir = path.join(workspaceRoot, 'clmystery', 'mystery', 'interviews');

	const interviewFiles = fs
		.readdirSync(sourceDir, { withFileTypes: true })
		.filter((entry) => entry.isFile())
		.map((entry) => entry.name)
		.filter((fileName) => /^interview-\d+$/.test(fileName))
		.sort((a, b) => a.localeCompare(b));

	const records = [];

	for (const fileName of interviewFiles) {
		const filePath = path.join(sourceDir, fileName);
		const match = fileName.match(/^interview-(\d+)$/);
		if (!match) {
			continue;
		}

		const interviewNo = Number(match[1]);
		const interviewBody = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n').trim();

		if (!interviewBody) {
			throw new Error(`Interview file ${fileName} is empty.`);
		}

		records.push([interviewNo, interviewBody]);
	}

	if (records.length === 0) {
		throw new Error(`No interview files found in ${sourceDir}`);
	}

	return importRecords({
		tableName: 'interviews',
		columns: [
			{ name: 'interview_no', type: 'INTEGER' },
			{ name: 'interview_body', type: 'TEXT' },
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
