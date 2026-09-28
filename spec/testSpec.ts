import * as path from "path";
import {
	GameClient,
	GameContext,
	type RunnerPlayer,
} from "@akashic/headless-akashic";
import { CONSENT_LABELS, consentStateOf } from "../src/consent";
import { CONSENT_RECT, Rect, buttonRect } from "../src/layout";
import { DEBUG_KEY, STRING_VALUES, Subject } from "../src/records";

async function advanceToMainScene(client: GameClient): Promise<void> {
	await client.advanceUntil(
		() =>
			client.game.scene()!.local !== "full-local" &&
			client.game.scene()!.name !== "_bootstrap",
	);
}

/**
 * 矩形の中央を押して、その結果が処理されるまで進める。
 *
 * WHY: 別々のクライアントから同時に送ると、アクティブインスタンスに届く順が
 * 押した順と揃わない。1 回ずつ進めて順番を固定する。
 */
async function tapRect(
	context: GameContext,
	client: GameClient,
	rect: Rect,
): Promise<void> {
	const x = rect.x + rect.width / 2;
	const y = rect.y + rect.height / 2;
	client.sendPointDown(x, y, 0);
	client.sendPointUp(x, y, 0);
	await context.advanceEach(100);
}

async function tap(
	context: GameContext,
	client: GameClient,
	subject: Subject,
	row: number,
	column: number,
): Promise<void> {
	await tapRect(context, client, buttonRect(subject, row, column));
}

/**
 * resolvePlayerInfo() が使う coeLimited の代役。名前の利用許諾ダイアログを出さずに、
 * 決めておいた結果をすぐ返す。
 */
function fakeCoeLimited(accepted: boolean, name: string): object {
	return {
		startLocalSession: (params: {
			messageHandler: (message: any) => void;
		}) => {
			params.messageHandler({
				result: { name, userData: { accepted, premium: false } },
			});
		},
		exitLocalSession: () => {},
	};
}

/** 画面上の全ラベルの文字列。ボタンの中のラベルも含む */
function labelTexts(client: GameClient): string[] {
	const texts: string[] = [];
	const walk = (entities: any[] | undefined): void => {
		(entities ?? []).forEach((e) => {
			if (typeof e.text === "string" && e.text !== "") texts.push(e.text);
			walk(e.children);
		});
	};
	walk(client.game.scene()!.children);
	return texts;
}

