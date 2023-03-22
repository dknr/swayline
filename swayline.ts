let i = 0;

const dateFormat = new Intl.DateTimeFormat("en-US", {
	month: 'short',
	day: 'numeric',
});

const timeFormat = new Intl.DateTimeFormat("en-US", {
	timeStyle: 'short',
	hour12: false
});

const utf8d = new TextDecoder();
const readSysctl = async (key: string) => {
	const process = Deno.run({
		cmd: ["sysctl", "-n", key],
		stdout: "piped",
	});
	const status = await process.status();
	const output = await process.output();
	const value = await utf8d.decode(output).trim();	
	return value;
}
const readTemp = async () => {
	const value = await readSysctl('hw.acpi.thermal.tz0.temperature');
	const degC = parseFloat(value.trimEnd('C'));
	return `${Math.round(degC)}C`;
}
const readRate = async () => {
	const value = await readSysctl('hw.acpi.battery.rate');
	const rate_mw = parseInt(value);
	const rate_w = rate_mw / 1000;
	return `${rate_w.toFixed(1)}W`;
}

const readLoad = async () => {
	const value = await readSysctl('vm.loadavg');
	const loads = Array.from(value.matchAll(/\d\.\d\d/g));
	return loads.join(' ');
}

setInterval(async () => {
	const now = new Date();
	const date = dateFormat.format(now);
	const time = timeFormat.format(now);

	const rate = await readRate();
	const temp = await readTemp();
	const life = await readSysctl('hw.acpi.battery.life');
	const load = await readLoad();

	console.log(`${load} ${rate} ${temp} ${life}% ${date} ${time}`);
}, 1000);

