/**
 * 何をどのキーに送るかの定義。g に触れないので spec からも読める。
 */

/**
 * このゲームが送る MessageEvent の type。
 *
 * WHY: akashic-scoreboard-serve も記録の更新を MessageEvent で全インスタンスへ流す。
 * 自分宛だけを拾うために、名前空間付きの type にする。
 */
export const MESSAGE_TYPE = "sample-scoreboard-sender:send";

/** 記録の相手。player は setPlayerRecord、play は setPlayRecord に対応する */
export type Subject = "player" | "play";

export type ValueType = "number" | "boolean" | "string";

export interface SendButtonSpec {
	key: string;
	valueType: ValueType;
}

/** 型が混ざったときの実行基盤の警告を確かめるためのキー */
export const DEBUG_KEY = "debug_mixed";

/** 集約のテスト用。キーごとに型を固定して送る */
export const AGGREGATE_BUTTONS: SendButtonSpec[] = [
	{ key: "score", valueType: "number" },
	{ key: "cleared", valueType: "boolean" },
	{ key: "rank", valueType: "string" },
];

/** 警告のテスト用。同じキーにどの型でも送れるようにする */
export const DEBUG_BUTTONS: SendButtonSpec[] = [
	{ key: DEBUG_KEY, valueType: "number" },
	{ key: DEBUG_KEY, valueType: "boolean" },
	{ key: DEBUG_KEY, valueType: "string" },
];

/** string で送る値の候補。集約で件数が偏って見えるよう、少数から選ぶ */
export const STRING_VALUES = ["S", "A", "B", "C"];

export interface SendMessage {
	type: typeof MESSAGE_TYPE;
	subject: Subject;
	key: string;
	valueType: ValueType;
}

export function createSendMessage(
	subject: Subject,
	spec: SendButtonSpec,
): SendMessage {
	return {
		type: MESSAGE_TYPE,
		subject,
		key: spec.key,
		valueType: spec.valueType,
	};
}

function isKnownButton(key: string, valueType: string): boolean {
	const specs = AGGREGATE_BUTTONS.concat(DEBUG_BUTTONS);
	for (let i = 0; i < specs.length; i++) {
		if (specs[i].key === key && specs[i].valueType === valueType)
			return true;
	}
	return false;
}

/**
 * 自分宛の送信要求か。
 *
 * WHY: 集約用のキーに別の型が紛れると集約のテストにならないので、ボタンに無い
 * キーと型の組み合わせは受け付けない。
 */
export function isSendMessage(data: any): data is SendMessage {
	return (
		data != null &&
		data.type === MESSAGE_TYPE &&
		(data.subject === "player" || data.subject === "play") &&
		isKnownButton(data.key, data.valueType)
	);
}

/**
 * 送る値を決める。
 *
 * WHY: onMessage の中で g.game.random から引くので、全インスタンスで同じ値になる。
 * 記録を登録するのはアクティブインスタンスだけだが、ログの表示を揃えるため。
 */
export function generateValue(
	valueType: ValueType,
	random: () => number,
): number | boolean | string {
	switch (valueType) {
		case "number":
			return Math.floor(random() * 1000);
		case "boolean":
			return random() < 0.5;
		case "string":
			return STRING_VALUES[Math.floor(random() * STRING_VALUES.length)];
	}
}
