const fs = require('node:fs');
const path = require('node:path');
const { importRecords } = require('./db');

function run({ databaseName } = {}) {
	const workspaceRoot = path.resolve(__dirname, '..');
	const sourcePath = path.join(workspaceRoot, 'clmystery', 'mystery', 'people');
	const header = 'NAME\tGENDER\tAGE\tADDRESS';

	const lines = fs.readFileSync(sourcePath, 'utf8').split(/\r?\n/);
	const headerIndex = lines.indexOf(header);

	if (headerIndex === -1) {
		throw new Error(`Could not find the expected header in ${sourcePath}`);
	}

	const records = lines
		.slice(headerIndex + 1)
		.filter(Boolean)
		.map((line, index) => {
			const sourceLine = headerIndex + index + 2;
			const fields = line.split('\t');

			if (fields.length !== 4) {
				throw new Error(`Expected four fields on source line ${sourceLine}`);
			}

			const address = fields[3].match(/^(.*), line (\d+)$/);
			const age = Number(fields[2]);

			if (!address || !Number.isInteger(age)) {
				throw new Error(`Invalid address or age on source line ${sourceLine}`);
			}

			return [fields[0], fields[1], age, `${address[2]}, ${address[1]}`];
		});

	return importRecords({
		tableName: 'people',
		columns: [
			{ name: 'name', type: 'TEXT' },
			{ name: 'gender', type: 'TEXT' },
			{ name: 'age', type: 'INTEGER' },
			{ name: 'address', type: 'TEXT' },
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
