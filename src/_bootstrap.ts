// 通常このファイルを編集する必要はありません。ゲームの処理は main.ts に記述してください
import { main } from "./main";
import { GameMainParameterObject } from "./parameterObject";

export = (originalParam: g.GameMainParameterObject) => {
	const param = {
		...originalParam,
		broadcasterId: "",
		sessionParameter: {},
	} satisfies GameMainParameterObject;

	const scene = new g.Scene({
		game: g.game,
		name: "_bootstrap",
	});

	g.game.onJoin.addOnce(event => {
		param.broadcasterId = event.player.id;
	});

	let sessionParameter: GameMainParameterObject["sessionParameter"];

	scene.onMessage.add(message => {
		if (message.data && message.data.type === "start" && message.data.parameters) {
			sessionParameter = message.data.parameters;
			return true;
		}
	});

	scene.onLoad.add(() => {
		scene.onUpdate.add(() => {
			// 放送者とセッションパラメータが確定した後にゲームを開始します
			if (param.broadcasterId && sessionParameter) {
				param.sessionParameter = sessionParameter;
				g.game.popScene();
				main(param);
				return true;
			}
		});
	});
	g.game.pushScene(scene);
};
