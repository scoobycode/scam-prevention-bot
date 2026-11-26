"use strict";

const { channelFor } = require("./channels");
const { fetchAllMessages } = require("./db");

const UNKNOWN_MESSAGE = 10008;

/** Reads the case number and reporter ID out of a report embed (old and new reports use the same field names). */
function readReport(message) {
	const fields = message.embeds?.[0]?.fields;
	if (!fields?.length) return null;
	const get = (name) => fields.find((f) => f.name === name)?.value?.trim();
	const caseNumber = get("Case Number");
	if (!caseNumber) return null;
	return { caseNumber, reporterId: get("Reporter's User ID") ?? null, message };
}

/** Keeps an index of the open reports in the reports channel so lookups don't refetch the whole channel. */
class ReportIndex {
	constructor(client) {
		this.client = client;
		this.byCase = new Map();
		this.channel = null;
	}

	async load() {
		this.channel = channelFor("reports");
		const byCase = new Map();
		for (const message of await fetchAllMessages(this.channel)) {
			const report = readReport(message);
			if (report) byCase.set(report.caseNumber, report);
		}
		this.byCase = byCase;
		return byCase.size;
	}

	add(message) {
		const report = readReport(message);
		if (report) this.byCase.set(report.caseNumber, report);
	}

	async remove(report) {
		this.byCase.delete(report.caseNumber);
		await report.message.delete().catch((err) => {
			if (err?.code !== UNKNOWN_MESSAGE) throw err;
		});
	}

	// Staff can also delete reports by hand, so double-check a cached report still exists.
	async stillExists(report) {
		try {
			await this.channel.messages.fetch({ message: report.message.id, force: true });
			return true;
		} catch (err) {
			if (err?.code === UNKNOWN_MESSAGE) {
				this.byCase.delete(report.caseNumber);
				return false;
			}
			throw err;
		}
	}

	async findByCase(caseNumber) {
		const key = String(caseNumber);
		let report = this.byCase.get(key);
		if (!report) {
			await this.load();
			report = this.byCase.get(key);
		}
		return report && (await this.stillExists(report)) ? report : null;
	}

	async findByReporter(userId) {
		for (const report of [...this.byCase.values()]) {
			if (report.reporterId === userId && (await this.stillExists(report))) return report;
		}
		return null;
	}
}

// Case numbers are handed out one at a time so two reports can never get the same number.
let caseQueue = Promise.resolve();
function nextCaseNumber(stores) {
	const next = caseQueue.then(async () => {
		const value = (Number.parseInt(stores.meta.get("case-counter", "0"), 10) || 0) + 1;
		await stores.meta.set("case-counter", String(value));
		return value;
	});
	caseQueue = next.catch(() => {});
	return next;
}

module.exports = { ReportIndex, nextCaseNumber, readReport };
