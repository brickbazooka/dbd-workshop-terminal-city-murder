const fs = require('node:fs');
const path = require('node:path');
const { createInterface } = require('node:readline/promises');
const { DatabaseSync } = require('node:sqlite');

function normalizeColumn(column) {
	if (typeof column === 'string') {
		return { name: column, type: 'TEXT' };
	}

	return {
		name: column.name,
		type: column.type || 'TEXT',
	};
}

function buildCreateTableSql(tableName, columns) {
	const mappedColumns = columns.map((column) => {
		const { name, type } = normalizeColumn(column);
		return `\t${name} ${type} NOT NULL`;
	});

	return `
        DROP TABLE IF EXISTS ${tableName};
        CREATE TABLE ${tableName} (
            ${mappedColumns.join(',\n\t\t')}
        );
    `;
}

function buildInsertSql(tableName, columns) {
	const columnNames = columns.map((column) => normalizeColumn(column).name).join(', ');
	const placeholders = columns.map(() => '?').join(', ');
	return `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders})`;
}

async function confirmOverwrite(databasePath) {
	if (!fs.existsSync(databasePath)) {
		return true;
	}

	const terminal = createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	try {
		const answer = await terminal.question(`Database already exists at ${databasePath}. Overwrite? [y/N] `);
		const confirmed = ['y', 'yes'].includes(answer.trim().toLowerCase());

		if (!confirmed) {
			console.log('Import cancelled.');
		}

		return confirmed;
	} finally {
		terminal.close();
	}
}

async function importRecords({ tableName, columns, records, databaseName = tableName, extension = 'sqlite' }) {
	const databasePath = path.resolve(__dirname, '..', 'database', `${databaseName}.${extension}`);
	const createSql = buildCreateTableSql(tableName, columns);
	const insertSql = buildInsertSql(tableName, columns);
	const databaseAlreadyExists = fs.existsSync(databasePath);

	fs.mkdirSync(path.dirname(databasePath), { recursive: true });

	if (databaseName === tableName && !(await confirmOverwrite(databasePath))) {
		return;
	}

	const database = new DatabaseSync(databasePath);
	let transactionStarted = false;

	try {
		database.exec('BEGIN');
		transactionStarted = true;
		database.exec(createSql);

		const insert = database.prepare(insertSql);
		for (const record of records) {
			insert.run(...record);
		}

		database.exec('COMMIT');
		transactionStarted = false;
		const action = databaseAlreadyExists ? 'Update' : 'Created';
		console.log(
			`${action} ${path.basename(databasePath)} with ${records.length} ${tableName} records at ${path.dirname(databasePath)}.`,
		);
	} catch (error) {
		if (transactionStarted) {
			database.exec('ROLLBACK');
		}
		throw error;
	} finally {
		database.close();
	}
}

module.exports = {
	importRecords,
	buildCreateTableSql,
	buildInsertSql,
};
