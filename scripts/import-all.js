const IMPORT_CONFIG = [
	// { name: 'crimescene', module: './import-crimescene.js' },
	// { name: 'interview_catalogue', module: './import-streets.js' },
	// { name: 'interviews', module: './import-interviews.js' },
	{ name: 'people', module: './import-people.js' },
	{ name: 'vehicles', module: './import-vehicles.js' },
	{ name: 'memberships', module: './import-memberships.js' },
];
const DATABASE_NAME = 'clmystery';

async function runAll(config = IMPORT_CONFIG) {
	for (const item of config) {
		const importer = require(item.module);

		if (typeof importer.run !== 'function') {
			throw new Error(`Importer ${item.name} does not export a run() function.`);
		}

		console.log(`Importing ${item.name}...`);
		await importer.run({ databaseName: DATABASE_NAME });
	}
}

if (require.main === module) {
	runAll().catch((error) => {
		console.error(error);
		process.exitCode = 1;
	});
}

module.exports = { IMPORT_CONFIG, DATABASE_NAME, runAll };