describe("mainScene", () => {
	let context: GameContext;
	let setPlayerRecord: jest.Mock;
	let setPlayRecord: jest.Mock;
	let activeClient: GameClient;
	let broadcasterClient: GameClient;
	let otherClient: GameClient;

	const broadcasterPlayer: RunnerPlayer = {
		id: "broadcaster-player-id",
		name: "broadcaster-player-name",
	};
	const otherPlayer: RunnerPlayer = {
		id: "other-player-id",
		name: "other-player-name",
	};

	beforeEach(async () => {
		setPlayerRecord = jest.fn();
		setPlayRecord = jest.fn();
		context = new GameContext({
			gameJsonPath: path.join(__dirname, "..", "game.json"),
		});

		// 実行基盤と同じく、アクティブインスタンスにだけ scoreboard を生やす
		activeClient = await context.getGameClient({
			externalValue: { scoreboard: { setPlayerRecord, setPlayRecord } },
		});
		activeClient.sendJoinEvent(
			broadcasterPlayer.id,
			broadcasterPlayer.name,
		);
		activeClient.sendMessage({ type: "start", parameters: {} });
		await advanceToMainScene(activeClient);

		// 放送者は名前の利用を許諾しない、他の参加者は許諾する
		broadcasterClient = await context.createPassiveGameClient({
			player: broadcasterPlayer,
			externalValue: {
				coeLimited: fakeCoeLimited(false, "ゲスト123"),
			},
		});
		await advanceToMainScene(broadcasterClient);
		otherClient = await context.createPassiveGameClient({
			player: otherPlayer,
			externalValue: {
				coeLimited: fakeCoeLimited(true, otherPlayer.name!),
			},
		});
		await advanceToMainScene(otherClient);

		// シーンロードのため少しだけ進める
		await context.advanceEach(100);
	});

	afterEach(async () => {
		await context.destroy();
	});

	it("集約用のキーは、押した参加者の player.id でキーごとに決まった型を送る", async () => {
		await tap(context, broadcasterClient, "player", 0, 0);
		await tap(context, otherClient, "player", 0, 0);
		await tap(context, otherClient, "player", 0, 1);
		await tap(context, otherClient, "player", 0, 2);

		const calls = setPlayerRecord.mock.calls;
		expect(calls.map(([playerId]) => playerId)).toEqual([
			broadcasterPlayer.id,
			otherPlayer.id,
			otherPlayer.id,
			otherPlayer.id,
		]);
		expect(typeof calls[0][1].score).toBe("number");
		expect(typeof calls[1][1].score).toBe("number");
		expect(typeof calls[2][1].cleared).toBe("boolean");
		expect(STRING_VALUES).toContain(calls[3][1].rank);
		expect(setPlayRecord).not.toHaveBeenCalled();
	});

	it("debug 用のキーには同じキーへ number / boolean / string を送れる", async () => {
		await tap(context, broadcasterClient, "player", 1, 0);
		await tap(context, broadcasterClient, "player", 1, 1);
		await tap(context, otherClient, "player", 1, 2);
		await tap(context, otherClient, "play", 1, 0);
		await tap(context, otherClient, "play", 1, 1);
		await tap(context, broadcasterClient, "play", 1, 2);

		expect(
			setPlayerRecord.mock.calls.map(([playerId, patch]) => [
				playerId,
				typeof patch[DEBUG_KEY],
			]),
		).toEqual([
			[broadcasterPlayer.id, "number"],
			[broadcasterPlayer.id, "boolean"],
			[otherPlayer.id, "string"],
		]);
		expect(
			setPlayRecord.mock.calls.map(([patch]) => typeof patch[DEBUG_KEY]),
		).toEqual(["number", "boolean", "string"]);
	});

	it("プレイ自体の集約用のキーを送る", async () => {
		await tap(context, broadcasterClient, "play", 0, 0);
		await tap(context, otherClient, "play", 0, 1);
		await tap(context, otherClient, "play", 0, 2);

		const patches = setPlayRecord.mock.calls.map(([patch]) => patch);
		expect(typeof patches[0].score).toBe("number");
		expect(typeof patches[1].cleared).toBe("boolean");
		expect(STRING_VALUES).toContain(patches[2].rank);
		expect(setPlayerRecord).not.toHaveBeenCalled();
	});

	it("自分宛でない MessageEvent は無視する", async () => {
		broadcasterClient.sendMessage({
			type: "@multi-indiegame/akashic-scoreboard-serve",
			key: "score",
			valueType: "number",
		});
		// ボタンに無いキーと型の組み合わせも受け付けない
		broadcasterClient.sendMessage({
			type: "sample-scoreboard-sender:send",
			subject: "player",
			key: "score",
			valueType: "string",
		});
		await context.advanceEach(100);

		expect(setPlayerRecord).not.toHaveBeenCalled();
		expect(setPlayRecord).not.toHaveBeenCalled();
	});

	it("同意ボタンの結果が全インスタンスに届き、送信ログに同意の状態が添えられる", async () => {
		// 同意の前に送った分
		await tap(context, otherClient, "player", 0, 0);

		await tapRect(context, otherClient, CONSENT_RECT);
		await tapRect(context, broadcasterClient, CONSENT_RECT);

		await tap(context, otherClient, "player", 0, 0);
		await tap(context, broadcasterClient, "player", 0, 0);
		await tap(context, broadcasterClient, "play", 0, 0);

		// 同意の有無で登録を分けるのは実行基盤の仕事なので、ゲームは全員分を送る
		expect(
			setPlayerRecord.mock.calls.map(([playerId]) => playerId),
		).toEqual([otherPlayer.id, otherPlayer.id, broadcasterPlayer.id]);

		const expected = [
			expect.stringMatching(
				new RegExp(`^\\[play\\] ${broadcasterPlayer.id}: score = \\d+$`),
			),
			`[player] ${broadcasterPlayer.id}: score = ${JSON.stringify(setPlayerRecord.mock.calls[2][1].score)} / 掲載: ${CONSENT_LABELS.declined}`,
			`[player] ${otherPlayer.id}: score = ${JSON.stringify(setPlayerRecord.mock.calls[1][1].score)} / 掲載: ${CONSENT_LABELS.accepted}`,
			`[同意] ${broadcasterPlayer.id}: ${CONSENT_LABELS.declined} (name: "ゲスト123")`,
			`[同意] ${otherPlayer.id}: ${CONSENT_LABELS.accepted} (name: "${otherPlayer.name}")`,
			`[player] ${otherPlayer.id}: score = ${JSON.stringify(setPlayerRecord.mock.calls[0][1].score)} / 掲載: ${CONSENT_LABELS.unknown}`,
		];
		for (const client of [activeClient, broadcasterClient, otherClient]) {
			const texts = labelTexts(client);
			const logs = texts.filter((t) => /^\[(player|play|同意)\]/.test(t));
			expect(logs).toEqual(expected);
		}

		// ボタンには自分の結果だけが出る
		expect(labelTexts(otherClient)).toContain(
			`名前の掲載に同意する (いま: ${CONSENT_LABELS.accepted})`,
		);
		expect(labelTexts(broadcasterClient)).toContain(
			`名前の掲載に同意する (いま: ${CONSENT_LABELS.declined})`,
		);
	});
});

describe("consentStateOf", () => {
	it("accepted が true のときだけ同意とみなす", () => {
		expect(consentStateOf({ accepted: true, premium: false })).toBe(
			"accepted",
		);
		expect(consentStateOf({ accepted: false, premium: false })).toBe(
			"declined",
		);
		expect(consentStateOf({ accepted: "true" })).toBe("declined");
		expect(consentStateOf(undefined)).toBe("declined");
	});
});
