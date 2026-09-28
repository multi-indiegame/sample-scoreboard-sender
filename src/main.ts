import { resolvePlayerInfo } from "@akashic-extension/resolve-player-info";
import * as scoreboard from "@multi-indiegame/akashic-scoreboard";
import { CONSENT_LABELS, ConsentState, consentStateOf } from "./consent";
import {
	BUTTON_HEIGHT,
	CONSENT_RECT,
	LOG_HEIGHT,
	LOG_WIDTH,
	LOG_X,
	LOG_Y,
	PANEL_HEIGHT,
	PANEL_WIDTH,
	PANEL_X,
	PANEL_Y,
	buttonRect,
} from "./layout";
import { GameMainParameterObject } from "./parameterObject";
import {
	AGGREGATE_BUTTONS,
	DEBUG_BUTTONS,
	DEBUG_KEY,
	SendButtonSpec,
	Subject,
	createSendMessage,
	generateValue,
	isSendMessage,
} from "./records";

const COLOR_BACKGROUND = "#1e2230";
const COLOR_PANEL = "#2a3042";
const COLOR_AGGREGATE = "#2f6fd6";
const COLOR_DEBUG = "#c2410c";
const COLOR_CONSENT = "#15803d";
const COLOR_PRESSED = "#e5e7eb";
const COLOR_TEXT = "white";
const COLOR_SUBTEXT = "#aab2c8";

/** ログに残す行数 */
const LOG_LINES = 22;
const LOG_LINE_HEIGHT = 22;

