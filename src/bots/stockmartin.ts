import { Chess } from "chess.js";

import Engine from "../lib/engine";
import { opinionatedEvaluation } from "../lib/evaluation";
import { generateMove as getMartinMove } from "./martin";

const stockfish = new Engine();

let lastGameId = "";
let angry = true;

async function generateMove(gameId: string, fen: string) {
    if (gameId != lastGameId) {
        lastGameId = gameId;
        angry = true;
    }

    const board = new Chess(fen);
    const moves = board.moves({ verbose: true });

    if (moves.length == 0) return;

    // Get top engine move
    stockfish.setPosition(fen);
    
    const evaluationResult = await stockfish.evaluate(18);

    const evaluation = evaluationResult.lines.at(-1)!.evaluation;

    const evaluationValue = opinionatedEvaluation(
        evaluation.value,
        fen.includes(" b ") ? "black" : "white"
    );

    console.log(`the evaluation from perspective of bot is: ${evaluationValue}`);

    // If the evaluation is good for bot, start playing like Martin
    if (
        evaluationValue >= 600
        || (
            evaluation.type == "mate"
            && evaluationValue > 0
        )
        || !angry
    ) {
        if (angry) {
            console.log("stockmartin was put into martin mode.");

            angry = false;
        }

        console.log("martin move played.");

        return await getMartinMove(fen);
    }

    // Play the top engine move
    console.log("top engine move played.");

    return evaluationResult.lines.at(0)?.moves[0].uci;
}

export default {
    generateMove
}