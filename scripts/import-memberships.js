const fs = require('node:fs');
const path = require('node:path');
const { importRecords } = require('./db');

function run({ databaseName } = {}) {
	const workspaceRoot = path.resolve(__dirname, '..');
	const sourceDir = path.join(workspaceRoot, 'clmystery', 'mystery', 'memberships');

	const membershipFiles = fs
		.readdirSync(sourceDir, { withFileTypes: true })
		.filter((entry) => entry.isFile())
		.map((entry) => entry.name)
		.sort((a, b) => a.localeCompare(b));

	const records = [];

	for (const fileName of membershipFiles) {
		const filePath = path.join(sourceDir, fileName);
		const organisation = fileName.replace(/_/g, ' ');
		const lines = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n').split('\n');

		for (const line of lines) {
			const member = line.trim();
			if (!member) {
				continue;
			}

			records.push([organisation, member]);
		}
	}

	if (records.length === 0) {
		throw new Error(`No membership files found in ${sourceDir}`);
	}

	return importRecords({
		tableName: 'memberships',
		columns: [
			{ name: 'organisation', type: 'TEXT' },
			{ name: 'member', type: 'TEXT' },
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
