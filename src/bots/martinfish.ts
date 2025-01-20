import { Chess } from "chess.js";
import { random } from "lodash";

import Engine from "../lib/engine";
import { generateMove as getMartinMove } from "./martin";

const stockfish = new Engine();

async function generateMove(gameId: string, fen: string) {
    const board = new Chess(fen);
    const moves = board.moves({ verbose: true });

    if (moves.length == 0) return;

    // Random chance of martin move
    if (random(10) > 8) {
        console.log("martin move played.");

        return await getMartinMove(fen);
    }

    // Play the top engine move
    stockfish.setPosition(fen);
    
    const evaluationResult = await stockfish.evaluate(18);

    console.log("top engine move played.");

    return evaluationResult.lines.at(0)?.moves[0].uci;
}

export default {
    generateMove
}