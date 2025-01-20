import fetch from "node-fetch";
import dotenv from "dotenv";
import { Chess } from "chess.js";

import PieceColour from "./types/PieceColour";
import { getEventStream, getBoardStateStream, playMove } from "./lib/lichessBot";
import evilMartin from "./bots/evilMartin";
import stockmartin from "./bots/stockmartin";
import martinfish from "./bots/martinfish";

dotenv.config();

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

async function playBotMove(gameId: string, fen: string) {
    let uciMove: string | undefined;

    switch (process.env.BOT_TYPE) {
        case "evil_martin":
            uciMove = await evilMartin.generateMove(gameId, fen);
            break;
        case "stockmartin":
            uciMove = await stockmartin.generateMove(gameId, fen);
            break;
        case "martinfish":
            uciMove = await martinfish.generateMove(gameId, fen);
            break;
        default:
            throw new Error("no bot type found in environment variables.");
    }

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

console.log(`starting lichess bot with type: ${process.env.BOT_TYPE}`);

main();