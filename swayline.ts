const format = {
	loadAvg: (value: string) =>
		Array.from(value.matchAll(/\d*\.\d*/g)).join(' '),

	unit: (suffix: string, scale: number = 1) => (value: string) =>
		(parseInt(value) * Math.pow(10, scale)).toFixed(1) + suffix,

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
const temp = sysctl('hw.acpi.thermal.tz0.temperature');
const speed = sysctl('dev.cpu.0.freq', format.unit('G', -3))

const date = () => format.date(new Date());
const time = () => format.time(new Date());

type LineSource = () => Promise<string> | string;
const sources: LineSource[] = [
	load,
	power,
	speed,
	temp,
	date,
	time,
];

setInterval(async () => {
	const status = await Promise.all(sources.map((source) => source()))
	Deno.run({cmd: ['xsetroot', '-name', status.join(' ')]});
}, 1000);
