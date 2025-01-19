import fetch from "node-fetch";

// Stream of challenge events
export async function* getEventStream(): AsyncGenerator<any> {
    const eventStreamResponse = await fetch("https://lichess.org/api/stream/event", {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${process.env.BOT_TOKEN}`
        }
    });

    const eventStream = eventStreamResponse.body;
    if (!eventStream) return;

    for await (const event of eventStream) {
        try {
            yield JSON.parse(event.toString());
        } catch {}
    }
}

// Stream of board updates / move events
export async function* getBoardStateStream(gameId: string): AsyncGenerator<any> {
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

// Play a move in a game
export async function playMove(gameId: string, moveUci: string) {
    await fetch(`https://lichess.org/api/bot/game/${gameId}/move/${moveUci}`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.BOT_TOKEN}`
        }
    });
}