import Engine from "./lib/engine";
import { spawn } from "child_process";

const sf = new Engine();

sf.setOption("Skill Level", "0");

//sf.onMessage(log => console.log(log));

export async function test() {
    const evaluationLogs = await sf.consumeLogs(
        `go depth 18`,
        log => (
            log.includes("bestmove")
            || log.includes("depth 0")
        )
    );

    const moveLog = evaluationLogs.at(-1)!;

    const moveUci = moveLog.match(/(?<=bestmove ).+?(?= )/)?.[0];

    console.log(moveUci);



    // const sf = spawn("./public/stockfish/stockfish");

    // sf.stdout.on("data", chunk => {
    //     console.log(String(chunk));
    // });

    // sf.stdin.write("uci\n");
    // sf.stdin.write("setoption name Skill Level value 0\n");
    // sf.stdin.write("go depth 18\n");
}