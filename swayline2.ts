type Part = (set: (value: string) => void) => void;

const swayline = (parts: Part[], update: (status: value) => void) => {
	const values = parts.map(() => '');

	parts.forEach((part, i) => {
		part((value) => {
			values[i] = value;
			update(values.join(' '));
		});
	});
}

const setTask = (task: () => void, interval_seconds: number = 1) => {
	setTimeout(task);
	setInterval(task, interval_seconds * 1000);
}

const counter = (rate: number) => (set) => {
	let i = 0;
	setTask(() => set((i++).toString().padStart(3)), 1 / (rate || 1));
}

/*
const gofer: typeof fetch = (input, init) => {
	return fetch(input, { ...init, ...{
		headers: {
			...init.headers,
			'User-Agent': '(swayline, admin@caos.one)',
		},
	}});
}
*/

const weather = (location: [number,number]) => (set) => setTask(async () => {
	const pointResponse = await fetch(`https://api.weather.gov/points/${location[0]},${location[1]}`);
	const point = await pointResponse.json();

	const forecastHourlyResponse = await fetch(point.properties.forecastHourly);
	const forecastHourly = await forecastHourlyResponse.json();

	set(forecastHourly.properties.periods[0].temperature);

}, 10 * 60);

const utf8d = new TextDecoder();

const sysctl = (oid: string) => (set) => setTask(async () => {
	const process = await Deno.run({cmd: ["sysctl", "-n", oid], stdout: 'piped'});
	const status = await process.status();
	// TODO: check status
	const output = await process.output();
	const result = utf8d.decode(output);
	set(result);
}, 5);


swayline([
	counter(0),
	weather([34.5,-112]),
	sysctl("hw.acpi.battery.life"),
], console.log);

