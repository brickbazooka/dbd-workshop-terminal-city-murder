const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const workspaceRoot = path.resolve(__dirname, '..');
const sourcePath = path.join(workspaceRoot, 'clmystery', 'mystery', 'people');
const tablesPath = path.join(workspaceRoot, 'tables');
fs.mkdirSync(tablesPath, { recursive: true });
const databasePath = path.join(tablesPath, 'people.sqlite');
const header = 'NAME\tGENDER\tAGE\tADDRESS';

if (fs.existsSync(databasePath)) {
	throw new Error(`Refusing to overwrite existing database: ${databasePath}`);
}

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

const database = new DatabaseSync(databasePath);
let transactionStarted = false;

try {
	database.exec(`
    CREATE TABLE people (
      name TEXT NOT NULL,
      gender TEXT NOT NULL,
      age INTEGER NOT NULL,
      address TEXT NOT NULL
    );
    BEGIN;
  `);
	transactionStarted = true;

	const insert = database.prepare('INSERT INTO people (name, gender, age, address) VALUES (?, ?, ?, ?)');

	for (const record of records) {
		insert.run(...record);
	}

	database.exec('COMMIT');
	transactionStarted = false;
	console.log(`Created ${databasePath} with ${records.length} people.`);
} catch (error) {
	if (transactionStarted) {
		database.exec('ROLLBACK');
	}
	throw error;
} finally {
	database.close();
}
