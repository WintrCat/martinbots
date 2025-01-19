import { random } from "lodash";
import { Chess } from "chess.js";

import Engine from "../lib/engine";
import { opinionatedEvaluation } from "../lib/evaluation";

const fullStockfish = new Engine();

const martin = new Engine();

martin.setOption("UCI_LimitStrength", "true");
martin.setOption("UCI_Elo", "400");

let lastGameId = "";
let angry = false;

async function generateMove(gameId: string, fen: string) {
    if (gameId != lastGameId) {
        lastGameId = gameId;
        angry = false;
    }

    const board = new Chess(fen);
    const moves = board.moves({ verbose: true });

    if (moves.length == 0) return;

    // Get top engine move
    // If evaluation is worse than -6, start playing them
    fullStockfish.setPosition(fen);
    
    const evaluationResult = await fullStockfish.evaluate(18);

    const evaluation = evaluationResult.lines.at(-1)!.evaluation;

    const evaluationValue = opinionatedEvaluation(
        evaluation.value,
        fen.includes(" b ") ? "black" : "white"
    );

    console.log(`the evaluation from perspective of bot is: ${evaluationValue}`);

    if (
        evaluationValue < -600
        || (
            evaluation.type == "mate"
            && evaluationValue < 0
        )
        || angry
    ) {
        console.log(`top engine move played.`);

        angry = true;

        return evaluationResult.lines.at(0)?.moves[0].uci;
    }

    // Play a martin move
    if (random(10) > 4) {
        return new Promise<string>(res => {
            const moveUci = moves[random(moves.length - 1)].lan;

            setTimeout(() => {
                console.log("martin move played.");

                res(moveUci);
            }, 700);
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

    console.log(`martin move played.`);

    return moveUci;
}

export default {
    generateMove
}