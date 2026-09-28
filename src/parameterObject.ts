export interface GameMainParameterObject extends g.GameMainParameterObject {
	/**
	 * 放送者のプレイヤーID
	 */
	broadcasterId: string;

	/**
	 * セッションパラメータ
	 */
	sessionParameter: any;
}
