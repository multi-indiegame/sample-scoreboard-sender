/**
 * 名前の掲載への同意の扱い。g に触れないので spec からも読める。
 *
 * WHY: 本番の実行基盤では、名前の掲載に同意した参加者の記録だけが統計に載る。
 * akashic-scoreboard-serve はこれを代行しないので、送った記録が本番で載るはずかを
 * 送信ログで見分けられるようにする。
 */

/**
 * 参加者ごとの同意の状態。
 *
 * - unknown: resolvePlayerInfo() の結果 (g.PlayerInfoEvent) がまだ届いていない
 * - accepted: 名前の利用を許諾した
 * - declined: 許諾しなかった (ダイアログを閉じた・時間切れを含む)
 */
export type ConsentState = "unknown" | "accepted" | "declined";

export const CONSENT_LABELS: { [state in ConsentState]: string } = {
	unknown: "未確認",
	accepted: "同意",
	declined: "拒否",
};

/**
 * g.PlayerInfoEvent の userData から同意の状態を決める。
 *
 * WHY: userData は実行基盤から来る値で形が保証されないので、accepted が true の
 * ときだけ同意とみなす。
 */
export function consentStateOf(userData: any): ConsentState {
	return userData != null && userData.accepted === true
		? "accepted"
		: "declined";
}
