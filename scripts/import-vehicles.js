const fs = require('node:fs');
const path = require('node:path');
const { importRecords } = require('./db');

function run({ databaseName, extension } = {}) {
	const workspaceRoot = path.resolve(__dirname, '..');
	const sourcePath = path.join(workspaceRoot, 'clmystery', 'mystery', 'vehicles');

	const blocks = fs
		.readFileSync(sourcePath, 'utf8')
		.split(/\r?\n\s*\r?\n/)
		.map((block) => block.trim())
		.filter((block) => block.startsWith('License Plate '));

	if (blocks.length === 0) {
		throw new Error(`No vehicle records found in ${sourcePath}`);
	}

	const records = blocks.map((block, index) => {
		const lines = block.split(/\r?\n/);
		const licensePlate = lines[0].match(/^License Plate (.+)$/);
		const make = lines[1]?.match(/^Make: (.+)$/);
		const color = lines[2]?.match(/^Color: (.+)$/);
		const owner = lines[3]?.match(/^Owner: (.+)$/);
		const height = lines[4]?.match(/^Height: (\d+)'(\d+)"$/);
		const weight = lines[5]?.match(/^Weight: (\d+) lbs$/);

		if (lines.length !== 6 || !licensePlate || !make || !color || !owner || !height || !weight) {
			throw new Error(`Invalid vehicle record block ${index + 1}`);
		}

		const feet = Number(height[1]);
		const inches = Number(height[2]);
		const weightLb = Number(weight[1]);

		if (inches >= 12 || !Number.isInteger(weightLb)) {
			throw new Error(`Invalid height or weight in vehicle record block ${index + 1}`);
		}

		const heightFt = Number((feet + inches / 12).toFixed(2));

		return [licensePlate[1], make[1], color[1], owner[1], heightFt, weightLb];
	});

	return importRecords({
		tableName: 'vehicles',
		columns: [
			{ name: 'license_plate', type: 'TEXT' },
			{ name: 'make', type: 'TEXT' },
			{ name: 'color', type: 'TEXT' },
			{ name: 'owner', type: 'TEXT' },
			{ name: 'height_ft', type: 'REAL' },
			{ name: 'weight_lb', type: 'INTEGER' },
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
