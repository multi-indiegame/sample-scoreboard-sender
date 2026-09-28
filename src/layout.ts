/**
 * 画面の配置。g に触れないので spec からもボタンの位置を引ける。
 */
import { Subject } from "./records";

export const PANEL_X = 40;
export const PANEL_WIDTH = 760;
export const PANEL_HEIGHT = 250;
export const PANEL_Y: { [subject in Subject]: number } = {
	player: 120,
	play: 400,
};

export const ROW_LABEL_WIDTH = 150;
export const BUTTON_WIDTH = 180;
export const BUTTON_HEIGHT = 56;
export const BUTTON_GAP = 12;

/** パネル上端から各行 (0: 集約用, 1: debug) のボタン上端まで */
const ROW_OFFSETS = [80, 164];

export const LOG_X = 830;
export const LOG_Y = 120;
export const LOG_WIDTH = 410;
export const LOG_HEIGHT = 530;

export interface Rect {
	x: number;
	y: number;
	width: number;
	height: number;
}

/** 名前の掲載に同意するボタン。ヘッダの右、送信ログの上に置く */
export const CONSENT_RECT: Rect = {
	x: LOG_X,
	y: 40,
	width: LOG_WIDTH,
	height: BUTTON_HEIGHT,
};

/**
 * ボタンの位置。
 *
 * @param row 0 が集約用、1 が debug 用
 * @param column 0: number, 1: boolean, 2: string
 */
export function buttonRect(
	subject: Subject,
	row: number,
	column: number,
): Rect {
	return {
		x:
			PANEL_X +
			16 +
			ROW_LABEL_WIDTH +
			column * (BUTTON_WIDTH + BUTTON_GAP),
		y: PANEL_Y[subject] + ROW_OFFSETS[row],
		width: BUTTON_WIDTH,
		height: BUTTON_HEIGHT,
	};
}
