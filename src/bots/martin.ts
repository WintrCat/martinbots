import { random } from "lodash";
import { Chess } from "chess.js";

import Engine from "../lib/engine";

const martin = new Engine();

martin.setOption("UCI_LimitStrength", "true");
martin.setOption("UCI_Elo", "400");

export async function generateMove(fen: string) {
    const board = new Chess(fen);
    const moves = board.moves({ verbose: true });

    if (moves.length == 0) return;

    // Play a martin move
    if (random(10) > 4) {
        return new Promise<string>(res => {
            const moveUci = moves[random(moves.length - 1)].lan;

            setTimeout(() => res(moveUci), 700);
        });
    }

    martin.setPosition(fen);

    const evaluationLogs = await martin.consumeLogs(
        `go movetime 700`,
        log => (
            log.includes("bestmove")
            || log.includes("depth 0")
        )
    );

    const moveLog = evaluationLogs.at(-1)!;

    const moveUci = moveLog.match(/(?<=(?:bestmove )|(?: pv )).{4,5}/)?.[0];

    return moveUci;
}