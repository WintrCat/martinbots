import fetch from "node-fetch";
import dotenv from "dotenv";

import evilMartin from "./bots/evilMartin";

dotenv.config();

type PieceColour = "white" | "black";

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

// Stream of challenge events
async function* getEventStream(): AsyncGenerator<any> {
    const eventStreamResponse = await fetch("https://lichess.org/api/stream/event", {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${process.env.BOT_TOKEN}`
        }
    });

    const eventStream = eventStreamResponse.body;
    if (!eventStream) return;

    console.log("logging events...");

    for await (const event of eventStream) {
        try {
            yield JSON.parse(event.toString());
        } catch {}
    }
}

// Stream of board updates / move events
async function* getBoardStateStream(gameId: string): AsyncGenerator<any> {
    const stateStreamResponse = await fetch(`https://lichess.org/api/bot/game/stream/${gameId}`, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${process.env.BOT_TOKEN}`
        }
    });

    const stateStream = stateStreamResponse.body;
    if (!stateStream) return;

    for await (const event of stateStream) {
        try {
            yield JSON.parse(event.toString());
        } catch {}
    }
}

async function listenBoardStates(gameId: string, colour: PieceColour) {
    const boardStateStream = getBoardStateStream(gameId);

    for await (const event of boardStateStream) {
        if (event.type == "gameFull" && colour == "white") {
            const topLine = await evilMartin.generateMove(
                event.initialFen == "startpos"
                    ? STARTING_FEN
                    : event.initialFen
            );

            if (!topLine) continue;

            console.log(`evil martin's move is: ${topLine.moves[0].san}`);
        }
    }
}

async function main() {
    console.log(await evilMartin.generateMove(STARTING_FEN));

    for await (const event of getEventStream()) {
        if (event.type == "gameStart") {
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