export function main(_param: GameMainParameterObject): void {
	const scene = new g.Scene({ game: g.game });

	scene.onLoad.add(() => {
		const font = new g.DynamicFont({
			game: g.game,
			fontFamily: "sans-serif",
			size: 32,
		});

		const createLabel = (
			text: string,
			x: number,
			y: number,
			fontSize: number,
			textColor: string,
			local = false,
		): g.Label =>
			new g.Label({
				scene,
				font,
				text,
				x,
				y,
				fontSize,
				textColor,
				local,
			});

		scene.append(
			new g.FilledRect({
				scene,
				cssColor: COLOR_BACKGROUND,
				width: g.game.width,
				height: g.game.height,
			}),
		);

		// ヘッダ
		scene.append(
			createLabel(
				"akashic-scoreboard 送信テスト",
				PANEL_X,
				24,
				30,
				COLOR_TEXT,
			),
		);
		// WHY: どの参加者として送っているかは画面ごとに違うので、ローカルに出す
		const selfLabel = createLabel(
			`あなたの player.id: ${g.game.selfId ?? "(なし)"}　/　記録はアクティブインスタンスが登録します`,
			PANEL_X,
			70,
			18,
			COLOR_SUBTEXT,
			true,
		);
		// 同意ボタンに重ならないよう縮める
		selfLabel.maxWidth = CONSENT_RECT.x - PANEL_X - 16;
		selfLabel.invalidate();
		scene.append(selfLabel);

		// 送信ボタン
		const createPanel = (subject: Subject, title: string): void => {
			const y = PANEL_Y[subject];
			scene.append(
				new g.FilledRect({
					scene,
					cssColor: COLOR_PANEL,
					x: PANEL_X,
					y,
					width: PANEL_WIDTH,
					height: PANEL_HEIGHT,
				}),
			);
			scene.append(
				createLabel(title, PANEL_X + 16, y + 16, 22, COLOR_TEXT),
			);

			const rows: {
				label: string;
				specs: SendButtonSpec[];
				color: string;
			}[] = [
				{
					label: "集約用",
					specs: AGGREGATE_BUTTONS,
					color: COLOR_AGGREGATE,
				},
				{ label: DEBUG_KEY, specs: DEBUG_BUTTONS, color: COLOR_DEBUG },
			];
			rows.forEach((row, rowIndex) => {
				const rowY = buttonRect(subject, rowIndex, 0).y;
				scene.append(
					createLabel(
						row.label,
						PANEL_X + 16,
						rowY + (BUTTON_HEIGHT - 18) / 2,
						18,
						COLOR_SUBTEXT,
					),
				);
				row.specs.forEach((spec, column) => {
					// 集約用はキー名ごとに型が決まっているので両方出す。debug は同じキーなので型だけ出す
					const text =
						row.specs === DEBUG_BUTTONS
							? spec.valueType
							: `${spec.key} (${spec.valueType})`;
					createButton(
						buttonRect(subject, rowIndex, column),
						text,
						row.color,
						() => {
							g.game.raiseEvent(
								new g.MessageEvent(
									createSendMessage(subject, spec),
								),
							);
						},
					);
				});
			});
		};

		const createButton = (
			rect: g.CommonArea,
			text: string,
			color: string,
			onPress: () => void,
		): g.Label => {
			// WHY: 押した参加者のパッシブインスタンスからだけ送信要求を出すため、ボタンはローカルにする
			const button = new g.FilledRect({
				scene,
				cssColor: color,
				x: rect.x,
				y: rect.y,
				width: rect.width,
				height: rect.height,
				touchable: true,
				local: true,
			});
			const label = new g.Label({
				scene,
				font,
				text,
				fontSize: 18,
				textColor: COLOR_TEXT,
				local: true,
				width: rect.width,
				widthAutoAdjust: false,
				textAlign: "center",
				y: (rect.height - 18) / 2,
			});
			button.append(label);
			button.onPointDown.add(() => {
				button.cssColor = COLOR_PRESSED;
				button.modified();
				label.textColor = COLOR_BACKGROUND;
				label.invalidate();
				onPress();
			});
			button.onPointUp.add(() => {
				button.cssColor = color;
				button.modified();
				label.textColor = COLOR_TEXT;
				label.invalidate();
			});
			scene.append(button);
			return label;
		};

		createPanel(
			"player",
			"プレイヤーごと — setPlayerRecord(ev.player.id, …)",
		);
		createPanel("play", "プレイ自体 — setPlayRecord(…)");

		// 送信ログ
		scene.append(
			new g.FilledRect({
				scene,
				cssColor: COLOR_PANEL,
				x: LOG_X,
				y: LOG_Y,
				width: LOG_WIDTH,
				height: LOG_HEIGHT,
			}),
		);
		scene.append(
			createLabel(
				"送信ログ (新しい順)",
				LOG_X + 16,
				LOG_Y + 16,
				22,
				COLOR_TEXT,
			),
		);
		const logLabels: g.Label[] = [];
		for (let i = 0; i < LOG_LINES; i++) {
			const label = new g.Label({
				scene,
				font,
				text: "",
				x: LOG_X + 16,
				y: LOG_Y + 56 + i * LOG_LINE_HEIGHT,
				fontSize: 15,
				textColor: COLOR_TEXT,
				maxWidth: LOG_WIDTH - 32,
			});
			logLabels.push(label);
			scene.append(label);
		}
		const logs: string[] = [];
		const addLog = (line: string): void => {
			logs.unshift(line);
			if (logs.length > LOG_LINES) logs.pop();
			logLabels.forEach((label, i) => {
				label.text = logs[i] ?? "";
				label.invalidate();
			});
		};

		// 名前の掲載への同意
		// WHY: g.PlayerInfoEvent は全インスタンスに届くので、状態は全インスタンスで揃う
		const consents: { [playerId: string]: ConsentState } =
			Object.create(null);
		const consentOf = (playerId: string): ConsentState =>
			consents[playerId] ?? "unknown";
		const consentButtonText = (state: ConsentState): string =>
			`名前の掲載に同意する (いま: ${CONSENT_LABELS[state]})`;
		const consentLabel = createButton(
			CONSENT_RECT,
			consentButtonText("unknown"),
			COLOR_CONSENT,
			() => {
				// WHY: resolvePlayerInfo() はローカルイベントの処理内でだけ呼ぶ決まり。
				// raises: true で結果を g.PlayerInfoEvent として全インスタンスへ流す
				resolvePlayerInfo({ raises: true });
			},
		);
		g.game.onPlayerInfo.add((ev) => {
			const player = ev.player;
			if (player?.id == null) return;
			const state = consentStateOf(player.userData);
			consents[player.id] = state;
			addLog(
				`[同意] ${player.id}: ${CONSENT_LABELS[state]} (name: ${JSON.stringify(player.name ?? null)})`,
			);
			// WHY: ボタンはローカルなので、自分の結果だけを出す
			if (player.id === g.game.selfId) {
				consentLabel.text = consentButtonText(state);
				consentLabel.invalidate();
			}
		});

		scene.onMessage.add((ev) => {
			// WHY: -serve が流す記録の更新通知など、自分宛でない type は無視する
			if (!isSendMessage(ev.data)) return;
			const playerId = ev.player?.id;
			if (playerId == null) return;

			// WHY: 値は全インスタンスで引いて揃える。登録はアクティブインスタンスでだけ通る
			const value = generateValue(ev.data.valueType, () =>
				g.game.random.generate(),
			);
			const patch = { [ev.data.key]: value };

			if (ev.data.subject === "player") {
				// 送信元の参加者 (パッシブインスタンス) の player.id を相手にする
				scoreboard.setPlayerRecord(playerId, patch);
			} else {
				scoreboard.setPlayRecord(patch);
			}

			// WHY: JSON にするのは、string の "true" と boolean の true を見分けられるようにするため
			// WHY: プレイヤーごとの記録は、本番では同意した参加者の分だけが載るので、同意の状態を添える
			const consent =
				ev.data.subject === "player"
					? ` / 掲載: ${CONSENT_LABELS[consentOf(playerId)]}`
					: "";
			addLog(
				`[${ev.data.subject}] ${playerId}: ${ev.data.key} = ${JSON.stringify(value)}${consent}`,
			);
		});
	});

	g.game.pushScene(scene);
}
