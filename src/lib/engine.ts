import { spawn } from "child_process";
import { Chess } from "chess.js";

import EngineLine from "../types/EngineLine";

interface EvaluationResult {
    elapsedTime: number;
    lines: EngineLine[];
}

// Convert UCI evaluation types to our ones
const UCI_EVALUATION_TYPES: Record<string, string | undefined> = {
    cp: "centipawn",
    mate: "mate"
};

class Engine {
    private worker;

    private position = new Chess().fen();

    constructor() {
        this.worker = spawn("./public/stockfish/stockfish.exe");

        this.sendCommand("uci");
        this.setPosition(this.position);
    }

    private sendCommand(command: string) {
        this.worker.stdin.write(command + "\n");
    }

    private consumeLogs(
        command: string,
        endCondition: (logMessage: string) => boolean,
        onLogReceived?: (logMessage: string) => void
    ): Promise<string[]> {
        this.sendCommand(command);

        const worker = this.worker;
        const logMessages: string[] = [];

        return new Promise((resolve, reject) => {
            function onMessageReceived(data: any) {
                const message = String(data);

                onLogReceived?.(message);
    
                logMessages.push(message);
    
                if (endCondition(message)) {
                    worker.stdout.off("message", onMessageReceived);
                    worker.stderr.off("error", reject);

                    resolve(logMessages);
                }
            }

            this.worker.stdout.on("data", onMessageReceived);
            this.worker.stderr.on("error", reject);
        });
    }

    onMessage(handler: (message: string) => void) {
        this.worker.stdout.on("data", data => {
            handler(String(data));
        });
    }

    onError(handler: (error: string) => void) {
        this.worker.stderr.on("error", error => {
            handler(error.message);
        });
    }

    terminate() {
        this.worker.kill();
    }

    setOption(option: string, value: string) {
        this.sendCommand(
            `setoption name ${option} value ${value}`
        );
    }

    setLineCount(lines: number) {
        this.setOption("MultiPV", lines.toString());
    }

    getPosition() {
        return this.position;
    }

    setPosition(fen: string, uciMoves?: string[]) {
        if (uciMoves?.length) {
            this.sendCommand(
                `position fen ${fen} moves ${uciMoves.join(" ")}`
            );

            const board = new Chess();
            for (const uciMove of uciMoves) {
                board.move(uciMove);
            }

            this.position = board.fen();

            return;
        }

        this.sendCommand(`position fen ${fen}`);
        this.position = fen;
    }

    async evaluate(
        depth: number,
        onDepthReached?: (depth: number) => void
    ): Promise<EvaluationResult> {
        const startTime = Date.now();

        let highestDepthReached = 0;

        const evaluationLogs = (await this.consumeLogs(
            `go depth ${depth}`,
            log => (
                log.startsWith("bestmove")
                || log.includes("depth 0")
            ),
            log => {
                const depth = parseInt(
                    log.match(/(?<= depth )\d+/)?.[0] || ""
                );

                if (!isNaN(depth) && depth > highestDepthReached) {
                    highestDepthReached = depth;
                    onDepthReached?.(depth);
                }
            }
        )).filter(
            message => message.startsWith("info depth")
        );

        const engineLines: EngineLine[] = [];

        for (const log of evaluationLogs.reverse()) {
            // Extract depth and multipv index of line
            const depth = parseInt(log.match(/(?<= depth )\d+/)?.[0] || "");
            const index = parseInt(log.match(/(?<= multipv )\d+/)?.[0] || "");
            if (isNaN(depth) || isNaN(index)) continue;

            // Skip non-latest line with this depth & index
            const duplicateLine = engineLines.some(
                line => line.depth == depth && line.index == index
            );
            if (duplicateLine) continue;

            // Extract evaluation type and score
            const scoreMatches = log.match(/ score (cp|mate) (-?\d+)/);

            const evaluationType = UCI_EVALUATION_TYPES[scoreMatches?.[1] || ""];
            if (
                evaluationType != "centipawn"
                && evaluationType != "mate"
            ) continue;

            let evaluationScore = parseInt(scoreMatches?.[2] || "");
            if (isNaN(evaluationScore)) continue;

            // Make sure evaluations are always from White's view
            if (this.position.includes(" b ")) {
                evaluationScore = -evaluationScore;
            }

            // Extract UCI moves from pv
            const moveUcis = (log.match(/ pv (.*)/)?.[1] || "").split(" ");
            if (moveUcis.length == 0) continue;

            // Convert these to SANs on a temp board
            const moveSans: string[] = [];

            const board = new Chess(this.position);
            for (const moveUci of moveUcis) {
                moveSans.push(board.move(moveUci).san);
            }

            engineLines.push({
                depth: depth,
                index: index,
                evaluation: {
                    type: evaluationType,
                    value: evaluationScore
                },
                moves: moveUcis.map((moveUci, moveIndex) => ({
                    uci: moveUci,
                    san: moveSans[moveIndex]
                }))
            });
        }

        return {
            elapsedTime: Date.now() - startTime,
            lines: engineLines 
        };
    }
}

export default Engine;