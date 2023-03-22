const format = {
	loadAvg: (value: string) =>
		Array.from(value.matchAll(/\d*\.\d*/g)).join(' '),

	unit: (suffix: string, scale: number = 1) => (value: string) =>
		(parseInt(value) * Math.pow(10, scale)).toFixed(2) + suffix,

	date: new Intl.DateTimeFormat("en-US", {
		month: 'short',
		day: 'numeric',
	}).format,

	time: new Intl.DateTimeFormat("en-US", {
		timeStyle: 'short',
		hour12: false
	}).format,
};

const utf8d = new TextDecoder();
const readProcess = async (cmd: string[]) => {
	const process = Deno.run({
		cmd,
		stdout: "piped",
	});
	await process.status();
	const output = await process.output();
	return utf8d.decode(output).trim();
}

const cmd = (args: string[], format?: (value: string) => string) => async (): Promise<string> => {
	const result = await readProcess(args);
	return format ? format(result) : result;
}

const sysctl = (key: string, format?: (value: string) => string) =>
	cmd(['sysctl', '-n', key], format);

const load = sysctl('vm.loadavg', format.loadAvg);
const power = sysctl('hw.acpi.battery.rate', format.unit('W', -3));
const life = sysctl('hw.acpi.battery.life', (value) => value + '%'); 
const temp = sysctl('hw.acpi.thermal.tz0.temperature');
const speed = sysctl('dev.cpu.0.freq', format.unit('G', -3))

const date = () => format.date(new Date());
const time = () => format.time(new Date());

const get = <T>(input: string) => fetch(input).then((res) => res.json() as T);

// let forecast = null;
// setInterval(() => {
//
// })

type NwsForecast = {
	properties: {
		periods: Array<{
			temperature: number;
			temperatureUnit: string;
			probabilityOfPrecipitation: {
				unitCode: string;
				value: number;
			}
		}>
	}
}

const getForecast = (lon: number, lat: number) =>
	get<any>(`https://api.weather.gov/points/${lon},${lat}`)
		.then((point) => get<NwsForecast>(point.properties.forecast));

const weather = (lon: number, lat: number) => {
	let forecast: NwsForecast = null!;
	setTimeout(async () => forecast = await getForecast(lon, lat));
	setInterval(async () => {
		forecast = await getForecast(lon, lat);
	}, 60 * 60 * 1000);

	return () => {
		if (forecast == null) {
			return '??F';
		}
		const period0 = forecast.properties.periods[0];
		return `${period0.temperature}${period0.temperatureUnit}`;
	}
}

const space = () => " ";
const bar = () => "|";

type LineSource = () => Promise<string> | string;
const sources: LineSource[] = [
	space,
	weather(34.54,-112.47),
	bar,
	load,
	speed,
	bar,
	power,
	life,
	temp,
	bar,
	date,
	time,
];

setInterval(async () => {
	const status = (await Promise.all(sources.map((source) => source()))).join(' ');
	Deno.run({cmd: ['xsetroot', '-name', status]});
	console.log(status);
}, 1000);
