import { Chess } from "chess.js";

import Engine from "../lib/engine";
import { opinionatedEvaluation } from "../lib/evaluation";
import { generateMove as getMartinMove } from "./martin";

const fullStockfish = new Engine();

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
        console.log("top engine move played.");

        angry = true;

        return evaluationResult.lines.at(0)?.moves[0].uci;
    }

    // Play a martin move
    console.log("martin move played.");

    return await getMartinMove(fen);
}

export default {
    generateMove
}