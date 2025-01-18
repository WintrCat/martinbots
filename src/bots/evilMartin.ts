import Engine from "../lib/engine";

const stockfish = new Engine();

const DEPTH = 18;

async function generateMove(fen: string) {
    stockfish.setPosition(fen);

    stockfish.onMessage(log => console.log(log));

    const evaluationResult = await stockfish.evaluate(DEPTH);

    console.log(evaluationResult.lines);

    return evaluationResult.lines.find(
        line => line.depth == DEPTH
    );
}

export default {
    generateMove
}