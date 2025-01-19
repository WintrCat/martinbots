import fetch from "node-fetch";
import dotenv from "dotenv";
import { Chess } from "chess.js";

import PieceColour from "./types/PieceColour";
import { getEventStream, getBoardStateStream, playMove } from "./lib/lichessBot";
import evilMartin from "./bots/evilMartin";

dotenv.config();

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

async function playBotMove(gameId: string, fen: string) {
    const uciMove = await evilMartin.generateMove(gameId, fen);
    if (!uciMove) return;

    console.log(`bot's move is: ${uciMove}, playing it...`);

    playMove(gameId, uciMove);
}

async function listenBoardStates(gameId: string, colour: PieceColour) {
    const boardStateStream = getBoardStateStream(gameId);

    let initialFen = STARTING_FEN;

    for await (const event of boardStateStream) {
        if (event.type == "gameState") {
            const board = new Chess(initialFen);

            try {
                for (const move of event.moves.split(" ")) {
                    board.move(move);
                }
            } catch {
                continue;
            }

            if (board.turn() != colour.charAt(0)) continue;

            playBotMove(gameId, board.fen());
        }

        if (event.type == "gameFull" && colour == "white") {
            initialFen = event.initialFen == "startpos"
                ? STARTING_FEN
                : event.initialFen;

            playBotMove(gameId, initialFen);
        }
    }
}

async function main() {
    console.log("listening to challenges...");

    for await (const event of getEventStream()) {
        if (event.type == "gameStart") {
            console.log("game started.");

            listenBoardStates(event.game.gameId, event.game.color);

            continue;
        }

        if (event.type != "challenge") continue;

        if (event.challenge.challenger.id != process.env.ALLOWED_USER) {
            console.log(
                "challenge from unauthorized user "
                + `${event.challenge.challenger.id} blocked.`
            );

            continue;
        }

        await fetch(`https://lichess.org/api/challenge/${event.challenge.id}/accept`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.BOT_TOKEN}`
            }
        });

        console.log("challenge received from allowed user, accepting it...");
    }
}

main();